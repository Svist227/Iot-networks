import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const dir=path.resolve('docs/ui-concepts-v2');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
await page.goto(pathToFileURL(path.join(dir,'gallery.html')).href);
for(let i=0;i<12;i++){await page.locator('.hero').screenshot({path:path.join(dir,'motion-home-'+String(i).padStart(2,'0')+'.png')});await page.waitForTimeout(400)}
await browser.close();
