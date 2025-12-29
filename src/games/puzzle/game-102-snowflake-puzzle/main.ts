/**
 * Snowflake Puzzle Main Entry
 * Winter Wonderland / Frozen Crystal Theme
 * Game #102
 */
import { SnowflakeGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// ============ Audio System ============
class AudioSystem {
  private audioContext: AudioContext | null = null;

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  private createOscillator(
    type: OscillatorType,
    frequency: number,
    duration: number,
    gainValue: number = 0.3,
    delay: number = 0
  ): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
    gain.gain.linearRampToValueAtTime(gainValue, this.audioContext.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + delay + duration);

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    oscillator.start(this.audioContext.currentTime + delay);
    oscillator.stop(this.audioContext.currentTime + delay + duration);
  }

  private createNoise(duration: number, gainValue: number = 0.1): void {
    if (!this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 3000;

    gain.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    source.start();
    source.stop(this.audioContext.currentTime + duration);
  }

  playToggle(isActive: boolean): void {
    this.initContext();
    if (isActive) {
      // Crystal activation - bright icy ting
      this.createOscillator("sine", 1200, 0.15, 0.2);
      this.createOscillator("triangle", 1800, 0.1, 0.1, 0.02);
      this.createOscillator("sine", 2400, 0.08, 0.08, 0.03);
      this.createNoise(0.05, 0.05);
    } else {
      // Frost dissolve - soft descending
      this.createOscillator("sine", 800, 0.12, 0.15);
      this.createOscillator("triangle", 600, 0.1, 0.1, 0.02);
    }
  }

  playRotate(): void {
    this.initContext();
    // Whooshing wind rotation
    for (let i = 0; i < 6; i++) {
      const freq = 400 + i * 50;
      this.createOscillator("sine", freq, 0.08, 0.08, i * 0.03);
    }
    this.createNoise(0.2, 0.08);
  }

  playClear(): void {
    this.initContext();
    // Sweeping frost dissolution
    for (let i = 0; i < 8; i++) {
      const freq = 1000 - i * 80;
      this.createOscillator("triangle", freq, 0.1, 0.1, i * 0.03);
    }
    this.createNoise(0.25, 0.06);
  }

  playMatch(): void {
    this.initContext();
    // Satisfying crystalline chime
    this.createOscillator("sine", 880, 0.3, 0.25);
    this.createOscillator("sine", 1320, 0.25, 0.15, 0.05);
    this.createOscillator("triangle", 1760, 0.2, 0.1, 0.08);
  }

  playWin(): void {
    this.initContext();
    // Magical ice crystal melody
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
    notes.forEach((freq, i) => {
      this.createOscillator("sine", freq, 0.4, 0.2, i * 0.1);
      this.createOscillator("triangle", freq * 1.5, 0.3, 0.1, i * 0.1 + 0.02);
    });

    // Sparkling overlay
    for (let i = 0; i < 12; i++) {
      const freq = 2000 + Math.random() * 1500;
      this.createOscillator("sine", freq, 0.15, 0.08, i * 0.08);
    }
  }

  playLevelStart(): void {
    this.initContext();
    // Ascending ice crystal tones
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, i) => {
      this.createOscillator("sine", freq, 0.2, 0.15, i * 0.12);
      this.createOscillator("triangle", freq * 1.5, 0.15, 0.08, i * 0.12 + 0.02);
    });
    this.createNoise(0.1, 0.05);
  }

  playReset(): void {
    this.initContext();
    // Descending ice shatter
    const notes = [784, 659, 523, 392];
    notes.forEach((freq, i) => {
      this.createOscillator("triangle", freq, 0.12, 0.12, i * 0.08);
    });
    this.createNoise(0.15, 0.06);
  }
}

// ============ Main Application ============
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const branchesDisplay = document.getElementById("branches-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const rotateBtn = document.getElementById("rotate-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: SnowflakeGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU(): Promise<void> {
  if (!webgpuCanvas) return;

  webgpuCanvas.width = window.innerWidth;
  webgpuCanvas.height = window.innerHeight;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (success) {
    window.addEventListener("resize", () => {
      if (renderer) {
        renderer.resize(window.innerWidth, window.innerHeight);
      }
    });
  } else {
    console.log("WebGPU not available, using CSS fallback");
  }
}

function initI18n(): void {
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();

  game = new SnowflakeGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "won") {
      audio.playWin();
      renderer?.emitVictory();
      setTimeout(() => showWinOverlay(), 500);
    }
  };

  canvas.addEventListener("click", handleCanvasClick);

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = size;
  canvas.height = size;
}

function handleCanvasClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const x = clickX - canvas.width / 2;
  const y = clickY - canvas.height / 2;

  const state = game.getState();
  const centerRadius = 20;
  const layerHeight = (canvas.width / 2 - centerRadius - 20) / state.layers;

  const dist = Math.sqrt(x * x + y * y);
  let angle = Math.atan2(y, x);
  if (angle < 0) angle += Math.PI * 2;

  const layer = Math.floor((dist - centerRadius) / layerHeight);
  if (layer < 0 || layer >= state.layers) return;

  const branchAngle = (Math.PI * 2) / state.branches;
  const branchIndex = Math.floor(angle / branchAngle);
  const angleInBranch = angle - branchIndex * branchAngle;

  const halfAngle = branchAngle / 2;
  const cellsInLayer = layer + 1;
  const cellAngle = halfAngle / cellsInLayer;

  let cellIndex: number;
  if (angleInBranch < halfAngle) {
    cellIndex = Math.floor(angleInBranch / cellAngle);
  } else {
    const mirrorAngle = branchAngle - angleInBranch;
    cellIndex = Math.floor(mirrorAngle / cellAngle);
  }

  if (cellIndex >= 0 && cellIndex <= layer) {
    const wasActive = state.pattern[layer][cellIndex];
    game.toggleCell(layer, cellIndex);

    // Emit particles at click position
    const screenX = rect.left + clickX;
    const screenY = rect.top + clickY;
    audio.playToggle(!wasActive);
    renderer?.emitToggle(screenX, screenY, !wasActive);

    // Check if match
    if (state.target[layer][cellIndex] === !wasActive) {
      renderer?.emitMatch(screenX, screenY);
    }
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(cx, cy) - 20;
  const centerRadius = 20;
  const layerHeight = (maxRadius - centerRadius) / state.layers;

  ctx.clearRect(0, 0, width, height);

  // Draw background circle
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius + 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(26, 47, 78, 0.5)";
  ctx.fill();

  // Draw center
  ctx.beginPath();
  ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#e8f4fc";
  ctx.shadowColor = "#87ceeb";
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw branch lines
  const branchAngle = (Math.PI * 2) / state.branches;
  ctx.strokeStyle = "rgba(135, 206, 235, 0.3)";
  ctx.lineWidth = 1;

  for (let b = 0; b < state.branches; b++) {
    const angle = b * branchAngle - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angle) * maxRadius,
      cy + Math.sin(angle) * maxRadius
    );
    ctx.stroke();
  }

  // Draw cells for each branch
  for (let b = 0; b < state.branches; b++) {
    const baseAngle = b * branchAngle - Math.PI / 2;

    for (let layer = 0; layer < state.layers; layer++) {
      const innerR = centerRadius + layer * layerHeight;
      const outerR = innerR + layerHeight;
      const cellsInLayer = layer + 1;
      const halfAngle = branchAngle / 2;
      const cellAngle = halfAngle / cellsInLayer;

      for (let i = 0; i <= layer; i++) {
        const isActive = state.pattern[layer][i];
        const isTarget = state.target[layer][i];

        for (let mirror = 0; mirror < 2; mirror++) {
          let startAngle, endAngle;

          if (mirror === 0) {
            startAngle = baseAngle + i * cellAngle;
            endAngle = baseAngle + (i + 1) * cellAngle;
          } else {
            startAngle = baseAngle + branchAngle - (i + 1) * cellAngle;
            endAngle = baseAngle + branchAngle - i * cellAngle;
          }

          ctx.beginPath();
          ctx.arc(cx, cy, outerR, startAngle, endAngle);
          ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
          ctx.closePath();

          if (isActive) {
            ctx.fillStyle = "#b8d4e8";
            ctx.shadowColor = "#87ceeb";
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = "rgba(26, 47, 78, 0.5)";
            ctx.shadowBlur = 0;
          }

          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = isTarget
            ? "rgba(135, 206, 235, 0.8)"
            : "rgba(135, 206, 235, 0.3)";
          ctx.lineWidth = isTarget ? 2 : 1;
          ctx.stroke();
        }
      }
    }
  }

  drawTargetPreview(state, 60, 60, 50);
}

function drawTargetPreview(
  state: GameState,
  x: number,
  y: number,
  size: number
): void {
  const maxR = size / 2 - 5;
  const centerR = 5;
  const layerH = (maxR - centerR) / state.layers;
  const branchAngle = (Math.PI * 2) / state.branches;

  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(26, 47, 78, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "#87ceeb";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let b = 0; b < state.branches; b++) {
    const baseAngle = b * branchAngle - Math.PI / 2;

    for (let layer = 0; layer < state.layers; layer++) {
      const innerR = centerR + layer * layerH;
      const outerR = innerR + layerH;
      const cellsInLayer = layer + 1;
      const halfAngle = branchAngle / 2;
      const cellAngle = halfAngle / cellsInLayer;

      for (let i = 0; i <= layer; i++) {
        if (!state.target[layer][i]) continue;

        for (let mirror = 0; mirror < 2; mirror++) {
          let startAngle, endAngle;

          if (mirror === 0) {
            startAngle = baseAngle + i * cellAngle;
            endAngle = baseAngle + (i + 1) * cellAngle;
          } else {
            startAngle = baseAngle + branchAngle - (i + 1) * cellAngle;
            endAngle = baseAngle + branchAngle - i * cellAngle;
          }

          ctx.beginPath();
          ctx.arc(x, y, outerR, startAngle, endAngle);
          ctx.arc(x, y, innerR, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = "#87ceeb";
          ctx.fill();
        }
      }
    }
  }

  ctx.fillStyle = "#e8f4fc";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Target", x, y + size / 2 + 12);
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  branchesDisplay.textContent = state.branches.toString();
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.level")} ${state.level} ${i18n.t("game.win")}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
      audio.playLevelStart();
      renderer?.emitLevelStart();
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  game.start(level);
  audio.playLevelStart();
  renderer?.emitLevelStart();
}

// Event listeners
startBtn.addEventListener("click", () => startGame());

resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
  renderer?.emitReset();
});

rotateBtn.addEventListener("click", () => {
  game.rotate();
  audio.playRotate();
  const rect = canvas.getBoundingClientRect();
  renderer?.emitRotate(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
    Math.min(rect.width, rect.height) / 2
  );
});

clearBtn.addEventListener("click", () => {
  game.clear();
  audio.playClear();
  const rect = canvas.getBoundingClientRect();
  renderer?.emitClear(rect.left + rect.width / 2, rect.top + rect.height / 2);
});

// Initialize
initI18n();
initGame();
initWebGPU();
