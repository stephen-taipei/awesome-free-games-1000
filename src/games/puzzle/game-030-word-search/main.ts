/**
 * Word Search Main Entry
 * Ancient Scrolls Theme
 * Game #030
 */
import { WordSearchGame } from "./game";
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

  playSelect(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Quill scratch sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playFound(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Medieval chime discovery
    [392, 523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.15, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });

    // Bell resonance
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.setValueAtTime(784, now);
    bellGain.gain.setValueAtTime(0.08, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    bell.connect(bellGain).connect(ctx.destination);
    bell.start(now);
    bell.stop(now + 0.5);
  }

  playInvalid(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Page rustle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Triumphant fanfare
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.12, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });

    // Choir sustain
    [262, 330, 392].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.5);
      gain.gain.setValueAtTime(0.05, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + 0.5);
      osc.stop(now + 1.5);
    });
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Scroll unrolling
    [150, 200, 300, 400].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }
}

// Elements
const gridContainer = document.getElementById("grid-container")!;
const wordListUl = document.getElementById("word-list-ul")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const foundDisplay = document.getElementById("found-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WordSearchGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let isDragging = false;

// State tracking
let previousFoundCount = 0;

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
    initGame();
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
  game = new WordSearchGame();

  const words = i18n.t("words") as any as string[];

  game.setOnStateChange((state: any) => {
    renderGrid(state);
    renderWordList(state.words);

    const foundCount = state.words.filter((w: any) => w.found).length;
    foundDisplay.textContent = `${foundCount}/${state.words.length}`;

    // Detect word found
    if (foundCount > previousFoundCount) {
      audio.playFound();

      // Emit particles at grid center
      if (renderer) {
        const gridRect = gridContainer.getBoundingClientRect();
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
          const areaRect = gameArea.getBoundingClientRect();
          const x = (gridRect.left - areaRect.left + gridRect.width / 2) / areaRect.width;
          const y = (gridRect.top - areaRect.top + gridRect.height / 2) / areaRect.height;
          renderer.emitFound(x, y);
        }
      }

      previousFoundCount = foundCount;
    }

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.triggerVictory();
      }
      showWin();
    }
  });

  game.start(words);
  previousFoundCount = 0;
}

function renderGrid(state: any) {
  gridContainer.innerHTML = "";
  gridContainer.style.gridTemplateColumns = `repeat(${game.width}, 30px)`;

  state.grid.forEach((row: string[], y: number) => {
    row.forEach((char: string, x: number) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = char;
      cell.dataset.x = x.toString();
      cell.dataset.y = y.toString();

      const isFound = state.words.some(
        (w: any) => w.found && w.cells.some((c: any) => c.x === x && c.y === y)
      );
      if (isFound) cell.classList.add("found");

      const isSelected = state.selected.some(
        (c: any) => c.x === x && c.y === y
      );
      if (isSelected) cell.classList.add("selected");

      cell.addEventListener("mousedown", (e) => {
        isDragging = true;
        audio.playSelect();
        game.handleInputStart(x, y);
      });

      cell.addEventListener("mouseenter", (e) => {
        if (isDragging) {
          audio.playSelect();
          game.handleInputMove(x, y);

          // Emit selection trail
          if (renderer) {
            const gameArea = document.querySelector('.game-area');
            if (gameArea) {
              const areaRect = gameArea.getBoundingClientRect();
              const cellRect = cell.getBoundingClientRect();
              const px = (cellRect.left - areaRect.left + cellRect.width / 2) / areaRect.width;
              const py = (cellRect.top - areaRect.top + cellRect.height / 2) / areaRect.height;
              renderer.emitSelect(px, py);
            }
          }
        }
      });

      gridContainer.appendChild(cell);
    });
  });
}

window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    game.handleInputEnd();
  }
});

gridContainer.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && (el as HTMLElement).classList.contains("cell")) {
      isDragging = true;
      audio.playSelect();
      const x = parseInt((el as HTMLElement).dataset.x!);
      const y = parseInt((el as HTMLElement).dataset.y!);
      game.handleInputStart(x, y);
    }
  },
  { passive: false }
);

gridContainer.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && (el as HTMLElement).classList.contains("cell")) {
      const x = parseInt((el as HTMLElement).dataset.x!);
      const y = parseInt((el as HTMLElement).dataset.y!);
      game.handleInputMove(x, y);
    }
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  if (isDragging) {
    isDragging = false;
    game.handleInputEnd();
  }
});

function renderWordList(words: any[]) {
  wordListUl.innerHTML = "";
  words.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = w.word;
    if (w.found) li.className = "found";
    wordListUl.appendChild(li);
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  previousFoundCount = 0;
  audio.playStart();
  const words = i18n.t("words") as any as string[];
  game.start(words);
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  previousFoundCount = 0;
  audio.playStart();
  startGame();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
