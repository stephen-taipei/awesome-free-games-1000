import { WaterRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const shellsDisplay = document.getElementById("shells-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: WaterRunGame;
let animationFrame: number | null = null;
let waves: { x: number; y: number; offset: number; speed: number }[] = [];
let clouds: { x: number; y: number; size: number; speed: number }[] = [];

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
  initBackground();
  game = new WaterRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initBackground(): void {
  waves = [];
  for (let i = 0; i < 5; i++) {
    waves.push({
      x: i * 100,
      y: 320 + Math.random() * 20,
      offset: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
    });
  }
  clouds = [];
  for (let i = 0; i < 4; i++) {
    clouds.push({
      x: Math.random() * 450,
      y: 30 + Math.random() * 80,
      size: 30 + Math.random() * 20,
      speed: 0.3 + Math.random() * 0.4,
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

  // Sky gradient - tropical blue
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(0.5, '#6bb6d6');
  gradient.addColorStop(1, '#4a9fb8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(380, 60, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
  ctx.beginPath();
  ctx.arc(380, 60, 55, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  const speed = state.phase === "playing" ? state.speed : 1;
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * speed * 0.05;
    if (cloud.x < -cloud.size) { cloud.x = width + cloud.size; cloud.y = 30 + Math.random() * 80; }
    drawCloud(cloud.x, cloud.y, cloud.size);
  });

  // Distant islands
  ctx.fillStyle = '#2d5016';
  ctx.beginPath();
  ctx.ellipse(100, 200, 60, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a7c23';
  ctx.beginPath();
  ctx.moveTo(100, 180);
  ctx.lineTo(85, 200);
  ctx.lineTo(115, 200);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2d5016';
  ctx.beginPath();
  ctx.ellipse(350, 190, 50, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a7c23';
  ctx.beginPath();
  ctx.moveTo(350, 170);
  ctx.lineTo(338, 190);
  ctx.lineTo(362, 190);
  ctx.closePath();
  ctx.fill();

  // Water surface
  const groundY = height - 80;
  ctx.fillStyle = '#0077be';
  ctx.fillRect(0, groundY + 25, width, 60);

  // Water waves animation
  const waveGradient = ctx.createLinearGradient(0, groundY, 0, height);
  waveGradient.addColorStop(0, 'rgba(26, 188, 156, 0.3)');
  waveGradient.addColorStop(1, 'rgba(0, 119, 190, 0.5)');
  ctx.fillStyle = waveGradient;
  ctx.fillRect(0, groundY, width, 85);

  // Animated waves
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  waves.forEach(wave => {
    wave.offset += 0.05;
    ctx.beginPath();
    for (let x = 0; x < width; x += 5) {
      const y = groundY + 10 + Math.sin((x + wave.offset * 20) * 0.02) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Lane lines (subtle)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles (water splashes)
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

function drawCloud(x: number, y: number, size: number): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.3, y + size * 0.15, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shield effect
  if (state.hasShield) {
    const shieldGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
    shieldGradient.addColorStop(0, 'rgba(26, 188, 156, 0.3)');
    shieldGradient.addColorStop(1, 'rgba(26, 188, 156, 0)');
    ctx.fillStyle = shieldGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1abc9c";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Surfer body
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(-8, -20, 16, 25);

  // Head
  ctx.fillStyle = '#ffd1a3';
  ctx.beginPath();
  ctx.arc(0, -28, 8, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#8b4513';
  ctx.beginPath();
  ctx.arc(-3, -32, 6, 0, Math.PI * 2);
  ctx.arc(3, -32, 6, 0, Math.PI * 2);
  ctx.fill();

  // Surfboard
  ctx.save();
  if (player.isJumping) {
    ctx.rotate(-0.3);
  }
  ctx.fillStyle = '#00bcd4';
  ctx.fillRect(-18, 0, 36, 8);
  ctx.fillStyle = '#0097a7';
  ctx.fillRect(-18, 0, 36, 3);
  // Surfboard stripe
  ctx.fillStyle = '#ffeb3b';
  ctx.fillRect(-10, 2, 20, 4);
  ctx.restore();

  // Arms
  ctx.strokeStyle = '#ffd1a3';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-15, player.isJumping ? -5 : 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -12);
  ctx.lineTo(15, player.isJumping ? -5 : 0);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "wave":
      // Large wave
      ctx.fillStyle = '#1abc9c';
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, obs.height / 2);
      for (let i = 0; i <= 10; i++) {
        const x = -obs.width / 2 + (obs.width * i) / 10;
        const y = obs.height / 2 - Math.abs(Math.sin((i / 10) * Math.PI)) * obs.height;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(obs.width / 2, obs.height / 2);
      ctx.closePath();
      ctx.fill();
      // Wave foam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 3, 8, 0, Math.PI * 2);
      ctx.arc(-10, -obs.height / 4, 6, 0, Math.PI * 2);
      ctx.arc(10, -obs.height / 4, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "shark":
      // Shark fin
      ctx.fillStyle = '#546e7a';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -20);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      // Shark body (partially submerged)
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.ellipse(0, 10, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "rock":
      // Coral rock
      ctx.fillStyle = '#78909c';
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(obs.width / 2, obs.height / 2);
      ctx.lineTo(-obs.width / 2, obs.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath();
      ctx.arc(-5, -5, 5, 0, Math.PI * 2);
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "whirlpool":
      // Whirlpool spiral
      const time = Date.now() * 0.005;
      ctx.strokeStyle = '#0277bd';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.2) {
          const r = (a / (Math.PI * 2)) * (obs.width / 2);
          const x = Math.cos(a + time + i * 2) * r;
          const y = Math.sin(a + time + i * 2) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Center
      ctx.fillStyle = '#01579b';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "shell":
      // Seashell
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 8, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
        ctx.stroke();
      }
      break;
    case "pearl":
      // Pearl with shine
      const pearlGradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, 12);
      pearlGradient.addColorStop(0, '#ffffff');
      pearlGradient.addColorStop(0.3, '#f8bbd0');
      pearlGradient.addColorStop(1, '#e0bbe4');
      ctx.fillStyle = pearlGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Shine spot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(-4, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "chest":
      // Treasure chest
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(-12, -8, 24, 6);
      // Lock
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-3, 0, 6, 5);
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  shellsDisplay.textContent = state.shells.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.shells")}</div><div class="stat-value">${state.shells}</div></div>
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
