import { test, expect } from '@playwright/test';
import os from 'node:os';import path from 'node:path';
const route='/school-management/school-management.html';
async function school(page){await page.goto('/login/login.html');await page.locator('[data-user="school"]').click();await page.locator('#loginButton').click();await page.waitForURL('**/school-dashboard/school-dashboard.html');await page.evaluate(()=>{const p=OrbitAuth.get('orbit.student.v1',{});localStorage.setItem('orbit.student.v1',JSON.stringify({...p,lang:'en'}));});await page.goto(route+'?section=years');}
async function seed(page){await school(page);await page.locator('[data-school-action="demo"]').click();const d=page.locator('.sm-admin-dialog[open]');await d.locator('[name="confirmed"]').check();await d.locator('[type="submit"]').click();await page.waitForURL('**/school-management/school-management.html?section=years');await expect(page.locator('#orbit-rail .orbit-identity')).toContainText('Al Nahda');}
async function activate(page){await page.locator('[data-year-activate="nahda-year-current"]').click();await page.locator('dialog[open]').getByRole('button',{name:'Confirm activation',exact:true}).click();await expect(page.locator('[data-school-year]')).toHaveValue('nahda-year-current');}
async function action(page,id){if(['account','identity','enroll'].includes(id)&&await page.locator('[data-student-advanced]').count())await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);await page.locator(`[data-school-action="${id}"]`).click();const d=page.locator('.sm-admin-dialog[open]');await d.locator('[name="confirmed"]').check();return d;}

test('connected school journey preserves existing data and exercises reviewed years, rosters, teaching, channels, monitoring and promotions',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await school(page);const original=await page.evaluate(()=>({key:OrbitSchoolAcademics.storageKey(),data:localStorage.getItem(OrbitSchoolAcademics.storageKey())}));
 await page.locator('[data-school-action="demo"]').click();let d=page.locator('dialog[open]');await d.locator('[name="confirmed"]').check();await d.locator('[type="submit"]').click();await expect(page.locator('#orbit-rail .orbit-identity')).toContainText('Al Nahda');
 expect(await page.evaluate(()=>OrbitSchoolYears.read().activeYearId)).toBeNull();await activate(page);
 const integrity=await page.evaluate(()=>{const a=OrbitSchoolAcademics.read(),e=OrbitSchoolEnrollments.read(),m=OrbitSchoolAcademicReadModel.read('nahda-year-current'),r=OrbitSchoolMonitoring.report();return {students:a.students.length,teachers:a.teachers.length,subjects:a.subjects.length,grades:new Set(m.classes.map(c=>c.grade)).size,sections:m.classes.length,enrolled:m.enrollments.length,issues:m.enrollments.flatMap(e=>e.issues),channels:r.rows.length,submitted:r.totals.submitted,reviewed:r.totals.reviewed,placements:e.placements.length};});
 expect(integrity).toEqual({students:12,teachers:6,subjects:6,grades:6,sections:8,enrolled:12,issues:[],channels:8,submitted:12,reviewed:10,placements:24});
 await page.locator('#orbit-rail a[href$="?section=classes"]').click();await expect(page.locator('[data-record-id]')).toHaveCount(8);
 await page.locator('#orbit-rail a[href$="?section=students"]').click();await page.locator('[data-student-tab="annual"]').click();await expect(page.locator('[data-annual-student]')).toHaveCount(12);
 await page.locator('#orbit-rail a[href$="?section=teachers"]').click();await expect(page.locator('[data-teacher-open]')).toHaveCount(6);await page.locator('[data-teacher-open]').first().click();await expect(page.locator('.pm-teacher-details[open]')).toBeVisible();await expect(page.locator('.pm-assignment-group').first()).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('#orbit-rail a[href$="?section=subjects"]').click();await expect(page.locator('[data-allocations-table]')).toHaveCount(0);expect(await page.evaluate(()=>OrbitSchoolTeaching.read('nahda-year-current').assignments.length)).toBe(8);
 await page.locator('#orbit-rail a[href$="?section=monitoring"]').click();const monitor=page.locator('[data-annual-monitoring]');
 await expect(monitor.locator('[data-annual-search]')).toBeVisible();
 // Legacy class links require explicit reporting review; never fabricate canonical annual activity.
 expect(await page.evaluate(()=>OrbitAnnualMonitoring.report('nahda-year-current').unresolved.length)).toBe(8);
 await monitor.locator('[data-links]').filter({visible:true}).first().click();await expect(page.locator('[data-monitor-channel]')).toHaveCount(8);
 await page.locator('[data-school-activity]').first().click();await expect(page.locator('[data-activity-detail]')).toContainText('Reviewed');await expect(page.locator('[data-activity-detail]')).not.toContainText('مثال تدريبي');
 await page.locator('a[href="../channels/channels.html"]').last().click();await expect(page.locator('a[href*="nahda-channel-"]').first()).toBeVisible();await page.locator('a[href*="nahda-channel-"]').first().click();await page.locator('[data-section="assignments"]').click();await expect(page.locator('#app')).toContainText('Practice and reflection');
 await page.goto(route+'?section=timetable');await expect(page.locator('[data-period-builder]')).toBeVisible();await page.evaluate(()=>OrbitSchoolWorkflow.publishTimetable(true));expect(await page.evaluate(()=>OrbitSchoolWorkflow.read(OrbitAuth.current().email).timetables[0].records.length)).toBe(8);
 await page.goto(route+'?section=events');d=await action(page,'publish-event');await d.locator('[name="eventId"]').selectOption('nahda-announcement');await d.locator('[type="submit"]').click();await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.locator('[data-school-year]').selectOption('nahda-year-next');await page.goto(route+'?section=students&view=promotions');
 await page.locator('[name="targetYear"]').selectOption('nahda-year-next');
 const before=await page.evaluate(()=>localStorage.getItem(OrbitSchoolEnrollments.storageKey()));await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();await expect(page.locator('[data-preview-item]')).toHaveCount(12);expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolEnrollments.storageKey()))).toBe(before);
 await page.goto(route+'?section=students&view=annual');await page.locator('[data-school-year]').selectOption('nahda-year-past');await expect(page.locator('[data-annual-student]').first()).toContainText('6 / A');await page.reload();await expect(page.locator('[data-school-year]')).toHaveValue('nahda-year-past');
 expect(await page.evaluate(({key})=>localStorage.getItem(key),original)).toBe(original.data);expect(errors).toEqual([]);
});

