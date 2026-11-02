/* Isolated browser-local academic demo records. This is not a security boundary. */
(() => {
  "use strict";
  const prefix = "orbit.school.academics.demo.v1:";
  const kinds = ["students", "teachers", "classes", "subjects", "allocations"];
  const fail = (code) => { throw Error(code); };
  const norm = (value) => String(value || "").normalize("NFKC").trim().toLocaleLowerCase();
  const text = (value, max = 100) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) fail("INVALID_FIELDS");
    return value.trim();
  };
  function school() {
    const user = window.OrbitAuth?.current();
    if (user?.role !== "school" || !user.email?.trim()) fail("ROLE_DENIED");
    return user.email;
  }
  const storageKey = (id = school()) => prefix + encodeURIComponent(id);
  function seed(schoolId) {
    const row = (values) => ({ id: crypto.randomUUID(), schoolId, ...values });
    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Amman" }).format(new Date()));
    const academicYear = `${year}-${year + 1}`;
    const classes = [row({ grade: "7", section: "A", academicYear, status: "active" }), row({ grade: "8", section: "B", academicYear, status: "active" })];
    const subjects = [row({ name: "Mathematics · الرياضيات", status: "active" }), row({ name: "Science · العلوم", status: "active" })];
    const teachers = [row({ teacherCode: "DEMO-T01", name: "Demo Teacher 1 · معلم تجريبي ١" }), row({ teacherCode: "DEMO-T02", name: "Demo Teacher 2 · معلم تجريبي ٢" })];
    return {
      schema: 1, schoolId, revision: 0,
      classes, subjects, teachers,
      students: [row({ studentCode: "DEMO-S01", name: "Demo Student 1 · طالب تجريبي ١", status: "enrolled", classId: classes[0].id }), row({ studentCode: "DEMO-S02", name: "Demo Student 2 · طالب تجريبي ٢", status: "enrolled", classId: classes[1].id })],
      allocations: [row({ teacherId: teachers[0].id, subjectId: subjects[0].id, classId: classes[0].id })],
    };
  }
  function validate(db, schoolId) {
    if (!db || db.schema !== 1 || db.schoolId !== schoolId || !Number.isInteger(db.revision) || db.revision < 0) fail("INVALID_DATA");
    for (const kind of kinds) {
      if (!Array.isArray(db[kind])) fail("INVALID_DATA");
      const ids = new Set();
      for (const row of db[kind]) {
        if (!row || row.schoolId !== schoolId || typeof row.id !== "string" || !row.id || ids.has(row.id)) fail("INVALID_DATA");
        ids.add(row.id);
      }
    }
    const named = (rows) => rows.every((r) => typeof r.name === "string" && r.name.trim() && r.name.length <= 100);
    const unique = (rows, key) => new Set(rows.map(key)).size === rows.length;
    if (!named(db.students) || !named(db.teachers) || !named(db.subjects)) fail("INVALID_DATA");
    for (const [kind, code] of [["students", "studentCode"], ["teachers", "teacherCode"]]) {
      if (!db[kind].every((r) => typeof r[code] === "string" && r[code].trim() && r[code].length <= 50) || !unique(db[kind], (r) => norm(r[code]))) fail("INVALID_DATA");
    }
    if (!db.classes.every((r) => typeof r.grade === "string" && r.grade.trim() && typeof r.section === "string" && r.section.trim() && validYear(r.academicYear) && ["active", "archived"].includes(r.status)) || !unique(db.classes, classKey)) fail("INVALID_DATA");
    if (!db.subjects.every((r) => ["active", "archived"].includes(r.status))) fail("INVALID_DATA");
    if (!db.students.every((r) => ["enrolled", "inactive", "graduated"].includes(r.status) && (r.classId === null || db.classes.some((c) => c.id === r.classId)))) fail("INVALID_DATA");
    if (!db.allocations.every((r) => db.teachers.some((t) => t.id === r.teacherId) && db.subjects.some((s) => s.id === r.subjectId) && db.classes.some((c) => c.id === r.classId)) || !unique(db.allocations, allocationKey)) fail("INVALID_DATA");
    return db;
  }
  const validYear = (value) => typeof value === "string" && /^\d{4}-\d{4}$/.test(value) && Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;
  const classKey = (r) => JSON.stringify([norm(r.grade), norm(r.section), r.academicYear]);
  // Each class/subject has one teacher; update that allocation to change the teacher.
  const allocationKey = (r) => JSON.stringify([r.classId, r.subjectId]);
  function write(db) {
    try { localStorage.setItem(storageKey(db.schoolId), JSON.stringify(db)); }
    catch { fail("STORAGE_FAILED"); }
  }
  function read() {
    const schoolId = school();
    let raw;
    try { raw = localStorage.getItem(storageKey(schoolId)); } catch { fail("STORAGE_FAILED"); }
    if (raw === null) {
      const db = seed(schoolId);
      write(db);
      return db;
    }
    let db;
    try { db = JSON.parse(raw); } catch { fail("INVALID_DATA"); }
    return validate(db, schoolId);
  }
  function commit(context, operation) {
    const db = read();
    if (context?.schoolId !== db.schoolId) fail("SCHOOL_CHANGED");
    if (context.revision !== db.revision) fail("STALE_DATA");
    const result = operation(db);
    db.revision++;
    validate(db, db.schoolId);
    write(db);
    window.dispatchEvent(new Event("orbit:school-academics-change"));
    return result;
  }
  const find = (db, kind, id) => db[kind].find((r) => r.id === id) || fail("NOT_FOUND");
  function save(kind, id, values, context) {
    if (!kinds.includes(kind)) fail("INVALID_FIELDS");
    return commit(context, (db) => {
      const old = id ? find(db, kind, id) : null;
      let fields;
      if (kind === "students" || kind === "teachers") {
        const code = kind === "students" ? "studentCode" : "teacherCode";
        fields = { name: text(values.name), [code]: text(values[code], 50) };
        if (db[kind].some((r) => r.id !== id && norm(r[code]) === norm(fields[code]))) fail(kind === "students" ? "DUPLICATE_STUDENT" : "DUPLICATE_TEACHER");
        if (kind === "students") {
          if (!["enrolled", "inactive", "graduated"].includes(values.status)) fail("INVALID_FIELDS");
          fields.status = values.status;
          fields.classId = values.classId || null;
          if (fields.classId) {
            const classroom = find(db, "classes", fields.classId);
            if (classroom.status !== "active" && old?.classId !== fields.classId) fail("ARCHIVED_RECORD");
          }
        }
      } else if (kind === "classes") {
        fields = { grade: text(values.grade, 40), section: text(values.section, 40), academicYear: text(values.academicYear, 9), status: old?.status || "active" };
        if (!validYear(fields.academicYear)) fail("INVALID_YEAR");
        if (db.classes.some((r) => r.id !== id && classKey(r) === classKey(fields))) fail("DUPLICATE_CLASS");
      } else if (kind === "subjects") {
        fields = { name: text(values.name), status: old?.status || "active" };
      } else {
        const teacher = find(db, "teachers", values.teacherId);
        const subject = find(db, "subjects", values.subjectId);
        const classroom = find(db, "classes", values.classId);
        fields = { teacherId: teacher.id, subjectId: subject.id, classId: classroom.id };
        if (subject.status !== "active" || classroom.status !== "active") fail("ARCHIVED_RECORD");
        if (db.allocations.some((r) => r.id !== id && allocationKey(r) === allocationKey(fields))) fail("DUPLICATE_ALLOCATION");
      }
      const row = { ...old, id: old?.id || crypto.randomUUID(), schoolId: db.schoolId, ...fields };
      db[kind] = old ? db[kind].map((r) => r.id === id ? row : r) : [...db[kind], row];
      return row;
    });
  }
  function remove(kind, id, context) {
    if (!["students", "teachers", "allocations"].includes(kind)) fail("INVALID_FIELDS");
    return commit(context, (db) => {
      const row = find(db, kind, id);
      if ((kind === "students" && row.classId) || (kind === "teachers" && db.allocations.some((r) => r.teacherId === id))) fail("LINKED_RECORD");
      db[kind] = db[kind].filter((r) => r.id !== id);
    });
  }
  function archive(kind, id, context) {
    if (!["classes", "subjects"].includes(kind)) fail("INVALID_FIELDS");
    return commit(context, (db) => { find(db, kind, id).status = "archived"; });
  }
  window.OrbitSchoolAcademics = { read, save, remove, archive, storageKey, prefix };
})();
