/**
 * Pyramid Puzzle Main Entry
 * Ancient Egypt / Desert Mystique Theme with WebGPU
 * Game #105
 */
import { PyramidGame, GameState, Triangle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Ancient Egyptian themed
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    options: {
      volume?: number;
      attack?: number;
      decay?: number;
      filterFreq?: number;
      vibrato?: number;
    } = {}
  ): void {
    this.init();
    if (!this.ctx) return;

    const {
      volume = 0.15,
      attack = 0.01,
      decay = 0.3,
      filterFreq = 2000,
      vibrato = 0,
    } = options;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = filterFreq;

    osc.type = type;
    osc.frequency.value = frequency;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration - 0.01);

    // Vibrato for mystical sound
    if (vibrato > 0) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = vibrato;
      lfoGain.gain.value = frequency * 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);
    }

    osc.start(now);
    osc.stop(now + duration);
  }

  // Triangle flip - mystical stone shift
  playFlip(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Stone scrape
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 5);
    }
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 3;

    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // Mystical chime
    this.playTone(440, 0.25, "sine", { volume: 0.12, vibrato: 6 });
    setTimeout(() => {
      this.playTone(554.37, 0.2, "sine", { volume: 0.08, vibrato: 6 });
    }, 50);
  }

  // Reset - sandstorm whoosh
  playReset(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sandstorm sweep
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.8, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 1;

    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // Descending tones
    [300, 250, 200, 160].forEach((freq, i) => {
      this.playTone(freq, 0.15, "triangle", { volume: 0.08, attack: 0.01 });
    });
  }

  // Victory - Pharaoh's fanfare
  playWin(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Egyptian-style pentatonic scale
    const notes = [293.66, 329.63, 392, 440, 523.25, 587.33, 659.25]; // D4-E5 pentatonic-ish

    notes.forEach((freq, i) => {
      const t = now + i * 0.12;

      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.value = freq;

      filter.type = "lowpass";
      filter.frequency.value = 3000;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.3);

      // Add harmony
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 1.5;
      gain2.gain.setValueAtTime(0.06, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.ctx!.destination);
      osc2.start(t);
      osc2.stop(t + 0.25);
    });

    // Pyramid power hum
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = "sine";
    hum.frequency.value = 110;
    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    humGain.gain.setValueAtTime(0.15, now + 0.8);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    hum.connect(humGain);
    humGain.connect(this.ctx.destination);
    hum.start(now);
    hum.stop(now + 1.5);
  }

  // Level start - ancient awakening
  playLevelStart(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep resonant tone (pyramid chamber)
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    const droneFilter = this.ctx.createBiquadFilter();

    drone.type = "triangle";
    drone.frequency.value = 82.41;

    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 400;

    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.2, now + 0.2);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1);

    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.ctx.destination);
    drone.start(now);
    drone.stop(now + 1);

    // Rising mystical tones
    [220, 277.18, 329.63].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine", { volume: 0.1, vibrato: 4 });
      }, 200 + i * 150);
    });
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetColorBox = document.getElementById("target-color")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: PyramidGame;
let trianglePositions: { row: number; col: number; points: [number, number][] }[] = [];
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU(): Promise<void> {
  if (!webgpuCanvas) return;

  webgpuCanvas.width = window.innerWidth;
  webgpuCanvas.height = window.innerHeight;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.log("WebGPU not available, continuing without effects");
    renderer = null;
  }

  window.addEventListener("resize", () => {
    if (renderer) {
      renderer.resize(window.innerWidth, window.innerHeight);
    }
  });
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

  game = new PyramidGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => {
        audio.playWin();
        renderer?.emitVictory();
        showWinOverlay();
      }, 500);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function pointInTriangle(
  px: number,
  py: number,
  points: [number, number][]
): boolean {
  const [p0, p1, p2] = points;

  const area = 0.5 * (-p1[1] * p2[0] + p0[1] * (-p1[0] + p2[0]) + p0[0] * (p1[1] - p2[1]) + p1[0] * p2[1]);
  const sign = area < 0 ? -1 : 1;

  const s = (p0[1] * p2[0] - p0[0] * p2[1] + (p2[1] - p0[1]) * px + (p0[0] - p2[0]) * py) * sign;
  const t = (p0[0] * p1[1] - p0[1] * p1[0] + (p0[1] - p1[1]) * px + (p1[0] - p0[0]) * py) * sign;

  return s > 0 && t > 0 && s + t < 2 * area * sign;
}

