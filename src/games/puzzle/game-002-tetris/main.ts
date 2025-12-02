/**
 * 俄羅斯方塊遊戲主程式
 * Game #002 - Awesome Free Games 1000
 */

import { TetrisGame, TETROMINOES, TETROMINO_COLORS, type TetrominoType, type GameState } from './game';
import { translations } from './i18n';
import { analytics } from '../../../shared/analytics';
import { formatNumber, isTouchDevice } from '../../../shared/utils';
import { i18n, type Locale } from '../../../shared/i18n';

// 遊戲常數
const GAME_ID = 'game-002-tetris';
const GAME_NAME = 'Tetris';
const GAME_CATEGORY = 'puzzle';

// 遊戲設定
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 28;

// DOM 元素
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;
const scoreElement = document.getElementById('score')!;
const levelElement = document.getElementById('level')!;
const linesElement = document.getElementById('lines')!;
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
const touchControls = document.getElementById('touch-controls')!;

// Canvas contexts
const ctx = gameCanvas.getContext('2d')!;
const nextCtx = nextCanvas.getContext('2d')!;
const holdCtx = holdCanvas.getContext('2d')!;

// 遊戲實例
let game: TetrisGame;

/**
 * 初始化畫布尺寸
 */
function initCanvas(): void {
  const dpr = window.devicePixelRatio || 1;

  // 主遊戲畫布
  gameCanvas.width = BOARD_WIDTH * CELL_SIZE * dpr;
  gameCanvas.height = BOARD_HEIGHT * CELL_SIZE * dpr;
  gameCanvas.style.width = `${BOARD_WIDTH * CELL_SIZE}px`;
  gameCanvas.style.height = `${BOARD_HEIGHT * CELL_SIZE}px`;
  ctx.scale(dpr, dpr);

  // 預覽畫布
  const previewSize = 80;
  nextCanvas.width = previewSize * dpr;
  nextCanvas.height = previewSize * dpr;
  nextCanvas.style.width = `${previewSize}px`;
  nextCanvas.style.height = `${previewSize}px`;
  nextCtx.scale(dpr, dpr);

  holdCanvas.width = previewSize * dpr;
  holdCanvas.height = previewSize * dpr;
  holdCanvas.style.width = `${previewSize}px`;
  holdCanvas.style.height = `${previewSize}px`;
  holdCtx.scale(dpr, dpr);
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
  game = new TetrisGame({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    initialLevel: 1,
  });

  game.setOnStateChange((state) => {
    updateUI(state);
    render(state);
  });

  game.setOnLineClear((lines) => {
    showLineClearEffect(lines);

    // 追蹤消行事件
    if (lines === 4) {
      analytics.custom('tetris_clear', {
        game_id: GAME_ID,
        game_name: GAME_NAME,
        lines: 4,
      });
    }
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
  levelElement.textContent = state.level.toString();
  linesElement.textContent = formatNumber(state.lines);

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
  ctx.fillStyle = '#0a0a15';
  ctx.fillRect(0, 0, config.width * CELL_SIZE, config.height * CELL_SIZE);

  // 繪製網格線
  ctx.strokeStyle = '#1a1a30';
  ctx.lineWidth = 1;
  for (let x = 0; x <= config.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, config.height * CELL_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= config.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(config.width * CELL_SIZE, y * CELL_SIZE);
    ctx.stroke();
  }

  // 繪製已放置的方塊
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      const cell = state.board[y][x];
      if (cell) {
        drawCell(ctx, x, y, TETROMINO_COLORS[cell]);
      }
    }
  }

  // 繪製影子（預覽落點）
  if (state.currentPiece) {
    const ghostPos = game.getGhostPosition();
    if (ghostPos) {
      const shape = TETROMINOES[state.currentPiece.type][state.currentPiece.rotation];
      ctx.globalAlpha = 0.3;
      for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
          if (shape[py][px]) {
            drawCell(ctx, ghostPos.x + px, ghostPos.y + py, TETROMINO_COLORS[state.currentPiece.type]);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // 繪製當前方塊
    const piece = state.currentPiece;
    const shape = TETROMINOES[piece.type][piece.rotation];
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          drawCell(ctx, piece.position.x + px, piece.position.y + py, TETROMINO_COLORS[piece.type]);
        }
      }
    }
  }

  // 繪製下一個方塊預覽
  renderPreview(nextCtx, state.nextPiece);

  // 繪製暫存方塊預覽
  if (state.holdPiece) {
    renderPreview(holdCtx, state.holdPiece, !state.canHold);
  } else {
    holdCtx.fillStyle = '#0a0a15';
    holdCtx.fillRect(0, 0, 80, 80);
  }
}

