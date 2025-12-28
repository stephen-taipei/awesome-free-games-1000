/**
 * Scrabble Lite Main Entry
 * Vintage Letterpress Theme
 * Game #031
 */
import { ScrabbleGame, type Tile } from "./game";
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

  playPlace(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Wooden tile thunk
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Wood resonance
    const resonance = ctx.createOscillator();
    const resGain = ctx.createGain();
    resonance.type = 'sine';
    resonance.frequency.setValueAtTime(120, now);
    resGain.gain.setValueAtTime(0.08, now);
    resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    resonance.connect(resGain).connect(ctx.destination);
    resonance.start(now);
    resonance.stop(now + 0.2);
  }

  playDrag(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft slide on felt
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200 + Math.random() * 100, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playScore(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Brass bell score confirmation
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });

    // Deep resonant chime
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.setValueAtTime(262, now + 0.2);
    bellGain.gain.setValueAtTime(0.1, now + 0.2);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    bell.connect(bellGain).connect(ctx.destination);
    bell.start(now + 0.2);
    bell.stop(now + 0.8);
  }

  playShuffle(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Multiple tiles shuffling
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150 + Math.random() * 80, now + i * 0.05);
      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.1);
    }
  }

  playInvalid(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Low thud - rejected
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Letterpress machine starting
    [100, 150, 200, 300, 400].forEach((freq, i) => {
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

    // Warm chime
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(523, now + 0.3);
    chimeGain.gain.setValueAtTime(0.1, now + 0.3);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    chime.connect(chimeGain).connect(ctx.destination);
    chime.start(now + 0.3);
    chime.stop(now + 0.8);
  }
}

// Elements
const boardDiv = document.getElementById("board")!;
const rackDiv = document.getElementById("rack")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const submitBtn = document.getElementById("submit-btn")!;
const shuffleBtn = document.getElementById("shuffle-btn")!;

let game: ScrabbleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let previousScore = 0;

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
  game = new ScrabbleGame();

  game.setOnStateChange((state: any) => {
    renderBoard(state.board);
    renderRack(state.rack);
    scoreDisplay.textContent = state.score.toString();

    // Detect score change
    if (state.score > previousScore) {
      audio.playScore();

      if (renderer) {
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
          renderer.emitScore(0.5, 0.5, state.score - previousScore);
        }
      }

      previousScore = state.score;
    }
  });
}

function renderBoard(board: any[][]) {
  boardDiv.innerHTML = "";

  board.forEach((row, y) => {
    row.forEach((cell: any, x: number) => {
      const cellDiv = document.createElement("div");
      cellDiv.className = "cell";
      if (cell.bonus) {
        cellDiv.classList.add(cell.bonus.toLowerCase());
        cellDiv.textContent = cell.bonus;
      }

      // Drop zone
      cellDiv.addEventListener("dragover", (e) => e.preventDefault());
      cellDiv.addEventListener("drop", (e: any) => {
        e.preventDefault();
        const tileId = e.dataTransfer.getData("tileId");
        game.moveTileToBoard(tileId, x, y);

        audio.playPlace();

        // Emit particles
        if (renderer) {
          const gameArea = document.querySelector('.game-area');
          if (gameArea) {
            const areaRect = gameArea.getBoundingClientRect();
            const cellRect = cellDiv.getBoundingClientRect();
            const px = (cellRect.left - areaRect.left + cellRect.width / 2) / areaRect.width;
            const py = (cellRect.top - areaRect.top + cellRect.height / 2) / areaRect.height;
            renderer.emitPlace(px, py);
          }
        }
      });

      // Tile Render
      if (cell.tile) {
        const tileDiv = createTileElement(cell.tile);
        tileDiv.classList.add("on-board");

        if (!cell.tile.locked) {
          tileDiv.draggable = true;
          tileDiv.addEventListener("dragstart", (e: any) => {
            e.dataTransfer.setData("tileId", cell.tile.id);
          });

          tileDiv.addEventListener("drag", (e: DragEvent) => {
            if (renderer && e.clientX && e.clientY) {
              const gameArea = document.querySelector('.game-area');
              if (gameArea) {
                const areaRect = gameArea.getBoundingClientRect();
                const px = (e.clientX - areaRect.left) / areaRect.width;
                const py = (e.clientY - areaRect.top) / areaRect.height;
                renderer.emitDrag(px, py);
              }
            }
          });

          tileDiv.addEventListener("dblclick", () => {
            game.returnToRack(cell.tile);
          });
        } else {
          tileDiv.classList.add("locked");
        }

        cellDiv.appendChild(tileDiv);
      }

      boardDiv.appendChild(cellDiv);
    });
  });
}

function renderRack(rack: Tile[]) {
  rackDiv.innerHTML = "";
  rack.forEach((tile) => {
    const tDiv = createTileElement(tile);
    tDiv.draggable = true;
    tDiv.addEventListener("dragstart", (e: any) => {
      e.dataTransfer.setData("tileId", tile.id);
      audio.playDrag();
    });

    tDiv.addEventListener("drag", (e: DragEvent) => {
      if (renderer && e.clientX && e.clientY) {
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
          const areaRect = gameArea.getBoundingClientRect();
          const px = (e.clientX - areaRect.left) / areaRect.width;
          const py = (e.clientY - areaRect.top) / areaRect.height;
          renderer.emitDrag(px, py);
        }
      }
    });

    rackDiv.appendChild(tDiv);
  });

  // Allow drop back to rack
  rackDiv.addEventListener("dragover", (e) => e.preventDefault());
  rackDiv.addEventListener("drop", (e: any) => {
    e.preventDefault();
    const tileId = e.dataTransfer.getData("tileId");
    const temp = game.placedTilesTemp.find((pt) => pt.tile.id === tileId);
    if (temp) {
      game.returnToRack(temp.tile);
    }
  });
}

function createTileElement(tile: Tile) {
  const div = document.createElement("div");
  div.className = "tile";
  div.textContent = tile.char;
  const sub = document.createElement("sub");
  sub.textContent = tile.points.toString();
  div.appendChild(sub);
  return div;
}

function startGame() {
  overlay.style.display = "none";
  previousScore = 0;
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.onclick = startGame;
});
submitBtn.addEventListener("click", () => game.submit());
shuffleBtn.addEventListener("click", () => {
  audio.playShuffle();
  game.shuffleRack();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
