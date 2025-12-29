/**
 * Billiard Puzzle Main Entry
 * Game #116 - Pool Table / Classic Theme
 * WebGPU Enhanced
 */
import { BilliardPuzzleGame } from "./game";
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

  // Cue shot sound - sharp crack
  playCueShot(power: number) {
    if (!this.ctx) return;

    const normalizedPower = Math.min(power / 20, 1);

    // Impact crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "highpass";
    filter.frequency.value = 800 + normalizedPower * 400;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200 + normalizedPower * 100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2 + normalizedPower * 0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Chalk dust swish
    this.playTone(80, 0.1, "triangle", 0.08);
  }

  // Ball collision sound
  playBallCollision(force: number) {
    if (!this.ctx) return;

    const normalizedForce = Math.min(force, 1);

    // Click sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200 + normalizedForce * 400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15 + normalizedForce * 0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Wall bounce sound
  playWallBounce() {
    this.playTone(300, 0.06, "triangle", 0.12);
    this.playTone(150, 0.08, "sine", 0.08, 0.02);
  }

  // Ball pocketed sound - satisfying drop
  playPocketed() {
    if (!this.ctx) return;

    // Drop sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);

    // Pocket rattle
    for (let i = 0; i < 3; i++) {
      this.playTone(200 - i * 30, 0.05, "triangle", 0.05, 0.05 + i * 0.04);
    }
  }

  // Reset sound
  playReset() {
    for (let i = 0; i < 4; i++) {
      this.playTone(300 - i * 40, 0.1, "sine", 0.1, i * 0.05);
    }
  }

  // Win sound - triumphant
  playWin() {
    const notes = [392, 523, 659, 784]; // G5, C6, E6, G6
    notes.forEach((note, i) => {
      this.playTone(note, 0.4, "sine", 0.2, i * 0.12);
      this.playTone(note * 0.5, 0.4, "triangle", 0.1, i * 0.12);
    });
  }

  // Level start sound
  playLevelStart() {
    this.playTone(262, 0.15, "sine", 0.15);
    this.playTone(330, 0.15, "sine", 0.15, 0.1);
    this.playTone(392, 0.2, "sine", 0.18, 0.2);
  }

  // Failed sound
  playFailed() {
    this.playTone(330, 0.2, "sine", 0.15);
    this.playTone(262, 0.3, "sine", 0.15, 0.15);
    this.playTone(196, 0.4, "triangle", 0.12, 0.3);
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
const shotsDisplay = document.getElementById("shots-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: BilliardPuzzleGame;
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
  game = new BilliardPuzzleGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.shots !== undefined) {
      shotsDisplay.textContent = state.shots.toString();
    }

    // Cue shot event
    if (state.cueShot) {
      audio.playCueShot(state.cueShot.power);
      if (renderer) {
        renderer.emitCueShot(state.cueShot.x, state.cueShot.y, state.cueShot.power / 20);
      }
    }

    // Ball collision event
    if (state.ballCollision) {
      audio.playBallCollision(state.ballCollision.force);
      if (renderer) {
        renderer.emitCollision(
          state.ballCollision.x,
          state.ballCollision.y,
          state.ballCollision.force
        );
        // Ball impact with colors
        const r = state.ballCollision.colorR ?? 1;
        const g = state.ballCollision.colorG ?? 0.3;
        renderer.emitBallImpact(state.ballCollision.x, state.ballCollision.y, r, g);
      }
    }

    // Wall bounce event
    if (state.wallBounce) {
      audio.playWallBounce();
    }

    // Ball pocketed event
    if (state.pocketed) {
      audio.playPocketed();
      if (renderer) {
        renderer.emitPocketed(state.pocketed.x, state.pocketed.y);
      }
    }

    // Ball trail
    if (state.ballTrail && renderer) {
      renderer.emitTrail(
        state.ballTrail.x,
        state.ballTrail.y,
        state.ballTrail.colorR,
        state.ballTrail.colorG
      );
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "failed") {
      showFailed();
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

function showFailed() {
  audio.playFailed();

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.failed");
    overlayMsg.textContent = "";
    nextBtn.style.display = "none";
    startBtn.textContent = i18n.t("game.reset");
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
  shotsDisplay.textContent = game.getShots().toString();
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
  shotsDisplay.textContent = game.getShots().toString();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audio.init();
  audio.playReset();

  if (renderer) {
    renderer.emitReset();
  }

  game.reset();
  shotsDisplay.textContent = game.getShots().toString();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
