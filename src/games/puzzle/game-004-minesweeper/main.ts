/**
 * 掃雷遊戲主程式
 * Game #004 - Awesome Free Games 1000
 */

import { MinesweeperGame, DIFFICULTY_CONFIGS, type Difficulty, type GameState, type Cell } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { i18n, type Locale } from '../../../shared/i18n';
import { isTouchDevice } from '../../../shared/utils';

// 遊戲常數
const GAME_ID = 'game-004-minesweeper';
const GAME_NAME = 'Minesweeper';
const GAME_CATEGORY = 'puzzle';

// DOM 元素
const gridElement = document.getElementById('grid')!;
const mineCounter = document.getElementById('mine-counter')!;
const timeCounter = document.getElementById('time-counter')!;
const faceBtn = document.getElementById('face-btn')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayStats = document.getElementById('overlay-stats')!;
const retryBtn = document.getElementById('retry-btn')!;
const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const touchHint = document.getElementById('touch-hint')!;

// 遊戲實例
let game: MinesweeperGame;
let timeInterval: ReturnType<typeof setInterval> | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;

// 表情符號
const FACES = {
  playing: '😊',
  pressed: '😮',
  won: '😎',
  lost: '😵',
};

/**
 * 初始化語言
 */
function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  languageSelect.value = i18n.getLocale();
  updateI18nTexts();

  languageSelect.addEventListener('change', () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateI18nTexts();
  });
}

/**
 * 更新所有 i18n 文字
 */
function updateI18nTexts(): void {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')!;
    element.textContent = i18n.t(key);
  });

  // 更新難度選項
  const options = difficultySelect.options;
  options[0].textContent = `${i18n.t('game.easy')} (9×9)`;
  options[1].textContent = `${i18n.t('game.medium')} (16×16)`;
  options[2].textContent = `${i18n.t('game.hard')} (16×30)`;

  document.documentElement.lang = i18n.getLocale();
}

/**
 * 初始化遊戲
 */
function initGame(): void {
  const difficulty = difficultySelect.value as Difficulty;

  game = new MinesweeperGame(difficulty);

  game.setOnStateChange((state) => {
    renderGrid(state);
    updateUI(state);
  });

  game.setOnGameEnd((won) => {
    stopTimer();
    showOverlay(won);

    analytics.gameEnd({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      score: won ? 1000 : 0,
      duration: game.getPlayTime(),
    });

    if (won) {
      analytics.achievementUnlock({
        game_id: GAME_ID,
        game_name: GAME_NAME,
        achievement_id: `complete_${difficulty}`,
      });
    }
  });

  createGrid(difficulty);
  game.newGame(difficulty);
  startTimer();

  analytics.gameStart({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    category: GAME_CATEGORY,
  });
}

/**
 * 建立網格 DOM
 */
function createGrid(difficulty: Difficulty): void {
  const config = DIFFICULTY_CONFIGS[difficulty];
  gridElement.innerHTML = '';
  gridElement.style.gridTemplateColumns = `repeat(${config.cols}, var(--cell-size))`;
  gridElement.style.gridTemplateRows = `repeat(${config.rows}, var(--cell-size))`;

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row.toString();
      cell.dataset.col = col.toString();

      // 滑鼠事件
      cell.addEventListener('mousedown', (e) => handleMouseDown(e, row, col));
      cell.addEventListener('mouseup', () => handleMouseUp());
      cell.addEventListener('contextmenu', (e) => e.preventDefault());
      cell.addEventListener('dblclick', () => game.chordReveal(row, col));

      // 觸控事件
      cell.addEventListener('touchstart', (e) => handleTouchStart(e, row, col));
      cell.addEventListener('touchend', (e) => handleTouchEnd(e, row, col));

      gridElement.appendChild(cell);
    }
  }
}

/**
 * 渲染網格
 */
function renderGrid(state: GameState): void {
  const cells = gridElement.querySelectorAll('.cell');

  cells.forEach((cellElement) => {
    const row = parseInt((cellElement as HTMLElement).dataset.row!);
    const col = parseInt((cellElement as HTMLElement).dataset.col!);
    const cell = state.grid[row][col];

    // 重設類別
    cellElement.className = 'cell';

    if (cell.isRevealed) {
      cellElement.classList.add('revealed');

      if (cell.isMine) {
        cellElement.classList.add('mine');
        cellElement.textContent = '💣';
      } else if (cell.adjacentMines > 0) {
        cellElement.classList.add(`num-${cell.adjacentMines}`);
        cellElement.textContent = cell.adjacentMines.toString();
      } else {
        cellElement.textContent = '';
      }
    } else if (cell.isFlagged) {
      cellElement.classList.add('flagged');
      cellElement.textContent = '🚩';
    } else {
      cellElement.textContent = '';
    }
  });
}

