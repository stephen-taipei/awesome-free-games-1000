/**
 * Light Shadow Main Entry
 * Game #123
 */
import { LightShadowGame } from "./game";
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

// Audio System - Synthesized Light/Shadow ambient sounds
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

  // Light grabbed - warm glow sound
  playLightGrab() {
    if (!this.ctx) return;

    // Warm ascending tone
    this.playTone(440, 0.2, "sine", 0.2);
    this.playTone(550, 0.15, "sine", 0.15, 50);
    this.playTone(660, 0.1, "sine", 0.1, 100);
  }

  // Light moving - gentle hum
  playLightMove() {
    if (!this.ctx) return;

    // Soft ethereal tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

    osc.type = "sine";
    osc.frequency.setValueAtTime(330 + Math.random() * 50, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Light released
  playLightRelease() {
    if (!this.ctx) return;

    // Soft descent
    this.playTone(500, 0.2, "sine", 0.15);
    this.playTone(400, 0.15, "sine", 0.1, 50);
  }

  // Shadow forming
  playShadowCast() {
    if (!this.ctx) return;

    // Dark mysterious tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Match improving
  playMatchProgress() {
    if (!this.ctx) return;

    // Positive ascending chime
    this.playTone(523, 0.15, "sine", 0.15);
    this.playTone(659, 0.12, "sine", 0.12, 80);
  }

  // Reset
  playReset() {
    if (!this.ctx) return;

    // Shadows returning - low sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Win - light triumphant
  playWin() {
    if (!this.ctx) return;

    // Bright ascending arpeggio
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.5, "sine", 0.2, i * 100);
    });

    // Warm pad
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(262, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1.5);
  }

  // Level start - light awakening
  playLevelStart() {
    if (!this.ctx) return;

    // Gentle awakening
    for (let i = 0; i < 4; i++) {
      this.playTone(330 + i * 55, 0.3, "sine", 0.1, i * 150);
    }

    // Ambient pad
    this.playTone(220, 0.8, "triangle", 0.08, 300);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const matchDisplay = document.getElementById("match-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: LightShadowGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let ambientInterval: number | null = null;
let lastMatch = 0;

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
  }, 600);
}

function stopAmbientEffects() {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
}

function initGame() {
  game = new LightShadowGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.match !== undefined) {
      matchDisplay.textContent = `${state.match}%`;

      // Update renderer match progress
      if (renderer) {
        renderer.setMatchProgress(state.match);
      }

      // Play match progress sound if improving significantly
      if (state.match > lastMatch + 5) {
        audio.playMatchProgress();
        if (renderer) {
          renderer.emitMatchProgress(canvas.width / 2, canvas.height * 0.85);
        }
      }
      lastMatch = state.match;
    }

    // Light position update
    if (state.lightPosition) {
      const { x, y } = state.lightPosition;
      if (renderer) {
        renderer.setLightPosition(x, y);
      }
    }

    // Light grabbed
    if (state.lightGrab) {
      const { x, y } = state.lightGrab;
      audio.playLightGrab();
      if (renderer) {
        renderer.emitLightMove(x, y);
      }
    }

    // Light moving (drag trail)
    if (state.lightDrag) {
      const { x, y } = state.lightDrag;
      audio.playLightMove();
      if (renderer) {
        renderer.emitLightTrail(x, y);
      }
    }

    // Light released
    if (state.lightRelease) {
      const { x, y } = state.lightRelease;
      audio.playLightRelease();
      audio.playShadowCast();
      if (renderer) {
        renderer.emitShadowCast(canvas.width / 2, canvas.height * 0.9);
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
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getLevel()}`;

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
  matchDisplay.textContent = `${game.getMatch()}%`;
  lastMatch = game.getMatch();

  audio.playLevelStart();
  if (renderer) {
    renderer.emitLevelStart(100, 100);
    renderer.setMatchProgress(game.getMatch());
  }
  startAmbientEffects();
}

async function nextLevel() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  matchDisplay.textContent = `${game.getMatch()}%`;
  lastMatch = game.getMatch();

  audio.playLevelStart();
  if (renderer) {
    renderer.emitLevelStart(100, 100);
    renderer.setMatchProgress(game.getMatch());
  }
  startAmbientEffects();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audio.init();
  audio.playReset();
  if (renderer) {
    renderer.emitReset();
  }
  game.reset();
  matchDisplay.textContent = `${game.getMatch()}%`;
  lastMatch = game.getMatch();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
