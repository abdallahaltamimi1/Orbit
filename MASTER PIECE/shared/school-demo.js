/* Explicit fictional-school import. No data is loaded by merely opening a page. */
(() => {
  'use strict';
  const schoolId='alnahda.demo@orbit.example', tag='orbit-school-walkthrough-v1', manifestKey='orbit.demo.school.manifest.v1';
  const parse=(k,f)=>{const v=localStorage.getItem(k);return v===null?structuredClone(f):JSON.parse(v);};
  const stamp='2026-09-01T08:00:00.000Z', enc=encodeURIComponent(schoolId), key=p=>p+enc;
  const row=(id,fields)=>({id,schoolId,demoSet:tag,createdAt:stamp,...fields});
  const studentNames=['ليان الخطيب · Layan Al Khatib','عمر النجار · Omar Al Najjar','نور الحسن · Noor Al Hasan','آدم منصور · Adam Mansour','سارة عوض · Sara Awad','يوسف زيدان · Yousef Zaidan','مريم حمدان · Maryam Hamdan','زين خالد · Zain Khaled','تالا ناصر · Tala Nasser','أحمد سليمان · Ahmad Suleiman','جنى فؤاد · Jana Fouad','كريم عيسى · Kareem Issa'];
  const teacherNames=['ريم الدجاني · Reem Dajani','خالد المصري · Khaled Masri','هبة قاسم · Hiba Qasem','سامر حداد · Samer Haddad','دانا أبو زيد · Dana Abu Zaid','محمد العلي · Mohammad Al Ali'];
  const subjects=['الرياضيات · Mathematics','العلوم · Science','اللغة العربية · Arabic','اللغة الإنجليزية · English','الحاسوب · Computing','التاريخ · History'];
  const slots=[['7','A'],['7','B'],['8','A'],['8','B'],['9','A'],['10','A'],['11','A'],['12','A']];
  const account=(role,i)=>`${role}${i+1}.alnahda@orbit.example`;
  async function credential(email,role,name){
    const salt=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(role==='school'?'SchoolDemo2026!':'WelcomeDemo2026!'),'PBKDF2',false,['deriveBits']);
    const digest=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(atob(salt),c=>c.charCodeAt(0)),iterations:100000,hash:'SHA-256'},material,256))));
    return {email,role,name,status:'active',salt,digest,schoolId,demoSet:tag,createdAt:'2025-08-20T08:00:00.000Z',mustChangePassword:role!=='school'};
  }
  function authorize(confirmed){if(OrbitAuth.current()?.role!=='school')throw Error('ROLE_DENIED');if(confirmed!==true)throw Error('CONFIRMATION_REQUIRED');}
  async function load(confirmed){
    authorize(confirmed);
    if(localStorage.getItem(manifestKey)){const manifest=parse(manifestKey,null);if(manifest?.schema!==1||manifest.schoolId!==schoolId||Object.keys(manifest.installed).some(k=>k.startsWith('orbit.school.')&&localStorage.getItem(k)===null))throw Error('DEMO_CONFLICT');return {schoolId,reused:true};}
    const returnUser=OrbitAuth.current(), actor=returnUser.email;
    const exclusive=[key('orbit.school.academics.demo.v1:'),key('orbit.school.years.demo.v1:'),key('orbit.school.enrollments.demo.v1:'),key('orbit.school.enrollment-identities.demo.v1:'),key('orbit.school.education.links.v1:'),key('orbit.school.timetable.demo.v1:'),key('orbit.school.events.demo.v1:'),key('orbit.school.section-structures.demo.v1:'),key('orbit.school.teaching-assignments.demo.v1:'),key('orbit.school.period-timetables.demo.v1:')];
    if(exclusive.some(k=>localStorage.getItem(k)!==null))throw Error('DEMO_CONFLICT');
    const shared=['orbit.recruitment.v1','orbit.profiles.v1','orbit.channels.v2','orbit.memberships.v3','orbit.assignments.v1'];
    const before=Object.fromEntries([...exclusive,...shared,manifestKey].map(k=>[k,localStorage.getItem(k)]));
    const recruitment=parse(shared[0],{accounts:[],schools:[],jobs:[],applications:[],notifications:[]});
    recruitment.accounts??=[];recruitment.schools??=[];recruitment.notifications??=[];
    const profiles=parse(shared[1],{schema:1,records:{}}), channels=parse(shared[2],{channels:[],posts:[],role:'school',joined:[]}), memberships=parse(shared[3],{}), assignments=parse(shared[4],{submissions:[],notifications:[]});
    channels.channels ??= []; channels.posts ??= []; profiles.records ??= {};
    if (!Array.isArray(channels.channels) || !Array.isArray(channels.posts) || !profiles.records || Array.isArray(profiles.records)) throw Error('DEMO_CONFLICT');
    const identities=[{email:schoolId,role:'school',name:'مدارس النهضة · Al Nahda School'},...studentNames.map((name,i)=>({email:account('student',i),role:'student',name})),...teacherNames.map((name,i)=>({email:account('teacher',i),role:'teacher',name}))];
    if(identities.some(a=>recruitment.accounts.some(r=>r.email===a.email)||profiles.records?.[a.email]||Object.hasOwn(memberships,a.email)) || recruitment.schools.some(r=>r.id===schoolId) || channels.channels.some(c=>c.schoolId===schoolId))throw Error('DEMO_CONFLICT');
    const credentials=await Promise.all(identities.map(a=>credential(a.email,a.role,a.name)));
    const years=[row('nahda-year-past',{name:'2025-2026',startDate:'2025-09-01',endDate:'2026-06-30',status:'archived',updatedAt:stamp}),row('nahda-year-current',{name:'2026-2027',startDate:'2026-09-01',endDate:'2027-06-30',status:'upcoming',updatedAt:stamp}),row('nahda-year-next',{name:'2027-2028',startDate:'2027-09-01',endDate:'2028-06-30',status:'upcoming',updatedAt:stamp})];
    const classes=years.flatMap((y,yi)=>slots.map(([grade,section],i)=>row(`nahda-class-${yi}-${i}`,{grade:yi===0?String(Number(grade)-1):grade,section,academicYear:y.name,status:yi===0?'archived':'active'})));
    const academic={schema:1,schoolId,revision:0,classes,students:studentNames.map((name,i)=>row(`nahda-student-${i}`,{name,studentCode:`N-S${String(i+1).padStart(2,'0')}`,status:'enrolled',classId:`nahda-class-1-${i%8}`})),teachers:teacherNames.map((name,i)=>row(`nahda-teacher-${i}`,{name,teacherCode:`N-T${i+1}`})),subjects:subjects.map((name,i)=>row(`nahda-subject-${i}`,{name,status:'active'})),allocations:classes.map((c,i)=>row(`nahda-allocation-${i}`,{classId:c.id,teacherId:`nahda-teacher-${i%8%6}`,subjectId:`nahda-subject-${i%8%6}`}))};
    const mappings=academic.students.map((s,i)=>row(`nahda-identity-${i}`,{academicStudentId:s.id,accountId:account('student',i),status:'confirmed',actorId:schoolId,confirmedAt:'2025-08-22T08:00:00.000Z',createdAt:'2025-08-20T08:00:00.000Z',updatedAt:stamp}));
    const history=mappings.flatMap((m,i)=>[row(`nahda-identity-request-${i}`,{mappingId:m.id,type:'requested',actorId:schoolId,fromAccountId:null,toAccountId:null,createdAt:'2025-08-20T08:00:00.000Z'}),row(`nahda-identity-confirm-${i}`,{mappingId:m.id,type:'confirmed',actorId:schoolId,fromAccountId:null,toAccountId:m.accountId,createdAt:'2025-08-22T08:00:00.000Z'})]);
    const classYearLinks=classes.map((c,i)=>row(`nahda-class-link-${i}`,{classId:c.id,academicYearId:years[Math.floor(i/8)].id,gradeSnapshot:c.grade,sectionSnapshot:c.section,legacyYearSnapshot:c.academicYear,actorId:schoolId,confirmedAt:stamp}));
    const enrollments=[],placements=[];
    for(const yi of [0,1])academic.students.forEach((s,i)=>{const eId=`nahda-enrollment-${yi}-${i}`,pId=`nahda-placement-${yi}-${i}`,c=classes[yi*8+i%8];enrollments.push(row(eId,{academicYearId:years[yi].id,academicStudentId:s.id,accountId:account('student',i),mappingId:mappings[i].id,status:'enrolled',currentPlacementId:pId,educationalAccess:false,revision:1,createdAt:yi===0?'2025-09-01T08:00:00.000Z':stamp,updatedAt:stamp}));placements.push(row(pId,{enrollmentId:eId,classId:c.id,gradeSnapshot:c.grade,sectionSnapshot:c.section,createdAt:yi===0?'2025-09-01T08:00:00.000Z':stamp,effectiveAt:yi===0?'2025-09-01T08:00:00.000Z':stamp,previousPlacementId:null,actorId:schoolId}));});
    OrbitSchoolEnrollments.inspectSnapshots(schoolId,{schema:1,schoolId,revision:0,classYearLinks,enrollments,placements,transfers:[],operations:[]},{schema:1,schoolId,revision:0,mappings,history,operations:[]});
    const schoolChannels=slots.map(([grade,section],i)=>row(`nahda-channel-${i}`,{en:`Grade ${grade}${section} · ${subjects[i%6].split(' · ')[1]}`,ar:`الصف ${grade}${section} · ${subjects[i%6].split(' · ')[0]}`,teacher:account('teacher',i%6),subject:['math','biology','arabic','english','computing','history'][i%6],private:false,academicYearId:years[1].id,allocationId:`nahda-allocation-${8+i}`,descEn:'School learning and practice',descAr:'التعلم والتدريب المدرسي'}));
    const posts=schoolChannels.flatMap((c,i)=>[row(`nahda-lesson-${i}`,{channel:c.id,type:'lesson',titleEn:'Explore and explain',titleAr:'نستكشف ونفسّر',bodyEn:'Read the example, describe your reasoning, then compare your approach in class.',bodyAr:'اقرأ المثال واشرح طريقة تفكيرك ثم ناقشها في الصف.'}),row(`nahda-assignment-${i}`,{channel:c.id,type:'assignment',titleEn:'Practice and reflection',titleAr:'تدريب وتأمل',bodyEn:'Describe an example and explain the steps you used.',bodyAr:'اذكر مثالًا واشرح خطوات الحل.',dueDate:'2026-11-20',maxGrade:100})]);
    const submissions=academic.students.map((s,i)=>row(`nahda-submission-${i}`,{assignmentId:`nahda-assignment-${i%8}`,channelId:`nahda-channel-${i%8}`,studentId:account('student',i),revision:1,answer:'مثال تدريبي: شرحت خطوات الحل وراجعت النتيجة.',attachments:[],history:[],submittedAt:'2026-11-02T09:00:00.000Z',late:false,...(i<10?{review:{teacherId:account('teacher',i%8%6),reviewedAt:'2026-11-02T12:00:00.000Z',grade:80+i,feedback:'شرح واضح، أحسنت.'}}:{})}));
    const reserved = (saved, incoming) => saved.some(old => incoming.some(record => record.id === old.id));
    if (reserved(channels.channels, schoolChannels) || reserved(channels.posts, posts) || reserved(assignments.submissions || [], submissions) ||
        recruitment.notifications.some(item => item.id === 'nahda-notification') ||
        (assignments.notifications || []).some(item => item.id === 'nahda-academic-notification')) throw Error('DEMO_CONFLICT');
    credentials.forEach((a,i)=>{recruitment.accounts.push({...a,...(a.role!=='school'?{academicId:a.role==='student'?academic.students[i-1].id:academic.teachers[i-13].id}:{})});profiles.records[a.email]={id:a.email,role:a.role,name:a.name,demoSet:tag,...(a.role==='student'?{level:'secondary'}:a.role==='teacher'?{subject:['math','biology','arabic','english','computing','history'][(i-13)%6],experience:8,subjects:[],grades:['7','8','9','10','11','12'],shareWithSchools:true,available:false}:{location:'Amman',contact:schoolId,type:'private',levels:['secondary'],subjects:['math','biology','arabic','english']})};});
    recruitment.schools.push({id:schoolId,name:identities[0].name,demoSet:tag});
    recruitment.notifications.push(row('nahda-notification',{schoolId,recipient:schoolId,link:'../school-management/school-management.html?section=years',en:'Welcome to the Al Nahda school walkthrough',ar:'مرحبًا بك في الجولة المدرسية للنهضة',read:false}));
    channels.channels.push(...schoolChannels);channels.posts.push(...posts);
    academic.students.forEach((s,i)=>{memberships[account('student',i)]=[`nahda-channel-${i%8}`];});
    assignments.submissions??=[];assignments.notifications??=[];assignments.submissions.push(...submissions);assignments.notifications.push(row('nahda-academic-notification',{recipient:account('student',0),assignmentId:'nahda-assignment-0',en:'Your practice has been reviewed',ar:'تمت مراجعة تدريبك',read:false,event:'reviewed'}));
    const reporting={schema:1,schoolId,revision:0,links:schoolChannels.map((c,i)=>row(`nahda-report-link-${i}`,{channelId:c.id,classId:`nahda-class-1-${i}`,subjectId:`nahda-subject-${i%6}`,allocationId:`nahda-allocation-${8+i}`})),mappings:[...academic.teachers.map((t,i)=>row(`nahda-report-teacher-${i}`,{role:'teachers',academicId:t.id,accountId:account('teacher',i)})),...academic.students.map((s,i)=>row(`nahda-report-student-${i}`,{role:'students',academicId:s.id,accountId:account('student',i)}))]};
    const timetable={schema:1,schoolId,revision:0,records:schoolChannels.map((c,i)=>row(`nahda-period-${i}`,{allocationId:`nahda-allocation-${8+i}`,classId:`nahda-class-1-${i}`,subjectId:`nahda-subject-${i%6}`,teacherId:`nahda-teacher-${i%6}`,day:i%5,startTime:`${String(8+Math.floor(i/5)).padStart(2,'0')}:00`,endTime:`${String(8+Math.floor(i/5)).padStart(2,'0')}:45`,room:`R${i+1}`}))};
    const events={schema:1,schoolId,revision:0,records:[row('nahda-event',{academicYearId:'nahda-year-current',type:'event',title:'يوم العلوم · Science day',description:'معرض مشاريع الطلاب · Student project exhibition',dateTime:'2026-11-25T09:00',audience:'school',classIds:[],location:'قاعة المدرسة · School hall'}),row('nahda-announcement',{academicYearId:'nahda-year-current',type:'announcement',title:'لقاء أولياء الأمور · Family meetings',description:'مراجعة تقدم الطلاب · Review student progress',dateTime:'2026-11-18T14:00',audience:'school',classIds:[],location:'المدرسة · School'})]};
    // Seed explicit annual relationships alongside the reviewed legacy examples.
    const grades=[...new Set(slots.map(([grade])=>grade))].map(grade=>row("nahda-grade-"+grade,{name:grade}));
    const sections=years.slice(1).flatMap(y=>slots.map(([grade,name],i)=>row("nahda-section-"+y.id+"-"+i,{academicYearId:y.id,gradeId:"nahda-grade-"+grade,name})));
    const teaching=sections.map((section,i)=>row("nahda-teaching-"+i,{academicYearId:section.academicYearId,sectionId:section.id,gradeId:section.gradeId,teacherId:academic.teachers[i%8%6].id,subjectId:academic.subjects[i%8%6].id,updatedAt:stamp}));
    const structures={schema:1,schoolId,revision:0,grades,sections};
    const yearTeaching={schema:1,schoolId,revision:0,assignments:teaching,reviews:[],history:teaching.map((a,i)=>row("nahda-teaching-history-"+i,{assignmentId:a.id,actorId:schoolId,before:null,after:a}))};
    const draftSection=sections[8];
    const publishedAssignment=teaching[4];
    const publishedPeriods=[{id:"nahda-numbered-period",day:1,period:2,assignmentId:publishedAssignment.id,
      subjectId:publishedAssignment.subjectId,teacherId:publishedAssignment.teacherId,subjectName:academic.subjects[4].name,
      teacherName:academic.teachers[4].name,channelId:null}];
    const periodTables={schema:1,schoolId,revision:0,requirements:[
      row("nahda-weekly-computing",{academicYearId:publishedAssignment.academicYearId,gradeId:publishedAssignment.gradeId,subjects:[{subjectId:publishedAssignment.subjectId,count:1}],updatedAt:stamp})
    ],availability:[],requests:[],tables:[
      row("nahda-numbered-published",{academicYearId:publishedAssignment.academicYearId,sectionId:publishedAssignment.sectionId,status:"published",revision:1,
        periods:publishedPeriods,publishedVersionId:"nahda-numbered-version",versions:[row("nahda-numbered-version",{number:1,periods:publishedPeriods,publishedAt:stamp,actorId:schoolId})],
        history:[row("nahda-numbered-published-history",{revision:1,action:"publish",periods:publishedPeriods,actorId:schoolId})]}),
      row("nahda-numbered-draft",{academicYearId:draftSection.academicYearId,sectionId:draftSection.id,status:"draft",revision:1,periods:[],versions:[],publishedVersionId:null,
        history:[row("nahda-numbered-draft-start",{revision:1,action:"blank",periods:[],actorId:schoolId})]})
    ]};
    const values=[academic,{schema:1,schoolId,revision:0,activeYearId:null,years},{schema:1,schoolId,revision:0,classYearLinks,enrollments,placements,transfers:[],operations:[]},{schema:1,schoolId,revision:0,mappings,history,operations:[]},reporting,timetable,events,structures,yearTeaching,periodTables,recruitment,profiles,channels,memberships,assignments];
    const keys=[...exclusive,...shared],installed=Object.fromEntries(keys.map((k,i)=>[k,JSON.stringify(values[i])]));
    if(OrbitAuth.current()?.email!==actor||keys.some(k=>localStorage.getItem(k)!==before[k]))throw Error('STALE_DATA');
    try{for(const k of keys)localStorage.setItem(k,installed[k]);localStorage.setItem(manifestKey,JSON.stringify({schema:1,schoolId,before,installed,returnUser}));}
    catch(e){for(const k of [...keys,manifestKey]){if(before[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,before[k]);}throw e;}
    return {schoolId,reused:false};
  }
  function reset(confirmed) {
    authorize(confirmed);
    const m=parse(manifestKey,null); if(!m)return false;
    if(Object.keys(localStorage).some(k=>k.startsWith('orbit.school.')&&k.endsWith(enc)&&!(k in m.installed)))throw Error('DEMO_EDITED');
    if(Object.entries(m.installed).some(([k,v])=>localStorage.getItem(k)!==v))throw Error('DEMO_EDITED');
    const before=Object.fromEntries(Object.keys(m.before).map(k=>[k,localStorage.getItem(k)])),session=localStorage.getItem('orbitUser'),returning=OrbitAuth.current().email===schoolId;
    try {
      for(const [k,v]of Object.entries(m.before)){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}
      if(returning){if(m.returnUser?.role==='school'&&m.returnUser.email)localStorage.setItem('orbitUser',JSON.stringify(m.returnUser));else localStorage.removeItem('orbitUser');}
      return true;
    } catch(error) {
      for(const [k,v]of Object.entries(before)){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{}}
      try{if(session===null)localStorage.removeItem('orbitUser');else localStorage.setItem('orbitUser',session);}catch{}
      throw error;
    }
  }
  function enter(){if(!parse(manifestKey,null))throw Error('DEMO_NOT_LOADED');if(!parse('orbit.recruitment.v1',{accounts:[]}).accounts.some(a=>a.email===schoolId&&a.role==='school'&&a.status==='active'))throw Error('DEMO_CONFLICT');OrbitAuth.startSession({email:schoolId,role:'school',name:'مدارس النهضة · Al Nahda School'});location.href='../school-management/school-management.html?section=years';}
  window.OrbitSchoolDemo={load,reset,enter,schoolId,manifestKey};
})();
