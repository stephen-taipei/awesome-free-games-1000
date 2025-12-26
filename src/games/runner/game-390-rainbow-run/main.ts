import { RainbowRunGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const colorsDisplay = document.getElementById("colors-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: RainbowRunGame;
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
  game = new RainbowRunGame();
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

  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#87CEEB");
  skyGradient.addColorStop(0.5, "#B0E0E6");
  skyGradient.addColorStop(1, "#E6E6FA");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  drawCloud(50, 60, 70);
  drawCloud(200, 40, 90);
  drawCloud(350, 80, 60);

  // Rainbow road
  const groundY = height - 70;
  const stripeHeight = 8;
  for (let i = 0; i < RAINBOW_COLORS.length; i++) {
    ctx.fillStyle = RAINBOW_COLORS[i];
    ctx.fillRect(0, groundY + 25 + i * stripeHeight, width, stripeHeight);
  }

  // Sparkle trail effect
  const time = Date.now() * 0.003;
  for (let i = 0; i < 10; i++) {
    const x = (i * 50 + time * 50) % width;
    const y = groundY + 30 + Math.sin(time + i) * 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane markers
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.setLineDash([15, 15]);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Sparkles
  state.sparkles.forEach(s => {
    const alpha = s.life / 500;
    ctx.fillStyle = s.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(75, 0, 130, 0.8)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawCloud(x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.35, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Glow effect
  const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 35);
  glowGrad.addColorStop(0, player.color);
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, -10, 35, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.ellipse(0, -5, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.ellipse(0, -8, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-4, -10, 3, 0, Math.PI * 2);
  ctx.arc(4, -10, 3, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -5, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Legs
  const legOffset = Math.sin(Date.now() * 0.015) * 6;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.ellipse(-5 - legOffset, 18, 5, 8, -0.2, 0, Math.PI * 2);
  ctx.ellipse(5 + legOffset, 18, 5, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "cloud":
      ctx.fillStyle = "rgba(150, 150, 150, 0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.arc(-15, 5, 15, 0, Math.PI * 2);
      ctx.arc(15, 5, 15, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "star":
      ctx.fillStyle = obs.color;
      drawStar(0, 0, 5, 20, 10);
      ctx.fillStyle = "#FFF";
      drawStar(0, 0, 5, 10, 5);
      break;

    case "bird":
      ctx.fillStyle = obs.color;
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      const wingY = Math.sin(Date.now() * 0.02) * 5;
      ctx.beginPath();
      ctx.ellipse(-5, -8 + wingY, 12, 5, -0.5, 0, Math.PI * 2);
      ctx.ellipse(5, -8 + wingY, 12, 5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = "#FFA500";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(22, 2);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      break;

    case "gap":
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(-25, -40, 50, 80);
      break;
  }

  ctx.restore();
}

function drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "colorOrb":
      const orbGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 12);
      orbGrad.addColorStop(0, "#FFF");
      orbGrad.addColorStop(0.5, col.color);
      orbGrad.addColorStop(1, "transparent");
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "sparkle":
      ctx.fillStyle = "#FFD700";
      drawStar(0, 0, 4, 12, 5);
      ctx.fillStyle = "#FFF";
      drawStar(0, 0, 4, 6, 2);
      break;

    case "rainbow":
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = RAINBOW_COLORS[i];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 5, 8 + i * 2, Math.PI, 0);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  colorsDisplay.textContent = state.colors.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.colors")}</div><div class="stat-value">${state.colors}</div></div>
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
