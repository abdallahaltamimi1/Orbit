import {test,expect} from '@playwright/test';
import {setupPromotion} from './fixtures/promotion-preview.js';
import path from 'node:path';import os from 'node:os';
const base='/school-management/school-management.html';
async function populated(page){await setupPromotion(page);await page.goto(base);await page.evaluate(()=>{crypto.subtle.deriveBits=async()=>new Uint8Array(32).buffer;});await page.evaluate(()=>OrbitAcademicDemo.load(true));await page.evaluate(()=>OrbitAcademicDemo.enter());await page.waitForURL('**/school-management/school-management.html?section=overview');await page.goto(base+'?section=classes');}
const snapshot=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>!k.startsWith('orbit.workspace.academic-year.v1:')).sort().map(k=>[k,localStorage.getItem(k)])));

test('connected sections show actual counts, inspect students, preserve records on reads and follow reviewed placement changes',async({page})=>{
 test.setTimeout(60000);await populated(page);const before=await snapshot(page);
 await expect(page.locator('[data-section-summary]')).toHaveText(['3','12','300']);await expect(page.locator('[data-grade-group]')).toHaveCount(3);await expect(page.locator('[data-year-section]')).toHaveCount(12);await expect(page.locator('[data-section-students]')).toHaveText(Array(12).fill('25'));
 const card=page.locator('[data-year-section="od1-section-9-a"]');await card.locator('[data-section-inspect]').click();await expect(card.locator('[data-section-roster] li')).toHaveCount(25);await expect(card.locator('[data-section-roster]')).toContainText('OD-001');
 await page.locator('[data-section-grade-filter]').selectOption('od1-grade-10');await expect(page.locator('[data-year-section]')).toHaveCount(4);await page.locator('[data-section-search]').fill('B');await expect(page.locator('[data-year-section]')).toHaveCount(1);await page.locator('[data-section-search]').fill('');await page.locator('[data-section-grade-filter]').selectOption('');expect(await snapshot(page)).toEqual(before);
 await page.evaluate(()=>{const E=OrbitSchoolEnrollments;E.changePlacement('od1-enrollment-0',{academicYearId:'od1-year-2026',gradeId:'od1-grade-9',sectionId:'od1-section-9-b'},'Reviewed class placement change',E.read().context,crypto.randomUUID(),true);});
 await expect(card.locator('[data-section-students]')).toHaveText('24');await expect(page.locator('[data-year-section="od1-section-9-b"] [data-section-students]')).toHaveText('26');await expect(page.locator('[data-section-summary="students"]')).toHaveText('300');
 await card.locator('[data-section-delete]').click();const d=page.locator('.sm-section-dialog[open]');await d.locator('[name=confirmed]').check();await d.getByRole('button',{name:'Delete',exact:true}).click();await expect(d.locator('[role=alert]')).toContainText('used by other records');await d.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('[data-year-section]')).toHaveCount(12);
});

test('academic-year options contain names only and selected status appears once across academic destinations',async({page})=>{
 test.setTimeout(60000);await setupPromotion(page);
 for(const lang of ['en','ar']){
  await page.evaluate(lang=>{const p=JSON.parse(localStorage.getItem('orbit.student.v1'));p.lang=lang;localStorage.setItem('orbit.student.v1',JSON.stringify(p));},lang);
  for(const section of ['overview','years','students','students&view=annual','classes','teachers','subjects','timetable','monitoring','events','students&view=promotions']){
   await page.goto(base+'?section='+section);
   await expect(page.locator('[data-school-year] option')).toHaveText([lang==='en'?'Choose an academic year':'اختر سنة دراسية','Past','Source 2030','Target 2031']);
   await expect(page.locator('[data-school-year-status]')).toHaveText(lang==='en'?'Active':'نشطة');await expect(page.locator('[data-school-year-status]')).toHaveCount(1);
   const headers=await page.locator('#sm-content header p').allTextContents();expect(headers.join(' ')).not.toMatch(/\bActive\b|نشطة/);
   if(section==='students&view=annual')await expect(page.locator('.sm-annual-notice')).not.toContainText(lang==='en'?'Active':'نشطة');
  }
 }
});

