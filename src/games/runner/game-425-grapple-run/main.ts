import { GrappleRunGame, GameState, Obstacle, Collectible, GrapplePoint } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: GrappleRunGame;
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
  game = new GrappleRunGame();
  game.onStateChange = (state: GameState) => { updateUI(state); if (state.phase === "gameover") showGameOverOverlay(state); };
  window.addEventListener("keydown", (e) => { if (e.code === "Space") e.preventDefault(); game.handleKeyDown(e.code); });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const grappleBtn = document.getElementById("grapple-btn");
  grappleBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.grapple(); });
}

function resizeCanvas(): void { canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450); canvas.height = 400; }

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;
  const groundY = height - 50;

  // Background - night city
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(0.7, "#2d2d44");
  gradient.addColorStop(1, "#3d3d5c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Buildings silhouette
  ctx.fillStyle = "#16213e";
  for (let i = 0; i < 8; i++) {
    const bw = 40 + Math.random() * 30;
    const bh = 100 + Math.random() * 150;
    ctx.fillRect(i * 60, groundY - bh, bw, bh);
  }

  // Ground
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, groundY, width, 50);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Grapple points
  state.grapplePoints.forEach(gp => drawGrapplePoint(gp));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs, groundY));

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Rope
  if (state.player.isSwinging && state.player.grapplePoint) {
    ctx.strokeStyle = "#f39c12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y);
    ctx.lineTo(state.player.grapplePoint.x, state.player.grapplePoint.y);
    ctx.stroke();
  }

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-10, -15, 20, 30);

  // Head
  ctx.fillStyle = "#f4d03f";
  ctx.beginPath();
  ctx.arc(0, -22, 8, 0, Math.PI * 2);
  ctx.fill();

  // Grapple gun
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(8, -5, 12, 8);

  // Cape
  ctx.fillStyle = "#9b59b6";
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(-20, 15 + (player.isSwinging ? Math.sin(Date.now() * 0.01) * 5 : 0));
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGrapplePoint(gp: GrapplePoint): void {
  ctx.save();
  ctx.translate(gp.x, gp.y);

  // Glow
  ctx.fillStyle = "rgba(243, 156, 18, 0.3)";
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  // Hook point
  ctx.fillStyle = "#f39c12";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.fillStyle = "#e67e22";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle, groundY: number): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  if (obs.type === 'pit') {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(-obs.width/2, -10, obs.width, 60);
    // Spikes at bottom
    ctx.fillStyle = "#e74c3c";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-obs.width/2 + 8 + i * 15, 40);
      ctx.lineTo(-obs.width/2 + 15 + i * 15, 20);
      ctx.lineTo(-obs.width/2 + 22 + i * 15, 40);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  if (col.collected) return;
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "coin":
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "gem":
      ctx.fillStyle = "#9b59b6";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case "star":
      ctx.fillStyle = "#f1c40f";
      drawStar(0, 0, 5, 15, 7);
      break;
  }
  ctx.restore();
}

function drawStar(cx: number, cy: number, spikes: number, outerR: number, innerR: number): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
  coinsDisplay.textContent = state.coins.toString();
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

function startGame(): void { overlay.style.display = "none"; finalScoreDisplay.style.display = "none"; statsGrid.style.display = "none"; game.start(); }

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
