import {test,expect} from '@playwright/test';
import path from 'node:path';import os from 'node:os';
import {setupPromotion} from './fixtures/promotion-preview.js';
const route='/school-management/school-management.html?section=students';
test.beforeEach(async({page})=>{await setupPromotion(page);for(const f of ['profiles.js','recruitment-service.js','school-year-context.js','school-section-service.js'])await page.addScriptTag({path:path.resolve('shared',f)});await page.evaluate(()=>{
 const B=OrbitSchoolSections;window.sections={};for(const y of ['source','target']){const old=B.read().grades[0];sections[y]=B.save('',{academicYearId:y,gradeId:old?.id||'',gradeName:old?undefined:'10',name:'C'},B.read().context);}sections.other=B.save('',{academicYearId:'source',gradeId:sections.source.gradeId,name:'D'},B.read().context);
 window.B2=OrbitSchoolEnrollments;window.bctx=()=>B2.read().context;window.bop=()=>crypto.randomUUID();window.attempt2=f=>{try{return f();}catch(e){return e.message;}};
 window.addAnnual=(student='r1',year='target')=>B2.enrollSection({academicStudentId:student,academicYearId:year,gradeId:sections[year].gradeId,sectionId:sections[year].id},bctx(),bop(),true);
});});
const stable=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().filter(k=>!k.startsWith('orbit.school.enrollments.demo.v1:')&&!k.startsWith('orbit.school.enrollment-identities.demo.v1:')&&!k.startsWith('orbit.workspace.academic-year.v1:')).map(k=>[k,localStorage.getItem(k)])));

test('Active/Upcoming enrollment reuses one identity, isolates years, rejects invalid placement and duplicate enrollment, preserves legacy data',async({page})=>{
 const before=await stable(page);const r=await page.evaluate(()=>{
  const sourceBefore=B2.read().enrollments.find(e=>e.academicStudentId==='r1'),next=addAnnual();
  const dup=attempt2(()=>addAnnual()),wrongYear=attempt2(()=>B2.enrollSection({academicStudentId:'r2',academicYearId:'target',gradeId:sections.source.gradeId,sectionId:sections.source.id},bctx(),bop(),true)),wrongGrade=attempt2(()=>B2.enrollSection({academicStudentId:'r2',academicYearId:'target',gradeId:'wrong',sectionId:sections.target.id},bctx(),bop(),true));
  const m=B2.requestMapping('r6',bctx(),bop());const accounts=OrbitRecruitment.data();accounts.accounts.push({email:'six@test.test',role:'student',status:'active'});localStorage.setItem('orbit.recruitment.v1',JSON.stringify(accounts));B2.confirmMapping(m.id,'six@test.test',bctx(),bop(),true);const active=addAnnual('r6','source');
  const old=B2.read().enrollments.find(e=>e.id===sourceBefore.id);return {next,sourceBefore,old,dup,wrongYear,wrongGrade,active,read:OrbitSchoolAcademicReadModel.read('target')};
 });expect(r.next).toMatchObject({accountId:r.sourceBefore.accountId,academicStudentId:'r1',structure:'section',status:'enrolled',gradeId:expect.any(String),sectionId:expect.any(String)});expect(r.old).toEqual(r.sourceBefore);expect(r.dup).toBe('DUPLICATE_ENROLLMENT');expect(r.wrongYear).toBe('INVALID_SECTION');expect(r.wrongGrade).toBe('INVALID_SECTION');expect(r.active.academicYearId).toBe('source');expect(r.read.enrollments[0].verification).toBe('verified');
 const after=await stable(page);delete before['orbit.recruitment.v1'];delete after['orbit.recruitment.v1'];expect(after).toEqual(before);
});

