/**
 * Bullet Hell Game Engine
 * Game #239
 *
 * Danmaku-style bullet dodging game!
 */

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Pattern {
  name: string;
  spawn: (game: BulletHellGame, time: number) => void;
}

interface GameState {
  score: number;
  time: number;
  lives: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const PLAYER_RADIUS = 5;
const PLAYER_HITBOX = 3;
const PLAYER_SPEED = 5;
const FOCUS_SPEED = 2;

export class BulletHellGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score = 0;
  private time = 0;
  private lives = 3;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private timerInterval: number | null = null;

  private playerX = 0;
  private playerY = 0;
  private targetX = 0;
  private targetY = 0;
  private isFocused = false;
  private invincible = false;
  private invincibleTimer = 0;

  private bullets: Bullet[] = [];
  private patterns: Pattern[] = [];
  private currentPattern = 0;
  private patternTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.setupPatterns();
    this.setupControls();
  }

  private setupPatterns() {
    this.patterns = [
      {
        name: "spiral",
        spawn: (game, time) => {
          if (time % 5 === 0) {
            const angle = (time * 0.1) % (Math.PI * 2);
            const cx = game.canvas.width / 2;
            const cy = 50;
            game.bullets.push({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3 + 1,
              radius: 6,
              color: "#ff6b6b",
            });
          }
        },
      },
      {
        name: "rain",
        spawn: (game, time) => {
          if (time % 8 === 0) {
            game.bullets.push({
              x: Math.random() * game.canvas.width,
              y: 0,
              vx: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 2,
              radius: 5,
              color: "#4ecdc4",
            });
          }
        },
      },
      {
        name: "spread",
        spawn: (game, time) => {
          if (time % 30 === 0) {
            const cx = game.canvas.width / 2;
            const count = 12;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              game.bullets.push({
                x: cx,
                y: 60,
                vx: Math.cos(angle) * 2.5,
                vy: Math.sin(angle) * 2.5,
                radius: 7,
                color: "#a855f7",
              });
            }
          }
        },
      },
      {
        name: "aimed",
        spawn: (game, time) => {
          if (time % 40 === 0) {
            const cx = Math.random() * game.canvas.width;
            const dx = game.playerX - cx;
            const dy = game.playerY - 30;
            const dist = Math.sqrt(dx * dx + dy * dy);
            game.bullets.push({
              x: cx,
              y: 30,
              vx: (dx / dist) * 4,
              vy: (dy / dist) * 4,
              radius: 8,
              color: "#f59e0b",
            });
          }
        },
      },
      {
        name: "wave",
        spawn: (game, time) => {
          if (time % 10 === 0) {
            const x = (time * 3) % game.canvas.width;
            game.bullets.push({
              x,
              y: 0,
              vx: 0,
              vy: 3,
              radius: 5,
              color: "#06b6d4",
            });
          }
        },
      },
    ];
  }

  private setupControls() {
    // Mouse controls
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.status !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.targetX = (e.clientX - rect.left) * scaleX;
      this.targetY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("mousedown", () => {
      this.isFocused = true;
    });

    this.canvas.addEventListener("mouseup", () => {
      this.isFocused = false;
    });

    // Touch controls
    this.canvas.addEventListener("touchmove", (e) => {
      if (this.status !== "playing") return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.targetX = (touch.clientX - rect.left) * scaleX;
      this.targetY = (touch.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("touchstart", (e) => {
      if (this.status !== "playing") return;
      e.preventDefault();
      this.isFocused = true;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.targetX = (touch.clientX - rect.left) * scaleX;
      this.targetY = (touch.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("touchend", () => {
      this.isFocused = false;
    });
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: this.time,
        lives: this.lives,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.playerX = size / 2;
    this.playerY = size - 60;
    this.targetX = this.playerX;
    this.targetY = this.playerY;

    this.draw();
  }

  start() {
    this.score = 0;
    this.time = 0;
    this.lives = 3;
    this.status = "playing";
    this.bullets = [];
    this.currentPattern = 0;
    this.patternTimer = 0;
    this.invincible = false;

    this.playerX = this.canvas.width / 2;
    this.playerY = this.canvas.height - 60;
    this.targetX = this.playerX;
    this.targetY = this.playerY;

    this.startTimer();
    this.emitState();
    this.gameLoop();
  }

  private startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = window.setInterval(() => {
      if (this.status !== "playing") return;
      this.time++;
      this.score += 10;

      // Switch pattern every 10 seconds
      if (this.time % 10 === 0) {
        this.currentPattern = (this.currentPattern + 1) % this.patterns.length;
      }

      this.emitState();
    }, 1000);
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.patternTimer++;

    // Move player towards target
    const speed = this.isFocused ? FOCUS_SPEED : PLAYER_SPEED;
    const dx = this.targetX - this.playerX;
    const dy = this.targetY - this.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > speed) {
      this.playerX += (dx / dist) * speed;
      this.playerY += (dy / dist) * speed;
    } else {
      this.playerX = this.targetX;
      this.playerY = this.targetY;
    }

    // Keep player in bounds
    this.playerX = Math.max(PLAYER_RADIUS, Math.min(this.canvas.width - PLAYER_RADIUS, this.playerX));
    this.playerY = Math.max(PLAYER_RADIUS, Math.min(this.canvas.height - PLAYER_RADIUS, this.playerY));

    // Spawn bullets from current pattern
    const pattern = this.patterns[this.currentPattern];
    pattern.spawn(this, this.patternTimer);

    // Also add occasional bullets from other patterns for variety
    if (this.time > 5 && this.patternTimer % 60 === 0) {
      const otherPattern = this.patterns[(this.currentPattern + 1) % this.patterns.length];
      otherPattern.spawn(this, this.patternTimer);
    }

    // Update bullets
    this.bullets.forEach((bullet) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    });

    // Remove off-screen bullets
    this.bullets = this.bullets.filter(
      (b) =>
        b.x > -20 &&
        b.x < this.canvas.width + 20 &&
        b.y > -20 &&
        b.y < this.canvas.height + 20
    );

    // Update invincibility
    if (this.invincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    // Check bullet collisions
    if (!this.invincible) {
      for (const bullet of this.bullets) {
        const dx = bullet.x - this.playerX;
        const dy = bullet.y - this.playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bullet.radius + PLAYER_HITBOX) {
          this.lives--;
          this.invincible = true;
          this.invincibleTimer = 120; // 2 seconds at 60fps
          this.bullets = []; // Clear bullets on hit
          this.emitState();

          if (this.lives <= 0) {
            this.gameOver();
          }
          break;
        }
      }
    }

    // Award points for grazing (close calls)
    this.bullets.forEach((bullet) => {
      const dx = bullet.x - this.playerX;
      const dy = bullet.y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bullet.radius + PLAYER_RADIUS + 10 && dist > bullet.radius + PLAYER_HITBOX) {
        this.score += 1;
      }
    });
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#0f0f23";
    ctx.fillRect(0, 0, w, h);

    // Grid effect
    ctx.strokeStyle = "rgba(100, 100, 150, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw bullets
    this.bullets.forEach((bullet) => {
      // Glow
      const gradient = ctx.createRadialGradient(
        bullet.x,
        bullet.y,
        0,
        bullet.x,
        bullet.y,
        bullet.radius * 2
      );
      gradient.addColorStop(0, bullet.color);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(
        bullet.x - bullet.radius * 0.3,
        bullet.y - bullet.radius * 0.3,
        bullet.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw player
    this.drawPlayer();
  }

  private drawPlayer() {
    const ctx = this.ctx;

    // Blink when invincible
    if (this.invincible && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
      return;
    }

    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.playerX,
      this.playerY,
      0,
      this.playerX,
      this.playerY,
      PLAYER_RADIUS * 3
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_RADIUS * 3, 0, Math.PI * 2);
    ctx.fill();

    // Player body
    ctx.fillStyle = this.isFocused ? "#ff6b6b" : "#ffffff";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Hitbox indicator (when focused)
    if (this.isFocused) {
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, PLAYER_HITBOX, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Core
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_HITBOX, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
