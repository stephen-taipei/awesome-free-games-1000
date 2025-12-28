/**
 * Mirror Puzzle Main Entry
 * Crystal Palace / Prism Chamber Theme
 * Game #035
 */
import { MirrorGame } from "./game";
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

    // Crystal touch - glass chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Crystal resonance
    const res = ctx.createOscillator();
    const resGain = ctx.createGain();
    res.type = 'triangle';
    res.frequency.setValueAtTime(2400, now);
    resGain.gain.setValueAtTime(0.03, now);
    resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    res.connect(resGain).connect(ctx.destination);
    res.start(now);
    res.stop(now + 0.2);
  }

  playDrop(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crystal set down
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playRotate(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crystal turning - glass shimmer
    [1200, 1400, 1600].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);
      gain.gain.setValueAtTime(0.05, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.12);
    });
  }

  playReflect(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Light beam refraction - prismatic shimmer
    const freqs = [880, 1047, 1319, 1568];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.02);
      gain.gain.setValueAtTime(0.04, now + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.02);
      osc.stop(now + i * 0.02 + 0.1);
    });
  }

  playBeamHit(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Target hit - bright light flash
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crystal palace fanfare - ascending prismatic chords
    const chords = [
      [523, 659, 784],    // C major
      [587, 740, 880],    // D major
      [659, 830, 988],    // E major
      [784, 988, 1175],   // G major
    ];

    chords.forEach((chord, chordIdx) => {
      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = chordIdx * 0.2;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.08, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.55);
      });
    });

    // Crystal shimmer finale
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(2000, now + 0.8);
    shimmer.frequency.linearRampToValueAtTime(3000, now + 1.2);
    shimmerGain.gain.setValueAtTime(0.06, now + 0.8);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    shimmer.connect(shimmerGain).connect(ctx.destination);
    shimmer.start(now + 0.8);
    shimmer.stop(now + 1.5);
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crystal awakening - rising chimes
    [392, 523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.08, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });

    // Light beam activation
    const beam = ctx.createOscillator();
    const beamGain = ctx.createGain();
    beam.type = 'sawtooth';
    beam.frequency.setValueAtTime(200, now + 0.4);
    beam.frequency.exponentialRampToValueAtTime(400, now + 0.6);
    beamGain.gain.setValueAtTime(0.03, now + 0.4);
    beamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    beam.connect(beamGain).connect(ctx.destination);
    beam.start(now + 0.4);
    beam.stop(now + 0.7);
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

let game: MirrorGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let isDragging = false;
let previousHit = false;
let previousRayCount = 0;

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
  game = new MirrorGame(canvas);
  game.resize();

  // Mouse Inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));
  canvas.addEventListener("dblclick", (e) => handleInput("dblclick", e));

  // Touch (Double tap?)
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
    if (state.hit !== undefined) {
      statusDisplay.textContent = state.hit
        ? i18n.t("game.connected")
        : i18n.t("game.searching");
      statusDisplay.style.color = state.hit ? "#ffd700" : "#88ccff";

      // Beam hit target
      if (state.hit && !previousHit) {
        audio.playBeamHit();
        if (renderer) {
          // Get target position
          const target = game.objects?.find(o => o.type === 'target');
          if (target) {
            const px = target.x / canvas.width;
            const py = target.y / canvas.height;
            renderer.emitBeamHit(px, py);
          }
        }
      }
      previousHit = state.hit;
    }

    // Check for new reflections
    if (game.rays && game.rays.length > previousRayCount) {
      audio.playReflect();

      // Emit particles at reflection points
      if (renderer && game.rays.length > 1) {
        for (let i = 1; i < game.rays.length; i++) {
          const ray = game.rays[i];
          const px = ray.x1 / canvas.width;
          const py = ray.x1 / canvas.height;
          renderer.emitReflect(px, py);
        }
      }
    }
    previousRayCount = game.rays?.length || 0;

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

function handleInput(type: "down" | "move" | "up" | "dblclick", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === "down") {
    const clicked = game.objects?.find(o => {
      if (o.type !== "mirror") return false;
      const d = Math.hypot(o.x - x, o.y - y);
      return d < 20;
    });
    if (clicked) {
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
  } else if (type === "dblclick") {
    const clicked = game.objects?.find(o => {
      if (o.type !== "mirror") return false;
      const d = Math.hypot(o.x - x, o.y - y);
      return d < 20;
    });
    if (clicked) {
      audio.playRotate();
      if (renderer) {
        const px = clicked.x / canvas.width;
        const py = clicked.y / canvas.height;
        renderer.emitRotate(px, py);
      }
    }
  }

  game.handleInput(type, x, y);
}

let lastTap = 0;
function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  // Simple Double Tap detection
  if (type === "down") {
    const now = Date.now();
    if (now - lastTap < 300) {
      const clicked = game.objects?.find(o => {
        if (o.type !== "mirror") return false;
        const d = Math.hypot(o.x - x, o.y - y);
        return d < 20;
      });
      if (clicked) {
        audio.playRotate();
        if (renderer) {
          const px = clicked.x / canvas.width;
          const py = clicked.y / canvas.height;
          renderer.emitRotate(px, py);
        }
      }
      game.handleInput("dblclick", x, y);
    } else {
      const clicked = game.objects?.find(o => {
        if (o.type !== "mirror") return false;
        const d = Math.hypot(o.x - x, o.y - y);
        return d < 20;
      });
      if (clicked) {
        isDragging = true;
        audio.playGrab();
      }
      game.handleInput("down", x, y);
    }
    lastTap = now;
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
    game.handleInput(type, x, y);
  } else if (type === "up" && isDragging) {
    isDragging = false;
    audio.playDrop();
    game.handleInput(type, x, y);
  } else {
    game.handleInput(type, x, y);
  }
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
  previousHit = false;
  previousRayCount = 0;
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  previousHit = false;
  previousRayCount = 0;
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
