/**
 * Key Collection Main Entry
 * Game #087 - WebGPU Enhanced
 */
import { KeyCollectionGame } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with Dungeon/Mystery Theme
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = "sine", attack = 0.01, decay = 0.1): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + decay);
  }

  playMove(): void {
    // Footstep in dungeon - low thud
    this.playTone(80, 0.1, "triangle", 0.01, 0.05);
    setTimeout(() => this.playTone(60, 0.08, "sine", 0.01, 0.03), 30);
  }

  playKeyCollect(): void {
    // Golden key sparkle - bright ascending arpeggio
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, "sine", 0.01, 0.2), i * 80);
    });
    // Shimmer
    setTimeout(() => this.playTone(1760, 0.4, "sine", 0.05, 0.3), 250);
  }

  playDoorUnlock(): void {
    // Heavy door opening - deep rumble with mechanical clicks
    this.playTone(55, 0.5, "sawtooth", 0.02, 0.3);
    this.playTone(110, 0.4, "triangle", 0.05, 0.2);
    // Lock mechanism
    setTimeout(() => {
      this.playTone(330, 0.1, "square", 0.01, 0.05);
      this.playTone(440, 0.1, "square", 0.02, 0.05);
    }, 100);
    // Success tone
    setTimeout(() => this.playTone(523, 0.3, "sine", 0.05, 0.2), 200);
  }

  playDoorBlocked(): void {
    // Can't pass - dull thud and low buzz
    this.playTone(60, 0.2, "sawtooth", 0.01, 0.1);
    this.playTone(100, 0.15, "triangle", 0.02, 0.1);
  }

  playVictory(): void {
    // Triumphant dungeon escape fanfare
    const melody = [
      { freq: 523, delay: 0 },    // C5
      { freq: 659, delay: 100 },  // E5
      { freq: 784, delay: 200 },  // G5
      { freq: 1047, delay: 350 }, // C6
      { freq: 784, delay: 500 },  // G5
      { freq: 1047, delay: 600 }, // C6
    ];
    melody.forEach(({ freq, delay }) => {
      setTimeout(() => this.playTone(freq, 0.35, "sine", 0.02, 0.2), delay);
    });
    // Golden shimmer finish
    setTimeout(() => {
      this.playTone(1568, 0.6, "sine", 0.1, 0.4);
      this.playTone(2093, 0.5, "sine", 0.15, 0.3);
    }, 700);
  }

  playLevelStart(): void {
    // Mysterious dungeon ambiance
    this.playTone(110, 0.5, "triangle", 0.1, 0.3);
    setTimeout(() => this.playTone(165, 0.4, "sine", 0.1, 0.2), 150);
    // Torch flicker
    setTimeout(() => this.playTone(220, 0.2, "sine", 0.05, 0.1), 300);
  }

  playReset(): void {
    // Reset - descending mystery
    this.playTone(330, 0.15, "triangle", 0.01, 0.1);
    setTimeout(() => this.playTone(220, 0.15, "triangle", 0.01, 0.1), 80);
    setTimeout(() => this.playTone(165, 0.2, "triangle", 0.01, 0.15), 160);
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
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const keysDisplay = document.getElementById("keys-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

// Mobile controls
const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: KeyCollectionGame;
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
  if (!success) {
    console.warn("WebGPU not available, using fallback");
    renderer = null;
  }
}

function initGame() {
  game = new KeyCollectionGame(canvas);
  game.resize();

  // Keyboard controls
  window.addEventListener("keydown", handleKeyDown);

  // Mobile controls
  btnUp.addEventListener("click", () => game.move(0, -1));
  btnDown.addEventListener("click", () => game.move(0, 1));
  btnLeft.addEventListener("click", () => game.move(-1, 0));
  btnRight.addEventListener("click", () => game.move(1, 0));

  game.setOnStateChange((state: any) => {
    // Handle events for WebGPU and Audio
    if (state.event) {
      const { event, x, y, colorIndex } = state;
      switch (event) {
        case "move":
          audio.playMove();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitMove(x, y);
          }
          break;
        case "keyCollect":
          audio.playKeyCollect();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitKeyCollect(x, y);
          }
          break;
        case "doorUnlock":
          audio.playDoorUnlock();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitDoorUnlock(x, y);
          }
          break;
        case "doorBlocked":
          audio.playDoorBlocked();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitDoorBlocked(x, y);
          }
          break;
        case "victory":
          audio.playVictory();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitVictory(x, y);
          }
          break;
        case "levelStart":
          audio.playLevelStart();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitLevelStart(x, y);
          }
          break;
        case "reset":
          audio.playReset();
          if (renderer) {
            renderer.emitReset();
          }
          break;
      }
    }

    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }
    if (state.keys !== undefined) {
      keysDisplay.textContent = state.keys;
    }
    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      const rect = webgpuCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        renderer.resize(rect.width, rect.height);
      }
    }
  });
}

function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      e.preventDefault();
      game.move(0, -1);
      break;
    case "ArrowDown":
    case "s":
    case "S":
      e.preventDefault();
      game.move(0, 1);
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      e.preventDefault();
      game.move(-1, 0);
      break;
    case "ArrowRight":
    case "d":
    case "D":
      e.preventDefault();
      game.move(1, 0);
      break;
  }
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.getMoves()}`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 300);
}

async function startGame() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  keysDisplay.textContent = game.getKeysStatus();
  movesDisplay.textContent = "0";
}

async function nextLevel() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  keysDisplay.textContent = game.getKeysStatus();
  movesDisplay.textContent = "0";
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audio.init();
  game.reset();
  keysDisplay.textContent = game.getKeysStatus();
  movesDisplay.textContent = "0";
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