test('reviewed placement changes preserve immutable history and stable enrollment IDs; Archived mutations fail',async({page})=>{
 const r=await page.evaluate(()=>{const first=addAnnual(),before=structuredClone(B2.read()),newSection=OrbitSchoolSections.save('',{academicYearId:'target',gradeId:first.gradeId,name:'D'},OrbitSchoolSections.read().context),values={academicYearId:'target',gradeId:first.gradeId,sectionId:newSection.id};const reason=attempt2(()=>B2.changePlacement(first.id,values,'',bctx(),bop(),true)),confirmation=attempt2(()=>B2.changePlacement(first.id,values,'Reviewed change',bctx(),bop()));const changed=B2.changePlacement(first.id,values,'Reviewed change',bctx(),bop(),true),after=B2.read();OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true);const archived=[attempt2(()=>B2.enrollSection({academicStudentId:'r2',academicYearId:'source',gradeId:sections.source.gradeId,sectionId:sections.source.id},bctx(),bop(),true)),attempt2(()=>B2.changePlacement(before.enrollments.find(e=>e.academicYearId==='source').id,{academicYearId:'source'},'Reviewed',bctx(),bop(),true))];return {first,before,changed,after,reason,confirmation,archived};});
 expect(r.changed.id).toBe(r.first.id);expect(r.changed.createdAt).toBe(r.first.createdAt);expect(r.changed.revision).toBe(2);expect(r.after.placements.slice(0,r.before.placements.length)).toEqual(r.before.placements);expect(r.after.transfers[0]).toMatchObject({reason:'Reviewed change',sourcePlacementId:r.first.currentPlacementId,destinationPlacementId:r.changed.currentPlacementId});expect(r.reason).toBe('REASON_REQUIRED');expect(r.confirmation).toBe('CONFIRMATION_REQUIRED');expect(r.archived[0]).toBe('ARCHIVED_YEAR');
});

test('school isolation, stale section edits, role guards and storage failure preserve records',async({page})=>{
 const r=await page.evaluate(()=>{const expected=bctx();OrbitSchoolSections.save(sections.target.id,{academicYearId:'target',gradeId:sections.target.gradeId,name:'Renamed'},OrbitSchoolSections.read().context);const stale=attempt2(()=>B2.enrollSection({academicStudentId:'r1',academicYearId:'target',gradeId:sections.target.gradeId,sectionId:sections.target.id},expected,bop(),true));const before=localStorage.getItem(B2.storageKey()),set=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('quota');};const quota=attempt2(()=>addAnnual());Storage.prototype.setItem=set;const unchanged=before===localStorage.getItem(B2.storageKey()),u=localStorage.getItem('orbitUser');localStorage.setItem('orbitUser',JSON.stringify({role:'school',email:'another@test.test'}));const foreign=attempt2(()=>B2.enrollSection({academicStudentId:'r1',academicYearId:'target',gradeId:sections.target.gradeId,sectionId:sections.target.id},expected,bop(),true));localStorage.setItem('orbitUser',JSON.stringify({role:'student',email:'student1@preview.test'}));const denied=attempt2(()=>addAnnual());localStorage.setItem('orbitUser',u);return {stale,quota,unchanged,foreign,denied};});expect(r).toMatchObject({stale:'STALE_DATA',quota:'STORAGE_FAILED',unchanged:true,denied:'ROLE_DENIED'});expect(typeof r.foreign).toBe('string');
});

