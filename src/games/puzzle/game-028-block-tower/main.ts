/**
 * Block Tower Main Entry
 * Neon Skyline Theme
 * Game #028
 */
import { BlockTowerGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type BlockData } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playLanding(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Impact thud with urban bass
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Click
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.1);
  }

  playDrop(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Whoosh sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playFall(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Falling descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  playGameOver(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Deep crash
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Descending tones
    [0.1, 0.2, 0.3].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 - i * 80, now + delay);
      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    });
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Ascending urban fanfare
    [200, 300, 400, 500].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  playMilestone(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Achievement chime
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const heightDisplay = document.getElementById("height-display")!;
const blockDisplay = document.getElementById("block-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BlockTowerGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let previousHeight = 0;
let previousBlockCount = 0;
let wasGameOver = false;

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
}

function getBlockData(): BlockData[] {
  const blocks: BlockData[] = [];
  const canvasWidth = canvas.width || 500;
  const canvasHeight = canvas.height || 600;

  // Get all bodies from game
  game.bodies.forEach((body) => {
    if (body.color === '#7f8c8d') return; // Skip ground

    blocks.push({
      x: body.x / canvasWidth,
      y: (body.y + game.cameraY) / canvasHeight,
      width: body.w / canvasWidth,
      height: body.h / canvasHeight,
      color: body.color,
      isStatic: body.isStatic
    });
  });

  // Add current block if exists
  if (game.currentBlock) {
    blocks.push({
      x: game.currentBlock.x / canvasWidth,
      y: (game.currentBlock.y + game.cameraY) / canvasHeight,
      width: game.currentBlock.w / canvasWidth,
      height: game.currentBlock.h / canvasHeight,
      color: game.currentBlock.color,
      isStatic: false
    });
  }

  return blocks;
}

function initGame() {
  game = new BlockTowerGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.height !== undefined) {
      heightDisplay.textContent = state.height.toString();

      // Detect landing
      if (state.height > previousHeight) {
        audio.playLanding();

        if (renderer) {
          const lastBlock = game.bodies[game.bodies.length - 1];
          if (lastBlock) {
            const canvasWidth = canvas.width || 500;
            const canvasHeight = canvas.height || 600;
            const x = (lastBlock.x + lastBlock.w / 2) / canvasWidth;
            const y = (lastBlock.y + lastBlock.h / 2 + game.cameraY) / canvasHeight;
            renderer.emitLanding(x, y, lastBlock.color);
          }
        }

        // Milestone every 5 blocks
        if (state.height > 0 && state.height % 5 === 0) {
          audio.playMilestone();
          if (renderer) {
            renderer.emitHeightAchievement(0.5, 0.3);
          }
        }

        previousHeight = state.height;
      }
    }

    if (state.blocks !== undefined) {
      blockDisplay.textContent = state.blocks.toString();
      previousBlockCount = state.blocks;
    }

    if (state.status === "gameover" && !wasGameOver) {
      wasGameOver = true;
      audio.playGameOver();

      if (renderer) {
        renderer.triggerGameOver();
        // Emit debris from last position
        if (game.currentBlock) {
          const canvasWidth = canvas.width || 500;
          const canvasHeight = canvas.height || 600;
          const x = (game.currentBlock.x + game.currentBlock.w / 2) / canvasWidth;
          const y = (game.currentBlock.y + game.currentBlock.h / 2 + game.cameraY) / canvasHeight;
          renderer.emitDebris(x, y, game.currentBlock.color);
        }
      }

      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());

  // Controls with audio
  const handleDrop = () => {
    if (game.currentBlock && game.currentBlock.vy === 0) {
      audio.playDrop();
      game.drop();
    }
  };

  canvas.addEventListener("click", handleDrop);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") handleDrop();
  });

  // Render loop for WebGPU
  function renderLoop() {
    if (renderer) {
      renderer.setCameraY(game.cameraY / (canvas.height || 600));
      renderer.render(getBlockData());
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.height")}: ${
    heightDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.start");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  previousHeight = 0;
  previousBlockCount = 0;
  wasGameOver = false;
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  previousHeight = 0;
  previousBlockCount = 0;
  wasGameOver = false;
  audio.playStart();
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
