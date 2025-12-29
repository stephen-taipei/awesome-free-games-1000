/**
 * Cell Division Main Entry
 * Biology / Microbiology Theme
 * Game #126
 */
import { CellDivisionGame } from "./game";
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

// Audio System - Biological / Cellular Sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.log("Audio not available");
    }
  }

  private ensureContext() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Cell selected - soft organic click
  playCellSelect() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 3;

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Cell division - bubbly splitting sound
  playCellDivide() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Bubble pop sequence
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.value = 500 + i * 100;
      filter.Q.value = 5;

      osc.type = "sine";
      osc.frequency.setValueAtTime(
        300 + i * 50,
        this.ctx.currentTime + i * 0.05
      );
      osc.frequency.exponentialRampToValueAtTime(
        600 + i * 100,
        this.ctx.currentTime + i * 0.05 + 0.08
      );

      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.05);
      gain.gain.linearRampToValueAtTime(
        0.25,
        this.ctx.currentTime + i * 0.05 + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx.currentTime + i * 0.05 + 0.15
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.ctx.currentTime + i * 0.05);
      osc.stop(this.ctx.currentTime + i * 0.05 + 0.15);
    }
  }

  // Cell attack - aggressive burst
  playCellAttack() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(200, this.ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(
      800,
      this.ctx.currentTime + 0.1
    );

    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(150, this.ctx.currentTime);
    noise.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);

    noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.2);

    // Impact
    const impact = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();

    impact.type = "sine";
    impact.frequency.setValueAtTime(100, this.ctx.currentTime + 0.05);
    impact.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);

    impactGain.gain.setValueAtTime(0.4, this.ctx.currentTime + 0.05);
    impactGain.gain.exponentialRampToValueAtTime(
      0.01,
      this.ctx.currentTime + 0.25
    );

    impact.connect(impactGain);
    impactGain.connect(this.masterGain);

    impact.start(this.ctx.currentTime + 0.05);
    impact.stop(this.ctx.currentTime + 0.25);
  }

  // Cell energy growth - rising tone
  playCellGrow() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Enemy move - ominous rumble
  playEnemyMove() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 200;

    osc.type = "sawtooth";
    osc.frequency.value = 60;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Win - triumphant cellular fanfare
  playWin() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 392, time: 0, dur: 0.15 }, // G4
      { freq: 523, time: 0.12, dur: 0.15 }, // C5
      { freq: 659, time: 0.24, dur: 0.15 }, // E5
      { freq: 784, time: 0.36, dur: 0.3 }, // G5
      { freq: 659, time: 0.55, dur: 0.1 }, // E5
      { freq: 784, time: 0.65, dur: 0.4 }, // G5
    ];

    melody.forEach(({ freq, time, dur }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + time);
      gain.gain.linearRampToValueAtTime(
        0.25,
        this.ctx!.currentTime + time + 0.02
      );
      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + time + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx!.currentTime + time + dur
      );

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + time);
      osc.stop(this.ctx!.currentTime + time + dur + 0.05);
    });

    // Background pad
    const pad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();

    padFilter.type = "lowpass";
    padFilter.frequency.value = 800;

    pad.type = "triangle";
    pad.frequency.value = 196; // G3

    padGain.gain.setValueAtTime(0, this.ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.2);
    padGain.gain.setValueAtTime(0.1, this.ctx.currentTime + 0.8);
    padGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.masterGain);

    pad.start();
    pad.stop(this.ctx.currentTime + 1.2);
  }

  // Lose - descending failure
  playLose() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.6);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  // Level start - awakening
  playLevelStart() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Rising bubbles
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(
        200 + i * 50,
        this.ctx.currentTime + i * 0.08
      );
      osc.frequency.exponentialRampToValueAtTime(
        400 + i * 80,
        this.ctx.currentTime + i * 0.08 + 0.15
      );

      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(
        0.15,
        this.ctx.currentTime + i * 0.08 + 0.03
      );
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx.currentTime + i * 0.08 + 0.2
      );

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.ctx.currentTime + i * 0.08);
      osc.stop(this.ctx.currentTime + i * 0.08 + 0.2);
    }
  }

  // Reset - deflation
  playReset() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);

    osc.type = "sine";
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById(
  "webgpu-canvas"
) as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const cellsDisplay = document.getElementById("cells-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: CellDivisionGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      console.log("WebGPU initialized for Cell Division");
      // Emit ambient particles periodically
      setInterval(() => {
        renderer?.emitAmbient();
      }, 250);
    }
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

