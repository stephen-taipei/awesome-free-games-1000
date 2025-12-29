/**
 * Gravity Blocks Main Entry
 * Space Station / Zero-G Lab Theme
 * Game #036
 */
import { GravityBlocksGame, Block } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Space Station Theme
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

  // Platform grab - energy field activation
  playGrab(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Energy field hum
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(5, now);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // Energy burst
    const burst = ctx.createOscillator();
    const burstGain = ctx.createGain();

    burst.type = 'sine';
    burst.frequency.setValueAtTime(880, now);
    burst.frequency.exponentialRampToValueAtTime(440, now + 0.08);

    burstGain.gain.setValueAtTime(0.12, now);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    burst.connect(burstGain);
    burstGain.connect(ctx.destination);

    burst.start(now);
    burst.stop(now + 0.1);
  }

  // Platform drop - release sound
  playDrop(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Energy release
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // Metallic clunk
    const clunk = ctx.createOscillator();
    const clunkGain = ctx.createGain();
    const clunkFilter = ctx.createBiquadFilter();

    clunkFilter.type = 'bandpass';
    clunkFilter.frequency.setValueAtTime(300, now);
    clunkFilter.Q.setValueAtTime(10, now);

    clunk.type = 'triangle';
    clunk.frequency.setValueAtTime(150, now);

    clunkGain.gain.setValueAtTime(0.1, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    clunk.connect(clunkFilter);
    clunkFilter.connect(clunkGain);
    clunkGain.connect(ctx.destination);

    clunk.start(now);
    clunk.stop(now + 0.08);
  }

  // Block collision - energy impact
  playCollision(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Impact burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, now);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);

    // Energy spark
    const spark = ctx.createOscillator();
    const sparkGain = ctx.createGain();

    spark.type = 'sine';
    spark.frequency.setValueAtTime(1200, now);
    spark.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    sparkGain.gain.setValueAtTime(0.08, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    spark.connect(sparkGain);
    sparkGain.connect(ctx.destination);

    spark.start(now);
    spark.stop(now + 0.06);
  }

  // Block bounce - softer impact
  playBounce(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Block landing on target
  playLanding(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Success tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.setValueAtTime(659, now + 0.1);
    osc.frequency.setValueAtTime(784, now + 0.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);

    // Energy pulse
    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();

    pulse.type = 'triangle';
    pulse.frequency.setValueAtTime(220, now);

    pulseGain.gain.setValueAtTime(0.08, now);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    pulse.connect(pulseGain);
    pulseGain.connect(ctx.destination);

    pulse.start(now);
    pulse.stop(now + 0.35);
  }

  // Gravity change indication
  playGravityShift(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Whoosh
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(200, now + 0.3);
    filter.Q.setValueAtTime(2, now);

    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(100, now);

    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.35);
  }

  // Victory - space station fanfare
  playVictory(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Ascending arpeggio
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });

    // Victory chord
    const chordNotes = [523, 659, 784, 1047];
    chordNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now + 0.6);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.6);
      osc.stop(now + 1.6);
    });

    // Shimmer
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + Math.random() * 1500, now + 0.6);

      gain.gain.setValueAtTime(0, now + 0.6 + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.65 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0 + i * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.6 + i * 0.1);
      osc.stop(now + 1.1 + i * 0.1);
    }
  }

  // Game start - station systems online
  playStart(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Power up sequence
    const powerUp = ctx.createOscillator();
    const powerGain = ctx.createGain();
    const powerFilter = ctx.createBiquadFilter();

    powerFilter.type = 'lowpass';
    powerFilter.frequency.setValueAtTime(200, now);
    powerFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.8);

    powerUp.type = 'sawtooth';
    powerUp.frequency.setValueAtTime(55, now);
    powerUp.frequency.exponentialRampToValueAtTime(110, now + 0.8);

    powerGain.gain.setValueAtTime(0, now);
    powerGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    powerGain.gain.linearRampToValueAtTime(0.08, now + 0.6);
    powerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    powerUp.connect(powerFilter);
    powerFilter.connect(powerGain);
    powerGain.connect(ctx.destination);

    powerUp.start(now);
    powerUp.stop(now + 1.0);

    // System beeps
    const beepTimes = [0.3, 0.5, 0.7];
    beepTimes.forEach((time) => {
      const beep = ctx.createOscillator();
      const beepGain = ctx.createGain();

      beep.type = 'sine';
      beep.frequency.setValueAtTime(880, now + time);

      beepGain.gain.setValueAtTime(0, now + time);
      beepGain.gain.linearRampToValueAtTime(0.1, now + time + 0.02);
      beepGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.1);

      beep.connect(beepGain);
      beepGain.connect(ctx.destination);

      beep.start(now + time);
      beep.stop(now + time + 0.12);
    });

    // Ready tone
    const ready = ctx.createOscillator();
    const readyGain = ctx.createGain();

    ready.type = 'sine';
    ready.frequency.setValueAtTime(659, now + 0.9);
    ready.frequency.setValueAtTime(784, now + 1.0);

    readyGain.gain.setValueAtTime(0, now + 0.9);
    readyGain.gain.linearRampToValueAtTime(0.12, now + 0.95);
    readyGain.gain.linearRampToValueAtTime(0.12, now + 1.05);
    readyGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    ready.connect(readyGain);
    readyGain.connect(ctx.destination);

    ready.start(now + 0.9);
    ready.stop(now + 1.35);
  }
}

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const movesDisplay = document.getElementById('moves-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: GravityBlocksGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking for effects
interface PreviousState {
  blockPositions: Map<number, { x: number; y: number }>;
  isDragging: boolean;
  dragX: number;
  dragY: number;
}

let previousState: PreviousState = {
  blockPositions: new Map(),
  isDragging: false,
  dragX: 0,
  dragY: 0
};

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
  game = new GravityBlocksGame(canvas);
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

  // Mouse events
  canvas.addEventListener('mousedown', (e) => handleInput('down', e));
  window.addEventListener('mousemove', (e) => handleInput('move', e));
  window.addEventListener('mouseup', (e) => handleInput('up', e));

  // Touch events
  canvas.addEventListener('touchstart', (e) => handleTouch('down', e), { passive: false });
  window.addEventListener('touchmove', (e) => handleTouch('move', e), { passive: false });
  window.addEventListener('touchend', (e) => handleTouch('up', e), { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    movesDisplay.textContent = state.moves.toString();

    if (state.status === 'won') {
      audio.playVictory();
      renderer?.triggerVictory();
      showWin(state.level, state.totalLevels);
    }

    // Update gravity visualization
    if (renderer) {
      const gravity = (game as any).gravity;
      renderer.setGravity(gravity.x, gravity.y);
    }
  });

  // Track block states for collision effects
  setInterval(() => {
    if (!game || (game as any).status !== 'playing') return;

    const blocks = (game as any).blocks as Block[];
    blocks.forEach((block: Block) => {
      if (block.isPlayer) {
        const prev = previousState.blockPositions.get(block.id);
        if (prev) {
          const dx = Math.abs(block.x - prev.x);
          const dy = Math.abs(block.y - prev.y);
          const speed = Math.sqrt(block.vx ** 2 + block.vy ** 2);

          // Detect collision (sudden velocity change)
          if (speed > 2 && (dx > 5 || dy > 5)) {
            const normX = (block.x + block.width / 2) / canvas.width;
            const normY = (block.y + block.height / 2) / canvas.height;
            renderer?.emitCollision(normX, normY);
            audio.playCollision();
          }

          // Detect bounce (velocity direction change)
          if (Math.abs(block.vx) > 1 || Math.abs(block.vy) > 1) {
            const normX = (block.x + block.width / 2) / canvas.width;
            const normY = (block.y + block.height / 2) / canvas.height;
            renderer?.emitBounce(normX, normY);
          }
        }

        previousState.blockPositions.set(block.id, { x: block.x, y: block.y });
      }
    });
  }, 50);

  window.addEventListener('resize', () => game.resize());
}

