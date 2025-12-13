/**
 * Apple Catch Game Logic
 * Game #178 - Arcade Catch Game
 */

interface Apple {
  x: number;
  y: number;
  speed: number;
  type: "red" | "green" | "golden" | "rotten";
  size: number;
}

interface GameState {
  score: number;
  lives: number;
  status: "idle" | "playing" | "gameOver";
}

type StateChangeCallback = (state: GameState) => void;

export class AppleCatchGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private score: number = 0;
  private lives: number = 3;
  private isPlaying: boolean = false;
  private animationId: number = 0;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private difficulty: number = 1;

  private apples: Apple[] = [];
  private basketX: number = 0;
  private basketWidth: number = 80;
  private basketHeight: number = 50;

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
    this.basketX = this.width / 2 - this.basketWidth / 2;
    this.draw();
  }

  private spawnApple() {
    const rand = Math.random();
    let type: Apple["type"];
    let points: number;

    if (rand < 0.6) {
      type = "red";
    } else if (rand < 0.85) {
      type = "green";
    } else if (rand < 0.95) {
      type = "golden";
    } else {
      type = "rotten";
    }

    this.apples.push({
      x: 30 + Math.random() * (this.width - 60),
      y: -30,
      speed: (2 + Math.random() * 2) * this.difficulty,
      type,
      size: 25,
    });
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
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
    this.score = 0;
    this.lives = 3;
    this.isPlaying = true;
    this.apples = [];
    this.difficulty = 1;
    this.spawnTimer = 0;
    this.basketX = this.width / 2 - this.basketWidth / 2;

    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.lives <= 0) {
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
    // Spawn apples
    this.spawnTimer += delta;
    const spawnRate = Math.max(0.5, 1.5 - this.difficulty * 0.1);
    if (this.spawnTimer >= spawnRate) {
      this.spawnApple();
      this.spawnTimer = 0;
    }

    // Increase difficulty
    this.difficulty = 1 + this.score / 100;

    // Update apples
    const basketTop = this.height - this.basketHeight - 20;

    for (let i = this.apples.length - 1; i >= 0; i--) {
      const apple = this.apples[i];
      apple.y += apple.speed;

      // Check catch
      if (
        apple.y + apple.size >= basketTop &&
        apple.y <= basketTop + 20 &&
        apple.x >= this.basketX - apple.size / 2 &&
        apple.x <= this.basketX + this.basketWidth + apple.size / 2
      ) {
        switch (apple.type) {
          case "red":
            this.score += 10;
            break;
          case "green":
            this.score += 20;
            break;
          case "golden":
            this.score += 50;
            break;
          case "rotten":
            this.lives--;
            break;
        }
        this.apples.splice(i, 1);
        continue;
      }

      // Check miss
      if (apple.y > this.height) {
        if (apple.type !== "rotten") {
          this.lives--;
        }
        this.apples.splice(i, 1);
      }
    }
  }

  moveBasket(x: number) {
    if (!this.isPlaying) return;
    this.basketX = Math.max(0, Math.min(this.width - this.basketWidth, x - this.basketWidth / 2));
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.isPlaying = false;
    this.score = 0;
    this.lives = 3;
    this.apples = [];
    this.draw();
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grass
    ctx.fillStyle = "#7CFC00";
    ctx.fillRect(0, this.height - 40, this.width, 40);

    // Tree
    this.drawTree();

    // Draw apples
    for (const apple of this.apples) {
      this.drawApple(apple);
    }

    // Draw basket
    this.drawBasket();

    if (!this.isPlaying && this.lives === 3) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Apple Catch", this.width / 2, this.height / 2);
    }
  }

  private drawTree() {
    const ctx = this.ctx;
    const treeX = this.width / 2;

    // Trunk
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(treeX - 20, 50, 40, 100);

    // Leaves
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    ctx.arc(treeX, 50, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(treeX - 50, 70, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(treeX + 50, 70, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawApple(apple: Apple) {
    const ctx = this.ctx;

    // Color based on type
    let color: string;
    switch (apple.type) {
      case "red":
        color = "#e74c3c";
        break;
      case "green":
        color = "#2ecc71";
        break;
      case "golden":
        color = "#f1c40f";
        break;
      case "rotten":
        color = "#795548";
        break;
    }

    // Apple body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(apple.x, apple.y, apple.size, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(apple.x - 8, apple.y - 8, apple.size / 3, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(apple.x, apple.y - apple.size);
    ctx.lineTo(apple.x + 3, apple.y - apple.size - 10);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    ctx.ellipse(apple.x + 8, apple.y - apple.size - 5, 8, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBasket() {
    const ctx = this.ctx;
    const x = this.basketX;
    const y = this.height - this.basketHeight - 20;

    // Basket body
    ctx.fillStyle = "#D2691E";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10, y + this.basketHeight);
    ctx.lineTo(x + this.basketWidth - 10, y + this.basketHeight);
    ctx.lineTo(x + this.basketWidth, y);
    ctx.closePath();
    ctx.fill();

    // Weave pattern
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const py = y + 10 + i * 12;
      ctx.beginPath();
      ctx.moveTo(x + 5, py);
      ctx.lineTo(x + this.basketWidth - 5, py);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const px = x + 10 + i * 12;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + (i < 3 ? 2 : -2), y + this.basketHeight);
      ctx.stroke();
    }

    // Rim
    ctx.fillStyle = "#A0522D";
    ctx.fillRect(x - 5, y - 5, this.basketWidth + 10, 8);
  }
}
