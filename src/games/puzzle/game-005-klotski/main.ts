/**
 * 華容道遊戲主程式 - WebGPU 3D 版
 * Klotski/Sliding Block Puzzle - Main Entry Point with WebGPU
 */

import { KlotskiGame, GameState, Block, BOARD_WIDTH, BOARD_HEIGHT, PUZZLES } from './game';
import { translations } from './i18n';
import { WebGPURenderer, BlockState } from './webgpu';

// ============================================================================
// Audio System - Web Audio API 合成音效
// ============================================================================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  async init(): Promise<void> {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  private ensureContext(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 方塊選中音效 - 柔和敲擊聲
  playSelect(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 方塊移動音效 - 滑動木塊聲
  playMove(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    // 主音 - 低沉木頭滑動
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.value = 400;

    gain1.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.12);

    // 摩擦噪音
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize * 0.1, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.1);
  }

  // 無法移動音效 - 碰撞聲
  playBlocked(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 勝利音效 - 華麗凱旋曲
  playVictory(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    // 凱旋號角
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50]; // C5, E5, G5, C6, G5, C6
    const times = [0, 0.15, 0.3, 0.45, 0.7, 0.85];
    const durations = [0.14, 0.14, 0.14, 0.24, 0.14, 0.4];

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + times[i]);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, this.ctx!.currentTime + times[i]);
      filter.frequency.linearRampToValueAtTime(800, this.ctx!.currentTime + times[i] + durations[i]);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + times[i]);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + times[i] + 0.02);
      gain.gain.setValueAtTime(0.25, this.ctx!.currentTime + times[i] + durations[i] - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + times[i] + durations[i]);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + times[i]);
      osc.stop(this.ctx!.currentTime + times[i] + durations[i]);
    });

    // 閃爍音效
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000 + Math.random() * 2000, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }, 1000 + i * 100);
    }
  }

  // 悔棋音效
  playUndo(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 重置音效
  playReset(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    // 下降音階
    const notes = [600, 500, 400, 300];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      }, i * 60);
    });
  }

  // 關卡選擇音效
  playSelectPuzzle(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.ensureContext();

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc2.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.2);
    osc2.stop(this.ctx.currentTime + 0.2);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// ============================================================================
// i18n
// ============================================================================
function getLanguage(): string {
  const saved = localStorage.getItem('klotski-lang');
  if (saved && translations[saved as keyof typeof translations]) {
    return saved;
  }

  const browserLang = navigator.language;
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-Hant')) {
    return 'zh-TW';
  }
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }

  const langCode = browserLang.split('-')[0];
  if (translations[langCode as keyof typeof translations]) {
    return langCode;
  }

  return 'en';
}

let currentLang = getLanguage();
function t(key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[currentLang as keyof typeof translations];

  for (const k of keys) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  return typeof result === 'string' ? result : key;
}

// ============================================================================
// Game State
// ============================================================================
let game: KlotskiGame;
let currentPuzzleIndex = 0;
let selectedBlockId: string | null = null;
let timerInterval: number | null = null;

// WebGPU
let renderer: WebGPURenderer | null = null;
let canvas: HTMLCanvasElement | null = null;
let useWebGPU = true;
let animationFrameId: number | null = null;
let lastTime = 0;

// 方塊動畫狀態
const blockAnimations: Map<string, { startX: number; startY: number; targetX: number; targetY: number; progress: number }> = new Map();

// Audio
const audio = new AudioSystem();

// DOM elements
let boardEl: HTMLElement;
let movesEl: HTMLElement;
let timeEl: HTMLElement;
let bestEl: HTMLElement;

// Touch/drag state
let isDragging = false;
let dragBlock: Block | null = null;
let dragStartX = 0;
let dragStartY = 0;

// Camera drag
let isCameraDragging = false;
let cameraLastX = 0;

// ============================================================================
// Initialize
// ============================================================================
async function init(): Promise<void> {
  const savedPuzzle = localStorage.getItem('klotski-puzzle');
  if (savedPuzzle) {
    currentPuzzleIndex = parseInt(savedPuzzle, 10) || 0;
  }

  game = new KlotskiGame(currentPuzzleIndex);
  game.setOnStateChange(onGameStateChange);

  await audio.init();

  renderUI();

  // 嘗試初始化 WebGPU
  if (useWebGPU) {
    canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      renderer = new WebGPURenderer();
      const success = await renderer.initialize(canvas);
      if (!success) {
        console.warn('WebGPU initialization failed, falling back to DOM');
        useWebGPU = false;
        renderer = null;
        document.getElementById('webgpu-container')?.classList.add('hidden');
        document.getElementById('dom-container')?.classList.remove('hidden');
      } else {
        document.getElementById('dom-container')?.classList.add('hidden');
        startRenderLoop();
        setupCanvasEvents();
      }
    }
  }

  render(game.getState());
  startTimer();
}

