import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const route = "/school-management/school-management.html?section=years";
const dialog = (page) => page.locator(".sm-academic-dialog[open]");
const data = (page) => page.evaluate(() => OrbitSchoolYears.read());
async function open(page) {
  await page.goto("/login/login.html");
  await page.locator('[data-user="school"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/school-dashboard/school-dashboard.html");
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("orbit.student.v1") || "{}");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ ...p, lang: "en" }));
  });
  await page.goto(route);
}
async function create(page, name, startDate, endDate) {
  await page.locator("[data-year-create]").click();
  for (const [key, value] of Object.entries({ name, startDate, endDate })) await dialog(page).locator(`[name="${key}"]`).fill(value);
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
}
async function activate(page, id) {
  await page.locator(`[data-year-activate="${id}"]`).click();
  await dialog(page).getByRole("button", { name: "Confirm activation", exact: true }).click();
}

test("first year stays upcoming; activation is explicit and archives only the previous active year", async ({ page }) => {
  await open(page);
  await create(page, "2020–2021", "2020-09-01", "2021-06-30");
  let db = await data(page);
  expect(db.activeYearId).toBeNull();
  expect(db.years[0].status).toBe("upcoming");
  const first = db.years[0];
  await page.reload();
  expect((await data(page)).years[0].status).toBe("upcoming");
  await page.locator(`[data-year-activate="${first.id}"]`).click();
  expect((await data(page)).activeYearId).toBeNull();
  await dialog(page).getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await data(page)).activeYearId).toBeNull();
  await activate(page, first.id);
  const protectedBefore = await page.evaluate(() => {
    OrbitSchoolAcademics.read();
    return Object.keys(localStorage).sort().filter((k) => !k.startsWith(OrbitSchoolYears.prefix)).map((k) => [k, localStorage.getItem(k)]);
  });
  await create(page, "2030–2031", "2030-09-01", "2031-06-30");
  db = await data(page);
  const second = db.years[1];
  await activate(page, second.id);
  db = await data(page);
  expect(db.activeYearId).toBe(second.id);
  expect(db.years.filter((r) => r.status === "active")).toHaveLength(1);
  expect(db.years[0]).toMatchObject({ ...first, status: "archived", updatedAt: db.years[0].updatedAt });
  expect(await page.evaluate(() => Object.keys(localStorage).sort().filter((k) => !k.startsWith(OrbitSchoolYears.prefix)).map((k) => [k, localStorage.getItem(k)]))).toEqual(protectedBefore);
  const archived = page.locator(`[data-year-id="${first.id}"]`);
  await expect(archived).toContainText("Read-only");
  await expect(archived.locator("button")).toHaveCount(0);
  await page.reload();
  expect((await data(page)).activeYearId).toBe(second.id);
});

test("upcoming edits persist and active date edits require explicit confirmation", async ({ page }) => {
  await open(page);
  await create(page, "Draft year", "2030-09-01", "2031-06-30");
  const id = (await data(page)).years[0].id;
  await page.locator(`[data-year-edit="${id}"]`).click();
  await dialog(page).locator('[name="name"]').fill("Approved name");
  await dialog(page).locator('[name="endDate"]').fill("2031-07-01");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  expect((await data(page)).years[0]).toMatchObject({ name: "Approved name", endDate: "2031-07-01", status: "upcoming" });
  await activate(page, id);
  await page.locator(`[data-year-edit="${id}"]`).click();
  await expect(dialog(page).locator('[name="name"]')).toHaveAttribute("readonly", "");
  await dialog(page).locator('[name="endDate"]').fill("2031-07-02");
  await dialog(page).getByRole("button", { name: "Confirm date changes" }).click();
  expect((await data(page)).years[0].endDate).toBe("2031-07-01");
  await dialog(page).locator('[name="confirmed"]').check();
  await dialog(page).getByRole("button", { name: "Confirm date changes" }).click();
  expect((await data(page)).years[0].endDate).toBe("2031-07-02");
});

test("service rejects invalid dates, duplicates, overlap and unconfirmed or archived mutations", async ({ page }) => {
  await open(page);
  const results = await page.evaluate(() => {
    const S = OrbitSchoolYears, errors = [];
    const attempt = (fn) => { try { fn(); errors.push("ACCEPTED"); } catch (e) { errors.push(e.message); } };
    const values = { name: "Year A", startDate: "2030-09-01", endDate: "2031-06-30" };
    attempt(() => S.save("", { ...values, name: "" }, S.read()));
    for (const [startDate, endDate] of [["2030-02-30", "2031-01-01"], ["2030-09-01", "2030-09-01"], ["2031-09-01", "2030-09-01"]]) attempt(() => S.save("", { ...values, startDate, endDate }, S.read()));
    const first = S.save("", values, S.read());
    attempt(() => S.save("", { ...values, name: " YEAR a ", startDate: "2032-01-01", endDate: "2032-12-31" }, S.read()));
    attempt(() => S.save("", { ...values, name: "Overlap", startDate: "2031-06-30", endDate: "2032-01-01" }, S.read()));
    attempt(() => S.activate(first.id, S.read()));
    S.activate(first.id, S.read(), true);
    attempt(() => S.save(first.id, { ...values, endDate: "2031-07-01" }, S.read()));
    attempt(() => S.save(first.id, { ...values, name: "Renamed active" }, S.read(), true));
    const second = S.save("", { name: "Year B", startDate: "2032-01-01", endDate: "2032-12-31" }, S.read());
    S.activate(second.id, S.read(), true);
    const before = localStorage.getItem(S.storageKey());
    attempt(() => S.save(first.id, values, S.read(), true));
    attempt(() => S.activate(first.id, S.read(), true));
    return { errors, unchanged: before === localStorage.getItem(S.storageKey()) };
  });
  expect(results.errors).toEqual(["INVALID_FIELDS", "INVALID_DATES", "INVALID_DATES", "INVALID_DATES", "DUPLICATE_YEAR", "OVERLAPPING_YEARS", "CONFIRMATION_REQUIRED", "CONFIRMATION_REQUIRED", "ACTIVE_NAME_READONLY", "ARCHIVED_RECORD", "INVALID_TRANSITION"]);
  expect(results.unchanged).toBe(true);
});

