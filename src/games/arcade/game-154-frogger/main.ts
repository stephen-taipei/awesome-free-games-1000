/**
 * Frogger Main Entry
 * Game #154
 */
import { FroggerGame } from "./game";
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

let game: FroggerGame;
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
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playHop() {
    // Bouncy hop sound
    this.playTone(350, 0.08, "sine", 0.05);
    this.playTone(500, 0.06, "sine", 0.04, 0.03);
  }

  playSplash(isDeath: boolean = false) {
    if (isDeath) {
      // Dramatic splash
      this.playTone(200, 0.2, "sawtooth", 0.04);
      this.playTone(150, 0.3, "sine", 0.05, 0.1);
      this.playTone(100, 0.4, "triangle", 0.03, 0.2);
    } else {
      // Gentle splash
      this.playTone(300, 0.1, "sine", 0.03);
      this.playTone(250, 0.15, "sine", 0.02, 0.05);
    }
  }

  playCarHit() {
    // Horn + crash
    this.playTone(400, 0.15, "sawtooth", 0.06);
    this.playTone(300, 0.1, "square", 0.05, 0.05);
    this.playTone(150, 0.2, "triangle", 0.04, 0.1);
  }

  playGoalReach() {
    // Victory chime
    this.playTone(523, 0.1, "sine", 0.05);
    this.playTone(659, 0.1, "sine", 0.05, 0.08);
    this.playTone(784, 0.15, "sine", 0.06, 0.16);
    this.playTone(1047, 0.2, "sine", 0.05, 0.26);
  }

  playLogRide() {
    // Subtle water/wood sound
    this.playTone(120, 0.05, "sine", 0.02);
  }

  playLifeLost() {
    // Sad descend
    this.playTone(400, 0.15, "sawtooth", 0.05);
    this.playTone(300, 0.15, "sawtooth", 0.04, 0.1);
    this.playTone(200, 0.2, "triangle", 0.04, 0.2);
  }

  playGameOver() {
    // Dramatic end
    this.playTone(500, 0.2, "sawtooth", 0.06);
    this.playTone(400, 0.2, "sawtooth", 0.05, 0.15);
    this.playTone(300, 0.2, "sawtooth", 0.05, 0.3);
    this.playTone(200, 0.3, "sawtooth", 0.04, 0.45);
    this.playTone(100, 0.4, "triangle", 0.05, 0.6);
  }

  playVictory() {
    // Triumphant fanfare
    for (let i = 0; i < 8; i++) {
      this.playTone(262 + i * 50, 0.1, "sine", 0.04, i * 0.06);
    }
    this.playTone(784, 0.3, "sine", 0.06, 0.5);
    this.playTone(1047, 0.4, "sine", 0.05, 0.65);
  }

  playStart() {
    // Ready go!
    this.playTone(262, 0.1, "sine", 0.05);
    this.playTone(330, 0.1, "sine", 0.05, 0.08);
    this.playTone(392, 0.1, "sine", 0.05, 0.16);
    this.playTone(523, 0.15, "sine", 0.06, 0.24);
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
  game = new FroggerGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      game.move("up");
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      game.move("down");
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      game.move("left");
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      game.move("right");
    }
  });

  // Mobile button controls
  btnUp.addEventListener("click", () => game.move("up"));
  btnDown.addEventListener("click", () => game.move("down"));
  btnLeft.addEventListener("click", () => game.move("left"));
  btnRight.addEventListener("click", () => game.move("right"));

  // Touch swipe controls
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > minSwipe) game.move("right");
      else if (dx < -minSwipe) game.move("left");
    } else {
      if (dy > minSwipe) game.move("down");
      else if (dy < -minSwipe) game.move("up");
    }
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();

    // Update WebGPU renderer and play sounds
    if (state.frogHop) {
      renderer?.emitFrogHop(state.frogHop.x, state.frogHop.y);
      audio.playHop();
    }

    if (state.splash) {
      renderer?.emitSplash(state.splash.x, state.splash.y, state.splash.isDeath);
      audio.playSplash(state.splash.isDeath);
    }

    if (state.carHit) {
      renderer?.emitCarHit(state.carHit.x, state.carHit.y);
      audio.playCarHit();
    }

    if (state.goalReach) {
      renderer?.emitGoalReach(state.goalReach.x, state.goalReach.y);
      audio.playGoalReach();
    }

    if (state.logRide) {
      renderer?.emitLogRide(state.logRide.x, state.logRide.y);
      // audio.playLogRide(); // Too frequent, can be annoying
    }

    if (state.lifeLost && state.status !== "over") {
      audio.playLifeLost();
    }

    if (state.status === "over") {
      if (state.gameOver) {
        renderer?.emitGameOver(state.gameOver.x, state.gameOver.y);
      }
      audio.playGameOver();
      showGameOver(state.score);
    } else if (state.status === "won") {
      if (state.victory) {
        renderer?.emitVictory();
        audio.playVictory();
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
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function showWin(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
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
