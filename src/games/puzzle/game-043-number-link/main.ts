/**
 * Number Link Main Entry
 * Neon Circuit / Cyberpunk Grid Theme
 * Game #043
 */
import { NumberLinkGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Synthesized cyberpunk sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Start drawing from endpoint
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Digital boot-up sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Drawing path - data transfer sound
  playDraw(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Bit stream sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400 + Math.random() * 200, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Cell connected to path
  playConnect(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Digital click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Path completed between two endpoints
  playComplete(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Circuit connected fanfare
    [0, 0.1, 0.2].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const freq = [400, 600, 800][i];
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    });

    // Electric buzz
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'sawtooth';
    noise.frequency.value = 100;
    noiseGain.gain.setValueAtTime(0.03, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.3);
  }

  // Level complete victory
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Epic synth arpeggio
    const notes = [523, 659, 784, 1047, 784, 659, 523];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const delay = i * 0.08;
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc2.type = 'square';
      osc2.frequency.value = freq * 1.005;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now + delay);
      filter.frequency.exponentialRampToValueAtTime(500, now + delay + 0.4);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.4);
      osc2.stop(now + delay + 0.4);
    });

    // Big bass drop
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(80, now + 0.5);
    bass.frequency.exponentialRampToValueAtTime(40, now + 1.0);
    bassGain.gain.setValueAtTime(0.2, now + 0.5);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now + 0.5);
    bass.stop(now + 1.0);
  }

  // Reset/clear path
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Descending glitch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Error/invalid move
  playError(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Buzzer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }
}

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const pathsDisplay = document.getElementById('paths-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: NumberLinkGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// Track previous state for effects
let prevPaths = 0;
let prevCells: Set<string> = new Set();

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
  game = new NumberLinkGame(canvas);
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

  // Mouse events
  canvas.addEventListener('mousedown', (e) => handleInput('down', e));
  window.addEventListener('mousemove', (e) => handleInput('move', e));
  window.addEventListener('mouseup', (e) => handleInput('up', e));

  // Touch events
  canvas.addEventListener('touchstart', (e) => handleTouch('down', e), { passive: false });
  window.addEventListener('touchmove', (e) => handleTouch('move', e), { passive: false });
  window.addEventListener('touchend', (e) => handleTouch('up', e), { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    pathsDisplay.textContent = `${state.completePaths}/${state.totalPaths}`;

    // Check for newly completed paths
    if (state.completePaths > prevPaths) {
      audio.playComplete();
      // Emit completion effect at center
      if (renderer) {
        renderer.emitComplete(0.5, 0.5);
      }
    }
    prevPaths = state.completePaths;

    if (state.status === 'won') {
      audio.playVictory();
      if (renderer) {
        renderer.emitVictory(0.5, 0.5);
      }
      showWin(state.level, state.totalLevels);
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

function handleInput(type: 'down' | 'move' | 'up', e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === 'down') {
    audio.playStart();
    if (renderer) {
      const nx = x / rect.width;
      const ny = y / rect.height;
      renderer.emitData(nx, ny);
    }
  } else if (type === 'move') {
    // Emit sparks while drawing
    if (renderer && game.isDrawing) {
      const nx = x / rect.width;
      const ny = y / rect.height;
      if (Math.random() < 0.3) {
        renderer.emitSpark(nx, ny);
        audio.playDraw();
      }
    }
  }

  game.handleInput(type, x, y);
}

function handleTouch(type: 'down' | 'move' | 'up', e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (type === 'down') {
    audio.playStart();
    if (renderer) {
      const nx = x / rect.width;
      const ny = y / rect.height;
      renderer.emitData(nx, ny);
    }
  } else if (type === 'move') {
    if (renderer && game.isDrawing) {
      const nx = x / rect.width;
      const ny = y / rect.height;
      if (Math.random() < 0.3) {
        renderer.emitSpark(nx, ny);
      }
    }
  }

  game.handleInput(type, x, y);
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

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  prevPaths = 0;
  game.start();
});

resetBtn.addEventListener('click', () => {
  audio.playReset();
  prevPaths = 0;
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  prevPaths = 0;
  game.nextLevel();
});

// Init
initI18n();
initGame();
