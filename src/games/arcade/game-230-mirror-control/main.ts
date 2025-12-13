/**
 * 鏡像控制遊戲主程式
 * Game #230 - Awesome Free Games 1000
 */

import { MirrorControlGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-230-mirror-control';
const GAME_NAME = 'Mirror Control';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const levelElement = document.getElementById('level')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const nextLevelBtn = document.getElementById('next-level-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const leftBtn = document.getElementById('left-btn')!;
const rightBtn = document.getElementById('right-btn')!;
const jumpBtn = document.getElementById('jump-btn')!;

// 遊戲實例
let game: MirrorControlGame;

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

  game = new MirrorControlGame({
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
  const midX = width / 2;

  // 清空畫布
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, midX, height);
  ctx.fillStyle = '#2e1a1a';
  ctx.fillRect(midX, 0, midX, height);

  // 繪製平台
  ctx.fillStyle = '#4a4a6a';
  state.platforms.forEach((platform) => {
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  });

  // 繪製分隔線
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(midX - 2, 0, 4, height);

  // 繪製障礙物
  ctx.fillStyle = '#ff4757';
  state.obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    // 危險標記
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('!', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 5);
    ctx.fillStyle = '#ff4757';
  });

  // 繪製目標
  state.goals.forEach((goal) => {
    if (goal.reached) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    } else {
      // 發光效果
      const gradient = ctx.createRadialGradient(goal.x, goal.y, 0, goal.x, goal.y, goal.radius * 2);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, goal.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
    }

    // 繪製星星
    ctx.save();
    ctx.translate(goal.x, goal.y);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * goal.radius;
      const y = Math.sin(angle) * goal.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 繪製玩家1（藍色）
  ctx.fillStyle = state.player1.color;
  ctx.fillRect(state.player1.x, state.player1.y, state.player1.width, state.player1.height);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    state.player1.x + state.player1.width * 0.3,
    state.player1.y + state.player1.height * 0.35,
    4,
    0,
    Math.PI * 2
  );
  ctx.arc(
    state.player1.x + state.player1.width * 0.7,
    state.player1.y + state.player1.height * 0.35,
    4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 繪製玩家2（紅色）
  ctx.fillStyle = state.player2.color;
  ctx.fillRect(state.player2.x, state.player2.y, state.player2.width, state.player2.height);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    state.player2.x + state.player2.width * 0.3,
    state.player2.y + state.player2.height * 0.35,
    4,
    0,
    Math.PI * 2
  );
  ctx.arc(
    state.player2.x + state.player2.width * 0.7,
    state.player2.y + state.player2.height * 0.35,
    4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 繪製移動方向提示
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('← →', midX / 2, 30);
  ctx.fillText('→ ←', midX + midX / 2, 30);
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  levelElement.textContent = state.level.toString();

  if (state.levelComplete) {
    showLevelComplete(state.score);
  } else if (state.gameOver) {
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
  nextLevelBtn.style.display = 'none';

  const { width, height } = canvas.getBoundingClientRect();
  const midX = width / 2;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, midX, height);
  ctx.fillStyle = '#2e1a1a';
  ctx.fillRect(midX, 0, midX, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(midX - 2, 0, 4, height);

  // 示意角色
  ctx.fillStyle = '#3498db';
  ctx.fillRect(midX / 2 - 20, height / 2, 40, 40);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(midX + midX / 2 - 20, height / 2, 40, 40);
}

/**
 * 顯示關卡完成
 */
function showLevelComplete(score: number) {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.levelComplete');
  finalScoreElement.textContent = formatNumber(score);
  finalScoreElement.parentElement!.style.display = 'block';
  retryBtn.style.display = 'none';
  startBtn.style.display = 'none';
  nextLevelBtn.style.display = 'inline-block';
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
  nextLevelBtn.style.display = 'none';

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
 * 下一關
 */
function nextLevel() {
  hideOverlay();
  game.nextLevel();
}

/**
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent) {
  const state = game.getState();

  if (event.key === ' ') {
    event.preventDefault();
    if (!state.isPlaying || state.gameOver) {
      startGame();
    } else if (state.levelComplete) {
      nextLevel();
    } else {
      game.jump();
    }
    return;
  }

  if (event.key === 'Enter') {
    if (!state.isPlaying || state.gameOver) {
      startGame();
    } else if (state.levelComplete) {
      nextLevel();
    }
    return;
  }

  game.setKey(event.key, true);
}

function handleKeyUp(event: KeyboardEvent) {
  game.setKey(event.key, false);
}

/**
 * 初始化觸控按鈕
 */
function initTouchControls() {
  // 左按鈕
  leftBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.setKey('ArrowLeft', true);
  });
  leftBtn.addEventListener('touchend', () => {
    game.setKey('ArrowLeft', false);
  });

  // 右按鈕
  rightBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.setKey('ArrowRight', true);
  });
  rightBtn.addEventListener('touchend', () => {
    game.setKey('ArrowRight', false);
  });

  // 跳躍按鈕
  jumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.jump();
  });
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  if (isTouchDevice()) {
    initTouchControls();
    document.querySelector('.touch-controls')?.classList.add('show');
  }

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);
  nextLevelBtn.addEventListener('click', nextLevel);

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

  console.log('🎮 鏡像控制遊戲已載入！');
}

main();
