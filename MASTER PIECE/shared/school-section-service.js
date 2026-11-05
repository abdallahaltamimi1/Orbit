/* Phase 3C.2-B1. Additive grade/section registry; legacy and operational stores are read-only dependencies. */
(() => {
  "use strict";
  const prefix = "orbit.school.section-structures.demo.v1:";
  const fail = code => { throw Error(code); };
  const norm = value => value.normalize("NFKC").trim().toLocaleLowerCase();
  const id = value => typeof value === "string" && !!value.trim() && value === value.trim() && value.length <= 160;
  const instant = value => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  const text = value => { if (typeof value !== "string" || !value.trim() || value.trim().length > 40) fail("INVALID_FIELDS"); return value.trim(); };
  const sectionCodes = Object.freeze(Array.from({length:26},(_,i)=>String.fromCharCode(65+i)));
  const arabicSections = Object.freeze(['أ','ب','ج','د','هـ','و','ز','ح','ط','ي','ك','ل','م','ن','س','ع','ف','ص','ق','ر','ش','ت','ث','خ','ذ','ض']);
  const supportedGrades = Object.freeze(Array.from({length:12},(_,i)=>String(i+1)));
  const arabicGrades = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر'];
  const gradeIdentity = value => norm(String(value)).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
  function canonicalSection(value){const v=String(value).normalize('NFKC').trim().replace(/ـ/g,'').toUpperCase();if(sectionCodes.includes(v))return v;const i=arabicSections.findIndex(s=>s.replace(/ـ/g,'')===v);return i<0?null:sectionCodes[i];}
  const sectionIdentity = value => canonicalSection(value)||norm(value);
  function sectionLabel(value,language='en'){if(window.OrbitSectionLabels)return OrbitSectionLabels.label(value,language);const code=canonicalSection(value);return code?(language==='ar'?arabicSections[sectionCodes.indexOf(code)]:code):value;}
  function gradeLabel(value,language='en'){const n=gradeIdentity(value),i=supportedGrades.indexOf(n);return i<0?value:language==='ar'?'الصف '+arabicGrades[i]:'Grade '+n;}
  function school() { const u = OrbitAuth.current(); if (u?.role !== "school" || !id(u.email)) fail("ROLE_DENIED"); return u.email; }
  const storageKey = (schoolId = school()) => prefix + encodeURIComponent(schoolId);
  function raw(key) { try { return localStorage.getItem(key); } catch { fail("STORAGE_FAILED"); } }
  function json(value, fallback) { if (value === null) return fallback; try { return JSON.parse(value); } catch { fail("INVALID_DATA"); } }
  function validate(db, schoolId) {
    if (!db || db.schema !== 1 || db.schoolId !== schoolId || !Number.isSafeInteger(db.revision) || db.revision < 0 || !Array.isArray(db.grades) || !Array.isArray(db.sections)) fail("INVALID_DATA");
    const ids = new Set(), names = new Set(), sections = new Set();
    for (const grade of db.grades) {
      if (!grade || grade.schoolId !== schoolId || !id(grade.id) || ids.has(grade.id) || typeof grade.name !== "string" || grade.name !== text(grade.name) || !instant(grade.createdAt) || (grade.updatedAt !== undefined && !instant(grade.updatedAt))) fail("INVALID_DATA");
      const name = norm(grade.name); if (names.has(name)) fail("INVALID_DATA"); names.add(name); ids.add(grade.id);
    }
    for (const section of db.sections) {
      if (!section || section.schoolId !== schoolId || !id(section.id) || ids.has(section.id) || !id(section.academicYearId) || !db.grades.some(g => g.id === section.gradeId) || typeof section.name !== "string" || section.name !== text(section.name) || !instant(section.createdAt) || (section.updatedAt !== undefined && !instant(section.updatedAt))) fail("INVALID_DATA");
      const unique = JSON.stringify([section.academicYearId, section.gradeId, norm(section.name)]); if (sections.has(unique)) fail("INVALID_DATA"); sections.add(unique); ids.add(section.id);
    }
    return db;
  }
  function capture() {
    const schoolId = school(), key = storageKey(schoolId), snapshot = raw(key);
    const years = OrbitSchoolYears.read(), yearSnapshot = raw(OrbitSchoolYears.storageKey(schoolId));
    const db = validate(json(snapshot, { schema: 1, schoolId, revision: 0, grades: [], sections: [] }), schoolId);
    return { schoolId, key, snapshot, yearSnapshot, years, db };
  }
  const context = s => ({ schoolId: s.schoolId, revision: s.db.revision, yearRevision: s.years.revision, structureSnapshot: s.snapshot, yearSnapshot: s.yearSnapshot });
  function read() { const s = capture(); return { ...s.db, context: context(s), unavailableYearSections: s.db.sections.filter(r => !s.years.years.some(y => y.id === r.academicYearId)) }; }
  function year(s, yearId, writable = false) {
    const y = s.years.years.find(y => y.id === yearId); if (!y) fail("YEAR_NOT_FOUND"); if (writable && y.status === "archived") fail("ARCHIVED_YEAR"); return y;
  }
  function legacy(s) {
    const db = json(raw(OrbitSchoolAcademics.storageKey(s.schoolId)), null);
    const annual = json(raw("orbit.school.enrollments.demo.v1:" + encodeURIComponent(s.schoolId)), null);
    if (db && (db.schoolId !== s.schoolId || !Array.isArray(db.classes) || db.classes.some(c => c.schoolId !== s.schoolId || !id(c.id)))) fail("INVALID_DATA");
    if (annual && (annual.schoolId !== s.schoolId || !Array.isArray(annual.classYearLinks) || annual.classYearLinks.some(l => l.schoolId !== s.schoolId))) fail("INVALID_DATA");
    return { classes: db?.classes || [], links: annual?.classYearLinks || [] };
  }
  function view(yearId) {
    const s = capture(), selectedYear = yearId ? year(s, yearId) : null;
    return { ...s.db, selectedYear, sections: s.db.sections.filter(r => r.academicYearId === selectedYear?.id), context: context(s), unavailableYearSections: s.db.sections.filter(r => !s.years.years.some(y => y.id === r.academicYearId)) };
  }
  function contains(value, sectionId) {
    if (value === sectionId) return true;
    if (Array.isArray(value)) return value.some(v => contains(v, sectionId));
    if (value && typeof value === "object") return Object.entries(value).some(([key, v]) => (key === sectionId || (key === "sourceSignature" && typeof v === "string" && v.includes(JSON.stringify(sectionId))) || contains(v, sectionId)));
    return false;
  }
  function dependencySources(s) {
    const values = new Map(), encoded = encodeURIComponent(s.schoolId);
    let keys; try { keys = Object.keys(localStorage).filter(k => k.startsWith("orbit.school.") && k.endsWith(":" + encoded) && k !== s.key).sort(); } catch { fail("STORAGE_FAILED"); }
    for (const key of keys) { const value = raw(key), data = json(value, null); if (value !== null && (!data || typeof data !== "object" || Array.isArray(data))) fail("INVALID_DATA"); values.set(key, { raw: value, data }); }
    for (const key of ["orbit.channels.v2", "orbit.school.members.v1"]) {
      const value = raw(key), db = json(value, null); let data = null;
      if (key === "orbit.channels.v2" && db) {
        if ((db.channels !== undefined && !Array.isArray(db.channels)) || (db.posts !== undefined && !Array.isArray(db.posts))) fail("INVALID_DATA");
        const channels = (db.channels || []).filter(c => c.schoolId === s.schoolId), ids = new Set(channels.map(c => c.id));
        data = { channels, posts: (db.posts || []).filter(p => p.schoolId === s.schoolId || ids.has(p.channel)) };
      } else if (db) data = db.schools?.[s.schoolId] || null;
      values.set(key, { raw: value, data });
    }
    return { values, keys };
  }
  function dependencies(sectionId) {
    const s = capture(); if (!s.db.sections.some(r => r.id === sectionId)) fail("NOT_FOUND");
    const sources = dependencySources(s); return [...sources.values].filter(([, value]) => contains(value.data, sectionId)).map(([key]) => key);
  }
  function mutate(expected, academicYearId, operation) {
    const s = capture(), c = context(s);
    if (expected?.schoolId !== s.schoolId) fail("SCHOOL_CHANGED");
    if (["revision", "yearRevision", "structureSnapshot", "yearSnapshot"].some(k => expected[k] !== c[k])) fail("STALE_DATA");
    year(s, academicYearId, true);
    const result = operation(s);
    s.db.revision++; validate(s.db, s.schoolId);
    if (school() !== s.schoolId || raw(s.key) !== s.snapshot || raw(OrbitSchoolYears.storageKey(s.schoolId)) !== s.yearSnapshot) fail("STALE_DATA");
    try { localStorage.setItem(s.key, JSON.stringify(s.db)); } catch { fail("STORAGE_FAILED"); }
    window.dispatchEvent(new Event("orbit:school-sections-change")); return result;
  }
  function gradeChoices(){
    const db=read(),used=new Set();
    const choices=supportedGrades.map(name=>{const matches=db.grades.filter(g=>gradeIdentity(g.name)===name);if(matches.length===1){used.add(matches[0].id);return {value:matches[0].id,gradeId:matches[0].id,name:matches[0].name};}if(matches.length>1)return null;return {value:'new:'+name,gradeId:'',name};}).filter(Boolean);
    return [...choices,...db.grades.filter(g=>!used.has(g.id)).map(g=>({value:g.id,gradeId:g.id,name:g.name}))];
  }
  function planBatch(s,values){
    const academicYearId=values?.academicYearId;year(s,academicYearId);
    if(values.schoolId!==undefined&&values.schoolId!==s.schoolId)fail('SCHOOL_CHANGED');
    let grade;
    if(values.gradeId){grade=s.db.grades.find(g=>g.id===values.gradeId);if(!grade)fail('GRADE_REQUIRED');}
    else{
      const name=gradeIdentity(values.gradeName||'');if(!supportedGrades.includes(name))fail('INVALID_GRADE');
      const matches=s.db.grades.filter(g=>gradeIdentity(g.name)===name);if(matches.length>1)fail('AMBIGUOUS_GRADE');grade=matches[0]||{name};
    }
    const codes=values.sectionCodes;if(!Array.isArray(codes)||codes.some(c=>!sectionCodes.includes(c)))fail('INVALID_SECTION_CODES');
    if(new Set(codes).size!==codes.length)fail('DUPLICATE_SECTION');
    const existing=legacy(s),names=s.db.sections.filter(r=>r.gradeId===grade.id&&r.academicYearId===academicYearId).map(r=>r.name);
    for(const c of existing.classes)if(typeof c.grade==='string'&&typeof c.section==='string'&&gradeIdentity(c.grade)===gradeIdentity(grade.name)&&existing.links.some(l=>l.classId===c.id&&l.academicYearId===academicYearId))names.push(c.section);
    const existingCodes=[...new Set(names.map(canonicalSection).filter(Boolean))];
    return {grade,existingNames:[...new Set(names)],existingCodes,newCodes:codes.filter(c=>!existingCodes.includes(c))};
  }
  function previewBatch(values){const s=capture();return {...planBatch(s,values),context:context(s)};}
  function createGradeSections(values,expected,confirmed=false){
    if(confirmed!==true)fail('CONFIRMATION_REQUIRED');
    return mutate(expected,values?.academicYearId,s=>{
      if(window.OrbitSchoolYearContext&&OrbitSchoolYearContext.read().selectedYear?.id!==values.academicYearId)fail('YEAR_MISMATCH');
      const plan=planBatch(s,values);if(!plan.newCodes.length)fail('NO_NEW_SECTIONS');
      const now=new Date().toISOString();let grade=plan.grade;
      if(!grade.id){grade={id:crypto.randomUUID(),schoolId:s.schoolId,name:grade.name,createdAt:now,updatedAt:now};s.db.grades.push(grade);}
      const created=plan.newCodes.map(name=>({id:crypto.randomUUID(),schoolId:s.schoolId,academicYearId:values.academicYearId,gradeId:grade.id,name,createdAt:now,updatedAt:now}));
      const existing=legacy(s);if(created.some(r=>existing.classes.some(c=>c.id===r.id)))fail('ID_CONFLICT');
      s.db.sections.unshift(...created);
      return {grade,created,unchanged:plan.existingNames};
    });
  }
  function save(sectionId, values, expected) {
    const academicYearId = values?.academicYearId;
    return mutate(expected, academicYearId, s => {
      if (values.schoolId !== undefined && values.schoolId !== s.schoolId) fail("SCHOOL_CHANGED");
      const old = sectionId ? s.db.sections.find(r => r.id === sectionId) : null; if (sectionId && !old) fail("NOT_FOUND");
      if (old && (old.academicYearId !== academicYearId || old.gradeId !== values.gradeId)) fail("IMMUTABLE_RELATION");
      const name = text(values.name), now = new Date().toISOString();
      let grade = s.db.grades.find(g => g.id === values.gradeId);
      if (!old && !values.gradeId && values.gradeName) {
        const gradeName = text(values.gradeName); if (s.db.grades.some(g => gradeIdentity(g.name) === gradeIdentity(gradeName))) fail("DUPLICATE_GRADE");
        grade = { id: crypto.randomUUID(), schoolId: s.schoolId, name: gradeName, createdAt: now, updatedAt: now }; s.db.grades.push(grade);
      }
      if (!grade) fail("GRADE_REQUIRED");
      if (s.db.sections.some(r => r.id !== sectionId && r.academicYearId === academicYearId && r.gradeId === grade.id && sectionIdentity(r.name) === sectionIdentity(name))) fail("DUPLICATE_SECTION");
      if(old&&old.name!==name){const sources=dependencySources(s);if([...sources.values.values()].some(v=>contains(v.data,old.id)))fail('SECTION_IN_USE');if([...sources.values].some(([k,v])=>raw(k)!==v.raw))fail('STALE_DATA');}
      const existing = legacy(s);
      if (existing.classes.some(c => typeof c.grade === "string" && typeof c.section === "string" && gradeIdentity(c.grade) === gradeIdentity(grade.name) && sectionIdentity(c.section) === sectionIdentity(name) && existing.links.some(l => l.classId === c.id && l.academicYearId === academicYearId))) fail("EXISTING_CLASS_CONFLICT");
      const section = { ...old, id: old?.id || crypto.randomUUID(), schoolId: s.schoolId, academicYearId, gradeId: grade.id, name, createdAt: old?.createdAt || now, updatedAt: now };
      if (!old && existing.classes.some(c => c.id === section.id)) fail("ID_CONFLICT");
      s.db.sections = old ? s.db.sections.map(r => r.id === old.id ? section : r) : [section, ...s.db.sections]; return section;
    });
  }
  function remove(sectionId, academicYearId, expected, confirmed = false) {
    if (confirmed !== true) fail("CONFIRMATION_REQUIRED");
    return mutate(expected, academicYearId, s => {
      const section = s.db.sections.find(r => r.id === sectionId); if (!section) fail("NOT_FOUND"); if (section.academicYearId !== academicYearId) fail("YEAR_MISMATCH");
      const sources = dependencySources(s);
      if ([...sources.values.values()].some(value => contains(value.data, section.id))) fail("SECTION_IN_USE");
      let latestKeys; try { latestKeys = Object.keys(localStorage).filter(k => k.startsWith("orbit.school.") && k.endsWith(":" + encodeURIComponent(s.schoolId)) && k !== s.key).sort(); } catch { fail("STORAGE_FAILED"); }
      if (JSON.stringify(latestKeys) !== JSON.stringify(sources.keys) || [...sources.values].some(([k,v]) => raw(k) !== v.raw)) fail("STALE_DATA");
      s.db.sections = s.db.sections.filter(r => r.id !== sectionId); return { id: sectionId, removed: true };
    });
  }
  window.OrbitSchoolSections = Object.freeze({ read, view, save, remove, dependencies, storageKey, prefix, sectionCodes, canonicalSection, sectionLabel, gradeLabel, gradeChoices, previewBatch, createGradeSections });
})();
