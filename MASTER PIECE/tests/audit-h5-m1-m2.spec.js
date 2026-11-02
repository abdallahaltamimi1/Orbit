import { test, expect } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// WCAG relative luminance, including alpha compositing on ancestor surfaces.
async function contrast(locator, property = "color", pseudo = null) {
  return locator.evaluate((element, { property, pseudo }) => {
    const rgba = color => color.match(/[\d.]+/g).map(Number);
    const over = (front, back) => front.slice(0, 3).map((v, i) => v * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
    const surface = node => {
      if (!node) return [255, 255, 255];
      const style = getComputedStyle(node);
      if (style.backgroundImage !== "none") throw new Error("Gradient requires a separate visual contrast assessment");
      return over(rgba(style.backgroundColor), surface(node.parentElement));
    };
    const background = surface(element);
    const foreground = over(rgba(getComputedStyle(element, pseudo)[property]), background);
    const luminance = rgb => rgb.map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }, { property, pseudo });
}
async function seed(page, theme, lang) {
  await page.addInitScript(({ theme, lang }) => {
    if (sessionStorage.getItem("batch3-seeded")) return;
    sessionStorage.setItem("batch3-seeded", "yes");
    localStorage.setItem("orbit.settings.appearance", JSON.stringify(theme));
    localStorage.setItem("orbit.student.v1", JSON.stringify({ theme, lang }));
  }, { theme, lang });
}
async function teacher(page) {
  await page.goto("/login/login.html");
  await page.locator('[data-user="teacher"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/teacher-dashboard/teacher-dashboard.html");
  await expect(page.locator("#orbit-logout")).toBeAttached();
}
for (const theme of ["light", "dark"]) for (const lang of ["en", "ar"]) for (const width of [1440, 390]) {
  test(`H5 M2 contrast and persisted ${theme} ${lang} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seed(page, theme, lang);
    await page.goto("/login/login.html");
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    for (const selector of ["#loginButton", ".login-small-title", ".signup-text a", "#orbit-language-button", ".orbit-google p", ".password-toggle", ".orbit-top-back"]) {
      expect(await contrast(page.locator(selector)), selector).toBeGreaterThanOrEqual(4.5);
    }
    expect(await contrast(page.locator(".input-box").first(), "borderTopColor")).toBeGreaterThanOrEqual(3);
    await expect(page.locator(".password-toggle")).toHaveCSS("opacity", "1");
    expect(await contrast(page.locator("#email"), "color", "::placeholder")).toBeGreaterThanOrEqual(4.5);
    expect(await page.locator("#email").evaluate(e => getComputedStyle(e, "::placeholder").opacity)).toBe("1");
    await page.locator("#loginButton").hover();
    expect(await contrast(page.locator("#loginButton"))).toBeGreaterThanOrEqual(4.5);
    await page.goto("/school-login/school-login.html");
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    for (const selector of ["#loginButton", ".login-small-title", ".signup-text a", "#orbit-language-button", ".demo-title", ".orbit-google p", "#email", "#password", ".password-toggle", ".orbit-top-back"]) {
      expect(await contrast(page.locator(selector)), `School ${selector}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(await contrast(page.locator(".input-box").first(), "borderTopColor")).toBeGreaterThanOrEqual(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const background = await page.locator(".login-area").evaluate(e => getComputedStyle(e).backgroundColor);
    expect(background).toBe(theme === "dark" ? "rgb(6, 37, 29)" : "rgb(236, 253, 245)");
    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    await page.screenshot({ path: path.join(os.tmpdir(), `orbit-batch3-school-${theme}-${lang}-${width}.png`), fullPage: true });
    // The language switch must retain the saved appearance.
    await page.locator("#orbit-language-button").click();
    await expect(page.locator("html")).toHaveAttribute("lang", lang === "ar" ? "en" : "ar");
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
  });
}
for (const lang of ["en", "ar"]) test(`M1 Teacher dialogs keyboard and names ${lang}`, async ({ page }) => {
  await page.setViewportSize({ width: lang === "ar" ? 390 : 1440, height: 900 });
  await seed(page, "light", lang);
  await teacher(page);
  // This isolated fixture uses a paid demo entitlement; production limits stay unchanged.
  await page.evaluate(() => {
    const context = OrbitSubscriptions.effective();
    const db = JSON.parse(localStorage.getItem("orbit.subscriptions.v1"));
    const record = db.records[context.scopeId];
    record.planId = "teacher-pro";
    record.status = "active";
    record.endDate = new Date(Date.now() + 30 * 86400000).toISOString();
    localStorage.setItem("orbit.subscriptions.v1", JSON.stringify(db));
  });
  await page.reload();
  const trigger = page.locator('[data-action="create"]:visible').first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName(lang === "en" ? "Create your next channel." : "أنشئ قناتك القادمة.");
  await expect(dialog.locator('input[name="name"]')).toBeFocused();
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator('[data-action="close"]').click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator('button.primary').click();
  await expect(dialog).toBeVisible(); // Required fields still enforce validation.
  await dialog.locator('input[name="name"]').fill("Accessible classroom");
  await dialog.locator('textarea[name="description"]').fill("Keyboard regression fixture");
  await dialog.locator('select[name="visibility"]').selectOption("private");
  await dialog.locator('button.primary').click();
  await expect(dialog).toHaveAccessibleName(lang === "en" ? "Your new orbit is ready." : "مدارك الجديد جاهز.");
  expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Clipboard unavailable"); }; });
  await dialog.locator('[data-action="copy"]').click();
  await expect(dialog).toHaveAccessibleName(lang === "en" ? "Your classroom code" : "كود صفك");
  await expect(dialog.locator("input")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-action="create"]:visible').first()).toBeFocused();
});
for (const theme of ["light", "dark"]) test(`H5 Teacher footer and shared switch ${theme}`, async ({ page }) => {
  await seed(page, theme, "en");
  await teacher(page);
  expect(await contrast(page.locator("footer"))).toBeGreaterThanOrEqual(4.5);
  expect(await contrast(page.locator("#orbit-language-button"))).toBeGreaterThanOrEqual(4.5);
});
test("M2 auto, legacy, precedence and live appearance changes", async ({ page }) => {
  await page.goto("/school-login/school-login.html");
  await page.evaluate(() => {
    localStorage.removeItem("orbit.settings.appearance");
    localStorage.setItem("orbit.student.v1", JSON.stringify({ lang: "en" }));
    localStorage.setItem("orbitTheme", "dark");
  });
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => localStorage.setItem("orbit.student.v1", JSON.stringify({ lang: "ar", theme: "light" })));
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => localStorage.setItem("orbit.settings.appearance", JSON.stringify("auto")));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => {
    localStorage.setItem("orbit.settings.appearance", JSON.stringify("dark"));
    dispatchEvent(new StorageEvent("storage", { key: "orbit.settings.appearance" }));
  });
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-user="school"]').click();
  await page.locator("#loginButton").click();
  await page.waitForURL("**/school-dashboard/school-dashboard.html");
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
});
