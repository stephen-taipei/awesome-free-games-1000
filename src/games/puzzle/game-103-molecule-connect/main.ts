/**
 * Molecule Connect Main Entry
 * Science Lab / Chemistry Theme
 * Game #103
 */
import { MoleculeGame, GameState, Atom, AtomType } from "./game";
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
    filter.type = "lowpass";
    filter.frequency.value = 2000;

    gain.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    source.start();
    source.stop(this.audioContext.currentTime + duration);
  }

  playBondCreate(): void {
    this.initContext();
    // Chemical bonding sound - ascending tone
    this.createOscillator("sine", 440, 0.15, 0.2);
    this.createOscillator("sine", 660, 0.12, 0.15, 0.05);
    this.createOscillator("triangle", 880, 0.1, 0.1, 0.08);
    // Electron zap
    this.createNoise(0.05, 0.08);
  }

  playBondBreak(): void {
    this.initContext();
    // Bond dissociation - descending tone
    this.createOscillator("sawtooth", 600, 0.1, 0.15);
    this.createOscillator("triangle", 400, 0.12, 0.12, 0.03);
    this.createNoise(0.08, 0.1);
  }

  playCorrectBond(): void {
    this.initContext();
    // Success chime
    this.createOscillator("sine", 523, 0.2, 0.2);
    this.createOscillator("sine", 784, 0.18, 0.15, 0.05);
    this.createOscillator("triangle", 1047, 0.15, 0.1, 0.08);
  }

  playClear(): void {
    this.initContext();
    // Clear all bonds - dissolving sound
    for (let i = 0; i < 6; i++) {
      const freq = 800 - i * 80;
      this.createOscillator("triangle", freq, 0.08, 0.1, i * 0.03);
    }
    this.createNoise(0.2, 0.08);
  }

  playWin(): void {
    this.initContext();
    // Chemistry success - molecular completion melody
    const notes = [523, 659, 784, 880, 1047, 1175, 1319];
    notes.forEach((freq, i) => {
      this.createOscillator("sine", freq, 0.3, 0.18, i * 0.1);
      this.createOscillator("triangle", freq * 1.5, 0.25, 0.08, i * 0.1 + 0.02);
    });

    // Bubbling effect
    for (let i = 0; i < 10; i++) {
      const freq = 300 + Math.random() * 400;
      this.createOscillator("sine", freq, 0.1, 0.06, i * 0.06);
    }
  }

  playLevelStart(): void {
    this.initContext();
    // Lab startup - ascending tones
    const notes = [392, 494, 587, 698];
    notes.forEach((freq, i) => {
      this.createOscillator("sine", freq, 0.15, 0.15, i * 0.1);
    });
    this.createNoise(0.08, 0.05);
  }

  playReset(): void {
    this.initContext();
    // Reset - descending tones
    const notes = [698, 587, 494, 392];
    notes.forEach((freq, i) => {
      this.createOscillator("triangle", freq, 0.1, 0.12, i * 0.08);
    });
  }

  playAtomHover(): void {
    this.initContext();
    // Subtle electron buzz
    this.createOscillator("sine", 1000, 0.05, 0.08);
  }
}

// ============ Main Application ============
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const bondsDisplay = document.getElementById("bonds-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: MoleculeGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let dragging = false;
let dragStart: Atom | null = null;
let dragEnd: { x: number; y: number } | null = null;

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

  game = new MoleculeGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "won") {
      audio.playWin();
      renderer?.emitVictory();
      setTimeout(() => showWinOverlay(), 500);
    }
  };

  // Mouse events
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);

  // Touch events
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd);

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

function getScreenCoords(canvasX: number, canvasY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (canvasX / canvas.width) * rect.width,
    y: rect.top + (canvasY / canvas.height) * rect.height,
  };
}

function findAtomAt(x: number, y: number): Atom | null {
  const state = game.getState();
  for (const atom of state.atoms) {
    const props = game.getAtomProperties(atom.type);
    const dist = Math.sqrt((x - atom.x) ** 2 + (y - atom.y) ** 2);
    if (dist <= props.radius + 5) {
      return atom;
    }
  }
  return null;
}

function handleMouseDown(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const atom = findAtomAt(x, y);

  if (atom) {
    dragging = true;
    dragStart = atom;
    dragEnd = { x, y };
    audio.playAtomHover();
    const screen = getScreenCoords(atom.x, atom.y);
    renderer?.emitElectrons(screen.x, screen.y);
  }
}

function handleMouseMove(e: MouseEvent): void {
  if (!dragging || !dragStart) return;

  const { x, y } = getCanvasCoords(e);
  dragEnd = { x, y };
  render(game.getState());
}