test('demo import is idempotent, rolls back failures and refuses conflicting or edited data resets',async({page})=>{
 await school(page);const before=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 const result=await page.evaluate(async()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('orbit.school.events.demo.v1:alnahda'))throw Error('quota');return set.call(this,k,v);};let error;try{await OrbitSchoolDemo.load(true);}catch(e){error=e.message;}Storage.prototype.setItem=set;return error;});expect(result).toBe('quota');expect(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))).toEqual(before);
 await page.evaluate(()=>OrbitSchoolDemo.load(true));const installed=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));await page.evaluate(()=>OrbitSchoolDemo.load(true));expect(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))).toEqual(installed);
 await page.evaluate(()=>OrbitSchoolDemo.reset(true));expect(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))).toEqual(before);
 await page.evaluate(()=>OrbitSchoolDemo.load(true));await page.evaluate(()=>{const k=OrbitSchoolAcademics.prefix+encodeURIComponent(OrbitSchoolDemo.schoolId),db=JSON.parse(localStorage.getItem(k));db.students.push({id:'keep-user',schoolId:OrbitSchoolDemo.schoolId,name:'Keep',studentCode:'KEEP',status:'enrolled',classId:null});localStorage.setItem(k,JSON.stringify(db));});const edited=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 expect(await page.evaluate(()=>{try{OrbitSchoolDemo.reset(true);return 'bad';}catch(e){return e.message;}})).toBe('DEMO_EDITED');expect(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))).toEqual(edited);
});

