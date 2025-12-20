import { PirateEscapeGame, type GameState } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => i18n.loadTranslations(locale as Locale, trans));
  const browserLang = navigator.language;
  if (browserLang.includes('zh')) i18n.setLocale('zh-TW');
  else if (browserLang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');
}

const t = (key: string) => i18n.t(key);

let game: PirateEscapeGame;
let animationId: number;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
const startScreen = document.getElementById('startScreen') as HTMLDivElement;
const gameOverScreen = document.getElementById('gameOverScreen') as HTMLDivElement;
const scoreElement = document.getElementById('score') as HTMLSpanElement;
const distanceElement = document.getElementById('distance') as HTMLSpanElement;
const coinsElement = document.getElementById('coins') as HTMLSpanElement;
const finalScoreElement = document.getElementById('finalScore') as HTMLSpanElement;

// Mobile controls
const leftBtn = document.getElementById('leftBtn') as HTMLButtonElement;
const rightBtn = document.getElementById('rightBtn') as HTMLButtonElement;
const jumpBtn = document.getElementById('jumpBtn') as HTMLButtonElement;

initI18n();

// Update UI text
document.getElementById('gameTitle')!.textContent = t('game.title');
document.getElementById('gameDesc')!.textContent = t('game.desc');
startBtn.textContent = t('game.start');
restartBtn.textContent = t('game.restart');
document.getElementById('scoreLabel')!.textContent = t('game.score') + ':';
document.getElementById('distanceLabel')!.textContent = t('game.distance') + ':';
document.getElementById('coinsLabel')!.textContent = t('game.coins') + ':';
document.getElementById('gameOverTitle')!.textContent = t('game.gameover');
document.getElementById('finalScoreLabel')!.textContent = t('game.finalScore') + ':';
document.getElementById('controls')!.textContent = t('game.controls');

function init(): void {
  game = new PirateEscapeGame(canvas);
}

function startGame(): void {
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  game.start();
  gameLoop();
}

