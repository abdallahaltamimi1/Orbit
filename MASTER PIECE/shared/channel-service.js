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
    const c = find(id);
    const emails = OrbitAuth.managedChannel(c)
      ? (OrbitAuth.get("orbit.recruitment.v1", {}).accounts || []).map(a => a.email).concat("student@orbit.com")
      : Object.keys(O.get("orbit.memberships.v3", {})).filter(email => (O.get("orbit.memberships.v3", {})[email] || []).includes(id));
    return [...new Set(emails)].filter(email => !OrbitAuth.managedChannel(c) || OrbitAuth.schoolChannelStudent(c, email, null, true))
      .map(id => ({
        id,
        name: OrbitProfiles.read(id, "student").name || O.t("Student", "طالب"),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  function admitted(c) {
    if (OrbitAuth.managedChannel(c)) return O.own(c) || (current().role === "student" && OrbitAuth.schoolChannelStudent(c, current().email, null, true));
    if(current().role==='student'&&OrbitAuth.schoolStudentAccess(c)===false)return false;
    return (
      O.own(c) ||
      (current().role === "student" &&
        !!current().email &&
        (O.get("orbit.memberships.v3", {})[current().email] || []).includes(c.id))
    );
  }
  function canRead(c) {
    if (OrbitAuth.managedChannel(c)) {
      const actor = current();
      return actor.role === "teacher" ? OrbitAuth.schoolChannelTeacher(c, actor.email, true) :
        actor.role === "school" ? actor.email === c.schoolId : actor.role === "student" && OrbitAuth.schoolChannelStudent(c, actor.email);
    }
    if(current().role==='student'&&OrbitAuth.schoolStudentAccess(c)===false)return false;
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
    if (OrbitAuth.managedChannel(c)) { delete allowed.subject; delete allowed.private; delete allowed.code; delete allowed.codeExpiresAt; }
    const updated = { ...c, ...allowed },
      data = O.db();
    data.channels = data.channels.filter((x) => x.id !== id);
    data.channels.push(updated);
    O.set("orbit.channels.v2", data);
    return updated;
  }
  function remove(id, email) {
    if (OrbitAuth.managedChannel(owner(id))) fail("Membership follows school enrollment.", "تتبع العضوية التسجيل المدرسي.");
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
    if (OrbitAuth.managedChannel(c)) fail("Membership follows school enrollment.", "تتبع العضوية التسجيل المدرسي.");
    if(!leave && OrbitAuth.schoolStudentAccess(c,u.email,{requireMembership:false})===false)fail('School access requires a reviewed Active-year enrollment.','يتطلب الوصول المدرسي تسجيلًا مراجعًا في السنة النشطة.');
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

  function schoolChoices() {
    const prefix = "orbit.school.teaching-assignments.demo.v1:";
    if (OrbitAuth.current()?.role !== "teacher") return [];
    return Object.keys(localStorage).filter(key => key.startsWith(prefix)).flatMap(key => {
      try { return OrbitAuth.schoolChannelOptions(decodeURIComponent(key.slice(prefix.length))); }
      catch { return []; }
    });
  }

  function schoolAssociation(schoolId, assignmentIds) {
    const actor = OrbitAuth.current();
    const options = schoolChoices().filter(row => row.schoolId === schoolId);
    const rows = [...new Set(assignmentIds)].map(id => options.find(row => row.id === id));
    if (!rows.length || rows.some(row => !row || row.subjectId !== rows[0].subjectId ||
        row.academicYearId !== rows[0].academicYearId)) fail("Select approved sections for one subject.", "اختر شعبًا معتمدة لمادة واحدة.");
    const [first] = rows;
    return { schoolChannelVersion: 1, schoolId, teacher: actor.email, academicYearId: first.academicYearId,
      subjectId: first.subjectId, subject: first.subjectName, sectionId: first.sectionId,
      sectionIds: rows.map(row => row.sectionId), private: true };
  }

  function transfer(id, email, reason) {
    const channel = find(id), actor = OrbitAuth.current();
    reason = String(reason || "").trim();
    if (actor?.role !== "school" || actor.email !== channel.schoolId || !OrbitAuth.managedChannel(channel) ||
        email === channel.teacher || !reason || reason.length > 500 ||
        !OrbitAuth.schoolChannelTeacher({ ...channel, teacher: email }, email))
      fail("Choose an eligible teacher and enter a reason.", "اختر معلمًا مؤهلًا وأدخل السبب.");
    const data = O.db();
    if (data.channels.filter(row => row.id === id).length !== 1) fail("Channel needs review.", "تحتاج القناة إلى مراجعة.");
    data.channels = data.channels.map(row => row.id === id ? { ...row, teacher: email,
      managementHistory: [...(row.managementHistory || []), { from: row.teacher, to: email, reason, actor: actor.email, at: new Date().toISOString() }] } : row);
    O.set("orbit.channels.v2", data);
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
    selectSeat, schoolChoices, schoolAssociation, transfer,
    // Reserved request states for a future server-backed approval policy; direct admission remains current behavior.
    joinRequestStates: Object.freeze(["pending", "approved", "rejected"]),
  };
})();
