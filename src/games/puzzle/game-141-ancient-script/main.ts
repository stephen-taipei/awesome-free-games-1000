/**
 * Ancient Script Main Entry
 * Game #141
 */
import { AncientScriptGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const attemptsDisplay = document.getElementById("attempts-display")!;
const decodedDisplay = document.getElementById("decoded-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;
const submitBtn = document.getElementById("submit-btn")!;

let game: AncientScriptGame;
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
    filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playKeyPress() {
    // Soft mystical key press
    this.playTone(400, 0.08, "sine", 0.06);
    this.playTone(600, 0.06, "triangle", 0.04, 0.02);
  }

  playRuneSelect() {
    // Selecting rune box
    this.playTone(300, 0.1, "sine", 0.05);
    this.playTone(450, 0.08, "triangle", 0.04, 0.03);
  }

  playCorrect() {
    // Correct answer
    this.playTone(523, 0.15, "sine", 0.12);
    this.playTone(659, 0.12, "sine", 0.1, 0.08);
    this.playTone(784, 0.1, "triangle", 0.08, 0.15);
  }

  playWrong() {
    // Wrong answer
    this.playTone(200, 0.2, "sine", 0.08);
    this.playTone(150, 0.15, "sine", 0.06, 0.1);
  }

  playWin() {
    // Level complete melody
    const melody = [392, 523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.25, "sine", 0.12, i * 0.1);
      this.playTone(freq * 0.5, 0.2, "triangle", 0.06, i * 0.1);
    });
  }

  playComplete() {
    // Grand completion fanfare
    const melody = [262, 330, 392, 523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.14, i * 0.1);
      this.playTone(freq * 0.75, 0.25, "triangle", 0.07, i * 0.1);
    });
  }

  playLevelStart() {
    // Mystical scroll opening
    this.playTone(200, 0.2, "sine", 0.06);
    this.playTone(300, 0.15, "sine", 0.05, 0.1);
    this.playTone(400, 0.1, "triangle", 0.04, 0.2);
    this.playTone(500, 0.08, "sine", 0.03, 0.3);
  }

  playReset() {
    // Reset/clear sound
    this.playTone(400, 0.1, "sine", 0.06);
    this.playTone(300, 0.1, "sine", 0.05, 0.04);
    this.playTone(200, 0.1, "sine", 0.04, 0.08);
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
  game = new AncientScriptGame(canvas);
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
    game.handleKey(e.key);
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    attemptsDisplay.textContent = state.attempts.toString();
    decodedDisplay.textContent = `${state.decodedCount}/${state.totalRunes}`;

    // WebGPU events
    if (renderer) {
      if (state.keyPress) {
        const nx = state.keyPress.x / canvas.clientWidth;
        const ny = state.keyPress.y / canvas.clientHeight;
        renderer.emitKeyPress(nx, ny);
        audio.playKeyPress();
      }

      if (state.runeSelect) {
        const nx = state.runeSelect.x / canvas.clientWidth;
        const ny = state.runeSelect.y / canvas.clientHeight;
        renderer.emitRuneGlow(nx, ny);
        audio.playRuneSelect();
      }

      if (state.submitCorrect) {
        const nx = state.submitCorrect.x / canvas.clientWidth;
        const ny = state.submitCorrect.y / canvas.clientHeight;
        renderer.emitSubmitCorrect(nx, ny);
        audio.playCorrect();
      }

      if (state.submitWrong) {
        const nx = state.submitWrong.x / canvas.clientWidth;
        const ny = state.submitWrong.y / canvas.clientHeight;
        renderer.emitSubmitWrong(nx, ny);
        audio.playWrong();
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
submitBtn.addEventListener("click", () => game.submit());

initI18n();
initWebGPU();
initGame();
