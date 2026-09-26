import { test,expect } from '@playwright/test';
import plan from '../config/hf27-screenshot-plan.json';
import { mkdirSync } from 'node:fs';

const outDir='artifacts/hf27-screenshots';mkdirSync(outDir,{recursive:true});
for(const capture of plan.captures){
 test(`HF27 visual capture · ${capture.id}`,async({page})=>{
  await page.goto(capture.url,{waitUntil:'networkidle'});
  await page.waitForTimeout(plan.settleMs);
  await expect(page.locator('#app')).toBeVisible();
  const bootError=page.locator('.boot-error');expect(await bootError.count(),`boot error on ${capture.id}`).toBe(0);
  await page.screenshot({path:`${outDir}/${capture.id}.png`,fullPage:false});
 });
}
