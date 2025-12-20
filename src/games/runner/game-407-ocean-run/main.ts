import { OceanRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const pearlsDisplay = document.getElementById("pearls-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: OceanRunGame;
let animationFrame: number | null = null;
let bubbles: { x: number; y: number; size: number; speed: number }[] = [];

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
  initBubbles();
  game = new OceanRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code))
      e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initBubbles(): void {
  bubbles = [];
  for (let i = 0; i < 30; i++) {
    bubbles.push({
      x: Math.random() * 450,
      y: Math.random() * 400,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 1 + 0.5,
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

  // Background - ocean gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#001830");
  gradient.addColorStop(0.5, "#003060");
  gradient.addColorStop(1, "#004080");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Light rays from above
  ctx.fillStyle = "rgba(100, 200, 255, 0.05)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const x = 50 + i * 100;
    ctx.moveTo(x - 20, 0);
    ctx.lineTo(x + 20, 0);
    ctx.lineTo(x + 60, height);
    ctx.lineTo(x - 60, height);
    ctx.closePath();
    ctx.fill();
  }

  // Background bubbles
  const time = Date.now() * 0.001;
  bubbles.forEach((bubble) => {
    bubble.y -= bubble.speed;
    if (bubble.y < -10) {
      bubble.y = height + 10;
      bubble.x = Math.random() * width;
    }
    ctx.strokeStyle = `rgba(150, 220, 255, ${0.3 + bubble.size / 10})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Sandy ground
  const groundY = height - 80;
  ctx.fillStyle = "#c2a060";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Sand texture
  ctx.fillStyle = "#d4b87a";
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(i * 25 + 10, groundY + 40 + Math.sin(i) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(100, 200, 255, 0.2)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(150, 220, 255, 0.8)";
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

  // Bubble shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "rgba(150, 220, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(150, 220, 255, 0.1)";
    ctx.fill();
  }

  // Diver body
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wetsuit stripe
  ctx.strokeStyle = "#00aaff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 20);
  ctx.stroke();

  // Head with mask
  ctx.fillStyle = "#ffcc99";
  ctx.beginPath();
  ctx.arc(0, -15, 12, 0, Math.PI * 2);
  ctx.fill();

  // Diving mask
  ctx.fillStyle = "#003366";
  ctx.fillRect(-10, -20, 20, 10);
  ctx.fillStyle = "#66ccff";
  ctx.fillRect(-8, -18, 16, 6);

  // Flippers animation
  const flipperOffset = Math.sin(Date.now() * 0.015) * 10;
  ctx.fillStyle = "#00aaff";
  ctx.beginPath();
  ctx.ellipse(-8, 30 + flipperOffset, 8, 15, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 30 - flipperOffset, 8, 15, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  const time = Date.now() * 0.003;

  switch (obs.type) {
    case "jellyfish":
      // Jellyfish body
      ctx.fillStyle = "rgba(255, 100, 150, 0.7)";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, Math.PI, 0);
      ctx.quadraticCurveTo(obs.width / 2, 10, 0, 15);
      ctx.quadraticCurveTo(-obs.width / 2, 10, -obs.width / 2, 0);
      ctx.fill();
      // Tentacles
      ctx.strokeStyle = "rgba(255, 100, 150, 0.5)";
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, 10);
        ctx.quadraticCurveTo(i * 6 + Math.sin(time + i) * 5, 25, i * 6, 35);
        ctx.stroke();
      }
      break;
    case "shark":
      // Shark body
      ctx.fillStyle = "#4a5568";
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fin
      ctx.fillStyle = "#2d3748";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(10, -obs.height / 2 - 15);
      ctx.lineTo(15, -obs.height / 2);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(obs.width / 3, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      // Teeth
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(obs.width / 2 - 5, 5);
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(obs.width / 2 - 3 - i * 3, 10);
        ctx.lineTo(obs.width / 2 - 5 - i * 3, 5);
      }
      ctx.fill();
      break;
    case "urchin":
      // Urchin body
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 3, 0, Math.PI * 2);
      ctx.fill();
      // Spines
      ctx.strokeStyle = "#4a1a4a";
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        ctx.lineTo(Math.cos(angle) * (obs.width / 2), Math.sin(angle) * (obs.width / 2));
        ctx.stroke();
      }
      break;
    case "kelp":
      // Kelp strands
      ctx.fillStyle = "#2d5a27";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8, obs.height / 2);
        ctx.quadraticCurveTo(
          i * 8 + Math.sin(time + i) * 10,
          0,
          i * 8 + Math.sin(time * 2 + i) * 5,
          -obs.height / 2
        );
        ctx.quadraticCurveTo(
          i * 8 + 5 + Math.sin(time * 2 + i) * 5,
          0,
          i * 8 + 3,
          obs.height / 2
        );
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
    case "pearl":
      // Pearl
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 200, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(-3, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "shell":
      // Seashell
      ctx.fillStyle = "#ffaa88";
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(15, 0, 0, 12);
      ctx.quadraticCurveTo(-15, 0, 0, -10);
      ctx.fill();
      ctx.strokeStyle = "#cc8866";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -8 + i * 4);
        ctx.quadraticCurveTo(8 - i, 0, 0, 10 - i * 2);
        ctx.stroke();
      }
      break;
    case "bubble":
      // Bubble shield
      ctx.strokeStyle = "rgba(150, 220, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(150, 220, 255, 0.3)";
      ctx.fill();
      // Shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(-4, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  pearlsDisplay.textContent = state.pearls.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.pearls")}</div><div class="stat-value">${state.pearls}</div></div>
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
