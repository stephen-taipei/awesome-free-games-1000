# 🎮 Awesome Free Games 1000 - 開發計劃書

> 1000 款免費前端小遊戲完整開發計劃

---

## 📋 目錄 | Table of Contents

1. [專案概述](#專案概述)
2. [技術架構](#技術架構)
3. [開發優先順序](#開發優先順序)
4. [遊戲清單](#遊戲清單)
   - [🧩 益智遊戲 Puzzle (001-150)](#-益智遊戲-puzzle-001-150)
   - [🕹️ 街機遊戲 Arcade (151-270)](#️-街機遊戲-arcade-151-270)
   - [🎯 動作遊戲 Action (271-370)](#-動作遊戲-action-271-370)
   - [🏃 跑酷遊戲 Runner (371-450)](#-跑酷遊戲-runner-371-450)
   - [🃏 卡牌遊戲 Card (451-520)](#-卡牌遊戲-card-451-520)
   - [♟️ 棋盤遊戲 Board (521-580)](#️-棋盤遊戲-board-521-580)
   - [🎰 休閒遊戲 Casual (581-680)](#-休閒遊戲-casual-581-680)
   - [🏎️ 競速遊戲 Racing (681-730)](#️-競速遊戲-racing-681-730)
   - [⚔️ 策略遊戲 Strategy (731-790)](#️-策略遊戲-strategy-731-790)
   - [🎵 音樂遊戲 Music (791-830)](#-音樂遊戲-music-791-830)
   - [🔫 射擊遊戲 Shooter (831-880)](#-射擊遊戲-shooter-831-880)
   - [🏀 運動遊戲 Sports (881-930)](#-運動遊戲-sports-881-930)
   - [🎪 模擬遊戲 Simulation (931-970)](#-模擬遊戲-simulation-931-970)
   - [👻 恐怖遊戲 Horror (971-1000)](#-恐怖遊戲-horror-971-1000)

---

## 專案概述

### 目標
建立世界上最大的免費前端小遊戲合集，涵蓋 1000 款不同類型的遊戲，支援 16 種語言，使用最新前端技術實現。

### 核心原則
- ✅ 純前端實現，無需後端伺服器
- ✅ 所有遊戲免費遊玩
- ✅ 多國語言支援 (i18n)
- ✅ 響應式設計，支援手機/平板/桌面
- ✅ Firebase 整合 (推播、排行榜)
- ✅ Google Analytics 4 流量追蹤
- ✅ PWA 支援，可離線遊玩

---

## 技術架構

### 核心技術選型

| 層級     | 技術                         | 用途           |
| -------- | ---------------------------- | -------------- |
| 建構工具 | Vite 5                       | 快速開發與打包 |
| 語言     | TypeScript 5                 | 類型安全       |
| 框架     | React 18 / Vue 3 / Vanilla   | 依遊戲需求     |
| 2D 渲染  | PixiJS 8 / Phaser 3.8        | 2D 遊戲引擎    |
| 3D 渲染  | Three.js r160 / Babylon.js 7 | 3D 遊戲引擎    |
| 進階渲染 | WebGL 2.0 / WebGPU           | 硬體加速       |
| 物理引擎 | Matter.js / Cannon-es        | 物理模擬       |
| 音效     | Howler.js / Tone.js          | 音效管理       |
| 動畫     | GSAP / Framer Motion         | 動畫效果       |
| 狀態管理 | Zustand / Pinia              | 遊戲狀態       |
| 樣式     | Tailwind CSS 4               | UI 樣式        |
| 國際化   | i18next / vue-i18n           | 多語言         |
| 儲存     | IndexedDB / LocalStorage     | 本地存檔       |

### Firebase 服務

| 服務            | 用途               |
| --------------- | ------------------ |
| Authentication  | 匿名登入、社群登入 |
| Cloud Firestore | 全球排行榜         |
| Cloud Messaging | 推播通知           |
| Remote Config   | 遊戲參數配置       |
| Hosting         | 遊戲部署           |

### Google Analytics 4 追蹤事件

```javascript
// 標準追蹤事件
gtag('event', 'game_start', { game_id, game_name, category });
gtag('event', 'game_end', { game_id, score, play_time });
gtag('event', 'level_up', { game_id, level });
gtag('event', 'achievement', { game_id, achievement_id });
gtag('event', 'share', { game_id, method });
```

---

## 開發優先順序

### Phase 1: 經典必玩 (001-100) 🔴 最高優先
經過市場驗證的經典遊戲，吸引初期用戶

### Phase 2: 熱門流行 (101-300) 🟠 高優先
當前熱門的遊戲類型，增加用戶黏性

### Phase 3: 多元擴充 (301-600) 🟡 中優先
擴展遊戲種類，滿足不同用戶需求

### Phase 4: 特色創新 (601-800) 🟢 一般優先
創新玩法與特色遊戲

### Phase 5: 完整收錄 (801-1000) 🔵 後續開發
完善遊戲庫，達成 1000 款目標

---

## 遊戲清單

### 狀態圖例
- ⬜ 未開始 | Not Started
- 🟨 規劃中 | Planning
- 🟦 開發中 | In Progress
- 🟩 已完成 | Completed
- 🟥 暫停中 | On Hold

---

## 🧩 益智遊戲 Puzzle (001-150)

| #   | 遊戲名稱       | 英文名              | 玩法重點             | 技術方向                 | 狀態 |
| --- | -------------- | ------------------- | -------------------- | ------------------------ | ---- |
| 001 | 2048           | 2048                | 滑動合併數字達到2048 | Vanilla TS + CSS Grid    | 🟩    |
| 002 | 俄羅斯方塊     | Tetris              | 旋轉排列方塊消除行列 | Canvas 2D + TS           | 🟩    |
| 003 | 數獨           | Sudoku              | 9x9填數邏輯推理      | Vanilla TS + CSS Grid    | 🟩    |
| 004 | 掃雷           | Minesweeper         | 推理避開地雷         | Vanilla JS + DOM         | 🟩    |
| 005 | 華容道         | Klotski             | 滑動方塊讓曹操脫困   | Canvas 2D                | 🟩    |
| 006 | 拼圖           | Jigsaw Puzzle       | 拖曳拼合圖片         | Canvas + Drag API        | 🟩    |
| 007 | 推箱子         | Sokoban             | 推動箱子到目標點     | Canvas 2D + TS           | 🟩    |
| 008 | 消消樂         | Match-3             | 交換消除三個相同     | PixiJS                   | 🟩    |
| 009 | 連連看         | Mahjong Connect     | 配對消除相同圖案     | Canvas 2D                | 🟩    |
| 010 | 泡泡龍         | Bubble Shooter      | 射擊消除同色泡泡     | Canvas 2D                | 🟩    |
| 011 | 寶石方塊       | Bejeweled           | 交換寶石消除連線     | Canvas 2D                | 🟩    |
| 012 | 一筆畫         | One Line            | 一筆連接所有點       | SVG + Canvas             | 🟩    |
| 013 | 數織           | Nonogram            | 根據數字填格邏輯     | Canvas 2D                | 🟩    |
| 014 | 七巧板         | Tangram             | 拼合幾何圖形         | SVG + Drag               | 🟩    |
| 015 | 魔術方塊       | Rubik's Cube        | 3D還原六面同色       | CSS 3D                   | 🟩    |
| 016 | 記憶翻牌       | Memory Match        | 翻牌配對相同圖案     | CSS Flip + JS            | 🟩    |
| 017 | 滑動拼圖       | Sliding Puzzle      | 滑動還原圖片順序     | CSS Grid + JS            | 🟩    |
| 018 | 填字遊戲       | Crossword           | 根據提示填入單字     | Vanilla JS + Grid        | 🟩    |
| 019 | 找不同         | Spot Difference     | 找出兩圖差異處       | Canvas Compare           | 🟩    |
| 020 | 迷宮           | Maze                | 找到出口路徑         | Canvas + Algorithm       | 🟩    |
| 021 | 水管工         | Pipe Puzzle         | 連接水管通路         | Grid + Rotate            | 🟩    |
| 022 | 倉庫番         | Warehouse Keeper    | 推箱子進階版         | Vanilla JS               | 🟩    |
| 023 | 方塊消除       | Block Blast         | 放置方塊消除整行     | Vanilla Canvas           | 🟩    |
| 024 | 塔羅解謎       | Tower Hanoi         | 移動圓盤到目標柱     | SVG/DOM Animation        | 🟩    |
| 025 | 數字華容道     | 15 Puzzle           | 滑動數字1-15排序     | CSS Grid + Order         | 🟩    |
| 026 | 顏色配對       | Color Match         | 快速配對相同顏色     | Canvas Speed             | 🟩    |
| 027 | 邏輯電路       | Logic Gates         | 連接電路達成輸出     | SVG + Logic              | 🟩    |
| 028 | 積木塔         | Block Tower         | 堆疊積木保持平衡     | Vanilla Canvas (Physics) | 🟩    |
| 029 | 蜂巢消除       | Hexagon Match       | 六角形消消樂         | Vanilla Canvas (Hex)     | 🟩    |
| 030 | 字母湯         | Word Search         | 找出隱藏單字         | Grid + Highlight         | 🟩    |
| 031 | 拼字遊戲       | Scrabble Lite       | 拼出有效單字得分     | Vanilla JS/DOM           | 🟩    |
| 032 | 燈泡謎題       | Lights Out          | 關閉所有燈泡         | Grid + Toggle            | ⬜    |
| 033 | 折紙解謎       | Origami Puzzle      | 模擬折紙達成圖形     | SVG Transform            | ⬜    |
| 034 | 齒輪連動       | Gear Puzzle         | 連接齒輪帶動目標     | Canvas Rotate            | ⬜    |
| 035 | 鏡像謎題       | Mirror Puzzle       | 利用鏡子反射解謎     | Canvas Reflect           | ⬜    |
| 036 | 重力方塊       | Gravity Blocks      | 重力影響方塊移動     | Physics 2D               | ⬜    |
| 037 | 電路連接       | Circuit Connect     | 連接電路點亮燈泡     | SVG Path                 | ⬜    |
| 038 | 拼圖挑戰       | Puzzle Challenge    | 限時拼圖挑戰         | Canvas Timer             | ⬜    |
| 039 | 數學24點       | 24 Game             | 四則運算得出24       | React Calculator         | ⬜    |
| 040 | 火柴謎題       | Matchstick Puzzle   | 移動火柴改變算式     | SVG Drag                 | ⬜    |
| 041 | 色彩洪水       | Flood Fill          | 用最少步數填滿畫面   | Canvas Flood             | ⬜    |
| 042 | 方塊旋轉       | Rotate Blocks       | 旋轉方塊填滿空間     | PixiJS Rotate            | ⬜    |
| 043 | 數字連線       | Number Link         | 連接相同數字不交叉   | SVG Path                 | ⬜    |
| 044 | 迷你高爾夫謎題 | Golf Puzzle         | 規劃路線進洞         | Physics 2D               | ⬜    |
| 045 | 疊疊樂解謎     | Stack Puzzle        | 堆疊達到目標高度     | Matter.js                | ⬜    |
| 046 | 滾球迷宮       | Ball Maze           | 傾斜迷宮滾動球       | DeviceOrientation        | ⬜    |
| 047 | 拼接六邊形     | Hex Connect         | 六邊形圖案拼接       | SVG Hex                  | ⬜    |
| 048 | 字謎猜猜       | Word Guess          | 猜測隱藏單字         | React + Keyboard         | ⬜    |
| 049 | 解繩謎題       | Untangle            | 移動節點解開繩結     | SVG + Collision          | ⬜    |
| 050 | 路徑規劃       | Path Finder         | 規劃最短路徑         | Canvas + A*              | ⬜    |
| 051 | 多米諾骨牌     | Domino Puzzle       | 配對多米諾數字       | Canvas Domino            | ⬜    |
| 052 | 磁鐵謎題       | Magnet Puzzle       | 利用磁力移動物件     | Physics 2D               | ⬜    |
| 053 | 摺紙飛機       | Paper Plane Puzzle  | 摺出能飛的飛機       | 3D Transform             | ⬜    |
| 054 | 積木拼圖       | Block Fit           | 放入積木填滿空間     | Grid + Rotate            | ⬜    |
| 055 | 鎖匠解謎       | Locksmith           | 解開複雜機關鎖       | SVG Animation            | ⬜    |
| 056 | 時鐘謎題       | Clock Puzzle        | 調整時鐘到目標時間   | SVG Clock                | ⬜    |
| 057 | 橋樑建造       | Bridge Builder      | 建造穩固橋樑         | Matter.js                | ⬜    |
| 058 | 化學配方       | Chemistry Puzzle    | 配對元素產生反應     | SVG + Animation          | ⬜    |
| 059 | 星座連線       | Constellation       | 連接星星形成星座     | Canvas Stars             | ⬜    |
| 060 | 密室逃脫       | Room Escape         | 找線索解謎逃出       | Point & Click            | ⬜    |
| 061 | 骨牌連鎖       | Domino Chain        | 排列骨牌觸發連鎖     | Physics 2D               | ⬜    |
| 062 | 魔法陣         | Magic Circle        | 旋轉符文對齊圖案     | SVG Rotate               | ⬜    |
| 063 | 電梯謎題       | Elevator Puzzle     | 規劃電梯運送乘客     | Logic + Animation        | ⬜    |
| 064 | 水流謎題       | Water Flow          | 引導水流到目的地     | Canvas Fluid             | ⬜    |
| 065 | 影子配對       | Shadow Match        | 配對物體與影子       | SVG Silhouette           | ⬜    |
| 066 | 機關解謎       | Mechanism Puzzle    | 觸發機關開啟大門     | SVG + Physics            | ⬜    |
| 067 | 植物成長       | Plant Growth        | 規劃植物生長路線     | Canvas + Time            | ⬜    |
| 068 | 鏡子世界       | Mirror World        | 鏡像世界同步解謎     | Dual Canvas              | ⬜    |
| 069 | 編碼解謎       | Code Puzzle         | 破解密碼與編碼       | React + Logic            | ⬜    |
| 070 | 立體拼圖       | 3D Puzzle           | 3D空間拼圖           | Three.js                 | ⬜    |
| 071 | 迷你城市       | Mini City           | 放置建築解謎         | Isometric                | ⬜    |
| 072 | 時間倒流       | Time Rewind         | 倒轉時間解謎         | State Replay             | ⬜    |
| 073 | 聲音謎題       | Sound Puzzle        | 根據聲音線索解謎     | Web Audio                | ⬜    |
| 074 | 陰陽平衡       | Yin Yang            | 平衡陰陽能量         | Physics Balance          | ⬜    |
| 075 | 糖果工廠       | Candy Factory       | 機關輸送糖果         | Conveyor Logic           | ⬜    |
| 076 | 氣球謎題       | Balloon Puzzle      | 控制氣球避障解謎     | Physics Float            | ⬜    |
| 077 | 考古挖掘       | Archaeology         | 挖掘找出文物         | Canvas Dig               | ⬜    |
| 078 | 電子謎題       | Electronic Puzzle   | 電子元件連接         | Circuit Logic            | ⬜    |
| 079 | 立體迷宮       | 3D Maze             | 3D迷宮探索           | Three.js Maze            | ⬜    |
| 080 | 拼字消除       | Word Crush          | 連接字母組成單字     | Grid + Dict              | ⬜    |
| 081 | 恐龍拼骨       | Dino Bones          | 拼合恐龍骨架         | SVG Skeleton             | ⬜    |
| 082 | 算術迷宮       | Math Maze           | 計算結果選擇路徑     | Canvas + Math            | ⬜    |
| 083 | 顏色排序       | Color Sort          | 按規則排列顏色       | Tube Sort                | ⬜    |
| 084 | 試管排序       | Tube Sort           | 同色液體歸類         | Canvas Liquid            | ⬜    |
| 085 | 螺絲謎題       | Screw Puzzle        | 按順序拆卸螺絲       | SVG Rotate               | ⬜    |
| 086 | 繩結解謎       | Rope Puzzle         | 解開繩結             | SVG Rope                 | ⬜    |
| 087 | 鑰匙收集       | Key Collection      | 收集鑰匙開啟門       | Platform Logic           | ⬜    |
| 088 | 按鈕謎題       | Button Puzzle       | 按正確順序按鈕       | Event Sequence           | ⬜    |
| 089 | 對稱繪圖       | Symmetry Draw       | 繪製對稱圖案         | Canvas Mirror            | ⬜    |
| 090 | 層層疊疊       | Layer Stack         | 按順序堆疊層次       | Z-index Logic            | ⬜    |
| 091 | 雷達解謎       | Radar Puzzle        | 利用雷達找目標       | Canvas Radar             | ⬜    |
| 092 | 太空站謎題     | Space Station       | 對接太空艙           | Rotation Match           | ⬜    |
| 093 | 鏈條解謎       | Chain Puzzle        | 解開鏈條連結         | SVG Chain                | ⬜    |
| 094 | 光線折射       | Light Refraction    | 折射光線到目標       | Ray Casting              | ⬜    |
| 095 | 機器人程式     | Robot Program       | 編程控制機器人       | Visual Code              | ⬜    |
| 096 | 四子棋謎題     | Connect 4 Puzzle    | 四子棋解謎模式       | Grid Logic               | ⬜    |
| 097 | 翻轉謎題       | Flip Puzzle         | 翻轉達成目標圖案     | Grid Flip                | ⬜    |
| 098 | 骰子謎題       | Dice Puzzle         | 骰子滾動到達目標     | 3D Dice                  | ⬜    |
| 099 | 電梯樓層       | Floor Puzzle        | 規劃電梯停靠         | Logic Planning           | ⬜    |
| 100 | 密碼鎖         | Combination Lock    | 解開密碼鎖           | Dial Interface           | ⬜    |
| 101 | 彈珠台謎題     | Pinball Puzzle      | 規劃彈珠路線         | Physics 2D               | ⬜    |
| 102 | 雪花拼圖       | Snowflake Puzzle    | 對稱雪花拼接         | SVG Symmetry             | ⬜    |
| 103 | 分子連接       | Molecule Connect    | 連接分子結構         | SVG Molecule             | ⬜    |
| 104 | 圖騰解謎       | Totem Puzzle        | 堆疊圖騰             | Stack Logic              | ⬜    |
| 105 | 金字塔謎題     | Pyramid Puzzle      | 金字塔數字邏輯       | Triangle Grid            | ⬜    |
| 106 | 藏寶圖         | Treasure Map        | 解讀地圖找寶藏       | Canvas Map               | ⬜    |
| 107 | 調色盤         | Color Palette       | 混色達成目標色       | Color Mixing             | ⬜    |
| 108 | 軌道切換       | Track Switch        | 切換軌道引導列車     | Path Switch              | ⬜    |
| 109 | 拼接島嶼       | Island Connect      | 連接島嶼橋樑         | Grid Bridge              | ⬜    |
| 110 | 音符謎題       | Note Puzzle         | 排列音符成旋律       | Audio + Grid             | ⬜    |
| 111 | 風向謎題       | Wind Direction      | 利用風向移動物體     | Physics Wind             | ⬜    |
| 112 | 蜘蛛網         | Spider Web          | 規劃蜘蛛網路線       | SVG Web                  | ⬜    |
| 113 | 溫度平衡       | Temperature Balance | 調節溫度解謎         | Gradient Logic           | ⬜    |
| 114 | 重力切換       | Gravity Switch      | 切換重力方向解謎     | Physics Gravity          | ⬜    |
| 115 | 傳送門         | Portal Puzzle       | 利用傳送門解謎       | Canvas Portal            | ⬜    |
| 116 | 撞球謎題       | Billiard Puzzle     | 規劃撞球路線         | Physics 2D               | ⬜    |
| 117 | 骨架拼接       | Skeleton Puzzle     | 拼接動物骨架         | SVG Parts                | ⬜    |
| 118 | 天秤平衡       | Scale Balance       | 天秤兩端平衡         | Physics Scale            | ⬜    |
| 119 | 季節轉換       | Season Change       | 轉換季節解謎         | Theme Switch             | ⬜    |
| 120 | 地圖拼接       | Map Puzzle          | 拼接世界地圖         | SVG Map                  | ⬜    |
| 121 | 符文解謎       | Rune Puzzle         | 對齊魔法符文         | Rotate Match             | ⬜    |
| 122 | 機關城堡       | Castle Mechanism    | 城堡機關解謎         | Multi-layer              | ⬜    |
| 123 | 光影謎題       | Light Shadow        | 調整光源投影         | Shadow Calc              | ⬜    |
| 124 | 潛水艇         | Submarine Puzzle    | 控制潛艇解謎         | Depth Control            | ⬜    |
| 125 | 太陽系         | Solar System        | 行星軌道謎題         | Orbital Logic            | ⬜    |
| 126 | 細胞分裂       | Cell Division       | 細胞分裂策略         | Growth Logic             | ⬜    |
| 127 | 蟲洞穿越       | Wormhole            | 利用蟲洞解謎         | Teleport Logic           | ⬜    |
| 128 | 結冰謎題       | Ice Puzzle          | 在冰上滑動解謎       | Slide Physics            | ⬜    |
| 129 | 彩虹橋         | Rainbow Bridge      | 建造彩虹橋樑         | Color Sequence           | ⬜    |
| 130 | 蝴蝶效應       | Butterfly Effect    | 連鎖反應解謎         | Chain Reaction           | ⬜    |
| 131 | 望遠鏡         | Telescope           | 對準望遠鏡看星星     | Align Puzzle             | ⬜    |
| 132 | 印章蓋章       | Stamp Puzzle        | 蓋章組合圖案         | Overlay Logic            | ⬜    |
| 133 | 電影膠卷       | Film Reel           | 排列電影順序         | Sequence Logic           | ⬜    |
| 134 | DNA配對        | DNA Match           | 配對DNA序列          | Pair Matching            | ⬜    |
| 135 | 交通號誌       | Traffic Sign        | 解讀交通號誌         | Symbol Logic             | ⬜    |
| 136 | 建築藍圖       | Blueprint           | 解讀藍圖建造         | Plan Reading             | ⬜    |
| 137 | 摺疊謎題       | Folding Puzzle      | 摺疊紙張解謎         | Fold Transform           | ⬜    |
| 138 | 磁力方塊       | Magnetic Blocks     | 利用磁力移動         | Magnet Physics           | ⬜    |
| 139 | 漩渦謎題       | Vortex Puzzle       | 利用漩渦解謎         | Spiral Logic             | ⬜    |
| 140 | 沙漏時間       | Hourglass           | 控制沙漏時間         | Timer Puzzle             | ⬜    |
| 141 | 古文解讀       | Ancient Script      | 翻譯古代文字         | Cipher Logic             | ⬜    |
| 142 | 樂高拼接       | Lego Build          | 樂高積木拼接         | 3D Blocks                | ⬜    |
| 143 | 玻璃彩繪       | Stained Glass       | 彩繪玻璃拼圖         | Color Fill               | ⬜    |
| 144 | 迷你農場       | Mini Farm           | 農場規劃謎題         | Grid Planning            | ⬜    |
| 145 | 海底探索       | Deep Sea            | 海底探索謎題         | Depth Pressure           | ⬜    |
| 146 | 火山謎題       | Volcano Puzzle      | 火山能量解謎         | Heat Logic               | ⬜    |
| 147 | 考古現場       | Dig Site            | 考古挖掘解謎         | Layer Reveal             | ⬜    |
| 148 | 電波傳遞       | Signal Puzzle       | 傳遞電波信號         | Wave Logic               | ⬜    |
| 149 | 書架整理       | Bookshelf           | 整理書架順序         | Sort Logic               | ⬜    |
| 150 | 終極謎題       | Ultimate Puzzle     | 結合多種機制         | Multi-mechanic           | ⬜    |

---

## 🕹️ 街機遊戲 Arcade (151-270)

| #   | 遊戲名稱     | 英文名              | 玩法重點           | 技術方向            | 狀態 |
| --- | ------------ | ------------------- | ------------------ | ------------------- | ---- |
| 151 | 貪吃蛇       | Snake               | 吃食物變長避撞牆   | Canvas 2D           | ⬜    |
| 152 | 小精靈       | Pac-Man             | 吃豆躲鬼           | Phaser 3            | ⬜    |
| 153 | 打磚塊       | Breakout            | 反彈球打碎磚塊     | Canvas Physics      | ⬜    |
| 154 | 青蛙過河     | Frogger             | 躲避車輛過馬路     | Phaser 3            | ⬜    |
| 155 | 太空侵略者   | Space Invaders      | 射擊下降的外星人   | Canvas Shooter      | ⬜    |
| 156 | 小蜜蜂       | Galaga              | 射擊外星艦隊       | PixiJS              | ⬜    |
| 157 | 大金剛       | Donkey Kong         | 跳躍躲避障礙救公主 | Platform JS         | ⬜    |
| 158 | 坦克大戰     | Battle City         | 坦克對戰保衛基地   | Canvas Tank         | ⬜    |
| 159 | 炸彈人       | Bomberman           | 放炸彈消滅敵人     | Grid Bomb           | ⬜    |
| 160 | 彈珠台       | Pinball             | 彈珠得分遊戲       | Matter.js           | ⬜    |
| 161 | 打地鼠       | Whac-A-Mole         | 點擊打出現的地鼠   | DOM Events          | ⬜    |
| 162 | 射氣球       | Balloon Pop         | 射擊上升的氣球     | Canvas Shooter      | ⬜    |
| 163 | 水果忍者     | Fruit Ninja         | 滑動切水果         | Touch + Canvas      | ⬜    |
| 164 | 抓娃娃機     | Claw Machine        | 控制爪子抓取       | Physics Claw        | ⬜    |
| 165 | 套圈圈       | Ring Toss           | 投擲套中目標       | Physics Arc         | ⬜    |
| 166 | 投籃機       | Basketball Arcade   | 投籃計分           | Physics Throw       | ⬜    |
| 167 | 射飛鏢       | Dart Throw          | 投擲飛鏢射靶       | Canvas Aim          | ⬜    |
| 168 | 空氣曲棍球   | Air Hockey          | 雙人對打冰球       | Physics Puck        | ⬜    |
| 169 | 彈弓射擊     | Slingshot           | 彈弓射擊目標       | Physics Sling       | ⬜    |
| 170 | 保齡球       | Bowling             | 擊倒保齡球瓶       | Physics 3D          | ⬜    |
| 171 | 經典乒乓     | Pong                | 雙人乒乓對戰       | Canvas Basic        | ⬜    |
| 172 | 快打方塊     | Puzzle Fighter      | 方塊對戰消除       | Grid + VS           | ⬜    |
| 173 | 接金幣       | Coin Catch          | 接住掉落金幣       | Canvas Catch        | ⬜    |
| 174 | 躲避球       | Dodgeball           | 躲避飛來的球       | Physics Dodge       | ⬜    |
| 175 | 彈力球       | Bouncing Ball       | 控制彈跳得分       | Physics Bounce      | ⬜    |
| 176 | 釣魚達人     | Fishing Master      | 釣起各種魚         | Canvas + Timer      | ⬜    |
| 177 | 打蒼蠅       | Fly Swatter         | 拍打飛舞蒼蠅       | DOM + Random        | ⬜    |
| 178 | 接蘋果       | Apple Catch         | 接住掉落蘋果       | Canvas Basket       | ⬜    |
| 179 | 踩氣球       | Balloon Stomp       | 踩破敵人氣球       | Platform Battle     | ⬜    |
| 180 | 彈跳迷宮     | Bounce Maze         | 彈跳穿越迷宮       | Physics Maze        | ⬜    |
| 181 | 企鵝推冰     | Penguin Push        | 推冰塊擊敵人       | Ice Physics         | ⬜    |
| 182 | 鑽地機       | Digger              | 挖掘收集寶石       | Canvas Dig          | ⬜    |
| 183 | 泡泡大亂鬥   | Bubble Battle       | 泡泡對戰遊戲       | Multiplayer         | ⬜    |
| 184 | 機器人冒險   | Robot Adventure     | 機器人動作遊戲     | Platform Action     | ⬜    |
| 185 | 飛天豬       | Flying Pig          | 控制飛豬收集       | Flappy Style        | ⬜    |
| 186 | 蛇梯棋街機   | Snake Ladder Arcade | 快節奏蛇梯棋       | Board + Speed       | ⬜    |
| 187 | 消防員       | Firefighter         | 接住跳樓者         | Canvas Catch        | ⬜    |
| 188 | 雜耍高手     | Juggler             | 保持球不落地       | Physics Juggle      | ⬜    |
| 189 | 碰碰車       | Bumper Cars         | 碰撞對戰           | Physics Bump        | ⬜    |
| 190 | 跳跳床       | Trampoline          | 跳躍收集星星       | Physics Jump        | ⬜    |
| 191 | 火箭發射     | Rocket Launch       | 控制火箭升空       | Physics Rocket      | ⬜    |
| 192 | 螃蟹大戰     | Crab Battle         | 螃蟹對戰遊戲       | Side Combat         | ⬜    |
| 193 | 機甲格鬥     | Mecha Fighter       | 機甲格鬥對戰       | Fighting Game       | ⬜    |
| 194 | 怪獸塔防     | Monster TD          | 塔防射擊怪獸       | TD Mechanics        | ⬜    |
| 195 | 磁鐵球       | Magnet Ball         | 磁力控制彈球       | Magnet Physics      | ⬜    |
| 196 | 像素冒險     | Pixel Adventure     | 像素風格冒險       | Retro Pixel         | ⬜    |
| 197 | 時間挑戰     | Time Attack         | 限時挑戰關卡       | Speed Run           | ⬜    |
| 198 | 連環爆破     | Chain Blast         | 連鎖爆破得分       | Chain Reaction      | ⬜    |
| 199 | 反重力       | Anti-Gravity        | 反重力平台跳躍     | Gravity Flip        | ⬜    |
| 200 | 傳送門冒險   | Portal Adventure    | 傳送門闖關         | Portal Mechanics    | ⬜    |
| 201 | 旋風射擊     | Spiral Shooter      | 旋轉射擊敵人       | Rotate Shoot        | ⬜    |
| 202 | 忍者跳躍     | Ninja Jump          | 忍者牆跳闘關       | Wall Jump           | ⬜    |
| 203 | 冰火人       | Ice & Fire          | 冰火元素配合       | Dual Control        | ⬜    |
| 204 | 蟲蟲危機     | Bug Crisis          | 消滅入侵昆蟲       | Wave Defense        | ⬜    |
| 205 | 雙人合作     | Co-op Challenge     | 雙人配合過關       | Local Multiplayer   | ⬜    |
| 206 | 彩色方塊     | Color Blocks        | 快速消除同色       | Speed Match         | ⬜    |
| 207 | 極速配對     | Speed Match         | 限時配對挑戰       | Memory Speed        | ⬜    |
| 208 | 節奏接球     | Rhythm Catch        | 跟著節奏接球       | Audio Sync          | ⬜    |
| 209 | 爆米花機     | Popcorn Machine     | 接住爆米花         | Physics Catch       | ⬜    |
| 210 | 烤肉大師     | BBQ Master          | 烤肉計時翻面       | Timer Game          | ⬜    |
| 211 | 倒數爆破     | Countdown Boom      | 炸彈倒數解謎       | Timer Defuse        | ⬜    |
| 212 | 快手打字     | Type Attack         | 打字射擊敵人       | Typing Game         | ⬜    |
| 213 | 記憶挑戰     | Memory Challenge    | 記憶序列挑戰       | Sequence Memory     | ⬜    |
| 214 | 反應測試     | Reaction Test       | 測試反應速度       | Click Speed         | ⬜    |
| 215 | 瞄準練習     | Aim Trainer         | 瞄準訓練遊戲       | Click Accuracy      | ⬜    |
| 216 | 滑鼠迷宮     | Mouse Maze          | 不碰壁穿越迷宮     | Cursor Track        | ⬜    |
| 217 | 電流急急棒   | Wire Loop           | 不碰電線通過       | Cursor Game         | ⬜    |
| 218 | 滾動天空     | Rolling Sky         | 滾球避障音樂遊戲   | Music + Dodge       | ⬜    |
| 219 | 無盡奔跑     | Endless Run         | 無盡跑酷街機版     | Endless Runner      | ⬜    |
| 220 | 垂直跳躍     | Vertical Jump       | 向上跳躍攀爬       | Doodle Jump         | ⬜    |
| 221 | 機關逃脫     | Trap Escape         | 避開機關逃脫       | Obstacle Course     | ⬜    |
| 222 | 翻轉世界     | Flip World          | 翻轉重力過關       | Gravity Control     | ⬜    |
| 223 | 分裂細胞     | Split Cell          | 細胞分裂成長       | Growth Game         | ⬜    |
| 224 | 黑洞吸收     | Black Hole          | 吸收物體變大       | Agar.io Style       | ⬜    |
| 225 | 雷射反射     | Laser Bounce        | 反射雷射得分       | Ray Bounce          | ⬜    |
| 226 | 色彩衝刺     | Color Dash          | 穿越同色障礙       | Color Match Run     | ⬜    |
| 227 | 方塊堆疊     | Block Stack         | 堆疊方塊越高越好   | Stack Game          | ⬜    |
| 228 | 切割大師     | Slice Master        | 精準切割得分       | Slice Physics       | ⬜    |
| 229 | 引力彈射     | Gravity Slingshot   | 利用引力彈射       | Orbital Physics     | ⬜    |
| 230 | 鏡像控制     | Mirror Control      | 同時控制鏡像角色   | Dual Sync           | ⬜    |
| 231 | 時間慢動作   | Slow Motion         | 慢動作閃避子彈     | Bullet Time         | ⬜    |
| 232 | 傳送帶工廠   | Conveyor Factory    | 工廠傳送帶遊戲     | Factory Game        | ⬜    |
| 233 | 太空漫步     | Space Walk          | 太空漫步收集       | Zero Gravity        | ⬜    |
| 234 | 光速賽跑     | Light Speed         | 極速反應遊戲       | Speed Game          | ⬜    |
| 235 | 像素生存     | Pixel Survival      | 像素生存街機       | Survival Arcade     | ⬜    |
| 236 | 機甲組裝     | Mecha Build         | 快速組裝機甲       | Assembly Game       | ⬜    |
| 237 | 音波攻擊     | Sound Wave          | 音波攻擊敵人       | Audio Weapon        | ⬜    |
| 238 | 雙重跳躍     | Double Jump         | 雙段跳躍闘關       | Platform Jump       | ⬜    |
| 239 | 子彈地獄     | Bullet Hell         | 躲避彈幕射擊       | Danmaku Lite        | ⬜    |
| 240 | 節奏戰鬥     | Rhythm Battle       | 節奏對戰遊戲       | Music Combat        | ⬜    |
| 241 | 迷你高爾夫   | Mini Golf           | 迷你高爾夫街機     | Golf Physics        | ⬜    |
| 242 | 火柴人大亂鬥 | Stickman Brawl      | 火柴人格鬥         | Stickman Fight      | ⬜    |
| 243 | 憤怒砲彈     | Angry Cannon        | 砲彈攻城遊戲       | Projectile Physics  | ⬜    |
| 244 | 滑冰競速     | Ice Skating         | 滑冰競速街機       | Skating Physics     | ⬜    |
| 245 | 跳傘收集     | Parachute Drop      | 跳傘收集物品       | Fall Physics        | ⬜    |
| 246 | 滾球挑戰     | Ball Roll           | 滾球穿越障礙       | Ball Control        | ⬜    |
| 247 | 飛盤狗       | Frisbee Dog         | 接飛盤得分         | Catch Game          | ⬜    |
| 248 | 衝浪大師     | Surf Master         | 衝浪避障得分       | Wave Surf           | ⬜    |
| 249 | 蹦床跳躍     | Bounce Jump         | 蹦床彈跳收集       | Bounce Physics      | ⬜    |
| 250 | 快遞分類     | Package Sort        | 快速分類快遞       | Sort Game           | ⬜    |
| 251 | 廚房混亂     | Kitchen Chaos       | 廚房快速出餐       | Time Management     | ⬜    |
| 252 | 機場塔台     | Airport Control     | 指揮飛機降落       | Path Control        | ⬜    |
| 253 | 交通指揮     | Traffic Control     | 指揮交通流量       | Traffic Game        | ⬜    |
| 254 | 電梯管理     | Elevator Rush       | 電梯載客挑戰       | Management Game     | ⬜    |
| 255 | 水管爆裂     | Pipe Burst          | 修復水管漏水       | Repair Game         | ⬜    |
| 256 | 氣球防禦     | Balloon Defense     | 保護氣球不被刺破   | Defense Game        | ⬜    |
| 257 | 磁力競技場   | Magnet Arena        | 磁力對戰競技       | Magnet Combat       | ⬜    |
| 258 | 旋轉迷宮     | Spin Maze           | 旋轉迷宮滾球       | Rotate + Ball       | ⬜    |
| 259 | 重力井       | Gravity Well        | 利用重力井移動     | Gravity Physics     | ⬜    |
| 260 | 連環炸彈     | Bomb Chain          | 連環爆炸得分       | Chain Explosion     | ⬜    |
| 261 | 雷電閃避     | Thunder Dodge       | 躲避雷電攻擊       | Pattern Dodge       | ⬜    |
| 262 | 瞬間移動     | Teleport Rush       | 瞬移穿越障礙       | Teleport Game       | ⬜    |
| 263 | 影子追逐     | Shadow Chase        | 與影子賽跑         | Ghost Racing        | ⬜    |
| 264 | 物理沙盒     | Physics Sandbox     | 物理互動沙盒       | Physics Toys        | ⬜    |
| 265 | 破壞王       | Destruction King    | 破壞建築得分       | Destruction Physics | ⬜    |
| 266 | 合成大師     | Merge Master        | 合成物品升級       | Merge Game          | ⬜    |
| 267 | 彈射大師     | Bounce Master       | 計算彈射角度       | Angle Bounce        | ⬜    |
| 268 | 極限平衡     | Extreme Balance     | 極限平衡挑戰       | Balance Game        | ⬜    |
| 269 | 無盡模式     | Endless Mode        | 無盡生存挑戰       | Survival Endless    | ⬜    |
| 270 | 街機綜合     | Arcade Mix          | 街機小遊戲合集     | Mini Games          | ⬜    |

---

## 🎯 動作遊戲 Action (271-370)

| #   | 遊戲名稱   | 英文名              | 玩法重點       | 技術方向           | 狀態 |
| --- | ---------- | ------------------- | -------------- | ------------------ | ---- |
| 271 | 忍者傳說   | Ninja Legend        | 忍者動作冒險   | Platform Action    | ⬜    |
| 272 | 騎士衝鋒   | Knight Rush         | 騎士戰鬥闘關   | Side Scroller      | ⬜    |
| 273 | 武士之道   | Way of Samurai      | 武士劍術動作   | Combat Action      | ⬜    |
| 274 | 海盜冒險   | Pirate Adventure    | 海盜動作冒險   | Platform Game      | ⬜    |
| 275 | 西部牛仔   | Wild West           | 西部槍戰動作   | Shooter Action     | ⬜    |
| 276 | 機器人戰爭 | Robot Wars          | 機器人戰鬥     | Mecha Combat       | ⬜    |
| 277 | 殭屍獵人   | Zombie Hunter       | 對抗殭屍生存   | Survival Action    | ⬜    |
| 278 | 外星入侵   | Alien Invasion      | 對抗外星人     | Sci-fi Action      | ⬜    |
| 279 | 龍族戰士   | Dragon Warrior      | 屠龍戰士冒險   | Fantasy Action     | ⬜    |
| 280 | 暗影刺客   | Shadow Assassin     | 潛行暗殺動作   | Stealth Action     | ⬜    |
| 281 | 超級英雄   | Super Hero          | 超能力英雄戰鬥 | Hero Action        | ⬜    |
| 282 | 格鬥冠軍   | Fighting Champion   | 格鬥對戰遊戲   | Fighting Game      | ⬜    |
| 283 | 怪獸獵人   | Monster Hunter      | 狩獵巨型怪獸   | Boss Battle        | ⬜    |
| 284 | 時空戰士   | Time Warrior        | 時空穿越戰鬥   | Time Travel        | ⬜    |
| 285 | 元素法師   | Element Mage        | 元素魔法戰鬥   | Magic Combat       | ⬜    |
| 286 | 賞金獵人   | Bounty Hunter       | 追捕懸賞目標   | Hunt Action        | ⬜    |
| 287 | 地下城探索 | Dungeon Crawl       | 地下城冒險戰鬥 | Dungeon Action     | ⬜    |
| 288 | 競技場戰士 | Arena Fighter       | 競技場PVE戰鬥  | Arena Combat       | ⬜    |
| 289 | 古墓奇兵   | Tomb Raider Lite    | 古墓探險動作   | Adventure Action   | ⬜    |
| 290 | 末日生存   | Doomsday Survival   | 末日求生動作   | Survival Game      | ⬜    |
| 291 | 火柴人戰爭 | Stickman War        | 火柴人軍團戰   | Stickman Combat    | ⬜    |
| 292 | 像素騎士   | Pixel Knight        | 像素風騎士冒險 | Retro Action       | ⬜    |
| 293 | 雙截龍     | Double Dragon       | 雙人格鬥闘關   | Beat 'em Up        | ⬜    |
| 294 | 合金彈頭   | Metal Slug Lite     | 橫向射擊動作   | Run & Gun          | ⬜    |
| 295 | 拳皇格鬥   | King of Fighters    | 格鬥對戰簡化版 | 2D Fighter         | ⬜    |
| 296 | 街頭霸王   | Street Fighter Lite | 經典格鬥遊戲   | Fighting Game      | ⬜    |
| 297 | 影子格鬥   | Shadow Fight        | 剪影格鬥遊戲   | Silhouette Combat  | ⬜    |
| 298 | 蜘蛛人冒險 | Spider Hero         | 蜘蛛人動作遊戲 | Swing Action       | ⬜    |
| 299 | 鐵拳出擊   | Iron Fist           | 拳擊格鬥遊戲   | Boxing Game        | ⬜    |
| 300 | 劍與魔法   | Sword & Magic       | 劍術魔法結合   | RPG Action         | ⬜    |
| 301 | 弓箭大師   | Bow Master          | 弓箭射擊戰鬥   | Archery Action     | ⬜    |
| 302 | 投擲戰士   | Throwing Warrior    | 投擲武器戰鬥   | Throw Combat       | ⬜    |
| 303 | 鎖鏈戰士   | Chain Fighter       | 鎖鏈武器戰鬥   | Chain Weapon       | ⬜    |
| 304 | 迴力鏢     | Boomerang Fighter   | 迴力鏢戰鬥     | Boomerang Action   | ⬜    |
| 305 | 雙刀流     | Dual Blade          | 雙刀戰鬥動作   | Dual Wield         | ⬜    |
| 306 | 重錘戰士   | Hammer Warrior      | 重錘攻擊戰鬥   | Heavy Weapon       | ⬜    |
| 307 | 長槍騎士   | Spear Knight        | 長槍戰鬥動作   | Spear Combat       | ⬜    |
| 308 | 鞭子高手   | Whip Master         | 鞭子戰鬥動作   | Whip Action        | ⬜    |
| 309 | 爪擊獵人   | Claw Hunter         | 爪擊戰鬥動作   | Claw Combat        | ⬜    |
| 310 | 盾擊戰士   | Shield Warrior      | 盾牌戰鬥動作   | Shield Combat      | ⬜    |
| 311 | 飛刀大師   | Knife Thrower       | 飛刀攻擊動作   | Throwing Knife     | ⬜    |
| 312 | 炸彈專家   | Bomb Expert         | 炸彈攻擊動作   | Bomb Action        | ⬜    |
| 313 | 陷阱獵手   | Trap Hunter         | 設置陷阱戰鬥   | Trap Combat        | ⬜    |
| 314 | 召喚師     | Summoner            | 召喚生物戰鬥   | Summon Action      | ⬜    |
| 315 | 變形戰士   | Transformer         | 變形戰鬥動作   | Transform Combat   | ⬜    |
| 316 | 影分身     | Shadow Clone        | 分身術戰鬥     | Clone Action       | ⬜    |
| 317 | 時間凍結   | Time Freeze         | 時停戰鬥動作   | Time Stop          | ⬜    |
| 318 | 瞬移刺客   | Blink Assassin      | 瞬移暗殺動作   | Blink Combat       | ⬜    |
| 319 | 重力戰士   | Gravity Warrior     | 重力操控戰鬥   | Gravity Combat     | ⬜    |
| 320 | 磁力英雄   | Magnet Hero         | 磁力控制戰鬥   | Magnet Action      | ⬜    |
| 321 | 電擊使者   | Electric Knight     | 電擊攻擊動作   | Electric Combat    | ⬜    |
| 322 | 冰霜戰士   | Frost Fighter       | 冰凍攻擊動作   | Ice Combat         | ⬜    |
| 323 | 火焰使者   | Flame Knight        | 火焰攻擊動作   | Fire Combat        | ⬜    |
| 324 | 風之忍者   | Wind Ninja          | 風遁術戰鬥     | Wind Combat        | ⬜    |
| 325 | 土系法師   | Earth Mage          | 土系魔法戰鬥   | Earth Combat       | ⬜    |
| 326 | 光明聖騎   | Light Paladin       | 光明力量戰鬥   | Light Combat       | ⬜    |
| 327 | 暗黑騎士   | Dark Knight         | 暗黑力量戰鬥   | Dark Combat        | ⬜    |
| 328 | 雷霆戰神   | Thunder God         | 雷電攻擊動作   | Thunder Combat     | ⬜    |
| 329 | 毒霧刺客   | Poison Assassin     | 毒素攻擊動作   | Poison Combat      | ⬜    |
| 330 | 音波戰士   | Sonic Fighter       | 音波攻擊動作   | Sonic Combat       | ⬜    |
| 331 | 精神戰士   | Psychic Warrior     | 念力攻擊動作   | Psychic Combat     | ⬜    |
| 332 | 野獸獵人   | Beast Hunter        | 野獸狩獵動作   | Hunt Action        | ⬜    |
| 333 | 亡靈法師   | Necromancer         | 亡靈召喚戰鬥   | Undead Combat      | ⬜    |
| 334 | 吸血鬼     | Vampire Hunter      | 吸血鬼戰鬥     | Vampire Action     | ⬜    |
| 335 | 狼人戰士   | Werewolf Fighter    | 狼人變身戰鬥   | Werewolf Combat    | ⬜    |
| 336 | 天使之翼   | Angel Wings         | 天使飛行戰鬥   | Flying Combat      | ⬜    |
| 337 | 惡魔獵人   | Demon Hunter        | 惡魔狩獵動作   | Demon Combat       | ⬜    |
| 338 | 機械戰警   | Mecha Police        | 機械戰鬥動作   | Mech Combat        | ⬜    |
| 339 | 太空陸戰   | Space Marine        | 太空戰鬥動作   | Sci-fi Combat      | ⬜    |
| 340 | 賽博忍者   | Cyber Ninja         | 賽博龐克忍者   | Cyberpunk Action   | ⬜    |
| 341 | 基因戰士   | Gene Warrior        | 基因突變戰鬥   | Mutant Combat      | ⬜    |
| 342 | 納米戰士   | Nano Fighter        | 納米科技戰鬥   | Nano Combat        | ⬜    |
| 343 | 量子英雄   | Quantum Hero        | 量子力量戰鬥   | Quantum Action     | ⬜    |
| 344 | 維度戰士   | Dimension Warrior   | 維度穿梭戰鬥   | Dimension Combat   | ⬜    |
| 345 | 混沌之子   | Chaos Child         | 混沌力量戰鬥   | Chaos Combat       | ⬜    |
| 346 | 秩序守護   | Order Guardian      | 秩序守護戰鬥   | Order Combat       | ⬜    |
| 347 | 命運戰士   | Fate Warrior        | 命運之力戰鬥   | Fate Combat        | ⬜    |
| 348 | 星辰使者   | Star Messenger      | 星辰力量戰鬥   | Star Combat        | ⬜    |
| 349 | 月影刺客   | Moon Shadow         | 月之力量戰鬥   | Moon Combat        | ⬜    |
| 350 | 太陽戰士   | Sun Warrior         | 太陽力量戰鬥   | Sun Combat         | ⬜    |
| 351 | 守護者     | The Guardian        | 守護戰鬥模式   | Guard Combat       | ⬜    |
| 352 | 復仇者     | The Avenger         | 復仇動作遊戲   | Revenge Action     | ⬜    |
| 353 | 征服者     | The Conqueror       | 征服戰鬥動作   | Conquer Combat     | ⬜    |
| 354 | 解放者     | The Liberator       | 解放戰鬥動作   | Liberation Combat  | ⬜    |
| 355 | 毀滅者     | The Destroyer       | 毀滅戰鬥動作   | Destruction Combat | ⬜    |
| 356 | 創造者     | The Creator         | 創造戰鬥動作   | Creation Combat    | ⬜    |
| 357 | 獵魔人     | Witch Hunter        | 獵殺魔物動作   | Monster Combat     | ⬜    |
| 358 | 驅魔師     | Exorcist            | 驅魔戰鬥動作   | Spirit Combat      | ⬜    |
| 359 | 封印者     | Sealer              | 封印戰鬥動作   | Seal Combat        | ⬜    |
| 360 | 淨化者     | Purifier            | 淨化戰鬥動作   | Purify Combat      | ⬜    |
| 361 | 覺醒者     | The Awakened        | 覺醒力量戰鬥   | Awaken Combat      | ⬜    |
| 362 | 超越者     | Transcender         | 超越極限戰鬥   | Transcend Combat   | ⬜    |
| 363 | 永恆戰士   | Eternal Warrior     | 永恆戰鬥動作   | Eternal Combat     | ⬜    |
| 364 | 傳奇英雄   | Legendary Hero      | 傳奇戰鬥動作   | Legend Combat      | ⬜    |
| 365 | 神話戰士   | Mythic Warrior      | 神話戰鬥動作   | Myth Combat        | ⬜    |
| 366 | 史詩英雄   | Epic Hero           | 史詩戰鬥動作   | Epic Combat        | ⬜    |
| 367 | 遠古戰士   | Ancient Fighter     | 遠古戰鬥動作   | Ancient Combat     | ⬜    |
| 368 | 未來戰士   | Future Warrior      | 未來戰鬥動作   | Future Combat      | ⬜    |
| 369 | 平行戰士   | Parallel Fighter    | 平行世界戰鬥   | Parallel Combat    | ⬜    |
| 370 | 終極英雄   | Ultimate Hero       | 終極戰鬥動作   | Ultimate Combat    | ⬜    |

---

## 🏃 跑酷遊戲 Runner (371-450)

| #   | 遊戲名稱   | 英文名              | 玩法重點     | 技術方向           | 狀態 |
| --- | ---------- | ------------------- | ------------ | ------------------ | ---- |
| 371 | 神廟逃亡   | Temple Run          | 3D無盡跑酷   | Three.js Runner    | ⬜    |
| 372 | 地鐵跑酷   | Subway Surfers      | 鐵軌躲避跑酷 | 3D Lane Runner     | ⬜    |
| 373 | 忍者跑酷   | Ninja Run           | 忍者風格跑酷 | Platform Runner    | ⬜    |
| 374 | 叢林逃亡   | Jungle Run          | 叢林場景跑酷 | Nature Runner      | ⬜    |
| 375 | 城市跑酷   | City Runner         | 城市街頭跑酷 | Urban Runner       | ⬜    |
| 376 | 太空漫遊   | Space Runner        | 太空場景跑酷 | Sci-fi Runner      | ⬜    |
| 377 | 殭屍逃亡   | Zombie Escape       | 逃離殭屍追擊 | Horror Runner      | ⬜    |
| 378 | 恐龍逃亡   | Dino Run            | 恐龍追趕跑酷 | Prehistoric Runner | ⬜    |
| 379 | 機器人跑酷 | Robot Run           | 機器人跑酷   | Mecha Runner       | ⬜    |
| 380 | 魔法跑酷   | Magic Run           | 魔法世界跑酷 | Fantasy Runner     | ⬜    |
| 381 | 像素跑酷   | Pixel Run           | 像素風格跑酷 | Retro Runner       | ⬜    |
| 382 | 滑板跑酷   | Skateboard Run      | 滑板跑酷遊戲 | Skateboard Runner  | ⬜    |
| 383 | 跑酷大師   | Parkour Master      | 極限跑酷動作 | Parkour Game       | ⬜    |
| 384 | 飛行跑酷   | Flying Run          | 飛行結合跑酷 | Fly Runner         | ⬜    |
| 385 | 水上跑酷   | Water Run           | 水上跑酷遊戲 | Water Runner       | ⬜    |
| 386 | 雪山滑行   | Snow Slide          | 雪山滑雪跑酷 | Snow Runner        | ⬜    |
| 387 | 沙漠狂奔   | Desert Dash         | 沙漠場景跑酷 | Desert Runner      | ⬜    |
| 388 | 火山逃亡   | Volcano Escape      | 火山爆發逃亡 | Lava Runner        | ⬜    |
| 389 | 冰原奔馳   | Ice Field Run       | 冰原滑行跑酷 | Ice Runner         | ⬜    |
| 390 | 彩虹跑道   | Rainbow Run         | 彩虹跑道跑酷 | Color Runner       | ⬜    |
| 391 | 糖果跑酷   | Candy Run           | 糖果世界跑酷 | Candy Runner       | ⬜    |
| 392 | 玩具跑酷   | Toy Run             | 玩具場景跑酷 | Toy Runner         | ⬜    |
| 393 | 音樂跑酷   | Music Run           | 音樂節奏跑酷 | Rhythm Runner      | ⬜    |
| 394 | 重力跑酷   | Gravity Run         | 重力切換跑酷 | Gravity Runner     | ⬜    |
| 395 | 時間跑酷   | Time Run            | 時間壓力跑酷 | Time Runner        | ⬜    |
| 396 | 傳送跑酷   | Portal Run          | 傳送門跑酷   | Portal Runner      | ⬜    |
| 397 | 雙人跑酷   | Duo Run             | 雙人協作跑酷 | Co-op Runner       | ⬜    |
| 398 | 競速跑酷   | Race Run            | 競速對戰跑酷 | Race Runner        | ⬜    |
| 399 | 障礙跑酷   | Obstacle Run        | 障礙挑戰跑酷 | Obstacle Runner    | ⬜    |
| 400 | 變形跑酷   | Transform Run       | 變形能力跑酷 | Transform Runner   | ⬜    |
| 401 | 影子跑酷   | Shadow Run          | 影子世界跑酷 | Shadow Runner      | ⬜    |
| 402 | 鏡像跑酷   | Mirror Run          | 鏡像世界跑酷 | Mirror Runner      | ⬜    |
| 403 | 夢境跑酷   | Dream Run           | 夢境世界跑酷 | Dream Runner       | ⬜    |
| 404 | 噩夢逃亡   | Nightmare Escape    | 噩夢世界逃亡 | Nightmare Runner   | ⬜    |
| 405 | 天堂跑酷   | Heaven Run          | 天空場景跑酷 | Sky Runner         | ⬜    |
| 406 | 地獄逃亡   | Hell Escape         | 地獄場景逃亡 | Hell Runner        | ⬜    |
| 407 | 海底跑酷   | Ocean Run           | 海底場景跑酷 | Ocean Runner       | ⬜    |
| 408 | 地底探索   | Underground Run     | 地底場景跑酷 | Cave Runner        | ⬜    |
| 409 | 雲端跑酷   | Cloud Run           | 雲層場景跑酷 | Cloud Runner       | ⬜    |
| 410 | 星際跑酷   | Star Run            | 星際場景跑酷 | Star Runner        | ⬜    |
| 411 | 維度跑酷   | Dimension Run       | 維度穿越跑酷 | Dimension Runner   | ⬜    |
| 412 | 像素冒險跑 | Pixel Adventure Run | 像素冒險跑酷 | Pixel Adventure    | ⬜    |
| 413 | 忍者疾風   | Ninja Wind          | 忍者疾風跑酷 | Ninja Speed        | ⬜    |
| 414 | 武士衝刺   | Samurai Sprint      | 武士衝刺跑酷 | Samurai Runner     | ⬜    |
| 415 | 騎士狂奔   | Knight Dash         | 騎士狂奔跑酷 | Knight Runner      | ⬜    |
| 416 | 海盜逃亡   | Pirate Escape       | 海盜逃亡跑酷 | Pirate Runner      | ⬜    |
| 417 | 牛仔追逐   | Cowboy Chase        | 牛仔追逐跑酷 | Cowboy Runner      | ⬜    |
| 418 | 賽車跑酷   | Racing Run          | 賽車風格跑酷 | Racing Runner      | ⬜    |
| 419 | 摩托跑酷   | Moto Run            | 摩托車跑酷   | Moto Runner        | ⬜    |
| 420 | 腳踏車跑酷 | Bike Run            | 腳踏車跑酷   | Bike Runner        | ⬜    |
| 421 | 翼裝飛行   | Wingsuit Run        | 翼裝滑翔跑酷 | Wingsuit Runner    | ⬜    |
| 422 | 滑翔傘跑   | Paraglide Run       | 滑翔傘跑酷   | Paraglide Runner   | ⬜    |
| 423 | 火箭靴跑   | Rocket Boot Run     | 火箭靴跑酷   | Rocket Runner      | ⬜    |
| 424 | 彈簧跳跑   | Spring Jump Run     | 彈簧跳躍跑酷 | Spring Runner      | ⬜    |
| 425 | 鉤索跑酷   | Grapple Run         | 鉤索擺盪跑酷 | Grapple Runner     | ⬜    |
| 426 | 磁力跑酷   | Magnet Run          | 磁力吸附跑酷 | Magnet Runner      | ⬜    |
| 427 | 電光跑酷   | Electric Run        | 電光速度跑酷 | Electric Runner    | ⬜    |
| 428 | 閃電衝刺   | Lightning Sprint    | 閃電速度跑酷 | Lightning Runner   | ⬜    |
| 429 | 光速狂奔   | Light Speed Run     | 光速跑酷遊戲 | Light Runner       | ⬜    |
| 430 | 音速衝刺   | Sonic Sprint        | 音速跑酷遊戲 | Sonic Runner       | ⬜    |
| 431 | 急速追擊   | Speed Chase         | 急速追擊跑酷 | Chase Runner       | ⬜    |
| 432 | 極限逃脫   | Extreme Escape      | 極限逃脫跑酷 | Extreme Runner     | ⬜    |
| 433 | 絕地求生跑 | Survival Run        | 求生跑酷遊戲 | Survival Runner    | ⬜    |
| 434 | 災難逃亡   | Disaster Escape     | 災難逃亡跑酷 | Disaster Runner    | ⬜    |
| 435 | 怪獸追擊   | Monster Chase       | 怪獸追擊跑酷 | Monster Runner     | ⬜    |
| 436 | 獵人追捕   | Hunter Pursuit      | 被獵人追捕   | Hunter Runner      | ⬜    |
| 437 | 警察追逐   | Police Chase        | 警察追逐跑酷 | Police Runner      | ⬜    |
| 438 | 強盜逃亡   | Robber Escape       | 強盜逃亡跑酷 | Robber Runner      | ⬜    |
| 439 | 間諜跑酷   | Spy Run             | 間諜跑酷遊戲 | Spy Runner         | ⬜    |
| 440 | 特工衝刺   | Agent Sprint        | 特工跑酷遊戲 | Agent Runner       | ⬜    |
| 441 | 學校逃課   | School Escape       | 學校逃跑跑酷 | School Runner      | ⬜    |
| 442 | 購物狂奔   | Shopping Run        | 購物中心跑酷 | Mall Runner        | ⬜    |
| 443 | 機場狂奔   | Airport Run         | 機場場景跑酷 | Airport Runner     | ⬜    |
| 444 | 車站衝刺   | Station Sprint      | 車站跑酷遊戲 | Station Runner     | ⬜    |
| 445 | 遊樂園跑   | Theme Park Run      | 遊樂園跑酷   | Park Runner        | ⬜    |
| 446 | 動物園逃   | Zoo Escape          | 動物園跑酷   | Zoo Runner         | ⬜    |
| 447 | 農場狂奔   | Farm Run            | 農場場景跑酷 | Farm Runner        | ⬜    |
| 448 | 工廠逃亡   | Factory Escape      | 工廠場景跑酷 | Factory Runner     | ⬜    |
| 449 | 實驗室逃   | Lab Escape          | 實驗室跑酷   | Lab Runner         | ⬜    |
| 450 | 終極跑者   | Ultimate Runner     | 終極跑酷挑戰 | Ultimate Runner    | ⬜    |

---

## 🃏 卡牌遊戲 Card (451-520)

| #   | 遊戲名稱 | 英文名                    | 玩法重點     | 技術方向          | 狀態 |
| --- | -------- | ------------------------- | ------------ | ----------------- | ---- |
| 451 | 接龍     | Solitaire                 | 經典單人紙牌 | Canvas Cards      | ⬜    |
| 452 | 蜘蛛紙牌 | Spider Solitaire          | 蜘蛛接龍     | Card Stacks       | ⬜    |
| 453 | 空當接龍 | FreeCell                  | 空當接龍     | FreeCell Logic    | ⬜    |
| 454 | 二十一點 | Blackjack                 | 21點撲克     | Card Game AI      | ⬜    |
| 455 | 德州撲克 | Texas Hold'em             | 德州撲克     | Poker Logic       | ⬜    |
| 456 | 大老二   | Big Two                   | 大老二撲克   | Card Compare      | ⬜    |
| 457 | 抽鬼牌   | Old Maid                  | 抽鬼牌配對   | Pair Match        | ⬜    |
| 458 | 撿紅點   | Pick Red                  | 撿紅點遊戲   | Point Collect     | ⬜    |
| 459 | 心臟病   | Spoons                    | 快速反應撲克 | Speed Cards       | ⬜    |
| 460 | 排七     | Sevens                    | 接龍排七     | Sequence Cards    | ⬜    |
| 461 | 吹牛     | BS/Cheat                  | 吹牛撲克遊戲 | Bluff Game        | ⬜    |
| 462 | 釣魚     | Go Fish                   | 釣魚配對     | Ask & Match       | ⬜    |
| 463 | 戰爭     | War                       | 比大小戰爭   | Compare Game      | ⬜    |
| 464 | 瘋狂八   | Crazy Eights              | 瘋狂八配對   | UNO Style         | ⬜    |
| 465 | UNO      | UNO                       | UNO 卡牌     | UNO Rules         | ⬜    |
| 466 | 十點半   | Ten and Half              | 十點半博弈   | Point Game        | ⬜    |
| 467 | 梭哈     | Show Hand                 | 梭哈撲克     | Poker Showdown    | ⬜    |
| 468 | 百家樂   | Baccarat                  | 百家樂遊戲   | Baccarat Rules    | ⬜    |
| 469 | 橋牌     | Bridge                    | 橋牌遊戲     | Bridge Logic      | ⬜    |
| 470 | 拱豬     | Gong Zhu                  | 拱豬撲克     | Penalty Cards     | ⬜    |
| 471 | 鋤大D    | Cho Dai Di                | 鋤大D撲克    | Climb Cards       | ⬜    |
| 472 | 鬥地主   | Dou Di Zhu                | 鬥地主撲克   | Landlord Game     | ⬜    |
| 473 | 三國殺   | Legends of Three Kingdoms | 三國殺簡化   | Role Cards        | ⬜    |
| 474 | 狼人殺   | Werewolf                  | 狼人殺卡牌   | Social Deduction  | ⬜    |
| 475 | 阿瓦隆   | Avalon                    | 阿瓦隆卡牌   | Team Deduction    | ⬜    |
| 476 | 情書     | Love Letter               | 情書卡牌     | Elimination       | ⬜    |
| 477 | 卡坦島   | Catan Cards               | 卡坦卡牌版   | Resource Cards    | ⬜    |
| 478 | 風聲     | The Message               | 風聲卡牌     | Spy Cards         | ⬜    |
| 479 | 矮人礦坑 | Saboteur                  | 矮人礦坑     | Path Cards        | ⬜    |
| 480 | 爆炸貓   | Exploding Kittens         | 爆炸貓遊戲   | Russian Roulette  | ⬜    |
| 481 | 塔羅占卜 | Tarot Reading             | 塔羅牌遊戲   | Tarot Cards       | ⬜    |
| 482 | 集換卡牌 | TCG Battle                | 集換式卡牌   | TCG System        | ⬜    |
| 483 | 怪獸對決 | Monster Duel              | 怪獸卡牌對戰 | Monster TCG       | ⬜    |
| 484 | 元素卡牌 | Element Cards             | 元素對戰卡牌 | Element TCG       | ⬜    |
| 485 | 魔法卡牌 | Magic Cards               | 魔法卡牌對戰 | Spell Cards       | ⬜    |
| 486 | 戰鬥卡牌 | Battle Cards              | 戰鬥卡牌遊戲 | Combat Cards      | ⬜    |
| 487 | 塔防卡牌 | TD Cards                  | 塔防卡牌遊戲 | TD + Cards        | ⬜    |
| 488 | 建築卡牌 | Building Cards            | 建築卡牌遊戲 | Build Cards       | ⬜    |
| 489 | 冒險卡牌 | Adventure Cards           | 冒險卡牌遊戲 | Adventure TCG     | ⬜    |
| 490 | 解謎卡牌 | Puzzle Cards              | 解謎卡牌遊戲 | Puzzle + Cards    | ⬜    |
| 491 | 速度對決 | Speed Duel                | 速度卡牌對決 | Speed Cards       | ⬜    |
| 492 | 記憶卡牌 | Memory Cards              | 記憶配對卡牌 | Memory Match      | ⬜    |
| 493 | 數字卡牌 | Number Cards              | 數字卡牌遊戲 | Number Game       | ⬜    |
| 494 | 顏色卡牌 | Color Cards               | 顏色配對卡牌 | Color Match       | ⬜    |
| 495 | 動物卡牌 | Animal Cards              | 動物卡牌遊戲 | Animal Match      | ⬜    |
| 496 | 歷史卡牌 | History Cards             | 歷史人物卡牌 | History TCG       | ⬜    |
| 497 | 神話卡牌 | Myth Cards                | 神話卡牌遊戲 | Mythology TCG     | ⬜    |
| 498 | 科幻卡牌 | Sci-fi Cards              | 科幻卡牌遊戲 | Sci-fi TCG        | ⬜    |
| 499 | 恐怖卡牌 | Horror Cards              | 恐怖卡牌遊戲 | Horror TCG        | ⬜    |
| 500 | 塔羅戰鬥 | Tarot Battle              | 塔羅牌戰鬥   | Tarot Combat      | ⬜    |
| 501 | 撲克接龍 | Poker Patience            | 撲克得分接龍 | Poker Solitaire   | ⬜    |
| 502 | 金字塔   | Pyramid                   | 金字塔接龍   | Pyramid Solitaire | ⬜    |
| 503 | 三張牌   | Three Card                | 三張撲克     | 3 Card Poker      | ⬜    |
| 504 | 四張牌   | Four Card                 | 四張撲克     | 4 Card Poker      | ⬜    |
| 505 | 牌九     | Pai Gow                   | 牌九遊戲     | Pai Gow Rules     | ⬜    |
| 506 | 紅黑大戰 | Red Black                 | 紅黑猜牌     | Guess Game        | ⬜    |
| 507 | 高低猜牌 | High Low                  | 高低猜測     | Guess High Low    | ⬜    |
| 508 | 撲克骰子 | Poker Dice                | 撲克骰子     | Dice + Poker      | ⬜    |
| 509 | 拉密     | Rummy                     | 拉密牌組     | Rummy Rules       | ⬜    |
| 510 | 金拉密   | Gin Rummy                 | 金拉密遊戲   | Gin Rules         | ⬜    |
| 511 | 卡納斯塔 | Canasta                   | 卡納斯塔牌   | Canasta Rules     | ⬜    |
| 512 | 合約橋牌 | Contract Bridge           | 合約橋牌     | Contract Bridge   | ⬜    |
| 513 | 尖子     | Pinochle                  | 尖子牌遊戲   | Pinochle Rules    | ⬜    |
| 514 | 卡西諾   | Casino                    | 卡西諾紙牌   | Casino Rules      | ⬜    |
| 515 | 克里比奇 | Cribbage                  | 克里比奇     | Cribbage Rules    | ⬜    |
| 516 | 升級     | Sheng Ji                  | 升級撲克     | Level Up Poker    | ⬜    |
| 517 | 雙扣     | Double Button             | 雙扣撲克     | Double Button     | ⬜    |
| 518 | 跑得快   | Run Fast                  | 跑得快遊戲   | Run Fast Rules    | ⬜    |
| 519 | 掼蛋     | Guan Dan                  | 掼蛋撲克     | Guan Dan Rules    | ⬜    |
| 520 | 終極卡牌 | Ultimate Cards            | 卡牌遊戲合集 | Card Collection   | ⬜    |

---

## ♟️ 棋盤遊戲 Board (521-580)

| #   | 遊戲名稱   | 英文名           | 玩法重點     | 技術方向         | 狀態 |
| --- | ---------- | ---------------- | ------------ | ---------------- | ---- |
| 521 | 西洋棋     | Chess            | 西洋棋對弈   | Chess AI         | ⬜    |
| 522 | 中國象棋   | Chinese Chess    | 中國象棋     | Xiangqi AI       | ⬜    |
| 523 | 圍棋       | Go               | 圍棋對弈     | Go AI            | ⬜    |
| 524 | 五子棋     | Gomoku           | 五子連珠     | Gomoku AI        | ⬜    |
| 525 | 黑白棋     | Othello          | 黑白翻轉棋   | Reversi AI       | ⬜    |
| 526 | 跳棋       | Checkers         | 跳棋遊戲     | Checkers AI      | ⬜    |
| 527 | 西洋跳棋   | Draughts         | 西洋跳棋     | Draughts AI      | ⬜    |
| 528 | 將棋       | Shogi            | 日本將棋     | Shogi AI         | ⬜    |
| 529 | 井字棋     | Tic-Tac-Toe      | 圈叉遊戲     | Simple AI        | ⬜    |
| 530 | 四子棋     | Connect Four     | 四子連線     | Connect4 AI      | ⬜    |
| 531 | 西瓜棋     | Watermelon Chess | 西瓜棋遊戲   | Custom Rules     | ⬜    |
| 532 | 軍棋       | Army Chess       | 軍棋遊戲     | Army Chess AI    | ⬜    |
| 533 | 鬥獸棋     | Jungle           | 鬥獸棋       | Jungle AI        | ⬜    |
| 534 | 飛行棋     | Ludo             | 飛行棋遊戲   | Ludo Rules       | ⬜    |
| 535 | 大富翁     | Monopoly         | 大富翁遊戲   | Monopoly Rules   | ⬜    |
| 536 | 蛇梯棋     | Snakes Ladders   | 蛇梯棋遊戲   | Board + Dice     | ⬜    |
| 537 | 步步高升   | Climbing         | 步步高升棋   | Climb Board      | ⬜    |
| 538 | 陸軍棋     | Land Battle      | 陸戰棋遊戲   | War Board        | ⬜    |
| 539 | 海軍棋     | Battleship       | 海戰棋遊戲   | Battleship AI    | ⬜    |
| 540 | 九宮棋     | Nine Grid        | 九宮格棋     | Grid Strategy    | ⬜    |
| 541 | 六子棋     | Connect Six      | 六子棋遊戲   | Connect6 AI      | ⬜    |
| 542 | 直棋       | Nine Men Morris  | 直棋遊戲     | Morris AI        | ⬜    |
| 543 | 播棋       | Mancala          | 播棋遊戲     | Mancala AI       | ⬜    |
| 544 | 強手棋     | Aggravation      | 強手棋遊戲   | Board Race       | ⬜    |
| 545 | 奇幻棋     | Fantasy Chess    | 奇幻主題棋   | Fantasy Board    | ⬜    |
| 546 | 星際棋     | Star Chess       | 星際主題棋   | Space Board      | ⬜    |
| 547 | 三角棋     | Triangle Chess   | 三角形棋盤   | Triangle Grid    | ⬜    |
| 548 | 六角棋     | Hex              | 六角棋遊戲   | Hex Board        | ⬜    |
| 549 | 方格棋     | Square Chess     | 方格策略棋   | Grid Strategy    | ⬜    |
| 550 | 環形棋     | Ring Chess       | 環形棋盤     | Ring Board       | ⬜    |
| 551 | 立體棋     | 3D Chess         | 立體西洋棋   | 3D Board         | ⬜    |
| 552 | 時間棋     | Time Chess       | 時間限制棋   | Timed Chess      | ⬜    |
| 553 | 迷霧棋     | Fog Chess        | 戰爭迷霧棋   | Fog of War       | ⬜    |
| 554 | 隨機棋     | Random Chess     | 隨機佈局棋   | Fischer Random   | ⬜    |
| 555 | 瘋狂棋     | Crazy Chess      | 瘋狂規則棋   | Variant Rules    | ⬜    |
| 556 | 原子棋     | Atomic Chess     | 爆炸棋遊戲   | Explosion Rules  | ⬜    |
| 557 | 國王競賽   | King Race        | 國王競賽棋   | Race Chess       | ⬜    |
| 558 | 吃子棋     | Capture Chess    | 吃子得分棋   | Capture Points   | ⬜    |
| 559 | 和棋大師   | Draw Master      | 避免輸棋     | Draw Strategy    | ⬜    |
| 560 | 快棋對決   | Speed Chess      | 快棋對決     | Bullet Chess     | ⬜    |
| 561 | 殘局練習   | Endgame Puzzle   | 殘局練習     | Chess Puzzles    | ⬜    |
| 562 | 戰術訓練   | Tactics Trainer  | 戰術訓練     | Tactics Puzzles  | ⬜    |
| 563 | 開局學習   | Opening Study    | 開局學習     | Opening Book     | ⬜    |
| 564 | 雙人合作棋 | Co-op Chess      | 雙人合作     | Team Chess       | ⬜    |
| 565 | 四人棋     | 4 Player Chess   | 四人西洋棋   | 4P Chess         | ⬜    |
| 566 | 暗棋       | Dark Chess       | 暗棋遊戲     | Hidden Info      | ⬜    |
| 567 | 翻棋       | Flip Chess       | 翻棋遊戲     | Flip Rules       | ⬜    |
| 568 | 盲棋       | Blind Chess      | 盲棋對弈     | No Board View    | ⬜    |
| 569 | 騎士巡遊   | Knight Tour      | 騎士巡遊謎題 | Knight Puzzle    | ⬜    |
| 570 | 八皇后     | Eight Queens     | 八皇后問題   | Queen Puzzle     | ⬜    |
| 571 | 西洋雙陸棋 | Backgammon       | 雙陸棋遊戲   | Backgammon AI    | ⬜    |
| 572 | 印度鬥獸棋 | Chaturanga       | 古印度棋     | Ancient Chess    | ⬜    |
| 573 | 泰國象棋   | Makruk           | 泰國象棋     | Thai Chess       | ⬜    |
| 574 | 韓國象棋   | Janggi           | 韓國象棋     | Korean Chess     | ⬜    |
| 575 | 蒙古象棋   | Shatar           | 蒙古象棋     | Mongolian Chess  | ⬜    |
| 576 | 城堡棋     | Castle Chess     | 城堡主題棋   | Castle Board     | ⬜    |
| 577 | 領土棋     | Territory        | 佔領領土棋   | Area Control     | ⬜    |
| 578 | 連接棋     | Connection Game  | 連接兩端棋   | Path Connect     | ⬜    |
| 579 | 圍堵棋     | Blockade         | 圍堵對手棋   | Blocking Game    | ⬜    |
| 580 | 終極棋盤   | Ultimate Board   | 棋盤遊戲合集 | Board Collection | ⬜    |

---

## 🎰 休閒遊戲 Casual (581-680)

| #   | 遊戲名稱   | 英文名              | 玩法重點     | 技術方向          | 狀態 |
| --- | ---------- | ------------------- | ------------ | ----------------- | ---- |
| 581 | 種花養成   | Flower Garden       | 種植花朵養成 | Idle Growth       | ⬜    |
| 582 | 養魚水族   | Aquarium            | 水族箱養魚   | Fish Simulation   | ⬜    |
| 583 | 寵物養成   | Pet Care            | 寵物照顧遊戲 | Pet Simulation    | ⬜    |
| 584 | 咖啡店     | Coffee Shop         | 經營咖啡店   | Management        | ⬜    |
| 585 | 蛋糕店     | Cake Shop           | 經營蛋糕店   | Bakery Game       | ⬜    |
| 586 | 時裝店     | Fashion Shop        | 時裝店經營   | Fashion Game      | ⬜    |
| 587 | 美容院     | Beauty Salon        | 美容院經營   | Salon Game        | ⬜    |
| 588 | 寵物店     | Pet Shop            | 寵物店經營   | Pet Store         | ⬜    |
| 589 | 花店經營   | Flower Shop         | 花店經營遊戲 | Florist Game      | ⬜    |
| 590 | 書店經營   | Book Store          | 書店經營遊戲 | Bookshop Game     | ⬜    |
| 591 | 換裝遊戲   | Dress Up            | 人物換裝     | Avatar Dress      | ⬜    |
| 592 | 化妝遊戲   | Makeup              | 化妝遊戲     | Makeup Game       | ⬜    |
| 593 | 髮型設計   | Hair Salon          | 髮型設計     | Hair Styling      | ⬜    |
| 594 | 美甲設計   | Nail Art            | 美甲設計     | Nail Design       | ⬜    |
| 595 | 房間佈置   | Room Design         | 房間裝潢設計 | Interior Design   | ⬜    |
| 596 | 花園設計   | Garden Design       | 花園景觀設計 | Landscape         | ⬜    |
| 597 | 城堡建造   | Castle Build        | 城堡建造遊戲 | Building Game     | ⬜    |
| 598 | 沙灘度假   | Beach Resort        | 海灘度假村   | Resort Game       | ⬜    |
| 599 | 露營遊戲   | Camping             | 露營體驗遊戲 | Camping Sim       | ⬜    |
| 600 | 野餐派對   | Picnic Party        | 野餐準備遊戲 | Party Prep        | ⬜    |
| 601 | 烹飪大師   | Cooking Master      | 烹飪料理遊戲 | Cooking Game      | ⬜    |
| 602 | 壽司製作   | Sushi Maker         | 壽司製作遊戲 | Sushi Game        | ⬜    |
| 603 | 披薩製作   | Pizza Maker         | 披薩製作遊戲 | Pizza Game        | ⬜    |
| 604 | 漢堡製作   | Burger Maker        | 漢堡製作遊戲 | Burger Game       | ⬜    |
| 605 | 冰淇淋店   | Ice Cream Shop      | 冰淇淋店經營 | Ice Cream Game    | ⬜    |
| 606 | 飲料調製   | Drink Mix           | 飲料調製遊戲 | Drink Mixing      | ⬜    |
| 607 | 果汁店     | Juice Bar           | 果汁店經營   | Juice Game        | ⬜    |
| 608 | 麵包烘焙   | Bread Baking        | 麵包烘焙遊戲 | Baking Game       | ⬜    |
| 609 | 巧克力製作 | Chocolate Making    | 巧克力製作   | Chocolate Game    | ⬜    |
| 610 | 糖果製作   | Candy Making        | 糖果製作遊戲 | Candy Factory     | ⬜    |
| 611 | 畫畫遊戲   | Drawing Game        | 自由繪畫     | Canvas Draw       | ⬜    |
| 612 | 像素畫     | Pixel Art           | 像素畫創作   | Pixel Editor      | ⬜    |
| 613 | 塗色書     | Coloring Book       | 填色遊戲     | Color Fill        | ⬜    |
| 614 | 數字塗色   | Color by Number     | 數字塗色     | Number Color      | ⬜    |
| 615 | 沙畫藝術   | Sand Art            | 沙畫創作     | Sand Canvas       | ⬜    |
| 616 | 刮刮樂     | Scratch Card        | 刮刮樂遊戲   | Scratch Game      | ⬜    |
| 617 | 幸運轉盤   | Lucky Wheel         | 轉盤抽獎     | Wheel Spin        | ⬜    |
| 618 | 扭蛋機     | Gacha Machine       | 扭蛋收集     | Gacha Game        | ⬜    |
| 619 | 拆禮物     | Unbox Gift          | 拆禮物驚喜   | Unboxing          | ⬜    |
| 620 | 氣泡紙     | Bubble Wrap         | 捏泡泡減壓   | Stress Relief     | ⬜    |
| 621 | 切水果     | Fruit Cut           | 切水果休閒   | Slice Game        | ⬜    |
| 622 | 疊疊樂     | Stack Tower         | 疊方塊塔     | Stack Game        | ⬜    |
| 623 | 點擊升級   | Click Upgrade       | 點擊升級遊戲 | Clicker Game      | ⬜    |
| 624 | 放置遊戲   | Idle Game           | 放置類遊戲   | Idle Mechanics    | ⬜    |
| 625 | 合成遊戲   | Merge Game          | 合成升級遊戲 | Merge Mechanics   | ⬜    |
| 626 | 消除大師   | Clear Master        | 消除遊戲     | Clear Game        | ⬜    |
| 627 | 堆積木     | Block Stack         | 積木堆疊     | Building Blocks   | ⬜    |
| 628 | 紙飛機     | Paper Airplane      | 紙飛機遊戲   | Flying Paper      | ⬜    |
| 629 | 彈弓鳥     | Slingshot Bird      | 彈弓射鳥     | Angry Birds Style | ⬜    |
| 630 | 跳跳球     | Bouncy Ball         | 彈跳球遊戲   | Bounce Game       | ⬜    |
| 631 | 滾滾球     | Rolling Ball        | 滾動球遊戲   | Roll Control      | ⬜    |
| 632 | 飛天火箭   | Flying Rocket       | 火箭升空     | Rocket Launch     | ⬜    |
| 633 | 氣球飛行   | Balloon Flight      | 氣球飛行     | Float Game        | ⬜    |
| 634 | 吹蠟燭     | Blow Candle         | 吹蠟燭遊戲   | Blow Detection    | ⬜    |
| 635 | 許願星     | Wishing Star        | 流星許願     | Star Catch        | ⬜    |
| 636 | 放煙火     | Fireworks           | 煙火施放     | Fireworks Sim     | ⬜    |
| 637 | 養蝴蝶     | Butterfly Garden    | 蝴蝶養成     | Butterfly Sim     | ⬜    |
| 638 | 螢火蟲     | Firefly Night       | 螢火蟲捕捉   | Light Chase       | ⬜    |
| 639 | 落葉收集   | Leaf Collection     | 落葉收集     | Collection Game   | ⬜    |
| 640 | 雪花飄落   | Snowfall            | 雪花飄落     | Snow Simulation   | ⬜    |
| 641 | 雨滴接龍   | Raindrop            | 雨滴收集     | Drop Catch        | ⬜    |
| 642 | 彩虹製造   | Rainbow Maker       | 製造彩虹     | Color Spectrum    | ⬜    |
| 643 | 星空觀察   | Stargazing          | 星空觀察     | Star Map          | ⬜    |
| 644 | 日出日落   | Sunrise Sunset      | 日出日落     | Sky Simulation    | ⬜    |
| 645 | 四季變化   | Four Seasons        | 四季變化     | Season Cycle      | ⬜    |
| 646 | 天氣模擬   | Weather Sim         | 天氣模擬     | Weather System    | ⬜    |
| 647 | 種子成長   | Seed Growth         | 種子生長     | Growth Sim        | ⬜    |
| 648 | 盆栽照顧   | Bonsai Care         | 盆栽照顧     | Plant Care        | ⬜    |
| 649 | 蔬菜種植   | Veggie Garden       | 蔬菜種植     | Vegetable Farm    | ⬜    |
| 650 | 水果收穫   | Fruit Harvest       | 水果收穫     | Harvest Game      | ⬜    |
| 651 | 蜜蜂養殖   | Beekeeping          | 養蜂遊戲     | Bee Simulation    | ⬜    |
| 652 | 螞蟻觀察   | Ant Farm            | 螞蟻農場     | Ant Simulation    | ⬜    |
| 653 | 蝸牛賽跑   | Snail Race          | 蝸牛競賽     | Slow Race         | ⬜    |
| 654 | 金魚記憶   | Goldfish Memory     | 金魚記憶     | Memory Test       | ⬜    |
| 655 | 貓咪跳躍   | Cat Jump            | 貓咪跳躍     | Cat Game          | ⬜    |
| 656 | 狗狗接球   | Dog Fetch           | 狗狗接球     | Dog Game          | ⬜    |
| 657 | 倉鼠輪     | Hamster Wheel       | 倉鼠跑輪     | Hamster Sim       | ⬜    |
| 658 | 兔子跳跳   | Bunny Hop           | 兔子跳躍     | Bunny Game        | ⬜    |
| 659 | 企鵝滑行   | Penguin Slide       | 企鵝滑冰     | Penguin Game      | ⬜    |
| 660 | 熊貓滾滾   | Panda Roll          | 熊貓滾動     | Panda Game        | ⬜    |
| 661 | 音樂盒     | Music Box           | 音樂盒欣賞   | Music Player      | ⬜    |
| 662 | 風鈴聲     | Wind Chimes         | 風鈴音效     | Sound Play        | ⬜    |
| 663 | 水晶球     | Crystal Ball        | 水晶球占卜   | Fortune Game      | ⬜    |
| 664 | 萬花筒     | Kaleidoscope        | 萬花筒圖案   | Pattern Gen       | ⬜    |
| 665 | 泡泡機     | Bubble Machine      | 吹泡泡       | Bubble Blow       | ⬜    |
| 666 | 風車轉動   | Windmill            | 風車旋轉     | Spin Animation    | ⬜    |
| 667 | 陀螺旋轉   | Spinning Top        | 陀螺旋轉     | Spin Physics      | ⬜    |
| 668 | 沙漏流動   | Hourglass           | 沙漏觀察     | Sand Flow         | ⬜    |
| 669 | 熔岩燈     | Lava Lamp           | 熔岩燈效果   | Lava Effect       | ⬜    |
| 670 | 霓虹燈     | Neon Lights         | 霓虹燈效果   | Neon Effect       | ⬜    |
| 671 | 星座圖鑑   | Zodiac Guide        | 星座介紹     | Zodiac Info       | ⬜    |
| 672 | 塔羅解讀   | Tarot Guide         | 塔羅介紹     | Tarot Info        | ⬜    |
| 673 | 手相解讀   | Palm Reading        | 手相遊戲     | Palm Game         | ⬜    |
| 674 | 運勢測試   | Fortune Test        | 運勢測試     | Fortune Quiz      | ⬜    |
| 675 | 性格測試   | Personality Quiz    | 性格測試     | Personality Test  | ⬜    |
| 676 | 愛情測試   | Love Test           | 愛情配對     | Love Quiz         | ⬜    |
| 677 | 真心話     | Truth or Dare       | 真心話大冒險 | Party Game        | ⬜    |
| 678 | 猜拳遊戲   | Rock Paper Scissors | 猜拳遊戲     | RPS Game          | ⬜    |
| 679 | 擲骰子     | Dice Roll           | 擲骰子遊戲   | Dice Game         | ⬜    |
| 680 | 終極休閒   | Ultimate Casual     | 休閒遊戲合集 | Casual Collection | ⬜    |

---

## 🏎️ 競速遊戲 Racing (681-730)

| #   | 遊戲名稱   | 英文名            | 玩法重點     | 技術方向         | 狀態 |
| --- | ---------- | ----------------- | ------------ | ---------------- | ---- |
| 681 | 賽車競速   | Car Racing        | 賽車競速     | 3D Racing        | ⬜    |
| 682 | 摩托競速   | Moto Racing       | 摩托車競速   | Moto 3D          | ⬜    |
| 683 | 卡丁車     | Kart Racing       | 卡丁車競速   | Kart Game        | ⬜    |
| 684 | 越野賽車   | Off-Road Racing   | 越野賽車     | Terrain Racing   | ⬜    |
| 685 | 公路賽車   | Highway Racing    | 公路競速     | Highway Game     | ⬜    |
| 686 | 街頭賽車   | Street Racing     | 街頭競速     | Street Race      | ⬜    |
| 687 | 漂移賽車   | Drift Racing      | 漂移競速     | Drift Physics    | ⬜    |
| 688 | 拉力賽     | Rally Racing      | 拉力賽車     | Rally Game       | ⬜    |
| 689 | F1 競速    | F1 Racing         | F1 方程式    | F1 Simulation    | ⬜    |
| 690 | 復古賽車   | Retro Racing      | 復古風賽車   | Retro Race       | ⬜    |
| 691 | 未來賽車   | Future Racing     | 未來風賽車   | Futuristic Race  | ⬜    |
| 692 | 太空賽車   | Space Racing      | 太空賽車     | Space Race       | ⬜    |
| 693 | 水上競速   | Water Racing      | 水上摩托     | Water Race       | ⬜    |
| 694 | 快艇競速   | Speedboat Racing  | 快艇競速     | Boat Racing      | ⬜    |
| 695 | 氣墊船     | Hovercraft        | 氣墊船競速   | Hovercraft Race  | ⬜    |
| 696 | 飛機競速   | Airplane Racing   | 飛機競速     | Air Racing       | ⬜    |
| 697 | 直升機競速 | Helicopter Racing | 直升機競速   | Heli Racing      | ⬜    |
| 698 | 滑翔機競速 | Glider Racing     | 滑翔機競速   | Glider Race      | ⬜    |
| 699 | 腳踏車競速 | Bicycle Racing    | 腳踏車競速   | Bike Racing      | ⬜    |
| 700 | 滑板競速   | Skateboard Racing | 滑板競速     | Skate Racing     | ⬜    |
| 701 | 溜冰競速   | Skating Racing    | 溜冰競速     | Skating Race     | ⬜    |
| 702 | 滑雪競速   | Ski Racing        | 滑雪競速     | Ski Racing       | ⬜    |
| 703 | 雪橇競速   | Sled Racing       | 雪橇競速     | Sled Race        | ⬜    |
| 704 | 動物競速   | Animal Racing     | 動物競速     | Animal Race      | ⬜    |
| 705 | 賽馬競速   | Horse Racing      | 賽馬競速     | Horse Race       | ⬜    |
| 706 | 賽狗競速   | Dog Racing        | 賽狗競速     | Dog Race         | ⬜    |
| 707 | 蝸牛競速   | Snail Racing      | 蝸牛競速     | Slow Race Game   | ⬜    |
| 708 | 火箭競速   | Rocket Racing     | 火箭競速     | Rocket Race      | ⬜    |
| 709 | 磁浮車     | Maglev Racing     | 磁浮列車競速 | Maglev Race      | ⬜    |
| 710 | 雲霄飛車   | Roller Coaster    | 雲霄飛車競速 | Coaster Race     | ⬜    |
| 711 | 隧道競速   | Tunnel Racing     | 隧道競速     | Tunnel Race      | ⬜    |
| 712 | 城市穿梭   | City Dash         | 城市穿梭競速 | Urban Race       | ⬜    |
| 713 | 叢林競速   | Jungle Racing     | 叢林競速     | Jungle Race      | ⬜    |
| 714 | 沙漠競速   | Desert Racing     | 沙漠競速     | Desert Race      | ⬜    |
| 715 | 雪地競速   | Snow Racing       | 雪地競速     | Snow Race        | ⬜    |
| 716 | 火山競速   | Volcano Racing    | 火山競速     | Lava Race        | ⬜    |
| 717 | 深海競速   | Deep Sea Racing   | 深海競速     | Underwater Race  | ⬜    |
| 718 | 天空競速   | Sky Racing        | 天空競速     | Sky Race         | ⬜    |
| 719 | 時間競速   | Time Trial        | 計時賽       | Time Attack      | ⬜    |
| 720 | 淘汰賽     | Elimination Race  | 淘汰競速     | Elimination Mode | ⬜    |
| 721 | 追逐賽     | Chase Race        | 追逐競速     | Chase Mode       | ⬜    |
| 722 | 團隊競速   | Team Racing       | 團隊競速     | Team Race        | ⬜    |
| 723 | 障礙競速   | Obstacle Racing   | 障礙競速     | Obstacle Race    | ⬜    |
| 724 | 武器競速   | Combat Racing     | 武裝競速     | Combat Race      | ⬜    |
| 725 | 碰撞競速   | Crash Racing      | 碰撞競速     | Crash Derby      | ⬜    |
| 726 | 逆行競速   | Wrong Way Racing  | 逆向競速     | Reverse Race     | ⬜    |
| 727 | 夜間競速   | Night Racing      | 夜間競速     | Night Race       | ⬜    |
| 728 | 雨天競速   | Rain Racing       | 雨天競速     | Weather Race     | ⬜    |
| 729 | 極限競速   | Extreme Racing    | 極限競速     | Extreme Race     | ⬜    |
| 730 | 終極競速   | Ultimate Racing   | 終極競速合集 | Race Collection  | ⬜    |

---

## ⚔️ 策略遊戲 Strategy (731-790)

| #   | 遊戲名稱   | 英文名              | 玩法重點     | 技術方向            | 狀態 |
| --- | ---------- | ------------------- | ------------ | ------------------- | ---- |
| 731 | 塔防經典   | Tower Defense       | 經典塔防     | TD Mechanics        | ⬜    |
| 732 | 氣球塔防   | Balloon TD          | 氣球塔防     | Balloon TD          | ⬜    |
| 733 | 殭屍塔防   | Zombie TD           | 殭屍塔防     | Zombie TD           | ⬜    |
| 734 | 外星塔防   | Alien TD            | 外星人塔防   | Alien TD            | ⬜    |
| 735 | 王國塔防   | Kingdom TD          | 王國塔防     | Fantasy TD          | ⬜    |
| 736 | 太空塔防   | Space TD            | 太空塔防     | Space TD            | ⬜    |
| 737 | 植物塔防   | Plant TD            | 植物塔防     | Plant TD            | ⬜    |
| 738 | 動物塔防   | Animal TD           | 動物塔防     | Animal TD           | ⬜    |
| 739 | 元素塔防   | Element TD          | 元素塔防     | Element TD          | ⬜    |
| 740 | 迷宮塔防   | Maze TD             | 迷宮塔防     | Maze TD             | ⬜    |
| 741 | 戰爭策略   | War Strategy        | 戰爭策略     | War Game            | ⬜    |
| 742 | 帝國建設   | Empire Builder      | 帝國建設     | Empire Game         | ⬜    |
| 743 | 城市建造   | City Builder        | 城市建造     | City Sim            | ⬜    |
| 744 | 文明發展   | Civilization        | 文明發展     | Civ Game            | ⬜    |
| 745 | 殖民地     | Colony Game         | 殖民地經營   | Colony Sim          | ⬜    |
| 746 | 島嶼發展   | Island Development  | 島嶼發展     | Island Game         | ⬜    |
| 747 | 太空殖民   | Space Colony        | 太空殖民     | Space Colony        | ⬜    |
| 748 | 資源管理   | Resource Management | 資源管理     | Resource Game       | ⬜    |
| 749 | 貿易帝國   | Trade Empire        | 貿易帝國     | Trading Game        | ⬜    |
| 750 | 鐵路大亨   | Railroad Tycoon     | 鐵路經營     | Railroad Game       | ⬜    |
| 751 | 回合戰略   | Turn Strategy       | 回合制戰略   | Turn-based          | ⬜    |
| 752 | 即時戰略   | RTS Lite            | 即時戰略     | RTS Mechanics       | ⬜    |
| 753 | 軍團指揮   | Army Commander      | 軍團指揮     | Army Game           | ⬜    |
| 754 | 海戰策略   | Naval Strategy      | 海戰策略     | Naval Game          | ⬜    |
| 755 | 空戰策略   | Air Strategy        | 空戰策略     | Air Combat          | ⬜    |
| 756 | 坦克指揮   | Tank Commander      | 坦克指揮     | Tank Strategy       | ⬜    |
| 757 | 間諜行動   | Spy Operation       | 間諜行動     | Spy Game            | ⬜    |
| 758 | 政治模擬   | Political Sim       | 政治模擬     | Politics Game       | ⬜    |
| 759 | 公司經營   | Company Management  | 公司經營     | Business Sim        | ⬜    |
| 760 | 醫院經營   | Hospital Tycoon     | 醫院經營     | Hospital Game       | ⬜    |
| 761 | 農場策略   | Farm Strategy       | 農場策略     | Farm Strategy       | ⬜    |
| 762 | 動物園經營 | Zoo Tycoon          | 動物園經營   | Zoo Game            | ⬜    |
| 763 | 遊樂園經營 | Theme Park          | 遊樂園經營   | Theme Park Sim      | ⬜    |
| 764 | 餐廳經營   | Restaurant Tycoon   | 餐廳經營     | Restaurant Game     | ⬜    |
| 765 | 旅館經營   | Hotel Tycoon        | 旅館經營     | Hotel Game          | ⬜    |
| 766 | 航空公司   | Airline Tycoon      | 航空公司經營 | Airline Game        | ⬜    |
| 767 | 足球經理   | Football Manager    | 足球經理     | Sports Manager      | ⬜    |
| 768 | 籃球經理   | Basketball Manager  | 籃球經理     | Basketball Mgr      | ⬜    |
| 769 | 電競經理   | Esports Manager     | 電競經理     | Esports Mgr         | ⬜    |
| 770 | 地牢管理   | Dungeon Manager     | 地牢管理     | Dungeon Mgr         | ⬜    |
| 771 | 英雄管理   | Hero Manager        | 英雄管理     | Hero Mgr            | ⬜    |
| 772 | 傭兵團     | Mercenary Band      | 傭兵團經營   | Mercenary Game      | ⬜    |
| 773 | 公會經營   | Guild Management    | 公會經營     | Guild Sim           | ⬜    |
| 774 | 王國統治   | Kingdom Rule        | 王國統治     | Kingdom Sim         | ⬜    |
| 775 | 領主模擬   | Lord Simulator      | 領主模擬     | Lord Game           | ⬜    |
| 776 | 戰役模式   | Campaign Mode       | 戰役模式     | Campaign Game       | ⬜    |
| 777 | 征服模式   | Conquest Mode       | 征服模式     | Conquest Game       | ⬜    |
| 778 | 生存策略   | Survival Strategy   | 生存策略     | Survival Mgr        | ⬜    |
| 779 | 末日策略   | Apocalypse Strategy | 末日策略     | Post-Apocalyptic    | ⬜    |
| 780 | 海盜策略   | Pirate Strategy     | 海盜策略     | Pirate Mgr          | ⬜    |
| 781 | 維京策略   | Viking Strategy     | 維京策略     | Viking Game         | ⬜    |
| 782 | 羅馬策略   | Roman Strategy      | 羅馬策略     | Roman Game          | ⬜    |
| 783 | 中世紀策略 | Medieval Strategy   | 中世紀策略   | Medieval Game       | ⬜    |
| 784 | 三國策略   | Three Kingdoms      | 三國策略     | 3K Strategy         | ⬜    |
| 785 | 戰國策略   | Warring States      | 戰國策略     | Warring States      | ⬜    |
| 786 | 拿破崙戰爭 | Napoleonic War      | 拿破崙戰爭   | Napoleon Game       | ⬜    |
| 787 | 世界大戰   | World War           | 世界大戰     | WW Strategy         | ⬜    |
| 788 | 冷戰策略   | Cold War            | 冷戰策略     | Cold War Game       | ⬜    |
| 789 | 未來戰爭   | Future War          | 未來戰爭     | Future Strategy     | ⬜    |
| 790 | 終極策略   | Ultimate Strategy   | 策略遊戲合集 | Strategy Collection | ⬜    |

---

## 🎵 音樂遊戲 Music (791-830)

| #   | 遊戲名稱 | 英文名           | 玩法重點     | 技術方向         | 狀態 |
| --- | -------- | ---------------- | ------------ | ---------------- | ---- |
| 791 | 節奏大師 | Rhythm Master    | 節奏點擊     | Rhythm Game      | ⬜    |
| 792 | 鋼琴塊   | Piano Tiles      | 鋼琴塊點擊   | Piano Game       | ⬜    |
| 793 | 吉他英雄 | Guitar Hero      | 吉他節奏     | Guitar Game      | ⬜    |
| 794 | 鼓手達人 | Drum Master      | 打鼓節奏     | Drum Game        | ⬜    |
| 795 | DJ 混音  | DJ Mixer         | DJ 混音      | DJ Game          | ⬜    |
| 796 | 舞蹈遊戲 | Dance Game       | 舞蹈節奏     | Dance Rhythm     | ⬜    |
| 797 | 音樂跑酷 | Music Runner     | 音樂跑酷     | Music Runner     | ⬜    |
| 798 | 節奏射擊 | Rhythm Shooter   | 節奏射擊     | Rhythm Shooter   | ⬜    |
| 799 | 音符收集 | Note Collector   | 音符收集     | Note Game        | ⬜    |
| 800 | 聲音配對 | Sound Match      | 聲音配對     | Audio Match      | ⬜    |
| 801 | 音階訓練 | Scale Training   | 音階訓練     | Music Training   | ⬜    |
| 802 | 音準測試 | Pitch Test       | 音準測試     | Pitch Game       | ⬜    |
| 803 | 節拍訓練 | Beat Training    | 節拍訓練     | Beat Game        | ⬜    |
| 804 | 旋律記憶 | Melody Memory    | 旋律記憶     | Melody Memory    | ⬜    |
| 805 | 和弦練習 | Chord Practice   | 和弦練習     | Chord Game       | ⬜    |
| 806 | 作曲遊戲 | Composer         | 簡易作曲     | Compose Game     | ⬜    |
| 807 | 樂器模擬 | Instrument Sim   | 樂器模擬     | Instrument Game  | ⬜    |
| 808 | 鋼琴練習 | Piano Practice   | 鋼琴練習     | Piano Sim        | ⬜    |
| 809 | 小提琴   | Violin Game      | 小提琴遊戲   | Violin Sim       | ⬜    |
| 810 | 吉他練習 | Guitar Practice  | 吉他練習     | Guitar Sim       | ⬜    |
| 811 | 打擊樂   | Percussion       | 打擊樂遊戲   | Percussion Game  | ⬜    |
| 812 | 電子音樂 | Electronic Music | 電子音樂     | EDM Game         | ⬜    |
| 813 | 古典音樂 | Classical Music  | 古典音樂     | Classical Game   | ⬜    |
| 814 | 爵士即興 | Jazz Improv      | 爵士即興     | Jazz Game        | ⬜    |
| 815 | 搖滾節奏 | Rock Rhythm      | 搖滾節奏     | Rock Game        | ⬜    |
| 816 | 嘻哈節拍 | Hip Hop Beat     | 嘻哈節拍     | Hip Hop Game     | ⬜    |
| 817 | 流行音樂 | Pop Music        | 流行音樂     | Pop Game         | ⬜    |
| 818 | 民謠音樂 | Folk Music       | 民謠音樂     | Folk Game        | ⬜    |
| 819 | 世界音樂 | World Music      | 世界音樂     | World Music Game | ⬜    |
| 820 | 卡拉OK   | Karaoke          | 卡拉OK       | Karaoke Game     | ⬜    |
| 821 | 猜歌遊戲 | Song Guess       | 猜歌遊戲     | Song Quiz        | ⬜    |
| 822 | 音樂問答 | Music Quiz       | 音樂問答     | Music Trivia     | ⬜    |
| 823 | 樂團模擬 | Band Simulator   | 樂團模擬     | Band Game        | ⬜    |
| 824 | 音樂製作 | Music Producer   | 音樂製作     | Producer Game    | ⬜    |
| 825 | 聲音合成 | Sound Synthesis  | 聲音合成     | Synth Game       | ⬜    |
| 826 | 音效設計 | Sound Design     | 音效設計     | Sound Design     | ⬜    |
| 827 | 環境音   | Ambient Sound    | 環境音製作   | Ambient Game     | ⬜    |
| 828 | 白噪音   | White Noise      | 白噪音放鬆   | Noise Generator  | ⬜    |
| 829 | 冥想音樂 | Meditation Music | 冥想音樂     | Meditation Game  | ⬜    |
| 830 | 終極音樂 | Ultimate Music   | 音樂遊戲合集 | Music Collection | ⬜    |

---

## 🔫 射擊遊戲 Shooter (831-880)

| #   | 遊戲名稱   | 英文名             | 玩法重點     | 技術方向           | 狀態 |
| --- | ---------- | ------------------ | ------------ | ------------------ | ---- |
| 831 | 太空射擊   | Space Shooter      | 太空射擊     | Space Shooter      | ⬜    |
| 832 | 飛機射擊   | Airplane Shooter   | 飛機射擊     | Airplane Game      | ⬜    |
| 833 | 坦克射擊   | Tank Shooter       | 坦克射擊     | Tank Game          | ⬜    |
| 834 | 潛艇射擊   | Submarine Shooter  | 潛艇射擊     | Sub Game           | ⬜    |
| 835 | 西部射擊   | Western Shooter    | 西部射擊     | Western Game       | ⬜    |
| 836 | 殭屍射擊   | Zombie Shooter     | 殭屍射擊     | Zombie Game        | ⬜    |
| 837 | 外星射擊   | Alien Shooter      | 外星人射擊   | Alien Game         | ⬜    |
| 838 | 機器人射擊 | Robot Shooter      | 機器人射擊   | Robot Game         | ⬜    |
| 839 | 怪獸射擊   | Monster Shooter    | 怪獸射擊     | Monster Game       | ⬜    |
| 840 | 海盜射擊   | Pirate Shooter     | 海盜射擊     | Pirate Game        | ⬜    |
| 841 | 橫向射擊   | Side Shooter       | 橫向射擊     | Side Scroller      | ⬜    |
| 842 | 縱向射擊   | Vertical Shooter   | 縱向射擊     | Vertical Scroll    | ⬜    |
| 843 | 雙搖桿射擊 | Twin Stick Shooter | 雙搖桿射擊   | Twin Stick         | ⬜    |
| 844 | 彈幕射擊   | Bullet Hell        | 彈幕射擊     | Danmaku            | ⬜    |
| 845 | 軌道射擊   | Rail Shooter       | 軌道射擊     | Rail Game          | ⬜    |
| 846 | 俯視射擊   | Top Down Shooter   | 俯視角射擊   | Top Down           | ⬜    |
| 847 | 第一人稱   | FPS Lite           | 第一人稱射擊 | FPS Game           | ⬜    |
| 848 | 狙擊射擊   | Sniper Game        | 狙擊射擊     | Sniper Game        | ⬜    |
| 849 | 弓箭射擊   | Archery Shooter    | 弓箭射擊     | Archery Game       | ⬜    |
| 850 | 投擲射擊   | Throwing Game      | 投擲射擊     | Throw Game         | ⬜    |
| 851 | 雷射射擊   | Laser Shooter      | 雷射射擊     | Laser Game         | ⬜    |
| 852 | 電漿射擊   | Plasma Shooter     | 電漿射擊     | Plasma Game        | ⬜    |
| 853 | 火焰射擊   | Flame Shooter      | 火焰射擊     | Flame Game         | ⬜    |
| 854 | 冰凍射擊   | Ice Shooter        | 冰凍射擊     | Ice Game           | ⬜    |
| 855 | 毒素射擊   | Poison Shooter     | 毒素射擊     | Poison Game        | ⬜    |
| 856 | 閃電射擊   | Lightning Shooter  | 閃電射擊     | Lightning Game     | ⬜    |
| 857 | 重力炮     | Gravity Gun        | 重力砲射擊   | Gravity Gun        | ⬜    |
| 858 | 傳送槍     | Portal Gun         | 傳送槍射擊   | Portal Gun         | ⬜    |
| 859 | 時間槍     | Time Gun           | 時間槍射擊   | Time Gun           | ⬜    |
| 860 | 防禦射擊   | Defense Shooter    | 防禦射擊     | Defense Game       | ⬜    |
| 861 | 攻城射擊   | Siege Shooter      | 攻城射擊     | Siege Game         | ⬜    |
| 862 | 波次生存   | Wave Survival      | 波次生存射擊 | Wave Game          | ⬜    |
| 863 | 競技場射擊 | Arena Shooter      | 競技場射擊   | Arena Game         | ⬜    |
| 864 | 對戰射擊   | VS Shooter         | 對戰射擊     | VS Game            | ⬜    |
| 865 | 合作射擊   | Co-op Shooter      | 合作射擊     | Co-op Game         | ⬜    |
| 866 | 護送射擊   | Escort Shooter     | 護送射擊     | Escort Game        | ⬜    |
| 867 | 收集射擊   | Collection Shooter | 收集射擊     | Collection Game    | ⬜    |
| 868 | 升級射擊   | Upgrade Shooter    | 升級射擊     | Upgrade Game       | ⬜    |
| 869 | 像素射擊   | Pixel Shooter      | 像素射擊     | Pixel Game         | ⬜    |
| 870 | 霓虹射擊   | Neon Shooter       | 霓虹射擊     | Neon Game          | ⬜    |
| 871 | 極簡射擊   | Minimal Shooter    | 極簡射擊     | Minimal Game       | ⬜    |
| 872 | 復古射擊   | Retro Shooter      | 復古射擊     | Retro Game         | ⬜    |
| 873 | 現代射擊   | Modern Shooter     | 現代射擊     | Modern Game        | ⬜    |
| 874 | 未來射擊   | Future Shooter     | 未來射擊     | Future Game        | ⬜    |
| 875 | 奇幻射擊   | Fantasy Shooter    | 奇幻射擊     | Fantasy Game       | ⬜    |
| 876 | 科幻射擊   | Sci-Fi Shooter     | 科幻射擊     | Sci-Fi Game        | ⬜    |
| 877 | 恐怖射擊   | Horror Shooter     | 恐怖射擊     | Horror Game        | ⬜    |
| 878 | 喜劇射擊   | Comedy Shooter     | 喜劇射擊     | Comedy Game        | ⬜    |
| 879 | 無盡射擊   | Endless Shooter    | 無盡射擊     | Endless Game       | ⬜    |
| 880 | 終極射擊   | Ultimate Shooter   | 射擊遊戲合集 | Shooter Collection | ⬜    |

---

## 🏀 運動遊戲 Sports (881-930)

| #   | 遊戲名稱 | 英文名            | 玩法重點     | 技術方向           | 狀態 |
| --- | -------- | ----------------- | ------------ | ------------------ | ---- |
| 881 | 足球遊戲 | Soccer Game       | 足球比賽     | Soccer Physics     | ⬜    |
| 882 | 籃球遊戲 | Basketball Game   | 籃球比賽     | Basketball Physics | ⬜    |
| 883 | 棒球遊戲 | Baseball Game     | 棒球比賽     | Baseball Physics   | ⬜    |
| 884 | 網球遊戲 | Tennis Game       | 網球比賽     | Tennis Physics     | ⬜    |
| 885 | 桌球遊戲 | Table Tennis      | 桌球比賽     | Ping Pong Physics  | ⬜    |
| 886 | 羽毛球   | Badminton         | 羽毛球比賽   | Badminton Physics  | ⬜    |
| 887 | 排球遊戲 | Volleyball        | 排球比賽     | Volleyball Physics | ⬜    |
| 888 | 橄欖球   | Rugby             | 橄欖球比賽   | Rugby Physics      | ⬜    |
| 889 | 美式足球 | American Football | 美式足球     | Football Physics   | ⬜    |
| 890 | 冰球遊戲 | Ice Hockey        | 冰球比賽     | Hockey Physics     | ⬜    |
| 891 | 高爾夫   | Golf              | 高爾夫球     | Golf Physics       | ⬜    |
| 892 | 撞球遊戲 | Billiards         | 撞球遊戲     | Pool Physics       | ⬜    |
| 893 | 保齡球   | Bowling           | 保齡球遊戲   | Bowling Physics    | ⬜    |
| 894 | 飛鏢遊戲 | Darts             | 飛鏢遊戲     | Dart Physics       | ⬜    |
| 895 | 拳擊遊戲 | Boxing            | 拳擊比賽     | Boxing Game        | ⬜    |
| 896 | 摔角遊戲 | Wrestling         | 摔角比賽     | Wrestling Game     | ⬜    |
| 897 | 跆拳道   | Taekwondo         | 跆拳道比賽   | Taekwondo Game     | ⬜    |
| 898 | 柔道遊戲 | Judo              | 柔道比賽     | Judo Game          | ⬜    |
| 899 | 擊劍遊戲 | Fencing           | 擊劍比賽     | Fencing Game       | ⬜    |
| 900 | 射箭遊戲 | Archery           | 射箭比賽     | Archery Game       | ⬜    |
| 901 | 游泳遊戲 | Swimming          | 游泳比賽     | Swimming Game      | ⬜    |
| 902 | 跳水遊戲 | Diving            | 跳水比賽     | Diving Game        | ⬜    |
| 903 | 體操遊戲 | Gymnastics        | 體操比賽     | Gymnastics Game    | ⬜    |
| 904 | 田徑遊戲 | Track & Field     | 田徑比賽     | Athletics Game     | ⬜    |
| 905 | 馬拉松   | Marathon          | 馬拉松遊戲   | Marathon Game      | ⬜    |
| 906 | 跨欄遊戲 | Hurdles           | 跨欄比賽     | Hurdles Game       | ⬜    |
| 907 | 跳高遊戲 | High Jump         | 跳高比賽     | Jump Game          | ⬜    |
| 908 | 跳遠遊戲 | Long Jump         | 跳遠比賽     | Jump Physics       | ⬜    |
| 909 | 鉛球遊戲 | Shot Put          | 鉛球比賽     | Throw Physics      | ⬜    |
| 910 | 鏈球遊戲 | Hammer Throw      | 鏈球比賽     | Spin Throw         | ⬜    |
| 911 | 標槍遊戲 | Javelin           | 標槍比賽     | Javelin Physics    | ⬜    |
| 912 | 鐵餅遊戲 | Discus            | 鐵餅比賽     | Discus Physics     | ⬜    |
| 913 | 滑雪遊戲 | Skiing            | 滑雪比賽     | Ski Physics        | ⬜    |
| 914 | 滑板遊戲 | Skateboarding     | 滑板運動     | Skateboard Physics | ⬜    |
| 915 | 衝浪遊戲 | Surfing           | 衝浪運動     | Surf Physics       | ⬜    |
| 916 | 滑水遊戲 | Water Skiing      | 滑水運動     | Water Ski          | ⬜    |
| 917 | 帆船遊戲 | Sailing           | 帆船競賽     | Sailing Physics    | ⬜    |
| 918 | 划船遊戲 | Rowing            | 划船競賽     | Rowing Physics     | ⬜    |
| 919 | 獨木舟   | Kayaking          | 獨木舟競賽   | Kayak Physics      | ⬜    |
| 920 | 自行車   | Cycling           | 自行車競賽   | Cycling Game       | ⬜    |
| 921 | BMX 遊戲 | BMX               | BMX 競賽     | BMX Physics        | ⬜    |
| 922 | 極限運動 | Extreme Sports    | 極限運動合集 | Extreme Game       | ⬜    |
| 923 | 攀岩遊戲 | Rock Climbing     | 攀岩運動     | Climbing Game      | ⬜    |
| 924 | 跳傘遊戲 | Skydiving         | 跳傘運動     | Skydive Physics    | ⬜    |
| 925 | 蹦極遊戲 | Bungee Jump       | 蹦極運動     | Bungee Physics     | ⬜    |
| 926 | 滑翔翼   | Hang Gliding      | 滑翔翼運動   | Glide Physics      | ⬜    |
| 927 | 奧運會   | Olympics          | 奧運比賽合集 | Olympics Game      | ⬜    |
| 928 | 冬季運動 | Winter Sports     | 冬季運動合集 | Winter Games       | ⬜    |
| 929 | 夏季運動 | Summer Sports     | 夏季運動合集 | Summer Games       | ⬜    |
| 930 | 終極運動 | Ultimate Sports   | 運動遊戲合集 | Sports Collection  | ⬜    |

---

## 🎪 模擬遊戲 Simulation (931-970)

| #   | 遊戲名稱   | 英文名                | 玩法重點     | 技術方向         | 狀態 |
| --- | ---------- | --------------------- | ------------ | ---------------- | ---- |
| 931 | 飛行模擬   | Flight Simulator      | 飛機駕駛     | Flight Sim       | ⬜    |
| 932 | 駕駛模擬   | Driving Simulator     | 汽車駕駛     | Driving Sim      | ⬜    |
| 933 | 火車模擬   | Train Simulator       | 火車駕駛     | Train Sim        | ⬜    |
| 934 | 船舶模擬   | Ship Simulator        | 船舶駕駛     | Ship Sim         | ⬜    |
| 935 | 太空船模擬 | Spaceship Simulator   | 太空船駕駛   | Space Sim        | ⬜    |
| 936 | 潛艇模擬   | Submarine Simulator   | 潛艇駕駛     | Sub Sim          | ⬜    |
| 937 | 直升機模擬 | Helicopter Simulator  | 直升機駕駛   | Heli Sim         | ⬜    |
| 938 | 卡車模擬   | Truck Simulator       | 卡車駕駛     | Truck Sim        | ⬜    |
| 939 | 巴士模擬   | Bus Simulator         | 巴士駕駛     | Bus Sim          | ⬜    |
| 940 | 挖掘機模擬 | Excavator Simulator   | 挖掘機操作   | Construction Sim | ⬜    |
| 941 | 農場模擬   | Farm Simulator        | 農場經營     | Farm Sim         | ⬜    |
| 942 | 釣魚模擬   | Fishing Simulator     | 釣魚遊戲     | Fishing Sim      | ⬜    |
| 943 | 狩獵模擬   | Hunting Simulator     | 狩獵遊戲     | Hunting Sim      | ⬜    |
| 944 | 登山模擬   | Mountain Climbing     | 登山遊戲     | Climbing Sim     | ⬜    |
| 945 | 露營模擬   | Camping Simulator     | 露營遊戲     | Camping Sim      | ⬜    |
| 946 | 生存模擬   | Survival Simulator    | 生存遊戲     | Survival Sim     | ⬜    |
| 947 | 荒島生存   | Island Survival       | 荒島生存     | Island Sim       | ⬜    |
| 948 | 醫生模擬   | Doctor Simulator      | 醫生模擬     | Medical Sim      | ⬜    |
| 949 | 手術模擬   | Surgery Simulator     | 手術模擬     | Surgery Sim      | ⬜    |
| 950 | 獸醫模擬   | Vet Simulator         | 獸醫模擬     | Vet Sim          | ⬜    |
| 951 | 廚師模擬   | Chef Simulator        | 廚師模擬     | Chef Sim         | ⬜    |
| 952 | 服務生模擬 | Waiter Simulator      | 服務生模擬   | Waiter Sim       | ⬜    |
| 953 | 理髮師模擬 | Barber Simulator      | 理髮師模擬   | Barber Sim       | ⬜    |
| 954 | 機械師模擬 | Mechanic Simulator    | 機械師模擬   | Mechanic Sim     | ⬜    |
| 955 | 消防員模擬 | Firefighter Simulator | 消防員模擬   | Fire Sim         | ⬜    |
| 956 | 警察模擬   | Police Simulator      | 警察模擬     | Police Sim       | ⬜    |
| 957 | 郵差模擬   | Postman Simulator     | 郵差模擬     | Delivery Sim     | ⬜    |
| 958 | 清潔工模擬 | Cleaner Simulator     | 清潔工模擬   | Cleaning Sim     | ⬜    |
| 959 | 建築師模擬 | Architect Simulator   | 建築師模擬   | Architect Sim    | ⬜    |
| 960 | 室內設計   | Interior Designer     | 室內設計模擬 | Interior Sim     | ⬜    |
| 961 | 人生模擬   | Life Simulator        | 人生模擬     | Life Sim         | ⬜    |
| 962 | 約會模擬   | Dating Simulator      | 約會模擬     | Dating Sim       | ⬜    |
| 963 | 寵物模擬   | Pet Simulator         | 寵物模擬     | Pet Sim          | ⬜    |
| 964 | 動物模擬   | Animal Simulator      | 動物模擬     | Animal Sim       | ⬜    |
| 965 | 恐龍模擬   | Dinosaur Simulator    | 恐龍模擬     | Dino Sim         | ⬜    |
| 966 | 昆蟲模擬   | Insect Simulator      | 昆蟲模擬     | Insect Sim       | ⬜    |
| 967 | 細菌模擬   | Bacteria Simulator    | 細菌模擬     | Bacteria Sim     | ⬜    |
| 968 | 宇宙模擬   | Universe Simulator    | 宇宙模擬     | Universe Sim     | ⬜    |
| 969 | 物理模擬   | Physics Simulator     | 物理模擬     | Physics Sim      | ⬜    |
| 970 | 終極模擬   | Ultimate Simulation   | 模擬遊戲合集 | Sim Collection   | ⬜    |

---

## 👻 恐怖遊戲 Horror (971-1000)

| #    | 遊戲名稱   | 英文名             | 玩法重點     | 技術方向          | 狀態 |
| ---- | ---------- | ------------------ | ------------ | ----------------- | ---- |
| 971  | 鬼屋探索   | Haunted House      | 鬼屋探索     | Horror Explore    | ⬜    |
| 972  | 廢棄醫院   | Abandoned Hospital | 廢棄醫院探索 | Hospital Horror   | ⬜    |
| 973  | 恐怖學校   | Scary School       | 恐怖學校探索 | School Horror     | ⬜    |
| 974  | 幽靈森林   | Ghost Forest       | 幽靈森林探索 | Forest Horror     | ⬜    |
| 975  | 地下室     | The Basement       | 地下室恐怖   | Basement Horror   | ⬜    |
| 976  | 閣樓秘密   | Attic Secrets      | 閣樓恐怖     | Attic Horror      | ⬜    |
| 977  | 鏡中世界   | Mirror World       | 鏡子恐怖     | Mirror Horror     | ⬜    |
| 978  | 夢魘       | Nightmare          | 夢魘恐怖     | Dream Horror      | ⬜    |
| 979  | 午夜驚魂   | Midnight Terror    | 午夜恐怖     | Midnight Horror   | ⬜    |
| 980  | 詭異電話   | Creepy Call        | 詭異電話     | Phone Horror      | ⬜    |
| 981  | 錄影帶     | Found Footage      | 錄影帶恐怖   | Video Horror      | ⬜    |
| 982  | 殭屍逃亡   | Zombie Escape      | 殭屍逃亡     | Zombie Horror     | ⬜    |
| 983  | 吸血鬼城堡 | Vampire Castle     | 吸血鬼恐怖   | Vampire Horror    | ⬜    |
| 984  | 狼人之夜   | Werewolf Night     | 狼人恐怖     | Werewolf Horror   | ⬜    |
| 985  | 木乃伊墓穴 | Mummy Tomb         | 木乃伊恐怖   | Mummy Horror      | ⬜    |
| 986  | 科學怪人   | Frankenstein       | 科學怪人     | Monster Horror    | ⬜    |
| 987  | 外星入侵   | Alien Horror       | 外星恐怖     | Alien Horror      | ⬜    |
| 988  | 深海恐懼   | Deep Sea Horror    | 深海恐怖     | Ocean Horror      | ⬜    |
| 989  | 太空恐懼   | Space Horror       | 太空恐怖     | Space Horror      | ⬜    |
| 990  | SCP 收容   | SCP Containment    | SCP 恐怖     | SCP Horror        | ⬜    |
| 991  | 都市傳說   | Urban Legend       | 都市傳說     | Legend Horror     | ⬜    |
| 992  | 詛咒娃娃   | Cursed Doll        | 詛咒娃娃     | Doll Horror       | ⬜    |
| 993  | 通靈遊戲   | Ouija Board        | 通靈恐怖     | Spirit Horror     | ⬜    |
| 994  | 降靈會     | Séance             | 降靈會恐怖   | Séance Horror     | ⬜    |
| 995  | 惡魔附身   | Demon Possession   | 惡魔附身     | Demon Horror      | ⬜    |
| 996  | 驅魔儀式   | Exorcism           | 驅魔恐怖     | Exorcism Horror   | ⬜    |
| 997  | 邪教儀式   | Cult Ritual        | 邪教恐怖     | Cult Horror       | ⬜    |
| 998  | 末日預言   | Doomsday           | 末日恐怖     | Apocalypse Horror | ⬜    |
| 999  | 平行世界   | Parallel Horror    | 平行世界恐怖 | Parallel Horror   | ⬜    |
| 1000 | 終極恐懼   | Ultimate Horror    | 恐怖遊戲合集 | Horror Collection | ⬜    |

---

## 📅 開發時程建議

### 第一階段 (Phase 1) - 核心遊戲
優先開發 001-100 號遊戲，建立專案基礎架構與共用模組

### 第二階段 (Phase 2) - 擴展遊戲庫
開發 101-300 號遊戲，擴展遊戲種類

### 第三階段 (Phase 3) - 多元發展
開發 301-600 號遊戲，涵蓋更多遊戲類型

### 第四階段 (Phase 4) - 特色創新
開發 601-800 號遊戲，加入創新玩法

### 第五階段 (Phase 5) - 完整收錄
開發 801-1000 號遊戲，完成全部目標

---

## 📊 進度追蹤

| 階段     | 遊戲數量 | 已完成 | 進度   | 狀態     |
| -------- | -------- | ------ | ------ | -------- |
| Phase 1  | 100      | 0      | 0%     | ⬜ 未開始 |
| Phase 2  | 200      | 0      | 0%     | ⬜ 未開始 |
| Phase 3  | 300      | 0      | 0%     | ⬜ 未開始 |
| Phase 4  | 200      | 0      | 0%     | ⬜ 未開始 |
| Phase 5  | 200      | 0      | 0%     | ⬜ 未開始 |
| **總計** | **1000** | **0**  | **0%** | ⬜        |

---

## 🔄 更新紀錄

| 日期       | 版本   | 更新內容         |
| ---------- | ------ | ---------------- |
| 2024-XX-XX | v1.0.0 | 初始規劃文件建立 |

---

<p align="center">
  <strong>Let's build 1000 amazing games together! 🎮</strong>
</p>
