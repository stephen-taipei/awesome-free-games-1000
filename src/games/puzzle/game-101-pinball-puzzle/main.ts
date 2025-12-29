/**
 * Pinball Puzzle Main Entry
 * Game #101 - With WebGPU Effects
 */
import { PinballGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System for Pinball / Arcade sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      this.audioContext = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.15
  ) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Ball launch - spring release
  playLaunch() {
    if (!this.audioContext) return;

    // Spring tension release
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);

    // Pop
    this.playTone(600, 0.1, "square", 0.08);
  }

  // Bumper hit - boing!
  playBumper() {
    if (!this.audioContext) return;

    // Boing sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);

    // Impact
    this.playTone(150, 0.05, "triangle", 0.1);
  }

  // Target hit - ding!
  playTarget(points: number) {
    if (!this.audioContext) return;

    // Pitch based on points
    const basePitch = 600 + (points / 100) * 200;

    this.playTone(basePitch, 0.15, "sine", 0.12);
    setTimeout(() => {
      this.playTone(basePitch * 1.25, 0.1, "sine", 0.1);
    }, 60);

    // Arcade ding
    this.playTone(1200, 0.1, "triangle", 0.08);
  }

  // Flipper action
  playFlipper() {
    if (!this.audioContext) return;

    // Mechanical clunk
    this.playTone(200, 0.05, "square", 0.1);
    this.playTone(100, 0.08, "triangle", 0.08);
  }

  // Ball lost
  playBallLost() {
    if (!this.audioContext) return;

    // Descending tone
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(400 - i * 80, 0.15, "sine", 0.1);
      }, i * 80);
    }

    // Thud
    setTimeout(() => {
      this.playTone(80, 0.2, "triangle", 0.12);
    }, 300);
  }

  // Victory - all targets hit!
  playVictory() {
    if (!this.audioContext) return;

    const melody = [523, 659, 784, 1047, 1319, 1568, 1319, 1568, 2093];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.12);
        if (i > 4) {
          this.playTone(freq * 0.5, 0.15, "triangle", 0.06);
        }
      }, i * 80);
    });

    // Celebration jingles
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(1000 + Math.random() * 1000, 0.1, "sine", 0.08);
      }, 500 + i * 100);
    }
  }

  // Game over
  playGameOver() {
    if (!this.audioContext) return;

    // Sad trombone
    const notes = [392, 370, 349, 330];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine", 0.12);
      }, i * 200);
    });
  }

  // Level start
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(400, 0.1, "sine", 0.1);
    setTimeout(() => this.playTone(500, 0.1, "sine", 0.12), 100);
    setTimeout(() => this.playTone(600, 0.15, "sine", 0.14), 200);
  }

  // Reset
  playReset() {
    if (!this.audioContext) return;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(500 - i * 100, 0.08, "triangle", 0.08);
      }, i * 60);
    }
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const ballsDisplay = document.getElementById("balls-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const launchBtn = document.getElementById("launch-btn")!;
const leftFlipperBtn = document.getElementById("left-flipper")!;
const rightFlipperBtn = document.getElementById("right-flipper")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: PinballGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();
let previousScore = 0;
let previousBalls = 3;

function initI18n(): void {
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

async function initWebGPU(): Promise<void> {
  if (!webgpuCanvas) return;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.init();

  if (!success) {
    console.warn("WebGPU not available, running without effects");
    webgpuRenderer = null;
  } else {
    resizeWebGPU();
  }
}

function resizeWebGPU(): void {
  if (webgpuRenderer && webgpuCanvas.parentElement) {
    const rect = webgpuCanvas.parentElement.getBoundingClientRect();
    webgpuRenderer.resize(rect.width, rect.height);
  }
}

function initGame(): void {
  resizeCanvas();

  game = new PinballGame(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    // Emit ball trail
    if (state.ball.active && webgpuRenderer) {
      webgpuRenderer.emitBallTrail(
        state.ball.pos.x,
        state.ball.pos.y,
        state.ball.vel.x,
        state.ball.vel.y
      );
    }

    // Check for score changes (target/bumper hit)
    if (state.score > previousScore && state.status === "playing") {
      const diff = state.score - previousScore;
      if (diff === 10) {
        // Bumper hit
        audioSystem.playBumper();
      } else if (diff >= 100) {
        // Target hit
        audioSystem.playTarget(diff);
      }
    }
    previousScore = state.score;

    // Check for ball lost
    if (state.balls < previousBalls && state.status === "playing") {
      audioSystem.playBallLost();
      webgpuRenderer?.emitBallLost(state.ball.pos.x, state.ball.pos.y);
    }
    previousBalls = state.balls;

    if (state.status === "won") {
      audioSystem.playVictory();
      webgpuRenderer?.emitVictory();
      setTimeout(() => showWinOverlay(), 500);
    } else if (state.status === "lost") {
      audioSystem.playGameOver();
      setTimeout(() => showLostOverlay(), 500);
    }
  };

  window.addEventListener("resize", () => {
    resizeCanvas();
    game.resize(canvas.width, canvas.height);
    resizeWebGPU();
  });

  // Keyboard controls
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);

  // Button controls
  leftFlipperBtn.addEventListener("mousedown", () => {
    audioSystem.init();
    audioSystem.playFlipper();
    game.setFlipper("left", true);
    leftFlipperBtn.classList.add("active");
    emitFlipperEffect("left");
  });
  leftFlipperBtn.addEventListener("mouseup", () => {
    game.setFlipper("left", false);
    leftFlipperBtn.classList.remove("active");
  });
  leftFlipperBtn.addEventListener("mouseleave", () => {
    game.setFlipper("left", false);
    leftFlipperBtn.classList.remove("active");
  });

  rightFlipperBtn.addEventListener("mousedown", () => {
    audioSystem.init();
    audioSystem.playFlipper();
    game.setFlipper("right", true);
    rightFlipperBtn.classList.add("active");
    emitFlipperEffect("right");
  });
  rightFlipperBtn.addEventListener("mouseup", () => {
    game.setFlipper("right", false);
    rightFlipperBtn.classList.remove("active");
  });
  rightFlipperBtn.addEventListener("mouseleave", () => {
    game.setFlipper("right", false);
    rightFlipperBtn.classList.remove("active");
  });

  // Touch support
  leftFlipperBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    audioSystem.init();
    audioSystem.playFlipper();
    game.setFlipper("left", true);
    leftFlipperBtn.classList.add("active");
    emitFlipperEffect("left");
  });
  leftFlipperBtn.addEventListener("touchend", () => {
    game.setFlipper("left", false);
    leftFlipperBtn.classList.remove("active");
  });

  rightFlipperBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    audioSystem.init();
    audioSystem.playFlipper();
    game.setFlipper("right", true);
    rightFlipperBtn.classList.add("active");
    emitFlipperEffect("right");
  });
  rightFlipperBtn.addEventListener("touchend", () => {
    game.setFlipper("right", false);
    rightFlipperBtn.classList.remove("active");
  });
}

