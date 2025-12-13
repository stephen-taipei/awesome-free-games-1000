/**
 * 太陽戰士遊戲主程式
 * Game #350 - Awesome Free Games 1000
 */

import { SunWarriorGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-350-sun-warrior';
const GAME_NAME = 'Sun Warrior';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const waveElement = document.getElementById('wave')!;
const killedElement = document.getElementById('killed')!;
const healthBar = document.getElementById('health-bar')!;
const solarEnergyBar = document.getElementById('solar-energy-bar')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const solarStormBtn = document.getElementById('solar-storm-btn')!;
const burningFieldBtn = document.getElementById('burning-field-btn')!;

// 遊戲實例
let game: SunWarriorGame;
let autoShootInterval: number | null = null;

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

  game = new SunWarriorGame({
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

  // 背景漸層（火焰色調）
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a0a00');
  gradient.addColorStop(0.5, '#2d1500');
  gradient.addColorStop(1, '#1a0a00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 太陽粒子背景效果
  const energyRatio = state.player.solarEnergy / state.player.maxSolarEnergy;
  for (let i = 0; i < 20; i++) {
    const x = (Date.now() * 0.01 + i * 50) % (width + 100) - 50;
    const y = (i * 37) % height;
    const alpha = Math.random() * 0.3 * energyRatio;
    ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 繪製燃燒領域
  state.burningFields.forEach((field) => {
    const alpha = field.duration / field.maxDuration;
    const gradient = ctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, field.radius);
    gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha * 0.4})`);
    gradient.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.2})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
    ctx.fill();

    // 燃燒邊緣
    ctx.strokeStyle = `rgba(255, 150, 0, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 繪製太陽風暴
  state.solarStorms.forEach((storm) => {
    const alpha = storm.duration / storm.maxDuration;
    const gradient = ctx.createRadialGradient(storm.x, storm.y, 0, storm.x, storm.y, storm.radius);
    gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.6})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(storm.x, storm.y, storm.radius, 0, Math.PI * 2);
    ctx.fill();

    // 旋轉光線
    const time = Date.now() * 0.005;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time;
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(storm.x, storm.y);
      ctx.lineTo(
        storm.x + Math.cos(angle) * storm.radius,
        storm.y + Math.sin(angle) * storm.radius
      );
      ctx.stroke();
    }
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    // 燒傷效果
    if (enemy.burnDuration > 0) {
      const burnGradient = ctx.createRadialGradient(
        enemy.x, enemy.y, 0,
        enemy.x, enemy.y, enemy.radius + 10
      );
      burnGradient.addColorStop(0, 'rgba(255, 100, 0, 0.4)');
      burnGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = burnGradient;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // 敵人本體
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    const enemyColors: any = {
      normal: '#ff6b6b',
      fast: '#feca57',
      tank: '#ee5a6f',
      elite: '#c44569',
    };
    ctx.fillStyle = enemyColors[enemy.type];
    ctx.fill();

    // 敵人邊框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 生命值條
    const healthRatio = enemy.health / enemy.maxHealth;
    const barWidth = enemy.radius * 2;
    const barHeight = 4;
    const barX = enemy.x - enemy.radius;
    const barY = enemy.y - enemy.radius - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = healthRatio > 0.5 ? '#4caf50' : healthRatio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
  });

  // 繪製投射物
  state.projectiles.forEach((proj) => {
    // 太陽爆破光芒
    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.radius + 8);
    gradient.addColorStop(0, 'rgba(255, 220, 100, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.6)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius + 8, 0, Math.PI * 2);
    ctx.fill();

    // 投射物核心
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();

    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 繪製玩家
  const player = state.player;
  const energyRatio2 = player.solarEnergy / player.maxSolarEnergy;

  // 玩家光環（能量越高越亮）
  const auraGradient = ctx.createRadialGradient(
    player.x, player.y, player.radius,
    player.x, player.y, player.radius * 3
  );
  auraGradient.addColorStop(0, `rgba(255, 200, 50, ${energyRatio2 * 0.4})`);
  auraGradient.addColorStop(0.5, `rgba(255, 100, 0, ${energyRatio2 * 0.2})`);
  auraGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = auraGradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 3, 0, Math.PI * 2);
  ctx.fill();

  // 玩家本體
  const playerGradient = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, player.radius
  );
  playerGradient.addColorStop(0, '#ffeb3b');
  playerGradient.addColorStop(1, '#ff9800');
  ctx.fillStyle = playerGradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // 玩家邊框（發光）
  ctx.strokeStyle = `rgba(255, 200, 0, ${0.5 + energyRatio2 * 0.5})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 太陽能量火焰效果
  if (energyRatio2 > 0.7) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.003;
      const flameX = player.x + Math.cos(angle) * (player.radius + 5);
      const flameY = player.y + Math.sin(angle) * (player.radius + 5);
      ctx.fillStyle = `rgba(255, 100, 0, ${Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(flameX, flameY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  waveElement.textContent = state.wave.toString();
  killedElement.textContent = state.enemiesKilled.toString();

  // 更新生命值條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${Math.max(0, healthPercent)}%`;

  // 更新太陽能量條
  const energyPercent = (state.player.solarEnergy / state.player.maxSolarEnergy) * 100;
  solarEnergyBar.style.width = `${Math.max(0, energyPercent)}%`;

  // 更新技能按鈕狀態
  solarStormBtn.disabled = state.player.solarEnergy < 40;
  burningFieldBtn.disabled = state.player.solarEnergy < 60;

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

  // 火焰背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a0a00');
  gradient.addColorStop(0.5, '#2d1500');
  gradient.addColorStop(1, '#1a0a00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 太陽標誌
  const centerX = width / 2;
  const centerY = height / 2;
  const sunGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
  sunGradient.addColorStop(0, '#ffeb3b');
  sunGradient.addColorStop(0.5, '#ff9800');
  sunGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
  ctx.fill();

  // 太陽光芒
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * 30, centerY + Math.sin(angle) * 30);
    ctx.lineTo(centerX + Math.cos(angle) * 60, centerY + Math.sin(angle) * 60);
    ctx.stroke();
  }
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

  if (autoShootInterval) {
    clearInterval(autoShootInterval);
    autoShootInterval = null;
  }

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

  // 自動射擊
  if (autoShootInterval) {
    clearInterval(autoShootInterval);
  }
  autoShootInterval = window.setInterval(() => {
    game.shootSolarBlast();
  }, 200);

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
    game.setMousePosition(pos.x, pos.y);
  });

  // 觸控移動
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.setPlayerPosition(pos.x, pos.y);
    game.setMousePosition(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getPosition(e.touches[0]);
    game.setPlayerPosition(pos.x, pos.y);
    game.setMousePosition(pos.x, pos.y);
  }, { passive: false });

  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    const state = game.getState();
    if (!state.isPlaying || state.gameOver) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        startGame();
      }
      return;
    }

    if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      game.useSolarStorm();
    }
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      game.useBurningField();
    }
  });

  // 技能按鈕
  solarStormBtn.addEventListener('click', () => {
    game.useSolarStorm();
  });

  burningFieldBtn.addEventListener('click', () => {
    game.useBurningField();
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

  console.log('🔥 太陽戰士遊戲已載入！');
}

main();
