/**
 * 傳送帶工廠遊戲主程式
 * Game #232 - Awesome Free Games 1000
 */

import { ConveyorFactoryGame, ITEM_COLORS, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-232-conveyor-factory';
const GAME_NAME = 'Conveyor Factory';
const GAME_CATEGORY = 'arcade';

// Canvas 尺寸
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

// DOM 元素
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const scoreElement = document.getElementById('score')!;
const highScoreElement = document.getElementById('high-score')!;
const levelElement = document.getElementById('level')!;
const livesElement = document.getElementById('lives')!;
const comboElement = document.getElementById('combo')!;
const gameOverlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const finalScoreElement = document.getElementById('final-score')!;
const newGameBtn = document.getElementById('new-game-btn')!;
const pauseBtn = document.getElementById('pause-btn')!;
const retryBtn = document.getElementById('retry-btn')!;
const helpBtn = document.getElementById('help-btn')!;
const helpModal = document.getElementById('help-modal')!;
const modalClose = document.getElementById('modal-close')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

// Canvas context
const ctx = gameCanvas.getContext('2d')!;

// 遊戲實例
let game: ConveyorFactoryGame;
let currentCombo = 0;

/**
 * 初始化畫布尺寸
 */
function initCanvas(): void {
  const dpr = window.devicePixelRatio || 1;

  gameCanvas.width = CANVAS_WIDTH * dpr;
  gameCanvas.height = CANVAS_HEIGHT * dpr;
  gameCanvas.style.width = `${CANVAS_WIDTH}px`;
  gameCanvas.style.height = `${CANVAS_HEIGHT}px`;
  ctx.scale(dpr, dpr);
}

/**
 * 初始化語言
 */
function initI18n(): void {
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
function updateI18nTexts(): void {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')!;
    element.textContent = i18n.t(key);
  });
  document.documentElement.lang = i18n.getLocale();
}

/**
 * 初始化遊戲
 */
function initGame(): void {
  game = new ConveyorFactoryGame({
    conveyorY: 200,
    itemSize: 40,
    containerSize: 60,
    initialSpeed: 1,
    speedIncrement: 0.2,
    spawnInterval: 2000,
    maxLives: 5,
  });

  game.setOnStateChange((state) => {
    updateUI(state);
    render(state);
  });

  game.setOnItemSorted((correct) => {
    if (correct) {
      currentCombo++;
      showFeedback('correct');
    } else {
      currentCombo = 0;
      showFeedback('wrong');
    }
  });

  game.setOnLevelUp((level) => {
    showLevelUpEffect(level);
    analytics.custom('conveyor_level_up', {
      game_id: GAME_ID,
      game_name: GAME_NAME,
      level,
    });
  });

  game.newGame();

  analytics.gameStart({
    game_id: GAME_ID,
    game_name: GAME_NAME,
    category: GAME_CATEGORY,
  });
}

/**
 * 更新 UI
 */
function updateUI(state: GameState): void {
  scoreElement.textContent = formatNumber(state.score);
  highScoreElement.textContent = formatNumber(state.highScore);
  levelElement.textContent = state.level.toString();
  livesElement.textContent = '❤️'.repeat(state.lives);

  if (currentCombo > 1) {
    comboElement.textContent = `${i18n.t('game.comboText')}${currentCombo}`;
    comboElement.style.display = 'block';
  } else {
    comboElement.style.display = 'none';
  }

  // 更新暫停按鈕文字
  pauseBtn.textContent = state.isPaused ? i18n.t('game.resume') : i18n.t('game.pause');

  // 處理遊戲結束或暫停
  if (state.gameOver) {
    showOverlay('gameover', state.score);

    analytics.gameEnd({
      game_id: GAME_ID,
      game_name: GAME_NAME,
      score: state.score,
      duration: game.getPlayTime(),
    });
  } else if (state.isPaused) {
    showOverlay('paused', state.score);
  } else {
    hideOverlay();
  }
}

/**
 * 渲染遊戲
 */
function render(state: GameState): void {
  const config = game.getConfig();

  // 清除畫布
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 繪製背景工廠場景
  drawFactory();

  // 繪製傳送帶
  drawConveyor(config.conveyorY);

  // 繪製容器
  drawContainers(state);

  // 繪製物品
  state.items.forEach((item) => {
    drawItem(item);
  });

  // 繪製分類區域指示
  drawSortingZone();
}

/**
 * 繪製工廠背景
 */
function drawFactory(): void {
  // 繪製背景牆壁
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 150);

  // 繪製地板
  ctx.fillStyle = '#3a3a4e';
  ctx.fillRect(0, 450, CANVAS_WIDTH, 150);

  // 繪製工廠線條裝飾
  ctx.strokeStyle = '#4a4a5e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 30 + i * 25);
    ctx.lineTo(CANVAS_WIDTH, 30 + i * 25);
    ctx.stroke();
  }
}

/**
 * 繪製傳送帶
 */
function drawConveyor(y: number): void {
  // 傳送帶主體
  ctx.fillStyle = '#555';
  ctx.fillRect(0, y - 20, CANVAS_WIDTH, 40);

  // 傳送帶邊緣
  ctx.fillStyle = '#333';
  ctx.fillRect(0, y - 25, CANVAS_WIDTH, 5);
  ctx.fillRect(0, y + 20, CANVAS_WIDTH, 5);

  // 傳送帶滾輪效果
  ctx.fillStyle = '#666';
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    ctx.fillRect(x, y - 15, 30, 30);
  }
}

/**
 * 繪製容器
 */
