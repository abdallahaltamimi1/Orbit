import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { setupPromotion } from './fixtures/promotion-preview.js';

test('academic dashboard layouts, navigation and year selection', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setupPromotion(page);
  await page.goto('/school-management/school-management.html');
  for (const lang of ['ar', 'en']) {
    if (await page.locator('html').getAttribute('lang') !== lang) await page.locator('#orbit-language-button').click();
    await expect(page.locator('html')).toHaveAttribute('dir',lang === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('h1')).toHaveText(lang === 'ar' ? 'لوحة التحكم الأكاديمية' : 'Academic dashboard');
    for (const theme of ['light','dark']) {
      await page.evaluate(v => window.OrbitThemePreference.save(v),theme);
      for (const width of [1440,768,390]) {
        await page.setViewportSize({width,height:1000});
        await expect(page.locator('.sm-totals dd')).toHaveCount(3);
        await expect(page.locator('[data-overview-schedule]')).toBeVisible();
        await expect(page.locator('[data-overview-events]')).toBeVisible();
        await expect(page.locator('.ad-monitor')).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
        await page.screenshot({path:path.join(os.tmpdir(),`academic-dashboard-${lang}-${theme}-${width}.png`),fullPage:true});
      }
    }
  }
  const selector = page.locator('#sm-academic-year');
  const years = await selector.locator('option').evaluateAll(options => options.map(o=>o.value).filter(Boolean));
  for (const year of years) {
    await selector.selectOption(year);
    await expect(selector).toHaveValue(year);
    await page.reload();
    await expect(selector).toHaveValue(year);
  }
  for (const [link, target] of [['[data-overview-schedule] a','timetable'],['[data-overview-events] a','events'],['.ad-monitor a','monitoring']]) {
    await page.locator(link).click();
    await expect(page).toHaveURL(new RegExp('section='+target));
    await expect(page.locator('main')).not.toHaveClass(/academic-dashboard/);
    await page.goto('/school-management/school-management.html');
  }
  expect(errors).toEqual([]);
});
