import { FreeCellGame, Card, Suit, isRed, getRankValue } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const movesDisplay = document.getElementById('moves-display')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const newGameBtn = document.getElementById('new-game-btn')!;
const autoBtn = document.getElementById('auto-btn')!;

let game: FreeCellGame;
let cardWidth = 55;
let cardHeight = 80;
let padding = 5;

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
  const height = Math.min(rect.width * 1.1, 650);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  cardWidth = Math.floor((width - padding * 9) / 8);
  cardHeight = Math.floor(cardWidth * 1.4);
}

function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '\u2665';
    case 'diamonds': return '\u2666';
    case 'clubs': return '\u2663';
    case 'spades': return '\u2660';
  }
}

function getSuitColor(suit: Suit): string {
  return isRed(suit) ? '#e74c3c' : '#2c3e50';
}

function drawCard(x: number, y: number, card: Card | null, selected: boolean = false) {
  ctx.save();

  if (!card) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = selected ? '#fff8e1' : '#fff';
    ctx.strokeStyle = selected ? '#f39c12' : '#333';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.stroke();

    const color = getSuitColor(card.suit);
    ctx.fillStyle = color;
    ctx.font = `bold ${cardWidth * 0.22}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 3, y + cardWidth * 0.22);
    ctx.font = `${cardWidth * 0.25}px sans-serif`;
    ctx.fillText(getSuitSymbol(card.suit), x + 3, y + cardWidth * 0.45);

    ctx.font = `${cardWidth * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(getSuitSymbol(card.suit), x + cardWidth / 2, y + cardHeight / 2 + cardWidth * 0.12);
  }

  ctx.restore();
}

function drawFoundationSlot(x: number, y: number, suit: Suit) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.roundRect(x, y, cardWidth, cardHeight, 4);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = `${cardWidth * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(getSuitSymbol(suit), x + cardWidth / 2, y + cardHeight / 2 + cardWidth * 0.15);
  ctx.restore();
}

function draw() {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = '#1a5f3c';
  ctx.fillRect(0, 0, width, height);

  const colWidth = cardWidth + padding;
  const startX = padding;
  const topRowY = padding;
  const tableauY = topRowY + cardHeight + padding * 3;
  const stackOffset = Math.min(20, cardHeight * 0.22);

  // Draw free cells (left 4)
  for (let i = 0; i < 4; i++) {
    const x = startX + i * colWidth;
    const card = state.freeCells[i];
    const isSelected = state.selectedFrom?.type === 'freecell' && state.selectedFrom.index === i;
    if (card) {
      drawCard(x, topRowY, card, isSelected);
    } else {
      drawCard(x, topRowY, null);
    }
  }

  // Draw foundations (right 4)
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  for (let i = 0; i < 4; i++) {
    const x = startX + (i + 4) * colWidth;
    const foundation = state.foundations[i];
    if (foundation.length > 0) {
      drawCard(x, topRowY, foundation[foundation.length - 1]);
    } else {
      drawFoundationSlot(x, topRowY, suits[i]);
    }
  }

  // Draw tableau
  for (let col = 0; col < 8; col++) {
    const x = startX + col * colWidth;
    const pile = state.tableau[col];

    if (pile.length === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.roundRect(x, tableauY, cardWidth, cardHeight, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      for (let row = 0; row < pile.length; row++) {
        const card = pile[row];
        const y = tableauY + row * stackOffset;
        const isSelected = state.selectedFrom?.type === 'tableau' &&
          state.selectedFrom.index === col &&
          state.selectedFrom.cardIndex !== undefined &&
          row >= state.selectedFrom.cardIndex;
        drawCard(x, y, card, isSelected);
      }
    }
  }
}

function getClickedArea(x: number, y: number): { type: 'freecell' | 'foundation' | 'tableau'; index: number; cardIndex?: number } | null {
  const state = game.getState();
  const colWidth = cardWidth + padding;
  const startX = padding;
  const topRowY = padding;
  const tableauY = topRowY + cardHeight + padding * 3;
  const stackOffset = Math.min(20, cardHeight * 0.22);

  // Check top row
  if (y >= topRowY && y <= topRowY + cardHeight) {
    for (let i = 0; i < 8; i++) {
      const cx = startX + i * colWidth;
      if (x >= cx && x <= cx + cardWidth) {
        if (i < 4) {
          return { type: 'freecell', index: i };
        } else {
          return { type: 'foundation', index: i - 4 };
        }
      }
    }
  }

  // Check tableau
  for (let col = 0; col < 8; col++) {
    const cx = startX + col * colWidth;
    if (x >= cx && x <= cx + cardWidth) {
      const pile = state.tableau[col];
      if (pile.length === 0) {
        if (y >= tableauY && y <= tableauY + cardHeight) {
          return { type: 'tableau', index: col, cardIndex: 0 };
        }
      } else {
        for (let row = pile.length - 1; row >= 0; row--) {
          const cy = tableauY + row * stackOffset;
          const cardBottom = row === pile.length - 1 ? cy + cardHeight : cy + stackOffset;
          if (y >= cy && y <= cardBottom) {
            return { type: 'tableau', index: col, cardIndex: row };
          }
        }
      }
    }
  }

  return null;
}

function handleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const clicked = getClickedArea(x, y);
  if (clicked) {
    game.selectCard(clicked.type, clicked.index, clicked.cardIndex);
  }

  draw();
  updateDisplay();
}

function updateDisplay() {
  const state = game.getState();
  movesDisplay.textContent = state.moves.toString();

  if (state.phase === 'won') {
    showOverlay(i18n.t('game.won'), `${i18n.t('game.moves')}: ${state.moves}`, i18n.t('game.newGame'));
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
  updateDisplay();
});

newGameBtn.addEventListener('click', () => {
  game.start();
  draw();
  updateDisplay();
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
window.addEventListener('resize', () => { resize(); draw(); });

game = new FreeCellGame();
game.onStateChange = () => { draw(); updateDisplay(); };
initI18n();
resize();
draw();
