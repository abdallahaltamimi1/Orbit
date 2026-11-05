import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const route = "/school-management/school-management.html";
async function open(page, section = "students") {
  await page.goto("/login/login.html");
  await page.locator('[data-user="school"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/school-dashboard/school-dashboard.html");
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ ...p, lang: "en" }));
  });
  await page.goto(`${route}?section=${section}`);if(section==='students')await legacyStudents(page);
}
async function legacyStudents(page){await page.locator('[data-student-advanced]').evaluate(e=>e.open=true);const roster=page.locator('[data-student-roster]');if(!await roster.evaluate(e=>e.open))await roster.locator(':scope > summary').click();await expect(page.locator('[data-academic-table]')).toBeVisible();}
const dialog = (page) => page.locator(".sm-academic-dialog[open]");
async function save(page) {
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
}
async function add(page, kind, values) {
  await page.locator(`[data-add-kind="${kind}"]`).evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
  await page.locator(`[data-add-kind="${kind}"]`).click();
  for (const [key, value] of Object.entries(values)) {
    const field = dialog(page).locator(`[name="${key}"]`);
    if (await field.evaluate((el) => el.tagName === "SELECT")) await field.selectOption(value);
    else await field.fill(value);
  }
  await save(page);
}
async function data(page) { return page.evaluate(() => OrbitSchoolAcademics.read()); }
async function section(page, name) { if (page.viewportSize().width <= 780) await page.locator("#orbit-mobile-toggle").click(); await page.locator(`#orbit-rail a[href$="?section=${name}"]`).click();if(name==='students')await legacyStudents(page);if(name==='classes')await page.locator('[data-existing-classes]').evaluate(el=>{el.open=true;el.closest('[data-sections-advanced]').open=true;}); }
const record = (page, id) => page.locator(`[data-record-id="${id}"]`);

