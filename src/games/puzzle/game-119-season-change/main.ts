/**
 * Season Change Main Entry
 * Game #119
 */
import { SeasonChangeGame, Season } from "./game";
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

// Audio System - Synthesized nature sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    envelope?: { attack?: number; decay?: number; sustain?: number }
  ) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    const { attack = 0.01, decay = 0.1, sustain = 0.3 } = envelope || {};

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Season change - magical transition
  playSeasonChange(season: Season) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const freqs: Record<Season, number[]> = {
      spring: [523, 659, 784, 880], // C major ascending
      summer: [659, 784, 880, 1047], // Higher, brighter
      autumn: [440, 523, 659, 523], // Warmer tones
      winter: [392, 494, 587, 494], // Cooler, softer
    };

    freqs[season].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", { attack: 0.02, decay: 0.08, sustain: 0.4 });
      }, i * 80);
    });

    // Shimmer effect
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.playTone(800 + Math.random() * 400, 0.1, "sine", { attack: 0.01, decay: 0.03, sustain: 0.2 });
        }, i * 30);
      }
    }, 320);
  }

  // Player move - soft step
  playMove() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = 200 + Math.random() * 50;

    filter.type = "lowpass";
    filter.frequency.value = 400;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Goal reached - celebratory chime
  playGoalReached() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [659, 784, 988, 1175].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, "sine", { attack: 0.02, decay: 0.1, sustain: 0.5 });
      }, i * 100);
    });
  }

  // Blocked - soft bump
  playBlocked() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 150;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Reset
  playReset() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [400, 350, 300].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, "triangle", { attack: 0.01, decay: 0.05, sustain: 0.2 });
      }, i * 50);
    });
  }

  // Victory
  playWin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 523, time: 0, dur: 0.15 },
      { freq: 659, time: 0.15, dur: 0.15 },
      { freq: 784, time: 0.3, dur: 0.15 },
      { freq: 1047, time: 0.45, dur: 0.5 },
    ];

    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.freq, note.dur, "sine", { attack: 0.02, decay: 0.05, sustain: 0.6 });
        this.playTone(note.freq * 1.5, note.dur * 0.7, "sine", { attack: 0.02, decay: 0.05, sustain: 0.3 });
      }, note.time * 1000);
    });
  }

  // Level start
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [392, 494, 587, 659].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, "sine", { attack: 0.02, decay: 0.06, sustain: 0.35 });
      }, i * 80);
    });
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

const seasonBtns = document.querySelectorAll(".season-btn");

let game: SeasonChangeGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let currentSeason: Season = "spring";

async function initWebGPU() {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.log("WebGPU not available, continuing without effects");
    renderer = null;
  } else {
    renderer.setSeason("spring");
  }
}

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

function updateSeasonButtons(season: Season) {
  currentSeason = season;
  seasonBtns.forEach((btn) => {
    const btnSeason = (btn as HTMLElement).dataset.season as Season;
    btn.classList.toggle("active", btnSeason === season);
  });
}

function initGame() {
  game = new SeasonChangeGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }

    // Season change event
    if (state.seasonChange) {
      audio.playSeasonChange(state.seasonChange.season);
      renderer?.emitSeasonChange(state.seasonChange.season);
      updateSeasonButtons(state.seasonChange.season);
    }

    // Player move event
    if (state.playerMove) {
      audio.playMove();
      renderer?.emitPlayerMove(
        state.playerMove.x,
        state.playerMove.y,
        currentSeason
      );
    }

    // Blocked event
    if (state.blocked) {
      audio.playBlocked();
    }

    // Goal reached event
    if (state.goalReached) {
      audio.playGoalReached();
      renderer?.emitGoalReached(state.goalReached.x, state.goalReached.y);
    }

    if (state.season !== undefined) {
      updateSeasonButtons(state.season);
      renderer?.setSeason(state.season);
    }

    if (state.status === "won") {
      showWin();
    }
  });

  // Season button handlers
  seasonBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const season = (btn as HTMLElement).dataset.season as Season;
      game.setSeason(season);
    });
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

  // Ambient particle loop
  setInterval(() => {
    renderer?.emitAmbient(currentSeason);
  }, 100);
}

function showWin() {
  audio.playWin();
  renderer?.emitVictory();

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
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";
  updateSeasonButtons(game.getCurrentSeason());
  renderer?.setSeason(game.getCurrentSeason());

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";
  updateSeasonButtons(game.getCurrentSeason());
  renderer?.setSeason(game.getCurrentSeason());

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  movesDisplay.textContent = "0";
  updateSeasonButtons(game.getCurrentSeason());
  renderer?.setSeason(game.getCurrentSeason());

  audio.playReset();
  renderer?.emitReset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
