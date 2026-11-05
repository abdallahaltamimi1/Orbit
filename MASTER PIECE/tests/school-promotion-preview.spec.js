import { test, expect } from '@playwright/test';
import { setupPromotion, previewRoute } from './fixtures/promotion-preview.js';
import path from 'node:path';
import os from 'node:os';
async function setupWizard(page) {
 await setupPromotion(page);
 await page.evaluate(()=>{
  const S=OrbitSchoolSections,E=OrbitSchoolEnrollments;window.dest={};
  for(const g of ['7','8','9','10','12'])for(const name of (g==='8'?['C','D']:['C'])){
   const grade=S.read().grades.find(r=>r.name===g);
   const q=S.save('',{academicYearId:'target',gradeId:grade?.id||'',gradeName:grade?undefined:g,name},S.read().context);dest[g+name]=q;
  }
  const q=S.save('',{academicYearId:'source',gradeId:dest['12C'].gradeId,name:'C'},S.read().context);
  const accounts=JSON.parse(localStorage.getItem('orbit.recruitment.v1'));accounts.accounts.push({email:'six@preview.test',role:'student',status:'active'});localStorage.setItem('orbit.recruitment.v1',JSON.stringify(accounts));
  const m=E.requestMapping('r6',E.read().context,op());E.confirmMapping(m.id,'six@preview.test',E.read().context,op(),true);E.enrollSection({academicStudentId:'r6',academicYearId:'source',gradeId:q.gradeId,sectionId:q.id},E.read().context,op(),true);
  window.draft=()=>P.createDraft('source','target',P.read().context,op(),true);
  window.decide=(d,student,action,target,eligibilityReviewed=true)=>{const v=P.readDraft(d.id),i=v.items.find(i=>i.academicStudentId===student);return P.saveDecision(d.id,i.id,{action,destinationClassId:target||null,eligibilityReviewed},v.context,op(),true);};
  window.resolve=d=>{decide(d,'r1','promote',dest['8C'].id);decide(d,'r2','repeat',dest['8D'].id);decide(d,'r3','exclude');decide(d,'r5','exclude');decide(d,'r6','graduation');return P.readDraft(d.id);};
 });
}
test.beforeEach(async({page})=>setupWizard(page));

test('review dialog localizes sections, fits both directions and preserves academic stores',async({page},info)=>{
 await page.goto(previewRoute);await page.locator('[name=targetYear]').selectOption('target');await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();
 await expect(page.locator('[data-preview-item]')).toHaveCount(5);
 const snapshot=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('orbit.school.')).sort().map(k=>[k,localStorage.getItem(k)])));
 const before=await snapshot();await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of ['en','ar']){
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();
  await expect(page.locator('html')).toHaveAttribute('lang',lang);await expect(page.locator('[data-preview-item]')).toHaveCount(5);await page.waitForFunction(()=>!!window.OrbitThemePreference);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>OrbitThemePreference.save(theme),theme);
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:950});await page.locator('[data-preview-item]').filter({hasText:'Student 1'}).locator('[data-review-item]').click();const d=page.locator('dialog[open]');
    await expect(d.locator('#pw-dialog-title')).toBeFocused();await expect(d.locator('[name=destinationClassId]')).toContainText(lang==='ar'?'ج':'C');
    expect(await d.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if((lang==='en'&&theme==='light'&&width===1440)||(lang==='ar'&&theme==='dark'&&width===390))await page.screenshot({path:info.outputPath(`${lang}-${theme}-${width}.png`)});
    await page.keyboard.press('Escape');await expect(d).toHaveCount(0);
   }
  }
 }
 expect(await snapshot()).toEqual(before);
});

