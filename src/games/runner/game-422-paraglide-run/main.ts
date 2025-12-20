import { ParaglideRunGame, GameState, Obstacle, Collectible } from "./game";
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

let game: ParaglideRunGame;
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
  game = new ParaglideRunGame();
  game.onStateChange = (state: GameState) => { updateUI(state); if (state.phase === "gameover") showGameOverOverlay(state); };
  window.addEventListener("keydown", (e) => { if (["ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault(); game.handleKeyDown(e.code); });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const upBtn = document.getElementById("up-btn");
  const downBtn = document.getElementById("down-btn");
  upBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.handleKeyDown("ArrowUp"); });
  upBtn?.addEventListener("touchend", () => game.handleKeyUp("ArrowUp"));
  downBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.handleKeyDown("ArrowDown"); });
  downBtn?.addEventListener("touchend", () => game.handleKeyUp("ArrowDown"));
}

function resizeCanvas(): void { canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450); canvas.height = 400; }

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#4fc3f7");
  gradient.addColorStop(0.7, "#81d4fa");
  gradient.addColorStop(1, "#a5d6a7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "#fff59d";
  ctx.beginPath();
  ctx.arc(width - 60, 50, 30, 0, Math.PI * 2);
  ctx.fill();

  // Ground
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, height - 30, width, 30);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
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

  state.obstacles.forEach(obs => drawObstacle(obs));
  state.collectibles.forEach(col => drawCollectible(col));
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate((player.rotation * Math.PI) / 180);

  // Paraglider canopy
  ctx.fillStyle = "#e91e63";
  ctx.beginPath();
  ctx.ellipse(0, -20, 35, 15, 0, Math.PI, 0);
  ctx.fill();

  // Canopy stripes
  ctx.fillStyle = "#f48fb1";
  ctx.beginPath();
  ctx.ellipse(-15, -20, 8, 12, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(15, -20, 8, 12, 0, Math.PI, 0);
  ctx.fill();

  // Lines
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-25, -15); ctx.lineTo(-5, 5);
  ctx.moveTo(25, -15); ctx.lineTo(5, 5);
  ctx.moveTo(0, -20); ctx.lineTo(0, 5);
  ctx.stroke();

  // Pilot
  ctx.fillStyle = "#ff9800";
  ctx.beginPath();
  ctx.ellipse(0, 10, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#ffcc80";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "cloud":
      ctx.fillStyle = "#eceff1";
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.arc(-25, 5, 18, 0, Math.PI * 2);
      ctx.arc(25, 5, 20, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bird":
      ctx.fillStyle = "#37474f";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -10);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-15, 10);
      ctx.lineTo(0, 0);
      ctx.lineTo(15, -8);
      ctx.lineTo(8, 0);
      ctx.lineTo(15, 8);
      ctx.closePath();
      ctx.fill();
      break;
    case "plane":
      ctx.fillStyle = "#90a4ae";
      ctx.fillRect(-30, -8, 60, 16);
      ctx.fillStyle = "#607d8b";
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(20, -8);
      ctx.lineTo(20, 8);
      ctx.fill();
      ctx.fillRect(-10, -25, 20, 20);
      break;
    case "mountain":
      ctx.fillStyle = "#5d4037";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height/2);
      ctx.lineTo(obs.width/2, obs.height/2);
      ctx.lineTo(-obs.width/2, obs.height/2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height/2);
      ctx.lineTo(15, -obs.height/2 + 30);
      ctx.lineTo(-15, -obs.height/2 + 30);
      ctx.closePath();
      ctx.fill();
      break;
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
      ctx.fillStyle = "#ff8f00";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 5);
      break;
    case "thermal":
      ctx.strokeStyle = "#ff5722";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 8 + i * 6, 0.5, 2.5);
        ctx.stroke();
      }
      break;
    case "star":
      ctx.fillStyle = "#ffeb3b";
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
