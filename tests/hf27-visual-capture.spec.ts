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

test('P0 fixed-camera visual capture suite',async({page})=>{
  await page.goto('/?visualCapture=spawn',{waitUntil:'domcontentloaded',timeout:30_000});

  await page.waitForFunction(
    ()=>document.documentElement.dataset.qinglanReady==='1',
    undefined,
    {timeout:30_000}
  );

  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#qinglan-canvas')).toBeVisible();
  expect(await page.locator('.boot-error').count(),'P0 boot error').toBe(0);

  for(const capture of plan.captures){
    await page.evaluate((id)=>{
      const app=(window as any).__QINGLAN_BABYLON__;
      if(!app?.setVisualCapturePreset) throw new Error('Qinglan camera API unavailable');
      app.setVisualCapturePreset(id);
    },capture.id);

    await page.waitForTimeout(650);
    await page.screenshot({
      path:`${outDir}/${capture.id}.png`,
      fullPage:false
    });
  }
});
