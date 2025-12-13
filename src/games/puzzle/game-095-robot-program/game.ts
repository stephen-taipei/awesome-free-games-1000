/**
 * Robot Program Game Engine
 * Game #095 - Visual programming to control a robot
 */

export type Command = "up" | "down" | "left" | "right";
export type CellType = "empty" | "wall" | "goal" | "hazard";

export interface LevelConfig {
  grid: string[];
  start: { x: number; y: number };
  maxCommands: number;
}

export class RobotProgramGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private grid: CellType[][] = [];
  private gridSize = 6;
  private cellSize = 0;

  private robotPos = { x: 0, y: 0 };
  private startPos = { x: 0, y: 0 };
  private goalPos = { x: 0, y: 0 };

  private commands: Command[] = [];
  private maxCommands = 5;
  private executingIndex = -1;

  private currentLevel = 0;
  private status: "idle" | "running" | "won" | "failed" = "idle";
  private animationId = 0;

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Simple straight path
    {
      grid: [
        "......",
        ".S...G",
        "......",
        "......",
        "......",
        "......",
      ],
      start: { x: 1, y: 1 },
      maxCommands: 4,
    },
    // Level 2 - Turn
    {
      grid: [
        "......",
        ".S....",
        ".....G",
        "......",
        "......",
        "......",
      ],
      start: { x: 1, y: 1 },
      maxCommands: 5,
    },
    // Level 3 - Obstacle
    {
      grid: [
        "......",
        ".S.#..",
        "...#.G",
        "...#..",
        "......",
        "......",
      ],
      start: { x: 1, y: 1 },
      maxCommands: 6,
    },
    // Level 4 - Maze
    {
      grid: [
        ".S....",
        "####..",
        ".....#",
        ".###..",
        "....G.",
        "......",
      ],
      start: { x: 1, y: 0 },
      maxCommands: 10,
    },
    // Level 5 - Complex
    {
      grid: [
        "S.....",
        ".####.",
        "....#.",
        ".##.#.",
        ".#..#.",
        ".#G...",
      ],
      start: { x: 0, y: 0 },
      maxCommands: 12,
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.commands = [];
    this.executingIndex = -1;
    this.status = "idle";
    this.loadLevel(this.currentLevel);
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.maxCommands = config.maxCommands;
    this.gridSize = config.grid.length;

    this.grid = [];
    for (let y = 0; y < config.grid.length; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < config.grid[y].length; x++) {
        const char = config.grid[y][x];
        switch (char) {
          case "#":
            row.push("wall");
            break;
          case "S":
            row.push("empty");
            this.startPos = { x, y };
            this.robotPos = { x, y };
            break;
          case "G":
            row.push("goal");
            this.goalPos = { x, y };
            break;
          case "X":
            row.push("hazard");
            break;
          default:
            row.push("empty");
        }
      }
      this.grid.push(row);
    }

    if (this.onStateChange) {
      this.onStateChange({
        commands: `${this.commands.length}/${this.maxCommands}`,
      });
    }
  }

  public addCommand(cmd: Command): boolean {
    if (this.status === "running") return false;
    if (this.commands.length >= this.maxCommands) return false;

    this.commands.push(cmd);

    if (this.onStateChange) {
      this.onStateChange({
        commands: `${this.commands.length}/${this.maxCommands}`,
        commandList: [...this.commands],
      });
    }

    return true;
  }

  public removeCommand(index: number) {
    if (this.status === "running") return;

    this.commands.splice(index, 1);

    if (this.onStateChange) {
      this.onStateChange({
        commands: `${this.commands.length}/${this.maxCommands}`,
        commandList: [...this.commands],
      });
    }
  }

  public clearCommands() {
    if (this.status === "running") return;

    this.commands = [];

    if (this.onStateChange) {
      this.onStateChange({
        commands: `${this.commands.length}/${this.maxCommands}`,
        commandList: [],
      });
    }
  }

  public async run() {
    if (this.status === "running" || this.commands.length === 0) return;

    this.status = "running";
    this.robotPos = { ...this.startPos };
    this.executingIndex = -1;

    for (let i = 0; i < this.commands.length; i++) {
      this.executingIndex = i;

      if (this.onStateChange) {
        this.onStateChange({ executingIndex: i });
      }

      const cmd = this.commands[i];
      const moved = await this.executeCommand(cmd);

      if (!moved) {
        // Hit a wall
        this.status = "failed";
        if (this.onStateChange) {
          this.onStateChange({ status: "failed" });
        }
        return;
      }

      // Check if reached goal
      if (this.robotPos.x === this.goalPos.x && this.robotPos.y === this.goalPos.y) {
        this.status = "won";
        if (this.onStateChange) {
          this.onStateChange({ status: "won", level: this.currentLevel });
        }
        return;
      }
    }

    // Ran out of commands without reaching goal
    this.status = "failed";
    if (this.onStateChange) {
      this.onStateChange({ status: "failed" });
    }
  }

  private executeCommand(cmd: Command): Promise<boolean> {
    return new Promise((resolve) => {
      const delta = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };

      const d = delta[cmd];
      const newX = this.robotPos.x + d.x;
      const newY = this.robotPos.y + d.y;

      // Check bounds
      if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
        this.draw();
        setTimeout(() => resolve(false), 300);
        return;
      }

      // Check wall
      if (this.grid[newY][newX] === "wall") {
        this.draw();
        setTimeout(() => resolve(false), 300);
        return;
      }

      // Animate movement
      const startX = this.robotPos.x;
      const startY = this.robotPos.y;
      const steps = 10;
      let step = 0;

      const animate = () => {
        step++;
        const progress = step / steps;
        this.robotPos.x = startX + d.x * progress;
        this.robotPos.y = startY + d.y * progress;
        this.draw();

        if (step < steps) {
          requestAnimationFrame(animate);
        } else {
          this.robotPos.x = newX;
          this.robotPos.y = newY;
          this.draw();
          setTimeout(() => resolve(true), 100);
        }
      };

      animate();
    });
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.cellSize = Math.min(w, h) / this.gridSize;

    // Clear
    ctx.fillStyle = "#151525";
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        this.drawCell(ctx, cell, px, py, x, y);
      }
    }

    // Draw start marker
    const sx = this.startPos.x * this.cellSize + this.cellSize / 2;
    const sy = this.startPos.y * this.cellSize + this.cellSize / 2;
    ctx.fillStyle = "rgba(0, 217, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(sx, sy, this.cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Draw robot
    this.drawRobot(ctx);
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    cell: CellType,
    px: number,
    py: number,
    gx: number,
    gy: number
  ) {
    const size = this.cellSize;
    const padding = 2;

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, size, size);

    switch (cell) {
      case "wall":
        ctx.fillStyle = "#2d3436";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Metallic effect
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, (size - padding * 2) / 3);
        break;

      case "goal":
        // Goal circle
        ctx.fillStyle = "#2ecc71";
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Inner ring
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "hazard":
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        ctx.fillStyle = "#c0392b";
        ctx.font = `${size * 0.5}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", px + size / 2, py + size / 2);
        break;
    }
  }

  private drawRobot(ctx: CanvasRenderingContext2D) {
    const x = this.robotPos.x * this.cellSize + this.cellSize / 2;
    const y = this.robotPos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;

    // Glow
    ctx.shadowColor = "#00d9ff";
    ctx.shadowBlur = 15;

    // Body
    ctx.fillStyle = "#00d9ff";
    ctx.beginPath();
    ctx.roundRect(x - size, y - size, size * 2, size * 2, size * 0.3);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Face
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(x - size * 0.7, y - size * 0.4, size * 1.4, size * 0.6);

    // Eyes
    ctx.fillStyle = "#00d9ff";
    ctx.beginPath();
    ctx.arc(x - size * 0.35, y - size * 0.1, size * 0.15, 0, Math.PI * 2);
    ctx.arc(x + size * 0.35, y - size * 0.1, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Antenna
    ctx.strokeStyle = "#00d9ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y - size * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - size * 1.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.canvas.width = size;
      this.canvas.height = size;
      this.draw();
    }
  }

  public reset() {
    this.robotPos = { ...this.startPos };
    this.commands = [];
    this.executingIndex = -1;
    this.status = "idle";
    this.draw();

    if (this.onStateChange) {
      this.onStateChange({
        commands: `0/${this.maxCommands}`,
        commandList: [],
        executingIndex: -1,
      });
    }
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getCommands(): Command[] {
    return [...this.commands];
  }

  public getMaxCommands(): number {
    return this.maxCommands;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
