/**
 * Treasure Map Main Entry
 * Game #106 - Pirate Adventure / Nautical Theme
 * WebGPU Enhanced
 */
import { TreasureMapGame } from "./game";
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

  private playTone(freq: number, type: OscillatorType, duration: number, attack: number = 0.01, decay: number = 0.1) {
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

  // Tile click - wood knock + compass tick
  playClick() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Wood knock
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(this.gainNode);
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.15);

    // Compass tick
    setTimeout(() => {
      this.playTone(1200, "sine", 0.05);
    }, 50);
  }

  // Correct clue found - treasure chime
  playDiscover() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Golden chime arpeggio
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.gainNode!);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.4);
      }, i * 80);
    });

    // Sparkle overlay
    setTimeout(() => {
      this.playTone(2000, "sine", 0.2);
    }, 200);
  }

  // Reset - compass spin + anchor drop
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Compass spin (descending whir)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);

    // Anchor thud
    setTimeout(() => {
      const thud = this.ctx!.createOscillator();
      const thudGain = this.ctx!.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(80, this.ctx!.currentTime);
      thud.frequency.exponentialRampToValueAtTime(40, this.ctx!.currentTime + 0.2);
      thudGain.gain.setValueAtTime(0.4, this.ctx!.currentTime);
      thudGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.3);
      thud.connect(thudGain);
      thudGain.connect(this.gainNode!);
      thud.start();
      thud.stop(this.ctx!.currentTime + 0.3);
    }, 400);
  }

  // Victory - treasure chest opening + gold coins
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Chest creak
    const creak = this.ctx.createOscillator();
    const creakGain = this.ctx.createGain();
    creak.type = "sawtooth";
    creak.frequency.setValueAtTime(100, this.ctx.currentTime);
    creak.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.3);
    creakGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    creakGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    creak.connect(creakGain);
    creakGain.connect(this.gainNode);
    creak.start();
    creak.stop(this.ctx.currentTime + 0.4);

    // Gold coins falling (multiple pings)
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const freq = 1500 + Math.random() * 1000;
        this.playTone(freq, "sine", 0.15);
      }, 300 + i * 100 + Math.random() * 50);
    }

    // Triumphant fanfare
    setTimeout(() => {
      const fanfare = [392, 523, 659, 784]; // G4, C5, E5, G5
      fanfare.forEach((freq, i) => {
        setTimeout(() => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = "square";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(this.gainNode!);
          osc.start();
          osc.stop(this.ctx!.currentTime + 0.5);
        }, i * 120);
      });
    }, 800);
  }

  // Level start - ship horn + wave
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Ship horn (foghorn)
    const horn = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();
    horn.type = "sawtooth";
    horn.frequency.value = 110;
    hornGain.gain.setValueAtTime(0, this.ctx.currentTime);
    hornGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    hornGain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.4);
    hornGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    horn.connect(filter);
    filter.connect(hornGain);
    hornGain.connect(this.gainNode);
    horn.start();
    horn.stop(this.ctx.currentTime + 0.8);

    // Wave swoosh
    setTimeout(() => {
      const noise = this.ctx!.createOscillator();
      const noiseGain = this.ctx!.createGain();
      noise.type = "sawtooth";
      noise.frequency.setValueAtTime(200, this.ctx!.currentTime);
      noise.frequency.linearRampToValueAtTime(100, this.ctx!.currentTime + 0.3);
      noiseGain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);
      noise.connect(noiseGain);
      noiseGain.connect(this.gainNode!);
      noise.start();
      noise.stop(this.ctx!.currentTime + 0.4);
    }, 500);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const clueText = document.getElementById("clue-text")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: TreasureMapGame;
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
  game = new TreasureMapGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitClick((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    }
    audio.playClick();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitClick((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
    }
    audio.playClick();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = String(state.moves);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
    }
  });

  game.setOnClueChange((clue: string) => {
    clueText.textContent = clue;
  });

  // Listen for discover events
  game.setOnDiscover?.((x: number, y: number) => {
    if (renderer) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitDiscover(x * scaleX, y * scaleY);
    }
    audio.playDiscover();
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
