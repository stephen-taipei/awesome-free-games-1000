import { SolitaireGame, Card, isRed, Suit } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const movesDisplay = document.getElementById('moves-display')!;
const timeDisplay = document.getElementById('time-display')!;
const scoreDisplay = document.getElementById('score-display')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const newGameBtn = document.getElementById('new-game-btn')!;
const autoBtn = document.getElementById('auto-btn')!;

let game: SolitaireGame;
let cardWidth = 60;
let cardHeight = 85;
let padding = 10;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });
  const lang = navigator.language;
  if (lang.includes('zh')) i18n.setLocale('zh-TW');
  else if (lang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener('change', () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = i18n.t(key);
  });
}

function resize() {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width;
  const height = Math.min(rect.width * 0.85, 550);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  // Calculate card size based on width
  cardWidth = Math.floor((width - padding * 8) / 7);
  cardHeight = Math.floor(cardWidth * 1.4);
}

function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}

function drawCard(x: number, y: number, card: Card | null, faceUp: boolean, selected: boolean = false) {
  ctx.save();

  if (!card || !faceUp) {
    // Card back
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#0d1b2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 5);
    ctx.fill();
    ctx.stroke();

    if (card) {
      // Pattern on back
      ctx.fillStyle = '#2a5082';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, cardWidth - 10, cardHeight - 10, 3);
      ctx.fill();
    }
  } else {
    // Card face
    ctx.fillStyle = selected ? '#fff8e1' : '#fff';
    ctx.strokeStyle = selected ? '#f39c12' : '#333';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Rank and suit
    const color = isRed(card.suit) ? '#e74c3c' : '#2c3e50';
    ctx.fillStyle = color;
    ctx.font = `bold ${cardWidth * 0.25}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 4, y + cardWidth * 0.25);
    ctx.font = `${cardWidth * 0.3}px sans-serif`;
    ctx.fillText(getSuitSymbol(card.suit), x + 4, y + cardWidth * 0.5);

    // Center suit
    ctx.font = `${cardWidth * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(getSuitSymbol(card.suit), x + cardWidth / 2, y + cardHeight / 2 + cardWidth * 0.15);
  }

  ctx.restore();
}