function findTriangleAt(x: number, y: number): { row: number; col: number; centerX: number; centerY: number } | null {
  for (const tri of trianglePositions) {
    if (pointInTriangle(x, y, tri.points)) {
      const centerX = (tri.points[0][0] + tri.points[1][0] + tri.points[2][0]) / 3;
      const centerY = (tri.points[0][1] + tri.points[1][1] + tri.points[2][1]) / 3;
      return { row: tri.row, col: tri.col, centerX, centerY };
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const triangle = findTriangleAt(x, y);

  if (triangle) {
    audio.playFlip();
    // Map to screen coordinates for effect
    const rect = canvas.getBoundingClientRect();
    const screenX = rect.left + triangle.centerX * (rect.width / canvas.width);
    const screenY = rect.top + triangle.centerY * (rect.height / canvas.height);
    renderer?.emitFlip(screenX, screenY, Math.random());
    game.clickTriangle(triangle.row, triangle.col);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const triangle = findTriangleAt(x, y);

  if (triangle) {
    audio.playFlip();
    const rect = canvas.getBoundingClientRect();
    const screenX = rect.left + triangle.centerX * (rect.width / canvas.width);
    const screenY = rect.top + triangle.centerY * (rect.height / canvas.height);
    renderer?.emitFlip(screenX, screenY, Math.random());
    game.clickTriangle(triangle.row, triangle.col);
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;
  trianglePositions = [];

  // Clear
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  // Draw desert/sand background at bottom
  const sandGradient = ctx.createLinearGradient(0, height - 80, 0, height);
  sandGradient.addColorStop(0, "#c9a86c");
  sandGradient.addColorStop(1, "#a67c52");
  ctx.fillStyle = sandGradient;
  ctx.fillRect(0, height - 80, width, 80);

  // Calculate pyramid dimensions
  const rows = state.rows;
  const pyramidHeight = Math.min(height - 120, 300);
  const triangleHeight = pyramidHeight / rows;
  const baseWidth = triangleHeight * 1.15;
  const pyramidWidth = baseWidth * rows;

  const startX = (width - pyramidWidth) / 2;
  const startY = height - 100;

  // Draw pyramid triangles
  for (let row = 0; row < rows; row++) {
    const trianglesInRow = row * 2 + 1;
    const rowWidth = baseWidth * (row + 1);
    const rowStartX = startX + (pyramidWidth - rowWidth) / 2;
    const rowY = startY - triangleHeight * row;

    for (let col = 0; col < trianglesInRow; col++) {
      const triangle = state.triangles[row][col];
      const pointUp = col % 2 === 0;

      let points: [number, number][];
      const triX = rowStartX + (col * baseWidth) / 2;

      if (pointUp) {
        points = [
          [triX + baseWidth / 2, rowY - triangleHeight],
          [triX, rowY],
          [triX + baseWidth, rowY],
        ];
      } else {
        points = [
          [triX, rowY - triangleHeight],
          [triX + baseWidth, rowY - triangleHeight],
          [triX + baseWidth / 2, rowY],
        ];
      }

      trianglePositions.push({ row, col, points });

      const color = game.getColor(triangle.color);

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      ctx.lineTo(points[1][0], points[1][1]);
      ctx.lineTo(points[2][0], points[2][1]);
      ctx.closePath();

      const centerY = (points[0][1] + points[1][1] + points[2][1]) / 3;
      const gradient = ctx.createLinearGradient(0, centerY - triangleHeight / 2, 0, centerY + triangleHeight / 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color, -30));
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = "#2c2c4e";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      ctx.lineTo(points[1][0], points[1][1]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw decorative elements (stars)
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  for (let i = 0; i < 20; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * (height - 150);
    const size = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw moon
  ctx.beginPath();
  ctx.arc(width - 60, 50, 25, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f1de";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width - 50, 45, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#16213e";
  ctx.fill();
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
  targetColorBox.style.backgroundColor = game.getColor(state.targetColor);
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
    overlayMsg.textContent = `${i18n.t("game.level")} ${state.level} - ${state.moves} ${i18n.t("game.moves")}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      audio.playLevelStart();
      renderer?.emitLevelStart();
      game.nextLevel();
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  audio.playLevelStart();
  renderer?.emitLevelStart();
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  audio.playReset();
  renderer?.emitReset();
  game.reset();
});

// Initialize
initI18n();
initGame();
initWebGPU();
