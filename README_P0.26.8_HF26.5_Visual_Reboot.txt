P0.26.8 HF26.5 Visual Reboot

目的
- 舊 xianxia_world.glb 主地圖與舊高度/森林碰撞資料退出正式流程。
- 新世界由 HF265Terrain / QuaterniusNature / ChineseArchitecture / Water / Atmosphere / Horizon 組成。
- 自然資產使用 Quaternius Stylized Nature MegaKit Standard 的 CC0 glTF。
- runtime 會先嘗試 public/assets/quaternius/nature；未本機化時改從已驗證的公開 GitHub mirror 載入。
- 可執行 npm run assets:quaternius:hf265 將所需 Quaternius 檔案下載到 public/assets/quaternius/nature。

世界資料
- src/shared/data/hf265-world-layout.ts 是新場景位置/碰撞/高度的共享來源。
- Server navigation 與 Client visual placement 不再依賴 xianxia-world-map.ts。
- 湖面、石橋、亭台、遠山、霧層全部重建。

裝備
- 新增 hf265-equipment-art-direction.ts。
- 布料：霧青藍/灰青；金屬：古金/冷銀；玉石：灰青玉；暖色點綴：珊瑚桃。
- 保留原本骨架/fit pipeline，避免視覺改版破壞戰鬥與裝備穿戴。
