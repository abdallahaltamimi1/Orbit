import { test, expect } from "@playwright/test";
import path from "node:path";
import os from "node:os";
const route = "/school-management/school-management.html?section=students&view=annual";
async function setup(page) {
  await page.route("**/__annual_view_fixture__", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><html><body><div id='orbit-page'><section id='fixture'></section></div></body></html>" }));
  await page.goto("/__annual_view_fixture__");
  await page.evaluate(() => {
    const schoolId = "school@fixture.test", stamp = "2026-11-03T00:00:00.000Z", row = (v) => ({ schoolId, ...v });
    localStorage.setItem("orbitUser", JSON.stringify({ email: schoolId, role: "school", name: "Fixture School" }));
    localStorage.setItem("orbit.student.v1", JSON.stringify({ lang: "en", theme: "light" }));
    // Match the existing session adapter's role/joined cache; keep content unchanged.
    localStorage.setItem("orbit.channels.v2", JSON.stringify({ role: "school", joined: [], channels: [], posts: [] }));
    localStorage.setItem("orbit.memberships.v3", JSON.stringify({}));
    localStorage.setItem("orbit.recruitment.v1", JSON.stringify({ accounts: [{ email: schoolId, role: "school", status: "active", name: "Fixture School" }, { email: "one@student.test", role: "student", status: "active" }, { email: "other@student.test", role: "student", status: "active" }], notifications: [] }));
    localStorage.setItem("orbit.school.academics.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0,
      students: [row({ id: "s1", name: "Annual Student · طالب سنوي", studentCode: "S1", status: "enrolled", classId: "c1" }), row({ id: "s2", name: "Pending Student · طالب قيد المراجعة", studentCode: "S2", status: "enrolled", classId: "c1" }), row({ id: "s3", name: "Unmapped Student · طالب غير مرتبط", studentCode: "S3", status: "enrolled", classId: null })],
      classes: [row({ id: "c0", grade: "6", section: "Old", academicYear: "2029-2030", status: "active" }), row({ id: "c1", grade: "7", section: "A", academicYear: "2030-2031", status: "active" }), row({ id: "c2", grade: "8", section: "B", academicYear: "2031-2032", status: "active" })], teachers: [], subjects: [], allocations: [] }));
    localStorage.setItem("orbit.school.years.demo.v1:" + encodeURIComponent(schoolId), JSON.stringify({ schema: 1, schoolId, revision: 0, activeYearId: "y0", years: [
      row({ id: "y0", name: "2029-2030", startDate: "2029-09-01", endDate: "2030-06-30", status: "active", createdAt: stamp, updatedAt: stamp }),
      row({ id: "y1", name: "2030-2031", startDate: "2030-09-01", endDate: "2031-06-30", status: "upcoming", createdAt: stamp, updatedAt: stamp }),
      row({ id: "y2", name: "2031-2032", startDate: "2031-09-01", endDate: "2032-06-30", status: "upcoming", createdAt: stamp, updatedAt: stamp }),
    ] }));
  });
  for (const f of ["auth.js", "school-year-service.js", "school-academic-service.js", "school-enrollment-service.js", "school-academic-read-model.js"]) await page.addScriptTag({ path: path.resolve("shared", f) });
  await page.addScriptTag({ path: path.resolve("school-management/school-enrollment-view.js") });
  await page.evaluate(() => {
    const E = OrbitSchoolEnrollments, op = () => crypto.randomUUID(), ctx = () => E.read().context;
    const m = E.requestMapping("s1", ctx(), op()); E.confirmMapping(m.id, "one@student.test", ctx(), op(), true); E.requestMapping("s2", ctx(), op());
    for (const [classId, academicYearId] of [["c0", "y0"], ["c1", "y1"], ["c2", "y2"]]) { E.confirmClassYear(classId, academicYearId, ctx(), op(), true); E.enroll({ academicStudentId: "s1", academicYearId, classId }, ctx(), op(), true); }
    OrbitSchoolYears.activate("y1", OrbitSchoolYears.read(), true);
    const academic = OrbitSchoolAcademics.read(); academic.classes[0].grade = "99"; academic.classes[0].section = "Current label"; academic.revision++;
    localStorage.setItem(OrbitSchoolAcademics.storageKey(), JSON.stringify(academic));
  });
}
async function protectedData(page) {
  return page.evaluate(() => Object.keys(localStorage).sort().filter((k) => k.startsWith("orbit.school.") || ["orbit.channels.v2", "orbit.assignments.v1", "orbit.memberships.v3", "orbit.recruitment.v1", "orbit.subscriptions.v1"].includes(k)).map((k) => [k, localStorage.getItem(k)]));
}
test.beforeEach(async ({ page }) => setup(page));

