/**
 * Candy Factory Main Entry
 * Game #075
 */
import { CandyFactoryGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;
const goBtn = document.getElementById("go-btn")!;

const targetsContainer = document.getElementById("targets-container")!;

let game: CandyFactoryGame;
let renderer: WebGPURenderer | null = null;
let animationId: number;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  playSpawn() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playDelivered() {
    const ctx = this.init();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 0.3);
    });
  }

  playWrong() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playSwitch() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  playFactoryToggle() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playVictory() {
    const ctx = this.init();
    [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + 0.6);
    });
  }

  playReset() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
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
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer();
  const success = await renderer.initialize(webgpuCanvas);

  if (success) {
    function animate() {
      renderer?.render();
      animationId = requestAnimationFrame(animate);
    }
    animate();
  }
}

function getCanvasCoords(x: number, y: number): { x: number; y: number } {
  const rect = webgpuCanvas?.getBoundingClientRect() || canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio, 2);
  return {
    x: x * dpr,
    y: y * dpr,
  };
}

function initGame() {
  game = new CandyFactoryGame(canvas);
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
    scoreDisplay.textContent = state.score?.toString() || "0";

    // Update go button text
    if (state.isRunning) {
      goBtn.textContent = i18n.t("game.stop");
      goBtn.classList.remove("go");
      goBtn.classList.add("stop");
    } else {
      goBtn.textContent = i18n.t("game.go");
      goBtn.classList.remove("stop");
      goBtn.classList.add("go");
    }

    // Update renderer running state
    if (renderer) {
      renderer.setRunning(state.isRunning || false);
    }

    // Update targets display
    if (state.exits) {
      updateTargetsDisplay(state.exits);
    }

    // Handle events for WebGPU effects
    if (state.event && renderer) {
      const centerX = webgpuCanvas?.width / 2 || 200;
      const centerY = webgpuCanvas?.height / 2 || 200;

      switch (state.event) {
        case "candySpawn": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitCandySpawn(pos.x, pos.y, state.colorIndex || 0);
          audio.playSpawn();
          break;
        }
        case "candyDelivered": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitCandyDelivered(pos.x, pos.y, state.colorIndex || 0);
          audio.playDelivered();
          break;
        }
        case "candyWrong": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitCandyWrong(pos.x, pos.y);
          audio.playWrong();
          break;
        }
        case "switchToggle": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitSwitchToggle(pos.x, pos.y);
          audio.playSwitch();
          break;
        }
        case "factoryToggle":
          renderer.emitFactoryToggle(centerX, centerY);
          audio.playFactoryToggle();
          break;
        case "victory":
          renderer.emitVictory();
          audio.playVictory();
          break;
        case "levelStart":
          renderer.emitLevelStart();
          break;
        case "reset":
          renderer.emitReset();
          audio.playReset();
          break;
        case "gameComplete":
          renderer.emitGameComplete();
          audio.playVictory();
          break;
      }
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "complete") {
      showComplete();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function updateTargetsDisplay(exits: any[]) {
  const colorNames: Record<string, string> = {
    red: "#e74c3c",
    blue: "#3498db",
    green: "#2ecc71",
    yellow: "#f1c40f",
  };

  targetsContainer.innerHTML = exits
    .map(
      (exit) => `
    <div class="target-item" style="border-color: ${colorNames[exit.color]}">
      <div class="target-color" style="background: ${colorNames[exit.color]}"></div>
      <span>${exit.count}/${exit.target}</span>
    </div>
  `
    )
    .join("");
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.score}`;
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.score}`;
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
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
});
goBtn.addEventListener("click", () => game.toggleRunning());

initI18n();
initGame();
initWebGPU();
