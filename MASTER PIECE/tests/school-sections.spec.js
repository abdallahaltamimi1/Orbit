import {test,expect} from '@playwright/test';
import path from 'node:path';import os from 'node:os';
import {setupPromotion} from './fixtures/promotion-preview.js';
const route='/school-management/school-management.html?section=classes';
const protectedData=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().filter(k=>!k.startsWith(OrbitSchoolSections.prefix)&&!k.startsWith("orbit.workspace.academic-year.v1:")).map(k=>[k,localStorage.getItem(k)])));
test.beforeEach(async({page})=>{await setupPromotion(page);for(const file of ['school-year-context.js','school-section-service.js'])await page.addScriptTag({path:path.resolve('shared',file)});});

test('grades are reusable and sections have independent IDs per Active/Upcoming year without touching existing academic data',async({page})=>{
 const before=await protectedData(page);
 const result=await page.evaluate(()=>{
  const B=OrbitSchoolSections,ctx=()=>B.read().context,tryIt=f=>{try{f();return 'ok';}catch(e){return e.message;}};
  const untouched=B.read(),source=B.save('',{academicYearId:'source',gradeName:'7',name:'C'},ctx());
  const upcoming=B.save('',{academicYearId:'target',gradeId:source.gradeId,name:'C'},ctx());
  const updated=B.save(source.id,{academicYearId:'source',gradeId:source.gradeId,name:'D'},ctx());
  return {untouched,source,upcoming,updated,sourceView:B.view('source'),targetView:B.view('target'),duplicate:tryIt(()=>B.save('',{academicYearId:'source',gradeId:source.gradeId,name:' d '},ctx())),move:tryIt(()=>B.save(source.id,{academicYearId:'target',gradeId:source.gradeId,name:'D'},ctx())),gradeChange:tryIt(()=>B.save(source.id,{academicYearId:'source',gradeId:'other',name:'D'},ctx()))};
 });
 expect(result.untouched).toMatchObject({grades:[],sections:[]});expect(result.source.id).not.toBe(result.upcoming.id);expect(result.source.gradeId).toBe(result.upcoming.gradeId);expect(result.sourceView.grades).toHaveLength(1);expect(result.sourceView.sections).toHaveLength(1);expect(result.targetView.sections).toHaveLength(1);expect(result.updated).toMatchObject({id:result.source.id,createdAt:result.source.createdAt,name:'D'});expect(result.updated.updatedAt).toBeTruthy();expect(result.duplicate).toBe('DUPLICATE_SECTION');expect(result.move).toBe('IMMUTABLE_RELATION');expect(result.gradeChange).toBe('IMMUTABLE_RELATION');expect(await protectedData(page)).toEqual(before);
});

test('Archived handlers reject create/edit/delete even through a forged destination; new sections never auto-enroll students',async({page})=>{
 const before=await protectedData(page);const result=await page.evaluate(()=>{
  const B=OrbitSchoolSections,ctx=()=>B.read().context,tryIt=f=>{try{f();return 'ok';}catch(e){return e.message;}};
  const row=B.save('',{academicYearId:'source',gradeName:'8',name:'C'},ctx());
  OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true);
  const snapshot=localStorage.getItem(B.storageKey());
  const codes=[tryIt(()=>B.save('',{academicYearId:'source',gradeId:row.gradeId,name:'D'},ctx())),tryIt(()=>B.save(row.id,{academicYearId:'source',gradeId:row.gradeId,name:'D'},ctx())),tryIt(()=>B.remove(row.id,'source',ctx(),true)),tryIt(()=>B.save(row.id,{academicYearId:'target',gradeId:row.gradeId,name:'D'},ctx()))];
  return {codes,unchanged:snapshot===localStorage.getItem(B.storageKey()),row:B.view('source').sections[0],enrolled:OrbitSchoolEnrollments.read().enrollments.length};
 });expect(result.codes).toEqual(['ARCHIVED_YEAR','ARCHIVED_YEAR','ARCHIVED_YEAR','IMMUTABLE_RELATION']);expect(result.unchanged).toBe(true);expect(result.row.name).toBe('C');
 const after=await protectedData(page);delete before['orbit.school.years.demo.v1:'+encodeURIComponent('school@preview.test')];delete after['orbit.school.years.demo.v1:'+encodeURIComponent('school@preview.test')];expect(after).toEqual(before);
});

