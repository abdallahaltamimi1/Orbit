import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const route = "/school-management/school-management.html?section=monitoring";
async function fixture(page) {
  await page.goto("/login/login.html");
  await page.locator('[data-user="school"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/school-dashboard/school-dashboard.html");
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ ...p, lang: "en" }));
    const schoolId = JSON.parse(localStorage.getItem("orbitUser")).email;
    const channels = [
      { id: "a", schoolId, teacher: "owner-a@demo.test", en: "School A mathematics", ar: "رياضيات المدرسة أ" },
      { id: "a2", schoolId, teacher: "owner-a@demo.test", en: "School A empty", ar: "قناة مدرسية فارغة" },
      { id: "b", schoolId: "b@school.test", teacher: "owner-b@demo.test", en: "FOREIGN CHANNEL" },
      { id: "personal", teacher: "owner-a@demo.test", en: "PRIVATE PERSONAL CHANNEL" },
    ];
    const posts = [
      { id: "lesson", channel: "a", type: "lesson" }, { id: "video", channel: "a", type: "video" },
      { id: "p1", channel: "a", type: "assignment", dueDate: "2000-01-01" },
      { id: "p2", channel: "a", type: "assignment", dueDate: "2100-01-01" },
      { id: "p2", channel: "a", type: "assignment", dueDate: "2100-01-01" },
      { id: "sample", channel: "a", type: "assignment", sample: true },
      { id: "hidden", channel: "a", type: "assignment", moderationStatus: "hidden" },
      { id: "wrong-school", channel: "a", schoolId: "b@school.test", type: "assignment" },
      { id: "private-post", channel: "personal", type: "assignment" },
    ];
    localStorage.setItem("orbit.channels.v2", JSON.stringify({ channels, posts, role: "school", joined: [] }));
    localStorage.setItem("orbit.memberships.v3", JSON.stringify({
      "student-one@demo.test": ["a"], "student-two@demo.test": ["a"], "outsider@demo.test": ["a"],
      "foreign-student@demo.test": ["b"], "personal-student@demo.test": ["personal"],
    }));
    const r = (assignmentId, studentId, revision, extra = {}) => ({
      id: crypto.randomUUID(), channelId: "a", assignmentId, studentId, revision,
      submittedAt: "2026-01-02T10:00:00Z", answer: "PRIVATE ANSWER", attachments: [{ key: "PRIVATE FILE" }], history: [{ answer: "PRIVATE HISTORY" }], ...extra,
    });
    localStorage.setItem("orbit.assignments.v1", JSON.stringify({ submissions: [
      r("p1", "student-one@demo.test", 1),
      r("p1", "student-one@demo.test", 3, { review: { teacherId: "owner-a@demo.test", reviewedAt: "2026-01-03T10:00:00Z", grade: 99, feedback: "PRIVATE FEEDBACK" } }),
      r("p2", "student-one@demo.test", 1), r("p2", "student-one@demo.test", 1),
      r("p1", "outsider@demo.test", 1),
      r("p2", "student-two@demo.test", 10, { channelId: "b" }),
    ] }));
  });
  await page.goto(route);
  return page.evaluate(() => {
    const A = OrbitSchoolAcademics, db = A.read();
    const R=OrbitRecruitment,data=R.data();data.accounts.push({email:'owner-a@demo.test',name:'Mapped Teacher',role:'teacher',status:'active'});localStorage.setItem('orbit.recruitment.v1',JSON.stringify(data));
    const T=OrbitSchoolTeaching,actor=localStorage.getItem('orbitUser'),request=T.inviteTeacher(db.teachers[0].id,'owner-a@demo.test',T.read().context);localStorage.setItem('orbitUser',JSON.stringify({role:'teacher',email:'owner-a@demo.test'}));T.respondInvitation(db.schoolId,request.id,true);localStorage.setItem('orbitUser',actor);
    const student = A.save("students", "", { name: "Second class learner", studentCode: "S-EXTRA", status: "enrolled", classId: db.classes[0].id }, db);
    return { classroom: db.classes[0], subject: db.subjects[0], teacher: db.teachers[0], students: [db.students[0], student] };
  });
}
async function configure(page, ids, complete = true) {
  await page.evaluate(({ ids, complete }) => {
    const M = OrbitSchoolMonitoring;
    M.saveMapping("teachers", ids.teacher.id, "owner-a@demo.test", M.report().context);
    M.saveLink("a", ids.classroom.id, ids.subject.id, M.report().context);
    if (complete) {
      M.saveMapping("students", ids.students[0].id, "student-one@demo.test", M.report().context);
      M.saveMapping("students", ids.students[1].id, "student-two@demo.test", M.report().context);
    }
  }, { ids, complete });
}

