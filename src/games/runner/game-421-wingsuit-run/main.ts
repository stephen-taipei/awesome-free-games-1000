import { WingsuitRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const ringsDisplay = document.getElementById("rings-display")!;
const altitudeDisplay = document.getElementById("altitude-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: WingsuitRunGame;
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
  game = new WingsuitRunGame();
  game.onStateChange = (state: GameState) => { updateUI(state); if (state.phase === "gameover") showGameOverOverlay(state); };
  window.addEventListener("keydown", (e) => { if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault(); game.handleKeyDown(e.code); });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const glideBtn = document.getElementById("glide-btn");
  const diveBtn = document.getElementById("dive-btn");
  glideBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.glideStart(); });
  glideBtn?.addEventListener("touchend", () => game.glideEnd());
  diveBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.dive(); });
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
  gradient.addColorStop(0, "#1e90ff");
  gradient.addColorStop(0.5, "#87ceeb");
  gradient.addColorStop(1, "#228b22");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Mountains
  ctx.fillStyle = "#2f4f4f";
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(100, height - 150);
  ctx.lineTo(200, height - 80);
  ctx.lineTo(300, height - 200);
  ctx.lineTo(400, height - 100);
  ctx.lineTo(width, height - 180);
  ctx.lineTo(width, height);
  ctx.fill();

  // Ground
  ctx.fillStyle = "#228b22";
  ctx.fillRect(0, height - 40, width, 40);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
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

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Player (wingsuit flyer)
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate((player.rotation * Math.PI) / 180);

  // Body
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = player.isGliding ? "#c0392b" : "#a93226";
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-20, player.isGliding ? 15 : 8);
  ctx.lineTo(10, player.isGliding ? 15 : 8);
  ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = "#f4d03f";
  ctx.beginPath();
  ctx.arc(20, -3, 6, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.arc(20, -3, 6, Math.PI, 0);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "cliff":
      ctx.fillStyle = "#5d4e37";
      ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
      ctx.fillStyle = "#4a3f2f";
      ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, 20);
      break;
    case "tree":
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-5, 0, 10, 40);
      ctx.fillStyle = "#228b22";
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(-25, 0);
      ctx.lineTo(25, 0);
      ctx.fill();
      break;
    case "bird":
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -8);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-15, 8);
      ctx.lineTo(0, 0);
      ctx.lineTo(15, -5);
      ctx.lineTo(10, 0);
      ctx.lineTo(15, 5);
      ctx.closePath();
      ctx.fill();
      break;
    case "balloon":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.moveTo(0, 25);
      ctx.lineTo(0, 50);
      ctx.stroke();
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
    case "ring":
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "star":
      ctx.fillStyle = "#f1c40f";
      drawStar(0, 0, 5, 12, 6);
      break;
    case "boost":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 12);
      ctx.lineTo(0, 6);
      ctx.lineTo(-8, 12);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

function drawStar(cx: number, cy: number, spikes: number, outerR: number, innerR: number): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
  ringsDisplay.textContent = state.rings.toString();
  altitudeDisplay.textContent = state.altitude + "m";
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.rings")}</div><div class="stat-value">${state.rings}</div></div>
  `;
  statsGrid.style.display = "grid";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void { overlay.style.display = "none"; finalScoreDisplay.style.display = "none"; statsGrid.style.display = "none"; game.start(); }

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
