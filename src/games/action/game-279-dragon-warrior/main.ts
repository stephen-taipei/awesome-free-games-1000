/**
 * Dragon Warrior Main Entry
 * Game #279
 */
import { DragonWarriorGame, GameState, Dragon, Fireball, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const killsDisplay = document.getElementById("kills-display")!;
const dragonsDisplay = document.getElementById("dragons-display")!;
const hpFill = document.getElementById("hp-fill")!;
const staminaFill = document.getElementById("stamina-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const attackBtn = document.getElementById("attack-btn")!;
const rollBtn = document.getElementById("roll-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: DragonWarriorGame;
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
  game = new DragonWarriorGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "defeat") showGameOverOverlay(state);
  };

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  attackBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.attack(); });
  rollBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.roll(); });

  const joystickRadius = 40;
  const handleJoystickMove = (clientX: number, clientY: number) => {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > joystickRadius) { dx = (dx / dist) * joystickRadius; dy = (dy / dist) * joystickRadius; }
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight"); game.handleKeyUp("ArrowUp"); game.handleKeyUp("ArrowDown");
    if (dx < -15) game.handleKeyDown("ArrowLeft");
    if (dx > 15) game.handleKeyDown("ArrowRight");
    if (dy < -15) game.handleKeyDown("ArrowUp");
    if (dy > 15) game.handleKeyDown("ArrowDown");
  };
  const resetJoystick = () => {
    joystickKnob.style.transform = "translate(0, 0)";
    game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight"); game.handleKeyUp("ArrowUp"); game.handleKeyUp("ArrowDown");
  };
  joystick.addEventListener("touchstart", (e) => { e.preventDefault(); handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY); });
  joystick.addEventListener("touchmove", (e) => { e.preventDefault(); handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY); });
  joystick.addEventListener("touchend", resetJoystick);
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  canvas.width = Math.min(container.getBoundingClientRect().width, 450);
  canvas.height = 400;
}

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(0, 0, width, height);

  // Ground
  ctx.fillStyle = "#636e72";
  ctx.fillRect(0, height - 30, width, 30);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  state.particles.forEach(p => drawParticle(p));
  state.fireballs.forEach(fb => drawFireball(fb));
  state.dragons.forEach(d => drawDragon(d));
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  const { x, y, width: w, height: h, facing, isAttacking, attackFrame, isRolling, invincible } = player;

  ctx.save();
  ctx.translate(x, y);
  if (facing === "left") ctx.scale(-1, 1);
  if (invincible) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
  if (isRolling) ctx.rotate(Date.now() * 0.02);

  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-w / 2, -h / 4, w, h / 2);
  // Head
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(0, -h / 3, 10, 0, Math.PI * 2);
  ctx.fill();
  // Sword
  if (isAttacking) {
    const angle = (attackFrame / 15) * Math.PI - Math.PI / 4;
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(10 + Math.cos(angle) * 40, Math.sin(angle) * 40);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(30, -15);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDragon(dragon: Dragon): void {
  const { x, y, width: w, height: h, color, type, isHit, hp, maxHp } = dragon;

  ctx.save();
  ctx.translate(x, y);
  if (isHit) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;

  // Wings
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-w / 2 - 10, -10, 20, 30, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2 + 10, -10, 20, 30, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -h / 2 - 10, type === "boss" ? 25 : 15, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-8, -h / 2 - 12, 5, 0, Math.PI * 2);
  ctx.arc(8, -h / 2 - 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.arc(-8, -h / 2 - 12, 2, 0, Math.PI * 2);
  ctx.arc(8, -h / 2 - 12, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // HP bar
  if (hp < maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - w / 2, y - h / 2 - 15, w, 5);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x - w / 2, y - h / 2 - 15, w * (hp / maxHp), 5);
  }
}

function drawFireball(fb: Fireball): void {
  ctx.save();
  ctx.translate(fb.x, fb.y);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fb.size);
  gradient.addColorStop(0, "#f1c40f");
  gradient.addColorStop(0.5, "#e74c3c");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, fb.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticle(p: Particle): void {
  ctx.globalAlpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  waveDisplay.textContent = state.wave.toString();
  killsDisplay.textContent = state.kills.toString();
  dragonsDisplay.textContent = state.dragonsSlain.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  staminaFill.style.width = `${(state.player.stamina / state.player.maxStamina) * 100}%`;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.wave")}</div><div class="stat-value">${state.wave}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.dragons")}</div><div class="stat-value">${state.dragonsSlain}</div></div>
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
