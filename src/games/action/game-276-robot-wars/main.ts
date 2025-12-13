/**
 * Robot Wars Main Entry
 * Game #276
 */
import { RobotWarsGame, GameState, Robot, Projectile, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const killsDisplay = document.getElementById("kills-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const hpFill = document.getElementById("hp-fill")!;
const hpText = document.getElementById("hp-text")!;
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
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: RobotWarsGame;
let animationFrame: number | null = null;
let joystickActive = false;
let joystickData = { x: 0, y: 0 };

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

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

  game = new RobotWarsGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "defeat") {
      showGameOverOverlay(state);
    }
  };

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    game.handleKeyDown(e.code);
  });

  window.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.code);
  });

  // Mobile controls
  setupMobileControls();

  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  // Attack button
  attackBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.attack();
  });

  attackBtn.addEventListener("click", () => {
    game.attack();
  });

  // Joystick
  const joystickRect = () => joystick.getBoundingClientRect();
  const joystickRadius = 40;

  const handleJoystickMove = (clientX: number, clientY: number) => {
    const rect = joystickRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > joystickRadius) {
      dx = (dx / dist) * joystickRadius;
      dy = (dy / dist) * joystickRadius;
    }

    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickData = { x: dx / joystickRadius, y: dy / joystickRadius };

    // Simulate key presses
    game.handleKeyUp("ArrowLeft");
    game.handleKeyUp("ArrowRight");
    game.handleKeyUp("ArrowUp");
    game.handleKeyUp("ArrowDown");

    if (joystickData.x < -0.3) game.handleKeyDown("ArrowLeft");
    if (joystickData.x > 0.3) game.handleKeyDown("ArrowRight");
    if (joystickData.y < -0.3) game.handleKeyDown("ArrowUp");
    if (joystickData.y > 0.3) game.handleKeyDown("ArrowDown");
  };

  const resetJoystick = () => {
    joystickKnob.style.transform = "translate(0, 0)";
    joystickData = { x: 0, y: 0 };
    joystickActive = false;
    game.handleKeyUp("ArrowLeft");
    game.handleKeyUp("ArrowRight");
    game.handleKeyUp("ArrowUp");
    game.handleKeyUp("ArrowDown");
  };

  joystick.addEventListener("touchstart", (e) => {
    e.preventDefault();
    joystickActive = true;
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  });

  joystick.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!joystickActive) return;
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  });

  joystick.addEventListener("touchend", resetJoystick);
  joystick.addEventListener("touchcancel", resetJoystick);
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = Math.min(rect.width, 450);
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

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = "rgba(52, 152, 219, 0.1)";
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "20px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Draw particles
  state.particles.forEach((p) => drawParticle(p));

  // Draw projectiles
  state.projectiles.forEach((proj) => drawProjectile(proj));

  // Draw enemies
  state.enemies.forEach((enemy) => drawRobot(enemy));

  // Draw player
  drawRobot(state.player);

  // Draw combo indicator
  if (state.combo > 1) {
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 24px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${state.combo}x COMBO!`, width / 2, 40);
  }
}

function drawRobot(robot: Robot): void {
  const { x, y, width: w, height: h, color, facing, isAttacking, isHit, hp, maxHp } = robot;

  ctx.save();
  ctx.translate(x, y);

  // Hit flash
  if (isHit) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
  }

  // Body
  const bodyGradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  bodyGradient.addColorStop(0, lightenColor(color, 20));
  bodyGradient.addColorStop(1, color);
  ctx.fillStyle = bodyGradient;

  // Main body
  ctx.fillRect(-w / 2, -h / 4, w, h / 2);

  // Head
  ctx.fillRect(-w / 4, -h / 2, w / 2, h / 4);

  // Eyes
  ctx.fillStyle = robot.isPlayer ? "#fff" : "#ff0";
  const eyeX = facing === "right" ? w / 8 : -w / 8;
  ctx.fillRect(eyeX - 4, -h / 2 + 5, 8, 6);

  // Arms
  ctx.fillStyle = color;
  const armOffset = isAttacking ? (facing === "right" ? 8 : -8) : 0;
  ctx.fillRect(-w / 2 - 8, -h / 8, 8, h / 3);
  ctx.fillRect(w / 2 + armOffset, -h / 8, 8, h / 3);

  // Legs
  ctx.fillRect(-w / 3, h / 4, w / 4, h / 4);
  ctx.fillRect(w / 3 - w / 4, h / 4, w / 4, h / 4);

  // Health bar for enemies
  if (!robot.isPlayer && hp < maxHp) {
    const barWidth = w;
    const barHeight = 4;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(-barWidth / 2, -h / 2 - 10, barWidth, barHeight);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-barWidth / 2, -h / 2 - 10, barWidth * (hp / maxHp), barHeight);
  }

  ctx.restore();
}

function drawProjectile(proj: Projectile): void {
  const { x, y, color, size, isPlayerProjectile } = proj;

  ctx.save();
  ctx.translate(x, y);

  // Glow effect
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);

  // Core
  ctx.fillStyle = isPlayerProjectile ? "#fff" : "#ff0";
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticle(p: Particle): void {
  const alpha = p.life / p.maxLife;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  waveDisplay.textContent = state.wave.toString();
  killsDisplay.textContent = state.kills.toString();
  comboDisplay.textContent = state.combo > 1 ? `${state.combo}x` : "-";

  const hpPercent = (state.player.hp / state.player.maxHp) * 100;
  hpFill.style.width = `${hpPercent}%`;
  hpText.textContent = `${state.player.hp}/${state.player.maxHp}`;

  const energyPercent = (state.player.energy / state.player.maxEnergy) * 100;
  energyFill.style.width = `${energyPercent}%`;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");

  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";

  statsGrid.innerHTML = `
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.wave")}</div>
      <div class="stat-value">${state.wave}</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.kills")}</div>
      <div class="stat-value">${state.kills}</div>
    </div>
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

// Event listeners
startBtn.addEventListener("click", startGame);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