test('dependency checks block deletion for all existing class consumers and fail closed on corrupt stores',async({page})=>{
 const result=await page.evaluate(()=>{
  const B=OrbitSchoolSections,school=OrbitAuth.current().email,enc=encodeURIComponent(school),row=B.save('',{academicYearId:'source',gradeName:'10',name:'C'},B.read().context),codes=[];
  const cases=[['orbit.school.academics.demo.v1:'+enc,db=>db.students.push({id:'dependency',classId:row.id})],['orbit.school.enrollments.demo.v1:'+enc,db=>db.placements.push({classId:row.id})],['orbit.school.timetable.demo.v1:'+enc,db=>db.records.push({classId:row.id})],['orbit.school.events.demo.v1:'+enc,db=>db.records.push({classIds:[row.id]})],['orbit.school.education.links.v1:'+enc,db=>db.links.push({classId:row.id})],['orbit.school.workflow.v1:'+enc,db=>db.timetables.push({records:[{classId:row.id}]})],['orbit.school.promotion-previews.demo.v1:'+enc,db=>db.drafts.push({items:[{destinationClassId:row.id}]})],['orbit.channels.v2',db=>db.channels.push({id:'dependent-channel',schoolId:school,sectionId:row.id})]];
  for(const [key,modify]of cases){const old=localStorage.getItem(key),db=old===null?{records:[],links:[],timetables:[],drafts:[]}:JSON.parse(old);modify(db);localStorage.setItem(key,JSON.stringify(db));try{B.remove(row.id,'source',B.read().context,true);codes.push('bad');}catch(e){codes.push(e.message);}if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);}
  const key='orbit.school.events.demo.v1:'+enc;localStorage.setItem(key,'broken');let corrupt;try{B.remove(row.id,'source',B.read().context,true);}catch(e){corrupt=e.message;}localStorage.removeItem(key);
  const unconfirmed=(()=>{try{B.remove(row.id,'source',B.read().context);return 'bad';}catch(e){return e.message;}})();
  const removed=B.remove(row.id,'source',B.read().context,true);return {codes,corrupt,unconfirmed,removed,remaining:B.read().sections.length,grades:B.read().grades.length};
 });expect(result.codes).toEqual(Array(8).fill('SECTION_IN_USE'));expect(result.corrupt).toBe('INVALID_DATA');expect(result.unconfirmed).toBe('CONFIRMATION_REQUIRED');expect(result.removed.removed).toBe(true);expect(result.remaining).toBe(0);expect(result.grades).toBe(1);
});

test('school isolation, stale revisions, quota failures and corrupted registries never rewrite existing data',async({page})=>{
 const before=await protectedData(page);const result=await page.evaluate(()=>{
  const B=OrbitSchoolSections,ctx=()=>B.read().context,attempt=f=>{try{f();return 'ok';}catch(e){return e.message;}};
  const initial=ctx(),r=B.save('',{academicYearId:'source',gradeName:'11',name:'C'},initial),stale=attempt(()=>B.save('',{academicYearId:'target',gradeId:r.gradeId,name:'D'},initial)),key=B.storageKey(),saved=localStorage.getItem(key),identity=localStorage.getItem('orbitUser');
  localStorage.setItem('orbitUser',JSON.stringify({email:'other@school.test',role:'school'}));const other=B.read(),foreign=attempt(()=>B.save(r.id,{academicYearId:'source',gradeId:r.gradeId,name:'D'},ctx()));localStorage.setItem('orbitUser',identity);
  const set=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('quota');};const quota=attempt(()=>B.save('',{academicYearId:'target',gradeId:r.gradeId,name:'D'},ctx()));Storage.prototype.setItem=set;
  const unchanged=saved===localStorage.getItem(key);localStorage.setItem(key,'broken');const corrupt=attempt(()=>B.read()),retained=localStorage.getItem(key)==='broken';localStorage.setItem(key,saved);
  const denied=[];for(const role of ['student','teacher']){localStorage.setItem('orbitUser',JSON.stringify({email:'foreign@test.test',role}));denied.push(attempt(()=>B.read()));}localStorage.setItem('orbitUser',identity);
  return {other,foreign,stale,quota,unchanged,corrupt,retained,denied};
 });expect(result.other.sections).toEqual([]);expect(result.foreign).not.toBe('ok');expect(result.stale).toBe('STALE_DATA');expect(result.quota).toBe('STORAGE_FAILED');expect(result.unchanged).toBe(true);expect(result.corrupt).toBe('INVALID_DATA');expect(result.retained).toBe(true);expect(result.denied).toEqual(['ROLE_DENIED','ROLE_DENIED']);expect(await protectedData(page)).toEqual(before);
});

test('explicit reviewed legacy records prevent duplicate-looking sections and otherwise remain byte-for-byte preserved',async({page})=>{
 const before=await protectedData(page);const result=await page.evaluate(()=>{
  const B=OrbitSchoolSections;let conflict;try{B.save('',{academicYearId:'source',gradeName:'7',name:'A'},B.read().context);}catch(e){conflict=e.message;}
  const noWrite=localStorage.getItem(B.storageKey())===null;
  const section=B.save('',{academicYearId:'target',gradeName:'7',name:'C'},B.read().context);
  return {conflict,noWrite,section};
 });expect(result.conflict).toBe('EXISTING_CLASS_CONFLICT');expect(result.noWrite).toBe(true);expect(result.section.academicYearId).toBe('target');expect(await protectedData(page)).toEqual(before);
 await page.goto(route);await page.locator('[data-sections-advanced] > summary').click();await expect(page.locator('[data-existing-classes]')).toBeVisible();await expect(page.locator('[data-legacy-classes] [data-record-id]')).not.toHaveCount(0);await expect(page.locator('#sm-section-title')).toHaveCount(1);await expect(page.locator('#orbit-rail [aria-current=page]')).toHaveCount(1);
});

