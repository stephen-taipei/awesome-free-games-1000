/**
 * Basketball Arcade Main Entry
 * Game #166
 * Stadium / Basketball / Orange and Purple Theme
 */
import { BasketballArcadeGame } from './game';
import { WebGPURenderer } from './webgpu';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const webgpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const timeDisplay = document.getElementById('time-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;

let game: BasketballArcadeGame;
let renderer: WebGPURenderer | null = null;
let audioSystem: AudioSystem | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gain: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 3000;

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, gain: number = 0.1, freq: number = 1000) {
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1;

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start();
  }

  shoot() {
    // Swoosh sound
    this.playNoise(0.15, 0.06, 600);
    this.playTone(250, 0.1, 'sine', 0.04);
  }

  score() {
    // Basketball swish + celebration
    this.playNoise(0.2, 0.08, 1500);
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.08);
      }, i * 60);
    });
  }

  rimHit() {
    // Metal rim clang
    this.playTone(800, 0.1, 'triangle', 0.1);
    this.playTone(1200, 0.05, 'sine', 0.06);
    this.playNoise(0.05, 0.05, 2000);
  }

  swish() {
    // Clean swish sound
    this.playNoise(0.3, 0.1, 1200);
    this.playTone(600, 0.1, 'sine', 0.05);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.04), 50);
  }

  miss() {
    // Dull thud
    this.playTone(120, 0.15, 'sine', 0.08);
    this.playNoise(0.1, 0.04, 300);
  }

  gameOver() {
    // Buzzer sound
    this.playTone(220, 0.5, 'sawtooth', 0.08);
    this.playTone(185, 0.5, 'sawtooth', 0.06);
    setTimeout(() => {
      this.playTone(165, 0.4, 'sawtooth', 0.05);
    }, 300);
  }

  victory() {
    // Stadium celebration
    const notes = [392, 523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.1);
        this.playTone(freq * 1.5, 0.15, 'triangle', 0.05);
      }, i * 100);
    });
    setTimeout(() => {
      this.playNoise(0.3, 0.08, 2000);
    }, 400);
  }

  start() {
    // Whistle sound
    this.playTone(1000, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(1000, 0.2, 'sine', 0.08), 250);
  }
}

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh')) i18n.setLocale('zh-TW');
  else if (browserLang.includes('ja')) i18n.setLocale('ja');
  else if (browserLang.includes('ko')) i18n.setLocale('ko');
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
  game = new BasketballArcadeGame(canvas);
  game.resize();

  // Initialize WebGPU
  renderer = new WebGPURenderer(webgpuCanvas);
  const gpuReady = await renderer.initialize();
  if (gpuReady) {
    resizeWebGPU();
    startRenderLoop();
  }

  // Initialize Audio
  audioSystem = new AudioSystem();

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleMouseDown(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('mouseup', () => {
    game.handleMouseUp();
  });

  canvas.addEventListener('mouseleave', () => {
    game.handleMouseUp();
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleMouseDown(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleMouseMove(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    game.handleMouseUp();
  });

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) scoreDisplay.textContent = String(state.score);
    if (state.time !== undefined) timeDisplay.textContent = String(state.time);

    // Process pending events
    processPendingEvents();

    if (state.status === 'over') {
      if (state.score >= 20) {
        showVictory(state.score);
      } else {
        showGameOver(state.score);
      }
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
    resizeWebGPU();
  });
}

function processPendingEvents() {
  const events = game.pendingEvents;

  // Shoot events
  for (const s of events.shoot) {
    audioSystem?.shoot();
    renderer?.emitShoot(s.x, s.y, s.vx, s.vy);
  }

  // Score events
  for (const s of events.score) {
    audioSystem?.score();
    renderer?.emitScore(s.x, s.y, s.points);
  }

  // Rim hit events
  for (const r of events.rimHit) {
    audioSystem?.rimHit();
    renderer?.emitRimHit(r.x, r.y);
  }

  // Swish events
  for (const sw of events.swish) {
    audioSystem?.swish();
    renderer?.emitSwish(sw.x, sw.y);
  }

  // Miss events
  for (const m of events.miss) {
    audioSystem?.miss();
    renderer?.emitMiss(m.x, m.y);
  }

  // Game over
  if (events.gameOver) {
    audioSystem?.gameOver();
    renderer?.emitGameOver(0.5, 0.5, false);
  }

  // Victory
  if (events.victory) {
    audioSystem?.victory();
    renderer?.emitGameOver(0.5, 0.5, true);
  }

  // Start
  if (events.start) {
    audioSystem?.start();
  }

  // Clear events
  game.clearPendingEvents();
}

function resizeWebGPU() {
  if (!renderer) return;
  const container = canvas.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, 450);
    webgpuCanvas.width = size;
    webgpuCanvas.height = size;
    webgpuCanvas.style.width = `${size}px`;
    webgpuCanvas.style.height = `${size}px`;
    renderer.resize(size, size);
  }
}

function startRenderLoop() {
  let lastTime = performance.now();

  function loop() {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    renderer?.render(delta);
    requestAnimationFrame(loop);
  }

  loop();
}

function showGameOver(finalScore: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.gameOver');
    overlayMsg.textContent = `${i18n.t('game.finalScore')}: ${finalScore}`;
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

function showVictory(finalScore: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.victory');
    overlayMsg.textContent = `${i18n.t('game.finalScore')}: ${finalScore}`;
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
});

resetBtn.addEventListener('click', () => {
  game.reset();
  renderer?.clear();
});

initI18n();
initGame();