test('school-issued credentials persist only salted hashes, cannot duplicate verified identities, require first-login change and never grant Upcoming access',async({page})=>{
 const result=await page.evaluate(async()=>{
  const account=await OrbitRecruitment.issueSchoolAccount({role:'student',academicId:'r6',email:'six.school@test.test'},'Temporary2026!');let duplicate;try{await OrbitRecruitment.issueSchoolAccount({role:'student',academicId:'r4',email:'SIX.SCHOOL@test.test'},'Temporary2026!');}catch(e){duplicate=e.message;}
  const stored=localStorage.getItem('orbit.recruitment.v1'),entry=OrbitRecruitment.data().accounts.find(a=>a.email===account.email),pending=attempt2(()=>OrbitAuth.startSession(account));
  const m=B2.requestMapping('r6',bctx(),bop());B2.confirmMapping(m.id,account.email,bctx(),bop(),true);addAnnual('r6','target');
  const c={id:'future-channel',schoolId:'school@preview.test',sectionId:sections.target.id,academicYearId:'target'};localStorage.setItem('orbit.memberships.v3',JSON.stringify({[account.email]:[c.id]}));const futureBefore=OrbitAuth.schoolStudentAccess(c,account.email);
  await OrbitRecruitment.changeInitialPassword(account.email,'Temporary2026!','NewStudentPassword2026!');const old=await OrbitRecruitment.authenticate(account.email,'Temporary2026!'),fresh=await OrbitRecruitment.authenticate(account.email,'NewStudentPassword2026!');const futureAfter=OrbitAuth.schoolStudentAccess(c,account.email);
  let duplicateIdentity;try{await OrbitRecruitment.issueSchoolAccount({role:'student',academicId:'r6',email:'another.six@test.test'},'Temporary2026!');}catch(e){duplicateIdentity=e.message;}
  addAnnual('r6','source');const active={...c,id:'active-channel',sectionId:sections.source.id,academicYearId:'source'};localStorage.setItem('orbit.memberships.v3',JSON.stringify({[account.email]:[c.id,active.id]}));const activeAccess=OrbitAuth.schoolStudentAccess(active,account.email);OrbitAuth.startSession(fresh);return {duplicate,duplicateIdentity,pending,stored,entry,futureBefore,futureAfter,old,fresh,activeAccess,session:OrbitAuth.current()};
 });expect(result.duplicate).toBe('EMAIL_EXISTS');expect(result.duplicateIdentity).toBe('ACCOUNT_EXISTS');expect(result.pending).toBe('PASSWORD_CHANGE_REQUIRED');expect(result.stored).not.toContain('Temporary2026!');expect(result.entry).toMatchObject({mustChangePassword:true,salt:expect.any(String),digest:expect.any(String)});expect(result.futureBefore).toBe(false);expect(result.futureAfter).toBe(false);expect(result.old).toBeNull();expect(result.fresh.email).toBe('six.school@test.test');expect(result.activeAccess).toBe(true);expect(result.session.email).toBe('six.school@test.test');
});

test('confirmed identity correction requires reason and confirmation, keeps audit/history and immediately revokes old academic access',async({page})=>{
 const r=await page.evaluate(()=>{
  const schoolId='school@preview.test',channel={id:'source-channel',schoolId,private:true};localStorage.setItem('orbit.memberships.v3',JSON.stringify({'student1@preview.test':[channel.id],'correct@test.test':[channel.id]}));const key='orbit.school.education.links.v1:'+encodeURIComponent(schoolId);localStorage.setItem(key,JSON.stringify({links:[{schoolId,channelId:channel.id,classId:'s7'}]}));const accounts=OrbitRecruitment.data();accounts.accounts.push({email:'correct@test.test',role:'student',status:'active'});localStorage.setItem('orbit.recruitment.v1',JSON.stringify(accounts));
  const before=localStorage.getItem(B2.storageKey()),m=B2.readMappings().mappings.find(m=>m.academicStudentId==='r1'),accessBefore=OrbitAuth.schoolStudentAccess(channel,'student1@preview.test');const reason=attempt2(()=>B2.correctMapping(m.id,'correct@test.test','',bctx(),bop(),true)),confirmed=attempt2(()=>B2.correctMapping(m.id,'correct@test.test','Reviewed identity',bctx(),bop()));B2.correctMapping(m.id,'correct@test.test','Reviewed identity',bctx(),bop(),true);
  return {accessBefore,reason,confirmed,old:OrbitAuth.schoolStudentAccess(channel,'student1@preview.test'),next:OrbitAuth.schoolStudentAccess(channel,'correct@test.test'),history:B2.readMappings().history.filter(h=>h.mappingId===m.id),unchanged:before===localStorage.getItem(B2.storageKey()),model:OrbitSchoolAcademicReadModel.read('source').students.find(s=>s.academicStudentId==='r1')};
 });expect(r).toMatchObject({accessBefore:true,reason:'REASON_REQUIRED',confirmed:'CONFIRMATION_REQUIRED',old:false,next:true,unchanged:true});expect(r.history.map(h=>h.type)).toEqual(['requested','confirmed','corrected']);expect(r.history[2]).toMatchObject({reason:'Reviewed identity',fromAccountId:'student1@preview.test',toAccountId:'correct@test.test'});expect(r.model.identity.accountId).toBe('correct@test.test');
});