function handleMouseUp(e: MouseEvent): void {
  if (!dragging || !dragStart) {
    dragging = false;
    dragStart = null;
    dragEnd = null;
    return;
  }

  const { x, y } = getCanvasCoords(e);
  const endAtom = findAtomAt(x, y);

  if (endAtom && endAtom.id !== dragStart.id) {
    const success = game.addBond(dragStart.id, endAtom.id);
    if (success) {
      audio.playBondCreate();
      const screen1 = getScreenCoords(dragStart.x, dragStart.y);
      const screen2 = getScreenCoords(endAtom.x, endAtom.y);
      renderer?.emitBondCreate(screen1.x, screen1.y, screen2.x, screen2.y);

      // Check if this is a correct bond
      const state = game.getState();
      const bondKey = `${Math.min(dragStart.id, endAtom.id)}-${Math.max(dragStart.id, endAtom.id)}`;
      const isCorrect = state.targetBonds.some(
        b => `${b.atom1}-${b.atom2}` === bondKey
      );
      if (isCorrect) {
        const midX = (screen1.x + screen2.x) / 2;
        const midY = (screen1.y + screen2.y) / 2;
        audio.playCorrectBond();
        renderer?.emitCorrectBond(midX, midY);
      }
    }
  }

  dragging = false;
  dragStart = null;
  dragEnd = null;
  render(game.getState());
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch);
  const atom = findAtomAt(x, y);

  if (atom) {
    dragging = true;
    dragStart = atom;
    dragEnd = { x, y };
    audio.playAtomHover();
    const screen = getScreenCoords(atom.x, atom.y);
    renderer?.emitElectrons(screen.x, screen.y);
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!dragging || !dragStart) return;

  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch);
  dragEnd = { x, y };
  render(game.getState());
}

function handleTouchEnd(e: TouchEvent): void {
  if (!dragging || !dragStart || !dragEnd) {
    dragging = false;
    dragStart = null;
    dragEnd = null;
    return;
  }

  const endAtom = findAtomAt(dragEnd.x, dragEnd.y);

  if (endAtom && endAtom.id !== dragStart.id) {
    const success = game.addBond(dragStart.id, endAtom.id);
    if (success) {
      audio.playBondCreate();
      const screen1 = getScreenCoords(dragStart.x, dragStart.y);
      const screen2 = getScreenCoords(endAtom.x, endAtom.y);
      renderer?.emitBondCreate(screen1.x, screen1.y, screen2.x, screen2.y);
    }
  }

  dragging = false;
  dragStart = null;
  dragEnd = null;
  render(game.getState());
}

function render(state: GameState): void {
  const { width, height } = canvas;

  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  // Draw grid pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw target bonds (ghost)
  ctx.strokeStyle = "rgba(0, 255, 136, 0.2)";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  state.targetBonds.forEach((bond) => {
    const atom1 = state.atoms.find((a) => a.id === bond.atom1)!;
    const atom2 = state.atoms.find((a) => a.id === bond.atom2)!;
    ctx.beginPath();
    ctx.moveTo(atom1.x, atom1.y);
    ctx.lineTo(atom2.x, atom2.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Draw existing bonds
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 10;
  state.bonds.forEach((bond) => {
    const atom1 = state.atoms.find((a) => a.id === bond.atom1)!;
    const atom2 = state.atoms.find((a) => a.id === bond.atom2)!;
    ctx.beginPath();
    ctx.moveTo(atom1.x, atom1.y);
    ctx.lineTo(atom2.x, atom2.y);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // Draw drag line
  if (dragging && dragStart && dragEnd) {
    ctx.strokeStyle = "rgba(0, 255, 136, 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(dragEnd.x, dragEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw atoms
  state.atoms.forEach((atom) => {
    const props = game.getAtomProperties(atom.type);

    // Glow
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, props.radius + 5, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      atom.x,
      atom.y,
      props.radius,
      atom.x,
      atom.y,
      props.radius + 15
    );
    gradient.addColorStop(0, props.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, props.radius, 0, Math.PI * 2);
    ctx.fillStyle = props.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = atom.type === "H" ? "#333" : "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(atom.type, atom.x, atom.y);
  });
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  bondsDisplay.textContent = `${game.getCurrentBonds()}/${game.getRequiredBonds()}`;
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

clearBtn.addEventListener("click", () => {
  game.clearBonds();
  audio.playClear();
  const rect = canvas.getBoundingClientRect();
  renderer?.emitClearAll(rect.left + rect.width / 2, rect.top + rect.height / 2);
});

// Initialize
initI18n();
initGame();
initWebGPU();
