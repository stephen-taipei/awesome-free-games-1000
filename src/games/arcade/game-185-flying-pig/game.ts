/**
 * Flying Pig Game Logic
 * Game #185 - Flappy Style Game
 */

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface GameState {
  score: number;
  best: number;
  status: "idle" | "playing" | "gameOver";
}

type StateChangeCallback = (state: GameState) => void;

const GRAVITY = 0.4;
const FLAP_FORCE = -8;
const PIG_SIZE = 35;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;

export class FlyingPigGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private pigX: number = 0;
  private pigY: number = 0;
  private pigVY: number = 0;
  private pigRotation: number = 0;
  private pipes: Pipe[] = [];
  private score: number = 0;
  private bestScore: number = 0;
  private isPlaying: boolean = false;
  private animationId: number = 0;
  private frameCount: number = 0;
  private wingUp: boolean = false;

  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadBestScore();
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  private loadBestScore() {
    const saved = localStorage.getItem("flyingPigBest");
    if (saved) {
      this.bestScore = parseInt(saved, 10);
    }
  }

  private saveBestScore() {
    localStorage.setItem("flyingPigBest", this.bestScore.toString());
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

    this.pigX = this.width * 0.25;
    this.draw();
  }

  private init() {
    this.pigY = this.height / 2;
    this.pigVY = 0;
    this.pigRotation = 0;
    this.pipes = [];
    this.score = 0;
    this.frameCount = 0;
    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        best: this.bestScore,
        status: this.getStatus(),
      });
    }
  }

  private getStatus(): "idle" | "playing" | "gameOver" {
    if (!this.isPlaying) return "idle";
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.init();
    this.gameLoop();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  flap() {
    if (!this.isPlaying) return;
    this.pigVY = FLAP_FORCE;
    this.wingUp = true;
    setTimeout(() => (this.wingUp = false), 100);
  }

  handleKey(key: string) {
    if (key === " " || key === "ArrowUp") {
      this.flap();
    }
  }

  handleClick() {
    this.flap();
  }

  private gameLoop() {
    if (!this.isPlaying) return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.frameCount++;

    // Apply gravity
    this.pigVY += GRAVITY;
    this.pigY += this.pigVY;

    // Rotation based on velocity
    this.pigRotation = Math.min(Math.max(this.pigVY * 3, -30), 90);

    // Spawn pipes
    if (this.frameCount % 100 === 0) {
      const minGapY = PIPE_GAP / 2 + 50;
      const maxGapY = this.height - PIPE_GAP / 2 - 50;
      const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
      this.pipes.push({
        x: this.width,
        gapY,
        passed: false,
      });
    }

    // Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.x -= PIPE_SPEED;

      // Score when passing
      if (!pipe.passed && pipe.x + PIPE_WIDTH < this.pigX) {
        pipe.passed = true;
        this.score++;
        this.emitState();
      }

      // Remove off-screen pipes
      if (pipe.x + PIPE_WIDTH < 0) {
        this.pipes.splice(i, 1);
      }

      // Collision detection
      if (this.checkCollision(pipe)) {
        this.gameOver();
        return;
      }
    }

    // Ground/ceiling collision
    if (this.pigY - PIG_SIZE / 2 < 0 || this.pigY + PIG_SIZE / 2 > this.height) {
      this.gameOver();
    }
  }

  private checkCollision(pipe: Pipe): boolean {
    const pigLeft = this.pigX - PIG_SIZE / 2;
    const pigRight = this.pigX + PIG_SIZE / 2;
    const pigTop = this.pigY - PIG_SIZE / 2;
    const pigBottom = this.pigY + PIG_SIZE / 2;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;
    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;

    // Check if pig overlaps with pipe
    if (pigRight > pipeLeft && pigLeft < pipeRight) {
      if (pigTop < gapTop || pigBottom > gapBottom) {
        return true;
      }
    }

    return false;
  }

  private gameOver() {
    this.isPlaying = false;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore();
    }
    this.emitState();

    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        best: this.bestScore,
        status: "gameOver",
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw clouds
    this.drawClouds();

    // Draw pipes
    for (const pipe of this.pipes) {
      this.drawPipe(pipe);
    }

    // Draw ground
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, this.height - 10, this.width, 10);
    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, this.height - 15, this.width, 5);

    // Draw pig
    this.drawPig();

    // Draw score
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(this.score.toString(), this.width / 2, 50);
    ctx.fillText(this.score.toString(), this.width / 2, 50);

    if (!this.isPlaying && this.pipes.length === 0) {
      ctx.fillStyle = "#FF69B4";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("Flying Pig", this.width / 2, this.height / 2);
    }
  }

  private drawClouds() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    const cloudPositions = [
      { x: (this.frameCount * 0.5) % (this.width + 100) - 50, y: 60 },
      { x: ((this.frameCount * 0.3) + 200) % (this.width + 100) - 50, y: 100 },
      { x: ((this.frameCount * 0.4) + 400) % (this.width + 100) - 50, y: 50 },
    ];

    for (const cloud of cloudPositions) {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, 25, 0, Math.PI * 2);
      ctx.arc(cloud.x + 25, cloud.y - 10, 20, 0, Math.PI * 2);
      ctx.arc(cloud.x + 45, cloud.y, 25, 0, Math.PI * 2);
      ctx.arc(cloud.x + 20, cloud.y + 10, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPipe(pipe: Pipe) {
    const ctx = this.ctx;
    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;

    // Top pipe
    ctx.fillStyle = "#228B22";
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, gapTop);

    // Top pipe cap
    ctx.fillStyle = "#2ECC71";
    ctx.fillRect(pipe.x - 5, gapTop - 25, PIPE_WIDTH + 10, 25);

    // Bottom pipe
    ctx.fillStyle = "#228B22";
    ctx.fillRect(pipe.x, gapBottom, PIPE_WIDTH, this.height - gapBottom);

    // Bottom pipe cap
    ctx.fillStyle = "#2ECC71";
    ctx.fillRect(pipe.x - 5, gapBottom, PIPE_WIDTH + 10, 25);

    // Pipe highlights
    ctx.fillStyle = "#27AE60";
    ctx.fillRect(pipe.x + 5, 0, 10, gapTop - 25);
    ctx.fillRect(pipe.x + 5, gapBottom + 25, 10, this.height - gapBottom - 25);
  }

  private drawPig() {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.pigX, this.pigY);
    ctx.rotate((this.pigRotation * Math.PI) / 180);

    // Body
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    ctx.ellipse(0, 0, PIG_SIZE / 2, PIG_SIZE / 2 - 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = "#FF69B4";
    ctx.beginPath();
    ctx.ellipse(PIG_SIZE / 2 - 5, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(PIG_SIZE / 2 - 3, -3, 2, 0, Math.PI * 2);
    ctx.arc(PIG_SIZE / 2 - 3, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-5, -8, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-3, -8, 3, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#FF69B4";
    ctx.beginPath();
    ctx.ellipse(-10, -PIG_SIZE / 2 + 5, 8, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    if (this.wingUp) {
      ctx.ellipse(-5, -PIG_SIZE / 2 + 3, 15, 8, -0.5, 0, Math.PI * 2);
    } else {
      ctx.ellipse(-5, PIG_SIZE / 2 - 8, 15, 8, 0.3, 0, Math.PI * 2);
    }
    ctx.fill();

    // Tail
    ctx.strokeStyle = "#FF69B4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-PIG_SIZE / 2 + 5, 0);
    ctx.bezierCurveTo(
      -PIG_SIZE / 2 - 5, -5,
      -PIG_SIZE / 2 - 10, 5,
      -PIG_SIZE / 2 - 5, 0
    );
    ctx.stroke();

    ctx.restore();
  }
}
