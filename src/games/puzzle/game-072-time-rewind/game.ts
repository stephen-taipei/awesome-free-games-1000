/**
 * Time Rewind Game
 * Game #072 - Rewind time to solve puzzles
 */

export type CellType = "empty" | "wall" | "goal" | "spike" | "key" | "door";

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  playerPos: Position;
  hasKey: boolean;
  doorOpen: boolean;
}

export interface Level {
  id: number;
  grid: CellType[][];
  playerStart: Position;
  goalPos: Position;
  maxRewinds: number;
}

const LEVELS: Level[] = [
  {
    id: 1,
    grid: [
      ["empty", "empty", "empty", "empty", "goal"],
      ["empty", "wall", "wall", "wall", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "wall", "wall", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    playerStart: { x: 0, y: 4 },
    goalPos: { x: 4, y: 0 },
    maxRewinds: 3,
  },
  {
    id: 2,
    grid: [
      ["empty", "empty", "spike", "empty", "goal"],
      ["empty", "wall", "empty", "wall", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["spike", "wall", "wall", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    playerStart: { x: 0, y: 4 },
    goalPos: { x: 4, y: 0 },
    maxRewinds: 5,
  },
  {
    id: 3,
    grid: [
      ["empty", "wall", "empty", "door", "goal"],
      ["empty", "wall", "empty", "wall", "empty"],
      ["key", "empty", "empty", "empty", "empty"],
      ["wall", "wall", "spike", "wall", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    playerStart: { x: 0, y: 4 },
    goalPos: { x: 4, y: 0 },
    maxRewinds: 5,
  },
  {
    id: 4,
    grid: [
      ["empty", "spike", "empty", "empty", "goal"],
      ["empty", "wall", "wall", "spike", "empty"],
      ["key", "empty", "empty", "wall", "door"],
      ["wall", "spike", "empty", "empty", "empty"],
      ["empty", "empty", "wall", "empty", "empty"],
    ],
    playerStart: { x: 0, y: 4 },
    goalPos: { x: 4, y: 0 },
    maxRewinds: 7,
  },
  {
    id: 5,
    grid: [
      ["empty", "wall", "spike", "empty", "goal"],
      ["key", "wall", "empty", "spike", "door"],
      ["empty", "empty", "wall", "empty", "empty"],
      ["spike", "empty", "wall", "spike", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    playerStart: { x: 0, y: 4 },
    goalPos: { x: 4, y: 0 },
    maxRewinds: 10,
  },
];

export class TimeRewindGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  grid: CellType[][] = [];
  gridSize: number = 5;
  cellSize: number = 70;

  playerPos: Position = { x: 0, y: 0 };
  goalPos: Position = { x: 0, y: 0 };
  hasKey: boolean = false;
  doorOpen: boolean = false;

  history: GameState[] = [];
  rewindsUsed: number = 0;
  maxRewinds: number = 3;
  isRewinding: boolean = false;
  rewindIndex: number = 0;

  status: "playing" | "won" | "dead" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  colors = {
    empty: "#ecf0f1",
    wall: "#34495e",
    goal: "#27ae60",
    spike: "#e74c3c",
    key: "#f1c40f",
    door: "#8e44ad",
    player: "#3498db",
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({ status: "complete", level: levelIndex + 1 });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.grid.length;
    this.grid = level.grid.map(row => [...row]);
    this.playerPos = { ...level.playerStart };
    this.goalPos = { ...level.goalPos };
    this.hasKey = false;
    this.doorOpen = false;
    this.history = [];
    this.rewindsUsed = 0;
    this.maxRewinds = level.maxRewinds;
    this.isRewinding = false;
    this.status = "playing";

    this.saveState();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        rewinds: this.maxRewinds - this.rewindsUsed,
      });
    }
  }

  private saveState() {
    this.history.push({
      playerPos: { ...this.playerPos },
      hasKey: this.hasKey,
      doorOpen: this.doorOpen,
    });
  }

  private loop = () => {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private update() {
    if (this.isRewinding && this.history.length > 1) {
      this.rewindIndex++;
      if (this.rewindIndex % 3 === 0) {
        this.history.pop();
        const prevState = this.history[this.history.length - 1];
        if (prevState) {
          this.playerPos = { ...prevState.playerPos };
          this.hasKey = prevState.hasKey;
          this.doorOpen = prevState.doorOpen;
        }
      }

      if (this.history.length <= 1) {
        this.isRewinding = false;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    // Background with time effect
    if (this.isRewinding) {
      ctx.fillStyle = `rgba(147, 112, 219, ${0.3 + Math.sin(Date.now() / 100) * 0.1})`;
    } else {
      ctx.fillStyle = "#2c3e50";
    }
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const px = offsetX + x * this.cellSize;
        const py = offsetY + y * this.cellSize;

        // Cell background
        ctx.fillStyle = this.colors.empty;
        ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);

        // Draw cell content
        this.drawCell(cell, px, py, x, y);
      }
    }

    // Draw player
    this.drawPlayer(offsetX, offsetY);

    // Rewind effect overlay
    if (this.isRewinding) {
      ctx.fillStyle = "rgba(147, 112, 219, 0.3)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⏪ REWINDING...", this.canvas.width / 2, 30);
    }
  }

  private drawCell(cell: CellType, px: number, py: number, gx: number, gy: number) {
    const ctx = this.ctx;
    const cx = px + this.cellSize / 2;
    const cy = py + this.cellSize / 2;

    switch (cell) {
      case "wall":
        ctx.fillStyle = this.colors.wall;
        ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
        break;

      case "goal":
        ctx.fillStyle = this.colors.goal;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", cx, cy);
        break;

      case "spike":
        ctx.fillStyle = this.colors.spike;
        ctx.beginPath();
        ctx.moveTo(cx, py + 10);
        ctx.lineTo(px + 10, py + this.cellSize - 10);
        ctx.lineTo(px + this.cellSize - 10, py + this.cellSize - 10);
        ctx.closePath();
        ctx.fill();
        break;

      case "key":
        if (!this.hasKey) {
          ctx.fillStyle = this.colors.key;
          ctx.font = "30px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🔑", cx, cy);
        }
        break;

      case "door":
        if (!this.doorOpen) {
          ctx.fillStyle = this.colors.door;
          ctx.fillRect(px + 10, py + 5, this.cellSize - 20, this.cellSize - 10);
          ctx.fillStyle = "#c39bd3";
          ctx.beginPath();
          ctx.arc(px + this.cellSize - 20, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = this.colors.door;
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 10, py + 5, this.cellSize - 20, this.cellSize - 10);
        }
        break;
    }
  }

  private drawPlayer(offsetX: number, offsetY: number) {
    const ctx = this.ctx;
    const px = offsetX + this.playerPos.x * this.cellSize + this.cellSize / 2;
    const py = offsetY + this.playerPos.y * this.cellSize + this.cellSize / 2;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(px, py + 22, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Time aura when has key
    if (this.hasKey) {
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 25, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player body
    ctx.fillStyle = this.isRewinding ? "#9b59b6" : this.colors.player;
    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px - 5, py - 3, 4, 0, Math.PI * 2);
    ctx.arc(px + 5, py - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(px - 5, py - 3, 2, 0, Math.PI * 2);
    ctx.arc(px + 5, py - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  public move(direction: "up" | "down" | "left" | "right") {
    if (this.status !== "playing" || this.isRewinding) return;

    const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;

    const newX = this.playerPos.x + dx;
    const newY = this.playerPos.y + dy;

    // Check bounds
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) return;

    const targetCell = this.grid[newY][newX];

    // Check wall
    if (targetCell === "wall") return;

    // Check door
    if (targetCell === "door" && !this.doorOpen) return;

    // Move
    this.playerPos.x = newX;
    this.playerPos.y = newY;

    // Check key
    if (targetCell === "key" && !this.hasKey) {
      this.hasKey = true;
      this.doorOpen = true;
    }

    // Check spike
    if (targetCell === "spike") {
      this.status = "dead";
      setTimeout(() => {
        this.rewind();
        this.status = "playing";
      }, 500);
      return;
    }

    // Check goal
    if (newX === this.goalPos.x && newY === this.goalPos.y) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          rewinds: this.maxRewinds - this.rewindsUsed,
        });
      }
      return;
    }

    this.saveState();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: this.currentLevel + 1,
        rewinds: this.maxRewinds - this.rewindsUsed,
      });
    }
  }

  public rewind() {
    if (this.status === "won" || this.status === "complete") return;
    if (this.rewindsUsed >= this.maxRewinds) return;
    if (this.history.length <= 1) return;

    this.rewindsUsed++;
    this.isRewinding = true;
    this.rewindIndex = 0;

    setTimeout(() => {
      this.isRewinding = false;
      if (this.onStateChange) {
        this.onStateChange({
          status: "playing",
          level: this.currentLevel + 1,
          rewinds: this.maxRewinds - this.rewindsUsed,
        });
      }
    }, 800);
  }

  public nextLevel() {
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public restart() {
    this.currentLevel = 0;
    this.loadLevel(0);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(450, rect.width);
      this.canvas.height = 450;
      this.cellSize = Math.min(70, (this.canvas.width - 40) / this.gridSize);
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