function setupCanvasEvents(): void {
  if (!canvas) return;

  // 滑鼠相機控制
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2 || e.button === 1) { // 右鍵或中鍵
      isCameraDragging = true;
      cameraLastX = e.clientX;
      e.preventDefault();
    } else if (e.button === 0) {
      handleCanvasClick(e);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isCameraDragging && renderer) {
      const deltaX = e.clientX - cameraLastX;
      renderer.rotateCamera(deltaX * 0.01);
      cameraLastX = e.clientX;
    }
  });

  canvas.addEventListener('mouseup', () => {
    isCameraDragging = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 滾輪縮放
  canvas.addEventListener('wheel', (e) => {
    if (renderer) {
      renderer.zoomCamera(e.deltaY > 0 ? 0.1 : -0.1);
    }
    e.preventDefault();
  });

  // 觸控
  let touchStartX = 0;
  let touchStartY = 0;
  let touchTime = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchTime = Date.now();
    } else if (e.touches.length === 2) {
      isCameraDragging = true;
      cameraLastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (isCameraDragging && renderer && e.touches.length >= 2) {
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const deltaX = centerX - cameraLastX;
      renderer.rotateCamera(deltaX * 0.01);
      cameraLastX = centerX;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      isCameraDragging = false;

      // 檢測點擊
      if (Date.now() - touchTime < 300) {
        const rect = canvas!.getBoundingClientRect();
        handleCanvasTap(touchStartX - rect.left, touchStartY - rect.top);
      }
    }
  });
}

function handleCanvasClick(e: MouseEvent): void {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  handleCanvasTap(x, y);
}

function handleCanvasTap(x: number, y: number): void {
  // 簡化的方塊選擇 - 根據螢幕座標找最近的方塊
  const state = game.getState();
  const cellSize = canvas!.width / 8; // 大約的單元格大小

  // 轉換為遊戲座標（簡化估算）
  const gameX = (x / cellSize - 1) | 0;
  const gameY = (y / cellSize - 0.5) | 0;

  // 找到包含此位置的方塊
  for (const block of state.blocks) {
    if (gameX >= block.x && gameX < block.x + block.width &&
        gameY >= block.y && gameY < block.y + block.height) {
      if (selectedBlockId !== block.id) {
        selectedBlockId = block.id;
        audio.playSelect();
      }
      return;
    }
  }
}

// ============================================================================
// Render Loop
// ============================================================================
function startRenderLoop(): void {
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(renderLoop);
}

