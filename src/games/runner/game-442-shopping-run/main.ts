import { ShoppingRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const couponsDisplay = document.getElementById("coupons-display")!;
const giftsDisplay = document.getElementById("gifts-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: ShoppingRunGame;
let animationFrame: number | null = null;
let shopSigns: { x: number; text: string; color: string }[] = [];

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
  game = new ShoppingRunGame();
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
  shopSigns = [];
  const shops = ['SALE', 'SHOP', '50%', 'NEW', 'HOT'];
  const colors = ['#e91e63', '#9c27b0', '#3f51b5', '#00bcd4', '#ff9800'];
  for (let i = 0; i < 5; i++) {
    shopSigns.push({
      x: i * 100 + 20,
      text: shops[i],
      color: colors[i],
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

  // Mall interior background
  ctx.fillStyle = '#fce4ec';
  ctx.fillRect(0, 0, width, height);

  // Ceiling with lights
  ctx.fillStyle = '#f8bbd9';
  ctx.fillRect(0, 0, width, 35);

  // Ceiling lights
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(60 + i * 110, 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(60 + i * 110, 20, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shop signs on walls
  const signSpeed = state.phase === 'playing' ? state.speed * 0.12 : 0.08;
  shopSigns.forEach(sign => {
    sign.x -= signSpeed;
    if (sign.x < -80) {
      sign.x = width + 20;
      const shops = ['SALE', 'SHOP', '50%', 'NEW', 'HOT', 'BUY'];
      sign.text = shops[Math.floor(Math.random() * shops.length)];
    }
    drawShopSign(sign.x, 55, sign.text, sign.color);
  });

  // Store fronts
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(i * 160 + 20, 100, 120, 140);
    ctx.strokeStyle = '#e91e63';
    ctx.lineWidth = 2;
    ctx.strokeRect(i * 160 + 20, 100, 120, 140);
  }

  // Floor - marble tiles
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, groundY, width, 30);

  // Tile pattern
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 45) {
    ctx.beginPath();
    ctx.moveTo(i, groundY);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  // Baseboard
  ctx.fillStyle = '#e91e63';
  ctx.fillRect(0, groundY + 30, width, 50);

  // Lane dividers
  ctx.strokeStyle = 'rgba(233, 30, 99, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Budget meter
  drawBudgetMeter(state.budget);

  if (state.phase === 'idle') {
    ctx.fillStyle = 'rgba(233, 30, 99, 0.9)';
    ctx.font = '18px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText(i18n.t('game.controls'), width / 2, height / 2);
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

function drawShopSign(x: number, y: number, text: string, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 70, 25);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + 35, y + 17);
}

function drawBudgetMeter(budget: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = budget / 100;
  const color = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = '#e91e63';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`$${Math.floor(budget)}`, x + barWidth / 2, y + 10);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding shopper
    ctx.fillStyle = '#e91e63';
    ctx.fillRect(-15, 3, 30, 12);
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(-5, 3, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const legAngle = player.isJumping ? 0.12 : Math.sin(Date.now() * 0.019) * 0.38;

    // Shopping bags
    ctx.fillStyle = '#e91e63';
    ctx.fillRect(-16, -5, 10, 18);
    ctx.fillRect(6, -5, 10, 18);

    // Body (dress/outfit)
    ctx.fillStyle = '#9c27b0';
    ctx.fillRect(-9, -18, 18, 26);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(0, -24, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -28, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-8, -28, 16, 6);

    // Sunglasses
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, -26, 6, 4);
    ctx.fillRect(2, -26, 6, 4);

    // Legs
    ctx.strokeStyle = '#f5d6ba';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-5 - Math.cos(legAngle) * 7, 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(5 + Math.cos(legAngle) * 7, 24);
    ctx.stroke();

    // High heels
    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.arc(-5 - Math.cos(legAngle) * 7, 26, 4, 0, Math.PI * 2);
    ctx.arc(5 + Math.cos(legAngle) * 7, 26, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case 'shopping-cart':
      // Cart body
      ctx.fillStyle = '#78909c';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width - 10, obs.height - 8);
      // Handle
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(obs.width / 2 - 10, -obs.height / 2);
      ctx.lineTo(obs.width / 2, -obs.height / 2 - 15);
      ctx.stroke();
      // Wheels
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.arc(-obs.width / 2 + 8, obs.height / 2 - 3, 5, 0, Math.PI * 2);
      ctx.arc(obs.width / 2 - 18, obs.height / 2 - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'display-stand':
      // Stand
      ctx.fillStyle = '#fff';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Products on display
      ctx.fillStyle = '#e91e63';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-obs.width / 2 + 8 + i * 14, -obs.height / 2 + 8, 10, 15);
      }
      // "NEW" sign
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(-15, -obs.height / 2 - 12, 30, 14);
      ctx.fillStyle = '#fff';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEW', 0, -obs.height / 2 - 2);
      break;

    case 'security':
      // Body
      ctx.fillStyle = '#1a237e';
      ctx.fillRect(-12, -obs.height / 2 + 18, 24, 35);
      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Cap
      ctx.fillStyle = '#1a237e';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 5, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-12, -obs.height / 2 + 5, 24, 5);
      break;

    case 'wet-floor':
      // Sign base
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(-obs.width / 2, obs.height / 2);
      ctx.lineTo(obs.width / 2, obs.height / 2);
      ctx.closePath();
      ctx.fill();
      // Warning icon
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, 5);
      // Person slipping icon
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -5, 4, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'bench':
      // Seat
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 8);
      // Legs
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 8, 6, obs.height - 8);
      ctx.fillRect(obs.width / 2 - 11, -obs.height / 2 + 8, 6, obs.height - 8);
      break;

    case 'banner':
      // Banner
      ctx.fillStyle = '#e91e63';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SALE 50%', 0, 3);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.008) * 0.14 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case 'coupon':
      // Coupon ticket
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(-14, -8, 28, 16);
      // Dashed line
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // Percent symbol
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('%', 0, -1);
      break;

    case 'gift-box':
      // Box
      ctx.fillStyle = '#e91e63';
      ctx.fillRect(-10, -5, 20, 18);
      // Lid
      ctx.fillStyle = '#c2185b';
      ctx.fillRect(-12, -10, 24, 8);
      // Ribbon
      ctx.fillStyle = '#ffc107';
      ctx.fillRect(-2, -10, 4, 23);
      ctx.fillRect(-10, -2, 20, 4);
      // Bow
      ctx.beginPath();
      ctx.arc(-4, -10, 4, 0, Math.PI * 2);
      ctx.arc(4, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'sale-tag':
      // Tag shape
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(10, -10);
      ctx.lineTo(10, 8);
      ctx.lineTo(0, 14);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      // Hole
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -5, 3, 0, Math.PI * 2);
      ctx.fill();
      // Text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 6);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + 'm';
  couponsDisplay.textContent = state.coupons.toString();
  giftsDisplay.textContent = state.gifts.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameover');
  overlayMsg.textContent = i18n.t('game.finalScore');
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = 'block';
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t('game.distance')}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.coupons')}</div><div class="stat-value">${state.coupons}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.gifts')}</div><div class="stat-value">${state.gifts}</div></div>
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
