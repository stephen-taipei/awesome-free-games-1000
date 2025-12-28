/**
 * 掃雷遊戲主程式 - WebGPU 3D 增強版
 * Game #004 - Awesome Free Games 1000
 *
 * 功能：
 * - WebGPU 3D 渲染 (支援降級到 DOM)
 * - 粒子特效系統
 * - 合成音效
 * - 賽博朋克視覺風格
 */

import { MinesweeperGame, DIFFICULTY_CONFIGS, type Difficulty, type GameState, type Cell } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { i18n, type Locale } from '../../../shared/i18n';
import { isTouchDevice } from '../../../shared/utils';
import { WebGPURenderer, type CellState } from './webgpu';

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

// WebGPU Canvas
let webgpuCanvas: HTMLCanvasElement | null = null;
let renderer: WebGPURenderer | null = null;
let useWebGPU = false;
let animationId: number | null = null;

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

// ==================== 音效系統 ====================

class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  init(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private ensureContext(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // 點擊音效
  playClick(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  // 揭開音效
  playReveal(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  // 連鎖揭開音效
  playCascade(index: number): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    const baseFreq = 400 + (index % 8) * 100;
    osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  // 旗幟音效
  playFlag(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, this.audioContext.currentTime);
    osc.frequency.setValueAtTime(700, this.audioContext.currentTime + 0.05);
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  // 取消旗幟音效
  playUnflag(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  // 爆炸音效
  playExplosion(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    // 低頻爆炸聲
    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.5);

    gain1.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    osc1.start();
    osc1.stop(this.audioContext.currentTime + 0.5);

    // 噪音層
    const bufferSize = this.audioContext.sampleRate * 0.3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
    }

    const noise = this.audioContext.createBufferSource();
    const noiseGain = this.audioContext.createGain();
    noise.buffer = buffer;
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    noise.start();
  }

  // 勝利音效
  playVictory(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const duration = 0.15;

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'sine';
      const startTime = this.audioContext!.currentTime + i * duration;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 2);

      osc.start(startTime);
      osc.stop(startTime + duration * 2);
    });

    // 最後一個音符加長
    setTimeout(() => {
      if (!this.audioContext || !this.masterGain) return;

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1047, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.8);
    }, notes.length * duration * 1000);
  }

  // 遊戲結束音效
  playGameOver(): void {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const notes = [400, 350, 300, 250];
    const duration = 0.2;

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'sawtooth';
      const startTime = this.audioContext!.currentTime + i * duration;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 1.5);

      osc.start(startTime);
      osc.stop(startTime + duration * 1.5);
    });
  }

  toggle(): void {
    this.enabled = !this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

const audio = new AudioSystem();

// ==================== WebGPU 初始化 ====================

async function initWebGPU(): Promise<boolean> {
  try {
    // 創建 WebGPU canvas
    webgpuCanvas = document.createElement('canvas');
    webgpuCanvas.id = 'webgpu-canvas';
    webgpuCanvas.width = 800;
    webgpuCanvas.height = 600;

    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.insertBefore(webgpuCanvas, gameContainer.firstChild);
    }

    renderer = new WebGPURenderer();
    const success = await renderer.initialize(webgpuCanvas);

    if (success) {
      useWebGPU = true;
      gridElement.style.display = 'none'; // 隱藏 DOM 網格
      setupWebGPUEvents();
      startRenderLoop();
      console.log('🎮 WebGPU 3D 渲染已啟用！');
      return true;
    } else {
      webgpuCanvas.remove();
      webgpuCanvas = null;
      renderer = null;
      console.log('📦 使用 DOM 渲染模式');
      return false;
    }
  } catch (error) {
    console.warn('WebGPU 初始化失敗:', error);
    if (webgpuCanvas) {
      webgpuCanvas.remove();
      webgpuCanvas = null;
    }
    renderer = null;
    return false;
  }
}