/**
 * 更新 UI
 */
function updateUI(state: GameState): void {
  // 更新地雷計數器
  const remaining = game.getRemainingMines();
  mineCounter.textContent = Math.max(0, remaining).toString().padStart(3, '0');

  // 更新表情
  if (state.status === 'won') {
    faceBtn.textContent = FACES.won;
  } else if (state.status === 'lost') {
    faceBtn.textContent = FACES.lost;
  } else {
    faceBtn.textContent = FACES.playing;
  }
}

/**
 * 滑鼠按下事件
 */
function handleMouseDown(e: MouseEvent, row: number, col: number): void {
  e.preventDefault();

  if (game.getState().status !== 'playing') return;

  if (e.button === 0) {
    // 左鍵
    faceBtn.textContent = FACES.pressed;
  } else if (e.button === 2) {
    // 右鍵
    game.toggleFlag(row, col);
  } else if (e.button === 1) {
    // 中鍵
    game.chordReveal(row, col);
  }
}

/**
 * 滑鼠放開事件
 */
function handleMouseUp(): void {
  if (game.getState().status === 'playing') {
    faceBtn.textContent = FACES.playing;
  }
}

/**
 * 處理格子點擊
 */
function handleCellClick(row: number, col: number): void {
  const state = game.getState();
  if (state.status !== 'playing') return;

  const cell = state.grid[row][col];
  if (!cell.isFlagged) {
    game.reveal(row, col);
  }
}

/**
 * 觸控開始
 */
function handleTouchStart(e: TouchEvent, row: number, col: number): void {
  e.preventDefault();

  // 長按計時器（用於標記旗標）
  longPressTimer = setTimeout(() => {
    game.toggleFlag(row, col);
    longPressTimer = null;
  }, 500);
}

/**
 * 觸控結束
 */
function handleTouchEnd(e: TouchEvent, row: number, col: number): void {
  e.preventDefault();

  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    handleCellClick(row, col);
  }
}

/**
 * 開始計時器
 */
function startTimer(): void {
  stopTimer();
  timeInterval = setInterval(() => {
    const time = Math.min(999, game.getPlayTime());
    timeCounter.textContent = time.toString().padStart(3, '0');
  }, 1000);
}

/**
 * 停止計時器
 */
function stopTimer(): void {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
}

/**
 * 顯示覆蓋層
 */
function showOverlay(won: boolean): void {
  gameOverlay.style.display = 'flex';

  if (won) {
    overlayTitle.textContent = i18n.t('game.youWin');
    overlayTitle.className = 'overlay-title win';
    overlayStats.textContent = `${i18n.t('game.time')}: ${game.getPlayTime()}s`;
  } else {
    overlayTitle.textContent = i18n.t('game.youLose');
    overlayTitle.className = 'overlay-title lose';
    overlayStats.textContent = '';
  }
}

/**
 * 隱藏覆蓋層
 */
function hideOverlay(): void {
  gameOverlay.style.display = 'none';
}

/**
 * 初始化事件監聽
 */
function initEventListeners(): void {
  // 表情按鈕（新遊戲）
  faceBtn.addEventListener('click', () => {
    hideOverlay();
    initGame();
  });

  // 重試按鈕
  retryBtn.addEventListener('click', () => {
    hideOverlay();
    initGame();
  });

  // 難度選擇
  difficultySelect.addEventListener('change', () => {
    hideOverlay();
    initGame();
  });

  // 說明按鈕
  helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
  });

  // 關閉彈窗
  modalClose.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.style.display = 'none';
    }
  });

  // 格子點擊（委派到 grid）
  gridElement.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('cell')) {
      const row = parseInt(target.dataset.row!);
      const col = parseInt(target.dataset.col!);
      handleCellClick(row, col);
    }
  });

  // 顯示觸控提示
  if (isTouchDevice()) {
    touchHint.style.display = 'block';
  }
}

/**
 * 主程式入口
 */
function main(): void {
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    analytics.init(measurementId);
  }

  initI18n();
  initEventListeners();
  initGame();

  console.log('🎮 掃雷遊戲已載入！');
  console.log('💣 左鍵揭開格子，右鍵標記旗標');
}

main();
