import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const dir=path.resolve('docs/ui-concepts-v2');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(pathToFileURL(path.join(dir,'gallery.html')).href);
console.log('views',await page.evaluate(()=>window.conceptV2.count));
const names=['home-3d','home-workstation','project-gallery','network-diagnostics','event-timeline','scenario-playback','compare-lab','context-assistant','live-report','presentation-mode'];
for(let i=0;i<10;i++){await page.evaluate(i=>window.conceptV2.show(i),i);await page.screenshot({path:path.join(dir,String(i+1).padStart(2,'0')+'-'+names[i]+'.png'),fullPage:true});console.log(i+1,await page.locator('h1').textContent(),await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))}
await page.evaluate(()=>window.conceptV2.show(5));
for(const [i,v] of [0,25,39,42,45,49,51,60,75,100].entries()){await page.evaluate(v=>window.conceptV2.setTime(v),v);await page.locator('.play-scene').screenshot({path:path.join(dir,'motion-play-'+String(i).padStart(2,'0')+'.png')})}
await page.evaluate(()=>window.conceptV2.show(7));
await page.locator('[data-prompt="change"]').click();
console.log('assistant changed',await page.locator('#ai-answer').textContent());
console.log('errors',errors);
await browser.close();