function drawContainers(state: GameState): void {
  state.containers.forEach((container) => {
    const x = 50 + container.position * 100;
    const y = 520;
    const size = 60;

    // 容器外框
    ctx.strokeStyle = ITEM_COLORS[container.type];
    ctx.lineWidth = 4;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);

    // 容器內部
    ctx.fillStyle = ITEM_COLORS[container.type] + '33';
    ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size - 8, size - 8);

    // 容器標籤
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText((container.position + 1).toString(), x, y + size / 2 + 8);

    // 容器計數
    if (container.count > 0) {
      ctx.fillStyle = ITEM_COLORS[container.type];
      ctx.font = 'bold 16px Arial';
      ctx.fillText(container.count.toString(), x, y);
    }
  });
}

/**
 * 繪製物品
 */
function drawItem(item: any): void {
  const x = item.x;
  const y = item.y;
  const size = item.width;

  // 物品陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + size / 2 + 5, size / 2, size / 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 物品主體（圓形）
  ctx.fillStyle = ITEM_COLORS[item.type];
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // 物品高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(x - size / 6, y - size / 6, size / 4, 0, Math.PI * 2);
  ctx.fill();

  // 物品邊框
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 繪製分類區域指示
 */
function drawSortingZone(): void {
  // 分類區域半透明高亮
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 400, CANVAS_WIDTH, 150);

  // 分類區域頂部線條
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(0, 400);
  ctx.lineTo(CANVAS_WIDTH, 400);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * 顯示反饋效果
 */
function showFeedback(type: 'correct' | 'wrong'): void {
  const message = type === 'correct' ? i18n.t('game.correctSort') : i18n.t('game.wrongSort');
  const color = type === 'correct' ? '#44ff44' : '#ff4444';

  const effect = document.createElement('div');
  effect.className = 'feedback-effect';
  effect.textContent = message;
  effect.style.color = color;
  effect.style.textShadow = `0 0 20px ${color}`;
  document.body.appendChild(effect);

  setTimeout(() => effect.remove(), 800);
}

/**
 * 顯示升級效果
 */
function showLevelUpEffect(level: number): void {
  const effect = document.createElement('div');
  effect.className = 'levelup-effect';
  effect.textContent = `${i18n.t('game.levelUp')} ${level}`;
  document.body.appendChild(effect);

  setTimeout(() => effect.remove(), 1500);
}

/**
 * 顯示覆蓋層
 */
function showOverlay(type: 'gameover' | 'paused', score: number): void {
  gameOverlay.style.display = 'flex';
  finalScoreElement.textContent = formatNumber(score);

  if (type === 'gameover') {
    overlayTitle.textContent = i18n.t('game.gameOver');
  } else {
    overlayTitle.textContent = i18n.t('game.paused');
  }
}

/**
 * 隱藏覆蓋層
 */
function hideOverlay(): void {
  gameOverlay.style.display = 'none';
}

/**
 * 處理鍵盤輸入
 */
function handleKeyDown(event: KeyboardEvent): void {
  // 防止在輸入框中觸發
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    return;
  }

  switch (event.key) {
    case '1':
      event.preventDefault();
      game.sortItem(0);
      break;
    case '2':
      event.preventDefault();
      game.sortItem(1);
      break;
    case '3':
      event.preventDefault();
      game.sortItem(2);
      break;
    case '4':
      event.preventDefault();
      game.sortItem(3);
      break;
    case '5':
      event.preventDefault();
      game.sortItem(4);
      break;
    case 'p':
    case 'P':
    case 'Escape':
      event.preventDefault();
      game.togglePause();
      break;
  }
}

/**
 * 處理 Canvas 點擊
 */
function handleCanvasClick(event: MouseEvent): void {
  const rect = gameCanvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  // 檢查是否點擊容器區域
  if (y >= 490 && y <= 590) {
    const containerIndex = Math.floor((x - 20) / 100);
    if (containerIndex >= 0 && containerIndex < 5) {
      game.sortItem(containerIndex);
    }
  }
}

/**
 * 處理觸控事件
 */
function handleTouchStart(event: TouchEvent): void {
  event.preventDefault();
  const touch = event.touches[0];
  const rect = gameCanvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;

  // 檢查是否點擊容器區域
  if (y >= 490 && y <= 590) {
    const containerIndex = Math.floor((x - 20) / 100);
    if (containerIndex >= 0 && containerIndex < 5) {
      game.sortItem(containerIndex);
    }
  }
}

/**
 * 初始化事件監聽
 */
function initEventListeners(): void {
  document.addEventListener('keydown', handleKeyDown);
  gameCanvas.addEventListener('click', handleCanvasClick);
  gameCanvas.addEventListener('touchstart', handleTouchStart);

  newGameBtn.addEventListener('click', () => {
    game.destroy();
    hideOverlay();
    currentCombo = 0;
    initGame();
  });

  pauseBtn.addEventListener('click', () => {
    game.togglePause();
  });

  retryBtn.addEventListener('click', () => {
    game.destroy();
    hideOverlay();
    currentCombo = 0;
    initGame();
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
    if (event.key === 'Escape' && helpModal.style.display === 'flex') {
      helpModal.style.display = 'none';
    }
  });
}

/**
 * 主程式入口
 */
function main(): void {
  const measurementId = import.meta.env?.VITE_GA_MEASUREMENT_ID;
  if (measurementId) {
    analytics.init(measurementId);
  }

  initCanvas();
  initI18n();
  initEventListeners();
  initGame();

  console.log('🏭 傳送帶工廠遊戲已載入！');
  console.log('🎮 按數字鍵 1-5 或點擊容器來分類物品');
}

main();
