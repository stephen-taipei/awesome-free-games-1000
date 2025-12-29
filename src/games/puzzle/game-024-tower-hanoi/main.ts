/**
 * Tower Hanoi Main Entry
 * Arcane Dimensional Theme
 * Game #024
 */
import { HanoiGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type PoleData, type DiskData, type BaseData } from "./webgpu";

// Audio System - Synthesized sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPickup() {
    this.init();
    if (!this.ctx) return;
    // Mystical pickup sound
    this.playTone(400, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.15), 50);
    setTimeout(() => this.playTone(800, 0.08, 'triangle', 0.1), 100);
  }

  playDrop() {
    this.init();
    if (!this.ctx) return;
    // Arcane landing sound
    this.playTone(300, 0.1, 'sine', 0.2);
    this.playTone(150, 0.15, 'triangle', 0.15);
  }

  playError() {
    this.init();
    if (!this.ctx) return;
    // Invalid move
    this.playTone(200, 0.15, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(150, 0.15, 'sawtooth', 0.1), 80);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    // Victory fanfare
    const notes = [400, 500, 600, 800, 1000];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'sine', 0.2), i * 100);
    });
    setTimeout(() => {
      this.playTone(600, 0.5, 'triangle', 0.15);
      this.playTone(800, 0.5, 'triangle', 0.15);
      this.playTone(1000, 0.5, 'triangle', 0.15);
    }, 500);
  }

  playStart() {
    this.init();
    if (!this.ctx) return;
    // Arcane portal opening
    this.playTone(200, 0.2, 'sine', 0.1);
    setTimeout(() => this.playTone(300, 0.15, 'sine', 0.15), 100);
    setTimeout(() => this.playTone(400, 0.1, 'triangle', 0.2), 200);
  }
}

const audio = new AudioSystem();

