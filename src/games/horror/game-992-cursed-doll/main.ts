import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const sanityBar = document.getElementById('sanity-bar')!;
const sanityValue = document.getElementById('sanity-value')!;
const dollRoom = document.getElementById('doll-room')!;
const doll = document.getElementById('doll')!;
const eyeLeft = document.getElementById('eye-left')!;
const eyeRight = document.getElementById('eye-right')!;
const dollMouth = document.getElementById('doll-mouth')!;
const warningText = document.getElementById('warning-text')!;
const lookBtn = document.getElementById('look-btn')!;
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

  sanityBar.style.width = `${stats.sanity}%`;
  sanityValue.textContent = `${Math.floor(stats.sanity)}%`;

  if (stats.isRunning) {
    startBtn.style.display = 'none';
    lookBtn.disabled = false;

    if (stats.isLooking) {
      lookBtn.textContent = t('game.looking');
      lookBtn.classList.add('looking');
      lookBtn.classList.remove('danger');
    } else {
      lookBtn.textContent = t('game.notLooking');
      lookBtn.classList.remove('looking');
    }

    if (stats.isDollActive && stats.isLooking) {
      lookBtn.classList.add('danger');
      dollRoom.classList.add('danger');
    } else {
      dollRoom.classList.remove('danger');
    }
  } else {
    startBtn.style.display = 'block';
    lookBtn.disabled = true;

    if (stats.sanity <= 0) {
      dollRoom.classList.add('game-over');
    }
  }
}

function updateDollState(active: boolean) {
  if (active) {
    eyeLeft.classList.add('glowing');
    eyeRight.classList.add('glowing');
    dollMouth.classList.add('evil');
    doll.classList.add('moving');
    warningText.textContent = t('game.msgs.dollActive');
    warningText.classList.add('visible');
  } else {
    eyeLeft.classList.remove('glowing');
    eyeRight.classList.remove('glowing');
    dollMouth.classList.remove('evil');
    doll.classList.remove('moving');
    warningText.classList.remove('visible');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((key) => {
    statusMsg.textContent = t(`game.msgs.${key}`);
    if (key === 'caught' || key === 'dollActive') {
      statusMsg.className = 'status-msg danger';
    } else if (key === 'survived' || key === 'win') {
      statusMsg.className = 'status-msg safe';
    } else {
      statusMsg.className = 'status-msg warning';
    }
  });

  game.setOnDollStateChange(updateDollState);

  startBtn.addEventListener('click', () => {
    dollRoom.classList.remove('game-over');
    game.start();
  });

  // Hold to look, release to look away
  lookBtn.addEventListener('mousedown', () => game.setLooking(true));
  lookBtn.addEventListener('mouseup', () => game.setLooking(false));
  lookBtn.addEventListener('mouseleave', () => game.setLooking(false));

  // Touch support
  lookBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.setLooking(true);
  });
  lookBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    game.setLooking(false);
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
