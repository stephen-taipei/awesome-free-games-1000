
import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale = 'zh-TW';

// Elements
const progressBar = document.getElementById('progress-bar')!;
const corruptionBar = document.getElementById('corruption-bar')!;
const ritualCircle = document.getElementById('ritual-circle')!;
const centerSigil = document.getElementById('center-sigil')!;
const messageArea = document.getElementById('message-area')!;
const startBtn = document.getElementById('start-btn')!;
const modal = document.getElementById('game-over-modal')!;
const modalTitle = document.getElementById('modal-title')!;
const modalMsg = document.getElementById('modal-msg')!;
const restartBtn = document.getElementById('restart-btn')!;

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
  
  progressBar.style.width = `${stats.progress}%`;
  corruptionBar.style.width = `${stats.corruption}%`;

  // Render Center Target
  centerSigil.textContent = game.getTargetSymbol();

  // Render Runes
  // Clear existing runes (but keep center sigil)
  Array.from(ritualCircle.children).forEach(child => {
    if (child.id !== 'center-sigil') {
      ritualCircle.removeChild(child);
    }
  });

  if (stats.isRunning) {
    game.getRunes().forEach((rune, index) => {
      const el = document.createElement('div');
      el.className = 'rune';
      el.textContent = rune.symbol;
      el.style.left = `${rune.x}px`;
      el.style.top = `${rune.y}px`;
      el.onclick = () => game.clickRune(index);
      ritualCircle.appendChild(el);
    });
    
    startBtn.style.display = 'none';
  } else {
    startBtn.style.display = 'block';
    centerSigil.textContent = '👁️';
  }

  if (stats.isWin) {
    showModal(t('game.msgs.win'), true);
  } else if (stats.isLose) {
    showModal(t('game.msgs.lose'), false);
  }
}

function showModal(msg: string, win: boolean) {
  modal.classList.remove('hidden');
  modalTitle.textContent = win ? 'Ascended' : 'Failed';
  modalTitle.style.color = win ? '#0f0' : '#f00';
  modalMsg.textContent = msg;
}

function hideModal() {
  modal.classList.add('hidden');
}

function init() {
  game.setOnStateChange(render);
  game.setOnMessage((key) => {
    messageArea.textContent = t(`game.msgs.${key}`);
    messageArea.style.color = key === 'wrong' ? '#f00' : (key === 'correct' ? '#0f0' : '#fff');
    
    // Basic animation
    messageArea.animate([
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], 300);
  });

  startBtn.addEventListener('click', () => {
    game.start();
    game.generateTarget(); // Initial target
    render();
  });

  restartBtn.addEventListener('click', () => {
    hideModal();
    game.start();
    game.generateTarget();
    render();
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}

init();