function renderLoop(time: number): void {
  const deltaTime = time - lastTime;
  lastTime = time;

  // 更新方塊動畫
  updateBlockAnimations(deltaTime);

  // 更新渲染器方塊狀態
  if (renderer) {
    const state = game.getState();
    const blockStates: BlockState[] = state.blocks.map(block => {
      const anim = blockAnimations.get(block.id);
      let animX = block.x;
      let animY = block.y;

      if (anim) {
        animX = anim.startX + (anim.targetX - anim.startX) * easeOutQuad(anim.progress);
        animY = anim.startY + (anim.targetY - anim.startY) * easeOutQuad(anim.progress);
      }

      return {
        id: block.id,
        type: block.type.toUpperCase() as 'CAOCAO' | 'GENERAL_V' | 'GENERAL_H' | 'SOLDIER',
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        selected: block.id === selectedBlockId,
        animX,
        animY,
      };
    });

    renderer.updateBlocks(blockStates);
    renderer.setVictory(state.isWon);
    renderer.render(deltaTime);
  }

  animationFrameId = requestAnimationFrame(renderLoop);
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function updateBlockAnimations(deltaTime: number): void {
  const speed = 0.008; // 動畫速度

  for (const [id, anim] of blockAnimations.entries()) {
    anim.progress += deltaTime * speed;
    if (anim.progress >= 1) {
      blockAnimations.delete(id);
    }
  }
}

function startBlockAnimation(blockId: string, fromX: number, fromY: number, toX: number, toY: number): void {
  blockAnimations.set(blockId, {
    startX: fromX,
    startY: fromY,
    targetX: toX,
    targetY: toY,
    progress: 0,
  });
}

// ============================================================================
// UI
// ============================================================================
function renderUI(): void {
  const app = document.getElementById('app')!;
  app.className = 'klotski-app';
  app.innerHTML = `
    <div class="language-selector">
      <select id="lang-select">
        <option value="zh-TW">繁體中文</option>
        <option value="zh-CN">简体中文</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="pt">Português</option>
        <option value="ru">Русский</option>
        <option value="it">Italiano</option>
        <option value="th">ไทย</option>
        <option value="vi">Tiếng Việt</option>
        <option value="id">Indonesia</option>
        <option value="ar">العربية</option>
        <option value="hi">हिन्दी</option>
      </select>
    </div>

    <header class="game-header">
      <h1 class="game-title">${t('game.title')}</h1>
      <p class="game-subtitle">${t('game.subtitle')}</p>
    </header>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">${t('game.moves')}</span>
        <span class="stat-value" id="moves">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('game.time')}</span>
        <span class="stat-value" id="time">0:00</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('game.best')}</span>
        <span class="stat-value" id="best">-</span>
      </div>
    </div>

    <div class="game-container">
      <div class="puzzle-selector" id="puzzle-selector"></div>

      <!-- WebGPU 容器 -->
      <div class="webgpu-container" id="webgpu-container">
        <canvas id="game-canvas" width="500" height="600"></canvas>
        <div class="canvas-controls">
          <span class="control-hint">🖱️ ${t('game.dragToMove')} | 🔄 ${t('game.rightClickRotate')}</span>
        </div>
      </div>

      <!-- DOM 後備容器 -->
      <div class="dom-container hidden" id="dom-container">
        <div class="board-wrapper">
          <div class="game-board" id="board">
            <div class="exit-zone"></div>
          </div>
        </div>
      </div>

      <div class="controls">
        <button class="btn btn-icon" id="btn-sound" title="Sound">
          <span class="icon">🔊</span>
        </button>
        <button class="btn btn-secondary" id="btn-undo">${t('game.undo')}</button>
        <button class="btn btn-secondary" id="btn-reset">${t('game.reset')}</button>
        <button class="btn btn-primary" id="btn-new">${t('game.newGame')}</button>
      </div>

      <div class="help-panel">
        <h3 class="help-title">${t('game.howToPlay')}</h3>
        <div class="help-content">
          <p>${t('game.howToPlayContent')}</p>
          <ul>
            <li>${t('game.dragToMove')}</li>
            <li>${t('game.clickArrows')}</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="win-modal">
      <div class="modal">
        <div class="victory-burst"></div>
        <h2 class="modal-title">${t('game.youWin')}</h2>
        <div class="modal-stats">
          <div class="modal-stat">
            <div class="modal-stat-value" id="modal-moves">0</div>
            <div class="modal-stat-label">${t('game.moves')}</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-value" id="modal-time">0:00</div>
            <div class="modal-stat-label">${t('game.time')}</div>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" id="btn-replay">${t('game.tryAgain')}</button>
          <button class="btn btn-primary" id="btn-next">${t('game.nextPuzzle')}</button>
        </div>
      </div>
    </div>
  `;

  // Get DOM elements
  boardEl = document.getElementById('board')!;
  movesEl = document.getElementById('moves')!;
  timeEl = document.getElementById('time')!;
  bestEl = document.getElementById('best')!;

  // Setup language selector
  const langSelect = document.getElementById('lang-select') as HTMLSelectElement;
  langSelect.value = currentLang;
  langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    localStorage.setItem('klotski-lang', currentLang);
    renderUI();
    render(game.getState());
    if (useWebGPU) {
      setupCanvasEvents();
      startRenderLoop();
    }
  });

  // Setup puzzle selector
  renderPuzzleSelector();

  // Setup controls
  document.getElementById('btn-undo')!.addEventListener('click', () => {
    game.undo();
    audio.playUndo();
  });

  document.getElementById('btn-reset')!.addEventListener('click', () => {
    game.reset();
    audio.playReset();
    blockAnimations.clear();
  });

  document.getElementById('btn-new')!.addEventListener('click', showPuzzleSelector);

  document.getElementById('btn-replay')!.addEventListener('click', () => {
    hideWinModal();
    game.reset();
    audio.playReset();
    blockAnimations.clear();
  });

  document.getElementById('btn-next')!.addEventListener('click', () => {
    hideWinModal();
    nextPuzzle();
  });

  // Sound toggle
  const soundBtn = document.getElementById('btn-sound')!;
  soundBtn.addEventListener('click', () => {
    const enabled = audio.toggle();
    soundBtn.querySelector('.icon')!.textContent = enabled ? '🔊' : '🔇';
  });

  // Keyboard controls
  document.addEventListener('keydown', handleKeyDown);

  // Update best score display
  updateBestDisplay();
}

