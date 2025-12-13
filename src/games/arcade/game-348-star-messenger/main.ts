/**
 * 星辰使者遊戲主程式
 * Game #348 - Awesome Free Games 1000
 */

import { StarMessengerGame, type GameState, type ConstellationType } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-348-star-messenger';
const GAME_NAME = 'Star Messenger';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const waveElement = document.getElementById('wave')!;
const defeatedElement = document.getElementById('defeated')!;
const healthBar = document.getElementById('health-bar')!;
const energyBar = document.getElementById('energy-bar')!;
const shieldIndicator = document.getElementById('shield-indicator')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const constellationButtons = document.querySelectorAll('.constellation-btn');
const nextWaveInfo = document.getElementById('next-wave-info')!;

// 遊戲實例
let game: StarMessengerGame;

// 星空背景
let stars: Array<{ x: number; y: number; radius: number; alpha: number; twinkleSpeed: number }> = [];

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
 * 初始化星空背景
 */
function initStars() {
  const { width, height } = canvas.getBoundingClientRect();
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      twinkleSpeed: Math.random() * 2 + 1,
    });
  }
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

  initStars();

  return { width: rect.width, height: rect.height };
}

/**
 * 初始化遊戲
 */
function initGame() {
  const { width, height } = initCanvas();

  game = new StarMessengerGame({
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
 * 繪製星空背景
 */
function drawStarfield() {
  const { width, height } = canvas.getBoundingClientRect();

  // 深藍色漸層背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0a1f');
  gradient.addColorStop(0.5, '#1a1a3e');
  gradient.addColorStop(1, '#0f0f2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製星星
  const time = Date.now() / 1000;
  stars.forEach((star) => {
    const alpha = Math.abs(Math.sin(time * star.twinkleSpeed)) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();

    // 星光閃爍
    if (Math.random() < 0.01) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
      ctx.fill();
    }
  });
}

/**
 * 渲染遊戲
 */
function render(state: GameState) {
  const { width, height } = canvas.getBoundingClientRect();

  // 繪製星空背景
  drawStarfield();

  // 繪製粒子
  state.particles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color.replace(')', `, ${particle.alpha})`).replace('rgb', 'rgba');
    ctx.fill();
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
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
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.radius - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#4cd137' : healthPercent > 0.25 ? '#ffa502' : '#ff6348';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  });

  // 繪製星辰彈幕
  state.projectiles.forEach((proj) => {
    // 彈幕軌跡
    if (proj.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
      for (let i = 1; i < proj.trail.length; i++) {
        ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
      }
      ctx.strokeStyle = proj.color + '40';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 彈幕本體
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = proj.color;
    ctx.fill();

    // 發光效果
    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.radius * 2);
    gradient.addColorStop(0, proj.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 繪製玩家
  const player = state.player;

  // 護盾效果
  if (player.isShieldActive) {
    const shieldRadius = player.radius * 2.5;
    const gradient = ctx.createRadialGradient(
      player.x, player.y, player.radius,
      player.x, player.y, shieldRadius
    );
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
    gradient.addColorStop(0.7, 'rgba(0, 255, 255, 0.5)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, shieldRadius, 0, Math.PI * 2);
    ctx.fill();

    // 護盾邊緣
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 玩家光環
  const playerGradient = ctx.createRadialGradient(
    player.x, player.y, player.radius,
    player.x, player.y, player.radius * 2
  );
  const constellationColor = getConstellationColor(player.selectedConstellation);
  playerGradient.addColorStop(0, constellationColor + 'ff');
  playerGradient.addColorStop(1, constellationColor + '00');
  ctx.fillStyle = playerGradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 2, 0, Math.PI * 2);
  ctx.fill();

  // 玩家本體
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = constellationColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 玩家星座標記
  ctx.fillStyle = constellationColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', player.x, player.y);

  // 下一波倒計時
  if (state.enemies.length === 0 && state.nextWaveTimer > 0 && !state.gameOver) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${i18n.t('game.nextWave')}: ${Math.ceil(state.nextWaveTimer)}`,
      width / 2,
      height / 2
    );
  }
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  waveElement.textContent = state.wave.toString();
  defeatedElement.textContent = state.enemiesDefeated.toString();

  // 更新血條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${healthPercent}%`;

  // 更新能量條
  const energyPercent = (state.player.starEnergy / state.player.maxStarEnergy) * 100;
  energyBar.style.width = `${energyPercent}%`;

  // 更新護盾指示器
  if (state.player.isShieldActive) {
    shieldIndicator.textContent = i18n.t('game.shieldActive');
    shieldIndicator.className = 'shield-indicator active';
  } else if (state.player.shieldCooldown > 0) {
    const cooldown = Math.ceil(state.player.shieldCooldown);
    shieldIndicator.textContent = `${i18n.t('game.shieldCooldown')} ${cooldown}s`;
    shieldIndicator.className = 'shield-indicator cooldown';
  } else {
    shieldIndicator.textContent = i18n.t('game.shieldReady');
    shieldIndicator.className = 'shield-indicator ready';
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
  drawStarfield();

  // 示意圖：星辰使者
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 星辰圍繞
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const x = width / 2 + Math.cos(angle) * 60;
    const y = height / 2 + Math.sin(angle) * 60;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
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
 * 取得星座顏色
 */
function getConstellationColor(type: ConstellationType): string {
  const colors = {
    aries: '#ff6b6b',
    leo: '#ffd700',
    sagittarius: '#00ffff',
    gemini: '#ff9ff3',
  };
  return colors[type];
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

  // 滑鼠點擊發射
  canvas.addEventListener('mousedown', (e) => {
    const pos = getPosition(e);
    game.setMousePosition(pos.x, pos.y);
    game.startFiring();
  });

  canvas.addEventListener('mouseup', () => {
    game.stopFiring();
  });

  canvas.addEventListener('mouseleave', () => {
    game.stopFiring();
  });

  // 觸控事件
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
    game.startFiring();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    game.stopFiring();
  });

  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    const state = game.getState();
    if (event.key === ' ') {
      event.preventDefault();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      } else {
        game.activateShield();
      }
    }
    if (event.key === 'Enter') {
      if (!state.isPlaying || state.gameOver) {
        startGame();
      }
    }
    if (event.key === 'p' || event.key === 'P') {
      game.togglePause();
    }
  });
}

/**
 * 初始化星座選擇
 */
function initConstellationSelector() {
  constellationButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-constellation') as ConstellationType;
      game.selectConstellation(type);

      // 更新選中狀態
      constellationButtons.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');

      // 更新顏色
      const color = getConstellationColor(type);
      (btn as HTMLElement).style.borderColor = color;
    });
  });

  // 預設選中獅子座
  const defaultBtn = document.querySelector('[data-constellation="leo"]');
  if (defaultBtn) {
    defaultBtn.classList.add('selected');
  }
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  initInputHandler();
  initConstellationSelector();

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

  console.log('🌟 星辰使者遊戲已載入！');
}

main();
