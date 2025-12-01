/**
 * 華容道遊戲主程式
 * Klotski/Sliding Block Puzzle - Main Entry Point
 */

import { KlotskiGame, GameState, Block, BOARD_WIDTH, BOARD_HEIGHT, PUZZLES } from './game';
import { translations } from './i18n';

// Get supported language
function getLanguage(): string {
  const saved = localStorage.getItem('klotski-lang');
  if (saved && translations[saved as keyof typeof translations]) {
    return saved;
  }

  const browserLang = navigator.language;
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-Hant')) {
    return 'zh-TW';
  }
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }

  const langCode = browserLang.split('-')[0];
  if (translations[langCode as keyof typeof translations]) {
    return langCode;
  }

  return 'en';
}

// Translation helper
let currentLang = getLanguage();
function t(key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[currentLang as keyof typeof translations];

  for (const k of keys) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  return typeof result === 'string' ? result : key;
}

// Game instance
let game: KlotskiGame;
let currentPuzzleIndex = 0;
let selectedBlockId: string | null = null;
let timerInterval: number | null = null;

// DOM elements
let boardEl: HTMLElement;
let movesEl: HTMLElement;
let timeEl: HTMLElement;
let bestEl: HTMLElement;

// Touch/drag state
let isDragging = false;
let dragBlock: Block | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragBlockStartX = 0;
let dragBlockStartY = 0;

// Initialize game
function init(): void {
  const savedPuzzle = localStorage.getItem('klotski-puzzle');
  if (savedPuzzle) {
    currentPuzzleIndex = parseInt(savedPuzzle, 10) || 0;
  }

  game = new KlotskiGame(currentPuzzleIndex);
  game.setOnStateChange(render);

  renderUI();
  render(game.getState());
  startTimer();
}

// Render main UI
function renderUI(): void {
  const app = document.getElementById('app')!;
  app.className = '';
  app.innerHTML = `
    <div class="language-selector">
      <select id="lang-select">
        <option value="zh-TW">繁體中文</option>
        <option value="zh-CN">简体中文</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="pt">Português</option>
        <option value="ru">Русский</option>
        <option value="it">Italiano</option>
        <option value="th">ไทย</option>
        <option value="vi">Tiếng Việt</option>
        <option value="id">Indonesia</option>
        <option value="ar">العربية</option>
        <option value="hi">हिन्दी</option>
      </select>
    </div>

    <header class="game-header">
      <h1 class="game-title">${t('game.title')}</h1>
      <p class="game-subtitle">${t('game.subtitle')}</p>
    </header>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">${t('game.moves')}</span>
        <span class="stat-value" id="moves">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('game.time')}</span>
        <span class="stat-value" id="time">0:00</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">${t('game.best')}</span>
        <span class="stat-value" id="best">-</span>
      </div>
    </div>

    <div class="game-container">
      <div class="puzzle-selector" id="puzzle-selector"></div>

      <div class="board-wrapper">
        <div class="game-board" id="board">
          <div class="exit-zone"></div>
        </div>
      </div>

      <div class="controls">
        <button class="btn btn-secondary" id="btn-undo">${t('game.undo')}</button>
        <button class="btn btn-secondary" id="btn-reset">${t('game.reset')}</button>
        <button class="btn btn-primary" id="btn-new">${t('game.newGame')}</button>
      </div>

      <div class="help-panel">
        <h3 class="help-title">${t('game.howToPlay')}</h3>
        <div class="help-content">
          <p>${t('game.howToPlayContent')}</p>
          <ul>
            <li>${t('game.dragToMove')}</li>
            <li>${t('game.clickArrows')}</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="win-modal">
      <div class="modal">
        <h2 class="modal-title">${t('game.youWin')}</h2>
        <div class="modal-stats">
          <div class="modal-stat">
            <div class="modal-stat-value" id="modal-moves">0</div>
            <div class="modal-stat-label">${t('game.moves')}</div>
          </div>
          <div class="modal-stat">
            <div class="modal-stat-value" id="modal-time">0:00</div>
            <div class="modal-stat-label">${t('game.time')}</div>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" id="btn-replay">${t('game.tryAgain')}</button>
          <button class="btn btn-primary" id="btn-next">${t('game.nextPuzzle')}</button>
        </div>
      </div>
    </div>
  `;

  // Get DOM elements
  boardEl = document.getElementById('board')!;
  movesEl = document.getElementById('moves')!;
  timeEl = document.getElementById('time')!;
  bestEl = document.getElementById('best')!;

  // Setup language selector
  const langSelect = document.getElementById('lang-select') as HTMLSelectElement;
  langSelect.value = currentLang;
  langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    localStorage.setItem('klotski-lang', currentLang);
    renderUI();
    render(game.getState());
  });

  // Setup puzzle selector
  renderPuzzleSelector();

  // Setup controls
  document.getElementById('btn-undo')!.addEventListener('click', () => game.undo());
  document.getElementById('btn-reset')!.addEventListener('click', () => game.reset());
  document.getElementById('btn-new')!.addEventListener('click', showPuzzleSelector);
  document.getElementById('btn-replay')!.addEventListener('click', () => {
    hideWinModal();
    game.reset();
  });
  document.getElementById('btn-next')!.addEventListener('click', () => {
    hideWinModal();
    nextPuzzle();
  });

  // Setup keyboard controls
  document.addEventListener('keydown', handleKeyDown);

  // Update best score display
  updateBestDisplay();
}

