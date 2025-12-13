/**
 * 24 Game Main Entry
 * Game #039
 */
import { Game24, type Operator } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

// Elements
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const puzzleDisplay = document.getElementById('puzzle-display')!;
const scoreDisplay = document.getElementById('score-display')!;
const expressionText = document.getElementById('expression-text')!;
const cardsContainer = document.getElementById('cards-container')!;
const hintDisplay = document.getElementById('hint-display')!;

const gameBoard = document.getElementById('game-board')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const clearBtn = document.getElementById('clear-btn')!;
const hintBtn = document.getElementById('hint-btn')!;

let game: Game24;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh')) i18n.setLocale('zh-TW');
  else if (browserLang.includes('ja')) i18n.setLocale('ja');
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

function initGame() {
  game = new Game24();

  // Operator buttons
  document.querySelectorAll('.operator-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const op = (e.target as HTMLElement).dataset.op as Operator;
      game.selectOperator(op);
    });
  });

  game.setOnStateChange((state: any) => {
    puzzleDisplay.textContent = `${state.puzzle}/${state.totalPuzzles}`;
    scoreDisplay.textContent = state.score.toString();
    expressionText.textContent = state.expression || '-';

    // Update cards
    renderCards(state.cards, state.selectedCards);

    // Update operator buttons
    document.querySelectorAll('.operator-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.op === state.currentOperator);
      (btn as HTMLButtonElement).disabled = state.selectedCards.length !== 1;
    });

    if (state.status === 'won') {
      showWin();
    }
  });
}

function renderCards(cards: any[], selectedCards: number[]) {
  cardsContainer.innerHTML = '';

  cards.forEach((card, index) => {
    const cardEl = document.createElement('button');
    cardEl.className = 'number-card';

    if (card.used) {
      cardEl.classList.add('used');
    }
    if (selectedCards.includes(index)) {
      cardEl.classList.add('selected');
    }

    // Format the value (handle decimals)
    let displayValue = card.value.toString();
    if (!Number.isInteger(card.value)) {
      displayValue = card.value.toFixed(2).replace(/\.?0+$/, '');
    }

    cardEl.textContent = displayValue;
    cardEl.disabled = card.used;

    cardEl.addEventListener('click', () => {
      game.selectCard(index);
    });

    cardsContainer.appendChild(cardEl);
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.win');
    overlayMsg.textContent = `${i18n.t('game.score')}: ${game['score']}`;
    startBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
  }, 500);
}

function startGame() {
  overlay.style.display = 'none';
  gameBoard.style.display = 'block';
  hintDisplay.textContent = '';
  game.start();
}

startBtn.addEventListener('click', startGame);

resetBtn.addEventListener('click', () => {
  hintDisplay.textContent = '';
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  hintDisplay.textContent = '';
  game.nextPuzzle();
});

clearBtn.addEventListener('click', () => {
  game.clearSelection();
});

hintBtn.addEventListener('click', () => {
  const hint = game.getHint();
  hintDisplay.textContent = hint;
});

// Init
initI18n();
initGame();