test("student CRUD, validation, class counts, filters and persistence", async ({ page }) => {
  await open(page);
  let db = await data(page);
  const classId = db.classes[0].id;
  await add(page, "students", { name: "Test learner", studentCode: "TEST-S01", classId, status: "inactive" });
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator("[data-academic-feedback]")).toHaveText("Changes saved in this browser.");
  const student = (await data(page)).students.find((r) => r.studentCode === "TEST-S01");
  await expect(record(page, student.id)).toContainText("Inactive");
  await page.reload();await legacyStudents(page);
  await expect(record(page, student.id)).toContainText("Test learner");
  await add(page, "students", { name: "Duplicate", studentCode: " test-s01 " });
  await expect(dialog(page).getByRole("alert")).toContainText("already used");
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await page.locator("[data-academic-search]").fill("test-s01");
  await expect(page.locator("[data-academic-table] tbody tr")).toHaveCount(1);
  await page.locator("[data-academic-status]").selectOption("enrolled");
  await expect(page.locator("[data-academic-table] .sm-empty")).toBeVisible();
  await page.locator("[data-academic-status]").selectOption("inactive");
  await page.locator("[data-academic-class]").selectOption(classId);
  await expect(record(page, student.id)).toBeVisible();
  await record(page, student.id).locator("[data-edit-kind]").click();
  await expect(dialog(page)).toHaveAccessibleName("Edit record");
  await dialog(page).locator('[name="name"]').fill("Updated learner");
  await dialog(page).locator('[name="studentCode"]').fill("TEST-S02");
  await save(page);
  expect((await data(page)).students.find((r) => r.id === student.id).studentCode).toBe("TEST-S02");
  await page.locator("[data-academic-search]").fill("");
  await record(page, student.id).locator("[data-remove-kind]").click();
  await expect(dialog(page).getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog(page).getByRole("button", { name: "Remove", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("Clear this student's class");
  await page.keyboard.press("Escape");
  await expect(record(page, student.id).locator("[data-remove-kind]")).toBeFocused();
  await section(page, "classes");
  await expect(record(page, classId).locator("td").nth(2)).toHaveText("2");
  await section(page, "students");
  await record(page, student.id).locator("[data-edit-kind]").click();
  await dialog(page).locator('[name="classId"]').selectOption("");
  await save(page);
  await record(page, student.id).locator("[data-remove-kind]").click();
  await dialog(page).getByRole("button", { name: "Remove", exact: true }).click();
  await expect(record(page, student.id)).toHaveCount(0);
  await page.reload();
  expect((await data(page)).students.some((r) => r.id === student.id)).toBe(false);
});

test("class, teacher and subject CRUD retain stable links, prevent duplicates and archive safely",async({page})=>{
 await open(page);const r=await page.evaluate(()=>{const S=OrbitSchoolAcademics,save=(kind,v,id='')=>S.save(kind,id,v,S.read()),attempt=f=>{try{f();return null;}catch(e){return e.message;}};const invalid=attempt(()=>save('classes',{grade:'9',section:'C',academicYear:'2026-2028'})),c=save('classes',{grade:'9',section:'C',academicYear:'2026-2027'}),duplicateClass=attempt(()=>save('classes',{grade:'9',section:' c ',academicYear:'2026-2027'})),teacher=save('teachers',{name:'Test teacher',teacherCode:'TEST-T01'}),duplicateTeacher=attempt(()=>save('teachers',{name:'Duplicate',teacherCode:'test-t01'})),subject=save('subjects',{name:'Test subject'}),allocation=save('allocations',{teacherId:teacher.id,subjectId:subject.id,classId:c.id}),duplicateAssignment=attempt(()=>save('allocations',{teacherId:teacher.id,subjectId:subject.id,classId:c.id}));save('teachers',{name:'Renamed teacher',teacherCode:teacher.teacherCode},teacher.id);save('subjects',{name:'Renamed subject'},subject.id);save('classes',{...c,section:'D'},c.id);S.archive('classes',c.id,S.read());S.archive('subjects',subject.id,S.read());const linked=attempt(()=>S.remove('teachers',teacher.id,S.read())),preserved=S.read().allocations.find(a=>a.id===allocation.id);S.remove('allocations',allocation.id,S.read());S.remove('teachers',teacher.id,S.read());return {invalid,duplicateClass,duplicateTeacher,duplicateAssignment,linked,preserved,allocation,teacherRemoved:!S.read().teachers.some(t=>t.id===teacher.id),class:S.read().classes.find(r=>r.id===c.id)};});expect(r).toMatchObject({invalid:'INVALID_YEAR',duplicateClass:'DUPLICATE_CLASS',duplicateTeacher:'DUPLICATE_TEACHER',duplicateAssignment:'DUPLICATE_ALLOCATION',linked:'LINKED_RECORD',teacherRemoved:true,class:{section:'D',status:'archived'}});expect(r.preserved).toEqual(r.allocation);
});

test("school separation, scoped references, stale edits, empty persistence and protected stores", async ({ page }) => {
  await open(page);
  const result = await page.evaluate(() => {
    const S = OrbitSchoolAcademics;
    const protectedKeys = ["orbit.recruitment.v1", "orbit.school.members.v1", "orbit.memberships.v3", "orbit.channels.v2", "orbit.assignments.v1", "orbit.meetings.v1", "orbit.subscriptions.v1"];
    const before = protectedKeys.map((k) => localStorage.getItem(k));
    const first = S.read(), oldContext = { schoolId: first.schoolId, revision: first.revision };
    const student = S.save("students", "", { name: "First only", studentCode: "SAME-ID", status: "enrolled" }, first);
    let stale;
    try { S.save("students", "", { name: "Stale", studentCode: "OTHER", status: "enrolled" }, oldContext); } catch (e) { stale = e.message; }
    const firstSaved = localStorage.getItem(S.storageKey());
    const auth = OrbitAuth.current;
    OrbitAuth.current = () => ({ role: "school", email: "second@school.test" });
    const second = S.read();
    const other = S.save("students", "", { name: "Second only", studentCode: "SAME-ID", status: "enrolled" }, second);
    let foreign, changed;
    try { S.save("students", other.id, { name: "Foreign", studentCode: "OTHER", status: "enrolled", classId: first.classes[0].id }, S.read()); } catch (e) { foreign = e.message; }
    try { S.remove("students", student.id, S.read()); } catch (e) { changed = e.message; }
    let wrongSchool;
    try { S.save("subjects", "", { name: "Wrong school" }, first); } catch (e) { wrongSchool = e.message; }
    const secondData = S.read();
    const secondValid = ["students", "teachers", "classes", "subjects", "allocations"].every((k) => secondData[k].every((r) => r.schoolId === second.schoolId));
    OrbitAuth.current = auth;
    const firstUntouched = localStorage.getItem(S.storageKey()) === firstSaved;
    const empty = S.read();
    for (const kind of ["students", "teachers", "classes", "subjects", "allocations"]) empty[kind] = [];
    localStorage.setItem(S.storageKey(), JSON.stringify(empty));
    const emptyRead = S.read();
    return { stale, foreign, changed, wrongSchool, secondValid, firstUntouched, protectedUnchanged: JSON.stringify(before) === JSON.stringify(protectedKeys.map((k) => localStorage.getItem(k))), emptyCounts: [emptyRead.students.length, emptyRead.classes.length], emptyKey: S.storageKey() };
  });
  expect(result).toMatchObject({ stale: "STALE_DATA", foreign: "NOT_FOUND", changed: "NOT_FOUND", wrongSchool: "SCHOOL_CHANGED", secondValid: true, firstUntouched: true, protectedUnchanged: true, emptyCounts: [0, 0] });
  await page.reload();await legacyStudents(page);
  await expect(page.locator("[data-academic-table] .sm-empty")).toBeVisible();
  expect((await data(page)).students).toEqual([]);
});

test("archiving preserves student links, prevents new links and local errors preserve saved data", async ({ page }) => {
  await open(page);
  const result = await page.evaluate(() => {
    const S = OrbitSchoolAcademics;
    const db = S.read(), classroom = db.classes[0];
    S.archive("classes", classroom.id, db);
    const retained = S.read().students.some((r) => r.classId === classroom.id);
    let archived;
    try { S.save("students", "", { name: "New", studentCode: "NEW", status: "enrolled", classId: classroom.id }, S.read()); } catch (e) { archived = e.message; }
    const before = localStorage.getItem(S.storageKey());
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.startsWith(S.prefix)) throw Error("QuotaExceededError"); return set.call(this, key, value); };
    let storage;
    try { S.save("subjects", "", { name: "No space" }, S.read()); } catch (e) { storage = e.message; }
    Storage.prototype.setItem = set;
    return { retained, archived, storage, unchanged: before === localStorage.getItem(S.storageKey()) };
  });
  expect(result).toEqual({ retained: true, archived: "ARCHIVED_RECORD", storage: "STORAGE_FAILED", unchanged: true });
  await page.evaluate(() => {
    const db = OrbitSchoolAcademics.read();
    db.students[0].schoolId = "other@school.test";
    localStorage.setItem(OrbitSchoolAcademics.storageKey(), JSON.stringify(db));
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("has not been replaced");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem(OrbitSchoolAcademics.storageKey())).students[0].schoolId)).toBe("other@school.test");
  await page.evaluate(() => localStorage.setItem(OrbitSchoolAcademics.storageKey(), "broken-json"));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("has not been replaced");
  expect(await page.evaluate(() => localStorage.getItem(OrbitSchoolAcademics.storageKey()))).toBe("broken-json");
});

