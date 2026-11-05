import {test,expect} from '@playwright/test';
import {setupPromotion} from './fixtures/promotion-preview.js';
const route='/school-management/school-management.html';
async function prepare(page,fast=false){await setupPromotion(page);await page.goto(route);if(fast)await page.evaluate(()=>{crypto.subtle.deriveBits=async()=>new Uint8Array(32).buffer;});}
async function load(page){return page.evaluate(()=>OrbitAcademicDemo.load(true));}
async function enter(page){await page.evaluate(()=>OrbitAcademicDemo.enter());await page.waitForURL('**/school-management/school-management.html?section=overview');await expect(page.locator('h1')).toBeVisible();}
const stores=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));

test('explicit demo action creates connected records and real counts across all management pages',async({page})=>{
 test.setTimeout(90000);await prepare(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const original=await stores(page);
 await page.locator('[data-load-academic-demo]').click();await expect(page.locator('dialog[open]')).toContainText('300');await page.locator('[data-demo-cancel]').click();expect(await stores(page)).toEqual(original);
 await page.locator('[data-load-academic-demo]').click();await page.locator('dialog[open] [name=confirmed]').check();await page.locator('dialog[open] [type=submit]').click();
 await expect(page.locator('#sm-academic-year')).toHaveValue('od1-year-2026',{timeout:60000});
 await expect(page.locator('.sm-totals [data-count]')).toHaveText(['300','15','12']);
 const integrity=await page.evaluate(()=>{
  const a=OrbitSchoolAcademics.read(),y=OrbitSchoolYearContext.read().selectedYear.id,s=OrbitSchoolSections.view(y),t=OrbitSchoolTeaching.read(y),e=OrbitSchoolAcademicReadModel.read(y),p=OrbitSchoolPeriods.read(y),m=OrbitAnnualMonitoring.report(y),D=OrbitAuth.get('orbit.channels.v2',{}),A=OrbitAuth.get('orbit.assignments.v1',{});
  const channels=D.channels.filter(c=>c.schoolId===OrbitAcademicDemo.schoolId),posts=D.posts.filter(p=>p.schoolId===OrbitAcademicDemo.schoolId);
  const counts=Object.fromEntries(s.sections.map(s=>[s.id,e.enrollments.filter(e=>e.sectionId===s.id).length]));
  return {students:a.students.length,teachers:a.teachers.length,sections:s.sections.length,enrollments:e.enrollments.length,verified:e.students.every(s=>s.verification==='verified'),sectionSizes:Object.values(counts),assignments:t.assignments.length,teachingIssues:t.assignments.filter(a=>a.issue),physics:t.assignments.filter(a=>a.teacherId==='od1-teacher-0').map(a=>a.sectionId),periods:p.sections.reduce((n,s)=>n+s.table.periods.length,0),periodSummary:p.summary,channels:channels.length,channelOwners:channels.every(c=>OrbitAuth.schoolChannelTeacher(c,c.teacher)),postTargets:posts.every(p=>p.sectionIds.every(id=>channels.find(c=>c.id===p.channel).sectionIds.includes(id))),memberships:channels.every(c=>e.enrollments.every(e=>OrbitAuth.schoolChannelStudent(c,e.accountId)===c.sectionIds.includes(e.sectionId))),submissions:A.submissions.filter(s=>s.schoolId===OrbitAcademicDemo.schoolId).length,monitorChannels:m.channels.length,unresolved:m.unresolved,submitted:m.rows.flatMap(r=>r.progress).filter(p=>p.submittedAt).length,reviewed:m.rows.flatMap(r=>r.progress).filter(p=>p.evaluation).length};
 });
 expect(integrity).toMatchObject({students:300,teachers:15,sections:12,enrollments:300,verified:true,sectionSizes:Array(12).fill(25),assignments:108,teachingIssues:[],physics:['od1-section-9-a','od1-section-9-b','od1-section-9-c','od1-section-9-d','od1-section-10-a'],periods:324,periodSummary:{complete:12,published:12,conflicts:0},channels:15,channelOwners:true,postTargets:true,memberships:true,submissions:2160,monitorChannels:15,unresolved:[],submitted:2160,reviewed:1620});
 await expect(page.locator('.ad-monitor-values dd')).toHaveText(['15','2,160','1,620']);
 await expect(page.locator('[data-overview-events] li')).toHaveCount(3);
 if([0,1,2,3,4].includes(new Date().getDay()))await expect(page.locator('[data-overview-schedule] li')).toHaveCount(6);
 for(const [section,selector,count]of [['students','[data-annual-enrollment]',25],['teachers','[data-teacher-open]',15],['classes','[data-record-id]',12]]){
  await page.goto(route+'?section='+section);await expect(page.locator(selector)).toHaveCount(count);
 }
 await page.goto(route+'?section=subjects');await expect(page.locator('[data-allocations-table]')).toHaveCount(0);expect(await page.evaluate(()=>OrbitSchoolTeaching.read(OrbitSchoolYearContext.read().selectedYear.id).assignments.length)).toBe(108);
 await page.goto(route+'?section=monitoring');await page.locator('[data-annual-monitoring] [data-tab="assignments"]').click();await expect(page.locator('[data-annual-monitoring]')).toContainText('Apply concepts');
 const after=await stores(page);
 for(const [k,v]of Object.entries(original)){
  if(k.startsWith('orbit.school.')&&!k.endsWith(encodeURIComponent('academic.demo@orbit.example')))expect(after[k],k).toBe(v);
 }
 const old=JSON.parse(original['orbit.recruitment.v1']),next=JSON.parse(after['orbit.recruitment.v1']);for(const k of ['jobs','applications','notifications'])expect(next[k]).toEqual(old[k]);
 expect(errors).toEqual([]);
});

test('seed is deterministic, idempotent, refuses conflicts and preserves demo edits',async({page})=>{
 test.setTimeout(60000);await prepare(page,true);
 expect(await page.evaluate(()=>JSON.stringify(OrbitAcademicDemo.build('2026-11-04'))===JSON.stringify(OrbitAcademicDemo.build('2026-11-04')))).toBe(true);
 const original=await stores(page);await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('orbit.recruitment.v1'));r.accounts.push({email:OrbitAcademicDemo.schoolId,role:'school',status:'active'});localStorage.setItem('orbit.recruitment.v1',JSON.stringify(r));});
 const conflict=await stores(page);expect(await page.evaluate(async()=>{try{await OrbitAcademicDemo.load(true);}catch(e){return e.message;}})).toBe('DEMO_CONFLICT');expect(await stores(page)).toEqual(conflict);
 await page.evaluate(v=>{localStorage.setItem('orbit.recruitment.v1',v);},original['orbit.recruitment.v1']);
 const result=await load(page);expect(result.counts.students).toBe(300);const seeded=await stores(page);expect((await load(page)).reused).toBe(true);expect(await stores(page)).toEqual(seeded);
 await page.evaluate(()=>{const k='orbit.school.academics.demo.v1:'+encodeURIComponent(OrbitAcademicDemo.schoolId),a=JSON.parse(localStorage.getItem(k));a.students[0].name='اسم معدل محفوظ';localStorage.setItem(k,JSON.stringify(a));});
 const edited=await stores(page);await load(page);expect(await stores(page)).toEqual(edited);
});