test("strict school isolation, explicit identity mapping and protected educational stores", async ({ page }) => {
  const ids = await fixture(page);
  const result = await page.evaluate((ids) => {
    const M = OrbitSchoolMonitoring;
    const protectedKeys = ["orbit.channels.v2", "orbit.assignments.v1", "orbit.memberships.v3", "orbit.school.members.v1", "orbit.recruitment.v1", "orbit.subscriptions.v1", "orbit.meetings.v1", OrbitSchoolAcademics.storageKey()];
    const before = protectedKeys.map((k) => localStorage.getItem(k));
    const initial = M.report();
    const denied = [];
    for (const channelId of ["b", "personal"]) {
      try { M.saveLink(channelId, ids.classroom.id, ids.subject.id, M.report().context); } catch (e) { denied.push(e.message); }
    }
    let mismatch;
    try { M.saveLink("a", ids.classroom.id, ids.subject.id, M.report().context); } catch (e) { mismatch = e.message; }
    M.saveMapping("teachers", ids.teacher.id, "owner-a@demo.test", M.report().context);
    M.saveLink("a", ids.classroom.id, ids.subject.id, M.report().context);
    const firstRaw = localStorage.getItem(M.storageKey()), firstContext = M.report().context;
    const auth = OrbitAuth.current;
    OrbitAuth.current = () => ({ role: "school", email: "b@school.test" });
    const second = M.report();
    let crossSchool;
    try { M.saveLink("b", ids.classroom.id, ids.subject.id, second.context); } catch (e) { crossSchool = e.message; }
    let staleSchool;
    try { M.saveMapping("teachers", ids.teacher.id, "owner-b@demo.test", firstContext); } catch (e) { staleSchool = e.message; }
    OrbitAuth.current = auth;
    return {
      channels: initial.rows.map((r) => r.channelId), candidates: initial.options.candidates,
      denied, mismatch, secondChannels: second.rows.map((r) => r.channelId), secondMappings: second.mappings,
      crossSchool, staleSchool, preserved: firstRaw === localStorage.getItem(M.storageKey()),
      protectedUnchanged: JSON.stringify(before) === JSON.stringify(protectedKeys.map((k) => localStorage.getItem(k))),
    };
  }, ids);
  expect(result).toMatchObject({ channels: ["a", "a2"], denied: ["CHANNEL_SCOPE", "CHANNEL_SCOPE"], mismatch: "OWNER_MISMATCH", secondChannels: ["b"], secondMappings: [], crossSchool: "INVALID_ALLOCATION", staleSchool: "SCHOOL_CHANGED", preserved: true, protectedUnchanged: true });
  expect(result.candidates.students).not.toContain("personal-student@demo.test");
  expect(result.candidates.students).not.toContain("foreign-student@demo.test");
});

