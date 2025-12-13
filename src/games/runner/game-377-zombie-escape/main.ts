import { ZombieEscapeGame, GameState, Zombie, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const healthDisplay = document.getElementById("health-display")!;
const survivorsDisplay = document.getElementById("survivors-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: ZombieEscapeGame;
let animationFrame: number | null = null;
let moonPhase = 0;

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
  game = new ZombieEscapeGame();
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

  // Background - dark horror atmosphere
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a0a0a");
  gradient.addColorStop(0.7, "#2a1515");
  gradient.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Blood moon
  moonPhase += 0.002;
  const moonX = width - 80;
  const moonY = 60;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 50);
  moonGlow.addColorStop(0, "rgba(139, 0, 0, 0.3)");
  moonGlow.addColorStop(1, "rgba(139, 0, 0, 0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#8b0000";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
  ctx.fill();

  // Moon craters
  ctx.fillStyle = "rgba(70, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(moonX - 8, moonY - 5, 5, 0, Math.PI * 2);
  ctx.arc(moonX + 6, moonY + 4, 7, 0, Math.PI * 2);
  ctx.fill();

  // Fog effect
  for (let i = 0; i < 3; i++) {
    const fogY = height - 150 + i * 30;
    const fogGrad = ctx.createLinearGradient(0, fogY, 0, fogY + 40);
    fogGrad.addColorStop(0, "rgba(80, 80, 80, 0)");
    fogGrad.addColorStop(0.5, `rgba(80, 80, 80, ${0.05 + Math.sin(moonPhase * 5 + i) * 0.02})`);
    fogGrad.addColorStop(1, "rgba(80, 80, 80, 0)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, fogY, width, 40);
  }

  // Ground - dark asphalt with blood stains
  const groundY = height - 80;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Blood stains on ground
  ctx.fillStyle = "rgba(70, 0, 0, 0.3)";
  for (let i = 0; i < 5; i++) {
    const x = (i * 100 + moonPhase * 50) % width;
    ctx.beginPath();
    ctx.ellipse(x, groundY + 40, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane lines - cracked
  ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.setLineDash([10, 15]);
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 100, 100, 0.7)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles (blood, dust)
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

  // Zombies
  state.zombies.forEach(zombie => drawZombie(zombie));

  // Player
  drawPlayer(state);

  // Health bar
  drawHealthBar(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Speed boost aura
  if (state.speedBoostTime > 0) {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Survivor character - body
  ctx.fillStyle = player.health > 50 ? "#4169e1" : "#8b4513";
  ctx.fillRect(-12, -15, 24, 30);

  // Head
  ctx.fillStyle = player.health > 50 ? "#ffdbac" : "#cd853f";
  ctx.beginPath();
  ctx.arc(0, -25, 12, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = "#654321";
  ctx.beginPath();
  ctx.arc(0, -30, 12, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes (fear expression)
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-4, -26, 2, 0, Math.PI * 2);
  ctx.arc(4, -26, 2, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(-10, 15, 8, 15);
  ctx.fillRect(2, 15, 8, 15);

  // Weapon (if has ammo)
  if (player.ammo > 0) {
    ctx.strokeStyle = "#696969";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(12, -10);
    ctx.lineTo(25, -5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawZombie(zombie: Zombie): void {
  ctx.save();
  ctx.translate(zombie.x, zombie.y);

  const shamble = Math.sin(zombie.animFrame) * 3;

  // Different zombie types
  switch (zombie.type) {
    case 'walker':
      // Green decaying zombie
      ctx.fillStyle = "#556b2f";
      ctx.fillRect(-15, -20 + shamble, 30, 40);

      // Head
      ctx.fillStyle = "#6b8e23";
      ctx.beginPath();
      ctx.arc(shamble, -30, 14, 0, Math.PI * 2);
      ctx.fill();

      // Dead eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-4 + shamble, -32, 3, 0, Math.PI * 2);
      ctx.arc(4 + shamble, -32, 3, 0, Math.PI * 2);
      ctx.fill();

      // Arms reaching out
      ctx.strokeStyle = "#556b2f";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-15, -5 + shamble);
      ctx.lineTo(-30, 0 + shamble * 2);
      ctx.stroke();
      break;

    case 'runner':
      // Fast, lean zombie
      ctx.fillStyle = "#808080";
      ctx.fillRect(-12, -18, 24, 36);

      ctx.fillStyle = "#696969";
      ctx.beginPath();
      ctx.arc(0, -28, 12, 0, Math.PI * 2);
      ctx.fill();

      // Aggressive posture
      ctx.strokeStyle = "#808080";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-25, -10);
      ctx.stroke();
      break;

    case 'crawler':
      // Low, crawling zombie
      ctx.fillStyle = "#4a5f4a";
      ctx.fillRect(-20, -10, 40, 20);

      ctx.fillStyle = "#5f6f5f";
      ctx.beginPath();
      ctx.arc(-15, -5, 10, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'brute':
      // Large, strong zombie
      ctx.fillStyle = "#3d3d3d";
      ctx.fillRect(-20, -25, 40, 50);

      ctx.fillStyle = "#4a4a4a";
      ctx.beginPath();
      ctx.arc(0, -38, 16, 0, Math.PI * 2);
      ctx.fill();

      // Muscular arms
      ctx.strokeStyle = "#3d3d3d";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.lineTo(-35, 5);
      ctx.stroke();
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
    case 'ammo':
      // Ammo box
      ctx.fillStyle = "#b8860b";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", 0, 0);
      break;
    case 'health':
      // First aid kit
      ctx.fillStyle = "#fff";
      ctx.fillRect(-14, -14, 28, 28);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-2, -12, 4, 24);
      ctx.fillRect(-12, -2, 24, 4);
      break;
    case 'speed':
      // Energy drink
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();

      // Lightning bolt
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.moveTo(-2, -8);
      ctx.lineTo(2, -2);
      ctx.lineTo(-1, -2);
      ctx.lineTo(3, 8);
      ctx.lineTo(-2, 2);
      ctx.lineTo(1, 2);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawHealthBar(state: GameState): void {
  const barWidth = 150;
  const barHeight = 20;
  const x = 10;
  const y = 10;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x, y, barWidth, barHeight);

  // Health
  const healthPercent = state.player.health / state.player.maxHealth;
  const healthColor = healthPercent > 0.6 ? "#00ff00" :
                      healthPercent > 0.3 ? "#ffaa00" : "#ff0000";
  ctx.fillStyle = healthColor;
  ctx.fillRect(x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4);

  // Border
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Text
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.max(0, Math.floor(state.player.health))}%`, x + barWidth / 2, y + barHeight / 2);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  healthDisplay.textContent = Math.max(0, Math.floor(state.player.health)).toString();
  survivorsDisplay.textContent = state.survivors.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.survivors")}</div><div class="stat-value">${state.survivors}</div></div>
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