async function modal(page,action){if(['account','identity','enroll'].includes(action))await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);await page.locator(`[data-school-action="${action}"]`).click();return page.locator('.sm-student-dialog[open]');}
async function confirm(d){await d.locator('[name="confirmed"]').check();await d.locator('[type="submit"]').click();}

test('Students UI integrates enrollment, reviewed placement history, newest ordering, year navigation and reload',async({page})=>{
 await page.goto(route);await page.locator('[data-school-year]').selectOption('target');const ids=await page.evaluate(()=>OrbitSchoolSections.read());let d=await modal(page,'enroll');await d.locator('[name="studentId"]').selectOption('r1');await d.locator('[name="gradeId"]').selectOption(ids.grades[0].id);await d.locator('[name="sectionId"]').selectOption(ids.sections.find(s=>s.academicYearId==='target').id);await confirm(d);await expect(d).toHaveCount(0);await page.reload();await expect(page.locator('[data-school-year]')).toHaveValue('target');await expect(page.locator('[data-annual-enrollment]')).toHaveCount(1);
 d=await modal(page,'enroll');await d.locator('[name="studentId"]').selectOption('r2');await d.locator('[name="gradeId"]').selectOption(ids.grades[0].id);await d.locator('[name="sectionId"]').selectOption(ids.sections.find(s=>s.academicYearId==='target').id);await confirm(d);await expect(page.locator('[data-annual-enrollment] th')).toHaveText([/Student 2/,/Student 1/]);
 const extra=await page.evaluate(()=>OrbitSchoolSections.save('',{academicYearId:'target',gradeId:OrbitSchoolSections.read().grades[0].id,name:'E'},OrbitSchoolSections.read().context));await page.reload();await page.locator('[data-student-details]').first().click();await page.locator('[data-placement-change]').first().click();d=page.locator('.sm-student-dialog[open]');await d.locator('[name="sectionId"]').selectOption(extra.id);await d.locator('[name="reason"]').fill('Reviewed section change');await confirm(d);await expect(page.locator('[data-enrollment-history]')).toHaveCount(0);await page.locator('[data-detail-close]').click();await page.locator('[data-student-tab=annual]').click();await expect(page.locator('.sm-annual-history').filter({hasText:'Reviewed section change'})).toHaveCount(1);await page.locator('[data-student-tab=management]').click();await page.locator('[data-school-year]').selectOption('source');await expect(page.locator('[data-annual-enrollment]')).toHaveCount(4);
});

test('account UI issues a one-time credential receipt, shows identity/first-login status and reuses reviewed accounts',async({page})=>{
 await page.goto(route);let d=await modal(page,'account');await d.locator('[name="academicId"]').selectOption('r6');await d.locator('[name="email"]').fill('six.ui@test.test');await confirm(d);const temporary=await page.locator('[data-issued-credentials] code').textContent();expect(temporary).toHaveLength(12);expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain(temporary);await page.locator('[data-credential-dismiss]').click();await page.reload();await expect(page.locator('[data-issued-credentials]')).toHaveCount(0);
 d=await modal(page,'identity');await d.locator('[name="studentId"]').selectOption('r6');await d.locator('[name="accountId"]').selectOption('six.ui@test.test');await confirm(d);await expect(page.locator('.sm-account-status-list')).toContainText('Pending first login');await page.evaluate(p=>OrbitRecruitment.changeInitialPassword('six.ui@test.test',p,'PersonalPassword2026!'),temporary);await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);await page.locator('[data-students-refresh]').click();await expect(page.locator('.sm-account-status-list')).toContainText('Active account');
});

