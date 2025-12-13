/**
 * Digger Game Logic
 * Game #182 - Underground Mining Game
 */

type CellType = "empty" | "dirt" | "rock" | "gold" | "diamond" | "fuel" | "player";

interface GameState {
  depth: number;
  fuel: number;
  score: number;
  status: "idle" | "playing" | "gameOver";
}

type StateChangeCallback = (state: GameState) => void;

const CELL_SIZE = 30;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 20;
const MAX_FUEL = 100;

export class DiggerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private grid: CellType[][] = [];
  private playerX: number = 7;
  private playerY: number = 0;
  private depth: number = 0;
  private fuel: number = MAX_FUEL;
  private score: number = 0;
  private isPlaying: boolean = false;
  private viewOffsetY: number = 0;

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
    this.draw();
  }

  private initGrid() {
    this.grid = [];
    this.playerX = Math.floor(GRID_WIDTH / 2);
    this.playerY = 0;
    this.depth = 0;
    this.fuel = MAX_FUEL;
    this.score = 0;
    this.viewOffsetY = 0;

    // Generate terrain
    for (let y = 0; y < 100; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (y === 0) {
          row.push(x === this.playerX ? "player" : "empty");
        } else {
          row.push(this.generateCell(y));
        }
      }
      this.grid.push(row);
    }

    this.emitState();
  }

  private generateCell(depth: number): CellType {
    const rand = Math.random();
    const depthFactor = Math.min(depth / 50, 1);

    // More valuable items deeper
    if (rand < 0.03 * depthFactor) return "diamond";
    if (rand < 0.08 + 0.05 * depthFactor) return "gold";
    if (rand < 0.12) return "fuel";
    if (rand < 0.20 + 0.1 * depthFactor) return "rock";
    return "dirt";
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        depth: this.depth,
        fuel: Math.floor(this.fuel),
        score: this.score,
        status: this.getStatus(),
      });
    }
  }

  private getStatus(): "idle" | "playing" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (this.fuel <= 0) return "gameOver";
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.initGrid();
    this.draw();
  }

  reset() {
    this.initGrid();
    this.draw();
  }

  move(dx: number, dy: number) {
    if (!this.isPlaying || this.fuel <= 0) return;

    const newX = this.playerX + dx;
    const newY = this.playerY + dy;

    if (newX < 0 || newX >= GRID_WIDTH) return;
    if (newY < 0 || newY >= this.grid.length) return;

    const targetCell = this.grid[newY][newX];

    if (targetCell === "rock") return;

    // Process cell
    if (targetCell === "gold") {
      this.score += 10;
    } else if (targetCell === "diamond") {
      this.score += 50;
    } else if (targetCell === "fuel") {
      this.fuel = Math.min(MAX_FUEL, this.fuel + 20);
    }

    // Move player
    this.grid[this.playerY][this.playerX] = "empty";
    this.playerX = newX;
    this.playerY = newY;
    this.grid[newY][newX] = "player";

    // Update depth
    this.depth = Math.max(this.depth, this.playerY);

    // Consume fuel
    this.fuel -= dy > 0 ? 0.5 : 1; // Less fuel going down

    // Extend grid if needed
    if (this.playerY > this.grid.length - 10) {
      for (let i = 0; i < 20; i++) {
        const row: CellType[] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
          row.push(this.generateCell(this.grid.length));
        }
        this.grid.push(row);
      }
    }

    // Update view
    const visibleRows = Math.floor(this.height / CELL_SIZE);
    if (this.playerY > this.viewOffsetY + visibleRows - 5) {
      this.viewOffsetY = this.playerY - visibleRows + 5;
    }
    if (this.playerY < this.viewOffsetY + 3 && this.viewOffsetY > 0) {
      this.viewOffsetY = Math.max(0, this.playerY - 3);
    }

    this.draw();
    this.emitState();
  }

  handleKey(key: string) {
    switch (key) {
      case "ArrowUp":
      case "w":
      case "W":
        this.move(0, -1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        this.move(0, 1);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        this.move(-1, 0);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.move(1, 0);
        break;
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Sky background
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.grid.length === 0) {
      ctx.fillStyle = "#8B4513";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Digger", this.width / 2, this.height / 2);
      return;
    }

    const gridWidth = GRID_WIDTH * CELL_SIZE;
    const offsetX = (this.width - gridWidth) / 2;
    const visibleRows = Math.ceil(this.height / CELL_SIZE) + 1;

    // Draw visible cells
    for (let vy = 0; vy < visibleRows; vy++) {
      const y = vy + Math.floor(this.viewOffsetY);
      if (y < 0 || y >= this.grid.length) continue;

      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y][x];
        const px = offsetX + x * CELL_SIZE;
        const py = (vy - (this.viewOffsetY % 1)) * CELL_SIZE;

        this.drawCell(px, py, cell, y);
      }
    }

    // Draw fuel bar
    this.drawFuelBar();
  }

  private drawCell(x: number, y: number, cell: CellType, depth: number) {
    const ctx = this.ctx;

    // Background based on depth
    if (depth === 0) {
      ctx.fillStyle = "#87CEEB"; // Sky
    } else {
      const brown = Math.max(60, 139 - depth * 2);
      ctx.fillStyle = `rgb(${brown + 20}, ${brown - 30}, ${Math.max(0, brown - 50)})`;
    }
    ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);

    switch (cell) {
      case "dirt":
        this.drawDirt(x, y);
        break;
      case "rock":
        this.drawRock(x, y);
        break;
      case "gold":
        this.drawGold(x, y);
        break;
      case "diamond":
        this.drawDiamond(x, y);
        break;
      case "fuel":
        this.drawFuel(x, y);
        break;
      case "player":
        this.drawPlayer(x, y);
        break;
    }
  }

  private drawDirt(x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 5, CELL_SIZE - 5);

    // Texture
    ctx.fillStyle = "#6B3513";
    for (let i = 0; i < 3; i++) {
      const dx = Math.random() * (CELL_SIZE - 10) + 5;
      const dy = Math.random() * (CELL_SIZE - 10) + 5;
      ctx.fillRect(x + dx, y + dy, 3, 3);
    }
  }

  private drawRock(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    ctx.fillStyle = "#696969";
    ctx.beginPath();
    ctx.moveTo(cx, y + 3);
    ctx.lineTo(x + CELL_SIZE - 3, cy);
    ctx.lineTo(cx, y + CELL_SIZE - 3);
    ctx.lineTo(x + 3, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#808080";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI, true);
    ctx.fill();
  }

  private drawGold(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    // Dirt background
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 5, CELL_SIZE - 5);

    // Gold nugget
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFA500";
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDiamond(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    // Dirt background
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 5, CELL_SIZE - 5);

    // Diamond shape
    ctx.fillStyle = "#00FFFF";
    ctx.beginPath();
    ctx.moveTo(cx, y + 5);
    ctx.lineTo(x + CELL_SIZE - 5, cy);
    ctx.lineTo(cx, y + CELL_SIZE - 5);
    ctx.lineTo(x + 5, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#E0FFFF";
    ctx.beginPath();
    ctx.moveTo(cx, y + 8);
    ctx.lineTo(x + CELL_SIZE - 10, cy);
    ctx.lineTo(cx, y + CELL_SIZE - 8);
    ctx.lineTo(x + 10, cy);
    ctx.closePath();
    ctx.fill();
  }

  private drawFuel(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    // Dirt background
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 5, CELL_SIZE - 5);

    // Fuel can
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(cx - 8, cy - 8, 16, 16);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", cx, cy);
  }

  private drawPlayer(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;

    // Drill machine
    ctx.fillStyle = "#FF8C00";
    ctx.fillRect(cx - 10, cy - 8, 20, 16);

    // Cabin
    ctx.fillStyle = "#4169E1";
    ctx.fillRect(cx - 6, cy - 12, 12, 8);

    // Window
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(cx - 4, cy - 10, 8, 4);

    // Drill
    ctx.fillStyle = "#C0C0C0";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx - 5, cy + 16);
    ctx.lineTo(cx + 5, cy + 16);
    ctx.closePath();
    ctx.fill();

    // Treads
    ctx.fillStyle = "#333";
    ctx.fillRect(cx - 12, cy + 6, 24, 4);
  }

  private drawFuelBar() {
    const ctx = this.ctx;
    const barWidth = 150;
    const barHeight = 15;
    const x = this.width - barWidth - 15;
    const y = 15;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    // Fuel level
    const fuelWidth = (this.fuel / MAX_FUEL) * barWidth;
    const fuelColor = this.fuel > 30 ? "#00FF00" : this.fuel > 15 ? "#FFFF00" : "#FF0000";
    ctx.fillStyle = fuelColor;
    ctx.fillRect(x, y, fuelWidth, barHeight);

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }
}
