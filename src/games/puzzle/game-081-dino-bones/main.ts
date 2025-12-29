/**
 * Dino Bones Main Entry
 * Game #081 - WebGPU Enhanced
 */
import { DinoBoneGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const dinoDisplay = document.getElementById("dino-display")!;
const piecesDisplay = document.getElementById("pieces-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: DinoBoneGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Prehistoric Excavation Theme
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playPickup() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Digging scrape sound
    const osc = ctx.createOscillator();
    const noise = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    noise.type = "triangle";
    noise.frequency.setValueAtTime(60, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.15);
    noise.stop(now + 0.15);
  }

  playDrag() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft dust shuffle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 400;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(80 + Math.random() * 40, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playPlace() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Satisfying bone click into place
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.1);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(660, now);
    osc2.frequency.exponentialRampToValueAtTime(330, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.2);

    // Echo click
    setTimeout(() => {
      const echo = ctx.createOscillator();
      const echoGain = ctx.createGain();
      echo.type = "sine";
      echo.frequency.value = 550;
      echoGain.gain.setValueAtTime(0.1, ctx.currentTime);
      echoGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      echo.connect(echoGain);
      echoGain.connect(ctx.destination);
      echo.start();
      echo.stop(ctx.currentTime + 0.1);
    }, 80);
  }

  playDrop() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Bone thud on dirt
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 200;

    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playVictory() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Archaeological discovery fanfare
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });

    // Triumphant chord
    setTimeout(() => {
      [523, 659, 784, 1047].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      });
    }, 700);
  }

  playGameStart() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Excavation beginning - brush sweeps
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.value = 300 + i * 100;
      filter.Q.value = 2;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100 + i * 30, now + i * 0.1);

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }

    // Discovery tone
    setTimeout(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }, 350);
  }

  playReset() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Dust settling down
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}

const audio = new AudioSystem();

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
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.warn("WebGPU not available, continuing without effects");
    renderer = null;
    webgpuCanvas.style.display = "none";
  }
}

function initGame() {
  game = new DinoBoneGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch inputs
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), { passive: false });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), { passive: false });
  window.addEventListener("touchend", (e) => handleTouch("up", e), { passive: false });

  game.setOnStateChange((state) => {
    dinoDisplay.textContent = state.dinoName;
    piecesDisplay.textContent = `${state.placedCount}/${state.totalBones}`;

    // Handle events
    if (state.event) {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const ex = state.eventX ?? cx;
      const ey = state.eventY ?? cy;

      switch (state.event) {
        case "pickup":
          audio.playPickup();
          renderer?.emitPickup(ex, ey);
          break;
        case "drag":
          renderer?.emitDrag(ex, ey);
          break;
        case "place":
          audio.playPlace();
          renderer?.emitPlace(ex, ey);
          break;
        case "drop":
          audio.playDrop();
          renderer?.emitDrop(ex, ey);
          break;
        case "victory":
          audio.playVictory();
          renderer?.emitVictory(cx, cy);
          break;
        case "gameStart":
          audio.playGameStart();
          renderer?.emitGameStart(cx, cy);
          break;
        case "reset":
          audio.playReset();
          renderer?.emitReset();
          break;
      }
    }

    if (state.status === "won") {
      showWin(state.currentDino, state.maxDinos);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas.parentElement) {
      const rect = webgpuCanvas.parentElement.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    }
  });
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showWin(currentDino: number, maxDinos: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (currentDino < maxDinos) {
      overlayMsg.textContent = `Dinosaur ${currentDino} assembled!`;
      startBtn.textContent = i18n.t("game.nextDino");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextDinosaur();
      };
    } else {
      overlayMsg.textContent = "All dinosaurs assembled!";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
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
initWebGPU().then(() => {
  initGame();
});
