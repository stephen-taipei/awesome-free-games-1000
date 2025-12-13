import { TimeWarriorGame, GameState, Enemy, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const defeatedDisplay = document.getElementById("defeated-display")!;
const hpFill = document.getElementById("hp-fill")!;
const timeFill = document.getElementById("time-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const attackBtn = document.getElementById("attack-btn")!;
const dashBtn = document.getElementById("dash-btn")!;
const slowBtn = document.getElementById("slow-btn")!;
const freezeBtn = document.getElementById("freeze-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: TimeWarriorGame;
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
  game = new TimeWarriorGame();
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
  dashBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.teleportDash(); });
  slowBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.timeSlow(); });
  freezeBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.timeFreeze(); });

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

  // Background with time effect
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (state.timeSlowActive) {
    gradient.addColorStop(0, "#1a1a3e");
    gradient.addColorStop(1, "#2c2c5e");
  } else {
    gradient.addColorStop(0, "#0f0f1a");
    gradient.addColorStop(1, "#1a1a2e");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Grid effect
  ctx.strokeStyle = state.timeSlowActive ? "rgba(155,89,182,0.2)" : "rgba(52,152,219,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "16px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Time effect visual
  if (state.timeEffect) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = state.timeEffect.type === 'freeze' ? "#3498db" : "#9b59b6";
    ctx.beginPath();
    ctx.arc(state.timeEffect.x, state.timeEffect.y, state.timeEffect.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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

  // Enemies
  state.enemies.forEach(enemy => drawEnemy(enemy, state.timeSlowActive));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.facing === "left") ctx.scale(-1, 1);

  if (player.invulnerable) {
    ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.04) * 0.6;
  }

  // Body with time glow
  ctx.fillStyle = "#3498db";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#3498db";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
  ctx.shadowBlur = 0;

  // Head
  ctx.fillStyle = "#ecf0f1";
  ctx.beginPath();
  ctx.arc(0, -player.height / 2 - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Time symbol
  ctx.strokeStyle = "#9b59b6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -6);
  ctx.stroke();

  // Weapon
  if (player.isAttacking) {
    const swing = player.attackFrame / 12;
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.width / 2 + 15, 0, 20, -Math.PI / 2 + swing * Math.PI, Math.PI / 2 + swing * Math.PI);
    ctx.stroke();
  }

  // Dash trail
  if (player.isDashing) {
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.3 - i * 0.1;
      ctx.fillStyle = "#3498db";
      ctx.fillRect(-player.width / 2 - i * 10, -player.height / 2, player.width, player.height);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawEnemy(enemy: Enemy, timeSlowActive: boolean): void {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.facing === "left") ctx.scale(-1, 1);

  if (enemy.isFrozen) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#3498db";
    ctx.strokeStyle = "#2980b9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-enemy.width / 2 - 5, -enemy.height / 2 - 5, enemy.width + 10, enemy.height + 10);
    ctx.stroke();
  }

  if (enemy.isHit) {
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.05) * 0.4;
  }

  // Body
  ctx.fillStyle = enemy.color;
  if (timeSlowActive && !enemy.isFrozen) {
    ctx.globalAlpha *= 0.7;
  }
  ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

  // Type indicator
  if (enemy.type === "chrono") {
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -enemy.height / 2 - 10, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

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
  waveDisplay.textContent = state.wave.toString();
  defeatedDisplay.textContent = state.enemiesDefeated.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  timeFill.style.width = `${(state.player.timeEnergy / state.player.maxTimeEnergy) * 100}%`;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.wave")}</div><div class="stat-value">${state.wave}</div></div>
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
