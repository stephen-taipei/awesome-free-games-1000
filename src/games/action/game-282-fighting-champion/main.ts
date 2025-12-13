import { FightingChampionGame, GameState, Enemy, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const roundDisplay = document.getElementById("round-display")!;
const winsDisplay = document.getElementById("wins-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const hpFill = document.getElementById("hp-fill")!;
const staminaFill = document.getElementById("stamina-fill")!;
const enemyHpFill = document.getElementById("enemy-hp-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const punchBtn = document.getElementById("punch-btn")!;
const kickBtn = document.getElementById("kick-btn")!;
const specialBtn = document.getElementById("special-btn")!;
const blockBtn = document.getElementById("block-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: FightingChampionGame;
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
  game = new FightingChampionGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "defeat") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ShiftLeft"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  punchBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.punch(); });
  kickBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.kick(); });
  specialBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.special(); });
  blockBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.handleKeyDown("KeyB"); });
  blockBtn.addEventListener("touchend", () => game.handleKeyUp("KeyB"));

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
  joystick.addEventListener("touchend", () => {
    joystickKnob.style.transform = "translate(0, 0)";
    game.handleKeyUp("ArrowLeft"); game.handleKeyUp("ArrowRight");
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

  // Arena background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2c3e50");
  gradient.addColorStop(1, "#34495e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Arena floor
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(0, height - 80, width, 80);

  // Center line
  ctx.strokeStyle = "rgba(236,240,241,0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(width / 2, height - 80);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "16px 'Segoe UI'";
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

  // Characters
  if (state.enemy) drawEnemy(state.enemy);
  drawPlayer(state);

  // Combo display
  if (state.player.comboCount > 1) {
    ctx.fillStyle = "#f39c12";
    ctx.font = "bold 32px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#f39c12";
    ctx.fillText(`${state.player.comboCount} COMBO!`, width / 2, 60);
    ctx.shadowBlur = 0;
  }
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.facing === "left") ctx.scale(-1, 1);

  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  // Head
  ctx.fillStyle = "#f0c674";
  ctx.beginPath();
  ctx.arc(0, -player.height / 2 - 8, 12, 0, Math.PI * 2);
  ctx.fill();

  // Headband
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(-12, -player.height / 2 - 12, 24, 6);

  // Block shield
  if (player.isBlocking) {
    ctx.strokeStyle = "rgba(52,152,219,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 30, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  // Attack animation
  if (player.isAttacking) {
    const progress = player.attackFrame / 12;
    ctx.strokeStyle = player.attackType === 'special' ? "#f39c12" : "#ecf0f1";
    ctx.lineWidth = player.attackType === 'special' ? 5 : 3;
    const reach = player.attackType === 'kick' ? 35 : player.attackType === 'special' ? 45 : 25;

    ctx.beginPath();
    if (player.attackType === 'kick') {
      ctx.arc(player.width / 2 + reach * progress, 5, 8, 0, Math.PI * 2);
    } else {
      ctx.moveTo(player.width / 2, -5);
      ctx.lineTo(player.width / 2 + reach * progress, -5);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(enemy: Enemy): void {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.facing === "left") ctx.scale(-1, 1);
  if (enemy.isHit) ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.05) * 0.5;

  // Body
  ctx.fillStyle = enemy.color;
  ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

  // Head
  ctx.fillStyle = "#95a5a6";
  ctx.beginPath();
  ctx.arc(0, -enemy.height / 2 - 8, 12, 0, Math.PI * 2);
  ctx.fill();

  // Type indicator
  if (enemy.type === "champion") {
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-15, -enemy.height / 2 - 15, 30, 4);
  } else if (enemy.type === "ninja") {
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-10, -enemy.height / 2 - 10, 20, 8);
  }

  // Block shield
  if (enemy.state === "blocking") {
    ctx.strokeStyle = "rgba(149,165,166,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 30, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();
  }

  // Attack indicator
  if (enemy.state === "attacking") {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-enemy.width / 2, 0);
    ctx.lineTo(-enemy.width / 2 - 20, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  roundDisplay.textContent = state.round.toString();
  winsDisplay.textContent = state.wins.toString();
  comboDisplay.textContent = state.player.comboCount.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  staminaFill.style.width = `${(state.player.stamina / state.player.maxStamina) * 100}%`;

  if (state.enemy) {
    enemyHpFill.style.width = `${(state.enemy.hp / state.enemy.maxHp) * 100}%`;
    enemyHpFill.parentElement!.style.display = 'block';
  } else {
    enemyHpFill.parentElement!.style.display = 'none';
  }
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.round")}</div><div class="stat-value">${state.round}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.combo")}</div><div class="stat-value">${state.maxCombo}</div></div>
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
