/**
 * Spot Difference Main Entry
 * Game #019
 * Quantum Scanner Theme - WebGPU Enhanced
 */
import { SpotDifferenceGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type MarkerData } from "./webgpu";

// ============== Audio System ==============
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    opts?: { attack?: number; decay?: number; freqEnd?: number }
  ) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    if (opts?.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(
        opts.freqEnd,
        this.ctx.currentTime + duration
      );
    }

    const attack = opts?.attack ?? 0.01;
    const decay = opts?.decay ?? duration * 0.3;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Click sound - scanning pulse
  playClick() {
    this.playTone(800, 0.1, "sine", { freqEnd: 400 });
    setTimeout(() => this.playTone(600, 0.08, "sine", { freqEnd: 300 }), 50);
  }

  // Found anomaly - success chirp
  playFound() {
    this.playTone(523, 0.15, "sine"); // C5
    setTimeout(() => this.playTone(659, 0.15, "sine"), 100); // E5
    setTimeout(() => this.playTone(784, 0.2, "sine"), 200); // G5
    setTimeout(() => this.playTone(1047, 0.3, "triangle"), 300); // C6
  }

  // Miss click - error blip
  playMiss() {
    this.playTone(200, 0.15, "sawtooth", { freqEnd: 100 });
    setTimeout(() => this.playTone(150, 0.1, "square", { freqEnd: 80 }), 100);
  }

  // Level complete - quantum success
  playComplete() {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine");
        this.playTone(freq * 1.5, 0.3, "triangle");
      }, i * 100);
    });
  }

  // Level start - scanner boot
  playStart() {
    this.playTone(200, 0.3, "sine", { freqEnd: 800 });
    setTimeout(() => this.playTone(400, 0.2, "triangle", { freqEnd: 1200 }), 200);
    setTimeout(() => this.playTone(600, 0.15, "sine"), 400);
  }

  // Hint - alert tone
  playHint() {
    this.playTone(880, 0.1, "sine");
    setTimeout(() => this.playTone(1100, 0.1, "sine"), 100);
    setTimeout(() => this.playTone(880, 0.15, "sine"), 200);
  }

  // Reset sound
  playReset() {
    this.playTone(600, 0.1, "sine", { freqEnd: 200 });
    setTimeout(() => this.playTone(400, 0.15, "sine", { freqEnd: 100 }), 100);
  }
}

const audio = new AudioSystem();

// ============== Elements ==============
const canvasL = document.getElementById("canvas-left") as HTMLCanvasElement;
const canvasR = document.getElementById("canvas-right") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const foundDisplay = document.getElementById("found-display")!;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;

let game: SpotDifferenceGame;

// ============== WebGPU Renderer ==============
let gpuRendererL: WebGPURenderer | null = null;
let gpuRendererR: WebGPURenderer | null = null;
let gpuCanvasL: HTMLCanvasElement | null = null;
let gpuCanvasR: HTMLCanvasElement | null = null;
let animationId: number | null = null;
let lastTime = 0;

// Marker states for WebGPU visualization
let markerStates: Map<number, { state: number; foundTime: number }> = new Map();

async function initWebGPU() {
  // Create overlay canvases for WebGPU effects
  const wrapperL = canvasL.parentElement;
  const wrapperR = canvasR.parentElement;

  if (!wrapperL || !wrapperR) return;

  // Left canvas overlay
  gpuCanvasL = document.createElement("canvas");
  gpuCanvasL.className = "webgpu-overlay";
  gpuCanvasL.width = canvasL.width;
  gpuCanvasL.height = canvasL.height;
  wrapperL.appendChild(gpuCanvasL);

  // Right canvas overlay
  gpuCanvasR = document.createElement("canvas");
  gpuCanvasR.className = "webgpu-overlay";
  gpuCanvasR.width = canvasR.width;
  gpuCanvasR.height = canvasR.height;
  wrapperR.appendChild(gpuCanvasR);

  gpuRendererL = new WebGPURenderer(gpuCanvasL);
  gpuRendererR = new WebGPURenderer(gpuCanvasR);

  const [initL, initR] = await Promise.all([
    gpuRendererL.init(),
    gpuRendererR.init(),
  ]);

  if (!initL || !initR) {
    console.log("WebGPU not available, using fallback");
    gpuCanvasL.remove();
    gpuCanvasR.remove();
    gpuRendererL = null;
    gpuRendererR = null;
    return;
  }

  startRenderLoop();
}

function startRenderLoop() {
  if (animationId) cancelAnimationFrame(animationId);

  function render(time: number) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (gpuRendererL) gpuRendererL.render(deltaTime);
    if (gpuRendererR) gpuRendererR.render(deltaTime);

    animationId = requestAnimationFrame(render);
  }

  animationId = requestAnimationFrame(render);
}

function updateMarkersForWebGPU(differences: any[]) {
  if (!gpuRendererL || !gpuRendererR) return;

  const markers: MarkerData[] = differences.map((d, i) => {
    const markerState = markerStates.get(d.id) || { state: 0, foundTime: 0 };

    return {
      x: d.x,
      y: d.y,
      radius: d.r,
      state: d.found ? 1 : markerState.state, // 0=hidden, 1=found, 2=hint
      pulsePhase: i * 0.5,
      foundTime: markerState.foundTime,
    };
  });

  gpuRendererL.updateMarkers(markers);
  gpuRendererR.updateMarkers(markers);
}

