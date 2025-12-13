/**
 * 時間慢動作遊戲主程式
 * Game #231 - Awesome Free Games 1000
 */

import { SlowMotionGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-231-slow-motion';
const GAME_NAME = 'Slow Motion';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const energyBar = document.getElementById('energy-bar')!;
const slowModeIndicator = document.getElementById('slow-mode')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

// 遊戲實例
let game: SlowMotionGame;

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

  game = new SlowMotionGame({
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

  // 清空畫布
  if (state.isSlowMotion) {
    ctx.fillStyle = '#0a0a1a';
  } else {
    ctx.fillStyle = '#1a1a2e';
  }
  ctx.fillRect(0, 0, width, height);

  // 慢動作時的視覺效果
  if (state.isSlowMotion) {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  }

  // 繪製子彈
  state.bullets.forEach((bullet) => {
    // 子彈軌跡（慢動作時顯示）
    if (state.isSlowMotion) {
      const trailLength = 5;
      for (let i = 1; i <= trailLength; i++) {
        const alpha = 0.1 * (trailLength - i + 1);
        ctx.beginPath();
        ctx.arc(
          bullet.x - bullet.velocityX * 0.01 * i,
          bullet.y - bullet.velocityY * 0.01 * i,
          bullet.radius * (1 - i * 0.1),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = bullet.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.fill();
      }
    }

    // 子彈本體
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.color;
    ctx.fill();

    // 發光效果
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = bullet.color + '80';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 繪製玩家
  const player = state.player;

  // 玩家光環
  if (state.isSlowMotion) {
    const gradient = ctx.createRadialGradient(
      player.x, player.y, player.radius,
      player.x, player.y, player.radius * 3
    );
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家本體
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = state.isSlowMotion ? '#00ffff' : '#ffffff';
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = state.isSlowMotion ? '#00ffff' : '#6c5ce7';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 繪製危險警告（子彈接近時）
  state.bullets.forEach((bullet) => {
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100 && dist > player.radius + bullet.radius) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 0, ${(100 - dist) / 100})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);

  // 更新能量條
  const energyPercent = (state.slowMotionEnergy / state.maxEnergy) * 100;
  energyBar.style.width = `${energyPercent}%`;

  if (state.isSlowMotion) {
    energyBar.classList.add('draining');
    slowModeIndicator.classList.add('active');
  } else {
    energyBar.classList.remove('draining');
    slowModeIndicator.classList.remove('active');
  }

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

  const { width, height } = canvas.getBoundingClientRect();
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // 示意圖
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 子彈示意
  const bulletColors = ['#ff6b6b', '#48dbfb', '#feca57'];
  bulletColors.forEach((color, i) => {
    const angle = (i * 2 * Math.PI) / 3;
    const x = width / 2 + Math.cos(angle) * 80;
    const y = height / 2 + Math.sin(angle) * 80;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
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
 * 取得位置
 */
function getPosition(event: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * 初始化輸入事件
 */
function initInputHandler() {
  // 滑鼠移動
  canvas.addEventListener('mousemove', (e) => {
    const pos = getPosition(e);
    game.setPlayerPosition(pos.x, pos.y);
  });

  // 滑鼠按下啟動慢動作
  canvas.addEventListener('mousedown', () => {
    game.setSlowMotion(true);
  });

  canvas.addEventListener('mouseup', () => {
    game.setSlowMotion(false);
  });

  canvas.addEventListener('mouseleave', () => {
    game.setSlowMotion(false);
  });

  // 觸控事件
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.setPlayerPosition(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.setPlayerPosition(pos.x, pos.y);
    game.setSlowMotion(true);
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    game.setSlowMotion(false);
  });

  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      event.preventDefault();
      const state = game.getState();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      } else {
        game.setSlowMotion(true);
      }
    }
    if (event.key === 'Enter') {
      const state = game.getState();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === ' ') {
      game.setSlowMotion(false);
    }
  });
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  initInputHandler();

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

  console.log('🎮 時間慢動作遊戲已載入！');
}

main();