test("active default and selected upcoming/archived years survive refresh and reload without record writes", async ({ page }) => {
  const before = await protectedData(page);
  await page.goto(route);
  await expect(page.locator("[data-annual-year]")).toHaveValue("y1");
  await expect(page.locator("[data-annual-year-status]")).toHaveText("Active");
  await expect(page.locator('[data-annual-student="s1"]')).toContainText("Verified");
  await expect(page.locator('[data-annual-student="s2"]')).toContainText("Pending");
  await expect(page.locator('[data-annual-student="s3"]')).toContainText("Unresolved");
  await page.locator("[data-annual-year]").selectOption("y2");
  await expect(page.locator("[data-annual-year-status]")).toHaveText("Upcoming");
  await expect(page.locator("[data-annual-content]")).toContainText("activate no educational access");
  await page.locator("[data-annual-refresh]").click();
  await expect(page.locator("[data-annual-year]")).toHaveValue("y2");
  await page.reload();
  await expect(page.locator("[data-annual-year]")).toHaveValue("y2");
  await page.locator("[data-annual-year]").selectOption("y0");
  const row = page.locator('[data-annual-student="s1"]');
  await expect(row).toContainText("6 / Old");
  await expect(row).not.toContainText("99 / Current label");
  await expect(page.locator("[data-annual-year-status]")).toHaveText("Archived");
  await expect(page.locator("[data-annual-content] button,[data-annual-content] input,[data-annual-content] select")).toHaveCount(0);
  expect(await protectedData(page)).toEqual(before);
  await page.locator('#orbit-rail a[href$="?section=students"]').click();
  await expect(page.locator('[data-school-action="add"]')).toBeVisible();
  await expect(page.locator("[data-annual-year]")).toHaveCount(0);
  await page.getByRole('tab', {name:'Annual Records',exact:true}).click();
  await expect(page.locator('[data-add-kind="students"]')).toHaveCount(0);
});

test("unresolved enrollment and conflicting identity never display as Verified or Confirmed", async ({ page }) => {
  await page.evaluate(() => {
    const E = OrbitSchoolEnrollments, key = E.mappingKey(), db = JSON.parse(localStorage.getItem(key)), m = db.mappings.find((m) => m.status === "confirmed");
    m.accountId = "other@student.test"; db.history.find((h) => h.mappingId === m.id && h.type === "confirmed").toAccountId = m.accountId;
    localStorage.setItem(key, JSON.stringify(db));
  });
  const before = await protectedData(page);
  await page.goto(route);
  const row = page.locator('[data-annual-student="s1"]');
  await expect(row.locator("[data-enrollment-state=unresolved]")).toHaveCount(2);
  await expect(row).not.toContainText("Verified"); await expect(row).not.toContainText("Confirmed");
  await expect(row).toContainText("does not match");
  expect(await protectedData(page)).toEqual(before);
});

test("empty, invalid and corrupt year/data states recover using Refresh without seeding", async ({ page }) => {
  await page.goto(route + "&academicYear=missing");
  await expect(page.locator("[data-school-year]")).toHaveValue("y1");
  await expect(page.locator("[data-year-context-feedback]")).toContainText("unavailable");
  await page.locator("[data-annual-year]").selectOption("y1");
  await expect(page.locator("[data-annual-student]")).toHaveCount(3);
  const saved = await page.evaluate(() => {
    const key = OrbitSchoolEnrollments.storageKey(), saved = localStorage.getItem(key); localStorage.setItem(key, "broken"); return { key, saved };
  });
  await page.locator("[data-annual-refresh]").click();
  await expect(page.locator("[data-annual-content] [role=alert]")).toContainText("have not been replaced");
  await expect(page.locator("[data-annual-content]")).not.toContainText("INVALID_");
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, saved), saved);
  await page.locator("[data-annual-refresh]").click();
  await expect(page.locator("[data-annual-student]")).toHaveCount(3);
  await page.evaluate(() => { localStorage.removeItem(OrbitSchoolEnrollments.storageKey()); localStorage.removeItem(OrbitSchoolEnrollments.mappingKey()); });
  await page.locator("[data-annual-refresh]").click();
  await expect(page.locator("[data-annual-empty]")).toBeVisible();
  await page.screenshot({ path: path.join(os.tmpdir(), "orbit-annual-polish-empty.png"), fullPage: true, animations: "disabled" });
  await expect(page.locator('[data-enrollment-state="not-enrolled"]')).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem(OrbitSchoolEnrollments.storageKey()))).toBeNull();
  await page.evaluate(() => localStorage.removeItem(OrbitSchoolYears.storageKey()));
  await page.locator("[data-annual-refresh]").click();
  await expect(page.locator("[data-annual-year]")).toBeDisabled();
  await expect(page.locator("[data-annual-content]")).toContainText("No academic years are saved");
  expect(await page.evaluate(() => localStorage.getItem(OrbitSchoolYears.storageKey()))).toBeNull();
});

