
import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale = 'zh-TW';

// Elements
const dayVal = document.getElementById('day-val')!;
const healthBar = document.getElementById('health-bar')!;
const foodBar = document.getElementById('food-bar')!;
const waterBar = document.getElementById('water-bar')!;
const eventLog = document.getElementById('event-log')!;

const scavengeBtn = document.getElementById('scavenge-btn')!;
const restBtn = document.getElementById('rest-btn')!;
const fortifyBtn = document.getElementById('fortify-btn')!;

const gameOverModal = document.getElementById('game-over-modal')!;
const gameOverMsg = document.getElementById('game-over-msg')!;
const restartBtn = document.getElementById('restart-btn')!;

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function updateUI() {
  const stats = game.getStats();
  
  dayVal.textContent = stats.day.toString();
  
  healthBar.style.width = `${stats.health}%`;
  foodBar.style.width = `${stats.food}%`;
  waterBar.style.width = `${stats.water}%`;

  if (game.isOver()) {
    gameOverModal.classList.remove('hidden');
    gameOverMsg.textContent = `${t('game.gameover.died')} Days survived: ${stats.day}`;
  }
}

function addLog(key: string, type: string) {
  const msg = t(`game.events.${key}`);
  const p = document.createElement('p');
  p.className = `log-entry ${type}`;
  p.textContent = `Day ${game.getStats().day}: ${msg}`;
  eventLog.prepend(p);
}

function init() {
  game.setOnStateChange(updateUI);
  game.setOnLog(addLog);

  scavengeBtn.addEventListener('click', () => game.performAction('scavenge'));
  restBtn.addEventListener('click', () => game.performAction('rest'));
  fortifyBtn.addEventListener('click', () => game.performAction('fortify'));
  
  restartBtn.addEventListener('click', () => {
    game.start();
    eventLog.innerHTML = '';
    gameOverModal.classList.add('hidden');
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  updateUI();
}

init();
