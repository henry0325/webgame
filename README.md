# 諧音地下城：節奏遠征

全螢幕（單頁無捲動）節奏 TRPG 網頁遊戲。

## 這版重點

- **滿版單頁 UI**：不需往下滑，次要資訊放進 `details` 展開視窗。
- **美術升級**：玩家/敵人 SVG 重新繪製，表情、色彩與層次更完整。
- **裝備固定詞綴**：每件裝備有固定 ATK/COM/說明，不再亂跳。
- **裝備去重**：背包採 `Map` 數量堆疊，重複裝備只顯示 `xN`。
- **長線可玩性**：
  - 波次結束後進入下一輪 cycle（無限循環）
  - 危險度持續上升
  - 天賦點、等級、永久加成、每日高分持久化
  - Boss 蓄力攻擊與節拍壓力
  - 即時訊息欄 + 戰鬥/裝備/系統篩選 + 戰鬥統計(Perfect/Miss/總傷害)

## 快速開始

```bash
npm test
npm start
```

開啟 `http://localhost:8080`


## 測試

- `npm test` 會跑邏輯單元測試 + 300 回合遊戲模擬測試（長局穩定性）+ DOM 綁定契約測試（避免元件 ID 對不上造成整頁失效）。


## Sora 美術替換

- 將 Sora 輸出的圖片放到：`assets/player_sora.jpg` / `assets/player_sora.png`、`assets/enemy_sora.jpg` / `assets/enemy_sora.png`
- 遊戲啟動時會自動優先載入這兩張圖，沒有則回退 SVG。
- 可直接使用 `assets/SORA_PROMPTS.md` 的提示詞生成。
- 如需本機測試 JPG 覆蓋圖，可執行：`./scripts/generate_local_sora_placeholders.sh`（檔案會被 `.gitignore` 忽略，不會進 PR）。


## PR 二進位檔注意

- 本專案預設 **不提交** Sora 產生圖（JPG/PNG）到 Git，以避免部分 PR 工具不支援二進位 diff。
- 只要把檔案放在本機 `assets/player_sora.jpg` / `assets/enemy_sora.jpg`（或 png）即可被自動載入。
- 若一定要入版控，建議改用 Git LFS。


## 如何放上 Sora 圖（你直接照做）

1. 用 Sora 產生兩張圖，檔名固定：`player_sora.jpg`、`enemy_sora.jpg`。
2. 直接放到專案的 `assets/` 資料夾。
3. 啟動遊戲（`npm start`）重新整理頁面。
4. 左上角會顯示 `Art: Sora JPG/PNG` 代表載入成功；若顯示 `Art: SVG fallback` 代表檔名/路徑不對。
5. 這兩張圖預設被 `.gitignore` 忽略，只在本機使用，不會進 PR。


## GitHub 即時產生 Sora 圖（可選）

可用 `.github/workflows/sora-art-sync.yml`：
1. 在 repo secrets 設定 `SORA_IMAGE_ENDPOINT` 與 `SORA_API_KEY`。
2. 到 Actions 手動執行 `sora-art-sync`，輸入 `player` 或 `enemy`。
3. 圖會以 artifact 形式產出（不直接 commit binary）。


## 自動建議功能（已內建）

- 智慧輔助模式：每 20 次出招自動分析 Miss/Perfect 比例，動態微調 BPM 與危險度。
- 高對比模式：可即時切換，提高長時間遊玩辨識度。
- 戰報快照：每波會存 `last_run_snapshot` 到 localStorage。