function renderPuzzleSelector(): void {
  const selector = document.getElementById('puzzle-selector')!;
  selector.innerHTML = PUZZLES.map((puzzle, index) => {
    const puzzleName = t(`game.puzzles.${puzzle.name}`) || puzzle.name;
    return `
      <button class="puzzle-btn ${index === currentPuzzleIndex ? 'active' : ''}"
              data-index="${index}">
        ${puzzleName}
      </button>
    `;
  }).join('');

  selector.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('puzzle-btn')) {
      const index = parseInt(target.dataset.index!, 10);
      selectPuzzle(index);
    }
  });
}

function selectPuzzle(index: number): void {
  currentPuzzleIndex = index;
  localStorage.setItem('klotski-puzzle', index.toString());
  game.selectPuzzle(index);
  audio.playSelectPuzzle();
  blockAnimations.clear();

  document.querySelectorAll('.puzzle-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  updateBestDisplay();
  startTimer();
}

function nextPuzzle(): void {
  const nextIndex = (currentPuzzleIndex + 1) % PUZZLES.length;
  selectPuzzle(nextIndex);
}

function showPuzzleSelector(): void {
  document.getElementById('puzzle-selector')!.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// Game State Change Handler
// ============================================================================
function onGameStateChange(state: GameState, action?: { type: string; blockId?: string; dx?: number; dy?: number }): void {
  // 處理移動動畫
  if (action?.type === 'move' && action.blockId) {
    const block = state.blocks.find(b => b.id === action.blockId);
    if (block) {
      const fromX = block.x - (action.dx || 0);
      const fromY = block.y - (action.dy || 0);
      startBlockAnimation(block.id, fromX, fromY, block.x, block.y);

      audio.playMove();

      // WebGPU 粒子效果
      if (renderer) {
        renderer.particleSystem.emitMoveDust(
          block.x + block.width * 0.5,
          0,
          block.y + block.height * 0.5,
          { dx: action.dx || 0, dz: action.dy || 0 }
        );
      }
    }
  }

  render(state);
}

// ============================================================================
// Render Game State
// ============================================================================
function render(state: GameState): void {
  if (!useWebGPU) {
    renderBlocks(state.blocks);
  }
  movesEl.textContent = state.moves.toString();

  if (state.isWon) {
    stopTimer();
    showWinModal(state.moves, game.getElapsedTime());
    saveBestScore(state.moves);
    audio.playVictory();
    if (renderer) {
      renderer.shakeCamera(0.5);
    }
  }
}

function renderBlocks(blocks: Block[]): void {
  if (!boardEl) return;

  // Remove old blocks
  boardEl.querySelectorAll('.block').forEach(el => el.remove());

  const cellSize = getCellSize();

  blocks.forEach(block => {
    const el = document.createElement('div');
    el.className = `block ${block.type}`;
    el.dataset.id = block.id;
    el.style.left = `${block.x * cellSize + 3}px`;
    el.style.top = `${block.y * cellSize + 3}px`;

    // Display name
    if (block.type === 'caocao') {
      el.textContent = t('game.caoCao');
    } else if (block.type === 'general_v' || block.type === 'general_h') {
      el.textContent = block.name;
    } else {
      el.textContent = t('game.soldier');
    }

    if (block.id === selectedBlockId) {
      el.classList.add('selected');
    }

    // Event listeners
    el.addEventListener('mousedown', (e) => startDrag(e, block));
    el.addEventListener('touchstart', (e) => startDrag(e, block), { passive: false });

    boardEl.appendChild(el);
  });
}

function getCellSize(): number {
  if (!boardEl) return 70;
  const boardWidth = boardEl.clientWidth;
  return boardWidth / BOARD_WIDTH;
}

// ============================================================================
// Drag Handling (DOM fallback)
// ============================================================================
function startDrag(e: MouseEvent | TouchEvent, block: Block): void {
  e.preventDefault();

  isDragging = true;
  dragBlock = block;

  if (selectedBlockId !== block.id) {
    selectedBlockId = block.id;
    audio.playSelect();
  }

  const pos = getEventPosition(e);
  dragStartX = pos.x;
  dragStartY = pos.y;

  const blockEl = boardEl.querySelector(`[data-id="${block.id}"]`);
  blockEl?.classList.add('dragging');

  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', handleDrag, { passive: false });
  document.addEventListener('touchend', endDrag);
}

function handleDrag(e: MouseEvent | TouchEvent): void {
  if (!isDragging || !dragBlock) return;
  e.preventDefault();

  const pos = getEventPosition(e);
  const cellSize = getCellSize();

  const deltaX = Math.round((pos.x - dragStartX) / cellSize);
  const deltaY = Math.round((pos.y - dragStartY) / cellSize);

  // Try to move in dominant direction
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX !== 0) {
    const dx = deltaX > 0 ? 1 : -1;
    if (game.canMove(dragBlock.id, dx, 0)) {
      game.moveBlock(dragBlock.id, dx, 0);
      dragStartX = pos.x;
      dragStartY = pos.y;
    } else {
      audio.playBlocked();
    }
  } else if (deltaY !== 0) {
    const dy = deltaY > 0 ? 1 : -1;
    if (game.canMove(dragBlock.id, 0, dy)) {
      game.moveBlock(dragBlock.id, 0, dy);
      dragStartX = pos.x;
      dragStartY = pos.y;
    } else {
      audio.playBlocked();
    }
  }
}

function endDrag(): void {
  if (dragBlock) {
    const blockEl = boardEl?.querySelector(`[data-id="${dragBlock.id}"]`);
    blockEl?.classList.remove('dragging');
  }

  isDragging = false;
  dragBlock = null;

  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', handleDrag);
  document.removeEventListener('touchend', endDrag);
}

function getEventPosition(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    return {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }
  return {
    x: e.clientX,
    y: e.clientY,
  };
}

// ============================================================================
// Keyboard Controls
// ============================================================================
function handleKeyDown(e: KeyboardEvent): void {
  if (!selectedBlockId || game.getState().isWon) return;

  let dx = 0;
  let dy = 0;

  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      dx = -1;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      dx = 1;
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      dy = -1;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      dy = 1;
      break;
    case 'Tab':
      e.preventDefault();
      selectNextBlock();
      return;
    case 'z':
    case 'Z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        game.undo();
        audio.playUndo();
      }
      return;
    case 'r':
    case 'R':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        game.reset();
        audio.playReset();
        blockAnimations.clear();
      }
      return;
    default:
      return;
  }

  e.preventDefault();

  if (game.canMove(selectedBlockId, dx, dy)) {
    game.moveBlock(selectedBlockId, dx, dy);
  } else if (dx !== 0 || dy !== 0) {
    audio.playBlocked();
    if (renderer) {
      renderer.shakeCamera(0.1);
    }
  }
}

