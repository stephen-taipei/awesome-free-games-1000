/**
 * Fishing Master Game Logic
 * Game #176 - Arcade Fishing
 */

interface Fish {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: number;
  type: number;
  points: number;
  color: string;
}

interface GameState {
  score: number;
  time: number;
  status: "idle" | "playing" | "gameOver";
  hookY: number;
  isFishing: boolean;
  caughtFish: Fish | null;
}

type StateChangeCallback = (state: GameState) => void;

const FISH_TYPES = [
  { points: 10, color: "#3498db", width: 40, height: 20, speed: 1.5 },
  { points: 20, color: "#e74c3c", width: 50, height: 25, speed: 2 },
  { points: 30, color: "#f1c40f", width: 60, height: 30, speed: 2.5 },
  { points: 50, color: "#9b59b6", width: 70, height: 35, speed: 3 },
  { points: 100, color: "#e67e22", width: 80, height: 40, speed: 4 },
];

const GAME_DURATION = 60;

export class FishingMasterGame {
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

  private fishes: Fish[] = [];
  private hookX: number = 0;
  private hookY: number = 0;
  private hookSpeed: number = 0;
  private isFishing: boolean = false;
  private isRetracting: boolean = false;
  private caughtFish: Fish | null = null;
  private waterLevel: number = 80;

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
    this.hookX = this.width / 2;
    this.draw();
  }

  private spawnFish() {
    const type = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
    const direction = Math.random() > 0.5 ? 1 : -1;
    const fish: Fish = {
      x: direction > 0 ? -type.width : this.width + type.width,
      y: this.waterLevel + 30 + Math.random() * (this.height - this.waterLevel - 80),
      width: type.width,
      height: type.height,
      speed: type.speed * (0.8 + Math.random() * 0.4),
      direction,
      type: FISH_TYPES.indexOf(type),
      points: type.points,
      color: type.color,
    };
    this.fishes.push(fish);
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: Math.ceil(this.timeRemaining),
        status: this.getStatus(),
        hookY: this.hookY,
        isFishing: this.isFishing,
        caughtFish: this.caughtFish,
      });
    }
  }

  private getStatus(): "idle" | "playing" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (this.timeRemaining <= 0) return "gameOver";
    return "playing";
  }

  start() {
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.isPlaying = true;
    this.fishes = [];
    this.hookY = 50;
    this.isFishing = false;
    this.isRetracting = false;
    this.caughtFish = null;

    for (let i = 0; i < 8; i++) {
      this.spawnFish();
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
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
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
    // Update fishes
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];
      fish.x += fish.speed * fish.direction;

      if (fish.direction > 0 && fish.x > this.width + fish.width) {
        this.fishes.splice(i, 1);
      } else if (fish.direction < 0 && fish.x < -fish.width) {
        this.fishes.splice(i, 1);
      }
    }

    // Spawn new fish
    if (Math.random() < 0.02) {
      this.spawnFish();
    }

    // Update hook
    if (this.isFishing && !this.isRetracting) {
      this.hookY += 200 * delta;
      if (this.hookY >= this.height - 30) {
        this.isRetracting = true;
      }

      // Check collision with fish
      if (!this.caughtFish) {
        for (const fish of this.fishes) {
          if (this.checkCollision(fish)) {
            this.caughtFish = fish;
            this.isRetracting = true;
            break;
          }
        }
      }
    }

    if (this.isRetracting) {
      this.hookY -= 250 * delta;
      if (this.caughtFish) {
        this.caughtFish.x = this.hookX - this.caughtFish.width / 2;
        this.caughtFish.y = this.hookY;
      }

      if (this.hookY <= 50) {
        this.hookY = 50;
        this.isFishing = false;
        this.isRetracting = false;
        if (this.caughtFish) {
          this.score += this.caughtFish.points;
          const idx = this.fishes.indexOf(this.caughtFish);
          if (idx !== -1) this.fishes.splice(idx, 1);
          this.caughtFish = null;
        }
      }
    }
  }

  private checkCollision(fish: Fish): boolean {
    const hookSize = 15;
    return (
      this.hookX >= fish.x &&
      this.hookX <= fish.x + fish.width &&
      this.hookY >= fish.y &&
      this.hookY <= fish.y + fish.height
    );
  }

  cast() {
    if (!this.isPlaying || this.isFishing) return;
    this.isFishing = true;
    this.isRetracting = false;
    this.caughtFish = null;
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.isPlaying = false;
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.fishes = [];
    this.hookY = 50;
    this.isFishing = false;
    this.caughtFish = null;
    this.draw();
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.waterLevel);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.waterLevel);

    // Sun
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(this.width - 50, 40, 25, 0, Math.PI * 2);
    ctx.fill();

    // Water
    const waterGradient = ctx.createLinearGradient(0, this.waterLevel, 0, this.height);
    waterGradient.addColorStop(0, "#1E90FF");
    waterGradient.addColorStop(1, "#00008B");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, this.waterLevel, this.width, this.height - this.waterLevel);

    // Draw fishing line
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.hookX, 30);
    ctx.lineTo(this.hookX, this.hookY);
    ctx.stroke();

    // Draw hook
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.arc(this.hookX, this.hookY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.hookX, this.hookY);
    ctx.lineTo(this.hookX + 8, this.hookY + 12);
    ctx.lineTo(this.hookX, this.hookY + 8);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw fishes
    for (const fish of this.fishes) {
      this.drawFish(fish);
    }

    // Draw boat
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(this.hookX - 40, this.waterLevel - 10);
    ctx.lineTo(this.hookX + 40, this.waterLevel - 10);
    ctx.lineTo(this.hookX + 30, this.waterLevel + 10);
    ctx.lineTo(this.hookX - 30, this.waterLevel + 10);
    ctx.closePath();
    ctx.fill();

    // Fishing rod
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.hookX, this.waterLevel - 10);
    ctx.lineTo(this.hookX, 30);
    ctx.stroke();

    if (!this.isPlaying && this.timeRemaining === GAME_DURATION) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Fishing Master", this.width / 2, this.height / 2);
    }
  }

  private drawFish(fish: Fish) {
    const ctx = this.ctx;
    const cx = fish.x + fish.width / 2;
    const cy = fish.y + fish.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (fish.direction < 0) ctx.scale(-1, 1);

    // Body
    ctx.fillStyle = fish.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, fish.width / 2, fish.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-fish.width / 2, 0);
    ctx.lineTo(-fish.width / 2 - 15, -fish.height / 2);
    ctx.lineTo(-fish.width / 2 - 15, fish.height / 2);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(fish.width / 4, -fish.height / 6, fish.height / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(fish.width / 4 + 2, -fish.height / 6, fish.height / 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
