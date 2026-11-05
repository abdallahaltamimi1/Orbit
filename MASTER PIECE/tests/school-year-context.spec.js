import { test, expect } from '@playwright/test';
import { setupPromotion } from './fixtures/promotion-preview.js';
import path from 'node:path';
import os from 'node:os';
const route='/school-management/school-management.html';
const selector=page=>page.locator('[data-school-year]');
const snapshot=page=>page.evaluate(()=>Object.keys(localStorage).sort().filter(k=>!k.startsWith(OrbitSchoolYearContext.prefix)).map(k=>[k,localStorage.getItem(k)]));
test.beforeEach(async({page})=>setupPromotion(page));

test('shared year defaults Active, switches all statuses, persists through every academic destination and reload without academic writes',async({page})=>{
 await page.goto(route+'?section=years');const before=await snapshot(page);
 await expect(selector(page)).toHaveValue('source');await expect(selector(page).locator('option')).toHaveText(['Choose an academic year','Past','Source 2030','Target 2031']);
 await selector(page).selectOption('target');await expect(selector(page)).toBeFocused();
 for(const suffix of ['?section=students','?section=classes','?section=teachers','?section=subjects','?section=timetable','?section=monitoring','?section=events','?section=overview','?section=students&view=annual','?section=students&view=promotions']){
  if(suffix==='?section=students&view=annual'){await page.locator('#orbit-rail a[href$="?section=students"]').click();await page.locator('[data-student-tab="annual"]').click();}
  else await page.locator(`#orbit-rail a[href$="${suffix}"]`).click();await expect(selector(page)).toHaveValue('target');
  await expect(page.locator('[data-year-context] select')).toHaveCount(1);await expect(page.locator('#orbit-rail [aria-current=page]')).toHaveCount(1);
 }
 await page.reload();await expect(selector(page)).toHaveValue('target');
 await page.goto(route+'?section=students&view=annual');await expect(page.locator('[data-annual-year]')).toHaveCount(1);await expect(page.locator('[data-annual-year]')).toHaveValue('target');
 await selector(page).selectOption('past');await expect(page.locator('[data-annual-year-status]')).toHaveText('Archived');
 expect(await snapshot(page)).toEqual(before);
});

test('invalid, removed and corrupt preference values recover to Active; no Active year stays explicit; no years are created',async({page})=>{
 await page.goto(route+'?section=years&academicYear=missing');await expect(selector(page)).toHaveValue('source');await expect(page.locator('[data-year-context-feedback]')).toContainText('unavailable');
 await selector(page).selectOption('target');
 await page.evaluate(()=>{const key=OrbitSchoolYears.storageKey(),db=OrbitSchoolYears.read();db.years=db.years.filter(y=>y.id!=='target');localStorage.setItem(key,JSON.stringify(db));});
 await page.reload();await expect(selector(page)).toHaveValue('source');
 await page.evaluate(()=>localStorage.setItem(OrbitSchoolYearContext.storageKey(),'broken'));await page.reload();await expect(selector(page)).toHaveValue('source');
 await page.evaluate(()=>{const db=OrbitSchoolYears.read();db.activeYearId=null;db.years.find(y=>y.id==='source').status='archived';localStorage.setItem(OrbitSchoolYears.storageKey(),JSON.stringify(db));});
 await page.goto(route+'?section=years');await expect(selector(page)).toHaveValue('');await expect(page.locator('#sm-year-context-note')).toContainText('No Active year');
 await selector(page).selectOption('past');await page.reload();await expect(selector(page)).toHaveValue('past');
 await page.evaluate(()=>localStorage.removeItem(OrbitSchoolYears.storageKey()));await page.reload();await expect(selector(page)).toBeDisabled();await expect(page.locator('#sm-year-context-note')).toContainText('No academic years');
 expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolYears.storageKey()))).toBeNull();
});

test('year preferences isolate schools and failures cannot change academic data or fabricate a saved selection',async({page})=>{
 await page.goto(route+'?section=years');await selector(page).selectOption('past');
 const first=await page.evaluate(()=>({key:OrbitSchoolYearContext.storageKey(),raw:localStorage.getItem(OrbitSchoolYearContext.storageKey()),db:OrbitSchoolYears.read()}));
 await page.evaluate(({db})=>{
  const schoolId='second@context.test';db.schoolId=schoolId;db.years.forEach(y=>y.schoolId=schoolId);
  localStorage.setItem(OrbitSchoolYears.prefix+encodeURIComponent(schoolId),JSON.stringify(db));
  localStorage.setItem('orbitUser',JSON.stringify({email:schoolId,role:'school',name:'Second School'}));
 },first);
 await page.goto(route+'?section=years');await expect(selector(page)).toHaveValue('source');await selector(page).selectOption('target');
 expect(await page.evaluate(key=>localStorage.getItem(key),first.key)).toBe(first.raw);
 await page.evaluate(()=>localStorage.setItem('orbitUser',JSON.stringify({email:'school@preview.test',role:'school',name:'Preview School'})));
 await page.goto(route+'?section=years');await expect(selector(page)).toHaveValue('past');
 const before=await snapshot(page);
 await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith(OrbitSchoolYearContext.prefix))throw Error('quota');return set.call(this,k,v);};});
 await selector(page).selectOption('target');await expect(selector(page)).toHaveValue('past');await expect(page.locator('[data-year-context-feedback]')).toContainText('could not be saved');expect(await snapshot(page)).toEqual(before);
});

