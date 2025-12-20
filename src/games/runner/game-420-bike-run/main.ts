import { BikeRunGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

function initSharedI18n() {
  Object.entries(translations).forEach(([locale, trans]) => i18n.loadTranslations(locale as Locale, trans));
  const browserLang = navigator.language;
  if (browserLang.includes('zh')) i18n.setLocale('zh-TW');
  else if (browserLang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');
}

class BikeRunRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: BikeRunGame;
  private animationId: number | null = null;
  private readonly LANE_WIDTH = 120;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.game = new BikeRunGame();

    this.setupCanvas();
    this.setupEventListeners();
    this.updateUI();
  }

  private setupCanvas(): void {
    this.canvas.width = 500;
    this.canvas.height = 600;
  }

  private setupEventListeners(): void {
    document.getElementById('startButton')?.addEventListener('click', () => {
      this.start();
    });

    document.getElementById('restartButton')?.addEventListener('click', () => {
      this.start();
    });

    document.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'w', 'W', 'a', 'A', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
        this.game.handleKeyDown(e.key);
      }
    });

    // Touch controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 30) {
          this.game.moveRight();
        } else if (deltaX < -30) {
          this.game.moveLeft();
        }
      } else if (deltaY < -30) {
        this.game.jump();
      }
    });
  }

  private start(): void {
    this.game.start();
    document.getElementById('menu')!.style.display = 'none';
    document.getElementById('gameOver')!.style.display = 'none';
    this.gameLoop();
  }

  private gameLoop = (): void => {
    this.game.update();
    this.render();
    this.updateUI();

    const state = this.game.getState();
    if (state.gameOver) {
      this.showGameOver();
      return;
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private render(): void {
    const state = this.game.getState();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground();

    // Draw trail lanes
    this.drawTrailLanes();

    // Draw collectibles
    this.drawCollectibles(state);

    // Draw obstacles
    this.drawObstacles(state);

    // Draw player
    this.drawPlayer(state);

    // Draw particles
    this.drawParticles(state);
  }

  private drawBackground(): void {
    // Sky gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, 300);
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(1, '#b8e6f5');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, 300);

    // Trees in background (parallax effect)
    const state = this.game.getState();
    const offset = (state.distance * 0.3) % 100;

    this.ctx.fillStyle = '#2d5016';
    for (let i = -1; i < 6; i++) {
      const x = i * 100 + offset;
      // Left side trees
      this.drawTree(50, 150 + x, 40);
      // Right side trees
      this.drawTree(450, 180 + x, 35);
    }

    // Ground/grass
    const grassGradient = this.ctx.createLinearGradient(0, 300, 0, 600);
    grassGradient.addColorStop(0, '#4a7c3b');
    grassGradient.addColorStop(1, '#3a6c2b');
    this.ctx.fillStyle = grassGradient;
    this.ctx.fillRect(0, 300, this.canvas.width, 300);
  }

  private drawTree(x: number, y: number, size: number): void {
    // Trunk
    this.ctx.fillStyle = '#5c4033';
    this.ctx.fillRect(x - size * 0.15, y, size * 0.3, size * 0.8);

    // Foliage (triangle)
    this.ctx.fillStyle = '#2d5016';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size * 0.5);
    this.ctx.lineTo(x - size * 0.5, y + size * 0.3);
    this.ctx.lineTo(x + size * 0.5, y + size * 0.3);
    this.ctx.closePath();
    this.ctx.fill();

    // Second layer
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size * 0.2);
    this.ctx.lineTo(x - size * 0.6, y + size * 0.6);
    this.ctx.lineTo(x + size * 0.6, y + size * 0.6);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawTrailLanes(): void {
    const centerX = 250;

    // Draw path base
    this.ctx.fillStyle = '#8b7355';
    this.ctx.fillRect(centerX - 200, 0, 400, this.canvas.height);

    // Draw lane dividers (dashed lines)
    this.ctx.strokeStyle = '#6b5545';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([20, 15]);

    for (let i = 1; i < 3; i++) {
      const x = centerX + (i - 1.5) * this.LANE_WIDTH;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);

    // Draw path edges
    this.ctx.strokeStyle = '#5c4033';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 200, 0);
    this.ctx.lineTo(centerX - 200, this.canvas.height);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(centerX + 200, 0);
    this.ctx.lineTo(centerX + 200, this.canvas.height);
    this.ctx.stroke();
  }

  private getLaneX(lane: number): number {
    const centerX = 250;
    return centerX + (lane - 1) * this.LANE_WIDTH;
  }

  private drawPlayer(state: any): void {
    const x = this.getLaneX(state.player.lane);
    const y = state.player.y;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(state.player.leanAngle * Math.PI / 180);

    // Bicycle frame
    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';

    // Main triangle frame
    this.ctx.beginPath();
    this.ctx.moveTo(-15, 0);
    this.ctx.lineTo(10, 0);
    this.ctx.lineTo(0, -20);
    this.ctx.closePath();
    this.ctx.stroke();

    // Seat post
    this.ctx.beginPath();
    this.ctx.moveTo(-15, 0);
    this.ctx.lineTo(-15, -25);
    this.ctx.stroke();

    // Handle bar post
    this.ctx.beginPath();
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(10, -25);
    this.ctx.stroke();

    // Wheels
    const wheelRotation = state.player.wheelRotation;

    // Back wheel
    this.drawWheel(-20, 10, 12, wheelRotation);

    // Front wheel
    this.drawWheel(20, 10, 12, wheelRotation);

    // Cyclist body
    // Legs
    this.ctx.strokeStyle = '#3498db';
    this.ctx.lineWidth = 5;
    const legAngle = Math.sin(wheelRotation * 2) * 30;

    // Left leg
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -20);
    this.ctx.lineTo(-10 + Math.sin(legAngle * Math.PI / 180) * 15, 0);
    this.ctx.stroke();

    // Right leg
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -20);
    this.ctx.lineTo(-10 - Math.sin(legAngle * Math.PI / 180) * 15, 0);
    this.ctx.stroke();

    // Body
    this.ctx.fillStyle = '#e67e22';
    this.ctx.fillRect(-15, -35, 10, 15);

    // Arms
    this.ctx.strokeStyle = '#e67e22';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -30);
    this.ctx.lineTo(8, -23);
    this.ctx.stroke();

    // Head
    this.ctx.fillStyle = '#f39c6b';
    this.ctx.beginPath();
    this.ctx.arc(-10, -42, 7, 0, Math.PI * 2);
    this.ctx.fill();

    // Helmet
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.beginPath();
    this.ctx.arc(-10, -44, 8, Math.PI, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawWheel(x: number, y: number, radius: number, rotation: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);

    // Tire
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Spokes
    this.ctx.strokeStyle = '#7f8c8d';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      this.ctx.stroke();
    }

    // Hub
    this.ctx.fillStyle = '#34495e';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawObstacles(state: any): void {
    for (const obstacle of state.obstacles) {
      const x = this.getLaneX(obstacle.lane);
      const y = obstacle.y;

      this.ctx.save();
      this.ctx.translate(x, y);

      switch (obstacle.type) {
        case 'rock':
          this.drawRock(0, 0, obstacle.width, obstacle.height);
          break;
        case 'log':
          this.drawLog(0, 0, obstacle.width, obstacle.height);
          break;
        case 'puddle':
          this.drawPuddle(0, 0, obstacle.width, obstacle.height);
          break;
        case 'hiker':
          this.drawHiker(0, 0);
          break;
      }

      this.ctx.restore();
    }
  }

  private drawRock(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = '#7f8c8d';
    this.ctx.strokeStyle = '#5a6266';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Highlights
    this.ctx.fillStyle = '#95a5a6';
    this.ctx.beginPath();
    this.ctx.ellipse(x - 10, y - 8, 8, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawLog(x: number, y: number, width: number, height: number): void {
    // Log body
    this.ctx.fillStyle = '#8b6f47';
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);

    // Wood texture
    this.ctx.strokeStyle = '#6b5c3e';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ringX = x - width / 2 + (width * i) / 3;
      this.ctx.beginPath();
      this.ctx.moveTo(ringX, y - height / 2);
      this.ctx.lineTo(ringX, y + height / 2);
      this.ctx.stroke();
    }

    // End cap
    this.ctx.fillStyle = '#9b7f57';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y, 8, height / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#7b6f47';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x + width / 2, y, 5, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawPuddle(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = 'rgba(100, 149, 237, 0.5)';
    this.ctx.strokeStyle = 'rgba(65, 105, 225, 0.7)';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Ripple effect
    this.ctx.strokeStyle = 'rgba(135, 206, 250, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width / 3, height / 3, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawHiker(x: number, y: number): void {
    // Legs
    this.ctx.strokeStyle = '#34495e';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, y);
    this.ctx.lineTo(x - 5, y + 20);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + 5, y);
    this.ctx.lineTo(x + 5, y + 20);
    this.ctx.stroke();

    // Body
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(x - 12, y - 25, 24, 25);

    // Backpack
    this.ctx.fillStyle = '#2ecc71';
    this.ctx.fillRect(x - 15, y - 20, 10, 18);

    // Arms
    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 10, y - 20);
    this.ctx.lineTo(x - 15, y - 5);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + 10, y - 20);
    this.ctx.lineTo(x + 15, y - 5);
    this.ctx.stroke();

    // Head
    this.ctx.fillStyle = '#f39c6b';
    this.ctx.beginPath();
    this.ctx.arc(x, y - 32, 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Hat
    this.ctx.fillStyle = '#f39c12';
    this.ctx.beginPath();
    this.ctx.arc(x, y - 34, 10, Math.PI, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillRect(x - 12, y - 35, 24, 3);
  }

  private drawCollectibles(state: any): void {
    for (const collectible of state.collectibles) {
      if (collectible.collected) continue;

      const x = this.getLaneX(collectible.lane);
      const y = collectible.y;

      this.ctx.save();
      this.ctx.translate(x, y);

      // Floating animation
      const float = Math.sin(Date.now() * 0.005 + collectible.lane) * 5;
      this.ctx.translate(0, float);

      switch (collectible.type) {
        case 'water':
          this.drawWaterBottle(0, 0);
          break;
        case 'energy':
          this.drawEnergyBar(0, 0);
          break;
        case 'medal':
          this.drawMedal(0, 0);
          break;
      }

      this.ctx.restore();
    }
  }

  private drawWaterBottle(x: number, y: number): void {
    // Bottle body
    this.ctx.fillStyle = '#3498db';
    this.ctx.strokeStyle = '#2980b9';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.roundRect(x - 8, y - 15, 16, 25, 3);
    this.ctx.fill();
    this.ctx.stroke();

    // Water inside
    this.ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
    this.ctx.fillRect(x - 6, y - 10, 12, 18);

    // Cap
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(x - 6, y - 18, 12, 4);

    // Shine
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(x - 5, y - 12, 3, 15);
  }

  private drawEnergyBar(x: number, y: number): void {
    // Wrapper
    this.ctx.fillStyle = '#f39c12';
    this.ctx.strokeStyle = '#e67e22';
    this.ctx.lineWidth = 2;

    this.ctx.fillRect(x - 12, y - 8, 24, 16);
    this.ctx.strokeRect(x - 12, y - 8, 24, 16);

    // Text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 8px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('ENERGY', x, y);

    // Torn edge effect
    this.ctx.strokeStyle = '#d68910';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 12, y - 5);
    this.ctx.lineTo(x - 10, y - 3);
    this.ctx.lineTo(x - 8, y - 5);
    this.ctx.stroke();
  }

  private drawMedal(x: number, y: number): void {
    // Ribbon
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 8, y - 15);
    this.ctx.lineTo(x - 5, y);
    this.ctx.lineTo(x - 8, y + 5);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#c0392b';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 8, y - 15);
    this.ctx.lineTo(x + 5, y);
    this.ctx.lineTo(x + 8, y + 5);
    this.ctx.closePath();
    this.ctx.fill();

    // Medal circle
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.strokeStyle = '#f39c12';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y + 5, 12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Star
    this.ctx.fillStyle = '#e67e22';
    this.drawStar(x, y + 5, 5, 7, 3);
  }

  private drawStar(x: number, y: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y - outerRadius);

    for (let i = 0; i < spikes; i++) {
      this.ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
      rot += step;
      this.ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
      rot += step;
    }

    this.ctx.lineTo(x, y - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawParticles(state: any): void {
    for (const particle of state.particles) {
      const alpha = particle.life / particle.maxLife;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rotation);

      switch (particle.type) {
        case 'leaf':
          this.ctx.fillStyle = '#27ae60';
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, particle.size / 2, particle.size, 0, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = '#229954';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -particle.size);
          this.ctx.lineTo(0, particle.size);
          this.ctx.stroke();
          break;

        case 'dust':
          this.ctx.fillStyle = '#bfa888';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'splash':
          this.ctx.fillStyle = '#3498db';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }

      this.ctx.restore();
    }
  }

  private updateUI(): void {
    const state = this.game.getState();

    document.getElementById('score')!.textContent = state.score.toString();
    document.getElementById('distance')!.textContent = Math.floor(state.distance).toString() + 'm';
    document.getElementById('waterBottles')!.textContent = state.waterBottles.toString();
    document.getElementById('energyBars')!.textContent = state.energyBars.toString();
    document.getElementById('medals')!.textContent = state.medals.toString();
  }

  private showGameOver(): void {
    const state = this.game.getState();
    document.getElementById('gameOver')!.style.display = 'block';
    document.getElementById('finalScore')!.textContent = state.score.toString();
  }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initSharedI18n();

  // Update all text elements
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = i18n.t(key);
    }
  });

  new BikeRunRenderer();
});
