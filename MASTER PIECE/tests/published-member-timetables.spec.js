import {test,expect} from '@playwright/test';
import {setupPeriods} from './fixtures/period-timetable.js';
const school='school@preview.test',teacherRoute='/teacher-dashboard/teacher-dashboard.html',studentRoute='/student-dashboard/student-dashboard.html';
const timetable=page=>page.locator('[data-numbered-school-timetable]');
async function language(page,lang){if(await page.locator('html').getAttribute('lang')!==lang)await Promise.all([page.waitForEvent('load'),page.locator('#orbit-language-button').click()]);await expect(page.locator('html')).toHaveAttribute('lang',lang);}
async function as(page,role,email,route){await page.evaluate(([role,email])=>localStorage.setItem('orbitUser',JSON.stringify({role,email,name:email})),[role,email]);await page.goto(route);}
test.beforeEach(async({page})=>setupPeriods(page));
async function publishTeachers(page){return page.evaluate(()=>{
 fill();fill(sec.b);pub([sec.a,sec.b]);
 const S=OrbitSchoolSections,T=OrbitSchoolTeaching,g=S.save('',{academicYearId:'source',gradeName:'11',name:'A'},S.read().context);
 const a=T.save('',{academicYearId:'source',gradeId:g.gradeId,sectionId:g.id,subjectId:'math',teacherId:'t1'},T.read('source').context,true);
 B.setRequirements('source',g.gradeId,[{subjectId:'math',count:1}],bc(),true);B.edit('source',g.id,{assignmentId:a.id,day:3,period:6},bc());pub([g.id]);
 fill(sec.future,'target');pub([sec.future],'target');
 const original=B.read('source').sections.find(q=>q.id===sec.a).table,p=original.periods.find(p=>p.teacherId==='t1');
 B.edit('source',sec.a,{...p,day:4,period:7},bc());
 return {id:p.id,oldDay:p.day,oldPeriod:p.period,newSection:g.id,sectionA:sec.a};
});}

test('teacher gets one unified active-year grid across grades; drafts stay private and new publication refreshes without writes',async({page})=>{
 const p=await publishTeachers(page);await as(page,'teacher','teacher1@period.test',teacherRoute);
 const root=timetable(page);await expect(root.locator('table')).toHaveCount(1);await expect(root.locator('tbody tr')).toHaveCount(7);
 await expect(page.locator('[data-school-timetable-nav]')).toHaveCount(1);
 const model=await page.evaluate(()=>OrbitSchoolPeriods.memberTimetables());expect(model).toHaveLength(1);expect(model[0].tables).toHaveLength(3);expect(model[0].tables.every(t=>t.academicYearId==='source'&&t.periods.every(p=>p.teacherId==='t1'))).toBe(true);
 await expect(root.locator(`[data-member-slot="${p.oldDay}/${p.oldPeriod}"] [data-member-period="${p.id}"]`)).toHaveCount(1);
 await expect(root.locator('[data-member-slot="4/7"] [data-member-period]')).toHaveCount(0);
 await expect(root).toContainText('Grade 11');await expect(root).toContainText('Section D');
 await expect(root.locator('[draggable],input,textarea,[data-numbered-request]')).toHaveCount(0);
 const before=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')).map(k=>[k,localStorage.getItem(k)])));
 await root.locator('[data-timetable-refresh]').click();
 expect(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')).map(k=>[k,localStorage.getItem(k)])))).toEqual(before);
 await page.evaluate(()=>{localStorage.setItem('orbitUser',JSON.stringify({role:'school',email:'school@preview.test'}));const B=OrbitSchoolPeriods,v=B.read('source');B.publish('source',[v.sections.find(q=>q.name==='C').id],v.context,true);localStorage.setItem('orbitUser',JSON.stringify({role:'teacher',email:'teacher1@period.test'}));});
 await root.locator('[data-timetable-refresh]').click();await expect(root.locator(`[data-member-slot="4/7"] [data-member-period="${p.id}"]`)).toHaveCount(1);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(OrbitSchoolPeriods.storageKey('school@preview.test'))).tables.find(t=>t.sectionId===OrbitSchoolPeriods.memberTimetables()[0].tables.find(t=>t.sectionName==='C').sectionId).versions.length)).toBe(2);
});

