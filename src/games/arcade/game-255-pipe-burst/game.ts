/**
 * Pipe Burst Game Engine
 * Game #255
 *
 * Fix burst pipes before water floods the area
 */

interface Pipe {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  burst: boolean;
  fixing: boolean;
  fixProgress: number;
  waterLevel: number;
  type: "horizontal" | "vertical" | "corner" | "junction";
}

interface WaterDrop {
  x: number;
  y: number;
  vy: number;
  size: number;
}

interface GameState {
  score: number;
  highScore: number;
  fixed: number;
  waterLevel: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class PipeBurstGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private pipes: Pipe[] = [];
  private waterDrops: WaterDrop[] = [];
  private score = 0;
  private highScore = 0;
  private fixed = 0;
  private globalWaterLevel = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private burstTimer = 0;
  private pipeIdCounter = 0;
  private fixingPipe: Pipe | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("pipe_burst_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("pipe_burst_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        fixed: this.fixed,
        waterLevel: Math.floor(this.globalWaterLevel),
        status: this.status,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.initPipes();
    this.draw();
  }

  private initPipes() {
    this.pipes = [];
    const gridSize = 60;
    const cols = Math.floor(this.width / gridSize);
    const rows = Math.floor((this.height - 60) / gridSize);

    const types: ("horizontal" | "vertical" | "corner" | "junction")[] = [
      "horizontal",
      "vertical",
      "corner",
      "junction",
    ];

    for (let row = 1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.6) {
          this.pipes.push({
            id: this.pipeIdCounter++,
            x: col * gridSize + 10,
            y: row * gridSize + 30,
            width: gridSize - 20,
            height: gridSize - 20,
            burst: false,
            fixing: false,
            fixProgress: 0,
            waterLevel: 0,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
      }
    }
  }

  handlePointerDown(x: number, y: number) {
    if (this.status !== "playing") return;

    for (const pipe of this.pipes) {
      if (
        pipe.burst &&
        !pipe.fixing &&
        x >= pipe.x &&
        x <= pipe.x + pipe.width &&
        y >= pipe.y &&
        y <= pipe.y + pipe.height
      ) {
        pipe.fixing = true;
        this.fixingPipe = pipe;
        return;
      }
    }
  }

  handlePointerUp() {
    if (this.fixingPipe) {
      if (this.fixingPipe.fixProgress < 100) {
        this.fixingPipe.fixing = false;
        this.fixingPipe.fixProgress = 0;
      }
      this.fixingPipe = null;
    }
  }

  start() {
    this.score = 0;
    this.fixed = 0;
    this.globalWaterLevel = 0;
    this.waterDrops = [];
    this.burstTimer = 0;
    this.fixingPipe = null;
    this.initPipes();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Burst new pipes
    this.burstTimer += dt;
    const burstInterval = Math.max(1000, 3000 - this.fixed * 100);

    if (this.burstTimer >= burstInterval) {
      this.burstTimer = 0;
      this.burstRandomPipe();
    }

    // Update burst pipes
    for (const pipe of this.pipes) {
      if (pipe.burst && !pipe.fixing) {
        pipe.waterLevel += dt * 0.002;
        this.globalWaterLevel += dt * 0.001;

        // Spawn water drops
        if (Math.random() < 0.3) {
          this.waterDrops.push({
            x: pipe.x + pipe.width / 2 + (Math.random() - 0.5) * 20,
            y: pipe.y + pipe.height,
            vy: 2 + Math.random() * 2,
            size: 3 + Math.random() * 3,
          });
        }
      }

      // Fix progress
      if (pipe.fixing) {
        pipe.fixProgress += dt * 0.1;
        if (pipe.fixProgress >= 100) {
          pipe.burst = false;
          pipe.fixing = false;
          pipe.fixProgress = 0;
          pipe.waterLevel = 0;
          this.fixed++;
          this.score += 100;

          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }
          this.emitState();
        }
      }
    }

    // Update water drops
    this.waterDrops = this.waterDrops.filter((drop) => {
      drop.y += drop.vy;
      drop.vy += 0.1;
      return drop.y < this.height;
    });

    // Check water level
    if (this.globalWaterLevel >= 100) {
      this.gameOver();
    }

    this.emitState();
  }

