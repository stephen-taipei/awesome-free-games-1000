/**
 * Whac-A-Mole Main Entry
 * Game #161
 * Carnival / Fair / Grass Green and Brown Theme
 */
import { WhacAMoleGame } from './game';
import { WebGPURenderer } from './webgpu';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const webgpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const livesDisplay = document.getElementById('lives-display')!;
const levelDisplay = document.getElementById('level-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;

let game: WhacAMoleGame;
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

  private playNoise(duration: number, gain: number = 0.1) {
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

    filter.type = 'lowpass';
    filter.frequency.value = 800;

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start();
  }

  whack() {
    // Bonk sound
    this.playTone(200, 0.08, 'square', 0.15);
    this.playTone(400, 0.05, 'sine', 0.1);
    setTimeout(() => {
      this.playTone(150, 0.06, 'triangle', 0.08);
    }, 30);
  }

  goldenWhack() {
    // Cha-ching sound
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, 'sine', 0.12);
      }, i * 50);
    });
  }

  bombHit() {
    // Explosion sound
    this.playNoise(0.3, 0.2);
    this.playTone(60, 0.25, 'sawtooth', 0.15);
    setTimeout(() => {
      this.playTone(40, 0.2, 'square', 0.1);
    }, 50);
  }

  molePopup() {
    // Pop sound
    this.playTone(300, 0.04, 'sine', 0.06);
    this.playTone(400, 0.03, 'sine', 0.04);
  }

  miss() {
    // Whoosh sound
    this.playTone(100, 0.1, 'triangle', 0.05);
  }

  gameOver() {
    const notes = [300, 250, 200, 150, 100];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sawtooth', 0.1);
      }, i * 150);
    });
  }

  victory() {
    const notes = [262, 330, 392, 523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.12);
        this.playTone(freq * 1.25, 0.12, 'triangle', 0.06);
      }, i * 80);
    });
  }

  start() {
    this.playTone(400, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(500, 0.1, 'sine', 0.08), 100);
    setTimeout(() => this.playTone(600, 0.15, 'sine', 0.1), 200);
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
  game = new WhacAMoleGame(canvas);
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

  const handlePointer = (e: MouseEvent | TouchEvent, type: 'down' | 'move' | 'up') => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX || e.changedTouches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || e.changedTouches[0]?.clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    game.handleInput(type, x, y);
  };

  canvas.addEventListener('mousedown', (e) => handlePointer(e, 'down'));
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointer(e, 'down'); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
      game.handleKey(e.key, true);
    }
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();
    levelDisplay.textContent = state.level.toString();

    // Update renderer level
    renderer?.setLevel(state.level);

    // Process pending events
    processPendingEvents();

    if (state.status === 'lost') {
      showGameOver(state.score);
    } else if (state.status === 'won') {
      showVictory(state.score);
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
    resizeWebGPU();
  });
}

function processPendingEvents() {
  const events = game.pendingEvents;

  // Whack events
  for (const w of events.whack) {
    if (w.type === 'golden') {
      audioSystem?.goldenWhack();
      renderer?.emitGoldenHit(w.x, w.y);
    } else {
      audioSystem?.whack();
      renderer?.emitWhack(w.x, w.y);
    }
  }

  // Bomb hit
  for (const b of events.bombHit) {
    audioSystem?.bombHit();
    renderer?.emitBombHit(b.x, b.y);
  }

  // Mole popup
  for (const m of events.molePopup) {
    audioSystem?.molePopup();
    renderer?.emitMolePopup(m.x, m.y);
  }

  // Miss
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

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.gameOver');
    overlayMsg.textContent = `${i18n.t('game.finalScore')}: ${score}`;
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

function showVictory(score: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.victory');
    overlayMsg.textContent = `${i18n.t('game.finalScore')}: ${score}`;
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
