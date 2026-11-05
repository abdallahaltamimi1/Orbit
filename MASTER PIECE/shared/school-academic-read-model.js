/* Read-only school snapshots, consumed by the separate annual student view. */
(() => {
  "use strict";
  const fail = (code) => { throw Error(code); };
  const id = (v) => typeof v === "string" && !!v.trim() && v === v.trim();
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const object = (v) => v && typeof v === "object" && !Array.isArray(v);
  const text = (v, max = 100) => typeof v === "string" && !!v.trim() && v.length <= max;
  const date = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && v.slice(0, 4) !== "0000" && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  function capture() {
    const raw = new Map();
    const get = (key, fallback, code = "INVALID_DATA") => {
      let value;
      try { value = localStorage.getItem(key); } catch { fail("STORAGE_FAILED"); }
      raw.set(key, value);
      if (value === null) return clone(fallback);
      try { return JSON.parse(value); } catch { fail(code); }
    };
    // OrbitAuth.current() may remove a disabled session. Read its inputs without that side effect.
    const user = get("orbitUser", null, "INVALID_AUTH_DATA");
    if (!object(user) || user.role !== "school" || !id(user.email)) fail("ROLE_DENIED");
    const accounts = get("orbit.recruitment.v1", { accounts: [] }, "INVALID_AUTH_DATA");
    const admin = get("orbit.admin.v1", {}, "INVALID_AUTH_DATA");
    if (!object(accounts) || !Array.isArray(accounts.accounts) || !object(admin)) fail("INVALID_AUTH_DATA");
    const matches = accounts.accounts.filter((a) => a?.email === user.email);
    if (matches.length > 1 || matches.some((a) => a.role !== "school" || ["suspended", "deleted"].includes(a.status)) || ["suspended", "deleted"].includes(admin.accountStates?.[user.email]?.status)) fail("ROLE_DENIED");
    return { schoolId: user.email, get, finish(value) {
      for (const [key, original] of raw) {
        let current;
        try { current = localStorage.getItem(key); } catch { fail("STORAGE_FAILED"); }
        if (current !== original) fail("SNAPSHOT_CHANGED");
      }
      return clone(value);
    } };
  }
  function yearsFrom(s) {
    const db = s.get(OrbitSchoolYears.storageKey(s.schoolId), { schema: 1, schoolId: s.schoolId, revision: 0, activeYearId: null, years: [] }, "INVALID_YEAR_DATA");
    if (!object(db) || db.schema !== 1 || db.schoolId !== s.schoolId || !Number.isSafeInteger(db.revision) || db.revision < 0 || !Array.isArray(db.years)) fail("INVALID_YEAR_DATA");
    const ids = new Set(), names = new Set();
    for (const y of db.years) {
      if (!object(y) || y.schoolId !== s.schoolId || !id(y.id) || ids.has(y.id) || !text(y.name) || names.has(y.name.normalize("NFKC").trim().toLocaleLowerCase()) || !["upcoming", "active", "archived"].includes(y.status) || !date(y.startDate) || !date(y.endDate) || y.endDate <= y.startDate || ![y.createdAt, y.updatedAt].every((v) => v === undefined || (typeof v === "string" && Number.isFinite(Date.parse(v))))) fail("INVALID_YEAR_DATA");
      ids.add(y.id); names.add(y.name.normalize("NFKC").trim().toLocaleLowerCase());
    }
    const active = db.years.filter((y) => y.status === "active"), live = db.years.filter((y) => y.status !== "archived");
    if (active.length > 1 || db.activeYearId !== (active[0]?.id || null)) fail("INVALID_YEAR_DATA");
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (live[i].startDate <= live[j].endDate && live[j].startDate <= live[i].endDate) fail("INVALID_YEAR_DATA");
    return db;
  }
  function academicFrom(s) {
    const db = s.get(OrbitSchoolAcademics.storageKey(s.schoolId), null, "INVALID_ACADEMIC_DATA");
    if (db === null) fail("ACADEMIC_DATA_REQUIRED");
    if (!object(db) || db.schema !== 1 || db.schoolId !== s.schoolId || !Number.isSafeInteger(db.revision) || db.revision < 0) fail("INVALID_ACADEMIC_DATA");
    for (const kind of ["students", "classes", "teachers", "subjects", "allocations"]) {
      if (!Array.isArray(db[kind]) || db[kind].some((r) => !object(r) || !id(r.id) || r.schoolId !== s.schoolId) || new Set(db[kind].map((r) => r.id)).size !== db[kind].length) fail("INVALID_ACADEMIC_DATA");
    }
    if (db.students.some((r) => !text(r.name) || !text(r.studentCode, 50) || !["enrolled", "inactive", "graduated"].includes(r.status) || (r.classId !== null && !id(r.classId))) || new Set(db.students.map((r) => r.studentCode.normalize("NFKC").trim().toLocaleLowerCase())).size !== db.students.length) fail("INVALID_ACADEMIC_DATA");
    if (db.classes.some((r) => !text(r.grade, 40) || !text(r.section, 40) || typeof r.academicYear !== "string" || !/^\d{4}-\d{4}$/.test(r.academicYear) || +r.academicYear.slice(5) !== +r.academicYear.slice(0, 4) + 1 || !["active", "archived"].includes(r.status))) fail("INVALID_ACADEMIC_DATA");
    // Dangling legacy references are reported, not repaired or fabricated.
    return db;
  }
  function availableYears() {
    const s = capture(), db = yearsFrom(s);
    return s.finish({ schema: 1, schoolId: s.schoolId, revision: db.revision, activeYearId: db.activeYearId, years: db.years, educationalAccess: false });
  }
  function read(academicYearId) {
    if (!id(academicYearId)) fail("YEAR_ID_REQUIRED");
    const s = capture(), years = yearsFrom(s);
    const selectedYear = years.years.find((y) => y.id === academicYearId);
    if (!selectedYear) fail("YEAR_NOT_FOUND");
    const academic = academicFrom(s), E = OrbitSchoolEnrollments;
    const rawEnrollment = s.get(E.storageKey(s.schoolId), { schema: 1, schoolId: s.schoolId, revision: 0, classYearLinks: [], enrollments: [], placements: [], transfers: [], operations: [] }, "INVALID_ENROLLMENT_DATA");
    const rawMapping = s.get(E.mappingKey(s.schoolId), { schema: 1, schoolId: s.schoolId, revision: 0, mappings: [], history: [], operations: [] }, "INVALID_MAPPING_DATA");
    let foundation;
    try { foundation = E.inspectSnapshots(s.schoolId, rawEnrollment, rawMapping); } catch { fail("INVALID_FOUNDATION_DATA"); }
    const db = foundation.enrollments, mappings = foundation.mappings.mappings;
    const diagnostics = [];
    const identity = (studentId) => {
      const m = mappings.find((m) => m.academicStudentId === studentId);
      return m ? { status: m.status, mappingId: m.id, accountId: m.accountId } : { status: "unresolved", mappingId: null, accountId: null };
    };
    const selectedLinks = db.classYearLinks.filter((l) => l.academicYearId === academicYearId);
    const classes = selectedLinks.map((l) => {
      const c = academic.classes.find((c) => c.id === l.classId);
      const issues = [];
      if (!c) issues.push("CLASS_RECORD_MISSING");
      else if (c.grade !== l.gradeSnapshot || c.section !== l.sectionSnapshot || c.academicYear !== l.legacyYearSnapshot) issues.push("LEGACY_CLASS_LABELS_CHANGED");
      return { classId: l.classId, classYearLinkId: l.id, academicYearId, relationship: "reviewed", grade: l.gradeSnapshot, section: l.sectionSnapshot, legacyClass: c || null, issues };
    });
    const enrollments = db.enrollments.filter((e) => e.academicYearId === academicYearId).map((e) => {
      const issues = [], warnings = [];
      const student = academic.students.find((r) => r.id === e.academicStudentId);
      const m = mappings.find((m) => m.id === e.mappingId);
      const p = db.placements.find((p) => p.id === e.currentPlacementId && p.enrollmentId === e.id);
      const c = classes.find((c) => c.classId === p.classId);
      if (!student) issues.push("ROSTER_STUDENT_MISSING");
      const corrected=m&&foundation.mappings.history.some(h=>h.mappingId===m.id&&h.type==='corrected'&&h.fromAccountId===e.accountId);
      if (!m || m.status !== "confirmed" || m.academicStudentId !== e.academicStudentId || m.accountId !== e.accountId&&!corrected) issues.push("IDENTITY_MAPPING_MISMATCH");
      else if(corrected&&m.accountId!==e.accountId) warnings.push('IDENTITY_CORRECTED');
      let placementIssues=c?.issues || [];
      if(e.structure==='section') {
        const structure=s.get('orbit.school.section-structures.demo.v1:'+encodeURIComponent(s.schoolId),null);
        if(!structure||structure.schoolId!==s.schoolId||!Array.isArray(structure.sections)||!Array.isArray(structure.grades)) placementIssues=['SECTION_RECORD_MISSING'];
        else {
          const section=structure.sections.find(r=>r.id===p.sectionId&&r.schoolId===s.schoolId&&r.academicYearId===academicYearId&&r.gradeId===p.gradeId),grade=structure.grades.find(g=>g.id===p.gradeId&&g.schoolId===s.schoolId);
          if(!section||!grade)placementIssues=['SECTION_RECORD_MISSING'];
          else if(section.name!==p.sectionSnapshot||grade.name!==p.gradeSnapshot)placementIssues=['SECTION_LABELS_CHANGED'];
        }
      }
      for (const issue of placementIssues) {
        // An archived snapshot is not relabeled using today's class data.
        if (selectedYear.status === "archived" && ['LEGACY_CLASS_LABELS_CHANGED','SECTION_LABELS_CHANGED'].includes(issue)) warnings.push(issue);
        else issues.push(issue);
      }
      return { ...e, recordType: "annual-enrollment", verification: issues.length ? "unresolved" : "verified", issues, warnings, currentPlacement: p, identity: identity(e.academicStudentId), educationalAccess: false };
    });
    const studentIds = new Set([...academic.students.map((r) => r.id), ...enrollments.map((e) => e.academicStudentId)]);
    const students = [...studentIds].map((studentId) => {
      const legacy = academic.students.find((r) => r.id === studentId) || null;
      const enrollment = enrollments.find((e) => e.academicStudentId === studentId) || null;
      const legacyClass = academic.classes.find((c) => c.id === legacy?.classId) || null;
      return { academicStudentId: studentId, name: legacy?.name || null, recordType: enrollment ? "annual-enrollment" : "legacy-roster-only", hasAnnualEnrollment: !!enrollment, verification: enrollment?.verification || "not-enrolled", issues: enrollment?.issues || [], warnings: enrollment?.warnings || [], enrollmentId: enrollment?.id || null, identity: { ...identity(studentId), enrollmentMatch: enrollment ? !enrollment.issues.includes("IDENTITY_MAPPING_MISMATCH") : null }, currentPlacement: enrollment?.currentPlacement || null, placementHistory: enrollment ? db.placements.filter(p=>p.enrollmentId===enrollment.id).map(p=>({id:p.id,gradeSnapshot:p.gradeSnapshot,sectionSnapshot:p.sectionSnapshot,createdAt:p.createdAt,reason:db.transfers.find(e=>e.destinationPlacementId===p.id)?.reason||null})) : [], legacyStudent: legacy, legacyPlacement: legacy?.classId ? { classId: legacy.classId, grade: legacyClass?.grade || null, section: legacyClass?.section || null, academicYearLabel: legacyClass?.academicYear || null, relationship: legacyClass ? "legacy-only" : "missing-class" } : null, educationalAccess: false };
    });
    for (const e of db.enrollments) if (!years.years.some((y) => y.id === e.academicYearId)) diagnostics.push({ code: "ENROLLMENT_YEAR_MISSING", enrollmentId: e.id });
    for (const l of db.classYearLinks) if (!years.years.some((y) => y.id === l.academicYearId)) diagnostics.push({ code: "CLASS_LINK_YEAR_MISSING", classYearLinkId: l.id });
    for (const m of mappings) if (!academic.students.some((r) => r.id === m.academicStudentId)) diagnostics.push({ code: "MAPPING_ROSTER_MISSING", mappingId: m.id });
    return s.finish({ schema: 1, schoolId: s.schoolId, selectedYear, activeYearId: years.activeYearId,
      sourceRevisions: { academic: academic.revision, years: years.revision, enrollments: db.revision, mappings: foundation.mappings.revision },
      enrollments, students, classes,
      studentsWithoutEnrollment: students.filter((r) => !r.hasAnnualEnrollment),
      unresolvedIdentities: students.filter((r) => r.identity.status !== "confirmed" || r.identity.enrollmentMatch === false),
      unresolvedClasses: academic.classes.filter((c) => !db.classYearLinks.some((l) => l.classId === c.id)).map((c) => ({ classId: c.id, legacyClass: c, academicYearId: null, relationship: "unresolved" })),
      diagnostics, educationalAccess: false,
    });
  }
  window.OrbitSchoolAcademicReadModel = Object.freeze({ availableYears, read });
})();