  private burstRandomPipe() {
    const intactPipes = this.pipes.filter((p) => !p.burst);
    if (intactPipes.length > 0) {
      const pipe = intactPipes[Math.floor(Math.random() * intactPipes.length)];
      pipe.burst = true;
    }
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

    // Background - basement wall
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#4a4a4a");
    gradient.addColorStop(1, "#2d2d2d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Brick pattern
    ctx.fillStyle = "rgba(100, 80, 60, 0.3)";
    for (let y = 0; y < this.height; y += 30) {
      for (let x = 0; x < this.width; x += 60) {
        const offset = (y / 30) % 2 === 0 ? 0 : 30;
        ctx.fillRect(x + offset, y, 58, 28);
      }
    }

    // Draw water level indicator
    const waterHeight = (this.globalWaterLevel / 100) * this.height;
    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
    ctx.fillRect(0, this.height - waterHeight, this.width, waterHeight);

    // Draw pipes
    for (const pipe of this.pipes) {
      this.drawPipe(pipe);
    }

    // Draw water drops
    ctx.fillStyle = "#3498db";
    for (const drop of this.waterDrops) {
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Water level warning
    if (this.globalWaterLevel > 70) {
      ctx.fillStyle = `rgba(231, 76, 60, ${0.3 + Math.sin(Date.now() / 200) * 0.2})`;
      ctx.fillRect(0, 0, this.width, 40);
      ctx.fillStyle = "white";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WARNING!", this.width / 2, 28);
    }
  }

  private drawPipe(pipe: Pipe) {
    const ctx = this.ctx;
    const x = pipe.x;
    const y = pipe.y;
    const w = pipe.width;
    const h = pipe.height;

    // Pipe body
    ctx.fillStyle = pipe.burst ? "#7f8c8d" : "#95a5a6";

    if (pipe.type === "horizontal") {
      ctx.fillRect(x - 5, y + h / 2 - 8, w + 10, 16);
    } else if (pipe.type === "vertical") {
      ctx.fillRect(x + w / 2 - 8, y - 5, 16, h + 10);
    } else if (pipe.type === "corner") {
      ctx.fillRect(x - 5, y + h / 2 - 8, w / 2 + 13, 16);
      ctx.fillRect(x + w / 2 - 8, y - 5, 16, h / 2 + 13);
    } else {
      ctx.fillRect(x - 5, y + h / 2 - 8, w + 10, 16);
      ctx.fillRect(x + w / 2 - 8, y - 5, 16, h + 10);
    }

    // Pipe joints
    ctx.fillStyle = "#7f8c8d";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 12, 0, Math.PI * 2);
    ctx.fill();

    // Burst indicator
    if (pipe.burst) {
      // Crack lines
      ctx.strokeStyle = "#3498db";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 8, y + h / 2 - 5);
      ctx.lineTo(x + w / 2, y + h / 2);
      ctx.lineTo(x + w / 2 + 5, y + h / 2 - 8);
      ctx.moveTo(x + w / 2 - 3, y + h / 2 + 3);
      ctx.lineTo(x + w / 2 + 8, y + h / 2 + 6);
      ctx.stroke();

      // Water spray
      ctx.fillStyle = "rgba(52, 152, 219, 0.6)";
      for (let i = 0; i < 5; i++) {
        const angle = (Date.now() / 100 + i) * 0.5;
        const dist = 10 + Math.sin(Date.now() / 50 + i) * 5;
        ctx.beginPath();
        ctx.arc(
          x + w / 2 + Math.cos(angle) * dist,
          y + h / 2 + Math.sin(angle) * dist,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Fix progress bar
      if (pipe.fixing) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(x, y - 15, w, 10);
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(x, y - 15, (w * pipe.fixProgress) / 100, 10);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - 15, w, 10);
      }

      // Tap to fix indicator
      if (!pipe.fixing) {
        ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FIX", x + w / 2, y + h / 2 + 4);
      }
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
