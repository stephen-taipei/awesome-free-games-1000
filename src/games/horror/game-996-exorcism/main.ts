
import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const demonBar = document.getElementById('demon-bar')!;
const faithBar = document.getElementById('faith-bar')!;
const wordDisplay = document.getElementById('word-display')!;
const wordInput = document.getElementById('word-input') as HTMLInputElement;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const demonFace = document.getElementById('demon-face')!;

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
  
  demonBar.style.width = `${stats.demonStrength}%`;
  faithBar.style.width = `${stats.faith}%`;
  
  if (stats.isRunning) {
    wordDisplay.textContent = stats.currentWord;
    startBtn.style.display = 'none';
    wordInput.style.display = 'block';
    wordInput.focus();
  } else {
    wordDisplay.textContent = '';
    startBtn.style.display = 'block';
    wordInput.style.display = 'none';
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);
  game.setOnMessage((key) => {
    statusMsg.textContent = t(`game.msgs.${key}`);
    statusMsg.className = `status-msg ${key === 'hit' ? 'success' : 'danger'}`;
    
    if (key === 'hit') {
      demonFace.classList.add('shake');
      setTimeout(() => demonFace.classList.remove('shake'), 500);
    }
  });

  startBtn.addEventListener('click', () => {
    game.start();
  });

  wordInput.addEventListener('input', () => {
    if (game.checkInput(wordInput.value)) {
      wordInput.value = '';
    }
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  
  render();
}

init();