test('advanced class-year linking retains confirmation, snapshots, audit operations and duplicate guards',async({page})=>{
 await setupPromotion(page);await page.goto(base+'?section=classes');
 await page.evaluate(()=>{const A=OrbitSchoolAcademics,db=A.read();db.classes.push({id:'old-unlinked',schoolId:db.schoolId,grade:'7',section:'E',academicYear:'2030-2031',status:'active'});db.revision++;localStorage.setItem(A.storageKey(),JSON.stringify(db));OrbitSchoolSections.save('',{academicYearId:'source',gradeName:'12',name:'A'},OrbitSchoolSections.read().context);});await page.reload();
 await expect(page.locator('[data-sections-advanced]')).not.toHaveAttribute('open','');await expect(page.locator('[data-school-action="class-year"]')).toBeHidden();
 await page.locator('[data-sections-advanced] > summary').click();await page.getByRole('button',{name:'Link an existing class to an academic year',exact:true}).click();const dialog=page.locator('.sm-admin-dialog[open]');await expect(dialog).toContainText('does not create a section');await dialog.locator('[name=classId]').selectOption('old-unlinked');
 const before=await page.evaluate(()=>({annual:OrbitSchoolEnrollments.read(),identity:localStorage.getItem(OrbitSchoolEnrollments.mappingKey())}));
 await dialog.locator('[name=confirmed]').check();await dialog.locator('[type=submit]').click();await expect(dialog).toHaveCount(0);
 const after=await page.evaluate(()=>({annual:OrbitSchoolEnrollments.read(),identity:localStorage.getItem(OrbitSchoolEnrollments.mappingKey())}));
 expect(after.annual.classYearLinks.find(l=>l.classId==='old-unlinked')).toMatchObject({academicYearId:'source',gradeSnapshot:'7',sectionSnapshot:'E',legacyYearSnapshot:'2030-2031',actorId:'school@preview.test'});expect(after.annual.operations.at(-1).payload).toContain('class-year');expect(after.annual.enrollments).toEqual(before.annual.enrollments);expect(after.identity).toBe(before.identity);
 await page.locator('[data-school-action="class-year"]').click();await dialog.locator('[name=classId]').selectOption('old-unlinked');await dialog.locator('[name=confirmed]').check();await dialog.locator('[type=submit]').click();await expect(dialog.locator('[role=alert]')).toContainText('reviewed year association');
});

test('corrupt enrollment data stays unavailable instead of inventing zero counts or replacing records',async({page})=>{
 await populated(page);const saved=await page.evaluate(()=>{const key=OrbitSchoolEnrollments.storageKey();localStorage.setItem(key,'not-json');return key;});await page.reload();await expect(page.locator('[data-section-summary="students"]')).toHaveText('Unavailable');await expect(page.locator('[data-section-students]')).toHaveText(Array(12).fill('—'));expect(await page.evaluate(k=>localStorage.getItem(k),saved)).toBe('not-json');await expect(page.locator('[data-year-section]')).toHaveCount(12);
});

test('grouped sections support populated RTL/LTR light/dark desktop/tablet/mobile and reduced motion',async({page})=>{
 test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});await populated(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 expect(await page.locator('.ss-workspace').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
 for(const lang of ['en','ar']){
  if(await page.locator('html').getAttribute('lang')!==lang)await Promise.all([page.waitForEvent('load'),page.locator('#orbit-language-button').click()]);
  for(const theme of ['light','dark']){
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   await expect(page.locator('.ss-section').first()).toHaveCSS('background-color',theme==='dark'?'rgb(18, 40, 32)':'rgb(255, 255, 255)');
   for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:1000});await expect(page.locator('[data-section-create]')).toBeVisible();await expect(page.locator('[data-section-summary]')).toHaveText(lang==='en'?['3','12','300']:['٣','١٢','٣٠٠']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:path.join(os.tmpdir(),`orbit-sections-grouped-${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});
   }
  }
 }
 expect(errors).toEqual([]);
});
