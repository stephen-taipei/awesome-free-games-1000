/**
 * 月影刺客遊戲主程式
 * Game #349 - Awesome Free Games 1000
 */

import { MoonShadowGame, type GameState, type Skill } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-349-moon-shadow';
const GAME_NAME = 'Moon Shadow';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const killsElement = document.getElementById('kills')!;
const healthBar = document.getElementById('health-bar')!;
const stealthBar = document.getElementById('stealth-bar')!;
const stealthIndicator = document.getElementById('stealth-indicator')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

// 技能按鈕和冷卻
const skillButtons = {
  moonSlash: document.getElementById('skill-moon-slash')!,
  shadowClone: document.getElementById('skill-shadow-clone')!,
  nightDash: document.getElementById('skill-night-dash')!,
};

const skillCooldownOverlays = {
  moonSlash: document.getElementById('cooldown-moon-slash')!,
  shadowClone: document.getElementById('cooldown-shadow-clone')!,
  nightDash: document.getElementById('cooldown-night-dash')!,
};

// 遊戲實例
let game: MoonShadowGame;

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

  game = new MoonShadowGame({
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

  // 深色月夜背景
  const gradient = ctx.createRadialGradient(
    width / 2, height / 4, 0,
    width / 2, height / 4, height
  );
  gradient.addColorStop(0, '#1a1a3e');
  gradient.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 月亮
  ctx.beginPath();
  ctx.arc(width - 60, 60, 30, 0, Math.PI * 2);
  const moonGradient = ctx.createRadialGradient(width - 60, 60, 0, width - 60, 60, 30);
  moonGradient.addColorStop(0, '#f8f9fa');
  moonGradient.addColorStop(1, '#adb5bd');
  ctx.fillStyle = moonGradient;
  ctx.fill();

  // 月光效果
  if (state.player.isStealthed) {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(width - 60 + i * 10, 60, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248, 249, 250, 0.3)';
      ctx.fill();
    }
  }

  // 繪製粒子
  state.particles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color.replace(')', `, ${particle.alpha})`).replace('rgb', 'rgba');
    ctx.fill();
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    // 偵測範圍（警戒時顯示）
    if (enemy.isAlerted && !state.player.isStealthed) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.detectionRange, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 巡邏路徑（僅調試用，可選）
    // if (!enemy.isAlerted) {
    //   ctx.strokeStyle = 'rgba(149, 165, 166, 0.2)';
    //   ctx.lineWidth = 1;
    //   enemy.patrolPoints.forEach((point, i) => {
    //     if (i === 0) {
    //       ctx.beginPath();
    //       ctx.moveTo(point.x, point.y);
    //     } else {
    //       ctx.lineTo(point.x, point.y);
    //     }
    //   });
    //   ctx.stroke();
    // }

    // 敵人本體
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.isAlerted ? '#e74c3c' : '#95a5a6';
    ctx.fill();

    // 敵人邊框
    ctx.strokeStyle = enemy.isAlerted ? '#c0392b' : '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 警戒標誌
    if (enemy.isAlerted) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', enemy.x, enemy.y - enemy.radius - 8);
    }

    // 血條
    const healthPercent = enemy.health / enemy.maxHealth;
    const barWidth = enemy.radius * 2;
    const barHeight = 4;
    const barX = enemy.x - enemy.radius;
    const barY = enemy.y - enemy.radius - 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  });

  // 繪製玩家
  const player = state.player;

  // 隱身光環
  if (player.isStealthed) {
    const auraGradient = ctx.createRadialGradient(
      player.x, player.y, player.radius,
      player.x, player.y, player.radius * 3
    );
    auraGradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)');
    auraGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家本體
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = player.isStealthed ? '#3498db' : '#ecf0f1';
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = player.isStealthed ? '#2980b9' : '#bdc3c7';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 方向指示（基於移動）
  if (player.velocity.x !== 0 || player.velocity.y !== 0) {
    const angle = Math.atan2(player.velocity.y, player.velocity.x);
    const indicatorX = player.x + Math.cos(angle) * (player.radius + 8);
    const indicatorY = player.y + Math.sin(angle) * (player.radius + 8);

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 3, 0, Math.PI * 2);
    ctx.fillStyle = player.isStealthed ? '#3498db' : '#95a5a6';
    ctx.fill();
  }

  // 繪製傷害數字
  state.damageNumbers.forEach((dmg) => {
    ctx.font = dmg.isCritical ? 'bold 20px Arial' : 'bold 16px Arial';
    ctx.fillStyle = dmg.isCritical
      ? `rgba(241, 196, 15, ${dmg.alpha})`
      : `rgba(231, 76, 60, ${dmg.alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText(dmg.value.toString(), dmg.x, dmg.y);
  });

  // 技能視覺效果
  if (state.activeSkill === 'moonSlash') {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  killsElement.textContent = formatNumber(state.kills);

  // 更新生命條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${healthPercent}%`;

  // 更新隱身能量條
  const stealthPercent = (state.player.stealthEnergy / state.player.maxStealthEnergy) * 100;
  stealthBar.style.width = `${stealthPercent}%`;

  if (state.player.isStealthed) {
    stealthBar.classList.add('active');
    stealthIndicator.classList.add('active');
  } else {
    stealthBar.classList.remove('active');
    stealthIndicator.classList.remove('active');
  }

  // 更新技能冷卻
  (['moonSlash', 'shadowClone', 'nightDash'] as Skill[]).forEach((skill) => {
    const cooldown = state.skillCooldowns[skill];
    const maxCooldown = state.skillMaxCooldowns[skill];
    const overlay = skillCooldownOverlays[skill];
    const button = skillButtons[skill];

    if (cooldown > 0) {
      const percent = (cooldown / maxCooldown) * 100;
      overlay.style.height = `${percent}%`;
      button.classList.add('on-cooldown');

      // 顯示冷卻時間
      const timeText = overlay.querySelector('.cooldown-text');
      if (timeText) {
        timeText.textContent = Math.ceil(cooldown).toString();
      }
    } else {
      overlay.style.height = '0%';
      button.classList.remove('on-cooldown');
    }
  });

  if (state.gameOver) {
    showGameOver(state.score, state.kills);
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

  // 背景
  const gradient = ctx.createRadialGradient(
    width / 2, height / 4, 0,
    width / 2, height / 4, height
  );
  gradient.addColorStop(0, '#1a1a3e');
  gradient.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 示意圖
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#ecf0f1';
  ctx.fill();

  // 月亮
  ctx.beginPath();
  ctx.arc(width - 60, 60, 30, 0, Math.PI * 2);
  const moonGradient = ctx.createRadialGradient(width - 60, 60, 0, width - 60, 60, 30);
  moonGradient.addColorStop(0, '#f8f9fa');
  moonGradient.addColorStop(1, '#adb5bd');
  ctx.fillStyle = moonGradient;
  ctx.fill();
}

/**
 * 顯示遊戲結束
 */
function showGameOver(score: number, kills: number) {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameOver');
  finalScoreElement.textContent = `${i18n.t('game.score')}: ${formatNumber(score)} | ${i18n.t('game.kills')}: ${formatNumber(kills)}`;
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
 * 初始化輸入事件
 */
function initInputHandler() {
  // 鍵盤事件
  document.addEventListener('keydown', (event) => {
    const state = game.getState();

    // 遊戲未開始時
    if (!state.isPlaying || state.gameOver) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        startGame();
      }
      return;
    }

    // 移動
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      game.setKeyDown(event.key);
    }

    // 隱身
    if (event.key === 'Shift') {
      event.preventDefault();
      game.toggleStealth();
    }

    // 攻擊
    if (event.key === ' ') {
      event.preventDefault();
      game.attack();
    }

    // 技能
    if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      game.useSkill('moonSlash');
    }
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      game.useSkill('shadowClone');
    }
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      game.useSkill('nightDash');
    }
  });

  document.addEventListener('keyup', (event) => {
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      game.setKeyUp(event.key);
    }
  });

  // 滑鼠事件
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    game.setMousePosition(x, y);
  });

  canvas.addEventListener('click', () => {
    const state = game.getState();
    if (state.isPlaying && !state.gameOver) {
      game.attack();
    }
  });

  // 觸控事件
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.setMousePosition(x, y);

    const state = game.getState();
    if (state.isPlaying && !state.gameOver) {
      game.attack();
    }
  }, { passive: false });

  // 技能按鈕點擊
  skillButtons.moonSlash.addEventListener('click', () => {
    game.useSkill('moonSlash');
  });

  skillButtons.shadowClone.addEventListener('click', () => {
    game.useSkill('shadowClone');
  });

  skillButtons.nightDash.addEventListener('click', () => {
    game.useSkill('nightDash');
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

  console.log('🌙 月影刺客遊戲已載入！');
}

main();
