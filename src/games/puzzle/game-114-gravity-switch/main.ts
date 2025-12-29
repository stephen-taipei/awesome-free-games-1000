/**
 * Gravity Switch Main Entry
 * Game #114 - Space / Cosmic Theme
 */
import { GravitySwitchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const switchesDisplay = document.getElementById("switches-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: GravitySwitchGame;
let renderer: WebGPURenderer | null = null;
let audioSystem: AudioSystem | null = null;

// ===== Audio System =====
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("AudioContext not supported");
    }
  }

  private resume() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  playGravitySwitch(direction: string) {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Whoosh sound with direction-based pitch
    const pitchMap: Record<string, number> = {
      up: 600,
      down: 300,
      left: 400,
      right: 500,
    };
    const basePitch = pitchMap[direction] || 450;

    // Main whoosh oscillator
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(basePitch * 2, now);
    osc1.frequency.exponentialRampToValueAtTime(basePitch * 0.5, now + 0.3);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Energy pulse
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(basePitch * 1.5, now);
    osc2.frequency.setValueAtTime(basePitch * 2, now + 0.1);

    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start(now);
    osc2.stop(now + 0.25);
  }

  playPlayerTrail() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Subtle hum
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 220 + Math.random() * 40;

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playPortalHum() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Ethereal portal sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = 180;
    osc2.type = "sine";
    osc2.frequency.value = 183;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.55);
    osc2.stop(now + 0.55);
  }

  playReset() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Warping reset sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playWin() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Cosmic victory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const delay = i * 0.12;

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + delay);
      osc.stop(now + delay + 0.55);
    });

    // Sparkle overlay
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = 0.5 + i * 0.08;

      osc.type = "sine";
      osc.frequency.value = 1500 + Math.random() * 1000;

      gain.gain.setValueAtTime(0.1, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    }
  }

  playLevelStart() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Materialization sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(1200, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);

    // High accent
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.value = 880;

    gain2.gain.setValueAtTime(0, now + 0.2);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start(now + 0.2);
    osc2.stop(now + 0.55);
  }

  playCollision() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Death sound - dissonant
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(350, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }
}

// ===== Initialization =====
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

async function initWebGPU() {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (success) {
    renderer.emitLevelStart();
  } else {
    webgpuCanvas.style.display = "none";
  }
}

function initGame() {
  game = new GravitySwitchGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleClick(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleClick(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.switches !== undefined) switchesDisplay.textContent = String(state.switches);
    if (state.level !== undefined) levelDisplay.textContent = String(state.level);

    // Handle gravity switch event
    if (state.gravitySwitch) {
      const { x, y, direction } = state.gravitySwitch;
      audioSystem?.playGravitySwitch(direction);
      renderer?.emitGravitySwitch(x, y, direction);
    }

    // Handle player trail
    if (state.playerTrail) {
      const { x, y } = state.playerTrail;
      renderer?.emitPlayerTrail(x, y);
    }

    // Handle portal effect
    if (state.portalEffect) {
      const { x, y } = state.portalEffect;
      renderer?.emitPortal(x, y);
      audioSystem?.playPortalHum();
    }

    if (state.status === "won") {
      showWin(state.hasNextLevel);
      audioSystem?.playWin();
      renderer?.emitVictory();
    } else if (state.status === "lost") {
      showLose();
      audioSystem?.playCollision();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas && canvas.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.resize(rect.width, 450);
    }
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
        audioSystem?.playLevelStart();
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
    overlayTitle.textContent = "Ouch!";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.reset();
      renderer?.emitReset();
      audioSystem?.playReset();
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audioSystem?.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  renderer?.emitReset();
  audioSystem?.playReset();
});

// Initialize everything
initI18n();
audioSystem = new AudioSystem();
initWebGPU();
initGame();
