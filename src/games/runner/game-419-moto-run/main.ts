import { MotoRunGame } from './game';
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

let game: MotoRunGame | null = null;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

function initGame(): void {
  initI18n();
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  // Set canvas size
  canvas.width = 800;
  canvas.height = 600;

  // Update UI
  updateUI();

  // Event listeners
  document.getElementById('startBtn')?.addEventListener('click', startGame);
  document.getElementById('pauseBtn')?.addEventListener('click', togglePause);
  document.getElementById('restartBtn')?.addEventListener('click', restartGame);

  // Keyboard controls
  document.addEventListener('keydown', handleKeyDown);

  // Show start screen
  drawStartScreen();
}

function updateUI(): void {
  const elements = {
    'game-title': t('game.title'),
    'startBtn': t('game.start'),
    'pauseBtn': t('game.pause'),
    'restartBtn': t('game.restart'),
    'controlsTitle': t('game.controls'),
    'controlsDesc': t('game.controlsDesc'),
    'tipText': t('game.tip')
  };

  Object.entries(elements).forEach(([id, text]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  });
}

function startGame(): void {
  if (!game) {
    game = new MotoRunGame(canvas);
  }
  game.start();

  document.getElementById('startBtn')!.style.display = 'none';
  document.getElementById('pauseBtn')!.style.display = 'inline-block';
  document.getElementById('restartBtn')!.style.display = 'inline-block';

  gameLoop();
}

function togglePause(): void {
  if (game) {
    game.pause();
    const pauseBtn = document.getElementById('pauseBtn')!;
    const state = game.getState();
    pauseBtn.textContent = state.paused ? t('game.resume') : t('game.pause');
  }
}

function restartGame(): void {
  if (game) {
    game.cleanup();
  }
  game = new MotoRunGame(canvas);
  game.start();

  const pauseBtn = document.getElementById('pauseBtn')!;
  pauseBtn.textContent = t('game.pause');

  gameLoop();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (game) {
    game.handleKeyDown(e.key);
  }
}