test('login UI blocks Student Workspace until the temporary password is changed',async({page})=>{
 await page.evaluate(()=>OrbitRecruitment.issueSchoolAccount({role:'student',academicId:'r6',email:'six.login@test.test'},'Temporary2026!'));await page.evaluate(()=>localStorage.removeItem('orbitUser'));await page.goto('/login/login.html');await page.locator('#email').fill('six.login@test.test');await page.locator('#password').fill('Temporary2026!');await page.locator('#loginButton').click();const d=page.locator('dialog[open]');await expect(d).toContainText('Choose your own password');await expect(page).toHaveURL(/login/);await d.locator('[name="password"]').fill('PersonalPassword2026!');await d.locator('[name="confirm"]').fill('PersonalPassword2026!');await d.locator('[type="submit"]').click();await expect(page).toHaveURL(/student-dashboard/);expect(await page.evaluate(()=>OrbitAuth.current().email)).toBe('six.login@test.test');
});

test('Archived screens and stale open forms block enrollment, placement and identity changes',async({page})=>{
 await page.goto(route);let d=await modal(page,'enroll');await d.locator('[name="studentId"]').selectOption('r1');const grade=await page.evaluate(()=>OrbitSchoolSections.read().grades[0].id);await d.locator('[name="gradeId"]').selectOption(grade);await d.locator('[name="sectionId"]').selectOption(await page.evaluate(()=>OrbitSchoolSections.read().sections.find(s=>s.academicYearId==='source').id));await page.evaluate(()=>OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true));await confirm(d);await expect(d.getByRole('alert')).toContainText(/read-only|changed/);await d.locator('[data-cancel]').click();await page.reload();await page.locator('[data-school-year]').selectOption('source');await expect(page.locator('[data-school-action="enroll"]')).toBeDisabled();await expect(page.locator('[data-school-action="account"]')).toBeDisabled();await expect(page.locator('[data-school-action="identity"]')).toBeDisabled();
});

test('English/Arabic, LTR/RTL, themes and desktop/tablet/mobile have no overflow or console errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.evaluate(()=>addAnnual());await page.goto(route);await page.locator('[data-school-year]').selectOption('target');
 for(const lang of ['en','ar']){if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');await page.waitForFunction(()=>!!window.OrbitThemePreference&&!!document.querySelector('[data-student-enrollment-ui]'));for(const theme of ['light','dark']){await page.evaluate(t=>OrbitThemePreference.save(t),theme);for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.keyboard.press('Tab');await page.locator('[data-school-action="add"]').focus();expect(await page.locator('[data-school-action="add"]').evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await page.screenshot({path:path.join(os.tmpdir(),`orbit-b2-${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});const d=await modal(page,'add');await page.screenshot({path:path.join(os.tmpdir(),`orbit-add-student-${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});expect(await d.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);await d.locator('[data-cancel]').click();}}}expect(errors).toEqual([]);
});

