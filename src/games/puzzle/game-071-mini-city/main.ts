/**
 * Mini City Main Entry
 * Game #071 - Urban / Night City / Modern Architecture Theme
 */
import { MiniCityGame, BuildingType } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// ─────────────────────────────────────────────────────────────
// Audio System - Urban / City Sounds
// ─────────────────────────────────────────────────────────────
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private ensureContext(): boolean {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return false;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return true;
  }

  // Building placed - construction sound
  playBuildingPlace(buildingType: string): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Base construction thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(100, now);
    thud.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    thudGain.gain.setValueAtTime(0.5, now);
    thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.15);

    // Building-specific sounds
    const tones: Record<string, number[]> = {
      house: [392, 494, 587],    // Warm ascending
      shop: [523, 659, 784],     // Bright chime
      park: [330, 392, 523],     // Nature-like
      factory: [196, 220, 262],  // Industrial
    };

    const notes = tones[buildingType] || tones.house;
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = buildingType === 'factory' ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  // Building removed - demolition sound
  playBuildingRemove(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Descending tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);

    // Crumble noise
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
    }
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 800;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.15;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
  }

  // Building selection changed
  playBuildingSelect(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Level complete - city celebration
  playVictory(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Fanfare progression
    const chords = [
      [523, 659, 784],
      [587, 740, 880],
      [659, 784, 988],
      [784, 988, 1175],
    ];

    chords.forEach((chord, ci) => {
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + ci * 0.2);
        gain.gain.linearRampToValueAtTime(0.25, now + ci * 0.2 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + ci * 0.2 + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + ci * 0.2);
        osc.stop(now + ci * 0.2 + 0.4);
      });
    });

    // City horn
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const horn = this.ctx.createOscillator();
      const hornGain = this.ctx.createGain();
      horn.type = "sawtooth";
      horn.frequency.value = 300;
      hornGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      hornGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

      const hornFilter = this.ctx.createBiquadFilter();
      hornFilter.type = "lowpass";
      hornFilter.frequency.value = 600;

      horn.connect(hornFilter);
      hornFilter.connect(hornGain);
      hornGain.connect(this.masterGain);
      horn.start();
      horn.stop(this.ctx.currentTime + 0.5);
    }, 800);
  }

  // Game complete - ultimate celebration
  playGameComplete(): void {
    this.playVictory();

    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const notes = [523, 659, 784, 988, 1175, 1318];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx!.currentTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(this.ctx!.currentTime + i * 0.1);
        osc.stop(this.ctx!.currentTime + i * 0.1 + 0.4);
      });
    }, 1200);
  }

  // Reset - city rebuild
  playReset(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

// ─────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const populationDisplay = document.getElementById("population-display")!;
const buildingSelector = document.getElementById("building-selector")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: MiniCityGame;
let renderer: WebGPURenderer;
let audio: AudioSystem;
let animationId: number;
let lastSelectedBuilding: string = '';

// ─────────────────────────────────────────────────────────────
// Internationalization
// ─────────────────────────────────────────────────────────────
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
    updateBuildingSelector();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

// ─────────────────────────────────────────────────────────────
// WebGPU Setup
// ─────────────────────────────────────────────────────────────
async function initWebGPU() {
  const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer();
  const success = await renderer.initialize(webgpuCanvas);

  if (success) {
    function renderLoop() {
      renderer.render();
      animationId = requestAnimationFrame(renderLoop);
    }
    renderLoop();
  }
}

// ─────────────────────────────────────────────────────────────
// Game Setup
// ─────────────────────────────────────────────────────────────
function initGame() {
  audio = new AudioSystem();
  game = new MiniCityGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    populationDisplay.textContent = `${state.population || 0} / ${state.target || 0}`;

    // Handle events
    if (state.event) {
      const x = state.x ?? canvas.width / 2;
      const y = state.y ?? canvas.height / 2;

      switch (state.event) {
        case "buildingPlace":
          audio.playBuildingPlace(state.buildingType || "house");
          renderer?.emitBuildingPlace(x, y, state.buildingType || "house");
          break;
        case "buildingRemove":
          audio.playBuildingRemove();
          renderer?.emitBuildingRemove(x, y);
          break;
        case "populationMilestone":
          renderer?.emitPopulationMilestone(x, y);
          break;
      }
    }

    // Track building selection changes
    if (state.selected && state.selected !== lastSelectedBuilding) {
      audio.playBuildingSelect();
      renderer?.emitBuildingSelect(canvas.width / 2, canvas.height / 2);
      lastSelectedBuilding = state.selected;
    }

    if (state.buildings && state.maxBuildings) {
      updateBuildingSelector(state);
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "complete") {
      showComplete();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function updateBuildingSelector(state?: any) {
  const buildings = game.getAvailableBuildings();
  buildingSelector.innerHTML = "";

  const emojis: { [key: string]: string } = {
    house: "🏠",
    shop: "🏪",
    park: "🌳",
    factory: "🏭",
  };

  buildings.forEach((type: BuildingType) => {
    const btn = document.createElement("button");
    btn.className = `building-btn ${state?.selected === type ? "selected" : ""}`;
    btn.dataset.type = type;

    const count = state?.buildings?.[type] || 0;
    const max = state?.maxBuildings?.[type] || 0;

    btn.innerHTML = `
      <span class="emoji">${emojis[type] || "?"}</span>
      <span class="name">${i18n.t(`game.${type}`)}</span>
      <span class="count">${count}/${max}</span>
    `;

    btn.addEventListener("click", () => {
      game.selectBuilding(type);
    });

    buildingSelector.appendChild(btn);
  });
}

function showWin() {
  audio.playVictory();
  renderer?.emitVictory();

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.hint");
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  audio.playGameComplete();
  renderer?.emitGameComplete();

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
  buildingSelector.style.display = "flex";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
}

// ─────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  renderer?.emitReset();
  game.reset();
});
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  renderer?.emitLevelStart();
  game.nextLevel();
});

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────
initI18n();
initGame();
initWebGPU();
