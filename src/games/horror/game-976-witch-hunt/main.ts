import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const locationDisplay = document.getElementById('location-display')!;
const locationIcon = locationDisplay.querySelector('.location-icon')!;
const locationNameEl = document.getElementById('location-name')!;
const mob = document.getElementById('mob')!;
const suspicionBar = document.getElementById('suspicion-bar')!;
const magicBar = document.getElementById('magic-bar')!;
const herbsCount = document.getElementById('herbs-count')!;
const potionCount = document.getElementById('potion-count')!;
const talismanCount = document.getElementById('talisman-count')!;
const itemHerbs = document.getElementById('item-herbs')!;
const itemPotion = document.getElementById('item-potion')!;
const itemTalisman = document.getElementById('item-talisman')!;
const spellDisguise = document.getElementById('spell-disguise')!;
const spellCharm = document.getElementById('spell-charm')!;
const spellEscape = document.getElementById('spell-escape')!;
const navButtons = document.getElementById('nav-buttons')!;
const searchBtn = document.getElementById('search-btn')!;
const blendBtn = document.getElementById('blend-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const locationIcons: Record<string, string> = {
  square: '🏘️',
  church: '⛪',
  market: '🏪',
  tavern: '🍺',
  alley: '🌑',
  graveyard: '🪦',
  woods: '🌲',
  bridge: '🌉',
  exit: '🏃'
};

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
  const loc = game.getCurrentLocation();

  // Stats
  suspicionBar.style.width = `${stats.suspicion}%`;
  magicBar.style.width = `${stats.magic}%`;

  // Items
  herbsCount.textContent = String(stats.herbs);
  potionCount.textContent = String(stats.potions);
  talismanCount.textContent = String(stats.talismans);

  itemHerbs.classList.toggle('has-item', stats.herbs > 0);
  itemPotion.classList.toggle('has-item', stats.potions > 0);
  itemTalisman.classList.toggle('has-item', stats.talismans > 0);

  // Location
  if (loc) {
    locationIcon.textContent = locationIcons[loc.id] || '🏘️';
    locationNameEl.textContent = game.getLocationName(loc.id);

    navButtons.innerHTML = '';
    loc.exits.forEach(exitId => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (exitId === 'exit' ? ' escape' : '');
      btn.textContent = game.getLocationName(exitId);
      btn.disabled = !stats.isRunning || stats.mobChasing;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // States
  if (stats.mobChasing) {
    gameContainer.classList.add('mob-chase');
  } else {
    gameContainer.classList.remove('mob-chase');
  }

  if (stats.suspicion >= 70) {
    gameContainer.classList.add('high-suspicion');
  } else {
    gameContainer.classList.remove('high-suspicion');
  }

  // Spell buttons
  spellDisguise.disabled = !stats.isRunning || stats.magic < 30;
  spellCharm.disabled = !stats.isRunning || stats.magic < 25;
  spellEscape.disabled = !stats.isRunning || stats.magic < 40;

  // Action buttons
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.mobChasing;
    blendBtn.disabled = false;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    blendBtn.disabled = true;
  }
}

function handleMobState(chasing: boolean) {
  if (chasing) {
    mob.classList.remove('hidden');
    mob.classList.add('hunting');
  } else {
    mob.classList.remove('hunting');
    mob.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnMobState(handleMobState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('mob-chase', 'high-suspicion');
    mob.classList.add('hidden');
    mob.classList.remove('hunting');
    if (win) {
      gameContainer.classList.add('escaped');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped');
    game.start();
  });

  searchBtn.addEventListener('click', () => game.search());
  blendBtn.addEventListener('click', () => game.blend());

  spellDisguise.addEventListener('click', () => game.castDisguise());
  spellCharm.addEventListener('click', () => game.castCharm());
  spellEscape.addEventListener('click', () => game.castTeleport());

  // Click items to use
  itemPotion.addEventListener('click', () => game.usePotion());
  itemTalisman.addEventListener('click', () => game.useTalisman());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyB') game.blend();
    if (e.code === 'Digit1') game.castDisguise();
    if (e.code === 'Digit2') game.castCharm();
    if (e.code === 'Digit3') game.castTeleport();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
