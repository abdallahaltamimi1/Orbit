/* B3: additive year-scoped assignments. Legacy academic and educational stores are read-only inputs. */
(() => {
  'use strict';
  const prefix='orbit.school.teaching-assignments.demo.v1:',fail=code=>{throw Error(code);};
  const id=v=>typeof v==='string'&&!!v.trim()&&v===v.trim(),stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
  const key=schoolId=>prefix+encodeURIComponent(schoolId),clone=v=>structuredClone(v);
  function school(){const u=OrbitAuth.current();if(u?.role!=='school'||!id(u.email))fail('ROLE_DENIED');return u.email;}
  function capture(schoolId){
    const snapshots=new Map();
    const get=(k,f)=>{let raw;try{raw=localStorage.getItem(k);}catch{fail('STORAGE_FAILED');}snapshots.set(k,raw);if(raw===null)return clone(f);try{return JSON.parse(raw);}catch{fail('INVALID_DATA');}};
    const enc=encodeURIComponent(schoolId),db=get(key(schoolId),{schema:1,schoolId,revision:0,assignments:[],reviews:[],history:[]});
    const academic=get('orbit.school.academics.demo.v1:'+enc,null),years=get('orbit.school.years.demo.v1:'+enc,{schema:1,schoolId,revision:0,activeYearId:null,years:[]});
    const structures=get('orbit.school.section-structures.demo.v1:'+enc,{schema:1,schoolId,revision:0,grades:[],sections:[]}),legacy=get('orbit.school.education.links.v1:'+enc,{schema:1,schoolId,mappings:[],links:[]});
    if(db.linkInvitations===undefined)db.linkInvitations=[];if(!Array.isArray(db.linkInvitations)||db.linkInvitations.some(r=>!r||r.schoolId!==schoolId||!id(r.id)||!id(r.teacherId)||!id(r.accountId)||!['pending','approved','declined','cancelled'].includes(r.status)||!Array.isArray(r.history)||r.history.at(-1)?.status!==r.status||r.history.some(h=>!h||!id(h.actorId)||!stamp(h.at)||!['pending','approved','declined','cancelled'].includes(h.status))||r.history[0]?.actorId!==schoolId||r.history[0]?.status!=='pending')||new Set(db.linkInvitations.map(r=>r.id)).size!==db.linkInvitations.length)fail('INVALID_DATA');
    const accounts=get('orbit.recruitment.v1',{accounts:[]}),admin=get('orbit.admin.v1',{});
    if(!academic)fail('ACADEMIC_DATA_REQUIRED');
    for(const [obj,arrays]of [[db,['assignments','reviews','history']],[academic,['teachers','subjects','classes','allocations']],[years,['years']],[structures,['grades','sections']],[legacy,['mappings','links']]]){
      if(!obj||obj.schema!==1||obj.schoolId!==schoolId||arrays.some(a=>!Array.isArray(obj[a])))fail('INVALID_DATA');
      for(const a of arrays){const seen=new Set();for(const r of obj[a]){if(!r||!id(r.id)||r.schoolId!==schoolId||seen.has(r.id))fail('INVALID_DATA');seen.add(r.id);}}
    }
    if(!Number.isSafeInteger(db.revision)||db.revision<0||!accounts||!Array.isArray(accounts.accounts)||!admin||Array.isArray(admin))fail('INVALID_DATA');
    const active=years.years.filter(y=>y.status==='active');
    if(years.years.some(y=>!['upcoming','active','archived'].includes(y.status))||active.length>1||years.activeYearId!==(active[0]?.id||null))fail('INVALID_DATA');
    validate(db);
    return {schoolId,db,academic,years,structures,legacy,accounts:accounts.accounts,admin,snapshots};
  }
  function validate(db){
    const slots=new Set(),teachers=new Set(),accounts=new Set();
    if(db.removedAssignments!==undefined&&!Array.isArray(db.removedAssignments))fail('INVALID_DATA');
    for(const r of [...db.assignments,...(db.removedAssignments||[])]){
      if(![r.id,r.schoolId,r.academicYearId,r.teacherId,r.subjectId,r.gradeId,r.sectionId].every(id)||!stamp(r.createdAt)||!stamp(r.updatedAt))fail('INVALID_DATA');
      const slot=JSON.stringify([r.academicYearId,r.sectionId,r.subjectId]);if(db.assignments.includes(r)){if(slots.has(slot))fail('INVALID_DATA');slots.add(slot);}
      const events=db.history.filter(h=>h.assignmentId===r.id),last=events.at(-1);
      if(!last||JSON.stringify(last.after)!==JSON.stringify(db.assignments.includes(r)?r:(({removedAt,removedBy,reason,...original})=>original)(r))||events[0].before!==null)fail('INVALID_DATA');
      for(let i=1;i<events.length;i++)if(JSON.stringify(events[i].before)!==JSON.stringify(events[i-1].after))fail('INVALID_DATA');
    }
    for(const r of db.reviews){if(![r.teacherId,r.accountId,r.actorId].every(id)||!stamp(r.confirmedAt)||teachers.has(r.teacherId)||accounts.has(r.accountId))fail('INVALID_DATA');teachers.add(r.teacherId);accounts.add(r.accountId);}
    if(db.history.some(h=>![...db.assignments,...(db.removedAssignments||[])].some(r=>r.id===h.assignmentId)||!stamp(h.createdAt)||!id(h.actorId)||!h.after||h.after.id!==h.assignmentId||(h.before!==null&&(typeof h.reason!=='string'||!h.reason.trim()))))fail('INVALID_DATA');
  }
  const context=s=>({schoolId:s.schoolId,revision:s.db.revision,snapshot:JSON.stringify([...s.snapshots])});
  function account(s,email){
    const matches=s.accounts.filter(a=>a.email===email);if(!matches.length&&email==='teacher@orbit.com')matches.push({email,role:'teacher',status:'active'});
    const a=matches[0];if(matches.length!==1||a.role!=='teacher'||a.status!=='active'||['suspended','deleted'].includes(s.admin.accountStates?.[email]?.status))fail('INVALID_ACCOUNT');return a;
  }
  function review(s,teacherId){
    const options=[...s.db.reviews.filter(r=>r.teacherId===teacherId),...s.legacy.mappings.filter(r=>r.role==='teachers'&&r.academicId===teacherId).map(r=>({...r,teacherId}))];
    if(new Set(options.map(r=>r.accountId)).size>1)fail('IDENTITY_CONFLICT');return options[0]||null;
  }
  function refs(s,r,writable=false){
    const y=s.years.years.find(y=>y.id===r.academicYearId);if(!y)fail('YEAR_NOT_FOUND');if(writable&&y.status==='archived')fail('ARCHIVED_YEAR');
    if(!s.academic.teachers.some(t=>t.id===r.teacherId))fail('INVALID_TEACHER');
    if(!s.academic.subjects.some(t=>t.id===r.subjectId&&(!writable||t.status==='active')))fail('INVALID_SUBJECT');
    if(!s.structures.grades.some(g=>g.id===r.gradeId)||!s.structures.sections.some(q=>q.id===r.sectionId&&q.gradeId===r.gradeId&&q.academicYearId===r.academicYearId))fail('INVALID_SECTION');return y;
  }
  function read(yearId){
    const s=capture(school()),selectedYear=yearId?s.years.years.find(y=>y.id===yearId)||fail('YEAR_NOT_FOUND'):null;
    return {...clone(s.db),context:context(s),selectedYear,assignments:s.db.assignments.filter(r=>r.academicYearId===yearId).map(r=>{let issue='';try{refs(s,r);}catch(e){issue=e.message;}return {...r,issue};}),teachers:clone(s.academic.teachers),subjects:clone(s.academic.subjects),grades:clone(s.structures.grades),sections:clone(s.structures.sections.filter(q=>q.academicYearId===yearId)),accounts:s.academic.teachers.map(t=>{let link=null,a=null,issue='';try{link=review(s,t.id);if(link)a=account(s,link.accountId);}catch(e){issue=e.message;}if(!a){const issued=s.accounts.filter(a=>a.role==='teacher'&&a.schoolId===s.schoolId&&a.academicId===t.id);if(issued.length===1)a=issued[0];}const invitation=s.db.linkInvitations.filter(r=>r.teacherId===t.id).at(-1);return {teacherId:t.id,accountId:link?.accountId||a?.email||null,status:issue?'conflict':link?a?.mustChangePassword?'pending':'active':a?'conflict':invitation?.status==='pending'?'linking':invitation?.status==='declined'?'declined':'unprovisioned',invitationId:invitation?.id};}),legacyAllocations:clone(s.academic.allocations),legacyClasses:clone(s.academic.classes),unavailableYearCount:s.db.assignments.filter(r=>!s.years.years.some(y=>y.id===r.academicYearId)).length};
  }
  function mutate(expected,operation){
    const s=capture(school());if(expected?.schoolId!==s.schoolId)fail('SCHOOL_CHANGED');if(expected.snapshot!==context(s).snapshot)fail('STALE_DATA');
    const result=operation(s);s.db.revision++;validate(s.db);
    if(school()!==s.schoolId||[...s.snapshots].some(([k,v])=>localStorage.getItem(k)!==v))fail('STALE_DATA');
    try{localStorage.setItem(key(s.schoolId),JSON.stringify(s.db));}catch{fail('STORAGE_FAILED');}window.dispatchEvent(new Event('orbit:school-teaching-change'));return clone(result);
  }
  function save(assignmentId,values,expected,confirmed=false,reason=''){
    return mutate(expected,s=>{
      if(confirmed!==true)fail('CONFIRMATION_REQUIRED');
      const old=assignmentId?s.db.assignments.find(r=>r.id===assignmentId)||fail('NOT_FOUND'):null;
      if(old){refs(s,old);const y=s.years.years.find(y=>y.id===old.academicYearId);if(y.status==='archived')fail('ARCHIVED_YEAR');if(old.academicYearId!==values.academicYearId)fail('IMMUTABLE_YEAR');if(typeof reason!=='string'||!reason.trim()||reason.length>500)fail('REASON_REQUIRED');}
      if(values.schoolId!==undefined&&values.schoolId!==s.schoolId)fail('SCHOOL_CHANGED');refs(s,values,true);
      if(s.db.assignments.some(r=>r.id!==assignmentId&&r.academicYearId===values.academicYearId&&r.sectionId===values.sectionId&&r.subjectId===values.subjectId))fail('PRIMARY_TEACHER_EXISTS');
      const now=new Date().toISOString(),r={id:old?.id||crypto.randomUUID(),schoolId:s.schoolId,academicYearId:values.academicYearId,teacherId:values.teacherId,subjectId:values.subjectId,gradeId:values.gradeId,sectionId:values.sectionId,createdAt:old?.createdAt||now,updatedAt:now};
      s.db.assignments=old?s.db.assignments.map(q=>q.id===old.id?r:q):[r,...s.db.assignments];
      s.db.history.push({id:crypto.randomUUID(),schoolId:s.schoolId,assignmentId:r.id,before:old?clone(old):null,after:clone(r),reason:old?reason.trim():'',actorId:s.schoolId,createdAt:now});return r;
    });
  }
  function protectAssignment(s,r){
    const contains=(v)=>v===r.id||(Array.isArray(v)?v.some(contains):v&&typeof v==='object'&&(v.teacherId===r.teacherId&&v.subjectId===r.subjectId&&v.sectionId===r.sectionId||Object.values(v).some(contains)));
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')&&k.endsWith(':'+encodeURIComponent(s.schoolId))&&k!==key(s.schoolId)&&!k.startsWith('orbit.school.academics.'));
    keys.push('orbit.channels.v2');
    for(const k of keys){const raw=localStorage.getItem(k);s.snapshots.set(k,raw);if(raw!==null){let db;try{db=JSON.parse(raw);}catch{fail('INVALID_DATA');}if(contains(db)||(k==='orbit.channels.v2'&&db?.channels?.some(c=>c.schoolId===s.schoolId&&c.subjectId===r.subjectId&&(c.sectionId===r.sectionId||c.sectionIds?.includes(r.sectionId)))))fail('ASSIGNMENT_IN_USE');}}
  }
  function saveBatch(values,expected,confirmed=false){return mutate(expected,s=>{
    if(confirmed!==true)fail('CONFIRMATION_REQUIRED');const {academicYearId,teacherId,subjectId,gradeId,sectionIds,replaceIds=[]}=values;if(values.schoolId!==undefined&&values.schoolId!==s.schoolId)fail('SCHOOL_CHANGED');
    const y=s.years.years.find(y=>y.id===academicYearId);if(!y)fail('YEAR_NOT_FOUND');if(y.status==='archived')fail('ARCHIVED_YEAR');
    if(!s.academic.teachers.some(t=>t.id===teacherId))fail('INVALID_TEACHER');
    if(!Array.isArray(sectionIds)||!Array.isArray(replaceIds)||new Set(sectionIds).size!==sectionIds.length||new Set(replaceIds).size!==replaceIds.length||(!sectionIds.length&&!replaceIds.length))fail('INVALID_FIELDS');
    const old=replaceIds.map(id=>s.db.assignments.find(a=>a.id===id&&a.teacherId===teacherId&&a.academicYearId===academicYearId)||fail('NOT_FOUND'));
    if(old.length&&(!values.reason||values.reason.length>500))fail('REASON_REQUIRED');
    const now=new Date().toISOString(),planned=sectionIds.map(sectionId=>{const prior=old.find(a=>a.sectionId===sectionId);const row={id:prior?.id||crypto.randomUUID(),schoolId:s.schoolId,academicYearId,teacherId,subjectId,gradeId,sectionId,createdAt:prior?.createdAt||now,updatedAt:now};refs(s,row,true);if(s.db.assignments.some(a=>!replaceIds.includes(a.id)&&a.academicYearId===academicYearId&&a.sectionId===sectionId&&a.subjectId===subjectId))fail('PRIMARY_TEACHER_EXISTS');return row;});
    for(const r of old){const next=planned.find(a=>a.id===r.id);if(!next||next.subjectId!==r.subjectId||next.gradeId!==r.gradeId)protectAssignment(s,r);}
    s.db.removedAssignments||=[];for(const r of old)if(!planned.some(a=>a.id===r.id))s.db.removedAssignments.push({...r,removedAt:now,removedBy:s.schoolId,reason:values.reason});
    s.db.assignments=s.db.assignments.filter(a=>!replaceIds.includes(a.id));s.db.assignments.unshift(...planned);
    for(const r of planned)s.db.history.push({id:crypto.randomUUID(),schoolId:s.schoolId,assignmentId:r.id,before:old.find(a=>a.id===r.id)||null,after:clone(r),reason:values.reason||'',actorId:s.schoolId,createdAt:now});
    return {saved:planned.length,removed:old.filter(a=>!planned.some(r=>r.id===a.id)).length};
  });}
  function confirmTeacher(teacherId,accountId,expected,confirmed=false){
    return mutate(expected,s=>{
      if(confirmed!==true)fail('CONFIRMATION_REQUIRED');if(window.OrbitSchoolYearContext?.readOnly())fail('ARCHIVED_YEAR');
      if(!s.academic.teachers.some(t=>t.id===teacherId))fail('INVALID_TEACHER');account(s,accountId);
      const existing=review(s,teacherId);if(existing&&existing.accountId!==accountId)fail('IDENTITY_ALREADY_REVIEWED');
      if([...s.db.reviews,...s.legacy.mappings.filter(r=>r.role==='teachers').map(r=>({...r,teacherId:r.academicId}))].some(r=>r.accountId===accountId&&r.teacherId!==teacherId))fail('ACCOUNT_ALREADY_LINKED');
      const owner=account(s,accountId);if(!existing&&!(owner.schoolId===s.schoolId&&owner.academicId===teacherId))fail('TEACHER_CONSENT_REQUIRED');
      if(s.db.reviews.some(r=>r.teacherId===teacherId))return existing;
      const r={id:crypto.randomUUID(),schoolId:s.schoolId,teacherId,accountId,actorId:s.schoolId,confirmedAt:new Date().toISOString()};s.db.reviews.push(r);return r;
    });
  }

  function availableLink(s,teacherId,email){
    if(!s.academic.teachers.some(t=>t.id===teacherId))fail('INVALID_TEACHER');const a=account(s,email);if(a.mustChangePassword)fail('INVALID_ACCOUNT');
    const choices=[...s.db.reviews,...s.legacy.mappings.filter(r=>r.role==='teachers').map(r=>({...r,teacherId:r.academicId}))];
    if(choices.some(r=>r.teacherId===teacherId||r.accountId===email)||s.accounts.some(a=>a.schoolId===s.schoolId&&(a.academicId===teacherId||a.email===email&&a.academicId)))fail('ACCOUNT_ALREADY_LINKED');return a;
  }
  function inviteTeacher(teacherId,email,expected){email=String(email||'').trim().toLowerCase();return mutate(expected,s=>{
    if(window.OrbitSchoolYearContext?.readOnly())fail('ARCHIVED_YEAR');availableLink(s,teacherId,email);
    if(s.db.linkInvitations.some(r=>r.status==='pending'&&(r.teacherId===teacherId||r.accountId===email)))fail('INVITATION_PENDING');
    const at=new Date().toISOString(),r={id:crypto.randomUUID(),schoolId:s.schoolId,teacherId,accountId:email,status:'pending',createdAt:at,actorId:s.schoolId,history:[{status:'pending',actorId:s.schoolId,at}]};s.db.linkInvitations.push(r);return r;
  });}
  function cancelInvitation(id,expected){return mutate(expected,s=>{const r=s.db.linkInvitations.find(r=>r.id===id&&r.schoolId===s.schoolId&&r.status==='pending');if(!r)fail('STALE_DATA');r.status='cancelled';r.history.push({status:'cancelled',actorId:s.schoolId,at:new Date().toISOString()});return r;});}
  function teacherInvitations(){const u=OrbitAuth.current();if(u?.role!=='teacher'||!u.email)fail('ROLE_DENIED');const result=[];
    for(const k of Object.keys(localStorage).filter(k=>k.startsWith(prefix))){try{const s=capture(decodeURIComponent(k.slice(prefix.length))),a=account(s,u.email);if(a.mustChangePassword)continue;for(const r of s.db.linkInvitations.filter(r=>r.accountId===u.email&&r.schoolId===s.schoolId)){const teacher=s.academic.teachers.find(t=>t.id===r.teacherId);if(teacher)result.push({...clone(r),teacherName:teacher.name,schoolName:s.accounts.find(a=>a.email===s.schoolId&&a.role==='school')?.name||s.schoolId});}}catch{}}
    return result;
  }
  function respondInvitation(schoolId,id,approve){const u=OrbitAuth.current();if(u?.role!=='teacher'||!u.email||typeof approve!=='boolean')fail('ROLE_DENIED');const s=capture(schoolId),a=account(s,u.email);if(a.mustChangePassword)fail('INVALID_ACCOUNT');const r=s.db.linkInvitations.find(r=>r.id===id&&r.schoolId===schoolId&&r.accountId===u.email&&r.status==='pending');if(!r)fail('STALE_DATA');
    if(approve){availableLink(s,r.teacherId,u.email);const at=new Date().toISOString();s.db.reviews.push({id:crypto.randomUUID(),schoolId,teacherId:r.teacherId,accountId:u.email,actorId:u.email,confirmedAt:at,invitationId:r.id,consentedBy:u.email});}
    r.status=approve?'approved':'declined';r.history.push({status:r.status,actorId:u.email,at:new Date().toISOString()});s.db.revision++;
    if(OrbitAuth.current()?.role!=='teacher'||OrbitAuth.current()?.email!==u.email||[...s.snapshots].some(([k,v])=>localStorage.getItem(k)!==v))fail('STALE_DATA');try{localStorage.setItem(key(schoolId),JSON.stringify(s.db));}catch{fail('STORAGE_FAILED');}window.dispatchEvent(new Event('orbit:school-teaching-change'));return clone(r);
  }
  // Read-only integration contract. Does not create, edit, join or grant access to channels.
  function channelEligibility(values){
    try{const u=OrbitAuth.current();if(u?.role!=='teacher')fail('ROLE_DENIED');const s=capture(values.schoolId),a=account(s,u.email);if(a.mustChangePassword)fail('PASSWORD_CHANGE_REQUIRED');
      const teachers=s.academic.teachers.filter(t=>review(s,t.id)?.accountId===u.email);if(teachers.length!==1)fail('IDENTITY_REVIEW_REQUIRED');
      const r=s.db.assignments.find(r=>r.academicYearId===values.academicYearId&&r.sectionId===values.sectionId&&r.gradeId===values.gradeId&&r.subjectId===values.subjectId&&r.teacherId===teachers[0].id);if(!r)fail('NOT_ASSIGNED');
      if(refs(s,r).status!=='active')fail('YEAR_NOT_ACTIVE');return {allowed:true,assignmentId:r.id};
    }catch(e){return {allowed:false,reason:e.message};}
  }
  window.OrbitSchoolTeaching=Object.freeze({read,save,saveBatch,confirmTeacher,inviteTeacher,cancelInvitation,teacherInvitations,respondInvitation,channelEligibility,prefix,storageKey:(schoolId=school())=>key(schoolId)});
})();