async function studentSetup(page){await page.evaluate(()=>{
 fill(sec.future,'target');pub([sec.future],'target');
 const S=OrbitSchoolSections,T=OrbitSchoolTeaching,q=S.save('',{academicYearId:'target',gradeId:sec.grade,name:'PRIVATE'},S.read().context);
 for(const [subjectId,teacherId]of [['math','t2'],['science','t1']])T.save('',{academicYearId:'target',gradeId:sec.grade,sectionId:q.id,subjectId,teacherId},T.read('target').context,true);
 fill(q.id,'target');pub([q.id],'target');
 const E=OrbitSchoolEnrollments;E.enrollSection({academicStudentId:'r1',academicYearId:'target',gradeId:sec.grade,sectionId:sec.future},E.read().context,crypto.randomUUID(),true);OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true);
});}
test('student sees only confirmed current section; withdrawn and ambiguous identities never open another section',async({page})=>{
 await studentSetup(page);await as(page,'student','student1@preview.test',studentRoute);
 const root=timetable(page);await expect(root.locator('table')).toHaveCount(1);await expect(root.locator('[data-member-period]')).toHaveCount(3);await expect(root).toContainText('Teacher 1');await expect(root).not.toContainText('PRIVATE');
 await page.waitForFunction(()=>typeof OrbitThemePreference!=='undefined');
 for(const lang of ['en','ar']){
  await language(page,lang);
  for(const theme of ['light','dark']){
   await page.waitForFunction(()=>typeof OrbitThemePreference!=='undefined');
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await root.scrollIntoViewIfNeeded();
    expect(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(root.locator('tbody tr')).toHaveCount(7);
    await page.screenshot({path:'C:/Users/user/AppData/Local/Temp/orbit-student-timetable-'+lang+'-'+theme+'-'+width+'.png'});
   }
  }
 }
 await language(page,'en');
 const r=await page.evaluate(()=>{const B=OrbitSchoolPeriods,schools=B.memberTimetables(),k='orbit.school.enrollments.demo.v1:'+encodeURIComponent('school@preview.test'),db=JSON.parse(localStorage.getItem(k)),e=db.enrollments.find(e=>e.academicYearId==='target'),privateSection=JSON.parse(localStorage.getItem('orbit.school.section-structures.demo.v1:'+encodeURIComponent('school@preview.test'))).sections.find(s=>s.name==='PRIVATE');db.enrollments.push({...e,id:'withdrawn-other-section',sectionId:privateSection.id,status:'withdrawn'});localStorage.setItem(k,JSON.stringify(db));const withWithdrawn=B.memberRead('school@preview.test').tables;db.enrollments.at(-1).status='enrolled';localStorage.setItem(k,JSON.stringify(db));return {schools,withWithdrawn,ambiguous:B.memberTimetables()};});
 expect(r.schools[0].tables).toHaveLength(1);expect(r.withWithdrawn).toHaveLength(1);expect(r.ambiguous[0]).toMatchObject({status:'restricted',tables:[]});
 await root.locator('[data-timetable-refresh]').click();await expect(root.locator('table')).toHaveCount(0);await expect(root).toContainText('needs verification');
 await as(page,'student','student2@preview.test',studentRoute);await expect(timetable(page).locator('table')).toHaveCount(0);await expect(timetable(page)).toContainText('needs verification');
});

