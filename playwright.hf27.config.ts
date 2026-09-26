import { defineConfig } from '@playwright/test';

export default defineConfig({
 testDir:'./tests',
 testMatch:'hf27-visual-capture.spec.ts',
 timeout:90_000,
 workers:1,
 use:{baseURL:process.env.HF27_BASE_URL??'http://127.0.0.1:5173',viewport:{width:1600,height:900},deviceScaleFactor:1,trace:'retain-on-failure'},
 webServer:process.env.HF27_BASE_URL?undefined:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:120_000},
 outputDir:'artifacts/hf27-playwright',
});