test('live channel, assignment and class-meeting reads revoke immediately on identity correction, while personal memberships stay intact',async({page})=>{
 await page.evaluate(()=>{const schoolId='school@preview.test',channel={id:'managed-school',schoolId,teacher:'teacher@orbit.com',private:true,en:'Reviewed school channel',ar:'قناة مدرسية'};localStorage.setItem('orbit.channels.v2',JSON.stringify({channels:[channel,{id:'personal-b2',teacher:'teacher@orbit.com',private:true,en:'Personal'}],posts:[{id:'b2-assignment',channel:channel.id,type:'assignment',title:'Private assignment',sample:false}]}));localStorage.setItem('orbit.memberships.v3',JSON.stringify({'student1@preview.test':[channel.id,'personal-b2']}));localStorage.setItem('orbit.school.education.links.v1:'+encodeURIComponent(schoolId),JSON.stringify({links:[{schoolId,channelId:channel.id,classId:'s7'}]}));localStorage.setItem('orbit.meetings.v1',JSON.stringify({meetings:[{id:'b2-meeting',kind:'class',teacherId:'teacher@orbit.com',channelId:channel.id,recipientIds:['student1@preview.test'],startAt:'2030-09-01T10:00:00Z',status:'scheduled'}]}));localStorage.setItem('orbitUser',JSON.stringify({role:'student',email:'student1@preview.test',name:'Student 1'}));});
 await page.goto('/channel/channel.html?id=managed-school');await expect(page.locator('h1')).toBeVisible();const before=await page.evaluate(()=>({admitted:OrbitChannels.admitted(OrbitChannels.find('managed-school')),assignments:OrbitAssignments.visible().map(p=>p.id),meetings:OrbitMeetings.visible().map(m=>m.id)}));expect(before).toEqual({admitted:true,assignments:['b2-assignment'],meetings:['b2-meeting']});
 // Same-origin school action in this demo; API reads must recheck even before a UI refresh.
 for(const f of ['school-academic-service.js','school-year-service.js','school-enrollment-service.js'])await page.addScriptTag({path:path.resolve('shared',f)});
 const r=await page.evaluate(()=>{const student=localStorage.getItem('orbitUser'),member=localStorage.getItem('orbit.memberships.v3');localStorage.setItem('orbitUser',JSON.stringify({email:'school@preview.test',role:'school'}));const d=OrbitRecruitment.data();d.accounts.push({email:'correct.other@test.test',role:'student',status:'active'});localStorage.setItem('orbit.recruitment.v1',JSON.stringify(d));const E=OrbitSchoolEnrollments,m=E.readMappings().mappings.find(m=>m.academicStudentId==='r1');E.correctMapping(m.id,'correct.other@test.test','Verified identity correction',E.read().context,crypto.randomUUID(),true);localStorage.setItem('orbitUser',student);return {admitted:OrbitChannels.admitted(OrbitChannels.find('managed-school')),read:OrbitChannels.canRead(OrbitChannels.find('managed-school')),assignments:OrbitAssignments.visible(),meetings:OrbitMeetings.visible(),personal:OrbitChannels.admitted(OrbitChannels.find('personal-b2')),membershipsUnchanged:member===localStorage.getItem('orbit.memberships.v3')};});expect(r).toEqual({admitted:false,read:false,assignments:[],meetings:[],personal:true,membershipsUnchanged:true});
});

test('verified existing ORBIT identities are reused and pending credentials cannot bypass first-login through a workspace URL',async({page})=>{
 const reused=await page.evaluate(async()=>{const count=OrbitRecruitment.data().accounts.length;let code;try{await OrbitRecruitment.issueSchoolAccount({role:'student',academicId:'r1',email:'duplicate.person@test.test'},'Temporary2026!');}catch(e){code=e.message;}return {code,same:count===OrbitRecruitment.data().accounts.length};});expect(reused).toEqual({code:'ACCOUNT_EXISTS',same:true});
 await page.evaluate(async()=>{await OrbitRecruitment.issueSchoolAccount({role:'student',academicId:'r6',email:'pending.url@test.test'},'Temporary2026!');localStorage.setItem('orbitUser',JSON.stringify({email:'pending.url@test.test',role:'student'}));});await page.goto('/student-dashboard/student-dashboard.html');await expect(page).toHaveURL(/login\/login.html\?passwordChange=1/);expect(await page.evaluate(()=>localStorage.getItem('orbitUser'))).toBeNull();
});

