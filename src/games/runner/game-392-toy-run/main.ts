import { ToyRunGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: ToyRunGame;
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
  game = new ToyRunGame();
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

  // Toy room background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#87CEEB");
  bgGradient.addColorStop(0.6, "#E6E6FA");
  bgGradient.addColorStop(1, "#DEB887");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Shelf lines
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 70);
    ctx.lineTo(width, i * 70);
    ctx.stroke();
  }

  // Background toys on shelves
  drawBackgroundToy(40, 55, "#FF6B6B", "block");
  drawBackgroundToy(120, 125, "#4ECDC4", "ball");
  drawBackgroundToy(200, 55, "#FFE66D", "robot");
  drawBackgroundToy(300, 125, "#96CEB4", "car");
  drawBackgroundToy(380, 55, "#DDA0DD", "block");

  // Floor
  const groundY = height - 65;
  ctx.fillStyle = "#DEB887";
  ctx.fillRect(0, groundY + 20, width, 50);

  // Floor pattern (wood grain)
  ctx.strokeStyle = "#CD853F";
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const x = (i * 25 + Date.now() * 0.02) % width;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 25);
    ctx.lineTo(x + 15, groundY + 60);
    ctx.stroke();
  }

  // Lane markers (colorful tape)
  const laneColors = ["#FF6B6B", "#4ECDC4", "#FFE66D"];
  ctx.lineWidth = 4;
  for (let i = 1; i < 3; i++) {
    ctx.strokeStyle = laneColors[i];
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(139, 69, 19, 0.9)";
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

  // Magnet effect indicator
  if (state.hasMagnet) {
    ctx.strokeStyle = "#9400D3";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y - 20, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawBackgroundToy(x: number, y: number, color: string, type: string): void {
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = color;
  if (type === "block") {
    ctx.fillRect(x - 12, y - 12, 24, 24);
  } else if (type === "ball") {
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "robot") {
    ctx.fillRect(x - 10, y - 15, 20, 25);
    ctx.beginPath();
    ctx.arc(x, y - 20, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "car") {
    ctx.fillRect(x - 18, y - 8, 36, 16);
    ctx.beginPath();
    ctx.arc(x - 10, y + 10, 5, 0, Math.PI * 2);
    ctx.arc(x + 10, y + 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Magnet glow
  if (state.hasMagnet) {
    ctx.shadowColor = "#9400D3";
    ctx.shadowBlur = 15;
  }

  // Toy soldier body
  ctx.fillStyle = "#2E86AB";
  ctx.fillRect(-12, -20, 24, 35);

  // Belt
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(-12, -5, 24, 5);

  // Head
  ctx.fillStyle = "#FFDAB9";
  ctx.beginPath();
  ctx.arc(0, -30, 10, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = "#8B0000";
  ctx.fillRect(-10, -45, 20, 12);
  ctx.fillRect(-6, -50, 12, 6);

  // Eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-4, -32, 2, 0, Math.PI * 2);
  ctx.arc(4, -32, 2, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -28, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Arms
  const armSwing = Math.sin(Date.now() * 0.015) * 10;
  ctx.fillStyle = "#2E86AB";
  ctx.save();
  ctx.translate(-14, -15);
  ctx.rotate((armSwing * Math.PI) / 180);
  ctx.fillRect(-3, 0, 6, 18);
  ctx.restore();
  ctx.save();
  ctx.translate(14, -15);
  ctx.rotate((-armSwing * Math.PI) / 180);
  ctx.fillRect(-3, 0, 6, 18);
  ctx.restore();

  // Legs
  const legSwing = Math.sin(Date.now() * 0.015) * 8;
  ctx.fillStyle = "#1A1A2E";
  ctx.save();
  ctx.translate(-6, 15);
  ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 15);
  ctx.restore();
  ctx.save();
  ctx.translate(6, 15);
  ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 15);
  ctx.restore();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  if (obs.rotation !== undefined) {
    ctx.rotate(obs.rotation);
  }

  switch (obs.type) {
    case "block":
      // Building block
      ctx.fillStyle = obs.color;
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Letter on block
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("A", 0, 8);
      break;

    case "car":
      // Toy car body
      ctx.fillStyle = obs.color;
      ctx.fillRect(-obs.width / 2, -obs.height / 2 + 5, obs.width, obs.height - 10);
      // Roof
      ctx.fillRect(-15, -obs.height / 2 - 5, 30, 15);
      // Wheels
      ctx.fillStyle = "#1A1A2E";
      ctx.beginPath();
      ctx.arc(-15, obs.height / 2 - 5, 8, 0, Math.PI * 2);
      ctx.arc(15, obs.height / 2 - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      // Windows
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(-12, -obs.height / 2 - 2, 10, 8);
      ctx.fillRect(2, -obs.height / 2 - 2, 10, 8);
      break;

    case "robot":
      // Robot body
      ctx.fillStyle = obs.color;
      ctx.fillRect(-obs.width / 2, -obs.height / 4, obs.width, obs.height / 2);
      // Robot head
      ctx.fillRect(-obs.width / 3, -obs.height / 2, obs.width * 2 / 3, obs.height / 4);
      // Antenna
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(-2, -obs.height / 2 - 10, 4, 10);
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#FF0000";
      ctx.beginPath();
      ctx.arc(-6, -obs.height / 3, 4, 0, Math.PI * 2);
      ctx.arc(6, -obs.height / 3, 4, 0, Math.PI * 2);
      ctx.fill();
      // Arms
      ctx.fillStyle = obs.color;
      ctx.fillRect(-obs.width / 2 - 8, -obs.height / 6, 8, 20);
      ctx.fillRect(obs.width / 2, -obs.height / 6, 8, 20);
      break;

    case "ball":
      // Bouncy ball
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Stripe
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 3, 0, Math.PI);
      ctx.stroke();
      // Shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(-5, -5, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  if (col.collected) return;
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "coin":
      // Gold coin
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#DAA520";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Star emblem
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("\u2605", 0, 4);
      break;

    case "star":
      // Power star
      ctx.fillStyle = "#FF69B4";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i === 0 ? 0 : 14;
        if (i === 0) ctx.moveTo(0, -14);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        const innerAngle = angle + (2 * Math.PI) / 10;
        ctx.lineTo(Math.cos(innerAngle) * 6, Math.sin(innerAngle) * 6);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case "magnet":
      // Magnet power-up
      ctx.fillStyle = "#FF0000";
      ctx.beginPath();
      ctx.arc(0, 0, 10, Math.PI, 0);
      ctx.lineTo(10, 10);
      ctx.lineTo(5, 10);
      ctx.lineTo(5, 0);
      ctx.arc(0, 0, 5, 0, Math.PI, true);
      ctx.lineTo(-5, 10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0000FF";
      ctx.fillRect(-10, 5, 5, 5);
      ctx.fillRect(5, 5, 5, 5);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  coinsDisplay.textContent = state.coins.toString();
  speedDisplay.textContent = state.speed.toFixed(1);
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  const distLabel = i18n.t("game.distance");
  const coinsLabel = i18n.t("game.coins");
  statsGrid.innerHTML = '<div class="stat-item"><div class="stat-label">' + distLabel + '</div><div class="stat-value">' + Math.floor(state.distance) + 'm</div></div><div class="stat-item"><div class="stat-label">' + coinsLabel + '</div><div class="stat-value">' + state.coins + '</div></div>';
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
