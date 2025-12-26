import { SpiderSolitaireGame, Card, Suit } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;
const movesDisplay = document.getElementById('moves-display')!;
const scoreDisplay = document.getElementById('score-display')!;
const completedDisplay = document.getElementById('completed-display')!;
const stockDisplay = document.getElementById('stock-display')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const newGameBtn = document.getElementById('new-game-btn')!;
const dealBtn = document.getElementById('deal-btn')!;

let game: SpiderSolitaireGame;
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
  const height = Math.min(rect.width * 0.9, 600);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  cardWidth = Math.floor((width - padding * 11) / 10);
  cardHeight = Math.floor(cardWidth * 1.4);
}

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
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
    ctx.fillStyle = '#2c3e50';
    ctx.strokeStyle = '#1a252f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.stroke();

    if (card) {
      ctx.fillStyle = '#34495e';
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, cardWidth - 6, cardHeight - 6, 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = selected ? '#fff8e1' : '#fff';
    ctx.strokeStyle = selected ? '#f39c12' : '#333';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.stroke();

    const color = isRed(card.suit) ? '#e74c3c' : '#2c3e50';
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

function draw() {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = '#1a5f3c';
  ctx.fillRect(0, 0, width, height);

  const startX = padding;
  const startY = padding;
  const colWidth = cardWidth + padding;
  const stackOffset = Math.min(18, cardHeight * 0.2);

  // Draw tableau
  for (let col = 0; col < 10; col++) {
    const x = startX + col * colWidth;
    const pile = state.tableau[col];

    if (pile.length === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.roundRect(x, startY, cardWidth, cardHeight, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      for (let row = 0; row < pile.length; row++) {
        const card = pile[row];
        const y = startY + row * stackOffset;
        const isSelected = state.selectedCards.includes(card);
        drawCard(x, y, card, card.faceUp, isSelected);
      }
    }
  }

  // Draw completed stacks indicator
  if (state.completed > 0) {
    ctx.fillStyle = '#27ae60';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`✓ ${state.completed}/8`, width - padding, height - padding);
  }
}

function getClickedColumn(x: number, y: number): { column: number; cardIndex: number } | null {
  const state = game.getState();
  const startX = padding;
  const startY = padding;
  const colWidth = cardWidth + padding;
  const stackOffset = Math.min(18, cardHeight * 0.2);

  for (let col = 0; col < 10; col++) {
    const cx = startX + col * colWidth;
    if (x >= cx && x <= cx + cardWidth) {
      const pile = state.tableau[col];
      if (pile.length === 0) {
        if (y >= startY && y <= startY + cardHeight) {
          return { column: col, cardIndex: 0 };
        }
      } else {
        for (let row = pile.length - 1; row >= 0; row--) {
          const cy = startY + row * stackOffset;
          const cardBottom = row === pile.length - 1 ? cy + cardHeight : cy + stackOffset;
          if (y >= cy && y <= cardBottom) {
            return { column: col, cardIndex: row };
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

  const clicked = getClickedColumn(x, y);
  if (clicked) {
    game.selectCards(clicked.column, clicked.cardIndex);
  }

  draw();
  updateDisplay();
}

function updateDisplay() {
  const state = game.getState();
  movesDisplay.textContent = state.moves.toString();
  scoreDisplay.textContent = state.score.toString();
  completedDisplay.textContent = `${state.completed}/8`;
  stockDisplay.textContent = Math.floor(state.stock.length / 10).toString();

  dealBtn.disabled = !game.canDeal();
  dealBtn.style.opacity = game.canDeal() ? '1' : '0.5';

  if (state.phase === 'won') {
    showOverlay(i18n.t('game.won'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.newGame'));
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
  game.start(parseInt(difficultySelect.value) as 1 | 2 | 4);
  draw();
  updateDisplay();
});

newGameBtn.addEventListener('click', () => {
  game.start(parseInt(difficultySelect.value) as 1 | 2 | 4);
  draw();
  updateDisplay();
});

dealBtn.addEventListener('click', () => {
  game.dealFromStock();
  draw();
  updateDisplay();
});

canvas.addEventListener('click', handleClick);
window.addEventListener('resize', () => { resize(); draw(); });

game = new SpiderSolitaireGame();
game.onStateChange = () => { draw(); updateDisplay(); };
initI18n();
resize();
draw();
