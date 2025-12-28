/**
 * Gear Puzzle Main Entry
 * Victorian Steampunk Workshop Theme
 * Game #034
 */
import { GearGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playGrab(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Metallic grab sound - brass clunk
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    // Metallic ring
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(600, now);
    ringGain.gain.setValueAtTime(0.04, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    ring.connect(ringGain).connect(ctx.destination);
    ring.start(now);
    ring.stop(now + 0.15);
  }

  playDrop(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Heavy gear drop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Impact thud
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(80, now);
    thudGain.gain.setValueAtTime(0.1, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    thud.connect(thudGain).connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.1);
  }

  playMesh(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Gear teeth clicking into place
    [0, 0.03, 0.06].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 - i * 100, now + delay);
      gain.gain.setValueAtTime(0.03, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });

    // Satisfying clunk
    const clunk = ctx.createOscillator();
    const clunkGain = ctx.createGain();
    clunk.type = 'triangle';
    clunk.frequency.setValueAtTime(250, now + 0.08);
    clunk.frequency.exponentialRampToValueAtTime(180, now + 0.12);
    clunkGain.gain.setValueAtTime(0.1, now + 0.08);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    clunk.connect(clunkGain).connect(ctx.destination);
    clunk.start(now + 0.08);
    clunk.stop(now + 0.22);
  }

  playRotate(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Continuous mechanical whir
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    // LFO for mechanical wobble
    lfo.frequency.setValueAtTime(8, now);
    lfoGain.gain.setValueAtTime(20, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.3);
    lfo.stop(now + 0.3);
  }

  playSteam(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Steam hiss using noise-like oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, now);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500 + Math.random() * 500, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Steam whistle fanfare
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.1, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.45);
    });

    // Big steam release
    const steam = ctx.createOscillator();
    const steamGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now + 0.5);

    steam.type = 'sawtooth';
    steam.frequency.setValueAtTime(800, now + 0.5);
    steamGain.gain.setValueAtTime(0.08, now + 0.5);
    steamGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    steam.connect(filter).connect(steamGain).connect(ctx.destination);
    steam.start(now + 0.5);
    steam.stop(now + 1.3);

    // Brass bell chime
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1047, now + 0.6);
    bellGain.gain.setValueAtTime(0.12, now + 0.6);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    bell.connect(bellGain).connect(ctx.destination);
    bell.start(now + 0.6);
    bell.stop(now + 1.5);
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Engine startup sequence
    // Initial crank
    const crank = ctx.createOscillator();
    const crankGain = ctx.createGain();
    crank.type = 'triangle';
    crank.frequency.setValueAtTime(60, now);
    crank.frequency.linearRampToValueAtTime(100, now + 0.2);
    crankGain.gain.setValueAtTime(0.08, now);
    crankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    crank.connect(crankGain).connect(ctx.destination);
    crank.start(now);
    crank.stop(now + 0.3);

    // Gear engagement clicks
    [0.15, 0.25, 0.35].forEach((delay) => {
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(400 + Math.random() * 200, now + delay);
      clickGain.gain.setValueAtTime(0.04, now + delay);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03);
      click.connect(clickGain).connect(ctx.destination);
      click.start(now + delay);
      click.stop(now + delay + 0.05);
    });

    // Steam pressure release
    const steam = ctx.createOscillator();
    const steamGain = ctx.createGain();
    steam.type = 'sawtooth';
    steam.frequency.setValueAtTime(1200, now + 0.4);
    steamGain.gain.setValueAtTime(0.04, now + 0.4);
    steamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    steam.connect(steamGain).connect(ctx.destination);
    steam.start(now + 0.4);
    steam.stop(now + 0.65);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const statusDisplay = document.getElementById("status-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: GearGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let isDragging = false;
let previousConnectedCount = 0;

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
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.id = 'webgpu-canvas';
  webgpuCanvas.className = 'webgpu-overlay';

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.appendChild(webgpuCanvas);

    const resizeCanvas = () => {
      const rect = gameArea.getBoundingClientRect();
      webgpuCanvas.width = rect.width;
      webgpuCanvas.height = rect.height;
      webgpuCanvas.style.width = rect.width + 'px';
      webgpuCanvas.style.height = rect.height + 'px';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (!success) {
      renderer = null;
      webgpuCanvas.remove();
    }
  }

  // Render loop
  function renderLoop() {
    if (renderer) {
      renderer.render();
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

function initGame() {
  game = new GearGame(canvas);
  game.resize();

  // Mouse Inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), {
    passive: false,
  });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), {
    passive: false,
  });
  window.addEventListener("touchend", (e) => handleTouch("up", e), {
    passive: false,
  });

  game.setOnStateChange((state: any) => {
    if (state.isRunning !== undefined) {
      statusDisplay.textContent = state.isRunning
        ? i18n.t("game.running")
        : i18n.t("game.stopped");
      statusDisplay.style.color = state.isRunning ? "#2ecc71" : "#e74c3c";

      // Check for new connections
      if (game.gears) {
        const connectedCount = game.gears.filter(g => g.connected).length;
        if (connectedCount > previousConnectedCount && connectedCount > 1) {
          audio.playMesh();
          audio.playSteam();

          // Emit particles at connected gears
          if (renderer) {
            const gameArea = document.querySelector('.game-area');
            if (gameArea) {
              const areaRect = gameArea.getBoundingClientRect();
              game.gears.filter(g => g.connected).forEach(gear => {
                const px = gear.x / canvas.width;
                const py = gear.y / canvas.height;
                renderer!.emitMesh(px, py);
                renderer!.emitConnection(px, py);
              });
            }
          }
        }
        previousConnectedCount = connectedCount;
      }
    }

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.triggerVictory();
      }
      showWin();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === "down") {
    // Check if clicking on a gear
    const clickedGear = game.gears?.find(g => {
      const d = Math.hypot(g.x - x, g.y - y);
      return d < g.radius && g.type === "normal";
    });
    if (clickedGear) {
      isDragging = true;
      audio.playGrab();
    }
  } else if (type === "move" && isDragging) {
    // Emit drag particles
    if (renderer) {
      const gameArea = document.querySelector('.game-area');
      if (gameArea) {
        const areaRect = gameArea.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const px = (canvasRect.left - areaRect.left + x) / areaRect.width;
        const py = (canvasRect.top - areaRect.top + y) / areaRect.height;
        renderer.emitDrag(px, py);
      }
    }
  } else if (type === "up" && isDragging) {
    isDragging = false;
    audio.playDrop();
  }

  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (type === "down") {
    const clickedGear = game.gears?.find(g => {
      const d = Math.hypot(g.x - x, g.y - y);
      return d < g.radius && g.type === "normal";
    });
    if (clickedGear) {
      isDragging = true;
      audio.playGrab();
    }
  } else if (type === "move" && isDragging) {
    if (renderer) {
      const gameArea = document.querySelector('.game-area');
      if (gameArea) {
        const areaRect = gameArea.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const px = (canvasRect.left - areaRect.left + x) / areaRect.width;
        const py = (canvasRect.top - areaRect.top + y) / areaRect.height;
        renderer.emitDrag(px, py);
      }
    }
  } else if (type === "up" && isDragging) {
    isDragging = false;
    audio.playDrop();
  }

  game.handleInput(type, x, y);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 1000);
}

function startGame() {
  overlay.style.display = "none";
  previousConnectedCount = 0;
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  previousConnectedCount = 0;
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
