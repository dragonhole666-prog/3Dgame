青嵐志 P0.26.8 HF34 — Babylon.js 參考圖 LookDev 鎖定
====================================================

目標
----
將 Babylon.js 設為遊戲主要 Runtime，Three.js 僅保留 ?engine=three 顯式舊版 fallback。
HF34 鎖定的是使用者提供之修仙庭園參考圖的「著色 / 材質 / 光影 / 大氣 / 水體 / 色彩語言」。

參考圖核心
----------
- 青藍天空、湖水與遠山霧氣。
- 紅橘 / 珊瑚楓葉做視覺焦點，不對整張畫面套橘色濾鏡。
- 自然深綠植被；避免螢光綠。
- 暖深木構、暖灰石材、深色屋瓦。
- 暖陽光 + 冷環境陰影。
- ACES highlight rolloff。
- restrained Bloom，不用 Bloom 掩蓋材質或模型問題。
- 遠山與霧必須形成清楚的大氣透視。

HF34 實作
---------
1. src/main.ts 已維持 Babylon 為預設 Runtime。
2. reference-style.ts 擴充為完整參考圖 palette + render target。
3. reference-pipeline.ts：
   - ACES
   - selective warm/cool ColorCurves
   - restrained Bloom
   - FXAA
   - SSAO2
   - 關閉過重 grain
4. xianxia-world.ts：
   - Quaternius Nature MegaKit 為優先自然資產。
   - 本機沒有 Quaternius 時才使用程序 fallback。
   - 保留 HF265 authoritative terrain / collision layout，不修改移動與碰撞規則。
   - 水面加入 MirrorTexture + normal detail。
   - 亭台、橋、岩石、遠山、湖霧色彩重新鎖到參考圖。
5. LookDev localStorage key 升到 HF34，舊的 LookDev 數值不再污染新基線。
6. 相機控制、玩家移動、碰撞與 server movement 未在 HF34 修改。

Quaternius 本機素材
-----------------
如本機尚未存在 public/assets/quaternius/nature：
npm run assets:quaternius:hf265

驗證
----
npm run typecheck
npm test
npm run verify:p0:babylon
npm run build:babylon

視覺驗收
--------
建議用：
?visualCapture=spawn
?visualCapture=bridge
?visualCapture=pavilion
?visualCapture=forest
?lookdev=1

注意：HF34 的目標是讓渲染語言無限接近參考圖。
若要連「橋、亭台、楓樹位置與水面佔畫面比例」都接近參考圖，下一階段應以固定相機截圖做構圖級 Visual Regression。