function setupWebGPUEvents(): void {
  if (!webgpuCanvas || !renderer) return;

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  // 滑鼠拖曳旋轉相機
  webgpuCanvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // 右鍵拖曳旋轉
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging && renderer) {
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      renderer.rotateCamera(deltaX, deltaY);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // 滾輪縮放
  webgpuCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (renderer) {
      renderer.zoomCamera(e.deltaY * 0.01);
    }
  });

  // 禁用右鍵選單
  webgpuCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 點擊和右鍵處理
  webgpuCanvas.addEventListener('click', (e) => {
    handleCanvasClick(e, false);
  });

  webgpuCanvas.addEventListener('auxclick', (e) => {
    if (e.button === 1) { // 中鍵
      handleCanvasClick(e, true);
    }
  });

  // 右鍵標記旗幟
  webgpuCanvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      const { row, col } = getGridPositionFromCanvas(e);
      if (row >= 0 && col >= 0) {
        const state = game.getState();
        const cell = state.grid[row]?.[col];
        if (cell && !cell.isRevealed) {
          const wasFlagged = cell.isFlagged;
          game.toggleFlag(row, col);
          if (wasFlagged) {
            audio.playUnflag();
          } else {
            audio.playFlag();
            renderer?.triggerFlag(row, col);
          }
        }
      }
    }
  });

  // 懸停效果
  webgpuCanvas.addEventListener('mousemove', (e) => {
    if (!isDragging && renderer) {
      const { row, col } = getGridPositionFromCanvas(e);
      renderer.setHoverCell(row, col);
    }
  });

  webgpuCanvas.addEventListener('mouseleave', () => {
    if (renderer) {
      renderer.setHoverCell(null, null);
    }
  });

  // 觸控支援
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };

  webgpuCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartTime = Date.now();
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };
  });

  webgpuCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touchDuration = Date.now() - touchStartTime;
    const touch = e.changedTouches[0];
    const rect = webgpuCanvas!.getBoundingClientRect();
    const fakeEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top
    } as MouseEvent;

    if (touchDuration > 500) {
      // 長按 = 旗幟
      const { row, col } = getGridPositionFromCanvas(fakeEvent);
      if (row >= 0 && col >= 0) {
        const state = game.getState();
        const cell = state.grid[row]?.[col];
        if (cell && !cell.isRevealed) {
          const wasFlagged = cell.isFlagged;
          game.toggleFlag(row, col);
          if (wasFlagged) {
            audio.playUnflag();
          } else {
            audio.playFlag();
            renderer?.triggerFlag(row, col);
          }
        }
      }
    } else {
      // 短按 = 揭開
      handleCanvasClick(fakeEvent, false);
    }
  });
}

function getGridPositionFromCanvas(e: MouseEvent): { row: number; col: number } {
  if (!webgpuCanvas) return { row: -1, col: -1 };

  const rect = webgpuCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  // 簡化的網格位置計算 (假設相機俯視)
  const config = DIFFICULTY_CONFIGS[difficultySelect.value as Difficulty];
  const gridWidth = config.cols;
  const gridHeight = config.rows;

  // 根據相機視角估算位置
  const centerX = 0.5;
  const centerY = 0.45; // 稍微偏上因為透視
  const scale = 0.6; // 可見區域比例

  const normalizedX = (x - centerX) / scale + 0.5;
  const normalizedY = (y - centerY) / scale + 0.5;

  const col = Math.floor(normalizedX * gridWidth);
  const row = Math.floor(normalizedY * gridHeight);

  if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
    return { row, col };
  }

  return { row: -1, col: -1 };
}

function handleCanvasClick(e: MouseEvent, isChord: boolean): void {
  const { row, col } = getGridPositionFromCanvas(e);

  if (row < 0 || col < 0) return;

  const state = game.getState();
  if (state.status !== 'playing') return;

  const cell = state.grid[row]?.[col];
  if (!cell) return;

  if (isChord) {
    game.chordReveal(row, col);
  } else if (!cell.isFlagged && !cell.isRevealed) {
    audio.playClick();
    game.reveal(row, col);
  }
}

function startRenderLoop(): void {
  if (!renderer || !webgpuCanvas) return;

  function render() {
    if (renderer && webgpuCanvas) {
      renderer.render(webgpuCanvas);
    }
    animationId = requestAnimationFrame(render);
  }

  render();
}