test('archived context disables legacy edits, leaves inspection usable, and rechecks an already open dialog before saving',async({page})=>{
 await page.goto(route+'?section=students');await selector(page).selectOption('past');const before=await snapshot(page);
 for(const [section,button] of [['students','[data-school-action="add"]'],['classes','[data-add-kind="classes"]'],['teachers','[data-teacher-add]'],['subjects','[data-subject-add]'],['timetable','[data-period-action="requirements"]'],['monitoring','[data-monitor-map]']]){
  await page.goto(route+'?section='+section);if(section==='monitoring'){await expect(page.locator('[data-monitor-map]')).toHaveCount(0);await expect(page.locator('#sm-content')).toContainText('Archived academic records');}else if(section==='subjects')await expect(page.locator(button)).toBeEnabled();else await expect(page.locator(button)).toBeDisabled();await expect(page.locator('.sm-year-readonly')).toBeVisible();
  if(section==='students'){await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);await page.locator('[data-student-roster] > summary').click();await page.locator('[data-academic-search]').fill('Student');await page.locator('[data-academic-status]').selectOption('enrolled');await expect(page.locator('[data-edit-kind]').first()).toBeDisabled();await expect(page.locator('[data-academic-search]')).toBeEnabled();}
 }
 expect(await snapshot(page)).toEqual(before);
 await page.goto(route+'?section=students');await selector(page).selectOption('source');await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);await page.locator('[data-student-roster] > summary').click();await page.locator('[data-edit-kind="students"]').first().click();
 await page.locator('dialog[open] [name="name"]').fill('Must not save');
 await page.evaluate(()=>OrbitSchoolYearContext.select('past'));
 await page.locator('dialog[open] button[type="submit"]').click();await expect(page.locator('#sm-dialog-error')).toContainText('read-only');
 expect(await snapshot(page)).toEqual(before);
});

test('shared selector supports languages, themes, device widths and sidebar states with no overflow or console errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(route+'?section=classes');await selector(page).selectOption('target');
 for(const lang of ['en','ar']){
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();
  await expect(selector(page)).toHaveValue('target');await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  for(const theme of ['light','dark']){
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   for(const width of [1440,1024,768,390]){
    await page.setViewportSize({width,height:900});
    if(width>780){await page.locator('#orbit-rail-collapse').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.locator('#orbit-rail-collapse').click();}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await selector(page).focus();expect(await selector(page).evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.screenshot({path:path.join(os.tmpdir(),`orbit-year-context-${lang}-${theme}-${width}.png`),fullPage:true});
   }
  }
 }
 expect(errors).toEqual([]);
});

test('deep-link recovery, cross-tab context and unavailable year data keep the shown context and write guards aligned',async({page})=>{
 await page.goto(route+'?section=students');await selector(page).selectOption('past');
 await page.goto(route+'?section=students&academicYear=missing');await expect(selector(page)).toHaveValue('source');await expect(page.locator('[data-school-action="add"]')).toBeEnabled();
 await page.evaluate(()=>{OrbitSchoolYearContext.select('past');window.dispatchEvent(new StorageEvent('storage',{key:OrbitSchoolYearContext.storageKey()}));});
 await expect(selector(page)).toHaveValue('past');await expect(page.locator('[data-school-action="add"]')).toBeDisabled();
 const raw=await snapshot(page);
 await page.goto(route+'?section=students&view=annual&academicYear=target');await expect(selector(page)).toHaveValue('target');
 await page.locator('#orbit-rail a[href$="?section=classes"]').click();await expect(selector(page)).toHaveValue('target');
 await page.goBack();await expect(selector(page)).toHaveValue('target');
 expect(await snapshot(page)).toEqual(raw);
 await page.evaluate(()=>localStorage.setItem(OrbitSchoolYears.storageKey(),'broken'));
 await page.reload();await expect(page.locator('[data-year-context] [role=alert]')).toContainText('unavailable');
 await expect(page.locator('[data-annual-content] [role=alert]')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolYears.storageKey()))).toBe('broken');
});
