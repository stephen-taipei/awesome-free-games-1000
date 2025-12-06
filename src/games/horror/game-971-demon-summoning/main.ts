import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const demon = document.getElementById('demon')!;
const powerBar = document.getElementById('power-bar')!;
const controlBar = document.getElementById('control-bar')!;
const corruptionBar = document.getElementById('corruption-bar')!;
const offerBlood = document.getElementById('offer-blood')!;
const offerBone = document.getElementById('offer-bone')!;
const offerSoul = document.getElementById('offer-soul')!;
const chantBtn = document.getElementById('chant-btn')!;
const offerBtn = document.getElementById('offer-btn')!;
const bindBtn = document.getElementById('bind-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const candles = [
  document.getElementById('candle-1')!,
  document.getElementById('candle-2')!,
  document.getElementById('candle-3')!,
  document.getElementById('candle-4')!,
  document.getElementById('candle-5')!
];

const offerings: Record<string, HTMLElement> = {
  blood: offerBlood,
  bone: offerBone,
  soul: offerSoul
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

  // Bars
  powerBar.style.width = `${stats.power}%`;
  controlBar.style.width = `${stats.control}%`;
  corruptionBar.style.width = `${stats.corruption}%`;

  // Bar states
  if (stats.control < 30) {
    controlBar.classList.add('low');
  } else {
    controlBar.classList.remove('low');
  }

  if (stats.corruption > 70) {
    corruptionBar.classList.add('high');
  } else {
    corruptionBar.classList.remove('high');
  }

  // Offerings
  Object.entries(offerings).forEach(([type, el]) => {
    el.classList.remove('selected', 'used');
    if (stats.usedOfferings.includes(type)) {
      el.classList.add('used');
    } else if (stats.selectedOffering === type) {
      el.classList.add('selected');
    }
  });

  // Ritual active state
  if (stats.isRunning && stats.power > 0) {
    gameContainer.classList.add('ritual-active');
  } else {
    gameContainer.classList.remove('ritual-active');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    chantBtn.disabled = false;
    offerBtn.disabled = !stats.selectedOffering;
    bindBtn.disabled = stats.demonState !== 'summoned';
  } else {
    startBtn.style.display = 'block';
    chantBtn.disabled = true;
    offerBtn.disabled = true;
    bindBtn.disabled = true;
  }
}

function handleCandleChange(index: number, lit: boolean) {
  if (index < candles.length) {
    if (lit) {
      candles[index].classList.add('lit');
    } else {
      candles[index].classList.remove('lit');
    }
  }
}

function handleDemonState(state: string) {
  demon.className = 'demon';

  if (state === 'hidden') {
    // No extra class
  } else if (state === 'manifesting') {
    demon.classList.add('manifesting');
  } else if (state === 'summoned') {
    demon.classList.add('summoned');
    demon.textContent = '👿';
  } else if (state === 'bound') {
    demon.classList.add('bound');
    demon.textContent = '😈';
  } else if (state === 'escaped') {
    demon.classList.add('escaped');
    demon.textContent = '👹';
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnCandleChange(handleCandleChange);
  game.setOnDemonState(handleDemonState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('ritual-active');
    if (win) {
      gameContainer.classList.add('demon-bound');
    } else {
      gameContainer.classList.add('demon-escaped');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('demon-bound', 'demon-escaped');
    demon.textContent = '👁️';
    candles.forEach(c => c.classList.remove('lit'));
    game.start();
  });

  chantBtn.addEventListener('click', () => game.chant());
  offerBtn.addEventListener('click', () => game.offer());
  bindBtn.addEventListener('click', () => game.bind());

  // Offering selection
  offerBlood.addEventListener('click', () => game.selectOffering('blood'));
  offerBone.addEventListener('click', () => game.selectOffering('bone'));
  offerSoul.addEventListener('click', () => game.selectOffering('soul'));

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyC') game.chant();
    if (e.code === 'KeyO') game.offer();
    if (e.code === 'KeyB') game.bind();
    if (e.code === 'Digit1') game.selectOffering('blood');
    if (e.code === 'Digit2') game.selectOffering('bone');
    if (e.code === 'Digit3') game.selectOffering('soul');
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