function stopRenderLoop(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function resizeCanvas(): void {
  if (!webgpuCanvas || !renderer) return;

  const container = document.querySelector('.game-container');
  if (container) {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.min(800, rect.width);
    const height = Math.min(600, width * 0.75);

    webgpuCanvas.width = width * dpr;
    webgpuCanvas.height = height * dpr;
    webgpuCanvas.style.width = `${width}px`;
    webgpuCanvas.style.height = `${height}px`;

    renderer.resize(webgpuCanvas.width, webgpuCanvas.height);
  }
}

// ==================== 遊戲邏輯 ====================

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
 * 轉換格子狀態給渲染器
 */
function convertCellsForRenderer(grid: Cell[][]): CellState[][] {
  return grid.map(row => row.map(cell => ({
    isMine: cell.isMine,
    isRevealed: cell.isRevealed,
    isFlagged: cell.isFlagged,
    adjacentMines: cell.adjacentMines,
    isExploded: false
  })));
}

/**
 * 初始化遊戲
 */
function initGame(): void {
  const difficulty = difficultySelect.value as Difficulty;
  const config = DIFFICULTY_CONFIGS[difficulty];

  game = new MinesweeperGame(difficulty);

  // 設置 WebGPU 渲染器
  if (renderer) {
    renderer.reset();
    renderer.setGridSize(config.cols, config.rows);
  }

  let revealedCells: { row: number; col: number }[] = [];
  let cascadeIndex = 0;

  game.setOnStateChange((state) => {
    // 更新渲染器
    if (renderer) {
      const cells = convertCellsForRenderer(state.grid);

      // 檢測新揭開的格子
      const newRevealed: { row: number; col: number }[] = [];
      state.grid.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell.isRevealed) {
            const wasRevealed = revealedCells.some(
              c => c.row === rowIdx && c.col === colIdx
            );
            if (!wasRevealed) {
              newRevealed.push({ row: rowIdx, col: colIdx });
            }
          }
        });
      });

      // 觸發揭開動畫
      if (newRevealed.length > 0) {
        if (newRevealed.length > 1) {
          // 連鎖揭開
          newRevealed.forEach((cell, idx) => {
            setTimeout(() => {
              renderer?.triggerReveal(cell.row, cell.col);
              audio.playCascade(cascadeIndex++);
            }, idx * 30);
          });
          renderer?.triggerCascade(newRevealed, 0);
        } else {
          // 單個揭開
          renderer?.triggerReveal(newRevealed[0].row, newRevealed[0].col);
          audio.playReveal();
        }
        revealedCells = [...revealedCells, ...newRevealed];
      }

      renderer.updateCells(cells);
    }

    renderGrid(state);
    updateUI(state);
  });

  game.setOnGameEnd((won) => {
    stopTimer();

    if (won) {
      audio.playVictory();
      if (renderer) {
        renderer.triggerVictory();
      }
    } else {
      audio.playExplosion();

      // 找到爆炸的地雷
      const state = game.getState();
      state.grid.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell.isMine && cell.isRevealed) {
            if (renderer) {
              renderer.triggerExplosion(rowIdx, colIdx);

              // 標記爆炸的格子
              const cells = convertCellsForRenderer(state.grid);
              cells[rowIdx][colIdx].isExploded = true;
              renderer.updateCells(cells);
            }
          }
        });
      });

      // 顯示所有地雷
      const minePositions: { row: number; col: number }[] = [];
      state.grid.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell.isMine) {
            minePositions.push({ row: rowIdx, col: colIdx });
          }
        });
      });
      renderer?.triggerGameOver(minePositions);
    }

    setTimeout(() => {
      showOverlay(won);
    }, won ? 500 : 1000);

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
  revealedCells = [];
  cascadeIndex = 0;

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

  // 調整 WebGPU canvas
  if (useWebGPU) {
    resizeCanvas();
  }
}

/**
 * 渲染網格 (DOM fallback)
 */
function renderGrid(state: GameState): void {
  if (useWebGPU) return; // WebGPU 模式下不需要 DOM 渲染

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
    audio.playClick();
  } else if (e.button === 2) {
    // 右鍵
    const cell = game.getState().grid[row][col];
    const wasFlagged = cell.isFlagged;
    game.toggleFlag(row, col);
    if (wasFlagged) {
      audio.playUnflag();
    } else {
      audio.playFlag();
    }
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
    const cell = game.getState().grid[row][col];
    const wasFlagged = cell.isFlagged;
    game.toggleFlag(row, col);
    if (wasFlagged) {
      audio.playUnflag();
    } else {
      audio.playFlag();
    }
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
    audio.playClick();
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

  // 視窗大小改變
  window.addEventListener('resize', () => {
    if (useWebGPU) {
      resizeCanvas();
    }
  });

  // 點擊啟動音效
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
  initEventListeners();

  // 初始化音效
  audio.init();

  // 嘗試啟用 WebGPU
  await initWebGPU();

  initGame();

  console.log('🎮 掃雷遊戲 3D 版已載入！');
  console.log('💣 左鍵揭開格子，右鍵標記旗標');
  if (useWebGPU) {
    console.log('🚀 WebGPU 3D 渲染已啟用');
    console.log('🖱️ 右鍵拖曳旋轉視角，滾輪縮放');
  }
}

main();