test("monitoring UI explicitly maps IDs, links channel and reports deduplicated progress with filters", async ({ page }) => {
  const ids = await fixture(page);
  await page.locator('.am-advanced').evaluate(el=>el.open=true);
  await page.locator('[data-links]').last().click();
  await page.locator(".sm-mapping-panel summary").click();
  await page.locator("[data-monitor-map]").click();
  let modal = page.locator(".sm-academic-dialog[open]:not(.am-dialog)");
  await expect(modal).toHaveAccessibleName("Map an account ID");
  await modal.locator('[name="academicId"]').selectOption(ids.teacher.id);
  await modal.locator('[name="accountId"]').selectOption("owner-a@demo.test");
  await modal.getByRole("button", { name: "Save link" }).click();
  await page.locator('[data-monitor-link="a"]').click();
  modal = page.locator(".sm-academic-dialog[open]:not(.am-dialog)");
  await modal.locator('[name="classId"]').selectOption(ids.classroom.id);
  await modal.locator('[name="subjectId"]').selectOption(ids.subject.id);
  await modal.getByRole("button", { name: "Save link" }).click();
  await page.locator('[data-monitor-filter="channelId"]').selectOption("a");
  await expect(page.locator('[data-monitor-total="submitted"]')).toHaveText("Unavailable");
  await page.evaluate((ids) => {
    const M = OrbitSchoolMonitoring;
    M.saveMapping("students", ids.students[0].id, "student-one@demo.test", M.report().context);
    M.saveMapping("students", ids.students[1].id, "student-two@demo.test", M.report().context);
  }, ids);
  for (const [key, value] of Object.entries({ channels: "1", lessons: "2", assignments: "2", submitted: "2", reviewed: "1", missing: "2", overdue: "1" }))
    await expect(page.locator(`[data-monitor-total="${key}"]`)).toHaveText(value);
  for (const [key, value] of [["classId", ids.classroom.id], ["subjectId", ids.subject.id], ["teacherId", ids.teacher.id]]) {
    await page.locator(`[data-monitor-filter="${key}"]`).selectOption(value);
    await expect(page.locator("[data-monitor-channel]")).toHaveCount(1);
  }
  const report = await page.evaluate(() => OrbitSchoolMonitoring.report({ channelId: "a" }));
  expect(JSON.stringify(report)).not.toMatch(/PRIVATE|"grade":99|feedback|attachments|history|answer/);
  await expect(page.locator("main")).not.toContainText("PRIVATE");
  await page.reload();
  await page.locator('.am-advanced').evaluate(el=>el.open=true);
  await page.locator('[data-links]').last().click();
  await expect(page.locator('[data-monitor-channel="a"]')).toContainText("Current mapped roster");
  await page.addScriptTag({ url: "/shared/assignment-service.js" });
  expect(await page.evaluate(() => OrbitAssignments.visible())).toEqual([]);
  expect(await page.evaluate(() => { try { OrbitAssignments.review("p1", "student-one@demo.test", { grade: 100 }, 3); } catch (e) { return e.message; } })).toContain("unavailable");
});

test("archived, missing and changed academic links suppress progress without overwriting records", async ({ page }) => {
  const ids = await fixture(page);
  await configure(page, ids);
  const result = await page.evaluate((ids) => {
    const M = OrbitSchoolMonitoring, A = OrbitSchoolAcademics;
    const saved = localStorage.getItem(M.storageKey());
    A.archive("classes", ids.classroom.id, A.read());
    const archived = M.report({ channelId: "a" }).rows[0];
    let blocked;
    try { M.saveLink("a2", ids.classroom.id, ids.subject.id, M.report().context); } catch (e) { blocked = e.message; }
    const academic = A.read();
    for (const student of academic.students) if (student.classId === ids.classroom.id) student.classId = null;
    academic.allocations = academic.allocations.filter((a) => a.classId !== ids.classroom.id);
    academic.classes = academic.classes.filter((c) => c.id !== ids.classroom.id);
    localStorage.setItem(A.storageKey(), JSON.stringify(academic));
    const missing = M.report({ channelId: "a" }).rows[0];
    return { archived: { status: archived.status, submitted: archived.submitted, assignments: archived.assignments }, blocked, missing: { status: missing.status, missing: missing.missing }, preserved: saved === localStorage.getItem(M.storageKey()) };
  }, ids);
  expect(result).toEqual({ archived: { status: "archived", submitted: null, assignments: 2 }, blocked: "INVALID_ALLOCATION", missing: { status: "missing-record", missing: null }, preserved: true });
});

test("incomplete enrollment, invalid deadlines, owner changes and ambiguous IDs fail safely", async ({ page }) => {
  const ids = await fixture(page);
  await configure(page, ids);
  const result = await page.evaluate(() => {
    const M = OrbitSchoolMonitoring;
    const memberships = JSON.parse(localStorage.getItem("orbit.memberships.v3"));
    memberships["student-two@demo.test"] = [];
    localStorage.setItem("orbit.memberships.v3", JSON.stringify(memberships));
    const incomplete = M.report({ channelId: "a" }).rows[0];
    memberships["student-two@demo.test"] = ["a"];
    localStorage.setItem("orbit.memberships.v3", JSON.stringify(memberships));
    const education = JSON.parse(localStorage.getItem("orbit.channels.v2"));
    education.posts.find((p) => p.id === "p1").dueDate = "2026-02-31";
    localStorage.setItem("orbit.channels.v2", JSON.stringify(education));
    const invalidDate = M.report({ channelId: "a" }).rows[0];
    education.channels[0].teacher = "changed-owner@demo.test";
    localStorage.setItem("orbit.channels.v2", JSON.stringify(education));
    const changed = M.report({ channelId: "a" }).rows[0];
    education.channels.push({ id: "a", schoolId: "b@school.test", teacher: "other@demo.test" });
    localStorage.setItem("orbit.channels.v2", JSON.stringify(education));
    const ambiguous = M.report().rows;
    return { incomplete: incomplete.submitted, invalidDate: { missing: invalidDate.missing, overdue: invalidDate.overdue }, changed: { status: changed.status, reviewed: changed.reviewed }, ambiguousIds: ambiguous.map((r) => r.channelId) };
  });
  expect(result).toEqual({ incomplete: null, invalidDate: { missing: 2, overdue: null }, changed: { status: "owner-mismatch", reviewed: null }, ambiguousIds: ["a2"] });
});

