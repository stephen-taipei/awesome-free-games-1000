import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const planchette = document.getElementById('planchette')!;
const spiritIndicator = document.getElementById('spirit-indicator')!;
const spiritMessage = document.getElementById('spirit-message')!;
const sanityBar = document.getElementById('sanity-bar')!;
const spiritBar = document.getElementById('spirit-bar')!;
const questionsContainer = document.getElementById('questions')!;
const goodbyeBtn = document.getElementById('goodbye-btn')!;
const protectBtn = document.getElementById('protect-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

let highlightedElement: HTMLElement | null = null;

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function render() {
  const stats = game.getStats();

  // Bars
  sanityBar.style.width = `${stats.sanity}%`;
  spiritBar.style.width = `${stats.spiritPower}%`;

  // Bar states
  if (stats.sanity < 30) {
    sanityBar.classList.add('low');
  } else {
    sanityBar.classList.remove('low');
  }

  if (stats.spiritPower > 70) {
    spiritBar.classList.add('high');
  } else {
    spiritBar.classList.remove('high');
  }

  // Spirit message
  spiritMessage.textContent = stats.currentMessage;

  // Spirit indicator
  if (stats.spiritPower > 30) {
    spiritIndicator.textContent = '👻';
    spiritIndicator.classList.add('active');
  } else {
    spiritIndicator.classList.remove('active');
  }

  // Spirit active state
  if (stats.spiritPower > 50) {
    gameContainer.classList.add('spirit-active');
  } else {
    gameContainer.classList.remove('spirit-active');
  }

  // Possessed state
  if (stats.isPossessed) {
    gameContainer.classList.add('possessed');
  } else {
    gameContainer.classList.remove('possessed');
  }

  // Button states
  const questionBtns = questionsContainer.querySelectorAll('.question-btn');
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    questionBtns.forEach(btn => {
      (btn as HTMLButtonElement).disabled = stats.isSpelling || stats.isPossessed;
    });
    goodbyeBtn.disabled = stats.isPossessed;
    protectBtn.disabled = stats.isPossessed;
  } else {
    startBtn.style.display = 'block';
    questionBtns.forEach(btn => {
      (btn as HTMLButtonElement).disabled = true;
    });
    goodbyeBtn.disabled = true;
    protectBtn.disabled = true;
  }
}

function handleSpellLetter(letter: string) {
  // Clear previous highlight
  if (highlightedElement) {
    highlightedElement.classList.remove('highlight');
  }

  // Find the letter on the board
  const allLetters = document.querySelectorAll('.letters-row span, .special-row span');
  allLetters.forEach(el => {
    const text = el.textContent?.toUpperCase();
    if (text === letter.toUpperCase() ||
        (letter === '是' && el.classList.contains('yes')) ||
        (letter === '否' && el.classList.contains('no')) ||
        (letter === '再' && el.classList.contains('goodbye'))) {
      el.classList.add('highlight');
      highlightedElement = el as HTMLElement;

      // Move planchette
      const rect = el.getBoundingClientRect();
      const boardRect = document.querySelector('.board')!.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) - boardRect.left) / boardRect.width * 100;
      const y = ((rect.top + rect.height / 2) - boardRect.top) / boardRect.height * 100;
      planchette.style.left = `${x}%`;
      planchette.style.top = `${y}%`;
    }
  });
}

function handlePlanchetteState(state: 'idle' | 'moving' | 'possessed') {
  planchette.classList.remove('moving', 'possessed');

  if (state === 'moving') {
    planchette.classList.add('moving');
  } else if (state === 'possessed') {
    planchette.classList.add('possessed');
  }
}

function resetBoard() {
  // Clear highlights
  document.querySelectorAll('.letters-row span, .special-row span').forEach(el => {
    el.classList.remove('highlight');
  });
  highlightedElement = null;

  // Reset planchette
  planchette.style.left = '50%';
  planchette.style.top = '50%';
  planchette.classList.remove('moving', 'possessed');

  // Clear message
  spiritMessage.textContent = '';
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnSpellLetter(handleSpellLetter);
  game.setOnPlanchetteState(handlePlanchetteState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('spirit-active', 'possessed');
    if (win) {
      gameContainer.classList.add('escaped');
    } else {
      gameContainer.classList.add('consumed');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped', 'consumed');
    resetBoard();
    game.start();
  });

  // Question buttons
  questionsContainer.querySelectorAll('.question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-q');
      if (q) game.askQuestion(q);
    });
  });

  goodbyeBtn.addEventListener('click', () => game.sayGoodbye());
  protectBtn.addEventListener('click', () => game.protect());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyG') game.sayGoodbye();
    if (e.code === 'KeyP') game.protect();
    if (e.code === 'Digit1') game.askQuestion('name');
    if (e.code === 'Digit2') game.askQuestion('alive');
    if (e.code === 'Digit3') game.askQuestion('want');
    if (e.code === 'Digit4') game.askQuestion('leave');
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
