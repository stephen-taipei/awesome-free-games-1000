/**
 * 秩序守護遊戲主程式
 * Game #346 - Awesome Free Games 1000
 */

import { OrderGuardianGame, type GameState, type Enemy, EnemyType } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-346-order-guardian';
const GAME_NAME = 'Order Guardian';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const waveElement = document.getElementById('wave')!;
const comboElement = document.getElementById('combo')!;
const healthBar = document.getElementById('health-bar')!;
const shieldBar = document.getElementById('shield-bar')!;
const specialBar = document.getElementById('special-bar')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const killsElement = document.getElementById('kills')!;
const maxComboElement = document.getElementById('max-combo')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const touchControls = document.getElementById('touch-controls')!;

// 虛擬搖桿
const joystickBase = document.getElementById('joystick-base')!;
const joystickStick = document.getElementById('joystick-stick')!;
const attackBtn = document.getElementById('attack-btn')!;
const blockBtn = document.getElementById('block-btn')!;
const specialBtn = document.getElementById('special-btn')!;

// 遊戲實例
let game: OrderGuardianGame;
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;

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

  game = new OrderGuardianGame({
    canvasWidth: width,
    canvasHeight: height,
  });

  game.setOnStateChange((state) => {
    render(state);
    updateUI(state);
  });

  // 顯示或隱藏觸控控制
  if (isTouchDevice()) {
    touchControls.style.display = 'flex';
  }

  showStartScreen();
}

/**
 * 渲染遊戲
 */
