/**
 * Bomberman Main Entry
 * Game #159
 * Classic Arcade / Explosive / Orange-Red Fire Theme
 */
import { BombermanGame } from './game';
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

let game: BombermanGame;
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

  private playTone(frequency: number, duration: number, type: OscillatorType = 'square', gain: number = 0.15) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 2000;

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
    filter.frequency.value = 1000;

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start();
  }

  bombPlace() {
    this.playTone(80, 0.1, 'sine', 0.1);
    this.playTone(60, 0.15, 'sine', 0.08);
  }

  explosion(power: number = 1) {
    const baseGain = 0.15 + power * 0.03;
    this.playTone(60, 0.3, 'sawtooth', baseGain);
    this.playNoise(0.25, 0.15);
    setTimeout(() => {
      this.playTone(40, 0.2, 'square', 0.1);
      this.playNoise(0.15, 0.1);
    }, 50);
  }

  brickDestroy() {
    this.playNoise(0.08, 0.08);
    this.playTone(250, 0.05, 'square', 0.06);
  }

  playerHit() {
    this.playTone(150, 0.15, 'sawtooth', 0.12);
    this.playNoise(0.12, 0.1);
    this.playTone(100, 0.2, 'square', 0.1);
  }

  enemyDeath() {
    this.playTone(400, 0.1, 'square', 0.1);
    this.playTone(300, 0.1, 'square', 0.08);
    setTimeout(() => this.playTone(200, 0.15, 'square', 0.06), 100);
  }

  powerUp(type: string) {
    const freqMap: Record<string, number> = { bomb: 400, power: 500, speed: 600 };
    const freq = freqMap[type] || 400;
    this.playTone(freq, 0.1, 'sine', 0.1);
    this.playTone(freq * 1.5, 0.1, 'sine', 0.08);
    setTimeout(() => this.playTone(freq * 2, 0.15, 'sine', 0.1), 100);
  }

  gameOver() {
    const notes = [200, 180, 150, 100];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'square', 0.12), i * 200);
    });
    setTimeout(() => this.playNoise(0.4, 0.1), 600);
  }

  victory() {
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.1);
        this.playTone(freq * 1.5, 0.15, 'sine', 0.05);
      }, i * 100);
    });
  }

  start() {
    this.playTone(300, 0.1, 'square', 0.08);
    setTimeout(() => this.playTone(400, 0.1, 'square', 0.08), 100);
    setTimeout(() => this.playTone(500, 0.15, 'square', 0.1), 200);
  }
}

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
  game = new BombermanGame(canvas);
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
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'w', 'a', 's', 'd'].includes(e.key)) {
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

  // Bomb placements
  for (const bp of events.bombPlace) {
    audioSystem?.bombPlace();
    renderer?.emitBombPlace(bp.x, bp.y);
  }

  // Explosions
  for (const exp of events.explosion) {
    audioSystem?.explosion(exp.power);
    renderer?.emitExplosion(exp.x, exp.y, exp.power);
  }

  // Brick destructions
  for (const brick of events.brickDestroy) {
    audioSystem?.brickDestroy();
    renderer?.emitBrickDestroy(brick.x, brick.y);
  }

  // Player hits
  for (const hit of events.playerHit) {
    audioSystem?.playerHit();
    renderer?.emitPlayerHit(hit.x, hit.y);
  }

  // Power-up collections
  for (const pu of events.powerUp) {
    audioSystem?.powerUp(pu.type);
    renderer?.emitPowerUp(pu.x, pu.y, pu.type);
  }

  // Enemy deaths
  for (const ed of events.enemyDeath) {
    audioSystem?.enemyDeath();
    renderer?.emitExplosion(ed.x, ed.y, 1);
  }

  // Game over
  if (events.gameOver) {
    audioSystem?.gameOver();
    renderer?.emitGameOver(0.5, 0.5, false);
  }

  // Victory
  if (events.victory) {
    audioSystem?.victory();
    renderer?.emitVictory(0.5, 0.5);
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
    const width = Math.min(rect.width, 450);
    const height = width * (13 / 15);
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
