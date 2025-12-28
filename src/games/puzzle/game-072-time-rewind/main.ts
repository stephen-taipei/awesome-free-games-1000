/**
 * Time Rewind Main Entry
 * Game #072
 */
import { TimeRewindGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const rewindsDisplay = document.getElementById("rewinds-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;
const rewindBtn = document.getElementById("rewind-btn")!;

let game: TimeRewindGame;
let renderer: WebGPURenderer | null = null;
let animationId: number;

// Audio System with Web Audio API
class AudioSystem {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playMove(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Temporal whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    filter.Q.value = 5;

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playRewindStart(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Descending whoosh with distortion
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800 - i * 150, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain);
      gain.connect(this.gainNode!);

      osc.start(now + i * 0.05);
      osc.stop(now + 0.7);
    }

    // Reverse tape effect
    const noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    noise.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 1000;

    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.gainNode!);

    noise.start(now);
  }

  playRewindEnd(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Time snap back
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.gainNode!);

    osc.start(now);
    osc.stop(now + 0.25);

    // Crystalline chime
    setTimeout(() => {
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();

      chime.type = "sine";
      chime.frequency.value = 1200;

      chimeGain.gain.setValueAtTime(0.1, ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      chime.connect(chimeGain);
      chimeGain.connect(this.gainNode!);

      chime.start(ctx.currentTime);
      chime.stop(ctx.currentTime + 0.35);
    }, 100);
  }

  playKeyCollect(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Magical key sound
    const frequencies = [523, 659, 784, 1047];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.gainNode!);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  }

  playDeath(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Sharp spike hit
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.gainNode!);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playVictory(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Victory fanfare
    const notes = [
      { freq: 523, time: 0 },
      { freq: 659, time: 0.1 },
      { freq: 784, time: 0.2 },
      { freq: 1047, time: 0.35 },
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.2, now + time + 0.05);
      gain.gain.setValueAtTime(0.2, now + time + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.4);

      osc.connect(gain);
      gain.connect(this.gainNode!);

      osc.start(now + time);
      osc.stop(now + time + 0.5);
    });

    // Time chimes
    setTimeout(() => {
      for (let i = 0; i < 4; i++) {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();

        chime.type = "triangle";
        chime.frequency.value = 1500 + i * 200;

        chimeGain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.1);
        chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);

        chime.connect(chimeGain);
        chimeGain.connect(this.gainNode!);

        chime.start(ctx.currentTime + i * 0.1);
        chime.stop(ctx.currentTime + i * 0.1 + 0.35);
      }
    }, 500);
  }

  playReset(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Descending reset sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.gainNode!);

    osc.start(now);
    osc.stop(now + 0.4);
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

function initGame() {
  game = new TimeRewindGame(canvas);
  game.resize();

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w") game.move("up");
    else if (e.key === "ArrowDown" || e.key === "s") game.move("down");
    else if (e.key === "ArrowLeft" || e.key === "a") game.move("left");
    else if (e.key === "ArrowRight" || e.key === "d") game.move("right");
    else if (e.key === " ") {
      e.preventDefault();
      game.rewind();
    }
  });

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 30) return;

    if (absDx > absDy) {
      game.move(dx > 0 ? "right" : "left");
    } else {
      game.move(dy > 0 ? "down" : "up");
    }
  }, { passive: true });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    rewindsDisplay.textContent = state.rewinds?.toString() || "0";

    // Handle events for audio and visual effects
    if (state.event && renderer) {
      const x = state.x ?? canvas.width / 2;
      const y = state.y ?? canvas.height / 2;

      switch (state.event) {
        case "move":
          audio.playMove();
          renderer.emitPlayerMove(x, y);
          break;
        case "rewindStart":
          audio.playRewindStart();
          renderer.setRewinding(true);
          renderer.emitRewindStart(x, y);
          break;
        case "rewindEnd":
          audio.playRewindEnd();
          renderer.setRewinding(false);
          renderer.emitRewindEnd(x, y);
          break;
        case "keyCollect":
          audio.playKeyCollect();
          renderer.emitKeyCollect(x, y);
          break;
        case "doorOpen":
          renderer.emitDoorOpen(x, y);
          break;
        case "death":
          audio.playDeath();
          renderer.emitSpikeDeath(x, y);
          break;
        case "victory":
          audio.playVictory();
          renderer.emitVictory();
          break;
        case "levelStart":
          renderer.emitLevelStart();
          break;
        case "reset":
          audio.playReset();
          renderer.emitReset();
          break;
        case "gameComplete":
          audio.playVictory();
          renderer.emitGameComplete();
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
    overlayMsg.textContent = i18n.t("game.hint");
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
rewindBtn.addEventListener("click", () => game.rewind());

initI18n();
initGame();
initWebGPU();
