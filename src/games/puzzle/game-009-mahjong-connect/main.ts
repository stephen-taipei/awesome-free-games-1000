/**
 * Mahjong Connect Main Entry - WebGPU Enhanced
 * Game #009
 */
import { MahjongConnect, type GameState, type Tile } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type TileData } from "./webgpu/renderer";

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

  // 選擇牌
  playSelect(): void {
    this.playTone(660, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(880, 0.08, 'sine', 0.15), 40);
  }

  // 取消選擇
  playDeselect(): void {
    this.playTone(440, 0.08, 'sine', 0.1);
  }

  // 配對成功 - 中國風五聲音階
  playMatch(tileType: number): void {
    const pentatonic = [523, 587, 659, 784, 880]; // C D E G A
    const baseFreq = pentatonic[tileType % 5];

    this.playTone(baseFreq, 0.15, 'sine', 0.25);
    setTimeout(() => {
      this.playTone(baseFreq * 1.25, 0.15, 'sine', 0.2);
    }, 80);
    setTimeout(() => {
      this.playTone(baseFreq * 1.5, 0.2, 'sine', 0.15);
    }, 160);
  }

  // 連線動畫
  playPath(): void {
    const freqs = [440, 550, 660, 770];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.06, 'sine', 0.1);
      }, i * 30);
    });
  }

  // 無效配對
  playInvalid(): void {
    this.playTone(220, 0.15, 'square', 0.1);
    setTimeout(() => this.playTone(200, 0.15, 'square', 0.1), 100);
  }

  // 使用提示
  playHint(): void {
    const notes = [784, 988, 1175];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.2);
      }, i * 100);
    });
  }

  // 洗牌
  playShuffle(): void {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const freq = 300 + Math.random() * 400;
        this.playTone(freq, 0.05, 'triangle', 0.15);
      }, i * 40);
    }
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

  // 勝利 - 慶祝旋律
  playVictory(): void {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.3);
        this.playTone(freq * 1.5, 0.25, 'sine', 0.15);
      }, i * 120);
    });
  }

  // 遊戲結束
  playGameOver(): void {
    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.35, 'sawtooth', 0.12);
      }, i * 250);
    });
  }
}

// =====================
// 元素引用
// =====================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const pairsDisplay = document.getElementById("pairs-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const shuffleBtn = document.getElementById("shuffle-btn")!;

// =====================
// 全局變量
// =====================
let game: MahjongConnect;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;
let warningPlayed = false;
let lastPairsLeft = 0;

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
    renderer.setGridSize(8, 14);
    console.log('WebGPU renderer initialized');
  } else {
    console.log('Falling back to Canvas 2D');
    renderer = null;
  }
}

function initGame() {
  game = new MahjongConnect(canvas);

  game.setOnStateChange((state: GameState) => {
    scoreDisplay.textContent = state.score.toString();
    pairsDisplay.textContent = state.pairsLeft.toString();

    // Time format MM:SS
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    // 更新時間進度
    if (renderer) {
      renderer.setTimeProgress(state.time / 180);
    }

    // 計時警告
    if (state.time <= 20 && state.time > 0 && !warningPlayed) {
      audio.playWarning();
      warningPlayed = true;
      setTimeout(() => { warningPlayed = false; }, 1000);
    }

    // 檢測配對成功
    if (state.pairsLeft < lastPairsLeft) {
      // 有配對成功
      lastPairsLeft = state.pairsLeft;
    }

    hintBtn.textContent = `${i18n.t("game.hint").replace("{n}", state.hints.toString())}`;
    shuffleBtn.textContent = `${i18n.t("game.shuffle").replace("{n}", state.shuffles.toString())}`;

    if (state.status === "gameover") {
      showGameOver(false);
    } else if (state.status === "won") {
      showGameOver(true);
    }
  });
}

