/**
 * 色彩衝刺遊戲主程式
 * Game #226 - Awesome Free Games 1000
 */

import { ColorDashGame, type GameState, type ColorType } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-226-color-dash';
const GAME_NAME = 'Color Dash';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

// 顏色值對照
const COLOR_VALUES: Record<ColorType, string> = {
  red: '#f44336',
  blue: '#2196f3',
  green: '#4caf50',
  yellow: '#ffeb3b',
};

// 遊戲實例
let game: ColorDashGame;

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

  game = new ColorDashGame({
    canvasWidth: width,
    canvasHeight: height,
  });

  game.setOnStateChange((state) => {
    render(state);
    updateUI(state);
  });

  // 顯示開始畫面
  showStartScreen();
}

/**
 * 渲染遊戲
 */
function render(state: GameState) {
  const { width, height } = canvas.getBoundingClientRect();

  // 清空畫布
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // 繪製障礙物
  state.obstacles.forEach(obstacle => {
    ctx.fillStyle = COLOR_VALUES[obstacle.color];
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  // 繪製顏色切換器
  state.colorSwitches.forEach(cs => {
    ctx.save();
    ctx.translate(cs.x, cs.y);
    ctx.rotate(cs.rotation);

    const segmentAngle = (Math.PI * 2) / 4;
    cs.colors.forEach((color, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, cs.radius, i * segmentAngle, (i + 1) * segmentAngle);
      ctx.closePath();
      ctx.fillStyle = COLOR_VALUES[color];
      ctx.fill();
    });

    // 白色邊框
    ctx.beginPath();
    ctx.arc(0, 0, cs.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  });

  // 繪製玩家
  const player = state.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_VALUES[player.color];
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 繪製光暈效果
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = `${COLOR_VALUES[player.color]}80`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);

  if (state.gameOver) {
    showGameOver(state.score);
  }
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
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // 繪製標題
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Color Dash', width / 2, height / 2 - 50);

  // 繪製四色圓圈
  const colors = ['#f44336', '#2196f3', '#4caf50', '#ffeb3b'];
  colors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(width / 2 - 60 + i * 40, height / 2, 15, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
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
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      event.preventDefault();
      game.moveLeft();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      event.preventDefault();
      game.moveRight();
      break;
    case ' ':
      event.preventDefault();
      if (game.getState().gameOver || !game.getState().isPlaying) {
        startGame();
      }
      break;
  }
}

/**
 * 處理觸控輸入
 */
function initTouchHandler() {
  let startX: number;

  canvas.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    startX = touch.clientX;
  }, { passive: true });

  canvas.addEventListener('touchmove', (event) => {
    if (!startX) return;

    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;

    game.setPlayerX(x);
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    startX = 0;
  }, { passive: true });

  // 點擊移動
  canvas.addEventListener('click', (event) => {
    const state = game.getState();
    if (!state.isPlaying || state.gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    game.setPlayerX(x);
  });
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  document.addEventListener('keydown', handleKeyDown);

  if (isTouchDevice()) {
    initTouchHandler();
  }

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

  console.log('🎮 色彩衝刺遊戲已載入！');
}

main();