test("academic tables and accessible dialogs support both languages, directions, themes and mobile", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) {
      await page.locator("#orbit-language-button").click();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    }
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "en" ? "ltr" : "rtl");
    for (const theme of ["light", "dark"]) {
      await page.waitForFunction(() => typeof window.OrbitThemePreference?.save === "function");
      await page.evaluate((value) => OrbitThemePreference.save(value), theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const kind of ["students", "classes"]) {
          await section(page, kind);
          await expect(page.locator("[data-academic-table]")).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          await page.locator(`[data-add-kind="${kind}"]`).click();
          await expect(dialog(page)).toHaveAccessibleName(lang === "en" ? { students: "Add student", teachers: "Add teacher", classes: "Create class", subjects: "Create subject" }[kind] : { students: "إضافة طالب", teachers: "إضافة معلم", classes: "إنشاء صف", subjects: "إنشاء مادة" }[kind]);
          expect(await dialog(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
          expect(await dialog(page).evaluate((el) => el.getBoundingClientRect().width <= innerWidth && el.getBoundingClientRect().height <= innerHeight)).toBe(true);
          if (kind === "students") await page.screenshot({ path: path.join(os.tmpdir(), `orbit-academics-dialog-${lang}-${theme}-${width}.png`), fullPage: true });
          await page.keyboard.press("Escape");
          await expect(page.locator(`[data-add-kind="${kind}"]`)).toBeFocused();
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

// Grouped teacher disclosure and responsive drawer coverage: school-people.spec.js.
