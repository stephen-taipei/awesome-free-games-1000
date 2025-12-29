/**
 * Butterfly Effect Main Entry
 * Game #130
 */
import { ButterflyEffectGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const webgpuCanvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const targetsDisplay = document.getElementById('targets-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: ButterflyEffectGame;
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
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playButterflyClick() {
    // Gentle flutter sound
    this.playTone(880, 0.15, 'sine', 0.2);
    this.playTone(1100, 0.12, 'sine', 0.15, 0.05);
    this.playTone(1320, 0.1, 'sine', 0.1, 0.1);
  }

  playChainReaction() {
    // Magical chain sound
    this.playTone(523, 0.2, 'sine', 0.18);
    this.playTone(659, 0.15, 'sine', 0.15, 0.08);
    this.playTone(784, 0.12, 'sine', 0.12, 0.15);
  }

  playFlowerActivate() {
    // Blooming sound
    this.playTone(698, 0.25, 'sine', 0.2);
    this.playTone(880, 0.2, 'sine', 0.15, 0.1);
  }

  playWindActivate() {
    // Whoosh sound
    this.playTone(200, 0.3, 'sawtooth', 0.1);
    this.playTone(300, 0.25, 'triangle', 0.08, 0.05);
  }

  playTargetActivate() {
    // Achievement chime
    this.playTone(784, 0.2, 'sine', 0.2);
    this.playTone(988, 0.15, 'sine', 0.18, 0.08);
    this.playTone(1175, 0.12, 'sine', 0.15, 0.15);
  }

  playWin() {
    // Victory fanfare
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.4, 'sine', 0.2, i * 0.12);
      this.playTone(freq * 0.5, 0.4, 'triangle', 0.1, i * 0.12);
    });
  }

  playLose() {
    // Gentle disappointment
    this.playTone(400, 0.25, 'sine', 0.15);
    this.playTone(350, 0.2, 'sine', 0.1, 0.15);
    this.playTone(300, 0.18, 'sine', 0.08, 0.28);
  }

  playLevelStart() {
    // Nature awakening
    this.playTone(523, 0.25, 'sine', 0.18);
    this.playTone(659, 0.2, 'sine', 0.15, 0.1);
    this.playTone(784, 0.15, 'sine', 0.12, 0.2);
  }

  playReset() {
    // Soft reset sound
    this.playTone(440, 0.15, 'triangle', 0.1);
    this.playTone(350, 0.1, 'sine', 0.08, 0.05);
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
  game = new ButterflyEffectGame(canvas);
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
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointer(e, 'down'); }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    targetsDisplay.textContent = `${state.targetsActivated}/${state.targetCount}`;

    const targetsCard = targetsDisplay.parentElement;
    if (targetsCard) {
      if (state.targetsActivated >= state.targetCount) {
        targetsCard.classList.add('success');
      } else {
        targetsCard.classList.remove('success');
      }
    }

    // WebGPU events
    if (renderer) {
      if (state.butterflyClick) {
        renderer.emitButterflyClick(
          state.butterflyClick.x,
          state.butterflyClick.y,
          state.butterflyClick.color
        );
        audio.playButterflyClick();
      }

      if (state.chainReaction) {
        renderer.emitChainReaction(
          state.chainReaction.fromX,
          state.chainReaction.fromY,
          state.chainReaction.toX,
          state.chainReaction.toY,
          state.chainReaction.color
        );
        audio.playChainReaction();
      }

      if (state.flowerActivate) {
        renderer.emitFlowerActivate(
          state.flowerActivate.x,
          state.flowerActivate.y,
          state.flowerActivate.color
        );
        audio.playFlowerActivate();
      }

      if (state.windActivate) {
        renderer.emitWindActivate(state.windActivate.x, state.windActivate.y);
        audio.playWindActivate();
      }

      if (state.targetActivate) {
        renderer.emitTargetActivate(state.targetActivate.x, state.targetActivate.y);
        audio.playTargetActivate();
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
    } else if (state.status === 'lost') {
      audio.playLose();
      showLose();
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
  }, 800);
}

function showLose() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.lose');
    overlayMsg.textContent = i18n.t('game.desc');
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
    nextBtn.style.display = 'none';
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