function emitFlipperEffect(side: "left" | "right"): void {
  const state = game.getState();
  const flipper = state.flippers.find(f => f.side === side);
  if (!flipper || !webgpuRenderer) return;

  const endX = flipper.pos.x + Math.cos(flipper.angle) * flipper.length;
  const endY = flipper.pos.y + Math.sin(flipper.angle) * flipper.length;
  webgpuRenderer.emitFlipperAction(flipper.pos.x, flipper.pos.y, endX, endY);
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 500;
}

function handleKeydown(e: KeyboardEvent): void {
  switch (e.key.toLowerCase()) {
    case "a":
    case "z":
    case "arrowleft":
      audioSystem.init();
      audioSystem.playFlipper();
      game.setFlipper("left", true);
      leftFlipperBtn.classList.add("active");
      emitFlipperEffect("left");
      break;
    case "l":
    case "/":
    case "arrowright":
      audioSystem.init();
      audioSystem.playFlipper();
      game.setFlipper("right", true);
      rightFlipperBtn.classList.add("active");
      emitFlipperEffect("right");
      break;
    case " ":
      e.preventDefault();
      handleLaunch();
      break;
  }
}

function handleKeyup(e: KeyboardEvent): void {
  switch (e.key.toLowerCase()) {
    case "a":
    case "z":
    case "arrowleft":
      game.setFlipper("left", false);
      leftFlipperBtn.classList.remove("active");
      break;
    case "l":
    case "/":
    case "arrowright":
      game.setFlipper("right", false);
      rightFlipperBtn.classList.remove("active");
      break;
  }
}

