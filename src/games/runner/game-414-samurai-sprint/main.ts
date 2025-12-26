import { SamuraiSprintGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const honorDisplay = document.getElementById("honor-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SamuraiSprintGame;
let animationFrame: number | null = null;

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
  game = new SamuraiSprintGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  document.getElementById("left-btn")?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  document.getElementById("right-btn")?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  document.getElementById("jump-btn")?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
}

function resizeCanvas(): void {
  canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450);
  canvas.height = 400;
}

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Dawn sky background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#ff7f50");
  gradient.addColorStop(0.3, "#ffd700");
  gradient.addColorStop(0.6, "#ffe4b5");
  gradient.addColorStop(1, "#f5deb3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "#ff4500";
  ctx.beginPath();
  ctx.arc(width - 70, 60, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff6347";
  ctx.beginPath();
  ctx.arc(width - 70, 60, 30, 0, Math.PI * 2);
  ctx.fill();

  // Mountains silhouette
  ctx.fillStyle = "#4a3728";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.5);
  ctx.lineTo(80, height * 0.3);
  ctx.lineTo(160, height * 0.45);
  ctx.lineTo(240, height * 0.25);
  ctx.lineTo(320, height * 0.4);
  ctx.lineTo(400, height * 0.35);
  ctx.lineTo(width, height * 0.5);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();

  // Ground (dirt path)
  const groundY = height - 80;
  ctx.fillStyle = "#8b7355";
  ctx.fillRect(0, groundY + 20, width, 60);
  ctx.fillStyle = "#a0826d";
  ctx.fillRect(0, groundY + 20, width, 10);

  // Path markings
  for (let i = 0; i < width; i += 60) {
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(i + 10, groundY + 35, 30, 4);
  }

  // Cherry blossom trees in background
  for (let i = 0; i < 3; i++) {
    const treeX = 50 + i * 180;
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(treeX - 6, groundY - 80, 12, 100);
    ctx.fillStyle = "#ffb7c5";
    ctx.beginPath();
    ctx.arc(treeX, groundY - 90, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff9eb5";
    ctx.beginPath();
    ctx.arc(treeX - 15, groundY - 100, 20, 0, Math.PI * 2);
    ctx.arc(treeX + 15, groundY - 100, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(139, 115, 85, 0.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "#4a3728";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Falling cherry blossoms
  for (let i = 0; i < 8; i++) {
    const petalX = ((i * 73 + Date.now() * 0.03) % (width + 40)) - 20;
    const petalY = ((i * 97 + Date.now() * 0.02) % (height * 0.6));
    ctx.fillStyle = `rgba(255, 183, 197, ${0.4 + Math.sin(Date.now() * 0.002 + i) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(petalX, petalY, 4, 6, Date.now() * 0.002 + i, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collectibles
  state.collectibles.forEach((col) => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach((obs) => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  const x = player.x;
  const y = player.y;

  // Spirit aura
  if (state.hasSpirit) {
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.15;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
    gradient.addColorStop(0, "#ff6b6b");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Hakama (lower robe)
  ctx.fillStyle = "#1a1a4e";
  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x - 18, y + 22);
  ctx.lineTo(x + 18, y + 22);
  ctx.lineTo(x + 14, y);
  ctx.fill();

  // Upper body (kimono)
  ctx.fillStyle = "#2d2d6e";
  ctx.fillRect(x - 12, y - 16, 24, 20);

  // Shoulders/arms
  ctx.fillStyle = "#2d2d6e";
  ctx.fillRect(x - 18, y - 12, 8, 14);
  ctx.fillRect(x + 10, y - 12, 8, 14);

  // Head
  ctx.fillStyle = "#e8d4b8";
  ctx.beginPath();
  ctx.arc(x, y - 24, 10, 0, Math.PI * 2);
  ctx.fill();

  // Hair (topknot)
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(x, y - 28, 6, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 2, y - 38, 4, 10);

  // Headband
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(x - 10, y - 28, 20, 3);

  // Eyes
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x - 5, y - 24, 3, 2);
  ctx.fillRect(x + 2, y - 24, 3, 2);

  // Katana on back
  ctx.fillStyle = "#4a4a4a";
  ctx.save();
  ctx.translate(x + 8, y - 10);
  ctx.rotate(-0.3);
  ctx.fillRect(-2, -30, 4, 45);
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(-3, 10, 6, 10);
  ctx.restore();

  // Slash effect
  if (player.isSlashing) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 20);
    ctx.lineTo(x + 30, y + 10);
    ctx.stroke();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawObstacle(obs: Obstacle): void {
  const x = obs.x;
  const y = obs.y;

  switch (obs.type) {
    case "ronin":
      // Enemy samurai
      ctx.fillStyle = "#3d0000";
      ctx.fillRect(x - 12, y - 18, 24, 36);
      ctx.fillStyle = "#e8d4b8";
      ctx.beginPath();
      ctx.arc(x, y - 24, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(x, y - 28, 5, Math.PI, 0);
      ctx.fill();
      // Sword
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(x + 12, y - 25, 3, 35);
      break;
    case "archer":
      // Archer enemy
      ctx.fillStyle = "#2d4a2d";
      ctx.fillRect(x - 10, y - 12, 20, 28);
      ctx.fillStyle = "#e8d4b8";
      ctx.beginPath();
      ctx.arc(x, y - 18, 7, 0, Math.PI * 2);
      ctx.fill();
      // Bow
      ctx.strokeStyle = "#8b4513";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x - 15, y, 18, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      // Arrow
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(x - 15, y - 1, 25, 2);
      break;
    case "barrel":
      // Sake barrel
      ctx.fillStyle = "#8b4513";
      ctx.beginPath();
      ctx.ellipse(x, y, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a0522d";
      ctx.fillRect(x - 16, y - 10, 32, 20);
      ctx.fillStyle = "#4a3728";
      ctx.fillRect(x - 18, y - 6, 36, 4);
      ctx.fillRect(x - 18, y + 2, 36, 4);
      // Kanji mark
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "12px serif";
      ctx.textAlign = "center";
      ctx.fillText("酒", x, y + 4);
      break;
    case "banner":
      // War banner
      ctx.fillStyle = "#4a3728";
      ctx.fillRect(x - 2, y - 25, 4, 50);
      ctx.fillStyle = "#cc0000";
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 25);
      ctx.lineTo(x + 25, y - 20);
      ctx.lineTo(x + 22, y);
      ctx.lineTo(x + 2, y - 5);
      ctx.fill();
      // Clan symbol
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(x + 12, y - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawCollectible(col: Collectible): void {
  const x = col.x;
  const y = col.y;
  const bounce = Math.sin(Date.now() * 0.005) * 4;

  switch (col.type) {
    case "honor":
      // Honor medal
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(x, y + bounce, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff8c00";
      ctx.beginPath();
      ctx.arc(x, y + bounce, 8, 0, Math.PI * 2);
      ctx.fill();
      // Kanji
      ctx.fillStyle = "#8b0000";
      ctx.font = "10px serif";
      ctx.textAlign = "center";
      ctx.fillText("誉", x, y + 4 + bounce);
      break;
    case "katana":
      // Golden katana
      ctx.fillStyle = "#ffd700";
      ctx.save();
      ctx.translate(x, y + bounce);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-2, -18, 4, 28);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-4, 8, 8, 8);
      ctx.restore();
      // Glow
      ctx.strokeStyle = "#ffec8b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + bounce, 16, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "spirit":
      // Samurai spirit orb
      const gradient = ctx.createRadialGradient(x, y + bounce, 0, x, y + bounce, 14);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.5, "#ff6b6b");
      gradient.addColorStop(1, "#cc0000");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y + bounce, 14, 0, Math.PI * 2);
      ctx.fill();
      // Inner glow
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(x - 3, y - 3 + bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
  honorDisplay.textContent = state.honor.toString();
  speedDisplay.textContent = state.speed.toFixed(1);
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.honor")}</div><div class="stat-value">${state.honor}</div></div>
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
