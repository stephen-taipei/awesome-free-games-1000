/**
 * 引力彈射遊戲主程式
 * Game #229 - Awesome Free Games 1000
 */

import { GravitySlingshotGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-229-gravity-slingshot';
const GAME_NAME = 'Gravity Slingshot';
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

// 遊戲實例
let game: GravitySlingshotGame;

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

  game = new GravitySlingshotGame({
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

  // 清空畫布 - 太空背景
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // 繪製星星背景
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    const x = (i * 73 + state.level * 17) % width;
    const y = (i * 47 + state.level * 23) % height;
    const size = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 繪製發射區
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, height - 80, width, 80);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, height - 80);
  ctx.lineTo(width, height - 80);
  ctx.stroke();
  ctx.setLineDash([]);

  // 繪製行星
  state.planets.forEach((planet) => {
    // 引力場視覺
    const gradient = ctx.createRadialGradient(
      planet.x, planet.y, planet.radius,
      planet.x, planet.y, planet.radius * 3
    );
    gradient.addColorStop(0, `${planet.color}40`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    // 行星本體
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
    ctx.fillStyle = planet.color;
    ctx.fill();

    // 高光
    ctx.beginPath();
    ctx.arc(
      planet.x - planet.radius * 0.3,
      planet.y - planet.radius * 0.3,
      planet.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  });

  // 繪製目標（星星）
  state.targets.forEach((target) => {
    if (target.collected) return;

    ctx.save();
    ctx.translate(target.x, target.y);

    // 發光效果
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, target.radius * 2);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, target.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // 繪製星星
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * target.radius;
      const y = Math.sin(angle) * target.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  // 繪製飛船軌跡
  if (state.projectile && state.projectile.trail.length > 1) {
    ctx.beginPath();
    ctx.moveTo(state.projectile.trail[0].x, state.projectile.trail[0].y);

    for (let i = 1; i < state.projectile.trail.length; i++) {
      ctx.lineTo(state.projectile.trail[i].x, state.projectile.trail[i].y);
    }

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 繪製飛船
  if (state.projectile) {
    ctx.save();
    ctx.translate(state.projectile.x, state.projectile.y);

    // 發光
    ctx.beginPath();
    ctx.arc(0, 0, state.projectile.radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.fill();

    // 飛船本體
    ctx.beginPath();
    ctx.arc(0, 0, state.projectile.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.fill();

    ctx.restore();
  }

  // 繪製瞄準線
  if (state.aiming && state.aimStart && state.aimEnd) {
    const dx = state.aimStart.x - state.aimEnd.x;
    const dy = state.aimStart.y - state.aimEnd.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // 預測軌跡
    ctx.beginPath();
    ctx.moveTo(state.aimStart.x, state.aimStart.y);
    ctx.lineTo(state.aimStart.x + dx, state.aimStart.y + dy);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 發射點
    ctx.beginPath();
    ctx.arc(state.aimStart.x, state.aimStart.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fill();

    // 力量指示
    ctx.fillStyle = '#00ffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Power: ${Math.round(length)}`, state.aimStart.x, state.aimStart.y - 20);
  }
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

  // 繪製初始畫面
  const { width, height } = canvas.getBoundingClientRect();
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // 繪製行星圖示
  const colors = ['#e74c3c', '#3498db', '#9b59b6'];
  colors.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(width / 2 - 60 + i * 60, height / 2, 25, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
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
  // 滑鼠事件
  canvas.addEventListener('mousedown', (e) => {
    const pos = getPosition(e);
    game.startAim(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getPosition(e);
    game.updateAim(pos.x, pos.y);
  });

  canvas.addEventListener('mouseup', () => {
    game.endAim();
  });

  // 觸控事件
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.startAim(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.updateAim(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    game.endAim();
  });
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  initInputHandler();

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
    if (event.key === ' ' || event.key === 'Enter') {
      const state = game.getState();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      } else if (state.levelComplete) {
        nextLevel();
      }
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

  console.log('🎮 引力彈射遊戲已載入！');
}

main();
