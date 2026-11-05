import { test, expect } from '@playwright/test';
import { setupPromotion } from './fixtures/promotion-preview.js';
import os from 'node:os';
import path from 'node:path';
const route='/school-management/school-management.html?section=years';
test.beforeEach(async ({page}) => setupPromotion(page));
test('academic years sort by creation only through create, edit, refresh and reload with stable legacy fallback',async({page})=>{
 await page.evaluate(()=>{
  const S=OrbitSchoolYears, db=S.read();
  delete db.years[0].createdAt; delete db.years[0].updatedAt;
  db.years[1].createdAt='2026-01-01T00:00:00Z'; db.years[2].createdAt='2025-01-01T00:00:00Z';
  const legacy={...db.years[0],id:'legacy-two',name:'Second legacy',startDate:'2020-01-01',endDate:'2020-12-31'};
  db.years.push(legacy);localStorage.setItem(S.storageKey(),JSON.stringify(db));
 });
 await page.goto(route);
 const ids=()=>page.locator('[data-year-id]').evaluateAll(rows=>rows.map(r=>r.dataset.yearId));
 expect(await page.evaluate(()=>OrbitSchoolAcademicReadModel.read('source').selectedYear.id)).toBe('source');
 const raw=await page.evaluate(()=>localStorage.getItem(OrbitSchoolYears.storageKey()));
 expect(await ids()).toEqual(['source','target','past','legacy-two']);
 await page.locator('[data-year-refresh]').click();
 expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolYears.storageKey()))).toBe(raw);
 await page.locator('[data-year-create]').click();
 const dialog=page.locator('dialog[open]');
 for(const [name,value] of Object.entries({name:'Newly created earlier year',startDate:'2022-09-01',endDate:'2023-06-30'})) await dialog.locator(`[name="${name}"]`).fill(value);
 await dialog.getByRole('button',{name:'Save',exact:true}).click();
 const created=await page.evaluate(()=>OrbitSchoolYears.read().years.find(y=>y.name==='Newly created earlier year'));
 expect((await ids())[0]).toBe(created.id);
 await page.locator('[data-year-edit="target"]').click();await dialog.locator('[name="name"]').fill('Edited target');await dialog.getByRole('button',{name:'Save',exact:true}).click();
 const expected=[created.id,'source','target','past','legacy-two'];expect(await ids()).toEqual(expected);
 await page.locator('[data-year-refresh]').click();expect(await ids()).toEqual(expected);await page.reload();expect(await ids()).toEqual(expected);
 await page.locator('[data-year-edit="source"]').click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 const db=await page.evaluate(()=>OrbitSchoolYears.read());expect(db.years.map(y=>y.status)).toEqual(['archived','active','upcoming','archived','upcoming']);
 expect(db.years[0].createdAt).toBeUndefined();expect(db.activeYearId).toBe('source');
});
test('school layout and dismissal controls support sidebar states, themes, directions and device widths',async({page})=>{
 test.setTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
 await page.goto(route);
 for(const lang of ['en','ar']){
  if(await page.locator('html').getAttribute('lang')!==lang) await page.locator('#orbit-language-button').click();
  await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  await expect(page.locator('[data-year-create]')).toBeVisible();
  await page.waitForFunction(()=>typeof OrbitThemePreference !== 'undefined');
  for(const theme of ['light','dark']){
   await page.evaluate(v=>OrbitThemePreference.save(v),theme);
   for(const width of [1440,1024,768,390]){
    await page.setViewportSize({width,height:900});
    for(const collapsed of width>780?[false,true]:[false]){
     if(width>780 && (await page.locator('body').getAttribute('class')).includes('orbit-sidebar-collapsed')!==collapsed) await page.locator('#orbit-rail-collapse').click();
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     await expect(page.locator('.sm-nav,[data-student-views]')).toHaveCount(0);
     if(width<=780){
      await page.locator('#orbit-mobile-toggle').click();await expect(page.locator('#orbit-page')).toHaveAttribute('inert','');
      await page.locator('#orbit-mobile-shade').click({position: lang==='ar'?{x:5,y:450}:{x:width-30,y:450}});
      await expect(page.locator('#orbit-mobile-toggle')).toBeFocused();
     }
     await page.locator('[data-year-create]').click();const dialog=page.locator('dialog[open]');await expect(dialog).toBeVisible();
     const rect=await dialog.boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);
     await expect(dialog.locator('[data-year-cancel]')).toBeInViewport();await dialog.locator('[data-year-cancel]').click();await expect(page.locator('[data-year-create]')).toBeFocused();
     await expect(page.locator('dialog')).toHaveCount(0);
    }
    await page.screenshot({path:path.join(os.tmpdir(),`orbit-layout-years-${lang}-${theme}-${width}.png`),fullPage:true});
   }
  }
 }
 expect(errors).toEqual([]);
});