// Render puzzle selector
function renderPuzzleSelector(): void {
  const selector = document.getElementById('puzzle-selector')!;
  selector.innerHTML = PUZZLES.map((puzzle, index) => {
    const puzzleName = t(`game.puzzles.${puzzle.name}`) || puzzle.name;
    return `
      <button class="puzzle-btn ${index === currentPuzzleIndex ? 'active' : ''}"
              data-index="${index}">
        ${puzzleName}
      </button>
    `;
  }).join('');

  selector.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('puzzle-btn')) {
      const index = parseInt(target.dataset.index!, 10);
      selectPuzzle(index);
    }
  });
}

// Select puzzle
function selectPuzzle(index: number): void {
  currentPuzzleIndex = index;
  localStorage.setItem('klotski-puzzle', index.toString());
  game.selectPuzzle(index);

  // Update active state
  document.querySelectorAll('.puzzle-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  updateBestDisplay();
  startTimer();
}

// Next puzzle
function nextPuzzle(): void {
  const nextIndex = (currentPuzzleIndex + 1) % PUZZLES.length;
  selectPuzzle(nextIndex);
}

// Show puzzle selector (highlight current)
function showPuzzleSelector(): void {
  document.getElementById('puzzle-selector')!.scrollIntoView({ behavior: 'smooth' });
}

// Render game state
function render(state: GameState): void {
  renderBlocks(state.blocks);
  movesEl.textContent = state.moves.toString();

  if (state.isWon) {
    stopTimer();
    showWinModal(state.moves, game.getElapsedTime());
    saveBestScore(state.moves);
  }
}

// Render blocks
function renderBlocks(blocks: Block[]): void {
  // Remove old blocks
  boardEl.querySelectorAll('.block').forEach(el => el.remove());

  const cellSize = getCellSize();

  blocks.forEach(block => {
    const el = document.createElement('div');
    el.className = `block ${block.type}`;
    el.dataset.id = block.id;
    el.style.left = `${block.x * cellSize + 3}px`;
    el.style.top = `${block.y * cellSize + 3}px`;

    // Display name
    if (block.type === 'caocao') {
      el.textContent = t('game.caoCao');
    } else if (block.type === 'general_v' || block.type === 'general_h') {
      el.textContent = block.name;
    } else {
      el.textContent = t('game.soldier');
    }

    if (block.id === selectedBlockId) {
      el.classList.add('selected');
    }

    // Event listeners
    el.addEventListener('mousedown', (e) => startDrag(e, block));
    el.addEventListener('touchstart', (e) => startDrag(e, block), { passive: false });

    boardEl.appendChild(el);
  });
}

// Get cell size
function getCellSize(): number {
  const boardWidth = boardEl.clientWidth;
  return boardWidth / BOARD_WIDTH;
}

// Start drag
function startDrag(e: MouseEvent | TouchEvent, block: Block): void {
  e.preventDefault();

  isDragging = true;
  dragBlock = block;
  selectedBlockId = block.id;

  const pos = getEventPosition(e);
  dragStartX = pos.x;
  dragStartY = pos.y;
  dragBlockStartX = block.x;
  dragBlockStartY = block.y;

  const blockEl = boardEl.querySelector(`[data-id="${block.id}"]`);
  blockEl?.classList.add('dragging');

  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', handleDrag, { passive: false });
  document.addEventListener('touchend', endDrag);
}

// Handle drag
function handleDrag(e: MouseEvent | TouchEvent): void {
  if (!isDragging || !dragBlock) return;
  e.preventDefault();

  const pos = getEventPosition(e);
  const cellSize = getCellSize();

  const deltaX = Math.round((pos.x - dragStartX) / cellSize);
  const deltaY = Math.round((pos.y - dragStartY) / cellSize);

  // Try to move in dominant direction
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX !== 0) {
    const dx = deltaX > 0 ? 1 : -1;
    if (game.canMove(dragBlock.id, dx, 0)) {
      game.moveBlock(dragBlock.id, dx, 0);
      dragStartX = pos.x;
      dragStartY = pos.y;
    }
  } else if (deltaY !== 0) {
    const dy = deltaY > 0 ? 1 : -1;
    if (game.canMove(dragBlock.id, 0, dy)) {
      game.moveBlock(dragBlock.id, 0, dy);
      dragStartX = pos.x;
      dragStartY = pos.y;
    }
  }
}

