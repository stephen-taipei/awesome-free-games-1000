/**
 * Dart Throw Main Entry
 * Game #167
 * Pub / Darts / Red and Green Theme
 */
import { DartThrowGame } from './game';
import { WebGPURenderer } from './webgpu';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const webgpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const roundDisplay = document.getElementById('round-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;

let game: DartThrowGame;
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
    filter.frequency.value = 2500;

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

  throw() {
    // Whoosh sound
    this.playNoise(0.1, 0.06, 500);
    this.playTone(200, 0.08, 'sine', 0.03);
  }

  land() {
    // Dart hitting board - thunk
    this.playTone(300, 0.1, 'sine', 0.1);
    this.playNoise(0.05, 0.06, 1000);
  }

  bullseye() {
    // Celebration sound
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.1);
      }, i * 50);
    });
    this.playNoise(0.1, 0.05, 2000);
  }

  miss() {
    // Dull thud
    this.playTone(100, 0.15, 'sine', 0.06);
    this.playNoise(0.1, 0.04, 300);
  }

  roundEnd() {
    // Round complete chime
    this.playTone(600, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(800, 0.15, 'sine', 0.1), 100);
  }

  gameOver() {
    // Sad pub tune
    const notes = [400, 350, 300, 250];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sawtooth', 0.05);
      }, i * 120);
    });
  }

  victory() {
    // Pub celebration
    const notes = [392, 494, 587, 784, 988];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.1);
        this.playTone(freq * 1.25, 0.15, 'triangle', 0.05);
      }, i * 80);
    });
    setTimeout(() => this.playNoise(0.2, 0.06, 1500), 300);
  }

  start() {
    // Ready sound
    this.playTone(440, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(550, 0.1, 'sine', 0.08), 100);
    setTimeout(() => this.playTone(660, 0.15, 'sine', 0.1), 200);
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
  game = new DartThrowGame(canvas);
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

  canvas.addEventListener('click', () => {
    game.handleClick();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.handleClick();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) scoreDisplay.textContent = String(state.score);
    if (state.round !== undefined) roundDisplay.textContent = `${state.round}/5`;

    // Process pending events
    processPendingEvents();

    if (state.status === 'over') {
      if (state.score >= 100) {
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

  // Throw events
  for (const t of events.throw) {
    audioSystem?.throw();
    renderer?.emitThrow(t.x, t.y);
  }

  // Land events
  for (const l of events.land) {
    audioSystem?.land();
    renderer?.emitLand(l.x, l.y, l.score);
  }

  // Bullseye events
  for (const b of events.bullseye) {
    audioSystem?.bullseye();
    renderer?.emitBullseye(b.x, b.y);
  }

  // Miss events
  for (const m of events.miss) {
    audioSystem?.miss();
    renderer?.emitMiss(m.x, m.y);
  }

  // Round end
  if (events.roundEnd) {
    audioSystem?.roundEnd();
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
