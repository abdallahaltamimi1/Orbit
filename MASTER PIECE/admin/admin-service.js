/* Local administrative adapter. Every read and mutation is guarded.
   This browser store is not a substitute for server authorization. */
(() => {
  "use strict";
  const KEYS = {
    accounts: "orbit.recruitment.v1",
    profiles: "orbit.profiles.v1",
    admin: "orbit.admin.v1",
    channels: "orbit.channels.v2",
    memberships: "orbit.memberships.v3",
    subscriptions: "orbit.subscriptions.v1",
    organizations: "orbit.school.members.v1",
  };
  const read = (key, fallback) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return structuredClone(fallback);
    try {
      return JSON.parse(raw);
    } catch {
      throw Error("STORAGE_DATA_INVALID");
    }
  };
  const recruitment = () =>
    read(KEYS.accounts, {
      accounts: [],
      schools: [],
      jobs: [],
      applications: [],
      notifications: [],
    });
  const profiles = () => read(KEYS.profiles, { schema: 1, records: {} });
  const metadata = () =>
    read(KEYS.admin, {
      schema: 1,
      accountStates: {},
      logs: [],
      notifications: [],
      reports: [],
      settings: { name: "The Learning Orbit", pageSize: 10 },
    });
  const now = () => new Date().toISOString();
  function readProof() {
    try {
      return JSON.parse(sessionStorage.getItem("orbit.admin.session") || "null");
    } catch {
      return null;
    }
  }
  function guard() {
    const user = OrbitAuth.current(),
      account = recruitment().accounts?.find((a) => a.email === user?.email),
      proof = readProof();
    if (
      user?.role !== "admin" ||
      account?.role !== "admin" ||
      account.status === "suspended" ||
      account.status === "deleted" ||
      typeof proof?.token !== "string" ||
      !proof.token ||
      proof.email !== user.email ||
      !Number.isFinite(proof.expiresAt) ||
      proof.expiresAt <= Date.now()
    )
      throw Error("ADMIN_REQUIRED");
    return user;
  }
  function status(email, account) {
    return account?.status || metadata().accountStates?.[email]?.status || "active";
  }
  function userRows() {
    guard();
    const p = profiles(),
      d = recruitment();
    return (d.accounts || []).map((a) => {
      const profile = p.records[a.email] || {};
      return {
        email: a.email,
        id: a.email,
        name: profile.name || a.name || a.email,
        role: a.role,
        status: status(a.email, a),
        createdAt: a.createdAt || profile.createdAt || null,
        updatedAt: profile.updatedAt || null,
        revision: profile.revision || 1,
        photo: profile.photo || profile.logo || "",
        location: profile.location || profile.address || "",
        contact: profile.contact || "",
        subject: profile.subject || "",
        qualification: profile.qualification || "",
        bio: profile.bio || profile.description || "",
        experience: profile.experience ?? null,
        schoolType: profile.type || "",
        levels: profile.levels || [],
        subjects: profile.subjects || [],
        website: profile.website || "",
      };
    });
  }
  function appendEvent(store, action, target, detail = {}) {
    const actor = guard();
    const event = {
      id: crypto.randomUUID(),
      action,
      target,
      actor: actor.email,
      at: now(),
      detail,
    };
    store.logs ??= [];
    store.logs.unshift(event);
    store.notifications ??= [];
    if (action !== "notification.read")
      store.notifications.unshift({ id: event.id, action, target, at: event.at, read: false });
    return event;
  }
  function commit(changes, action, target, detail = {}) {
    guard();
    const store = metadata();
    appendEvent(store, action, target, detail);
    changes = { ...changes, [KEYS.admin]: store };
    const snapshots = Object.fromEntries(
      Object.keys(changes).map((key) => [key, localStorage.getItem(key)]),
    );
    try {
      for (const [key, value] of Object.entries(changes))
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      for (const [key, value] of Object.entries(snapshots)) {
        try {
          value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
        } catch {}
      }
      throw error;
    }
    window.dispatchEvent(new CustomEvent("orbit:admin-change", { detail: { action, target } }));
  }
  function account(email) {
    guard();
    const d = recruitment(),
      a = d.accounts?.find((a) => a.email === email);
    if (!a) throw Error("ACCOUNT_NOT_FOUND");
    return { d, a };
  }
  function setAccountStatus(email, next) {
    if (!["active", "suspended"].includes(next)) throw Error("INVALID_STATUS");
    const { d, a } = account(email);
    if (a.status === "deleted") throw Error("ACCOUNT_ARCHIVED");
    if (a.email === guard().email) throw Error("SELF_PROTECTION");
    if (
      a.role === "admin" &&
      next === "suspended" &&
      d.accounts.filter((a) => a.role === "admin" && status(a.email, a) === "active").length <= 1
    )
      throw Error("LAST_ADMIN");
    const previous = status(email, a);
    if (previous === next) return;
    a.status = next;
    a.statusChangedAt = now();
    commit({ [KEYS.accounts]: d }, "account." + next, email, { previous, status: next });
  }
  function deleteAccount(email, confirmation) {
    if (confirmation !== email) throw Error("CONFIRMATION_REQUIRED");
    const { d, a } = account(email);
    if (email === guard().email) throw Error("SELF_PROTECTION");
    if (
      a.role === "admin" &&
      d.accounts.filter((a) => a.role === "admin" && a.status !== "deleted").length <= 1
    )
      throw Error("LAST_ADMIN");
    if (a.status === "deleted") throw Error("ACCOUNT_ARCHIVED");
    a.status = "deleted";
    a.deletedAt = now();
    commit({ [KEYS.accounts]: d }, "account.archived", email, {
      policy: "Access removed; learning and recruitment references retained.",
    });
  }
  function updateProfile(email, patch, revision) {
    const { d, a } = account(email);
    if (a.status === "deleted") throw Error("ACCOUNT_ARCHIVED");
    const db = profiles(),
      old = db.records[email];
    if (!old) throw Error("PROFILE_NOT_FOUND");
    if (revision !== old.revision) throw Error("PROFILE_CONFLICT");
    const name = String(patch.name || "").trim();
    if (!name || name.length > 100) throw Error("NAME_REQUIRED");
    const contact = String(patch.contact || "").trim(),
      location = String(patch.location || "").trim();
    if (contact.length > 200 || location.length > 200) throw Error("FIELD_TOO_LONG");
    if (a.role === "school" && (!contact || !location)) throw Error("SCHOOL_REQUIRED");
    const next = { ...old, name, revision: old.revision + 1, updatedAt: now() };
    if (a.role !== "admin") {
      next.contact = contact;
      if (a.role === "student") next.address = location;
      else next.location = location;
    }
    db.records[email] = next;
    a.name = name;
    commit({ [KEYS.profiles]: db, [KEYS.accounts]: d }, "profile.updated", email, {
      fields: ["name", "contact", "location"],
    });
    window.dispatchEvent(
      new CustomEvent("orbit:profile-change", {
        detail: { id: email, profile: structuredClone(next) },
      }),
    );
    if (email === guard().email) OrbitProfiles.project(next);
  }
  function schoolRequests() {
    guard();
    return (recruitment().schoolRequests || []).map((r) => ({
      ...r,
      school: userRows().find((u) => u.email === r.schoolId) || null,
    }));
  }
  function reviewSchool(id, next, reason) {
    if (!["approved", "rejected"].includes(next)) throw Error("INVALID_STATUS");
    if (!String(reason || "").trim() || reason.length > 500) throw Error("REASON_REQUIRED");
    guard();
    const d = recruitment(),
      request = (d.schoolRequests || []).find((r) => r.id === id);
    if (!request || request.status !== "pending") throw Error("REQUEST_CONFLICT");
    const a = d.accounts.find((a) => a.email === request.schoolId && a.role === "school");
    if (!a || a.status === "deleted") throw Error("ACCOUNT_NOT_FOUND");
    request.status = next;
    request.reviewedAt = now();
    request.reviewedBy = guard().email;
    request.reason = reason.trim();
    a.status = next === "approved" ? "active" : "suspended";
    a.statusChangedAt = now();
    commit({ [KEYS.accounts]: d }, "school." + next, request.schoolId, {
      requestId: id,
      reason: reason.trim(),
    });
  }
  function jobs() {
    guard();
    const db = recruitment(),
      p = profiles();
    return (db.jobs || []).map((j) => ({
      ...j,
      schoolName: p.records[j.schoolId]?.name || j.schoolId,
      applications: (db.applications || []).filter((a) => a.jobId === j.id).length,
    }));
  }
  function setJobStatus(id, next) {
    if (!["draft", "published", "closed"].includes(next)) throw Error("INVALID_STATUS");
    guard();
    const d = recruitment(),
      job = (d.jobs || []).find((j) => j.id === id);
    if (!job) throw Error("JOB_NOT_FOUND");
    if (job.status === next) return;
    const previous = job.status;
    job.status = next;
    job.updatedAt = now();
    commit({ [KEYS.accounts]: d }, "job." + next, id, { previous, schoolId: job.schoolId });
    if (next === "published") OrbitRecruitment.refreshMatching();
  }
  function posts() {
    guard();
    return read(KEYS.channels, { posts: [] }).posts || [];
  }
  function setPostStatus(id, next) {
    if (!["visible", "hidden"].includes(next)) throw Error("INVALID_STATUS");
    guard();
    const d = read(KEYS.channels, { posts: [] }),
      post = d.posts.find((p) => p.id === id);
    if (!post) throw Error("POST_NOT_FOUND");
    post.moderationStatus = next;
    post.moderatedAt = now();
    commit({ [KEYS.channels]: d }, "content." + next, id, { type: post.type });
  }
  function applications() {
    guard();
    return recruitment().applications || [];
  }
  function logs() {
    guard();
    return metadata().logs || [];
  }
  function notifications() {
    guard();
    return metadata().notifications || [];
  }
  function reports() {
    guard();
    return metadata().reports || [];
  }
  function resolveReport(id, next) {
    if (!["resolved", "dismissed"].includes(next)) throw Error("INVALID_STATUS");
    guard();
    const d = metadata(),
      report = (d.reports || []).find((r) => r.id === id);
    if (!report) throw Error("REPORT_NOT_FOUND");
    report.status = next;
    report.updatedAt = now();
    const entry = appendEvent(d, "report." + next, id);
    const before = localStorage.getItem(KEYS.admin);
    try {
      localStorage.setItem(KEYS.admin, JSON.stringify(d));
    } catch (e) {
      if (before !== null) localStorage.setItem(KEYS.admin, before);
      throw e;
    }
    window.dispatchEvent(new Event("orbit:admin-change"));
    return entry;
  }
  function markRead(id) {
    guard();
    const d = metadata(),
      item = (d.notifications || []).find((n) => n.id === id);
    if (!item) throw Error("NOT_FOUND");
    if (item.read) return;
    item.read = true;
    appendEvent(d, "notification.read", id);
    localStorage.setItem(KEYS.admin, JSON.stringify(d));
    window.dispatchEvent(new Event("orbit:admin-change"));
  }
  function settings() {
    guard();
    return metadata().settings || { name: "The Learning Orbit", pageSize: 10 };
  }
  function saveSettings(values) {
    guard();
    if (!values.name?.trim() || values.name.length > 80 || ![10, 20, 50].includes(+values.pageSize))
      throw Error("INVALID_SETTINGS");
    const d = metadata();
    d.settings = { name: values.name.trim(), pageSize: +values.pageSize };
    appendEvent(d, "settings.updated", "admin", { fields: ["name", "pageSize"] });
    localStorage.setItem(KEYS.admin, JSON.stringify(d));
    window.dispatchEvent(new Event("orbit:admin-change"));
  }
  function recordSession() {
    const actor = guard(),
      proof = JSON.parse(sessionStorage.getItem("orbit.admin.session"));
    if (sessionStorage.getItem("orbit.admin.recorded") === proof.token) return;
    commit({}, "admin.login", actor.email);
    sessionStorage.setItem("orbit.admin.recorded", proof.token);
  }
  function snapshot() {
    guard();
    const users = userRows(),
      active = users.filter((u) => u.status !== "deleted"),
      p = profiles(),
      d = recruitment();
    let completed = 0,
      understood = 0,
      answers = 0;
    for (const u of active.filter((u) => u.role === "student")) {
      const state = read("orbit.student.state." + u.email, {}),
        learning = read("orbit.learning." + u.email, {});
      completed += (state.done || []).length;
      for (const item of Object.values(learning)) {
        understood += Number(item.understood === true);
        answers += (item.correct || []).length;
      }
    }
    return {
      users: active,
      total: active.length,
      students: active.filter((u) => u.role === "student").length,
      teachers: active.filter((u) => u.role === "teacher").length,
      schools: active.filter((u) => u.role === "school").length,
      active: active.filter((u) => u.status === "active").length,
      suspended: active.filter((u) => u.status === "suspended").length,
      pending: (d.schoolRequests || []).filter((r) => r.status === "pending").length,
      jobs: (d.jobs || []).filter((j) => j.status === "published").length,
      unknownDates: active.filter((u) => !u.createdAt).length,
      engagement: [completed, understood, answers],
      posts: (read(KEYS.channels, { posts: [] }).posts || []).length,
    };
  }
  window.OrbitAdmin = {
    guard,
    userRows,
    setAccountStatus,
    deleteAccount,
    updateProfile,
    schoolRequests,
    reviewSchool,
    jobs,
    setJobStatus,
    posts,
    setPostStatus,
    applications,
    logs,
    notifications,
    markRead,
    reports,
    resolveReport,
    settings,
    saveSettings,
    recordSession,
    snapshot,
  };
})();
