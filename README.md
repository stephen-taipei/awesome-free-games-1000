# 🎮 Awesome Free Games 1000

> 世界上最大的免費前端小遊戲合集 | The World's Largest Free Frontend Mini-Games Collection

[![Games](https://img.shields.io/badge/Games-1000-brightgreen)](./plan.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/Firebase-Integrated-orange)](https://firebase.google.com/)
[![Analytics](https://img.shields.io/badge/Google%20Analytics-Enabled-yellow)](https://analytics.google.com/)

## 🌍 多國語言支援 | Multi-Language Support

- 🇹🇼 繁體中文 (Traditional Chinese)
- 🇨🇳 简体中文 (Simplified Chinese)
- 🇺🇸 English
- 🇯🇵 日本語 (Japanese)
- 🇰🇷 한국어 (Korean)
- 🇪🇸 Español (Spanish)
- 🇫🇷 Français (French)
- 🇩🇪 Deutsch (German)
- 🇵🇹 Português (Portuguese)
- 🇷🇺 Русский (Russian)
- 🇮🇹 Italiano (Italian)
- 🇹🇭 ไทย (Thai)
- 🇻🇳 Tiếng Việt (Vietnamese)
- 🇮🇩 Bahasa Indonesia
- 🇸🇦 العربية (Arabic)
- 🇮🇳 हिन्दी (Hindi)

---

## 📊 開發進度 | Development Progress

| 類別 | 計劃數量 | 已完成 | 進度 |
|------|---------|--------|------|
| 🧩 益智遊戲 (Puzzle) | 150 | 0 | 0% |
| 🕹️ 街機遊戲 (Arcade) | 120 | 0 | 0% |
| 🎯 動作遊戲 (Action) | 100 | 0 | 0% |
| 🏃 跑酷遊戲 (Runner) | 80 | 0 | 0% |
| 🃏 卡牌遊戲 (Card) | 70 | 0 | 0% |
| ♟️ 棋盤遊戲 (Board) | 60 | 0 | 0% |
| 🎰 休閒遊戲 (Casual) | 100 | 0 | 0% |
| 🏎️ 競速遊戲 (Racing) | 50 | 0 | 0% |
| ⚔️ 策略遊戲 (Strategy) | 60 | 0 | 0% |
| 🎵 音樂遊戲 (Music/Rhythm) | 40 | 0 | 0% |
| 🔫 射擊遊戲 (Shooter) | 50 | 0 | 0% |
| 🏀 運動遊戲 (Sports) | 50 | 0 | 0% |
| 🎪 模擬遊戲 (Simulation) | 40 | 0 | 0% |
| 👻 恐怖遊戲 (Horror) | 30 | 0 | 0% |
| **總計 (Total)** | **1000** | **0** | **0%** |

---

## 🛠️ 技術棧 | Tech Stack

### 核心框架 | Core Framework
- **React 18** / **Vue 3** / **Vanilla JS** - 依遊戲需求選用
- **TypeScript** - 類型安全
- **Vite** - 快速建構工具

### 遊戲引擎 | Game Engines
- **Phaser 3** - 2D 遊戲引擎
- **PixiJS** - 2D WebGL 渲染
- **Three.js** - 3D WebGL 引擎
- **Babylon.js** - 3D 遊戲引擎
- **PlayCanvas** - WebGL 遊戲引擎
- **Matter.js** - 2D 物理引擎
- **Cannon.js** - 3D 物理引擎

### 先進技術 | Advanced Technologies
- **WebGL 2.0** - 硬體加速渲染
- **WebGPU** - 次世代圖形 API
- **Web Audio API** - 音效處理
- **WebXR** - VR/AR 支援
- **WebAssembly (WASM)** - 高效能運算
- **Web Workers** - 多執行緒處理
- **IndexedDB** - 本地存儲遊戲進度

### 整合服務 | Integrated Services
- **Firebase**
  - Authentication (匿名登入、社群登入)
  - Cloud Firestore (排行榜、成就)
  - Cloud Messaging (推播通知)
  - Hosting (遊戲部署)
  - Remote Config (遊戲參數配置)
- **Google Analytics 4**
  - 流量統計
  - 使用者行為分析
  - 遊戲事件追蹤
  - 轉換追蹤

### UI/UX
- **Tailwind CSS** - 響應式設計
- **Framer Motion** - 動畫效果
- **Howler.js** - 音效管理

---

## 🎮 已完成遊戲展示 | Completed Games Showcase

> 🚧 開發中... 敬請期待！
>
> 🚧 Under Development... Stay tuned!

<!--
### 🧩 益智類 | Puzzle Games

#### 1. 2048
**技術**: Vanilla JS + CSS Grid
**特色**: 經典數字合併遊戲，支援觸控滑動操作
**遊玩連結**: [Play 2048](./games/puzzle/2048/)

---
-->

## 📁 專案結構 | Project Structure

```
awesome-free-games-1000/
├── README.md                 # 專案說明 (本文件)
├── plan.md                   # 1000 個遊戲開發計劃
├── package.json              # 專案依賴
├── firebase.json             # Firebase 配置
├── .firebaserc               # Firebase 專案設定
├── src/
│   ├── shared/               # 共用模組
│   │   ├── i18n/             # 多國語言
│   │   ├── analytics/        # GA4 追蹤
│   │   ├── firebase/         # Firebase 服務
│   │   ├── components/       # 共用 UI 元件
│   │   └── utils/            # 工具函數
│   └── games/                # 遊戲目錄
│       ├── puzzle/           # 益智遊戲
│       ├── arcade/           # 街機遊戲
│       ├── action/           # 動作遊戲
│       ├── runner/           # 跑酷遊戲
│       ├── card/             # 卡牌遊戲
│       ├── board/            # 棋盤遊戲
│       ├── casual/           # 休閒遊戲
│       ├── racing/           # 競速遊戲
│       ├── strategy/         # 策略遊戲
│       ├── music/            # 音樂遊戲
│       ├── shooter/          # 射擊遊戲
│       ├── sports/           # 運動遊戲
│       ├── simulation/       # 模擬遊戲
│       └── horror/           # 恐怖遊戲
├── public/
│   ├── assets/               # 靜態資源
│   │   ├── images/           # 圖片
│   │   ├── sounds/           # 音效
│   │   ├── fonts/            # 字型
│   │   └── sprites/          # 精靈圖
│   └── locales/              # 語言檔案
└── docs/                     # 文檔
    ├── setup.md              # 安裝說明
    ├── firebase-setup.md     # Firebase 設置
    └── contributing.md       # 貢獻指南
```

---

## 🚀 快速開始 | Quick Start

### 安裝依賴 | Install Dependencies
```bash
npm install
```

### 開發模式 | Development Mode
```bash
npm run dev
```

### 建置專案 | Build Project
```bash
npm run build
```

### 部署到 Firebase | Deploy to Firebase
```bash
npm run deploy
```

---

## 🔥 Firebase 設定 | Firebase Setup

### 1. 建立 Firebase 專案
前往 [Firebase Console](https://console.firebase.google.com/) 建立新專案

### 2. 啟用服務
- Authentication (啟用匿名登入)
- Cloud Firestore
- Cloud Messaging
- Hosting

### 3. 設定環境變數
建立 `.env.local` 檔案：
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 📈 Google Analytics 事件 | GA4 Events

| 事件名稱 | 說明 | 參數 |
|---------|------|------|
| `game_start` | 遊戲開始 | game_id, game_name |
| `game_end` | 遊戲結束 | game_id, score, duration |
| `level_complete` | 關卡完成 | game_id, level, score |
| `achievement_unlock` | 成就解鎖 | achievement_id, game_id |
| `share_game` | 分享遊戲 | game_id, platform |
| `push_subscribe` | 訂閱推播 | - |

---

## 🤝 貢獻指南 | Contributing

歡迎貢獻！請閱讀 [CONTRIBUTING.md](docs/contributing.md) 了解詳情。

1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/amazing-game`)
3. 提交變更 (`git commit -m 'Add some amazing game'`)
4. 推送到分支 (`git push origin feature/amazing-game`)
5. 開啟 Pull Request

---

## 🤖 AI 輔助開發流程 (Claude Code Web)

本專案設計為可透過 AI 輔助進行迭代開發。以下是使用 Claude Code Web 進行 1~1000 遊戲開發的標準流程與 Prompt 模板。

### 開發流程概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI 輔助迭代開發流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│   │  開始   │───▶│ 開發遊戲 │───▶│ 建立 PR │───▶│ 總結上文 │    │
│   │ #N 遊戲 │    │   #N    │    │  #N     │    │ 準備 #N+1│    │
│   └─────────┘    └─────────┘    └─────────┘    └────┬────┘    │
│        ▲                                            │          │
│        └────────────────────────────────────────────┘          │
│                      重複直到 #1000                             │
└─────────────────────────────────────────────────────────────────┘
```

### Prompt 模板

#### 首次開發 (從 #1 開始)

```markdown
## 專案背景
- 專案名稱：Awesome Free Games 1000
- 專案目標：開發 1000 個純前端小遊戲
- 技術棧：React/Vue/Vanilla JS + TypeScript + Phaser/PixiJS + Firebase
- 參考文件：README.md, plan.md

## 當前進度
- 已完成：#0 (專案初始化)
- 當前任務：#1

## 本次任務
請開發第 #1 個遊戲：[遊戲名稱]

### 需求規格
- 遊戲類型：[益智/街機/動作/跑酷 等]
- 核心玩法：[遊戲機制說明]
- 輸入方式：[鍵盤/滑鼠/觸控]
- 使用引擎：[Phaser/PixiJS/Vanilla JS]

### 技術要求
- 純前端實現，遊戲邏輯無需後端
- Firebase 整合：排行榜、成就 (可選)
- 支援行動裝置觸控操作
- 包含音效與背景音樂

### 完成標準
1. 遊戲核心機制實作完成
2. 基礎 UI (選單、暫停、結算) 完成
3. 至少 3 個難度等級或關卡
4. 本地遊玩測試通過
5. 提交 commit 並建立 PR

### PR 格式要求
- 標題：`[#1] 遊戲名稱 - 遊戲類型`
- 內容包含：玩法說明、操作方式、技術實現、遊戲截圖/GIF

### 完成後請提供
1. 本次變更摘要 (3-5 點重點)
2. 遊戲平衡性調整建議
3. 下一個遊戲 #2 的前置準備建議
4. **上下文摘要** (供下次對話使用，約 200-300 字)
```

#### 後續開發 (從 #N 繼續)

```markdown
## 上下文延續
[貼上上次 Claude 提供的上下文摘要]

## 專案背景
- 專案：Awesome Free Games 1000
- 參考：README.md, plan.md

## 當前進度
- 已完成：#1 ~ #N-1
- 當前任務：#N
- 當前分類：[如：puzzle 益智遊戲]

## 本次任務
請開發第 #N 個遊戲：[遊戲名稱]

### 需求規格
[同上格式]

### 完成後請提供
1. 本次變更摘要
2. 遊戲平衡性調整建議
3. 下一個遊戲的前置準備
4. **上下文摘要** (供下次對話使用)
```

### 上下文摘要範本

```markdown
## 上下文摘要 (遊戲 #N 完成後)

### 專案狀態
- 完成進度：N/1000 (N%)
- 最新遊戲：#N [遊戲名稱]
- 當前分類：[分類名稱]
- 分支狀態：feature/game-N 已合併至 dev

### 技術資訊
- 使用的遊戲引擎：[引擎]
- 共用的遊戲元件：[列出]
- Firebase 整合狀態：[排行榜/成就/無]

### 遊戲設計筆記
- [重要的遊戲機制決策]
- [可複用的遊戲系統]
- [美術/音效資源]

### 下一步準備
- 下一個遊戲：#N+1 [遊戲名稱]
- 遊戲類型：[類型]
- 建議引擎：[引擎]
- 注意事項：[特殊需求]
```

### 同類型批次開發模式

同一類型的遊戲可批次開發：

```markdown
## 批次任務：益智遊戲 (001-005)

請依序開發以下 5 個益智遊戲：

| 編號 | 遊戲名稱 | 核心玩法 | 引擎 |
|------|----------|----------|------|
| #001 | 2048 | 數字合併 | Vanilla JS |
| #002 | 俄羅斯方塊 | 方塊消除 | Phaser |
| #003 | 掃雷 | 邏輯推理 | Vanilla JS |
| #004 | 數獨 | 數字填充 | React |
| #005 | 華容道 | 滑塊拼圖 | Vanilla JS |

### 開發策略
1. 建立共用的遊戲選單系統
2. 建立共用的分數/計時系統
3. 依序實作各遊戲
4. 整合 Firebase 排行榜

### 完成後請提供
1. 各遊戲的簡要說明與操作方式
2. 共用模組的使用方式
3. 遊戲難度調整建議
4. **批次上下文摘要**
```

### 開發進度追蹤表

| 範圍 | 狀態 | 數量 | 遊戲類型 |
|------|------|------|----------|
| #001-#150 | 🔄 開發中 | 0/150 | 益智遊戲 |
| #151-#270 | 📋 待開始 | 0/120 | 街機遊戲 |
| #271-#370 | 📋 待開始 | 0/100 | 動作遊戲 |
| #371-#450 | 📋 待開始 | 0/80 | 跑酷遊戲 |
| #451-#520 | 📋 待開始 | 0/70 | 卡牌遊戲 |
| #521-#580 | 📋 待開始 | 0/60 | 棋盤遊戲 |
| #581-#680 | 📋 待開始 | 0/100 | 休閒遊戲 |
| #681-#730 | 📋 待開始 | 0/50 | 競速遊戲 |
| #731-#790 | 📋 待開始 | 0/60 | 策略遊戲 |
| #791-#830 | 📋 待開始 | 0/40 | 音樂遊戲 |
| #831-#880 | 📋 待開始 | 0/50 | 射擊遊戲 |
| #881-#930 | 📋 待開始 | 0/50 | 運動遊戲 |
| #931-#970 | 📋 待開始 | 0/40 | 模擬遊戲 |
| #971-#1000 | 📋 待開始 | 0/30 | 恐怖遊戲 |

---

## 📝 授權 | License

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

---

## 🌟 支持專案 | Support

如果你喜歡這個專案，請給我們一個 ⭐ Star！

---

<p align="center">
  Made with ❤️ by the Awesome Free Games Team
</p>
