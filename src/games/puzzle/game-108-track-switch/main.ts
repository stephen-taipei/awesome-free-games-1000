/**
 * Track Switch Main Entry
 * Game #108 - Railway / Industrial Theme
 * WebGPU Enhanced
 */
import { TrackSwitchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.3;
    this.gainNode.connect(this.ctx.destination);
  }

  private playTone(freq: number, type: OscillatorType, duration: number, attack: number = 0.01) {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Switch toggle - mechanical click
  playSwitch() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Mechanical clunk
    const clunk = this.ctx.createOscillator();
    const clunkGain = this.ctx.createGain();
    clunk.type = "square";
    clunk.frequency.setValueAtTime(150, this.ctx.currentTime);
    clunk.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);
    clunkGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    clunkGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    clunk.connect(clunkGain);
    clunkGain.connect(this.gainNode);
    clunk.start();
    clunk.stop(this.ctx.currentTime + 0.12);

    // Metal ping
    setTimeout(() => {
      this.playTone(800, "sine", 0.1);
    }, 60);
  }

  // Train chug sound
  playTrain() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Chug rhythm
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const chug = this.ctx!.createOscillator();
        const chugGain = this.ctx!.createGain();
        chug.type = "sawtooth";
        chug.frequency.value = 80 + i * 10;
        chugGain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
        chugGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.15);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 300;

        chug.connect(filter);
        filter.connect(chugGain);
        chugGain.connect(this.gainNode!);
        chug.start();
        chug.stop(this.ctx!.currentTime + 0.15);
      }, i * 150);
    }
  }

  // Crash sound
  playCrash() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Metallic crash
    const crash = this.ctx.createOscillator();
    const crashGain = this.ctx.createGain();
    crash.type = "sawtooth";
    crash.frequency.setValueAtTime(400, this.ctx.currentTime);
    crash.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    crashGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    crashGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
    crash.connect(crashGain);
    crashGain.connect(this.gainNode);
    crash.start();
    crash.stop(this.ctx.currentTime + 0.6);

    // Impact thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(60, this.ctx.currentTime);
    thud.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    thudGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    thudGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    thud.connect(thudGain);
    thudGain.connect(this.gainNode);
    thud.start();
    thud.stop(this.ctx.currentTime + 0.4);
  }

  // Reset - signal change
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Bell ding
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell.type = "sine";
    bell.frequency.value = 600;
    bellGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    bellGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    bell.connect(bellGain);
    bellGain.connect(this.gainNode);
    bell.start();
    bell.stop(this.ctx.currentTime + 0.4);

    // Switch reset
    setTimeout(() => {
      this.playTone(200, "triangle", 0.2);
    }, 200);
  }

  // Victory - train whistle
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Train whistle chord
    const whistleFreqs = [440, 554, 659]; // A major chord
    whistleFreqs.forEach((freq, i) => {
      setTimeout(() => {
        const whistle = this.ctx!.createOscillator();
        const whistleGain = this.ctx!.createGain();
        whistle.type = "sawtooth";
        whistle.frequency.value = freq;

        whistleGain.gain.setValueAtTime(0, this.ctx!.currentTime);
        whistleGain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + 0.1);
        whistleGain.gain.setValueAtTime(0.2, this.ctx!.currentTime + 0.6);
        whistleGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 1.0);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = freq;
        filter.Q.value = 5;

        whistle.connect(filter);
        filter.connect(whistleGain);
        whistleGain.connect(this.gainNode!);
        whistle.start();
        whistle.stop(this.ctx!.currentTime + 1.0);
      }, i * 50);
    });

    // Celebration bells
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(800 + i * 100, "sine", 0.2);
      }, 1000 + i * 150);
    }
  }

  // Level start - station bell
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Station bell
    for (let i = 0; i < 2; i++) {
      setTimeout(() => {
        const bell = this.ctx!.createOscillator();
        const bellGain = this.ctx!.createGain();
        bell.type = "sine";
        bell.frequency.value = 700;
        bellGain.gain.setValueAtTime(0.25, this.ctx!.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.5);
        bell.connect(bellGain);
        bellGain.connect(this.gainNode!);
        bell.start();
        bell.stop(this.ctx!.currentTime + 0.5);
      }, i * 300);
    }

    // Steam release
    setTimeout(() => {
      const steam = this.ctx!.createOscillator();
      const steamGain = this.ctx!.createGain();
      steam.type = "sawtooth";
      steam.frequency.setValueAtTime(100, this.ctx!.currentTime);
      steam.frequency.linearRampToValueAtTime(50, this.ctx!.currentTime + 0.4);
      steamGain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
      steamGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.5);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 200;

      steam.connect(filter);
      filter.connect(steamGain);
      steamGain.connect(this.gainNode!);
      steam.start();
      steam.stop(this.ctx!.currentTime + 0.5);
    }, 500);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const trainsDisplay = document.getElementById("trains-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: TrackSwitchGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (success) {
    resizeWebGPU();
    renderer.emitLevelStart();
  }
}

function resizeWebGPU() {
  if (!renderer || !webgpuCanvas) return;
  const container = webgpuCanvas.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    webgpuCanvas.width = rect.width * window.devicePixelRatio;
    webgpuCanvas.height = rect.height * window.devicePixelRatio;
    renderer.resize(webgpuCanvas.width, webgpuCanvas.height);
  }
}

function initI18n() {
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

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new TrackSwitchGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU switch effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitSwitch(x * scaleX, y * scaleY);
    }
    audio.playSwitch();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU switch effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitSwitch(x * scaleX, y * scaleY);
    }
    audio.playSwitch();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.trains !== undefined) {
      trainsDisplay.textContent = state.trains;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
    } else if (state.status === "lost") {
      showLose();
      if (renderer) {
        const centerX = webgpuCanvas.width / 2;
        const centerY = webgpuCanvas.height / 2;
        renderer.emitCrash(centerX, centerY);
      }
      audio.playCrash();
    }
  });

  // Train movement callback if available
  game.setOnTrainMove?.((x: number, y: number) => {
    if (renderer) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitTrain(x * scaleX, y * scaleY);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
        renderer?.emitLevelStart();
        audio.playLevelStart();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        startGame();
      };
    }
  }, 500);
}

function showLose() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.crash");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.reset();
      renderer?.emitReset();
      audio.playReset();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  renderer?.emitReset();
  audio.playReset();
});

// Init
initI18n();
initGame();
initWebGPU();
