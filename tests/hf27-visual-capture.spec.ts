import { test,expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const plan=JSON.parse(
  readFileSync(new URL('../config/hf27-screenshot-plan.json',import.meta.url),'utf8')
) as {
  settleMs:number;
  captures:Array<{id:string;url:string}>;
};

const outDir='artifacts/hf27-screenshots';
mkdirSync(outDir,{recursive:true});

for(const capture of plan.captures){
  test(`P0 visual capture · ${capture.id}`,async({page})=>{
    await page.goto(capture.url,{waitUntil:'domcontentloaded',timeout:30_000});

    await page.waitForFunction(
      ()=>document.documentElement.dataset.qinglanReady==='1',
      undefined,
      {timeout:30_000}
    );

    await page.waitForTimeout(Math.min(plan.settleMs,2_500));
    await expect(page.locator('#app')).toBeVisible();

    const bootError=page.locator('.boot-error');
    expect(await bootError.count(),`boot error on ${capture.id}`).toBe(0);

    const canvas=page.locator('#qinglan-canvas');
    await expect(canvas).toBeVisible();

    await page.screenshot({
      path:`${outDir}/${capture.id}.png`,
      fullPage:false
    });
  });
}
