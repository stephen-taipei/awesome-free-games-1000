/**
 * 2048 遊戲 - WebGPU 3A 級視覺體驗版
 * Game #001 - Awesome Free Games 1000
 *
 * 特色：
 * - WebGPU 硬體加速 3D 渲染
 * - PBR 物理光照系統
 * - 粒子爆炸特效
 * - 相機震動回饋
 * - 動態發光效果
 */

import { Game2048, type Direction, type Tile, type GameState } from './game';
import { WebGPURenderer, type TileRenderData } from './webgpu';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatTime, formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-001-2048';
const GAME_NAME = '2048';
const GAME_CATEGORY = 'puzzle';

// WebGPU 渲染器
let renderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement;
let useWebGPU = false;

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
const gameContainer = document.getElementById('game-container')!;

// 遊戲實例
let game: Game2048;
let tileElements: Map<number, HTMLElement> = new Map();
let timeInterval: ReturnType<typeof setInterval> | null = null;

// 動畫狀態
let tileAnimations: Map<number, { progress: number; isNew: boolean; isMerged: boolean }> = new Map();
let lastFrameTime = 0;
let animationId: number;

// 音效
let audioContext: AudioContext | null = null;
const sounds = {
  move: null as AudioBuffer | null,
  merge: null as AudioBuffer | null,
  win: null as AudioBuffer | null,
  gameOver: null as AudioBuffer | null
};

/**
 * 初始化音效
 */
async function initAudio() {
  try {
    audioContext = new AudioContext();

    // 生成合成音效
    sounds.move = createMoveSound();
    sounds.merge = createMergeSound();
    sounds.win = createWinSound();
    sounds.gameOver = createGameOverSound();
  } catch (e) {
    console.warn('Audio initialization failed:', e);
  }
}

function createMoveSound(): AudioBuffer {
  const ctx = audioContext!;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    data[i] = Math.sin(440 * 2 * Math.PI * t) * Math.exp(-t * 20) * 0.3;
  }

  return buffer;
}

function createMergeSound(): AudioBuffer {
  const ctx = audioContext!;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const freq = 200 + 400 * t;
    data[i] = Math.sin(freq * 2 * Math.PI * t) * Math.exp(-t * 5) * 0.4;
  }

  return buffer;
}

function createWinSound(): AudioBuffer {
  const ctx = audioContext!;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const noteIndex = Math.floor(t * 4) % 4;
    const freq = notes[noteIndex];
    data[i] = Math.sin(freq * 2 * Math.PI * t) * Math.exp(-((t * 4) % 1) * 3) * 0.3;
  }

  return buffer;
}

function createGameOverSound(): AudioBuffer {
  const ctx = audioContext!;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const freq = 300 - t * 200;
    data[i] = Math.sin(freq * 2 * Math.PI * t) * Math.exp(-t * 3) * 0.3;
  }

  return buffer;
}

function playSound(buffer: AudioBuffer | null, volume = 1) {
  if (!audioContext || !buffer) return;

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();

  source.buffer = buffer;
  gainNode.gain.value = volume;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start();
}

/**
 * 初始化 WebGPU
 */
async function initWebGPU(): Promise<boolean> {
  try {
    // 創建 WebGPU canvas
    webgpuCanvas = document.createElement('canvas');
    webgpuCanvas.id = 'webgpu-canvas';
    webgpuCanvas.width = 600;
    webgpuCanvas.height = 600;

    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();

    if (success) {
      // 隱藏 DOM 渲染，使用 WebGPU
      const gridBg = document.querySelector('.grid-background') as HTMLElement;
      if (gridBg) gridBg.style.display = 'none';
      tileContainer.style.display = 'none';

      // 插入 WebGPU canvas
      gameContainer.insertBefore(webgpuCanvas, gameContainer.firstChild);
      gameContainer.classList.add('webgpu-mode');

      useWebGPU = true;
      console.log('🚀 WebGPU 3D 渲染已啟用！');
      return true;
    }
  } catch (e) {
    console.warn('WebGPU initialization failed:', e);
  }

  return false;
}

/**
 * 初始化語言
 */
function initI18n() {
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
function updateI18nTexts() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')!;
    element.textContent = i18n.t(key);
  });

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

  game.setOnTileMove((tiles) => {
    // 檢測合併和新方塊
    tiles.forEach(tile => {
      if (tile.mergedFrom) {
        if (useWebGPU && renderer) {
          renderer.triggerMergeEffect(tile.position.row, tile.position.col, tile.value);
        }
        playSound(sounds.merge, Math.min(1, tile.value / 512));

        tileAnimations.set(tile.id, { progress: 0, isNew: false, isMerged: true });
      } else if (tile.isNew) {
        if (useWebGPU && renderer) {
          renderer.triggerNewTileEffect(tile.position.row, tile.position.col);
        }
        playSound(sounds.move, 0.3);

        tileAnimations.set(tile.id, { progress: 0, isNew: true, isMerged: false });
      }
    });
  });

  game.newGame();
  startTimer();

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

  if (!useWebGPU) {
    renderTiles(game.getAllTiles());
  }

  if (state.won && !state.keepPlaying) {
    showOverlay('win');
    playSound(sounds.win);
  } else if (state.gameOver) {
    showOverlay('gameover');
    stopTimer();
    playSound(sounds.gameOver);

    analytics.gameEnd({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      score: state.score,
      duration: game.getPlayTime(),
    });
  }
}

