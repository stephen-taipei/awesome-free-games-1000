/**
 * Circuit Connect Main Entry
 * Neon Circuit Board / Cyberpunk Electronics Theme
 * Game #037
 */
import { CircuitGame, CircuitNode } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Cyberpunk Electronics Theme
class AudioSystem {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Wire rotation click - digital snap
  playRotate(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Digital click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();

    click.type = 'square';
    click.frequency.setValueAtTime(1200, now);
    click.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    clickGain.gain.setValueAtTime(0.15, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    click.connect(clickGain);
    clickGain.connect(ctx.destination);

    click.start(now);
    click.stop(now + 0.06);

    // Electric zap
    const zap = ctx.createOscillator();
    const zapGain = ctx.createGain();
    const zapFilter = ctx.createBiquadFilter();

    zapFilter.type = 'highpass';
    zapFilter.frequency.setValueAtTime(2000, now);

    zap.type = 'sawtooth';
    zap.frequency.setValueAtTime(800, now);
    zap.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    zapGain.gain.setValueAtTime(0.08, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    zap.connect(zapFilter);
    zapFilter.connect(zapGain);
    zapGain.connect(ctx.destination);

    zap.start(now);
    zap.stop(now + 0.1);
  }

  // Power connected - circuit complete sound
  playConnect(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Rising tone
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();

    tone.type = 'sine';
    tone.frequency.setValueAtTime(440, now);
    tone.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    toneGain.gain.setValueAtTime(0.12, now);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    tone.connect(toneGain);
    toneGain.connect(ctx.destination);

    tone.start(now);
    tone.stop(now + 0.22);

    // Energy hum
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();

    hum.type = 'triangle';
    hum.frequency.setValueAtTime(220, now);

    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    hum.connect(humGain);
    humGain.connect(ctx.destination);

    hum.start(now);
    hum.stop(now + 0.35);
  }

  // Power disconnected - circuit break
  playDisconnect(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Falling tone
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();

    tone.type = 'sine';
    tone.frequency.setValueAtTime(660, now);
    tone.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    toneGain.gain.setValueAtTime(0.1, now);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    tone.connect(toneGain);
    toneGain.connect(ctx.destination);

    tone.start(now);
    tone.stop(now + 0.15);
  }

  // Bulb lit - success chime
  playBulbLit(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Bright chime
    const notes = [880, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Victory - full circuit celebration
  playVictory(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Power-up sequence
    const powerUp = ctx.createOscillator();
    const powerGain = ctx.createGain();
    const powerFilter = ctx.createBiquadFilter();

    powerFilter.type = 'lowpass';
    powerFilter.frequency.setValueAtTime(500, now);
    powerFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.5);

    powerUp.type = 'sawtooth';
    powerUp.frequency.setValueAtTime(110, now);
    powerUp.frequency.exponentialRampToValueAtTime(440, now + 0.5);

    powerGain.gain.setValueAtTime(0, now);
    powerGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    powerGain.gain.linearRampToValueAtTime(0.08, now + 0.4);
    powerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    powerUp.connect(powerFilter);
    powerFilter.connect(powerGain);
    powerGain.connect(ctx.destination);

    powerUp.start(now);
    powerUp.stop(now + 0.65);

    // Victory arpeggio
    const victoryNotes = [523, 659, 784, 1047, 1319, 1568];
    victoryNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + 0.5 + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });

    // Final chord
    const chordNotes = [523, 659, 784, 1047];
    chordNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now + 1.1);
      gain.gain.linearRampToValueAtTime(0.1, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 1.1);
      osc.stop(now + 2.1);
    });
  }

  // Game start - system boot
  playStart(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Boot sequence
    const bootTimes = [0, 0.15, 0.3];
    const bootFreqs = [440, 554, 659];

    bootTimes.forEach((time, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(bootFreqs[i], now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.1, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + 0.15);
    });

    // System hum
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    const humFilter = ctx.createBiquadFilter();

    humFilter.type = 'lowpass';
    humFilter.frequency.setValueAtTime(300, now);

    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(55, now);

    humGain.gain.setValueAtTime(0, now + 0.4);
    humGain.gain.linearRampToValueAtTime(0.06, now + 0.6);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(ctx.destination);

    hum.start(now + 0.4);
    hum.stop(now + 1.1);

    // Ready beep
    const ready = ctx.createOscillator();
    const readyGain = ctx.createGain();

    ready.type = 'sine';
    ready.frequency.setValueAtTime(880, now + 0.8);

    readyGain.gain.setValueAtTime(0, now + 0.8);
    readyGain.gain.linearRampToValueAtTime(0.12, now + 0.82);
    readyGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    ready.connect(readyGain);
    readyGain.connect(ctx.destination);

    ready.start(now + 0.8);
    ready.stop(now + 1.05);
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

let game: CircuitGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let previousPoweredCount = 0;

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
  game = new CircuitGame(canvas);
  game.resize();

  // Initialize WebGPU
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.className = 'webgpu-overlay';
  canvas.parentElement?.appendChild(webgpuCanvas);

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.initialize();

  if (success) {
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      webgpuCanvas.width = rect.width * window.devicePixelRatio;
      webgpuCanvas.height = rect.height * window.devicePixelRatio;
      webgpuCanvas.style.width = `${rect.width}px`;
      webgpuCanvas.style.height = `${rect.height}px`;
      renderer?.resize(webgpuCanvas.width, webgpuCanvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Start render loop
    function renderLoop() {
      renderer?.render();
      requestAnimationFrame(renderLoop);
    }
    renderLoop();
  }

  // Click events with effects
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get grid info before click
    const gridSize = (game as any).gridSize;
    const cellSize = (game as any).cellSize;
    const offsetX = (canvas.width - gridSize * cellSize) / 2;
    const offsetY = (canvas.height - gridSize * cellSize) / 2;

    const gridX = Math.floor((x - offsetX) / cellSize);
    const gridY = Math.floor((y - offsetY) / cellSize);

    if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
      const grid = (game as any).grid as CircuitNode[][];
      const node = grid[gridY]?.[gridX];

      if (node && (node.type === 'wire' || node.type === 'switch')) {
        // Emit effects at normalized position
        const normX = (offsetX + gridX * cellSize + cellSize / 2) / canvas.width;
        const normY = (offsetY + gridY * cellSize + cellSize / 2) / canvas.height;

        audio.playRotate();
        renderer?.emitSpark(normX, normY);
        renderer?.emitRotate(normX, normY);
      }
    }

    game.handleClick(x, y);
    checkPowerState();
  });

  // Touch events
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Get grid info
    const gridSize = (game as any).gridSize;
    const cellSize = (game as any).cellSize;
    const offsetX = (canvas.width - gridSize * cellSize) / 2;
    const offsetY = (canvas.height - gridSize * cellSize) / 2;

    const gridX = Math.floor((x - offsetX) / cellSize);
    const gridY = Math.floor((y - offsetY) / cellSize);

    if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
      const grid = (game as any).grid as CircuitNode[][];
      const node = grid[gridY]?.[gridX];

      if (node && (node.type === 'wire' || node.type === 'switch')) {
        const normX = (offsetX + gridX * cellSize + cellSize / 2) / canvas.width;
        const normY = (offsetY + gridY * cellSize + cellSize / 2) / canvas.height;

        audio.playRotate();
        renderer?.emitSpark(normX, normY);
        renderer?.emitRotate(normX, normY);
      }
    }

    game.handleClick(x, y);
    checkPowerState();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;

    if (state.status === 'won') {
      audio.playVictory();
      renderer?.triggerVictory();
      showWin(state.level, state.totalLevels);
    }
  });

  window.addEventListener('resize', () => game.resize());
}