// Elements
const towerDivs = [0, 1, 2].map((i) => document.getElementById(`tower-${i}`)!);
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const minMovesDisplay = document.getElementById("min-moves-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const diskSelect = document.getElementById("disk-select") as HTMLSelectElement;

const resetBtn = document.getElementById("reset-btn")!;

// WebGPU Setup
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let useWebGPU = false;

async function initWebGPU() {
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.className = 'webgpu-overlay';
  webgpuCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;';
  gameArea.appendChild(webgpuCanvas);

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  useWebGPU = await webgpuRenderer.init();

  if (useWebGPU) {
    startWebGPULoop();
  }
}

function startWebGPULoop() {
  if (!webgpuRenderer || !useWebGPU) return;

  let lastTime = 0;
  function loop(time: number) {
    if (!webgpuRenderer || !useWebGPU) return;

    const deltaTime = lastTime ? time - lastTime : 16;
    lastTime = time;

    webgpuRenderer.render(deltaTime);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function resizeWebGPU() {
  if (!webgpuCanvas) return;
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;
}

let game: HanoiGame;

// Arcane disk colors
const DISK_COLORS = [
  "#9b59b6", // Purple
  "#8e44ad", // Dark purple
  "#3498db", // Blue
  "#1abc9c", // Teal
  "#f39c12", // Gold
  "#e74c3c", // Red
  "#2ecc71", // Green
];

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

// Track selection for particle effects
let previousSelected: number | null = null;

function initGame() {
  game = new HanoiGame();

  // Bind Tower Clicks
  towerDivs.forEach((t, idx) => {
    t.addEventListener("click", () => {
      const wasSelected = previousSelected;
      game.selectTower(idx);

      // Audio feedback based on selection state
      if (wasSelected === null) {
        audio.playPickup();
      }
    });
  });

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    minMovesDisplay.textContent = state.minMoves.toString();

    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    renderTowers(state.towers, state.selected);
    updateWebGPUState(state);

    // Track selection changes for effects
    if (previousSelected !== null && state.selected === null) {
      // Disk was dropped
      audio.playDrop();
    }
    previousSelected = state.selected;

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", resizeWebGPU);
}

function hexToRgbArray(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

function updateWebGPUState(state: any) {
  if (!webgpuRenderer || !useWebGPU) return;

  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const rect = gameArea.getBoundingClientRect();
  const aspectRatio = rect.width / rect.height;

  // Tower positions (normalized 0-1)
  const towerPositions = [0.17, 0.5, 0.83];
  const poleWidth = 0.02;
  const poleHeight = 0.6;
  const baseY = 0.85;
  const diskHeight = 0.06;

  // Update poles
  const poles: PoleData[] = towerPositions.map((x, idx) => ({
    x: x - poleWidth / 2,
    y: baseY - poleHeight,
    width: poleWidth,
    height: poleHeight,
    selected: state.selected === idx,
  }));
  webgpuRenderer.updatePoles(poles);

  // Update bases
  const bases: BaseData[] = towerPositions.map((x) => ({
    x: x - 0.12,
    y: baseY,
    width: 0.24,
    height: 0.05,
  }));
  webgpuRenderer.updateBases(bases);

  // Update disks
  const disks: DiskData[] = [];
  const maxDisks = parseInt(diskSelect.value, 10) || 5;

  state.towers.forEach((tower: number[], towerIdx: number) => {
    tower.forEach((diskSize: number, stackIdx: number) => {
      const x = towerPositions[towerIdx];
      const y = baseY - (stackIdx + 1) * diskHeight;
      const widthBase = 0.06;
      const widthPerSize = 0.015;
      const width = widthBase + diskSize * widthPerSize;

      const isTopDisk = stackIdx === tower.length - 1;
      const isSelected = state.selected === towerIdx && isTopDisk;

      // Raise selected disk
      const adjustedY = isSelected ? y - 0.08 : y;

      const color = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length];

      disks.push({
        x: x - width / 2,
        y: adjustedY,
        width,
        height: diskHeight - 0.01,
        color: hexToRgbArray(color),
        selected: isSelected,
        size: diskSize,
        animProgress: 0,
      });

      // Emit particles for selected disk
      if (isSelected && webgpuRenderer) {
        webgpuRenderer.emitTrail(x, adjustedY + diskHeight / 2);
      }
    });
  });

  webgpuRenderer.updateDisks(disks);
}

function renderTowers(towers: number[][], selectedTower: number | null) {
  towerDivs.forEach((div, idx) => {
    // Remove old disks
    const disks = div.querySelectorAll(".disk");
    disks.forEach((d) => d.remove());

    // Add new disks
    const stack = towers[idx];
    stack.forEach((diskSize: number, i: number) => {
      const disk = document.createElement("div");
      disk.className = "disk";

      const width = 25 + diskSize * 10;
      disk.style.width = `${width}%`;
      disk.style.backgroundColor =
        DISK_COLORS[(diskSize - 1) % DISK_COLORS.length];

      if (selectedTower === idx && i === stack.length - 1) {
        disk.classList.add("selected");
      }

      div.appendChild(disk);
    });

    if (selectedTower === idx) {
      div.classList.add("selected-tower");
    } else {
      div.classList.remove("selected-tower");
    }
  });
}

function showWin() {
  setTimeout(() => {
    audio.playWin();

    if (webgpuRenderer && useWebGPU) {
      webgpuRenderer.emitComplete(0.83, 0.5);
      webgpuRenderer.setVictory(1.0);
      setTimeout(() => webgpuRenderer?.setVictory(0), 2000);
    }

    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${
      moveDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  previousSelected = null;

  if (webgpuRenderer) {
    webgpuRenderer.clearParticles();
    webgpuRenderer.setVictory(0);
  }

  const disks = parseInt(diskSelect.value, 10);
  game.start(disks);
  audio.playStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.onclick = startGame;
});

// Init
initI18n();
initGame();
initWebGPU();
