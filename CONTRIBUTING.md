# 維護與貢獻

新增遊戲放在 `src/games/<category>/game-<number>-<slug>/`，至少提供 `index.html`、`main.ts` 及其真實存在的相依檔案。目錄僅接受既有 6 類；新增類別時同步更新 `scripts/catalog.mjs`、首頁樣式與測試。編號是展示資料；category/slug 才是唯一 ID。

HTML 入口使用 `type="module"` 與 `main.ts`。不要新增相鄰的編譯 JS，也不要引用不存在的 manifest 或 icon。不可禁用使用者縮放。提供清楚的控制項名稱、鍵盤操作、觸控操作說明及可用的降級路徑。

```sh
node scripts/normalize-pages.mjs --write
npm run generate:catalog
npm run verify
npx playwright install chromium
npm run test:e2e
```

Normalize 預設是 check-only；只有 `--write` 才修改遊戲 HTML。目錄、sitemap、robots、llms 是產生資料，不應手動填入頁面數、虛構完成狀態或建置日期當成內容更新日期。

共用語系使用 literal / nested translation keys，缺譯時回退。儲存應包覆例外處理並驗證讀入值；不要只依賴 TypeScript 型別來信任 localStorage。公開遊戲不得包含秘密金鑰。可選分析服務應預設停用，並由部署方處理告知與同意。

新增功能應增加回歸測試。E2E 的每頁啟動測試只檢查短時間啟動、資源載入及可見起始按鈕，不等同所有規則、關卡、GPU、音效或行動裝置已驗收。PR 請說明實測範圍與未測項目。
