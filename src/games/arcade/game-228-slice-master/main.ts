/**
 * 切割大師遊戲主程式
 * Game #228 - Awesome Free Games 1000
 */

import { SliceMasterGame, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-228-slice-master';
const GAME_NAME = 'Slice Master';
const GAME_CATEGORY = 'arcade';

// DOM 元素
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const bestScoreElement = document.getElementById('best-score')!;
const comboElement = document.getElementById('combo')!;
const livesElement = document.getElementById('lives')!;
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
let game: SliceMasterGame;

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

  game = new SliceMasterGame({
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

  // 清空畫布 - 木板背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#3d2914');
  gradient.addColorStop(1, '#2a1d0d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製木紋
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // 繪製物件
  state.objects.forEach((obj) => {
    if (obj.sliced) return;

    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.rotation);

    if (obj.type === 'bomb') {
      // 繪製炸彈
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#2c3e50';
      ctx.fill();

      // 炸彈引線
      ctx.beginPath();
      ctx.moveTo(0, -obj.radius);
      ctx.lineTo(0, -obj.radius - 15);
      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 火花
      ctx.beginPath();
      ctx.arc(0, -obj.radius - 18, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b6b';
      ctx.fill();
    } else {
      // 繪製水果
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.fill();

      // 高光
      ctx.beginPath();
      ctx.arc(-obj.radius * 0.3, -obj.radius * 0.3, obj.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // 葉子
      ctx.beginPath();
      ctx.ellipse(0, -obj.radius - 5, 8, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#27ae60';
      ctx.fill();
    }

    ctx.restore();
  });

  // 繪製切片部分
  state.sliceParts.forEach((part) => {
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rotation);

    // 半圓形切片
    ctx.beginPath();
    ctx.arc(0, 0, part.width, 0, Math.PI);
    ctx.fillStyle = part.color;
    ctx.fill();

    // 內部顏色（果肉）
    ctx.beginPath();
    ctx.arc(0, 0, part.width * 0.8, 0, Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    ctx.restore();
  });

  // 繪製切割線
  state.sliceLines.forEach((line) => {
    if (line.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(line.points[0].x, line.points[0].y);

    for (let i = 1; i < line.points.length; i++) {
      ctx.lineTo(line.points[i].x, line.points[i].y);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 發光效果
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 8;
    ctx.stroke();
  });
}

/**
 * 更新 UI
 */
function updateUI(state: GameState) {
  scoreElement.textContent = formatNumber(state.score);
  bestScoreElement.textContent = formatNumber(state.bestScore);

  if (state.combo > 1) {
    comboElement.textContent = `x${state.combo}`;
    comboElement.style.display = 'block';
  } else {
    comboElement.style.display = 'none';
  }

  // 更新生命
  livesElement.textContent = '❤️'.repeat(state.lives);

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

  // 繪製初始畫面
  const { width, height } = canvas.getBoundingClientRect();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#3d2914');
  gradient.addColorStop(1, '#2a1d0d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 繪製示意水果
  const fruits = ['#ff6b6b', '#ffd93d', '#6bcb77', '#ff9f43', '#a55eea'];
  fruits.forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(width / 2 - 80 + i * 40, height / 2, 20, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
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
 * 取得滑鼠/觸控位置
 */
function getPosition(event: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * 初始化觸控/滑鼠事件
 */
function initInputHandler() {
  let isSlicing = false;

  // 滑鼠事件
  canvas.addEventListener('mousedown', (e) => {
    isSlicing = true;
    const pos = getPosition(e);
    game.startSlice(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isSlicing) return;
    const pos = getPosition(e);
    game.continueSlice(pos.x, pos.y);
  });

  canvas.addEventListener('mouseup', () => {
    isSlicing = false;
    game.endSlice();
  });

  canvas.addEventListener('mouseleave', () => {
    isSlicing = false;
    game.endSlice();
  });

  // 觸控事件
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isSlicing = true;
    const pos = getPosition(e.touches[0]);
    game.startSlice(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isSlicing) return;
    const pos = getPosition(e.touches[0]);
    game.continueSlice(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isSlicing = false;
    game.endSlice();
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
    if (event.key === ' ' || event.key === 'Enter') {
      const state = game.getState();
      if (!state.isPlaying || state.gameOver) {
        startGame();
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

  console.log('🎮 切割大師遊戲已載入！');
}

main();