test('administrator choices stay separate from diagnostics and terminal graduation review',async({page})=>{
 await page.goto(previewRoute);await page.locator('[name=targetYear]').selectOption('target');await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();
 const row=page.locator('[data-preview-item]').filter({hasText:'Student 1'});await row.locator('[data-review-item]').click();let d=page.locator('dialog[open]');
 expect(await d.locator('[name=action] option:not([disabled])').evaluateAll(ns=>ns.map(n=>n.value))).toEqual(['promote','repeat','exclude']);
 await expect(d.locator('[data-destination-grade]')).toContainText('8');
 await d.locator('[name=action]').selectOption('repeat');expect(await d.locator('[name=destinationClassId] option[value]:not([value=""])').evaluateAll(ns=>ns.map(n=>n.textContent))).toEqual(['Grade 7 / C']);
 await d.locator('[name=destinationClassId]').selectOption({label:'Grade 7 / C'});await d.locator('[name=eligibilityReviewed]').check();await d.locator('[name=confirmed]').check();await d.getByRole('button',{name:'Confirm',exact:true}).click();
 expect(await page.evaluate(()=>OrbitSchoolPromotionPreviews.readDraft(OrbitSchoolPromotionPreviews.read().drafts[0].id).items.find(i=>i.academicStudentId==='r1').action)).toBe('repeat');
 await row.locator('[data-review-item]').click();d=page.locator('dialog[open]');
 await d.locator('[name=action]').selectOption('exclude');await expect(d.locator('[data-destination-field]')).toBeHidden();await d.locator('[name=confirmed]').check();await d.getByRole('button',{name:'Confirm',exact:true}).click();
 expect(await page.evaluate(()=>OrbitSchoolPromotionPreviews.readDraft(OrbitSchoolPromotionPreviews.read().drafts[0].id).items.find(i=>i.academicStudentId==='r1').action)).toBe('exclude');
 await page.locator('[data-preview-item]').filter({hasText:'Student 6'}).locator('[data-review-item]').click();d=page.locator('dialog[open]');await expect(d.locator('[name=graduationReview]')).toBeVisible();await d.locator('[name=graduationReview]').check();await d.locator('[name=eligibilityReviewed]').check();await d.locator('[name=confirmed]').check();await d.getByRole('button',{name:'Confirm',exact:true}).click();
 expect(await page.evaluate(()=>OrbitSchoolPromotionPreviews.readDraft(OrbitSchoolPromotionPreviews.read().drafts[0].id).items.find(i=>i.academicStudentId==='r6').action)).toBe('graduation');await page.reload();await expect(page.locator('[data-preview-item]').filter({hasText:'Student 6'})).toContainText('Graduation');
});

test('section labels are display-only and missing destinations offer a target-year configuration path',async({page})=>{
 await page.evaluate(()=>OrbitSchoolSections.remove(dest['10C'].id,'target',OrbitSchoolSections.read().context,true));
 await page.goto(previewRoute);await page.locator('[name=targetYear]').selectOption('target');await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();
 const before=await page.evaluate(()=>localStorage.getItem(OrbitSchoolEnrollments.storageKey()));
 await page.locator('[data-preview-item]').filter({hasText:'Student 3'}).locator('[data-review-item]').click();const d=page.locator('dialog[open]');await expect(d.locator('[data-placement-warning]')).toContainText('No eligible section');await expect(d.locator('[data-placement-warning] a')).toHaveAttribute('href',/academicYear=target/);await expect(d.locator('[name=destinationClassId] option')).toHaveCount(1);await page.keyboard.press('Escape');
 const labels=await page.evaluate(()=>({ar:['A','B','C','D','E','Custom / شعبة'].map(v=>OrbitSchoolSections.sectionLabel(v,'ar')),en:['أ','ب','ج','د','هـ','Custom / شعبة'].map(v=>OrbitSchoolSections.sectionLabel(v,'en'))}));
 expect(labels.ar).toEqual(['أ','ب','ج','د','هـ','Custom / شعبة']);expect(labels.en).toEqual(['A','B','C','D','E','Custom / شعبة']);
 await page.locator('#orbit-language-button').click();await expect(page.locator('html')).toHaveAttribute('lang','ar');await expect(page.locator('[data-preview-item]')).toHaveCount(5);expect(await page.evaluate(()=>localStorage.getItem(OrbitSchoolEnrollments.storageKey()))).toBe(before);
});