// End drag
function endDrag(): void {
  if (dragBlock) {
    const blockEl = boardEl.querySelector(`[data-id="${dragBlock.id}"]`);
    blockEl?.classList.remove('dragging');
  }

  isDragging = false;
  dragBlock = null;

  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', handleDrag);
  document.removeEventListener('touchend', endDrag);
}

// Get event position
function getEventPosition(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e) {
    return {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }
  return {
    x: e.clientX,
    y: e.clientY,
  };
}

// Handle keyboard
function handleKeyDown(e: KeyboardEvent): void {
  if (!selectedBlockId || game.getState().isWon) return;

  let dx = 0;
  let dy = 0;

  switch (e.key) {
    case 'ArrowLeft':
      dx = -1;
      break;
    case 'ArrowRight':
      dx = 1;
      break;
    case 'ArrowUp':
      dy = -1;
      break;
    case 'ArrowDown':
      dy = 1;
      break;
    case 'Tab':
      e.preventDefault();
      selectNextBlock();
      return;
    default:
      return;
  }

  e.preventDefault();
  game.moveBlock(selectedBlockId, dx, dy);
}

// Select next block
function selectNextBlock(): void {
  const blocks = game.getState().blocks;
  const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
  const nextIndex = (currentIndex + 1) % blocks.length;
  selectedBlockId = blocks[nextIndex].id;
  render(game.getState());
}

// Timer
function startTimer(): void {
  stopTimer();
  timerInterval = window.setInterval(updateTimer, 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimer(): void {
  const elapsed = game.getElapsedTime();
  timeEl.textContent = formatTime(elapsed);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Best score
function getBestKey(): string {
  return `klotski-best-${PUZZLES[currentPuzzleIndex].id}`;
}

function saveBestScore(moves: number): void {
  const key = getBestKey();
  const current = localStorage.getItem(key);
  if (!current || moves < parseInt(current, 10)) {
    localStorage.setItem(key, moves.toString());
    updateBestDisplay();
  }
}

function updateBestDisplay(): void {
  const key = getBestKey();
  const best = localStorage.getItem(key);
  bestEl.textContent = best || '-';
}

// Win modal
function showWinModal(moves: number, time: number): void {
  document.getElementById('modal-moves')!.textContent = moves.toString();
  document.getElementById('modal-time')!.textContent = formatTime(time);
  document.getElementById('win-modal')!.classList.add('active');
}

function hideWinModal(): void {
  document.getElementById('win-modal')!.classList.remove('active');
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
