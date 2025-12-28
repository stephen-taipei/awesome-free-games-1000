/**
 * Flood Fill Main Entry
 * Ink Spill / Watercolor Studio Theme
 * Game #041
 */
import { FloodFillGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Watercolor studio sounds
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  // Ink drop/splash sound
  playSplash() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Water drop plop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Color spread/fill sound
  playSpread() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft swoosh
    const noise = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    noise.type = 'triangle';
    noise.frequency.setValueAtTime(200, now);
    noise.frequency.linearRampToValueAtTime(400, now + 0.1);
    noise.frequency.linearRampToValueAtTime(150, now + 0.3);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.35);
  }

  // Successful move feedback
  playSuccess() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now); // C5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Victory - watercolor celebration
  playVictory() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Ascending arpeggio
    const notes = [392, 494, 587, 784, 988]; // G4, B4, D5, G5, B5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;

      filter.type = 'lowpass';
      filter.frequency.value = 3000;

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });

    // Final shimmer
    setTimeout(() => {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.type = 'sine';
      shimmer.frequency.value = 1568; // G6

      shimmerGain.gain.setValueAtTime(0.15, ctx.currentTime);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start();
      shimmer.stop(ctx.currentTime + 0.8);
    }, 600);
  }

  // Lose sound - ink spill
  playLose() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Descending drip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.6);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Start game - brush dip
  playStart() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Brush into water
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.1);
    osc.frequency.linearRampToValueAtTime(250, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Warning beep when moves running low
  playWarning() {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const movesDisplay = document.getElementById('moves-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: FloodFillGame;
const audio = new AudioSystem();
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let animationId: number | null = null;

// State tracking
let previousStatus = 'paused';
let previousMoves = 0;
let previousCurrentColor = -1;

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
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  gameArea.insertBefore(webgpuCanvas, gameArea.firstChild);

  const updateCanvasSize = () => {
    if (webgpuCanvas && gameArea) {
      const rect = gameArea.getBoundingClientRect();
      webgpuCanvas.width = rect.width * window.devicePixelRatio;
      webgpuCanvas.height = rect.height * window.devicePixelRatio;
    }
  };

  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.initialize();

  if (success) {
    const renderLoop = () => {
      webgpuRenderer?.render();
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }
}

function initGame() {
  game = new FloodFillGame(canvas);
  game.resize();

  // Click events
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  // Touch events
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    movesDisplay.textContent = `${state.moves}/${state.maxMoves}`;

    // Update moves card color
    const movesCard = movesDisplay.parentElement;
    if (movesCard) {
      const remaining = state.maxMoves - state.moves;
      if (remaining <= 2) {
        movesCard.classList.add('danger');
        movesCard.classList.remove('warning');
      } else if (remaining <= 5) {
        movesCard.classList.add('warning');
        movesCard.classList.remove('danger');
      } else {
        movesCard.classList.remove('warning', 'danger');
      }
    }

    // Audio and effects based on state changes
    if (state.moves > previousMoves && state.status === 'playing') {
      // A move was made - color selection
      const colors = state.colors || [];
      if (colors.length > 0) {
        const currentColorHex = colors[0] || '#3498db';
        audio.playSplash();
        audio.playSpread();

        // Emit ink splash at center
        if (webgpuRenderer) {
          webgpuRenderer.emitSplash(0.5, 0.5, currentColorHex);
          // Spread effect across the grid area
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              webgpuRenderer?.emitSpread(
                0.3 + Math.random() * 0.4,
                0.2 + Math.random() * 0.4,
                currentColorHex
              );
            }, i * 100);
          }
        }
      }

      // Warning when moves running low
      const remaining = state.maxMoves - state.moves;
      if (remaining <= 3 && remaining > 0) {
        audio.playWarning();
      }
    }

    // Handle status changes
    if (state.status === 'won' && previousStatus !== 'won') {
      audio.playVictory();
      if (webgpuRenderer) {
        webgpuRenderer.emitVictory(0.5, 0.5);
      }
      showWin(state.level, state.totalLevels);
    } else if (state.status === 'lost' && previousStatus !== 'lost') {
      audio.playLose();
      showLose();
    }

    // Update tracking
    previousStatus = state.status;
    previousMoves = state.moves;
  });

  window.addEventListener('resize', () => game.resize());
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
  }, 300);
}

function showLose() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.lose');
    overlayMsg.textContent = i18n.t('game.desc');
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
    nextBtn.style.display = 'none';
  }, 300);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  previousMoves = 0;
  previousStatus = 'playing';
  game.start();
});

resetBtn.addEventListener('click', () => {
  audio.playStart();
  previousMoves = 0;
  previousStatus = 'playing';
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  previousMoves = 0;
  previousStatus = 'playing';
  game.nextLevel();
});

// Init
initI18n();
initWebGPU();
initGame();
