import { chromium } from 'playwright';

const base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});

async function read(){
  return await page.evaluate(()=>({
    progress:Number(window.__STARSHIP_PROGRESS||0),
    ready:Boolean(window.__STARSHIP_READY),
    error:window.__STARSHIP_ERROR||null,
    fatalHidden:document.getElementById('fatal')?.hidden ?? null,
    loader:document.getElementById('loaderPct')?.textContent||''
  }));
}

await page.waitForFunction(()=>Number(window.__STARSHIP_PROGRESS||0)>=14 || Boolean(window.__STARSHIP_ERROR),null,{timeout:20000});
let s=await read();
console.log('startup',s);
if(s.error) throw new Error(s.error);
if(s.progress<14) throw new Error('startup did not pass 14%');

await page.waitForFunction(()=>Number(window.__STARSHIP_PROGRESS||0)>=24 || Boolean(window.__STARSHIP_ERROR),null,{timeout:20000});
s=await read();
console.log('environment',s);
if(s.error) throw new Error(s.error);

await page.waitForFunction(()=>Boolean(window.__STARSHIP_READY) || Boolean(window.__STARSHIP_ERROR),null,{timeout:90000});
s=await read();
console.log('ready',s);
if(s.error) throw new Error(s.error);
if(!s.ready || s.progress<100) throw new Error('high-detail runtime did not become ready');

const speed=page.locator('#speedSelect');
for(const value of ['1','2','5','10','25','50']){
  await speed.selectOption(value);
  const actual=await speed.inputValue();
  if(actual!==value) throw new Error('speed selector failed for '+value);
}

await page.screenshot({path:'smoke-home.png',fullPage:false});

const fallback=await browser.newPage({viewport:{width:1280,height:800}});
const fallbackErrors=[];
fallback.on('pageerror',e=>fallbackErrors.push(e.message));
await fallback.goto(new URL('fallback.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
await fallback.waitForTimeout(2500);
if(fallbackErrors.length) throw new Error('fallback page error: '+fallbackErrors.join('; '));
await fallback.screenshot({path:'smoke-fallback.png',fullPage:false});

if(errors.length){
  const serious=errors.filter(x=>!/favicon|DevTools/i.test(x));
  if(serious.length) throw new Error(serious.join('\n'));
}
await browser.close();
console.log('Browser smoke PASS');
