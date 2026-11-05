import {test,expect} from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import {setupPromotion} from './fixtures/promotion-preview.js';
const route='/school-management/school-management.html?section=students';
test.beforeEach(async({page})=>{
  await setupPromotion(page);
  for(const file of ['profiles.js','recruitment-service.js','school-year-context.js','school-section-service.js','school-credential-ui.js'])await page.addScriptTag({path:path.resolve('shared',file)});
  await page.evaluate(async()=>{
    const B=OrbitSchoolSections,section=B.save('',{academicYearId:'source',gradeName:'10',name:'C'},B.read().context);
    await OrbitRecruitment.createSchoolStudent({name:'Lina Student',email:'lina@school.test',academicYearId:'source',gradeId:section.gradeId,sectionId:section.id},OrbitSchoolEnrollments.read().context,true);
  });
});
test('details preserve filters, focus, scroll and records; keyboard remains inside modal',async({page})=>{
  await page.goto(route);
  await expect(page.locator('.students-workspace > .sm-heading')).not.toBeVisible();
  await expect(page.locator('[data-legacy-students]')).toBeEmpty();
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.locator('[data-annual-search]').fill('lina@school.test');
  await expect(page.locator('[data-annual-enrollment]')).toHaveCount(1);
  const trigger=page.locator('[data-student-details]').first();await trigger.focus();
  const scroll=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');
  const d=page.locator('.sm-student-details[open]');await expect(d).toContainText('Lina Student');await expect(d).toContainText('lina@school.test');await expect(d).toContainText('Source 2030');await expect(d).toContainText('10 / C');await expect(d).toContainText('Pending first login');
  await expect(d.locator('h2')).toBeFocused();
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement.closest('.sm-student-details')!==null)).toBe(true);}
  for(let i=0;i<8;i++){await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>document.activeElement.closest('.sm-student-details')!==null)).toBe(true);}
  await page.keyboard.press('Escape');await expect(d).toHaveCount(0);await expect(trigger).toBeFocused();
  await expect(page.locator('[data-annual-search]')).toHaveValue('lina@school.test');expect(await page.evaluate(()=>scrollY)).toBe(scroll);expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(before);
  await trigger.click();await page.locator('[data-detail-close]').click();await expect(trigger).toBeFocused();
});
test('reviewed editing and placement changes preserve enrollment history; archived actions stay disabled',async({page})=>{
  await page.goto(route);await page.locator('[data-student-details]').first().click();await page.locator('[data-detail-action=edit]').click();
  const form=page.locator('.sm-student-dialog[open] form');await form.locator('[name=name]').fill('Lina Updated');await form.locator('[name=confirmed]').check();await form.locator('[type=submit]').click();
  await expect(page.locator('.sm-student-details[open] h2')).toHaveText('Lina Updated');
  await page.locator('[data-detail-action=placement]').click();
  let d=page.locator('.sm-student-dialog[open]');await d.locator('[name=confirmed]').check();await d.locator('[name=reason]').fill('Reviewed placement');await d.locator('[type=submit]').click();await expect(d.locator('[role=alert]')).toContainText('different placement');
  await d.locator('[data-cancel]').click();await expect(page.locator('.sm-student-details[open]')).toBeVisible();
  await page.locator('[data-detail-close]').click();
  await page.evaluate(()=>{const B=OrbitSchoolSections;B.save('',{academicYearId:'source',gradeId:B.read().grades[0].id,name:'D'},B.read().context);});
  await page.reload();await page.locator('[data-student-details]').first().click();await page.locator('[data-detail-action=placement]').click();
  d=page.locator('.sm-student-dialog[open]');await d.locator('[name=sectionId]').selectOption({label:'D'});await d.locator('[name=reason]').fill('Family requested change');await d.locator('[name=confirmed]').check();await d.locator('[type=submit]').click();
  await expect(page.locator('.sm-student-details[open]')).toContainText('10 / D');await expect(page.locator('[data-detail-action=history]')).toHaveCount(0);await page.locator('[data-detail-close]').click();await page.locator('[data-student-tab=annual]').click();await page.locator('.sm-annual-history').filter({hasText:'Family requested change'}).locator('summary').click();await expect(page.locator('.sm-annual-history').filter({hasText:'Family requested change'})).toContainText('Family requested change');await page.locator('[data-student-tab=management]').click();
  await page.evaluate(()=>OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true));await page.reload();await page.locator('[data-school-year]').selectOption('source');await page.locator('[data-student-details]').first().click();await expect(page.locator('[data-detail-action=edit]')).toBeDisabled();await expect(page.locator('[data-detail-action=placement]')).toBeDisabled();await expect(page.locator('[data-detail-action=history]')).toHaveCount(0);
});
test('duplicate student codes and stale detail edits cannot overwrite records',async({page})=>{
  await page.goto(route);await page.locator('[data-student-details]').first().click();await page.locator('[data-detail-action=edit]').click();
  const d=page.locator('.sm-student-dialog[open]'),before=await page.evaluate(()=>localStorage.getItem(OrbitSchoolAcademics.storageKey()));
  await d.locator('[name=studentCode]').fill('S1');await d.locator('[name=confirmed]').check();await d.locator('[type=submit]').click();await expect(d.locator('[role=alert]')).toContainText('already used');expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolAcademics.storageKey()))).toBe(before);
  await d.locator('[name=studentCode]').fill('LINA-NEW');await page.evaluate(()=>{const db=OrbitSchoolAcademics.read(),s=db.students.find(s=>s.id==='r1');OrbitSchoolAcademics.save('students',s.id,{...s,name:'Concurrent update'},db);});
  const concurrent=await page.evaluate(()=>localStorage.getItem(OrbitSchoolAcademics.storageKey()));await d.locator('[type=submit]').click();await expect(d.locator('[role=alert]')).toContainText('changed');expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolAcademics.storageKey()))).toBe(concurrent);
});
test('300+ records render at most 25 rows, with real statistics, combined filters and stable details pagination',async({page})=>{
  await page.evaluate(()=>{
    const E=OrbitSchoolEnrollments,academic=OrbitSchoolAcademics.read(),annual=E.read(),maps=E.readMappings(),accounts=OrbitRecruitment.data();
    const template=annual.enrollments.find(e=>e.structure==='section'),p=annual.placements.find(p=>p.id===template.currentPlacementId),m=maps.mappings.find(m=>m.id===template.mappingId),s=academic.students.find(s=>s.id===template.academicStudentId),a=accounts.accounts.find(a=>a.email===template.accountId);
    for(let i=0;i<300;i++){
      const id='bulk-'+i,email=`bulk${i}@school.test`,stamp=new Date(Date.UTC(2030,0,1,0,0,i)).toISOString();
      academic.students.push({...s,id,name:`Student ${String(i).padStart(3,'0')}`,studentCode:'BULK-'+i});accounts.accounts.push({...a,email,academicId:id,mustChangePassword:i%2===0});
      const mappingId='mapping-'+id,enrollmentId='enrollment-'+id,placementId='placement-'+id;
      maps.mappings.push({...m,id:mappingId,academicStudentId:id,accountId:email});
      maps.history.push(...maps.history.filter(h=>h.mappingId===m.id).map(h=>({...h,id:h.id+'-'+i,mappingId,toAccountId:h.type==='requested'?null:email})));
      annual.enrollments.push({...template,id:enrollmentId,academicStudentId:id,accountId:email,mappingId,currentPlacementId:placementId,createdAt:stamp,updatedAt:stamp});annual.placements.push({...p,id:placementId,enrollmentId});
    }
    localStorage.setItem(OrbitSchoolAcademics.storageKey(),JSON.stringify(academic));localStorage.setItem(E.storageKey(),JSON.stringify(annual));localStorage.setItem(E.mappingKey(),JSON.stringify(maps));localStorage.setItem('orbit.recruitment.v1',JSON.stringify(accounts));
  });
  await page.goto(route);await expect(page.locator('[data-annual-enrollment]')).toHaveCount(25);await expect(page.locator('[data-student-metrics] dd').first()).toHaveText('305');await expect(page.locator('[data-student-pagination]')).toContainText('1–25 of 305');
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('button',{name:'Next',exact:true})).toBeFocused();await expect(page.locator('[data-student-pagination]')).toContainText('26–50 of 305');const trigger=page.locator('[data-student-details]').nth(40);await trigger.scrollIntoViewIfNeeded();const offset=await page.evaluate(()=>scrollY),name=await trigger.textContent();await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toHaveText(name);expect(await page.evaluate(()=>scrollY)).toBe(offset);await expect(page.locator('[data-student-pagination]')).toContainText('26–50 of 305');
  await page.locator('[data-student-grade]').selectOption('10');await page.locator('[data-student-section]').selectOption('C');await page.locator('[data-student-account]').selectOption('pending');await expect(page.locator('[data-student-pagination]')).toContainText('of 151');await page.locator('[data-annual-search]').fill('bulk200@school.test');await expect(page.locator('[data-annual-enrollment]')).toHaveCount(1);await page.locator('[data-annual-search]').fill('nobody');await expect(page.locator('.sm-students-empty')).toContainText('No matching students');await page.getByRole('button',{name:'Clear filters'}).click();await expect(page.locator('[data-annual-enrollment]')).toHaveCount(25);
  await page.locator('[data-school-year]').selectOption('target');await expect(page.locator('.sm-students-empty')).toContainText('No students enrolled yet');await expect(page.locator('[data-student-metrics] dd').first()).toHaveText('0');
});
test('statistic cards, filters and compact year selector stay aligned and accessible across layouts',async({page})=>{
  await page.goto(route);
  for(const lang of ['en','ar']){
    if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();
    await page.waitForFunction(()=>!!window.OrbitThemePreference&&!!document.querySelector('[data-student-metrics]'));
    for(const theme of ['light','dark'])for(const width of [1440,768,390]){
      await page.evaluate(theme=>OrbitThemePreference.save(theme),theme);await page.setViewportSize({width,height:900});
      const cards=page.locator('[data-student-metrics] > div');await expect(cards).toHaveCount(4);await expect(cards.locator('svg[aria-hidden=true]')).toHaveCount(4);
      const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
      expect(Math.max(...boxes.map(b=>b.width))-Math.min(...boxes.map(b=>b.width))).toBeLessThan(2);
      if(width===1440){expect(new Set(boxes.map(b=>b.y)).size).toBe(1);const controls=await page.locator('.sm-student-filters input,.sm-student-filters select').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {y:r.y,width:r.width,height:r.height};}));expect(controls[0].width).toBeGreaterThan(controls[1].width);expect(Math.max(...controls.map(c=>c.y))-Math.min(...controls.map(c=>c.y))).toBeLessThan(2);expect(new Set(controls.map(c=>c.height)).size).toBe(1);}
      else expect(new Set(boxes.map(b=>b.y)).size).toBe(2);
      await expect(page.locator('[data-school-year]')).toHaveAccessibleDescription(lang==='en'?/Enrollments follow the selected academic year/:/التسجيلات حسب السنة/);
      expect(await page.locator('#sm-year-context-note').evaluate(e=>e.getBoundingClientRect().width)).toBe(1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(os.tmpdir(),`orbit-students-cards-${lang}-${theme}-${width}.png`),animations:'disabled'});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('[data-student-metrics]').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await page.locator('[data-annual-search]').fill('no matching record');await expect(page.locator('[data-student-metrics] dd').first()).toHaveText('٥');
});
test('details and list support both directions, themes, mobile and reduced motion',async({page})=>{
  await page.goto(route);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const lang of ['en','ar']){
    if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();await page.waitForFunction(()=>!!window.OrbitThemePreference&&!!document.querySelector('[data-student-details]'));
    for(const theme of ['light','dark'])for(const width of [1440,390]){
      await page.evaluate(theme=>OrbitThemePreference.save(theme),theme);await page.setViewportSize({width,height:width===390?560:850});await page.locator('[data-student-details]').first().click();const d=page.locator('.sm-student-details[open]');await expect(d).toBeVisible();if(width===390)expect(await d.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);expect(await d.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');await page.screenshot({path:path.join(os.tmpdir(),`orbit-students-details-${lang}-${theme}-${width}.png`),animations:'disabled'});await page.keyboard.press('Escape');await page.screenshot({path:path.join(os.tmpdir(),`orbit-students-page-${lang}-${theme}-${width}.png`),animations:'disabled'});
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-student-details]').first().click();expect(await page.locator('.sm-student-details').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');expect(errors).toEqual([]);
});
