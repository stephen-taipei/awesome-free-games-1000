/**
 * 征服者遊戲主程式
 * Game #353 - Awesome Free Games 1000
 */

import { ConquerorGame, type GameState, type Territory, type Enemy, type Skill } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-353-the-conqueror';
const GAME_NAME = 'The Conqueror';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const healthBar = document.getElementById('health-bar')!;
const conqueredElement = document.getElementById('conquered')!;
const levelElement = document.getElementById('level')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const retryBtn = document.getElementById('retry-btn')!;
const startBtn = document.getElementById('start-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const skill1Btn = document.getElementById('skill-1-btn')!;
const skill2Btn = document.getElementById('skill-2-btn')!;
const skill3Btn = document.getElementById('skill-3-btn')!;

// 遊戲實例
let game: ConquerorGame;

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

  game = new ConquerorGame({
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

  // 清空畫布 - 深色背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a0f2e');
  gradient.addColorStop(1, '#0f0520');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製領地
  state.territories.forEach((territory) => {
    renderTerritory(territory);
  });

  // 繪製敵人
  state.enemies.forEach((enemy) => {
    renderEnemy(enemy);
  });

  // 繪製玩家
  renderPlayer(state);

  // 繪製技能效果
  renderSkillEffects(state);
}

/**
 * 渲染領地
 */
function renderTerritory(territory: Territory) {
  // 領地範圍
  ctx.beginPath();
  ctx.arc(territory.x, territory.y, territory.radius, 0, Math.PI * 2);

  if (territory.conquered) {
    ctx.fillStyle = territory.color + '40';
  } else {
    ctx.fillStyle = territory.color + '20';
  }
  ctx.fill();

  // 領地邊界
  ctx.strokeStyle = territory.conquered ? territory.color : territory.color + '60';
  ctx.lineWidth = territory.conquered ? 3 : 2;
  ctx.stroke();

  // 佔領進度
  if (!territory.conquered && territory.captureProgress > 0) {
    ctx.beginPath();
    ctx.arc(
      territory.x,
      territory.y,
      territory.radius - 5,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * territory.captureProgress
    );
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // 領地中心標記
  ctx.beginPath();
  ctx.arc(territory.x, territory.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = territory.conquered ? '#ffd700' : '#888';
  ctx.fill();

  // 加成圖示
  ctx.fillStyle = territory.conquered ? '#fff' : '#aaa';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bonusIcon = territory.bonus === 'attack' ? '⚔' : territory.bonus === 'health' ? '❤' : '⚡';
  ctx.fillText(bonusIcon, territory.x, territory.y - territory.radius - 15);
}

/**
 * 渲染敵人
 */
function renderEnemy(enemy: Enemy) {
  if (enemy.health <= 0) return;

  // 敵人陰影
  ctx.beginPath();
  ctx.arc(enemy.x + 2, enemy.y + 2, enemy.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();

  // 敵人本體
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fillStyle = enemy.color;
  ctx.fill();

  // 敵人邊框
  ctx.strokeStyle = enemy.type === 'boss' ? '#ffaa00' : enemy.type === 'elite' ? '#ff6600' : '#ff0000';
  ctx.lineWidth = enemy.type === 'boss' ? 3 : 2;
  ctx.stroke();

  // Boss 王冠
  if (enemy.type === 'boss') {
    ctx.fillStyle = '#ffd700';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑', enemy.x, enemy.y - enemy.radius - 10);
  }

  // 生命條
  const barWidth = enemy.radius * 2;
  const barHeight = 4;
  const healthPercent = enemy.health / enemy.maxHealth;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth, barHeight);

  ctx.fillStyle = healthPercent > 0.5 ? '#1dd1a1' : healthPercent > 0.25 ? '#feca57' : '#ff6b6b';
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth * healthPercent, barHeight);
}

/**
 * 渲染玩家
 */
function renderPlayer(state: GameState) {
  const player = state.player;

  // 統御光環效果
  const auraSkill = state.skills.find((s) => s.id === 'aura');
  if (auraSkill?.active) {
    const pulseSize = 100 + Math.sin(Date.now() / 200) * 10;
    const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, pulseSize);
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.3)');
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 玩家陰影
  ctx.beginPath();
  ctx.arc(player.x + 3, player.y + 3, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  // 玩家光環
  const gradient = ctx.createRadialGradient(
    player.x,
    player.y,
    player.radius,
    player.x,
    player.y,
    player.radius + 15
  );
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
  ctx.fill();

  // 玩家本體
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.fill();

  // 玩家邊框
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 皇冠標誌
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', player.x, player.y);
}

/**
 * 渲染技能效果
 */
function renderSkillEffects(state: GameState) {
  const player = state.player;

  // 軍團召喚效果
  const summonSkill = state.skills.find((s) => s.id === 'summon');
  if (summonSkill?.active) {
    const summonRadius = 150;
    const particles = 20;

    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2 + Date.now() / 500;
      const x = player.x + Math.cos(angle) * summonRadius;
      const y = player.y + Math.sin(angle) * summonRadius;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.fill();
    }

    // 範圍圈
    ctx.beginPath();
    ctx.arc(player.x, player.y, summonRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);
  levelElement.textContent = state.level.toString();
  conqueredElement.textContent = `${state.player.conqueredTerritories}/${state.totalTerritories}`;

  // 更新生命條
  const healthPercent = (state.player.health / state.player.maxHealth) * 100;
  healthBar.style.width = `${Math.max(0, healthPercent)}%`;

  if (healthPercent > 50) {
    healthBar.style.background = 'linear-gradient(90deg, #1dd1a1, #48dbfb)';
  } else if (healthPercent > 25) {
    healthBar.style.background = 'linear-gradient(90deg, #feca57, #ff9ff3)';
  } else {
    healthBar.style.background = 'linear-gradient(90deg, #ff6b6b, #ff3838)';
  }

  // 更新技能按鈕
  updateSkillButtons(state.skills);

  if (state.gameOver) {
    showGameOver(state.score);
  }
}

/**
 * 更新技能按鈕
 */
function updateSkillButtons(skills: Skill[]) {
  const buttons = [skill1Btn, skill2Btn, skill3Btn];

  skills.forEach((skill, index) => {
    const btn = buttons[index];
    if (!btn) return;

    if (skill.active) {
      btn.classList.add('active');
      btn.textContent = `${skill.name} (${skill.activeDuration.toFixed(1)}s)`;
    } else if (skill.currentCooldown > 0) {
      btn.classList.remove('active');
      btn.disabled = true;
      btn.textContent = `${skill.name} (${skill.currentCooldown.toFixed(1)}s)`;
    } else {
      btn.classList.remove('active');
      btn.disabled = false;
      btn.textContent = skill.name;
    }
  });
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
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a0f2e');
  gradient.addColorStop(1, '#0f0520');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製標題藝術
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', width / 2, height / 2 - 40);

  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText(i18n.t('game.title'), width / 2, height / 2 + 20);
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
  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      const pos = getPosition(e.touches[0]);
      game.setMousePosition(pos.x, pos.y);
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      const pos = getPosition(e.touches[0]);
      game.setMousePosition(pos.x, pos.y);
    },
    { passive: false }
  );

  // 技能按鈕
  skill1Btn.addEventListener('click', () => game.useSkill('expand'));
  skill2Btn.addEventListener('click', () => game.useSkill('summon'));
  skill3Btn.addEventListener('click', () => game.useSkill('aura'));

  // 鍵盤快捷鍵
  document.addEventListener('keydown', (event) => {
    const state = game.getState();
    if (!state.isPlaying || state.gameOver) {
      if (event.key === ' ' || event.key === 'Enter') {
        startGame();
      }
      return;
    }

    if (event.key === '1') game.useSkill('expand');
    if (event.key === '2') game.useSkill('summon');
    if (event.key === '3') game.useSkill('aura');
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

  console.log('🎮 征服者遊戲已載入！');
}

main();
