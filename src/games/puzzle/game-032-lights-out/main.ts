/**
 * Lights Out Main Entry
 * Neon Circuit Theme
 * Game #032
 */
import { LightsOutGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playToggleOn(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Electric buzz on
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // High frequency hum
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(1200, now);
    humGain.gain.setValueAtTime(0.05, now);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    hum.connect(humGain).connect(ctx.destination);
    hum.start(now);
    hum.stop(now + 0.1);
  }

  playToggleOff(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Power down sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playChainReaction(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Quick electric zap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Descending power-down sequence
    [800, 600, 400, 200, 100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.25);
    });

    // Final deep bass confirmation
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(60, now + 0.5);
    bassGain.gain.setValueAtTime(0.15, now + 0.5);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    bass.connect(bassGain).connect(ctx.destination);
    bass.start(now + 0.5);
    bass.stop(now + 1.0);
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Power-up sequence
    [100, 200, 400, 600, 800].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.06, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.12);
    });

    // Circuit hum
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(120, now + 0.3);
    humGain.gain.setValueAtTime(0.08, now + 0.3);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    hum.connect(humGain).connect(ctx.destination);
    hum.start(now + 0.3);
    hum.stop(now + 0.8);
  }
}

// Elements
const gridContainer = document.getElementById("grid-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const newGameBtn = document.getElementById("hint-btn")!;

let game: LightsOutGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let previousGrid: boolean[][] = [];

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
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.id = 'webgpu-canvas';
  webgpuCanvas.className = 'webgpu-overlay';

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.appendChild(webgpuCanvas);

    const resizeCanvas = () => {
      const rect = gameArea.getBoundingClientRect();
      webgpuCanvas.width = rect.width;
      webgpuCanvas.height = rect.height;
      webgpuCanvas.style.width = rect.width + 'px';
      webgpuCanvas.style.height = rect.height + 'px';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (!success) {
      renderer = null;
      webgpuCanvas.remove();
    }
  }

  // Render loop
  function renderLoop() {
    if (renderer) {
      renderer.render();
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

function initGame() {
  game = new LightsOutGame();

  game.setOnStateChange((state: any) => {
    // Detect changes and emit particles
    if (previousGrid.length > 0) {
      state.grid.forEach((row: boolean[], y: number) => {
        row.forEach((isOn: boolean, x: number) => {
          if (previousGrid[y] && previousGrid[y][x] !== isOn) {
            if (renderer) {
              const gameArea = document.querySelector('.game-area');
              const gridEl = document.querySelector('.grid-container');
              if (gameArea && gridEl) {
                const areaRect = gameArea.getBoundingClientRect();
                const gridRect = gridEl.getBoundingClientRect();

                const cellSize = gridRect.width / 5;
                const cellX = gridRect.left - areaRect.left + (x + 0.5) * cellSize;
                const cellY = gridRect.top - areaRect.top + (y + 0.5) * cellSize;

                const px = cellX / areaRect.width;
                const py = cellY / areaRect.height;

                renderer.emitToggle(px, py, isOn);
                audio.playChainReaction();
              }
            }
          }
        });
      });
    }

    previousGrid = state.grid.map((row: boolean[]) => [...row]);

    renderGrid(state.grid);
    movesDisplay.textContent = state.moves.toString();

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.triggerVictory();
      }
      showWin();
    }
  });

  renderGrid(game.grid);
}

function renderGrid(grid: boolean[][]) {
  gridContainer.innerHTML = "";
  grid.forEach((row, y) => {
    row.forEach((isOn, x) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (isOn) cell.classList.add("on");

      cell.addEventListener("click", () => {
        if (isOn) {
          audio.playToggleOff();
        } else {
          audio.playToggleOn();
        }

        // Emit main toggle effect
        if (renderer) {
          const gameArea = document.querySelector('.game-area');
          const gridEl = document.querySelector('.grid-container');
          if (gameArea && gridEl) {
            const areaRect = gameArea.getBoundingClientRect();
            const gridRect = gridEl.getBoundingClientRect();

            const cellSize = gridRect.width / 5;
            const cellX = gridRect.left - areaRect.left + (x + 0.5) * cellSize;
            const cellY = gridRect.top - areaRect.top + (y + 0.5) * cellSize;

            const px = cellX / areaRect.width;
            const py = cellY / areaRect.height;

            renderer.emitChain(px, py);
          }
        }

        game.move(x, y);
      });

      gridContainer.appendChild(cell);
    });
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${
      movesDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.newgame");

    startBtn.onclick = () => {
      startGame();
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  previousGrid = [];
  audio.playStart();
  game.newGame();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  previousGrid = [];
  game.reset();
});
newGameBtn.addEventListener("click", () => {
  previousGrid = [];
  audio.playStart();
  game.newGame();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