test("mapping integrity, revisions and storage failures preserve saved links", async ({ page }) => {
  const ids = await fixture(page);
  await configure(page, ids);
  const result = await page.evaluate((ids) => {
    const M = OrbitSchoolMonitoring, old = M.report().context;
    const saved = localStorage.getItem(M.storageKey());
    let duplicate, invalid, stale, quota;
    try { M.saveMapping("students", ids.students[1].id, "student-one@demo.test", M.report().context); } catch (e) { duplicate = e.message; }
    try { M.saveMapping("students", ids.students[1].id, "personal-student@demo.test", M.report().context); } catch (e) { invalid = e.message; }
    OrbitSchoolAcademics.save("subjects", "", { name: "New subject" }, OrbitSchoolAcademics.read());
    try { M.remove("links", M.report().rows[0].linkId, old); } catch (e) { stale = e.message; }
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.startsWith(M.prefix)) throw Error("quota"); return set.call(this, key, value); };
    try { M.remove("links", M.report().rows[0].linkId, M.report().context); } catch (e) { quota = e.message; }
    Storage.prototype.setItem = set;
    return { duplicate, invalid, stale, quota, preserved: saved === localStorage.getItem(M.storageKey()) };
  }, ids);
  expect(result).toEqual({ duplicate: "DUPLICATE_MAPPING", invalid: "INVALID_MAPPING", stale: "STALE_DATA", quota: "STORAGE_FAILED", preserved: true });
  await page.evaluate(() => localStorage.setItem(OrbitSchoolMonitoring.storageKey(), "invalid-json"));
  await page.reload();
  await page.locator('.am-advanced').evaluate(el=>el.open=true);
  await page.locator('[data-links]').last().click();
  await expect(page.getByRole("alert")).toContainText("has not been replaced");
  expect(await page.evaluate(() => localStorage.getItem(OrbitSchoolMonitoring.storageKey()))).toBe("invalid-json");
});

test("monitoring empty states, bilingual layouts, themes and responsive dialogs", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page);
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) {
      await page.locator("#orbit-language-button").click();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    }
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => OrbitThemePreference.save(value), theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        if (!await page.locator('.am-dialog[open]').count()) { await page.locator('.am-advanced').evaluate(el=>el.open=true); await page.locator('[data-links]').last().click(); }
        await page.locator('[data-monitor-link="a"]').click();
        const modal = page.locator(".sm-academic-dialog[open]:not(.am-dialog)");
        await expect(modal).toHaveAccessibleName(lang === "en" ? "Link channel to academics" : "ربط القناة بالسجلات الأكاديمية");
        expect(await modal.evaluate((el) => el.contains(document.activeElement))).toBe(true);
        await page.screenshot({ path: path.join(os.tmpdir(), `orbit-monitoring-${lang}-${theme}-${width}.png`), fullPage: true });
        await page.keyboard.press("Escape");
        await expect(modal).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(page.locator(".am-dialog")).toHaveCount(0);
      }
    }
  }
  await page.locator(".am-advanced").evaluate(el=>el.open=true);
  await page.locator("[data-links]").last().click();
  await page.locator('[data-monitor-filter="channelId"]').selectOption("a2");
  await expect(page.locator('[data-monitor-total="assignments"]')).toHaveText("٠");
  await page.evaluate(() => localStorage.setItem("orbit.channels.v2", JSON.stringify({ role: "school", joined: [] })));
  await page.reload();
  await page.locator(".am-advanced").evaluate(el=>el.open=true);
  await page.locator("[data-links]").last().click();
  await expect(page.locator(".sm-empty")).toBeVisible();
  expect(errors).toEqual([]);
});
