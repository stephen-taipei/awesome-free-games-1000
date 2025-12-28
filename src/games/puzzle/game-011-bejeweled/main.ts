/**
 * Bejeweled Main Entry - WebGPU Enhanced
 * Game #011
 */
import { BejeweledGame, type GameState, type Gem } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type GemData } from "./webgpu/renderer";

// =====================
// Audio System
// =====================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    attack = 0.01,
    decay = 0.1
  ): void {
    if (!this.ctx || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(volume * 0.7, this.ctx.currentTime + attack + decay);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 選擇寶石
  playSelect(): void {
    this.playTone(600, 0.08, 'sine', 0.15);
  }

  // 交換寶石
  playSwap(): void {
    this.playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(500, 0.1, 'sine', 0.15), 50);
  }

  // 消除 (根據數量有不同效果)
  playMatch(count: number, colorIndex: number): void {
    const baseFreqs = [523, 587, 659, 698, 784, 880, 988];
    const baseFreq = baseFreqs[colorIndex % 7];

    // 基礎消除音
    this.playTone(baseFreq, 0.12, 'sine', 0.25);

    // 多個消除增加和弦
    if (count >= 4) {
      setTimeout(() => {
        this.playTone(baseFreq * 1.25, 0.12, 'sine', 0.2);
      }, 30);
    }
    if (count >= 5) {
      setTimeout(() => {
        this.playTone(baseFreq * 1.5, 0.15, 'sine', 0.18);
      }, 60);
    }
  }

  // 連鎖消除
  playCascade(chainLevel: number): void {
    const freqs = [659, 784, 880, 988, 1047];
    const freq = freqs[Math.min(chainLevel, freqs.length - 1)];
    this.playTone(freq, 0.15, 'triangle', 0.2);
  }

  // 寶石掉落
  playFall(): void {
    this.playTone(200, 0.05, 'sine', 0.08);
  }

  // 無效交換
  playInvalid(): void {
    this.playTone(200, 0.15, 'square', 0.1);
    setTimeout(() => this.playTone(150, 0.15, 'square', 0.08), 100);
  }

  // 升級
  playLevelUp(): void {
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.25);
        this.playTone(freq * 1.5, 0.2, 'sine', 0.12);
      }, i * 100);
    });
  }

  // 遊戲開始
  playStart(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.2);
      }, i * 100);
    });
  }

  // 遊戲結束
  playGameOver(): void {
    const notes = [440, 349, 294, 220];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sawtooth', 0.12);
      }, i * 250);
    });
  }
}

// =====================
// Elements
// =====================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const levelProgress = document.getElementById("level-progress")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;

// =====================
// Global Variables
// =====================
let game: BejeweledGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;
let lastScore = 0;
let lastLevel = 1;
let lastStatus = 'idle';

// =====================
// Initialization
// =====================
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

async function initRenderer(): Promise<void> {
  renderer = new WebGPURenderer(canvas);
  useWebGPU = await renderer.init();

  if (useWebGPU) {
    renderer.setGameSize(8, 8, 1);
    console.log('WebGPU renderer initialized');
  } else {
    console.log('Falling back to Canvas 2D');
    renderer = null;
  }
}

function initGame() {
  game = new BejeweledGame(canvas);

  game.setOnStateChange((state: GameState) => {
    scoreDisplay.textContent = state.score.toString();
    levelDisplay.textContent = state.level.toString();
    levelProgress.style.width = `${state.progress}%`;

    if (renderer) {
      renderer.setProgress(state.progress);
    }

    // 檢測分數變化 -> 播放消除音效
    if (state.score > lastScore) {
      const diff = state.score - lastScore;
      const matchCount = Math.floor(diff / 10);
      if (matchCount > 0) {
        audio.playMatch(matchCount, Math.floor(Math.random() * 7));

        // 添加分數彈出效果
        if (renderer) {
          renderer.addScorePop(4, 4, diff);
        }
      }
      lastScore = state.score;
    }

    // 檢測升級
    if (state.level > lastLevel) {
      audio.playLevelUp();
      if (renderer) {
        renderer.emitLevelUp();
      }
      lastLevel = state.level;
    }

    // 狀態變化
    if (state.status !== lastStatus) {
      if (state.status === 'gameover') {
        showGameOver(state.score);
      }
      lastStatus = state.status;
    }
  });

  game.setOnGameOver((score) => {
    showGameOver(score);
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";
  game.start();
  lastScore = 0;
  lastLevel = 1;
  lastStatus = 'idle';

  audio.playStart();

  if (renderer) {
    renderer.clearParticles();
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

function showGameOver(score: number) {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
  startBtn.textContent = i18n.t("game.reset");

  audio.playGameOver();
  if (renderer) {
    renderer.emitGameOver();
  }
}

// =====================
// Game Loop
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // WebGPU 渲染
  if (renderer && useWebGPU) {
    const gems = getGemsFromGame();
    renderer.updateGems(gems);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// 從遊戲獲取寶石數據
function getGemsFromGame(): GemData[] {
  const gameAny = game as any;
  const grid = gameAny.grid || [];
  const selected = gameAny.selected;
  const gemSize = gameAny.gemSize || 50;

  const gems: GemData[] = [];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      const gem = grid[r][c] as Gem | null;
      if (gem) {
        const isSelected = selected && selected.row === r && selected.col === c;

        gems.push({
          x: gem.x / gemSize + 0.5,
          y: (grid.length - 1 - r) + (gem.y / gemSize - r) + 0.5,
          colorIndex: gem.type,
          scale: gem.scale,
          rotation: 0,
          selected: isSelected,
          matched: gem.isMatched,
          shapeType: gem.type,
        });
      }
    }
  }

  return gems;
}

// =====================
// Input Handling
// =====================
function handleInput(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return;
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else return;

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // 播放選擇音效
  audio.playSelect();

  game.handleInput(x, y);
}

canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handleInput(e);
  },
  { passive: false }
);

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", startGame);
hintBtn.addEventListener("click", () => game.getHint());

// =====================
// Sound Toggle
// =====================
function createSoundToggle(): void {
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.innerHTML = '🔊';
  btn.title = 'Toggle Sound';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = !audio.isEnabled();
    audio.setEnabled(enabled);
    btn.innerHTML = enabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !enabled);
  });

  gameArea.appendChild(btn);
}

// =====================
// Main
// =====================
async function main() {
  initI18n();

  // 初始化音效系統
  audio = new AudioSystem();

  // 用戶交互後初始化音效
  const initAudioOnInteraction = async () => {
    await audio.init();
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  };
  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('touchstart', initAudioOnInteraction);

  // 初始化渲染器
  await initRenderer();

  // 初始化遊戲
  initGame();

  // 創建音效切換按鈕
  createSoundToggle();
}

main();