test('school account provisioning, explicit student identity/enrollment and first-login password change update real demo state',async({page})=>{
 test.setTimeout(60000);await seed(page);await activate(page);await page.goto(route+'?section=students');
 await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);await page.locator('[data-student-roster] > summary').click();await page.locator('[data-add-kind="students"]').click();let d=page.locator('.sm-academic-dialog[open]');await d.locator('[name="name"]').fill('آية مراد · Aya Murad');await d.locator('[name="studentCode"]').fill('AYA-NEW');await d.getByRole('button',{name:'Save',exact:true}).click();const id=await page.evaluate(()=>OrbitSchoolAcademics.read().students.find(s=>s.studentCode==='AYA-NEW').id);
 d=await action(page,'account');await d.locator('[name="academicId"]').selectOption(id);await d.locator('[name="email"]').fill('aya.school@orbit.example');await d.locator('[type="submit"]').click();await expect(page.locator('dialog[open]')).toHaveCount(0);const temporary=await page.locator('[data-issued-credentials] code').textContent();
 expect(await page.evaluate(()=>OrbitSchoolEnrollments.readMappings().mappings.some(m=>m.academicStudentId===OrbitSchoolAcademics.read().students.find(s=>s.studentCode==='AYA-NEW').id))).toBe(false);
 d=await action(page,'identity');await d.locator('[name="studentId"]').selectOption(id);await d.locator('[name="accountId"]').selectOption('aya.school@orbit.example');await d.locator('[type="submit"]').click();await expect(page.locator('dialog[open]')).toHaveCount(0);
 const placement={gradeId:'nahda-grade-7',id:'nahda-section-nahda-year-current-0'};
 d=await action(page,'enroll');await d.locator('[name="studentId"]').selectOption(id);await d.locator('[name="gradeId"]').selectOption(placement.gradeId);await d.locator('[name="sectionId"]').selectOption(placement.id);await d.locator('[type="submit"]').click();await expect(page.locator('dialog[open]')).toHaveCount(0);
 expect(await page.evaluate(()=>OrbitSchoolEnrollments.read().enrollments.filter(e=>e.accountId==='aya.school@orbit.example'))).toHaveLength(1);
 await page.locator('#orbit-logout').click();await page.waitForURL('**/login/login.html');await page.locator('#email').fill('aya.school@orbit.example');await page.locator('#password').fill(temporary);await page.locator('#loginButton').click();d=page.locator('.orbit-first-login[open]');await expect(d).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('orbitUser'))).toBeNull();await d.locator('[name="password"]').fill('AyaNewPassword2026!');await d.locator('[name="confirm"]').fill('AyaNewPassword2026!');await d.locator('[type="submit"]').click();await page.waitForURL('**/student-dashboard/student-dashboard.html');await expect(page.locator('[data-school-member]')).toBeVisible();expect(await page.evaluate(()=>OrbitRecruitment.data().accounts.find(a=>a.email==='aya.school@orbit.example').mustChangePassword)).toBe(false);
 expect(await page.evaluate(p=>OrbitRecruitment.authenticate('aya.school@orbit.example',p),temporary)).toBeNull();
 await page.locator('#orbit-logout').click();await page.waitForURL('**/login/login.html');
 await page.locator('#email').fill('teacher1.alnahda@orbit.example');await page.locator('#password').fill('WelcomeDemo2026!');await page.locator('#loginButton').click();
 d=page.locator('.orbit-first-login[open]');await d.locator('[name="password"]').fill('ReemNewPassword2026!');await d.locator('[name="confirm"]').fill('ReemNewPassword2026!');await d.locator('[type="submit"]').click();
 await page.waitForURL('**/teacher-dashboard/teacher-dashboard.html');
 await page.getByRole('link',{name:'Create school channel'}).click();
 const create=page.locator('#new-channel');
 await create.locator('[name="workspace"]').selectOption('alnahda.demo@orbit.example');
 await create.locator('[value="nahda-teaching-0"]').check();
 await create.locator('[name="name"]').fill('Al Nahda Mathematics');await create.locator('[name="description"]').fill('Grade 7 mathematics');
 await create.locator('button.btn').click();
 await page.locator('#creation-done').click();
 const link=page.locator('.channel-card').filter({hasText:'Al Nahda Mathematics'}).locator('a.channel-enter');
 const channelUrl=await link.getAttribute('href');
 await link.click();
 await page.locator('#publish').click();
 const form=page.locator('#publish-form');
 await form.locator('[name="type"]').selectOption('assignment');
 await form.locator('[name="title"]').fill('Explain your method');
 await form.locator('[name="body"]').fill('Show the steps in your calculation.');
 for(let step=0;step<2;step++){const next=page.locator('dialog[open] .orbit-next:visible');if(await next.count())await next.click();}
 await form.locator('button[type="submit"]:visible').click();
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.locator('#orbit-logout').click();await page.waitForURL('**/login/login.html');
 await page.locator('#email').fill('aya.school@orbit.example');await page.locator('#password').fill('AyaNewPassword2026!');await page.locator('#loginButton').click();
 await page.waitForURL('**/student-dashboard/student-dashboard.html');
 await page.goto(channelUrl.replace('..',''));
 await page.locator('[data-section="assignments"]').click();
 await page.locator('[data-assignment-submit]').click();
 await page.locator('dialog[open] [name="answer"]').fill('I divided the total into equal groups.');
 await page.locator('dialog[open] button[type="submit"]').click();
 await expect(page.locator('[data-assignment-own]')).toBeVisible();
 async function signInAs(email,password,dashboard){
  await page.locator('#orbit-logout').click();await page.waitForURL('**/login/login.html');
  await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.locator('#loginButton').click();
  await page.waitForURL('**/'+dashboard+'/'+dashboard+'.html');
 }
 await signInAs('teacher1.alnahda@orbit.example','ReemNewPassword2026!','teacher-dashboard');
 await page.goto(channelUrl.replace('..',''));await page.locator('[data-section="assignments"]').click();
 await page.locator('[data-assignment-review-list]').click();await page.locator('[data-assignment-review]').click();
 d=page.locator('dialog[open]');await expect(d).toContainText('I divided the total into equal groups.');
 await d.locator('[name="feedback"]').fill('Clear reasoning.');await d.locator('[name="grade"]').fill('94');await d.locator('button[type="submit"]').click();
 await page.keyboard.press('Escape');
 await signInAs('aya.school@orbit.example','AyaNewPassword2026!','student-dashboard');
 await page.goto(channelUrl.replace('..',''));await page.locator('[data-section="assignments"]').click();
 await expect(page.getByText('Clear reasoning.',{exact:true})).toBeVisible();
 await expect(page.getByText('Grade: 94 / 100',{exact:true})).toBeVisible();
 await signInAs('alnahda.demo@orbit.example','SchoolDemo2026!','school-dashboard');
 await page.goto(route+'?section=monitoring');
 const monitoring=page.locator('[data-annual-monitoring]');
 await monitoring.locator('[data-tab="assignments"]').click();
 await expect(monitoring.locator('.sm-annual-row').filter({hasText:'Explain your method'})).toBeVisible();
 const reviewed=await page.evaluate(()=>OrbitAnnualMonitoring.report('nahda-year-current').rows.find(r=>r.title==='Explain your method').progress.filter(p=>p.evaluation).map(p=>p.evaluation.grade));
 expect(reviewed).toEqual([94]);
 await monitoring.locator('.sm-annual-row').filter({hasText:'Explain your method'}).locator('[data-detail]').click();
 await expect(page.locator('dialog.am-dialog .am-summary dd').nth(0)).toHaveText('1');await expect(page.locator('dialog.am-dialog .am-summary dd').nth(1)).toHaveText('1');
 await page.locator('dialog.am-dialog [data-students]').click();await expect(page.locator('dialog.am-dialog .am-students')).toContainText('94');await page.keyboard.press('Escape');
 await page.goto(route+'?section=students&view=promotions&targetYear=nahda-year-next');
 const promotion=page.locator('[data-promotion-wizard]');await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();
 const studentRow=promotion.locator('[data-preview-item]').filter({hasText:'Aya Murad'});
 await promotion.locator('[data-select-filtered]').click();await studentRow.locator('[data-pw-pick]').uncheck();
 await promotion.locator('[data-pw-bulk] [name="action"]').selectOption('exclude');await promotion.locator('[data-pw-bulk] [type="submit"]').click();
 await studentRow.getByRole('button',{name:'Review',exact:true}).click();d=page.locator('dialog[open]');
 const destination=await page.evaluate(()=>{const P=OrbitSchoolPromotionPreviews,v=P.readDraft(P.read().drafts[0].id);return v.destinations.find(q=>q.sectionId==='nahda-section-nahda-year-next-2').classId;});
 await d.locator('[name="destinationClassId"]').selectOption(destination);await d.locator('[name="eligibilityReviewed"]').check();await d.locator('[name="confirmed"]').check();await d.getByRole('button',{name:'Confirm',exact:true}).click();
 await promotion.locator('[data-pw-summary]').click();await promotion.locator('[data-promotion-review]').click();
 d=page.locator('dialog[open]');await d.locator('[name="confirmed"]').check();await d.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(promotion.locator('[data-step-title]')).toHaveText('Promotion decisions confirmed');await page.reload();await expect(promotion.locator('[data-promotion-review]')).toBeDisabled();
 expect(await page.evaluate(()=>OrbitSchoolEnrollments.read().enrollments.filter(e=>e.academicYearId==='nahda-year-next'&&e.accountId==='aya.school@orbit.example').length)).toBe(1);
 expect(await page.evaluate(()=>OrbitSchoolYears.read().activeYearId)).toBe('nahda-year-current');



});

