/**
 * Air Hockey Main Entry
 * Game #168 - Arcade / Air Hockey / Blue and Red Neon Theme
 */
import { AirHockeyGame } from "./game";
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

let game: AirHockeyGame;
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

  // Paddle hit sound - sharp click
  playHit(force: number = 0.5) {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "highpass";
    filter.frequency.value = 800;

    osc.type = "square";
    osc.frequency.setValueAtTime(300 + force * 200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4 * force, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);

    // Add click noise
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noise.type = "triangle";
    noise.frequency.value = 1200;
    noiseGain.gain.setValueAtTime(0.15 * force, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.05);
  }

  // Wall bounce - softer thud
  playWallBounce() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Goal scored - celebratory horn
  playGoal(isPlayer: boolean) {
    if (!this.initialized) return;

    const baseFreq = isPlayer ? 440 : 330;

    // Main horn
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.value = baseFreq * (1 + i * 0.5);

      const delay = i * 0.05;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + delay + 0.05);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + delay + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 0.5);
    }

    // Crowd cheer effect
    if (isPlayer) {
      for (let i = 0; i < 5; i++) {
        const noise = this.ctx.createOscillator();
        const noiseGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = "bandpass";
        filter.frequency.value = 800 + Math.random() * 400;
        filter.Q.value = 2;

        noise.type = "sawtooth";
        noise.frequency.value = 200 + Math.random() * 100;

        noiseGain.gain.setValueAtTime(0, this.ctx.currentTime + 0.1);
        noiseGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.2);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(this.ctx.currentTime + 0.1);
        noise.stop(this.ctx.currentTime + 0.6);
      }
    }
  }

  // Game start whistle
  playStart() {
    if (!this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // Victory fanfare
  playVictory() {
    if (!this.initialized) return;

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.setValueAtTime(0.2, start + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // Game over sound
  playGameOver() {
    if (!this.initialized) return;

    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;

      const start = this.ctx.currentTime + i * 0.2;
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
  game = new AirHockeyGame(gameCanvas);
  audioSystem = new AudioSystem();

  // Initialize WebGPU
  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const webgpuSupported = await webgpuRenderer.initialize();

  if (!webgpuSupported) {
    webgpuCanvas.style.display = "none";
  }

  resizeCanvases();

  gameCanvas.addEventListener("mousemove", (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  gameCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    game.handleMouseMove(touch.clientX - rect.left, touch.clientY - rect.top);
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

  // Player hits
  for (const hit of events.playerHit) {
    audioSystem?.playHit(hit.force);
    webgpuRenderer?.emitPlayerHit(hit.x, hit.y);
  }

  // CPU hits
  for (const hit of events.cpuHit) {
    audioSystem?.playHit(hit.force * 0.8);
    webgpuRenderer?.emitCpuHit(hit.x, hit.y);
  }

  // Wall bounces
  for (const bounce of events.wallBounce) {
    audioSystem?.playWallBounce();
    webgpuRenderer?.emitWallBounce(bounce.x, bounce.y, bounce.nx, bounce.ny);
  }

  // Goals
  for (const goal of events.goalScored) {
    audioSystem?.playGoal(goal.isPlayer);
    webgpuRenderer?.emitGoal(goal.x, goal.y, goal.isPlayer);
  }

  // Puck trail
  for (const trail of events.puckTrail) {
    webgpuRenderer?.emitPuckTrail(trail.x, trail.y);
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