function gameLoop(): void {
  if (!game) return;

  const state = game.getState();

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw game
  drawBackground(state);
  drawRoad(state);
  drawLaneMarkers(state);
  drawObstacles(state);
  drawCollectibles(state);
  drawParticles(state);
  drawPlayer(state);
  drawHUD(state);

  if (state.gameOver) {
    drawGameOver(state);
  }

  if (!state.gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

function drawBackground(state: any): void {
  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
  skyGradient.addColorStop(0, '#34495e');
  skyGradient.addColorStop(1, '#2c3e50');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

  // City buildings (parallax effect)
  const buildingOffset = (state.distance * 0.3) % 200;
  ctx.fillStyle = '#1a252f';

  for (let i = -1; i < 8; i++) {
    const x = i * 120 - buildingOffset;
    const height = 80 + (i % 3) * 40;
    ctx.fillRect(x, canvas.height / 2 - height, 100, height);

    // Windows
    ctx.fillStyle = '#f39c12';
    for (let row = 0; row < Math.floor(height / 20); row++) {
      for (let col = 0; col < 3; col++) {
        if (Math.random() > 0.3) {
          ctx.fillRect(x + 15 + col * 30, canvas.height / 2 - height + 10 + row * 20, 15, 10);
        }
      }
    }
    ctx.fillStyle = '#1a252f';
  }
}

function drawRoad(state: any): void {
  // Road base
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  // Sidewalks
  ctx.fillStyle = '#34495e';
  ctx.fillRect(0, canvas.height / 2, 100, canvas.height / 2);
  ctx.fillRect(canvas.width - 100, canvas.height / 2, 100, canvas.height / 2);

  // Road edge lines
  ctx.strokeStyle = '#ecf0f1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, canvas.height / 2);
  ctx.lineTo(100, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(canvas.width - 100, canvas.height / 2);
  ctx.lineTo(canvas.width - 100, canvas.height);
  ctx.stroke();
}

function drawLaneMarkers(state: any): void {
  const markerOffset = (state.distance * 5) % 60;

  ctx.strokeStyle = '#f39c12';
  ctx.lineWidth = 3;
  ctx.setLineDash([30, 30]);

  // Lane dividers
  for (let i = 0; i < 2; i++) {
    const x = canvas.width / 2 - 60 + i * 120;
    ctx.beginPath();
    ctx.moveTo(x, canvas.height / 2 - markerOffset);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawPlayer(state: any): void {
  const { player } = state;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Wheelie rotation
  if (player.isWheeling > 0) {
    const rotation = Math.sin(player.wheelieTimer * 0.2) * 0.2;
    ctx.rotate(rotation);
  }

  // Motorcycle body
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.ellipse(0, 10, 25, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Motorcycle details
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.ellipse(-5, 0, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Windshield
  ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, -10, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rider helmet
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.arc(0, -25, 18, 0, Math.PI * 2);
  ctx.fill();

  // Helmet visor
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.arc(0, -25, 12, 0, Math.PI);
  ctx.fill();

  // Rider body
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#34495e';
  ctx.beginPath();
  ctx.arc(-15, 30, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15, 30, 10, 0, Math.PI * 2);
  ctx.fill();

  // Wheel rims
  ctx.strokeStyle = '#95a5a6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-15, 30, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(15, 30, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Wheelie effect
  if (player.isWheeling > 0) {
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawObstacles(state: any): void {
  state.obstacles.forEach((obstacle: any) => {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);

    switch (obstacle.type) {
      case 'car':
        drawCar(obstacle);
        break;
      case 'truck':
        drawTruck(obstacle);
        break;
      case 'roadblock':
        drawRoadblock(obstacle);
        break;
      case 'pedestrian':
        drawPedestrian(obstacle);
        break;
    }

    ctx.restore();
  });
}

function drawCar(obstacle: any): void {
  const w = obstacle.width;
  const h = obstacle.height;

  // Car body
  ctx.fillStyle = obstacle.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Car roof
  ctx.fillStyle = obstacle.color;
  ctx.fillRect(-w / 2 + 5, -h / 2, w - 10, h / 3);

  // Windows
  ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
  ctx.fillRect(-w / 2 + 8, -h / 2 + 3, w - 16, h / 3 - 6);

  // Wheels
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(-w / 2 - 3, -h / 2 + 15, 6, 12);
  ctx.fillRect(w / 2 - 3, -h / 2 + 15, 6, 12);
  ctx.fillRect(-w / 2 - 3, h / 2 - 27, 6, 12);
  ctx.fillRect(w / 2 - 3, h / 2 - 27, 6, 12);
}

function drawTruck(obstacle: any): void {
  const w = obstacle.width;
  const h = obstacle.height;

  // Truck container
  ctx.fillStyle = obstacle.color;
  ctx.fillRect(-w / 2, -h / 2, w, h * 0.7);

  // Truck cabin
  ctx.fillStyle = obstacle.color;
  ctx.fillRect(-w / 2, h / 2 - h * 0.35, w, h * 0.35);

  // Window
  ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
  ctx.fillRect(-w / 2 + 5, h / 2 - h * 0.32, w - 10, h * 0.15);

  // Wheels
  ctx.fillStyle = '#2c3e50';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-w / 2 - 3, h / 2 - 12 - i * 30, 6, 12);
    ctx.fillRect(w / 2 - 3, h / 2 - 12 - i * 30, 6, 12);
  }
}

function drawRoadblock(obstacle: any): void {
  const w = obstacle.width;
  const h = obstacle.height;

  // Barrier stripes
  ctx.fillStyle = '#e67e22';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.fillStyle = '#ecf0f1';
  const stripeWidth = 15;
  for (let i = -w / 2; i < w / 2; i += stripeWidth * 2) {
    ctx.fillRect(i, -h / 2, stripeWidth, h);
  }

  // Warning sign
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 10, -h / 2 - 20);
  ctx.lineTo(0, -h / 2 - 40);
  ctx.lineTo(w / 2 - 10, -h / 2 - 20);
  ctx.closePath();
  ctx.stroke();
}

function drawPedestrian(obstacle: any): void {
  const w = obstacle.width;
  const h = obstacle.height;

  // Head
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.arc(0, -h / 2 + 8, 8, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = obstacle.color;
  ctx.fillRect(-w / 2 + 5, -h / 2 + 16, w - 10, h * 0.5);

  // Legs
  ctx.fillRect(-w / 2 + 7, h / 2 - h * 0.4, (w - 14) / 2 - 2, h * 0.4);
  ctx.fillRect(w / 2 - (w - 14) / 2 - 5, h / 2 - h * 0.4, (w - 14) / 2 - 2, h * 0.4);
}

function drawCollectibles(state: any): void {
  state.collectibles.forEach((collectible: any) => {
    ctx.save();
    ctx.translate(collectible.x, collectible.y);

    const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 1;
    ctx.scale(pulse, pulse);

    switch (collectible.type) {
      case 'fuel':
        drawFuelCan();
        break;
      case 'coin':
        drawCoin();
        break;
      case 'helmet':
        drawHelmet();
        break;
    }

    ctx.restore();
  });
}

function drawFuelCan(): void {
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(-12, -12, 24, 24);
  ctx.fillRect(-5, -18, 10, 8);

  ctx.fillStyle = '#27ae60';
  ctx.fillRect(-8, -8, 16, 16);

  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', 0, 0);
}

function drawCoin(): void {
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f39c12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHelmet(): void {
  ctx.fillStyle = '#9b59b6';
  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI, Math.PI * 2);
  ctx.arc(0, 0, 14, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = '#8e44ad';
  ctx.beginPath();
  ctx.arc(0, -2, 10, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(-10, 0, 20, 4);
}

function drawParticles(state: any): void {
  state.particles.forEach((particle: any) => {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  });
}

function drawHUD(state: any): void {
  const { player, score, combo, comboTimer } = state;

  // Score
  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${t('game.score')}: ${score}`, 20, 40);

  // Distance
  ctx.fillText(`${t('game.distance')}: ${Math.floor(state.distance)}m`, 20, 70);

  // Fuel bar
  const barWidth = 200;
  const barHeight = 20;
  const barX = 20;
  const barY = 90;

  ctx.fillStyle = '#34495e';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const fuelPercent = player.fuel / player.maxFuel;
  const fuelColor = fuelPercent > 0.5 ? '#2ecc71' : fuelPercent > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillStyle = fuelColor;
  ctx.fillRect(barX, barY, barWidth * fuelPercent, barHeight);

  ctx.strokeStyle = '#ecf0f1';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = '#ecf0f1';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${t('game.fuel')}: ${Math.floor(player.fuel)}%`, barX + barWidth / 2, barY + 14);

  // Combo
  if (combo > 1 && comboTimer > 0) {
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${t('game.combo')}: ${combo}x`, canvas.width / 2, 40);
  }

  // Wheelie indicator
  if (player.isWheeling > 0) {
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WHEELIE!', canvas.width / 2, 80);
  }
}

function drawGameOver(state: any): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(t('game.gameOver'), canvas.width / 2, canvas.height / 2 - 60);

  ctx.fillStyle = '#ecf0f1';
  ctx.font = '32px Arial';
  ctx.fillText(`${t('game.score')}: ${state.score}`, canvas.width / 2, canvas.height / 2);
  ctx.fillText(`${t('game.distance')}: ${Math.floor(state.distance)}m`, canvas.width / 2, canvas.height / 2 + 40);

  ctx.font = '24px Arial';
  ctx.fillText(t('game.restart'), canvas.width / 2, canvas.height / 2 + 100);
}

function drawStartScreen(): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f39c12';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(t('game.title'), canvas.width / 2, canvas.height / 2 - 40);

  ctx.fillStyle = '#ecf0f1';
  ctx.font = '24px Arial';
  ctx.fillText(t('game.start'), canvas.width / 2, canvas.height / 2 + 40);
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
