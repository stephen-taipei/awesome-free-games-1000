/**
 * One Line Main Entry - WebGPU Enhanced
 * Game #012
 */
import { OneLineGame, type GameState, type Point, type LevelData } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type EdgeData, type NodeData, type DragLine } from "./webgpu/renderer";

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

  // 選擇節點
  playSelect(): void {
    this.playTone(600, 0.08, 'sine', 0.2);
  }

  // 連接成功
  playConnect(): void {
    this.playTone(800, 0.1, 'sine', 0.25);
    setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.2), 50);
  }

  // 連接失敗
  playInvalid(): void {
    this.playTone(200, 0.12, 'square', 0.15);
  }

  // 撤銷
  playUndo(): void {
    this.playTone(400, 0.08, 'triangle', 0.15);
  }

  // 重置
  playReset(): void {
    const notes = [600, 500, 400, 300];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, 'sine', 0.12);
      }, i * 50);
    });
  }

  // 關卡完成
  playLevelComplete(): void {
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.25);
        this.playTone(freq * 1.5, 0.25, 'sine', 0.12);
      }, i * 100);
    });
  }

  // 下一關
  playNextLevel(): void {
    const notes = [523, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.2);
      }, i * 80);
    });
  }
}

// =====================
// Elements
// =====================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const levelDisplay = document.getElementById("level-display")!;
const progressDisplay = document.getElementById("progress-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const undoBtn = document.getElementById("undo-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const prevBtn = document.getElementById("prev-level")!;
const nextBtn = document.getElementById("next-level")!;

// =====================
// Global Variables
// =====================
let game: OneLineGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;
let lastProgress = 0;
let victoryAnimProgress = 0;
let isVictory = false;

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
    console.log('WebGPU renderer initialized');
  } else {
    console.log('Falling back to Canvas 2D');
    renderer = null;
  }
}

