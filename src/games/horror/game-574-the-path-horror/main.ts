import { Game } from './game';
import { i18n } from './i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const overlay = document.getElementById('game-overlay') as HTMLDivElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const scoreDisplay = document.getElementById('score-display') as HTMLSpanElement;
const levelDisplay = document.getElementById('level-display') as HTMLSpanElement;
const langSelect = document.getElementById('language-select') as HTMLSelectElement;

let game: Game | null = null;
let currentLang = 'zh-TW';

function applyTranslations() {
  const t = i18n[currentLang as keyof typeof i18n];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')!;
    const keys = key.split('.');
    let value: any = t;
    for (const k of keys) value = value?.[k];
    if (value) el.textContent = value;
  });
}

langSelect.addEventListener('change', () => {
  currentLang = langSelect.value;
  applyTranslations();
});

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  if (!game) {
    game = new Game(canvas);
    game.onScore = (score: number) => { scoreDisplay.textContent = String(score); };
    game.onLevel = (level: number) => { levelDisplay.textContent = String(level); };
    game.onGameOver = () => {
      overlay.style.display = 'flex';
      document.getElementById('overlay-title')!.textContent = 'Game Over!';
    };
  }
  game.start();
});

applyTranslations();
