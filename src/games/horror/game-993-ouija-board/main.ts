import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const ouijaBoard = document.getElementById('ouija-board')!;
const planchette = document.getElementById('planchette')!;
const spiritMessage = document.getElementById('spirit-message')!;
const questionField = document.getElementById('question-field') as HTMLInputElement;
const askBtn = document.getElementById('ask-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;

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

  spiritMessage.textContent = stats.currentMessage;

  if (stats.isRunning) {
    startBtn.style.display = 'none';
    questionField.disabled = stats.isSpelling;
    askBtn.disabled = stats.isSpelling;
    ouijaBoard.classList.add('board-active');
  } else {
    startBtn.style.display = 'block';
    questionField.disabled = true;
    askBtn.disabled = true;
    ouijaBoard.classList.remove('board-active');
  }
}

function movePlanchette(x: number, y: number, char: string) {
  planchette.classList.add('moving');
  planchette.style.left = `${x}%`;
  planchette.style.top = `${y}%`;

  // Highlight the current letter on the board
  highlightLetter(char);
}

function highlightLetter(char: string) {
  // Remove previous highlights
  document.querySelectorAll('.letter-highlight').forEach(el => {
    el.classList.remove('letter-highlight');
  });

  // Find and highlight the current letter
  const rows = document.querySelectorAll('.alphabet-row span, .numbers-row span');
  rows.forEach(span => {
    if (span.textContent === char) {
      span.classList.add('letter-highlight');
    }
  });
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((key) => {
    statusMsg.textContent = t(`game.msgs.${key}`);
    statusMsg.className = `status-msg mystical`;
  });

  game.setOnPlanchetteMove((x, y, char) => {
    movePlanchette(x, y, char);
  });

  game.setOnSpellingComplete((message) => {
    // Remove highlight when done
    setTimeout(() => {
      document.querySelectorAll('.letter-highlight').forEach(el => {
        el.classList.remove('letter-highlight');
      });
    }, 500);
  });

  startBtn.addEventListener('click', () => {
    game.start();
    // Move planchette to center initially
    planchette.style.left = '50%';
    planchette.style.top = '50%';
  });

  askBtn.addEventListener('click', () => {
    const question = questionField.value.trim();
    if (question) {
      game.askQuestion(question);
      questionField.value = '';
    }
  });

  questionField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      askBtn.click();
    }
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) (el as HTMLInputElement).placeholder = t(key);
  });

  render();
}

init();