/**
 * 渲染方塊 (DOM 模式備用)
 */
function renderTiles(tiles: Tile[]) {
  const currentIds = new Set(tiles.map(t => t.id));

  tileElements.forEach((element, id) => {
    if (!currentIds.has(id)) {
      element.remove();
      tileElements.delete(id);
    }
  });

  tiles.forEach((tile) => {
    let element = tileElements.get(tile.id);

    if (!element) {
      element = document.createElement('div');
      element.className = 'tile';
      tileContainer.appendChild(element);
      tileElements.set(tile.id, element);
    }

    const valueClass = tile.value <= 2048 ? `tile-${tile.value}` : 'tile-super';
    const posClass = `tile-pos-${tile.position.row}-${tile.position.col}`;

    element.className = `tile ${valueClass} ${posClass}`;
    element.textContent = formatNumber(tile.value);

    if (tile.isNew) {
      element.classList.add('new');
    }

    if (tile.mergedFrom) {
      element.classList.add('merged');
    }
  });
}

/**
 * WebGPU 渲染循環
 */
function renderLoop(currentTime: number) {
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  // 更新動畫
  tileAnimations.forEach((anim, id) => {
    anim.progress = Math.min(1, anim.progress + deltaTime * 4);
    if (anim.progress >= 1) {
      tileAnimations.delete(id);
    }
  });

  // 準備渲染資料
  const tiles = game.getAllTiles();
  const renderData: TileRenderData[] = tiles.map(tile => {
    const anim = tileAnimations.get(tile.id);
    return {
      id: tile.id,
      value: tile.value,
      row: tile.position.row,
      col: tile.position.col,
      isNew: anim?.isNew ?? false,
      isMerged: anim?.isMerged ?? false,
      animationProgress: anim?.progress ?? 1
    };
  });

  if (renderer) {
    renderer.updateTiles(renderData);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(renderLoop);
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
  document.addEventListener('keydown', handleKeyDown);

  if (isTouchDevice()) {
    initTouchHandler();
  }

  // 啟用音效 (需要用戶交互)
  const enableAudio = () => {
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
    document.removeEventListener('click', enableAudio);
    document.removeEventListener('touchstart', enableAudio);
  };
  document.addEventListener('click', enableAudio);
  document.addEventListener('touchstart', enableAudio);

  newGameBtn.addEventListener('click', () => {
    hideOverlay();
    tileElements.clear();
    tileContainer.innerHTML = '';
    tileAnimations.clear();
    game.newGame();
    startTimer();

    analytics.gameStart({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      category: GAME_CATEGORY,
    });
  });

  retryBtn.addEventListener('click', () => {
    hideOverlay();
    tileElements.clear();
    tileContainer.innerHTML = '';
    tileAnimations.clear();
    game.newGame();
    startTimer();

    analytics.gameStart({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      category: GAME_CATEGORY,
    });
  });

  continueBtn.addEventListener('click', () => {
    hideOverlay();
    game.continueGame();
  });

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
    if (event.key === 'Escape') {
      helpModal.style.display = 'none';
    }
  });

  // 視窗大小調整
  window.addEventListener('resize', () => {
    if (useWebGPU && renderer) {
      const size = Math.min(window.innerWidth - 40, 600);
      renderer.resize(size, size);
      webgpuCanvas.style.width = `${size}px`;
      webgpuCanvas.style.height = `${size}px`;
    }
  });
}

/**
 * 主程式入口
 */
async function main() {
  // 初始化 Analytics
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    analytics.init(measurementId);
  }

  // 初始化音效
  await initAudio();

  // 嘗試初始化 WebGPU
  const webgpuReady = await initWebGPU();

  initI18n();
  initEventListeners();
  initGame();

  if (webgpuReady) {
    // 開始 WebGPU 渲染循環
    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(renderLoop);

    console.log('🎮 2048 遊戲 WebGPU 3A 版已載入！');
    console.log('✨ 享受 3D 立體方塊、PBR 光照、粒子特效！');
  } else {
    console.log('🎮 2048 遊戲已載入 (DOM 模式)');
    console.log('💡 您的瀏覽器不支援 WebGPU，使用傳統渲染');
  }

  console.log('📱 支援鍵盤方向鍵或觸控滑動操作');
}

// 啟動遊戲
main();
