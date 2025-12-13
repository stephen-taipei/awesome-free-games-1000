/**
 * Mirror World Game
 * Game #068 - Control mirrored characters simultaneously
 */

export type CellType = "empty" | "wall" | "goal" | "player";

export interface Level {
  id: number;
  leftGrid: CellType[][];
  rightGrid: CellType[][];
  leftPlayer: { x: number; y: number };
  rightPlayer: { x: number; y: number };
  leftGoal: { x: number; y: number };
  rightGoal: { x: number; y: number };
}

const LEVELS: Level[] = [
  // Level 1: Simple mirror
  {
    id: 1,
    leftGrid: [
      ["empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "goal"],
      ["empty", "empty", "empty", "empty"],
      ["player", "empty", "empty", "empty"],
    ],
    rightGrid: [
      ["empty", "empty", "empty", "empty"],
      ["goal", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "player"],
    ],
    leftPlayer: { x: 0, y: 3 },
    rightPlayer: { x: 3, y: 3 },
    leftGoal: { x: 3, y: 1 },
    rightGoal: { x: 0, y: 1 },
  },
  // Level 2: With walls
  {
    id: 2,
    leftGrid: [
      ["empty", "empty", "empty", "goal"],
      ["empty", "wall", "empty", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["player", "empty", "wall", "empty"],
    ],
    rightGrid: [
      ["goal", "empty", "empty", "empty"],
      ["empty", "empty", "wall", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["empty", "wall", "empty", "player"],
    ],
    leftPlayer: { x: 0, y: 3 },
    rightPlayer: { x: 3, y: 3 },
    leftGoal: { x: 3, y: 0 },
    rightGoal: { x: 0, y: 0 },
  },
  // Level 3: Asymmetric walls
  {
    id: 3,
    leftGrid: [
      ["empty", "wall", "empty", "goal"],
      ["empty", "wall", "empty", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["player", "empty", "empty", "empty"],
    ],
    rightGrid: [
      ["goal", "empty", "wall", "empty"],
      ["empty", "empty", "wall", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "player"],
    ],
    leftPlayer: { x: 0, y: 3 },
    rightPlayer: { x: 3, y: 3 },
    leftGoal: { x: 3, y: 0 },
    rightGoal: { x: 0, y: 0 },
  },
  // Level 4: Maze
  {
    id: 4,
    leftGrid: [
      ["empty", "empty", "wall", "goal"],
      ["wall", "empty", "wall", "empty"],
      ["empty", "empty", "empty", "empty"],
      ["player", "wall", "empty", "empty"],
    ],
    rightGrid: [
      ["goal", "wall", "empty", "empty"],
      ["empty", "wall", "empty", "wall"],
      ["empty", "empty", "empty", "empty"],
      ["empty", "empty", "wall", "player"],
    ],
    leftPlayer: { x: 0, y: 3 },
    rightPlayer: { x: 3, y: 3 },
    leftGoal: { x: 3, y: 0 },
    rightGoal: { x: 0, y: 0 },
  },
  // Level 5: Complex
  {
    id: 5,
    leftGrid: [
      ["empty", "wall", "empty", "empty"],
      ["empty", "empty", "empty", "goal"],
      ["wall", "empty", "wall", "empty"],
      ["player", "empty", "empty", "empty"],
    ],
    rightGrid: [
      ["empty", "empty", "wall", "empty"],
      ["goal", "empty", "empty", "empty"],
      ["empty", "wall", "empty", "wall"],
      ["empty", "empty", "empty", "player"],
    ],
    leftPlayer: { x: 0, y: 3 },
    rightPlayer: { x: 3, y: 3 },
    leftGoal: { x: 3, y: 1 },
    rightGoal: { x: 0, y: 1 },
  },
];

export class MirrorWorldGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  gridSize: number = 4;
  cellSize: number = 60;

  leftGrid: CellType[][] = [];
  rightGrid: CellType[][] = [];
  leftPlayer: { x: number; y: number } = { x: 0, y: 0 };
  rightPlayer: { x: number; y: number } = { x: 0, y: 0 };
  leftGoal: { x: number; y: number } = { x: 0, y: 0 };
  rightGoal: { x: number; y: number } = { x: 0, y: 0 };

  moves: number = 0;
  status: "playing" | "won" | "complete" = "playing";
  animating: boolean = false;
  animProgress: number = 0;
  animFrom: { left: { x: number; y: number }; right: { x: number; y: number } } | null = null;

  onStateChange: ((state: any) => void) | null = null;

  colors = {
    empty: "#ecf0f1",
    wall: "#34495e",
    goal: "#27ae60",
    playerLeft: "#3498db",
    playerRight: "#e74c3c",
    bg: "#bdc3c7",
    mirror: "#95a5a6",
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
        this.onStateChange({ status: "complete", level: levelIndex + 1, moves: this.moves });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.leftGrid.length;

    this.leftGrid = level.leftGrid.map(row => [...row]);
    this.rightGrid = level.rightGrid.map(row => [...row]);

    this.leftPlayer = { ...level.leftPlayer };
    this.rightPlayer = { ...level.rightPlayer };
    this.leftGoal = { ...level.leftGoal };
    this.rightGoal = { ...level.rightGoal };

    this.moves = 0;
    this.status = "playing";
    this.animating = false;

    if (this.onStateChange) {
      this.onStateChange({ status: "playing", level: levelIndex + 1, moves: 0 });
    }
  }

  private loop = () => {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private update() {
    if (this.animating) {
      this.animProgress += 0.15;
      if (this.animProgress >= 1) {
        this.animating = false;
        this.animProgress = 0;
        this.animFrom = null;
        this.checkWin();
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const totalWidth = this.canvas.width;
    const halfWidth = totalWidth / 2;
    const gridPixelSize = this.gridSize * this.cellSize;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw backgrounds
    ctx.fillStyle = "#2980b9";
    ctx.fillRect(0, 0, halfWidth, this.canvas.height);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(halfWidth, 0, halfWidth, this.canvas.height);

    // Draw mirror divider
    ctx.fillStyle = this.colors.mirror;
    ctx.fillRect(halfWidth - 5, 0, 10, this.canvas.height);

    // Draw grids
    const leftOffsetX = (halfWidth - gridPixelSize) / 2;
    const rightOffsetX = halfWidth + (halfWidth - gridPixelSize) / 2;
    const offsetY = (this.canvas.height - gridPixelSize) / 2;

    this.drawGrid(this.leftGrid, leftOffsetX, offsetY, "left");
    this.drawGrid(this.rightGrid, rightOffsetX, offsetY, "right");

    // Draw players
    this.drawPlayer(leftOffsetX, offsetY, this.leftPlayer, this.colors.playerLeft, "left");
    this.drawPlayer(rightOffsetX, offsetY, this.rightPlayer, this.colors.playerRight, "right");
  }

  private drawGrid(grid: CellType[][], offsetX: number, offsetY: number, side: "left" | "right") {
    const ctx = this.ctx;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const px = offsetX + x * this.cellSize;
        const py = offsetY + y * this.cellSize;
        const cell = grid[y][x];

        // Cell background
        ctx.fillStyle = cell === "wall" ? this.colors.wall : this.colors.empty;
        ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);

        // Draw goal
        const goal = side === "left" ? this.leftGoal : this.rightGoal;
        if (x === goal.x && y === goal.y) {
          ctx.fillStyle = this.colors.goal;
          ctx.beginPath();
          ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }

    // Grid border
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, this.gridSize * this.cellSize, this.gridSize * this.cellSize);
  }

  private drawPlayer(offsetX: number, offsetY: number, player: { x: number; y: number }, color: string, side: "left" | "right") {
    const ctx = this.ctx;

    let drawX = player.x;
    let drawY = player.y;

    // Animation
    if (this.animating && this.animFrom) {
      const from = side === "left" ? this.animFrom.left : this.animFrom.right;
      drawX = from.x + (player.x - from.x) * this.animProgress;
      drawY = from.y + (player.y - from.y) * this.animProgress;
    }

    const px = offsetX + drawX * this.cellSize + this.cellSize / 2;
    const py = offsetY + drawY * this.cellSize + this.cellSize / 2;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(px, py + 20, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px - 6, py - 4, 5, 0, Math.PI * 2);
    ctx.arc(px + 6, py - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(px - 6, py - 4, 2, 0, Math.PI * 2);
    ctx.arc(px + 6, py - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + 2, 8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  public move(direction: "up" | "down" | "left" | "right") {
    if (this.status !== "playing" || this.animating) return;

    const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;

    // Mirror: left moves normally, right moves mirrored horizontally
    const leftNewX = this.leftPlayer.x + dx;
    const leftNewY = this.leftPlayer.y + dy;
    const rightNewX = this.rightPlayer.x - dx; // Mirrored X
    const rightNewY = this.rightPlayer.y + dy;

    // Check bounds and walls
    const leftCanMove = this.canMoveTo(leftNewX, leftNewY, this.leftGrid);
    const rightCanMove = this.canMoveTo(rightNewX, rightNewY, this.rightGrid);

    // Save animation start positions
    this.animFrom = {
      left: { ...this.leftPlayer },
      right: { ...this.rightPlayer },
    };

    // Move if possible (each player can be blocked independently)
    if (leftCanMove) {
      this.leftPlayer.x = leftNewX;
      this.leftPlayer.y = leftNewY;
    }
    if (rightCanMove) {
      this.rightPlayer.x = rightNewX;
      this.rightPlayer.y = rightNewY;
    }

    if (leftCanMove || rightCanMove) {
      this.moves++;
      this.animating = true;
      this.animProgress = 0;

      if (this.onStateChange) {
        this.onStateChange({ status: "playing", level: this.currentLevel + 1, moves: this.moves });
      }
    }
  }

  private canMoveTo(x: number, y: number, grid: CellType[][]): boolean {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return false;
    return grid[y][x] !== "wall";
  }

  private checkWin() {
    const leftOnGoal = this.leftPlayer.x === this.leftGoal.x && this.leftPlayer.y === this.leftGoal.y;
    const rightOnGoal = this.rightPlayer.x === this.rightGoal.x && this.rightPlayer.y === this.rightGoal.y;

    if (leftOnGoal && rightOnGoal) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won", level: this.currentLevel + 1, moves: this.moves });
      }
    }
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
      this.canvas.width = Math.min(600, rect.width);
      this.canvas.height = 350;
      this.cellSize = Math.min(60, (this.canvas.width / 2 - 40) / this.gridSize);
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