function selectNextBlock(): void {
  const blocks = game.getState().blocks;
  const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
  const nextIndex = (currentIndex + 1) % blocks.length;
  selectedBlockId = blocks[nextIndex].id;
  audio.playSelect();
  render(game.getState());
}

// ============================================================================
// Timer
// ============================================================================
function startTimer(): void {
  stopTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimer(): void {
  const elapsed = game.getElapsedTime();
  timeEl.textContent = formatTime(elapsed);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Best Score
// ============================================================================
function getBestKey(): string {
  return `klotski-best-${PUZZLES[currentPuzzleIndex].id}`;
}

function saveBestScore(moves: number): void {
  const key = getBestKey();
  const current = localStorage.getItem(key);
  if (!current || moves < parseInt(current, 10)) {
    localStorage.setItem(key, moves.toString());
    updateBestDisplay();
  }
}

function updateBestDisplay(): void {
  const key = getBestKey();
  const best = localStorage.getItem(key);
  bestEl.textContent = best || '-';
}

// ============================================================================
// Win Modal
// ============================================================================
function showWinModal(moves: number, time: number): void {
  document.getElementById('modal-moves')!.textContent = moves.toString();
  document.getElementById('modal-time')!.textContent = formatTime(time);
  document.getElementById('win-modal')!.classList.add('active');
}

function hideWinModal(): void {
  document.getElementById('win-modal')!.classList.remove('active');
}

// ============================================================================
// Initialize
// ============================================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