// =====================
// 遊戲流程
// =====================
function startGame() {
  overlay.style.display = "none";
  game.start();
  lastPairsLeft = 56; // 8x14 / 2
  warningPlayed = false;

  audio.playStart();

  if (renderer) {
    renderer.clearParticles();
    renderer.clearPath();
    renderer.clearHints();
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

function showGameOver(won: boolean) {
  overlay.style.display = "flex";
  overlayTitle.textContent = won ? i18n.t("game.win") : i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${scoreDisplay.textContent}`;
  startBtn.textContent = i18n.t("game.reset");

  if (won) {
    audio.playVictory();
    if (renderer) {
      renderer.emitVictory();
    }
  } else {
    audio.playGameOver();
    if (renderer) {
      renderer.emitGameOver();
    }
  }
}

// =====================
// 遊戲循環
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // 更新 WebGPU 渲染器
  if (renderer && useWebGPU) {
    const tiles = getTilesFromGame();
    renderer.updateTiles(tiles);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// 從遊戲獲取麻將牌數據
function getTilesFromGame(): TileData[] {
  const gameAny = game as any;
  const grid = gameAny.grid || [];
  const rows = gameAny.rows || 8;
  const cols = gameAny.cols || 14;

  const tiles: TileData[] = [];

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const tile = grid[r]?.[c] as Tile | null;
      if (tile && tile.visible) {
        tiles.push({
          row: tile.r,
          col: tile.c,
          type: tile.id,
          visible: tile.visible,
          selected: tile.selected,
          matched: false,
          hovered: false,
        });
      }
    }
  }

  return tiles;
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
  const prevPairs = gameAny.getPairsLeft();
  const prevSelected = gameAny.selected;

  game.handleInput(x, y);

  // 播放音效
  const nowHasSelection = gameAny.selected !== null;
  const nowPairs = gameAny.getPairsLeft();

  if (nowPairs < prevPairs) {
    // 配對成功
    audio.playMatch(prevSelected?.id || 0);
    audio.playPath();

    // 粒子效果
    if (renderer && prevSelected) {
      const currentSelected = gameAny.selected;
      const path = gameAny.hintsLine;

      if (path && path.length >= 2) {
        const start = path[0];
        const end = path[path.length - 1];
        renderer.emitMatch(start.r, start.c, end.r, end.c, prevSelected.id);
        renderer.emitPath(path);
        renderer.setPath(path);

        // 清除路徑
        setTimeout(() => {
          renderer?.clearPath();
        }, 500);
      }
    }
  } else if (!hadSelection && nowHasSelection) {
    // 新選擇
    audio.playSelect();
    if (renderer && gameAny.selected) {
      renderer.emitSelect(gameAny.selected.r, gameAny.selected.c);
    }
  } else if (hadSelection && !nowHasSelection && nowPairs === prevPairs) {
    // 取消選擇或無效配對
    audio.playDeselect();
  } else if (hadSelection && nowHasSelection && prevSelected !== gameAny.selected) {
    // 切換選擇
    audio.playSelect();
    if (renderer && gameAny.selected) {
      renderer.emitSelect(gameAny.selected.r, gameAny.selected.c);
    }
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

// 按鈕事件
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", startGame);

hintBtn.addEventListener("click", () => {
  const gameAny = game as any;
  const prevHints = gameAny.hintCount;
  game.useHint();
  const nowHints = gameAny.hintCount;

  if (nowHints < prevHints) {
    audio.playHint();
    const path = gameAny.hintsLine;
    if (renderer && path && path.length >= 2) {
      renderer.setHints([path[0], path[path.length - 1]]);
      renderer.emitHint(path[0].r, path[0].c);
      renderer.emitHint(path[path.length - 1].r, path[path.length - 1].c);

      setTimeout(() => {
        renderer?.clearHints();
      }, 1000);
    }
  }
});

shuffleBtn.addEventListener("click", () => {
  const gameAny = game as any;
  const prevShuffles = gameAny.shuffleCount;
  game.shuffle(true);
  const nowShuffles = gameAny.shuffleCount;

  if (nowShuffles < prevShuffles) {
    audio.playShuffle();
    if (renderer) {
      renderer.emitShuffle();
    }
  }
});

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
