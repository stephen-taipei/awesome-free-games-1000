/**
 * Code Puzzle Main Entry
 * Matrix / Cyberpunk / Hacker Theme
 * Game #069
 */
import { CodePuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const attemptsDisplay = document.getElementById("attempts-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

const puzzleArea = document.getElementById("puzzle-area")!;
const puzzleType = document.getElementById("puzzle-type")!;
const encodedText = document.getElementById("encoded-text")!;
const clueText = document.getElementById("clue-text")!;
const answerInput = document.getElementById("answer-input") as HTMLInputElement;
const submitBtn = document.getElementById("submit-btn")!;
const feedbackMsg = document.getElementById("feedback-msg")!;

let game: CodePuzzleGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Matrix / Hacker Sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private ensureContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Keyboard click - mechanical key sound
  private playKeyClick(volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Click noise
    const bufferSize = this.audioContext.sampleRate * 0.03;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.5;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Digital beep
  private playBeep(frequency: number, duration: number, volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.setValueAtTime(volume, now + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Data processing sound
  private playDataProcess(volume: number = 0.1) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Sweeping tone
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Error / access denied
  private playError(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Two descending tones
    for (let i = 0; i < 2; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(400 - i * 100, now + i * 0.15);

      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(volume, now + i * 0.15 + 0.01);
      gain.gain.setValueAtTime(volume, now + i * 0.15 + 0.1);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    }
  }

  // Decrypt success
  private playDecrypt(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Ascending digital tones
    const notes = [400, 500, 600, 800];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const delay = i * 0.08;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(volume, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const melody = [
      { freq: 523.25, time: 0, dur: 0.1 },
      { freq: 659.25, time: 0.1, dur: 0.1 },
      { freq: 783.99, time: 0.2, dur: 0.1 },
      { freq: 1046.50, time: 0.35, dur: 0.3 },
    ];

    melody.forEach(({ freq, time, dur }) => {
      setTimeout(() => {
        this.playBeep(freq, dur, 0.15);
      }, time * 1000);
    });

    setTimeout(() => this.playDataProcess(0.1), 500);
  }

  // Public methods
  playKeypress() {
    this.playKeyClick(0.1);
    this.playBeep(800 + Math.random() * 200, 0.02, 0.05);
  }

  playSubmit() {
    this.playDataProcess(0.15);
    this.playBeep(600, 0.1, 0.1);
  }

  playWrongAnswer() {
    this.playError(0.2);
  }

  playCorrectAnswer() {
    this.playDecrypt(0.2);
  }

  playStart() {
    this.playBeep(500, 0.1, 0.1);
    this.playDataProcess(0.1);
  }

  playReset() {
    this.playBeep(400, 0.08, 0.1);
    this.playBeep(300, 0.08, 0.1);
  }

  playNextLevel() {
    this.playBeep(600, 0.1, 0.1);
    this.playBeep(800, 0.1, 0.1);
  }
}

const audio = new AudioSystem();

// Initialize WebGPU
async function initWebGPU() {
  renderer = new WebGPURenderer();
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.id = 'webgpu-canvas';
  webgpuCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    border-radius: 12px;
  `;

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.insertBefore(webgpuCanvas, gameArea.firstChild);
  }

  const success = await renderer.initialize(webgpuCanvas);
  if (success) {
    function animate() {
      renderer?.render();
      requestAnimationFrame(animate);
    }
    animate();
  }
  return success;
}

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
    game.setLocale(i18n.getLocale());
    updateTexts();
    updatePuzzleDisplay();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new CodePuzzleGame();
  game.setLocale(i18n.getLocale());

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    attemptsDisplay.textContent = state.attempts.toString();

    // Handle events
    if (state.event) {
      const inputRect = answerInput.getBoundingClientRect();
      const gameAreaRect = document.querySelector('.game-area')?.getBoundingClientRect();
      const x = inputRect.left - (gameAreaRect?.left || 0) + inputRect.width / 2;
      const y = inputRect.top - (gameAreaRect?.top || 0) + inputRect.height / 2;

      switch (state.event) {
        case 'keypress':
          renderer?.emitKeyPress(x, y);
          audio.playKeypress();
          break;
        case 'submit':
          renderer?.emitSubmit(x, y);
          audio.playSubmit();
          break;
        case 'wrongAnswer':
          renderer?.emitWrongAnswer(x, y);
          audio.playWrongAnswer();
          break;
        case 'correctAnswer':
          renderer?.emitDecrypt(x, y);
          audio.playCorrectAnswer();
          break;
      }
    }

    if (state.wrong) {
      feedbackMsg.textContent = i18n.t("game.wrong");
      feedbackMsg.style.color = "#ff4444";
      feedbackMsg.style.display = "block";
      answerInput.classList.add("shake");

      // Emit wrong answer effect
      const inputRect = answerInput.getBoundingClientRect();
      const gameAreaRect = document.querySelector('.game-area')?.getBoundingClientRect();
      const x = inputRect.left - (gameAreaRect?.left || 0) + inputRect.width / 2;
      const y = inputRect.top - (gameAreaRect?.top || 0) + inputRect.height / 2;
      renderer?.emitWrongAnswer(x, y);
      audio.playWrongAnswer();

      setTimeout(() => {
        answerInput.classList.remove("shake");
        feedbackMsg.style.display = "none";
      }, 1500);
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    } else if (state.status === "complete") {
      showComplete();
      renderer?.emitVictory();
      audio.playVictory();
    }
  });

  // Add keypress tracking
  answerInput.addEventListener("input", () => {
    const inputRect = answerInput.getBoundingClientRect();
    const gameAreaRect = document.querySelector('.game-area')?.getBoundingClientRect();
    const x = inputRect.left - (gameAreaRect?.left || 0) + inputRect.width / 2;
    const y = inputRect.top - (gameAreaRect?.top || 0) + inputRect.height / 2;
    renderer?.emitKeyPress(x, y);
    audio.playKeypress();
  });
}

function updatePuzzleDisplay() {
  const type = game.getPuzzleType();
  if (!type) return;

  const typeNames: { [key: string]: { [lang: string]: string } } = {
    caesar: { "zh-TW": "凱撒密碼", "zh-CN": "凯撒密码", en: "Caesar Cipher", ja: "シーザー暗号", ko: "시저 암호" },
    number: { "zh-TW": "數字規律", "zh-CN": "数字规律", en: "Number Pattern", ja: "数字パターン", ko: "숫자 패턴" },
    symbol: { "zh-TW": "符號替換", "zh-CN": "符号替换", en: "Symbol Substitution", ja: "記号置換", ko: "기호 치환" },
    binary: { "zh-TW": "二進制", "zh-CN": "二进制", en: "Binary", ja: "バイナリ", ko: "이진법" },
    morse: { "zh-TW": "摩斯密碼", "zh-CN": "摩斯密码", en: "Morse Code", ja: "モールス信号", ko: "모스 부호" },
  };

  const locale = i18n.getLocale();
  puzzleType.textContent = typeNames[type][locale] || typeNames[type]["en"];
  encodedText.textContent = game.getEncodedText();
  clueText.textContent = `${i18n.t("game.clue")}: ${game.getClue()}`;
  answerInput.value = "";
  feedbackMsg.style.display = "none";
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.attempts")}: ${attemptsDisplay.textContent}`;
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
  puzzleArea.style.display = "block";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  updatePuzzleDisplay();
  audio.playStart();
  renderer?.emitLevelStart();
}

function submitAnswer() {
  const answer = answerInput.value.trim();
  if (!answer) return;

  // Emit submit effect
  const inputRect = answerInput.getBoundingClientRect();
  const gameAreaRect = document.querySelector('.game-area')?.getBoundingClientRect();
  const x = inputRect.left - (gameAreaRect?.left || 0) + inputRect.width / 2;
  const y = inputRect.top - (gameAreaRect?.top || 0) + inputRect.height / 2;
  renderer?.emitSubmit(x, y);
  audio.playSubmit();

  const correct = game.checkAnswer(answer);
  if (correct) {
    renderer?.emitDecrypt(x, y);
    audio.playCorrectAnswer();
  }
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  updatePuzzleDisplay();
  audio.playReset();
  renderer?.emitReset();
});
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  updatePuzzleDisplay();
  audio.playNextLevel();
  renderer?.emitLevelStart();
});

submitBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") submitAnswer();
});

// Init
initI18n();
initGame();
initWebGPU();