function gameLoop(): void {
  game.update();
  render(game.getState());

  const state = game.getState();
  scoreElement.textContent = state.score.toString();
  distanceElement.textContent = Math.floor(state.distance).toString();
  coinsElement.textContent = state.coins.toString();

  if (state.gameOver) {
    finalScoreElement.textContent = state.score.toString();
    gameOverScreen.style.display = 'flex';
    cancelAnimationFrame(animationId);
  } else {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function render(state: GameState): void {
  // Clear canvas
  ctx.fillStyle = '#1a3a5c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw ocean background
  drawOcean(state);

  // Draw ship deck
  drawShipDeck();

  // Draw lane markers
  drawLaneMarkers();

  // Draw collectibles
  state.collectibles.forEach(collectible => {
    if (!collectible.collected) {
      drawCollectible(collectible);
    }
  });

  // Draw obstacles
  state.obstacles.forEach(obstacle => {
    drawObstacle(obstacle);
  });

  // Draw player
  drawPlayer(state.player);

  // Draw particles
  state.particles.forEach(particle => {
    drawParticle(particle);
  });
}

function drawOcean(state: GameState): void {
  // Draw waves in background
  const waveHeight = 15;

  // First wave layer
  ctx.fillStyle = '#2980b9';
  ctx.beginPath();
  ctx.moveTo(0, 500);
  for (let x = 0; x < canvas.width; x += 20) {
    const y = 480 + Math.sin((x + state.wave1Offset) * 0.02) * waveHeight;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, 500);
  ctx.fill();

  // Second wave layer
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.moveTo(0, 500);
  for (let x = 0; x < canvas.width; x += 20) {
    const y = 490 + Math.sin((x + state.wave2Offset) * 0.03) * waveHeight * 0.8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, 500);
  ctx.fill();
}

function drawShipDeck(): void {
  // Main deck
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(0, 400, canvas.width, 100);

  // Wood planks
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 2;
  for (let y = 400; y < 500; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Vertical planks
  for (let x = 0; x < canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 400);
    ctx.lineTo(x, 500);
    ctx.stroke();
  }
}

function drawLaneMarkers(): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  for (let i = 0; i < 3; i++) {
    const x = 150 + i * 100;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawPlayer(player: any): void {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

  // Pirate body
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(-20, -10, 40, 35);

  // Legs (animation)
  const legOffset = Math.sin(player.frame * Math.PI / 2) * 5;
  ctx.fillStyle = '#34495e';
  ctx.fillRect(-15, 25, 12, 20);
  ctx.fillRect(3, 25 + legOffset, 12, 20 - legOffset);

  // Boots
  ctx.fillStyle = '#000000';
  ctx.fillRect(-15, 43, 12, 5);
  ctx.fillRect(3, 43 + legOffset, 12, 5);

  // Head
  ctx.fillStyle = '#f4a460';
  ctx.beginPath();
  ctx.arc(0, -20, 15, 0, Math.PI * 2);
  ctx.fill();

  // Bandana
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(0, -25, 15, Math.PI, Math.PI * 2);
  ctx.fill();

  // Bandana knot
  ctx.fillRect(10, -25, 8, 6);

  // Eye patch
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-5, -20, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eye patch strap
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -20, 14, 0, Math.PI);
  ctx.stroke();

  // Other eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(6, -20, 2, 0, Math.PI * 2);
  ctx.fill();

  // Beard
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(10, -5);
  ctx.lineTo(8, -12);
  ctx.fill();

  // Sword
  ctx.fillStyle = '#95a5a6';
  ctx.fillRect(15, -5, 15, 3);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(15, -8, 5, 9);

  // Arm holding sword
  ctx.fillStyle = '#f4a460';
  ctx.fillRect(10, 0, 8, 15);

  ctx.restore();
}

function drawObstacle(obstacle: any): void {
  const x = 150 + obstacle.lane * 100 - obstacle.width / 2;

  ctx.save();

  switch (obstacle.type) {
    case 'barrel':
      // Wooden barrel
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x, obstacle.y, obstacle.width, obstacle.height);

      // Barrel bands
      ctx.fillStyle = '#654321';
      ctx.fillRect(x, obstacle.y + 10, obstacle.width, 5);
      ctx.fillRect(x, obstacle.y + 35, obstacle.width, 5);

      // Barrel top
      ctx.fillStyle = '#a0522d';
      ctx.beginPath();
      ctx.ellipse(x + obstacle.width / 2, obstacle.y + 5, obstacle.width / 2, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'cannon':
      // Cannon base
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x, obstacle.y + 25, obstacle.width, 20);

      // Cannon barrel
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x + 10, obstacle.y, obstacle.width - 20, 30);

      // Cannon wheels
      ctx.fillStyle = '#654321';
      ctx.beginPath();
      ctx.arc(x + 15, obstacle.y + 45, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + obstacle.width - 15, obstacle.y + 45, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'rope':
      // Hanging rope
      ctx.strokeStyle = '#d2691e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + obstacle.width / 2, 0);
      ctx.lineTo(x + obstacle.width / 2, obstacle.y + obstacle.height);
      ctx.stroke();

      // Knots
      ctx.fillStyle = '#8b4513';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + obstacle.width / 2, 50 + i * 30, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'mast':
      // Ship mast
      ctx.fillStyle = '#654321';
      ctx.fillRect(x, obstacle.y, obstacle.width, obstacle.height);

      // Mast details
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x + 5, obstacle.y, obstacle.width - 10, obstacle.height);

      // Cross beam
      ctx.fillStyle = '#654321';
      ctx.fillRect(x - 20, obstacle.y + 30, obstacle.width + 40, 10);
      break;

    case 'enemy':
      // Enemy pirate
      ctx.translate(x + obstacle.width / 2, obstacle.y + obstacle.height / 2);

      // Body
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(-20, -10, 40, 35);

      // Legs
      ctx.fillStyle = '#229954';
      ctx.fillRect(-15, 25, 12, 20);
      ctx.fillRect(3, 25, 12, 20);

      // Head
      ctx.fillStyle = '#f4a460';
      ctx.beginPath();
      ctx.arc(0, -20, 15, 0, Math.PI * 2);
      ctx.fill();

      // Hat
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(-20, -25);
      ctx.lineTo(-15, -35);
      ctx.lineTo(15, -35);
      ctx.lineTo(20, -25);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5, -20, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -20, 2, 0, Math.PI * 2);
      ctx.fill();

      // Sword (animation)
      if (obstacle.frame === 1) {
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(15, -15, 15, 3);
      }
      break;
  }

  ctx.restore();
}

function drawCollectible(collectible: any): void {
  const x = 150 + collectible.lane * 100 - collectible.width / 2;

  ctx.save();
  ctx.translate(x + collectible.width / 2, collectible.y + collectible.height / 2);

  switch (collectible.type) {
    case 'coin':
      // Gold coin
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Coin details
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      break;

    case 'map':
      // Treasure map
      ctx.fillStyle = '#f4e4c1';
      ctx.fillRect(-12, -12, 24, 24);

      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);

      // X marks the spot
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();
      break;

    case 'rum':
      // Rum bottle
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(-8, -12, 16, 24);

      // Bottle neck
      ctx.fillStyle = '#654321';
      ctx.fillRect(-5, -16, 10, 8);

      // Cork
      ctx.fillStyle = '#d2691e';
      ctx.fillRect(-4, -18, 8, 4);

      // Label
      ctx.fillStyle = '#f4e4c1';
      ctx.fillRect(-6, -4, 12, 8);

      // Skull on label
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawParticle(particle: any): void {
  ctx.save();

  const alpha = particle.life / particle.maxLife;

  switch (particle.type) {
    case 'splash':
      ctx.fillStyle = `rgba(52, 152, 219, ${alpha})`;
      break;
    case 'sparkle':
      ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
      break;
    case 'wood':
      ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
      break;
  }

  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  if (game) {
    game.handleKeyDown(e.key);
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
  }
});

// Mobile controls
leftBtn.addEventListener('click', () => game?.moveLeft());
rightBtn.addEventListener('click', () => game?.moveRight());
jumpBtn.addEventListener('click', () => game?.jump());

// Touch events for better mobile experience
leftBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  game?.moveLeft();
});

rightBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  game?.moveRight();
});

jumpBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  game?.jump();
});

// Initialize game
init();
