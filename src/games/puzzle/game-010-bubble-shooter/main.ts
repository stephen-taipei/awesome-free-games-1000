/**
 * Bubble Shooter Main Entry - WebGPU Enhanced
 * Game #010
 */
import { BubbleShooter, type GameState, type Bubble, type Projectile } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type BubbleData, type ProjectileData, type AimData } from "./webgpu/renderer";

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

  // 發射泡泡
  playShoot(): void {
    this.playTone(300, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(400, 0.08, 'sine', 0.15), 30);
  }

  // 泡泡碰撞/附著
  playAttach(): void {
    this.playTone(500, 0.08, 'sine', 0.15);
  }

  // 泡泡爆破 (根據數量有不同效果)
  playPop(count: number, colorIndex: number): void {
    const baseFreqs = [523, 587, 659, 698, 784, 880];
    const baseFreq = baseFreqs[colorIndex % 6];

    // 基礎爆破音
    this.playTone(baseFreq, 0.1, 'sine', 0.2);

    // 多個泡泡時增加和弦
    if (count >= 3) {
      setTimeout(() => {
        this.playTone(baseFreq * 1.25, 0.12, 'sine', 0.18);
      }, 30);
    }
    if (count >= 4) {
      setTimeout(() => {
        this.playTone(baseFreq * 1.5, 0.15, 'sine', 0.15);
      }, 60);
    }
    if (count >= 5) {
      setTimeout(() => {
        this.playTone(baseFreq * 2, 0.18, 'sine', 0.12);
      }, 90);
    }
  }

  // 浮空泡泡掉落
  playCascade(count: number): void {
    for (let i = 0; i < Math.min(count, 5); i++) {
      setTimeout(() => {
        this.playTone(600 - i * 80, 0.1, 'triangle', 0.15);
      }, i * 50);
    }
  }

  // 牆壁反彈
  playBounce(): void {
    this.playTone(200, 0.05, 'square', 0.1);
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

  // 勝利
  playVictory(): void {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.25);
        this.playTone(freq * 1.5, 0.25, 'sine', 0.12);
      }, i * 120);
    });
  }

  // 遊戲結束
  playGameOver(): void {
    const notes = [440, 349, 294, 220];
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
const highScoreDisplay = document.getElementById("high-score-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// =====================
// 全局變量
// =====================
let game: BubbleShooter;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;
let lastScore = 0;
let mousePos = { x: 0, y: 0 };

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
    renderer.setGameSize(8, 12);
    console.log('WebGPU renderer initialized');
  } else {
    console.log('Falling back to Canvas 2D');
    renderer = null;
  }
}

function initGame() {
  game = new BubbleShooter(canvas);

  game.setOnStateChange((state: GameState) => {
    scoreDisplay.textContent = state.score.toString();
    highScoreDisplay.textContent = state.highScore.toString();
    levelDisplay.textContent = state.level.toString();

    // 檢測分數變化
    if (state.score > lastScore) {
      const diff = state.score - lastScore;
      // 根據分數判斷是爆破還是掉落
      if (diff >= 20) {
        // 有浮空泡泡掉落
        const cascadeCount = Math.floor((diff - 10) / 20);
        audio.playCascade(cascadeCount);
      }
      lastScore = state.score;
    }

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
  lastScore = 0;

  audio.playStart();

  if (renderer) {
    renderer.clearParticles();
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
  startBtn.textContent = i18n.t("game.tryAgain");

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
    const { bubbles, projectile, bubbleCount } = getBubblesFromGame();

    renderer.updateBubbles(bubbles, projectile);

    // 更新瞄準線
    if (!projectile) {
      const gameAny = game as any;
      const startX = canvas.width / 2;
      const startY = canvas.height - gameAny.radius * 2;

      // 轉換為遊戲坐標
      const gameStartX = screenToGameX(startX);
      const gameStartY = screenToGameY(startY);
      const gameTargetX = screenToGameX(mousePos.x);
      const gameTargetY = screenToGameY(mousePos.y);

      renderer.updateAimLine({
        startX: gameStartX,
        startY: gameStartY,
        targetX: gameTargetX,
        targetY: gameTargetY,
      });
    } else {
      renderer.updateAimLine(null);
    }

    renderer.render(deltaTime, bubbleCount);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// 坐標轉換
function screenToGameX(screenX: number): number {
  const gameAny = game as any;
  const radius = gameAny.radius || 20;
  const cols = gameAny.cols || 8;
  return screenX / radius / 2;
}

function screenToGameY(screenY: number): number {
  const gameAny = game as any;
  const radius = gameAny.radius || 20;
  // 翻轉 Y 軸 (螢幕 Y 向下, 遊戲 Y 向上)
  return (canvas.height - screenY) / radius / Math.sqrt(3);
}

// 從遊戲獲取泡泡數據
function getBubblesFromGame(): {
  bubbles: BubbleData[];
  projectile: ProjectileData | null;
  bubbleCount: number;
} {
  const gameAny = game as any;
  const grid = gameAny.grid || [];
  const proj = gameAny.projectile as Projectile | null;
  const radius = gameAny.radius || 20;

  const bubbles: BubbleData[] = [];

  // 網格泡泡
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const b = grid[r][c] as Bubble | null;
      if (b && b.active) {
        bubbles.push({
          x: b.x / radius / 2,
          y: (canvas.height - b.y) / radius / Math.sqrt(3),
          colorIndex: b.type,
          selected: false,
          popping: false,
          scale: 1,
        });
      }
    }
  }

  // 投射泡泡
  let projectile: ProjectileData | null = null;
  if (proj) {
    projectile = {
      x: proj.x / radius / 2,
      y: (canvas.height - proj.y) / radius / Math.sqrt(3),
      colorIndex: proj.type,
    };

    // 軌跡粒子
    if (renderer) {
      renderer.emitTrail(projectile.x, projectile.y, proj.type);
    }
  }

  return {
    bubbles,
    projectile,
    bubbleCount: bubbles.length + (projectile ? 1 : 0),
  };
}

// =====================
// 輸入處理
// =====================
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mousePos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
});

canvas.addEventListener("click", () => {
  const gameAny = game as any;
  const hadProjectile = gameAny.projectile !== null;

  game.shoot();

  if (!hadProjectile && gameAny.projectile !== null) {
    audio.playShoot();
    if (renderer) {
      const startX = canvas.width / 2;
      const startY = canvas.height - gameAny.radius * 2;
      renderer.emitShoot(
        screenToGameX(startX),
        screenToGameY(startY),
        gameAny.currentBubbleType
      );
    }
  }
});

// 觸控支持
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  mousePos = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  mousePos = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const gameAny = game as any;
  const hadProjectile = gameAny.projectile !== null;

  game.shoot();

  if (!hadProjectile && gameAny.projectile !== null) {
    audio.playShoot();
  }
}, { passive: false });

startBtn.addEventListener("click", startGame);

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