test('canonical progression ignores legacy order, keeps identities and requires eligibility',async({page})=>{
 const r=await page.evaluate(()=>{P.saveProgression(['9','7','8'],ctx(),op(),true);const before=protectedSnapshot(),d=draft();return {d,unchanged:JSON.stringify(before)===JSON.stringify(protectedSnapshot()),codes:['7','8','9','10','11','12','Grade 7','الصف السابع'].map(name=>P.canonicalGrade({name}))};});
 expect(r.d.items).toHaveLength(5);expect(r.d.items.find(i=>i.academicStudentId==='r1')).toMatchObject({suggestedGrade:'8',destinationClassId:null,eligibilityReviewed:false});expect(r.d.items.find(i=>i.academicStudentId==='r2')).toMatchObject({suggestedGrade:'9',reviewStatus:'needs-review'});expect(r.d.items.find(i=>i.academicStudentId==='r6')).toMatchObject({action:'manual-review',suggestedGrade:null,diagnostics:['FINAL_GRADE_REVIEW_REQUIRED']});expect(r.codes).toEqual(['7','8','9','10','11','12',null,null]);expect(r.unchanged).toBe(true);
});
test('individual repeats, exceptions and graduation require explicit valid decisions',async({page})=>{
 const r=await page.evaluate(()=>{const d=draft(),before=protectedSnapshot();const unreviewed=decide(d,'r1','promote',dest['8C'].id,false);const wrong=attempt(()=>decide(d,'r1','promote',dest['9C'].id));const missing=attempt(()=>decide(d,'r1','change','missing'));const graduation=attempt(()=>decide(d,'r1','graduation'));const final=resolve(d);return {unreviewed,wrong,missing,graduation,final,unchanged:JSON.stringify(before)===JSON.stringify(protectedSnapshot())};});
 expect(r.unreviewed.diagnostics).toContain('ELIGIBILITY_REVIEW_REQUIRED');expect(r.wrong).toBe('INVALID_DESTINATION');expect(r.missing).toBe('INVALID_DESTINATION');expect(r.graduation).toBe('NOT_FINAL_GRADE');expect(r.final.ready).toBe(true);expect(r.final.summary).toMatchObject({total:5,promote:1,repeat:1,exclude:2,graduation:1,review:0});expect(r.unchanged).toBe(true);
});
test('missing destination grades and sections block execution without creating records',async({page})=>{
 const r=await page.evaluate(()=>{const key=OrbitSchoolSections.storageKey(),db=JSON.parse(localStorage.getItem(key));db.sections=db.sections.filter(q=>q.gradeId!==dest['10C'].gradeId);db.grades=db.grades.filter(q=>q.id!==dest['10C'].gradeId);db.revision++;localStorage.setItem(key,JSON.stringify(db));const before=protectedSnapshot(),d=draft(),v=P.readDraft(d.id);return {item:v.items.find(i=>i.academicStudentId==='r3'),error:attempt(()=>P.executeDraft(d.id,v.context,op(),true)),unchanged:JSON.stringify(before)===JSON.stringify(protectedSnapshot())};});expect(r.item.diagnostics).toContain('DESTINATION_GRADE_MISSING');expect(r.item.diagnostics).toContain('DESTINATION_REQUIRED');expect(r.error).toBe('BLOCKING_ISSUES');expect(r.unchanged).toBe(true);
});
test('conflicting destination enrollment, stale sources, archived years and role restrictions block safely',async({page})=>{
 const r=await page.evaluate(()=>{const E=OrbitSchoolEnrollments;E.enrollSection({academicStudentId:'r1',academicYearId:'target',gradeId:dest['8C'].gradeId,sectionId:dest['8C'].id},E.read().context,op(),true);const d=draft();decide(d,'r1','promote',dest['8C'].id);const conflict=P.readDraft(d.id).items.find(i=>i.academicStudentId==='r1').diagnostics;const years=[['past','target'],['target','source'],['source','past']].map(([a,b])=>attempt(()=>P.createDraft(a,b,ctx(),op(),true)));const key=E.storageKey(),db=JSON.parse(localStorage.getItem(key));db.revision++;localStorage.setItem(key,JSON.stringify(db));const stale=P.readDraft(d.id);const rejected=attempt(()=>decide(d,'r1','exclude'));const session=localStorage.getItem('orbitUser');localStorage.setItem('orbitUser',JSON.stringify({role:'student',email:'student1@preview.test'}));const role=attempt(()=>P.read());localStorage.setItem('orbitUser',session);return {conflict,years,stale:stale.stale,rejected,role};});expect(r.conflict).toContain('DUPLICATE_ENROLLMENT');expect(r.years).toEqual(['SOURCE_NOT_ACTIVE','SOURCE_NOT_ACTIVE','TARGET_NOT_UPCOMING']);expect(r).toMatchObject({stale:true,rejected:'STALE_SOURCE',role:'ROLE_DENIED'});
});
test('saved legacy drafts remain readable and cannot execute obsolete proposals',async({page})=>{
 const r=await page.evaluate(()=>{const d=draft(),key=P.storageKey(),db=JSON.parse(localStorage.getItem(key));db.progression={grades:['9','7','8']};db.drafts[0].progression={grades:['7','9','8']};localStorage.setItem(key,JSON.stringify(db));const saved=localStorage.getItem(key),v=P.readDraft(d.id),error=attempt(()=>P.executeDraft(d.id,v.context,op(),true));return {diagnostics:v.diagnostics,error,preserved:saved===localStorage.getItem(key),fresh:draft().id,old:d.id};});expect(r.diagnostics).toContain('LEGACY_DRAFT_REVIEW_REQUIRED');expect(r.error).toBe('STALE_SOURCE');expect(r.preserved).toBe(true);expect(r.fresh).not.toBe(r.old);
});
test('confirmed execution preserves source history, accounts and years and prevents duplicates',async({page})=>{
 const r=await page.evaluate(()=>{const d=draft(),v=resolve(d),E=OrbitSchoolEnrollments,before=E.read(),accounts=localStorage.getItem('orbit.recruitment.v1'),years=localStorage.getItem(OrbitSchoolYears.storageKey());const unconfirmed=attempt(()=>P.executeDraft(d.id,v.context,op()));const result=P.executeDraft(d.id,v.context,op(),true),again=P.executeDraft(d.id,v.context,op(),true),after=E.read();return {unconfirmed,result,again,source:before.enrollments.filter(e=>e.academicYearId==='source'),afterSource:after.enrollments.filter(e=>e.academicYearId==='source'),target:after.enrollments.filter(e=>e.academicYearId==='target'),placements:after.placements.slice(0,before.placements.length),beforePlacements:before.placements,preserved:accounts===localStorage.getItem('orbit.recruitment.v1')&&years===localStorage.getItem(OrbitSchoolYears.storageKey()),locked:attempt(()=>decide(d,'r1','exclude'))};});expect(r.unconfirmed).toBe('CONFIRMATION_REQUIRED');expect(r.result.status).toBe('completed');expect(r.again).toEqual(r.result);expect(r.target).toHaveLength(2);expect(r.afterSource).toEqual(r.source);expect(r.placements).toEqual(r.beforePlacements);expect(r.preserved).toBe(true);expect(r.locked).toBe('EXECUTION_LOCKED');
});
test('storage failures before and after enrollment commit recover without duplicate writes',async({page})=>{
 const r=await page.evaluate(()=>{const d=draft(),v=resolve(d),E=OrbitSchoolEnrollments,before=localStorage.getItem(E.storageKey()),set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===E.storageKey())throw Error('quota');return set.call(this,k,v);};const first=attempt(()=>P.executeDraft(d.id,v.context,op(),true));Storage.prototype.setItem=set;const unchanged=before===localStorage.getItem(E.storageKey()),pending=P.readDraft(d.id);let count=0;Storage.prototype.setItem=function(k,v){if(k===P.storageKey()&&++count===1)throw Error('audit quota');return set.call(this,k,v);};const result=P.executeDraft(d.id,pending.context,op(),true);Storage.prototype.setItem=set;const recovery=P.readDraft(d.id),done=P.executeDraft(d.id,recovery.context,op(),true);return {first,unchanged,result,recovery,done,targets:E.read().enrollments.filter(e=>e.academicYearId==='target').length};});expect(r.first).toBe('STORAGE_FAILED');expect(r.unchanged).toBe(true);expect(r.result.status).toBe('audit-pending');expect(r.recovery).toMatchObject({executed:true,auditPending:true});expect(r.done.status).toBe('completed');expect(r.targets).toBe(2);
});
test('wizard saves and resumes reviewed decisions with keyboard dialog and explicit final confirmation',async({page})=>{
 await page.goto(previewRoute);await expect(page.locator('[data-grade-available],[data-progression-form]')).toHaveCount(0);await expect(page.locator('.pw-steps button')).toHaveCount(3);await page.locator('[name=targetYear]').selectOption('target');await page.getByRole('button',{name:'Prepare Promotion Preview',exact:true}).click();await expect(page.locator('[data-preview-item]')).toHaveCount(5);
 const row=page.locator('[data-preview-item]').filter({hasText:'Student 1'});await row.getByRole('button',{name:'Review',exact:true}).click();const dialog=page.locator('dialog[open]');await expect(dialog.locator('h2')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(dialog.locator('[data-cancel]')).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(row.getByRole('button',{name:'Review',exact:true})).toBeFocused();
 await row.getByRole('button',{name:'Review',exact:true}).click();await dialog.locator('[name=destinationClassId]').selectOption({index:1});await dialog.locator('[name=eligibilityReviewed]').check();await dialog.locator('[name=confirmed]').check();await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await page.reload();await expect(page.locator('[data-preview-item]').filter({hasText:'Student 1'})).toContainText('Reviewed');
 await page.evaluate(()=>{const P=OrbitSchoolPromotionPreviews,d=P.read().drafts[0];for(const i of P.readDraft(d.id).items.filter(i=>i.academicStudentId!=='r1'))P.saveDecision(d.id,i.id,{action:'exclude'},P.readDraft(d.id).context,crypto.randomUUID(),true);});await page.reload();await page.locator('[data-pw-summary]').click();await page.locator('[data-promotion-review]').click();await expect(dialog.locator('[name=confirmed]')).not.toBeChecked();await dialog.locator('[name=confirmed]').check();await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.locator('[data-promotion-review]')).toBeDisabled();await page.reload();await expect(page.locator('[data-step-title]')).toHaveText('Promotion decisions confirmed');
});
test('empty years, filters, RTL, themes, mobile and reduced motion stay accessible',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await page.evaluate(()=>draft());await page.goto(previewRoute+'&draft='+d.id);await page.locator('[data-pw-search]').fill('Student 1');await expect(page.locator('[data-preview-item]')).toHaveCount(1);await page.locator('[data-pw-search]').fill('');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of ['en','ar']){if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#orbit-language-button').click();await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');for(const theme of ['light','dark']){await page.waitForFunction(()=>typeof window.OrbitThemePreference?.save==='function');await page.evaluate(v=>OrbitThemePreference.save(v),theme);for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);if(width===1440||width===390)await page.screenshot({path:path.join(os.tmpdir(),`promotion-${lang}-${theme}-${width}.png`),fullPage:true});}}}
 expect(errors).toEqual([]);await page.evaluate(()=>{const Y=OrbitSchoolYears,db=Y.read();db.years.find(y=>y.id==='target').status='archived';localStorage.setItem(Y.storageKey(),JSON.stringify(db));});await page.goto(previewRoute);await expect(page.locator('[data-preview-create] [type=submit]')).toBeDisabled();await expect(page.locator('[data-pw-body] a[href="?section=years"]')).toBeVisible();
});
test('300 students balance across existing sections and execute one complete batch',async({page})=>{
 test.setTimeout(120000);await page.goto('/school-management/school-management.html');await page.evaluate(()=>{crypto.subtle.deriveBits=async()=>new Uint8Array(32).buffer;});await page.evaluate(()=>OrbitAcademicDemo.load(true));await page.evaluate(()=>OrbitAcademicDemo.enter());await page.waitForURL('**/school-management/school-management.html?section=overview');
 const r=await page.evaluate(()=>{const P=OrbitSchoolPromotionPreviews,S=OrbitSchoolSections,Y=OrbitSchoolYears;const years=Y.read().years,from=years.find(y=>y.status==='active'),to=years.find(y=>y.status==='upcoming')||Y.save('',{name:'2027–2028',startDate:'2027-09-01',endDate:'2028-06-30'},Y.read());for(const g of ['10','11','12'])for(const name of ['A','B','C']){const v=S.view(to.id),grade=v.grades.find(r=>r.name===g);if(!v.sections.some(q=>q.gradeId===grade?.id&&q.name===name))S.save('',{academicYearId:to.id,gradeId:grade?.id||'',gradeName:grade?undefined:g,name},S.read().context);}
 const d=P.createDraft(from.id,to.id,P.read().context,crypto.randomUUID(),true),before=OrbitSchoolEnrollments.read();P.reviewBatch(d.id,d.items.map(i=>i.id),{action:'promote',distribution:'balanced',eligibilityReviewed:true},P.readDraft(d.id).context,crypto.randomUUID(),true);const v=P.readDraft(d.id),loads={};for(const i of v.items)loads[i.destinationClassId]=(loads[i.destinationClassId]||0)+1;const result=P.executeDraft(d.id,v.context,crypto.randomUUID(),true),after=OrbitSchoolEnrollments.read();return {total:v.items.length,ready:v.ready,loads,result,history:before.enrollments.every(e=>JSON.stringify(e)===JSON.stringify(after.enrollments.find(a=>a.id===e.id))),target:after.enrollments.filter(e=>e.academicYearId===to.id).length};});expect(r.total).toBe(300);expect(r.ready).toBe(true);expect(r.result.status).toBe('completed');expect(r.target).toBe(300);expect(Math.max(...Object.values(r.loads))-Math.min(...Object.values(r.loads))).toBeLessThanOrEqual(1);expect(r.history).toBe(true);
});
