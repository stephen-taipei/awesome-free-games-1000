import { MagicRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const manaDisplay = document.getElementById("mana-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: MagicRunGame;
let animationFrame: number | null = null;
let backgroundOffset = 0;

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
  game = new MagicRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyE", "KeyQ"].includes(e.code)) e.preventDefault();
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
  const spellBtn = document.getElementById("spell-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  spellBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.castSpell(); });
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

  // Background - enchanted forest
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a0a2e");
  gradient.addColorStop(0.5, "#2d1b4e");
  gradient.addColorStop(1, "#1a0a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Moving background effect
  if (state.phase === "playing") {
    backgroundOffset += state.speed * 0.1;
  }

  // Magical trees/castle silhouettes
  ctx.fillStyle = "rgba(72, 36, 108, 0.3)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 100 - backgroundOffset * 0.5) % (width + 100)) - 50;
    const treeHeight = 120 + (i % 3) * 30;
    // Tree
    ctx.beginPath();
    ctx.moveTo(x + 15, height - 80);
    ctx.lineTo(x + 5, height - 80 - treeHeight);
    ctx.lineTo(x - 5, height - 80 - treeHeight);
    ctx.lineTo(x - 15, height - 80);
    ctx.closePath();
    ctx.fill();

    // Castle tower
    const x2 = ((i * 120 + 60 - backgroundOffset * 0.3) % (width + 120)) - 60;
    ctx.fillRect(x2 - 20, height - 120, 40, 40);
    ctx.beginPath();
    ctx.moveTo(x2 - 25, height - 120);
    ctx.lineTo(x2, height - 150);
    ctx.lineTo(x2 + 25, height - 120);
    ctx.closePath();
    ctx.fill();
  }

  // Ground (magical path)
  const groundY = height - 80;
  const pathGradient = ctx.createLinearGradient(0, groundY, 0, groundY + 60);
  pathGradient.addColorStop(0, "#3d2463");
  pathGradient.addColorStop(1, "#1a0a2e");
  ctx.fillStyle = pathGradient;
  ctx.fillRect(0, groundY + 25, width, 60);

  // Lane lines with glow
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#9b59b6";
  ctx.strokeStyle = "#9b59b6";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "16px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    if (p.type === 'star') {
      drawStar(ctx, p.x, p.y, 4, p.size * (p.life / p.maxLife), p.size * 0.5);
    } else if (p.type === 'sparkle') {
      ctx.shadowBlur = 5;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#9b59b6";
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(155, 89, 182, 0.15)";
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Wizard robe (body)
  ctx.fillStyle = "#5b2c91";
  ctx.beginPath();
  ctx.moveTo(-15, -20);
  ctx.lineTo(-20, 25);
  ctx.lineTo(20, 25);
  ctx.lineTo(15, -20);
  ctx.closePath();
  ctx.fill();

  // Robe trim
  ctx.strokeStyle = "#9b59b6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, -20);
  ctx.lineTo(-20, 25);
  ctx.moveTo(15, -20);
  ctx.lineTo(20, 25);
  ctx.stroke();

  // Head
  ctx.fillStyle = "#ffd4a3";
  ctx.beginPath();
  ctx.arc(0, -25, 12, 0, Math.PI * 2);
  ctx.fill();

  // Wizard hat
  ctx.fillStyle = "#3d1f6b";
  ctx.beginPath();
  ctx.moveTo(-15, -25);
  ctx.lineTo(0, -45);
  ctx.lineTo(15, -25);
  ctx.closePath();
  ctx.fill();

  // Hat brim
  ctx.fillStyle = "#5b2c91";
  ctx.fillRect(-18, -25, 36, 4);

  // Staff
  ctx.strokeStyle = "#8b4513";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18, -10);
  ctx.lineTo(18, 15);
  ctx.stroke();

  // Staff crystal
  if (player.isCasting) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#3498db";
  }
  ctx.fillStyle = "#3498db";
  ctx.beginPath();
  ctx.arc(18, -15, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Casting spell effect
  if (player.isCasting) {
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#3498db";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(18 + i * 15, -15, 5 + i * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "darkspell":
      // Dark energy ball
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#8b0000";
      const spellGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, obs.width / 2);
      spellGradient.addColorStop(0, "#ff0000");
      spellGradient.addColorStop(0.5, "#8b0000");
      spellGradient.addColorStop(1, "#4b0000");
      ctx.fillStyle = spellGradient;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case "creature":
      // Dark creature
      ctx.fillStyle = "#2c1a3d";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(-8, -5, 3, 0, Math.PI * 2);
      ctx.arc(8, -5, 3, 0, Math.PI * 2);
      ctx.fill();
      // Horns
      ctx.fillStyle = "#1a0a2e";
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(-15, -20);
      ctx.lineTo(-8, -12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(15, -20);
      ctx.lineTo(8, -12);
      ctx.closePath();
      ctx.fill();
      break;
    case "barrier":
      // Magic barrier
      ctx.strokeStyle = "#9b59b6";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#9b59b6";
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "rgba(155, 89, 182, 0.2)";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.shadowBlur = 0;
      break;
    case "curse":
      // Curse symbol
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.moveTo(-10, -10);
      ctx.lineTo(10, 10);
      ctx.moveTo(10, -10);
      ctx.lineTo(-10, 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
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
    case "mana":
      // Mana crystal
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#3498db";
      ctx.fillStyle = "#3498db";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, -4);
      ctx.lineTo(8, 4);
      ctx.lineTo(0, 12);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-8, -4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case "spellbook":
      // Spell book
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = "#f39c12";
      ctx.fillRect(-8, -6, 16, 12);
      ctx.strokeStyle = "#8b4513";
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -6, 16, 12);
      // Runes
      ctx.fillStyle = "#9b59b6";
      ctx.fillRect(-4, -3, 8, 2);
      ctx.fillRect(-4, 1, 8, 2);
      break;
    case "potion":
      // Magic potion
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-3, -10, 6, 12);
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(-4, -12, 8, 3);
      // Bubbles
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(-2, 0, 2, 0, Math.PI * 2);
      ctx.arc(3, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
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

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  manaDisplay.textContent = Math.floor(state.mana).toString() + "%";
  speedDisplay.textContent = state.speed.toFixed(1);

  // Update mana bar color
  const manaItem = manaDisplay.closest('.info-item');
  if (manaItem) {
    const manaValue = manaItem.querySelector('.info-value') as HTMLElement;
    if (state.mana < 30) {
      manaValue.style.color = '#e74c3c';
    } else if (state.mana < 60) {
      manaValue.style.color = '#f39c12';
    } else {
      manaValue.style.color = '#3498db';
    }
  }
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.mana")}</div><div class="stat-value">${Math.floor(state.mana)}%</div></div>
  `;
  statsGrid.style.display = "grid";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  statsGrid.style.display = "none";
  backgroundOffset = 0;
  game.start();
}

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