function emitClickParticles(x: number, y: number) {
  // Normalized coordinates (0-1)
  const nx = x / canvasL.width;
  const ny = y / canvasL.height;

  if (gpuRendererL) gpuRendererL.emitClick(nx, ny);
  if (gpuRendererR) gpuRendererR.emitClick(nx, ny);
}

function emitFoundParticles(x: number, y: number) {
  const nx = x / canvasL.width;
  const ny = y / canvasL.height;

  if (gpuRendererL) gpuRendererL.emitFound(nx, ny);
  if (gpuRendererR) gpuRendererR.emitFound(nx, ny);
}

function emitMissParticles(x: number, y: number) {
  const nx = x / canvasL.width;
  const ny = y / canvasL.height;

  if (gpuRendererL) gpuRendererL.emitMiss(nx, ny);
  if (gpuRendererR) gpuRendererR.emitMiss(nx, ny);
}

function emitCompleteEffect() {
  if (gpuRendererL) {
    gpuRendererL.emitComplete();
    gpuRendererL.setVictory(1.0, 0.5, 0.5);
  }
  if (gpuRendererR) {
    gpuRendererR.emitComplete();
    gpuRendererR.setVictory(1.0, 0.5, 0.5);
  }
}

function clearWebGPUState() {
  markerStates.clear();
  if (gpuRendererL) {
    gpuRendererL.clearParticles();
    gpuRendererL.setVictory(0, 0.5, 0.5);
    gpuRendererL.setScanProgress(1);
    gpuRendererL.setAlertLevel(0);
  }
  if (gpuRendererR) {
    gpuRendererR.clearParticles();
    gpuRendererR.setVictory(0, 0.5, 0.5);
    gpuRendererR.setScanProgress(1);
    gpuRendererR.setAlertLevel(0);
  }
}

// ============== i18n ==============
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

// ============== Game ==============
function initGame() {
  game = new SpotDifferenceGame(canvasL, canvasR);

  game.setOnStateChange((state: any) => {
    foundDisplay.textContent = `${state.found}/${state.total}`;
    levelDisplay.textContent = state.level.toString();

    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    // Update alert level based on found count
    const alertLevel = state.found / state.total;
    if (gpuRendererL) gpuRendererL.setAlertLevel(alertLevel);
    if (gpuRendererR) gpuRendererR.setAlertLevel(alertLevel);

    if (state.status === "won") {
      showWin();
    }
  });
}

function showWin() {
  audio.playComplete();
  emitCompleteEffect();

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.next") || "Next Level";

    startBtn.onclick = () => {
      game.startLevel(game.level + 1);
      overlay.style.display = "none";
      clearWebGPUState();
      audio.playStart();
    };
  }, 1000);
}

function startGame() {
  overlay.style.display = "none";
  game.startLevel(1);
  clearWebGPUState();
  audio.playStart();
}

function handleInput(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return;
  } else {
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }

  // Scale
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (clientX! - rect.left) * scaleX;
  const y = (clientY! - rect.top) * scaleY;

  // Emit click particles at click location
  audio.playClick();
  emitClickParticles(x, y);

  const hit = game.checkClick(x, y);

  if (hit) {
    audio.playFound();
    emitFoundParticles(x, y);

    // Update marker state for found difference
    const differences = (game as any).differences;
    if (differences) {
      const foundDiff = differences.find(
        (d: any) => d.found && !markerStates.has(d.id)
      );
      if (foundDiff) {
        markerStates.set(foundDiff.id, { state: 1, foundTime: performance.now() });
      }
      updateMarkersForWebGPU(differences);
    }
  } else {
    audio.playMiss();
    emitMissParticles(x, y);
  }
}

// Attach events to both canvases
[canvasL, canvasR].forEach((c) => {
  c.addEventListener("mousedown", (e) => handleInput(e, c));
  c.addEventListener("touchstart", (e) => handleInput(e, c), {
    passive: false,
  });
});

// Also attach events to WebGPU overlays when they exist
function attachOverlayEvents() {
  [gpuCanvasL, gpuCanvasR].forEach((gpuCanvas, index) => {
    if (!gpuCanvas) return;
    const originalCanvas = index === 0 ? canvasL : canvasR;

    gpuCanvas.addEventListener("mousedown", (e) => handleInput(e, originalCanvas));
    gpuCanvas.addEventListener("touchstart", (e) => handleInput(e, originalCanvas), {
      passive: false,
    });
  });
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  clearWebGPUState();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.textContent = i18n.t("game.start");
  startBtn.onclick = startGame;
});

hintBtn.addEventListener("click", () => {
  audio.playHint();

  // Show hint marker before finding
  const differences = (game as any).differences;
  if (differences) {
    const unfound = differences.find((d: any) => !d.found);
    if (unfound) {
      markerStates.set(unfound.id, { state: 2, foundTime: performance.now() });
      updateMarkersForWebGPU(differences);

      // Flash effect at hint location
      const nx = unfound.x / canvasL.width;
      const ny = unfound.y / canvasL.height;
      if (gpuRendererL) gpuRendererL.emitClick(nx, ny);
      if (gpuRendererR) gpuRendererR.emitClick(nx, ny);
    }
  }

  game.hint();
});

// Init
initI18n();
initGame();
initWebGPU().then(() => {
  attachOverlayEvents();
});
