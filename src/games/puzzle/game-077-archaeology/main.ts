/**
 * Archaeology Main Entry
 * Game #077 - WebGPU Enhanced
 */
import { ArchaeologyGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  playBrush(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 800;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playPick(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(80, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc2.connect(gain);
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.15);
  }

  playReveal(): void {
    const ctx = this.getCtx();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  playDamage(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  playDiscovery(): void {
    const ctx = this.getCtx();
    const notes = [392, 493.88, 587.33, 783.99]; // G4, B4, D5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  playVictory(): void {
    const ctx = this.getCtx();
    const melody = [
      { freq: 523.25, time: 0 },
      { freq: 587.33, time: 0.15 },
      { freq: 659.25, time: 0.3 },
      { freq: 783.99, time: 0.45 },
      { freq: 1046.5, time: 0.7 },
    ];

    melody.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + time;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  playReset(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const artifactsDisplay = document.getElementById("artifacts-display")!;
const brushDisplay = document.getElementById("brush-display")!;

const toolBrush = document.getElementById("tool-brush")!;
const toolPick = document.getElementById("tool-pick")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ArchaeologyGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();
  if (!success) {
    webgpuCanvas.style.display = "none";
  }
}

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

function initGame() {
  game = new ArchaeologyGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", () => handleInput("up", null));

  // Touch inputs
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), { passive: false });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), { passive: false });
  window.addEventListener("touchend", () => handleInput("up", null), { passive: false });

  // Tool selection
  toolBrush.addEventListener("click", () => {
    game.setTool("brush");
    toolBrush.classList.add("active");
    toolPick.classList.remove("active");
    canvas.style.cursor = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><text y=\"24\" font-size=\"24\">🖌️</text></svg>') 0 32, auto";
  });

  toolPick.addEventListener("click", () => {
    game.setTool("pick");
    toolPick.classList.add("active");
    toolBrush.classList.remove("active");
    canvas.style.cursor = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><text y=\"24\" font-size=\"24\">⛏️</text></svg>') 0 32, auto";
  });

  game.setOnStateChange((state) => {
    artifactsDisplay.textContent = `${state.artifactsFound}/${state.totalArtifacts}`;
    brushDisplay.textContent = `${state.brushHealth}%`;

    // Handle WebGPU events
    if (state.event) {
      switch (state.event) {
        case "brushDig":
          audio.playBrush();
          renderer?.emitBrushDig(state.x ?? 0, state.y ?? 0);
          break;
        case "pickDig":
          audio.playPick();
          renderer?.emitPickDig(state.x ?? 0, state.y ?? 0);
          break;
        case "artifactReveal":
          audio.playReveal();
          renderer?.emitArtifactReveal(state.x ?? 0, state.y ?? 0, state.artifactType);
          break;
        case "artifactDamage":
          audio.playDamage();
          renderer?.emitArtifactDamage(state.x ?? 0, state.y ?? 0);
          break;
        case "discovery":
          audio.playDiscovery();
          renderer?.emitDiscovery(state.x ?? 0, state.y ?? 0, state.artifactType);
          break;
        case "victory":
          audio.playVictory();
          renderer?.emitVictory();
          break;
        case "levelStart":
          renderer?.emitLevelStart();
          break;
        case "reset":
          audio.playReset();
          renderer?.emitReset();
          break;
      }
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent | null) {
  if (!e && type === "up") {
    game.handleInput("up", 0, 0);
    return;
  }
  if (!e) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move", e: TouchEvent) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "All artifacts discovered safely!";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initWebGPU();
initGame();
