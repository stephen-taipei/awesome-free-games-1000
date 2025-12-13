/**
 * 守護者遊戲主程式
 * Game #351 - Awesome Free Games 1000
 */

import { GuardianGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-351-the-guardian';
const GAME_NAME = 'The Guardian';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const waveElement = document.getElementById('wave')!;
const healthBar = document.getElementById('health-bar')!;
const shieldBar = document.getElementById('shield-bar')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const finalWaveElement = document.getElementById('final-wave')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

// 技能按鈕
const skillShieldBtn = document.getElementById('skill-shield')!;
const skillDefenseBtn = document.getElementById('skill-defense')!;
const skillStormBtn = document.getElementById('skill-storm')!;

// 遊戲實例
let game: GuardianGame;

// 按鍵狀態
const keys: { [key: string]: boolean } = {};

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

  game = new GuardianGame({
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
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // 繪製背景網格
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let i = 0; i < width; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // 繪製核心光環
  const coreGradient = ctx.createRadialGradient(
    state.core.x, state.core.y, state.core.radius,
    state.core.x, state.core.y, state.core.radius * 2.5
  );
  coreGradient.addColorStop(0, 'rgba(100, 200, 255, 0.2)');
  coreGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(state.core.x, state.core.y, state.core.radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 繪製核心護盾
  if (state.core.shield > 0) {
    const shieldAlpha = state.activeSkills.shield ? 0.4 : 0.2;
    ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
    ctx.lineWidth = state.activeSkills.shield ? 4 : 2;
    ctx.beginPath();
    ctx.arc(state.core.x, state.core.y, state.core.radius + 10, 0, Math.PI * 2);
    ctx.stroke();

    // 護盾脈衝效果
    if (state.activeSkills.shield) {
      const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
      ctx.strokeStyle = `rgba(100, 200, 255, ${0.3 * pulse})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(state.core.x, state.core.y, state.core.radius + 15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 繪製核心
  ctx.beginPath();
  ctx.arc(state.core.x, state.core.y, state.core.radius, 0, Math.PI * 2);
  const healthPercent = state.core.health / state.core.maxHealth;
  const coreColor = healthPercent > 0.5 ? '#64c8ff' : healthPercent > 0.25 ? '#feca57' : '#ff6b6b';
  ctx.fillStyle = coreColor;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 核心中心光點
  ctx.beginPath();
  ctx.arc(state.core.x, state.core.y, state.core.radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 繪製守護者軌道
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(state.core.x, state.core.y, state.player.orbitRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 繪製守護者
  const playerX = state.core.x + Math.cos(state.player.angle) * state.player.orbitRadius;
  const playerY = state.core.y + Math.sin(state.player.angle) * state.player.orbitRadius;

  // 守護者光環
  const playerGradient = ctx.createRadialGradient(
    playerX, playerY, state.player.radius,
    playerX, playerY, state.player.radius * 2.5
  );
  playerGradient.addColorStop(0, 'rgba(100, 255, 200, 0.3)');
  playerGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = playerGradient;
  ctx.beginPath();
  ctx.arc(playerX, playerY, state.player.radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 全方位防禦技能效果
  if (state.activeSkills.defense) {
    const defenseRadius = state.player.orbitRadius * 1.5;
    const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.6;
    ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.core.x, state.core.y, defenseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 守護者本體
  ctx.beginPath();
  ctx.arc(playerX, playerY, state.player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#64ffc8';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 守護者方向指示器
  const dirX = playerX + Math.cos(state.player.angle) * state.player.radius * 1.5;
  const dirY = playerY + Math.sin(state.player.angle) * state.player.radius * 1.5;
  ctx.beginPath();
  ctx.moveTo(playerX, playerY);
  ctx.lineTo(dirX, dirY);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 繪製投射物
  state.projectiles.forEach((proj) => {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#64ffc8';
    ctx.fill();

    // 發光效果
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 255, 200, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    // 敵人光環
    const enemyGradient = ctx.createRadialGradient(
      enemy.x, enemy.y, enemy.radius,
      enemy.x, enemy.y, enemy.radius * 2
    );
    enemyGradient.addColorStop(0, `${enemy.color}80`);
    enemyGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = enemyGradient;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // 敵人本體
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 生命條（重型敵人）
    if (enemy.type === 'heavy') {
      const barWidth = enemy.radius * 2;
      const barHeight = 4;
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - enemy.radius - 10;
      const healthPercent = enemy.health / 3;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
  });

  // 繪製粒子效果
  state.particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.fill();
  });

  // 繪製反擊風暴效果
  if (state.activeSkills.storm) {
    const stormRadius = state.player.orbitRadius * 0.8;
    const rotation = (Date.now() / 100) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 255, 200, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = rotation + (Math.PI * 2 * i) / 8;
      const startX = state.core.x + Math.cos(angle) * state.player.orbitRadius;
      const startY = state.core.y + Math.sin(angle) * state.player.orbitRadius;
      const endX = state.core.x + Math.cos(angle) * stormRadius * 1.5;
      const endY = state.core.y + Math.sin(angle) * stormRadius * 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
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

  // 更新生命值和護盾條
  const healthPercent = (state.core.health / state.core.maxHealth) * 100;
  const shieldPercent = (state.core.shield / state.core.maxShield) * 100;
  healthBar.style.width = `${healthPercent}%`;
  shieldBar.style.width = `${shieldPercent}%`;

  // 更新技能按鈕
  updateSkillButton('shield', state);
  updateSkillButton('defense', state);
  updateSkillButton('storm', state);

  if (state.gameOver) {
    showGameOver(state.score, state.wave);
  }
}

/**
 * 更新技能按鈕
 */
function updateSkillButton(skill: 'shield' | 'defense' | 'storm', state: GameState) {
  const btnId = `skill-${skill}`;
  const btn = document.getElementById(btnId)!;
  const cooldownElement = btn.querySelector('.skill-cooldown')!;

  if (state.activeSkills[skill]) {
    btn.classList.add('active');
    btn.classList.remove('cooldown');
    const timeLeft = Math.ceil(state.skillDurations[skill]);
    cooldownElement.textContent = `${timeLeft}s`;
  } else if (state.skillCooldowns[skill] > 0) {
    btn.classList.remove('active');
    btn.classList.add('cooldown');
    const timeLeft = Math.ceil(state.skillCooldowns[skill]);
    cooldownElement.textContent = `${timeLeft}s`;
  } else {
    btn.classList.remove('active', 'cooldown');
    cooldownElement.textContent = '';
  }
}

/**
 * 顯示開始畫面
 */
function showStartScreen() {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.tapToStart');
  finalScoreElement.parentElement!.style.display = 'none';
  finalWaveElement.parentElement!.style.display = 'none';
  retryBtn.style.display = 'none';
  startBtn.style.display = 'inline-block';

  const { width, height } = canvas.getBoundingClientRect();
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  // 繪製示意圖
  const centerX = width / 2;
  const centerY = height / 2;

  // 核心
  ctx.beginPath();
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#64c8ff';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 守護者軌道
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 守護者
  const guardianX = centerX + Math.cos(0) * 80;
  const guardianY = centerY + Math.sin(0) * 80;
  ctx.beginPath();
  ctx.arc(guardianX, guardianY, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#64ffc8';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 敵人示意
  const enemyPositions = [
    { x: centerX + 120, y: centerY - 80 },
    { x: centerX - 120, y: centerY + 80 },
    { x: centerX + 100, y: centerY + 100 },
  ];
  enemyPositions.forEach((pos) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b6b';
    ctx.fill();
  });
}

/**
 * 顯示遊戲結束
 */
function showGameOver(score: number, wave: number) {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameOver');
  finalScoreElement.textContent = formatNumber(score);
  finalWaveElement.textContent = wave.toString();
  finalScoreElement.parentElement!.style.display = 'block';
  finalWaveElement.parentElement!.style.display = 'block';
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
  // 鍵盤控制
  document.addEventListener('keydown', (event) => {
    keys[event.key] = true;

    // 技能快捷鍵
    if (event.key === 'q' || event.key === 'Q') {
      game.useSkill('shield');
    }
    if (event.key === 'w' || event.key === 'W') {
      game.useSkill('defense');
    }
    if (event.key === 'e' || event.key === 'E') {
      game.useSkill('storm');
    }

    // 暫停
    if (event.key === ' ') {
      event.preventDefault();
      const state = game.getState();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      } else {
        game.togglePause();
      }
    }

    // 開始遊戲
    if (event.key === 'Enter') {
      const state = game.getState();
      if (!state.isPlaying || state.gameOver) {
        startGame();
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
  });

  // 持續移動
  setInterval(() => {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      game.movePlayer('left');
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      game.movePlayer('right');
    }
  }, 16);

  // 觸控控制
  let touchStartX = 0;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    if (touchX < touchStartX - 10) {
      game.movePlayer('left');
      touchStartX = touchX;
    } else if (touchX > touchStartX + 10) {
      game.movePlayer('right');
      touchStartX = touchX;
    }
  }, { passive: false });
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

  // 技能按鈕點擊
  skillShieldBtn.addEventListener('click', () => game.useSkill('shield'));
  skillDefenseBtn.addEventListener('click', () => game.useSkill('defense'));
  skillStormBtn.addEventListener('click', () => game.useSkill('storm'));

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

  console.log('🛡️ 守護者遊戲已載入！');
}

main();
