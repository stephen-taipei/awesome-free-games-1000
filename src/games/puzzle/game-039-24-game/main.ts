/**
 * 24 Game Main Entry
 * Mental Math Arena / Calculator Championship Theme
 * Game #039
 */
import { Game24, type Operator } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Elements
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const puzzleDisplay = document.getElementById('puzzle-display')!;
const scoreDisplay = document.getElementById('score-display')!;
const expressionText = document.getElementById('expression-text')!;
const cardsContainer = document.getElementById('cards-container')!;
const hintDisplay = document.getElementById('hint-display')!;

const gameBoard = document.getElementById('game-board')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const clearBtn = document.getElementById('clear-btn')!;
const hintBtn = document.getElementById('hint-btn')!;

let game: Game24;
let renderer: WebGPURenderer | null = null;
let animationId: number;

// Calculator Championship Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Button click - calculator key press
  playClick(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Number card selection
  playSelectNumber(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Digital blip
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'square';
    osc2.frequency.value = 1200;

    gain2.gain.setValueAtTime(0.06, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.08);
  }

  // Operator selection
  playSelectOperator(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Calculation performed
  playCalculate(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Processing beep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1000;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    // Result tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.value = 700;

    gain2.gain.setValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.2);
  }

  // Error sound
  playError(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Clear/reset
  playClear(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Victory fanfare - got 24!
  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Triumphant ascending notes
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.1;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });

    // Success chord
    [784, 988, 1175].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + 0.4);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + 0.4);
      osc.stop(now + 1.2);
    });

    // Digital celebration blips
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = 0.5 + i * 0.08;

      osc.type = 'square';
      osc.frequency.value = 1200 + i * 200;

      gain.gain.setValueAtTime(0.05, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.06);
    }
  }

  // Hint reveal
  playHint(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1000, now + 0.1);
    osc.frequency.linearRampToValueAtTime(900, now + 0.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Game start
  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Power on sequence
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // Ready beeps
    [400, 500, 700].forEach((freq, i) => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const delay = 0.3 + i * 0.1;

      osc2.type = 'square';
      osc2.frequency.value = freq;

      gain2.gain.setValueAtTime(0.08, now + delay);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + delay);
      osc2.stop(now + delay + 0.08);
    });
  }
}

const audio = new AudioSystem();

// Track previous state
let previousSelectedCards: number[] = [];
let previousOperator: string | null = null;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh')) i18n.setLocale('zh-TW');
  else if (browserLang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');

  languageSelect.value = i18n.getLocale();
  updateTexts();

  languageSelect.addEventListener('change', () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = i18n.t(key);
  });
}

async function initWebGPU() {
  const gpuCanvas = document.createElement('canvas');
  gpuCanvas.id = 'webgpu-canvas';
  gpuCanvas.className = 'webgpu-overlay';

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.insertBefore(gpuCanvas, gameArea.firstChild);

    const rect = gameArea.getBoundingClientRect();
    gpuCanvas.width = rect.width * window.devicePixelRatio;
    gpuCanvas.height = rect.height * window.devicePixelRatio;
    gpuCanvas.style.width = '100%';
    gpuCanvas.style.height = '100%';
  }

  renderer = new WebGPURenderer(gpuCanvas);
  const success = await renderer.initialize();

  if (success) {
    function renderLoop() {
      renderer?.render();
      animationId = requestAnimationFrame(renderLoop);
    }
    renderLoop();
  }
}

function initGame() {
  game = new Game24();

  // Operator buttons
  document.querySelectorAll('.operator-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const op = (e.target as HTMLElement).dataset.op as Operator;
      audio.playSelectOperator();

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const gameArea = document.querySelector('.game-area');
      if (gameArea) {
        const areaRect = gameArea.getBoundingClientRect();
        const normX = (rect.left + rect.width / 2 - areaRect.left) / areaRect.width;
        const normY = (rect.top + rect.height / 2 - areaRect.top) / areaRect.height;
        renderer?.emitOperator(normX, normY);
      }

      game.selectOperator(op);
    });
  });

  game.setOnStateChange((state: any) => {
    puzzleDisplay.textContent = `${state.puzzle}/${state.totalPuzzles}`;
    scoreDisplay.textContent = state.score.toString();
    expressionText.textContent = state.expression || '-';

    // Detect calculation performed
    if (state.selectedCards.length === 0 && previousSelectedCards.length === 2) {
      audio.playCalculate();
      renderer?.emitCalculate(0.5, 0.5);
    }

    // Track state changes
    previousSelectedCards = [...state.selectedCards];
    previousOperator = state.currentOperator;

    // Update cards
    renderCards(state.cards, state.selectedCards);

    // Update operator buttons
    document.querySelectorAll('.operator-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.op === state.currentOperator);
      (btn as HTMLButtonElement).disabled = state.selectedCards.length !== 1;
    });

    if (state.status === 'won') {
      audio.playVictory();
      renderer?.emitVictory(0.5, 0.5);
      showWin();
    }
  });
}

function renderCards(cards: any[], selectedCards: number[]) {
  cardsContainer.innerHTML = '';

  cards.forEach((card, index) => {
    const cardEl = document.createElement('button');
    cardEl.className = 'number-card';

    if (card.used) {
      cardEl.classList.add('used');
    }
    if (selectedCards.includes(index)) {
      cardEl.classList.add('selected');
    }

    // Format the value (handle decimals)
    let displayValue = card.value.toString();
    if (!Number.isInteger(card.value)) {
      displayValue = card.value.toFixed(2).replace(/\.?0+$/, '');
    }

    cardEl.textContent = displayValue;
    cardEl.disabled = card.used;

    cardEl.addEventListener('click', () => {
      audio.playSelectNumber();

      const rect = cardEl.getBoundingClientRect();
      const gameArea = document.querySelector('.game-area');
      if (gameArea) {
        const areaRect = gameArea.getBoundingClientRect();
        const normX = (rect.left + rect.width / 2 - areaRect.left) / areaRect.width;
        const normY = (rect.top + rect.height / 2 - areaRect.top) / areaRect.height;
        renderer?.emitClick(normX, normY);
      }

      game.selectCard(index);
    });

    cardsContainer.appendChild(cardEl);
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.win');
    overlayMsg.textContent = `${i18n.t('game.score')}: ${game['score']}`;
    startBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
  }, 500);
}

function startGame() {
  overlay.style.display = 'none';
  gameBoard.style.display = 'block';
  hintDisplay.textContent = '';
  audio.playStart();
  game.start();
}

startBtn.addEventListener('click', startGame);

resetBtn.addEventListener('click', () => {
  hintDisplay.textContent = '';
  audio.playClear();
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  hintDisplay.textContent = '';
  audio.playStart();
  game.nextPuzzle();
});

clearBtn.addEventListener('click', () => {
  audio.playClear();
  game.clearSelection();
});

hintBtn.addEventListener('click', () => {
  audio.playHint();
  const hint = game.getHint();
  hintDisplay.textContent = hint;
});

// Cleanup
window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationId);
  renderer?.destroy();
});

// Resize handler
window.addEventListener('resize', () => {
  const gpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
  const gameArea = document.querySelector('.game-area');
  if (gpuCanvas && gameArea) {
    const rect = gameArea.getBoundingClientRect();
    gpuCanvas.width = rect.width * window.devicePixelRatio;
    gpuCanvas.height = rect.height * window.devicePixelRatio;
  }
});

// Init
initI18n();
initGame();
initWebGPU();
