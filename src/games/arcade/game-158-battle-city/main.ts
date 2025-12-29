/**
 * Battle City Main Entry
 * Game #158
 * Military / Tank Warfare / Olive Green Theme
 */
import { BattleCityGame } from './game';
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

let game: BattleCityGame;
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
    filter.frequency.value = 1500;

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

  shoot() {
    this.playTone(200, 0.08, 'square', 0.1);
    this.playNoise(0.03, 0.05);
  }

  enemyShoot() {
    this.playTone(150, 0.06, 'sawtooth', 0.08);
  }

  tankExplosion(tankType: string) {
    const baseFreq = tankType === 'armor' ? 60 : tankType === 'power' ? 80 : 100;
    this.playTone(baseFreq, 0.4, 'sawtooth', 0.2);
    this.playNoise(0.3, 0.15);
    setTimeout(() => this.playTone(baseFreq * 0.6, 0.3, 'square', 0.1), 50);
  }

  playerHit() {
    this.playTone(100, 0.2, 'sawtooth', 0.15);
    this.playNoise(0.15, 0.1);
  }

  brickDestroy() {
    this.playNoise(0.08, 0.08);
    this.playTone(300, 0.05, 'square', 0.05);
  }

  steelHit() {
    this.playTone(800, 0.1, 'sine', 0.1);
    this.playTone(400, 0.1, 'sine', 0.08);
  }

  gameOver() {
    const notes = [200, 150, 100, 80];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'square', 0.12), i * 250);
    });
    setTimeout(() => this.playNoise(0.5, 0.1), 750);
  }

  victory() {
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'square', 0.1);
        this.playTone(freq * 1.5, 0.15, 'sine', 0.05);
      }, i * 100);
    });
  }

  start() {
    this.playTone(200, 0.1, 'square', 0.08);
    setTimeout(() => this.playTone(300, 0.1, 'square', 0.08), 100);
    setTimeout(() => this.playTone(400, 0.15, 'square', 0.1), 200);
  }

  levelComplete() {
    const notes = [392, 440, 494, 523];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.1), i * 150);
    });
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
  game = new BattleCityGame(canvas);
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

  // Muzzle flashes
  for (const flash of events.muzzleFlash) {
    audioSystem?.shoot();
    renderer?.emitMuzzleFlash(flash.x, flash.y, flash.direction);
  }

  // Tank explosions
  for (const exp of events.tankExplosion) {
    audioSystem?.tankExplosion(exp.tankType);
    renderer?.emitTankExplosion(exp.x, exp.y, exp.tankType);
  }

  // Player hits
  for (const hit of events.playerHit) {
    audioSystem?.playerHit();
    renderer?.emitPlayerHit(hit.x, hit.y);
  }

  // Brick debris
  for (const brick of events.brickDebris) {
    audioSystem?.brickDestroy();
    renderer?.emitBrickDebris(brick.x, brick.y);
  }

  // Smoke
  for (const s of events.smoke) {
    audioSystem?.steelHit();
    renderer?.emitSmoke(s.x, s.y);
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