test('legacy published request service retains school approval, conflict validation and history without a time editor',async({page})=>{
 test.setTimeout(60000);await seed(page);await activate(page);await page.goto(route+'?section=timetable');let d;await page.evaluate(()=>OrbitSchoolWorkflow.publishTimetable(true));
 await page.locator('#orbit-logout').click();await page.waitForURL('**/login/login.html');await page.locator('#email').fill('teacher1.alnahda@orbit.example');await page.locator('#password').fill('WelcomeDemo2026!');await page.locator('#loginButton').click();d=page.locator('.orbit-first-login[open]');await d.locator('[name="password"]').fill('ReemPassword2026!');await d.locator('[name="confirm"]').fill('ReemPassword2026!');await d.locator('[type="submit"]').click();await page.waitForURL('**/teacher-dashboard/teacher-dashboard.html');await page.evaluate(()=>OrbitSchoolWorkflow.requestChange('nahda-period-0',{day:1,startTime:'11:00',endTime:'11:45',room:'R1',reason:'Science workshop'}));await page.reload();await expect(page.locator('[data-school-member]')).toContainText('Pending');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.school.timetable.demo.v1:'+encodeURIComponent('alnahda.demo@orbit.example'))).records.find(p=>p.id==='nahda-period-0').startTime)).toBe('08:00');
 await page.locator('#orbit-logout').click();await page.waitForURL('**/login/login.html');await page.locator('#email').fill('alnahda.demo@orbit.example');await page.locator('#password').fill('SchoolDemo2026!');await page.locator('#loginButton').click();await page.waitForURL('**/school-dashboard/school-dashboard.html');await page.goto(route+'?section=timetable');await page.evaluate(()=>{const W=OrbitSchoolWorkflow,r=W.read(OrbitAuth.current().email).requests.find(r=>r.status==='pending');W.decide(r.id,true,true);});expect(await page.evaluate(()=>OrbitSchoolSchedule.read('timetable').records.find(p=>p.id==='nahda-period-0').startTime)).toBe('11:00');expect(await page.evaluate(()=>OrbitSchoolWorkflow.read(OrbitAuth.current().email).requests[0].status)).toBe('approved');
});

