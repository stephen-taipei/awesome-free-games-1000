import {
  HellEscapeGame,
  GameState,
  Obstacle,
  Collectible,
  Particle,
} from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const soulsDisplay = document.getElementById("souls-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: HellEscapeGame;
let animationFrame: number | null = null;
let lavaWaves: { x: number; phase: number }[] = [];

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) =>
    i18n.loadTranslations(locale as Locale, trans)
  );
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();
  initLavaWaves();
  game = new HellEscapeGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (
      ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
        e.code
      )
    )
      e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initLavaWaves(): void {
  lavaWaves = [];
  for (let i = 0; i < 10; i++) {
    lavaWaves.push({
      x: i * 50,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");

  leftBtn?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.moveLeft();
  });
  rightBtn?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.moveRight();
  });
  jumpBtn?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.jump();
  });
}

function resizeCanvas(): void {
  canvas.width = Math.min(
    canvas.parentElement!.getBoundingClientRect().width,
    450
  );
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

  // Background - hell gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a0a0a");
  gradient.addColorStop(0.5, "#3d0c0c");
  gradient.addColorStop(1, "#5c1a1a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Floating embers
  const time = Date.now() * 0.001;
  for (let i = 0; i < 20; i++) {
    const x = ((i * 47 + time * 30) % (width + 20)) - 10;
    const y = height - 100 - Math.sin(time + i) * 50 - i * 15;
    ctx.fillStyle = `rgba(255, ${100 + i * 5}, 0, ${0.3 + Math.sin(time * 2 + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.sin(time + i) * 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground (hell stone)
  const groundY = height - 80;
  ctx.fillStyle = "#2d1a1a";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Lava at bottom
  ctx.fillStyle = "#ff4500";
  ctx.fillRect(0, height - 30, width, 30);

  // Lava waves
  ctx.fillStyle = "#ff6347";
  ctx.beginPath();
  ctx.moveTo(0, height - 25);
  for (let i = 0; i < width; i += 10) {
    const waveY = Math.sin(time * 3 + i * 0.05) * 5;
    ctx.lineTo(i, height - 25 + waveY);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Lane dividers
  ctx.strokeStyle = "#4a2a2a";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,200,150,0.7)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach((col) => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach((obs) => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 215, 0, 0.1)";
    ctx.fill();
  }

  // Body (dark hooded figure escaping)
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.ellipse(0, 10, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hood/cloak
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(0, -5, 18, Math.PI, 0);
  ctx.fill();

  // Face glow
  ctx.fillStyle = "#ff9966";
  ctx.beginPath();
  ctx.ellipse(0, -2, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-4, -5, 3, 0, Math.PI * 2);
  ctx.arc(4, -5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Running legs animation
  const legOffset = Math.sin(Date.now() * 0.02) * 8;
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-5, 25);
  ctx.lineTo(-5 + legOffset, 40);
  ctx.moveTo(5, 25);
  ctx.lineTo(5 - legOffset, 40);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "fireball":
      // Animated fireball
      ctx.fillStyle = "#ff4500";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 3, 0, Math.PI * 2);
      ctx.fill();
      // Fire trail
      ctx.fillStyle = "#ff6347";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
          -15 - i * 8,
          Math.sin(Date.now() * 0.01 + i) * 5,
          5 - i,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      break;
    case "demon":
      // Demon body
      ctx.fillStyle = "#8b0000";
      ctx.beginPath();
      ctx.ellipse(0, 10, 20, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Horns
      ctx.fillStyle = "#4a0000";
      ctx.beginPath();
      ctx.moveTo(-15, -15);
      ctx.lineTo(-20, -35);
      ctx.lineTo(-10, -20);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(15, -15);
      ctx.lineTo(20, -35);
      ctx.lineTo(10, -20);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.arc(-8, -5, 5, 0, Math.PI * 2);
      ctx.arc(8, -5, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spike":
      ctx.fillStyle = "#4a4a4a";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(obs.width / 2, obs.height / 2);
      ctx.lineTo(-obs.width / 2, obs.height / 2);
      ctx.closePath();
      ctx.fill();
      // Spike tip
      ctx.fillStyle = "#8b0000";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(5, -obs.height / 2 + 15);
      ctx.lineTo(-5, -obs.height / 2 + 15);
      ctx.closePath();
      ctx.fill();
      break;
    case "lava":
      ctx.fillStyle = "#ff4500";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Bubbles
      ctx.fillStyle = "#ffd700";
      const bubbleTime = Date.now() * 0.005;
      for (let i = 0; i < 3; i++) {
        const bx = -20 + i * 20;
        const by = Math.sin(bubbleTime + i) * 5 - 5;
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "soul":
      // Ghost-like soul
      ctx.fillStyle = "rgba(200, 200, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(0, -5, 10, Math.PI, 0);
      ctx.quadraticCurveTo(10, 10, 5, 15);
      ctx.quadraticCurveTo(0, 10, -5, 15);
      ctx.quadraticCurveTo(-10, 10, -10, 0);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-4, -3, 2, 0, Math.PI * 2);
      ctx.arc(4, -3, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "heart":
      ctx.fillStyle = "#ff1493";
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-10, -5, -10, -15, 0, -10);
      ctx.bezierCurveTo(10, -15, 10, -5, 0, 5);
      ctx.fill();
      break;
    case "shield":
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
      ctx.fill();
      // Shield icon
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, -2);
      ctx.lineTo(8, 4);
      ctx.quadraticCurveTo(0, 12, 0, 12);
      ctx.quadraticCurveTo(0, 12, -8, 4);
      ctx.lineTo(-8, -2);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  soulsDisplay.textContent = state.souls.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.souls")}</div><div class="stat-value">${state.souls}</div></div>
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
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
initI18n();
initGame();