function handleInput(type: 'down' | 'move' | 'up', e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === 'down') {
    audio.playGrab();
    previousState.isDragging = true;
    previousState.dragX = x;
    previousState.dragY = y;
  } else if (type === 'move' && previousState.isDragging) {
    const normX = x / canvas.width;
    const normY = y / canvas.height;
    renderer?.emitDrag(normX, normY);
  } else if (type === 'up' && previousState.isDragging) {
    audio.playDrop();
    previousState.isDragging = false;
  }

  game.handleInput(type, x, y);
}

function handleTouch(type: 'down' | 'move' | 'up', e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (type === 'down') {
    audio.playGrab();
    previousState.isDragging = true;
    previousState.dragX = x;
    previousState.dragY = y;
  } else if (type === 'move' && previousState.isDragging) {
    const normX = x / canvas.width;
    const normY = y / canvas.height;
    renderer?.emitDrag(normX, normY);
  } else if (type === 'up' && previousState.isDragging) {
    audio.playDrop();
    previousState.isDragging = false;
  }

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
      overlayMsg.textContent = `${i18n.t('game.level')} ${level} ${i18n.t('game.complete')}`;
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
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  game.reset();
});

resetBtn.addEventListener('click', () => {
  audio.playStart();
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  audio.playStart();
  game.nextLevel();
});

// Init
initI18n();
initGame();
