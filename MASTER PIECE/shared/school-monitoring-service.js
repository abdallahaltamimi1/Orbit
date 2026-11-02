/* Local educational read model and explicit ID links. Never grants educational permissions. */
(() => {
  "use strict";
  const prefix = "orbit.school.education.links.v1:";
  const fail = (code) => { throw Error(code); };
  // Existing platform alias, not a name/email match.
  const ownerId = (id) => id === "khaled" ? "teacher@orbit.com" : id;
  const validId = (id) => typeof id === "string" && !!id.trim();
  function school() {
    const user = OrbitAuth.current();
    if (user?.role !== "school" || !validId(user.email)) fail("ROLE_DENIED");
    return user.email;
  }
  const storageKey = () => prefix + encodeURIComponent(school());
  function json(key, fallback) {
    let raw;
    try { raw = localStorage.getItem(key); } catch { fail("STORAGE_FAILED"); }
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { fail("INVALID_DATA"); }
  }
  function links() {
    const schoolId = school();
    const db = json(storageKey(), { schema: 1, schoolId, revision: 0, links: [], mappings: [] });
    if (!db || db.schema !== 1 || db.schoolId !== schoolId || !Number.isInteger(db.revision) || db.revision < 0) fail("INVALID_DATA");
    for (const kind of ["links", "mappings"]) {
      if (!Array.isArray(db[kind])) fail("INVALID_DATA");
      const seen = new Set();
      for (const r of db[kind]) {
        if (!r || r.schoolId !== schoolId || !validId(r.id) || seen.has(r.id)) fail("INVALID_DATA");
        seen.add(r.id);
      }
    }
    const unique = (items, key) => new Set(items.map(key)).size === items.length;
    if (!db.links.every((r) => [r.channelId, r.classId, r.subjectId, r.allocationId].every(validId)) || !unique(db.links, (r) => r.channelId)) fail("INVALID_DATA");
    if (!db.mappings.every((r) => ["teachers", "students"].includes(r.role) && validId(r.academicId) && validId(r.accountId)) ||
        !unique(db.mappings, (r) => JSON.stringify([r.role, r.academicId])) || !unique(db.mappings, (r) => JSON.stringify([r.role, r.accountId]))) fail("INVALID_DATA");
    return db;
  }
  function sources() {
    const schoolId = school(), db = links(), academic = OrbitSchoolAcademics.read();
    const rawEducation = json("orbit.channels.v2", {});
    const education = { channels: rawEducation?.channels ?? [], posts: rawEducation?.posts ?? [] };
    const membership = json("orbit.memberships.v3", {});
    const rawSubmissions = json("orbit.assignments.v1", {});
    const submissions = { submissions: rawSubmissions?.submissions ?? [] };
    if (!rawEducation || Array.isArray(rawEducation) || !Array.isArray(education.channels) || !Array.isArray(education.posts) || !membership || Array.isArray(membership) || !rawSubmissions || !Array.isArray(submissions.submissions)) fail("INVALID_DATA");
    const idCounts = new Map();
    for (const c of education.channels) if (validId(c?.id)) idCounts.set(c.id, (idCounts.get(c.id) || 0) + 1);
    // Duplicate IDs could make school-less posts ambiguous. Exclude these channels entirely.
    const channels = OrbitSchool.channels().filter((c) => validId(c.id) && idCounts.get(c.id) === 1);
    const ids = new Set(channels.map((c) => c.id));
    const candidates = {
      teachers: [...new Set(channels.map((c) => ownerId(c.teacher)).filter(validId))],
      students: Object.entries(membership).filter(([id, list]) => id !== "guest" && validId(id) && Array.isArray(list) && list.some((cid) => ids.has(cid))).map(([id]) => id),
    };
    return { schoolId, db, academic, education, membership, submissions, channels, candidates };
  }
  function context(s) { return { schoolId: s.schoolId, revision: s.db.revision, academicRevision: s.academic.revision }; }
  function commit(expected, operation) {
    const s = sources();
    if (expected?.schoolId !== s.schoolId) fail("SCHOOL_CHANGED");
    if (expected.revision !== s.db.revision || expected.academicRevision !== s.academic.revision) fail("STALE_DATA");
    operation(s);
    s.db.revision++;
    try { localStorage.setItem(storageKey(), JSON.stringify(s.db)); } catch { fail("STORAGE_FAILED"); }
    window.dispatchEvent(new Event("orbit:school-monitoring-change"));
  }
  function saveMapping(role, academicId, accountId, expected) {
    commit(expected, (s) => {
      if (!["teachers", "students"].includes(role) || !s.academic[role].some((r) => r.id === academicId) || !s.candidates[role].includes(accountId)) fail("INVALID_MAPPING");
      if (s.db.mappings.some((m) => m.role === role && m.accountId === accountId && m.academicId !== academicId)) fail("DUPLICATE_MAPPING");
      const old = s.db.mappings.find((m) => m.role === role && m.academicId === academicId);
      const row = { id: old?.id || crypto.randomUUID(), schoolId: s.schoolId, role, academicId, accountId };
      s.db.mappings = [...s.db.mappings.filter((m) => m.id !== old?.id), row];
    });
  }
  function saveLink(channelId, classId, subjectId, expected) {
    commit(expected, (s) => {
      const channel = s.channels.find((c) => c.id === channelId);
      const classroom = s.academic.classes.find((r) => r.id === classId && r.status === "active");
      const subject = s.academic.subjects.find((r) => r.id === subjectId && r.status === "active");
      const allocation = s.academic.allocations.find((r) => r.classId === classId && r.subjectId === subjectId);
      if (!channel) fail("CHANNEL_SCOPE");
      if (!classroom || !subject || !allocation) fail("INVALID_ALLOCATION");
      if (!s.db.mappings.some((m) => m.role === "teachers" && m.academicId === allocation.teacherId && m.accountId === ownerId(channel.teacher))) fail("OWNER_MISMATCH");
      const old = s.db.links.find((l) => l.channelId === channelId);
      s.db.links = [...s.db.links.filter((l) => l.channelId !== channelId), { id: old?.id || crypto.randomUUID(), schoolId: s.schoolId, channelId, classId, subjectId, allocationId: allocation.id }];
    });
  }
  function remove(kind, id, expected) {
    if (!["links", "mappings"].includes(kind)) fail("INVALID_DATA");
    commit(expected, (s) => {
      if (!s.db[kind].some((r) => r.id === id)) fail("NOT_FOUND");
      s.db[kind] = s.db[kind].filter((r) => r.id !== id);
    });
  }
  function linkState(s, channel, link) {
    if (!link) return { status: "unlinked" };
    const classroom = s.academic.classes.find((r) => r.id === link.classId);
    const subject = s.academic.subjects.find((r) => r.id === link.subjectId);
    const allocation = s.academic.allocations.find((r) => r.id === link.allocationId && r.classId === link.classId && r.subjectId === link.subjectId);
    const teacher = s.academic.teachers.find((r) => r.id === allocation?.teacherId);
    let status = !classroom || !subject || !allocation || !teacher ? "missing-record" :
      classroom.status !== "active" || subject.status !== "active" ? "archived" :
      !s.db.mappings.some((m) => m.role === "teachers" && m.academicId === teacher.id && m.accountId === ownerId(channel.teacher)) ? "owner-mismatch" : "linked";
    return { status, classroom, subject, teacher };
  }
  function deadline(value) {
    if (!value) return null; // An assignment without a due date has no known deadline.
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const date = new Date(value + "T23:59:59");
    if (Number.isNaN(+date) || date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) || date.getDate() !== Number(value.slice(8, 10))) return NaN;
    return +date; // Same device-local date semantics as the existing assignment adapter.
  }
  function report(filters = {}, now = Date.now()) {
    const s = sources();
    const postGroups = new Map();
    for (const p of s.education.posts) {
      if (!validId(p?.id)) continue;
      const group = postGroups.get(p.id) || [];
      group.push(p); postGroups.set(p.id, group);
    }
    // Do not use sample/hidden posts or conflicting duplicate assignment IDs.
    const posts = [...postGroups.values()].filter((g) => g.every((p) => p.channel === g[0].channel && p.type === g[0].type && p.schoolId === g[0].schoolId)).map((g) => g[g.length - 1]).filter((p) => !p.sample && p.moderationStatus !== "hidden" && (!p.schoolId || p.schoolId === s.schoolId));
    const rows = s.channels.map((c) => {
      const link = s.db.links.find((l) => l.channelId === c.id), state = linkState(s, c, link);
      const ownPosts = posts.filter((p) => p.channel === c.id), assignments = ownPosts.filter((p) => p.type === "assignment");
      let submitted = null, reviewed = null, missing = null, overdue = null, progress = "link-required";
      const roster = state.status === "linked" ? s.academic.students.filter((r) => r.classId === link.classId && r.status === "enrolled") : [];
      if (state.status === "linked") {
        const accounts = roster.map((r) => s.db.mappings.find((m) => m.role === "students" && m.academicId === r.id)?.accountId);
        const complete = roster.length > 0 && accounts.every((id) => id && Array.isArray(s.membership[id]) && s.membership[id].includes(c.id));
        progress = complete ? "current-roster" : "incomplete-roster";
        if (complete) {
          submitted = 0; reviewed = 0; missing = 0; overdue = 0;
          progressLoop: for (const p of assignments) {
            for (const studentId of accounts) {
              // Reduce to one metadata record per assignment/student. No answer, file or history leaves this service.
              const records = s.submissions.submissions.filter((r) => r && r.assignmentId === p.id && (!r.channelId || r.channelId === c.id) && r.studentId === studentId && (!r.schoolId || r.schoolId === s.schoolId)).map((r) => ({
                valid: r.channelId === c.id && Number.isInteger(r.revision) && r.revision > 0 && Number.isFinite(Date.parse(r.submittedAt)),
                revision: r.revision, submittedAt: Date.parse(r.submittedAt),
                reviewed: !!r.review && r.review.teacherId === ownerId(c.teacher) && Number.isFinite(Date.parse(r.review.reviewedAt)),
              }));
              records.sort((a, b) => b.revision - a.revision || b.submittedAt - a.submittedAt);
              const r = records[0];
              if (records.some((item) => !item.valid) || (r && records.some((item) => item.revision === r.revision && item.submittedAt === r.submittedAt && item.reviewed !== r.reviewed))) {
                submitted = reviewed = missing = overdue = null;
                progress = "unreliable-submissions";
                break progressLoop;
              }
              if (r) {
                submitted++;
                if (r.reviewed) reviewed++;
              } else {
                missing++;
                const due = deadline(p.dueDate);
                if (Number.isNaN(due)) overdue = null;
                else if (due !== null && due < now && overdue !== null) overdue++;
              }
            }
          }
        }
      }
      if (!assignments.length) { submitted = reviewed = missing = overdue = 0; progress = "no-assignments"; }
      return {
        channelId: c.id, schoolId: s.schoolId, name: c.en || c.ar || c.id, nameAr: c.ar || c.en || c.id,
        ownerId: ownerId(c.teacher) || "", linkId: link?.id || "", classId: link?.classId || "", subjectId: link?.subjectId || "",
        teacherId: state.teacher?.id || "", teacherName: state.teacher?.name || "", classroom: state.classroom || null, subject: state.subject || null,
        status: state.status, progress, lessons: ownPosts.filter((p) => p.type === "lesson" || p.type === "video").length,
        assignments: assignments.length, rosterSize: roster.length, submitted, reviewed, missing, overdue,
      };
    });
    const visible = rows.filter((r) => (!filters.classId || r.classId === filters.classId) && (!filters.subjectId || r.subjectId === filters.subjectId) && (!filters.teacherId || r.teacherId === filters.teacherId) && (!filters.channelId || r.channelId === filters.channelId));
    const sum = (key) => visible.some((r) => r[key] === null) ? null : visible.reduce((n, r) => n + r[key], 0);
    return {
      context: context(s), rows: visible,
      totals: { channels: visible.length, lessons: sum("lessons"), assignments: sum("assignments"), submitted: sum("submitted"), reviewed: sum("reviewed"), missing: sum("missing"), overdue: sum("overdue") },
      options: { channels: rows.map((r) => ({ id: r.channelId, name: r.name, nameAr: r.nameAr })), classes: s.academic.classes, subjects: s.academic.subjects, teachers: s.academic.teachers, students: s.academic.students, candidates: s.candidates },
      mappings: s.db.mappings.map((m) => ({ ...m, recordName: s.academic[m.role].find((r) => r.id === m.academicId)?.name || "", missingRecord: !s.academic[m.role].some((r) => r.id === m.academicId) })),
    };
  }
  window.OrbitSchoolMonitoring = { report, saveMapping, saveLink, remove, storageKey, prefix };
})();
