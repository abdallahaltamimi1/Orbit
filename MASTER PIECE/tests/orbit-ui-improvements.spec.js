import { test, expect } from '@playwright/test';
async function seed(page, role='', lang='en', theme='light') {
  await page.goto('/jobs/jobs.html');
  await page.evaluate(({role,lang,theme})=>{
    localStorage.setItem('orbit.student.v1',JSON.stringify({lang,theme}));
    if(role) localStorage.setItem('orbitUser',JSON.stringify({role,email:role+'@orbit.com',name:'Preview user'})); else localStorage.removeItem('orbitUser');
    localStorage.setItem('orbit.recruitment.v1',JSON.stringify({schools:[{id:'school@orbit.com',name:'Orbit School',location:'Amman',description:'A school for curious learners.'}],jobs:[{id:'preview-job',schoolId:'school@orbit.com',title:'Physics teacher',description:'Teach practical physics and support student learning.',subject:'physics',location:'Amman',employment:'full-time',status:'published',experience:2,grades:['Secondary'],skills:['Experiments'],qualifications:'Physics degree'}],applications:[],notifications:[],accounts:[]}));
  },{role,lang,theme});
  await page.goto('/jobs/jobs.html?id=preview-job');
}
for(const lang of ['en','ar']) for(const width of [1440,390]) test(`requested surfaces ${lang} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await seed(page,'',lang);
 await expect(page.locator('.opportunity-apply #apply')).toBeVisible();
 await page.locator('#apply').click();
 const dialog=page.locator('.opportunity-auth-dialog'); await expect(dialog).toBeVisible();
 await expect(dialog.locator('a[href*="login/"]')).toHaveAttribute('href',/opportunity=preview-job/);
 await expect(dialog.locator('[data-signup]')).toHaveAttribute('href',/role=teacher.*opportunity=preview-job/);
 await dialog.locator('[data-continue]').click();await expect(dialog).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.goto('/hompage/hompage.html');await expect(page.locator('#discover-orbit-title')).toHaveText(lang==='ar'?'مساحة واحدة تجمع التعليم والفرص':'One space for learning and opportunity');
 await expect(page.locator('.orbit-intro-features > div')).toHaveCount(3);await expect(page.locator('.m-orbit-introduction__video source')).toHaveAttribute('src',/MSA_Corrected_Review/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.goto('/palette-preview/');await expect(page.locator('html')).toHaveAttribute('lang',lang);
 for(const mode of ['light','dark']) {
  await expect(page.locator('#palette-preview')).toHaveAttribute('data-mode',mode);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:test.info().outputPath(`preview-${lang}-${width}-${mode}.png`),fullPage:true});
  if(mode==='light') await page.locator('#mode').click();
 }
 await page.locator('#language').click(); await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'ltr':'rtl');
});
test('guest login restores opportunity without automatically applying',async({page})=>{
 await seed(page); await page.locator('#apply').click(); await page.locator('.opportunity-auth-dialog a[href*="login/"]').click();
 await page.locator('[data-user="teacher"]').click(); await page.locator('#loginButton').click(); await page.waitForURL('**/jobs/jobs.html?id=preview-job');
 await expect(page.locator('#apply')).toBeVisible();await expect(page.locator('#apply-form')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.recruitment.v1')).applications.length)).toBe(0);
 await page.locator('#apply').click();await expect(page.locator('#apply-form [name="consent"]')).toHaveAttribute('required','');
});
for(const role of ['student','school']) test(`${role} cannot submit`,async({page})=>{
 await seed(page,role); await expect(page.locator('#opportunity-eligibility')).toBeEmpty(); await page.locator('#apply').click();await expect(page.locator('#opportunity-eligibility')).not.toBeEmpty();await expect(page.locator('#apply-form')).toHaveCount(0);
 expect(await page.evaluate(()=>{try{OrbitRecruitment.apply('preview-job','',true);return false}catch(e){return e.message==='ROLE_DENIED'}})).toBeTruthy();
});
test('auth cross links retain selected opportunity',async({page})=>{
 await seed(page);await page.goto('/registration/registration.html?role=teacher&opportunity=preview-job');await expect(page.locator('#account-role')).toHaveValue('teacher');
 for(const link of await page.locator('a[href*="/login/login.html"]').all()) await expect(link).toHaveAttribute('href',/opportunity=preview-job/);
});

test('Teacher registration restores opportunity and still requires explicit application',async({page})=>{
 await seed(page);await page.goto('/registration/registration.html?role=teacher&opportunity=preview-job');
 const form=page.locator('#registration-form');await form.locator('[name="name"]').fill('New Teacher');await form.locator('[name="email"]').fill(`preview-${Date.now()}@example.com`);await form.locator('[name="password"]').fill('PreviewPass1234');await form.locator('[name="confirm"]').fill('PreviewPass1234');await form.locator('[name="qualification"]').fill('Physics degree');await form.locator('button[type=submit]').click();await page.waitForURL('**/jobs/jobs.html?id=preview-job');await expect(page.locator('#apply')).toBeVisible();await expect(page.locator('#apply-form')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.recruitment.v1')).applications.length)).toBe(0);
});
test('production dark theme remains readable in RTL and LTR',async({page})=>{
 for(const lang of ['ar','en']) {await seed(page,'',lang,'dark');await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');await expect(page.locator('.opportunity-heading')).toBeVisible();await page.locator('#apply').click();await expect(page.locator('.opportunity-auth-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.opportunity-auth-dialog')).not.toBeVisible();await page.goto('/hompage/hompage.html');await expect(page.locator('#discover-orbit-title')).toBeVisible();}
});