function drawEmptySlot(x: number, y: number, label?: string) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.roundRect(x, y, cardWidth, cardHeight, 5);
  ctx.stroke();
  ctx.setLineDash([]);

  if (label) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `${cardWidth * 0.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + cardWidth / 2, y + cardHeight / 2 + 5);
  }
}

function draw() {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  // Background
  ctx.fillStyle = '#1a5f3c';
  ctx.fillRect(0, 0, width, height);

  const startX = padding;
  const startY = padding;
  const colWidth = cardWidth + padding;
  const stackOffset = Math.min(20, cardHeight * 0.25);

  // Stock
  if (state.stock.length > 0) {
    drawCard(startX, startY, state.stock[state.stock.length - 1], false);
  } else {
    drawEmptySlot(startX, startY, '↻');
  }

  // Waste
  const wasteX = startX + colWidth;
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    const isSelected = state.selectedCards.some(c => c.id === card.id);
    drawCard(wasteX, startY, card, true, isSelected);
  } else {
    drawEmptySlot(wasteX, startY);
  }

  // Foundations
  const foundationStartX = startX + colWidth * 3;
  for (let i = 0; i < 4; i++) {
    const x = foundationStartX + i * colWidth;
    const foundation = state.foundations[i];
    if (foundation.length > 0) {
      const card = foundation[foundation.length - 1];
      const isSelected = state.selectedCards.some(c => c.id === card.id);
      drawCard(x, startY, card, true, isSelected);
    } else {
      const suits = ['♥', '♦', '♣', '♠'];
      drawEmptySlot(x, startY, suits[i]);
    }
  }

  // Tableau
  const tableauY = startY + cardHeight + padding * 2;
  for (let col = 0; col < 7; col++) {
    const x = startX + col * colWidth;
    const pile = state.tableau[col];

    if (pile.length === 0) {
      drawEmptySlot(x, tableauY, 'K');
    } else {
      for (let row = 0; row < pile.length; row++) {
        const card = pile[row];
        const y = tableauY + row * stackOffset;
        const isSelected = state.selectedCards.some(c => c.id === card.id);
        drawCard(x, y, card, card.faceUp, isSelected);
      }
    }
  }
}

function getClickedArea(x: number, y: number): { area: string; index: number; cardIndex?: number } | null {
  const state = game.getState();
  const startX = padding;
  const startY = padding;
  const colWidth = cardWidth + padding;
  const stackOffset = Math.min(20, cardHeight * 0.25);

  // Stock
  if (x >= startX && x <= startX + cardWidth && y >= startY && y <= startY + cardHeight) {
    return { area: 'stock', index: 0 };
  }

  // Waste
  const wasteX = startX + colWidth;
  if (x >= wasteX && x <= wasteX + cardWidth && y >= startY && y <= startY + cardHeight) {
    return { area: 'waste', index: 0 };
  }

  // Foundations
  const foundationStartX = startX + colWidth * 3;
  for (let i = 0; i < 4; i++) {
    const fx = foundationStartX + i * colWidth;
    if (x >= fx && x <= fx + cardWidth && y >= startY && y <= startY + cardHeight) {
      return { area: 'foundation', index: i };
    }
  }

  // Tableau
  const tableauY = startY + cardHeight + padding * 2;
  for (let col = 0; col < 7; col++) {
    const tx = startX + col * colWidth;
    if (x >= tx && x <= tx + cardWidth) {
      const pile = state.tableau[col];
      if (pile.length === 0) {
        if (y >= tableauY && y <= tableauY + cardHeight) {
          return { area: 'tableau', index: col, cardIndex: 0 };
        }
      } else {
        // Find which card was clicked
        for (let row = pile.length - 1; row >= 0; row--) {
          const cy = tableauY + row * stackOffset;
          const cardBottom = row === pile.length - 1 ? cy + cardHeight : cy + stackOffset;
          if (y >= cy && y <= cardBottom) {
            return { area: 'tableau', index: col, cardIndex: row };
          }
        }
      }
    }
  }

  return null;
}

function handleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);

  const clicked = getClickedArea(x, y);
  if (!clicked) {
    game.selectCard('tableau', -1); // Clear selection
    draw();
    return;
  }

  if (clicked.area === 'stock') {
    game.drawFromStock();
  } else if (clicked.area === 'waste') {
    game.selectCard('waste', 0);
  } else if (clicked.area === 'foundation') {
    game.selectCard('foundation', clicked.index);
  } else if (clicked.area === 'tableau') {
    game.selectCard('tableau', clicked.index, clicked.cardIndex);
  }

  draw();
  updateDisplay();
}

function handleDoubleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);

  const clicked = getClickedArea(x, y);
  if (!clicked) return;

  // Try to auto-move to foundation
  if (clicked.area === 'waste' || clicked.area === 'tableau') {
    game.autoMoveToFoundation();
    draw();
    updateDisplay();
  }
}

function updateDisplay() {
  const state = game.getState();
  movesDisplay.textContent = state.moves.toString();
  const mins = Math.floor(state.time / 60);
  const secs = state.time % 60;
  timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  scoreDisplay.textContent = Math.floor(state.score).toString();

  if (state.phase === 'won') {
    showOverlay(i18n.t('game.won'), `${i18n.t('game.score')}: ${Math.floor(state.score)}`, i18n.t('game.newGame'));
  }
}

function showOverlay(title: string, msg: string, btn: string) {
  overlay.style.display = 'flex';
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  startBtn.textContent = btn;
}

function hideOverlay() {
  overlay.style.display = 'none';
}

startBtn.addEventListener('click', () => {
  hideOverlay();
  game.start();
  draw();
});

newGameBtn.addEventListener('click', () => {
  game.start();
  draw();
});

autoBtn.addEventListener('click', () => {
  let moved = true;
  while (moved) {
    moved = game.autoMoveToFoundation();
  }
  draw();
  updateDisplay();
});

canvas.addEventListener('click', handleClick);
canvas.addEventListener('dblclick', handleDoubleClick);
window.addEventListener('resize', () => { resize(); draw(); });

game = new SolitaireGame();
game.onStateChange = () => { draw(); updateDisplay(); };
initI18n();
resize();
draw();
