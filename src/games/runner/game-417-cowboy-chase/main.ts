import { CowboyChaseGame } from './game';
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

class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: CowboyChaseGame;
  private startButton: HTMLButtonElement;
  private playAgainButton: HTMLButtonElement;
  private pauseButton: HTMLButtonElement;
  private scoreElement: HTMLElement;
  private distanceElement: HTMLElement;
  private highScoreElement: HTMLElement;
  private gameOverScreen: HTMLElement;
  private finalScoreElement: HTMLElement;
  private pauseScreen: HTMLElement;
  private highScore: number = 0;
  private bgOffset: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.game = new CowboyChaseGame(this.canvas);

    this.startButton = document.getElementById('startButton') as HTMLButtonElement;
    this.playAgainButton = document.getElementById('playAgainButton') as HTMLButtonElement;
    this.pauseButton = document.getElementById('pauseButton') as HTMLButtonElement;
    this.scoreElement = document.getElementById('score')!;
    this.distanceElement = document.getElementById('distance')!;
    this.highScoreElement = document.getElementById('highScore')!;
    this.gameOverScreen = document.getElementById('gameOverScreen')!;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.pauseScreen = document.getElementById('pauseScreen')!;

    this.loadHighScore();
    this.setupEventListeners();
    this.render();
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('cowboyChaseHighScore');
    if (saved) {
      this.highScore = parseInt(saved, 10);
      this.highScoreElement.textContent = this.highScore.toString();
    }
  }

  private saveHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
      localStorage.setItem('cowboyChaseHighScore', score.toString());
      this.highScoreElement.textContent = score.toString();
    }
  }

  private setupEventListeners(): void {
    this.startButton.addEventListener('click', () => this.startGame());
    this.playAgainButton.addEventListener('click', () => this.startGame());
    this.pauseButton.addEventListener('click', () => this.togglePause());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
        return;
      }

      this.game.handleKeyDown(e.key);

      // Prevent default for arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });

    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    this.canvas.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 30) {
          this.game.moveRight();
        } else if (dx < -30) {
          this.game.moveLeft();
        }
      } else {
        // Vertical swipe
        if (dy < -30) {
          this.game.jump();
        }
      }
    });
  }

  private startGame(): void {
    this.startButton.style.display = 'none';
    this.gameOverScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.pauseButton.style.display = 'block';
    this.game.start();
  }

  private togglePause(): void {
    const state = this.game.getState();
    if (state.isGameOver) return;

    this.game.pause();
    if (state.isPaused) {
      this.pauseScreen.classList.remove('hidden');
    } else {
      this.pauseScreen.classList.add('hidden');
    }
  }

  private render = (): void => {
    const state = this.game.getState();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground(state);

    // Draw game elements
    this.drawObstacles(state);
    this.drawCollectibles(state);
    this.drawPlayer(state);
    this.drawParticles(state);
    this.drawLaneMarkers();

    // Update UI
    this.scoreElement.textContent = Math.floor(state.score).toString();
    this.distanceElement.textContent = Math.floor(state.distance) + 'm';

    // Check game over
    if (state.isGameOver) {
      this.handleGameOver(state);
    }

    requestAnimationFrame(this.render);
  };

  private drawBackground(state: any): void {
    const { gameSpeed } = state;

    // Sky gradient (sunset)
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#FF6B35');
    gradient.addColorStop(0.4, '#FF8C42');
    gradient.addColorStop(0.7, '#FFA500');
    gradient.addColorStop(1, '#E8B059');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Sun
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(550, 100, 50, 0, Math.PI * 2);
    this.ctx.fill();

    // Sun glow
    const sunGlow = this.ctx.createRadialGradient(550, 100, 50, 550, 100, 100);
    sunGlow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    sunGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    this.ctx.fillStyle = sunGlow;
    this.ctx.fillRect(450, 0, 200, 200);

    // Distant mesas (parallax effect)
    this.bgOffset += gameSpeed * 0.2;
    if (this.bgOffset > this.canvas.width) {
      this.bgOffset = 0;
    }

    this.ctx.fillStyle = '#8B4513';
    for (let i = -1; i < 3; i++) {
      const x = i * 250 - this.bgOffset * 0.5;
      this.drawMesa(x, 250, 150, 100);
      this.drawMesa(x + 120, 280, 120, 80);
    }

    // Ground
    this.ctx.fillStyle = '#D4A574';
    this.ctx.fillRect(0, this.canvas.height - 150, this.canvas.width, 150);

    // Ground details
    this.ctx.fillStyle = '#C89968';
    for (let i = 0; i < 5; i++) {
      const x = (i * 200 - this.bgOffset * 1.5) % this.canvas.width;
      this.ctx.fillRect(x, this.canvas.height - 150, 100, 5);
      this.ctx.fillRect(x + 50, this.canvas.height - 100, 80, 5);
    }
  }

  private drawMesa(x: number, y: number, width: number, height: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + width * 0.1, y - height);
    this.ctx.lineTo(x + width * 0.9, y - height);
    this.ctx.lineTo(x + width, y);
    this.ctx.closePath();
    this.ctx.fill();

    // Mesa shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(x + width * 0.9, y - height);
    this.ctx.lineTo(x + width, y);
    this.ctx.lineTo(x + width * 0.9, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.fillStyle = '#8B4513';
  }

  private drawLaneMarkers(): void {
    this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);

    // Draw lane dividers
    const laneY = 450;
    this.ctx.beginPath();
    this.ctx.moveTo(0, laneY + 80);
    this.ctx.lineTo(this.canvas.width, laneY + 80);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  private drawPlayer(state: any): void {
    const { player } = state;

    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(player.x + 30, 530, 30, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Horse body
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.ellipse(player.x + 30, player.y + 50, 28, 20, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Horse head
    this.ctx.fillStyle = '#A0522D';
    this.ctx.beginPath();
    this.ctx.ellipse(player.x + 50, player.y + 35, 15, 18, 0.3, 0, Math.PI * 2);
    this.ctx.fill();

    // Horse ears
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.moveTo(player.x + 50, player.y + 20);
    this.ctx.lineTo(player.x + 45, player.y + 28);
    this.ctx.lineTo(player.x + 53, player.y + 28);
    this.ctx.closePath();
    this.ctx.fill();

    // Horse legs (animated)
    const legOffset = Math.sin(Date.now() * 0.02) * 5;
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(player.x + 20, player.y + 65);
    this.ctx.lineTo(player.x + 15, player.y + 78 + legOffset);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(player.x + 40, player.y + 65);
    this.ctx.lineTo(player.x + 45, player.y + 78 - legOffset);
    this.ctx.stroke();

    // Cowboy body
    this.ctx.fillStyle = '#4169E1';
    this.ctx.fillRect(player.x + 15, player.y + 25, 20, 25);

    // Cowboy head
    this.ctx.fillStyle = '#FFE0BD';
    this.ctx.beginPath();
    this.ctx.arc(player.x + 25, player.y + 20, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // Cowboy hat
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(player.x + 15, player.y + 8, 20, 8);
    this.ctx.fillRect(player.x + 10, player.y + 14, 30, 4);

    // Cowboy arms
    this.ctx.strokeStyle = '#4169E1';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(player.x + 15, player.y + 30);
    this.ctx.lineTo(player.x + 5, player.y + 40);
    this.ctx.stroke();

    // Lasso (optional detail)
    this.ctx.strokeStyle = '#D2691E';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(player.x + 5, player.y + 40, 8, 0, Math.PI * 1.5);
    this.ctx.stroke();
  }

  private drawObstacles(state: any): void {
    state.obstacles.forEach((obstacle: any) => {
      switch (obstacle.type) {
        case 'cactus':
          this.drawCactus(obstacle);
          break;
        case 'tumbleweed':
          this.drawTumbleweed(obstacle);
          break;
        case 'boulder':
          this.drawBoulder(obstacle);
          break;
        case 'bandit':
          this.drawBandit(obstacle);
          break;
      }
    });
  }

  private drawCactus(obstacle: any): void {
    this.ctx.fillStyle = '#2D5016';

    // Main trunk
    this.ctx.fillRect(obstacle.x + 15, obstacle.y, 10, obstacle.height);

    // Left arm
    this.ctx.fillRect(obstacle.x + 5, obstacle.y + 20, 10, 5);
    this.ctx.fillRect(obstacle.x + 5, obstacle.y + 10, 5, 20);

    // Right arm
    this.ctx.fillRect(obstacle.x + 25, obstacle.y + 30, 10, 5);
    this.ctx.fillRect(obstacle.x + 30, obstacle.y + 20, 5, 20);

    // Spikes
    this.ctx.fillStyle = '#1A3010';
    for (let i = 0; i < 8; i++) {
      const y = obstacle.y + i * 8;
      this.ctx.fillRect(obstacle.x + 13, y, 2, 5);
      this.ctx.fillRect(obstacle.x + 25, y, 2, 5);
    }
  }

  private drawTumbleweed(obstacle: any): void {
    const rotation = (Date.now() * 0.01) % (Math.PI * 2);
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(rotation);

    this.ctx.strokeStyle = '#8B7355';
    this.ctx.lineWidth = 2;

    // Draw tangled branches
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const length = obstacle.width / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      this.ctx.stroke();

      // Sub-branches
      this.ctx.beginPath();
      this.ctx.moveTo(Math.cos(angle) * length * 0.5, Math.sin(angle) * length * 0.5);
      this.ctx.lineTo(
        Math.cos(angle + 0.5) * length * 0.7,
        Math.sin(angle + 0.5) * length * 0.7
      );
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawBoulder(obstacle: any): void {
    // Boulder shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(
      obstacle.x + obstacle.width / 2,
      obstacle.y + obstacle.height + 5,
      obstacle.width / 2,
      10,
      0,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Boulder body
    const gradient = this.ctx.createRadialGradient(
      obstacle.x + obstacle.width * 0.3,
      obstacle.y + obstacle.height * 0.3,
      0,
      obstacle.x + obstacle.width / 2,
      obstacle.y + obstacle.height / 2,
      obstacle.width / 2
    );
    gradient.addColorStop(0, '#A9A9A9');
    gradient.addColorStop(1, '#696969');
    this.ctx.fillStyle = gradient;

    this.ctx.beginPath();
    this.ctx.arc(
      obstacle.x + obstacle.width / 2,
      obstacle.y + obstacle.height / 2,
      obstacle.width / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Boulder cracks
    this.ctx.strokeStyle = '#505050';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(obstacle.x + 10, obstacle.y + 20);
    this.ctx.lineTo(obstacle.x + 25, obstacle.y + 15);
    this.ctx.moveTo(obstacle.x + 30, obstacle.y + 35);
    this.ctx.lineTo(obstacle.x + 45, obstacle.y + 30);
    this.ctx.stroke();
  }

  private drawBandit(obstacle: any): void {
    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(obstacle.x + 22, obstacle.y + obstacle.height + 2, 15, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Body
    this.ctx.fillStyle = '#2C2C2C';
    this.ctx.fillRect(obstacle.x + 12, obstacle.y + 30, 20, 30);

    // Head
    this.ctx.fillStyle = '#FFE0BD';
    this.ctx.beginPath();
    this.ctx.arc(obstacle.x + 22, obstacle.y + 20, 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Hat
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(obstacle.x + 12, obstacle.y + 8, 20, 8);
    this.ctx.fillRect(obstacle.x + 7, obstacle.y + 14, 30, 4);

    // Bandana (over face)
    this.ctx.fillStyle = '#DC143C';
    this.ctx.fillRect(obstacle.x + 15, obstacle.y + 18, 14, 8);

    // Arms
    this.ctx.strokeStyle = '#2C2C2C';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(obstacle.x + 12, obstacle.y + 35);
    this.ctx.lineTo(obstacle.x + 2, obstacle.y + 45);
    this.ctx.moveTo(obstacle.x + 32, obstacle.y + 35);
    this.ctx.lineTo(obstacle.x + 42, obstacle.y + 45);
    this.ctx.stroke();

    // Legs
    this.ctx.beginPath();
    this.ctx.moveTo(obstacle.x + 18, obstacle.y + 60);
    this.ctx.lineTo(obstacle.x + 15, obstacle.y + 75);
    this.ctx.moveTo(obstacle.x + 26, obstacle.y + 60);
    this.ctx.lineTo(obstacle.x + 29, obstacle.y + 75);
    this.ctx.stroke();
  }

  private drawCollectibles(state: any): void {
    state.collectibles.forEach((collectible: any) => {
      if (!collectible.collected) {
        switch (collectible.type) {
          case 'gold':
            this.drawGold(collectible);
            break;
          case 'star':
            this.drawStar(collectible);
            break;
          case 'horseshoe':
            this.drawHorseshoe(collectible);
            break;
        }
      }
    });
  }

  private drawGold(collectible: any): void {
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1;

    this.ctx.save();
    this.ctx.translate(collectible.x + collectible.width / 2, collectible.y + collectible.height / 2);
    this.ctx.scale(pulse, pulse);

    // Gold nugget
    const gradient = this.ctx.createRadialGradient(0, -5, 0, 0, 0, 15);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#DAA520');
    this.ctx.fillStyle = gradient;

    this.ctx.beginPath();
    this.ctx.moveTo(-10, 5);
    this.ctx.lineTo(-5, -8);
    this.ctx.lineTo(5, -8);
    this.ctx.lineTo(10, 5);
    this.ctx.lineTo(5, 10);
    this.ctx.lineTo(-5, 10);
    this.ctx.closePath();
    this.ctx.fill();

    // Shine
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.beginPath();
    this.ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawStar(collectible: any): void {
    const rotation = (Date.now() * 0.003) % (Math.PI * 2);
    const centerX = collectible.x + collectible.width / 2;
    const centerY = collectible.y + collectible.height / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(rotation);

    // Sheriff star (5-pointed)
    this.ctx.fillStyle = '#FFA500';
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * 12;
      const y = Math.sin(angle) * 12;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * 5;
      const innerY = Math.sin(innerAngle) * 5;
      this.ctx.lineTo(innerX, innerY);
    }
    this.ctx.closePath();
    this.ctx.fill();

    // Star border
    this.ctx.strokeStyle = '#FF8C00';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Center circle
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawHorseshoe(collectible: any): void {
    const bob = Math.sin(Date.now() * 0.004) * 3;

    this.ctx.save();
    this.ctx.translate(collectible.x + collectible.width / 2, collectible.y + collectible.height / 2 + bob);

    // Horseshoe
    this.ctx.strokeStyle = '#C0C0C0';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, Math.PI * 0.2, Math.PI * 0.8);
    this.ctx.stroke();

    // Nail holes
    this.ctx.fillStyle = '#808080';
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * 0.2 + (i * Math.PI * 0.6) / 5;
      const x = Math.cos(angle) * 10;
      const y = Math.sin(angle) * 10;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawParticles(state: any): void {
    state.particles.forEach((particle: any) => {
      const alpha = 1 - particle.life / particle.maxLife;
      this.ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private handleGameOver(state: any): void {
    this.saveHighScore(state.score);
    this.finalScoreElement.textContent = Math.floor(state.score).toString();
    this.gameOverScreen.classList.remove('hidden');
    this.pauseButton.style.display = 'none';
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initI18n();

  // Update all text elements
  document.getElementById('gameTitle')!.textContent = t('game.title');
  document.getElementById('startButton')!.textContent = t('game.start');
  document.getElementById('playAgainButton')!.textContent = t('game.playAgain');
  document.querySelector('[data-i18n="score-label"]')!.textContent = t('game.score') + ':';
  document.querySelector('[data-i18n="distance-label"]')!.textContent = t('game.distance') + ':';
  document.querySelector('[data-i18n="highscore-label"]')!.textContent = t('game.highScore') + ':';
  document.querySelector('[data-i18n="gameover"]')!.textContent = t('game.gameOver');
  document.querySelector('[data-i18n="finalscore-label"]')!.textContent = t('game.finalScore') + ':';
  document.querySelector('[data-i18n="paused"]')!.textContent = t('game.paused');
  document.querySelector('[data-i18n="resume"]')!.textContent = t('game.resume');
  document.querySelector('[data-i18n="controls"]')!.textContent = t('game.controls');
  document.querySelector('[data-i18n="control-left"]')!.textContent = t('game.control.left');
  document.querySelector('[data-i18n="control-right"]')!.textContent = t('game.control.right');
  document.querySelector('[data-i18n="control-jump"]')!.textContent = t('game.control.jump');
  document.querySelector('[data-i18n="control-pause"]')!.textContent = t('game.control.pause');

  new GameRenderer();
});
