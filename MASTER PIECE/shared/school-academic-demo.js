/* Explicit, versioned fictional school. Nothing is seeded by loading this script. */
(() => {
  'use strict';
  const version = 1, schoolId = 'academic.demo@orbit.example', tag = 'orbit-academic-demo-v1';
  const manifestKey = 'orbit.demo.academic.manifest.v1', journalKey = 'orbit.demo.academic.transaction.v1';
  const fail = code => { throw Error(code); };
  const key = prefix => prefix + encodeURIComponent(schoolId);
  const clone = v => structuredClone(v);
  const hash = value => { let n = 2166136261; for (const c of value ?? '') n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(16); };
  const authorize = confirmed => { if (OrbitAuth.current()?.role !== 'school') fail('ROLE_DENIED'); if (confirmed !== true) fail('CONFIRMATION_REQUIRED'); };
  const parse = (k, fallback) => { const v = localStorage.getItem(k); if (v === null) return clone(fallback); try { return JSON.parse(v); } catch { fail('INVALID_DATA'); } };
  function build(referenceDate = new Date().toISOString().slice(0, 10)) {
    const stamp = '2026-09-01T08:00:00.000Z', yearId = 'od1-year-2026';
    const row = (id, fields) => ({ id, schoolId, demoSet: tag, createdAt: stamp, ...fields });
    const db = fields => ({ schema: 1, schoolId, revision: 0, ...fields });
    const email = (role, i) => `${role}${String(i + 1).padStart(3, '0')}.academic@orbit.example`;
    const first = ['أحمد','عمر','يوسف','آدم','زيد','كريم','سليم','نور','ليان','مريم','سارة','تالا','جنى','لينا','هيا','رنا','دانيا','يارا','حمزة','مالك','أنس','ياسين','حسن','سلمى','فرح'];
    const families = ['الخطيب','النجار','الحسن','منصور','عوض','زيدان','حمدان','ناصر','سليمان','مراد','قاسم','الحداد'];
    const names = ['أحمد محمد','رائد الخطيب','خالد المصري','هبة قاسم','ريم الدجاني','علا منصور','سمر عوض','عمر زيدان','دانا أبو زيد','محمد العلي','نور حمدان','سامر حداد','لينا ناصر','يوسف سليمان','مريم مراد'];
    const subjectNames = [['الفيزياء','Physics'],['الرياضيات','Mathematics'],['اللغة العربية','Arabic'],['اللغة الإنجليزية','English'],['الكيمياء','Chemistry'],['الأحياء','Biology'],['الحاسوب','Computing'],['التاريخ','History'],['التربية الإسلامية','Islamic education']];
    const years = [row(yearId, { name: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30', status: 'active', updatedAt: stamp })];
    const grades = [9,10,11].map(g => row(`od1-grade-${g}`, { name: String(g) }));
    const sections = grades.flatMap(g => ['A','B','C','D'].map(name => row(`od1-section-${g.name}-${name.toLowerCase()}`, { academicYearId: yearId, gradeId: g.id, name })));
    // The legacy classroom projection is explicit; annual enrollment uses the section registry.
    const classes = sections.map((s,i) => row(`od1-class-${i}`, { grade: grades.find(g=>g.id===s.gradeId).name, section: s.name, academicYear: '2026-2027', status: 'active' }));
    const students = sections.flatMap((s,si) => first.map((name,i) => row(`od1-student-${si*25+i+1}`, { name: `${name} ${families[(si+i)%families.length]}`, studentCode: `OD-${String(si*25+i+1).padStart(3,'0')}`, status: 'enrolled', classId: classes[si].id })));
    const teachers = names.map((name,i) => row(`od1-teacher-${i}`, { name, teacherCode: `OD-T${String(i+1).padStart(2,'0')}` }));
    const subjects = subjectNames.map(([name,nameEn],i) => row(`od1-subject-${i}`, { name, nameEn, status: 'active' }));
    const assignments = sections.flatMap((s,si) => subjects.map((subject,j) => {
      const ti = j===0 ? (si<5 ? 0:1) : j<6 ? j*2+(si<6 ? 0:1) : j+6;
      return row(`od1-teaching-${si}-${j}`, { academicYearId: yearId, sectionId: s.id, gradeId: s.gradeId, teacherId: teachers[ti].id, subjectId: subject.id, updatedAt: stamp });
    }));
    const allocations = assignments.map((a,i) => row(`od1-allocation-${i}`, { classId: classes[sections.findIndex(s=>s.id===a.sectionId)].id, subjectId: a.subjectId, teacherId: a.teacherId }));
    const identities = [{ email: schoolId, role: 'school', name: 'مدرسة المدار النموذجية · ORBIT Demo School' }, ...teachers.map((t,i)=>({email:email('teacher',i), role:'teacher', name:t.name, academicId:t.id})), ...students.map((s,i)=>({email:email('student',i), role:'student', name:s.name, academicId:s.id}))];
    const mappings = students.map((s,i)=>row(`od1-identity-${i}`, { academicStudentId:s.id, accountId:email('student',i), status:'confirmed', actorId:schoolId, confirmedAt:stamp, updatedAt:stamp }));
    const history = mappings.flatMap((m,i)=>[row(`od1-identity-request-${i}`,{mappingId:m.id,type:'requested',actorId:schoolId,fromAccountId:null,toAccountId:null}),row(`od1-identity-confirm-${i}`,{mappingId:m.id,type:'confirmed',actorId:schoolId,fromAccountId:null,toAccountId:m.accountId})]);
    const enrollments = students.map((s,i)=>{const section=sections[Math.floor(i/25)];return row(`od1-enrollment-${i}`,{academicYearId:yearId,academicStudentId:s.id,accountId:email('student',i),mappingId:mappings[i].id,structure:'section',gradeId:section.gradeId,sectionId:section.id,status:'enrolled',currentPlacementId:`od1-placement-${i}`,educationalAccess:false,revision:1,updatedAt:stamp});});
    const placements = enrollments.map((e,i)=>row(e.currentPlacementId,{enrollmentId:e.id,academicYearId:yearId,sectionId:e.sectionId,gradeId:e.gradeId,gradeSnapshot:grades.find(g=>g.id===e.gradeId).name,sectionSnapshot:sections.find(s=>s.id===e.sectionId).name,effectiveAt:stamp,previousPlacementId:null,actorId:schoolId}));
    const annual = db({classYearLinks:classes.map((c,i)=>row(`od1-class-link-${i}`,{classId:c.id,academicYearId:yearId,gradeSnapshot:c.grade,sectionSnapshot:c.section,legacyYearSnapshot:c.academicYear,actorId:schoolId,confirmedAt:stamp})),enrollments,placements,transfers:[],operations:[]});
    const identity = db({mappings,history,operations:[]});
    OrbitSchoolEnrollments.inspectSnapshots(schoolId,annual,identity);
    const teaching = db({assignments,reviews:teachers.map((t,i)=>row(`od1-teacher-review-${i}`,{teacherId:t.id,accountId:email('teacher',i),actorId:schoolId,confirmedAt:stamp})),history:assignments.map((a,i)=>row(`od1-teaching-history-${i}`,{assignmentId:a.id,actorId:schoolId,before:null,after:a}))});
    // One channel per reviewed teacher + subject, explicitly targeting their assigned sections.
    const channels = teachers.map((t,ti)=>{const owned=assignments.filter(a=>a.teacherId===t.id),a=owned[0],subject=subjects.find(s=>s.id===a.subjectId);return row(`od1-channel-${ti}`,{schoolChannelVersion:1,teacher:email('teacher',ti),academicYearId:yearId,subjectId:a.subjectId,subject:subject.name,sectionId:a.sectionId,sectionIds:owned.map(a=>a.sectionId),private:true,en:`${subject.nameEn} · ${t.name}`,ar:`${subject.name} · ${t.name}`,descAr:'قناة تعليمية مدرسية خيالية للتجربة المحلية فقط.',descEn:'Fictional school channel for local demonstration only.',managementHistory:[]});});
    const dateAt = (days,time) => { const date = new Date(referenceDate+'T12:00:00'); date.setDate(date.getDate()+days); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${time}`; };
    const posts = channels.flatMap((c,i)=>[row(`od1-lesson-${i}`,{channel:c.id,authorId:c.teacher,academicYearId:yearId,sectionIds:c.sectionIds,type:'lesson',titleAr:`مراجعة المفاهيم · ${subjects.find(s=>s.id===c.subjectId).name}`,titleEn:`Concept review · ${subjects.find(s=>s.id===c.subjectId).nameEn}`,bodyAr:'اقرأ المثال، واشرح خطوات الحل، ثم ناقش استنتاجاتك في الصف.',bodyEn:'Read the example, explain your method, and discuss your conclusions in class.'}),row(`od1-assignment-${i}`,{channel:c.id,authorId:c.teacher,academicYearId:yearId,sectionIds:c.sectionIds,type:'assignment',titleAr:'تطبيق المفاهيم وشرح الحل',titleEn:'Apply concepts and explain your solution',bodyAr:'قدّم مثالًا من موضوع الدرس، وحلّه مع توضيح الخطوات والتحقق من النتيجة.',bodyEn:'Choose a lesson example, solve it, explain each step and check the result.',dueDate:dateAt(7,'09:00').slice(0,10),maxGrade:100})]);
    const submissions = channels.flatMap((c,ci)=>enrollments.filter(e=>c.sectionIds.includes(e.sectionId)).flatMap(e=>{
      const i=enrollments.indexOf(e),within=i%25;if(within>=20)return [];
      return [row(`od1-submission-${ci}-${i}`,{assignmentId:`od1-assignment-${ci}`,channelId:c.id,academicYearId:yearId,sectionId:e.sectionId,enrollmentId:e.id,studentId:e.accountId,revision:1,answer:'أوضحت المعطيات وطبّقت خطوات الحل ثم تحققت من النتيجة.',attachments:[],history:[],submittedAt:dateAt(-2,'09:00')+':00.000Z',late:false,...(within<15?{review:{teacherId:c.teacher,reviewedAt:dateAt(-1,'12:00')+':00.000Z',grade:72+(i+ci)%27,feedback:'خطوات واضحة. راجع الوحدات وفسّر النتيجة النهائية.'}}:{})})];
    }));
    const weekly = [3,4,4,4,3,3,2,2,2];
    const periodRows = new Map(sections.map(s=>[s.id,[]]));
    // Edge-color a regularized teacher/section multigraph. Each matching is one
    // period: a teacher and a section occur at most once, including repeated lessons.
    const size=teachers.length,degree=weekly.reduce((n,v)=>n+v,0);
    const grid=Array.from({length:size},()=>Array.from({length:size},()=>[]));
    for(const a of assignments)for(let n=0;n<weekly[subjects.findIndex(s=>s.id===a.subjectId)];n++)grid[teachers.findIndex(t=>t.id===a.teacherId)][sections.findIndex(s=>s.id===a.sectionId)].push({a,n});
    const left=grid.map(row=>degree-row.reduce((n,edges)=>n+edges.length,0));
    const right=Array.from({length:size},(_,i)=>degree-grid.reduce((n,row)=>n+row[i].length,0));
    for(let l=0;l<size;l++)for(let r=0;r<size;r++)while(left[l]>0&&right[r]>0){grid[l][r].push(null);left[l]--;right[r]--;}
    for(let slot=0;slot<degree;slot++){
      const matching=Array(size).fill(-1);
      function augment(l,seen){for(let r=0;r<size;r++){if(seen.has(r)||!grid[l][r].length)continue;seen.add(r);if(matching[r]<0||augment(matching[r],seen)){matching[r]=l;return true;}}return false;}
      for(let l=0;l<size;l++)if(!augment(l,new Set()))fail('INVALID_TIMETABLE');
      matching.forEach((l,r)=>{const edge=grid[l][r].pop();if(!edge)return;const {a,n}=edge,c=channels[l];periodRows.get(a.sectionId).push({id:`od1-period-${a.id}-${n}`,day:slot%5,period:Math.floor(slot/5)+1,assignmentId:a.id,subjectId:a.subjectId,teacherId:a.teacherId,subjectName:subjects.find(s=>s.id===a.subjectId).name,teacherName:teachers[l].name,channelId:c.id});});
    }
    const tables = sections.map((s,i)=>{const periods=periodRows.get(s.id),versionId=`od1-table-version-${i}`;return row(`od1-table-${i}`,{academicYearId:yearId,sectionId:s.id,status:'published',revision:1,periods,publishedVersionId:versionId,versions:[row(versionId,{number:1,periods,publishedAt:stamp,actorId:schoolId})],history:[row(`od1-table-history-${i}`,{revision:1,action:'publish',periods,actorId:schoolId})]});});
    const values = {
      [key('orbit.school.academics.demo.v1:')]:db({students,teachers,classes,subjects,allocations}),
      [key('orbit.school.years.demo.v1:')]:db({activeYearId:yearId,years}),
      [key('orbit.school.section-structures.demo.v1:')]:db({grades,sections}),
      [key('orbit.school.enrollments.demo.v1:')]:annual,
      [key('orbit.school.enrollment-identities.demo.v1:')]:identity,
      [key('orbit.school.teaching-assignments.demo.v1:')]:teaching,
      [key('orbit.school.education.links.v1:')]:db({mappings:teachers.map((t,i)=>row(`od1-report-teacher-${i}`,{role:'teachers',academicId:t.id,accountId:email('teacher',i)})),links:[]}),
      [key('orbit.school.timetable.demo.v1:')]:db({records:[]}),
      [key('orbit.school.period-timetables.demo.v1:')]:db({tables,requirements:grades.map(g=>row(`od1-requirements-${g.name}`,{academicYearId:yearId,gradeId:g.id,subjects:subjects.map((s,i)=>({subjectId:s.id,count:weekly[i]})),updatedAt:stamp})),availability:[],requests:[]}),
      [key('orbit.school.events.demo.v1:')]:db({records:[row('od1-science-day',{academicYearId:yearId,type:'event',title:'معرض العلوم ومشاريع الطلاب · Science exhibition',description:'يعرض الطلاب تجاربهم العلمية ويناقشون نتائجها مع المعلمين.',dateTime:dateAt(3,'09:00'),audience:'school',classIds:[],location:'مختبر العلوم · Science lab'}),row('od1-family-day',{academicYearId:yearId,type:'event',title:'لقاء أولياء الأمور · Family meetings',description:'لقاءات لمراجعة تقدم الطلاب وخطط الدعم.',dateTime:dateAt(7,'14:00'),audience:'school',classIds:[],location:'قاعة المدرسة · School hall'}),row('od1-reading-week',{academicYearId:yearId,type:'announcement',title:'أسبوع القراءة · Reading week',description:'مناقشات قرائية وأنشطة صفية خلال الأسبوع.',dateTime:dateAt(14,'08:00'),audience:'school',classIds:[],location:'المكتبة · Library'})]})
    };
    return {version,schoolId,referenceDate,yearId,values,identities,channels,posts,submissions,counts:{students:300,teachers:15,sections:12,subjects:9,teaching:assignments.length,channels:channels.length,assignments:channels.length,submissions:submissions.length,evaluations:submissions.filter(s=>s.review).length,periods:sections.length*degree,events:3}};
  }
  async function credentials(identities) {
    const material = await crypto.subtle.importKey('raw',new TextEncoder().encode('OrbitDemo2026!'),'PBKDF2',false,['deriveBits']);
    const result=[];
    for(let start=0;start<identities.length;start+=8)result.push(...await Promise.all(identities.slice(start,start+8).map(async a=>{
      const salt=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(tag+a.email))).slice(0,16);
      const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},material,256));
      return {...a,schoolId,demoSet:tag,status:'active',mustChangePassword:false,createdAt:'2026-09-01T08:00:00.000Z',salt:btoa(String.fromCharCode(...salt)),digest:btoa(String.fromCharCode(...bits))};
    })));
    return result;
  }
  // Only an explicit retry recovers an interrupted import. Never runs at page load.
  function recover() {
    const tx=parse(journalKey,null);if(!tx)return;
    if(tx.version!==version||tx.schoolId!==schoolId||!tx.before||!tx.proposed)fail('DEMO_CONFLICT');
    const shared=['orbit.recruitment.v1','orbit.profiles.v1','orbit.channels.v2','orbit.memberships.v3','orbit.assignments.v1'];
    if(Object.entries(tx.before).some(([k,v])=>!(shared.includes(k)||k.startsWith('orbit.school.')&&k.endsWith(':'+encodeURIComponent(schoolId)))||(v!==null&&typeof v!=='string')||typeof tx.proposed[k]!=='string'))fail('DEMO_CONFLICT');
    if(localStorage.getItem(manifestKey)) { localStorage.removeItem(journalKey); return; }
    for(const [k,v]of Object.entries(tx.before)){const now=localStorage.getItem(k);if(now!==v&&hash(now)!==tx.proposed[k])fail('DEMO_CONFLICT');}
    for(const [k,v]of Object.entries(tx.before).reverse()){if(localStorage.getItem(k)===v)continue;if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}
    localStorage.removeItem(journalKey);
  }
  let pending=false;
  async function loadConfirmed(confirmed) {
    authorize(confirmed);if(pending)fail('DEMO_BUSY');pending=true;
    try {
      recover();
      const existing=parse(manifestKey,null);
      if(existing){if(existing.version!==version||existing.schoolId!==schoolId||!Array.isArray(existing.keys)||existing.keys.some(k=>localStorage.getItem(k)===null))fail('DEMO_CONFLICT');return {...existing,reused:true};}
      const actor=OrbitAuth.current().email,seed=build();
      if(Object.keys(localStorage).some(k=>k.startsWith('orbit.school.')&&k.endsWith(':'+encodeURIComponent(schoolId))))fail('DEMO_CONFLICT');
      const shared=['orbit.recruitment.v1','orbit.profiles.v1','orbit.channels.v2','orbit.memberships.v3','orbit.assignments.v1'];
      const before=Object.fromEntries([...Object.keys(seed.values),...shared].map(k=>[k,localStorage.getItem(k)]));
      const recruitment=parse(shared[0],{accounts:[],schools:[],jobs:[],applications:[],notifications:[]}),profiles=parse(shared[1],{schema:1,records:{}}),channels=parse(shared[2],{channels:[],posts:[],role:'school',joined:[]}),memberships=parse(shared[3],{}),assignments=parse(shared[4],{submissions:[],notifications:[]});
      if(!recruitment||!Array.isArray(recruitment.accounts)||!profiles?.records||Array.isArray(profiles.records)||!Array.isArray(channels?.channels)||!Array.isArray(channels.posts)||!memberships||Array.isArray(memberships)||!Array.isArray(assignments?.submissions))fail('INVALID_DATA');
      const collision=(saved,incoming)=>saved.some(a=>incoming.some(b=>a.id===b.id));
      if(seed.identities.some(a=>recruitment.accounts.some(r=>r.email===a.email)||Object.hasOwn(profiles.records,a.email)||Object.hasOwn(memberships,a.email))||recruitment.schools?.some(r=>r.id===schoolId)||channels.channels.some(c=>c.schoolId===schoolId)||collision(channels.channels,seed.channels)||collision(channels.posts,seed.posts)||collision(assignments.submissions,seed.submissions))fail('DEMO_CONFLICT');
      // A reserved fictional identity must not already occur in another school's
      // reviewed or legacy data, even when its account record is missing.
      const reservedEmails=new Set(seed.identities.map(a=>a.email));
      const referencesReserved=v=>typeof v==='string'?reservedEmails.has(v):Array.isArray(v)?v.some(referencesReserved):v&&typeof v==='object'?Object.entries(v).some(([k,v])=>reservedEmails.has(k)||referencesReserved(v)):false;
      const dependencies=Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')||k==='orbit.admin.v1').map(k=>[k,localStorage.getItem(k)]));
      for(const [k,raw]of Object.entries({...Object.fromEntries(shared.map(k=>[k,before[k]])),...dependencies})){if(raw!==null){let data;try{data=JSON.parse(raw);}catch{fail('INVALID_DATA');}if(referencesReserved(data))fail('DEMO_CONFLICT');}}
      const accounts=await credentials(seed.identities);
      recruitment.accounts.push(...accounts);recruitment.schools??=[];recruitment.schools.push({id:schoolId,name:seed.identities[0].name,demoSet:tag});
      accounts.forEach(a=>{profiles.records[a.email]={id:a.email,name:a.name,role:a.role,demoSet:tag,available:false,shareWithSchools:false};});
      channels.channels.push(...seed.channels);channels.posts.push(...seed.posts);assignments.submissions.push(...seed.submissions);
      const annual=seed.values[key('orbit.school.enrollments.demo.v1:')];
      for(const e of annual.enrollments)memberships[e.accountId]=seed.channels.filter(c=>c.sectionIds.includes(e.sectionId)).map(c=>c.id);
      shared.forEach((k,i)=>{seed.values[k]=[recruitment,profiles,channels,memberships,assignments][i];});
      const installed=Object.fromEntries(Object.entries(seed.values).map(([k,v])=>[k,JSON.stringify(v)]));
      if(OrbitAuth.current()?.email!==actor||Object.entries({...before,...dependencies}).some(([k,v])=>localStorage.getItem(k)!==v))fail('STALE_DATA');
      const manifest={version,schoolId,referenceDate:seed.referenceDate,counts:seed.counts,keys:Object.keys(installed),returnUser:OrbitAuth.current()};
      localStorage.setItem(journalKey,JSON.stringify({version,schoolId,before,proposed:Object.fromEntries(Object.entries(installed).map(([k,v])=>[k,hash(v)]))}));
      // Accounts are committed last, after all relationships exist. An interrupted
      // import cannot authenticate a new demo identity into a partial school.
      const writes=[...Object.entries(installed).filter(([k])=>k!=='orbit.recruitment.v1'),['orbit.recruitment.v1',installed['orbit.recruitment.v1']]];
      try {for(const [k,v]of writes)localStorage.setItem(k,v);localStorage.setItem(manifestKey,JSON.stringify(manifest));}
      catch(error){try{recover();}catch{/* Journal remains for explicit recovery; never discard it on failed rollback. */}throw error;}
      // Commit is complete. Failure to clear the journal does not undo committed data.
      try{localStorage.removeItem(journalKey);}catch{}
      return {...manifest,reused:false};
    } finally { pending=false; }
  }
  async function load(confirmed) {
    authorize(confirmed);
    return navigator.locks?.request ? navigator.locks.request(tag,()=>loadConfirmed(confirmed)) : loadConfirmed(confirmed);
  }
  function enter() {
    if(!parse(manifestKey,null))fail('DEMO_NOT_LOADED');
    const account=parse('orbit.recruitment.v1',{accounts:[]}).accounts.find(a=>a.email===schoolId&&a.demoSet===tag&&a.role==='school'&&a.status==='active');
    if(!account)fail('DEMO_CONFLICT');OrbitAuth.startSession({email:schoolId,role:'school',name:account.name});location.href='../school-management/school-management.html?section=overview';
  }
  window.OrbitAcademicDemo=Object.freeze({load,enter,build,schoolId,manifestKey,journalKey,version});
})();
