/**
 * Ice Skating Game Engine
 * Game #244
 *
 * Arcade ice skating with slippery physics!
 */

interface Star {
  x: number;
  y: number;
  collected: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

interface GameState {
  score: number;
  speed: number;
  highScore: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const PLAYER_SIZE = 15;
const FRICTION = 0.995;
const TURN_SPEED = 0.08;
const ACCEL = 0.15;
const MAX_SPEED = 8;

export class IceSkatingGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private playerX = 0;
  private playerY = 0;
  private playerAngle = -Math.PI / 2;
  private playerSpeed = 0;
  private vx = 0;
  private vy = 0;

  private score = 0;
  private highScore = 0;
  private distance = 0;
  private stars: Star[] = [];
  private obstacles: Obstacle[] = [];
  private trail: { x: number; y: number }[] = [];

  private turningLeft = false;
  private turningRight = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.loadHighScore();
    this.setupControls();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("iceskating_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("iceskating_highscore", this.highScore.toString());
  }

  private setupControls() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.turningLeft = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.turningRight = true;
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.turningLeft = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.turningRight = false;
      }
    });
  }

  turnLeft(active: boolean) {
    this.turningLeft = active;
  }

  turnRight(active: boolean) {
    this.turningRight = active;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        speed: Math.round(this.playerSpeed * 10),
        highScore: this.highScore,
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
    this.playerY = size * 0.7;

    this.draw();
  }

  start() {
    this.score = 0;
    this.distance = 0;
    this.playerX = this.canvas.width / 2;
    this.playerY = this.canvas.height * 0.7;
    this.playerAngle = -Math.PI / 2;
    this.playerSpeed = 3;
    this.vx = 0;
    this.vy = -this.playerSpeed;
    this.stars = [];
    this.obstacles = [];
    this.trail = [];
    this.status = "playing";

    this.generateItems();
    this.emitState();
    this.gameLoop();
  }

  private generateItems() {
    const w = this.canvas.width;

    // Generate stars
    for (let i = 0; i < 20; i++) {
      this.stars.push({
        x: Math.random() * (w - 60) + 30,
        y: -Math.random() * w * 3,
        collected: false,
      });
    }

    // Generate obstacles
    for (let i = 0; i < 15; i++) {
      this.obstacles.push({
        x: Math.random() * (w - 80) + 40,
        y: -Math.random() * w * 3 - 200,
        radius: 15 + Math.random() * 10,
      });
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Handle turning
    if (this.turningLeft) {
      this.playerAngle -= TURN_SPEED;
    }
    if (this.turningRight) {
      this.playerAngle += TURN_SPEED;
    }

    // Accelerate in facing direction
    const ax = Math.cos(this.playerAngle) * ACCEL;
    const ay = Math.sin(this.playerAngle) * ACCEL;

    this.vx += ax;
    this.vy += ay;

    // Apply friction
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    // Calculate speed
    this.playerSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    // Limit max speed
    if (this.playerSpeed > MAX_SPEED) {
      const scale = MAX_SPEED / this.playerSpeed;
      this.vx *= scale;
      this.vy *= scale;
      this.playerSpeed = MAX_SPEED;
    }

    // Move player
    this.playerX += this.vx;
    this.playerY += this.vy;

    // Update distance (score based on forward progress)
    this.distance -= this.vy;
    if (this.distance > 0) {
      this.score = Math.floor(this.distance / 10);
    }

    // Wall collision
    if (this.playerX < PLAYER_SIZE) {
      this.playerX = PLAYER_SIZE;
      this.vx *= -0.5;
    }
    if (this.playerX > this.canvas.width - PLAYER_SIZE) {
      this.playerX = this.canvas.width - PLAYER_SIZE;
      this.vx *= -0.5;
    }

    // Keep player in center vertically by scrolling world
    const scrollY = this.vy;

    // Update stars
    this.stars.forEach((star) => {
      star.y -= scrollY;

      // Check collection
      if (!star.collected) {
        const dx = star.x - this.playerX;
        const dy = star.y - this.playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PLAYER_SIZE + 15) {
          star.collected = true;
          this.score += 100;
        }
      }
    });

    // Remove collected stars and add new ones
    this.stars = this.stars.filter((s) => !s.collected && s.y < this.canvas.height + 50);
    while (this.stars.length < 15) {
      this.stars.push({
        x: Math.random() * (this.canvas.width - 60) + 30,
        y: -Math.random() * 200 - 50,
        collected: false,
      });
    }

    // Update obstacles
    this.obstacles.forEach((obs) => {
      obs.y -= scrollY;

      // Check collision
      const dx = obs.x - this.playerX;
      const dy = obs.y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PLAYER_SIZE + obs.radius) {
        this.gameOver();
      }
    });

    // Remove off-screen obstacles and add new ones
    this.obstacles = this.obstacles.filter((o) => o.y < this.canvas.height + 50);
    while (this.obstacles.length < 10) {
      this.obstacles.push({
        x: Math.random() * (this.canvas.width - 80) + 40,
        y: -Math.random() * 200 - 50,
        radius: 15 + Math.random() * 10,
      });
    }

    // Update trail
    this.trail.unshift({ x: this.playerX, y: this.playerY });
    if (this.trail.length > 30) {
      this.trail.pop();
    }

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    this.emitState();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Ice background
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#e8f4f8");
    gradient.addColorStop(0.5, "#d0e8ef");
    gradient.addColorStop(1, "#b8dce8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ice texture
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const x1 = Math.random() * w;
      const y1 = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + Math.random() * 50 - 25, y1 + Math.random() * 30);
      ctx.stroke();
    }

    // Draw trail
    this.trail.forEach((point, i) => {
      const alpha = 1 - i / this.trail.length;
      ctx.fillStyle = `rgba(100, 180, 255, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, PLAYER_SIZE * (1 - i / this.trail.length * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw stars
    this.stars.forEach((star) => {
      if (!star.collected) {
        ctx.fillStyle = "#ffd700";
        this.drawStar(star.x, star.y, 5, 12, 6);
      }
    });

    // Draw obstacles (rocks/barriers)
    this.obstacles.forEach((obs) => {
      ctx.fillStyle = "#667788";
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();

      // Snow on top
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(obs.x, obs.y - obs.radius * 0.3, obs.radius * 0.8, Math.PI, 0);
      ctx.fill();
    });

    // Draw player
    this.drawPlayer();
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    const ctx = this.ctx;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer() {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.playerX, this.playerY);
    ctx.rotate(this.playerAngle + Math.PI / 2);

    // Skater body
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.ellipse(0, 0, PLAYER_SIZE * 0.8, PLAYER_SIZE, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#fad390";
    ctx.beginPath();
    ctx.arc(0, -PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_SIZE * 1.5);
    ctx.lineTo(-5, -PLAYER_SIZE);
    ctx.lineTo(5, -PLAYER_SIZE);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
