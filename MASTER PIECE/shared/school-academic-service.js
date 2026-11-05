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
  const subjectCatalog=[
    ['arabic','Languages','اللغات','Arabic Language','اللغة العربية',['Arabic','العربية']],
    ['english','Languages','اللغات','English Language','اللغة الإنجليزية',['English','الإنجليزية','اللغة الانجليزية']],
    ['islamic','Religious Education','التربية الدينية','Islamic Education','التربية الإسلامية',['التربية الاسلامية']],
    ['science','Sciences','العلوم','General Science','العلوم العامة',['Science','العلوم','علوم']],
    ['physics','Sciences','العلوم','Physics','الفيزياء',[]],['chemistry','Sciences','العلوم','Chemistry','الكيمياء',[]],
    ['biology','Sciences','العلوم','Biology','الأحياء',['الاحياء','علم الأحياء']],['earth','Sciences','العلوم','Earth Science','علوم الأرض',['علوم الارض']],
    ['social','Social Studies','الدراسات الاجتماعية','Social Studies','الدراسات الاجتماعية',[]],['history','Social Studies','الدراسات الاجتماعية','History','التاريخ',[]],
    ['geography','Social Studies','الدراسات الاجتماعية','Geography','الجغرافيا',[]],['national','Social Studies','الدراسات الاجتماعية','National Education','التربية الوطنية',[]],
    ['math','Mathematics','الرياضيات','Mathematics','الرياضيات',['Math','Maths']]
  ].map(([id,categoryEn,categoryAr,en,ar,aliases])=>Object.freeze({id,categoryEn,categoryAr,en,ar,aliases:Object.freeze(aliases)}));
  const subjectNorm=v=>norm(v).replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/\s+/g,' ');
  function subjectIdentity(value){const name=typeof value==='object'?value.name:value;const parts=String(name||'').split(/[·|/]/).map(subjectNorm);return subjectCatalog.find(c=>[c.en,c.ar,...c.aliases].some(a=>parts.includes(subjectNorm(a))))?.id||'custom:'+subjectNorm(name);}
  function subjectLabel(row,lang=document.documentElement.lang){const c=subjectCatalog.find(c=>c.id===subjectIdentity(row));return c?(lang==='ar'?c.ar:c.en):row.name;}
  function adoptSubjects(values,context){return commit(context,db=>{if(!Array.isArray(values)||!values.length)fail('INVALID_FIELDS');const seen=new Set(db.subjects.map(subjectIdentity)),now=new Date().toISOString(),added=[];for(const value of values){const c=subjectCatalog.find(c=>c.id===value.catalogId),name=c?c.en:text(value.name),identity=subjectIdentity(name);if(seen.has(identity))fail('DUPLICATE_SUBJECT');seen.add(identity);added.push({id:crypto.randomUUID(),schoolId:db.schoolId,name,status:'active',createdAt:now,updatedAt:now});}db.subjects.push(...added);return added;});}
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
  function reviewedClassWritable(classId, schoolId) {
    if (!classId || !window.OrbitSchoolYears) return;
    const raw = localStorage.getItem("orbit.school.enrollments.demo.v1:" + encodeURIComponent(schoolId));
    if (!raw) return;
    let annual; try { annual = JSON.parse(raw); } catch { fail("INVALID_DATA"); }
    if (!Array.isArray(annual.classYearLinks)) fail("INVALID_DATA");
    const link = annual.classYearLinks.find(l => l.classId === classId);
    if (link) { const year = OrbitSchoolYears.read().years.find(y=>y.id===link.academicYearId); if (!year || year.status === "archived") fail("ARCHIVED_RECORD"); }
  }
  function save(kind, id, values, context) {
    if (!kinds.includes(kind)) fail("INVALID_FIELDS");
    return commit(context, (db) => {
      const old = id ? find(db, kind, id) : null;
      if (kind === "classes" && old) reviewedClassWritable(old.id, db.schoolId);
      if (kind === "allocations") { reviewedClassWritable(old?.classId, db.schoolId); reviewedClassWritable(values.classId, db.schoolId); }
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
        if(db.subjects.some(r=>r.id!==id&&subjectIdentity(r)===subjectIdentity(fields)))fail('DUPLICATE_SUBJECT');
      } else {
        const teacher = find(db, "teachers", values.teacherId);
        const subject = find(db, "subjects", values.subjectId);
        const classroom = find(db, "classes", values.classId);
        fields = { teacherId: teacher.id, subjectId: subject.id, classId: classroom.id };
        if (subject.status !== "active" || classroom.status !== "active") fail("ARCHIVED_RECORD");
        if (db.allocations.some((r) => r.id !== id && allocationKey(r) === allocationKey(fields))) fail("DUPLICATE_ALLOCATION");
      }
      const row = { ...old, id: old?.id || crypto.randomUUID(), schoolId: db.schoolId, ...fields, createdAt: old ? old.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
      db[kind] = old ? db[kind].map((r) => r.id === id ? row : r) : [...db[kind], row];
      return row;
    });
  }
  function remove(kind, id, context) {
    if (!["students", "teachers", "allocations"].includes(kind)) fail("INVALID_FIELDS");
    return commit(context, (db) => {
      const row = find(db, kind, id);
      if (kind === "allocations") reviewedClassWritable(row.classId, db.schoolId);
      if(kind==='teachers'){
        if((db.allocationHistory||[]).some(h=>[...h.before,...h.after].some(a=>a.teacherId===id)))fail('LINKED_RECORD');
        const contains=v=>v===id||(Array.isArray(v)?v.some(contains):v&&typeof v==='object'&&Object.values(v).some(contains));
        for(const k of Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')&&k.endsWith(':'+encodeURIComponent(db.schoolId))&&k!==storageKey(db.schoolId))){let saved;try{saved=JSON.parse(localStorage.getItem(k));}catch{fail('INVALID_DATA');}if(contains(saved))fail('LINKED_RECORD');}
        let accounts;try{accounts=JSON.parse(localStorage.getItem('orbit.recruitment.v1')||'{"accounts":[]}');}catch{fail('INVALID_DATA');}if(!Array.isArray(accounts.accounts))fail('INVALID_DATA');if(accounts.accounts.some(a=>a.schoolId===db.schoolId&&a.academicId===id))fail('LINKED_RECORD');
        const raw=localStorage.getItem('orbit.school.teaching-assignments.demo.v1:'+encodeURIComponent(db.schoolId));
        if(raw!==null){let teaching;try{teaching=JSON.parse(raw);}catch{fail('INVALID_DATA');}if(!teaching||!Array.isArray(teaching.assignments)||!Array.isArray(teaching.reviews))fail('INVALID_DATA');if([...teaching.assignments,...(teaching.removedAssignments||[])].some(a=>a.teacherId===id)||teaching.reviews.some(r=>r.teacherId===id))fail('LINKED_RECORD');}
        const periodRaw=localStorage.getItem('orbit.school.period-timetables.demo.v1:'+encodeURIComponent(db.schoolId));
        if(periodRaw!==null){let schedules;try{schedules=JSON.parse(periodRaw);}catch{fail('INVALID_DATA');}if(!schedules||!Array.isArray(schedules.tables))fail('INVALID_DATA');if(schedules.tables.some(t=>[...t.periods,...t.versions.flatMap(v=>v.periods),...t.history.flatMap(h=>h.periods)].some(p=>p.teacherId===id)))fail('LINKED_RECORD');}
      }
      if (kind === "students") { const annual = JSON.parse(localStorage.getItem("orbit.school.enrollments.demo.v1:" + encodeURIComponent(db.schoolId)) || '{"enrollments":[]}'); if (annual.enrollments.some(e => e.academicStudentId === id)) fail("LINKED_RECORD"); }
      if ((kind === "students" && row.classId) || (kind === "teachers" && db.allocations.some((r) => r.teacherId === id))) fail("LINKED_RECORD");
      db[kind] = db[kind].filter((r) => r.id !== id);
    });
  }
  function saveLegacyTeaching(values,context,confirmed=false){return commit(context,db=>{
    if(confirmed!==true)fail('CONFIRMATION_REQUIRED');const years=OrbitSchoolYears.read(),y=years.years.find(y=>y.id===values.academicYearId);
    if(!y||y.status==='archived')fail('ARCHIVED_YEAR');if(OrbitSchoolYearContext.read().selectedYear?.id!==y.id)fail('STALE_DATA');
    if(context.yearRevision!==undefined&&context.yearRevision!==years.revision)fail('STALE_DATA');
    const annual=JSON.parse(localStorage.getItem('orbit.school.enrollments.demo.v1:'+encodeURIComponent(db.schoolId))||'{"classYearLinks":[]}');
    if(!Array.isArray(annual.classYearLinks))fail('INVALID_DATA');
    const {teacherId,subjectId,classIds,replaceIds=[]}=values;if(!Array.isArray(classIds)||new Set(classIds).size!==classIds.length||!Array.isArray(replaceIds)||new Set(replaceIds).size!==replaceIds.length||(!classIds.length&&!replaceIds.length))fail('INVALID_FIELDS');find(db,'teachers',teacherId);
    const old=replaceIds.map(id=>db.allocations.find(a=>a.id===id&&a.teacherId===teacherId)||fail('NOT_FOUND'));
    if(old.length&&!values.reason?.trim())fail('REASON_REQUIRED');
    for(const a of old)if(!annual.classYearLinks.some(l=>l.classId===a.classId&&l.academicYearId===y.id))fail('YEAR_REVIEW_REQUIRED');
    const planned=classIds.map(classId=>{const c=find(db,'classes',classId);if(!annual.classYearLinks.some(l=>l.classId===classId&&l.academicYearId===y.id))fail('YEAR_REVIEW_REQUIRED');if(c.status!=='active'||find(db,'subjects',subjectId).status!=='active')fail('ARCHIVED_RECORD');if(c.grade!==values.grade)fail('INVALID_SECTION');if(db.allocations.some(a=>!replaceIds.includes(a.id)&&a.classId===classId&&a.subjectId===subjectId))fail('DUPLICATE_ALLOCATION');return {...old.find(a=>a.classId===classId),id:old.find(a=>a.classId===classId)?.id||crypto.randomUUID(),schoolId:db.schoolId,teacherId,subjectId,classId};});
    for(const a of old){const next=planned.find(r=>r.id===a.id);if(next&&next.subjectId===a.subjectId)continue;
      const contains=v=>v===a.id||(Array.isArray(v)?v.some(contains):v&&typeof v==='object'&&(v.classId===a.classId&&v.subjectId===a.subjectId&&v.teacherId===a.teacherId||Object.values(v).some(contains)));
      for(const k of Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')&&k.endsWith(':'+encodeURIComponent(db.schoolId))&&k!==storageKey(db.schoolId)).concat('orbit.channels.v2')){let saved;try{saved=JSON.parse(localStorage.getItem(k));}catch{fail('INVALID_DATA');}if(contains(saved))fail('ASSIGNMENT_IN_USE');}
    }
    db.allocationHistory||=[];db.allocationHistory.push({id:crypto.randomUUID(),academicYearId:y.id,before:old,after:planned,reason:values.reason||'',actorId:db.schoolId,createdAt:new Date().toISOString()});db.allocations=db.allocations.filter(a=>!replaceIds.includes(a.id));db.allocations.push(...planned);return {saved:planned.length};
  });}
  function archive(kind, id, context) {
    if (!["classes", "subjects"].includes(kind)) fail("INVALID_FIELDS");
    return commit(context, (db) => { if (kind === "classes") reviewedClassWritable(id, db.schoolId); find(db, kind, id).status = "archived"; });
  }
  window.OrbitSchoolAcademics = { read, save, remove, archive, saveLegacyTeaching, adoptSubjects, subjectCatalog:Object.freeze(subjectCatalog), subjectIdentity, subjectLabel, storageKey, prefix };
})();
