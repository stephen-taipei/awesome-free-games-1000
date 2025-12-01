/**
 * 數獨遊戲主程式
 * Game #003 - Awesome Free Games 1000
 */

import { SudokuGame, type Difficulty, type GameState, type Cell } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatTime } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-003-sudoku';
const GAME_NAME = 'Sudoku';
const GAME_CATEGORY = 'puzzle';

// DOM 元素
const sudokuGrid = document.getElementById('sudoku-grid')!;
const mistakesElement = document.getElementById('mistakes')!;
const timeElement = document.getElementById('time')!;
const hintsElement = document.getElementById('hints')!;
const progressElement = document.getElementById('progress')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayStats = document.getElementById('overlay-stats')!;
const newGameBtn = document.getElementById('new-game-btn')!;
const retryBtn = document.getElementById('retry-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const noteBtn = document.getElementById('note-btn')!;
const eraseBtn = document.getElementById('erase-btn')!;
const hintBtn = document.getElementById('hint-btn')!;
const numberPad = document.getElementById('number-pad')!;

// 遊戲實例
let game: SudokuGame;
let timeInterval: ReturnType<typeof setInterval> | null = null;
let isNoteMode = false;

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

  i18n.onLocaleChange(() => {
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

  // 更新下拉選單選項
  const difficultyOptions = difficultySelect.options;
  difficultyOptions[0].textContent = i18n.t('game.easy');
  difficultyOptions[1].textContent = i18n.t('game.medium');
  difficultyOptions[2].textContent = i18n.t('game.hard');
  difficultyOptions[3].textContent = i18n.t('game.expert');

  document.documentElement.lang = i18n.getLocale();
}

/**
 * 建立數獨網格 DOM
 */
function createGridDOM(): void {
  sudokuGrid.innerHTML = '';

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i.toString();

    const row = Math.floor(i / 9);
    const col = i % 9;
    cell.dataset.row = row.toString();
    cell.dataset.col = col.toString();

    cell.addEventListener('click', () => {
      game.selectCell(row, col);
    });

    sudokuGrid.appendChild(cell);
  }
}

/**
 * 初始化遊戲
 */
function initGame(): void {
  game = new SudokuGame();

  game.setOnStateChange((state) => {
    renderGrid(state);
    updateUI(state);
  });

  const difficulty = difficultySelect.value as Difficulty;
  game.newGame(difficulty);
  startTimer();

  analytics.gameStart({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    category: GAME_CATEGORY,
  });
}

/**
 * 渲染網格
 */
function renderGrid(state: GameState): void {
  const cells = sudokuGrid.querySelectorAll('.cell');

  cells.forEach((cellElement, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const cell = state.grid[row][col];

    // 清除類別
    cellElement.className = 'cell';

    // 添加狀態類別
    if (cell.isFixed) cellElement.classList.add('fixed');
    if (cell.isHighlighted) cellElement.classList.add('highlighted');
    if (cell.isError) cellElement.classList.add('error');

    // 選中狀態
    if (state.selectedCell && state.selectedCell.row === row && state.selectedCell.col === col) {
      cellElement.classList.add('selected');
    }

    // 渲染內容
    cellElement.innerHTML = '';

    if (cell.value !== null) {
      const valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      valueSpan.textContent = cell.value.toString();
      cellElement.appendChild(valueSpan);
    } else if (cell.notes.size > 0) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'cell-notes';

      for (let n = 1; n <= 9; n++) {
        const noteSpan = document.createElement('span');
        noteSpan.className = 'note';
        noteSpan.textContent = cell.notes.has(n) ? n.toString() : '';
        notesDiv.appendChild(noteSpan);
      }

      cellElement.appendChild(notesDiv);
    }
  });
}

/**
 * 更新 UI
 */
function updateUI(state: GameState): void {
  mistakesElement.textContent = `${state.mistakes}/${state.maxMistakes}`;
  mistakesElement.className = state.mistakes > 0 ? 'info-value error' : 'info-value';

  hintsElement.textContent = state.hintsRemaining.toString();
  progressElement.textContent = `${game.getProgress()}%`;

  // 更新提示按鈕狀態
  (hintBtn as HTMLButtonElement).disabled = state.hintsRemaining <= 0;

  // 處理遊戲結束
  if (state.gameOver) {
    stopTimer();
    showOverlay(state);

    analytics.gameEnd({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      score: state.isWon ? 1000 - state.mistakes * 100 : 0,
      duration: game.getPlayTime(),
    });

    if (state.isWon) {
      analytics.achievementUnlock({
        game_id: GAME_ID,
        game_name: GAME_NAME,
        achievement_id: `complete_${state.difficulty}`,
      });
    }
  }
}

