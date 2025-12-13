/**
 * 命運戰士遊戲主程式
 * Game #347 - Awesome Free Games 1000
 */

import { FateWarriorGame, type GameState, FateSkill, EnemyType } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-347-fate-warrior';
const GAME_NAME = 'Fate Warrior';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const waveElement = document.getElementById('wave')!;
const killsElement = document.getElementById('kills')!;
const healthBar = document.getElementById('health-bar')!;
const fateBar = document.getElementById('fate-bar')!;
const counterIndicator = document.getElementById('counter-indicator')!;
const skill1Btn = document.getElementById('skill-1-btn')!;
const skill2Btn = document.getElementById('skill-2-btn')!;
const skill3Btn = document.getElementById('skill-3-btn')!;
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
let game: FateWarriorGame;
let shootInterval: number | null = null;

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

  game = new FateWarriorGame({
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
  ctx.fillStyle = '#0a0014';
  ctx.fillRect(0, 0, width, height);

  // 繪製背景效果
  drawBackground(width, height, state);

  // 繪製投射物
  state.projectiles.forEach((projectile) => {
    ctx.save();

    // 投射物發光效果
    const gradient = ctx.createRadialGradient(
      projectile.x,
      projectile.y,
      0,
      projectile.x,
      projectile.y,
      projectile.radius * 2
    );
    gradient.addColorStop(0, projectile.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // 投射物本體
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    drawEnemy(enemy);
  });

  // 繪製玩家
  drawPlayer(state.player, state.fateCounterActive);
}

/**
 * 繪製背景
 */
function drawBackground(width: number, height: number, state: GameState) {
  // 星空背景
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    const x = (i * 123.456) % width;
    const y = ((i * 789.012 + state.timeSinceWaveStart * 20) % height);
    const size = (i % 3) + 1;
    ctx.globalAlpha = 0.3 + (i % 5) * 0.1;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;

  // 命運反擊效果
  if (state.fateCounterActive) {
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.3)';
    ctx.lineWidth = 2;
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
  }
}

/**
 * 繪製玩家
 */
function drawPlayer(player: any, counterActive: boolean) {
  ctx.save();

  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  // 無敵閃爍效果
  if (player.isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // 命運反擊光環
  if (counterActive) {
    const gradient = ctx.createRadialGradient(
      centerX, centerY, player.width / 2,
      centerX, centerY, player.width * 2
    );
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.5)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, player.width * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家本體（戰士形狀）
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#ffed4e';
  ctx.lineWidth = 3;

  // 身體
  ctx.beginPath();
  ctx.moveTo(centerX, player.y);
  ctx.lineTo(centerX - player.width / 3, centerY);
  ctx.lineTo(centerX - player.width / 4, player.y + player.height);
  ctx.lineTo(centerX + player.width / 4, player.y + player.height);
  ctx.lineTo(centerX + player.width / 3, centerY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 頭部
  ctx.beginPath();
  ctx.arc(centerX, player.y + player.height / 4, player.width / 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.stroke();

  // 武器光芒
  ctx.strokeStyle = counterActive ? '#8a2be2' : '#ffd700';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX, player.y);
  ctx.lineTo(centerX, player.y - 15);
  ctx.stroke();

  ctx.restore();
}

/**
 * 繪製敵人
 */
function drawEnemy(enemy: any) {
  ctx.save();

  const centerX = enemy.x + enemy.width / 2;
  const centerY = enemy.y + enemy.height / 2;

  // 敵人發光效果
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, enemy.width
  );
  gradient.addColorStop(0, enemy.color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, enemy.width, 0, Math.PI * 2);
  ctx.fill();

  // 敵人本體
  ctx.fillStyle = enemy.color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;

  if (enemy.type === EnemyType.BOSS) {
    // BOSS 特殊形狀
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = enemy.width / 2 + (i % 2) * 10;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    // 一般敵人
    ctx.beginPath();
    ctx.arc(centerX, centerY, enemy.width / 2, 0, Math.PI * 2);
  }

  ctx.fill();
  ctx.stroke();

  // 生命值條
  const healthPercent = enemy.health / enemy.maxHealth;
  const barWidth = enemy.width;
  const barHeight = 4;
  const barY = enemy.y - 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(enemy.x, barY, barWidth, barHeight);

  ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#ffe66d' : '#ff6b6b';
  ctx.fillRect(enemy.x, barY, barWidth * healthPercent, barHeight);

  ctx.restore();
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  waveElement.textContent = state.wave.toString();
  killsElement.textContent = state.kills.toString();

  // 更新生命條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${Math.max(0, healthPercent)}%`;
  healthBar.className = 'health-bar' + (healthPercent <= 25 ? ' low' : '');

  // 更新命運能量條
  const fatePercent = (state.player.fateEnergy / state.player.maxFateEnergy) * 100;
  fateBar.style.width = `${fatePercent}%`;

  // 更新技能按鈕
  updateSkillButton(skill1Btn, state.player.fateEnergy, 30);
  updateSkillButton(skill2Btn, state.player.fateEnergy, 50);
  updateSkillButton(skill3Btn, state.player.fateEnergy, 100);

  // 更新命運反擊指示器
  if (state.fateCounterActive) {
    counterIndicator.classList.add('active');
  } else {
    counterIndicator.classList.remove('active');
  }

  if (state.gameOver) {
    showGameOver(state.score, state.wave, state.kills);
  }
}

/**
 * 更新技能按鈕狀態
 */
function updateSkillButton(button: HTMLElement, energy: number, cost: number) {
  if (energy >= cost) {
    button.classList.remove('disabled');
  } else {
    button.classList.add('disabled');
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
  ctx.fillStyle = '#0a0014';
  ctx.fillRect(0, 0, width, height);

  // 繪製標題圖示
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#ffed4e';
  ctx.lineWidth = 3;

  const centerX = width / 2;
  const centerY = height / 2 - 30;

  // 戰士圖示
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 30);
  ctx.lineTo(centerX - 20, centerY);
  ctx.lineTo(centerX - 15, centerY + 40);
  ctx.lineTo(centerX + 15, centerY + 40);
  ctx.lineTo(centerX + 20, centerY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 頭部
  ctx.beginPath();
  ctx.arc(centerX, centerY - 20, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.stroke();

  // 命運符號
  ctx.strokeStyle = '#8a2be2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY + 80, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY + 80, 20, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 顯示遊戲結束
 */
function showGameOver(score: number, wave: number, kills: number) {
  gameOverlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameOver');
  finalScoreElement.innerHTML = `
    ${i18n.t('game.score')}: ${formatNumber(score)}<br>
    ${i18n.t('game.wave')}: ${wave}<br>
    ${i18n.t('game.kills')}: ${kills}
  `;
  finalScoreElement.parentElement!.style.display = 'block';
  retryBtn.style.display = 'inline-block';
  startBtn.style.display = 'none';

  if (shootInterval) {
    clearInterval(shootInterval);
    shootInterval = null;
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

  // 開始自動射擊
  if (shootInterval) clearInterval(shootInterval);
  shootInterval = window.setInterval(() => {
    game.playerShoot();
  }, 200);

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
    const state = game.getState();

    if (!state.isPlaying || state.gameOver) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        startGame();
      }
      return;
    }

    event.preventDefault();
    game.setKeyDown(event.key);

    // 技能快捷鍵
    if (event.key === '1') {
      game.useFateSkill(FateSkill.TIME_REWIND);
    } else if (event.key === '2') {
      game.useFateSkill(FateSkill.FATE_COUNTER);
    } else if (event.key === '3') {
      game.useFateSkill(FateSkill.FATE_FINISHER);
    }
  });

  document.addEventListener('keyup', (event) => {
    game.setKeyUp(event.key);
  });

  // 觸控控制（虛擬搖桿）
  if (isTouchDevice()) {
    let touchX = 0;
    let touchY = 0;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      touchX = e.touches[0].clientX - rect.left;
      touchY = e.touches[0].clientY - rect.top;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const newX = e.touches[0].clientX - rect.left;
      const newY = e.touches[0].clientY - rect.top;

      const dx = newX - touchX;
      const dy = newY - touchY;

      // 更新方向鍵
      game.setKeyUp('ArrowLeft');
      game.setKeyUp('ArrowRight');
      game.setKeyUp('ArrowUp');
      game.setKeyUp('ArrowDown');

      if (Math.abs(dx) > 10) {
        if (dx > 0) game.setKeyDown('ArrowRight');
        else game.setKeyDown('ArrowLeft');
      }
      if (Math.abs(dy) > 10) {
        if (dy > 0) game.setKeyDown('ArrowDown');
        else game.setKeyDown('ArrowUp');
      }

      touchX = newX;
      touchY = newY;
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      game.setKeyUp('ArrowLeft');
      game.setKeyUp('ArrowRight');
      game.setKeyUp('ArrowUp');
      game.setKeyUp('ArrowDown');
    });
  }
}

/**
 * 初始化事件監聽
 */
function initEventListeners() {
  initInputHandler();

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);

  // 技能按鈕
  skill1Btn.addEventListener('click', () => {
    game.useFateSkill(FateSkill.TIME_REWIND);
  });

  skill2Btn.addEventListener('click', () => {
    game.useFateSkill(FateSkill.FATE_COUNTER);
  });

  skill3Btn.addEventListener('click', () => {
    game.useFateSkill(FateSkill.FATE_FINISHER);
  });

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

  console.log('🎮 命運戰士遊戲已載入！');
}

main();
