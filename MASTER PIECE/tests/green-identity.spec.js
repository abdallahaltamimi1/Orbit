import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const footerBaseline=JSON.parse(fs.readFileSync(new URL('./fixtures/footer-identity.json',import.meta.url),'utf8'));
async function appearance(page,lang,theme,role='') {
  await page.goto('/login/login.html');
  await page.evaluate(({lang,theme,role})=>{
    localStorage.setItem('orbit.student.v1',JSON.stringify({lang,theme}));
    localStorage.setItem('orbit.settings.appearance',JSON.stringify(theme));
    if(role)localStorage.setItem('orbitUser',JSON.stringify({role,email:role+'@orbit.com',name:'Theme test'}));else localStorage.removeItem('orbitUser');
  },{lang,theme,role});
}
function contrast(a,b) {
  const luminance=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const[light,dark]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(light+.05)/(dark+.05);
}
for(const lang of ['ar','en'])for(const theme of ['light','dark'])test(`approved green controls ${lang} ${theme}`,async({page})=>{
  for(const[route,role,action]of [
    ['/hompage/hompage.html','','.m-nav__cta'],
    ['/login/login.html','','#loginButton'],
    ['/registration/registration.html?role=teacher','','#registration-form button[type=submit]'],
    ['/teacher-dashboard/teacher-dashboard.html','teacher','.button.primary, .btn:not(.soft):not(.danger)'],
    ['/school-dashboard/school-dashboard.html','school','#new-job'],
    ['/settings/settings.html','student','.btn:not(.soft)'],
  ]){
    await appearance(page,lang,theme,role);await page.goto(route);
    await expect(page.locator('body')).toHaveAttribute('data-theme',theme);
    await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
    const button=page.locator(action).filter({visible:true}).first();
    await expect(button).toHaveCSS('background-color','rgb(52, 211, 153)');
    await expect(button).toHaveCSS('color','rgb(6, 78, 59)');
    const pair=await button.evaluate(el=>{const s=getComputedStyle(el);return[s.color,s.backgroundColor]});expect(contrast(...pair)).toBeGreaterThanOrEqual(4.5);
    await button.hover();await expect(button).toHaveCSS('background-color','rgb(110, 231, 183)');
    await button.focus();expect(await button.evaluate(e=>getComputedStyle(e).outlineStyle)).toBe('solid');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
for(const theme of ['light','dark'])test(`approved Footer remains unchanged ${theme}`,async({page})=>{
  test.setTimeout(90_000);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const ref of footerBaseline.filter(r=>r.theme===theme)){
    await page.setViewportSize({width:ref.width,height:950});await appearance(page,ref.lang,theme);await page.goto('/'+ref.route);
    const footer=page.locator('#orbit-site-footer');await expect(footer).toBeVisible();await page.evaluate(()=>document.fonts.ready);await footer.scrollIntoViewIfNeeded();
    const actual=await footer.evaluate((el,props)=>Object.fromEntries(props.map(p=>[p,getComputedStyle(el)[p]])),Object.keys(ref.root));
    expect(actual,`${ref.route} ${ref.lang} ${ref.width}`).toEqual(ref.root);
    await footer.locator('a').first().hover();await page.waitForTimeout(250);
    expect(await footer.locator('a').first().evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).background,transform:getComputedStyle(el).transform}))).toEqual(ref.hover);
    expect(await footer.evaluate(el=>['::before','::after'].map(p=>{const s=getComputedStyle(el,p);return{background:s.background,opacity:s.opacity,content:s.content}}))).toEqual(ref.pseudo);
  }
});
for(const theme of ['light','dark'])test(`administrator identity honors saved ${theme} appearance`,async({page})=>{
  await appearance(page,'en',theme,'admin');await page.evaluate(()=>{
    localStorage.setItem('orbit.recruitment.v1',JSON.stringify({accounts:[{email:'admin@orbit.com',role:'admin',status:'active',name:'Theme administrator'}],schools:[],jobs:[],applications:[],notifications:[]}));
    sessionStorage.setItem('orbit.admin.session',JSON.stringify({email:'admin@orbit.com',token:'isolated-theme-fixture',expiresAt:Date.now()+3600000}));
  });
  await page.goto('/admin/admin.html');await expect(page.locator('body')).toHaveAttribute('data-theme',theme);await expect(page.locator('.admin-content')).toBeVisible();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const colors=await page.locator('.admin-topbar').evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
    expect(colors.background).toBe(theme==='dark'?'rgb(25, 38, 62)':'rgb(255, 255, 255)');expect(contrast(colors.color,colors.background)).toBeGreaterThanOrEqual(4.5);
  }
  // Access remains guarded when the existing proof is removed.
  await page.evaluate(()=>sessionStorage.removeItem('orbit.admin.session'));await page.reload();await expect(page.locator('.admin-content')).toHaveCount(0);
});
