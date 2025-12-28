/**
 * Stack Puzzle Main Entry
 * Building Construction / Skyscraper Theme
 * Game #045
 */
import { StackPuzzleGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Construction sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Block dropping - whoosh
  playDrop(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    filter.type = 'lowpass';
    filter.frequency.value = 600;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Block landing - thud
  playLand(perfect: boolean): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Heavy thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(perfect ? 150 : 120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);

    // Metal clang
    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();

    clang.type = 'triangle';
    clang.frequency.value = perfect ? 800 : 500;

    clangGain.gain.setValueAtTime(0.1, now);
    clangGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    clang.connect(clangGain);
    clangGain.connect(ctx.destination);

    clang.start(now);
    clang.stop(now + 0.1);

    if (perfect) {
      // Perfect landing chime
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();

      chime.type = 'sine';
      chime.frequency.value = 1200;

      chimeGain.gain.setValueAtTime(0.08, now + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      chime.start(now + 0.05);
      chime.stop(now + 0.3);
    }
  }

  // Block stacking successfully
  playStack(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [523, 659]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    });
  }

  // Victory - building complete fanfare
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Triumphant construction complete melody
    const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.005;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.5);
      osc2.stop(now + delay + 0.5);
    });

    // Construction horn
    const horn = ctx.createOscillator();
    const hornGain = ctx.createGain();
    const hornFilter = ctx.createBiquadFilter();

    horn.type = 'sawtooth';
    horn.frequency.value = 220;

    hornFilter.type = 'lowpass';
    hornFilter.frequency.value = 800;

    hornGain.gain.setValueAtTime(0.08, now + 0.6);
    hornGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    horn.connect(hornFilter);
    hornFilter.connect(hornGain);
    hornGain.connect(ctx.destination);

    horn.start(now + 0.6);
    horn.stop(now + 1.2);
  }

  // Failed stack
  playFail(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Crash sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // Descending failure tone
    const fail = ctx.createOscillator();
    const failGain = ctx.createGain();

    fail.type = 'sine';
    fail.frequency.setValueAtTime(400, now + 0.1);
    fail.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    failGain.gain.setValueAtTime(0.1, now + 0.1);
    failGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    fail.connect(failGain);
    failGain.connect(ctx.destination);

    fail.start(now + 0.1);
    fail.stop(now + 0.4);
  }

  // Reset sound
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Block moving
  playMove(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 200 + Math.random() * 50;

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const blocksDisplay = document.getElementById('blocks-display')!;
const heightDisplay = document.getElementById('height-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: StackPuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// Track last block position for effects
let lastBlockX = 0.5;

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

async function initGame() {
  game = new StackPuzzleGame(canvas);
  game.resize();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      requestAnimationFrame(function renderLoop() {
        renderer?.render();
        requestAnimationFrame(renderLoop);
      });
    }
  }

  // Click/tap to drop
  canvas.addEventListener('click', () => {
    if (game.canDrop) {
      audio.playDrop();
      const nx = game.currentBlock?.x ?? 0.5;
      lastBlockX = nx / canvas.width;
    }
    game.dropBlock();
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.canDrop) {
      audio.playDrop();
      const nx = game.currentBlock?.x ?? 0.5;
      lastBlockX = nx / canvas.width;
    }
    game.dropBlock();
  }, { passive: false });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (game.canDrop) {
        audio.playDrop();
        const nx = game.currentBlock?.x ?? 0.5;
        lastBlockX = nx / canvas.width;
      }
      game.dropBlock();
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    blocksDisplay.textContent = `${state.blocksUsed}/${state.blocksAvailable}`;
    heightDisplay.textContent = `${state.currentHeight}/${state.targetHeight}`;

    // Update height card color
    const heightCard = heightDisplay.parentElement;
    if (heightCard) {
      if (state.currentHeight >= state.targetHeight) {
        heightCard.classList.add('success');
        heightCard.classList.remove('progress');
      } else if (state.currentHeight > 0) {
        heightCard.classList.add('progress');
        heightCard.classList.remove('success');
      } else {
        heightCard.classList.remove('success', 'progress');
      }
    }

    // Handle block landing
    if (state.justLanded) {
      const perfect = state.perfectLanding || false;
      const ny = 1 - (state.currentHeight / state.targetHeight) * 0.7;

      audio.playLand(perfect);

      if (renderer) {
        renderer.emitLand(lastBlockX, ny, perfect);
      }

      if (state.currentHeight > 0 && state.currentHeight < state.targetHeight) {
        audio.playStack();
      }
    }

    if (state.status === 'won') {
      // Victory effects
      setTimeout(() => {
        audio.playVictory();
        if (renderer) {
          renderer.emitVictory(0.5, 0.3);
        }
      }, 200);

      showWin(state.level, state.totalLevels);
    } else if (state.status === 'lost') {
      audio.playFail();
      showLose();
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
    resizeBgCanvas();
  });

  resizeBgCanvas();
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function showWin(level: number, totalLevels: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';

    if (level >= totalLevels) {
      overlayTitle.textContent = i18n.t('game.complete');
      overlayMsg.textContent = '';
      nextBtn.style.display = 'none';
    } else {
      overlayTitle.textContent = i18n.t('game.win');
      overlayMsg.textContent = `${i18n.t('game.level')} ${level}`;
      nextBtn.style.display = 'inline-block';
    }

    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

function showLose() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.lose');
    overlayMsg.textContent = i18n.t('game.desc');
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
    nextBtn.style.display = 'none';
  }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
});

resetBtn.addEventListener('click', () => {
  audio.playReset();
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.nextLevel();
});

// Init
initI18n();
initGame();
