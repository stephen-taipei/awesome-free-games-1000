/**
 * Rubik's Cube Main Entry - WebGPU Enhanced
 * Neon Matrix Cube Theme
 * Game #015
 */
import { RubikGame, type Cubie } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type CubieData } from "./webgpu/renderer";
import { mat4Identity, mat4RotateX, mat4RotateY, mat4RotateZ, mat4Multiply, type Mat4 } from "./webgpu/math";

// =====================
// Audio System
// =====================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    attack = 0.01,
    decay = 0.1
  ): void {
    if (!this.ctx || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(volume * 0.7, this.ctx.currentTime + attack + decay);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Layer rotation - mechanical whir
  playRotate(): void {
    this.playTone(200, 0.15, 'sawtooth', 0.1);
    this.playTone(300, 0.12, 'square', 0.08);
    setTimeout(() => {
      this.playTone(400, 0.08, 'sine', 0.12);
    }, 100);
  }

  // Scramble start - digital chaos
  playScrambleStart(): void {
    const freqs = [300, 400, 500, 600, 700, 800];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.06, 'square', 0.08);
      }, i * 30);
    });
  }

  // Scramble step
  playScrambleStep(): void {
    const freq = 200 + Math.random() * 400;
    this.playTone(freq, 0.05, 'square', 0.05);
  }

  // Reset
  playReset(): void {
    const notes = [600, 500, 400, 300];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, 'sine', 0.1);
      }, i * 60);
    });
  }

  // Victory - triumphant fanfare
  playComplete(): void {
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine', 0.2);
        this.playTone(freq * 0.5, 0.4, 'triangle', 0.1);
      }, i * 150);
    });

    // Final shimmer
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          this.playTone(1500 + Math.random() * 1000, 0.15, 'sine', 0.06);
        }, i * 40);
      }
    }, 900);
  }

  // View rotation - subtle whoosh
  playViewRotate(): void {
    if (Math.random() > 0.1) return; // Only occasional
    this.playTone(100 + Math.random() * 100, 0.05, 'sine', 0.02);
  }
}

// =====================
// Elements
// =====================
const container = document.querySelector(".scene") as HTMLElement;
const cube = document.querySelector(".cube") as HTMLElement;
const gameArea = document.querySelector(".game-area") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const scrambleBtn = document.getElementById("scramble-btn")!;

// =====================
// Global Variables
// =====================
let game: RubikGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;

let isVictory = false;
let victoryAnimProgress = 0;

// View rotation state
let viewRotX = -0.4;
let viewRotY = 0.5;

// =====================
// Initialization
// =====================
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

async function initRenderer(): Promise<void> {
  // Create WebGPU canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'webgpu-canvas';
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';

  gameArea.insertBefore(canvas, gameArea.firstChild);

  renderer = new WebGPURenderer(canvas);
  useWebGPU = await renderer.init();

  if (useWebGPU) {
    console.log('WebGPU renderer initialized');
    // Hide CSS cube, use WebGPU
    container.style.opacity = '0';
    canvas.style.pointerEvents = 'auto';
  } else {
    console.log('Falling back to CSS 3D');
    renderer = null;
    canvas.remove();
  }
}

function initGame() {
  game = new RubikGame(cube, container);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    // Check for win
    if (state.won && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playComplete();
      if (renderer) {
        renderer.emitComplete();
      }
    }
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";
  game.start();
  isVictory = false;
  victoryAnimProgress = 0;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0);
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

