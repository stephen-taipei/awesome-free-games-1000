import { PixelRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: PixelRunGame;
let animationFrame: number | null = null;
let clouds: { x: number; y: number; width: number; speed: number }[] = [];

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => i18n.loadTranslations(locale as Locale, trans));
  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener("change", () => { i18n.setLocale(languageSelect.value as Locale); updateTexts(); });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();
  initClouds();
  game = new PixelRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initClouds(): void {
  clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * 450,
      y: 40 + Math.random() * 100,
      width: 40 + Math.random() * 40,
      speed: 0.3 + Math.random() * 0.5,
    });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
}

function resizeCanvas(): void {
  canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450);
  canvas.height = 400;
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Sky gradient - retro NES style
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#5c94fc");
  gradient.addColorStop(1, "#3cbcfc");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Pixel clouds
  const speed = state.phase === "playing" ? state.speed : 1;
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * speed * 0.1;
    if (cloud.x < -cloud.width) { cloud.x = width; cloud.y = 40 + Math.random() * 100; }
    drawPixelCloud(cloud.x, cloud.y, cloud.width);
  });

  // Ground
  const groundY = height - 80;

  // Grass blocks
  ctx.fillStyle = "#00d800";
  ctx.fillRect(0, groundY + 25, width, 8);

  // Dirt blocks
  ctx.fillStyle = "#a84c00";
  for (let x = 0; x < width; x += 16) {
    for (let y = groundY + 33; y < height; y += 16) {
      drawPixelBlock(x, y, 16, "#a84c00", "#804000");
    }
  }

  // Grid pattern on ground
  ctx.strokeStyle = "#00a800";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.strokeRect(i * (width / 3), groundY + 25, width / 3, 8);
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPixelCloud(x: number, y: number, w: number): void {
  ctx.fillStyle = "#ffffff";
  // Pixel cloud shape
  const pixels = [
    [0, 0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
  ];
  const scale = w / 64;
  pixels.forEach((row, j) => {
    row.forEach((pixel, i) => {
      if (pixel) {
        ctx.fillRect(x + i * 8 * scale, y + j * 8, 8 * scale, 8);
      }
    });
  });
}

function drawPixelBlock(x: number, y: number, size: number, color: string, shadowColor: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = shadowColor;
  ctx.fillRect(x + size - 4, y + 4, 4, size - 4);
  ctx.fillRect(x + 4, y + size - 4, size - 4, 4);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  const x = Math.floor(player.x - 16);
  const y = Math.floor(player.y - 16);

  ctx.save();

  // Power-up glow
  if (state.hasPowerUp) {
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    ctx.fillRect(x - 4, y - 4, 40, 40);
  }

  // Retro pixel character (Mario-style)
  const pixels = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 2, 2, 3, 3, 2, 2, 0],
    [0, 2, 3, 3, 3, 3, 2, 0],
    [0, 0, 3, 3, 3, 3, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 2, 2, 0, 0, 2, 2, 0],
  ];

  const colors: { [key: number]: string } = {
    0: 'transparent',
    1: '#fc0000', // Red (body)
    2: '#a84c00', // Brown (boots)
    3: '#fcbc3c', // Tan (skin)
  };

  pixels.forEach((row, j) => {
    row.forEach((pixel, i) => {
      if (pixel !== 0) {
        ctx.fillStyle = colors[pixel];
        ctx.fillRect(x + i * 4, y + j * 4, 4, 4);
      }
    });
  });

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  const x = Math.floor(obs.x - obs.width / 2);
  const y = Math.floor(obs.y - obs.height / 2);

  ctx.save();

  switch (obs.type) {
    case 'block':
      drawPixelBlock(x, y, 32, "#d89048", "#a84c00");
      // Question mark
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("?", x + 16, y + 22);
      break;

    case 'spike':
      ctx.fillStyle = "#8b8b8b";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 8, y + 24);
        ctx.lineTo(x + i * 8 + 4, y);
        ctx.lineTo(x + i * 8 + 8, y + 24);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#5b5b5b";
      ctx.fillRect(x, y + 24, 32, 4);
      break;

    case 'gap':
      // Draw gap outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, obs.width, obs.height);
      break;

    case 'mushroom':
      // Mushroom enemy (Goomba-style)
      ctx.fillStyle = "#a84c00";
      ctx.fillRect(x + 4, y + 20, 24, 16);
      ctx.fillStyle = "#fc0000";
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(x + i * 4, y + 8, 4, 12);
      }
      // Eyes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 8, y + 24, 4, 4);
      ctx.fillRect(x + 20, y + 24, 4, 4);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 10, y + 26, 2, 2);
      ctx.fillRect(x + 22, y + 26, 2, 2);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  const x = Math.floor(col.x);
  const y = Math.floor(col.y);
  const frame = col.animFrame;

  ctx.save();

  switch (col.type) {
    case 'coin':
      // Spinning coin animation
      const coinWidth = [8, 6, 4, 6][frame];
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(x - coinWidth / 2, y - 8, coinWidth, 16);
      ctx.fillStyle = "#ffed4e";
      ctx.fillRect(x - coinWidth / 2 + 1, y - 6, coinWidth - 2, 12);
      break;

    case 'powerup':
      // Power star
      ctx.fillStyle = "#00ff00";
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(x - 8 + i * 2, y - 8 + (i % 2) * 2, 2, 16 - (i % 2) * 4);
      }
      ctx.fillStyle = "#50ff50";
      ctx.fillRect(x - 4, y - 4, 8, 8);
      break;

    case 'oneup':
      // 1-UP mushroom
      ctx.fillStyle = "#00d800";
      ctx.fillRect(x - 8, y - 4, 16, 12);
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - 8 + i * 4, y - 12, 4, 8);
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 4, y - 8, 8, 4);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  coinsDisplay.textContent = state.coins.toString();
  livesDisplay.textContent = "×" + state.lives.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.coins")}</div><div class="stat-value">${state.coins}</div></div>
  `;
  statsGrid.style.display = "grid";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  statsGrid.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
