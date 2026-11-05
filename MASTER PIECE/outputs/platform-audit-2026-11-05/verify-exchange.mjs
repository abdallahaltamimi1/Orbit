// Requires Vite on 5176. All accounts/listings live in a disposable context.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.ORBIT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const context=await browser.newContext(),page=await context.newPage();
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('audit-exchange'))return;sessionStorage.setItem('audit-exchange','1');
  localStorage.setItem('orbitUser',JSON.stringify({role:'student',email:'student@orbit.com',name:'Owner'}));
  localStorage.setItem('orbit.student.v1',JSON.stringify({lang:'en',theme:'light'}));
 });
 await page.goto('http://127.0.0.1:5176/exchange/exchange.html');await page.locator('#add-item').click();
 for(const[name,value]of Object.entries({title:'Exchange request audit',description:'Isolated local request.',location:'Amman',quantity:'1',price:'3',contact:'owner@example.test'}))await page.locator(`#listing-form [name="${name}"]`).fill(value);
 await page.locator('#listing-form button').click();
 await page.evaluate(()=>{
  const key='orbit.recruitment.v1',records=JSON.parse(localStorage.getItem(key)||'{"accounts":[]}');
  records.accounts.push({email:'reader@example.test',role:'student',status:'active',name:'Reader'});localStorage.setItem(key,JSON.stringify(records));
  OrbitAuth.startSession({role:'student',email:'reader@example.test',name:'Reader'});
 });
 await page.reload();await page.locator('[data-detail]').click();await expect(page.locator('#edit-listing,#delete-listing')).toHaveCount(0);
 async function request(message){
  await page.locator('#request-form [name="contact"]').fill('reader@example.test');await page.locator('#request-form [name="message"]').fill(message);
  await page.locator('#request-form [type="checkbox"]').check();await page.locator('#request-form button').click();
 }
 await request('Can I collect the book tomorrow?');await expect(page.locator('#request-status')).toContainText('Request saved');
 await page.reload();await page.locator('[data-detail]').click();await request('Repeated request');await expect(page.locator('#request-status')).toContainText('already saved');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit.exchange.v2')).requests.length)).toBe(1);
 await page.evaluate(()=>OrbitAuth.startSession({role:'student',email:'student@orbit.com',name:'Owner'}));await page.reload();await expect(page.locator('#app')).toContainText('Can I collect the book tomorrow?');
 fs.writeFileSync(new URL('./exchange-request-verification.json',import.meta.url),JSON.stringify({passed:true,fixture:'Isolated listing/accounts; session switches use OrbitAuth.startSession; request/consent/duplicate/owner views use actual UI.',verified:['non-owner cannot edit/delete','consented local request saved','reload retry does not duplicate','owner sees actual request message'],externalDelivery:false},null,2));
 console.log('Exchange request, ownership and duplicate checks passed.');
}finally{await browser.close();}
