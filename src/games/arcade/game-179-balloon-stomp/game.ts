/**
 * Balloon Stomp Game Logic
 * Game #179 - Platform Battle
 */

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hasBalloon: boolean;
  isJumping: boolean;
  facing: number;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hasBalloon: boolean;
  changeTimer: number;
}

interface GameState {
  score: number;
  time: number;
  status: "idle" | "playing" | "gameOver";
  playerHasBalloon: boolean;
}

type StateChangeCallback = (state: GameState) => void;

const GAME_DURATION = 60;
const GRAVITY = 800;
const JUMP_FORCE = -350;
const MOVE_SPEED = 200;
const GROUND_Y = 350;

export class BalloonStompGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private score: number = 0;
  private timeRemaining: number = GAME_DURATION;
  private isPlaying: boolean = false;
  private animationId: number = 0;
  private lastTime: number = 0;

  private player: Player;
  private enemies: Enemy[] = [];
  private keys: Set<string> = new Set();

  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 100,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      width: 30,
      height: 40,
      hasBalloon: true,
      isJumping: false,
      facing: 1,
    };
  }

  private createEnemy(): Enemy {
    return {
      x: this.width - 100,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      width: 30,
      height: 40,
      hasBalloon: true,
      changeTimer: 0,
    };
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
    this.draw();
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: Math.ceil(this.timeRemaining),
        status: this.getStatus(),
        playerHasBalloon: this.player.hasBalloon,
      });
    }
  }

  private getStatus(): "idle" | "playing" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (!this.player.hasBalloon || this.timeRemaining <= 0) return "gameOver";
    return "playing";
  }

  start() {
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.isPlaying = true;
    this.player = this.createPlayer();
    this.player.x = this.width / 4;
    this.enemies = [];

    for (let i = 0; i < 3; i++) {
      const enemy = this.createEnemy();
      enemy.x = this.width / 2 + Math.random() * (this.width / 3);
      this.enemies.push(enemy);
    }

    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.timeRemaining -= delta;
    if (this.timeRemaining <= 0 || !this.player.hasBalloon) {
      this.timeRemaining = Math.max(0, this.timeRemaining);
      this.isPlaying = false;
      this.emitState();
      this.draw();
      return;
    }

    this.update(delta);
    this.draw();
    this.emitState();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(delta: number) {
    // Player input
    this.player.vx = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) {
      this.player.vx = -MOVE_SPEED;
      this.player.facing = -1;
    }
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) {
      this.player.vx = MOVE_SPEED;
      this.player.facing = 1;
    }
    if ((this.keys.has("ArrowUp") || this.keys.has("KeyW") || this.keys.has("Space")) && !this.player.isJumping) {
      this.player.vy = JUMP_FORCE;
      this.player.isJumping = true;
    }

    // Update player physics
    this.player.vy += GRAVITY * delta;
    this.player.x += this.player.vx * delta;
    this.player.y += this.player.vy * delta;

    if (this.player.y >= GROUND_Y) {
      this.player.y = GROUND_Y;
      this.player.vy = 0;
      this.player.isJumping = false;
    }

    this.player.x = Math.max(20, Math.min(this.width - 50, this.player.x));

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.changeTimer -= delta;
      if (enemy.changeTimer <= 0) {
        enemy.changeTimer = 0.5 + Math.random() * 1.5;

        // AI behavior
        if (enemy.hasBalloon) {
          // Chase player if they have balloon
          if (this.player.hasBalloon) {
            enemy.vx = this.player.x > enemy.x ? MOVE_SPEED * 0.7 : -MOVE_SPEED * 0.7;
          } else {
            enemy.vx = (Math.random() - 0.5) * MOVE_SPEED;
          }

          // Random jump
          if (Math.random() < 0.3 && enemy.y >= GROUND_Y) {
            enemy.vy = JUMP_FORCE * 0.8;
          }
        } else {
          // Run away if no balloon
          enemy.vx = this.player.x > enemy.x ? -MOVE_SPEED : MOVE_SPEED;
        }
      }

      enemy.vy += GRAVITY * delta;
      enemy.x += enemy.vx * delta;
      enemy.y += enemy.vy * delta;

      if (enemy.y >= GROUND_Y) {
        enemy.y = GROUND_Y;
        enemy.vy = 0;
      }

      enemy.x = Math.max(20, Math.min(this.width - 50, enemy.x));
    }

    // Check collisions
    this.checkCollisions();

    // Respawn enemies
    for (const enemy of this.enemies) {
      if (!enemy.hasBalloon) {
        setTimeout(() => {
          enemy.hasBalloon = true;
          enemy.x = Math.random() > 0.5 ? 50 : this.width - 80;
          enemy.y = GROUND_Y;
        }, 2000);
      }
    }
  }

  private checkCollisions() {
    for (const enemy of this.enemies) {
      if (!enemy.hasBalloon) continue;

      const dx = (this.player.x + this.player.width / 2) - (enemy.x + enemy.width / 2);
      const dy = (this.player.y + this.player.height / 2) - (enemy.y + enemy.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        // Player landing on enemy
        if (this.player.vy > 0 && this.player.y < enemy.y - 10) {
          enemy.hasBalloon = false;
          this.score += 100;
          this.player.vy = JUMP_FORCE * 0.5;
        }
        // Enemy landing on player
        else if (enemy.vy > 0 && enemy.y < this.player.y - 10 && this.player.hasBalloon) {
          this.player.hasBalloon = false;
        }
      }
    }
  }

  handleKeyDown(code: string) {
    this.keys.add(code);
  }

  handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.isPlaying = false;
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.player = this.createPlayer();
    this.enemies = [];
    this.keys.clear();
    this.draw();
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, this.width, this.height);

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    this.drawCloud(50, 50, 40);
    this.drawCloud(200, 80, 30);
    this.drawCloud(350, 40, 35);

    // Ground
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, GROUND_Y + 40, this.width, this.height - GROUND_Y - 40);
    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, GROUND_Y + 35, this.width, 15);

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawCharacter(enemy, "#e74c3c", enemy.vx > 0 ? 1 : -1);
    }

    // Draw player
    this.drawCharacter(this.player, "#3498db", this.player.facing);

    if (!this.isPlaying && this.player.hasBalloon) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Balloon Stomp", this.width / 2, this.height / 2);
    }
  }

  private drawCloud(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCharacter(char: Player | Enemy, color: string, facing: number) {
    const ctx = this.ctx;
    const x = char.x + char.width / 2;
    const y = char.y + char.height;

    // Balloon
    if (char.hasBalloon) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y - char.height - 30, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - char.height - 8);
      ctx.lineTo(x, y - char.height + 5);
      ctx.stroke();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.ellipse(x - 5, y - char.height - 35, 5, 7, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = color === "#3498db" ? "#2980b9" : "#c0392b";
    ctx.fillRect(x - 12, y - char.height + 15, 24, 25);

    // Head
    ctx.fillStyle = "#FFE4C4";
    ctx.beginPath();
    ctx.arc(x, y - char.height + 10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x + facing * 4, y - char.height + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#333";
    ctx.fillRect(x - 10, y - 10, 8, 12);
    ctx.fillRect(x + 2, y - 10, 8, 12);
  }
}
