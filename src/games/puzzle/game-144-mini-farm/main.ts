/**
 * Mini Farm Main Entry
 * Game #144
 */
import { MiniFarmGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const placedDisplay = document.getElementById("placed-display")!;
const cropPalette = document.getElementById("crop-palette")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

const CROP_ICONS: Record<string, string> = {
  carrot: "🥕",
  corn: "🌽",
  wheat: "🌾",
  tomato: "🍅",
};

const CROP_INDEX: Record<string, number> = {
  carrot: 0,
  corn: 1,
  wheat: 2,
  tomato: 3,
};

let game: MiniFarmGame;
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
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playCropSelect() {
    // Gentle rustle
    this.playTone(400, 0.08, "sine", 0.05);
    this.playTone(500, 0.06, "triangle", 0.04, 0.02);
  }

  playCropPlace() {
    // Planting sound - soft thud with growth
    this.playTone(180, 0.12, "sine", 0.08);
    this.playTone(280, 0.1, "triangle", 0.06, 0.04);
    this.playTone(380, 0.08, "sine", 0.05, 0.08);
  }

  playCropRemove() {
    // Uprooting sound
    this.playTone(250, 0.1, "sine", 0.05);
    this.playTone(200, 0.08, "triangle", 0.04, 0.03);
  }

  playValidPlacement() {
    // Happy chime
    this.playTone(520, 0.1, "sine", 0.06);
    this.playTone(660, 0.08, "sine", 0.05, 0.03);
    this.playTone(780, 0.07, "triangle", 0.04, 0.06);
  }

  playInvalidPlacement() {
    // Warning tone
    this.playTone(200, 0.12, "sine", 0.05);
    this.playTone(180, 0.1, "sine", 0.04, 0.04);
  }

  playWin() {
    // Harvest celebration
    const melody = [392, 494, 587, 659, 784];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.25, "sine", 0.08, i * 0.1);
      this.playTone(freq * 0.5, 0.2, "triangle", 0.04, i * 0.1);
    });
  }

  playComplete() {
    // Grand harvest finale
    const melody = [330, 392, 494, 587, 659, 784, 880, 988];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.1, i * 0.08);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.05, i * 0.08);
    });
  }

  playLevelStart() {
    // Morning farm awakening
    this.playTone(262, 0.15, "sine", 0.06);
    this.playTone(330, 0.12, "sine", 0.05, 0.06);
    this.playTone(392, 0.1, "triangle", 0.04, 0.12);
    this.playTone(494, 0.08, "sine", 0.03, 0.18);
  }

  playReset() {
    // Field clearing
    this.playTone(400, 0.1, "sine", 0.05);
    this.playTone(320, 0.1, "sine", 0.04, 0.03);
    this.playTone(260, 0.1, "sine", 0.03, 0.06);
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
      }, 150);
    } else {
      renderer = null;
    }
  }
}

function updateCropPalette() {
  cropPalette.innerHTML = "";
  const crops = game.getAvailableCrops();
  const selectedCrop = game.getSelectedCrop();

  crops.forEach((crop) => {
    if (!crop) return;
    const btn = document.createElement("button");
    btn.className = "crop-btn" + (crop === selectedCrop ? " selected" : "");
    btn.innerHTML = CROP_ICONS[crop];
    btn.onclick = () => {
      game.setSelectedCrop(crop);
      audio.playCropSelect();
      updateCropPalette();
    };
    cropPalette.appendChild(btn);
  });
}

function initGame() {
  game = new MiniFarmGame(canvas);
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
    placedDisplay.textContent = `${state.placedCount}/${state.totalCells}`;
    updateCropPalette();

    // WebGPU events
    if (renderer) {
      if (state.cropPlace) {
        const nx = state.cropPlace.x / canvas.clientWidth;
        const ny = 1 - state.cropPlace.y / canvas.clientHeight;
        const cropIndex = CROP_INDEX[state.cropPlace.crop] || 0;
        renderer.emitCropPlace(nx, ny, cropIndex);
        audio.playCropPlace();
      }

      if (state.cropRemove) {
        const nx = state.cropRemove.x / canvas.clientWidth;
        const ny = 1 - state.cropRemove.y / canvas.clientHeight;
        renderer.emitCropRemove(nx, ny);
        audio.playCropRemove();
      }

      if (state.validPlacement) {
        const nx = state.validPlacement.x / canvas.clientWidth;
        const ny = 1 - state.validPlacement.y / canvas.clientHeight;
        renderer.emitValidPlacement(nx, ny);
        audio.playValidPlacement();
      }

      if (state.invalidPlacement) {
        const nx = state.invalidPlacement.x / canvas.clientWidth;
        const ny = 1 - state.invalidPlacement.y / canvas.clientHeight;
        renderer.emitInvalidPlacement(nx, ny);
        audio.playInvalidPlacement();
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
  updateCropPalette();
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
