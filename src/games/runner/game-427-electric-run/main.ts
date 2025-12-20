import { ElectricRunGame, GameState, Obstacle, Collectible, Particle, LightningBolt } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const chargeDisplay = document.getElementById("charge-display")!;
const boltsDisplay = document.getElementById("bolts-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const chargeBar = document.getElementById("charge-bar")!;
const overchargedLabel = document.getElementById("overcharged-label")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: ElectricRunGame;
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
  game = new ElectricRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
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

  // Background - dark electric theme
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0a20");
  gradient.addColorStop(1, "#1a1a30");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Electric grid lines in background
  ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 40);
    ctx.lineTo(width, i * 40);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 40, 0);
    ctx.lineTo(i * 40, height);
    ctx.stroke();
  }

  // Ground
  const groundY = height - 80;
  ctx.fillStyle = "#1a2a3a";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Electric ground line
  ctx.strokeStyle = state.isOvercharged ? "#ffff00" : "#00ffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 25);
  ctx.lineTo(width, groundY + 25);
  ctx.stroke();

  // Lane lines
  ctx.strokeStyle = "#00ffff33";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(i * (width / 3), groundY - 80);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(0,255,255,0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Lightning bolts
  state.lightningBolts.forEach(bolt => drawLightning(bolt));

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawLightning(bolt: LightningBolt): void {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  bolt.segments.forEach((seg, i) => {
    if (i === 0) ctx.moveTo(seg.x, seg.y);
    else ctx.lineTo(seg.x, seg.y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Overcharge glow
  if (state.isOvercharged) {
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ffff00';
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Electric runner body
  ctx.fillStyle = state.isOvercharged ? '#ffff00' : '#00ffff';

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(5, -20, 10, 0, Math.PI * 2);
  ctx.fill();

  // Running legs (animated)
  const legAngle = Math.sin(Date.now() * 0.02) * 0.5;
  ctx.strokeStyle = state.isOvercharged ? '#ffff00' : '#00ffff';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(-5, 15);
  ctx.lineTo(-5 + Math.sin(legAngle) * 15, 35);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5, 15);
  ctx.lineTo(5 + Math.sin(-legAngle) * 15, 35);
  ctx.stroke();

  // Electric sparks around player
  if (player.charge > 50) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (Date.now() * 0.01 + i * Math.PI / 2) % (Math.PI * 2);
      const radius = 25 + Math.sin(Date.now() * 0.01 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.lineTo(Math.cos(angle) * (radius + 8), Math.sin(angle) * (radius + 8));
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "static":
      ctx.fillStyle = "#444";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      break;

    case "electric_fence":
      if (obs.active) {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -obs.height / 2);
        for (let i = 0; i < 10; i++) {
          const y = -obs.height / 2 + (obs.height * i) / 10;
          const x = (Math.random() - 0.5) * 10;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(0, obs.height / 2);
        ctx.stroke();

        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -obs.height / 2);
        ctx.lineTo(0, obs.height / 2);
        ctx.stroke();
      }
      break;

    case "spark":
      ctx.fillStyle = "#ff6600";
      drawSparkShape(0, 0, 15);
      ctx.fillStyle = "#ffff00";
      drawSparkShape(0, 0, 8);
      break;

    case "generator":
      ctx.fillStyle = "#333";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 5, 10, 10);
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(obs.width / 2 - 15, -obs.height / 2 + 5, 10, 10);
      // Warning stripes
      ctx.fillStyle = "#ffff00";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-obs.width / 2 + i * 15, obs.height / 2 - 10, 10, 10);
      }
      break;
  }

  ctx.restore();
}

function drawSparkShape(x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? size : size * 0.5;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "bolt":
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, -2);
      ctx.lineTo(2, -2);
      ctx.lineTo(2, 12);
      ctx.lineTo(-6, 2);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      break;

    case "battery":
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(-8, -12, 16, 20);
      ctx.fillRect(-4, -15, 8, 3);
      ctx.fillStyle = "#88ff88";
      ctx.fillRect(-6, -8, 12, 12);
      break;

    case "surge":
      ctx.fillStyle = "#ff00ff";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", 0, 0);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  boltsDisplay.textContent = state.boltsCollected.toString();
  speedDisplay.textContent = state.speed.toFixed(1);

  const chargePercent = Math.floor((state.player.charge / state.player.maxCharge) * 100);
  chargeDisplay.textContent = chargePercent + "%";
  chargeBar.style.width = chargePercent + "%";

  if (state.isOvercharged) {
    chargeBar.style.background = "linear-gradient(90deg, #ffff00, #ff8800)";
    overchargedLabel.style.display = "block";
  } else {
    chargeBar.style.background = "linear-gradient(90deg, #00ffff, #0088ff)";
    overchargedLabel.style.display = "none";
  }
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.bolts")}</div><div class="stat-value">${state.boltsCollected}</div></div>
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