// =====================
// Game Loop
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Update victory animation
  if (isVictory && victoryAnimProgress < 1) {
    victoryAnimProgress = Math.min(1, victoryAnimProgress + deltaTime * 0.0008);
    if (renderer) {
      renderer.setVictory(victoryAnimProgress);
    }
  }

  // WebGPU rendering
  if (renderer && useWebGPU) {
    const cubieData = getCubieDataForRenderer();
    renderer.setViewRotation(viewRotX, viewRotY);
    renderer.updateCubies(cubieData);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Get cubie data for WebGPU renderer
function getCubieDataForRenderer(): CubieData[] {
  const gameAny = game as any;
  const cubies = gameAny.cubies as Cubie[];
  if (!cubies) return [];

  return cubies.map(cubie => {
    // Build transform matrix from position
    const transform = mat4Identity();

    // Apply cubie's current transform (from DOMMatrix)
    // The game stores transforms as DOMMatrix on each .cubie element
    const cubieEl = cubie.el;
    const style = cubieEl.style.transform;

    // Parse the transform matrix
    // Or reconstruct from position
    const spacing = 1.0;
    transform[12] = cubie.x * spacing;
    transform[13] = cubie.y * spacing;
    transform[14] = cubie.z * spacing;

    // Get face colors
    const faceColors = getFaceColors(cubie);

    return {
      position: [cubie.x, cubie.y, cubie.z] as [number, number, number],
      transform,
      faceColors,
      isRotating: false,
      rotationProgress: 0,
    };
  });
}

// Get face colors for a cubie based on position
function getFaceColors(cubie: Cubie): string[] {
  const colors: string[] = ['black', 'black', 'black', 'black', 'black', 'black'];

  // Front (z=1) -> red
  if (cubie.z === 1) colors[0] = 'red';
  // Back (z=-1) -> orange
  if (cubie.z === -1) colors[1] = 'orange';
  // Right (x=1) -> blue
  if (cubie.x === 1) colors[2] = 'blue';
  // Left (x=-1) -> green
  if (cubie.x === -1) colors[3] = 'green';
  // Top (y=1) -> white
  if (cubie.y === 1) colors[4] = 'white';
  // Bottom (y=-1) -> yellow
  if (cubie.y === -1) colors[5] = 'yellow';

  return colors;
}

// =====================
// Input Handling
// =====================
let isDragging = false;
let startX = 0;
let startY = 0;
let draggingTarget: HTMLElement | null = null;

gameArea.addEventListener("mousedown", startTouch);
gameArea.addEventListener("touchstart", (e) => startTouch(e.touches[0], e), {
  passive: false,
});

function startTouch(e: MouseEvent | Touch, originalEvent?: Event) {
  if (originalEvent) originalEvent.preventDefault();
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;

  const target = e.target as HTMLElement;
  if (target.closest(".cubie") || target.id === 'webgpu-canvas') {
    draggingTarget = target.closest(".cubie") as HTMLElement || target;
  } else {
    draggingTarget = null;
  }
}

document.addEventListener("mousemove", moveTouch);
document.addEventListener("touchmove", (e) => moveTouch(e.touches[0], e), {
  passive: false,
});

function moveTouch(e: MouseEvent | Touch, originalEvent?: Event) {
  if (!isDragging) return;
  if (originalEvent) originalEvent.preventDefault();

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  // View rotation (both CSS and WebGPU)
  const sensitivity = 0.005;
  viewRotY += dx * sensitivity;
  viewRotX += dy * sensitivity;

  // Clamp X rotation
  viewRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, viewRotX));

  // Update CSS view
  game.rotateView(dx, dy);

  // Emit trail particles
  if (renderer && useWebGPU) {
    renderer.emitTrail(0, 0, 0);
    audio.playViewRotate();
  }

  startX = e.clientX;
  startY = e.clientY;
}

document.addEventListener("mouseup", () => (isDragging = false));
document.addEventListener("touchend", () => (isDragging = false));

// Key Controls
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const shift = e.shiftKey;
  const dir = shift ? -1 : 1;

  let axis: 'x' | 'y' | 'z' | null = null;
  let layer = 0;
  let faceColor: [number, number, number] = [1, 1, 1];

  switch (key) {
    case "u":
      game.rotateLayer("y", 1, -dir);
      axis = 'y'; layer = 1;
      faceColor = [1, 1, 1]; // white
      break;
    case "d":
      game.rotateLayer("y", -1, dir);
      axis = 'y'; layer = -1;
      faceColor = [1, 0.9, 0]; // yellow
      break;
    case "l":
      game.rotateLayer("x", -1, dir);
      axis = 'x'; layer = -1;
      faceColor = [0.2, 0.8, 0.2]; // green
      break;
    case "r":
      game.rotateLayer("x", 1, -dir);
      axis = 'x'; layer = 1;
      faceColor = [0.2, 0.4, 1]; // blue
      break;
    case "f":
      game.rotateLayer("z", 1, -dir);
      axis = 'z'; layer = 1;
      faceColor = [1, 0.2, 0.2]; // red
      break;
    case "b":
      game.rotateLayer("z", -1, dir);
      axis = 'z'; layer = -1;
      faceColor = [1, 0.5, 0]; // orange
      break;
    case "m":
      game.rotateLayer("x", 0, dir);
      axis = 'x'; layer = 0;
      break;
    case "e":
      game.rotateLayer("y", 0, dir);
      axis = 'y'; layer = 0;
      break;
    case "s":
      game.rotateLayer("z", 0, dir);
      axis = 'z'; layer = 0;
      break;
  }

  if (axis !== null) {
    audio.playRotate();
    if (renderer) {
      renderer.emitRotation(axis, layer + 1, faceColor);
    }
  }
});

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  isVictory = false;
  victoryAnimProgress = 0;
  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0);
  }
});

scrambleBtn.addEventListener("click", () => {
  audio.playScrambleStart();
  if (renderer) {
    renderer.emitScramble();
  }

  // Play scramble steps with delay
  const scrambleSteps = 20;
  for (let i = 0; i < scrambleSteps; i++) {
    setTimeout(() => {
      audio.playScrambleStep();
    }, i * 100);
  }

  game.scramble();
});

// =====================
// Sound Toggle
// =====================
function createSoundToggle(): void {
  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.innerHTML = '🔊';
  btn.title = 'Toggle Sound';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = !audio.isEnabled();
    audio.setEnabled(enabled);
    btn.innerHTML = enabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !enabled);
  });

  gameArea.appendChild(btn);
}

// =====================
// Main
// =====================
async function main() {
  initI18n();

  // Update overlay message
  overlayMsg.innerHTML += "<br><small>(Use keys U,D,L,R,F,B + Shift for inverse)</small>";

  // Init audio system
  audio = new AudioSystem();

  // Init audio on user interaction
  const initAudioOnInteraction = async () => {
    await audio.init();
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  };
  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('touchstart', initAudioOnInteraction);

  // Init renderer
  await initRenderer();

  // Init game
  initGame();

  // Create sound toggle
  createSoundToggle();
}

main();