function render(state: GameState) {
  const { width, height } = canvas.getBoundingClientRect();

  // 清空畫布
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // 繪製網格背景
  ctx.strokeStyle = 'rgba(100, 100, 200, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // 繪製攻擊特效
  state.attackEffects.forEach((effect) => {
    const progress = effect.lifetime / effect.maxLifetime;
    const alpha = 1 - progress;

    if (effect.type === 'slash') {
      // 斬擊軌跡
      const length = 80;
      const startX = effect.x + Math.cos(effect.angle) * 30;
      const startY = effect.y + Math.sin(effect.angle) * 30;
      const endX = startX + Math.cos(effect.angle) * length;
      const endY = startY + Math.sin(effect.angle) * length;

      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // 發光效果
      ctx.strokeStyle = `rgba(255, 255, 100, ${alpha * 0.5})`;
      ctx.lineWidth = 10;
      ctx.stroke();
    } else if (effect.type === 'area') {
      // 範圍攻擊
      const radius = 200 * progress;
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, radius * 0.5,
        effect.x, effect.y, radius
      );
      gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // 環形波
      ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    // 敵人陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + enemy.radius, enemy.radius * 0.8, enemy.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 敵人本體
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    // 敵人邊框
    ctx.strokeStyle = enemy.stunned > 0 ? '#fff' : '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 敵人類型標記
    ctx.fillStyle = '#000';
    ctx.font = `bold ${enemy.radius * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (enemy.type === EnemyType.MINION) {
      ctx.fillText('M', enemy.x, enemy.y);
    } else if (enemy.type === EnemyType.ELITE) {
      ctx.fillText('E', enemy.x, enemy.y);
    } else if (enemy.type === EnemyType.BOSS) {
      ctx.fillText('B', enemy.x, enemy.y);
    }

    // 生命值條
    const barWidth = enemy.radius * 2;
    const barHeight = 4;
    const healthPercent = enemy.health / enemy.maxHealth;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth, barHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#4ade80' : healthPercent > 0.25 ? '#fbbf24' : '#ef4444';
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth * healthPercent, barHeight);
  });

  // 繪製玩家
  const player = state.player;

  // 玩家陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + player.radius, player.radius * 0.8, player.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 玩家光環
  if (state.combo > 0) {
    const auraRadius = player.radius + 10 + state.combo * 2;
    const gradient = ctx.createRadialGradient(
      player.x, player.y, player.radius,
      player.x, player.y, auraRadius
    );
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家本體
  ctx.fillStyle = player.isBlocking ? '#3b82f6' : '#ffd700';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = player.isAttacking ? '#fff' : '#000';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 玩家眼睛（方向指示）
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(player.x - player.radius * 0.3, player.y - player.radius * 0.2, player.radius * 0.15, 0, Math.PI * 2);
  ctx.arc(player.x + player.radius * 0.3, player.y - player.radius * 0.2, player.radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 格擋特效
  if (player.isBlocking && player.shield > 0) {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 波次間隔提示
  if (state.enemies.length === 0 && state.enemiesRemaining === 0 && !state.gameOver) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Wave ${state.wave} Clear!`, width / 2, height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('Next wave incoming...', width / 2, height / 2 + 20);
  }
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  waveElement.textContent = state.wave.toString();
  comboElement.textContent = state.combo > 0 ? `${state.combo}x` : '-';

  // 更新血條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${healthPercent}%`;
  healthBar.className = 'bar health-bar';
  if (healthPercent <= 25) healthBar.classList.add('critical');
  else if (healthPercent <= 50) healthBar.classList.add('warning');

  // 更新護盾條
  const shieldPercent = (state.player.shield / state.player.maxShield) * 100;
  shieldBar.style.width = `${shieldPercent}%`;

  // 更新特殊技能條
  const specialPercent = (state.player.specialEnergy / state.player.maxSpecialEnergy) * 100;
  specialBar.style.width = `${specialPercent}%`;

  // 連擊計時器視覺效果
  if (state.combo > 0 && state.comboTimer > 0) {
    const timerPercent = (state.comboTimer / 2) * 100;
    comboElement.style.opacity = timerPercent < 30 ? '0.5' : '1';
  }

  if (state.gameOver) {
    showGameOver(state);
  }
}

/**
 * 顯示開始畫面
 */
function showStartScreen() {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.tapToStart');
  document.getElementById('final-stats')!.style.display = 'none';
  retryBtn.style.display = 'none';
  startBtn.style.display = 'inline-block';

  const { width, height } = canvas.getBoundingClientRect();
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // 標題動畫
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Order Guardian', width / 2, height / 2 - 40);

  ctx.fillStyle = '#888';
  ctx.font = '16px Arial';
  ctx.fillText('Maintain order, eliminate chaos!', width / 2, height / 2 + 10);
}

/**
 * 顯示遊戲結束
 */
function showGameOver(state: GameState) {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameOver');
  finalScoreElement.textContent = formatNumber(state.score);
  killsElement.textContent = formatNumber(state.kills);
  maxComboElement.textContent = formatNumber(state.maxCombo);
  document.getElementById('final-stats')!.style.display = 'block';
  retryBtn.style.display = 'inline-block';
  startBtn.style.display = 'none';

  analytics.gameEnd({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    score: state.score,
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
 * 初始化虛擬搖桿
 */
function initVirtualJoystick() {
  let touchId: number | null = null;

  joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchId = touch.identifier;
    joystickActive = true;

    const rect = joystickBase.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
  });

  document.addEventListener('touchmove', (e) => {
    if (!joystickActive || touchId === null) return;

    const touch = Array.from(e.touches).find(t => t.identifier === touchId);
    if (!touch) return;

    e.preventDefault();

    const deltaX = touch.clientX - joystickStartX;
    const deltaY = touch.clientY - joystickStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 40;

    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    const stickX = Math.cos(angle) * clampedDistance;
    const stickY = Math.sin(angle) * clampedDistance;

    joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    // 模擬 WASD 按鍵
    const threshold = 10;
    if (Math.abs(stickX) > threshold || Math.abs(stickY) > threshold) {
      if (stickX > threshold) game.handleKeyDown('d');
      else game.handleKeyUp('d');

      if (stickX < -threshold) game.handleKeyDown('a');
      else game.handleKeyUp('a');

      if (stickY > threshold) game.handleKeyDown('s');
      else game.handleKeyUp('s');

      if (stickY < -threshold) game.handleKeyDown('w');
      else game.handleKeyUp('w');
    } else {
      game.handleKeyUp('w');
      game.handleKeyUp('a');
      game.handleKeyUp('s');
      game.handleKeyUp('d');
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    const touches = Array.from(e.changedTouches);
    if (touches.some(t => t.identifier === touchId)) {
      joystickActive = false;
      touchId = null;
      joystickStick.style.transform = 'translate(0, 0)';
      game.handleKeyUp('w');
      game.handleKeyUp('a');
      game.handleKeyUp('s');
      game.handleKeyUp('d');
    }
  });

  // 攻擊按鈕
  attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    attackBtn.classList.add('active');
    game.handleKeyDown('j');
  });

  attackBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    attackBtn.classList.remove('active');
    game.handleKeyUp('j');
  });

  // 格擋按鈕
  blockBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    blockBtn.classList.add('active');
    game.handleKeyDown('k');
  });

  blockBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    blockBtn.classList.remove('active');
    game.handleKeyUp('k');
  });

  // 特殊技能按鈕
  specialBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    specialBtn.classList.add('active');
    game.handleKeyDown('l');
  });

  specialBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    specialBtn.classList.remove('active');
    game.handleKeyUp('l');
  });
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
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

  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    const state = game.getState();

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      }
      return;
    }

    if (event.key === 'Escape') {
      helpModal.style.display = 'none';
      return;
    }

    if (state.isPlaying && !state.gameOver) {
      game.handleKeyDown(event.key);
    }
  });

  document.addEventListener('keyup', (event) => {
    const state = game.getState();
    if (state.isPlaying && !state.gameOver) {
      game.handleKeyUp(event.key);
    }
  });

  window.addEventListener('resize', () => {
    initCanvas();
  });

  // 初始化虛擬搖桿
  if (isTouchDevice()) {
    initVirtualJoystick();
  }
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

  console.log('🎮 秩序守護遊戲已載入！');
}

main();
