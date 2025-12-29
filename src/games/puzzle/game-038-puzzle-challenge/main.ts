/**
 * Puzzle Challenge Main Entry
 * Glass Workshop / Crystal Mosaic Theme
 * Game #038
 */
import { PuzzleChallengeGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const timeDisplay = document.getElementById('time-display')!;
const piecesDisplay = document.getElementById('pieces-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: PuzzleChallengeGame;
let renderer: WebGPURenderer | null = null;
let animationId: number;

// Glass Workshop Audio System
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

  // Glass chime on piece pickup
  playPickup(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crystal chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.value = 2000;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.05);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Glass shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.value = 2400;

    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.2);
  }

  // Soft glass tap on piece drag
  playDrag(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800 + Math.random() * 400;

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Crystal snap on piece placement
  playSnap(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Snap click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Crystal ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.value = 2000;

    gain2.gain.setValueAtTime(0.15, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.4);
  }

  // Glass clink on piece drop (not in place)
  playDrop(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Warning tick for timer
  playTick(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Crystal cascade on victory
  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Ascending crystal chimes
    const notes = [800, 1000, 1200, 1500, 1800, 2200];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.08;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });

    // Glass shimmer
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noise.type = 'triangle';
    noise.frequency.value = 3000;

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 4000;
    noiseFilter.Q.value = 2;

    noiseGain.gain.setValueAtTime(0, now + 0.3);
    noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(now + 0.3);
    noise.stop(now + 1.2);

    // Final chord
    [1500, 1875, 2250].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + 0.5);
      osc.stop(now + 1.5);
    });
  }

  // Glass shatter on lose
  playLose(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crack sound
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, now + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(100, now + i * 0.03 + 0.1);

      gain.gain.setValueAtTime(0.12, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.15);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.15);
    }

    // Descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Workshop ambiance on start
  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Gentle glass chime
    const chimeNotes = [600, 900, 1200];
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.15;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });

    // Ready shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const shimmerFilter = ctx.createBiquadFilter();

    shimmer.type = 'triangle';
    shimmer.frequency.value = 1500;

    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.value = 1000;

    shimmerGain.gain.setValueAtTime(0, now + 0.4);
    shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    shimmer.connect(shimmerFilter).connect(shimmerGain).connect(ctx.destination);
    shimmer.start(now + 0.4);
    shimmer.stop(now + 0.9);
  }
}

const audio = new AudioSystem();

// Track game state for WebGPU effects
let previousPlacedCount = 0;
let isDragging = false;
let lastDragTime = 0;
let lastTimeRemaining = 0;
let lastTickTime = 0;

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
  game = new PuzzleChallengeGame(canvas);
  game.resize();

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    handleInput('down', e);
    isDragging = true;
    audio.playPickup();

    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    renderer?.emitSparkle(normX, normY);
  });

  window.addEventListener('mousemove', (e) => {
    handleInput('move', e);

    if (isDragging) {
      const now = performance.now();
      if (now - lastDragTime > 50) {
        const rect = canvas.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        const normY = (e.clientY - rect.top) / rect.height;
        renderer?.emitDrag(normX, normY);
        lastDragTime = now;
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    handleInput('up', e);
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
    renderer?.emitSparkle(normX, normY);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    handleTouch('move', e);

    if (isDragging) {
      const now = performance.now();
      if (now - lastDragTime > 50) {
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const normX = (touch.clientX - rect.left) / rect.width;
        const normY = (touch.clientY - rect.top) / rect.height;
        renderer?.emitDrag(normX, normY);
        lastDragTime = now;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    handleTouch('up', e);
    isDragging = false;
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    timeDisplay.textContent = `${state.timeRemaining}s`;
    piecesDisplay.textContent = `${state.placedCount}/${state.totalPieces}`;

    // Check for piece placement
    if (state.placedCount > previousPlacedCount) {
      audio.playSnap();
      renderer?.emitSnap(0.5, 0.5);
    }
    previousPlacedCount = state.placedCount;

    // Timer urgency for WebGPU effect
    const totalTime = 60;
    const progress = 1 - (state.timeRemaining / totalTime);
    const urgency = state.timeRemaining <= 10 ? 1.0 : state.timeRemaining <= 20 ? 0.5 : 0;
    renderer?.setTimerState(progress, urgency);

    // Timer tick sound
    if (state.timeRemaining <= 10 && state.timeRemaining !== lastTimeRemaining) {
      const now = performance.now();
      if (now - lastTickTime > 900) {
        audio.playTick();
        lastTickTime = now;
      }
    }
    lastTimeRemaining = state.timeRemaining;

    // Update time display color
    const timeCard = timeDisplay.parentElement;
    if (timeCard) {
      if (state.timeRemaining <= 10) {
        timeCard.classList.add('danger');
      } else if (state.timeRemaining <= 20) {
        timeCard.classList.add('warning');
        timeCard.classList.remove('danger');
      } else {
        timeCard.classList.remove('warning', 'danger');
      }
    }

    if (state.status === 'won') {
      audio.playVictory();
      renderer?.emitVictory(0.5, 0.5);
      showWin(state.level, state.totalLevels);
    } else if (state.status === 'lost') {
      audio.playLose();
      showLose();
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

  if (type === 'up' && isDragging) {
    audio.playDrop();
  }
}

function handleTouch(type: 'down' | 'move' | 'up', e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);

  if (type === 'up' && isDragging) {
    audio.playDrop();
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
  previousPlacedCount = 0;
  audio.playStart();
  game.reset();
});

resetBtn.addEventListener('click', () => {
  previousPlacedCount = 0;
  audio.playStart();
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  previousPlacedCount = 0;
  audio.playStart();
  game.nextLevel();
});

// Cleanup
window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationId);
  renderer?.destroy();
  game.destroy();
});

// Init
initI18n();
initGame();
initWebGPU();