async function create(page,gradeName,name,gradeId){const advanced=page.locator('[data-section-legacy-create]');await advanced.evaluate(e=>{e.closest('details').open=true;});await advanced.click();const d=page.locator('.sm-section-dialog[open]');await d.locator('[name="gradeId"]').selectOption(gradeId||'__new__');if(!gradeId)await d.locator('[name="gradeName"]').fill(gradeName);await d.locator('[name="name"]').fill(name);await d.getByRole('button',{name:'Save',exact:true}).click();await expect(d).toHaveCount(0);}

test('section UI creates, filters, edits and deletes in place with year isolation, newest ordering and reload persistence',async({page})=>{
 await page.goto(route);const before=await protectedData(page);await create(page,'7','C');const first=await page.evaluate(()=>OrbitSchoolSections.read().sections[0]);await create(page,'','D',first.gradeId);await expect(page.locator('[data-year-section] [data-section-name]')).toHaveText(['D','C']);
 await page.locator('[data-school-year]').selectOption('target');await expect(page.locator('[data-year-section]')).toHaveCount(0);await create(page,'','C',first.gradeId);await expect(page.locator('[data-year-section]')).toHaveCount(1);await page.reload();await expect(page.locator('[data-school-year]')).toHaveValue('target');await expect(page.locator('[data-year-section]')).toHaveCount(1);
 await page.locator('[data-school-year]').selectOption('source');await expect(page.locator('[data-year-section]')).toHaveCount(2);await page.locator(`[data-section-edit="${first.id}"]`).click();let d=page.locator('.sm-section-dialog[open]');await d.locator('[name="name"]').fill('E');await d.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator(`[data-year-section="${first.id}"]`)).toContainText('E');
 await page.locator('[data-section-search]').fill('E E');await expect(page.locator('[data-year-section]')).toHaveCount(1);await page.locator('[data-section-search]').fill('');await page.locator(`[data-section-delete="${first.id}"]`).click();d=page.locator('.sm-section-dialog[open]');await d.locator('[name="confirmed"]').check();await d.getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator(`[data-year-section="${first.id}"]`)).toHaveCount(0);expect(await protectedData(page)).toEqual(before);
});

test('open section forms reject Archived/year changes and the screen remains read-only after refresh',async({page})=>{
 await page.goto(route);await create(page,'9','C');const row=await page.evaluate(()=>OrbitSchoolSections.read().sections[0]);await page.locator(`[data-section-edit="${row.id}"]`).click();const d=page.locator('.sm-section-dialog[open]');await page.evaluate(()=>OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true));await d.locator('[name="name"]').fill('D');await d.getByRole('button',{name:'Save',exact:true}).click();await expect(d.locator('[data-section-error]')).toContainText(/read-only|changed/);await d.getByRole('button',{name:'Cancel',exact:true}).click();await page.reload();await page.locator('[data-school-year]').selectOption('source');await expect(page.locator('[data-section-create]')).toBeDisabled();await expect(page.locator('[data-section-edit]')).toBeDisabled();await expect(page.locator('[data-section-delete]')).toBeDisabled();
});

test('sections support Arabic/English, themes and desktop/tablet/mobile without overflow or console errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(route);await create(page,'الصف ٩ · Grade 9','شعبة ج · C');
 for(const lang of ['en','ar']){if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();await expect(page.locator('[data-section-create]')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  for(const theme of ['light','dark']){await page.evaluate(v=>OrbitThemePreference.save(v),theme);for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.keyboard.press('Tab');await page.locator('[data-section-create]').focus();expect(await page.locator('[data-section-create]').evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await page.screenshot({path:path.join(os.tmpdir(),`orbit-b1-sections-${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});}}
 }expect(errors).toEqual([]);
});

test('missing years and unavailable-year sections stay preserved without automatic seeding or reassignment',async({page})=>{
 await page.evaluate(()=>{const B=OrbitSchoolSections;B.save('',{academicYearId:'target',gradeName:'10',name:'C'},B.read().context);const key=OrbitSchoolYears.storageKey(),db=JSON.parse(localStorage.getItem(key));db.years=db.years.filter(y=>y.id!=='target');db.revision++;localStorage.setItem(key,JSON.stringify(db));});
 const saved=await page.evaluate(()=>localStorage.getItem(OrbitSchoolSections.storageKey()));await page.goto(route);await expect(page.locator('[data-year-section]')).toHaveCount(0);await expect(page.getByRole('note').filter({hasText:'unavailable year'})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolSections.storageKey()))).toBe(saved);
 await page.evaluate(()=>{localStorage.removeItem(OrbitSchoolYears.storageKey());localStorage.removeItem(OrbitSchoolSections.storageKey());localStorage.removeItem(OrbitSchoolAcademics.storageKey());});await page.reload();await expect(page.locator('[data-section-create]')).toBeDisabled();await expect(page.locator('[data-year-section-list]')).toContainText('Choose an academic year');expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolSections.storageKey()))).toBeNull();expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolAcademics.storageKey()))).toBeNull();
});
