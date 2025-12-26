import { ThemeParkRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const ticketsDisplay = document.getElementById("tickets-display")!;
const treatsDisplay = document.getElementById("treats-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: ThemeParkRunGame;
let animationFrame: number | null = null;
let decorations: { x: number; type: string }[] = [];

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
  game = new ThemeParkRunGame();
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
  decorations = [];
  const types = ['ferris', 'coaster', 'tent', 'balloon'];
  for (let i = 0; i < 5; i++) {
    decorations.push({
      x: i * 100 + 30,
      type: types[Math.floor(Math.random() * types.length)],
    });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const slideBtn = document.getElementById("slide-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.slide(); });
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
  const groundY = height - 80;

  // Bright sky background
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#64b5f6');
  skyGradient.addColorStop(0.5, '#90caf9');
  skyGradient.addColorStop(1, '#bbdefb');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(width - 50, 50, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
  ctx.beginPath();
  ctx.arc(width - 50, 50, 45, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  drawCloud(60, 40);
  drawCloud(200, 60);
  drawCloud(350, 35);

  // Background decorations
  const decoSpeed = state.phase === 'playing' ? state.speed * 0.06 : 0.04;
  decorations.forEach(deco => {
    deco.x -= decoSpeed;
    if (deco.x < -80) {
      deco.x = width + 50;
      const types = ['ferris', 'coaster', 'tent', 'balloon'];
      deco.type = types[Math.floor(Math.random() * types.length)];
    }
    drawDecoration(deco.x, 100, deco.type);
  });

  // Colorful path
  ctx.fillStyle = '#f48fb1';
  ctx.fillRect(0, groundY, width, 30);

  // Path stripes
  const colors = ['#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b'];
  for (let i = 0; i < width; i += 25) {
    ctx.fillStyle = colors[(i / 25) % colors.length];
    ctx.fillRect(i, groundY, 15, 30);
  }

  // Grassy area
  ctx.fillStyle = '#81c784';
  ctx.fillRect(0, groundY + 30, width, 50);

  // Lane dividers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Fun meter
  drawFunMeter(state.fun);

  if (state.phase === 'idle') {
    ctx.fillStyle = 'rgba(233, 30, 99, 0.9)';
    ctx.font = '18px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText(i18n.t('game.controls'), width / 2, height / 2 - 20);
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

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawCloud(x: number, y: number): void {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 5, 18, 0, Math.PI * 2);
  ctx.arc(x + 40, y, 15, 0, Math.PI * 2);
  ctx.fill();
}

function drawDecoration(x: number, y: number, type: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.5;

  switch (type) {
    case 'ferris':
      // Ferris wheel
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 40, Math.sin(angle) * 40);
        ctx.stroke();
      }
      break;

    case 'coaster':
      // Roller coaster track
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-30, 20);
      ctx.quadraticCurveTo(-10, -40, 20, -20);
      ctx.quadraticCurveTo(40, 0, 50, 30);
      ctx.stroke();
      break;

    case 'tent':
      // Circus tent
      ctx.fillStyle = '#e91e63';
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(-30, 30);
      ctx.lineTo(30, 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(-15, 30);
      ctx.lineTo(0, 30);
      ctx.closePath();
      ctx.fill();
      break;

    case 'balloon':
      // Floating balloons
      const balloonColors = ['#e91e63', '#2196f3', '#4caf50'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = balloonColors[i];
        ctx.beginPath();
        ctx.ellipse(-10 + i * 10, -20 + i * 5, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10 + i * 10, -10 + i * 5);
        ctx.lineTo(-10 + i * 10, 20);
        ctx.stroke();
      }
      break;
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawFunMeter(fun: number): void {
  const barWidth = 100;
  const barHeight = 14;
  const x = 20;
  const y = 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = fun / 100;
  const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
  gradient.addColorStop(0, '#e91e63');
  gradient.addColorStop(0.5, '#9c27b0');
  gradient.addColorStop(1, '#2196f3');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(fun)}%`, x + barWidth / 2, y + 11);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding kid
    ctx.fillStyle = '#e91e63';
    ctx.fillRect(-14, 4, 28, 10);
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(-4, 4, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const legAngle = player.isJumping ? 0.12 : Math.sin(Date.now() * 0.02) * 0.38;

    // Backpack
    ctx.fillStyle = '#9c27b0';
    ctx.fillRect(-14, -8, 10, 18);

    // Body (t-shirt)
    ctx.fillStyle = '#e91e63';
    ctx.fillRect(-8, -15, 16, 22);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(0, -21, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -25, 7, Math.PI, 0);
    ctx.fill();

    // Happy face
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -22, 1.5, 0, Math.PI * 2);
    ctx.arc(3, -22, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -19, 3, 0, Math.PI);
    ctx.stroke();

    // Shorts
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(-7, 7, 14, 8);

    // Legs
    ctx.strokeStyle = '#f5d6ba';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-3, 15);
    ctx.lineTo(-4 - Math.cos(legAngle) * 6, 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, 15);
    ctx.lineTo(4 + Math.cos(legAngle) * 6, 24);
    ctx.stroke();

    // Sneakers
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(-4 - Math.cos(legAngle) * 6, 26, 4, 0, Math.PI * 2);
    ctx.arc(4 + Math.cos(legAngle) * 6, 26, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case 'trash-bin':
      // Trash bin
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, -obs.height / 2 + 5);
      ctx.lineTo(-obs.width / 2 + 4, obs.height / 2);
      ctx.lineTo(obs.width / 2 - 4, obs.height / 2);
      ctx.lineTo(obs.width / 2, -obs.height / 2 + 5);
      ctx.closePath();
      ctx.fill();
      // Lid
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(-obs.width / 2 - 2, -obs.height / 2, obs.width + 4, 8);
      break;

    case 'food-cart':
      // Cart body
      ctx.fillStyle = '#f44336';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height - 10);
      // Umbrella
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2, 25, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2, 25, Math.PI, Math.PI + 0.5);
      ctx.fill();
      // Wheels
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(-obs.width / 2 + 8, obs.height / 2 - 3, 5, 0, Math.PI * 2);
      ctx.arc(obs.width / 2 - 8, obs.height / 2 - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'mascot':
      // Bear mascot body
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 18, 16, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.beginPath();
      ctx.arc(-12, -obs.height / 2 + 8, 6, 0, Math.PI * 2);
      ctx.arc(12, -obs.height / 2 + 8, 6, 0, Math.PI * 2);
      ctx.fill();
      // Face
      ctx.fillStyle = '#d7ccc8';
      ctx.beginPath();
      ctx.ellipse(0, -obs.height / 2 + 22, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-5, -obs.height / 2 + 16, 3, 0, Math.PI * 2);
      ctx.arc(5, -obs.height / 2 + 16, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'balloon-stand':
      // Stand pole
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(-3, -obs.height / 2 + 20, 6, obs.height - 20);
      // Balloons
      const bColors = ['#e91e63', '#2196f3', '#4caf50', '#ffeb3b', '#9c27b0'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = bColors[i];
        const bx = -12 + (i % 3) * 12;
        const by = -obs.height / 2 + 10 + Math.floor(i / 3) * 15;
        ctx.beginPath();
        ctx.ellipse(bx, by, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'rope-barrier':
      // Poles
      ctx.fillStyle = '#ffc107';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, 8, obs.height);
      ctx.fillRect(obs.width / 2 - 8, -obs.height / 2, 8, obs.height);
      // Pole tops
      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.arc(-obs.width / 2 + 4, -obs.height / 2, 6, 0, Math.PI * 2);
      ctx.arc(obs.width / 2 - 4, -obs.height / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Rope
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2 + 4, -obs.height / 2 + 10);
      ctx.quadraticCurveTo(0, 8, obs.width / 2 - 4, -obs.height / 2 + 10);
      ctx.stroke();
      break;

    case 'sign':
      // Sign board
      ctx.fillStyle = '#9c27b0';
      ctx.fillRect(-obs.width / 2, -10, obs.width, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FUN ZONE →', 0, 4);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.009) * 0.14 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case 'ticket':
      // Arcade ticket
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(-12, -8, 24, 16);
      // Perforations
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // Star
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, -1);
      break;

    case 'cotton-candy':
      // Cotton candy
      ctx.fillStyle = '#e91e63';
      ctx.beginPath();
      ctx.ellipse(0, -5, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f48fb1';
      ctx.beginPath();
      ctx.ellipse(-3, -8, 8, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Stick
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, 8, 4, 12);
      break;

    case 'star':
      // Golden star
      ctx.fillStyle = '#ffc107';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 12 : 5;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      // Shine
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(-3, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + 'm';
  ticketsDisplay.textContent = state.tickets.toString();
  treatsDisplay.textContent = state.treats.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameover');
  overlayMsg.textContent = i18n.t('game.finalScore');
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = 'block';
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t('game.distance')}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.tickets')}</div><div class="stat-value">${state.tickets}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.treats')}</div><div class="stat-value">${state.treats}</div></div>
  `;
  statsGrid.style.display = 'grid';
  startBtn.textContent = i18n.t('game.restart');
}

function startGame(): void {
  overlay.style.display = 'none';
  finalScoreDisplay.style.display = 'none';
  statsGrid.style.display = 'none';
  game.start();
}

startBtn.addEventListener('click', startGame);
window.addEventListener('beforeunload', () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