test('new year associations and newest-first records preserve historical enrollments; conflicts and rejected changes leave timetable intact',async({page})=>{
 test.setTimeout(60000);await seed(page);await activate(page);await page.goto(route+'?section=classes');
 await page.locator('[data-sections-advanced] > summary').click();
 await page.locator('[data-existing-classes] summary').click();
 await page.locator('[data-add-kind="classes"]').click();let d=page.locator('dialog[open]');await d.locator('[name="grade"]').fill('8');await d.locator('[name="section"]').fill('C');await d.locator('[name="academicYear"]').fill('2026-2027');await d.getByRole('button',{name:'Save',exact:true}).click();const created=await page.evaluate(()=>OrbitSchoolAcademics.read().classes.find(c=>c.section==='C'));
 await expect(page.locator('[data-record-id]').first()).toHaveAttribute('data-record-id',created.id);d=await action(page,'class-year');await d.locator('[name="classId"]').selectOption(created.id);await d.locator('[type="submit"]').click();await expect(page.locator('dialog[open]')).toHaveCount(0);expect(await page.evaluate(id=>OrbitSchoolEnrollments.read().classYearLinks.find(l=>l.classId===id).academicYearId,created.id)).toBe('nahda-year-current');
 await page.goto(route+'?section=timetable');await page.evaluate(()=>OrbitSchoolWorkflow.publishTimetable(true));
 const outcome=await page.evaluate(async()=>{
  const school=OrbitAuth.current(),before=localStorage.getItem(OrbitSchoolSchedule.storageKey('timetable'));
  const teacher=await OrbitRecruitment.changeInitialPassword('teacher1.alnahda@orbit.example','WelcomeDemo2026!','NewTeacherPassword2026!');OrbitAuth.startSession(teacher);
  const r=OrbitSchoolWorkflow.requestChange('nahda-period-0',{day:1,startTime:'09:00',endTime:'09:45',room:'R1',reason:'Conflict check'});OrbitAuth.startSession(school);
  let code;try{OrbitSchoolWorkflow.decide(r.id,true,true);}catch(e){code=e.message;}
  const preserved=before===localStorage.getItem(OrbitSchoolSchedule.storageKey('timetable'));OrbitSchoolWorkflow.decide(r.id,false,true);
  return {code,preserved,status:OrbitSchoolWorkflow.read(school.email).requests.find(q=>q.id===r.id).status};
 });expect(outcome).toEqual({code:'TEACHER_CONFLICT',preserved:true,status:'rejected'});
});

