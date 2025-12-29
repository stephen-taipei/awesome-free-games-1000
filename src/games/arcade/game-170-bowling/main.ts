/**
 * Bowling Main Entry
 * Game #170 - Arcade / Bowling Alley Theme
 */
import { BowlingGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const gameCanvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const frameDisplay = document.getElementById("frame-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BowlingGame;
let webgpuRenderer: WebGPURenderer | null = null;
let audioSystem: AudioSystem | null = null;
let lastTime = 0;

// ============ Audio System ============
class AudioSystem {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private initialized = false;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  async init() {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.initialized = true;
  }

  // Ball rolling sound
  playBallRoll() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 200;
    filter.Q.value = 1;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Pin hit sound
  playPinHit() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Wood clatter
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();

    noise.type = "square";
    noise.frequency.setValueAtTime(150, this.ctx.currentTime);
    noise.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);

    noiseGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.1);
  }

  // Pin fall sound
  playPinFall() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Strike celebration
  playStrike() {
    if (!this.initialized) return;

    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // Spare sound
  playSpare() {
    if (!this.initialized) return;

    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  // Game start
  playStart() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(330, this.ctx.currentTime);
    osc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(550, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Game over
  playGameOver(victory: boolean) {
    if (!this.initialized) return;

    const notes = victory
      ? [523, 659, 784, 1047]
      : [330, 294, 262, 220];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = victory ? "triangle" : "sine";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * (victory ? 0.12 : 0.2);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }
}

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });
  const browserLang = navigator.language;
  if (browserLang.includes("zh")) {
    i18n.setLocale(browserLang.includes("CN") ? "zh-CN" : "zh-TW");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }
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

async function initGame() {
  game = new BowlingGame(gameCanvas);
  audioSystem = new AudioSystem();

  // Initialize WebGPU
  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const webgpuSupported = await webgpuRenderer.initialize();

  if (!webgpuSupported) {
    webgpuCanvas.style.display = "none";
  }

  resizeCanvases();

  // Mouse events
  gameCanvas.addEventListener("mousedown", (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseDown(e.clientX - rect.left, e.clientY - rect.top);
  });

  gameCanvas.addEventListener("mousemove", (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  gameCanvas.addEventListener("mouseup", () => {
    game.handleMouseUp();
  });

  gameCanvas.addEventListener("mouseleave", () => {
    game.handleMouseUp();
  });

  // Touch events
  gameCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseDown(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  gameCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseMove(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  gameCanvas.addEventListener("touchend", () => {
    game.handleMouseUp();
  });

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) scoreDisplay.textContent = String(state.score);
    if (state.frame !== undefined) frameDisplay.textContent = `${state.frame}/5`;
    if (state.status === "over") showGameOver(state.score);
  });

  window.addEventListener("resize", resizeCanvases);

  // Start render loop
  lastTime = performance.now();
  requestAnimationFrame(renderLoop);
}

function resizeCanvases() {
  const container = document.querySelector(".canvas-container") as HTMLElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  webgpuCanvas.width = width * window.devicePixelRatio;
  webgpuCanvas.height = height * window.devicePixelRatio;
  webgpuCanvas.style.width = `${width}px`;
  webgpuCanvas.style.height = `${height}px`;

  if (webgpuRenderer) {
    webgpuRenderer.resize(webgpuCanvas.width, webgpuCanvas.height);
  }

  game.resize();
}

function renderLoop(currentTime: number) {
  const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  // Process pending events
  processEvents();

  // Render WebGPU
  if (webgpuRenderer) {
    webgpuRenderer.render(delta);
  }

  requestAnimationFrame(renderLoop);
}

function processEvents() {
  const events = game.pendingEvents;

  // Start event
  if (events.start) {
    audioSystem?.playStart();
    webgpuRenderer?.clear();
  }

  // Ball roll events
  for (const roll of events.ballRoll) {
    audioSystem?.playBallRoll();
    webgpuRenderer?.emitBallRoll(roll.x, roll.y);
  }

  // Pin hit events
  for (const hit of events.pinHit) {
    audioSystem?.playPinHit();
    webgpuRenderer?.emitPinHit(hit.x, hit.y);
  }

  // Pin fall events
  for (const fall of events.pinFall) {
    audioSystem?.playPinFall();
    webgpuRenderer?.emitPinFall(fall.x, fall.y);
  }

  // Strike events
  for (const strike of events.strike) {
    audioSystem?.playStrike();
    webgpuRenderer?.emitStrike(strike.x, strike.y);
  }

  // Spare events
  for (const spare of events.spare) {
    audioSystem?.playSpare();
    webgpuRenderer?.emitSpare(spare.x, spare.y);
  }

  // Game over
  for (const over of events.gameOver) {
    audioSystem?.playGameOver(over.victory);
    webgpuRenderer?.emitGameOver(over.x, over.y, over.victory);
  }

  game.clearPendingEvents();
}

function showGameOver(finalScore: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.finalScore")}: ${finalScore}`;
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => { overlay.style.display = "none"; game.reset(); };
  }, 500);
}

async function startGame() {
  await audioSystem?.init();
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audioSystem?.init();
  game.reset();
});

initI18n();
initGame();
