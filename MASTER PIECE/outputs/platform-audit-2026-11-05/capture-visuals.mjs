// Disposable fixtures only. Start Vite on 127.0.0.1:5176 before running.
import {chromium} from '@playwright/test';
import {setupPeriods} from '../../tests/fixtures/period-timetable.js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(dir,'visual'),{recursive:true});
const browser=await chromium.launch({executablePath:process.env.ORBIT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5176',reducedMotion:'reduce',timezoneId:'Asia/Amman'}),page=await context.newPage();
 await setupPeriods(page);
 for(const theme of ['light','dark'])for(const lang of ['en','ar']){
  await page.evaluate(({theme,lang})=>{localStorage.setItem('orbit.settings.appearance',JSON.stringify(theme));localStorage.setItem('orbit.student.v1',JSON.stringify({lang,theme}));localStorage.setItem('orbitLanguage',lang);},{theme,lang});
  for(const section of ['students','teachers','monitoring']){
   await page.goto('/school-management/school-management.html?section='+section);
   for(const width of [1440,390]){await page.setViewportSize({width,height:950});await page.screenshot({path:path.join(dir,'visual',`${section}-${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});}
  }
 }
 await context.close();
 const baseline=JSON.parse(fs.readFileSync(path.join(dir,'footer-browser-baseline.json'))),checks=[];
 for(const ref of baseline){
  const ctx=await browser.newContext({baseURL:'http://127.0.0.1:5176',viewport:{width:1440,height:950},reducedMotion:'reduce'});
  await ctx.addInitScript(theme=>{localStorage.setItem('orbit.settings.appearance',JSON.stringify(theme));localStorage.setItem('orbit.student.v1',JSON.stringify({lang:'en',theme}));localStorage.setItem('orbitLanguage','en');},ref.theme);
  const p=await ctx.newPage();await p.goto('/hompage/hompage.html');await p.evaluate(()=>document.fonts.ready);
  const footer=p.locator('#orbit-site-footer'),computed=await footer.evaluate(el=>{const s=getComputedStyle(el),b=getComputedStyle(el,'::before');return{background:s.background,color:s.color,border:s.borderTop,pseudoBackground:b.background,pseudoOpacity:b.opacity,font:s.fontFamily}});
  checks.push({theme:ref.theme,unchanged:JSON.stringify(computed)===JSON.stringify(ref.computed),computed});
  await footer.screenshot({path:path.join(dir,'visual',`footer-${ref.theme}.png`),animations:'disabled'});await ctx.close();
 }
 fs.writeFileSync(path.join(dir,'footer-browser-verification.json'),JSON.stringify(checks,null,2));
 if(checks.some(c=>!c.unchanged))throw Error('Footer appearance changed');
 console.log('24 populated captures; Footer computed appearance unchanged in both themes.');
}finally{await browser.close();}
