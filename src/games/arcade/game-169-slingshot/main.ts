/**
 * Slingshot Main Entry
 * Game #169 - Arcade / Slingshot / Outdoor Nature Theme
 */
import { SlingshotGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const gameCanvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const shotsDisplay = document.getElementById("shots-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: SlingshotGame;
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

  // Launch sound - elastic snap
  playLaunch(power: number = 0.5) {
    if (!this.initialized) return;

    // Elastic snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(200 + power * 200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3 * power, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Whoosh sound
    const whoosh = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 600;
    filter.Q.value = 1;

    whoosh.type = "sawtooth";
    whoosh.frequency.setValueAtTime(100, this.ctx.currentTime);
    whoosh.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);

    whooshGain.gain.setValueAtTime(0.1 * power, this.ctx.currentTime);
    whooshGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    whoosh.connect(filter);
    filter.connect(whooshGain);
    whooshGain.connect(this.masterGain);

    whoosh.start();
    whoosh.stop(this.ctx.currentTime + 0.2);
  }

  // Target hit - satisfying pop
  playTargetHit(points: number) {
    if (!this.initialized) return;

    const baseFreq = 300 + points * 3;

    // Pop sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);

    // Score chime
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    chime.type = "triangle";
    chime.frequency.value = baseFreq * 2;

    chimeGain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain);

    chime.start(this.ctx.currentTime + 0.05);
    chime.stop(this.ctx.currentTime + 0.25);
  }

  // Miss - thud
  playMiss() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Game start
  playStart() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Victory
  playVictory() {
    if (!this.initialized) return;

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.setValueAtTime(0.2, start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  // Game over
  playGameOver() {
    if (!this.initialized) return;

    const notes = [330, 294, 262, 220];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.25);
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
  game = new SlingshotGame(gameCanvas);
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
    if (state.shots !== undefined) shotsDisplay.textContent = String(state.shots);
    if (state.status === "over") showGameOver(state.score >= 300);
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

  // Launch events
  for (const launch of events.launch) {
    audioSystem?.playLaunch(launch.power);
    webgpuRenderer?.emitLaunch(launch.x, launch.y);
  }

  // Trail events
  for (const trail of events.trail) {
    webgpuRenderer?.emitTrail(trail.x, trail.y);
  }

  // Target hit events
  for (const hit of events.targetHit) {
    audioSystem?.playTargetHit(hit.points);
    webgpuRenderer?.emitTargetHit(hit.x, hit.y, hit.color);
    webgpuRenderer?.emitScore(hit.x, hit.y);
  }

  // Miss events
  for (const miss of events.miss) {
    audioSystem?.playMiss();
    webgpuRenderer?.emitMiss(miss.x, miss.y);
  }

  // Game over
  for (const over of events.gameOver) {
    if (over.victory) {
      audioSystem?.playVictory();
    } else {
      audioSystem?.playGameOver();
    }
    webgpuRenderer?.emitGameOver(over.x, over.y, over.victory);
  }

  game.clearPendingEvents();
}

function showGameOver(victory: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = victory ? i18n.t("game.win") : i18n.t("game.lose");
    overlayMsg.textContent = "";
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
