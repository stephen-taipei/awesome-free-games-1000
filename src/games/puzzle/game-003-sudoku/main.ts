/**
 * 數獨遊戲主程式 - WebGPU 3D 版
 * Game #003 - Awesome Free Games 1000
 */

import { SudokuGame, type Difficulty, type GameState, type Cell } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatTime } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer, type CellData } from './webgpu';

// 遊戲常數
const GAME_ID = 'game-003-sudoku';
const GAME_NAME = 'Sudoku';
const GAME_CATEGORY = 'puzzle';

// DOM 元素
const appElement = document.getElementById('app')!;
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

// WebGPU 渲染
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let useWebGPU = false;
let animationFrameId: number | null = null;
let lastTime = 0;

// 遊戲實例
let game: SudokuGame;
let timeInterval: ReturnType<typeof setInterval> | null = null;
let isNoteMode = false;

// 音效系統
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
    } catch (e) {
      console.warn('Audio not supported');
    }
  }

  private ensureContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', attack = 0.01, decay = 0.1) {
    if (!this.audioContext || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  // 選擇格子
  playSelect() {
    this.playTone(800, 0.08, 'sine');
  }

  // 輸入數字
  playInput() {
    this.playTone(600, 0.1, 'triangle');
  }

  // 正確填入
  playCorrect() {
    if (!this.audioContext || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine'), i * 80);
    });
  }

  // 錯誤輸入
  playError() {
    if (!this.audioContext || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    this.playTone(200, 0.3, 'sawtooth');
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 100);
  }

  // 使用提示
  playHint() {
    if (!this.audioContext || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const notes = [880, 1047, 1319]; // A5, C6, E6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'sine'), i * 60);
    });
  }

  // 筆記模式切換
  playNoteToggle(active: boolean) {
    this.playTone(active ? 1000 : 600, 0.08, 'triangle');
  }

  // 遊戲勝利
  playVictory() {
    if (!this.audioContext || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 120);
    });
  }

  // 遊戲失敗
  playGameOver() {
    if (!this.audioContext || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.25, 'sawtooth'), i * 200);
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

const audio = new AudioSystem();

/**
 * 初始化 WebGPU
 */
async function initWebGPU(): Promise<boolean> {
  try {
    // 創建 WebGPU 畫布
    webgpuCanvas = document.createElement('canvas');
    webgpuCanvas.id = 'webgpu-canvas';
    webgpuCanvas.width = 450;
    webgpuCanvas.height = 400;

    webgpuRenderer = new WebGPURenderer(webgpuCanvas);
    const success = await webgpuRenderer.init();

    if (success) {
      // 替換原本的網格
      const gameContainer = document.querySelector('.game-container');
      if (gameContainer) {
        // 隱藏原本的 DOM 網格
        sudokuGrid.style.display = 'none';

        // 插入 WebGPU 畫布
        gameContainer.insertBefore(webgpuCanvas, sudokuGrid);

        // 添加 WebGPU 徽章
        const badge = document.createElement('div');
        badge.className = 'webgpu-badge';
        badge.textContent = 'WebGPU 3D';
        document.body.appendChild(badge);

        useWebGPU = true;
        console.log('🎮 WebGPU 3D 模式啟用');

        // 開始渲染循環
        startRenderLoop();
      }
    }

    return success;
  } catch (e) {
    console.warn('WebGPU 初始化失敗:', e);
    return false;
  }
}

/**
 * 開始渲染循環
 */
function startRenderLoop() {
  function render(currentTime: number) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (webgpuRenderer && game) {
      const state = game.getState();
      const cells = convertToCellData(state);
      webgpuRenderer.render(cells, deltaTime);
    }

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);
}

/**
 * 轉換遊戲狀態為渲染數據
 */
function convertToCellData(state: GameState): CellData[][] {
  const cells: CellData[][] = [];

  for (let row = 0; row < 9; row++) {
    cells[row] = [];
    for (let col = 0; col < 9; col++) {
      const cell = state.grid[row][col];
      cells[row][col] = {
        row,
        col,
        value: cell.value,
        isFixed: cell.isFixed,
        isSelected: state.selectedCell?.row === row && state.selectedCell?.col === col,
        isHighlighted: cell.isHighlighted,
        isError: cell.isError,
        notes: cell.notes
      };
    }
  }

  return cells;
}

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

  const difficultyOptions = difficultySelect.options;
  difficultyOptions[0].textContent = i18n.t('game.easy');
  difficultyOptions[1].textContent = i18n.t('game.medium');
  difficultyOptions[2].textContent = i18n.t('game.hard');
  difficultyOptions[3].textContent = i18n.t('game.expert');

  document.documentElement.lang = i18n.getLocale();
}

/**
 * 建立數獨網格 DOM (fallback)
 */
