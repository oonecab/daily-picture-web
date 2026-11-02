import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createApp} from '../server.mjs';
import {jpeg} from '../test/fixtures/jpeg.mjs';

const output=resolve('test-output/browser');await mkdir(output,{recursive:true});
const records=[],errors=[];let imageCalls=0;
const row=(market,date)=>({id:'OHR.Fixture'+date.replaceAll('-',''),date,market,title:'Test photograph',description:'Deterministic local fixture',credit:'Test fixture',copyright:'Test fixture'});
const service={image:async()=>{imageCalls++;return jpeg();},archive:async(market='zh-CN')=>({market,images:[row(market,'2026-11-02'),row(market,'2026-11-01')]}),historyFor:market=>({catalog:async()=>({market,latest:'2026-11',months:['2026-11','2026-10','2025-12']}),month:async month=>({market,month,images:[{...row(market,month+'-01'),history:true}]})})};
const app=createApp({service});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{})});
 // Actual SW + CacheStorage: seed the old broken representation, recover via proxy,
 // then confirm direct and proxy reuse only the healthy bytes, including offline.
 const cached=await browser.newContext();const cp=await cached.newPage();cp.on('pageerror',e=>errors.push(e.message));await cp.goto(base+'/icon.svg');
 await cp.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});await cp.waitForFunction(()=>navigator.serviceWorker.controller);
 const url='/api/image?id=OHR.CacheRecovery&size=1920x1080';
 await cp.evaluate(async({url,bytes})=>{const c=await caches.open('daily-picture-v1-images');await c.put(url,new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg'}}));},{url,bytes:[...jpeg(80,80)]});
 const dimensions=await cp.evaluate(async url=>{const b=await createImageBitmap(await (await fetch(url)).blob());const result=[b.width,b.height];b.close();return result;},url);
 assert.deepEqual(dimensions,[1920,1080]);assert.equal(imageCalls,1);
 await cp.waitForFunction(async url=>(await (await caches.open('daily-picture-v1-images')).match(url))?.headers.get('X-Daily-Picture-Verified')==='dimensions-v1',url);
 await cached.setOffline(true);
 const offline=await cp.evaluate(async url=>{const b=await createImageBitmap(await (await fetch(url+'&direct=1')).blob());return [b.width,b.height];},url);
 assert.deepEqual(offline,[1920,1080]);assert.equal(imageCalls,1);records.push('legacy cache recovery and offline direct/proxy reuse');await cached.close();
 // UI fixtures deliberately bypass SW: isolates selection/layout from upstream.
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==base)return route.abort();if(u.pathname.endsWith('/image'))return route.fulfill({contentType:'image/jpeg',body:jpeg()});return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.waitForFunction(()=>document.getElementById('daily-background').classList.contains('ready'));
 const background=await page.locator('#daily-background').evaluate(e=>e.style.backgroundImage);
 await page.locator('#history-tab').click();await page.waitForFunction(()=>!document.getElementById('history-year').disabled);
 await page.selectOption('#history-month','2026-10');await page.waitForFunction(()=>document.getElementById('history-status').textContent.includes('本月收录'));
 assert.equal(await page.locator('#daily-background').evaluate(e=>e.style.backgroundImage),background);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  for(const id of ['market','history-market','history-year','history-month']){
   const select=page.locator('#'+id);await select.click();assert.equal(await select.evaluate(e=>e.matches(':open')),true);
   const d=await select.evaluate(e=>{const c=getComputedStyle(e,'::picker(select)'),r=(e.closest('.history-date-field')||e).getBoundingClientRect(),o=e.options[0].getBoundingClientRect();return {field:r.width,picker:parseFloat(c.width),left:r.left,popup:o.left-parseFloat(c.paddingLeft)-parseFloat(c.borderLeftWidth)};});
   assert.ok(Math.abs(d.field-d.picker)<.5,`${width} ${id} width`);assert.ok(Math.abs(d.left-d.popup)<.5,`${width} ${id} left`);await page.keyboard.press('Escape');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.getByRole('button',{name:'浏览设置',exact:true}).click();await page.locator('#daily-background-toggle').uncheck();
 assert.equal(await page.locator('#daily-background').evaluate(e=>e.style.backgroundImage),'');await page.reload();assert.equal(await page.locator('#daily-background-toggle').isChecked(),false);
 await page.getByRole('button',{name:'浏览设置',exact:true}).click();await page.locator('#daily-background-toggle').check();await page.locator('#settings-dialog .close-dialog').click();
 await page.waitForFunction(()=>document.getElementById('daily-background').classList.contains('ready'));
 await page.screenshot({path:resolve(output,'mobile.png')});assert.deepEqual(errors,[]);records.push('background independence, preference persistence, 12 dropdown alignment combinations');
 await writeFile(resolve(output,'results.json'),JSON.stringify({status:'pass',browser:browser.version(),records,errors},null,2));console.log(JSON.stringify({status:'pass',records}));
}catch(error){await writeFile(resolve(output,'results.json'),JSON.stringify({status:'fail',records,errors,error:error.message},null,2));throw error;}
finally{await browser?.close();await new Promise(r=>app.close(r));}
