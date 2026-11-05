import { test, expect } from "@playwright/test";
import { setupPeriods } from "./fixtures/period-timetable.js";

const school = "school@preview.test";
const teacher = "teacher1@period.test";
const replacement = "teacher2@period.test";
const student = "student4@period.test";

async function visit(page, role, email, url) {
  await page.evaluate(([role,email]) => localStorage.setItem("orbitUser", JSON.stringify({role,email,name:email})), [role,email]);
  await page.goto(url);
}

test("school channels use reviewed assignments and live enrollment across shared sections", async ({ page }) => {
  await setupPeriods(page);
  const ids = await page.evaluate(() => {
    const T=OrbitSchoolTeaching, E=OrbitSchoolEnrollments;
    T.save(assign.bmath,{academicYearId:"source",sectionId:sec.b,gradeId:sec.grade,teacherId:"t1",subjectId:"math"},T.read("source").context,true,"Shared math");
    const mapping=E.readMappings().mappings.find(m=>m.academicStudentId==="r4");
    E.confirmMapping(mapping.id,"student4@period.test",E.read().context,crypto.randomUUID(),true);
    const enrolled=E.enrollSection({academicStudentId:"r4",academicYearId:"source",sectionId:sec.a,gradeId:sec.grade},E.read().context,crypto.randomUUID(),true);
    return { ...sec, ...assign, enrollmentId:enrolled.id };
  });
  await visit(page,"teacher",teacher,"/channels/channels.html?create=school");
  const create=page.locator("#new-channel");
  await expect(create).toBeVisible();
  await create.locator('[name="workspace"]').selectOption(school);
  await expect(create.locator('[name="assignment"]')).toHaveCount(3);
  await create.locator('[name="name"]').fill("Shared Mathematics");
  await create.locator('[name="description"]').fill("Mathematics for two sections");
  await create.locator('[value="'+ids.amath+'"]').check();
  await create.locator('[value="'+ids.bmath+'"]').check();
  await create.locator('button.btn').click();
  const channel=await page.evaluate(()=>ORBIT.db().channels.find(c=>c.en==="Shared Mathematics"));
  expect(channel).toMatchObject({schoolId:school,teacher,academicYearId:"source",sectionIds:expect.arrayContaining([ids.a,ids.b]),private:true});
  expect(await page.evaluate(({school,ids})=>{try{OrbitChannels.schoolAssociation(school,[ids.futuremath]);return false;}catch{return true;}},{school,ids})).toBe(true);
  const channelRoute="/channel/channel.html?id="+channel.id;
  await page.goto(channelRoute);
  await page.evaluate(id=>ORBIT.editor(id,null,()=>{}),channel.id);
  const editor=page.locator("#publish-form");
  await expect(editor.locator('[name="schoolSection"]')).toHaveCount(2);
  await editor.locator('[name="schoolSection"][value="'+ids.b+'"]').uncheck();
  await editor.locator('[name="title"]').fill("Section A lesson");
  await editor.locator('[name="body"]').fill("Section-specific lesson");
  for (let step=0;step<2;step++) {
    const next=page.locator("dialog[open] .orbit-next:visible");
    if (await next.count()) await next.click();
  }
  await editor.locator('button[type="submit"]:visible').click();
  await expect(editor).toBeHidden();
  await page.evaluate(({channel,ids})=>{
    const db=ORBIT.db();
    db.posts.push({id:"section-a",channel:channel.id,schoolId:channel.schoolId,academicYearId:"source",sectionIds:[ids.a],authorId:channel.teacher,type:"assignment",title:"Section A assignment",body:"Answer here"},
      {id:"section-b",channel:channel.id,schoolId:channel.schoolId,academicYearId:"source",sectionIds:[ids.b],authorId:channel.teacher,type:"assignment",title:"Section B assignment",body:"Answer here"});
    ORBIT.set("orbit.channels.v2",db);
  },{channel,ids});
  await visit(page,"student",student,channelRoute);
  const access=await page.evaluate(id=>({ member:ORBIT.memberships().includes(id), read:OrbitChannels.canRead(OrbitChannels.find(id)),
    visible:OrbitAssignments.visible().map(post=>post.id), raw:OrbitAuth.get("orbit.memberships.v3",{}) }),channel.id);
  expect(access).toMatchObject({member:true,read:true,visible:["section-a"],raw:{}});
  await page.evaluate(async()=>{await OrbitAssignments.submit("section-a",{answer:"My work",files:[]});});
  await visit(page,"school",school,"/school-management/school-management.html?section=monitoring");
  const report=await page.evaluate(({channel,ids})=>{
    const E=OrbitSchoolEnrollments;
    const model=OrbitAnnualMonitoring.report("source");
    const B=OrbitSchoolPeriods;
    B.start("source",ids.b,B.read("source").context);
    const period=B.edit("source",ids.b,{assignmentId:ids.bmath,day:0,period:1,channelId:channel.id},B.read("source").context);
    const before=OrbitAuth.get("orbit.assignments.v1",{}).submissions.find(record=>record.assignmentId==="section-a");
    E.changePlacement(ids.enrollmentId,{academicYearId:"source",sectionId:ids.b,gradeId:ids.grade},"Reviewed move",E.read().context,crypto.randomUUID(),true);
    const T=OrbitSchoolTeaching;
    for(const [id,sectionId] of [[ids.amath,ids.a],[ids.bmath,ids.b]])
      T.save(id,{academicYearId:"source",sectionId,gradeId:ids.grade,teacherId:"t2",subjectId:"math"},T.read("source").context,true,"Approved replacement");
    return {rows:model.rows.filter(row=>row.channelId===channel.id).length,before,period};
  },{channel,ids});
  expect(report).toMatchObject({rows:3,period:{channelId:channel.id},before:{sectionId:ids.a,studentId:student,answer:"My work"}});
  await visit(page,"teacher",teacher,channelRoute);
  expect(await page.evaluate(id=>OrbitChannels.canRead(OrbitChannels.find(id)),channel.id)).toBe(false);
  await visit(page,"school",school,"/channels/channels.html");
  await page.evaluate(({id,replacement})=>OrbitChannels.transfer(id,replacement,"Approved handover"),{id:channel.id,replacement});
  await visit(page,"student",student,channelRoute);
  expect(await page.evaluate(()=>OrbitAssignments.visible().map(post=>post.id))).toEqual(["section-b"]);
  await expect(page.getByText("Section A lesson", {exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>OrbitAuth.get("orbit.assignments.v1",{}).submissions.find(row=>row.assignmentId==="section-a"))).toEqual(report.before);
  await visit(page,"school",school,"/school-management/school-management.html?section=years");
  await page.evaluate(()=>OrbitSchoolYears.activate("target",OrbitSchoolYears.read(),true));
  await visit(page,"student",student,channelRoute);
  expect(await page.evaluate(id=>({read:OrbitChannels.canRead(OrbitChannels.find(id)),write:OrbitChannels.admitted(OrbitChannels.find(id)),member:ORBIT.memberships().includes(id)}),channel.id)).toEqual({read:true,write:false,member:false});
});

test("school channel creation dialog supports both directions, themes and three viewport sizes", async ({page}, info) => {
  test.setTimeout(60000);
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await setupPeriods(page);
  await visit(page,"teacher",teacher,"/channels/channels.html?create=school");
  for(const lang of ["en","ar"]){
    if(await page.locator("html").getAttribute("lang")!==lang){
      await page.locator("dialog[open] .close").click();
      await page.locator("#orbit-language-button").click();
    }
    await expect(page.locator("html")).toHaveAttribute("dir",lang==="en"?"ltr":"rtl");
    const dialog=page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(lang==="en"?"Create a learning space":"أنشئ مساحة للتعلم");
    await dialog.locator('[name="workspace"]').selectOption(school);
    await expect(dialog.locator('[name="assignment"]').first()).toBeVisible();
    for(const theme of ["light","dark"]){
      await page.waitForFunction(()=>typeof window.OrbitThemePreference?.save==="function");
      await page.evaluate(theme=>OrbitThemePreference.save(theme),theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme",theme);
      for(const width of [1440,768,390]){
        await page.setViewportSize({width,height:900});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
        await dialog.screenshot({path:info.outputPath(lang+"-"+theme+"-"+width+".png"),animations:"disabled"});
      }
    }
    await dialog.locator('[name="assignment"]').first().focus();
    await page.keyboard.press("Space");
    await expect(dialog.locator('[name="assignment"]').first()).toBeChecked();
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
