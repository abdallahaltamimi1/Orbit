import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";

test("annual monitoring scopes content and protects archived review actions", () => {
  const store = new Map();
  const year = { id: "year", status: "active" };
  const channel = { id: "channel", schoolId: "school", academicYearId: "year", sectionId: "section", subjectId: "math", teacher: "teacher" };
  store.set("orbit.channels.v2", JSON.stringify({
    channels: [channel, { ...channel, id: "legacy", academicYearId: null }, { ...channel, id: "foreign", schoolId: "other" }],
    posts: [
      { id: "old", channel: "channel", type: "lesson", createdAt: "2026-01-01" },
      { id: "new", channel: "channel", type: "assignment", createdAt: "2026-02-01" },
      { id: "foreign-post", channel: "foreign", type: "lesson" }
    ]
  }));
  store.set("orbit.assignments.v1", JSON.stringify({ submissions: [
    { assignmentId: "new", channelId: "channel", studentId: "student", revision: 1, submittedAt: "2026-03-01",
      review: { teacherId: "teacher", grade: 90, reviewedAt: "2026-03-02" } },
    { assignmentId: "new", channelId: "foreign", studentId: "student", revision: 2, submittedAt: "2026-03-01" }
  ] }));
  const context = {
    window: {}, crypto: { randomUUID }, localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value)
    },
    OrbitAuth: { current: () => ({ role: "school", email: "school" }), schoolStudentAccess: () => true },
    OrbitSchoolAcademicReadModel: { read: () => ({ enrollments: [{ id: "enrollment", accountId: "student" }], students: [{ enrollmentId: "enrollment", name: "Student", verification: "verified", currentPlacement: { sectionId: "section" }, identity: { status: "confirmed", accountId: "student" } }] }) },
    OrbitSchoolYearContext: { read: () => ({ selectedYear: year }), readOnly: () => year.status === "archived" },
    OrbitSchoolTeaching: { read: () => ({
      selectedYear: year, sections: [{ id: "section", gradeId: "grade" }],
      grades: [], teachers: [], subjects: [],
      assignments: [{ sectionId: "section", subjectId: "math", teacherId: "faculty" }],
      accounts: [{ teacherId: "faculty", accountId: "teacher", status: "active" }]
    }) }
  };
  vm.runInNewContext(readFileSync(new URL("../shared/school-annual-monitoring.js", import.meta.url), "utf8"), context);
  const service = context.window.OrbitAnnualMonitoring;
  expect(service.report("year").rows.map(row => row.id)).toEqual(["new", "old"]);
  expect(service.report("year").rows[0].progress[0].evaluation.grade).toBe(90);
  year.status = "upcoming";
  expect(service.report("year").rows[0].progress).toEqual([]);
  year.status = "active";
  expect(service.report("year").unresolved).toHaveLength(1);
  expect(() => service.review("year", ["foreign-post"], "hide", "Reason")).toThrow("CONTENT_UNAVAILABLE");
  service.review("year", ["new"], "request", "Check the wording");
  expect(JSON.parse(store.get("orbit.assignments.v1")).notifications[0].recipient).toBe("teacher");
  service.review("year", ["old"], "hide", "Review confirmed");
  expect(service.report("year").rows.find(row => row.id === "old").hidden).toBe(true);
  expect(service.report("year").reviews).toHaveLength(2);
  year.status = "archived";
  expect(service.report("year").rows[0].progress[0].evaluation.grade).toBe(90);
  expect(() => service.review("year", ["new"], "hide", "Reason")).toThrow("ARCHIVED_YEAR");
});
import { setupPeriods } from "./fixtures/period-timetable.js";

