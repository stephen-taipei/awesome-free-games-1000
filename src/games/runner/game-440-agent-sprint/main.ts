import { AgentSprintGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const briefcasesDisplay = document.getElementById("briefcases-display")!;
const ammoDisplay = document.getElementById("ammo-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: AgentSprintGame;
let animationFrame: number | null = null;
let buildings: { x: number; height: number; width: number }[] = [];

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
  initBackground();
  game = new AgentSprintGame();
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

function initBackground(): void {
  buildings = [];
  for (let i = 0; i < 8; i++) {
    buildings.push({
      x: i * 80 + Math.random() * 30,
      height: 120 + Math.random() * 100,
      width: 50 + Math.random() * 30,
    });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const slideBtn = document.getElementById("slide-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.slide(); });
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
  const groundY = height - 80;

  // Sunset sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#1a1a2e");
  skyGradient.addColorStop(0.3, "#e67e22");
  skyGradient.addColorStop(0.6, "#f39c12");
  skyGradient.addColorStop(1, "#2c3e50");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "rgba(241, 196, 15, 0.8)";
  ctx.beginPath();
  ctx.arc(width - 60, 80, 35, 0, Math.PI * 2);
  ctx.fill();

  // Background buildings
  const buildingSpeed = state.phase === "playing" ? state.speed * 0.12 : 0.1;
  buildings.forEach(building => {
    building.x -= buildingSpeed;
    if (building.x < -building.width) {
      building.x = width + Math.random() * 50;
      building.height = 120 + Math.random() * 100;
    }
    drawBuilding(building.x, groundY, building.height, building.width);
  });

  // Rooftop
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, groundY, width, 30);

  // Rooftop edge
  ctx.fillStyle = "#34495e";
  ctx.fillRect(0, groundY + 30, width, 50);

  // Lane dividers
  ctx.strokeStyle = "rgba(230, 126, 34, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Health bar
  drawHealthBar(state.health);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
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
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawBuilding(x: number, groundY: number, height: number, width: number): void {
  const y = groundY - height;

  ctx.fillStyle = "rgba(44, 62, 80, 0.6)";
  ctx.fillRect(x, y, width, height);

  // Windows
  ctx.fillStyle = "rgba(241, 196, 15, 0.5)";
  for (let row = 0; row < height / 20; row++) {
    for (let col = 0; col < 2; col++) {
      if (Math.random() > 0.4) {
        ctx.fillRect(x + 8 + col * 20, y + 10 + row * 20, 10, 12);
      }
    }
  }
}

function drawHealthBar(health: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = health / 100;
  const color = pct > 0.5 ? "#27ae60" : pct > 0.25 ? "#f39c12" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = "#fff";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${health}%`, x + barWidth / 2, y + 10);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding agent
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-18, 5, 36, 12);
    ctx.fillStyle = "#34495e";
    ctx.beginPath();
    ctx.arc(-8, 5, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running agent in suit
    const legAngle = player.isJumping ? 0.2 : Math.sin(Date.now() * 0.02) * 0.4;

    // Body (suit)
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-10, -18, 20, 28);

    // Tie
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-3, 5);
    ctx.lineTo(0, 8);
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(0, -22, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(0, -26, 8, Math.PI, 0);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = "#000";
    ctx.fillRect(-8, -25, 6, 4);
    ctx.fillRect(2, -25, 6, 4);

    // Legs
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-6 - Math.cos(legAngle) * 7, 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(6 + Math.cos(legAngle) * 7, 25);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = "#1a252f";
    ctx.beginPath();
    ctx.arc(-6 - Math.cos(legAngle) * 7, 27, 4, 0, Math.PI * 2);
    ctx.arc(6 + Math.cos(legAngle) * 7, 27, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "vent":
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#95a5a6";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-obs.width / 2 + 5 + i * 12, -obs.height / 2 + 5, 8, obs.height - 10);
      }
      break;

    case "satellite":
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-5, -obs.height / 2, 10, obs.height);
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.ellipse(0, -obs.height / 2 + 10, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "enemy":
      // Enemy body
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-12, -obs.height / 2 + 15, 24, 35);
      // Head
      ctx.fillStyle = "#1a252f";
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Gun
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(10, -obs.height / 2 + 25, 15, 5);
      break;

    case "tripwire":
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, 0);
      ctx.lineTo(obs.width / 2, 0);
      ctx.stroke();
      // Sensors
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-obs.width / 2 - 5, -8, 8, 16);
      ctx.fillRect(obs.width / 2 - 3, -8, 8, 16);
      break;

    case "helicopter":
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.fillRect(20, -5, 20, 8);
      // Rotor
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 3;
      const rotorAngle = Date.now() * 0.03;
      ctx.beginPath();
      ctx.moveTo(-30 * Math.cos(rotorAngle), -15);
      ctx.lineTo(30 * Math.cos(rotorAngle), -15);
      ctx.stroke();
      break;

    case "sniper":
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-10, -obs.height / 2, 20, obs.height);
      // Scope glint
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "briefcase":
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillStyle = "#f1c40f";
      ctx.fillRect(-2, -2, 4, 4);
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-10, -10, 20, 4);
      break;

    case "ammo":
      ctx.fillStyle = "#f39c12";
      ctx.fillRect(-8, -10, 16, 20);
      ctx.fillStyle = "#e67e22";
      ctx.fillRect(-6, -8, 12, 16);
      ctx.fillStyle = "#d35400";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-4, -6 + i * 6, 8, 4);
      }
      break;

    case "med-kit":
      ctx.fillStyle = "#fff";
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  briefcasesDisplay.textContent = state.briefcases.toString();
  ammoDisplay.textContent = state.ammo.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.briefcases")}</div><div class="stat-value">${state.briefcases}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.ammo")}</div><div class="stat-value">${state.ammo}</div></div>
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
