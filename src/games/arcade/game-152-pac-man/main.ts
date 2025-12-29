/**
 * Pac-Man Main Entry
 * Game #152
 */
import { PacManGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const livesDisplay = document.getElementById("lives-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: PacManGame;
let renderer: WebGPURenderer | null = null;
let ambientInterval: number | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private wakaToggle = false;

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
    filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playWaka() {
    // Classic waka-waka sound
    this.wakaToggle = !this.wakaToggle;
    const freq = this.wakaToggle ? 400 : 300;
    this.playTone(freq, 0.08, "square", 0.04);
  }

  playDotEat() {
    this.playWaka();
  }

  playPowerUp() {
    // Rising arpeggio
    this.playTone(200, 0.1, "sine", 0.08);
    this.playTone(300, 0.1, "sine", 0.07, 0.05);
    this.playTone(400, 0.1, "sine", 0.06, 0.1);
    this.playTone(500, 0.15, "sine", 0.08, 0.15);
    // Bass
    this.playTone(80, 0.3, "triangle", 0.1);
  }

  playGhostEat() {
    // Satisfying crunch
    this.playTone(300, 0.08, "sawtooth", 0.06);
    this.playTone(400, 0.08, "sawtooth", 0.05, 0.04);
    this.playTone(600, 0.1, "sine", 0.07, 0.08);
    this.playTone(100, 0.15, "triangle", 0.08);
  }

  playDeath() {
    // Descending tones
    this.playTone(500, 0.15, "sawtooth", 0.06);
    this.playTone(400, 0.15, "sawtooth", 0.05, 0.1);
    this.playTone(300, 0.15, "sawtooth", 0.04, 0.2);
    this.playTone(200, 0.2, "sawtooth", 0.04, 0.3);
    this.playTone(100, 0.3, "triangle", 0.05, 0.4);
  }

  playWin() {
    // Victory fanfare
    for (let i = 0; i < 8; i++) {
      this.playTone(300 + i * 50, 0.1, "sine", 0.05, i * 0.08);
    }
    this.playTone(700, 0.4, "sine", 0.08, 0.6);
  }

  playStart() {
    // Classic start jingle
    this.playTone(262, 0.12, "sine", 0.06); // C4
    this.playTone(330, 0.12, "sine", 0.055, 0.1); // E4
    this.playTone(392, 0.12, "sine", 0.05, 0.2); // G4
    this.playTone(523, 0.2, "sine", 0.06, 0.3); // C5
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
      }, 200);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new PacManGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.setDirection("up");
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.setDirection("down");
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setDirection("left");
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setDirection("right");
        break;
    }
  });

  // Mobile controls
  btnUp.addEventListener("click", () => game.setDirection("up"));
  btnDown.addEventListener("click", () => game.setDirection("down"));
  btnLeft.addEventListener("click", () => game.setDirection("left"));
  btnRight.addEventListener("click", () => game.setDirection("right"));

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) game.setDirection("right");
      else if (dx < -30) game.setDirection("left");
    } else {
      if (dy > 30) game.setDirection("down");
      else if (dy < -30) game.setDirection("up");
    }
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();

    // Update WebGPU renderer and play sounds
    if (renderer) {
      if (state.dotEat) {
        const nx = state.dotEat.x / canvas.clientWidth;
        const ny = 1 - state.dotEat.y / canvas.clientHeight;
        renderer.emitDotEat(nx, ny);
        audio.playDotEat();
      }

      if (state.powerUp) {
        const nx = state.powerUp.x / canvas.clientWidth;
        const ny = 1 - state.powerUp.y / canvas.clientHeight;
        renderer.emitPowerUp(nx, ny);
        audio.playPowerUp();
      }

      if (state.powerEnd) {
        renderer.emitPowerEnd();
      }

      if (state.ghostEat) {
        const nx = state.ghostEat.x / canvas.clientWidth;
        const ny = 1 - state.ghostEat.y / canvas.clientHeight;
        renderer.emitGhostEat(nx, ny, state.ghostEat.ghostIndex);
        audio.playGhostEat();
      }

      if (state.pacmanMove) {
        const nx = state.pacmanMove.x / canvas.clientWidth;
        const ny = 1 - state.pacmanMove.y / canvas.clientHeight;
        renderer.emitPacmanMove(nx, ny);
      }

      if (state.ghostMoves) {
        for (const move of state.ghostMoves) {
          const nx = move.x / canvas.clientWidth;
          const ny = 1 - move.y / canvas.clientHeight;
          renderer.emitGhostMove(nx, ny, move.ghostIndex);
        }
      }
    }

    if (state.gameOver && state.status !== "over") {
      if (renderer) {
        const nx = state.gameOver.x / canvas.clientWidth;
        const ny = 1 - state.gameOver.y / canvas.clientHeight;
        renderer.emitGameOver(nx, ny);
      }
      audio.playDeath();
    }

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "won") {
      if (state.win) {
        renderer?.emitWin();
        audio.playWin();
      }
      showWin(state.score);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function showWin(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitGameStart();
  audio.playStart();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initWebGPU();
initGame();
