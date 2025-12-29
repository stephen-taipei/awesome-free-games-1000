/**
 * Rotate Blocks Main Entry
 * Mechanical Workshop / Steampunk Factory Theme
 * Game #042
 */
import { RotateBlocksGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Steampunk mechanical sounds
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  // Block pickup - metal scrape
  playPickup() {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.05);
    osc.frequency.linearRampToValueAtTime(250, now + 0.1);

    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Block drop/place - metal clunk
  playPlace() {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Block rotate - gear click
  playRotate() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Mechanical gear click sequence
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + i * 0.04;
      osc.type = 'square';
      osc.frequency.setValueAtTime(400 + i * 100, startTime);
      osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.03);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.05);
    }
  }

  // Drag sound - metal sliding
  playDrag() {
    const ctx = this.init();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.1);

    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Block snapped into place
  playSnap() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Satisfying mechanical snap
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.08);

    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);

    // Success chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.value = 880;

    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.05);
    osc2.stop(now + 0.25);
  }

  // Victory - steam whistle celebration
  playVictory() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Steam whistle
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    const whistleFilter = ctx.createBiquadFilter();

    whistle.type = 'sawtooth';
    whistle.frequency.setValueAtTime(600, now);
    whistle.frequency.linearRampToValueAtTime(800, now + 0.1);
    whistle.frequency.setValueAtTime(800, now + 0.6);
    whistle.frequency.linearRampToValueAtTime(600, now + 0.8);

    whistleFilter.type = 'bandpass';
    whistleFilter.frequency.value = 1200;
    whistleFilter.Q.value = 3;

    whistleGain.gain.setValueAtTime(0, now);
    whistleGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    whistleGain.gain.setValueAtTime(0.2, now + 0.6);
    whistleGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    whistle.connect(whistleFilter);
    whistleFilter.connect(whistleGain);
    whistleGain.connect(ctx.destination);

    whistle.start(now);
    whistle.stop(now + 1.0);

    // Victory chimes
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + 0.3 + i * 0.15;
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // Start game - machine power up
  playStart() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Power up hum
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    // Click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();

    click.type = 'square';
    click.frequency.value = 300;

    clickGain.gain.setValueAtTime(0.15, now + 0.3);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    click.connect(clickGain);
    clickGain.connect(ctx.destination);

    click.start(now + 0.3);
    click.stop(now + 0.35);
  }
}

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: RotateBlocksGame;
const audio = new AudioSystem();
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let animationId: number | null = null;

// State tracking
let previousStatus = 'paused';
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
  game = new RotateBlocksGame(canvas);
  game.resize();

  // Mouse events with audio/effects
  canvas.addEventListener('mousedown', (e) => {
    handleInput('down', e);
    isDragging = true;
    audio.playPickup();
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    webgpuRenderer?.emitSpark(nx, ny);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      handleInput('move', e);
      const now = Date.now();
      if (now - lastDragTime > 100) {
        audio.playDrag();
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
          webgpuRenderer?.emitSpark(nx, ny);
        }
        lastDragTime = now;
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isDragging) {
      handleInput('up', e);
      isDragging = false;
      audio.playPlace();
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        webgpuRenderer?.emitPlace(nx, ny);
      }
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    handleInput('dblclick', e);
    audio.playRotate();
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    webgpuRenderer?.emitRotate(nx, ny);
  });

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    handleTouch('down', e);
    isDragging = true;
    audio.playPickup();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const nx = (touch.clientX - rect.left) / rect.width;
    const ny = (touch.clientY - rect.top) / rect.height;
    webgpuRenderer?.emitSpark(nx, ny);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isDragging) {
      handleTouch('move', e);
      const now = Date.now();
      if (now - lastDragTime > 100) {
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const nx = (touch.clientX - rect.left) / rect.width;
        const ny = (touch.clientY - rect.top) / rect.height;
        if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
          webgpuRenderer?.emitSpark(nx, ny);
        }
        lastDragTime = now;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (isDragging) {
      handleTouch('up', e);
      isDragging = false;
      audio.playPlace();
    }
  }, { passive: false });

  // Double tap for rotation
  let lastTap = 0;
  canvas.addEventListener('touchstart', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      game.handleInput('dblclick', x, y);
      audio.playRotate();
      const nx = x / rect.width;
      const ny = y / rect.height;
      webgpuRenderer?.emitRotate(nx, ny);
    }
    lastTap = now;
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;

    if (state.status === 'won' && previousStatus !== 'won') {
      audio.playVictory();
      webgpuRenderer?.emitVictory(0.5, 0.4);
      showWin(state.level, state.totalLevels);
    }

    previousStatus = state.status;
  });

  window.addEventListener('resize', () => game.resize());
}

function handleInput(type: 'down' | 'move' | 'up' | 'dblclick', e: MouseEvent) {
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
  }, 300);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  previousStatus = 'playing';
  game.start();
});

resetBtn.addEventListener('click', () => {
  audio.playStart();
  previousStatus = 'playing';
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  previousStatus = 'playing';
  game.nextLevel();
});

// Init
initI18n();
initWebGPU();
initGame();
