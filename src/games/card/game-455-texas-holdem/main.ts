import { TexasHoldemGame, Card, Suit, getRankValue } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const potDisplay = document.getElementById('pot-display')!;
const phaseDisplay = document.getElementById('phase-display')!;
const actionPanel = document.getElementById('action-panel')!;
const resultPanel = document.getElementById('result-panel')!;
const resultText = document.getElementById('result-text')!;
const overlay = document.getElementById('game-overlay')!;
const startBtn = document.getElementById('start-btn')!;
const foldBtn = document.getElementById('fold-btn')!;
const checkBtn = document.getElementById('check-btn')!;
const callBtn = document.getElementById('call-btn')!;
const raiseBtn = document.getElementById('raise-btn')!;
const allinBtn = document.getElementById('allin-btn')!;
const newHandBtn = document.getElementById('new-hand-btn')!;

let game: TexasHoldemGame;
let cardWidth = 50;
let cardHeight = 70;

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
  const height = Math.min(rect.width * 0.9, 450);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  cardWidth = Math.min(50, width / 10);
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

function drawCard(x: number, y: number, card: Card | null, faceUp: boolean = true) {
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
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.stroke();

    const color = isRed(card.suit) ? '#e74c3c' : '#2c3e50';
    ctx.fillStyle = color;
    ctx.font = `bold ${cardWidth * 0.24}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 3, y + cardWidth * 0.24);
    ctx.font = `${cardWidth * 0.26}px sans-serif`;
    ctx.fillText(getSuitSymbol(card.suit), x + 3, y + cardWidth * 0.48);

    ctx.font = `${cardWidth * 0.42}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(getSuitSymbol(card.suit), x + cardWidth / 2, y + cardHeight / 2 + cardWidth * 0.12);
  }

  ctx.restore();
}

function draw() {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  // Background
  ctx.fillStyle = '#1a5f3c';
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const margin = 10;

  // Draw AI area (top)
  const aiY = margin;
  const ai = state.players[1];

  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${i18n.t('game.ai')} - $${ai.chips}`, margin, aiY + 12);

  if (ai.isDealer) {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(margin + 80, aiY + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D', margin + 80, aiY + 12);
  }

  // AI cards
  const aiCardX = centerX - cardWidth - 5;
  const showAI = state.phase === 'showdown';
  drawCard(aiCardX, aiY + 20, ai.hand[0] || null, showAI);
  drawCard(aiCardX + cardWidth + 5, aiY + 20, ai.hand[1] || null, showAI);

  if (ai.bet > 0) {
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${ai.bet}`, centerX, aiY + cardHeight + 35);
  }

  // Draw community cards (center)
  const communityY = height / 2 - cardHeight / 2;
  const communityStartX = centerX - (cardWidth * 2.5 + 20);

  for (let i = 0; i < 5; i++) {
    const x = communityStartX + i * (cardWidth + 5);
    if (i < state.communityCards.length) {
      drawCard(x, communityY, state.communityCards[i]);
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.roundRect(x, communityY, cardWidth, cardHeight, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw pot
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Pot: $${state.pot}`, centerX, communityY - 10);

  // Draw player area (bottom)
  const player = state.players[0];
  const playerY = height - cardHeight - 50;

  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${i18n.t('game.you')} - $${player.chips}`, margin, playerY - 5);

  if (player.isDealer) {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(margin + 60, playerY - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D', margin + 60, playerY - 4);
  }

  // Player cards
  const playerCardX = centerX - cardWidth - 5;
  drawCard(playerCardX, playerY, player.hand[0] || null, true);
  drawCard(playerCardX + cardWidth + 5, playerY, player.hand[1] || null, true);

  if (player.bet > 0) {
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${player.bet}`, centerX, playerY - 15);
  }

  // Current player indicator
  if (state.phase !== 'waiting' && state.phase !== 'showdown') {
    const isPlayerTurn = state.currentPlayer === 0;
    ctx.strokeStyle = isPlayerTurn ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isPlayerTurn) {
      ctx.roundRect(playerCardX - 5, playerY - 5, cardWidth * 2 + 15, cardHeight + 10, 6);
    } else {
      ctx.roundRect(aiCardX - 5, aiY + 15, cardWidth * 2 + 15, cardHeight + 10, 6);
    }
    ctx.stroke();
  }
}

function updateDisplay() {
  const state = game.getState();
  potDisplay.textContent = state.pot.toString();

  // Update phase display
  const phaseKey = `game.${state.phase}`;
  phaseDisplay.textContent = i18n.t(phaseKey);

  // Show/hide panels
  const isPlayerTurn = state.currentPlayer === 0 && !state.players[0].isAI;
  const canAct = state.phase !== 'waiting' && state.phase !== 'showdown' && isPlayerTurn;

  actionPanel.style.display = canAct ? 'flex' : 'none';
  resultPanel.style.display = state.phase === 'showdown' ? 'flex' : 'none';
  overlay.style.display = state.phase === 'waiting' ? 'flex' : 'none';

  // Update action buttons
  checkBtn.style.display = state.canCheck ? 'block' : 'none';
  callBtn.style.display = state.canCall ? 'block' : 'none';
  callBtn.textContent = `${i18n.t('game.call')} $${state.callAmount}`;
  raiseBtn.disabled = !state.canRaise;
  foldBtn.disabled = !state.canFold;

  // Update result
  if (state.phase === 'showdown' && state.winner !== null) {
    resultText.textContent = state.message;
    resultText.style.color = state.winner === 0 ? '#2ecc71' : '#e74c3c';
  }
}

// Event listeners
startBtn.addEventListener('click', () => {
  game.start();
  draw();
  updateDisplay();
});

foldBtn.addEventListener('click', () => {
  game.fold();
});

checkBtn.addEventListener('click', () => {
  game.check();
});

callBtn.addEventListener('click', () => {
  game.call();
});

raiseBtn.addEventListener('click', () => {
  const state = game.getState();
  game.raise(state.bigBlind * 2);
});

allinBtn.addEventListener('click', () => {
  game.allIn();
});

newHandBtn.addEventListener('click', () => {
  game.newHand();
});

window.addEventListener('resize', () => { resize(); draw(); });

game = new TexasHoldemGame();
game.onStateChange = () => { draw(); updateDisplay(); };
initI18n();
resize();
draw();
updateDisplay();