/**
 * 顯示覆蓋層
 */
function showOverlay(state: GameState): void {
  gameOverlay.style.display = 'flex';

  if (state.isWon) {
    overlayTitle.textContent = i18n.t('game.youWin');
    overlayTitle.className = 'overlay-title win';
    overlayStats.innerHTML = `
      <p>${i18n.t('game.time')}: ${formatTime(game.getPlayTime())}</p>
      <p>${i18n.t('game.mistakes')}: ${state.mistakes}</p>
      <p>${i18n.t('game.difficulty')}: ${i18n.t(`game.${state.difficulty}`)}</p>
    `;
  } else {
    overlayTitle.textContent = i18n.t('game.youLose');
    overlayTitle.className = 'overlay-title lose';
    overlayStats.innerHTML = `<p>${i18n.t('game.progress')}: ${game.getProgress()}%</p>`;
  }
}

/**
 * 隱藏覆蓋層
 */
function hideOverlay(): void {
  gameOverlay.style.display = 'none';
}

/**
 * 開始計時器
 */
function startTimer(): void {
  stopTimer();
  timeInterval = setInterval(() => {
    timeElement.textContent = formatTime(game.getPlayTime());
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
 * 處理數字輸入
 */
function handleNumberInput(num: number): void {
  if (isNoteMode) {
    game.toggleNote(num);
  } else {
    game.inputNumber(num);
  }
}

/**
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent): void {
  // 防止在輸入框中觸發
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    return;
  }

  const state = game.getState();
  if (state.gameOver) return;

  // 數字鍵
  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    handleNumberInput(parseInt(event.key));
    return;
  }

  // 方向鍵導航
  if (state.selectedCell) {
    let { row, col } = state.selectedCell;
    let moved = false;

    switch (event.key) {
      case 'ArrowUp':
        if (row > 0) { row--; moved = true; }
        break;
      case 'ArrowDown':
        if (row < 8) { row++; moved = true; }
        break;
      case 'ArrowLeft':
        if (col > 0) { col--; moved = true; }
        break;
      case 'ArrowRight':
        if (col < 8) { col++; moved = true; }
        break;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        game.clearCell();
        return;
      case 'n':
      case 'N':
        event.preventDefault();
        toggleNoteMode();
        return;
      case 'h':
      case 'H':
        event.preventDefault();
        game.useHint();
        return;
    }

    if (moved) {
      event.preventDefault();
      game.selectCell(row, col);
    }
  }
}

/**
 * 切換筆記模式
 */
function toggleNoteMode(): void {
  isNoteMode = !isNoteMode;
  noteBtn.classList.toggle('active', isNoteMode);
}

/**
 * 初始化事件監聽
 */
function initEventListeners(): void {
  // 鍵盤事件
  document.addEventListener('keydown', handleKeyDown);

  // 新遊戲按鈕
  newGameBtn.addEventListener('click', () => {
    hideOverlay();
    createGridDOM();
    initGame();
  });

  // 重試按鈕
  retryBtn.addEventListener('click', () => {
    hideOverlay();
    createGridDOM();
    initGame();
  });

  // 難度選擇
  difficultySelect.addEventListener('change', () => {
    hideOverlay();
    createGridDOM();
    initGame();
  });

  // 數字鍵盤
  numberPad.querySelectorAll('.num-btn[data-num]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = parseInt((btn as HTMLElement).dataset.num!);
      handleNumberInput(num);
    });
  });

  // 筆記模式
  noteBtn.addEventListener('click', toggleNoteMode);

  // 清除按鈕
  eraseBtn.addEventListener('click', () => {
    game.clearCell();
  });

  // 提示按鈕
  hintBtn.addEventListener('click', () => {
    game.useHint();
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && helpModal.style.display === 'flex') {
      helpModal.style.display = 'none';
    }
  });
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
  createGridDOM();
  initEventListeners();
  initGame();

  console.log('🎮 數獨遊戲已載入！');
  console.log('🔢 使用數字鍵 1-9 填入，方向鍵移動，N 切換筆記模式');
}

main();