test("connected monitoring shows coverage and completes a reopened correction", async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await setupPeriods(page);
  await page.evaluate(() => {
    fill();
    pub();
    B.start("source", sec.b, bc());
    const schoolId = "school@preview.test";
    localStorage.setItem("orbit.channels.v2", JSON.stringify({
      channels: [{ id: "math-channel", en: "Mathematics", schoolId, academicYearId: "source",
        sectionId: sec.a, subjectId: "math", teacher: "teacher1@period.test" }],
      posts: Array.from({ length: 45 }, (_, index) => ({
        id: "lesson-" + index, channel: "math-channel", type: "lesson", title: "Long lesson title " + index + "X".repeat(90),
        body: "Connected sample content", createdAt: new Date(2026, 1, index + 1).toISOString()
      }))
    }));
  });
  await page.goto("/school-management/school-management.html?section=monitoring");
  const dashboard = page.locator("[data-annual-monitoring]");
  await dashboard.locator('[data-tab="lessons"]').click();
  await expect(dashboard.locator(".sm-annual-row")).toHaveCount(20);
  await dashboard.locator(".am-advanced summary").click();
  await dashboard.locator("[data-coverage]").click();
  await expect(page.locator("dialog.am-dialog")).toContainText(/Published timetable|جدول منشور/);
  await expect(page.locator("dialog.am-dialog")).toContainText(/Draft only|مسودة فقط/);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog.am-dialog")).toHaveCount(0);
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    for (const theme of ["light", "dark"]) {
      await page.waitForFunction(() => typeof OrbitThemePreference !== "undefined");
      await page.evaluate(value => OrbitThemePreference.save(value), theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        if(lang==='en'&&theme==='light'&&[1440,390].includes(width)) await page.screenshot({path:'C:/Users/user/AppData/Local/Temp/orbit-academic-'+width+'.png',fullPage:true});
      }
    }
  }
  expect(errors).toEqual([]);
  await dashboard.locator('[data-tab="lessons"]').click();
  await dashboard.locator("[data-annual-search]").fill("title 44X");
  await expect(dashboard.locator(".sm-annual-row")).toHaveCount(1);
  const schoolRoute = "/school-management/school-management.html?section=monitoring";
  const teacherRoute = "/teacher-dashboard/teacher-dashboard.html";
  async function visitAs(role, email, route) {
    await page.evaluate(([role, email]) => localStorage.setItem("orbitUser", JSON.stringify({ role, email, name: email })), [role, email]);
    await page.goto(route);
  }
  await dashboard.locator('[name="post"]').check();
  await dashboard.locator('[data-action="request"]').click();
  await page.locator('dialog [name="reason"]').fill("Please verify the lesson");
  await page.locator('dialog [type="checkbox"]').check();
  await page.locator('dialog [type="submit"]').click();
  await visitAs("teacher", "teacher2@period.test", teacherRoute);
  await expect(page.locator("[data-review-request]")).toHaveCount(0);
  await visitAs("teacher", "teacher1@period.test", teacherRoute);
  let form = page.locator("[data-review-request]");
  await expect(form.locator("..").locator("a")).toHaveAttribute("href", /post=lesson-44$/);
  await form.locator('[name="response"]').fill("Updated lesson");
  await form.locator('button[value="corrected"]').click();
  await expect(form.locator("[role=status]")).toBeFocused();
  await visitAs("school", "school@preview.test", schoolRoute);
  await dashboard.locator("[data-reviews]").first().click();
  const historyPanel = page.locator("dialog.am-dialog");
  form = historyPanel.locator("[data-review-decision]");
  await form.locator('[name="response"]').fill("Check the example");
  await form.locator('button[value="reopened"]').click();
  await visitAs("teacher", "teacher1@period.test", teacherRoute);
  form = page.locator("[data-review-request]");
  await form.locator('[name="response"]').fill("The example is accurate");
  await form.locator('button[value="explained"]').click();
  await visitAs("school", "school@preview.test", schoolRoute);
  await dashboard.locator("[data-reviews]").first().click();
  form = historyPanel.locator("[data-review-decision]");
  await form.locator('[name="response"]').fill("Verified");
  await form.locator('button[value="closed"]').click();
  const history = await page.evaluate(() => OrbitAnnualMonitoring.report("source").reviews[0].history);
  expect(history.map(item => item.status)).toEqual(["responded", "reopened", "responded", "closed"]);
});

test('monitoring discloses assignment metadata on demand, filters context and protects archived records', async ({page})=>{
  await setupPeriods(page);
  await page.evaluate(()=>{
    const schoolId='school@preview.test';
    localStorage.setItem('orbit.channels.v2',JSON.stringify({channels:[
      {id:'math-a',en:'Mathematics C',schoolId,academicYearId:'source',sectionId:sec.a,subjectId:'math',teacher:'teacher1@period.test'},
      {id:'science-b',en:'Science D',schoolId,academicYearId:'source',sectionId:sec.b,subjectId:'science',teacher:'teacher1@period.test'}
    ],posts:[{id:'assignment-a',channel:'math-a',type:'assignment',title:'Review mathematics',body:'Private preview content',createdAt:'2026-01-01T10:00:00Z',dueDate:'2026-01-10'}]}));
  });
  await page.goto('/school-management/school-management.html?section=monitoring');
  const root=page.locator('[data-annual-monitoring]');
  await root.locator('[data-tab="assignments"]').click();
  await expect(root).not.toContainText('Private preview content');
  await root.locator('[data-detail]').click();
  const modal=page.locator('dialog.am-dialog');
  await expect(modal.locator('.am-summary')).toBeVisible();
  await expect(modal.locator('[data-students-host] li')).toHaveCount(0);
  await modal.locator('[data-students]').click();
  await expect(modal.locator('[data-students-host] input')).toBeVisible();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:'C:/Users/user/AppData/Local/Temp/orbit-academic-modal-'+width+'.png'});
  }
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(root.locator('[data-detail]')).toBeFocused();
  const sectionId=await page.evaluate(()=>OrbitAnnualMonitoring.report("source").channels.find(x=>x.id==="math-a").sectionIds[0]);
  await root.locator('[data-annual-filter="sectionId"]').selectOption(sectionId);
  await expect(root.locator('[data-annual-filter="subjectId"] option')).toHaveCount(2);
  await root.locator('[data-tab="channels"]').focus();
  await page.keyboard.press(await page.locator('html').getAttribute('dir')==='rtl'?'ArrowLeft':'ArrowRight');
  await expect(root.locator('[data-tab="lessons"]')).toHaveAttribute('aria-selected','true');
  const stored=await page.evaluate(()=>localStorage.getItem('orbit.channels.v2'));
  await page.evaluate(()=>{
    const k=OrbitSchoolYears.storageKey(),v=JSON.parse(localStorage.getItem(k));
    v.years.find(x=>x.id==='source').status='archived';v.activeYearId=null;localStorage.setItem(k,JSON.stringify(v));
  });
  await page.reload();
  await root.locator('[data-tab="assignments"]').click();
  await expect(root.locator('[name="post"]')).toHaveCount(0);
  await root.locator('[data-detail]').click();
  await expect(modal.locator('[data-request],[data-hide]')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem('orbit.channels.v2'))).toBe(stored);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
