/**
 * Space Invaders Main Entry
 * Game #155
 */
import { SpaceInvadersGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnFire = document.getElementById("btn-fire")!;

let game: SpaceInvadersGame;
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
    type: OscillatorType = "square",
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
    filter.frequency.setValueAtTime(3000, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playShoot() {
    // Classic laser sound
    this.playTone(880, 0.1, "square", 0.04);
    this.playTone(440, 0.05, "square", 0.03, 0.02);
  }

  playAlienDeath(alienType: number) {
    // Different pitch based on alien type
    const baseFreq = 200 + alienType * 100;
    this.playTone(baseFreq, 0.15, "sawtooth", 0.05);
    this.playTone(baseFreq * 0.5, 0.1, "square", 0.04, 0.05);
    this.playTone(baseFreq * 0.25, 0.15, "triangle", 0.03, 0.1);
  }

  playPlayerHit() {
    // Damage sound
    this.playTone(150, 0.2, "sawtooth", 0.06);
    this.playTone(100, 0.3, "square", 0.05, 0.1);
    this.playTone(60, 0.4, "triangle", 0.04, 0.2);
  }

  playBarrierHit() {
    // Debris sound
    this.playTone(200, 0.08, "square", 0.03);
    this.playTone(150, 0.06, "square", 0.02, 0.02);
  }

  playGameOver() {
    // Dramatic descending tones
    for (let i = 0; i < 5; i++) {
      this.playTone(400 - i * 60, 0.2, "sawtooth", 0.05, i * 0.15);
    }
    this.playTone(60, 0.5, "triangle", 0.06, 0.75);
  }

  playLevelComplete() {
    // Victory fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.15, "square", 0.04, i * 0.1);
    });
    this.playTone(1047, 0.3, "sine", 0.05, 0.45);
  }

  playStart() {
    // Ready sound
    this.playTone(262, 0.1, "square", 0.04);
    this.playTone(330, 0.1, "square", 0.04, 0.08);
    this.playTone(392, 0.1, "square", 0.04, 0.16);
    this.playTone(523, 0.15, "square", 0.05, 0.24);
  }

  playAlienMove() {
    // Classic marching sound
    this.playTone(80, 0.05, "square", 0.02);
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
      }, 300);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new SpaceInvadersGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      game.shoot();
    }
    game.setKey(e.key, true);
  });

  document.addEventListener("keyup", (e) => {
    game.setKey(e.key, false);
  });

  // Mobile button controls
  let leftInterval: number | null = null;
  let rightInterval: number | null = null;

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.movePlayer("left");
    leftInterval = window.setInterval(() => game.movePlayer("left"), 50);
  });

  btnLeft.addEventListener("touchend", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.movePlayer("right");
    rightInterval = window.setInterval(() => game.movePlayer("right"), 50);
  });

  btnRight.addEventListener("touchend", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnFire.addEventListener("click", () => game.shoot());

  // Mouse click for desktop
  btnLeft.addEventListener("mousedown", () => {
    game.movePlayer("left");
    leftInterval = window.setInterval(() => game.movePlayer("left"), 50);
  });

  btnLeft.addEventListener("mouseup", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnLeft.addEventListener("mouseleave", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("mousedown", () => {
    game.movePlayer("right");
    rightInterval = window.setInterval(() => game.movePlayer("right"), 50);
  });

  btnRight.addEventListener("mouseup", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnRight.addEventListener("mouseleave", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();
    levelDisplay.textContent = state.level.toString();

    // Update WebGPU renderer and play sounds
    if (state.playerShoot) {
      renderer?.emitPlayerShoot(state.playerShoot.x, state.playerShoot.y);
      audio.playShoot();
    }

    if (state.alienDeath) {
      renderer?.emitAlienDeath(state.alienDeath.x, state.alienDeath.y, state.alienDeath.type);
      audio.playAlienDeath(state.alienDeath.type);
    }

    if (state.playerHit && state.status !== "over") {
      renderer?.emitPlayerHit(state.playerHit.x, state.playerHit.y);
      audio.playPlayerHit();
    }

    if (state.barrierHit) {
      renderer?.emitBarrierHit(state.barrierHit.x, state.barrierHit.y);
      audio.playBarrierHit();
    }

    if (state.bulletTrail) {
      renderer?.emitBulletTrail(state.bulletTrail.x, state.bulletTrail.y, state.bulletTrail.isPlayer);
    }

    if (state.status === "over") {
      if (state.gameOver) {
        renderer?.emitGameOver(state.gameOver.x, state.gameOver.y);
      }
      audio.playGameOver();
      showGameOver(state.score);
    } else if (state.status === "levelComplete") {
      if (state.levelComplete) {
        renderer?.emitLevelComplete();
        audio.playLevelComplete();
      }
      showLevelComplete(state.level);
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
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.start();
      renderer?.emitGameStart();
      audio.playStart();
    };
  }, 300);
}

function showLevelComplete(level: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = `${i18n.t("game.level")} ${level} ${i18n.t("game.win")}`;
    overlayMsg.textContent = i18n.t("game.nextLevel");
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
      renderer?.emitGameStart();
      audio.playStart();
    };
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