test('transaction rolls back every write boundary and explicit retry recovers an interrupted import',async({page})=>{
 test.setTimeout(90000);await prepare(page,true);const original=await stores(page);
 for(const failure of [1,4,9,12,15,17]){
  const result=await page.evaluate(async n=>{const set=Storage.prototype.setItem;let count=0;Storage.prototype.setItem=function(k,v){if(++count===n)throw Error('SIMULATED_QUOTA');return set.call(this,k,v);};try{await OrbitAcademicDemo.load(true);return 'unexpected success';}catch(e){return e.message;}finally{Storage.prototype.setItem=set;}},failure);
  expect(result).toBe('SIMULATED_QUOTA');expect(await stores(page)).toEqual(original);
 }
 await page.evaluate(async()=>{const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;let count=0;Storage.prototype.setItem=function(k,v){if(++count===8)throw Error('SIMULATED_QUOTA');return set.call(this,k,v);};Storage.prototype.removeItem=function(){throw Error('SIMULATED_CRASH');};try{await OrbitAcademicDemo.load(true);}catch{}finally{Storage.prototype.setItem=set;Storage.prototype.removeItem=remove;}});
 expect(await page.evaluate(()=>!!localStorage.getItem(OrbitAcademicDemo.journalKey))).toBe(true);
 await load(page);expect(await page.evaluate(()=>localStorage.getItem(OrbitAcademicDemo.journalKey))).toBeNull();
 await enter(page);expect(await page.evaluate(()=>OrbitSchoolAcademicReadModel.read('od1-year-2026').enrollments.length)).toBe(300);
});

