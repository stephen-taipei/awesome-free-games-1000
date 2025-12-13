/**
 * 方塊堆疊遊戲主程式
 * Game #227 - Awesome Free Games 1000
 */

import { BlockStackGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-227-block-stack';
const GAME_NAME = 'Block Stack';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const comboElement = document.getElementById('combo')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const perfectText = document.getElementById('perfect-text')!;

// 遊戲實例
let game: BlockStackGame;
let perfectTimeout: ReturnType<typeof setTimeout> | null = null;

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
 * 初始化 Canvas
 */
function initCanvas() {
  const container = document.getElementById('game-container')!;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  ctx.scale(dpr, dpr);

  return { width: rect.width, height: rect.height };
}

/**
 * 初始化遊戲
 */
function initGame() {
  const { width, height } = initCanvas();

  game = new BlockStackGame({
    canvasWidth: width,
    canvasHeight: height,
  });

  game.setOnStateChange((state) => {
    render(state);
    updateUI(state);
  });

  showStartScreen();
}

/**
 * 渲染遊戲
 */
function render(state: GameState) {
  const { width, height } = canvas.getBoundingClientRect();

  // 清空畫布 - 漸層背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製已放置的方塊
  state.blocks.forEach((block) => {
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, block.y, block.width, block.height);

    // 方塊邊框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x, block.y, block.width, block.height);

    // 方塊高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(block.x, block.y, block.width, block.height / 3);
  });

  // 繪製當前移動的方塊
  if (state.currentBlock) {
    const block = state.currentBlock;

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(block.x + 5, block.y + 5, block.width, block.height);

    // 方塊
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, block.y, block.width, block.height);

    // 邊框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x, block.y, block.width, block.height);

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(block.x, block.y, block.width, block.height / 3);
  }

  // 繪製對齊輔助線
  if (state.currentBlock && state.blocks.length > 0) {
    const topBlock = state.blocks[state.blocks.length - 1];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // 左邊線
    ctx.beginPath();
    ctx.moveTo(topBlock.x, 0);
    ctx.lineTo(topBlock.x, height);
    ctx.stroke();

    // 右邊線
    ctx.beginPath();
    ctx.moveTo(topBlock.x + topBlock.width, 0);
    ctx.lineTo(topBlock.x + topBlock.width, height);
    ctx.stroke();

    ctx.setLineDash([]);
  }
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);

  if (state.combo > 0) {
    comboElement.textContent = `x${state.combo}`;
    comboElement.style.display = 'block';
  } else {
    comboElement.style.display = 'none';
  }

  if (state.gameOver) {
    showGameOver(state.score);
  }
}

/**
 * 顯示完美提示
 */
function showPerfect() {
  perfectText.style.display = 'block';
  perfectText.classList.add('show');

  if (perfectTimeout) {
    clearTimeout(perfectTimeout);
  }

  perfectTimeout = setTimeout(() => {
    perfectText.classList.remove('show');
    setTimeout(() => {
      perfectText.style.display = 'none';
    }, 300);
  }, 500);
}

/**
 * 顯示開始畫面
 */
function showStartScreen() {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.tapToStart');
  finalScoreElement.parentElement!.style.display = 'none';
  retryBtn.style.display = 'none';
  startBtn.style.display = 'inline-block';

  // 繪製初始畫面
  const { width, height } = canvas.getBoundingClientRect();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製示意方塊
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1'];
  const blockWidth = 150;
  const blockHeight = 30;
  const startY = height / 2 + 50;

  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      (width - blockWidth) / 2,
      startY - i * blockHeight,
      blockWidth,
      blockHeight
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (width - blockWidth) / 2,
      startY - i * blockHeight,
      blockWidth,
      blockHeight
    );
  });
}

/**
 * 顯示遊戲結束
 */
function showGameOver(score: number) {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameOver');
  finalScoreElement.textContent = formatNumber(score);
  finalScoreElement.parentElement!.style.display = 'block';
  retryBtn.style.display = 'inline-block';
  startBtn.style.display = 'none';

  analytics.gameEnd({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    score: score,
    duration: 0,
  });
}

/**
 * 隱藏覆蓋層
 */
function hideOverlay() {
  gameOverlay.style.display = 'none';
}

/**
 * 開始遊戲
 */
function startGame() {
  hideOverlay();
  game.newGame();

  analytics.gameStart({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    category: GAME_CATEGORY,
  });
}

/**
 * 放置方塊
 */
function placeBlock() {
  const stateBefore = game.getState();
  game.placeBlock();
  const stateAfter = game.getState();

  // 檢查是否完美放置
  if (stateAfter.combo > stateBefore.combo) {
    showPerfect();
  }
}

/**
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent) {
  const state = game.getState();

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();

    if (state.gameOver || !state.isPlaying) {
      startGame();
    } else {
      placeBlock();
    }
  }
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  document.addEventListener('keydown', handleKeyDown);

  canvas.addEventListener('click', () => {
    const state = game.getState();
    if (state.isPlaying && !state.gameOver) {
      placeBlock();
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const state = game.getState();
    if (state.isPlaying && !state.gameOver) {
      placeBlock();
    }
  }, { passive: false });

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);

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

  window.addEventListener('resize', () => {
    initCanvas();
  });
}

/**
 * 主程式入口
 */
function main() {
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    analytics.init(measurementId);
  }

  initI18n();
  initEventListeners();
  initGame();

  console.log('🎮 方塊堆疊遊戲已載入！');
}

main();
