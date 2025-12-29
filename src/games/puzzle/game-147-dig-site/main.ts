/**
 * Dig Site Main Entry
 * Game #147
 */
import { DigSiteGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const artifactsDisplay = document.getElementById("artifacts-display")!;
const layerDisplay = document.getElementById("layer-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: DigSiteGame;
let renderer: WebGPURenderer | null = null;
let ambientInterval: number | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.3,
    delay: number = 0
  ) {
    this.init();
    if (!this.ctx) return;

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playDig() {
    // Scratchy digging sound
    this.playTone(100 + Math.random() * 50, 0.08, "sawtooth", 0.03);
    this.playTone(80 + Math.random() * 40, 0.06, "triangle", 0.02, 0.02);
  }

  playDigImpact() {
    // Thud when hitting something
    this.playTone(80, 0.15, "sine", 0.06);
    this.playTone(120, 0.1, "triangle", 0.04, 0.03);
  }

  playArtifactReveal() {
    // Mysterious shimmer
    this.playTone(440, 0.2, "sine", 0.05);
    this.playTone(550, 0.15, "sine", 0.04, 0.05);
  }

  playArtifactFound() {
    // Discovery fanfare
    this.playTone(440, 0.25, "sine", 0.1);
    this.playTone(550, 0.2, "sine", 0.08, 0.08);
    this.playTone(660, 0.2, "sine", 0.07, 0.15);
    this.playTone(880, 0.25, "triangle", 0.06, 0.22);
  }

  playWin() {
    // Level complete melody
    const melody = [392, 440, 523, 659, 784];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.1, i * 0.1);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.05, i * 0.1);
    });
  }

  playComplete() {
    // Grand discovery
    const melody = [262, 330, 392, 440, 523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.35, "sine", 0.12, i * 0.1);
      this.playTone(freq * 0.5, 0.3, "triangle", 0.05, i * 0.1);
    });
  }

  playLevelStart() {
    // Brushing off dust
    this.playTone(200, 0.2, "sine", 0.04);
    this.playTone(250, 0.15, "sine", 0.03, 0.05);
    this.playTone(300, 0.12, "triangle", 0.03, 0.1);
  }

  playReset() {
    // Earth settling
    this.playTone(100, 0.25, "sine", 0.05);
    this.playTone(80, 0.2, "sine", 0.04, 0.08);
  }
}

const audio = new AudioSystem();

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
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

async function initWebGPU() {
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      ambientInterval = window.setInterval(() => {
        renderer?.emitAmbient();
      }, 100);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new DigSiteGame(canvas);
  game.resize();

  // Mouse input
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleMouseDown(x, y);
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleMouseMove(x, y);
  });

  canvas.addEventListener("mouseup", () => {
    game.handleMouseUp();
  });

  canvas.addEventListener("mouseleave", () => {
    game.handleMouseUp();
  });

  // Touch input
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleMouseDown(x, y);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleMouseMove(x, y);
  });

  canvas.addEventListener("touchend", () => {
    game.handleMouseUp();
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = state.level.toString();
    artifactsDisplay.textContent = `${state.artifactsFound}/${state.totalArtifacts}`;
    layerDisplay.textContent = state.currentLayer.toString();

    // Update WebGPU layer
    if (renderer) {
      renderer.setCurrentLayer(state.currentLayer);

      if (state.digAction) {
        const nx = state.digAction.x / canvas.clientWidth;
        const ny = 1 - state.digAction.y / canvas.clientHeight;
        renderer.emitDig(nx, ny);
        audio.playDig();
      }

      if (state.digImpact) {
        const nx = state.digImpact.x / canvas.clientWidth;
        const ny = 1 - state.digImpact.y / canvas.clientHeight;
        renderer.emitDigImpact(nx, ny);
        audio.playDigImpact();
      }

      if (state.artifactReveal) {
        const nx = state.artifactReveal.x / canvas.clientWidth;
        const ny = 1 - state.artifactReveal.y / canvas.clientHeight;
        renderer.emitArtifactReveal(nx, ny);
        audio.playArtifactReveal();
      }

      if (state.artifactFound) {
        const nx = state.artifactFound.x / canvas.clientWidth;
        const ny = 1 - state.artifactFound.y / canvas.clientHeight;
        renderer.emitArtifactFound(nx, ny);
        audio.playArtifactFound();
      }

      if (state.reset) {
        renderer.emitReset();
        audio.playReset();
      }
    }

    if (state.status === "won") {
      renderer?.emitLevelComplete();
      audio.playWin();
      showWin(state.level, state.maxLevel);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin(level: number, maxLevel: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
        renderer?.emitLevelStart();
        audio.playLevelStart();
      };
    } else {
      overlayMsg.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
      renderer?.emitVictory();
      audio.playComplete();
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  renderer?.emitReset();
  audio.playReset();
});

// Init
initI18n();
initWebGPU();
initGame();
