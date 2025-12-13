import { MonsterHunterGame, GameState, Boss, Particle, Projectile } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const bossDisplay = document.getElementById("boss-display")!;
const defeatedDisplay = document.getElementById("defeated-display")!;
const hpFill = document.getElementById("hp-fill")!;
const bossHpFill = document.getElementById("boss-hp-fill")!;
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

let game: MonsterHunterGame;
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
  game = new MonsterHunterGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "defeat") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "ShiftLeft"].includes(e.code)) e.preventDefault();
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

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2c3e50");
  gradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Floor
  ctx.fillStyle = "#34495e";
  ctx.fillRect(0, height - 60, width, 60);

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

  // Projectiles
  state.projectiles.forEach(proj => {
    ctx.fillStyle = proj.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Boss
  if (state.boss) drawBoss(state.boss);

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.facing === "left") ctx.scale(-1, 1);

  if (player.invulnerable) {
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.03) * 0.5;
  }

  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  // Head
  ctx.fillStyle = "#f0c674";
  ctx.beginPath();
  ctx.arc(0, -player.height / 2 - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Weapon
  ctx.strokeStyle = "#95a5a6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (player.isAttacking) {
    const swing = Math.sin((player.attackFrame / 15) * Math.PI);
    ctx.moveTo(10, -10);
    ctx.lineTo(10 + 30 * swing, -10 - 25 * swing);
  } else {
    ctx.moveTo(10, 0);
    ctx.lineTo(10, -25);
  }
  ctx.stroke();

  // Roll effect
  if (player.isRolling) {
    ctx.strokeStyle = "rgba(52,152,219,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBoss(boss: Boss): void {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  if (boss.isHit) ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.05) * 0.4;

  // Boss body
  ctx.fillStyle = boss.color;
  ctx.fillRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height);

  // Boss features
  switch (boss.type) {
    case 'dragon':
      // Wings
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.moveTo(-boss.width / 2, -boss.height / 4);
      ctx.lineTo(-boss.width / 2 - 30, 0);
      ctx.lineTo(-boss.width / 2, boss.height / 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(boss.width / 2, -boss.height / 4);
      ctx.lineTo(boss.width / 2 + 30, 0);
      ctx.lineTo(boss.width / 2, boss.height / 4);
      ctx.closePath();
      ctx.fill();
      break;
    case 'golem':
      // Stone texture
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-boss.width / 2 + Math.random() * boss.width, -boss.height / 2 + Math.random() * boss.height, 10, 10);
      }
      break;
    case 'hydra':
      // Multiple heads
      ctx.fillStyle = boss.color;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 20, -boss.height / 2 - 10, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'demon':
      // Horns
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.moveTo(-15, -boss.height / 2);
      ctx.lineTo(-20, -boss.height / 2 - 20);
      ctx.lineTo(-10, -boss.height / 2 - 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(15, -boss.height / 2);
      ctx.lineTo(20, -boss.height / 2 - 20);
      ctx.lineTo(10, -boss.height / 2 - 10);
      ctx.closePath();
      ctx.fill();
      break;
  }

  // Eyes
  ctx.fillStyle = "#f39c12";
  ctx.fillRect(-15, -boss.height / 3, 8, 8);
  ctx.fillRect(7, -boss.height / 3, 8, 8);

  // Charging indicator
  if (boss.state === "charging") {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  bossDisplay.textContent = state.bossNumber.toString();
  defeatedDisplay.textContent = state.bossesDefeated.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;

  if (state.boss) {
    bossHpFill.style.width = `${(state.boss.hp / state.boss.maxHp) * 100}%`;
    bossHpFill.parentElement!.style.display = 'block';
  } else {
    bossHpFill.parentElement!.style.display = 'none';
  }
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.boss")}</div><div class="stat-value">${state.bossNumber}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.defeated")}</div><div class="stat-value">${state.bossesDefeated}</div></div>
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
