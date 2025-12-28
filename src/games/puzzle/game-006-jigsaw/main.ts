/**
 * Jigsaw Puzzle Main Entry - WebGPU 3D Edition
 * Game #006
 *
 * Features:
 * - WebGPU 3D rendering with textured puzzle pieces
 * - Interlocking tabs with PBR lighting
 * - Particle effects for snap, pickup, victory
 * - Synthesized audio feedback
 * - Cyberpunk neon aesthetic
 */
import { JigsawGame, DIFFICULTY_CONFIGS, type Difficulty, type Piece } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { isTouchDevice } from "../../../shared/utils";
import { WebGPURenderer, type PieceState } from "./webgpu";

import natureImg from "./assets/images/nature.jpg";
import cityImg from "./assets/images/city.jpg";
import animalsImg from "./assets/images/animals.jpg";

// ============================================================================
// Audio System - Web Audio API 合成音效
// ============================================================================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  async init(): Promise<void> {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine',
                   attack = 0.01, decay = 0.1, volume = 0.5): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume = 0.1): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    source.buffer = buffer;
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
  }

  // 拾取拼圖片
  playPickup(): void {
    this.playTone(440, 0.1, 'sine', 0.01, 0.05, 0.3);
    this.playTone(660, 0.1, 'sine', 0.02, 0.05, 0.2);
  }

  // 放下拼圖片（未扣合）
  playDrop(): void {
    this.playNoise(0.15, 0.15);
    this.playTone(200, 0.1, 'triangle', 0.01, 0.05, 0.2);
  }

  // 扣合成功
  playSnap(): void {
    // 清脆的扣合聲
    this.playTone(880, 0.15, 'sine', 0.005, 0.1, 0.4);
    this.playTone(1320, 0.12, 'sine', 0.01, 0.08, 0.3);
    this.playTone(1760, 0.1, 'sine', 0.02, 0.06, 0.2);
    this.playNoise(0.08, 0.1);
  }

  // 接近目標位置
  playNearTarget(): void {
    this.playTone(660, 0.08, 'sine', 0.01, 0.04, 0.15);
  }

  // 拖動中
  playDrag(): void {
    if (!this.ctx || !this.enabled) return;
    // 輕微的滑動聲
    this.playNoise(0.05, 0.03);
  }

  // 勝利音效
  playVictory(): void {
    const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 to G6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine', 0.02, 0.2, 0.4);
        this.playTone(freq * 1.5, 0.3, 'triangle', 0.05, 0.15, 0.2);
      }, i * 100);
    });

    // 閃爍音效
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          this.playTone(2000 + Math.random() * 2000, 0.1, 'sine', 0.01, 0.05, 0.15);
        }, i * 80);
      }
    }, 600);
  }

  // 開始遊戲
  playStart(): void {
    this.playTone(330, 0.15, 'sine', 0.02, 0.1, 0.3);
    setTimeout(() => this.playTone(440, 0.15, 'sine', 0.02, 0.1, 0.3), 100);
    setTimeout(() => this.playTone(550, 0.2, 'sine', 0.02, 0.1, 0.4), 200);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

// ============================================================================
// DOM Elements
// ============================================================================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const startBtn = document.getElementById("start-btn")!;
const difficultySelect = document.getElementById("difficulty-select") as HTMLSelectElement;
const imageSelect = document.getElementById("image-select") as HTMLSelectElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const helpBtn = document.getElementById("help-btn")!;
const helpModal = document.getElementById("help-modal")!;
const modalClose = document.getElementById("modal-close")!;
const loadingOverlay = document.getElementById("loading-overlay")!;
const gameOverlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayStats = document.getElementById("overlay-stats")!;
const playAgainBtn = document.getElementById("play-again-btn")!;
const timeCounter = document.getElementById("time-counter")!;
const pieceCounter = document.getElementById("piece-counter")!;

// ============================================================================
// Game State
// ============================================================================
let game: JigsawGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let animationFrameId: number | null = null;
let lastTime = 0;
let useWebGPU = false;
let loadedImage: HTMLImageElement | null = null;

// 追蹤拼圖狀態
let selectedPieceId: number | null = null;
let lastLockedCount = 0;

const IMAGE_SOURCES = {
  nature: natureImg,
  city: cityImg,
  animals: animalsImg,
};

// ============================================================================
// Initialization
// ============================================================================
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

  Array.from(difficultySelect.options).forEach((opt) => {
    opt.textContent = i18n.t(`diff.${opt.value}`);
  });
  Array.from(imageSelect.options).forEach((opt) => {
    opt.textContent = i18n.t(`img.${opt.value}`);
  });
}

async function initWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    console.warn('WebGPU not supported');
    return false;
  }

  try {
    renderer = new WebGPURenderer(canvas);
    await renderer.init();
    return true;
  } catch (e) {
    console.warn('WebGPU init failed:', e);
    renderer = null;
    return false;
  }
}

