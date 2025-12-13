/**
 * Snake Game Engine
 * Game #151
 *
 * Classic snake game - eat food, grow longer, don't hit walls!
 */

interface Point {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right";

interface GameState {
  score: number;
  highScore: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;
const MIN_SPEED = 50;

export class SnakeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private snake: Point[] = [];
  private food: Point = { x: 0, y: 0 };
  private direction: Direction = "right";
  private nextDirection: Direction = "right";
  private gridWidth = 0;
  private gridHeight = 0;
  private cellSize = 0;
  private score = 0;
  private highScore = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private gameInterval: number | null = null;
  private speed = INITIAL_SPEED;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("snake_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("snake_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
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

    this.cellSize = Math.floor(size / GRID_SIZE);
    this.gridWidth = GRID_SIZE;
    this.gridHeight = GRID_SIZE;

    this.draw();
  }

  start() {
    this.score = 0;
    this.speed = INITIAL_SPEED;
    this.direction = "right";
    this.nextDirection = "right";

    // Initialize snake in center
    const centerX = Math.floor(this.gridWidth / 2);
    const centerY = Math.floor(this.gridHeight / 2);
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ];

    this.spawnFood();
    this.status = "playing";
    this.emitState();
    this.startGameLoop();
  }

  private startGameLoop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    this.gameInterval = window.setInterval(() => this.update(), this.speed);
  }

  private spawnFood() {
    const available: Point[] = [];
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const occupied = this.snake.some((s) => s.x === x && s.y === y);
        if (!occupied) {
          available.push({ x, y });
        }
      }
    }
    if (available.length > 0) {
      this.food = available[Math.floor(Math.random() * available.length)];
    }
  }

  setDirection(dir: Direction) {
    if (this.status !== "playing") return;

    // Prevent reversing
    const opposites: Record<Direction, Direction> = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };

    if (opposites[dir] !== this.direction) {
      this.nextDirection = dir;
    }
  }

  private update() {
    if (this.status !== "playing") return;

    this.direction = this.nextDirection;

    // Calculate new head position
    const head = this.snake[0];
    let newHead: Point;

    switch (this.direction) {
      case "up":
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case "down":
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case "left":
        newHead = { x: head.x - 1, y: head.y };
        break;
      case "right":
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= this.gridWidth ||
      newHead.y < 0 ||
      newHead.y >= this.gridHeight
    ) {
      this.gameOver();
      return;
    }

    // Check self collision
    if (this.snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      this.gameOver();
      return;
    }

    // Move snake
    this.snake.unshift(newHead);

    // Check food collision
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }
      this.emitState();
      this.spawnFood();

      // Speed up
      if (this.speed > MIN_SPEED) {
        this.speed = Math.max(MIN_SPEED, this.speed - SPEED_INCREMENT);
        this.startGameLoop();
      }
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  private gameOver() {
    this.status = "over";
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, h);
      ctx.stroke();
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(w, y * this.cellSize);
      ctx.stroke();
    }

    // Draw food
    this.drawFood();

    // Draw snake
    this.drawSnake();
  }

  private drawFood() {
    const ctx = this.ctx;
    const x = this.food.x * this.cellSize + this.cellSize / 2;
    const y = this.food.y * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.4;

    // Apple shape
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(x - 2, y - radius - 4, 4, 6);

    // Leaf
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.ellipse(x + 4, y - radius - 2, 5, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSnake() {
    const ctx = this.ctx;
    const padding = 2;

    for (let i = this.snake.length - 1; i >= 0; i--) {
      const segment = this.snake[i];
      const x = segment.x * this.cellSize + padding;
      const y = segment.y * this.cellSize + padding;
      const size = this.cellSize - padding * 2;

      const isHead = i === 0;

      // Body color gradient
      const brightness = 100 - (i / this.snake.length) * 30;
      ctx.fillStyle = isHead ? "#00b894" : `hsl(168, 76%, ${brightness}%)`;

      // Rounded rectangle
      const radius = size * 0.3;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();

      // Head features
      if (isHead) {
        // Eyes
        ctx.fillStyle = "white";
        const eyeSize = size * 0.15;
        const eyeOffset = size * 0.25;

        let eye1X = x + size / 2;
        let eye1Y = y + size / 2;
        let eye2X = x + size / 2;
        let eye2Y = y + size / 2;

        switch (this.direction) {
          case "up":
            eye1X = x + eyeOffset;
            eye2X = x + size - eyeOffset;
            eye1Y = eye2Y = y + eyeOffset;
            break;
          case "down":
            eye1X = x + eyeOffset;
            eye2X = x + size - eyeOffset;
            eye1Y = eye2Y = y + size - eyeOffset;
            break;
          case "left":
            eye1X = eye2X = x + eyeOffset;
            eye1Y = y + eyeOffset;
            eye2Y = y + size - eyeOffset;
            break;
          case "right":
            eye1X = eye2X = x + size - eyeOffset;
            eye1Y = y + eyeOffset;
            eye2Y = y + size - eyeOffset;
            break;
        }

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = "#2d3436";
        const pupilSize = eyeSize * 0.6;
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, pupilSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, pupilSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  destroy() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
  }
}
