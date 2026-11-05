import { test, expect } from '@playwright/test';
import { setupPeriods } from './fixtures/period-timetable.js';

const school = 'school@preview.test';
const teacher = 'teacher1@period.test';
const student = 'student4@period.test';
async function visit(page, role, email, route) {
  await page.evaluate(({role,email}) => OrbitAuth.startSession({role,email,name:email}), {role,email});
  await page.goto(route);
}

test('reviewed promotion and activation preserve work, revoke old writes and admit only the new section', async ({page}) => {
  await setupPeriods(page);
  const ids = await page.evaluate(() => {
    const E = OrbitSchoolEnrollments, mapping = E.readMappings().mappings.find(m => m.academicStudentId === 'r4');
    E.confirmMapping(mapping.id, 'student4@period.test', E.read().context, crypto.randomUUID(), true);
    E.enrollSection({academicStudentId:'r4',academicYearId:'source',sectionId:sec.a,gradeId:sec.grade}, E.read().context, crypto.randomUUID(), true);
    fill(); pub(); fill(sec.future, 'target'); pub([sec.future], 'target');
    return {...sec, assignment:assign.amath, futureAssignment:assign.futuremath};
  });
  async function createChannel(name, assignment) {
    await visit(page, 'teacher', teacher, '/channels/channels.html?create=school');
    const form = page.locator('#new-channel');
    await form.locator('[name="workspace"]').selectOption(school);
    await form.locator(`[value="${assignment}"]`).check();
    await form.locator('[name="name"]').fill(name);
    await form.locator('[name="description"]').fill('Reviewed section mathematics');
    await form.locator('button.btn').click();
    return page.evaluate(name => ORBIT.db().channels.find(c => c.en === name), name);
  }
  const channel = await createChannel('Current mathematics', ids.assignment);
  await page.goto('/channel/channel.html?id=' + channel.id);
  // The creation UI above explicitly authorizes the school association; seed only lesson content here.
  await page.evaluate(channel => {
    const db = ORBIT.db();
    db.posts.push({id:'transition-assignment',channel:channel.id,schoolId:channel.schoolId,
      academicYearId:channel.academicYearId,sectionIds:channel.sectionIds,authorId:channel.teacher,
      type:'assignment',title:'Year-end reasoning',body:'Explain your reasoning.'});
    ORBIT.set('orbit.channels.v2',db);
  }, channel);
  const route = '/channel/channel.html?id=' + channel.id;
  await visit(page, 'student', student, route);
  await page.evaluate(() => OrbitAssignments.submit('transition-assignment',{answer:'My final-year reasoning',files:[]}));
  await visit(page, 'teacher', teacher, route);
  expect(await page.evaluate(() => OrbitAssignments.notifications().some(n => n.assignmentId === 'transition-assignment'))).toBe(true);
  await page.evaluate(student => {
    const record = OrbitAssignments.records('transition-assignment').find(r => r.studentId === student);
    OrbitAssignments.review('transition-assignment',student,{feedback:'Ready for next year',grade:96},record.revision);
  }, student);
  await visit(page, 'student', student, route);
  expect(await page.evaluate(() => OrbitAssignments.notifications().some(n => n.en.includes('reviewed')))).toBe(true);
  const work = await page.evaluate(() => localStorage.getItem('orbit.assignments.v1'));
  await visit(page, 'school', school, '/school-management/school-management.html?section=students&view=promotions&targetYear=target');
  const history = await page.evaluate(ids => {
    const E = OrbitSchoolEnrollments, before = E.read();
    const choices = [{academicStudentId:'r4',sectionId:ids.future,gradeId:ids.grade}];
    const preview = E.previewPromotion('source','target',choices);
    E.promoteBatch('source','target',choices,preview.context,crypto.randomUUID(),true);
    return before;
  }, ids);
  // Publication and promotion do not activate the destination or create channels.
  expect(await page.evaluate(() => OrbitSchoolYears.read().activeYearId)).toBe('source');
  await page.goto('/school-management/school-management.html?section=years');
  await page.locator('[data-year-activate="target"]').click();
  await page.locator('dialog[open]').getByRole('button',{name:'Confirm activation',exact:true}).click();
  const retained = await page.evaluate(() => OrbitSchoolEnrollments.read());
  expect(retained.enrollments.filter(e => e.academicYearId === 'source')).toEqual(history.enrollments.filter(e => e.academicYearId === 'source'));
  expect(retained.placements.filter(p => history.placements.some(old => old.id === p.id))).toEqual(history.placements);
  expect(await page.evaluate(() => OrbitAuth.get('orbit.channels.v2',{}).channels.length)).toBe(1);
  await visit(page, 'student', student, route);
  expect(await page.evaluate(id => ({read:OrbitChannels.canRead(OrbitChannels.find(id)),write:OrbitChannels.admitted(OrbitChannels.find(id))}),channel.id)).toEqual({read:true,write:false});
  await expect(page.evaluate(() => OrbitAssignments.submit('transition-assignment',{answer:'Overwrite history',files:[]}))).rejects.toThrow();
  expect(await page.evaluate(() => OrbitAssignments.records('transition-assignment')[0].review.grade)).toBe(96);
  await page.goto('/student-dashboard/student-dashboard.html');
  expect(await page.evaluate(() => OrbitSchoolPeriods.memberRead('school@preview.test').tables.map(t => t.academicYearId))).toEqual(['target']);
  await visit(page, 'teacher', teacher, route);
  expect(await page.evaluate(student => {try{OrbitAssignments.review('transition-assignment',student,{grade:1},2);return false;}catch{return true;}},student)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('orbit.assignments.v1'))).toBe(work);
  const next = await createChannel('Next-year mathematics', ids.futureAssignment);
  await visit(page, 'student', student, '/channel/channel.html?id=' + next.id);
  expect(await page.evaluate(id => OrbitChannels.admitted(OrbitChannels.find(id)), next.id)).toBe(true);
  expect(await page.evaluate(() => OrbitAuth.get('orbit.memberships.v3',{}))).toEqual({});
  await visit(page, 'student', 'student1@preview.test', '/channel/channel.html?id=' + next.id);
  expect(await page.evaluate(id => OrbitChannels.canRead(OrbitChannels.find(id)), next.id)).toBe(false);
});

