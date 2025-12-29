/**
 * Pinball Main Entry
 * Game #160
 * Arcade / Neon / Chrome-Silver-Orange Theme
 */
import { PinballGame } from './game';
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

let game: PinballGame;
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

  bumperHit(points: number) {
    // Higher frequency for higher points
    const baseFreq = 300 + points * 2;
    this.playTone(baseFreq, 0.08, 'sine', 0.15);
    this.playTone(baseFreq * 1.5, 0.06, 'triangle', 0.1);
    setTimeout(() => {
      this.playTone(baseFreq * 2, 0.05, 'sine', 0.08);
    }, 40);
  }

  targetLit() {
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, 'sine', 0.1);
      }, i * 60);
    });
  }

  launch(power: number) {
    // Spring sound
    const normalizedPower = Math.min(power / 30, 1);
    this.playTone(100 + normalizedPower * 200, 0.15, 'sawtooth', 0.08);
    this.playTone(80, 0.1, 'square', 0.06);
    setTimeout(() => {
      this.playTone(200 + normalizedPower * 400, 0.1, 'sine', 0.1);
    }, 50);
  }

  flipperHit() {
    this.playTone(200, 0.05, 'square', 0.08);
    this.playTone(300, 0.04, 'sine', 0.06);
  }

  ballLost() {
    const notes = [400, 300, 200, 150];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'triangle', 0.1);
      }, i * 150);
    });
  }

  gameOver() {
    const notes = [300, 250, 200, 150, 100];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sawtooth', 0.1);
      }, i * 200);
    });
  }

  victory() {
    const notes = [392, 494, 587, 659, 784, 880, 988];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.12);
        this.playTone(freq * 1.5, 0.15, 'triangle', 0.06);
      }, i * 100);
    });
  }

  start() {
    this.playTone(300, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.08), 100);
    setTimeout(() => this.playTone(500, 0.15, 'sine', 0.1), 200);
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
  game = new PinballGame(canvas);
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
  canvas.addEventListener('mousemove', (e) => handlePointer(e, 'move'));
  canvas.addEventListener('mouseup', (e) => handlePointer(e, 'up'));

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointer(e, 'down'); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePointer(e, 'move'); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); handlePointer(e, 'up'); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', ' ', 'a', 'd', 'z', 's', '/'].includes(e.key)) {
      e.preventDefault();
      game.handleKey(e.key, true);
    }
  });

  window.addEventListener('keyup', (e) => {
    game.handleKey(e.key, false);
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

  // Bumper hits
  for (const bh of events.bumperHit) {
    audioSystem?.bumperHit(bh.points);
    renderer?.emitBumperHit(bh.x, bh.y, bh.points);
  }

  // Target lit
  for (const tl of events.targetLit) {
    audioSystem?.targetLit();
    renderer?.emitTargetLit(tl.x, tl.y);
  }

  // Launch
  for (const l of events.launch) {
    audioSystem?.launch(l.power);
    renderer?.emitLaunch(l.x, l.y, l.power);
  }

  // Flipper hits
  for (const fh of events.flipperHit) {
    audioSystem?.flipperHit();
    renderer?.emitFlipperHit(fh.x, fh.y, fh.side);
  }

  // Ball lost
  for (const bl of events.ballLost) {
    audioSystem?.ballLost();
    renderer?.emitBallLost(bl.x, bl.y);
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
    const width = Math.min(rect.width, 400);
    const height = width * 1.4;
    webgpuCanvas.width = width;
    webgpuCanvas.height = height;
    webgpuCanvas.style.width = `${width}px`;
    webgpuCanvas.style.height = `${height}px`;
    renderer.resize(width, height);
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
