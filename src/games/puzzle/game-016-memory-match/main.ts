/**
 * Memory Match Main Entry - WebGPU Enhanced
 * Neural Sync Theme
 * Game #016
 */
import { MemoryGame, type Card } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type CardData } from "./webgpu/renderer";

// =====================
// Audio System
// =====================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    attack = 0.01,
    decay = 0.1
  ): void {
    if (!this.ctx || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(volume * 0.7, this.ctx.currentTime + attack + decay);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Card flip - neural activation
  playFlip(): void {
    this.playTone(600, 0.1, 'sine', 0.15);
    setTimeout(() => this.playTone(900, 0.08, 'sine', 0.1), 50);
  }

  // Match success - synapse connection
  playMatch(): void {
    const melody = [523, 659, 784];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.15);
        this.playTone(freq * 1.5, 0.15, 'sine', 0.08);
      }, i * 80);
    });
  }

  // Mismatch - disconnect
  playMismatch(): void {
    this.playTone(200, 0.15, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(150, 0.2, 'triangle', 0.08), 100);
  }

  // Victory - full sync
  playComplete(): void {
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.35, 'sine', 0.18);
        this.playTone(freq * 0.5, 0.35, 'triangle', 0.08);
      }, i * 130);
    });

    // Neural shimmer
    setTimeout(() => {
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          this.playTone(1200 + Math.random() * 800, 0.12, 'sine', 0.05);
        }, i * 35);
      }
    }, 800);
  }

  // Reset - shutdown
  playReset(): void {
    const notes = [600, 500, 400, 300];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.08, 'sine', 0.1);
      }, i * 50);
    });
  }
}

// =====================
// Elements
// =====================
const container = document.getElementById("grid-container") as HTMLElement;
const gameArea = document.querySelector(".game-area") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const diffRadios = document.querySelectorAll('input[name="difficulty"]');

// =====================
// Global Variables
// =====================
let game: MemoryGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;

let currentSize = 4;
let isVictory = false;
let victoryAnimProgress = 0;

// Card flip animations
interface FlipAnimation {
  cardId: number;
  progress: number;
  targetProgress: number;
}
const flipAnimations: Map<number, FlipAnimation> = new Map();
let lastFlippedCards: Card[] = [];

// =====================
// Initialization
// =====================
function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");

  languageSelect.value = i18n.getLocale();
  updateTexts();

  languageSelect.addEventListener("change", () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

async function initRenderer(): Promise<void> {
  // Create WebGPU canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'webgpu-canvas';
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';

  gameArea.insertBefore(canvas, gameArea.firstChild);

  renderer = new WebGPURenderer(canvas);
  useWebGPU = await renderer.init();

  if (useWebGPU) {
    console.log('WebGPU renderer initialized');
    // Hide CSS cards, show WebGPU
    container.style.opacity = '0.001'; // Nearly invisible but still interactive
    canvas.style.pointerEvents = 'none';
  } else {
    console.log('Falling back to CSS 3D');
    renderer = null;
    canvas.remove();
  }
}

function initGame() {
  game = new MemoryGame(container);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won" && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playComplete();
      if (renderer) {
        renderer.emitWin(0.5, 0.5);
      }
      showWin();
    }
  });

  // Hook into card clicks for audio/particles
  hookCardInteractions();
}

function hookCardInteractions(): void {
  // Override card click to add effects
  const originalStart = game.start.bind(game);
  game.start = (size: number) => {
    originalStart(size);
    setTimeout(() => setupCardHooks(), 100);
  };
}

function setupCardHooks(): void {
  const cards = container.querySelectorAll('.card');

  cards.forEach((cardEl, index) => {
    cardEl.addEventListener('click', () => {
      const gameAny = game as any;
      const gameCards = gameAny.cards as Card[];
      const card = gameCards[index];

      if (card && !card.isFlipped && !card.isMatched) {
        audio.playFlip();

        // Start flip animation
        flipAnimations.set(card.id, {
          cardId: card.id,
          progress: 0,
          targetProgress: 1,
        });

        // Emit particles
        if (renderer) {
          const rect = gameArea.getBoundingClientRect();
          const cardRect = (cardEl as HTMLElement).getBoundingClientRect();
          const normX = (cardRect.left + cardRect.width / 2 - rect.left) / rect.width;
          const normY = (cardRect.top + cardRect.height / 2 - rect.top) / rect.height;
          renderer.emitFlip(normX, normY);
        }

        // Track flipped cards for match detection
        lastFlippedCards.push(card);
        if (lastFlippedCards.length === 2) {
          setTimeout(() => checkMatchEffect(), 600);
        }
      }
    });
  });
}

