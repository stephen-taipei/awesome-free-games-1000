/**
 * Totem Puzzle Main Entry
 * Ancient Tribal / Spirit Theme with WebGPU
 * Game #104
 */
import { TotemGame, GameState, TotemBlock, TotemColor } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Tribal/Ancient themed
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
      tremolo?: number;
    } = {}
  ): void {
    this.init();
    if (!this.ctx) return;

    const {
      volume = 0.15,
      attack = 0.01,
      decay = 0.3,
      filterFreq = 2000,
      tremolo = 0,
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

    // Tremolo effect for mystical feel
    if (tremolo > 0) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = tremolo;
      lfoGain.gain.value = volume * 0.3;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start(now);
      lfo.stop(now + duration);
    }

    osc.start(now);
    osc.stop(now + duration);
  }

  // Pole selection - deep wooden drum
  playSelect(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep drum hit
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // High knock
    this.playTone(800, 0.05, "square", { volume: 0.1, filterFreq: 1500 });
  }

  // Block move - wooden clunk + whoosh
  playMove(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Whoosh
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 600;
    noiseFilter.Q.value = 2;

    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // Landing thud
    setTimeout(() => {
      this.playTone(100, 0.2, "triangle", { volume: 0.3, attack: 0.005, filterFreq: 400 });
      this.playTone(300, 0.1, "square", { volume: 0.1, filterFreq: 800 });
    }, 100);
  }

  // Undo - mystical reverse swirl
  playUndo(): void {
    this.playTone(300, 0.15, "sine", { volume: 0.12, tremolo: 8 });
    setTimeout(() => this.playTone(250, 0.15, "sine", { volume: 0.1, tremolo: 8 }), 50);
    setTimeout(() => this.playTone(200, 0.2, "sine", { volume: 0.08, tremolo: 8 }), 100);
  }

  // Reset - tribal reset drum
  playReset(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Descending drums
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = 150 - i * 25;

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  }

  // Victory - ancient celebration fanfare
  playWin(): void {
    this.init();
    if (!this.ctx) return;

    const notes = [196, 247, 294, 392, 494, 392]; // G3, B3, D4, G4, B4, G4
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const t = now + i * 0.15;

      // Main melody (pan flute style)
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.value = freq;

      filter.type = "lowpass";
      filter.frequency.value = 3000;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.setValueAtTime(0.25, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.25);

      // Harmonic
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0.08, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc2.connect(gain2);
      gain2.connect(this.ctx!.destination);
      osc2.start(t);
      osc2.stop(t + 0.2);
    });

    // Celebration drums
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = i % 2 === 0 ? 80 : 120;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // Level start - awakening ceremony
  playLevelStart(): void {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep ceremonial horn
    const horn = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();
    const hornFilter = this.ctx.createBiquadFilter();

    horn.type = "sawtooth";
    horn.frequency.setValueAtTime(98, now);
    horn.frequency.linearRampToValueAtTime(110, now + 0.5);

    hornFilter.type = "lowpass";
    hornFilter.frequency.value = 600;

    hornGain.gain.setValueAtTime(0, now);
    hornGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
    hornGain.gain.setValueAtTime(0.15, now + 0.4);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    horn.connect(hornFilter);
    hornFilter.connect(hornGain);
    hornGain.connect(this.ctx.destination);
    horn.start(now);
    horn.stop(now + 0.8);

    // Chime sequence
    [392, 494, 587].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine", { volume: 0.1, tremolo: 5 });
      }, 200 + i * 150);
    });
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const targetCanvas = document.getElementById("target-canvas") as HTMLCanvasElement;
const targetCtx = targetCanvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: TotemGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let lastSelectedPole = -1;

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

  game = new TotemGame();

  game.onStateChange = (state: GameState) => {
    // Check for selection change
    if (state.selectedPole !== lastSelectedPole) {
      if (state.selectedPole >= 0) {
        const poleSpacing = canvas.width / (state.poles.length + 1);
        const poleX = poleSpacing * (state.selectedPole + 1);
        audio.playSelect();
        renderer?.emitSelect(poleX, canvas.height - 40, 250);
      }
      lastSelectedPole = state.selectedPole;
    }

    render(state);
    renderTarget(state);
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
    renderTarget(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;

  const targetContainer = targetCanvas.parentElement!;
  const targetRect = targetContainer.getBoundingClientRect();
  targetCanvas.width = targetRect.width - 24;
  targetCanvas.height = 120;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getPoleAtPosition(x: number, state: GameState): number {
  const poleCount = state.poles.length;
  const poleSpacing = canvas.width / (poleCount + 1);

  for (let i = 0; i < poleCount; i++) {
    const poleX = poleSpacing * (i + 1);
    if (Math.abs(x - poleX) < poleSpacing * 0.4) {
      return i;
    }
  }
  return -1;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x } = getCanvasCoords(e);
  const state = game.getState();
  const poleIndex = getPoleAtPosition(x, state);

  if (poleIndex >= 0) {
    const fromPole = state.selectedPole;

    game.selectPole(poleIndex);

    // Check if move happened
    if (fromPole >= 0 && fromPole !== poleIndex) {
      const poleSpacing = canvas.width / (state.poles.length + 1);
      const fromX = poleSpacing * (fromPole + 1);
      const toX = poleSpacing * (poleIndex + 1);
      audio.playMove();
      renderer?.emitMove(fromX, canvas.height - 150, toX, canvas.height - 150);
    }
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x } = getCanvasCoords(touch);
  const state = game.getState();
  const poleIndex = getPoleAtPosition(x, state);

  if (poleIndex >= 0) {
    const fromPole = state.selectedPole;

    game.selectPole(poleIndex);

    if (fromPole >= 0 && fromPole !== poleIndex) {
      const poleSpacing = canvas.width / (state.poles.length + 1);
      const fromX = poleSpacing * (fromPole + 1);
      const toX = poleSpacing * (poleIndex + 1);
      audio.playMove();
      renderer?.emitMove(fromX, canvas.height - 150, toX, canvas.height - 150);
    }
  }
}

function drawTotemBlock(
  context: CanvasRenderingContext2D,
  block: TotemBlock,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number = 1
): void {
  const color = game.getTotemColor(block.color);
  const cornerRadius = 6 * scale;

  // Main block
  context.beginPath();
  context.roundRect(x - width / 2, y - height, width, height, cornerRadius);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "rgba(0, 0, 0, 0.3)";
  context.lineWidth = 2 * scale;
  context.stroke();

  // Highlight
  context.beginPath();
  context.roundRect(x - width / 2 + 4 * scale, y - height + 4 * scale, width - 8 * scale, height * 0.3, cornerRadius / 2);
  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  context.fill();

  // Pattern
  drawPattern(context, block.pattern, x, y - height / 2, width * 0.6, height * 0.4, scale);
}

function drawPattern(
  context: CanvasRenderingContext2D,
  pattern: number,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): void {
  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.strokeStyle = "rgba(255, 255, 255, 0.5)";
  context.lineWidth = 2 * scale;

  const size = Math.min(width, height) * 0.4;

  switch (pattern) {
    case 0: // Circle
      context.beginPath();
      context.arc(x, y, size / 2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      break;
    case 1: // Triangle
      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y + size / 2);
      context.lineTo(x - size / 2, y + size / 2);
      context.closePath();
      context.fill();
      context.stroke();
      break;
    case 2: // Square
      context.beginPath();
      context.rect(x - size / 2, y - size / 2, size, size);
      context.fill();
      context.stroke();
      break;
    case 3: // Diamond
      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y);
      context.lineTo(x, y + size / 2);
      context.lineTo(x - size / 2, y);
      context.closePath();
      context.fill();
      context.stroke();
      break;
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;

  // Clear
  ctx.fillStyle = "#3d2415";
  ctx.fillRect(0, 0, width, height);

  // Draw ground
  const groundY = height - 40;
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, groundY, width, 40);

  // Ground highlight
  ctx.fillStyle = "#7a5533";
  ctx.fillRect(0, groundY, width, 5);

  const poleCount = state.poles.length;
  const poleSpacing = width / (poleCount + 1);
  const poleWidth = 20;
  const poleHeight = 250;
  const blockWidth = 70;
  const blockHeight = 45;

  // Draw poles
  for (let i = 0; i < poleCount; i++) {
    const poleX = poleSpacing * (i + 1);
    const poleBaseY = groundY;

    // Pole shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(poleX, poleBaseY + 5, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pole base
    ctx.fillStyle = "#5d2e0c";
    ctx.beginPath();
    ctx.ellipse(poleX, poleBaseY, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pole
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(poleX - poleWidth / 2, poleBaseY - poleHeight, poleWidth, poleHeight);

    // Pole highlight
    ctx.fillStyle = "#a0522d";
    ctx.fillRect(poleX - poleWidth / 2, poleBaseY - poleHeight, poleWidth * 0.3, poleHeight);

    // Pole top
    ctx.fillStyle = "#6b3811";
    ctx.beginPath();
    ctx.arc(poleX, poleBaseY - poleHeight, poleWidth / 2 + 3, 0, Math.PI * 2);
    ctx.fill();

    // Selected pole glow
    if (state.selectedPole === i) {
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(poleX - blockWidth / 2 - 10, poleBaseY - poleHeight - 20, blockWidth + 20, poleHeight + 30, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw blocks on this pole
    const pole = state.poles[i];
    for (let j = 0; j < pole.length; j++) {
      const block = pole[j];
      const blockY = poleBaseY - (j + 1) * blockHeight;
      drawTotemBlock(ctx, block, poleX, blockY + blockHeight, blockWidth, blockHeight);
    }
  }
}

function renderTarget(state: GameState): void {
  const { width, height } = targetCanvas;

  // Clear
  targetCtx.fillStyle = "#2c1810";
  targetCtx.fillRect(0, 0, width, height);

  const poleCount = state.target.length;
  const poleSpacing = width / (poleCount + 1);
  const scale = 0.5;
  const poleWidth = 12;
  const blockWidth = 50;
  const blockHeight = 30;
  const groundY = height - 15;

  for (let i = 0; i < poleCount; i++) {
    const poleX = poleSpacing * (i + 1);

    // Mini pole
    targetCtx.fillStyle = "#8b4513";
    targetCtx.fillRect(poleX - poleWidth / 2, 10, poleWidth, groundY - 10);

    // Ground
    targetCtx.fillStyle = "#654321";
    targetCtx.fillRect(poleX - 35, groundY, 70, 15);

    // Draw target blocks
    const pole = state.target[i];
    for (let j = 0; j < pole.length; j++) {
      const block = pole[j];
      const blockY = groundY - (j + 1) * blockHeight;
      drawTotemBlock(targetCtx, block, poleX, blockY + blockHeight, blockWidth, blockHeight, scale);
    }
  }
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
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
  lastSelectedPole = -1;
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  audio.playReset();
  renderer?.emitReset();
  lastSelectedPole = -1;
  game.reset();
});
undoBtn.addEventListener("click", () => {
  const state = game.getState();
  const poleSpacing = canvas.width / (state.poles.length + 1);
  const centerX = poleSpacing * 2;
  audio.playUndo();
  renderer?.emitUndo(centerX, canvas.height / 2);
  lastSelectedPole = -1;
  game.undo();
});

// Initialize
initI18n();
initGame();
initWebGPU();
