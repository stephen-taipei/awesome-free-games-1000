/**
 * Zombie Hunter Main Entry
 * Game #277
 */
import { ZombieHunterGame, GameState, Zombie, Bullet, Particle, Pickup } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const killsDisplay = document.getElementById("kills-display")!;
const headshotsDisplay = document.getElementById("headshots-display")!;
const hpFill = document.getElementById("hp-fill")!;
const hpText = document.getElementById("hp-text")!;
const ammoDisplay = document.getElementById("ammo-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const shootBtn = document.getElementById("shoot-btn")!;
const reloadBtn = document.getElementById("reload-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: ZombieHunterGame;
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

  game = new ZombieHunterGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "defeat") {
      showGameOverOverlay(state);
    }
  };

  // Mouse controls
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.setMousePos(x, y);
  });

  canvas.addEventListener("click", (e) => {
    if (game.getState().phase !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.shoot(x, y);
  });

  canvas.addEventListener("mousedown", () => {
    canvas.style.cursor = "crosshair";
  });

  // Keyboard
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
  let lastAimX = 0, lastAimY = 0;

  shootBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const state = game.getState();
    if (state.phase !== "playing") return;
    const nearestZombie = findNearestZombie(state);
    if (nearestZombie) {
      game.shoot(nearestZombie.x, nearestZombie.y);
    } else {
      game.shoot(state.player.x + (state.player.facing === "right" ? 100 : -100), state.player.y);
    }
  });

  reloadBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.reload();
  });

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

function findNearestZombie(state: GameState): Zombie | null {
  if (state.zombies.length === 0) return null;

  let nearest: Zombie | null = null;
  let minDist = Infinity;

  state.zombies.forEach(zombie => {
    const dx = zombie.x - state.player.x;
    const dy = zombie.y - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = zombie;
    }
  });

  return nearest;
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

  // Dark background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, width, height);

  // Creepy fog effect
  const fogGradient = ctx.createRadialGradient(
    state.player.x, state.player.y, 50,
    state.player.x, state.player.y, 250
  );
  fogGradient.addColorStop(0, "rgba(30, 30, 30, 0)");
  fogGradient.addColorStop(1, "rgba(10, 10, 10, 0.7)");
  ctx.fillStyle = fogGradient;
  ctx.fillRect(0, 0, width, height);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Draw pickups
  state.pickups.forEach(pickup => drawPickup(pickup));

  // Draw particles
  state.particles.forEach(p => drawParticle(p));

  // Draw bullets
  state.bullets.forEach(bullet => drawBullet(bullet));

  // Draw zombies
  state.zombies.forEach(zombie => drawZombie(zombie));

  // Draw player
  drawPlayer(state);

  // Crosshair
  if (state.phase === "playing") {
    drawCrosshair();
  }
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  const { x, y, width: w, height: h, facing, isReloading } = player;

  ctx.save();
  ctx.translate(x, y);
  if (facing === "left") ctx.scale(-1, 1);

  // Body
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(-w / 2, -h / 4, w, h / 2);

  // Head
  ctx.fillStyle = "#f4d03f";
  ctx.beginPath();
  ctx.arc(0, -h / 3, 10, 0, Math.PI * 2);
  ctx.fill();

  // Gun
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(w / 4, -5, 20, 8);

  // Legs
  ctx.fillStyle = "#34495e";
  ctx.fillRect(-w / 3, h / 4, 8, h / 4);
  ctx.fillRect(w / 3 - 8, h / 4, 8, h / 4);

  ctx.restore();

  // Reloading indicator
  if (isReloading) {
    ctx.fillStyle = "#e74c3c";
    ctx.font = "12px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.reloading"), x, y - h / 2 - 15);
  }
}

function drawZombie(zombie: Zombie): void {
  const { x, y, width: w, height: h, color, type, isHit, hp, maxHp } = zombie;

  ctx.save();
  ctx.translate(x, y);

  if (isHit) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;
  }

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 4, w, h / 2);

  // Head
  ctx.fillStyle = "#4a7c59";
  ctx.beginPath();
  ctx.arc(0, -h / 3, type === "tank" ? 14 : 8, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (red)
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.arc(-4, -h / 3, 2, 0, Math.PI * 2);
  ctx.arc(4, -h / 3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Arms (reaching forward)
  ctx.fillStyle = color;
  ctx.fillRect(w / 2, -h / 6, 15, 6);
  ctx.fillRect(w / 2, h / 8, 15, 6);

  ctx.restore();

  // Health bar
  if (hp < maxHp) {
    const barWidth = w;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x - barWidth / 2, y - h / 2 - 8, barWidth, 4);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x - barWidth / 2, y - h / 2 - 8, barWidth * (hp / maxHp), 4);
  }
}

function drawBullet(bullet: Bullet): void {
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Trail
  ctx.strokeStyle = "rgba(241, 196, 15, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bullet.x, bullet.y);
  ctx.lineTo(bullet.x - bullet.vx * 2, bullet.y - bullet.vy * 2);
  ctx.stroke();
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

function drawPickup(pickup: Pickup): void {
  const { x, y, type } = pickup;
  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  if (type === "health") {
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-8, -3, 16, 6);
    ctx.fillRect(-3, -8, 6, 16);
  } else {
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-6, -10, 12, 20);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(-4, -8, 8, 4);
  }

  ctx.restore();
}

function drawCrosshair(): void {
  const state = game.getState();
  const nearest = findNearestZombie(state);

  if (nearest) {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(nearest.x, nearest.y, 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(nearest.x - 25, nearest.y);
    ctx.lineTo(nearest.x - 10, nearest.y);
    ctx.moveTo(nearest.x + 10, nearest.y);
    ctx.lineTo(nearest.x + 25, nearest.y);
    ctx.moveTo(nearest.x, nearest.y - 25);
    ctx.lineTo(nearest.x, nearest.y - 10);
    ctx.moveTo(nearest.x, nearest.y + 10);
    ctx.lineTo(nearest.x, nearest.y + 25);
    ctx.stroke();
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  waveDisplay.textContent = state.wave.toString();
  killsDisplay.textContent = state.kills.toString();
  headshotsDisplay.textContent = state.headshots.toString();

  const hpPercent = (state.player.hp / state.player.maxHp) * 100;
  hpFill.style.width = `${hpPercent}%`;
  hpText.textContent = `${Math.max(0, state.player.hp)}/${state.player.maxHp}`;

  ammoDisplay.textContent = state.player.isReloading
    ? "..."
    : `${state.player.ammo}/${state.player.maxAmmo}`;
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
      <div class="stat-label">${i18n.t("game.headshots")}</div>
      <div class="stat-value">${state.headshots}</div>
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
