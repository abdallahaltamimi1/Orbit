import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const routes=JSON.parse(readFileSync(new URL('../outputs/platform-audit-2026-11-05/browser-route-baseline.json',import.meta.url)));
const capture=new Set(['hompage/hompage.html','login/login.html','student-dashboard/student-dashboard.html','teacher-dashboard/teacher-dashboard.html','school-management/school-management.html','school-dashboard/school-dashboard.html','car-lab/car-lab.html']);
function contrast(a,b){const l=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);return(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);}
async function appearance(page,role,lang='en',theme='light') {
 await page.addInitScript(({role,lang,theme})=>{
  const key='audit-appearance:'+role+':'+lang+':'+theme;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');
  localStorage.setItem('orbit.settings.appearance',JSON.stringify(theme));
  localStorage.setItem('orbit.student.v1',JSON.stringify({...JSON.parse(localStorage.getItem('orbit.student.v1')||'{}'),lang,theme}));localStorage.setItem('orbitLanguage',lang);
  if(role)localStorage.setItem('orbitUser',JSON.stringify({role,email:role+'@orbit.com',name:'Isolated audit'}));else localStorage.removeItem('orbitUser');
  if(role==='admin'){
   localStorage.setItem('orbit.recruitment.v1',JSON.stringify({accounts:[{email:'admin@orbit.com',role:'admin',status:'active',name:'Audit administrator'}],schools:[],jobs:[],applications:[],notifications:[]}));
   sessionStorage.setItem('orbit.admin.session',JSON.stringify({email:'admin@orbit.com',token:'isolated-audit',expiresAt:Date.now()+3600000}));
  }
 },{role:role==='guest'?'':role,lang,theme});
}
for(const route of routes)test(`platform appearance ${route.route}`,async({page},info)=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const lang of ['en','ar'])for(const theme of ['light','dark']){
  await appearance(page,route.role,lang,theme);await page.goto('/'+route.route);
  if(!['shared/presentation-guide.html','palette-preview/index.html'].includes(route.route)){
   await expect(page.locator('body')).toHaveAttribute('data-theme',theme);
   await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  }
  for(const width of [1440,1024,768,390]){
   await page.setViewportSize({width,height:950});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang}/${theme}/${width}`).toBe(true);
   if(capture.has(route.route)&&((width===1440&&lang==='en')||(width===390&&lang==='ar')))
    await page.screenshot({path:info.outputPath(`${lang}-${theme}-${width}.png`),fullPage:true,animations:'disabled'});
  }
 }
 expect(errors).toEqual([]);
});
test('shared night layers, neutral light canvas, status colors and control contrast',async({page})=>{
 for(const theme of ['light','dark']){
  await appearance(page,'student','en',theme);await page.goto('/settings/settings.html');
  const colors=await page.locator('#orbit-page').evaluate(el=>Object.fromEntries(['canvas','surface','elevated','ink','muted','error','warning','soft','on-soft','action','on-action','input-border'].map(n=>{const p=document.createElement('i');p.style.color=`var(--orbit-${n})`;el.append(p);const c=getComputedStyle(p).color;p.remove();return[n,c]})));
  expect(colors.canvas).toBe(theme==='dark'?'rgb(17, 27, 48)':'rgb(246, 248, 251)');expect(colors.surface).toBe(theme==='dark'?'rgb(25, 38, 62)':'rgb(255, 255, 255)');
  if(theme==='dark')await expect(page.locator('#orbit-rail')).toHaveCSS('background-color','rgb(17, 27, 48)');
  for(const surface of ['canvas','surface','elevated'])for(const ink of ['ink','muted','error','warning'])expect(contrast(colors[ink],colors[surface]),`${theme} ${ink}/${surface}`).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colors['on-soft'],colors.soft)).toBeGreaterThanOrEqual(4.5);expect(contrast(colors['on-action'],colors.action)).toBeGreaterThanOrEqual(4.5);expect(contrast(colors['input-border'],colors.surface)).toBeGreaterThanOrEqual(3);
 }
});
test('contact validates input and honestly reports unavailable delivery',async({page})=>{
 await appearance(page,'');await page.goto('/contact/contact.html');
 await page.locator('#contact-form [type="submit"]').click();await expect(page.locator('#contact-name')).toHaveAttribute('aria-invalid','true');
 await page.locator('#contact-name').fill('Audit visitor');await page.locator('#contact-email').fill('audit@example.test');await page.locator('#contact-message').fill('An isolated local audit message.');
 await page.locator('#contact-form [type="submit"]').click();await expect(page.locator('#contact-status')).toContainText('not sent or saved');
 await expect(page.locator('#contact-message')).toHaveValue('An isolated local audit message.');
});
test('quiz saves the actual score and displays it after navigation and reload',async({page})=>{
 await appearance(page,'student');await page.goto('/quiz/quiz.html');
 for(const [i,value]of [0,1,0].entries())await page.locator(`[name="q${i}"][value="${value}"]`).check();
 await page.locator('#quiz-form [type="submit"]').click();await page.waitForURL('**/result/result.html');await expect(page.getByRole('heading',{name:'100%',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'100%',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.student.v1')).quiz.correct)).toBe(3);
});
test('practice saves correct attempts and allows retrying incorrect answers',async({page})=>{
 await appearance(page,'student');await page.goto('/practice/practice.html');
 const form=page.locator('[data-learn-question]').first();await form.locator('[name="answer"]').fill('999');await form.locator('[type="submit"]').click();
 await expect(page.locator('#feedback-0')).toHaveAttribute('data-result','incorrect');
 await form.locator('[name="answer"]').fill('10');await form.locator('[type="submit"]').click();await expect(page.locator('#feedback-0')).toHaveAttribute('data-result','correct');
 await page.reload();await expect(page.locator('#feedback-0')).toHaveAttribute('data-result','correct');
 await page.locator('[data-learn-jump="0"]').click();await page.locator('[data-learn-next]').first().click();await expect(page.locator('[data-learn-question]').nth(1)).toBeVisible();
});
test('book listing create, edit, filter, and confirmed deletion persist locally',async({page})=>{
 await appearance(page,'student');await page.goto('/exchange/exchange.html');await page.locator('#add-item').click();
 let form=page.locator('#listing-form');
 for(const [name,value]of Object.entries({title:'Audit physics book',description:'A local-only test listing.',location:'Amman',quantity:'2',price:'4',contact:'audit@example.test'}))await form.locator(`[name="${name}"]`).fill(value);
 await form.getByRole('button',{name:'Save listing',exact:true}).click();await expect(page.getByRole('heading',{name:'Audit physics book',exact:true})).toBeVisible();
 await page.reload();await page.locator('#exchange-filter').selectOption('mine');await page.locator('[data-detail]').click();await page.locator('#edit-listing').click();
 form=page.locator('#listing-form');await form.locator('[name="title"]').fill('Revised audit book');await form.getByRole('button',{name:'Save listing',exact:true}).click();
 await page.locator('[data-detail]').click();await page.locator('#delete-listing').click();await expect(page.locator('#confirm-delete')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.exchange.v2')).items.length)).toBe(1);
 await page.locator('#confirm-delete').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.exchange.v2')).items.length)).toBe(0);
});
test('car lab runs, saves a real trial, exports CSV and resets without inventing results',async({page})=>{
 await appearance(page,'student');await page.goto('/car-lab/car-lab.html');await page.locator('[data-preset="coast"]').click();
 await page.locator('#run-button').click();await expect(page.locator('#save-trial')).toBeEnabled();await page.locator('#save-trial').click();
 const trial=await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.lab.trials'))[0]);expect(trial.time).toBeGreaterThan(0);expect(trial.config.force).toBe(0);
 const download=page.waitForEvent('download');await page.locator('[data-action="export"]').click();expect((await download).suggestedFilename()).toBe('orbit-car-lab-trials.csv');
 await page.locator('[data-action="reset"]').click();await expect(page.locator('#save-trial')).toBeDisabled();
 await page.reload();await expect(page.locator('#trials-content tbody tr')).toHaveCount(1);
});
test('settings cancel discards preview and Save persists language/theme across navigation',async({page})=>{
 await appearance(page,'student');await page.goto('/settings/settings.html');
 await page.locator('[name="appearance"][value="dark"]').check();await page.locator('#cancel-settings').click();await expect(page.locator('[name="appearance"][value="light"]')).toBeChecked();
 await page.locator('[name="appearance"][value="dark"]').check();await page.locator('[name="lang"][value="ar"]').check();
 await page.locator('#settings-form [type="submit"]').click();await expect(page.locator('body')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await page.goto('/lessons/lessons.html');await expect(page.locator('body')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveAttribute('lang','ar');
});
for(const experiment of ['pendulum','spring','projectile'])test(`${experiment} lab search, controls, run/pause and reset`,async({page})=>{
 await appearance(page,'student');await page.goto('/lab/lab.html');await page.locator('#experiment-search').fill('not-a-science-topic');await expect(page.locator('#lab-empty')).toBeVisible();
 await page.goto('/lab/lab.html?experiment='+experiment);const control=page.locator('[data-variable]').first();
 await control.fill(await control.getAttribute('min'));await page.locator('#run').click();await expect(page.locator('#run')).toHaveText('Pause');
 await expect(page.locator('#clock')).not.toHaveText('0.00 s');await page.locator('#run').click();await expect(page.locator('#run')).toHaveText('Run experiment');
 await page.locator('#reset').click();await expect(page.locator('#clock')).toContainText('0.0');
});
test('Teachers with no academic year shows a useful empty state without claiming a save failed',async({page})=>{
 await appearance(page,'school');await page.goto('/school-management/school-management.html?section=teachers');
 await expect(page.locator('[data-teacher-directory]')).toBeVisible();await expect(page.locator('[data-teacher-add]')).toBeDisabled();
 await expect(page.locator('[data-teacher-year-empty]')).toBeVisible();await expect(page.locator('#sm-content [role="alert"]')).toHaveCount(0);
 expect(await page.evaluate(()=>OrbitSchoolYears.read().years.length)).toBe(0);await page.locator('[data-teacher-year-empty] a').click();await expect(page).toHaveURL(/section=years/);
});
test('lesson studio creates an explicitly labeled sample, edits, saves, presents and exports JSON',async({page})=>{
 await appearance(page,'teacher');await page.goto('/lesson-planner/lesson-planner.html#create');
 await expect(page.locator('.studio-demo').first()).toContainText('not live AI');
 await page.locator('#studio-form [name="topic"]').fill('Audit forces lesson');await page.locator('#studio-form [name="grade"]').fill('Grade 9');
 await page.locator('#studio-form [type="submit"]').click();await page.locator('#studio-form [type="submit"]').click();await page.locator('#studio-form [type="submit"]').click();
 await expect(page).toHaveURL(/#project=/);await page.locator('[data-edit-title]').fill('Reviewed forces title');await page.locator('#save-project').click();
 await page.reload();await expect(page.locator('[data-edit-title]')).toHaveValue('Reviewed forces title');
 await page.locator('#present-slide').click();await expect(page.locator('#studio-presentation')).toBeVisible();await page.locator('#close-presentation').click();
 const download=page.waitForEvent('download');await page.locator('#export-json').click();expect((await download).suggestedFilename()).toMatch(/\.json$/);
 await page.goto('/lesson-planner/lesson-planner.html#projects');await expect(page.locator('#studio-project-results')).toContainText('Audit forces lesson');
});
test('administrator views and confirmed suspend/restore retain account and linked history',async({page})=>{
 await appearance(page,'admin');await page.goto('/admin/admin.html');
 await page.evaluate(()=>{const k='orbit.recruitment.v1',d=JSON.parse(localStorage.getItem(k));d.accounts.push({email:'audit.teacher@example.test',name:'Audit teacher',role:'teacher',status:'active'});localStorage.setItem(k,JSON.stringify(d));localStorage.setItem('orbit.assignments.v1',JSON.stringify({submissions:[{id:'preserve-audit-history',review:{grade:88}}]}));});
 const history=await page.evaluate(()=>localStorage.getItem('orbit.assignments.v1'));const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const view of ['users','students','teachers','schools','requests','jobs','content','labs','reports','notifications','logs','settings']){
  await page.goto('/admin/admin.html#'+view);await expect(page.locator('.page-heading h1')).toBeVisible();
 }
 await page.goto('/admin/admin.html#teachers');
 for(const next of ['suspended','active']){
  await page.locator(`[data-action="account-status"][data-id="audit.teacher@example.test"][data-next="${next}"]`).click();
  await page.locator('dialog[open] [type="checkbox"]').check();await page.locator('dialog[open] [type="submit"]').click();await page.reload();
  await expect(page.locator('tr').filter({hasText:'audit.teacher@example.test'})).toContainText(next==='active'?'Active':'Suspended');
 }
 expect(await page.evaluate(()=>localStorage.getItem('orbit.assignments.v1'))).toBe(history);expect(errors).toEqual([]);
});