function createGridDOM(): void {
  if (useWebGPU) return;

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
      audio.playSelect();
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
    if (!useWebGPU) {
      renderGrid(state);
    }
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
 * 渲染網格 (fallback DOM 版本)
 */
function renderGrid(state: GameState): void {
  if (useWebGPU) return;

  const cells = sudokuGrid.querySelectorAll('.cell');

  cells.forEach((cellElement, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const cell = state.grid[row][col];

    cellElement.className = 'cell';

    if (cell.isFixed) cellElement.classList.add('fixed');
    if (cell.isHighlighted) cellElement.classList.add('highlighted');
    if (cell.isError) cellElement.classList.add('error');

    if (state.selectedCell && state.selectedCell.row === row && state.selectedCell.col === col) {
      cellElement.classList.add('selected');
    }

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

  (hintBtn as HTMLButtonElement).disabled = state.hintsRemaining <= 0;

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
      audio.playVictory();
      if (webgpuRenderer) {
        webgpuRenderer.emitVictoryEffect();
      }

      analytics.achievementUnlock({
        game_id: GAME_ID,
        game_name: GAME_NAME,
        achievement_id: `complete_${state.difficulty}`,
      });
    } else {
      audio.playGameOver();
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

// 紀錄上一次輸入前的狀態
let lastSelectedCell: { row: number; col: number } | null = null;
let lastCellValue: number | null = null;

/**
 * 處理數字輸入
 */
function handleNumberInput(num: number): void {
  const state = game.getState();
  if (!state.selectedCell) return;

  const { row, col } = state.selectedCell;
  const cell = state.grid[row][col];

  if (cell.isFixed) return;

  lastSelectedCell = { row, col };
  lastCellValue = cell.value;

  if (isNoteMode) {
    game.toggleNote(num);
    audio.playInput();
  } else {
    const solution = (game as any).state.solution;
    const isCorrect = num === solution[row][col];

    game.inputNumber(num);

    if (isCorrect) {
      audio.playCorrect();
      if (webgpuRenderer) {
        webgpuRenderer.emitCorrectEffect(row, col);
      }
    } else {
      audio.playError();
      if (webgpuRenderer) {
        webgpuRenderer.emitErrorEffect(row, col);
      }
    }
  }
}

/**
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    return;
  }

  const state = game.getState();
  if (state.gameOver) return;

  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    handleNumberInput(parseInt(event.key));
    return;
  }

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
        audio.playInput();
        return;
      case 'n':
      case 'N':
        event.preventDefault();
        toggleNoteMode();
        return;
      case 'h':
      case 'H':
        event.preventDefault();
        handleHint();
        return;
    }

    if (moved) {
      event.preventDefault();
      audio.playSelect();
      game.selectCell(row, col);
    }
  }
}

/**
 * 處理提示
 */
function handleHint(): void {
  const state = game.getState();

  let targetRow = -1, targetCol = -1;

  if (state.selectedCell) {
    const { row, col } = state.selectedCell;
    const cell = state.grid[row][col];
    if (!cell.isFixed && cell.value === null) {
      targetRow = row;
      targetCol = col;
    }
  }

  if (targetRow === -1) {
    for (let r = 0; r < 9 && targetRow === -1; r++) {
      for (let c = 0; c < 9; c++) {
        if (!state.grid[r][c].isFixed && state.grid[r][c].value === null) {
          targetRow = r;
          targetCol = c;
          break;
        }
      }
    }
  }

  const success = game.useHint();
  if (success) {
    audio.playHint();
    if (webgpuRenderer && targetRow >= 0) {
      webgpuRenderer.emitHintEffect(targetRow, targetCol);
    }
  }
}

/**
 * 切換筆記模式
 */
function toggleNoteMode(): void {
  isNoteMode = !isNoteMode;
  noteBtn.classList.toggle('active', isNoteMode);
  audio.playNoteToggle(isNoteMode);
}

/**
 * 處理 WebGPU 畫布點擊
 */
function handleCanvasClick(event: MouseEvent) {
  if (!webgpuCanvas) return;

  const rect = webgpuCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 將屏幕坐標轉換為網格坐標
  // 這需要根據相機視角進行投影計算
  // 簡化版：假設網格佔據畫布的中心區域

  const gridLeft = 50;
  const gridTop = 50;
  const cellWidth = (webgpuCanvas.width - 100) / 9;
  const cellHeight = (webgpuCanvas.height - 100) / 9;

  const col = Math.floor((x - gridLeft) / cellWidth);
  const row = Math.floor((y - gridTop) / cellHeight);

  if (row >= 0 && row < 9 && col >= 0 && col < 9) {
    audio.playSelect();
    game.selectCell(row, col);
  }
}

/**
 * 初始化事件監聽
 */
function initEventListeners(): void {
  document.addEventListener('keydown', handleKeyDown);

  // WebGPU 畫布點擊
  if (webgpuCanvas) {
    webgpuCanvas.addEventListener('click', handleCanvasClick);
  }

  newGameBtn.addEventListener('click', () => {
    hideOverlay();
    if (!useWebGPU) createGridDOM();
    initGame();
  });

  retryBtn.addEventListener('click', () => {
    hideOverlay();
    if (!useWebGPU) createGridDOM();
    initGame();
  });

  difficultySelect.addEventListener('change', () => {
    hideOverlay();
    if (!useWebGPU) createGridDOM();
    initGame();
  });

  numberPad.querySelectorAll('.num-btn[data-num]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = parseInt((btn as HTMLElement).dataset.num!);
      handleNumberInput(num);
    });
  });

  noteBtn.addEventListener('click', toggleNoteMode);

  eraseBtn.addEventListener('click', () => {
    game.clearCell();
    audio.playInput();
  });

  hintBtn.addEventListener('click', handleHint);

  helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
  });

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

  // 點擊任意位置初始化音效
  document.addEventListener('click', () => {
    audio.init();
  }, { once: true });
}

/**
 * 主程式入口
 */
async function main(): Promise<void> {
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    analytics.init(measurementId);
  }

  initI18n();

  // 嘗試初始化 WebGPU
  const webgpuSuccess = await initWebGPU();

  if (!webgpuSuccess) {
    console.log('📱 使用 DOM 渲染模式');
    createGridDOM();
  }

  initEventListeners();
  initGame();

  console.log('🎮 數獨遊戲已載入！');
  console.log('🔢 使用數字鍵 1-9 填入，方向鍵移動，N 切換筆記模式');
  if (useWebGPU) {
    console.log('✨ WebGPU 3D 渲染已啟用');
  }
}

main();
