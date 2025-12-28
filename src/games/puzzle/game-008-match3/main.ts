/**
 * Match-3 Main Entry - WebGPU Enhanced
 * Game #008
 */
import { Match3Game, type GameState, type Gem } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu/renderer";

// =====================
// 音效系統
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

  private playNoise(duration: number, volume = 0.1): void {
    if (!this.ctx || !this.enabled) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  // 選擇寶石
  playSelect(): void {
    this.playTone(880, 0.1, 'sine', 0.2);
  }

  // 交換寶石
  playSwap(): void {
    this.playTone(440, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(660, 0.08, 'sine', 0.15), 50);
  }

  // 消除寶石 (根據類型有不同音調)
  playMatch(gemType: number, count: number = 3): void {
    const baseFreqs = [523, 587, 659, 698, 784, 880]; // C5, D5, E5, F5, G5, A5
    const baseFreq = baseFreqs[gemType % 6];

    // 和弦效果
    this.playTone(baseFreq, 0.2, 'sine', 0.2);
    this.playTone(baseFreq * 1.25, 0.2, 'sine', 0.15);
    this.playTone(baseFreq * 1.5, 0.2, 'sine', 0.1);

    // 更多消除時增加更高音
    if (count > 3) {
      setTimeout(() => {
        this.playTone(baseFreq * 2, 0.15, 'sine', 0.15);
      }, 100);
    }
  }

  // 連鎖效果
  playCascade(level: number): void {
    const baseFreq = 440 + level * 100;
    this.playTone(baseFreq, 0.15, 'triangle', 0.2);
    this.playTone(baseFreq * 1.5, 0.15, 'triangle', 0.15);
  }

  // 連擊效果
  playCombo(comboCount: number): void {
    const freqs = [523, 659, 784, 1047, 1319, 1568]; // C major arpeggio
    for (let i = 0; i < Math.min(comboCount, freqs.length); i++) {
      setTimeout(() => {
        this.playTone(freqs[i], 0.2, 'sine', 0.25);
      }, i * 80);
    }
  }

  // 寶石掉落
  playFall(): void {
    this.playTone(200, 0.05, 'sine', 0.1);
  }

  // 無效操作
  playInvalid(): void {
    this.playTone(200, 0.15, 'square', 0.1);
    setTimeout(() => this.playTone(180, 0.15, 'square', 0.1), 80);
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

  // 計時警告
  playWarning(): void {
    this.playTone(440, 0.1, 'square', 0.15);
  }

  // 遊戲結束
  playGameOver(): void {
    const notes = [440, 349, 294, 220];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sawtooth', 0.15);
      }, i * 200);
    });
  }

  // 新高分
  playHighScore(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.25);
        this.playTone(freq * 1.5, 0.25, 'sine', 0.15);
      }, i * 120);
    });
  }
}

// =====================
// 元素引用
// =====================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highScoreDisplay = document.getElementById("high-score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;

// =====================
// 全局變量
// =====================
let game: Match3Game;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let lastTime = 0;
let animationId: number | null = null;
let useWebGPU = false;
let cascadeLevel = 0;
let lastScore = 0;
let warningPlayed = false;

// =====================
// 初始化
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
    renderer.setGridSize(8, 8);
    console.log('WebGPU renderer initialized');
  } else {
    console.log('Falling back to Canvas 2D');
    renderer = null;
  }
}

function initGame() {
  game = new Match3Game(canvas);

  game.setOnStateChange((state: GameState) => {
    scoreDisplay.textContent = state.score.toString();
    highScoreDisplay.textContent = state.highScore.toString();
    timeDisplay.textContent = state.time.toString();

    // 更新時間進度
    if (renderer) {
      renderer.setTimeProgress(state.time / 60);
    }

    // 計時警告
    if (state.time <= 10 && state.time > 0 && !warningPlayed) {
      audio.playWarning();
      warningPlayed = true;
      setTimeout(() => { warningPlayed = false; }, 1000);
    }

    // 分數變化 = 有消除
    if (state.score > lastScore) {
      const diff = state.score - lastScore;
      const matchCount = diff / 10; // 每個寶石10分

      // 計算連鎖層級
      if (matchCount >= 3) {
        cascadeLevel++;
        if (cascadeLevel > 1) {
          audio.playCascade(cascadeLevel);
          if (renderer) {
            renderer.emitCombo(cascadeLevel);
          }
        }
      }

      lastScore = state.score;
    }

    if (state.status === "gameover") {
      stopTimer();
      showGameOver(state.score);
    }

    if (state.status === "idle") {
      cascadeLevel = 0;
    }
  });

  game.setOnGameOver((score) => {
    stopTimer();
    showGameOver(score);
  });
}

