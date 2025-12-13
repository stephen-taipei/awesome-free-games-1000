import { ShadowAssassinGame, GameState, Enemy, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const killsDisplay = document.getElementById("kills-display")!;
const stealthDisplay = document.getElementById("stealth-display")!;
const hpFill = document.getElementById("hp-fill")!;
const stealthFill = document.getElementById("stealth-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const attackBtn = document.getElementById("attack-btn")!;
const hideBtn = document.getElementById("hide-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: ShadowAssassinGame;
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
  game = new ShadowAssassinGame();
  game.onStateChange = (state: GameState) => { updateUI(state); if (state.phase === "defeat") showGameOverOverlay(state); };
  window.addEventListener("keydown", (e) => { if (["Space", "ArrowLeft", "ArrowRight", "ShiftLeft"].includes(e.code)) e.preventDefault(); game.handleKeyDown(e.code); });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  attackBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.attack(); });
  hideBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.handleKeyDown("ShiftLeft"); });
  hideBtn.addEventListener("touchend", () => game.handleKeyUp("ShiftLeft"));

  const joystickRadius = 40;
  const handleMove = (x: number, y: number) => {
    const rect = joystick.getBoundingClientRect();
    let dx = x - (rect.left + rect.width / 2);
    const dist = Math.abs(dx);
    if (dist > joystickRadius) dx = (dx / dist) * joystickRadius;
    joystickKnob.style.transform = `translate(${dx}px, 0)`;
    game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight");
    if (dx < -15) game.handleKeyDown("ArrowLeft");
    if (dx > 15) game.handleKeyDown("ArrowRight");
  };
  joystick.addEventListener("touchstart", (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); });
  joystick.addEventListener("touchmove", (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); });
  joystick.addEventListener("touchend", () => { joystickKnob.style.transform = "translate(0, 0)"; game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight"); });
}

function resizeCanvas(): void { canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450); canvas.height = 400; }

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#2d2d44";
  ctx.fillRect(0, height - 40, width, 40);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  state.enemies.forEach(enemy => drawEnemy(enemy));
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.facing === "left") ctx.scale(-1, 1);
  ctx.globalAlpha = player.isHidden ? 0.4 : 1;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  // Hood
  ctx.beginPath();
  ctx.arc(0, -player.height / 2, 12, Math.PI, 0);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(2, -player.height / 3, 6, 3);

  // Blade
  if (player.isAttacking) {
    const angle = (player.attackFrame / 12) * Math.PI - Math.PI / 2;
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(10 + Math.cos(angle) * 35, Math.sin(angle) * 35);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(enemy: Enemy): void {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.facing === "left") ctx.scale(-1, 1);
  if (enemy.isHit) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;

  ctx.fillStyle = enemy.color;
  ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

  // Vision cone
  if (enemy.state === "patrol") {
    ctx.fillStyle = "rgba(255,255,0,0.1)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(enemy.visionRange, -30);
    ctx.lineTo(enemy.visionRange, 30);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.state === "alert") {
    ctx.fillStyle = "rgba(255,0,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(enemy.visionRange, -30);
    ctx.lineTo(enemy.visionRange, 30);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  // HP bar
  if (enemy.hp < enemy.maxHp) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 10, enemy.width, 4);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 10, enemy.width * (enemy.hp / enemy.maxHp), 4);
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  levelDisplay.textContent = state.level.toString();
  killsDisplay.textContent = state.kills.toString();
  stealthDisplay.textContent = state.stealthKills.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  stealthFill.style.width = `${(state.player.stealth / state.player.maxStealth) * 100}%`;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.level")}</div><div class="stat-value">${state.level}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.stealth")}</div><div class="stat-value">${state.stealthKills}</div></div>
  `;
  statsGrid.style.display = "grid";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void { overlay.style.display = "none"; finalScoreDisplay.style.display = "none"; statsGrid.style.display = "none"; game.start(); }

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
