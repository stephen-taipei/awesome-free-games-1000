/**
 * Skeleton Puzzle Main Entry
 * Game #117 - Archaeology / Museum Theme
 * WebGPU Enhanced
 */
import { SkeletonPuzzleGame } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with Web Audio API
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.3,
    delay = 0
  ) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + delay + duration
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  // Bone pickup sound - archaeological discovery
  playBonePickup() {
    if (!this.ctx) return;

    // Soft click with dust
    this.playTone(400, 0.08, "sine", 0.15);
    this.playTone(200, 0.1, "triangle", 0.08, 0.02);

    // Subtle shimmer
    for (let i = 0; i < 3; i++) {
      this.playTone(600 + i * 100, 0.05, "sine", 0.05, 0.03 + i * 0.02);
    }
  }

  // Bone placed correctly - satisfying click
  playBonePlaced() {
    if (!this.ctx) return;

    // Deep satisfying thunk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 600;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);

    // Discovery chime
    this.playTone(523, 0.15, "sine", 0.15, 0.05);
    this.playTone(659, 0.15, "sine", 0.12, 0.1);
  }

  // Bone drag sound - subtle scrape
  playDrag() {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 300;
    filter.Q.value = 1;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100 + Math.random() * 50, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Reset sound - bones scattering
  playReset() {
    for (let i = 0; i < 5; i++) {
      this.playTone(250 - i * 30, 0.1, "triangle", 0.08, i * 0.04);
    }
    this.playTone(150, 0.2, "sine", 0.1, 0.15);
  }

  // Win sound - archaeological triumph
  playWin() {
    // Majestic discovery fanfare
    const notes = [392, 523, 659, 784, 1047]; // G5, C6, E6, G6, C7
    notes.forEach((note, i) => {
      this.playTone(note, 0.5, "sine", 0.18, i * 0.15);
      this.playTone(note * 0.5, 0.5, "triangle", 0.08, i * 0.15);
    });

    // Ambient resonance
    this.playTone(261, 1.5, "sine", 0.08, 0.5);
  }

  // Level start sound - unveiling
  playLevelStart() {
    this.playTone(220, 0.2, "sine", 0.12);
    this.playTone(330, 0.2, "sine", 0.12, 0.1);
    this.playTone(440, 0.3, "sine", 0.15, 0.2);

    // Dust settling
    for (let i = 0; i < 3; i++) {
      this.playTone(100 + i * 20, 0.15, "triangle", 0.03, 0.3 + i * 0.05);
    }
  }
}

const i18n = {
  locale: "en" as Locale,
  translations: {} as Record<string, Record<string, string>>,

  loadTranslations(locale: Locale, trans: Record<string, string>) {
    this.translations[locale] = trans;
  },

  setLocale(locale: Locale) {
    this.locale = locale;
  },

  getLocale(): Locale {
    return this.locale;
  },

  t(key: string): string {
    return this.translations[this.locale]?.[key] || key;
  },
};

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const piecesDisplay = document.getElementById("pieces-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: SkeletonPuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

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

async function initWebGPU() {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (success) {
    resizeWebGPU();
  } else {
    renderer = null;
    webgpuCanvas.style.display = "none";
  }
}

function resizeWebGPU() {
  if (!renderer || !webgpuCanvas) return;

  const container = webgpuCanvas.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    webgpuCanvas.width = rect.width;
    webgpuCanvas.height = rect.height;
    renderer.resize(rect.width, rect.height);
  }
}

function initGame() {
  game = new SkeletonPuzzleGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.pieces !== undefined) {
      piecesDisplay.textContent = state.pieces;
    }

    // Bone pickup event
    if (state.bonePickup) {
      audio.playBonePickup();
      if (renderer) {
        renderer.emitBonePickup(state.bonePickup.x, state.bonePickup.y);
      }
    }

    // Bone placed event
    if (state.bonePlaced) {
      audio.playBonePlaced();
      if (renderer) {
        renderer.emitBonePlaced(state.bonePlaced.x, state.bonePlaced.y);
      }
    }

    // Drag trail
    if (state.dragTrail && renderer) {
      renderer.emitDragTrail(state.dragTrail.x, state.dragTrail.y);
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });
}

function showWin() {
  audio.playWin();
  if (renderer) {
    renderer.emitVictory();
  }

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getLevel()}`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 500);
}

async function startGame() {
  await audio.init();
  audio.playLevelStart();

  if (renderer) {
    renderer.emitLevelStart();
  }

  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  piecesDisplay.textContent = game.getPiecesPlaced();
}

async function nextLevel() {
  await audio.init();
  audio.playLevelStart();

  if (renderer) {
    renderer.emitLevelStart();
  }

  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  piecesDisplay.textContent = game.getPiecesPlaced();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audio.init();
  audio.playReset();

  if (renderer) {
    renderer.emitReset();
  }

  game.reset();
  piecesDisplay.textContent = game.getPiecesPlaced();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