/**
 * 繪製單個方塊格子
 */
function drawCell(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const padding = 2;
  const size = CELL_SIZE - padding * 2;

  context.fillStyle = color;
  context.fillRect(x * CELL_SIZE + padding, y * CELL_SIZE + padding, size, size);

  // 高光效果
  context.fillStyle = 'rgba(255, 255, 255, 0.3)';
  context.fillRect(x * CELL_SIZE + padding, y * CELL_SIZE + padding, size, 4);
  context.fillRect(x * CELL_SIZE + padding, y * CELL_SIZE + padding, 4, size);

  // 陰影效果
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.fillRect(x * CELL_SIZE + padding, y * CELL_SIZE + CELL_SIZE - padding - 4, size, 4);
  context.fillRect(x * CELL_SIZE + CELL_SIZE - padding - 4, y * CELL_SIZE + padding, 4, size);
}

/**
 * 渲染預覽方塊
 */
function renderPreview(context: CanvasRenderingContext2D, type: TetrominoType, dimmed = false): void {
  const shape = TETROMINOES[type][0];
  const previewCellSize = 18;
  const canvasSize = 80;

  context.fillStyle = '#0a0a15';
  context.fillRect(0, 0, canvasSize, canvasSize);

  const offsetX = (canvasSize - shape[0].length * previewCellSize) / 2;
  const offsetY = (canvasSize - shape.length * previewCellSize) / 2;

  if (dimmed) {
    context.globalAlpha = 0.4;
  }

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const px = offsetX + x * previewCellSize;
        const py = offsetY + y * previewCellSize;
        const padding = 1;
        const size = previewCellSize - padding * 2;

        context.fillStyle = TETROMINO_COLORS[type];
        context.fillRect(px + padding, py + padding, size, size);
      }
    }
  }

  context.globalAlpha = 1;
}

/**
 * 顯示消行特效
 */
function showLineClearEffect(lines: number): void {
  const messages: Record<number, string> = {
    1: i18n.t('game.single'),
    2: i18n.t('game.double'),
    3: i18n.t('game.triple'),
    4: i18n.t('game.tetris'),
  };

  const message = messages[lines] || `${lines} Lines!`;
  const effect = document.createElement('div');
  effect.className = 'line-clear-effect';
  effect.textContent = message;
  document.body.appendChild(effect);

  setTimeout(() => effect.remove(), 800);
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
    case 'ArrowLeft':
    case 'a':
    case 'A':
      event.preventDefault();
      game.move('left');
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      event.preventDefault();
      game.move('right');
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      event.preventDefault();
      game.move('down');
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      event.preventDefault();
      game.rotate(true);
      break;
    case 'z':
    case 'Z':
      event.preventDefault();
      game.rotate(false);
      break;
    case ' ':
      event.preventDefault();
      game.hardDrop();
      break;
    case 'c':
    case 'C':
      event.preventDefault();
      game.hold();
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
 * 初始化觸控控制
 */
function initTouchControls(): void {
  if (isTouchDevice()) {
    touchControls.style.display = 'flex';
  }

  document.getElementById('touch-left')?.addEventListener('click', () => game.move('left'));
  document.getElementById('touch-right')?.addEventListener('click', () => game.move('right'));
  document.getElementById('touch-down')?.addEventListener('click', () => game.move('down'));
  document.getElementById('touch-rotate')?.addEventListener('click', () => game.rotate(true));
  document.getElementById('touch-drop')?.addEventListener('click', () => game.hardDrop());
  document.getElementById('touch-hold')?.addEventListener('click', () => game.hold());
}

/**
 * 初始化事件監聽
 */
function initEventListeners(): void {
  document.addEventListener('keydown', handleKeyDown);

  newGameBtn.addEventListener('click', () => {
    game.destroy();
    hideOverlay();
    initGame();
  });

  pauseBtn.addEventListener('click', () => {
    game.togglePause();
  });

  retryBtn.addEventListener('click', () => {
    game.destroy();
    hideOverlay();
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

  initTouchControls();
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

  console.log('🎮 俄羅斯方塊遊戲已載入！');
  console.log('🕹️ 使用方向鍵控制，空白鍵硬降，C 暫存');
}

main();
