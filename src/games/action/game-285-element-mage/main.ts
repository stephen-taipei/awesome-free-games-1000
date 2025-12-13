import { ElementMageGame, GameState, Enemy, Particle, Spell } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const stageDisplay = document.getElementById("stage-display")!;
const defeatedDisplay = document.getElementById("defeated-display")!;
const hpFill = document.getElementById("hp-fill")!;
const manaFill = document.getElementById("mana-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;
const castBtn = document.getElementById("cast-btn")!;
const fireBtn = document.getElementById("fire-btn")!;
const iceBtn = document.getElementById("ice-btn")!;
const lightningBtn = document.getElementById("lightning-btn")!;
const joystick = document.getElementById("joystick")!;
const joystickKnob = document.getElementById("joystick-knob")!;

let game: ElementMageGame;
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
  game = new ElementMageGame();
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
  castBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.castSpell(); });
  fireBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.switchElement('fire'); });
  iceBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.switchElement('ice'); });
  lightningBtn.addEventListener("touchstart", (e) => { e.preventDefault(); game.switchElement('lightning'); });

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
  gradient.addColorStop(1, "#34495e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Magic circles
  ctx.strokeStyle = "rgba(155,89,182,0.1)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 80 + i * 40, 0, Math.PI * 2);
    ctx.stroke();
  }

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

  // Spells
  state.spells.forEach(spell => drawSpell(spell));

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

  // Robe
  ctx.fillStyle = "#8e44ad";
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

  // Head
  ctx.fillStyle = "#f0c674";
  ctx.beginPath();
  ctx.arc(0, -player.height / 2 - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Wizard hat
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.moveTo(-12, -player.height / 2 - 8);
  ctx.lineTo(0, -player.height / 2 - 25);
  ctx.lineTo(12, -player.height / 2 - 8);
  ctx.closePath();
  ctx.fill();

  // Element indicator
  let elementColor: string;
  switch (player.currentElement) {
    case 'fire': elementColor = '#e74c3c'; break;
    case 'ice': elementColor = '#3498db'; break;
    case 'lightning': elementColor = '#f1c40f'; break;
  }
  ctx.fillStyle = elementColor;
  ctx.shadowBlur = 10;
  ctx.shadowColor = elementColor;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Casting effect
  if (player.isCasting) {
    ctx.strokeStyle = elementColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.width / 2 + 15, 0, 12 + player.castFrame, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(enemy: Enemy): void {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.facing === "left") ctx.scale(-1, 1);

  if (enemy.isHit) {
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.05) * 0.4;
  }

  // Status effect overlay
  if (enemy.statusEffect) {
    let effectColor: string;
    switch (enemy.statusEffect) {
      case 'burn': effectColor = '#e74c3c'; break;
      case 'frozen': effectColor = '#3498db'; break;
      case 'shocked': effectColor = '#f1c40f'; break;
      default: effectColor = '#ffffff';
    }
    ctx.strokeStyle = effectColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(-enemy.width / 2 - 3, -enemy.height / 2 - 3, enemy.width + 6, enemy.height + 6);
  }

  // Body
  ctx.fillStyle = enemy.color;
  ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

  // Enemy features
  if (enemy.type === 'dragon') {
    // Wings
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(-enemy.width / 2, 0, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'golem') {
    // Stone texture
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-enemy.width / 4 + i * 8, -enemy.height / 4, 6, 6);
    }
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

function drawSpell(spell: Spell): void {
  ctx.save();
  ctx.translate(spell.x, spell.y);

  ctx.shadowBlur = 15;
  ctx.shadowColor = spell.color;

  if (spell.element === 'fire') {
    ctx.fillStyle = spell.color;
    ctx.beginPath();
    ctx.arc(0, 0, spell.width / 2, 0, Math.PI * 2);
    ctx.fill();
    // Flame trail
    for (let i = 1; i < 4; i++) {
      ctx.globalAlpha = 0.6 - i * 0.2;
      ctx.beginPath();
      ctx.arc(-spell.vx * i, 0, spell.width / 2 - i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (spell.element === 'ice') {
    ctx.fillStyle = spell.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * spell.width / 2;
      const y = Math.sin(angle) * spell.height / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (spell.element === 'lightning') {
    ctx.strokeStyle = spell.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(5, -2);
    ctx.lineTo(-5, 2);
    ctx.lineTo(10, 5);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  stageDisplay.textContent = state.stage.toString();
  defeatedDisplay.textContent = state.enemiesDefeated.toString();
  hpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  manaFill.style.width = `${(state.player.mana / state.player.maxMana) * 100}%`;

  // Update element button states
  const activeElement = state.player.currentElement;
  fireBtn.style.opacity = activeElement === 'fire' ? '1' : '0.6';
  iceBtn.style.opacity = activeElement === 'ice' ? '1' : '0.6';
  lightningBtn.style.opacity = activeElement === 'lightning' ? '1' : '0.6';
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.defeat");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.stage")}</div><div class="stat-value">${state.stage}</div></div>
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