// ============================================================================
// UI Functions
// ============================================================================
function showLoading(show: boolean) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

function showOverlay(won: boolean) {
  gameOverlay.style.display = "flex";
  if (won) {
    overlayTitle.textContent = i18n.t("game.youWin");
    overlayTitle.classList.add("win");

    const playTime = game.getPlayTime();
    const mins = Math.floor(playTime / 60);
    const secs = playTime % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    overlayStats.textContent = `${i18n.t("game.time")}: ${timeStr}`;
  }
}

function updatePieceCounter() {
  if (!game) return;
  const state = game.getState();
  const total = state.pieces.length;
  const locked = state.pieces.filter(p => p.isLocked).length;
  pieceCounter.textContent = `${locked}/${total}`;
}

// ============================================================================
// Game Logic
// ============================================================================
async function startNewGame() {
  const diff = difficultySelect.value as Difficulty;
  const imgKey = imageSelect.value as keyof typeof IMAGE_SOURCES;
  const imgSrc = IMAGE_SOURCES[imgKey];

  showLoading(true);
  gameOverlay.style.display = "none";
  audio.resume();

  // 停止現有動畫
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  try {
    // 創建遊戲實例
    game = new JigsawGame(canvas, diff);
    await game.loadImage(imgSrc);

    // 獲取圖片用於 WebGPU
    loadedImage = game.getImage();

    // 獲取難度配置
    const config = DIFFICULTY_CONFIGS[diff];

    if (useWebGPU && renderer && loadedImage) {
      // 加載紋理到 WebGPU
      await renderer.loadTexture(loadedImage);

      // 設定網格
      const canvasRect = canvas.getBoundingClientRect();
      const puzzleSize = Math.min(canvasRect.width, canvasRect.height) * 0.8;
      renderer.setGrid(config.rows, config.cols, puzzleSize, puzzleSize);
    }

    // 設定回調
    game.setOnStateChange((state) => {
      updatePieceCounter();

      // 檢查是否有新的扣合
      const currentLocked = state.pieces.filter(p => p.isLocked).length;
      if (currentLocked > lastLockedCount) {
        // 有新的拼圖扣合
        audio.playSnap();

        if (useWebGPU && renderer) {
          const newlyLocked = state.pieces.find(p => p.isLocked && !p.wasLocked);
          if (newlyLocked) {
            // 發射扣合粒子效果
            const worldPos = renderer.screenToWorld(
              newlyLocked.currentX + newlyLocked.width / 2,
              newlyLocked.currentY + newlyLocked.height / 2,
              canvas.width,
              canvas.height
            );
            renderer.emitSnapEffect(worldPos.x, worldPos.z);
          }
        }
      }
      lastLockedCount = currentLocked;
    });

    game.setOnGameEnd((won) => {
      stopTimer();
      if (won) {
        audio.playVictory();
        if (useWebGPU && renderer) {
          renderer.setVictory(true);
        }
      }
      showOverlay(won);
    });

    // 重置狀態
    selectedPieceId = null;
    lastLockedCount = 0;

    // 開始遊戲
    game.start();
    audio.playStart();
    startTimer();
    updatePieceCounter();

    // 開始渲染循環
    if (useWebGPU && renderer) {
      lastTime = performance.now();
      renderer.setVictory(false);
      requestAnimationFrame(renderLoop);
    }

  } catch (err) {
    console.error(err);
    alert("Failed to load image");
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// WebGPU Render Loop
// ============================================================================
function renderLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (game && renderer) {
    const state = game.getState();

    // 轉換拼圖片狀態給 WebGPU
    const pieceStates: PieceState[] = state.pieces.map(piece => {
      // 計算 UV 座標
      const img = loadedImage!;
      const uvOffsetX = piece.imgX / img.width;
      const uvOffsetY = piece.imgY / img.height;
      const uvScaleX = piece.width / img.width;
      const uvScaleY = piece.height / img.height;

      return {
        id: piece.id,
        row: piece.row,
        col: piece.col,
        currentX: piece.currentX,
        currentY: piece.currentY,
        targetX: piece.x,
        targetY: piece.y,
        width: piece.width,
        height: piece.height,
        uvOffsetX,
        uvOffsetY,
        uvScaleX,
        uvScaleY,
        edges: piece.edges,
        isLocked: piece.isLocked,
        isSelected: piece.id === selectedPieceId,
        isHovered: false,
      };
    });

    renderer.updatePieces(pieceStates);
    renderer.render(deltaTime);
  }

  animationFrameId = requestAnimationFrame(renderLoop);
}

// ============================================================================
// Timer
// ============================================================================
function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (game) {
      const t = game.getPlayTime();
      const mins = Math.floor(t / 60).toString().padStart(2, "0");
      const secs = (t % 60).toString().padStart(2, "0");
      timeCounter.textContent = `${mins}:${secs}`;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ============================================================================
// Input Handling
// ============================================================================
function handleInput(e: MouseEvent | TouchEvent, type: "down" | "move" | "up") {
  if (!game) return;

  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Touch end
      if (selectedPieceId !== null) {
        audio.playDrop();
      }
      selectedPieceId = null;
      game.handleUp();
      return;
    }
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    return;
  }

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (type === "down") {
    game.handleDown(x, y);

    // 檢查是否選中了拼圖片
    const state = game.getState();
    const clickedPiece = state.pieces.find(p =>
      !p.isLocked &&
      x >= p.currentX && x <= p.currentX + p.width &&
      y >= p.currentY && y <= p.currentY + p.height
    );

    if (clickedPiece) {
      selectedPieceId = clickedPiece.id;
      audio.playPickup();

      if (useWebGPU && renderer) {
        const worldPos = renderer.screenToWorld(
          clickedPiece.currentX + clickedPiece.width / 2,
          clickedPiece.currentY + clickedPiece.height / 2,
          canvas.width,
          canvas.height
        );
        renderer.emitPickupEffect(worldPos.x, worldPos.z, clickedPiece.width, clickedPiece.height);
      }
    }
  } else if (type === "move") {
    game.handleMove(x, y);

    // 拖動時發射軌跡粒子
    if (selectedPieceId !== null && useWebGPU && renderer) {
      const state = game.getState();
      const piece = state.pieces.find(p => p.id === selectedPieceId);
      if (piece) {
        const worldPos = renderer.screenToWorld(
          piece.currentX + piece.width / 2,
          piece.currentY + piece.height / 2,
          canvas.width,
          canvas.height
        );
        renderer.emitTrailEffect(worldPos.x, worldPos.z);

        // 檢查是否接近目標位置
        const dx = piece.currentX - piece.x;
        const dy = piece.currentY - piece.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < piece.width * 0.5 && dist > piece.width * 0.15) {
          audio.playNearTarget();
          renderer.emitNearTargetEffect(
            (piece.x + piece.width / 2 - canvas.width / 2) / canvas.width * 4,
            (piece.y + piece.height / 2 - canvas.height / 2) / canvas.height * 4
          );
        }
      }
    }
  } else if (type === "up") {
    if (selectedPieceId !== null) {
      audio.playDrop();
    }
    selectedPieceId = null;
    game.handleUp();
  }
}

