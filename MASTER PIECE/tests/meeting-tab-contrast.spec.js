import { test, expect } from '@playwright/test';

test('appointment tabs preserve contrast across languages, themes, sizes and selection changes', async ({ page }) => {
  await page.goto('/login/login.html');
  await page.locator('[data-user="school"]').click();
  await page.locator('#loginButton').click();
  await page.waitForURL('**/school-dashboard/school-dashboard.html');

  for (const role of ['school', 'teacher']) {
    await page.evaluate(role => localStorage.setItem('orbitUser', JSON.stringify({ role, email: role + '@orbit.com', name: role })), role);
    await page.goto(role === 'school' ? '/school-dashboard/school-dashboard.html?tab=interviews' : '/applications/applications.html');
    for (const lang of ['en', 'ar']) {
      if (await page.locator('html').getAttribute('lang') !== lang) {
        await Promise.all([page.waitForEvent('load'), page.locator('#orbit-language-button').click()]);
      }
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => OrbitThemePreference.save(theme), theme);
        await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const tabs = page.locator('.recruit-view-tabs [data-view]');
          await expect(tabs).toHaveCount(4);
          for (let i = 0; i < 4; i++) {
            const tab = tabs.nth(i);
            await tab.click();
            await expect(tab).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.recruit-view-tabs [aria-pressed=true]')).toHaveCount(1);
            await tab.hover();
            await tab.focus();
            await expect(tab).toBeFocused();
            await expect(tab).toHaveCSS('background-color', 'rgb(4, 120, 87)');
            await expect(tab).toHaveCSS('color', 'rgb(255, 255, 255)');
            await page.mouse.move(0, 0);
            await page.keyboard.press('Tab');
            for (let j = 0; j < 4; j++) {
              await expect(tabs.nth(j)).toHaveCSS('background-color', j === i ? 'rgb(4, 120, 87)' : 'rgb(236, 253, 245)');
              await expect(tabs.nth(j)).toHaveCSS('color', j === i ? 'rgb(255, 255, 255)' : 'rgb(6, 78, 59)');
            }
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      }
    }
  }
});
