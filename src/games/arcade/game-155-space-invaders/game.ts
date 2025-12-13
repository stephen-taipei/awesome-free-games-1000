/**
 * Space Invaders Game Engine
 * Game #155
 *
 * Classic Space Invaders - defend Earth!
 */

interface Alien {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  type: 0 | 1 | 2;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
  isPlayer: boolean;
}

interface Barrier {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number[][];
}

interface GameState {
  score: number;
  lives: number;
  level: number;
  status: "idle" | "playing" | "won" | "over" | "levelComplete";
}

type StateCallback = (state: GameState) => void;

const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_COLORS = ["#ff6b6b", "#feca57", "#48dbfb"];

export class SpaceInvadersGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private playerX = 0;
  private playerWidth = 0;
  private playerHeight = 0;
  private aliens: Alien[] = [];
  private bullets: Bullet[] = [];
  private barriers: Barrier[] = [];
  private alienDirection = 1;
  private alienSpeed = 1;
  private alienMoveTimer = 0;
  private alienShootTimer = 0;
  private score = 0;
  private lives = 3;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private lastShot = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        lives: this.lives,
        level: this.level,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.playerWidth = size * 0.08;
    this.playerHeight = size * 0.04;
    this.playerX = size / 2 - this.playerWidth / 2;

    this.createAliens();
    this.createBarriers();
    this.draw();
  }

  private createAliens() {
    this.aliens = [];
    const w = this.canvas.width;
    const alienWidth = w * 0.05;
    const alienHeight = w * 0.035;
    const spacing = w * 0.07;
    const startX = (w - ALIEN_COLS * spacing) / 2 + spacing / 2;
    const startY = w * 0.1;

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        this.aliens.push({
          x: startX + col * spacing,
          y: startY + row * spacing * 0.7,
          width: alienWidth,
          height: alienHeight,
          alive: true,
          type: (row < 1 ? 0 : row < 3 ? 1 : 2) as 0 | 1 | 2,
        });
      }
    }

    this.alienSpeed = 1 + (this.level - 1) * 0.5;
    this.alienDirection = 1;
  }

  private createBarriers() {
    this.barriers = [];
    const w = this.canvas.width;
    const barrierWidth = w * 0.1;
    const barrierHeight = w * 0.06;
    const barrierY = w * 0.75;
    const spacing = w / 5;

    for (let i = 0; i < 4; i++) {
      const x = spacing * (i + 0.5) + spacing / 2 - barrierWidth / 2;
      const health: number[][] = [];
      const rows = 6;
      const cols = 10;

      for (let r = 0; r < rows; r++) {
        health[r] = [];
        for (let c = 0; c < cols; c++) {
          health[r][c] = 3;
        }
      }

      this.barriers.push({
        x,
        y: barrierY,
        width: barrierWidth,
        height: barrierHeight,
        health,
      });
    }
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.bullets = [];
    this.createAliens();
    this.createBarriers();
    this.playerX = this.canvas.width / 2 - this.playerWidth / 2;
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    this.bullets = [];
    this.createAliens();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  shoot() {
    if (this.status !== "playing") return;
    const now = Date.now();
    if (now - this.lastShot < 300) return;
    this.lastShot = now;

    this.bullets.push({
      x: this.playerX + this.playerWidth / 2,
      y: this.canvas.height - this.playerHeight - 20,
      speed: -8,
      isPlayer: true,
    });
  }

  movePlayer(direction: "left" | "right") {
    if (this.status !== "playing") return;
    const speed = this.canvas.width * 0.02;
    if (direction === "left") {
      this.playerX = Math.max(0, this.playerX - speed);
    } else {
      this.playerX = Math.min(
        this.canvas.width - this.playerWidth,
        this.playerX + speed
      );
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Handle player input
    const speed = this.canvas.width * 0.008;
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.playerX = Math.max(0, this.playerX - speed);
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.playerX = Math.min(
        this.canvas.width - this.playerWidth,
        this.playerX + speed
      );
    }

    // Move aliens
    this.alienMoveTimer++;
    const moveInterval = Math.max(10, 30 - this.alienSpeed * 3);

    if (this.alienMoveTimer >= moveInterval) {
      this.alienMoveTimer = 0;

      let shouldDescend = false;
      const moveX = this.canvas.width * 0.02 * this.alienDirection;

      for (const alien of this.aliens) {
        if (!alien.alive) continue;
        const newX = alien.x + moveX;
        if (newX <= 0 || newX + alien.width >= this.canvas.width) {
          shouldDescend = true;
          break;
        }
      }

      if (shouldDescend) {
        this.alienDirection *= -1;
        for (const alien of this.aliens) {
          if (alien.alive) {
            alien.y += this.canvas.height * 0.03;
          }
        }
      } else {
        for (const alien of this.aliens) {
          if (alien.alive) {
            alien.x += moveX;
          }
        }
      }

      // Speed up as fewer aliens remain
      const aliveCount = this.aliens.filter((a) => a.alive).length;
      this.alienSpeed = 1 + (this.level - 1) * 0.5 + (ALIEN_ROWS * ALIEN_COLS - aliveCount) * 0.05;
    }

    // Alien shooting
    this.alienShootTimer++;
    const shootInterval = Math.max(30, 90 - this.level * 10);

    if (this.alienShootTimer >= shootInterval) {
      this.alienShootTimer = 0;
      const aliveAliens = this.aliens.filter((a) => a.alive);
      if (aliveAliens.length > 0) {
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        this.bullets.push({
          x: shooter.x + shooter.width / 2,
          y: shooter.y + shooter.height,
          speed: 4 + this.level * 0.5,
          isPlayer: false,
        });
      }
    }

    // Move bullets
    for (const bullet of this.bullets) {
      bullet.y += bullet.speed;
    }

    // Remove off-screen bullets
    this.bullets = this.bullets.filter(
      (b) => b.y > 0 && b.y < this.canvas.height
    );

    // Check collisions
    this.checkCollisions();

    // Check if aliens reached bottom
    for (const alien of this.aliens) {
      if (alien.alive && alien.y + alien.height >= this.canvas.height - this.playerHeight - 30) {
        this.status = "over";
        this.emitState();
        return;
      }
    }

    // Check win
    if (this.aliens.every((a) => !a.alive)) {
      this.status = "levelComplete";
      this.emitState();
      return;
    }
  }

  private checkCollisions() {
    const playerBullets = this.bullets.filter((b) => b.isPlayer);
    const alienBullets = this.bullets.filter((b) => !b.isPlayer);

    // Player bullets vs aliens
    for (const bullet of playerBullets) {
      for (const alien of this.aliens) {
        if (!alien.alive) continue;
        if (
          bullet.x >= alien.x &&
          bullet.x <= alien.x + alien.width &&
          bullet.y >= alien.y &&
          bullet.y <= alien.y + alien.height
        ) {
          alien.alive = false;
          bullet.y = -100;
          this.score += (3 - alien.type) * 10;
          this.emitState();
        }
      }
    }

    // Bullets vs barriers
    for (const bullet of this.bullets) {
      for (const barrier of this.barriers) {
        if (
          bullet.x >= barrier.x &&
          bullet.x <= barrier.x + barrier.width &&
          bullet.y >= barrier.y &&
          bullet.y <= barrier.y + barrier.height
        ) {
          const col = Math.floor(
            ((bullet.x - barrier.x) / barrier.width) * barrier.health[0].length
          );
          const row = Math.floor(
            ((bullet.y - barrier.y) / barrier.height) * barrier.health.length
          );

          if (
            row >= 0 &&
            row < barrier.health.length &&
            col >= 0 &&
            col < barrier.health[0].length &&
            barrier.health[row][col] > 0
          ) {
            barrier.health[row][col]--;
            bullet.y = bullet.isPlayer ? -100 : this.canvas.height + 100;
          }
        }
      }
    }

    // Alien bullets vs player
    for (const bullet of alienBullets) {
      if (
        bullet.x >= this.playerX &&
        bullet.x <= this.playerX + this.playerWidth &&
        bullet.y >= this.canvas.height - this.playerHeight - 20 &&
        bullet.y <= this.canvas.height - 10
      ) {
        bullet.y = this.canvas.height + 100;
        this.lives--;
        this.emitState();

        if (this.lives <= 0) {
          this.status = "over";
          this.emitState();
        }
      }
    }

    // Clean up bullets
    this.bullets = this.bullets.filter(
      (b) => b.y > 0 && b.y < this.canvas.height
    );
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % w;
      const y = (i * 251) % h;
      const size = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw barriers
    for (const barrier of this.barriers) {
      const cellWidth = barrier.width / barrier.health[0].length;
      const cellHeight = barrier.height / barrier.health.length;

      for (let r = 0; r < barrier.health.length; r++) {
        for (let c = 0; c < barrier.health[r].length; c++) {
          if (barrier.health[r][c] > 0) {
            const alpha = barrier.health[r][c] / 3;
            ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
            ctx.fillRect(
              barrier.x + c * cellWidth,
              barrier.y + r * cellHeight,
              cellWidth,
              cellHeight
            );
          }
        }
      }
    }

    // Draw aliens
    for (const alien of this.aliens) {
      if (!alien.alive) continue;
      this.drawAlien(alien);
    }

    // Draw bullets
    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.isPlayer ? "#00ff00" : "#ff0000";
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    }

    // Draw player
    this.drawPlayer();
  }

  private drawAlien(alien: Alien) {
    const ctx = this.ctx;
    const x = alien.x;
    const y = alien.y;
    const w = alien.width;
    const h = alien.height;

    ctx.fillStyle = ALIEN_COLORS[alien.type];

    if (alien.type === 0) {
      // Top row - squid type
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h * 0.6);
      ctx.lineTo(x + w * 0.8, y + h);
      ctx.lineTo(x + w * 0.2, y + h);
      ctx.lineTo(x, y + h * 0.6);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + w * 0.35, y + h * 0.5, w * 0.1, 0, Math.PI * 2);
      ctx.arc(x + w * 0.65, y + h * 0.5, w * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (alien.type === 1) {
      // Middle rows - crab type
      ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.7);
      ctx.fillRect(x, y + h * 0.3, w, h * 0.4);
      ctx.fillRect(x + w * 0.1, y + h * 0.7, w * 0.2, h * 0.3);
      ctx.fillRect(x + w * 0.7, y + h * 0.7, w * 0.2, h * 0.3);

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x + w * 0.35, y + h * 0.4, w * 0.08, 0, Math.PI * 2);
      ctx.arc(x + w * 0.65, y + h * 0.4, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Bottom rows - octopus type
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.4, w * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Tentacles
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + w * 0.1 + i * w * 0.25, y + h * 0.6, w * 0.15, h * 0.4);
      }

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x + w * 0.35, y + h * 0.35, w * 0.08, 0, Math.PI * 2);
      ctx.arc(x + w * 0.65, y + h * 0.35, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const x = this.playerX;
    const y = this.canvas.height - this.playerHeight - 15;
    const w = this.playerWidth;
    const h = this.playerHeight;

    // Ship body
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    // Cannon
    ctx.fillRect(x + w / 2 - 3, y - 8, 6, 10);

    // Cockpit
    ctx.fillStyle = "#00cc00";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.5, w * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