// ============================================================================
// Camera Controls (WebGPU only)
// ============================================================================
let isDraggingCamera = false;
let lastMouseX = 0;
let lastMouseY = 0;

function handleCameraInput(e: MouseEvent | TouchEvent) {
  if (!useWebGPU || !renderer) return;

  // 右鍵拖動旋轉相機
  if (e instanceof MouseEvent) {
    if (e.type === 'mousedown' && e.button === 2) {
      isDraggingCamera = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      e.preventDefault();
    } else if (e.type === 'mousemove' && isDraggingCamera) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      renderer.rotateCamera(deltaX * 0.005, deltaY * 0.005);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    } else if (e.type === 'mouseup' && e.button === 2) {
      isDraggingCamera = false;
    }
  }
}

function handleWheel(e: WheelEvent) {
  if (!useWebGPU || !renderer) return;

  // 滾輪縮放
  renderer.zoomCamera(e.deltaY * 0.001);
  e.preventDefault();
}

// ============================================================================
// Event Listeners
// ============================================================================
startBtn.addEventListener("click", startNewGame);
playAgainBtn.addEventListener("click", startNewGame);

// 遊戲輸入
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) handleInput(e, "down");
  handleCameraInput(e);
});
window.addEventListener("mousemove", (e) => {
  handleInput(e, "move");
  handleCameraInput(e);
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) handleInput(e, "up");
  handleCameraInput(e);
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleInput(e, "down");
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  handleInput(e, "move");
}, { passive: false });
window.addEventListener("touchend", (e) => handleInput(e, "up"));

// 相機控制
canvas.addEventListener("wheel", handleWheel, { passive: false });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Help modal
helpBtn.addEventListener("click", () => (helpModal.style.display = "flex"));
modalClose.addEventListener("click", () => (helpModal.style.display = "none"));

// 音效切換按鈕
const soundToggle = document.createElement('button');
soundToggle.id = 'sound-toggle';
soundToggle.innerHTML = '🔊';
soundToggle.title = 'Toggle Sound';
soundToggle.addEventListener('click', () => {
  const enabled = audio.toggle();
  soundToggle.innerHTML = enabled ? '🔊' : '🔇';
});
document.querySelector('.controls')?.appendChild(soundToggle);

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  initI18n();

  // 初始化音效系統
  audio = new AudioSystem();
  await audio.init();

  // 初始化 WebGPU
  useWebGPU = await initWebGPU();

  if (useWebGPU) {
    console.log('🎮 WebGPU 3D mode enabled');
    document.body.classList.add('webgpu-enabled');
  } else {
    console.log('📱 Fallback to Canvas 2D mode');
    document.body.classList.add('canvas-fallback');
  }

  // 顯示提示
  showLoading(false);
}

init();
