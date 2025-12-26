import { StarRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const stardustDisplay = document.getElementById("stardust-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: StarRunGame;
let animationFrame: number | null = null;
let stars: { x: number; y: number; size: number; speed: number; twinkle: number }[] = [];

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) =>
    i18n.loadTranslations(locale as Locale, trans)
  );
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
  initStars();
  game = new StarRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code))
      e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initStars(): void {
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * 450,
      y: Math.random() * 400,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 2 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
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
  const time = Date.now() * 0.001;

  // Space background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0015");
  gradient.addColorStop(0.5, "#150030");
  gradient.addColorStop(1, "#200045");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Stars
  const speed = state.phase === "playing" ? state.speed : 1;
  stars.forEach((star) => {
    star.x -= star.speed * speed * 0.2;
    if (star.x < 0) {
      star.x = width;
      star.y = Math.random() * height;
    }
    const twinkle = 0.5 + Math.sin(time * 3 + star.twinkle) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Nebula glow in background
  ctx.fillStyle = "rgba(100, 50, 150, 0.1)";
  ctx.beginPath();
  ctx.arc(width * 0.7, height * 0.3, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(50, 100, 150, 0.1)";
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.6, 60, 0, Math.PI * 2);
  ctx.fill();

  // Space platform (energy field)
  const groundY = height - 80;
  const platformGradient = ctx.createLinearGradient(0, groundY + 20, 0, height);
  platformGradient.addColorStop(0, "rgba(100, 50, 200, 0.5)");
  platformGradient.addColorStop(1, "rgba(50, 25, 100, 0.8)");
  ctx.fillStyle = platformGradient;
  ctx.fillRect(0, groundY + 20, width, 60);

  // Energy lines
  ctx.strokeStyle = "rgba(150, 100, 255, 0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const lineY = groundY + 25 + i * 10;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    for (let x = 0; x < width; x += 20) {
      ctx.lineTo(x, lineY + Math.sin(time * 2 + x * 0.05) * 2);
    }
    ctx.stroke();
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(150, 100, 255, 0.3)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(200, 150, 255, 0.8)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach((col) => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach((obs) => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Warp shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "rgba(150, 100, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    // Rotating shield particles
    const shieldTime = Date.now() * 0.003;
    for (let i = 0; i < 8; i++) {
      const angle = shieldTime + (Math.PI * 2 * i) / 8;
      ctx.fillStyle = "rgba(200, 150, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 35, Math.sin(angle) * 35, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Spaceship body
  ctx.fillStyle = "#6040a0";
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-10, -18);
  ctx.lineTo(-15, -12);
  ctx.lineTo(-15, 12);
  ctx.lineTo(-10, 18);
  ctx.closePath();
  ctx.fill();

  // Cockpit window
  ctx.fillStyle = "#66ffff";
  ctx.beginPath();
  ctx.ellipse(5, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Engine glow
  const engineGlow = ctx.createRadialGradient(-15, 0, 2, -15, 0, 15);
  engineGlow.addColorStop(0, "#ff66ff");
  engineGlow.addColorStop(0.5, "#ff33ff");
  engineGlow.addColorStop(1, "transparent");
  ctx.fillStyle = engineGlow;
  ctx.beginPath();
  ctx.arc(-15, 0, 15 + Math.random() * 5, 0, Math.PI * 2);
  ctx.fill();

  // Wing details
  ctx.fillStyle = "#8060c0";
  ctx.fillRect(-12, -15, 8, 4);
  ctx.fillRect(-12, 11, 8, 4);

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(obs.rotation);

  switch (obs.type) {
    case "asteroid":
      // Rocky asteroid
      ctx.fillStyle = "#5a5045";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(obs.width / 2 - 5, -obs.height / 3);
      ctx.lineTo(obs.width / 2, obs.height / 4);
      ctx.lineTo(obs.width / 3, obs.height / 2);
      ctx.lineTo(-obs.width / 3, obs.height / 2);
      ctx.lineTo(-obs.width / 2, 0);
      ctx.lineTo(-obs.width / 2 + 5, -obs.height / 3);
      ctx.closePath();
      ctx.fill();
      // Craters
      ctx.fillStyle = "#4a4035";
      ctx.beginPath();
      ctx.arc(-5, -5, 5, 0, Math.PI * 2);
      ctx.arc(8, 5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "comet":
      // Comet tail
      const tailGradient = ctx.createLinearGradient(0, 0, -60, 0);
      tailGradient.addColorStop(0, "rgba(100, 200, 255, 0.8)");
      tailGradient.addColorStop(1, "transparent");
      ctx.fillStyle = tailGradient;
      ctx.beginPath();
      ctx.moveTo(10, -8);
      ctx.lineTo(-60, -3);
      ctx.lineTo(-60, 3);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();
      // Comet head
      ctx.fillStyle = "#aaddff";
      ctx.beginPath();
      ctx.arc(5, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(8, -3, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "blackhole":
      // Black hole effect
      const bhGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, obs.width / 2);
      bhGradient.addColorStop(0, "#000000");
      bhGradient.addColorStop(0.5, "#200030");
      bhGradient.addColorStop(1, "transparent");
      ctx.fillStyle = bhGradient;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Accretion disk
      ctx.strokeStyle = "rgba(255, 100, 50, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2 + 5, 8, obs.rotation * 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "satellite":
      // Satellite body
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(-8, -6, 16, 12);
      // Solar panels
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(-30, -4, 20, 8);
      ctx.fillRect(10, -4, 20, 8);
      // Panel lines
      ctx.strokeStyle = "#2255aa";
      ctx.lineWidth = 1;
      for (let i = -28; i < -10; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -4);
        ctx.lineTo(i, 4);
        ctx.stroke();
      }
      for (let i = 12; i < 30; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -4);
        ctx.lineTo(i, 4);
        ctx.stroke();
      }
      // Antenna
      ctx.strokeStyle = "#808080";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -15);
      ctx.stroke();
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(0, -15, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  const rotate = Date.now() * 0.002;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "stardust":
      // Sparkling star
      ctx.fillStyle = "#ffff66";
      drawStar(0, 0, 5, 12, 6);
      // Glow
      ctx.fillStyle = "rgba(255, 255, 100, 0.3)";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "nebula":
      // Colorful nebula orb
      const nebulaGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
      nebulaGrad.addColorStop(0, "#ff66ff");
      nebulaGrad.addColorStop(0.5, "#6666ff");
      nebulaGrad.addColorStop(1, "transparent");
      ctx.fillStyle = nebulaGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Swirl
      ctx.strokeStyle = "rgba(255, 200, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, rotate, rotate + Math.PI);
      ctx.stroke();
      break;
    case "warp":
      // Warp drive orb
      ctx.strokeStyle = "#aa66ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      // Inner rings
      ctx.strokeStyle = "rgba(150, 100, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, rotate, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, rotate + Math.PI / 2, 0, Math.PI * 2);
      ctx.stroke();
      // Core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  stardustDisplay.textContent = state.stardust.toString();
  speedDisplay.textContent = state.speed.toFixed(1);
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.stardust")}</div><div class="stat-value">${state.stardust}</div></div>
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
