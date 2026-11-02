/* Browser-local school schedules. Replace this adapter with authorized data access for production. */
(() => {
  "use strict";
  const prefixes = { timetable: "orbit.school.timetable.demo.v1:", events: "orbit.school.events.demo.v1:" };
  const fail = (code) => { throw Error(code); };
  const idOK = (id) => typeof id === "string" && !!id.trim();
  const text = (v, max, optional = false) => {
    if (typeof v !== "string" || (!optional && !v.trim()) || v.trim().length > max) fail("INVALID_FIELDS");
    return v.trim();
  };
  function school() {
    const u = window.OrbitAuth?.current();
    if (u?.role !== "school" || !idOK(u.email)) fail("ROLE_DENIED");
    return u.email;
  }
  function storageKey(kind, schoolId = school()) {
    if (!Object.hasOwn(prefixes, kind)) fail("INVALID_FIELDS");
    return prefixes[kind] + encodeURIComponent(schoolId);
  }
  const timeOK = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  function localDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
    const d = new Date(value);
    if (!Number.isFinite(+d) || d.getFullYear() !== +value.slice(0, 4) || d.getMonth() + 1 !== +value.slice(5, 7) || d.getDate() !== +value.slice(8, 10) || d.getHours() !== +value.slice(11, 13) || d.getMinutes() !== +value.slice(14, 16)) return null;
    return d;
  }
  function validRow(kind, r) {
    if (!r || !idOK(r.id) || !idOK(r.schoolId)) return false;
    if (kind === "timetable") return [r.classId, r.subjectId, r.teacherId, r.allocationId].every(idOK) && Number.isInteger(r.day) && r.day >= 0 && r.day <= 6 && timeOK(r.startTime) && timeOK(r.endTime) && r.startTime < r.endTime && typeof r.room === "string" && r.room.length <= 100;
    return ["event", "announcement"].includes(r.type) && typeof r.title === "string" && !!r.title.trim() && r.title.length <= 160 && typeof r.description === "string" && !!r.description.trim() && r.description.length <= 4000 && !!localDate(r.dateTime) && ["school", "teachers", "students", "classes"].includes(r.audience) && Array.isArray(r.classIds) && r.classIds.every(idOK) && new Set(r.classIds).size === r.classIds.length && (r.audience === "classes" ? r.classIds.length > 0 : r.classIds.length === 0) && typeof r.location === "string" && r.location.length <= 160;
  }
  function read(kind) {
    const schoolId = school();
    let raw;
    try { raw = localStorage.getItem(storageKey(kind, schoolId)); } catch { fail("STORAGE_FAILED"); }
    // Never seed illustrative activity or replace malformed data.
    if (raw === null) return { schema: 1, schoolId, revision: 0, records: [] };
    let db;
    try { db = JSON.parse(raw); } catch { fail("INVALID_DATA"); }
    if (!db || db.schema !== 1 || db.schoolId !== schoolId || !Number.isInteger(db.revision) || db.revision < 0 || !Array.isArray(db.records) || !db.records.every((r) => validRow(kind, r) && r.schoolId === schoolId) || new Set(db.records.map((r) => r.id)).size !== db.records.length) fail("INVALID_DATA");
    return db;
  }
  function referenceStatus(row, academic, kind = "timetable") {
    if (kind === "events") {
      const classes = row.classIds.map((id) => academic.classes.find((c) => c.id === id));
      return classes.some((c) => !c) ? "missing-reference" : classes.some((c) => c.status !== "active") ? "archived-reference" : "active";
    }
    const c = academic.classes.find((r) => r.id === row.classId), s = academic.subjects.find((r) => r.id === row.subjectId), t = academic.teachers.find((r) => r.id === row.teacherId);
    if (!c || !s || !t) return "missing-reference";
    if (c.status !== "active" || s.status !== "active") return "archived-reference";
    if (!academic.allocations.some((a) => a.id === row.allocationId && a.classId === row.classId && a.subjectId === row.subjectId && a.teacherId === row.teacherId)) return "changed-allocation";
    return "active";
  }
  function snapshot(kind) {
    const db = read(kind), academic = OrbitSchoolAcademics.read();
    return { context: { schoolId: db.schoolId, revision: db.revision, academicRevision: academic.revision }, academic, records: db.records.map((r) => ({ ...r, status: referenceStatus(r, academic, kind) })) };
  }
  function commit(kind, expected, operation) {
    const db = read(kind), academic = OrbitSchoolAcademics.read();
    if (expected?.schoolId !== db.schoolId) fail("SCHOOL_CHANGED");
    if (expected.revision !== db.revision || expected.academicRevision !== academic.revision) fail("STALE_DATA");
    const result = operation(db, academic);
    db.revision++;
    try { localStorage.setItem(storageKey(kind), JSON.stringify(db)); } catch { fail("STORAGE_FAILED"); }
    window.dispatchEvent(new Event("orbit:school-schedule-change"));
    return result;
  }
  const roomKey = (v) => v.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  function save(kind, id, values, expected) {
    return commit(kind, expected, (db, academic) => {
      const old = id ? db.records.find((r) => r.id === id) : null;
      if (id && !old) fail("NOT_FOUND");
      let fields;
      if (kind === "timetable") {
        const allocation = academic.allocations.find((a) => a.classId === values.classId && a.subjectId === values.subjectId && a.teacherId === values.teacherId);
        if (!allocation) fail("INVALID_ALLOCATION");
        if (!academic.classes.some((c) => c.id === values.classId && c.status === "active") || !academic.subjects.some((s) => s.id === values.subjectId && s.status === "active") || !academic.teachers.some((t) => t.id === values.teacherId)) fail("INACTIVE_REFERENCE");
        if (values.day === "" || values.day === null || values.day === undefined || !Number.isInteger(Number(values.day)) || Number(values.day) < 0 || Number(values.day) > 6) fail("INVALID_DAY");
        if (!timeOK(values.startTime) || !timeOK(values.endTime) || values.startTime >= values.endTime) fail("INVALID_TIME");
        fields = { classId: allocation.classId, subjectId: allocation.subjectId, teacherId: allocation.teacherId, allocationId: allocation.id, day: Number(values.day), startTime: values.startTime, endTime: values.endTime, room: text(values.room ?? "", 100, true) };
        for (const r of db.records) {
          // Retained entries, even those needing repair, reserve their original slot until explicitly changed.
          if (r.id === id || r.day !== fields.day || fields.startTime >= r.endTime || fields.endTime <= r.startTime) continue;
          if (r.classId === fields.classId) fail("CLASS_CONFLICT");
          if (r.teacherId === fields.teacherId) fail("TEACHER_CONFLICT");
          if (fields.room && roomKey(r.room) === roomKey(fields.room)) fail("ROOM_CONFLICT");
        }
      } else {
        const classIds = values.audience === "classes" ? values.classIds : [];
        if (!Array.isArray(classIds) || (values.audience === "classes" && !classIds.length) || new Set(classIds).size !== classIds.length || !classIds.every((id) => academic.classes.some((c) => c.id === id && c.status === "active"))) fail("INVALID_AUDIENCE");
        fields = { type: values.type, title: text(values.title, 160), description: text(values.description, 4000), dateTime: values.dateTime, audience: values.audience, classIds: [...classIds], location: text(values.location ?? "", 160, true) };
        if (!localDate(fields.dateTime)) fail("INVALID_DATE");
      }
      const row = { id: old?.id || crypto.randomUUID(), schoolId: db.schoolId, ...fields };
      if (!validRow(kind, row)) fail("INVALID_FIELDS");
      db.records = old ? db.records.map((r) => r.id === id ? row : r) : [...db.records, row];
      return row;
    });
  }
  function remove(kind, id, expected) {
    return commit(kind, expected, (db) => {
      if (!db.records.some((r) => r.id === id)) fail("NOT_FOUND");
      db.records = db.records.filter((r) => r.id !== id);
    });
  }
  function dashboard(now = new Date()) {
    const timetable = snapshot("timetable"), events = snapshot("events");
    return {
      today: timetable.records.filter((r) => r.status === "active" && r.day === now.getDay()).sort((a, b) => a.startTime.localeCompare(b.startTime)),
      upcoming: events.records.filter((r) => r.status === "active" && +localDate(r.dateTime) >= +now).sort((a, b) => a.dateTime.localeCompare(b.dateTime)),
      needsRepair: timetable.records.filter((r) => r.status !== "active").length + events.records.filter((r) => r.status !== "active").length,
      academic: timetable.academic,
    };
  }
  window.OrbitSchoolSchedule = { read, snapshot, save, remove, dashboard, storageKey, prefixes, localDate };
})();