test('role and confirmation gates prevent silent seeding; first-load motion respects reduced motion and does not repeat',async({page})=>{
 await prepare(page,true);const before=await stores(page);
 expect(await page.evaluate(async()=>{try{await OrbitAcademicDemo.load(false);}catch(e){return e.message;}})).toBe('CONFIRMATION_REQUIRED');expect(await stores(page)).toEqual(before);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('.sm-totals [data-count]')).toHaveText(['6','0','5']);
 expect(await page.locator('.sm-totals').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{window.dashboardAnimations=0;const animate=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.matches('.sm-totals > div,.sm-grid > section,.ad-monitor'))window.dashboardAnimations++;return animate.apply(this,args);};});
 await page.reload();await expect.poll(()=>page.evaluate(()=>window.dashboardAnimations)).toBe(6);
 await page.locator('#sm-academic-year').selectOption('target');expect(await page.evaluate(()=>window.dashboardAnimations)).toBe(6);
 await page.locator('.ad-monitor a').click();await page.goto(route);await expect(page.locator('header.bar .logo')).toHaveCount(0);await expect(page.locator('#orbit-rail .orbit-rail-brand')).toBeVisible();
 await page.locator('[data-action=theme]').click();await expect(page.locator('[data-action=theme]')).toHaveAttribute('aria-pressed','true');await page.reload();await expect(page.locator('body')).toHaveAttribute('data-theme','dark');
});

test('populated dashboard supports RTL/LTR, themes and 1440/768/390px without clipped controls',async({page})=>{
 test.setTimeout(120000);await prepare(page,true);await load(page);await enter(page);
 for(const lang of ['ar','en']){
  if(await page.locator('html').getAttribute('lang')!==lang)await Promise.all([page.waitForEvent('load'),page.locator('#orbit-language-button').click()]);
  await page.waitForFunction(()=>!!window.OrbitThemePreference);
  for(const theme of ['light','dark']){
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:1000});
    await expect(page.locator('.sm-totals [data-count]')).toHaveText(lang==='ar'?['٣٠٠','١٥','١٢']:['300','15','12']);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const layout=await page.evaluate(()=>{const a=document.querySelector('[data-action=theme]').getBoundingClientRect(),l=document.getElementById('orbit-language-button').getBoundingClientRect();return {overlap:a.left<l.right&&a.right>l.left&&a.top<l.bottom&&a.bottom>l.top,width:a.width,height:a.height};});
    expect(layout).toEqual({overlap:false,width:40,height:40});
    await page.screenshot({path:`${process.env.TEMP}/orbit-populated-${lang}-${theme}-${width}.png`,fullPage:true,animations:'disabled'});
   }
  }
 }
});

test('batched monitoring access matches single checks and fails closed on changed snapshots',async({page})=>{
 test.setTimeout(60000);await prepare(page,true);await load(page);await enter(page);
 const result=await page.evaluate(()=>{
  const channels=OrbitAuth.get('orbit.channels.v2',{}).channels.filter(c=>c.schoolId===OrbitAcademicDemo.schoolId),emails=['student001.academic@orbit.example','student026.academic@orbit.example','student126.academic@orbit.example','unknown@orbit.example'];
  const same=()=>channels.every(c=>{const batch=OrbitAuth.schoolStudentAccessBatch(c,emails);return emails.every(email=>batch.get(email)===OrbitAuth.schoolStudentAccess(c,email));});
  const active=same();localStorage.setItem('orbit.admin.v1',JSON.stringify({accountStates:{[emails[0]]:{status:'suspended'}}}));const suspended=same(),blocked=channels.every(c=>OrbitAuth.schoolStudentAccessBatch(c,emails).get(emails[0])===false);localStorage.removeItem('orbit.admin.v1');
  const get=Storage.prototype.getItem;let reads=0;Storage.prototype.getItem=function(k){const value=get.call(this,k);if(k==='orbit.recruitment.v1'&&++reads>1)return JSON.stringify({accounts:[]});return value;};let changed;try{changed=OrbitAuth.schoolStudentAccessBatch(channels[0],emails);}finally{Storage.prototype.getItem=get;}
  return {active,suspended,blocked,changed:[...changed.values()]};
 });
 expect(result).toEqual({active:true,suspended:true,blocked:true,changed:[false,false,false,false]});
});
