import { SuperHeroGame, GameState, Enemy, Particle, Laser } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const defeatedDisplay = document.getElementById("defeated-display")!;
const hpFill = document.getElementById("hp-fill")!;
const energyFill = document.getElementById("energy-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const attackBtn = document.getElementById("attack-btn")!;
const laserBtn = document.getElementById("laser-btn")!;
const strengthBtn = document.getElementById("strength-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: SuperHeroGame;
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
  game = new SuperHeroGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "defeat") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  attackBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.attack(); });
  laserBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.shootLaser(); });
  strengthBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.superStrength(); });

  const joystickRadius = 40;
  const handleMove = (x: number, y: number) => {
    const rect = joystick.getBoundingClientRect();
    let dx = x - (rect.left + rect.width / 2);
    let dy = y - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > joystickRadius) {
      dx = (dx / dist) * joystickRadius;
      dy = (dy / dist) * joystickRadius;
    }
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight");
    game.handleKeyUp("ArrowUp"); game.handleKeyUp("ArrowDown");
    if (dx < -15) game.handleKeyDown("ArrowLeft");
    if (dx > 15) game.handleKeyDown("ArrowRight");
    if (dy < -15) game.handleKeyDown("ArrowUp");
    if (dy > 15) game.handleKeyDown("ArrowDown");
  };
  joystick.addEventListener("touchstart", (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); });
  joystick.addEventListener("touchmove", (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); });
  joystick.addEventListener("touchend", () => {
    joystickKnob.style.transform = "translate(0, 0)";
    game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight");
    game.handleKeyUp("ArrowUp"); game.handleKeyUp("ArrowDown");
  });
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

  // Background - Sky
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#3498db");
  gradient.addColorStop(1, "#2980b9");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // City silhouette
  ctx.fillStyle = "rgba(44, 62, 80, 0.7)";
  for (let i = 0; i < 8; i++) {
    const buildingHeight = 60 + Math.random() * 40;
    ctx.fillRect(i * 60, height - buildingHeight, 55, buildingHeight);
  }

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

  // Lasers
  state.lasers.forEach(laser => {
    ctx.fillStyle = "#3498db";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#3498db";
    ctx.fillRect(laser.x - laser.width / 2, laser.y - laser.height / 2, laser.width, laser.height);
    ctx.shadowBlur = 0;
  });

  // Enemies
  state.enemies.forEach(enemy => drawEnemy(enemy));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.facing === "left") ctx.scale(-1, 1);

  // Cape
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(-player.width / 2, -player.height / 3);
  ctx.lineTo(-player.width / 2 - 15, -player.height / 3 + 30);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = player.superPower === "strength" ? "#f39c12" : "#3498db";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  // Head
  ctx.fillStyle = "#f0c674";
  ctx.beginPath();
  ctx.arc(0, -player.height / 2 - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Logo
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  // Flying glow
  if (player.isFlying) {
    ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
    ctx.beginPath();
    ctx.arc(0, player.height / 2 + 5, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Attack effect
  if (player.isAttacking) {
    const attackSize = player.superPower === "strength" ? 35 : 25;
    ctx.strokeStyle = player.superPower === "strength" ? "#f39c12" : "#ecf0f1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.width / 2 + 20, 0, attackSize, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(enemy: Enemy): void {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.isHit) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;

  ctx.fillStyle = enemy.color;
  ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

  // Enemy details
  if (enemy.type === "villain") {
    // Crown/helmet
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-enemy.width / 2, -enemy.height / 2 - 5, enemy.width, 5);
  } else if (enemy.type === "robot") {
    // Antenna
    ctx.strokeStyle = "#7f8c8d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.height / 2);
    ctx.lineTo(0, -enemy.height / 2 - 8);
    ctx.stroke();
  }

  // Eyes
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(-8, -enemy.height / 3, 5, 5);
  ctx.fillRect(3, -enemy.height / 3, 5, 5);

  ctx.restore();

  // HP bar
  if (enemy.hp < enemy.maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 12, enemy.width, 4);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 12, enemy.width * (enemy.hp / enemy.maxHp), 4);
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  levelDisplay.textContent = state.level.toString();
  defeatedDisplay.textContent = state.enemiesDefeated.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  energyFill.style.width = `${(state.player.energy / state.player.maxEnergy) * 100}%`;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.level")}</div><div class="stat-value">${state.level}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.defeated")}</div><div class="stat-value">${state.enemiesDefeated}</div></div>
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