test('seeded academic workspace is bilingual, themed and responsive with no console errors or horizontal overflow',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await seed(page);await activate(page);
 for(const lang of ['en','ar']){
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();await expect(page.locator('[data-school-year]')).toHaveValue('nahda-year-current');
  for(const theme of ['light','dark']){
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:1000});
    for(const section of ['overview','years','classes','students','teachers','subjects','timetable','monitoring','events']){
     await page.goto(route+'?section='+section);await expect(page.locator('#sm-section-title')).toBeVisible();await expect(page.locator('[data-school-year]')).toHaveValue('nahda-year-current');await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     if(['overview','monitoring'].includes(section))await page.screenshot({path:path.join(os.tmpdir(),`orbit-school-final-${section}-${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});
    }
   }
  }
 }
 expect(errors).toEqual([]);
});

test('resetting an untouched example from its UI returns to the original school and permits a clean reseed',async({page})=>{
 await seed(page);await page.locator('[data-school-action="demo"]').click();let d=page.locator('dialog[open]');await d.locator('[name="demoAction"]').selectOption('reset');await d.locator('[name="confirmed"]').check();await d.locator('[type="submit"]').click();await expect(page.locator('#orbit-rail .orbit-identity')).toContainText('Orbit School');
 expect(await page.evaluate(()=>OrbitAuth.current().email)).toBe('school@orbit.com');expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolDemo.manifestKey))).toBeNull();expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolAcademics.prefix+encodeURIComponent(OrbitSchoolDemo.schoolId)))).toBeNull();
 await page.locator('[data-school-action="demo"]').click();d=page.locator('dialog[open]');await d.locator('[name="confirmed"]').check();await d.locator('[type="submit"]').click();await expect(page.locator('#orbit-rail .orbit-identity')).toContainText('Al Nahda');expect(await page.evaluate(()=>OrbitSchoolAcademics.read().students.length)).toBe(12);
});

test('legacy issuance service preserves chosen specialization and monitoring excludes private or unreliable evaluation data',async({page})=>{
 await seed(page);await activate(page);await page.goto(route+'?section=teachers');
 const id=await page.evaluate(async()=>{const record=OrbitSchoolAcademics.save('teachers',null,{name:'رنا مراد · Rana Murad',teacherCode:'RANA-NEW'},OrbitSchoolAcademics.read());await OrbitRecruitment.issueSchoolAccount({role:'teacher',academicId:record.id,email:'rana.school@orbit.example',subject:'math'},'RanaTemporary2026!');return record.id;});
 expect(await page.evaluate(()=>OrbitProfiles.read('rana.school@orbit.example','teacher').subject)).toBe('math');expect(await page.evaluate(id=>OrbitSchoolMonitoring.report().mappings.some(m=>m.academicId===id),id)).toBe(false);
 const metadata=await page.evaluate(()=>{const key='orbit.assignments.v1',db=JSON.parse(localStorage.getItem(key));db.submissions.find(r=>r.id==='nahda-submission-0').revision=0;localStorage.setItem(key,JSON.stringify(db));return OrbitSchoolMonitoring.activity('nahda-channel-0');});expect(metadata.some(r=>r.state==='needs-review')).toBe(true);for(const row of metadata)expect(Object.keys(row).sort()).toEqual(['assignment','reviewedAt','state','student','submittedAt']);expect(JSON.stringify(metadata)).not.toContain('مثال تدريبي');
});