test("component refresh and selection invoke no storage mutations or foundation operations", async ({ page }) => {
  const r = await page.evaluate(() => {
    const before = Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]), writes = [];
    for (const name of ["setItem", "removeItem", "clear"]) Storage.prototype[name] = () => { writes.push(name); throw Error("FORBIDDEN_WRITE"); };
    OrbitAuth.current = () => { throw Error("AUTH_MUTATION_FORBIDDEN"); };
    OrbitSchoolEnrollmentView.mount(document.getElementById("fixture"), (en) => en);
    const select = document.querySelector("[data-annual-year]"); select.value = "y0"; select.dispatchEvent(new Event("change")); document.querySelector("[data-annual-refresh]").click();
    return { writes, rows: document.querySelectorAll("[data-annual-student]").length, unchanged: JSON.stringify(before) === JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])) };
  });
  expect(r).toEqual({ writes: [], rows: 3, unchanged: true });
});

test("viewing missing roster data does not seed it and no-active-year selection stays explicit", async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem(OrbitSchoolAcademics.storageKey()));
  await page.goto(route);
  await expect(page.locator("[data-annual-content] [role=alert]")).toContainText("will not create one");
  expect(await page.evaluate(() => localStorage.getItem(OrbitSchoolAcademics.storageKey()))).toBeNull();
  await page.evaluate(() => {
    const key = OrbitSchoolYears.storageKey(), db = JSON.parse(localStorage.getItem(key));
    db.activeYearId = null; db.years.find((y) => y.id === "y1").status = "upcoming";
    localStorage.setItem(key, JSON.stringify(db));
  });
  await page.goto(route);
  await expect(page.locator("[data-annual-year]")).toHaveValue("");
  await expect(page.locator("[data-annual-content]")).toContainText("Choose an academic year");
});

test("a year created and explicitly activated in Academic Years appears as the annual default", async ({ page }) => {
  await page.goto("/school-management/school-management.html?section=years");
  await page.locator("[data-year-create]").click();
  const dialog = page.locator(".sm-year-dialog[open]");
  await dialog.locator('[name="name"]').fill("Reviewed active year");
  await dialog.locator('[name="startDate"]').fill("2035-09-01");
  await dialog.locator('[name="endDate"]').fill("2036-06-30");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const row = page.locator("[data-year-id]").filter({ hasText: "Reviewed active year" });
  await expect(row).toContainText("Upcoming");
  await row.locator("[data-year-activate]").click();
  await dialog.getByRole("button", { name: "Confirm activation", exact: true }).click();
  await expect(row).toContainText("Active");
  const activeId = await row.getAttribute("data-year-id");
  const before = await protectedData(page);
  await page.goto(route);
  await expect(page.locator("[data-annual-year]")).toHaveValue(activeId);
  await expect(page.locator("[data-annual-year] option:checked")).toHaveText("Reviewed active year");
  await expect(page.locator("[data-annual-year-status]")).toHaveText("Active");
  await expect(page.locator("[data-annual-empty]")).toBeVisible();
  await page.locator("[data-annual-refresh]").click();
  await page.locator("#orbit-language-button").click();
  await expect(page.locator("[data-annual-year]")).toHaveValue(activeId);
  await expect(page.locator("[data-annual-year-status]")).toHaveText("نشطة");
  expect(await protectedData(page)).toEqual(before);
});

test("annual view supports bilingual directions, themes and mobile without changing the chosen year", async ({ page }) => {
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route + "&academicYear=y0");
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    await expect(page.locator("#sm-section-title")).toHaveText(lang === "ar" ? "السجلات السنوية" : "Annual Records");
    await expect(page.locator("[data-annual-year-status]")).toHaveText(lang === "ar" ? "مؤرشفة" : "Archived");
    await expect(page.locator('[data-annual-student="s1"]')).toContainText(lang === "ar" ? "متحقق" : "Verified");
    await expect(page.locator('[data-annual-student="s2"]')).toContainText(lang === "ar" ? "قيد المراجعة" : "Pending");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((v) => OrbitThemePreference.save(v), theme);
      await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator("[data-annual-year]")).toHaveValue("y0");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: path.join(os.tmpdir(), `orbit-annual-view-${lang}-${theme}-${width}.png`), fullPage: true, animations: "disabled" });
        await page.goto("/school-management/school-management.html?section=years");
        await expect(page.locator("[data-year-id]")).toHaveCount(3);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: path.join(os.tmpdir(), `orbit-years-polish-${lang}-${theme}-${width}.png`), fullPage: true, animations: "disabled" });
        if (width === 390) {
          await page.locator("[data-year-list] .sm-table-scroll").scrollIntoViewIfNeeded();
          await page.locator("[data-year-list] .sm-table-scroll").evaluate((el) => { el.scrollLeft = document.documentElement.dir === "rtl" ? -el.scrollWidth : el.scrollWidth; });
          await expect(page.locator('[data-year-id="y1"] [data-year-status]')).toBeInViewport();
          await expect(page.locator('[data-year-id="y2"] [data-year-activate]')).toBeInViewport();
          await page.screenshot({ path: path.join(os.tmpdir(), `orbit-years-polish-${lang}-${theme}-mobile-actions.png`), fullPage: true, animations: "disabled" });
        }
        await page.goto(route + "&academicYear=y0");
      }
    }
  }
  expect(errors).toEqual([]);
});
