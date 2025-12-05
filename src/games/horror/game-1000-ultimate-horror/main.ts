
import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale = 'zh-TW';

// Elements
const scene = document.getElementById('scene')!;
const grid = document.getElementById('collection-grid')!;
const startBtn = document.getElementById('start-btn')!;
const sanityDisplay = document.getElementById('sanity-value')!;
const messageBox = document.getElementById('message-box')!;
const jumpscare = document.getElementById('jumpscare')!;

// I18n Helper
function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function render() {
  // Update Stats
  sanityDisplay.textContent = `${game.getSanity()}%`;
  
  // Check Game Over / Win
  if (game.isLost()) {
    messageBox.textContent = t('game.gameover');
    messageBox.classList.remove('hidden');
    startBtn.textContent = t('game.start'); // Restart
    grid.classList.add('hidden');
  } else if (game.isWin()) {
    messageBox.textContent = t('game.win');
    messageBox.classList.remove('hidden');
    startBtn.textContent = t('game.start');
  }
}

function initGrid() {
  grid.innerHTML = '';
  game.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item-card';
    el.textContent = item.icon;
    el.title = t(`game.items.${item.id}`);
    el.onclick = () => handleItemClick(item.id);
    grid.appendChild(el);
  });
}

function handleItemClick(itemId: string) {
  const result = game.inspectItem(itemId);
  
  if (result.damage > 0) {
    // Flash jumpscare
    jumpscare.classList.remove('hidden');
    setTimeout(() => jumpscare.classList.add('hidden'), 200);
    
    messageBox.textContent = `${t(`game.events.${result.event}`)} (-${result.damage} Sanity)`;
  } else {
    messageBox.textContent = t('game.events.safe');
  }
  
  messageBox.classList.remove('hidden');
  setTimeout(() => {
    if (!game.isLost() && !game.isWin()) {
       messageBox.classList.add('hidden');
    }
  }, 2000);
}

function startGame() {
  game.start();
  grid.classList.remove('hidden');
  messageBox.classList.add('hidden');
  initGrid();
  render();
}

// Init
game.setOnStateChange(render);
startBtn.addEventListener('click', startGame);

// Basic I18n Init
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  if (key) el.textContent = t(key);
});
