import { RacingRunGame, type GameState, type Obstacle, type Collectible, type Particle } from './game';
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
  private game: RacingRunGame;
  private animationId: number | null = null;
  private gameStarted: boolean = false;

  private scoreElement: HTMLElement;
  private distanceElement: HTMLElement;
  private coinsElement: HTMLElement;
  private healthBar: HTMLElement;
  private nitroBar: HTMLElement;
  private gameOverScreen: HTMLElement;
  private startScreen: HTMLElement;
  private finalScoreElement: HTMLElement;
  private highScoreElement: HTMLElement;

  private highScore: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.game = new RacingRunGame(this.canvas);

    // UI Elements
    this.scoreElement = document.getElementById('score')!;
    this.distanceElement = document.getElementById('distance')!;
    this.coinsElement = document.getElementById('coins')!;
    this.healthBar = document.getElementById('healthBar')!;
    this.nitroBar = document.getElementById('nitroBar')!;
    this.gameOverScreen = document.getElementById('gameOverScreen')!;
    this.startScreen = document.getElementById('startScreen')!;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.highScoreElement = document.getElementById('highScore')!;

    this.loadHighScore();
    this.setupEventListeners();
    this.updateTexts();
    this.render(0);
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('racingRunHighScore');
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore(): void {
    localStorage.setItem('racingRunHighScore', this.highScore.toString());
  }

  private updateTexts(): void {
    document.getElementById('gameTitle')!.textContent = t('game.title');
    document.getElementById('startButton')!.textContent = t('game.start');
    document.getElementById('restartButton')!.textContent = t('game.restart');
    document.getElementById('gameOverText')!.textContent = t('game.gameOver');
    document.getElementById('scoreLabel')!.textContent = t('game.score') + ':';
    document.getElementById('distanceLabel')!.textContent = t('game.distance') + ':';
    document.getElementById('coinsLabel')!.textContent = t('game.coins') + ':';
    document.getElementById('healthLabel')!.textContent = t('game.health') + ':';
    document.getElementById('nitroLabel')!.textContent = t('game.nitro') + ':';

    const controlsTitle = document.getElementById('controlsTitle')!;
    const controlsText = document.getElementById('controlsText')!;
    const tipsTitle = document.getElementById('tipsTitle')!;
    const tipsText = document.getElementById('tipsText')!;

    if (controlsTitle) controlsTitle.textContent = t('game.controls');
    if (controlsText) controlsText.textContent = t('game.controlsText');
    if (tipsTitle) tipsTitle.textContent = t('game.tips');
    if (tipsText) tipsText.textContent = t('game.tipsText');
  }

  private setupEventListeners(): void {
    document.getElementById('startButton')?.addEventListener('click', () => this.startGame());
    document.getElementById('restartButton')?.addEventListener('click', () => this.restartGame());

    document.addEventListener('keydown', (e) => {
      if (!this.gameStarted) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.startGame();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        this.game.togglePause();
        return;
      }

      this.game.handleKeyDown(e.key);
    });

    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (!this.gameStarted) {
        this.startGame();
        return;
      }

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
      } else {
        if (deltaY < -30) {
          this.game.boost();
        }
      }
    });
  }

  private startGame(): void {
    this.gameStarted = true;
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.game.start();
    if (!this.animationId) {
      this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
  }

  private restartGame(): void {
    this.startGame();
  }

  private gameLoop(currentTime: number): void {
    this.game.update(currentTime);
    this.render(currentTime);

    const state = this.game.getState();
    this.updateUI(state);

    if (state.gameOver) {
      this.handleGameOver(state);
    }

    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  private render(currentTime: number): void {
    const state = this.game.getState();

    // Clear canvas
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw highway background
    this.drawHighway(state);

    // Draw particles (behind)
    this.drawParticles(state.particles.filter(p => p.type === 'smoke' || p.type === 'boost'));

    // Draw collectibles
    state.collectibles.forEach(collectible => this.drawCollectible(collectible));

    // Draw obstacles
    state.obstacles.forEach(obstacle => this.drawObstacle(obstacle));

    // Draw player car
    this.drawPlayer(state);

    // Draw particles (front)
    this.drawParticles(state.particles.filter(p => p.type === 'spark' || p.type === 'coin'));

    // Draw speed lines if nitro active
    if (state.nitroActive) {
      this.drawSpeedLines();
    }

    // Draw pause overlay
    if (state.gamePaused) {
      this.drawPauseOverlay();
    }
  }

  private drawHighway(state: GameState): void {
    const laneWidth = 120;
    const startX = (this.canvas.width - laneWidth * 3) / 2;

    // Draw road
    this.ctx.fillStyle = '#34495e';
    this.ctx.fillRect(startX - 20, 0, laneWidth * 3 + 40, this.canvas.height);

    // Draw road edges
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(startX - 20, 0, 10, this.canvas.height);
    this.ctx.fillRect(startX + laneWidth * 3 + 10, 0, 10, this.canvas.height);

    // Draw lane dividers
    this.ctx.strokeStyle = '#ecf0f1';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([20, 20]);
    this.ctx.lineDashOffset = -state.roadOffset;

    for (let i = 1; i < 3; i++) {
      const x = startX + i * laneWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);

    // Draw side details (grass/dirt)
    this.ctx.fillStyle = '#27ae60';
    this.ctx.fillRect(0, 0, startX - 20, this.canvas.height);
    this.ctx.fillRect(startX + laneWidth * 3 + 20, 0, this.canvas.width - (startX + laneWidth * 3 + 20), this.canvas.height);
  }

  private drawPlayer(state: GameState): void {
    const player = state.player;
    const x = player.x;
    const y = player.y;

    // Flicker if invulnerable
    if (state.player.invulnerable > 0 && Math.floor(state.player.invulnerable / 5) % 2 === 0) {
      this.ctx.globalAlpha = 0.5;
    }

    // Draw car body
    this.ctx.fillStyle = state.nitroActive ? '#3498db' : '#e74c3c';
    this.ctx.strokeStyle = '#c0392b';
    this.ctx.lineWidth = 2;

    // Main body
    this.ctx.beginPath();
    this.ctx.roundRect(x - player.width / 2, y, player.width, player.height, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Car roof (cockpit)
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.beginPath();
    this.ctx.roundRect(x - player.width / 2 + 8, y + 15, player.width - 16, 35, 6);
    this.ctx.fill();

    // Windshield
    this.ctx.fillStyle = '#34495e';
    this.ctx.beginPath();
    this.ctx.roundRect(x - player.width / 2 + 12, y + 20, player.width - 24, 25, 4);
    this.ctx.fill();

    // Racing stripes
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x - 3, y, 6, player.height);

    // Headlights
    this.ctx.fillStyle = '#f39c12';
    this.ctx.beginPath();
    this.ctx.arc(x - player.width / 2 + 10, y + 5, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + player.width / 2 - 10, y + 5, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Tail lights
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.arc(x - player.width / 2 + 10, y + player.height - 5, 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + player.width / 2 - 10, y + player.height - 5, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Wheels
    this.ctx.fillStyle = '#2c3e50';
    const wheelWidth = 12;
    const wheelHeight = 18;

    // Front left wheel
    this.ctx.fillRect(x - player.width / 2 - 3, y + 10, wheelWidth, wheelHeight);
    // Front right wheel
    this.ctx.fillRect(x + player.width / 2 - wheelWidth + 3, y + 10, wheelWidth, wheelHeight);
    // Rear left wheel
    this.ctx.fillRect(x - player.width / 2 - 3, y + player.height - 28, wheelWidth, wheelHeight);
    // Rear right wheel
    this.ctx.fillRect(x + player.width / 2 - wheelWidth + 3, y + player.height - 28, wheelWidth, wheelHeight);

    // Nitro flames
    if (state.nitroActive) {
      this.ctx.fillStyle = '#3498db';
      this.ctx.globalAlpha = 0.7;
      const flameLength = 20 + Math.random() * 10;

      // Left exhaust
      this.ctx.beginPath();
      this.ctx.moveTo(x - player.width / 2 + 10, y + player.height);
      this.ctx.lineTo(x - player.width / 2 + 5, y + player.height + flameLength);
      this.ctx.lineTo(x - player.width / 2 + 15, y + player.height + flameLength);
      this.ctx.closePath();
      this.ctx.fill();

      // Right exhaust
      this.ctx.beginPath();
      this.ctx.moveTo(x + player.width / 2 - 10, y + player.height);
      this.ctx.lineTo(x + player.width / 2 - 15, y + player.height + flameLength);
      this.ctx.lineTo(x + player.width / 2 - 5, y + player.height + flameLength);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  private drawObstacle(obstacle: Obstacle): void {
    const x = obstacle.x;
    const y = obstacle.y;

    switch (obstacle.type) {
      case 'cone':
        // Traffic cone
        this.ctx.fillStyle = '#f39c12';
        this.ctx.strokeStyle = '#e67e22';
        this.ctx.lineWidth = 2;

        // Cone shape
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - obstacle.width / 2, y + obstacle.height);
        this.ctx.lineTo(x + obstacle.width / 2, y + obstacle.height);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // White stripes
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 2; i++) {
          const stripeY = y + (i + 1) * (obstacle.height / 3);
          const stripeWidth = obstacle.width * (1 - (i + 1) / 4);
          this.ctx.fillRect(x - stripeWidth / 2, stripeY, stripeWidth, 5);
        }
        break;

      case 'oil':
        // Oil slick
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + obstacle.height / 2, obstacle.width / 2, obstacle.height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Shine effect
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.ellipse(x - 10, y + 10, obstacle.width / 4, obstacle.height / 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        break;

      case 'car':
        // Other car
        this.ctx.fillStyle = obstacle.carColor || '#3498db';
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 2;

        // Car body
        this.ctx.beginPath();
        this.ctx.roundRect(x - obstacle.width / 2, y, obstacle.width, obstacle.height, 6);
        this.ctx.fill();
        this.ctx.stroke();

        // Windows
        this.ctx.fillStyle = '#34495e';
        this.ctx.beginPath();
        this.ctx.roundRect(x - obstacle.width / 2 + 8, y + obstacle.height - 50, obstacle.width - 16, 30, 4);
        this.ctx.fill();

        // Tail lights (since we see the back)
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(x - obstacle.width / 2 + 5, y + obstacle.height - 8, 8, 5);
        this.ctx.fillRect(x + obstacle.width / 2 - 13, y + obstacle.height - 8, 8, 5);
        break;

      case 'barrier':
        // Barrier
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 2;

        // Barrier body
        this.ctx.fillRect(x - obstacle.width / 2, y, obstacle.width, obstacle.height);
        this.ctx.strokeRect(x - obstacle.width / 2, y, obstacle.width, obstacle.height);

        // Warning stripes
        this.ctx.fillStyle = '#fff';
        const stripeCount = 4;
        for (let i = 0; i < stripeCount; i++) {
          if (i % 2 === 0) {
            this.ctx.fillRect(x - obstacle.width / 2 + (i * obstacle.width / stripeCount), y, obstacle.width / stripeCount, obstacle.height);
          }
        }
        break;
    }
  }

  private drawCollectible(collectible: Collectible): void {
    const x = collectible.x;
    const y = collectible.y;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(collectible.rotation || 0);

    switch (collectible.type) {
      case 'nitro':
        // Nitro boost icon
        this.ctx.fillStyle = '#3498db';
        this.ctx.strokeStyle = '#2980b9';
        this.ctx.lineWidth = 2;

        // Bottle shape
        this.ctx.beginPath();
        this.ctx.roundRect(-collectible.width / 2, -collectible.height / 2, collectible.width, collectible.height, 4);
        this.ctx.fill();
        this.ctx.stroke();

        // Lightning bolt
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -8);
        this.ctx.lineTo(2, -2);
        this.ctx.lineTo(-2, 0);
        this.ctx.lineTo(5, 8);
        this.ctx.lineTo(-2, 2);
        this.ctx.lineTo(2, 0);
        this.ctx.closePath();
        this.ctx.fill();
        break;

      case 'coin':
        // Coin
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, collectible.width / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Dollar sign or symbol
        this.ctx.fillStyle = '#e67e22';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('$', 0, 0);
        break;

      case 'repair':
        // Repair kit (wrench/health)
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.strokeStyle = '#27ae60';
        this.ctx.lineWidth = 2;

        // Cross shape (health)
        this.ctx.fillRect(-3, -collectible.height / 2, 6, collectible.height);
        this.ctx.fillRect(-collectible.width / 2, -3, collectible.width, 6);
        this.ctx.strokeRect(-3, -collectible.height / 2, 6, collectible.height);
        this.ctx.strokeRect(-collectible.width / 2, -3, collectible.width, 6);
        break;
    }

    this.ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;

      switch (particle.type) {
        case 'smoke':
          this.ctx.fillStyle = particle.color || '#95a5a6';
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'spark':
          this.ctx.fillStyle = particle.color || '#ff6b6b';
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'boost':
          this.ctx.fillStyle = particle.color || '#3498db';
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'coin':
          this.ctx.fillStyle = particle.color || '#f1c40f';
          this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
          break;
      }
    });

    this.ctx.globalAlpha = 1;
  }

  private drawSpeedLines(): void {
    this.ctx.strokeStyle = '#3498db';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.3;

    for (let i = 0; i < 10; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const length = 30 + Math.random() * 20;

      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, y + length);
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;
  }

  private drawPauseOverlay(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(t('game.pause'), this.canvas.width / 2, this.canvas.height / 2);

    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press ESC to resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }

  private updateUI(state: GameState): void {
    this.scoreElement.textContent = state.score.toString();
    this.distanceElement.textContent = Math.floor(state.distance) + 'm';
    this.coinsElement.textContent = state.coins.toString();

    const healthPercent = (state.player.health / state.player.maxHealth) * 100;
    this.healthBar.style.width = healthPercent + '%';

    if (healthPercent > 60) {
      this.healthBar.style.backgroundColor = '#2ecc71';
    } else if (healthPercent > 30) {
      this.healthBar.style.backgroundColor = '#f39c12';
    } else {
      this.healthBar.style.backgroundColor = '#e74c3c';
    }

    const nitroPercent = (state.nitroAmount / state.maxNitro) * 100;
    this.nitroBar.style.width = nitroPercent + '%';
    this.nitroBar.style.backgroundColor = state.nitroActive ? '#3498db' : '#5dade2';
  }

  private handleGameOver(state: GameState): void {
    if (state.score > this.highScore) {
      this.highScore = state.score;
      this.saveHighScore();
    }

    this.finalScoreElement.textContent = `${t('game.finalScore')}: ${state.score}`;
    this.highScoreElement.textContent = `${t('game.highScore')}: ${this.highScore}`;
    this.gameOverScreen.classList.remove('hidden');
    this.gameStarted = false;
  }
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initI18n();
    new GameRenderer();
  });
} else {
  initI18n();
  new GameRenderer();
}