test("reviewed promotion is read-only until confirmation and commits or rejects the whole batch", async ({page}) => {
 const r=await page.evaluate(()=>{
  const E=B2, key=E.storageKey(), before=localStorage.getItem(key), section=sections.target;
  const pick=(academicStudentId)=>({academicStudentId,sectionId:section.id,gradeId:section.gradeId});
  const choices=[pick("r1"),pick("r2")], invalid=[choices[0],{...choices[1],sectionId:sections.source.id}];
  const preview=E.previewPromotion("source","target",choices);
  const previewUnchanged=before===localStorage.getItem(key);
  const blocked=attempt2(()=>E.promoteBatch("source","target",invalid,preview.context,bop(),true));
  const atomic=before===localStorage.getItem(key);
  const identity=E.previewPromotion("source","target",[pick("r5"),pick("r4")]).results;
  const rejectedYear=attempt2(()=>E.promoteBatch("source","source",choices,preview.context,bop(),true));
  const schoolDenied=attempt2(()=>E.promoteBatch("source","target",choices,{...preview.context,schoolId:"other"},bop(),true));
  const write=Storage.prototype.setItem;
  let storageFailure;
  try {
   Storage.prototype.setItem=function(k,v){if(k===key) throw Error("quota"); return write.call(this,k,v);};
   storageFailure=attempt2(()=>E.promoteBatch("source","target",choices,preview.context,bop(),true));
  } finally {Storage.prototype.setItem=write;}
  const quotaUnchanged=before===localStorage.getItem(key);
  const op=bop(), saved=E.promoteBatch("source","target",choices,preview.context,op,true);
  const after=localStorage.getItem(key), replay=E.promoteBatch("source","target",choices,preview.context,op,true);
  const duplicate=E.previewPromotion("source","target",choices).results;
  const channel={id:"future",schoolId:preview.context.schoolId,academicYearId:"target",sectionId:section.id};
  const current=E.read(), prior=JSON.parse(before);
  return {previewUnchanged,blocked,atomic,storageFailure,quotaUnchanged,identity,rejectedYear,schoolDenied,saved,replay,duplicate,
    replayUnchanged:after===localStorage.getItem(key),preserved:current.enrollments.filter(e=>e.academicYearId==="source"),
    source:prior.enrollments,active:OrbitSchoolYears.read().activeYearId,access:OrbitAuth.schoolStudentAccess(channel,"student1@preview.test")};
 });
 expect(r).toMatchObject({previewUnchanged:true,blocked:"INVALID_SECTION",atomic:true,storageFailure:"STORAGE_FAILED",quotaUnchanged:true,rejectedYear:"TARGET_NOT_UPCOMING",
  schoolDenied:"SCHOOL_CHANGED",replayUnchanged:true,active:"source",access:false});
 expect(r.identity.map(row=>row.issue)).toEqual(["SOURCE_UNRESOLVED","SOURCE_UNRESOLVED"]);
 expect(r.saved.placements).toHaveLength(2);
 expect(r.replay).toEqual(r.saved);
 expect(r.preserved).toEqual(r.source);
 expect(r.duplicate.every(row=>row.issue==="DUPLICATE_ENROLLMENT")).toBe(true);
});

test("promotion entry opens the shared wizard and preserves records while navigating",async({page})=>{
 const before=await page.evaluate(()=>OrbitSchoolEnrollments.read());
 await page.goto('/school-management/school-management.html?section=students&view=promotions&targetYear=target');
 await expect(page.locator('[data-promotion-wizard]')).toBeVisible();
 await expect(page.locator('.pw-steps button')).toHaveCount(3);
 await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();
 await expect(page.locator('[data-preview-item]')).toHaveCount(4);
 await page.locator('[data-pw-summary]').click();
 await expect(page.locator('[data-promotion-review]')).toBeDisabled();
 expect(await page.evaluate(()=>OrbitSchoolEnrollments.read())).toEqual(before);
});
