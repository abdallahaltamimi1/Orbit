import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const route = "/school-management/school-management.html";
async function signIn(page, role = "school") {
  await page.goto("/login/login.html");
  await page.locator(`[data-user="${role}"]`).click();
  await page.locator("#loginButton").click();
  await page.waitForURL(`**/${role}-dashboard/${role}-dashboard.html`);
}

test("school management frontend route rejects guests, teachers and students", async ({ page }) => {
  await page.goto(route);
  await expect(page).toHaveURL(/\/login\/login.html/);
  for (const role of ["teacher", "student"]) {
    await signIn(page, role);
    await expect(page.locator('#orbit-rail a[href*="school-management"]')).toHaveCount(0);
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/${role}-dashboard/${role}-dashboard.html`));
    await expect(page.locator(".school-management")).toHaveCount(0);
    await page.locator("#orbit-logout").click();
    await page.waitForURL("**/login/login.html");
  }
});

test("school sidebar preserves active states and all academic sections", async ({ page }) => {
  await signIn(page);
  const management = page.locator('#orbit-rail a[href*="school-management"]');
  await expect(management).toBeVisible();
  await management.click();
  await expect(management).toHaveAttribute("aria-current", "page");
  const recruitment = page.locator('#orbit-rail nav a[href="../school-dashboard/school-dashboard.html"]');
  await expect(recruitment).not.toHaveAttribute("aria-current", "page");
  for (const section of ["students", "teachers", "classes", "subjects", "timetable", "monitoring", "events"]) {
    await page.locator(`.sm-nav a[href="?section=${section}"]`).click();
    await expect(page.locator(`.sm-nav a[href="?section=${section}"]`)).toHaveAttribute("aria-current", "page");
    if (["students", "teachers", "classes", "subjects"].includes(section)) {
      await expect(page.locator("[data-academic-table]")).toBeVisible();
    } else if (section === "monitoring") {
      await expect(page.locator("[data-monitoring-root]")).toBeVisible();
    } else {
      await expect(page.locator(`[data-schedule-root="${section}"]`)).toBeVisible();
      await expect(page.locator("[data-schedule-add]")).toBeVisible();
    }
    await expect(management).toHaveAttribute("aria-current", "page");
  }
  await page.locator('.sm-nav a[href="?section=overview"]').click();
  await expect(page.locator(".sm-totals dd")).toHaveCount(4);
  await page.goBack();
  await expect(page.locator('.sm-nav a[href="?section=events"]')).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(page.locator('[data-schedule-root="events"]')).toBeVisible();
  await recruitment.click();
  await expect(recruitment).toHaveAttribute("aria-current", "page");
  await expect(page.locator("body")).toHaveClass(/recruitment-hub/);
  await expect(page.locator("#school-follow")).toBeHidden();
});

test("overview uses demo data without reading educational stores or changing them", async ({ page }) => {
  await signIn(page);
  const before = await page.evaluate(() => {
    const channels = { channels: [{ id: "private-personal", teacher: "personal@teacher.test", en: "PRIVATE PERSONAL CHANNEL" }], posts: [], role: "school", joined: [] };
    localStorage.setItem("orbit.channels.v2", JSON.stringify(channels));
    localStorage.setItem("orbit.assignments.v1", JSON.stringify({ submissions: [{ answer: "PRIVATE ANSWER" }] }));
    return [localStorage.getItem("orbit.channels.v2"), localStorage.getItem("orbit.assignments.v1")];
  });
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    window.educationalReads = [];
    Storage.prototype.getItem = function (key) {
      // Record reads originating in the dashboard script; shared session compatibility is unchanged.
      if (["orbit.channels.v2", "orbit.assignments.v1", "orbit.memberships.v3"].includes(key) && new Error().stack.includes("school-management.js"))
        window.educationalReads.push(key);
      return original.call(this, key);
    };
  });
  await page.goto(route);
  await expect(page.locator(".sm-demo-notice")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("PRIVATE");
  expect(await page.evaluate(() => window.educationalReads)).toEqual([]);
  expect(await page.evaluate(() => [localStorage.getItem("orbit.channels.v2"), localStorage.getItem("orbit.assignments.v1")])).toEqual(before);
});

test("overview supports bilingual directions, themes and responsive navigation", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.goto(route);
  for (const language of ["en", "ar"]) {
    if (await page.locator("html").getAttribute("lang") !== language) {
      await page.locator("#orbit-language-button").click();
      await expect(page.locator("html")).toHaveAttribute("lang", language);
    }
    await expect(page.locator("html")).toHaveAttribute("dir", language === "en" ? "ltr" : "rtl");
    await expect(page.locator("h1")).toHaveText(language === "en" ? "School Management" : "إدارة المدرسة");
    await expect(page.locator("#sm-content")).toContainText(language === "en" ? "Today's Schedule" : "جدول اليوم");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => window.OrbitThemePreference.save(value), theme);
      await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator(".sm-totals dd")).toHaveCount(4);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        if (width === 390) {
          await page.locator("#orbit-mobile-toggle").click();
          await expect(page.locator("#orbit-mobile-toggle")).toHaveAttribute("aria-expanded", "true");
          await expect(page.locator('#orbit-rail a[href*="school-management"]')).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(page.locator("#orbit-mobile-toggle")).toHaveAttribute("aria-expanded", "false");
        }
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await expect(page.locator('.sm-nav a[aria-current="page"]')).toHaveCSS("background-color", "rgb(52, 211, 153)");
        await expect(page.locator('.sm-nav a[aria-current="page"]')).toHaveCSS("color", "rgb(6, 78, 59)");
        const controlsOverlap = await page.evaluate(() => {
          const language = document.getElementById("orbit-language-button").getBoundingClientRect();
          const appearance = document.querySelector('[data-action="theme"]').getBoundingClientRect();
          return language.left < appearance.right && language.right > appearance.left && language.top < appearance.bottom && language.bottom > appearance.top;
        });
        expect(controlsOverlap).toBe(false);
        await page.screenshot({ path: path.join(os.tmpdir(), `orbit-school-management-${language}-${theme}-${width}.png`), fullPage: true });
      }
    }
  }
  await page.locator('[data-action="theme"]').click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