// =====================
// 遊戲流程
// =====================
function startGame() {
  overlay.style.display = "none";
  game.start();
  startTimer();
  lastScore = 0;
  cascadeLevel = 0;
  warningPlayed = false;

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
  overlayMsg.textContent = `${i18n.t("game.finalScore")}: ${score}`;
  startBtn.textContent = i18n.t("game.reset");

  // 檢查是否新高分
  const highScore = parseInt(localStorage.getItem("match3_highscore") || "0");
  if (score > highScore) {
    audio.playHighScore();
    if (renderer) {
      renderer.emitHighScore();
    }
    overlayMsg.textContent += ` - ${i18n.t("game.newHighScore") || "New High Score!"}`;
  } else {
    audio.playGameOver();
    if (renderer) {
      renderer.emitGameOver();
    }
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    game.timeTick();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// =====================
// 遊戲循環
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // 更新 WebGPU 渲染器的寶石數據
  if (renderer && useWebGPU) {
    const gems = getGemsFromGame();
    renderer.updateGems(gems);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// 從遊戲獲取寶石數據
function getGemsFromGame(): Array<{
  row: number;
  col: number;
  type: number;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  isSelected: boolean;
  isMatched: boolean;
}> {
  // 訪問 game 的內部狀態
  // 這需要在 game.ts 中添加 getter 方法
  const gameAny = game as any;
  const grid = gameAny.grid || [];
  const selected = gameAny.selected;
  const gemSize = gameAny.gemSize || 1;

  const gems: Array<{
    row: number;
    col: number;
    type: number;
    x: number;
    y: number;
    scale: number;
    alpha: number;
    isSelected: boolean;
    isMatched: boolean;
  }> = [];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const gem = grid[r][c];
      if (gem) {
        gems.push({
          row: gem.row,
          col: gem.col,
          type: gem.type,
          x: gem.x / gemSize,
          y: gem.y / gemSize,
          scale: gem.scale,
          alpha: gem.alpha,
          isSelected: selected && selected.row === r && selected.col === c,
          isMatched: gem.isMatched,
        });

        // 消除粒子效果
        if (gem.isMatched && gem.scale > 0.5) {
          if (renderer) {
            renderer.emitMatch(r, c, gem.type);
          }
          audio.playMatch(gem.type);
        }
      }
    }
  }

  return gems;
}

// =====================
// 輸入處理
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

  // 記錄選中前的狀態
  const gameAny = game as any;
  const hadSelection = gameAny.selected !== null;

  game.handleInput(x, y);

  // 播放音效
  const nowHasSelection = gameAny.selected !== null;
  if (!hadSelection && nowHasSelection) {
    audio.playSelect();
    if (renderer && gameAny.selected) {
      const gem = gameAny.grid[gameAny.selected.row]?.[gameAny.selected.col];
      if (gem) {
        renderer.emitSelect(gameAny.selected.row, gameAny.selected.col, gem.type);
      }
    }
  } else if (hadSelection && !nowHasSelection) {
    // 可能是交換
    audio.playSwap();
  }
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
// 音效切換按鈕
// =====================
function createSoundToggle(): void {
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.innerHTML = '🔊';
  btn.title = 'Toggle Sound';

  btn.addEventListener('click', () => {
    const enabled = !audio.isEnabled();
    audio.setEnabled(enabled);
    btn.innerHTML = enabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !enabled);
  });

  gameArea.appendChild(btn);
}

// =====================
// 啟動
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
