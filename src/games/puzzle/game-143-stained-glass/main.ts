/**
 * Stained Glass Main Entry
 * Game #143
 */
import { StainedGlassGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const filledDisplay = document.getElementById("filled-display")!;
const colorPalette = document.getElementById("color-palette")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: StainedGlassGame;
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
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playColorSelect() {
    // Glass chime when selecting color
    this.playTone(880, 0.12, "sine", 0.06);
    this.playTone(1320, 0.08, "sine", 0.04, 0.03);
  }

  playRegionFill() {
    // Glass resonance when filling
    this.playTone(523, 0.15, "sine", 0.08);
    this.playTone(659, 0.12, "sine", 0.06, 0.04);
    this.playTone(784, 0.1, "triangle", 0.05, 0.08);
  }

  playValidColoring() {
    // Harmonic chime for valid placement
    this.playTone(660, 0.12, "sine", 0.07);
    this.playTone(880, 0.1, "sine", 0.05, 0.03);
    this.playTone(1100, 0.08, "triangle", 0.04, 0.06);
  }

  playInvalidColoring() {
    // Dissonant tone for invalid
    this.playTone(200, 0.15, "sine", 0.06);
    this.playTone(180, 0.12, "sine", 0.05, 0.05);
  }

  playWin() {
    // Cathedral bells melody
    const melody = [523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.1, i * 0.12);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.05, i * 0.12);
    });
  }

  playComplete() {
    // Grand cathedral fanfare
    const melody = [392, 523, 659, 784, 880, 1047, 1175, 1319];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.35, "sine", 0.12, i * 0.1);
      this.playTone(freq * 0.5, 0.3, "triangle", 0.06, i * 0.1);
    });
  }

  playLevelStart() {
    // Light entering cathedral
    this.playTone(330, 0.2, "sine", 0.06);
    this.playTone(440, 0.15, "sine", 0.05, 0.08);
    this.playTone(550, 0.12, "sine", 0.04, 0.16);
    this.playTone(660, 0.1, "triangle", 0.03, 0.24);
  }

  playReset() {
    // Glass clearing
    this.playTone(500, 0.1, "sine", 0.05);
    this.playTone(400, 0.1, "sine", 0.04, 0.04);
    this.playTone(300, 0.1, "sine", 0.03, 0.08);
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
      }, 120);
    } else {
      renderer = null;
    }
  }
}

function updateColorPalette() {
  colorPalette.innerHTML = "";
  const colors = game.getAvailableColors();
  const selectedColor = game.getSelectedColor();

  colors.forEach((color, index) => {
    const btn = document.createElement("button");
    btn.className = "color-btn" + (color === selectedColor ? " selected" : "");
    btn.style.backgroundColor = color;
    btn.onclick = () => {
      game.setSelectedColor(color);
      if (renderer) {
        renderer.emitColorSelect(0.5, 0.9, index);
      }
      audio.playColorSelect();
      updateColorPalette();
    };
    colorPalette.appendChild(btn);
  });
}

function initGame() {
  game = new StainedGlassGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    filledDisplay.textContent = `${state.filledCount}/${state.totalRegions}`;
    updateColorPalette();

    // WebGPU events
    if (renderer) {
      if (state.regionFill) {
        const nx = state.regionFill.x / canvas.clientWidth;
        const ny = state.regionFill.y / canvas.clientHeight;
        renderer.emitRegionFill(nx, ny, state.regionFill.colorIndex || 0);
        audio.playRegionFill();
      }

      if (state.validColoring) {
        const nx = state.validColoring.x / canvas.clientWidth;
        const ny = state.validColoring.y / canvas.clientHeight;
        renderer.emitValidColoring(nx, ny);
        audio.playValidColoring();
      }

      if (state.invalidColoring) {
        audio.playInvalidColoring();
      }

      if (state.reset) {
        renderer.emitReset();
        audio.playReset();
      }
    }

    if (state.status === "won") {
      renderer?.emitLevelComplete();
      audio.playWin();
      showWin();
    } else if (state.status === "complete") {
      renderer?.emitVictory();
      audio.playComplete();
      showComplete();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "";
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  updateColorPalette();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  renderer?.emitLevelStart();
  audio.playLevelStart();
});

initI18n();
initWebGPU();
initGame();