function checkPowerState(): void {
  const grid = (game as any).grid as CircuitNode[][];
  let poweredCount = 0;

  grid.forEach((row) => {
    row.forEach((node) => {
      if (node.powered) poweredCount++;
    });
  });

  if (poweredCount > previousPoweredCount) {
    audio.playConnect();

    // Emit power effects at powered nodes
    const gridSize = (game as any).gridSize;
    const cellSize = (game as any).cellSize;
    const offsetX = (canvas.width - gridSize * cellSize) / 2;
    const offsetY = (canvas.height - gridSize * cellSize) / 2;

    grid.forEach((row, y) => {
      row.forEach((node, x) => {
        if (node.powered && node.type !== 'power') {
          const normX = (offsetX + x * cellSize + cellSize / 2) / canvas.width;
          const normY = (offsetY + y * cellSize + cellSize / 2) / canvas.height;
          renderer?.emitPower(normX, normY);
        }
      });
    });
  } else if (poweredCount < previousPoweredCount) {
    audio.playDisconnect();
  }

  // Check if bulb just lit
  const bulbLit = grid.some(row => row.some(node => node.type === 'bulb' && node.powered));
  const wasBulbLit = previousPoweredCount > 0 && grid.some(row =>
    row.some(node => node.type === 'bulb')
  );

  if (bulbLit && poweredCount > previousPoweredCount) {
    audio.playBulbLit();
  }

  previousPoweredCount = poweredCount;
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

function startGame() {
  overlay.style.display = 'none';
  nextBtn.style.display = 'none';
  audio.playStart();
  game.start();
  previousPoweredCount = 0;
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  game.reset();
  previousPoweredCount = 0;
});

resetBtn.addEventListener('click', () => {
  audio.playStart();
  game.reset();
  previousPoweredCount = 0;
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  game.nextLevel();
  previousPoweredCount = 0;
});

// Init
initI18n();
initGame();