function initGame() {
  game = new CellDivisionGame(canvas);
  game.resize();

  const handlePointer = (
    e: MouseEvent | TouchEvent,
    type: "down" | "move" | "up"
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e
        ? e.touches[0]?.clientX || e.changedTouches[0]?.clientX
        : e.clientX;
    const clientY =
      "touches" in e
        ? e.touches[0]?.clientY || e.changedTouches[0]?.clientY
        : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    game.handleInput(type, x, y);
  };

  canvas.addEventListener("mousedown", (e) => handlePointer(e, "down"));
  canvas.addEventListener("mouseup", (e) => handlePointer(e, "up"));
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      handlePointer(e, "down");
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      handlePointer(e, "up");
    },
    { passive: false }
  );

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    movesDisplay.textContent = `${state.movesUsed}/${state.maxMoves}`;
    cellsDisplay.textContent = `${state.playerCells}/${state.targetCells}`;

    const cellsCard = cellsDisplay.parentElement;
    if (cellsCard) {
      if (state.playerCells >= state.targetCells) {
        cellsCard.classList.add("success");
        cellsCard.classList.remove("progress");
      } else if (state.playerCells > 1) {
        cellsCard.classList.add("progress");
        cellsCard.classList.remove("success");
      } else {
        cellsCard.classList.remove("success", "progress");
      }
    }

    // Cell select event
    if (state.cellSelect) {
      renderer?.emitCellSelect(
        state.cellSelect.x,
        state.cellSelect.y,
        state.cellSelect.isPlayer
      );
      audio.playCellSelect();
    }

    // Cell divide event
    if (state.cellDivide) {
      renderer?.emitCellDivide(
        state.cellDivide.fromX,
        state.cellDivide.fromY,
        state.cellDivide.toX,
        state.cellDivide.toY,
        state.cellDivide.isPlayer
      );
      audio.playCellDivide();
    }

    // Cell attack event
    if (state.cellAttack) {
      renderer?.emitCellAttack(
        state.cellAttack.fromX,
        state.cellAttack.fromY,
        state.cellAttack.toX,
        state.cellAttack.toY
      );
      audio.playCellAttack();
    }

    // Cell grow event
    if (state.cellGrow) {
      renderer?.emitCellGrow(
        state.cellGrow.x,
        state.cellGrow.y,
        state.cellGrow.energy
      );
      audio.playCellGrow();
    }

    // Enemy move event
    if (state.enemyMove) {
      renderer?.emitEnemyMove(
        state.enemyMove.fromX,
        state.enemyMove.fromY,
        state.enemyMove.toX,
        state.enemyMove.toY
      );
      audio.playEnemyMove();
    }

    // Reset event
    if (state.reset) {
      renderer?.emitReset();
      audio.playReset();
    }

    if (state.status === "won") {
      renderer?.emitVictory();
      audio.playWin();
      showWin(state.level, state.totalLevels);
    } else if (state.status === "lost") {
      audio.playLose();
      showLose();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin(level: number, totalLevels: number) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (level >= totalLevels) {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      nextBtn.style.display = "none";
    } else {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.level")} ${level}`;
      nextBtn.style.display = "inline-block";
    }

    startBtn.style.display = "inline-block";
    startBtn.textContent = i18n.t("game.reset");
  }, 500);
}

function showLose() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.lose");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.style.display = "inline-block";
    startBtn.textContent = i18n.t("game.reset");
    nextBtn.style.display = "none";
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  game.reset();
});

nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  renderer?.emitLevelStart();
  audio.playLevelStart();
});

// Init
initI18n();
initGame();
initWebGPU();
