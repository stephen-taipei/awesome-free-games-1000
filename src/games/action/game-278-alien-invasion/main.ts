/**
 * Alien Invasion Main Entry
 * Game #278
 */
import { AlienInvasionGame, GameState, Alien, Projectile, Particle, PowerUp } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const killsDisplay = document.getElementById("kills-display")!;
const bossDisplay = document.getElementById("boss-display")!;
const hpFill = document.getElementById("hp-fill")!;
const shieldFill = document.getElementById("shield-fill")!;
const weaponDisplay = document.getElementById("weapon-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: AlienInvasionGame;
let animationFrame: number | null = null;

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

  game = new AlienInvasionGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "defeat") {
      showGameOverOverlay(state);
    }
  };

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    game.handleKeyDown(e.code);
  });

  window.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.code);
  });

  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const joystickRadius = 40;

  const handleJoystickMove = (clientX: number, clientY: number) => {
    const rect = joystick.getBoundingClientRect();
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

    game.handleKeyUp("ArrowLeft");
    game.handleKeyUp("ArrowRight");
    game.handleKeyUp("ArrowUp");
    game.handleKeyUp("ArrowDown");

    if (dx < -15) game.handleKeyDown("ArrowLeft");
    if (dx > 15) game.handleKeyDown("ArrowRight");
    if (dy < -15) game.handleKeyDown("ArrowUp");
    if (dy > 15) game.handleKeyDown("ArrowDown");
  };

  const resetJoystick = () => {
    joystickKnob.style.transform = "translate(0, 0)";
    game.handleKeyUp("ArrowLeft");
    game.handleKeyUp("ArrowRight");
    game.handleKeyUp("ArrowUp");
    game.handleKeyUp("ArrowDown");
  };

  joystick.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  });

  joystick.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  });

  joystick.addEventListener("touchend", resetJoystick);
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

  // Space background
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, width, height);

  // Stars
  drawStars(width, height);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Draw power-ups
  state.powerUps.forEach(pu => drawPowerUp(pu));

  // Draw particles
  state.particles.forEach(p => drawParticle(p));

  // Draw projectiles
  state.projectiles.forEach(proj => drawProjectile(proj));

  // Draw aliens
  state.aliens.forEach(alien => drawAlien(alien));

  // Draw player
  drawPlayer(state.player);
}

function drawStars(width: number, height: number): void {
  const starSeed = 12345;
  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 50; i++) {
    const x = rng(starSeed + i) * width;
    const y = rng(starSeed + i + 100) * height;
    const size = rng(starSeed + i + 200) * 2 + 0.5;
    const alpha = rng(starSeed + i + 300) * 0.5 + 0.3;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(player: any): void {
  const { x, y, width: w, height: h, weaponLevel } = player;

  ctx.save();
  ctx.translate(x, y);

  // Ship body
  ctx.fillStyle = "#3498db";
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.lineTo(0, h / 3);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#85c1e9";
  ctx.beginPath();
  ctx.arc(0, -5, 8, 0, Math.PI * 2);
  ctx.fill();

  // Engine glow
  ctx.fillStyle = "#f39c12";
  ctx.beginPath();
  ctx.moveTo(-8, h / 2);
  ctx.lineTo(0, h / 2 + 10 + Math.random() * 5);
  ctx.lineTo(8, h / 2);
  ctx.closePath();
  ctx.fill();

  // Weapon indicators
  if (weaponLevel >= 2) {
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(-w / 2 - 5, 0, 5, 10);
    ctx.fillRect(w / 2, 0, 5, 10);
  }
  if (weaponLevel >= 3) {
    ctx.fillStyle = "#9b59b6";
    ctx.fillRect(-w / 2 - 10, 5, 5, 8);
    ctx.fillRect(w / 2 + 5, 5, 5, 8);
  }

  ctx.restore();
}

function drawAlien(alien: Alien): void {
  const { x, y, width: w, height: h, color, type, isHit, hp, maxHp } = alien;

  ctx.save();
  ctx.translate(x, y);

  if (isHit) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
  }

  if (type === 'boss') {
    // Boss alien
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(-15, -5, 8, 0, Math.PI * 2);
    ctx.arc(15, -5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 10, 20, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (type === 'shooter') {
    // Shooter alien
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.lineTo(-w / 4, h / 2);
    ctx.lineTo(w / 4, h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Grunt alien
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-5, -3, 3, 0, Math.PI * 2);
    ctx.arc(5, -3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Health bar for boss
  if (type === 'boss') {
    const barWidth = w;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x - barWidth / 2, y - h / 2 - 12, barWidth, 6);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x - barWidth / 2, y - h / 2 - 12, barWidth * (hp / maxHp), 6);
  }
}

function drawProjectile(proj: Projectile): void {
  const { x, y, color, size, isPlayerProjectile } = proj;

  ctx.save();
  ctx.translate(x, y);

  // Glow
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);

  // Core
  ctx.fillStyle = isPlayerProjectile ? "#fff" : "#ff6b6b";
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

function drawPowerUp(pu: PowerUp): void {
  const { x, y, type } = pu;
  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  if (type === 'health') {
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-8, -3, 16, 6);
    ctx.fillRect(-3, -8, 6, 16);
  } else if (type === 'shield') {
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#9b59b6";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? 12 : 5;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  waveDisplay.textContent = state.wave.toString();
  killsDisplay.textContent = state.kills.toString();
  bossDisplay.textContent = state.bossDefeated.toString();

  const hpPercent = (state.player.hp / state.player.maxHp) * 100;
  hpFill.style.width = `${hpPercent}%`;

  const shieldPercent = (state.player.shield / state.player.maxShield) * 100;
  shieldFill.style.width = `${shieldPercent}%`;

  weaponDisplay.textContent = `Lv.${state.player.weaponLevel}`;
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
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.boss")}</div>
      <div class="stat-value">${state.bossDefeated}</div>
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

startBtn.addEventListener("click", startGame);

window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

initI18n();
initGame();
