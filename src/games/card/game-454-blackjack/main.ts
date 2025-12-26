import { BlackjackGame, Card, Suit, calculateScore } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const chipsDisplay = document.getElementById('chips-display')!;
const betDisplay = document.getElementById('bet-display')!;
const bettingPanel = document.getElementById('betting-panel')!;
const actionPanel = document.getElementById('action-panel')!;
const resultPanel = document.getElementById('result-panel')!;
const resultText = document.getElementById('result-text')!;
const hitBtn = document.getElementById('hit-btn')!;
const standBtn = document.getElementById('stand-btn')!;
const doubleBtn = document.getElementById('double-btn')!;
const newRoundBtn = document.getElementById('new-round-btn')!;

let game: BlackjackGame;
let cardWidth = 60;
let cardHeight = 84;

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
  const height = Math.min(rect.width * 0.8, 400);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  cardWidth = Math.min(60, width / 8);
  cardHeight = cardWidth * 1.4;
}

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '\u2665';
    case 'diamonds': return '\u2666';
    case 'clubs': return '\u2663';
    case 'spades': return '\u2660';
  }
}

function drawCard(x: number, y: number, card: Card) {
  ctx.save();

  if (!card.faceUp) {
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#a93226';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, cardWidth - 8, cardHeight - 8, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.stroke();

    const color = isRed(card.suit) ? '#e74c3c' : '#2c3e50';
    ctx.fillStyle = color;
    ctx.font = `bold ${cardWidth * 0.25}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 4, y + cardWidth * 0.25);
    ctx.font = `${cardWidth * 0.28}px sans-serif`;
    ctx.fillText(getSuitSymbol(card.suit), x + 4, y + cardWidth * 0.5);

    ctx.font = `${cardWidth * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(getSuitSymbol(card.suit), x + cardWidth / 2, y + cardHeight / 2 + cardWidth * 0.15);
  }

  ctx.restore();
}

function drawHand(cards: Card[], x: number, y: number, label: string, score: number, showScore: boolean) {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);

  // Draw label
  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 8);

  // Draw score
  if (showScore && cards.length > 0) {
    ctx.textAlign = 'right';
    const scoreText = score > 21 ? `${score} (${i18n.t('game.bust')})` : score.toString();
    ctx.fillStyle = score > 21 ? '#e74c3c' : '#f1c40f';
    ctx.fillText(scoreText, width - 10, y - 8);
  }

  // Draw cards
  const cardOffset = Math.min(cardWidth * 0.7, 45);
  cards.forEach((card, i) => {
    drawCard(x + i * cardOffset, y, card);
  });
}

function draw() {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  // Background
  ctx.fillStyle = '#1a5f3c';
  ctx.fillRect(0, 0, width, height);

  const margin = 10;
  const dealerY = margin + 20;
  const playerY = height / 2 + 20;

  // Draw dealer hand
  const showDealerScore = state.phase === 'result' || state.phase === 'dealer';
  drawHand(state.dealerHand, margin, dealerY, i18n.t('game.dealer'), state.dealerScore, showDealerScore);

  // Draw player hand
  drawHand(state.playerHand, margin, playerY, i18n.t('game.player'), state.playerScore, true);
}

function updateDisplay() {
  const state = game.getState();
  chipsDisplay.textContent = state.chips.toString();
  betDisplay.textContent = state.bet.toString();

  // Update panels visibility
  bettingPanel.style.display = state.phase === 'betting' ? 'flex' : 'none';
  actionPanel.style.display = state.phase === 'playing' ? 'flex' : 'none';
  resultPanel.style.display = state.phase === 'result' ? 'flex' : 'none';

  // Update action buttons
  hitBtn.disabled = !state.canHit;
  standBtn.disabled = !state.canStand;
  doubleBtn.disabled = !state.canDouble;

  // Update result text
  if (state.phase === 'result') {
    switch (state.result) {
      case 'blackjack':
        resultText.textContent = i18n.t('game.blackjack');
        resultText.style.color = '#f1c40f';
        break;
      case 'win':
        resultText.textContent = i18n.t('game.win');
        resultText.style.color = '#2ecc71';
        break;
      case 'lose':
        resultText.textContent = i18n.t('game.lose');
        resultText.style.color = '#e74c3c';
        break;
      case 'push':
        resultText.textContent = i18n.t('game.push');
        resultText.style.color = '#ecf0f1';
        break;
    }
  }

  // Update bet buttons
  document.querySelectorAll('.bet-btn').forEach((btn) => {
    const amount = parseInt((btn as HTMLButtonElement).dataset.amount || '0');
    (btn as HTMLButtonElement).disabled = amount > state.chips;
  });
}

// Event listeners
document.querySelectorAll('.bet-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const amount = parseInt((btn as HTMLButtonElement).dataset.amount || '0');
    game.placeBet(amount);
    draw();
    updateDisplay();
  });
});

hitBtn.addEventListener('click', () => {
  game.hit();
  draw();
  updateDisplay();
});

standBtn.addEventListener('click', () => {
  game.stand();
  draw();
  updateDisplay();
});

doubleBtn.addEventListener('click', () => {
  game.double();
  draw();
  updateDisplay();
});

newRoundBtn.addEventListener('click', () => {
  game.newRound();
  draw();
  updateDisplay();
});

languageSelect.addEventListener('change', () => {
  updateTexts();
  updateDisplay();
});

window.addEventListener('resize', () => { resize(); draw(); });

game = new BlackjackGame();
game.onStateChange = () => { draw(); updateDisplay(); };
game.start();
initI18n();
resize();
draw();
updateDisplay();
