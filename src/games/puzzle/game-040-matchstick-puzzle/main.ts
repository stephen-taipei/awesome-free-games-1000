/**
 * Matchstick Puzzle Main Entry
 * Cozy Fireplace / Log Cabin Night Theme
 * Game #040
 */
import { MatchstickGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const movesDisplay = document.getElementById('moves-display')!;
const hintDisplay = document.getElementById('hint-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const hintBtn = document.getElementById('hint-btn')!;

let game: MatchstickGame;
let renderer: WebGPURenderer | null = null;
let animationId: number;

// Cozy Fireplace Audio System
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

  // Match pickup - wood scrape
  playPickup(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Wood scrape
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(150, now);
    noise.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 800;

    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);

    // Subtle click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();

    click.type = 'sine';
    click.frequency.value = 400;

    clickGain.gain.setValueAtTime(0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    click.connect(clickGain).connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.05);
  }

  // Match place - soft wood thud
  playPlace(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    filter.type = 'lowpass';
    filter.frequency.value = 600;

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Settle sound
    const settle = ctx.createOscillator();
    const settleGain = ctx.createGain();

    settle.type = 'triangle';
    settle.frequency.value = 150;

    settleGain.gain.setValueAtTime(0.08, now + 0.05);
    settleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    settle.connect(settleGain).connect(ctx.destination);
    settle.start(now + 0.05);
    settle.stop(now + 0.15);
  }

  // Match drag - gentle friction
  playDrag(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noise.type = 'sawtooth';
    noise.frequency.value = 80 + Math.random() * 40;

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 300;
    noiseFilter.Q.value = 1;

    noiseGain.gain.setValueAtTime(0.03, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  // Correct placement - warm chime
  playCorrect(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const notes = [392, 523]; // G4, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.1;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });
  }

  // Victory - warm crackling celebration
  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Warm ascending melody
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.12;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });

    // Crackling fire sound
    for (let i = 0; i < 8; i++) {
      const crackle = ctx.createOscillator();
      const crackleGain = ctx.createGain();
      const crackleFilter = ctx.createBiquadFilter();
      const delay = 0.3 + i * 0.1 + Math.random() * 0.1;

      crackle.type = 'sawtooth';
      crackle.frequency.value = 100 + Math.random() * 100;

      crackleFilter.type = 'bandpass';
      crackleFilter.frequency.value = 800 + Math.random() * 400;
      crackleFilter.Q.value = 2;

      crackleGain.gain.setValueAtTime(0.06, now + delay);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      crackle.connect(crackleFilter).connect(crackleGain).connect(ctx.destination);
      crackle.start(now + delay);
      crackle.stop(now + delay + 0.08);
    }

    // Warm chord
    [392, 494, 587].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + 0.5);
      osc.stop(now + 1.5);
    });
  }

  // Hint reveal - gentle bell
  playHint(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Game start - fire ignite
  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Match strike
    const strike = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    const strikeFilter = ctx.createBiquadFilter();

    strike.type = 'sawtooth';
    strike.frequency.setValueAtTime(100, now);
    strike.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    strikeFilter.type = 'highpass';
    strikeFilter.frequency.value = 500;

    strikeGain.gain.setValueAtTime(0.15, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    strike.connect(strikeFilter).connect(strikeGain).connect(ctx.destination);
    strike.start(now);
    strike.stop(now + 0.15);

    // Ignite whoosh
    const whoosh = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    const whooshFilter = ctx.createBiquadFilter();

    whoosh.type = 'sawtooth';
    whoosh.frequency.setValueAtTime(200, now + 0.1);
    whoosh.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.value = 1000;
    whooshFilter.Q.value = 0.5;

    whooshGain.gain.setValueAtTime(0, now + 0.1);
    whooshGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    whoosh.connect(whooshFilter).connect(whooshGain).connect(ctx.destination);
    whoosh.start(now + 0.1);
    whoosh.stop(now + 0.5);

    // Warm tone
    const warm = ctx.createOscillator();
    const warmGain = ctx.createGain();

    warm.type = 'sine';
    warm.frequency.value = 300;

    warmGain.gain.setValueAtTime(0, now + 0.3);
    warmGain.gain.linearRampToValueAtTime(0.1, now + 0.4);
    warmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    warm.connect(warmGain).connect(ctx.destination);
    warm.start(now + 0.3);
    warm.stop(now + 0.7);
  }

  // Reset - gentle reset
  playReset(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

const audio = new AudioSystem();

// Track dragging state
let isDragging = false;
let lastDragTime = 0;

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
  game = new MatchstickGame(canvas);
  game.resize();

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    handleInput('down', e);
    isDragging = true;
    audio.playPickup();

    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    renderer?.emitSpark(normX, normY);
  });

  window.addEventListener('mousemove', (e) => {
    handleInput('move', e);

    if (isDragging) {
      const now = performance.now();
      if (now - lastDragTime > 80) {
        audio.playDrag();

        const rect = canvas.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        const normY = (e.clientY - rect.top) / rect.height;
        renderer?.emitEmber(normX, normY);
        lastDragTime = now;
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    handleInput('up', e);
    if (isDragging) {
      audio.playPlace();

      const rect = canvas.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      renderer?.emitSmoke(normX, normY);
    }
    isDragging = false;
  });

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    handleTouch('down', e);
    isDragging = true;
    audio.playPickup();

    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const normX = (touch.clientX - rect.left) / rect.width;
    const normY = (touch.clientY - rect.top) / rect.height;
    renderer?.emitSpark(normX, normY);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    handleTouch('move', e);

    if (isDragging) {
      const now = performance.now();
      if (now - lastDragTime > 80) {
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const normX = (touch.clientX - rect.left) / rect.width;
        const normY = (touch.clientY - rect.top) / rect.height;
        renderer?.emitEmber(normX, normY);
        lastDragTime = now;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    handleTouch('up', e);
    if (isDragging) {
      audio.playPlace();

      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const normX = (touch.clientX - rect.left) / rect.width;
      const normY = (touch.clientY - rect.top) / rect.height;
      renderer?.emitSmoke(normX, normY);
    }
    isDragging = false;
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    movesDisplay.textContent = state.movesRemaining.toString();

    // Update moves card color
    const movesCard = movesDisplay.parentElement;
    if (movesCard) {
      movesCard.classList.toggle('warning', state.movesRemaining === 0);
    }

    if (state.status === 'won') {
      audio.playVictory();
      renderer?.emitVictory(0.5, 0.5);
      showWin(state.level, state.totalLevels);
    }
  });

  window.addEventListener('resize', () => {
    game.resize();

    // Resize WebGPU canvas
    const gpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
    const gameArea = document.querySelector('.game-area');
    if (gpuCanvas && gameArea) {
      const rect = gameArea.getBoundingClientRect();
      gpuCanvas.width = rect.width * window.devicePixelRatio;
      gpuCanvas.height = rect.height * window.devicePixelRatio;
    }
  });
}

function handleInput(type: 'down' | 'move' | 'up', e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: 'down' | 'move' | 'up', e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
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
  }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  hintDisplay.textContent = '';
  audio.playStart();
  game.start();
});

resetBtn.addEventListener('click', () => {
  hintDisplay.textContent = '';
  audio.playReset();
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  hintDisplay.textContent = '';
  audio.playStart();
  game.nextLevel();
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

// Init
initI18n();
initGame();
initWebGPU();
