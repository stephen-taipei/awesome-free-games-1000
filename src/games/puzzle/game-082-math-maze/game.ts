/**
 * Math Maze Game Engine
 * Game #082 - Navigate maze while doing math to reach target
 */

interface Cell {
  type: "empty" | "wall" | "start" | "end" | "math";
  value?: number;
  operator?: "+" | "-" | "*" | "/";
  collected?: boolean;
}

interface Level {
  size: number;
  target: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  initialValue: number;
}

const LEVELS: Level[] = [
  { size: 5, target: 10, start: { x: 0, y: 0 }, end: { x: 4, y: 4 }, initialValue: 0 },
  { size: 6, target: 20, start: { x: 0, y: 0 }, end: { x: 5, y: 5 }, initialValue: 5 },
  { size: 7, target: 50, start: { x: 0, y: 0 }, end: { x: 6, y: 6 }, initialValue: 10 },
  { size: 7, target: 100, start: { x: 0, y: 3 }, end: { x: 6, y: 3 }, initialValue: 20 },
  { size: 8, target: 24, start: { x: 0, y: 0 }, end: { x: 7, y: 7 }, initialValue: 6 },
];

export class MathMazeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: Cell[][] = [];
  gridSize: number = 5;
  cellSize: number = 80;

  player: { x: number; y: number } = { x: 0, y: 0 };
  currentValue: number = 0;
  targetValue: number = 10;

  currentLevel: number = 0;
  status: "playing" | "won" | "lost" = "playing";

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  public loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex] || LEVELS[0];
    this.gridSize = level.size;
    this.targetValue = level.target;
    this.currentValue = level.initialValue;
    this.player = { ...level.start };

    this.generateMaze(level);
    this.status = "playing";
    this.notifyState();
  }

  private generateMaze(level: Level) {
    // Initialize empty grid
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = { type: "empty" };
      }
    }

    // Set start and end
    this.grid[level.start.y][level.start.x] = { type: "start" };
    this.grid[level.end.y][level.end.x] = { type: "end" };

    // Generate walls (simple pattern)
    const wallCount = Math.floor(this.gridSize * this.gridSize * 0.15);
    for (let i = 0; i < wallCount; i++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);

      if (
        this.grid[y][x].type === "empty" &&
        !(x === level.start.x && y === level.start.y) &&
        !(x === level.end.x && y === level.end.y)
      ) {
        this.grid[y][x] = { type: "wall" };
      }
    }

    // Add math operations
    const operators: ("+" | "-" | "*")[] = ["+", "-", "*"];
    const mathCount = Math.floor(this.gridSize * this.gridSize * 0.3);

    for (let i = 0; i < mathCount; i++) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);

      if (
        this.grid[y][x].type === "empty" &&
        !(x === level.start.x && y === level.start.y) &&
        !(x === level.end.x && y === level.end.y)
      ) {
        const op = operators[Math.floor(Math.random() * operators.length)];
        let value: number;

        if (op === "+") {
          value = 1 + Math.floor(Math.random() * 10);
        } else if (op === "-") {
          value = 1 + Math.floor(Math.random() * 5);
        } else {
          value = 2 + Math.floor(Math.random() * 3);
        }

        this.grid[y][x] = {
          type: "math",
          operator: op,
          value,
          collected: false,
        };
      }
    }

    // Ensure path exists (simple check - not perfect but works for small grids)
    this.ensurePath(level.start, level.end);
  }

  private ensurePath(start: { x: number; y: number }, end: { x: number; y: number }) {
    // Simple path clearing - clear a basic path
    let x = start.x;
    let y = start.y;

    while (x !== end.x || y !== end.y) {
      if (x < end.x && this.grid[y][x + 1]?.type === "wall") {
        this.grid[y][x + 1] = { type: "empty" };
      }
      if (y < end.y && this.grid[y + 1]?.[x]?.type === "wall") {
        this.grid[y + 1][x] = { type: "empty" };
      }

      if (x < end.x) x++;
      else if (y < end.y) y++;
    }
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public move(direction: "up" | "down" | "left" | "right") {
    if (this.status !== "playing") return;

    let newX = this.player.x;
    let newY = this.player.y;

    switch (direction) {
      case "up":
        newY--;
        break;
      case "down":
        newY++;
        break;
      case "left":
        newX--;
        break;
      case "right":
        newX++;
        break;
    }

    // Check bounds
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      return;
    }

    // Check wall
    if (this.grid[newY][newX].type === "wall") {
      return;
    }

    // Move player
    this.player.x = newX;
    this.player.y = newY;

    // Check cell content
    const cell = this.grid[newY][newX];

    if (cell.type === "math" && !cell.collected) {
      // Apply math operation
      if (cell.operator && cell.value !== undefined) {
        switch (cell.operator) {
          case "+":
            this.currentValue += cell.value;
            break;
          case "-":
            this.currentValue -= cell.value;
            break;
          case "*":
            this.currentValue *= cell.value;
            break;
          case "/":
            this.currentValue = Math.floor(this.currentValue / cell.value);
            break;
        }
        cell.collected = true;
      }
    }

    // Check if reached end
    if (cell.type === "end") {
      if (this.currentValue === this.targetValue) {
        this.status = "won";
      } else {
        this.status = "lost";
      }
    }

    this.notifyState();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate cell size
    this.cellSize = Math.min(
      this.canvas.width / this.gridSize,
      this.canvas.height / this.gridSize
    );

    const offsetX = (this.canvas.width - this.cellSize * this.gridSize) / 2;
    const offsetY = (this.canvas.height - this.cellSize * this.gridSize) / 2;

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const cx = offsetX + x * this.cellSize;
        const cy = offsetY + y * this.cellSize;

        this.drawCell(cx, cy, cell);
      }
    }

    // Draw player
    const px = offsetX + this.player.x * this.cellSize + this.cellSize / 2;
    const py = offsetY + this.player.y * this.cellSize + this.cellSize / 2;

    this.ctx.fillStyle = "#fdcb6e";
    this.ctx.beginPath();
    this.ctx.arc(px, py, this.cellSize * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#f39c12";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw face
    this.ctx.fillStyle = "#2d3436";
    this.ctx.beginPath();
    this.ctx.arc(px - 8, py - 5, 3, 0, Math.PI * 2);
    this.ctx.arc(px + 8, py - 5, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(px, py + 5, 8, 0, Math.PI);
    this.ctx.stroke();
  }

  private drawCell(x: number, y: number, cell: Cell) {
    const padding = 2;

    switch (cell.type) {
      case "empty":
        this.ctx.fillStyle = "#636e72";
        this.ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2);
        break;

      case "wall":
        this.ctx.fillStyle = "#2d3436";
        this.ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2);
        break;

      case "start":
        this.ctx.fillStyle = "#00b894";
        this.ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2);
        this.ctx.fillStyle = "white";
        this.ctx.font = `${this.cellSize * 0.4}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("S", x + this.cellSize / 2, y + this.cellSize / 2);
        break;

      case "end":
        this.ctx.fillStyle = "#e17055";
        this.ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2);
        this.ctx.fillStyle = "white";
        this.ctx.font = `bold ${this.cellSize * 0.35}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("🏁", x + this.cellSize / 2, y + this.cellSize / 2);
        break;

      case "math":
        if (cell.collected) {
          this.ctx.fillStyle = "#636e72";
        } else {
          this.ctx.fillStyle = "#74b9ff";
        }
        this.ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2);

        if (!cell.collected && cell.operator && cell.value !== undefined) {
          this.ctx.fillStyle = "white";
          this.ctx.font = `bold ${this.cellSize * 0.35}px Arial`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(
            `${cell.operator}${cell.value}`,
            x + this.cellSize / 2,
            y + this.cellSize / 2
          );
        }
        break;
    }
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.loop();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, 400);
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    if (this.status !== "playing") {
      this.status = "playing";
      this.loop();
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        currentValue: this.currentValue,
        targetValue: this.targetValue,
        level: this.currentLevel + 1,
        maxLevel: LEVELS.length,
        status: this.status,
      });
    }
  }
}
