/* Local channel adapter. Replace operations with authenticated server calls for production. */
(() => {
  "use strict";
  const O = ORBIT,
    STATE = "orbit.classrooms.v1",
    baseChannels = O.channels;
  const current = () => O.get("orbitUser", {}),
    fail = (en, ar) => {
      throw Error(O.t(en, ar));
    };
  function channels() {
    const data = O.db(),
      stored = new Map(data.channels.map((c) => [c.id, c]));
    return baseChannels()
      .filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i)
      .map((c) => ({ ...c, ...stored.get(c.id) }));
  }
  O.channels = channels;
  function find(id) {
    const c = channels().find((c) => c.id === id);
    if (!c) fail("Channel not found", "القناة غير موجودة");
    return c;
  }
  function members(id) {
    return Object.entries(O.get("orbit.memberships.v3", {}))
      .filter(([email, list]) => email && Array.isArray(list) && list.includes(id))
      .map(([id]) => ({
        id,
        name: OrbitProfiles.read(id, "student").name || O.t("Student", "طالب"),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  function admitted(c) {
    return (
      O.own(c) ||
      (current().role === "student" &&
        !!current().email &&
        (O.get("orbit.memberships.v3", {})[current().email] || []).includes(c.id))
    );
  }
  function canRead(c) {
    return !c.private || admitted(c);
  }
  function seats(id) {
    const c = find(id);
    if (!admitted(c)) return [];
    const data = O.get(STATE, {}),
      old = data[id] || { seats: {}, slots: 12, joinRequests: [] },
      active = members(id),
      next = { ...old, seats: { ...old.seats } };
    for (const email of Object.keys(next.seats))
      if (!active.some((m) => m.id === email)) delete next.seats[email];
    for (const member of active)
      if (next.seats[member.id] === undefined) {
        const used = new Set(Object.values(next.seats).filter(Number.isInteger));
        let n = 0;
        while (used.has(n)) n++;
        next.seats[member.id] = n;
      }
    next.slots = Math.max(
      12,
      old.slots || 12,
      Math.ceil(active.length / 12) * 12,
      ...Object.values(next.seats)
        .filter(Number.isInteger)
        .map((n) => Math.ceil((n + 1) / 12) * 12),
    );
    if (JSON.stringify(next) !== JSON.stringify(old) || !data[id]) {
      data[id] = next;
      O.set(STATE, data);
    }
    return Array.from({ length: next.slots }, (_, index) => ({
      index,
      member: active.find((m) => next.seats[m.id] === index) || null,
    }));
  }
  function owner(id) {
    const c = find(id);
    if (!O.own(c))
      fail("Only the channel owner can do this.", "هذه العملية متاحة لمالك القناة فقط.");
    return c;
  }
  function save(id, changes) {
    const c = owner(id),
      allowed = {};
    for (const key of [
      "ar",
      "en",
      "descAr",
      "descEn",
      "subject",
      "private",
      "code",
      "codeExpiresAt",
      "coverAsset",
    ])
      if (key in changes) allowed[key] = changes[key];
    const updated = { ...c, ...allowed },
      data = O.db();
    data.channels = data.channels.filter((x) => x.id !== id);
    data.channels.push(updated);
    O.set("orbit.channels.v2", data);
    return updated;
  }
  function remove(id, email) {
    owner(id);
    const data = O.get("orbit.memberships.v3", {});
    if (!Array.isArray(data[email]) || !data[email].includes(id))
      fail("This student is no longer a member.", "هذا الطالب لم يعد عضوًا في القناة.");
    data[email] = data[email].filter((x) => x !== id);
    O.set("orbit.memberships.v3", data);
    return true;
  }
  function code() {
    let result;
    do {
      result =
        "ORB" +
        Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) =>
          n.toString(16).padStart(2, "0"),
        )
          .join("")
          .toUpperCase();
    } while (channels().some((c) => c.code === result));
    return result;
  }
  function join(id, leave = false, invitation = "") {
    if (!OrbitSubscriptions.requireAccount("student")) return false;
    const c = find(id),
      u = current(),
      data = O.get("orbit.memberships.v3", {}),
      list = data[u.email] || [];
    if (!leave && !list.includes(id) && c.private) {
      if (!invitation || invitation.trim().toUpperCase() !== c.code)
        fail("Invalid invitation code.", "كود الدعوة غير صحيح.");
      if (c.codeExpiresAt && Date.parse(c.codeExpiresAt) <= Date.now())
        fail("This invitation code has expired.", "انتهت صلاحية كود الدعوة.");
      if (!OrbitSubscriptions.canJoinClass(id)) return false;
    }
    if (!leave && !list.includes(id)) {
      const rooms = O.get(STATE, {}),
        room = rooms[id] || { seats: {}, slots: 12, joinRequests: [] };
      room.seats = { ...room.seats, [u.email]: null };
      rooms[id] = room;
      O.set(STATE, rooms);
    }
    data[u.email] = leave ? list.filter((x) => x !== id) : [...new Set([...list, id])];
    O.set("orbit.memberships.v3", data);
    return true;
  }

  function selectSeat(id, index) {
    const c = find(id),
      u = current();
    if (u.role !== "student" || !admitted(c))
      fail("Join the channel before choosing a seat.", "انضم إلى القناة قبل اختيار المقعد.");
    const available = seats(id);
    if (!Number.isInteger(index) || index < 0 || index >= available.length)
      fail("This seat is unavailable.", "هذا المقعد غير متاح.");
    if (available[index].member && available[index].member.id !== u.email)
      fail(
        "Another student has taken this seat. Choose an empty chair.",
        "هذا المقعد محجوز لطالب آخر. اختر كرسيًا فارغًا.",
      );
    const rooms = O.get(STATE, {}),
      room = rooms[id];
    room.seats[u.email] = index;
    O.set(STATE, rooms);
    return true;
  }
  O.join = join;
  window.OrbitChannels = {
    channels,
    find,
    members,
    admitted,
    canRead,
    seats,
    save,
    remove,
    code,
    join,
    selectSeat,
    // Reserved request states for a future server-backed approval policy; direct admission remains current behavior.
    joinRequestStates: Object.freeze(["pending", "approved", "rejected"]),
  };
})();
