/**
 * Castle Mechanism Main Entry
 * Game #122
 */
import { CastleMechanismGame } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

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

// Audio System - Synthesized Medieval/Steampunk sounds
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
    gainValue = 0.3,
    delay = 0
  ) {
    if (!this.ctx) return;

    setTimeout(() => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(gainValue, this.ctx!.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime);
      osc.stop(this.ctx!.currentTime + duration);
    }, delay);
  }

  // Mechanism activated - metallic clunk with gear sounds
  playMechanismActivate(mechType: string) {
    if (!this.ctx) return;

    // Base metallic impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.2);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);

    // Type-specific sound additions
    if (mechType === "lever") {
      this.playTone(220, 0.15, "square", 0.15, 50);
      this.playTone(165, 0.2, "square", 0.1, 100);
    } else if (mechType === "gear") {
      // Clicking gears
      for (let i = 0; i < 4; i++) {
        this.playTone(400 + i * 50, 0.05, "square", 0.1, i * 40);
      }
    } else if (mechType === "button") {
      this.playTone(440, 0.1, "sine", 0.2, 30);
    } else if (mechType === "wheel") {
      // Rotating creak
      this.playTone(180, 0.3, "sawtooth", 0.1, 50);
      this.playTone(200, 0.25, "sawtooth", 0.08, 150);
    }
  }

  // Chain reaction - cascading metallic sounds
  playChainReaction() {
    if (!this.ctx) return;

    for (let i = 0; i < 3; i++) {
      this.playTone(300 - i * 40, 0.15, "sawtooth", 0.15, i * 80);
      this.playTone(200 - i * 20, 0.1, "square", 0.1, i * 80 + 40);
    }
  }

  // Wrong order - warning clang
  playWrongOrder() {
    if (!this.ctx) return;

    // Harsh metallic scrape
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.5);

    // Steam release
    this.playTone(80, 0.6, "sawtooth", 0.1, 200);
  }

  // Gate progress - heavy chains moving
  playGateProgress() {
    if (!this.ctx) return;

    // Chain clanking
    for (let i = 0; i < 5; i++) {
      this.playTone(150 + Math.random() * 50, 0.1, "square", 0.15, i * 60);
    }

    // Deep rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Reset - mechanisms returning
  playReset() {
    if (!this.ctx) return;

    // Steam hiss
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(2000, this.ctx.currentTime);

    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(100, this.ctx.currentTime);

    noiseGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(this.ctx.currentTime);
    noise.stop(this.ctx.currentTime + 0.5);

    // Clicking sounds
    for (let i = 0; i < 4; i++) {
      this.playTone(300 - i * 30, 0.08, "square", 0.1, i * 100);
    }
  }

  // Win - gate fully opens with triumphant fanfare
  playWin() {
    if (!this.ctx) return;

    // Massive gate opening
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1);

    // Victory fanfare
    const notes = [392, 440, 523, 659, 784];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.4, "triangle", 0.2, 200 + i * 150);
    });

    // Chain release sounds
    for (let i = 0; i < 8; i++) {
      this.playTone(250 + Math.random() * 100, 0.1, "square", 0.08, 100 + i * 80);
    }
  }

  // Level start - mechanisms warming up
  playLevelStart() {
    if (!this.ctx) return;

    // Distant gears turning
    for (let i = 0; i < 3; i++) {
      this.playTone(200 + i * 50, 0.2, "sawtooth", 0.1, i * 200);
    }

    // Steam puff
    this.playTone(100, 0.3, "sawtooth", 0.08, 400);

    // Ready chime
    this.playTone(523, 0.2, "sine", 0.15, 600);
    this.playTone(659, 0.3, "sine", 0.15, 750);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: CastleMechanismGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let ambientInterval: number | null = null;

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
    console.log("WebGPU not available, using fallback");
    webgpuCanvas.style.display = "none";
  }
}

function startAmbientEffects() {
  if (ambientInterval) clearInterval(ambientInterval);
  ambientInterval = window.setInterval(() => {
    if (renderer) {
      renderer.emitAmbient();
    }
  }, 800);
}

function stopAmbientEffects() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
}

function initGame() {
  game = new CastleMechanismGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }

    // Mechanism activated
    if (state.mechanismActivate) {
      const { x, y, mechType } = state.mechanismActivate;
      audio.playMechanismActivate(mechType);
      if (renderer) {
        renderer.emitMechanismActivate(x, y, mechType);
      }
    }

    // Chain reaction (linked mechanism activated)
    if (state.chainReaction) {
      const { x, y } = state.chainReaction;
      audio.playChainReaction();
      if (renderer) {
        renderer.emitChainReaction(x, y);
      }
    }

    // Wrong order reset
    if (state.wrongOrder) {
      audio.playWrongOrder();
      if (renderer) {
        renderer.emitWrongOrder();
      }
    }

    // Gate progress
    if (state.gateProgress !== undefined) {
      audio.playGateProgress();
      if (renderer) {
        renderer.setGateProgress(state.gateProgress);
        renderer.emitGateProgress(canvas.width / 2, canvas.height - 100);
      }
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin() {
  audio.playWin();
  if (renderer) {
    renderer.emitVictory();
  }
  stopAmbientEffects();

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
  }, 1000);
}

async function startGame() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";

  audio.playLevelStart();
  if (renderer) {
    renderer.emitLevelStart();
    renderer.setGateProgress(0);
  }
  startAmbientEffects();
}

async function nextLevel() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";

  audio.playLevelStart();
  if (renderer) {
    renderer.emitLevelStart();
    renderer.setGateProgress(0);
  }
  startAmbientEffects();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audio.init();
  audio.playReset();
  if (renderer) {
    renderer.emitReset();
    renderer.setGateProgress(0);
  }
  game.reset();
  movesDisplay.textContent = "0";
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
