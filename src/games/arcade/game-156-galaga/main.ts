/**
 * Galaga Main Entry
 * Game #156
 */
import { GalagaGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';
import { WebGPURenderer } from './webgpu';

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

let game: GalagaGame;
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
    type: OscillatorType = 'square',
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
    filter.frequency.setValueAtTime(3500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playShoot() {
    // Classic arcade laser
    this.playTone(1200, 0.08, 'square', 0.04);
    this.playTone(800, 0.05, 'square', 0.03, 0.02);
    this.playTone(600, 0.04, 'triangle', 0.02, 0.04);
  }

  playEnemyDeath(enemyType: number) {
    // Different pitch for different enemy types
    const baseFreq = enemyType === 1 ? 300 : 400;
    this.playTone(baseFreq, 0.12, 'sawtooth', 0.05);
    this.playTone(baseFreq * 0.7, 0.1, 'square', 0.04, 0.04);
    this.playTone(baseFreq * 0.5, 0.15, 'triangle', 0.03, 0.08);
    this.playTone(baseFreq * 0.3, 0.1, 'sine', 0.02, 0.12);
  }

  playPlayerHit() {
    // Dramatic explosion
    this.playTone(200, 0.2, 'sawtooth', 0.06);
    this.playTone(120, 0.25, 'square', 0.05, 0.08);
    this.playTone(80, 0.3, 'triangle', 0.04, 0.15);
    this.playTone(50, 0.35, 'sine', 0.03, 0.22);
  }

  playDive() {
    // Swooping sound
    this.playTone(600, 0.08, 'sawtooth', 0.02);
    this.playTone(450, 0.06, 'triangle', 0.015, 0.02);
  }

  playEnemyShoot() {
    // Enemy laser
    this.playTone(500, 0.06, 'square', 0.02);
    this.playTone(350, 0.04, 'triangle', 0.015, 0.02);
  }

  playGameOver() {
    // Dramatic descending melody
    const notes = [392, 330, 262, 196, 131];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.2, 'sawtooth', 0.05, i * 0.15);
    });
    this.playTone(65, 0.5, 'triangle', 0.06, 0.75);
  }

  playLevelComplete() {
    // Victory fanfare
    const notes = [523, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.12, 'square', 0.04, i * 0.08);
    });
    this.playTone(1319, 0.3, 'sine', 0.05, 0.48);
  }

  playStart() {
    // Ready sound
    this.playTone(330, 0.1, 'square', 0.04);
    this.playTone(392, 0.1, 'square', 0.04, 0.08);
    this.playTone(494, 0.1, 'square', 0.04, 0.16);
    this.playTone(659, 0.15, 'square', 0.05, 0.24);
  }
}

const audio = new AudioSystem();

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh-TW') || browserLang.includes('zh-Hant')) {
    i18n.setLocale('zh-TW');
  } else if (browserLang.includes('zh')) {
    i18n.setLocale('zh-CN');
  } else if (browserLang.includes('ja')) {
    i18n.setLocale('ja');
  } else if (browserLang.includes('ko')) {
    i18n.setLocale('ko');
  } else {
    i18n.setLocale('en');
  }

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
      }, 400);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new GalagaGame(canvas);
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

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointer(e, 'down'); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handlePointer(e, 'move'); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); handlePointer(e, 'up'); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd'].includes(e.key)) {
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

    // Handle WebGPU effects and audio
    if (state.playerShoot) {
      renderer?.emitPlayerShoot(state.playerShoot.x, state.playerShoot.y);
      audio.playShoot();
    }

    if (state.enemyDeath) {
      renderer?.emitEnemyDeath(state.enemyDeath.x, state.enemyDeath.y, state.enemyDeath.type);
      audio.playEnemyDeath(state.enemyDeath.type);
    }

    if (state.playerHit && state.status !== 'lost') {
      renderer?.emitPlayerHit(state.playerHit.x, state.playerHit.y);
      audio.playPlayerHit();
    }

    if (state.divingTrail) {
      for (const trail of state.divingTrail) {
        renderer?.emitDivingTrail(trail.x, trail.y);
      }
    }

    if (state.bulletTrails) {
      for (const trail of state.bulletTrails) {
        renderer?.emitBulletTrail(trail.x, trail.y, trail.isEnemy);
      }
    }

    if (state.levelComplete) {
      renderer?.emitLevelComplete();
      audio.playLevelComplete();
    }

    if (state.status === 'lost') {
      if (state.gameOver) {
        renderer?.emitGameOver(state.gameOver.x, state.gameOver.y);
      }
      audio.playGameOver();
      showGameOver(state.score);
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
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

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
  renderer?.emitGameStart();
  audio.playStart();
});

resetBtn.addEventListener('click', () => {
  game.reset();
  renderer?.emitGameStart();
  audio.playStart();
});

initI18n();
initWebGPU();
initGame();