function handleLaunch(): void {
  audioSystem.init();
  const state = game.getState();
  if (!state.ball.active) {
    audioSystem.playLaunch();
    webgpuRenderer?.emitLaunch(state.width - 30, state.height - 100);
  }
  game.launch();
}

function render(state: GameState): void {
  const { width, height, ball, targets, bumpers, flippers } = state;

  // Clear
  ctx.fillStyle = "rgba(45, 27, 78, 0.3)";
  ctx.fillRect(0, 0, width, height);

  // Draw launch lane
  ctx.fillStyle = "#1a0a30";
  ctx.fillRect(width - 50, 0, 50, height);
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(width - 50, 0, 50, height);

  // Draw targets
  targets.forEach((target) => {
    ctx.beginPath();
    ctx.arc(target.pos.x, target.pos.y, target.radius, 0, Math.PI * 2);

    if (target.hit) {
      ctx.fillStyle = "rgba(255, 217, 61, 0.3)";
      ctx.strokeStyle = "#666";
    } else {
      ctx.fillStyle = "#ffd93d";
      ctx.strokeStyle = "#ffeb3b";
      ctx.shadowColor = "#ffd93d";
      ctx.shadowBlur = 15;
    }

    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Points text
    if (!target.hit) {
      ctx.fillStyle = "#333";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.points.toString(), target.pos.x, target.pos.y);
    }
  });

  // Draw bumpers
  bumpers.forEach((bumper) => {
    ctx.beginPath();
    ctx.arc(bumper.pos.x, bumper.pos.y, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#6bcb77";
    ctx.strokeStyle = "#9fe2a5";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#6bcb77";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Draw flippers
  flippers.forEach((flipper) => {
    const endX = flipper.pos.x + Math.cos(flipper.angle) * flipper.length;
    const endY = flipper.pos.y + Math.sin(flipper.angle) * flipper.length;

    ctx.beginPath();
    ctx.moveTo(flipper.pos.x, flipper.pos.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pivot
    ctx.beginPath();
    ctx.arc(flipper.pos.x, flipper.pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#cc5555";
    ctx.fill();
  });

  // Draw ball
  if (ball.active || state.status === "waiting") {
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(
      ball.pos.x - 3,
      ball.pos.y - 3,
      0,
      ball.pos.x,
      ball.pos.y,
      ball.radius
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#c0c0c0");
    gradient.addColorStop(1, "#808080");

    ctx.fillStyle = gradient;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw drain zone
  ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
  ctx.fillRect(50, height - 20, width - 100, 20);
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  scoreDisplay.textContent = state.score.toString();
  ballsDisplay.textContent = state.balls.toString();
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = `${i18n.t("game.complete")} - ${i18n.t("game.score")}: ${state.score}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.score")}: ${state.score}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
      previousScore = 0;
      previousBalls = 3;
      audioSystem.playLevelStart();
      webgpuRenderer?.emitLevelStart();
    };
  }
}

function showLostOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${game.getState().score}`;
  startBtn.textContent = i18n.t("game.tryAgain");
  startBtn.onclick = () => startGame(game.getState().level);
}

function startGame(level: number = 1): void {
  audioSystem.init();
  overlay.style.display = "none";
  game.start(level);
  previousScore = 0;
  previousBalls = 3;
  audioSystem.playLevelStart();
  webgpuRenderer?.emitLevelStart();
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  audioSystem.init();
  game.reset();
  previousScore = 0;
  previousBalls = 3;
  audioSystem.playReset();
  webgpuRenderer?.emitReset();
});
launchBtn.addEventListener("click", handleLaunch);

// Initialize
initI18n();
initWebGPU().then(() => {
  initGame();
});
