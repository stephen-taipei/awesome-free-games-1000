/**
 * 毀滅者遊戲主程式
 * Game #355 - Awesome Free Games 1000
 */

import { DestroyerGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-355-the-destroyer';
const GAME_NAME = 'The Destroyer';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const healthBar = document.getElementById('health-bar')!;
const energyBar = document.getElementById('energy-bar')!;
const chainElement = document.getElementById('chain')!;
const waveElement = document.getElementById('wave')!;
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
let game: DestroyerGame;

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

  game = new DestroyerGame({
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

  // 清空畫布 - 黑色背景
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  // 背景網格效果
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.05)';
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

  // 繪製可破壞物
  state.destructibles.forEach((obj) => {
    if (obj.destroyed) return;

    // 主體
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
    ctx.fillStyle = obj.color;
    ctx.fill();

    // 邊框
    ctx.strokeStyle = obj.type === 'crystal' ? '#00ffff' : '#444444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 生命條
    if (obj.health < obj.maxHealth) {
      const barWidth = obj.radius * 2;
      const barHeight = 4;
      const barX = obj.x - barWidth / 2;
      const barY = obj.y - obj.radius - 8;

      ctx.fillStyle = '#333333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const healthPercent = obj.health / obj.maxHealth;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    // 水晶發光效果
    if (obj.type === 'crystal') {
      const gradient = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, obj.radius * 1.5);
      gradient.addColorStop(0, 'rgba(72, 219, 251, 0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    // 主體
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();

    // 邊框
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 生命條
    if (enemy.health < enemy.maxHealth) {
      const barWidth = enemy.radius * 2;
      const barHeight = 4;
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - enemy.radius - 8;

      ctx.fillStyle = '#333333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const healthPercent = enemy.health / enemy.maxHealth;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    // 敵人發光
    const gradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.radius * 1.5);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 繪製投射物
  state.projectiles.forEach((proj) => {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = proj.color;
    ctx.fill();

    // 發光效果
    ctx.strokeStyle = proj.color + '80';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 繪製爆炸效果
  state.explosions.forEach((exp) => {
    const alpha = exp.life;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fillStyle = exp.color.replace(')', `, ${alpha * 0.3})`).replace('rgb', 'rgba');
    ctx.fill();

    ctx.strokeStyle = '#ff0000'.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.lineWidth = 3;
    ctx.stroke();

    // 內圈
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.fill();
  });

  // 繪製毀滅光束
  if (state.destructionBeam.active) {
    // 主光束
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y);
    ctx.lineTo(state.destructionBeam.targetX, state.destructionBeam.targetY);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 20;
    ctx.stroke();

    // 內部光束
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y);
    ctx.lineTo(state.destructionBeam.targetX, state.destructionBeam.targetY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // 粒子
    state.destructionBeam.particles.forEach((p) => {
      const alpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
      ctx.fill();
    });
  }

  // 繪製玩家
  const player = state.player;

  // 玩家光環（毀滅者氣場）
  const gradient = ctx.createRadialGradient(
    player.x,
    player.y,
    player.radius,
    player.x,
    player.y,
    player.radius * 2.5
  );
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 玩家主體
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ff0000';
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 玩家核心
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  chainElement.textContent = state.destructionChain > 0 ? `x${state.destructionChain}` : '';
  waveElement.textContent = state.wave.toString();

  // 更新生命條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${healthPercent}%`;

  if (healthPercent < 30) {
    healthBar.classList.add('low');
  } else {
    healthBar.classList.remove('low');
  }

  // 更新能量條
  const energyPercent = (state.player.energy / state.player.maxEnergy) * 100;
  energyBar.style.width = `${energyPercent}%`;

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
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  // 示意圖 - 毀滅者標誌
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#ff0000';
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 光環效果
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 30, width / 2, height / 2, 80);
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
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
 * 取得滑鼠位置
 */
function getMousePosition(event: MouseEvent | Touch): { x: number; y: number } {
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
  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    const state = game.getState();

    if (event.key === ' ') {
      event.preventDefault();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      } else {
        game.fireDoomshock();
      }
    }

    if (event.key === 'Enter') {
      if (!state.isPlaying || state.gameOver) {
        startGame();
      }
    }

    // 移動鍵
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(event.key)) {
      event.preventDefault();
      game.setKeyDown(event.key);
    }
  });

  document.addEventListener('keyup', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(event.key)) {
      game.setKeyUp(event.key);
    }
  });

  // 滑鼠控制 - 毀滅光束
  canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePosition(e);
    game.fireDestructionBeam(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    const state = game.getState();
    if (state.destructionBeam.active) {
      const pos = getMousePosition(e);
      game.fireDestructionBeam(pos.x, pos.y);
    }
  });

  canvas.addEventListener('mouseup', () => {
    game.stopDestructionBeam();
  });

  canvas.addEventListener('mouseleave', () => {
    game.stopDestructionBeam();
  });

  // 觸控控制
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getMousePosition(e.touches[0]);
    game.fireDestructionBeam(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const state = game.getState();
    if (state.destructionBeam.active) {
      const pos = getMousePosition(e.touches[0]);
      game.fireDestructionBeam(pos.x, pos.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    game.stopDestructionBeam();
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

  console.log('🎮 毀滅者遊戲已載入！');
}

main();
