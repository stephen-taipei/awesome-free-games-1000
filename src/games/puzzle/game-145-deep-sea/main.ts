/**
 * Deep Sea Main Entry
 * Game #145
 */
import { DeepSeaGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const depthDisplay = document.getElementById("depth-display")!;
const oxygenDisplay = document.getElementById("oxygen-display")!;
const treasuresDisplay = document.getElementById("treasures-display")!;
const oxygenBar = document.getElementById("oxygen-bar")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: DeepSeaGame;
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
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playMove() {
    // Submarine movement - muffled thud
    this.playTone(120, 0.1, "sine", 0.05);
    this.playTone(180, 0.08, "triangle", 0.03, 0.02);
  }

  playTreasureCollect() {
    // Underwater sparkle
    this.playTone(660, 0.15, "sine", 0.08);
    this.playTone(880, 0.12, "sine", 0.06, 0.05);
    this.playTone(1100, 0.1, "triangle", 0.05, 0.1);
  }

  playOxygenCollect() {
    // Air bubble burst
    this.playTone(400, 0.12, "sine", 0.07);
    this.playTone(600, 0.1, "sine", 0.05, 0.03);
    this.playTone(800, 0.08, "triangle", 0.04, 0.06);
  }

  playDangerHit() {
    // Warning alarm
    this.playTone(200, 0.2, "sawtooth", 0.08);
    this.playTone(150, 0.15, "sawtooth", 0.06, 0.08);
  }

  playOxygenLow() {
    // Warning beep
    this.playTone(300, 0.1, "sine", 0.05);
    this.playTone(300, 0.1, "sine", 0.05, 0.15);
  }

  playWin() {
    // Surfacing victory
    const melody = [330, 440, 550, 660, 880];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.25, "sine", 0.08, i * 0.1);
      this.playTone(freq * 0.5, 0.2, "triangle", 0.04, i * 0.1);
    });
  }

  playComplete() {
    // Grand ocean finale
    const melody = [262, 330, 392, 523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.1, i * 0.08);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.05, i * 0.08);
    });
  }

  playGameOver() {
    // Sinking sound
    this.playTone(300, 0.3, "sine", 0.08);
    this.playTone(200, 0.3, "sine", 0.06, 0.15);
    this.playTone(100, 0.4, "sine", 0.05, 0.3);
  }

  playLevelStart() {
    // Dive initiation
    this.playTone(440, 0.12, "sine", 0.06);
    this.playTone(350, 0.12, "sine", 0.05, 0.06);
    this.playTone(280, 0.15, "triangle", 0.04, 0.12);
  }

  playReset() {
    // Resurfacing
    this.playTone(200, 0.1, "sine", 0.05);
    this.playTone(300, 0.1, "sine", 0.04, 0.04);
    this.playTone(400, 0.1, "sine", 0.03, 0.08);
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
  game = new DeepSeaGame(canvas);
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

  document.addEventListener("keydown", (e) => {
    if (overlay.style.display !== "none") return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
      e.preventDefault();
      game.handleKey(e.key);
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    depthDisplay.textContent = `${state.depth}m`;
    oxygenDisplay.textContent = `${Math.ceil(state.oxygen)}`;
    treasuresDisplay.textContent = `${state.treasuresCollected}/${state.totalTreasures}`;

    const oxygenPercent = (state.oxygen / state.maxOxygen) * 100;
    oxygenBar.style.width = `${oxygenPercent}%`;

    if (oxygenPercent < 30) {
      oxygenBar.style.background = "linear-gradient(90deg, #e74c3c, #c0392b)";
    } else if (oxygenPercent < 60) {
      oxygenBar.style.background = "linear-gradient(90deg, #f39c12, #d68910)";
    } else {
      oxygenBar.style.background = "linear-gradient(90deg, #3498db, #2980b9)";
    }

    // WebGPU events
    if (renderer) {
      renderer.setDepth(state.depth);

      if (state.playerMove) {
        const nx = state.playerMove.x / canvas.clientWidth;
        const ny = 1 - state.playerMove.y / canvas.clientHeight;
        renderer.emitPlayerMove(nx, ny);
        audio.playMove();
      }

      if (state.treasureCollect) {
        const nx = state.treasureCollect.x / canvas.clientWidth;
        const ny = 1 - state.treasureCollect.y / canvas.clientHeight;
        renderer.emitTreasureCollect(nx, ny);
        audio.playTreasureCollect();
      }

      if (state.oxygenCollect) {
        const nx = state.oxygenCollect.x / canvas.clientWidth;
        const ny = 1 - state.oxygenCollect.y / canvas.clientHeight;
        renderer.emitOxygenCollect(nx, ny);
        audio.playOxygenCollect();
      }

      if (state.dangerHit) {
        const nx = state.dangerHit.x / canvas.clientWidth;
        const ny = 1 - state.dangerHit.y / canvas.clientHeight;
        renderer.emitDangerHit(nx, ny);
        audio.playDangerHit();
      }

      if (state.depthChange) {
        renderer.emitDepthChange(state.depth);
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
    } else if (state.status === "gameOver") {
      renderer?.emitGameOver();
      audio.playGameOver();
      showGameOver();
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

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.reset();
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
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