function checkMatchEffect(): void {
  if (lastFlippedCards.length !== 2) {
    lastFlippedCards = [];
    return;
  }

  const [c1, c2] = lastFlippedCards;

  if (c1.value === c2.value) {
    // Match!
    audio.playMatch();
    if (renderer) {
      const rect = gameArea.getBoundingClientRect();
      const card1El = c1.element;
      const card2El = c2.element;

      const rect1 = card1El.getBoundingClientRect();
      const rect2 = card2El.getBoundingClientRect();

      const x1 = (rect1.left + rect1.width / 2 - rect.left) / rect.width;
      const y1 = (rect1.top + rect1.height / 2 - rect.top) / rect.height;
      const x2 = (rect2.left + rect2.width / 2 - rect.left) / rect.width;
      const y2 = (rect2.top + rect2.height / 2 - rect.top) / rect.height;

      renderer.emitMatch(x1, y1, x2, y2);
    }
  } else {
    // Mismatch
    setTimeout(() => {
      audio.playMismatch();
      if (renderer) {
        const rect = gameArea.getBoundingClientRect();
        const card1El = c1.element;
        const card2El = c2.element;

        const rect1 = card1El.getBoundingClientRect();
        const rect2 = card2El.getBoundingClientRect();

        const x1 = (rect1.left + rect1.width / 2 - rect.left) / rect.width;
        const y1 = (rect1.top + rect1.height / 2 - rect.top) / rect.height;
        const x2 = (rect2.left + rect2.width / 2 - rect.left) / rect.width;
        const y2 = (rect2.top + rect2.height / 2 - rect.top) / rect.height;

        renderer.emitMismatch(x1, y1, x2, y2);
      }

      // Animate flip back
      flipAnimations.set(c1.id, { cardId: c1.id, progress: 1, targetProgress: 0 });
      flipAnimations.set(c2.id, { cardId: c2.id, progress: 1, targetProgress: 0 });
    }, 400);
  }

  lastFlippedCards = [];
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";

  diffRadios.forEach((r) => {
    if ((r as HTMLInputElement).checked) {
      currentSize = parseInt((r as HTMLInputElement).value, 10);
    }
  });

  game.start(currentSize);
  isVictory = false;
  victoryAnimProgress = 0;
  flipAnimations.clear();
  lastFlippedCards = [];

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}, ${i18n.t("game.moves")}: ${moveDisplay.textContent}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = startGame;
  }, 500);
}

// =====================
// Game Loop
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Update flip animations
  flipAnimations.forEach((anim, id) => {
    const speed = 0.004;
    if (anim.progress < anim.targetProgress) {
      anim.progress = Math.min(anim.targetProgress, anim.progress + deltaTime * speed);
    } else if (anim.progress > anim.targetProgress) {
      anim.progress = Math.max(anim.targetProgress, anim.progress - deltaTime * speed);
    }

    if (anim.progress === anim.targetProgress) {
      if (anim.targetProgress === 0) {
        flipAnimations.delete(id);
      }
    }
  });

  // Update victory animation
  if (isVictory && victoryAnimProgress < 1) {
    victoryAnimProgress = Math.min(1, victoryAnimProgress + deltaTime * 0.001);
    if (renderer) {
      renderer.setVictory(victoryAnimProgress, 0.5, 0.5);
    }
  }

  // WebGPU rendering
  if (renderer && useWebGPU) {
    const cardData = getCardDataForRenderer();
    renderer.updateCards(cardData);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Get card data for WebGPU renderer
function getCardDataForRenderer(): CardData[] {
  const gameAny = game as any;
  const gameCards = gameAny.cards as Card[];
  if (!gameCards || gameCards.length === 0) return [];

  const rect = gameArea.getBoundingClientRect();
  const canvasWidth = 600;
  const canvasHeight = 600;

  return gameCards.map((card, index) => {
    const cardEl = card.element;
    const cardRect = cardEl.getBoundingClientRect();

    // Convert to canvas coordinates
    const x = ((cardRect.left - rect.left) / rect.width) * canvasWidth;
    const y = ((cardRect.top - rect.top) / rect.height) * canvasHeight;
    const width = (cardRect.width / rect.width) * canvasWidth;
    const height = (cardRect.height / rect.height) * canvasHeight;

    // Get flip animation progress
    const flipAnim = flipAnimations.get(card.id);
    let flipProgress = card.isFlipped || card.isMatched ? 1 : 0;
    if (flipAnim) {
      flipProgress = flipAnim.progress;
    }

    return {
      x,
      y,
      width,
      height,
      flipProgress,
      isMatched: card.isMatched,
      matchedTime: card.isMatched ? performance.now() * 0.001 : 0,
      colorIndex: index % 16,
    };
  });
}

// =====================
// Event Listeners
// =====================
startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  isVictory = false;
  victoryAnimProgress = 0;
  flipAnimations.clear();
  lastFlippedCards = [];

  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  overlayMsg.textContent = i18n.t("game.desc");
  startBtn.onclick = startGame;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }
});

// =====================
// Sound Toggle
// =====================
function createSoundToggle(): void {
  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.innerHTML = '🔊';
  btn.title = 'Toggle Sound';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = !audio.isEnabled();
    audio.setEnabled(enabled);
    btn.innerHTML = enabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !enabled);
  });

  gameArea.appendChild(btn);
}

// =====================
// Main
// =====================
async function main() {
  initI18n();

  // Init audio system
  audio = new AudioSystem();

  // Init audio on user interaction
  const initAudioOnInteraction = async () => {
    await audio.init();
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  };
  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('touchstart', initAudioOnInteraction);

  // Init renderer
  await initRenderer();

  // Init game
  initGame();

  // Create sound toggle
  createSoundToggle();
}

main();
