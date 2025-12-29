/**
 * Yin Yang Balance Main Entry
 * Game #074
 */
import { YinYangGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const balanceDisplay = document.getElementById("balance-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

const yinBtn = document.getElementById("yin-btn")!;
const yangBtn = document.getElementById("yang-btn")!;
const yinCount = document.getElementById("yin-count")!;
const yangCount = document.getElementById("yang-count")!;

let game: YinYangGame;
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

  playPlace(isYin: boolean) {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = isYin ? "sine" : "triangle";
    osc.frequency.setValueAtTime(isYin ? 220 : 440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isYin ? 110 : 880, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  playBalance() {
    const ctx = this.init();
    // Harmonious chord
    [261.63, 329.63, 392.00].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 0.5);
    });
  }

  playImbalance() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playSelect() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  playVictory() {
    const ctx = this.init();
    // Ascending harmony
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

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = webgpuCanvas?.getBoundingClientRect() || canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio, 2);
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
}

function initGame() {
  game = new YinYangGame(canvas);
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

    // Update balance display
    const balancePercent = Math.round(Math.abs(state.balance || 0) * 100);
    if (balancePercent === 0) {
      balanceDisplay.textContent = "0%";
      balanceDisplay.style.color = "#27ae60";
    } else if (state.balance > 0) {
      balanceDisplay.textContent = `+${balancePercent}%`;
      balanceDisplay.style.color = "#e74c3c";
    } else {
      balanceDisplay.textContent = `-${balancePercent}%`;
      balanceDisplay.style.color = "#e74c3c";
    }

    // Update renderer balance
    if (renderer) {
      renderer.setBalance(state.balance || 0);
    }

    // Update element counts
    if (state.availableYin !== undefined) {
      yinCount.textContent = `${state.placedYin || 0}/${state.availableYin}`;
      yangCount.textContent = `${state.placedYang || 0}/${state.availableYang}`;
    }

    // Update selection buttons
    if (state.selectedType === "yin") {
      yinBtn.classList.add("selected");
      yangBtn.classList.remove("selected");
    } else {
      yangBtn.classList.add("selected");
      yinBtn.classList.remove("selected");
    }

    // Handle events for WebGPU effects
    if (state.event && renderer) {
      const centerX = webgpuCanvas?.width / 2 || 200;
      const centerY = webgpuCanvas?.height / 2 || 200;

      switch (state.event) {
        case "elementPlace": {
          const isYin = state.elementType === "yin";
          const pos = getCanvasCoords(state.clientX || 0, state.clientY || 0);
          renderer.emitElementPlace(state.x || pos.x, state.y || pos.y, isYin);
          audio.playPlace(isYin);
          break;
        }
        case "balanceAchieved":
          renderer.emitBalanceAchieved(centerX, centerY);
          audio.playBalance();
          break;
        case "imbalance":
          renderer.emitImbalance(centerX, centerY);
          audio.playImbalance();
          break;
        case "typeSelect": {
          const isYin = state.selectedType === "yin";
          renderer.emitTypeSelect(centerX, centerY, isYin);
          audio.playSelect();
          break;
        }
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
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
});

yinBtn.addEventListener("click", () => game.selectType("yin"));
yangBtn.addEventListener("click", () => game.selectType("yang"));

initI18n();
initGame();
initWebGPU();
