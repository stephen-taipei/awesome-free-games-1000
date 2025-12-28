/**
 * Note Puzzle Main Entry
 * Game #110 - Music / Concert Hall Theme
 * WebGPU Enhanced
 */
import { NotePuzzleGame } from "./game";
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

  // Play a musical note
  playNote(frequency: number = 440, duration: number = 0.4) {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Use sine wave for pure musical tone
    osc.type = "sine";
    osc.frequency.value = frequency;

    // ADSR envelope for musical sound
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02); // Attack
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);  // Decay
    gain.gain.setValueAtTime(0.2, now + duration - 0.1); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

    // Add slight overtone for richness
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = frequency * 2;
    gain2.gain.value = 0.1;
    osc2.connect(gain2);
    gain2.connect(gain);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start();
    osc2.start();
    osc.stop(now + duration);
    osc2.stop(now + duration);
  }

  // Click sound - light percussion
  playClick() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Chord - multiple notes
  playChord(frequencies: number[]) {
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.8), i * 30);
    });
  }

  // Melody sequence
  playMelody(notes: number[], tempo: number = 200) {
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, tempo / 1000 * 0.9), i * tempo);
    });
  }

  // Reset sound - descending arpeggio
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    const notes = [659, 587, 523, 440]; // E5, D5, C5, A4
    notes.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.15), i * 80);
    });
  }

  // Victory - triumphant fanfare
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Triumphant chord progression
    const progression = [
      [523, 659, 784],      // C major
      [587, 740, 880],      // D major
      [659, 784, 988],      // E minor
      [523, 659, 784, 1047] // C major (resolved)
    ];

    progression.forEach((chord, i) => {
      setTimeout(() => {
        chord.forEach((freq, j) => {
          setTimeout(() => this.playNote(freq, 0.6), j * 20);
        });
      }, i * 350);
    });

    // Final flourish
    setTimeout(() => {
      const flourish = [1047, 1175, 1319, 1397, 1568];
      flourish.forEach((freq, i) => {
        setTimeout(() => this.playNote(freq, 0.3), i * 60);
      });
    }, 1500);
  }

  // Level start - welcoming tune
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Simple welcoming melody
    const melody = [523, 659, 784]; // C5, E5, G5
    melody.forEach((freq, i) => {
      setTimeout(() => this.playNote(freq, 0.25), i * 120);
    });

    // Soft chord
    setTimeout(() => {
      this.playChord([523, 659, 784]);
    }, 400);
  }

  // Target melody playback
  playTargetMelody(notes: number[]) {
    this.playMelody(notes, 300);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const notesDisplay = document.getElementById("notes-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const playBtn = document.getElementById("play-btn")!;

let game: NotePuzzleGame;
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
  game = new NotePuzzleGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU note click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitNoteClick(x * scaleX, y * scaleY);
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

    // WebGPU note click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitNoteClick(x * scaleX, y * scaleY);
    }
    audio.playClick();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.notes !== undefined) {
      notesDisplay.textContent = state.notes;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
    }
    if (state.notePlayed && renderer) {
      // Note played effect
      const { x, y, pitch } = state.notePlayed;
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitNoteClick(x * scaleX, y * scaleY, pitch);

      // Map pitch to frequency (simplified)
      const freq = 261.63 * Math.pow(2, pitch / 12);
      audio.playNote(freq);
    }
    if (state.chordPlayed && renderer) {
      const centerX = webgpuCanvas.width / 2;
      const centerY = webgpuCanvas.height / 2;
      renderer.emitChord(centerX, centerY);
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
playBtn.addEventListener("click", () => {
  game.playTargetMelody();
  if (renderer) {
    renderer.emitMelody(webgpuCanvas.width / 2, webgpuCanvas.height / 2);
  }
});

// Init
initI18n();
initGame();
initWebGPU();
