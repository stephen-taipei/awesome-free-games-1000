/**
 * 2048 遊戲主程式
 * Game #001 - Awesome Free Games 1000
 */

import { Game2048, type Direction, type Tile, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatTime, formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-001-2048';
const GAME_NAME = '2048';
const GAME_CATEGORY = 'puzzle';

// DOM 元素
const tileContainer = document.getElementById('tile-container')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const movesElement = document.getElementById('moves')!;
const timeElement = document.getElementById('time')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const continueBtn = document.getElementById('continue-btn')!;
const retryBtn = document.getElementById('retry-btn')!;
const newGameBtn = document.getElementById('new-game-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

// 遊戲實例
let game: Game2048;
let tileElements: Map<number, HTMLElement> = new Map();
let timeInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 初始化語言
 */
function initI18n() {
  // 載入所有語言翻譯
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  // 設定當前語言
  languageSelect.value = i18n.getLocale();
  updateI18nTexts();

  // 監聽語言變更
  languageSelect.addEventListener('change', () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateI18nTexts();
  });

  i18n.onLocaleChange(() => {
    updateI18nTexts();
  });
}

/**
 * 更新所有 i18n 文字
 */
function updateI18nTexts() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')!;
    element.textContent = i18n.t(key);
  });

  // 更新 HTML lang 屬性
  document.documentElement.lang = i18n.getLocale();
}

/**
 * 初始化遊戲
 */
function initGame() {
  game = new Game2048({ size: 4, winningTile: 2048 });

  game.setOnStateChange((state) => {
    updateUI(state);
  });

  game.newGame();
  startTimer();

  // 追蹤遊戲開始
  analytics.gameStart({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    category: GAME_CATEGORY,
  });
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  movesElement.textContent = formatNumber(state.moveCount);

  renderTiles(game.getAllTiles());

  // 處理遊戲結束或獲勝
  if (state.won && !state.keepPlaying) {
    showOverlay('win');
  } else if (state.gameOver) {
    showOverlay('gameover');
    stopTimer();

    // 追蹤遊戲結束
    analytics.gameEnd({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      score: state.score,
      duration: game.getPlayTime(),
    });
  }
}

/**
 * 渲染方塊
 */
function renderTiles(tiles: Tile[]) {
  // 收集當前方塊 ID
  const currentIds = new Set(tiles.map(t => t.id));

  // 移除不存在的方塊
  tileElements.forEach((element, id) => {
    if (!currentIds.has(id)) {
      element.remove();
      tileElements.delete(id);
    }
  });

  // 更新或建立方塊
  tiles.forEach((tile) => {
    let element = tileElements.get(tile.id);

    if (!element) {
      // 建立新方塊
      element = document.createElement('div');
      element.className = 'tile';
      tileContainer.appendChild(element);
      tileElements.set(tile.id, element);
    }

    // 更新方塊樣式
    const valueClass = tile.value <= 2048 ? `tile-${tile.value}` : 'tile-super';
    const posClass = `tile-pos-${tile.position.row}-${tile.position.col}`;

    element.className = `tile ${valueClass} ${posClass}`;
    element.textContent = formatNumber(tile.value);

    // 新方塊動畫
    if (tile.isNew) {
      element.classList.add('new');
    }

    // 合併動畫
    if (tile.mergedFrom) {
      element.classList.add('merged');
    }
  });
}

/**
 * 顯示覆蓋層
 */
function showOverlay(type: 'win' | 'gameover') {
  gameOverlay.style.display = 'flex';
  finalScoreElement.textContent = formatNumber(game.getState().score);

  if (type === 'win') {
    overlayTitle.textContent = i18n.t('game.youWin');
    continueBtn.style.display = 'inline-block';

    // 追蹤達到 2048
    analytics.achievementUnlock({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      achievement_id: 'reach_2048',
    });
  } else {
    overlayTitle.textContent = i18n.t('game.gameOver');
    continueBtn.style.display = 'none';
  }
}

/**
 * 隱藏覆蓋層
 */
function hideOverlay() {
  gameOverlay.style.display = 'none';
}

/**
 * 開始計時器
 */
function startTimer() {
  stopTimer();
  timeInterval = setInterval(() => {
    timeElement.textContent = formatTime(game.getPlayTime());
  }, 1000);
}

/**
 * 停止計時器
 */
function stopTimer() {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
}

/**
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent) {
  const keyMap: Record<string, Direction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right',
    W: 'up',
    S: 'down',
    A: 'left',
    D: 'right',
  };

  const direction = keyMap[event.key];
  if (direction) {
    event.preventDefault();
    game.move(direction);
  }
}

/**
 * 處理觸控滑動
 */
function initTouchHandler() {
  const gameContainer = document.getElementById('game-container')!;
  let startX: number;
  let startY: number;
  const minSwipeDistance = 30;

  gameContainer.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  gameContainer.addEventListener('touchend', (event) => {
    if (!startX || !startY) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) return;

    let direction: Direction;
    if (absDeltaX > absDeltaY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    game.move(direction);
  }, { passive: true });
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  // 鍵盤事件
  document.addEventListener('keydown', handleKeyDown);

  // 觸控事件
  if (isTouchDevice()) {
    initTouchHandler();
  }

  // 新遊戲按鈕
  newGameBtn.addEventListener('click', () => {
    hideOverlay();
    tileElements.clear();
    tileContainer.innerHTML = '';
    game.newGame();
    startTimer();

    analytics.gameStart({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      category: GAME_CATEGORY,
    });
  });

  // 重試按鈕
  retryBtn.addEventListener('click', () => {
    hideOverlay();
    tileElements.clear();
    tileContainer.innerHTML = '';
    game.newGame();
    startTimer();

    analytics.gameStart({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      category: GAME_CATEGORY,
    });
  });

  // 繼續遊戲按鈕
  continueBtn.addEventListener('click', () => {
    hideOverlay();
    game.continueGame();
  });

  // 說明按鈕
  helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
  });

  // 關閉彈窗
  modalClose.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  helpModal.addEventListener('click', (event) => {
    if (event.target === helpModal) {
      helpModal.style.display = 'none';
    }
  });

  // ESC 關閉彈窗
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      helpModal.style.display = 'none';
    }
  });
}

/**
 * 主程式入口
 */
function main() {
  // 初始化 Analytics（如果有設定）
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    analytics.init(measurementId);
  }

  initI18n();
  initEventListeners();
  initGame();

  console.log('🎮 2048 遊戲已載入！');
  console.log('📱 支援鍵盤方向鍵或觸控滑動操作');
}

// 啟動遊戲
main();
