/**
 * Golf Puzzle Main Entry
 * Lush Golf Course / Country Club Theme
 * Game #044
 */
import { GolfPuzzleGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

// Audio System - Golf course sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Club hitting ball - satisfying thwack
  playHit(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Impact thwack
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // High ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(2000, now);
    ping.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
    pingGain.gain.setValueAtTime(0.08, now);
    pingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now);
    ping.stop(now + 0.08);
  }

  // Ball rolling on grass
  playRoll(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Soft rumble
    const noise = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    noise.type = 'triangle';
    noise.frequency.value = 60 + Math.random() * 20;

    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Ball hitting wall - bounce
  playBounce(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Ball going in hole
  playHoleIn(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Satisfying plop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    // Hollow cup sound
    const cup = ctx.createOscillator();
    const cupGain = ctx.createGain();
    cup.type = 'triangle';
    cup.frequency.value = 180;
    cupGain.gain.setValueAtTime(0.08, now + 0.05);
    cupGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    cup.connect(cupGain);
    cupGain.connect(ctx.destination);
    cup.start(now + 0.05);
    cup.stop(now + 0.3);
  }

  // Victory fanfare
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Triumphant golf clap melody
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.15;
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });

    // Crowd applause simulation
    for (let i = 0; i < 8; i++) {
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const delay = 0.3 + i * 0.1;
      noise.type = 'sawtooth';
      noise.frequency.value = 1000 + Math.random() * 500;

      filter.type = 'highpass';
      filter.frequency.value = 2000;

      noiseGain.gain.setValueAtTime(0.02, now + delay);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now + delay);
      noise.stop(now + delay + 0.1);
    }
  }

  // Under par celebration (extra special)
  playUnderPar(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Eagle sound effect
    const notes = [659, 784, 988, 1318, 1568]; // E5, G5, B5, E6, G6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.1;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.01;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.5);
      osc2.stop(now + delay + 0.5);
    });
  }

  // Reset sound
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Start aiming
  playAim(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }
}

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const strokesDisplay = document.getElementById('strokes-display')!;
const parDisplay = document.getElementById('par-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: GolfPuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// Track ball position for trail
let lastBallX = 0;
let lastBallY = 0;

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
  game = new GolfPuzzleGame(canvas);
  game.resize();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      requestAnimationFrame(function renderLoop() {
        renderer?.render();

        // Emit trail while ball is moving
        if (game.isMoving && renderer) {
          const nx = game.ball.x / canvas.width;
          const ny = game.ball.y / canvas.height;

          // Emit trail
          if (Math.random() < 0.4) {
            renderer.emitTrail(nx, ny);
          }

          // Play rolling sound occasionally
          if (Math.random() < 0.1) {
            audio.playRoll();
          }
        }

        requestAnimationFrame(renderLoop);
      });
    }
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
    strokesDisplay.textContent = state.strokes.toString();
    parDisplay.textContent = state.par.toString();

    // Update strokes card color
    const strokesCard = strokesDisplay.parentElement;
    if (strokesCard) {
      if (state.strokes > state.par) {
        strokesCard.classList.add('over-par');
        strokesCard.classList.remove('under-par');
      } else if (state.strokes < state.par) {
        strokesCard.classList.add('under-par');
        strokesCard.classList.remove('over-par');
      } else {
        strokesCard.classList.remove('over-par', 'under-par');
      }
    }

    if (state.status === 'won') {
      // Hole in effect
      const nx = game.hole.x / canvas.width;
      const ny = game.hole.y / canvas.height;

      audio.playHoleIn();

      if (renderer) {
        renderer.emitHoleIn(nx, ny);
      }

      // Victory effects after short delay
      setTimeout(() => {
        if (state.strokes <= state.par) {
          audio.playUnderPar();
        } else {
          audio.playVictory();
        }

        if (renderer) {
          renderer.emitVictory(nx, ny);
        }
      }, 300);

      showWin(state.level, state.totalLevels, state.strokes, state.par);
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
    resizeBgCanvas();
  });

  resizeBgCanvas();
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function handleInput(type: 'down' | 'move' | 'up', e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === 'down' && !game.isMoving) {
    const dx = x - game.ball.x;
    const dy = y - game.ball.y;
    if (Math.sqrt(dx * dx + dy * dy) < 30) {
      audio.playAim();
    }
  }

  if (type === 'up' && game.isAiming) {
    audio.playHit();
    if (renderer) {
      const nx = game.ball.x / canvas.width;
      const ny = game.ball.y / canvas.height;
      renderer.emitGrass(nx, ny);
    }
  }

  game.handleInput(type, x, y);
}

function handleTouch(type: 'down' | 'move' | 'up', e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (type === 'down' && !game.isMoving) {
    const dx = x - game.ball.x;
    const dy = y - game.ball.y;
    if (Math.sqrt(dx * dx + dy * dy) < 30) {
      audio.playAim();
    }
  }

  if (type === 'up' && game.isAiming) {
    audio.playHit();
    if (renderer) {
      const nx = game.ball.x / canvas.width;
      const ny = game.ball.y / canvas.height;
      renderer.emitGrass(nx, ny);
    }
  }

  game.handleInput(type, x, y);
}

function showWin(level: number, totalLevels: number, strokes: number, par: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';

    let scoreText = '';
    if (strokes < par) {
      scoreText = `${par - strokes} under par!`;
    } else if (strokes === par) {
      scoreText = 'Par!';
    } else {
      scoreText = `${strokes - par} over par`;
    }

    if (level >= totalLevels) {
      overlayTitle.textContent = i18n.t('game.complete');
      overlayMsg.textContent = scoreText;
      nextBtn.style.display = 'none';
    } else {
      overlayTitle.textContent = i18n.t('game.win');
      overlayMsg.textContent = `${i18n.t('game.strokes')}: ${strokes} (${scoreText})`;
      nextBtn.style.display = 'inline-block';
    }

    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
});

resetBtn.addEventListener('click', () => {
  audio.playReset();
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.nextLevel();
});

// Init
initI18n();
initGame();
