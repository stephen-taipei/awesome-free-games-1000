/**
 * Galaga - Game #156
 * Classic space shooter arcade game
 */

export interface Enemy {
  x: number;
  y: number;
  type: number;
  alive: boolean;
  diving: boolean;
  diveAngle: number;
  diveSpeed: number;
  originalX: number;
  originalY: number;
}

export interface Bullet {
  x: number;
  y: number;
  dy: number;
  isEnemy: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
}

export class GalagaGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private playerX = 0;
  private playerY = 0;
  private playerWidth = 30;
  private playerHeight = 25;
  private playerSpeed = 5;

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];

  private enemyRows = 4;
  private enemyCols = 8;
  private enemyWidth = 25;
  private enemyHeight = 20;
  private enemyMoveDir = 1;
  private enemyMoveTimer = 0;
  private enemyMoveInterval = 30;

  private score = 0;
  private lives = 3;
  private level = 1;

  private shootCooldown = 0;
  private shootInterval = 15;

  private moveLeft = false;
  private moveRight = false;
  private shooting = false;

  private animationId: number | null = null;
  private frameCount = 0;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    this.initGame();
    this.status = 'playing';
    this.loop();
  }

  private initGame() {
    this.playerX = this.canvas.width / 2 - this.playerWidth / 2;
    this.playerY = this.canvas.height - 50;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.bullets = [];
    this.explosions = [];
    this.spawnEnemies();
    this.notifyState();
  }

  private spawnEnemies() {
    this.enemies = [];
    const startX = (this.canvas.width - this.enemyCols * (this.enemyWidth + 10)) / 2;
    const startY = 50;

    for (let row = 0; row < this.enemyRows; row++) {
      for (let col = 0; col < this.enemyCols; col++) {
        this.enemies.push({
          x: startX + col * (this.enemyWidth + 10),
          y: startY + row * (this.enemyHeight + 15),
          type: row < 2 ? 1 : 2,
          alive: true,
          diving: false,
          diveAngle: 0,
          diveSpeed: 0,
          originalX: startX + col * (this.enemyWidth + 10),
          originalY: startY + row * (this.enemyHeight + 15)
        });
      }
    }
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down' || type === 'move') {
      // Touch control - move player to x position
      this.playerX = Math.max(0, Math.min(this.canvas.width - this.playerWidth, x - this.playerWidth / 2));
    }

    if (type === 'down') {
      this.shooting = true;
    } else if (type === 'up') {
      this.shooting = false;
    }
  }

  handleKey(key: string, pressed: boolean) {
    if (this.status !== 'playing') return;

    switch (key) {
      case 'ArrowLeft':
      case 'a':
        this.moveLeft = pressed;
        break;
      case 'ArrowRight':
      case 'd':
        this.moveRight = pressed;
        break;
      case ' ':
      case 'ArrowUp':
        this.shooting = pressed;
        break;
    }
  }

  private loop = () => {
    this.update();
    this.draw();
    this.frameCount++;

    if (this.status === 'playing') {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (this.status !== 'playing') return;

    // Player movement
    if (this.moveLeft) {
      this.playerX = Math.max(0, this.playerX - this.playerSpeed);
    }
    if (this.moveRight) {
      this.playerX = Math.min(this.canvas.width - this.playerWidth, this.playerX + this.playerSpeed);
    }

    // Shooting
    if (this.shooting && this.shootCooldown <= 0) {
      this.bullets.push({
        x: this.playerX + this.playerWidth / 2 - 2,
        y: this.playerY,
        dy: -8,
        isEnemy: false
      });
      this.shootCooldown = this.shootInterval;
    }
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.y += bullet.dy;
      return bullet.y > -10 && bullet.y < this.canvas.height + 10;
    });

    // Enemy movement
    this.enemyMoveTimer++;
    if (this.enemyMoveTimer >= this.enemyMoveInterval) {
      this.enemyMoveTimer = 0;
      this.moveEnemies();
    }

    // Update diving enemies
    this.updateDivingEnemies();

    // Random enemy dive
    if (Math.random() < 0.005 * this.level) {
      this.startEnemyDive();
    }

    // Enemy shooting
    if (Math.random() < 0.01 * this.level) {
      this.enemyShoot();
    }

    // Collision detection
    this.checkCollisions();

    // Update explosions
    this.explosions = this.explosions.filter(exp => {
      exp.frame++;
      return exp.frame < exp.maxFrames;
    });

    // Check win condition
    if (this.enemies.every(e => !e.alive)) {
      this.level++;
      this.spawnEnemies();
      this.enemyMoveInterval = Math.max(10, 30 - this.level * 2);
      this.notifyState();
    }
  }

  private moveEnemies() {
    let hitEdge = false;
    const aliveEnemies = this.enemies.filter(e => e.alive && !e.diving);

    for (const enemy of aliveEnemies) {
      enemy.x += this.enemyMoveDir * 5;
      enemy.originalX = enemy.x;

      if (enemy.x <= 10 || enemy.x >= this.canvas.width - this.enemyWidth - 10) {
        hitEdge = true;
      }
    }

    if (hitEdge) {
      this.enemyMoveDir *= -1;
      for (const enemy of aliveEnemies) {
        enemy.y += 10;
        enemy.originalY = enemy.y;
      }
    }
  }

  private updateDivingEnemies() {
    for (const enemy of this.enemies) {
      if (enemy.diving && enemy.alive) {
        enemy.x += Math.sin(enemy.diveAngle) * 3;
        enemy.y += enemy.diveSpeed;
        enemy.diveAngle += 0.1;

        // Return to formation if past screen
        if (enemy.y > this.canvas.height + 50) {
          enemy.y = -30;
          enemy.diving = false;
          enemy.x = enemy.originalX;
          enemy.y = enemy.originalY;
        }
      }
    }
  }

  private startEnemyDive() {
    const aliveEnemies = this.enemies.filter(e => e.alive && !e.diving);
    if (aliveEnemies.length > 0) {
      const enemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      enemy.diving = true;
      enemy.diveSpeed = 3 + this.level * 0.5;
      enemy.diveAngle = 0;
    }
  }

  private enemyShoot() {
    const aliveEnemies = this.enemies.filter(e => e.alive);
    if (aliveEnemies.length > 0) {
      const enemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      this.bullets.push({
        x: enemy.x + this.enemyWidth / 2,
        y: enemy.y + this.enemyHeight,
        dy: 4,
        isEnemy: true
      });
    }
  }

  private checkCollisions() {
    // Player bullets vs enemies
    for (const bullet of this.bullets) {
      if (bullet.isEnemy) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        if (bullet.x >= enemy.x && bullet.x <= enemy.x + this.enemyWidth &&
            bullet.y >= enemy.y && bullet.y <= enemy.y + this.enemyHeight) {
          enemy.alive = false;
          bullet.y = -100; // Remove bullet
          this.score += enemy.type === 1 ? 100 : 50;
          this.explosions.push({
            x: enemy.x + this.enemyWidth / 2,
            y: enemy.y + this.enemyHeight / 2,
            frame: 0,
            maxFrames: 15
          });
          this.notifyState();
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.bullets) {
      if (!bullet.isEnemy) continue;

      if (bullet.x >= this.playerX && bullet.x <= this.playerX + this.playerWidth &&
          bullet.y >= this.playerY && bullet.y <= this.playerY + this.playerHeight) {
        bullet.y = this.canvas.height + 100;
        this.playerHit();
      }
    }

    // Diving enemies vs player
    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.diving) continue;

      if (enemy.x < this.playerX + this.playerWidth &&
          enemy.x + this.enemyWidth > this.playerX &&
          enemy.y < this.playerY + this.playerHeight &&
          enemy.y + this.enemyHeight > this.playerY) {
        enemy.alive = false;
        this.playerHit();
      }
    }
  }

  private playerHit() {
    this.lives--;
    this.explosions.push({
      x: this.playerX + this.playerWidth / 2,
      y: this.playerY + this.playerHeight / 2,
      frame: 0,
      maxFrames: 20
    });

    if (this.lives <= 0) {
      this.status = 'lost';
    } else {
      this.playerX = this.canvas.width / 2 - this.playerWidth / 2;
    }
    this.notifyState();
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.drawStars();

    // Draw enemies
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        this.drawEnemy(enemy);
      }
    }

    // Draw player
    this.drawPlayer();

    // Draw bullets
    for (const bullet of this.bullets) {
      this.ctx.fillStyle = bullet.isEnemy ? '#ff6b6b' : '#ffff00';
      this.ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    }

    // Draw explosions
    for (const exp of this.explosions) {
      this.drawExplosion(exp);
    }

    // Draw UI
    this.drawUI();
  }

  private drawStars() {
    this.ctx.fillStyle = '#fff';
    const starCount = 50;
    for (let i = 0; i < starCount; i++) {
      const x = (i * 73 + this.frameCount * 0.5) % this.canvas.width;
      const y = (i * 137) % this.canvas.height;
      const size = (i % 3) + 1;
      this.ctx.globalAlpha = 0.3 + (Math.sin(this.frameCount * 0.05 + i) + 1) * 0.2;
      this.ctx.fillRect(x, y, size, size);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawPlayer() {
    const x = this.playerX;
    const y = this.playerY;

    // Ship body
    this.ctx.fillStyle = '#00ff00';
    this.ctx.beginPath();
    this.ctx.moveTo(x + this.playerWidth / 2, y);
    this.ctx.lineTo(x + this.playerWidth, y + this.playerHeight);
    this.ctx.lineTo(x + this.playerWidth * 0.7, y + this.playerHeight * 0.7);
    this.ctx.lineTo(x + this.playerWidth * 0.3, y + this.playerHeight * 0.7);
    this.ctx.lineTo(x, y + this.playerHeight);
    this.ctx.closePath();
    this.ctx.fill();

    // Cockpit
    this.ctx.fillStyle = '#00ffff';
    this.ctx.beginPath();
    this.ctx.arc(x + this.playerWidth / 2, y + this.playerHeight * 0.4, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Engine glow
    this.ctx.fillStyle = '#ff6600';
    const flicker = Math.sin(this.frameCount * 0.5) * 2;
    this.ctx.fillRect(x + this.playerWidth * 0.35, y + this.playerHeight, 3, 5 + flicker);
    this.ctx.fillRect(x + this.playerWidth * 0.55, y + this.playerHeight, 3, 5 + flicker);
  }

  private drawEnemy(enemy: Enemy) {
    const x = enemy.x;
    const y = enemy.y;

    if (enemy.type === 1) {
      // Boss enemy (bee)
      this.ctx.fillStyle = '#ff0000';
      this.ctx.beginPath();
      this.ctx.ellipse(x + this.enemyWidth / 2, y + this.enemyHeight / 2,
        this.enemyWidth / 2, this.enemyHeight / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Wings
      this.ctx.fillStyle = '#ffff00';
      const wingFlap = Math.sin(this.frameCount * 0.3) * 3;
      this.ctx.beginPath();
      this.ctx.ellipse(x - 3, y + this.enemyHeight / 2, 8, 5 + wingFlap, -0.3, 0, Math.PI * 2);
      this.ctx.ellipse(x + this.enemyWidth + 3, y + this.enemyHeight / 2, 8, 5 + wingFlap, 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Regular enemy
      this.ctx.fillStyle = '#00ffff';
      this.ctx.fillRect(x, y, this.enemyWidth, this.enemyHeight);

      // Details
      this.ctx.fillStyle = '#0088ff';
      this.ctx.fillRect(x + 5, y + 5, this.enemyWidth - 10, this.enemyHeight - 10);
    }

    // Eyes
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x + this.enemyWidth * 0.3, y + this.enemyHeight * 0.4, 3, 0, Math.PI * 2);
    this.ctx.arc(x + this.enemyWidth * 0.7, y + this.enemyHeight * 0.4, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawExplosion(exp: Explosion) {
    const progress = exp.frame / exp.maxFrames;
    const radius = 20 * progress;

    this.ctx.globalAlpha = 1 - progress;

    // Outer ring
    this.ctx.strokeStyle = '#ff6600';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner glow
    const gradient = this.ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(exp.x, exp.y, radius * 0.8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
  }

  private drawUI() {
    // Lives
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Lives: ${this.lives}`, 10, 25);

    // Score
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, 25);

    // Level
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Level: ${this.level}`, this.canvas.width - 10, 25);
  }

  resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    this.draw();
  }

  reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.initGame();
    this.status = 'playing';
    this.loop();
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        score: this.score,
        lives: this.lives,
        level: this.level
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
