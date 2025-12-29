/**
 * Classic Pong Main Entry
 * Game #171 - Retro Arcade Theme
 */
import { PongGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const gameCanvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const playerScoreDisplay = document.getElementById("player-score-display")!;
const cpuScoreDisplay = document.getElementById("cpu-score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: PongGame;
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
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(this.ctx.destination);
  }

  async init() {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.initialized = true;
  }

  // Wall bounce - classic beep
  playWallBounce() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Paddle hit - higher pitch
  playPaddleHit(isPlayer: boolean) {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(isPlayer ? 440 : 330, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Player score
  playPlayerScore() {
    if (!this.initialized) return;

    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  // CPU score
  playCPUScore() {
    if (!this.initialized) return;

    const notes = [330, 294, 262];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  // Game start
  playStart() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(330, this.ctx.currentTime);
    osc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(550, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Game over
  playGameOver(playerWon: boolean) {
    if (!this.initialized) return;

    const notes = playerWon
      ? [523, 659, 784, 1047]
      : [330, 294, 262, 220];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * (playerWon ? 0.1 : 0.18);
      gain.gain.setValueAtTime(0.25, start);
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
  game = new PongGame(gameCanvas);
  audioSystem = new AudioSystem();

  // Initialize WebGPU
  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const webgpuSupported = await webgpuRenderer.initialize();

  if (!webgpuSupported) {
    webgpuCanvas.style.display = "none";
  }

  resizeCanvases();

  // Mouse events
  gameCanvas.addEventListener("mousemove", (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseMove(e.clientY - rect.top);
  });

  // Touch events
  gameCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseMove(touch.clientY - rect.top);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.playerScore !== undefined) playerScoreDisplay.textContent = String(state.playerScore);
    if (state.cpuScore !== undefined) cpuScoreDisplay.textContent = String(state.cpuScore);
    if (state.status === "over") showGameOver(state.playerWon);
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

  // Wall bounce events
  for (const bounce of events.wallBounce) {
    audioSystem?.playWallBounce();
    webgpuRenderer?.emitWallBounce(bounce.x, bounce.y, bounce.isTop);
  }

  // Paddle hit events
  for (const hit of events.paddleHit) {
    audioSystem?.playPaddleHit(hit.isPlayer);
    webgpuRenderer?.emitPaddleHit(hit.x, hit.y, hit.isPlayer);
  }

  // Ball trail events
  for (const trail of events.ballTrail) {
    webgpuRenderer?.emitBallTrail(trail.x, trail.y);
  }

  // Player score events
  for (const score of events.playerScore) {
    audioSystem?.playPlayerScore();
    webgpuRenderer?.emitPlayerScore(score.x, score.y);
  }

  // CPU score events
  for (const score of events.cpuScore) {
    audioSystem?.playCPUScore();
    webgpuRenderer?.emitCPUScore(score.x, score.y);
  }

  // Game over
  for (const over of events.gameOver) {
    audioSystem?.playGameOver(over.playerWon);
    webgpuRenderer?.emitGameOver(over.x, over.y, over.playerWon);
  }

  game.clearPendingEvents();
}

function showGameOver(playerWon: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = playerWon ? i18n.t("game.win") : i18n.t("game.lose");
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