function initGame() {
  game = new OneLineGame(canvas);

  game.setOnStateChange((state: GameState) => {
    levelDisplay.textContent = state.level.toString();
    progressDisplay.textContent = `${state.progress}%`;

    // 檢測進度變化 -> 播放連接音效
    if (state.progress > lastProgress && lastProgress > 0) {
      audio.playConnect();

      // 連接效果
      if (renderer) {
        // 觸發連接粒子效果 (在當前節點位置)
      }
    }
    lastProgress = state.progress;

    if (state.status === "won" && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playLevelComplete();

      if (renderer) {
        renderer.emitLevelComplete(0.5, 0.5);
      }

      // 延遲顯示勝利畫面
      setTimeout(() => {
        showWinLevel();
      }, 1500);
    }
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";
  game.startLevel(0);
  lastProgress = 0;
  isVictory = false;
  victoryAnimProgress = 0;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

function showWinLevel() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.levelClear");
  overlayMsg.textContent = i18n.t("game.next");
  startBtn.textContent = i18n.t("game.next");

  startBtn.onclick = () => {
    overlay.style.display = "none";
    game.nextLevel();
    lastProgress = 0;
    isVictory = false;
    victoryAnimProgress = 0;

    if (renderer) {
      renderer.clearParticles();
      renderer.setVictory(0, 0.5, 0.5);
    }

    audio.playNextLevel();
    startBtn.onclick = startGame;
    startBtn.textContent = i18n.t("game.start");
  };
}

// =====================
// Game Loop
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // 更新勝利動畫
  if (isVictory && victoryAnimProgress < 1) {
    victoryAnimProgress = Math.min(1, victoryAnimProgress + deltaTime * 0.001);
    if (renderer) {
      renderer.setVictory(victoryAnimProgress, 0.5, 0.5);
    }
  }

  // WebGPU 渲染
  if (renderer && useWebGPU) {
    const { edges, nodes, dragLine } = getGameDataForRenderer();

    renderer.updateEdges(edges);
    renderer.updateNodes(nodes);
    renderer.setDragLine(dragLine);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// 從遊戲獲取渲染數據
function getGameDataForRenderer(): {
  edges: EdgeData[];
  nodes: NodeData[];
  dragLine: DragLine | null;
} {
  const gameAny = game as any;
  const currentLevel = gameAny.currentLevel as LevelData | null;
  const path = gameAny.path as number[];
  const visitedEdges = gameAny.visitedEdges as Set<string>;
  const currentNode = gameAny.currentNode as number | null;
  const interactionStartNode = gameAny.interactionStartNode as number | null;
  const interactionCurrentPos = gameAny.interactionCurrentPos as Point | null;

  if (!currentLevel) {
    return { edges: [], nodes: [], dragLine: null };
  }

  const w = canvas.width;
  const h = canvas.height;
  const pad = 40;
  const availW = w - pad * 2;
  const availH = h - pad * 2;

  // 轉換為標準化座標 (0-1)
  const toNorm = (p: Point) => ({
    x: (pad + p.x * availW) / w,
    y: 1 - (pad + p.y * availH) / h, // 翻轉 Y
  });

  // 邊
  const edges: EdgeData[] = currentLevel.edges.map((e) => {
    const p1 = toNorm(currentLevel.nodes[e[0]]);
    const p2 = toNorm(currentLevel.nodes[e[1]]);
    const key1 = `${e[0]}-${e[1]}`;
    const key2 = `${e[1]}-${e[0]}`;
    const visited = visitedEdges.has(key1) || visitedEdges.has(key2);

    return {
      startX: p1.x,
      startY: p1.y,
      endX: p2.x,
      endY: p2.y,
      visited,
    };
  });

  // 節點
  const nodes: NodeData[] = currentLevel.nodes.map((n, i) => {
    const pos = toNorm(n);
    let state: 'normal' | 'visited' | 'current' | 'start' = 'normal';

    if (i === currentNode) {
      state = 'current';
    } else if (path.length > 0 && i === path[0]) {
      state = 'start';
    } else if (path.includes(i)) {
      state = 'visited';
    }

    return {
      x: pos.x,
      y: pos.y,
      state,
      index: i,
    };
  });

  // 拖曳線
  let dragLine: DragLine | null = null;
  if (interactionStartNode !== null && interactionCurrentPos) {
    const startPos = toNorm(currentLevel.nodes[interactionStartNode]);
    const endPos = {
      x: interactionCurrentPos.x / w,
      y: 1 - interactionCurrentPos.y / h,
    };

    dragLine = {
      startX: startPos.x,
      startY: startPos.y,
      endX: endPos.x,
      endY: endPos.y,
    };

    // 軌跡粒子
    if (renderer) {
      renderer.emitTrail(endPos.x, endPos.y);
    }
  }

  return { edges, nodes, dragLine };
}

// =====================
// Input Handling
// =====================
function getPos(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return null;
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else return null;

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

canvas.addEventListener("mousedown", (e) => {
  const pos = getPos(e);
  if (pos) {
    audio.playSelect();
    game.handleDown(pos.x, pos.y);
  }
});

canvas.addEventListener("mousemove", (e) => {
  const pos = getPos(e);
  if (pos) game.handleMove(pos.x, pos.y);
});

canvas.addEventListener("mouseup", () => game.handleUp());
canvas.addEventListener("mouseleave", () => game.handleUp());

// Touch
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      audio.playSelect();
      game.handleDown(pos.x, pos.y);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) game.handleMove(pos.x, pos.y);
  },
  { passive: false }
);

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  game.handleUp();
});

startBtn.addEventListener("click", startGame);

undoBtn.addEventListener("click", () => {
  audio.playUndo();
  game.undo();
});

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  if (renderer) {
    renderer.emitReset(0.5, 0.5);
  }
});

prevBtn.addEventListener("click", () => {
  game.prevLevel();
  lastProgress = 0;
  isVictory = false;
});

nextBtn.addEventListener("click", () => {
  game.nextLevel();
  lastProgress = 0;
  isVictory = false;
  audio.playNextLevel();
});

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