test("school isolation, stale edits and failure handling preserve years and unrelated stores", async ({ page }) => {
  await open(page);
  const result = await page.evaluate(() => {
    const S = OrbitSchoolYears, original = OrbitAuth.current;
    const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().filter((k) => !k.startsWith(S.prefix)).map((k) => [k, localStorage.getItem(k)]));
    const before = snapshot(), initial = S.read();
    const values = { name: "Same name", startDate: "2030-01-01", endDate: "2030-12-31" };
    const first = S.save("", values, initial), errors = [];
    const attempt = (fn) => { try { fn(); errors.push("ACCEPTED"); } catch (e) { errors.push(e.message); } };
    attempt(() => S.activate(first.id, initial, true));
    const saved = localStorage.getItem(S.storageKey());
    OrbitAuth.current = () => ({ role: "school", email: "other@school.test" });
    const emptyOther = S.read().years.length === 0;
    S.save("", values, S.read());
    attempt(() => S.activate(first.id, S.read(), true));
    attempt(() => S.save("", values, initial));
    OrbitAuth.current = () => ({ role: "teacher", email: "teacher@test.test" });
    attempt(() => S.read());
    OrbitAuth.current = original;
    const sameFirst = saved === localStorage.getItem(S.storageKey());
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw Error("quota"); };
    attempt(() => S.activate(first.id, S.read(), true));
    Storage.prototype.setItem = set;
    const failureUntouched = saved === localStorage.getItem(S.storageKey());
    localStorage.setItem(S.storageKey(), "{broken");
    attempt(() => S.read());
    const corruptRetained = localStorage.getItem(S.storageKey()) === "{broken";
    localStorage.setItem(S.storageKey(), saved);
    return { errors, emptyOther, sameFirst, failureUntouched, corruptRetained, protectedStores: JSON.stringify(before) === JSON.stringify(snapshot()) };
  });
  expect(result).toEqual({ errors: ["STALE_DATA", "NOT_FOUND", "SCHOOL_CHANGED", "ROLE_DENIED", "STORAGE_FAILED", "INVALID_DATA"], emptyOther: true, sameFirst: true, failureUntouched: true, corruptRetained: true, protectedStores: true });
});

test("validation errors stay visible and inconsistent active-year storage is never replaced", async ({ page }) => {
  await open(page);
  await create(page, "Existing", "2030-09-01", "2031-06-30");
  await create(page, "Overlapping", "2031-06-30", "2032-01-01");
  await expect(dialog(page).locator("[data-year-error]")).toContainText("overlap");
  expect((await data(page)).years).toHaveLength(1);
  await page.keyboard.press("Escape");
  const result = await page.evaluate(() => {
    const S = OrbitSchoolYears, db = S.read();
    db.years[0].status = "active";
    db.activeYearId = db.years[0].id;
    db.years.push({ ...db.years[0], id: crypto.randomUUID(), name: "Other active", startDate: "2032-01-01", endDate: "2032-12-31" });
    const invalid = JSON.stringify(db);
    localStorage.setItem(S.storageKey(), invalid);
    let error;
    try { S.read(); } catch (e) { error = e.message; }
    return { error, retained: localStorage.getItem(S.storageKey()) === invalid };
  });
  expect(result).toEqual({ error: "INVALID_DATA", retained: true });
  await page.reload();
  await expect(page.locator("[data-year-list] [role=alert]")).toContainText("has not been replaced");
  await expect(page.locator("[data-year-create]")).toBeDisabled();
});

test("year UI supports Arabic and English, themes, mobile and existing navigation", async ({ page }) => {
  await open(page);
  await create(page, "Academic year · السنة الدراسية", "2030-09-01", "2031-06-30");
  for (const lang of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== lang) await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    await expect(page.locator('#orbit-rail [aria-current="page"]')).toHaveAttribute("href", /section=years$/);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((v) => OrbitThemePreference.save(v), theme);
      await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.locator("[data-year-create]").click();
        await expect(dialog(page)).toBeInViewport();
        await page.screenshot({ path: path.join(os.tmpdir(), `orbit-years-${lang}-${theme}-${width}.png`), animations: "disabled" });
        await page.keyboard.press("Escape");
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#orbit-rail a[href$="?tab=applications"]').click();
  await expect(page.locator('[data-tab="applications"]')).toHaveAttribute("aria-current", "page");
  await page.locator('#orbit-rail a[href$="?section=years"]').click();
  await expect(page.locator("[data-year-id]")).toHaveCount(1);
});
