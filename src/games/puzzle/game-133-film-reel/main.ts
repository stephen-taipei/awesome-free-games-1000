/**
 * Film Reel Main Entry
 * Game #133
 */
import { FilmReelGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const webgpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const framesDisplay = document.getElementById('frames-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: FilmReelGame;
let renderer: WebGPURenderer | null = null;
let ambientInterval: number | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    delay: number = 0
  ) {
    this.init();
    if (!this.ctx) return;

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playFrameSelect() {
    // Film projector click
    this.playTone(200, 0.05, 'square', 0.1);
    this.playTone(400, 0.03, 'triangle', 0.08, 0.02);
  }

  playFrameSwap() {
    // Film reel movement
    this.playTone(150, 0.1, 'sine', 0.15);
    this.playTone(180, 0.08, 'triangle', 0.1, 0.05);
    this.playTone(200, 0.06, 'sine', 0.08, 0.1);
  }

  playFrameCorrect() {
    // Satisfying click
    this.playTone(523, 0.15, 'sine', 0.18);
    this.playTone(659, 0.12, 'triangle', 0.12, 0.08);
  }

  playWin() {
    // Cinema fanfare
    const melody = [392, 494, 587, 784, 659, 784, 988];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.35, 'sine', 0.18, i * 0.12);
      this.playTone(freq * 0.5, 0.35, 'triangle', 0.08, i * 0.12);
    });
  }

  playLevelStart() {
    // Projector starting
    this.playTone(100, 0.3, 'sine', 0.1);
    this.playTone(120, 0.25, 'triangle', 0.08, 0.1);
    this.playTone(150, 0.2, 'sine', 0.06, 0.2);
  }

  playReset() {
    // Film rewind
    this.playTone(400, 0.1, 'sawtooth', 0.08);
    this.playTone(350, 0.1, 'sawtooth', 0.06, 0.05);
    this.playTone(300, 0.1, 'sawtooth', 0.05, 0.1);
  }
}

const audio = new AudioSystem();

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
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      ambientInterval = window.setInterval(() => {
        renderer?.emitAmbient();
      }, 100);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new FilmReelGame(canvas);
  game.resize();

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
  canvas.addEventListener('mouseleave', (e) => handlePointer(e, 'up'));

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointer(e, 'down'); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePointer(e, 'move'); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); handlePointer(e, 'up'); }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    framesDisplay.textContent = `${state.correctCount}/${state.totalFrames}`;

    const framesCard = framesDisplay.parentElement;
    if (framesCard) {
      if (state.correctCount >= state.totalFrames) {
        framesCard.classList.add('success');
      } else if (state.correctCount > 0) {
        framesCard.classList.add('progress');
        framesCard.classList.remove('success');
      } else {
        framesCard.classList.remove('success', 'progress');
      }
    }

    // WebGPU events
    if (renderer) {
      if (state.frameSelect) {
        renderer.emitFrameSelect(state.frameSelect.x, state.frameSelect.y);
        audio.playFrameSelect();
      }

      if (state.frameSwap) {
        renderer.emitFrameSwap(
          state.frameSwap.fromX,
          state.frameSwap.fromY,
          state.frameSwap.toX,
          state.frameSwap.toY
        );
        audio.playFrameSwap();
      }

      if (state.frameCorrect) {
        renderer.emitFrameCorrect(state.frameCorrect.x, state.frameCorrect.y);
        audio.playFrameCorrect();
      }

      if (state.reset) {
        renderer.emitReset();
        audio.playReset();
      }
    }

    if (state.status === 'won') {
      renderer?.emitVictory();
      audio.playWin();
      showWin(state.level, state.totalLevels);
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
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

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
});

resetBtn.addEventListener('click', () => {
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.nextLevel();
  renderer?.emitLevelStart();
  audio.playLevelStart();
});

initI18n();
initWebGPU();
initGame();
