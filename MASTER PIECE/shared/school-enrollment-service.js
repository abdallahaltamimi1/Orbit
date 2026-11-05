/* Annual enrollment and reviewed identity history. No legacy roster or channel writes. */
(() => {
  "use strict";
  const prefix = "orbit.school.enrollments.demo.v1:";
  const mappingPrefix = "orbit.school.enrollment-identities.demo.v1:";
  const fail = (code) => { throw Error(code); };
  const id = (v) => typeof v === "string" && !!v.trim() && v === v.trim();
  const instant = (v) => typeof v === "string" && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  function school() {
    const u = window.OrbitAuth?.current();
    if (u?.role !== "school" || !id(u.email)) fail("ROLE_DENIED");
    return u.email;
  }
  const storageKey = (schoolId = school()) => prefix + encodeURIComponent(schoolId);
  const mappingKey = (schoolId = school()) => mappingPrefix + encodeURIComponent(schoolId);
  function json(key, fallback) {
    let raw;
    try { raw = localStorage.getItem(key); } catch { fail("STORAGE_FAILED"); }
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { fail("INVALID_DATA"); }
  }
  function base(db, schoolId, arrays) {
    if (!db || db.schema !== 1 || db.schoolId !== schoolId || !Number.isSafeInteger(db.revision) || db.revision < 0) fail("INVALID_DATA");
    for (const key of arrays) {
      if (!Array.isArray(db[key])) fail("INVALID_DATA");
      const seen = new Set();
      for (const row of db[key]) {
        if (!row || !id(row.id) || row.schoolId !== schoolId || seen.has(row.id)) fail("INVALID_DATA");
        seen.add(row.id);
      }
    }
    if (!db.operations.every((r) => id(r.operationId) && typeof r.payload === "string" && r.result && instant(r.createdAt)) || new Set(db.operations.map((r) => r.operationId)).size !== db.operations.length) fail("INVALID_DATA");
    return db;
  }
  function identities(schoolId, input) {
    const db = base(input === undefined ? json(mappingKey(schoolId), { schema: 1, schoolId, revision: 0, mappings: [], history: [], operations: [] }) : input, schoolId, ["mappings", "history", "operations"]);
    const students = new Set(), accounts = new Set();
    for (const r of db.mappings) {
      if (!id(r.academicStudentId) || students.has(r.academicStudentId) || !["pending", "confirmed"].includes(r.status) || !instant(r.createdAt) || !instant(r.updatedAt)) fail("INVALID_DATA");
      students.add(r.academicStudentId);
      if (r.status === "pending" ? r.accountId !== null : !id(r.accountId) || accounts.has(r.accountId) || !instant(r.confirmedAt) || !id(r.actorId)) fail("INVALID_DATA");
      if (r.status === "confirmed") accounts.add(r.accountId);
      const events = db.history.filter((h) => h.mappingId === r.id);
      if (events[0]?.type !== "requested" || events.filter(h=>h.type === "requested").length !== 1 || events.filter(h=>h.type === "confirmed").length !== (r.status === "confirmed" ? 1 : 0)) fail("INVALID_DATA");
      let linked = null;
      for (const h of events) { if(h.fromAccountId !== linked) fail("INVALID_DATA"); linked=h.toAccountId; }
      const last=events.at(-1);
      if (linked !== r.accountId || (r.status === "confirmed" && (last.actorId !== r.actorId || last.createdAt !== r.confirmedAt))) fail("INVALID_DATA");
    }
    if (!db.history.every((h) => db.mappings.some((r) => r.id === h.mappingId) && ["requested", "confirmed", "corrected"].includes(h.type) && id(h.actorId) && instant(h.createdAt) && (h.type === "corrected" ? id(h.fromAccountId) && id(h.toAccountId) && h.fromAccountId !== h.toAccountId && typeof h.reason === "string" && !!h.reason.trim() && id(h.operationId) : h.fromAccountId === null && (h.type === "requested" ? h.toAccountId === null : id(h.toAccountId))))) fail("INVALID_DATA");
    return db;
  }
  function enrollments(schoolId, input) {
    const db = base(input === undefined ? json(storageKey(schoolId), { schema: 1, schoolId, revision: 0, classYearLinks: [], enrollments: [], placements: [], transfers: [], operations: [] }) : input, schoolId, ["classYearLinks", "enrollments", "placements", "transfers", "operations"]);
    const classes = new Set(), students = new Set();
    for (const r of db.classYearLinks) {
      if (![r.classId, r.academicYearId, r.gradeSnapshot, r.sectionSnapshot, r.legacyYearSnapshot, r.actorId].every(id) || !instant(r.confirmedAt) || classes.has(r.classId)) fail("INVALID_DATA");
      classes.add(r.classId);
    }
    for (const r of db.enrollments) {
      const studentKey = JSON.stringify([r.academicYearId, r.academicStudentId]);
      const modern = r.structure === "section";
      if (![r.academicYearId, r.academicStudentId, r.accountId, r.mappingId, r.currentPlacementId].every(id) || r.status !== "enrolled" || r.educationalAccess !== false || !instant(r.createdAt) || !instant(r.updatedAt) || !Number.isSafeInteger(r.revision) || r.revision < 1 || (!modern && r.revision !== 1) || students.has(studentKey)) fail("INVALID_DATA");
      students.add(studentKey);
      const placements = db.placements.filter((p) => p.enrollmentId === r.id);
      const p = placements.at(-1);
      if (!p || p.id !== r.currentPlacementId) fail("INVALID_DATA");
      if (modern) {
        if (![r.gradeId,r.sectionId].every(id) || r.gradeId !== p.gradeId || r.sectionId !== p.sectionId || placements.length !== r.revision) fail("INVALID_DATA");
        for(let i=0;i<placements.length;i++) {
          const q=placements[i];
          if(q.classId !== undefined || ![q.sectionId,q.gradeId].every(id) || q.academicYearId !== r.academicYearId || q.previousPlacementId !== (placements[i-1]?.id || null)) fail("INVALID_DATA");
          const events=db.transfers.filter(t=>t.destinationPlacementId===q.id);
          if(i===0 ? events.length!==0 : events.length!==1 || events[0].sourcePlacementId!==q.previousPlacementId || events[0].enrollmentId!==r.id) fail("INVALID_DATA");
        }
      } else if (placements.length !== 1 || !db.classYearLinks.some((l) => l.classId === p.classId && l.academicYearId === r.academicYearId && l.gradeSnapshot === p.gradeSnapshot && l.sectionSnapshot === p.sectionSnapshot)) fail("INVALID_DATA");
    }
    if (!db.placements.every((p) => db.enrollments.some((r) => r.id === p.enrollmentId) && [p.gradeSnapshot, p.sectionSnapshot, p.actorId].every(id) && (p.sectionId ? id(p.gradeId) : id(p.classId) && p.previousPlacementId === null) && instant(p.effectiveAt) && instant(p.createdAt))) fail("INVALID_DATA");
    if (!db.transfers.every(t=>db.enrollments.some(e=>e.id===t.enrollmentId&&e.structure==='section') && [t.sourcePlacementId,t.destinationPlacementId,t.actorId,t.operationId].every(id) && typeof t.reason==='string' && !!t.reason.trim() && instant(t.confirmedAt) && db.placements.some(p=>p.id===t.destinationPlacementId&&p.enrollmentId===t.enrollmentId))) fail("INVALID_DATA");
    return db;
  }
  function sources() {
    const schoolId = school();
    // Academic read() seeds absent data: explicitly refuse to call it until a store exists.
    if (json(OrbitSchoolAcademics.storageKey(schoolId), null) === null) fail("ACADEMIC_DATA_REQUIRED");
    const academic = OrbitSchoolAcademics.read(), years = OrbitSchoolYears.read();
    return { schoolId, academic, years, mappings: identities(schoolId), db: enrollments(schoolId) };
  }
  const context = (s) => ({ schoolId: s.schoolId, revision: s.db.revision, mappingRevision: s.mappings.revision, academicRevision: s.academic.revision, yearRevision: s.years.revision, structureSnapshot: localStorage.getItem('orbit.school.section-structures.demo.v1:'+encodeURIComponent(s.schoolId)) });
  function read() { const s = sources(); return { ...s.db, context: context(s) }; }
  function readMappings() { const s = sources(); return { ...s.mappings, context: context(s) }; }
  function mutate(kind, expected, operationId, action, values, operation) {
    if (!id(operationId) || operationId.length > 160) fail("OPERATION_ID_REQUIRED");
    const s = sources(), db = kind === "mapping" ? s.mappings : s.db;
    if (expected?.schoolId !== s.schoolId) fail("SCHOOL_CHANGED");
    const payload = JSON.stringify([action, values]);
    const prior = db.operations.find((r) => r.operationId === operationId);
    if (prior) {
      if (prior.payload !== payload) fail("OPERATION_CONFLICT");
      return clone(prior.result); // Replay returns the saved result and performs no write.
    }
    const current = context(s);
    if (["revision", "mappingRevision", "academicRevision", "yearRevision", "structureSnapshot"].some((k) => expected[k] !== current[k])) fail("STALE_DATA");
    const result = operation(s);
    db.revision++;
    db.operations.push({ id: crypto.randomUUID(), schoolId: s.schoolId, operationId, payload, result: clone(result), createdAt: new Date().toISOString() });
    // Validate the proposed envelope without writing it or touching another storage key.
    validateProposed(kind, db);
    try { localStorage.setItem(kind === "mapping" ? mappingKey(s.schoolId) : storageKey(s.schoolId), JSON.stringify(db)); } catch { fail("STORAGE_FAILED"); }
    window.dispatchEvent(new Event("orbit:school-enrollments-change"));
    return clone(result);
  }
  function validateProposed(kind, db) {
    return kind === "mapping" ? identities(db.schoolId, db) : enrollments(db.schoolId, db);
  }
  function roster(s, studentId) {
    return s.academic.students.find((r) => r.id === studentId) || fail("STUDENT_NOT_FOUND");
  }
  function year(s, yearId) {
    const r = s.years.years.find((r) => r.id === yearId) || fail("YEAR_NOT_FOUND");
    if (r.status === "archived") fail("ARCHIVED_YEAR");
    return r;
  }
  function account(accountId) {
    if (!id(accountId) || accountId !== accountId.toLowerCase()) fail("INVALID_ACCOUNT");
    const db = json("orbit.recruitment.v1", { accounts: [] });
    if (!db || !Array.isArray(db.accounts)) fail("INVALID_DATA");
    const matches = db.accounts.filter((a) => a.email === accountId);
    const r = matches.length === 1 ? matches[0] : accountId === "student@orbit.com" && !matches.length ? { role: "student", status: "active" } : null;
    const admin = json("orbit.admin.v1", {});
    if (!r || r.role !== "student" || r.status !== "active" || ["suspended", "deleted"].includes(admin?.accountStates?.[accountId]?.status)) fail("INVALID_ACCOUNT");
    return accountId;
  }
  function requestMapping(academicStudentId, expected, operationId) {
    return mutate("mapping", expected, operationId, "request-mapping", [academicStudentId], (s) => {
      roster(s, academicStudentId);
      if (s.mappings.mappings.some((r) => r.academicStudentId === academicStudentId)) fail("DUPLICATE_MAPPING");
      const now = new Date().toISOString(), r = { id: crypto.randomUUID(), schoolId: s.schoolId, academicStudentId, accountId: null, status: "pending", createdAt: now, updatedAt: now };
      s.mappings.mappings.push(r);
      s.mappings.history.push({ id: crypto.randomUUID(), schoolId: s.schoolId, mappingId: r.id, type: "requested", fromAccountId: null, toAccountId: null, actorId: s.schoolId, createdAt: now });
      return r;
    });
  }
  function confirmMapping(mappingId, accountId, expected, operationId, confirmed = false) {
    return mutate("mapping", expected, operationId, "confirm-mapping", [mappingId, accountId, confirmed], (s) => {
      if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
      const r = s.mappings.mappings.find((r) => r.id === mappingId) || fail("MAPPING_NOT_FOUND");
      if (r.status !== "pending") fail("MAPPING_CORRECTION_DISABLED");
      roster(s, r.academicStudentId); account(accountId);
      if (s.mappings.mappings.some((m) => m.accountId === accountId && m.status === "confirmed")) fail("CONFLICTING_MAPPING");
      const now = new Date().toISOString();
      Object.assign(r, { accountId, status: "confirmed", actorId: s.schoolId, confirmedAt: now, updatedAt: now });
      s.mappings.history.push({ id: crypto.randomUUID(), schoolId: s.schoolId, mappingId: r.id, type: "confirmed", fromAccountId: null, toAccountId: accountId, actorId: s.schoolId, createdAt: now });
      return r;
    });
  }
  function correctMapping(mappingId, accountId, reason, expected, operationId, confirmed = false) {
    if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
    if (typeof reason !== "string" || !reason.trim() || reason.trim().length>500) fail("REASON_REQUIRED");
    return mutate("mapping", expected, operationId, "correct-mapping", [mappingId,accountId,reason.trim(),confirmed], s=>{
      const r=s.mappings.mappings.find(m=>m.id===mappingId&&m.status==='confirmed') || fail('MAPPING_NOT_FOUND');
      roster(s,r.academicStudentId); account(accountId);
      if(r.accountId===accountId) fail('NO_CHANGE');
      if(s.mappings.mappings.some(m=>m.id!==r.id&&m.accountId===accountId)) fail('CONFLICTING_MAPPING');
      if(window.OrbitSchoolYearContext?.readOnly()) fail('ARCHIVED_YEAR');
      for(const e of s.db.enrollments.filter(e=>e.mappingId===r.id)) { const y=s.years.years.find(y=>y.id===e.academicYearId); if(!y) fail('YEAR_NOT_FOUND'); if(y.status!=='archived') crossSchoolCheck(s,accountId,y); }
      const now=new Date().toISOString(),fromAccountId=r.accountId;
      Object.assign(r,{accountId,actorId:s.schoolId,confirmedAt:now,updatedAt:now});
      s.mappings.history.push({id:crypto.randomUUID(),schoolId:s.schoolId,mappingId:r.id,type:'corrected',fromAccountId,toAccountId:accountId,reason:reason.trim(),actorId:s.schoolId,operationId,createdAt:now});
      return r;
    });
  }
  function confirmClassYear(classId, academicYearId, expected, operationId, confirmed = false) {
    return mutate("enrollment", expected, operationId, "class-year", [classId, academicYearId, confirmed], (s) => {
      if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
      year(s, academicYearId);
      const c = s.academic.classes.find((r) => r.id === classId && r.status === "active") || fail("INVALID_CLASS");
      if (s.db.classYearLinks.some((r) => r.classId === classId)) fail("CLASS_ALREADY_REVIEWED");
      const r = { id: crypto.randomUUID(), schoolId: s.schoolId, classId, academicYearId, gradeSnapshot: c.grade, sectionSnapshot: c.section, legacyYearSnapshot: c.academicYear, actorId: s.schoolId, confirmedAt: new Date().toISOString() };
      s.db.classYearLinks.push(r); return r;
    });
  }
  function crossSchoolCheck(s, accountId, targetYear) {
    // Best-effort same-origin snapshot only. No shared account registry or authorization.
    let keys;
    try { keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix) && k !== storageKey(s.schoolId)); } catch { fail("STORAGE_FAILED"); }
    for (const key of keys) {
      try {
        const otherId = decodeURIComponent(key.slice(prefix.length));
        if (!id(otherId) || key !== storageKey(otherId)) fail("CROSS_SCHOOL_UNVERIFIABLE");
        const other = enrollments(otherId);
        const otherMappings=identities(otherId);
        if(other.enrollments.some(e=>!otherMappings.mappings.some(m=>m.id===e.mappingId&&m.status==='confirmed')))fail('CROSS_SCHOOL_UNVERIFIABLE');
        const relevant = other.enrollments.filter(r=>otherMappings.mappings.some(m=>m.id===r.mappingId&&m.accountId===accountId));
        if (!relevant.length) continue;
        const years = json(OrbitSchoolYears.storageKey(otherId), null);
        if (!years || years.schema !== 1 || years.schoolId !== otherId || !Array.isArray(years.years)) fail("CROSS_SCHOOL_UNVERIFIABLE");
        for (const e of relevant) {
          const matches = years.years.filter((r) => r.id === e.academicYearId);
          const y = matches[0];
          const validDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
          if (matches.length !== 1 || y.schoolId !== otherId || !["upcoming", "active", "archived"].includes(y.status) || !validDate(y.startDate) || !validDate(y.endDate) || y.endDate <= y.startDate) fail("CROSS_SCHOOL_UNVERIFIABLE");
          if (y.status !== "archived" && y.startDate <= targetYear.endDate && targetYear.startDate <= y.endDate) fail("CROSS_SCHOOL_OVERLAP");
        }
      } catch (e) { fail(e.message === "CROSS_SCHOOL_OVERLAP" ? e.message : "CROSS_SCHOOL_UNVERIFIABLE"); }
    }
  }
  function enroll(values, expected, operationId, confirmed = false) {
    const { academicStudentId, academicYearId, classId } = values || {};
    return mutate("enrollment", expected, operationId, "enroll", [academicStudentId, academicYearId, classId, confirmed], (s) => {
      if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
      const student = roster(s, academicStudentId), y = year(s, academicYearId);
      if (student.status !== "enrolled") fail("INACTIVE_STUDENT");
      const mapping = s.mappings.mappings.find((m) => m.academicStudentId === academicStudentId && m.status === "confirmed") || fail("UNRESOLVED_IDENTITY");
      account(mapping.accountId);
      const c = s.academic.classes.find((r) => r.id === classId && r.status === "active") || fail("INVALID_CLASS");
      const link = s.db.classYearLinks.find((l) => l.classId === classId && l.academicYearId === academicYearId) || fail("UNRESOLVED_CLASS_YEAR");
      if (link.gradeSnapshot !== c.grade || link.sectionSnapshot !== c.section || link.legacyYearSnapshot !== c.academicYear) fail("CLASS_BINDING_CHANGED");
      if (s.db.enrollments.some((r) => r.academicYearId === academicYearId && (r.academicStudentId === academicStudentId || s.mappings.mappings.some(m=>m.id===r.mappingId&&m.accountId===mapping.accountId)))) fail("DUPLICATE_ENROLLMENT");
      crossSchoolCheck(s, mapping.accountId, y);
      const now = new Date().toISOString(), enrollmentId = crypto.randomUUID();
      const placement = { id: crypto.randomUUID(), schoolId: s.schoolId, enrollmentId, classId, gradeSnapshot: c.grade, sectionSnapshot: c.section, effectiveAt: now, previousPlacementId: null, actorId: s.schoolId, createdAt: now };
      const r = { id: enrollmentId, schoolId: s.schoolId, academicYearId, academicStudentId, accountId: mapping.accountId, mappingId: mapping.id, status: "enrolled", currentPlacementId: placement.id, educationalAccess: false, revision: 1, createdAt: now, updatedAt: now };
      s.db.placements.push(placement); s.db.enrollments.push(r); return r;
    });
  }
  function sectionPlacement(s, values) {
    const structure = OrbitSchoolSections.view(values.academicYearId);
    const section = structure.sections.find(r=>r.id===values.sectionId&&r.gradeId===values.gradeId) || fail('INVALID_SECTION');
    const grade = structure.grades.find(g=>g.id===section.gradeId) || fail('INVALID_SECTION');
    return {sectionId:section.id,gradeId:grade.id,academicYearId:values.academicYearId,gradeSnapshot:grade.name,sectionSnapshot:section.name};
  }
  function addSectionEnrollment(s, values) {
    const student=roster(s,values.academicStudentId),y=year(s,values.academicYearId);
    if(student.status!=='enrolled') fail('INACTIVE_STUDENT');
    const mapping=s.mappings.mappings.find(m=>m.academicStudentId===student.id&&m.status==='confirmed') || fail('UNRESOLVED_IDENTITY');
    account(mapping.accountId);
    if(s.db.enrollments.some(e=>e.academicYearId===y.id&&(e.academicStudentId===student.id||s.mappings.mappings.some(m=>m.id===e.mappingId&&m.accountId===mapping.accountId)))) fail('DUPLICATE_ENROLLMENT');
    const fields=sectionPlacement(s,values);crossSchoolCheck(s,mapping.accountId,y);
    const now=new Date().toISOString(),enrollmentId=crypto.randomUUID(),p={id:crypto.randomUUID(),schoolId:s.schoolId,enrollmentId,...fields,effectiveAt:now,createdAt:now,actorId:s.schoolId,previousPlacementId:null};
    const r={id:enrollmentId,schoolId:s.schoolId,academicStudentId:student.id,academicYearId:y.id,gradeId:p.gradeId,sectionId:p.sectionId,accountId:mapping.accountId,mappingId:mapping.id,structure:'section',status:'enrolled',currentPlacementId:p.id,educationalAccess:false,revision:1,createdAt:now,updatedAt:now};
    s.db.placements.push(p);s.db.enrollments.unshift(r);return r;
  }

  function enrollSection(values, expected, operationId, confirmed=false) {
    return mutate('enrollment',expected,operationId,'enroll-section',[values,confirmed],s=>{
      if(confirmed!==true) fail('CONFIRMATION_REQUIRED');
      return addSectionEnrollment(s, values);
    });
  }

  function promotionYears(s, from, to) {
    if (year(s, from).status !== "active") fail("SOURCE_NOT_ACTIVE");
    if (year(s, to).status !== "upcoming") fail("TARGET_NOT_UPCOMING");
    return OrbitSchoolAcademicReadModel.read(from);
  }

  function promotionRow(s, model, to, choice) {
    const student = model.students.find(record => record.academicStudentId === choice.academicStudentId);
    const source = model.enrollments.find(record => record.id === student?.enrollmentId);
    if (!source || source.status !== "enrolled" || student.verification !== "verified" ||
        student.identity.status !== "confirmed" || source.accountId !== student.identity.accountId) fail("SOURCE_UNRESOLVED");
    const values = { academicStudentId: choice.academicStudentId, academicYearId: to,
      sectionId: choice.sectionId, gradeId: choice.gradeId };
    const destination = addSectionEnrollment(s, values);
    return { sourceEnrollmentId: source.id, destinationEnrollmentId: destination.id, ...values };
  }

  function previewPromotion(from, to, choices = []) {
    const s = sources(), model = promotionYears(s, from, to);
    const structure = OrbitSchoolSections.view(to);
    const students = model.students.filter(student => student.hasAnnualEnrollment).map(student => ({
      id: student.academicStudentId, name: student.name, placement: student.currentPlacement,
      existing: s.db.enrollments.some(record => record.academicYearId === to && record.academicStudentId === student.academicStudentId)
    }));
    const results = choices.map(choice => {
      try { promotionRow(s, model, to, choice); return { id: choice.academicStudentId, issue: null }; }
      catch (error) { return { id: choice.academicStudentId, issue: error.message }; }
    });
    return { context: context(s), students, grades: structure.grades, sections: structure.sections, results };
  }

  function promoteBatch(from, to, choices, expected, operationId, confirmed = false) {
    if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
    if (!Array.isArray(choices) || !choices.length || new Set(choices.map(row => row.academicStudentId)).size !== choices.length) fail("INVALID_FIELDS");
    return mutate("enrollment", expected, operationId, "reviewed-promotion", [from, to, choices], s => {
      const model = promotionYears(s, from, to);
      const placements = choices.map(choice => promotionRow(s, model, to, choice));
      return { schoolId: s.schoolId, sourceYearId: from, targetYearId: to, placements };
    });
  }

  function changePlacement(enrollmentId,values,reason,expected,operationId,confirmed=false) {
    return mutate('enrollment',expected,operationId,'change-placement',[enrollmentId,values,reason,confirmed],s=>{
      if(confirmed!==true) fail('CONFIRMATION_REQUIRED');
      if(typeof reason!=='string'||!reason.trim()||reason.trim().length>500) fail('REASON_REQUIRED');
      const e=s.db.enrollments.find(e=>e.id===enrollmentId&&e.structure==='section') || fail('ENROLLMENT_NOT_FOUND');
      year(s,e.academicYearId);if(values.academicYearId!==e.academicYearId) fail('YEAR_MISMATCH');
      const m=s.mappings.mappings.find(m=>m.id===e.mappingId&&m.status==='confirmed') || fail('UNRESOLVED_IDENTITY'); account(m.accountId);
      const fields=sectionPlacement(s,values);if(e.sectionId===fields.sectionId) fail('NO_CHANGE');
      const now=new Date().toISOString(),previousPlacementId=e.currentPlacementId,p={id:crypto.randomUUID(),schoolId:s.schoolId,enrollmentId,...fields,effectiveAt:now,createdAt:now,actorId:s.schoolId,previousPlacementId};
      s.db.placements.push(p);s.db.transfers.push({id:crypto.randomUUID(),schoolId:s.schoolId,enrollmentId,sourcePlacementId:previousPlacementId,destinationPlacementId:p.id,reason:reason.trim(),actorId:s.schoolId,operationId,confirmedAt:now});
      Object.assign(e,{sectionId:p.sectionId,gradeId:p.gradeId,currentPlacementId:p.id,updatedAt:now,revision:e.revision+1});return e;
    });
  }
  // Pure structural validation for read adapters. No auth calls, storage reads or seeding.
  function inspectSnapshots(schoolId, enrollmentSnapshot, mappingSnapshot) {
    if (!id(schoolId) || !enrollmentSnapshot || !mappingSnapshot) fail("INVALID_DATA");
    return clone({ enrollments: enrollments(schoolId, enrollmentSnapshot), mappings: identities(schoolId, mappingSnapshot) });
  }
  window.OrbitSchoolEnrollments = Object.freeze({
    read, readMappings, inspectSnapshots, requestMapping, confirmMapping, correctMapping, confirmClassYear, enroll, enrollSection, previewPromotion, promoteBatch, changePlacement, storageKey, mappingKey, prefix, mappingPrefix,
    capabilities: Object.freeze({ educationalAccess: false, transfers: 'year-scoped-sections-only', mappingCorrections: true, crossSchoolEnforcement: "not-guaranteed; same-origin-snapshot-only" }),
    transferEventSchema: Object.freeze({ version: 1, required: Object.freeze(["id", "schoolId", "enrollmentId", "sourcePlacementId", "destinationPlacementId", "reason", "confirmedAt", "actorId", "operationId"]), executable: true }),
    correctionEventSchema: Object.freeze({ version: 1, required: Object.freeze(["id", "schoolId", "mappingId", "fromAccountId", "toAccountId", "reason", "confirmedAt", "actorId", "operationId"]), executable: true }),
  });
})();
