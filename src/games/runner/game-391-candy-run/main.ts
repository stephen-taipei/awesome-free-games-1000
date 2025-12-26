import { CandyRunGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const candyDisplay = document.getElementById("candy-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: CandyRunGame;
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
  game = new CandyRunGame();
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

  // Candy sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#FFB6C1");
  skyGradient.addColorStop(0.5, "#FFC0CB");
  skyGradient.addColorStop(1, "#FFE4E1");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Candy clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  drawCandyCloud(60, 50, 50);
  drawCandyCloud(180, 70, 65);
  drawCandyCloud(320, 45, 55);

  // Background candy decorations
  drawBackgroundCandy(30, height - 150, '#FF69B4');
  drawBackgroundCandy(150, height - 130, '#4ECDC4');
  drawBackgroundCandy(280, height - 145, '#FFE66D');
  drawBackgroundCandy(380, height - 125, '#95E1D3');

  // Candy road
  const groundY = height - 65;
  ctx.fillStyle = "#F8BBD9";
  ctx.fillRect(0, groundY + 20, width, 50);

  // Candy stripes on road
  const stripeColors = ['#FF69B4', '#4ECDC4', '#FFE66D', '#95E1D3'];
  for (let i = 0; i < 15; i++) {
    const x = (i * 35 + Date.now() * 0.03) % width;
    ctx.fillStyle = stripeColors[i % stripeColors.length];
    ctx.fillRect(x, groundY + 25, 20, 40);
  }

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / 400;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Lane markers
  ctx.strokeStyle = "rgba(255, 105, 180, 0.4)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 105, 180, 0.9)";
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

  // Power-up effects
  if (state.sugarRush) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
    ctx.fillRect(0, 0, width, height);
  }
  if (state.doublePoints) {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, width - 10, height - 10);
  }
}

function drawCandyCloud(x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
  ctx.arc(x + size * 0.25, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.arc(x + size * 0.5, y, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackgroundCandy(x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.fillRect(x - 3, y - 35, 6, 20);
  ctx.globalAlpha = 1;
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Sugar rush glow
  if (state.sugarRush) {
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 20;
  }

  // Gingerbread body
  ctx.fillStyle = "#D2691E";
  ctx.beginPath();
  ctx.ellipse(0, -5, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Frosting details
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.ellipse(0, -3, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Buttons
  ctx.fillStyle = "#FF69B4";
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, Math.PI * 2);
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#D2691E";
  ctx.beginPath();
  ctx.arc(0, -30, 12, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(-4, -32, 4, 0, Math.PI * 2);
  ctx.arc(4, -32, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-4, -31, 2, 0, Math.PI * 2);
  ctx.arc(4, -31, 2, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -26, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Legs
  const legOffset = Math.sin(Date.now() * 0.015) * 6;
  ctx.fillStyle = "#D2691E";
  ctx.beginPath();
  ctx.ellipse(-6 - legOffset, 18, 5, 8, -0.2, 0, Math.PI * 2);
  ctx.ellipse(6 + legOffset, 18, 5, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "lollipop":
      // Stick
      ctx.fillStyle = "#FFF";
      ctx.fillRect(-3, 0, 6, 30);
      // Candy spiral
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(0, -15, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.arc(0, -15, 6 + i * 5, i * 2, i * 2 + Math.PI);
      }
      ctx.stroke();
      break;

    case "gummyBear":
      ctx.fillStyle = obs.color;
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 5, 18, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(0, -18, 12, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.beginPath();
      ctx.arc(-10, -28, 6, 0, Math.PI * 2);
      ctx.arc(10, -28, 6, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-4, -18, 3, 0, Math.PI * 2);
      ctx.arc(4, -18, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "chocolateBar":
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(-25, -15, 50, 30);
      // Segments
      ctx.strokeStyle = "#5D3A1A";
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-25 + i * 12.5, -15);
        ctx.lineTo(-25 + i * 12.5, 15);
        ctx.stroke();
      }
      break;

    case "candyCane":
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(0, -15);
      ctx.arc(10, -15, 10, Math.PI, 0);
      ctx.stroke();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(0, -15);
      ctx.arc(10, -15, 10, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "candy":
      ctx.fillStyle = col.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wrapper ends
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-18, -5);
      ctx.lineTo(-18, 5);
      ctx.closePath();
      ctx.moveTo(12, 0);
      ctx.lineTo(18, -5);
      ctx.lineTo(18, 5);
      ctx.closePath();
      ctx.fill();
      break;

    case "sugarRush":
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(4, -4);
      ctx.lineTo(12, -4);
      ctx.lineTo(6, 2);
      ctx.lineTo(8, 12);
      ctx.lineTo(0, 6);
      ctx.lineTo(-8, 12);
      ctx.lineTo(-6, 2);
      ctx.lineTo(-12, -4);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill();
      break;

    case "doublePts":
      ctx.fillStyle = "#9400D3";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("x2", 0, 6);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  candyDisplay.textContent = state.candy.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.candy")}</div><div class="stat-value">${state.candy}</div></div>
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
