# Awesome Free Games 1000

**免費瀏覽器遊戲實作合集 · Browser games, built for the web**

首頁保留原始專案介紹、代表遊戲與 FAQ 設計，完整遊戲清單見 `catalog.html`。「1000」是專案名稱與目標。目前原始碼有 **997 個遊戲頁面、6 個實際分類**，有頁面不代表所有關卡、裝置或玩法均已完整測試。

## 開始使用

需要 **Node.js 22.12 以上**。

```sh
npm ci
npm run dev
```

開啟終端機顯示的本機網址。首頁維持稽核前的版型，沒有新增搜尋、分類篩選或收藏清單介面。`catalog.html` 是不依賴 JavaScript 的完整文字目錄。各子遊戲仍保有返回首頁與收藏按鈕。收藏使用瀏覽器的 localStorage，不傳送到伺服器，儲存不可用時會降級為當次頁面工作階段的記憶體資料。

## 驗證與建置

```sh
npm test                 # 首頁設計保護、資料處理、i18n、儲存與遊戲回歸
npm run typecheck        # 全部 TypeScript 原始碼
npm run build            # 產生目錄、驗證來源、多頁建置、驗證產物
npx playwright install chromium
npm run test:e2e         # 原始首頁導覽與每一遊戲頁面的短時間啟動測試
npm run preview
```

`npm run verify` 依序執行單元測試、型別檢查與建置。E2E 另行執行，需要 Chromium，CI 會安裝瀏覽器。

**部署建置完成的 `dist/` 目錄。** 遊戲的 TypeScript 必須先編譯。建置會輸出首頁、完整目錄，以及全部遊戲 HTML（目前共 999 個 HTML）。`base: './'` 保留相對資源路徑，E2E 使用 `/awesome-free-games-1000/` 子路徑驗證部署連結。

自訂網域或子路徑時，設定 canonical / sitemap 使用的網址：

```sh
SITE_URL=https://example.com/games/ npm run build
```

`SITE_URL` 必須是沒有帳密、query 或 fragment 的 HTTP(S) URL。預設是本專案 GitHub Pages 網址，設定本身不會開通 GitHub Pages。既有父專案部署通知只會在 main/dev 的 Quality workflow 成功後執行，且需要現有 `GH_PAT` secret。此 repo 不會自動建立 Firebase 或其他後端服務。

## 實際收錄分類

| 目錄 | 分類 | 頁面數 |
| --- | --- | ---: |
| puzzle | 益智解謎 | 150 |
| arcade | 經典街機 | 155 |
| action | 動作冒險 | 100 |
| runner | 跑酷挑戰 | 197 |
| card | 卡牌策略 | 195 |
| horror | 驚悚探索 | 200 |

數量由 `src/games/**/index.html` 掃描產生，以 `public/catalog.json` 的當次建置結果為準。歷史遊戲編號會重複，收藏與目錄使用 `category/slug` 作為識別值，不以編號作為唯一 ID。

## 架構與能力邊界

前端為 Vanilla TypeScript / JavaScript、HTML 與 CSS，各遊戲使用 DOM、Canvas 或其自身圖形渲染程式。Vite 執行多頁建置。共用導覽列提供返回首頁與收藏。**首頁設計受保護，可重新設計的範圍限於個別子遊戲**，詳見 [維護與貢獻](CONTRIBUTING.md)。

共用 i18n 能識別 16 種 locale，但**每款遊戲實際提供的翻譯不同**。缺少目標語言時回退至現有英文或繁體中文，不代表 16 種翻譯已全部完成。WebGPU、觸控、聲音與瀏覽器支援也依個別遊戲而異。驚悚分類可能含驚嚇情節。

GA4 模組預設不啟用，只提供有效 measurement ID 才會初始化，並尊重 Do Not Track / Global Privacy Control。啟用前仍需由部署者實作適用的告知與同意流程。Firebase、帳號系統、雲端排行榜及 PWA 離線安裝並未在此版本配置完成。

```text
index.html                   # 受保護的原始首頁
src/portal/                  # 本機收藏與保留的目錄模組，首頁不載入新版大廳
src/shared/                  # 語系、工具、可選分析與隔離式導覽列
src/games/<category>/<slug>/ # 各子遊戲 HTML、TypeScript、CSS
scripts/                     # 目錄、sitemap、來源與產物驗證
public/                      # 靜態資源與自動生成目錄
tests/                       # 單元與瀏覽器回歸測試
```

歷史 `.js` 衍生檔仍保留以避免破壞其他直接引用者，Vite 明確優先解析 `.ts`，子遊戲 HTML 入口也使用 TypeScript。請勿手動維護相鄰的編譯產物。

## 文件與授權

[維護與貢獻](CONTRIBUTING.md) · [安全性](SECURITY.md) · [2026-09-24 Audit](docs/AUDIT-2026-09-24.md) · [首頁還原與範圍更正](docs/HOMEPAGE-RESTORATION-2026-09-24.md) · [原始開發計畫（非完成清單）](plan.md)

此倉庫原先有 MIT 標章，但沒有對應的 LICENSE 文件。本次不代替權利人新增授權條款，也不再展示該標章。公開可讀不等同取得再散布或商用授權，正式授權需要由專案擁有者確認。

### English quick notes

This is a frontend game-implementation collection, not a claim that 1,000 games are fully verified. Use Node.js 22.12+, run `npm ci`, then `npm run dev`. Build and deploy **dist/**. The original homepage design is preserved. Visual redesign is limited to individual game pages unless separately authorized. The generated catalogue lists actual pages, multilingual coverage varies, and game favorites remain local. Static/build checks and short browser smoke tests do not establish full gameplay correctness.
