/**
 * Bubble Battle Game Logic
 * Game #183 - Bubble Shooter Battle
 */

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isEnemy: boolean;
}

interface GameState {
  wave: number;
  score: number;
  lives: number;
  status: "idle" | "playing" | "gameOver";
}

type StateChangeCallback = (state: GameState) => void;

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];

export class BubbleBattleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private playerBubbles: Bubble[] = [];
  private enemyBubbles: Bubble[] = [];
  private playerX: number = 0;
  private playerY: number = 0;
  private aimX: number = 0;
  private aimY: number = 0;
  private wave: number = 1;
  private score: number = 0;
  private lives: number = 3;
  private isPlaying: boolean = false;
  private animationId: number = 0;
  private lastShot: number = 0;
  private shootCooldown: number = 300;

  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.scale = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    this.playerX = this.width / 2;
    this.playerY = this.height - 40;
    this.draw();
  }

  private init() {
    this.playerBubbles = [];
    this.enemyBubbles = [];
    this.wave = 1;
    this.score = 0;
    this.lives = 3;
    this.playerX = this.width / 2;
    this.playerY = this.height - 40;
    this.spawnWave();
    this.emitState();
  }

  private spawnWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      this.enemyBubbles.push({
        x: Math.random() * (this.width - 60) + 30,
        y: Math.random() * (this.height / 2 - 60) + 30,
        vx: (Math.random() - 0.5) * 2 * (1 + this.wave * 0.2),
        vy: (Math.random() - 0.5) * 2 * (1 + this.wave * 0.2),
        radius: 15 + Math.random() * 15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        isEnemy: true,
      });
    }
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        wave: this.wave,
        score: this.score,
        lives: this.lives,
        status: this.getStatus(),
      });
    }
  }

  private getStatus(): "idle" | "playing" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (this.lives <= 0) return "gameOver";
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.init();
    this.gameLoop();
  }

  reset() {
    this.init();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  handleMouseMove(x: number, y: number) {
    this.aimX = x;
    this.aimY = y;
  }

  handleClick(x: number, y: number) {
    if (!this.isPlaying || this.lives <= 0) return;

    const now = Date.now();
    if (now - this.lastShot < this.shootCooldown) return;
    this.lastShot = now;

    const dx = x - this.playerX;
    const dy = y - this.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 8;

    this.playerBubbles.push({
      x: this.playerX,
      y: this.playerY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 12,
      color: "#00CED1",
      isEnemy: false,
    });
  }

  private gameLoop() {
    if (!this.isPlaying) return;

    this.update();
    this.draw();

    if (this.lives > 0) {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    // Update player bubbles
    for (let i = this.playerBubbles.length - 1; i >= 0; i--) {
      const bubble = this.playerBubbles[i];
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;

      // Remove if out of bounds
      if (
        bubble.x < -bubble.radius ||
        bubble.x > this.width + bubble.radius ||
        bubble.y < -bubble.radius ||
        bubble.y > this.height + bubble.radius
      ) {
        this.playerBubbles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (let j = this.enemyBubbles.length - 1; j >= 0; j--) {
        const enemy = this.enemyBubbles[j];
        const dx = bubble.x - enemy.x;
        const dy = bubble.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bubble.radius + enemy.radius) {
          this.playerBubbles.splice(i, 1);
          this.enemyBubbles.splice(j, 1);
          this.score += Math.floor(enemy.radius);
          this.emitState();
          break;
        }
      }
    }

    // Update enemy bubbles
    for (const bubble of this.enemyBubbles) {
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;

      // Bounce off walls
      if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > this.width) {
        bubble.vx *= -1;
        bubble.x = Math.max(bubble.radius, Math.min(this.width - bubble.radius, bubble.x));
      }
      if (bubble.y - bubble.radius < 0) {
        bubble.vy *= -1;
        bubble.y = Math.max(bubble.radius, bubble.y);
      }

      // Check if reaches bottom (player area)
      if (bubble.y + bubble.radius > this.height - 60) {
        bubble.vy *= -1;
        bubble.y = this.height - 60 - bubble.radius;
        this.lives--;
        this.emitState();

        if (this.lives <= 0) {
          this.isPlaying = false;
          return;
        }
      }
    }

    // Check wave complete
    if (this.enemyBubbles.length === 0 && this.isPlaying) {
      this.wave++;
      this.spawnWave();
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isPlaying && this.lives > 0) {
      ctx.fillStyle = "#4ECDC4";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Bubble Battle", this.width / 2, this.height / 2);
      return;
    }

    // Draw player zone
    ctx.fillStyle = "rgba(0, 206, 209, 0.1)";
    ctx.fillRect(0, this.height - 60, this.width, 60);
    ctx.strokeStyle = "rgba(0, 206, 209, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height - 60);
    ctx.lineTo(this.width, this.height - 60);
    ctx.stroke();

    // Draw aim line
    if (this.isPlaying && this.lives > 0) {
      ctx.strokeStyle = "rgba(0, 206, 209, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.playerX, this.playerY);
      ctx.lineTo(this.aimX, this.aimY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw player cannon
    this.drawCannon();

    // Draw enemy bubbles
    for (const bubble of this.enemyBubbles) {
      this.drawBubble(bubble);
    }

    // Draw player bubbles
    for (const bubble of this.playerBubbles) {
      this.drawBubble(bubble);
    }

    // Draw lives
    this.drawLives();
  }

  private drawCannon() {
    const ctx = this.ctx;
    const angle = Math.atan2(this.aimY - this.playerY, this.aimX - this.playerX);

    ctx.save();
    ctx.translate(this.playerX, this.playerY);
    ctx.rotate(angle);

    // Cannon barrel
    ctx.fillStyle = "#4ECDC4";
    ctx.fillRect(0, -8, 30, 16);

    // Cannon base
    ctx.restore();
    ctx.fillStyle = "#2C3E50";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4ECDC4";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBubble(bubble: Bubble) {
    const ctx = this.ctx;

    // Main bubble
    ctx.fillStyle = bubble.color;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(
      bubble.x - bubble.radius * 0.3,
      bubble.y - bubble.radius * 0.3,
      bubble.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawLives() {
    const ctx = this.ctx;
    const heartSize = 15;
    const startX = 15;
    const y = 20;

    for (let i = 0; i < this.lives; i++) {
      const x = startX + i * (heartSize * 2 + 5);

      ctx.fillStyle = "#FF6B6B";
      ctx.beginPath();
      ctx.moveTo(x, y + heartSize * 0.3);
      ctx.bezierCurveTo(
        x, y,
        x - heartSize, y,
        x - heartSize, y + heartSize * 0.3
      );
      ctx.bezierCurveTo(
        x - heartSize, y + heartSize * 0.6,
        x, y + heartSize,
        x, y + heartSize * 1.2
      );
      ctx.bezierCurveTo(
        x, y + heartSize,
        x + heartSize, y + heartSize * 0.6,
        x + heartSize, y + heartSize * 0.3
      );
      ctx.bezierCurveTo(
        x + heartSize, y,
        x, y,
        x, y + heartSize * 0.3
      );
      ctx.fill();
    }
  }
}