test('monitoring focus ring uses the accessible theme token in light and dark modes', async ({page}, info) => {
  await setupPeriods(page);
  await page.evaluate(() => {
    localStorage.setItem('orbit.channels.v2',JSON.stringify({channels:[],posts:[]}));
  });
  await page.goto('/school-management/school-management.html?section=monitoring');
  for (const theme of ['light','dark']) {
    await page.waitForFunction(() => !!window.OrbitThemePreference);
    await page.evaluate(theme => OrbitThemePreference.save(theme), theme);
    const control = page.locator('[data-annual-search]');
    await control.focus();
    const colors = await control.evaluate(node => ({outline:getComputedStyle(node).outlineColor,
      token:getComputedStyle(node).getPropertyValue('--orbit-focus').trim()}));
    // Resolve the token through the browser rather than comparing hex to rgb strings.
    const expected = await page.evaluate(token => {const node=document.createElement('i');node.style.color=token;document.body.append(node);const color=getComputedStyle(node).color;node.remove();return color;},colors.token);
    expect(colors.outline).toBe(expected);
    await page.screenshot({path:info.outputPath('monitoring-'+theme+'.png'),fullPage:true});
  }
});

test('monitoring bulk selection follows visible editable records, resets with filters and preserves archive restrictions', async ({page}, info) => {
  await setupPeriods(page);
  await page.evaluate(() => {
    const schoolId='school@preview.test';
    localStorage.setItem('orbit.channels.v2',JSON.stringify({channels:[{id:'bulk-channel',en:'Section mathematics',schoolId,
      academicYearId:'source',sectionId:sec.a,subjectId:'math',teacher:'teacher1@period.test'}],
      posts:[0,1,2].map(i=>({id:'bulk-'+i,channel:'bulk-channel',type:'lesson',title:'Lesson '+i,
        body:'A reviewed mathematics lesson.',moderationStatus:i===2?'hidden':undefined,createdAt:'2030-10-01T10:00:00Z'}))}));
  });
  await page.goto('/school-management/school-management.html?section=monitoring');
  const panel=page.locator('[data-annual-monitoring]'), all=panel.locator('[data-all]');
  await panel.locator('[data-tab="lessons"]').click();
  await expect(panel.locator('.sm-annual-row')).toHaveCount(3);
  await expect(panel.locator('[name="post"]')).toHaveCount(2);
  await all.focus(); await page.keyboard.press('Space');
  await expect(all).toBeFocused();
  await expect(panel.locator('[name="post"]:checked')).toHaveCount(2);
  await panel.locator('[name="post"]').first().uncheck();
  expect(await all.evaluate(node=>node.indeterminate)).toBe(true);
  await panel.locator('[data-annual-search]').fill('Lesson 1');
  await expect(panel.locator('[name="post"]:checked')).toHaveCount(0);
  await all.check();
  await panel.locator('[data-action="request"]').click();
  const review=page.locator('dialog[open]');
  await review.locator('[name="reason"]').fill('Please verify this lesson.');
  await review.locator('[type="checkbox"]').check();
  await review.locator('[type="submit"]').click();
  await expect(panel.locator('[data-feedback]')).toHaveText('Review action recorded.');
  expect(await page.evaluate(()=>OrbitAnnualMonitoring.report('source').reviews.map(r=>r.postId))).toEqual(['bulk-1']);
  await all.check();
  for(const lang of ['en','ar']) {
    if(await page.locator('html').getAttribute('lang')!==lang) await page.locator('#orbit-language-button').click();
    await panel.locator('[data-tab="lessons"]').click();
    for(const theme of ['light','dark']) {
      await page.waitForFunction(()=>!!window.OrbitThemePreference);
      await page.evaluate(theme=>OrbitThemePreference.save(theme),theme);
      for(const width of [1440,768,390]) {
        await page.setViewportSize({width,height:1000});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await expect(all).toHaveAccessibleName(lang==='en'?'Select this page':'تحديد هذه الصفحة');
        if(width!==768) await page.screenshot({path:info.outputPath(`${lang}-${theme}-${width}.png`),fullPage:true});
      }
    }
  }
  await panel.locator('[data-annual-search]').fill('not present');
  await expect(all).toBeDisabled();
  await page.evaluate(()=>OrbitSchoolYears.activate('target',OrbitSchoolYears.read(),true));
  await page.reload();
  await page.locator('[data-school-year]').selectOption('source');
  await expect(all).toHaveCount(0);
  await expect(panel.locator('[name="post"]')).toHaveCount(0);
});