test('linked unpublished and published-empty schedules are distinct, and personal accounts get no school navigation',async({page})=>{
 await as(page,'teacher','teacher1@period.test',teacherRoute);await expect(timetable(page)).toContainText('not published yet');await expect(page.locator('[data-school-timetable-nav]')).toHaveCount(1);
 await page.evaluate(()=>{localStorage.setItem('orbitUser',JSON.stringify({role:'school',email:'school@preview.test'}));const B=OrbitSchoolPeriods,v=B.read('source'),q=v.sections.find(q=>q.name==='C');B.setRequirements('source',q.gradeId,[{subjectId:'math',count:0},{subjectId:'science',count:0}],B.read('source').context,true);B.start('source',q.id,B.read('source').context);B.publish('source',[q.id],B.read('source').context,true);localStorage.setItem('orbitUser',JSON.stringify({role:'teacher',email:'teacher1@period.test'}));});
 await timetable(page).locator('[data-timetable-refresh]').click();await expect(timetable(page).locator('td')).toHaveCount(35);await expect(timetable(page)).toContainText('No lessons are assigned');
 await page.evaluate(()=>{const k='orbit.recruitment.v1',v=JSON.parse(localStorage.getItem(k));v.accounts.push({email:'personal@period.test',role:'teacher',status:'active',name:'Personal teacher'});localStorage.setItem(k,JSON.stringify(v));});
 await as(page,'teacher','personal@period.test',teacherRoute);await expect(page.locator('[data-school-timetable-nav]')).toHaveCount(0);await expect(timetable(page)).toHaveCount(0);
});

test('member grid supports keyboard navigation, responsive days, both languages and themes without schedule actions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await publishTeachers(page);await as(page,'teacher','teacher1@period.test',teacherRoute);
 for(const lang of ['en','ar']){
  await language(page,lang);
  for(const theme of ['light','dark']){
   await page.waitForFunction(()=>typeof OrbitThemePreference!=='undefined');
   await page.waitForFunction(()=>typeof OrbitThemePreference!=='undefined');
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});const root=timetable(page);
    if(width===1440){await page.locator('[data-school-timetable-nav]').click();await expect(root.locator('#school-timetable')).toBeFocused();}else await root.scrollIntoViewIfNeeded();
    await expect(root.locator('tbody tr')).toHaveCount(7);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===390){await root.locator('[data-member-day-select]').selectOption('4');await expect(root.locator('thead [data-member-grid-day="4"]')).toBeVisible();await expect(root.locator('thead [data-member-grid-day="0"]')).toBeHidden();}
    expect(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:`C:/Users/user/AppData/Local/Temp/orbit-member-timetable-${lang}-${theme}-${width}.png`});
   }
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await timetable(page).locator('[data-member-day-select]').selectOption('1');await expect(timetable(page).locator('thead [data-member-grid-day="1"]')).toBeVisible();expect(errors).toEqual([]);
});

test('school and teacher identity boundaries fail closed without changing stored snapshots',async({page})=>{
 await publishTeachers(page);
 await page.evaluate(()=>{
  const from='school@preview.test',to='foreign@school.test';
  for(const k of Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')&&k.endsWith(encodeURIComponent(from)))){
   const data=JSON.stringify(JSON.parse(localStorage.getItem(k))).replaceAll(from,to).replaceAll('teacher1@period.test','foreignteacher@period.test');localStorage.setItem(k.slice(0,-encodeURIComponent(from).length)+encodeURIComponent(to),data);
  }
 });
 await as(page,'teacher','teacher1@period.test',teacherRoute+'?schoolId=foreign%40school.test#school-timetable');
 expect(await page.evaluate(()=>OrbitSchoolPeriods.memberTimetables().map(s=>s.schoolId))).toEqual(['school@preview.test']);
 await expect(timetable(page)).not.toContainText('foreign@school.test');
 const result=await page.evaluate(()=>{
  const k='orbit.school.education.links.v1:'+encodeURIComponent('school@preview.test'),v=JSON.parse(localStorage.getItem(k));v.mappings.push({...v.mappings[0],id:'ambiguous',academicId:'t2'});localStorage.setItem(k,JSON.stringify(v));
  const scheduleKey=OrbitSchoolPeriods.storageKey('school@preview.test'),before=localStorage.getItem(scheduleKey),read=OrbitSchoolPeriods.memberTimetables();return {read,unchanged:before===localStorage.getItem(scheduleKey)};
 });expect(result.read[0]).toMatchObject({status:'restricted',tables:[]});expect(result.unchanged).toBe(true);
 await timetable(page).locator('[data-timetable-refresh]').click();await expect(timetable(page).locator('table')).toHaveCount(0);
});
