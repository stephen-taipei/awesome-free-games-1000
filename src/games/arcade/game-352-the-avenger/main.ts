/**
 * 復仇者遊戲主程式
 * Game #352 - Awesome Free Games 1000
 */

import { AvengerGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-352-the-avenger';
const GAME_NAME = 'The Avenger';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const healthBar = document.getElementById('health-bar')!;
const rageBar = document.getElementById('rage-bar')!;
const waveElement = document.getElementById('wave')!;
const streakElement = document.getElementById('streak')!;
const multiplierElement = document.getElementById('multiplier')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const skillQBtn = document.getElementById('skill-q')!;
const skillEBtn = document.getElementById('skill-e')!;
const skillRBtn = document.getElementById('skill-r')!;

// 遊戲實例
let game: AvengerGame;

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

  game = new AvengerGame({
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

  // 背景（憤怒值越高越紅）
  const rageIntensity = state.player.rage / state.player.maxRage;
  const bgRed = Math.floor(20 + rageIntensity * 30);
  ctx.fillStyle = `rgb(${bgRed}, 5, 5)`;
  ctx.fillRect(0, 0, width, height);

  // 憤怒視覺效果
  if (rageIntensity > 0.5) {
    ctx.strokeStyle = `rgba(255, 0, 0, ${(rageIntensity - 0.5) * 0.3})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const radius = 50 + i * 80 + (Date.now() / 10) % 80;
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 粒子效果
  state.particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.fill();
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    // 敵人陰影
    ctx.beginPath();
    ctx.arc(enemy.x + 3, enemy.y + 3, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // 敵人本體
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();

    // 敵人邊框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 血條
    const healthPercent = enemy.health / enemy.maxHealth;
    const barWidth = enemy.radius * 2;
    const barHeight = 4;
    const barX = enemy.x - enemy.radius;
    const barY = enemy.y - enemy.radius - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // 類型標記
    if (enemy.type === 'fast') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('F', enemy.x, enemy.y + 4);
    } else if (enemy.type === 'tank') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('T', enemy.x, enemy.y + 4);
    } else if (enemy.type === 'shooter') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S', enemy.x, enemy.y + 4);
    }
  });

  // 繪製子彈
  state.bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.isPlayerBullet ? '#ffff00' : '#ff00ff';
    ctx.fill();

    // 發光效果
    const gradient = ctx.createRadialGradient(
      bullet.x, bullet.y, 0,
      bullet.x, bullet.y, bullet.radius * 2
    );
    gradient.addColorStop(0, bullet.isPlayerBullet ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 0, 255, 0.8)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 繪製玩家
  const player = state.player;

  // 無敵光環
  if (player.isInvincible) {
    const time = Date.now() / 100;
    const gradient = ctx.createRadialGradient(
      player.x, player.y, player.radius,
      player.x, player.y, player.radius * 3
    );
    gradient.addColorStop(0, 'rgba(255, 255, 0, 0.5)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 3 + Math.sin(time) * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 憤怒光環
  if (rageIntensity > 0.3) {
    const gradient = ctx.createRadialGradient(
      player.x, player.y, player.radius,
      player.x, player.y, player.radius * 2
    );
    gradient.addColorStop(0, `rgba(255, 0, 0, ${rageIntensity * 0.5})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家陰影
  ctx.beginPath();
  ctx.arc(player.x + 2, player.y + 2, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();

  // 玩家本體
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  const playerGradient = ctx.createRadialGradient(
    player.x - 5, player.y - 5, 0,
    player.x, player.y, player.radius
  );
  playerGradient.addColorStop(0, '#ff4444');
  playerGradient.addColorStop(1, '#cc0000');
  ctx.fillStyle = playerGradient;
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = player.isInvincible ? '#ffff00' : '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 玩家眼睛（憤怒效果）
  const eyeGlow = rageIntensity;
  ctx.fillStyle = `rgba(255, ${255 - eyeGlow * 200}, 0, ${0.8 + eyeGlow * 0.2})`;
  ctx.beginPath();
  ctx.arc(player.x - 5, player.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x + 5, player.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  waveElement.textContent = state.wave.toString();
  streakElement.textContent = state.killStreak.toString();
  multiplierElement.textContent = `${state.scoreMultiplier.toFixed(1)}x`;

  // 更新血條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${Math.max(0, healthPercent)}%`;
  healthBar.classList.toggle('low', healthPercent < 30);

  // 更新憤怒條
  const ragePercent = (state.player.rage / state.player.maxRage) * 100;
  rageBar.style.width = `${ragePercent}%`;
  rageBar.classList.toggle('high', ragePercent > 50);

  // 更新技能按鈕狀態
  updateSkillButtons(state);

  if (state.gameOver) {
    showGameOver(state.score);
  }
}

/**
 * 更新技能按鈕
 */
function updateSkillButtons(state: GameState) {
  skillQBtn.classList.toggle('disabled', state.player.rage < 50);
  skillEBtn.classList.toggle('disabled', state.player.rage < 10);
  skillRBtn.classList.toggle('disabled', state.player.rage < 75);
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
  ctx.fillStyle = '#140505';
  ctx.fillRect(0, 0, width, height);

  // 標題效果
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff0000';
  ctx.fillText('THE AVENGER', width / 2, height / 2 - 40);

  // 復仇者圖示
  ctx.beginPath();
  ctx.arc(width / 2, height / 2 + 30, 25, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(width / 2, height / 2 + 30, 10, width / 2, height / 2 + 30, 25);
  gradient.addColorStop(0, '#ff4444');
  gradient.addColorStop(1, '#cc0000');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 眼睛
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(width / 2 - 8, height / 2 + 25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width / 2 + 8, height / 2 + 25, 4, 0, Math.PI * 2);
  ctx.fill();
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
    game.setMousePosition(pos.x, pos.y);
  });

  // 觸控事件
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.setMousePosition(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.setMousePosition(pos.x, pos.y);
  }, { passive: false });

  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    const state = game.getState();

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      }
    }

    if (state.isPlaying && !state.gameOver) {
      switch (event.key.toLowerCase()) {
        case 'q':
          event.preventDefault();
          game.useRageBurst();
          break;
        case 'e':
          event.preventDefault();
          game.shoot();
          break;
        case 'r':
          event.preventDefault();
          game.useInvincibility();
          break;
      }
    }
  });

  // 技能按鈕
  skillQBtn.addEventListener('click', () => {
    game.useRageBurst();
  });

  skillEBtn.addEventListener('click', () => {
    game.shoot();
  });

  skillRBtn.addEventListener('click', () => {
    game.useInvincibility();
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

  console.log('🎮 復仇者遊戲已載入！');
}

main();
