export type CellType = "empty" | "wall" | "start" | "goal" | "path" | "hint";

export interface Cell {
  row: number;
  col: number;
  type: CellType;
}

interface LevelConfig {
  rows: number;
  cols: number;
  walls: [number, number][];
  start: [number, number];
  goal: [number, number];
}

const LEVELS: LevelConfig[] = [
  // Level 1
  {
    rows: 8,
    cols: 8,
    walls: [
      [1, 2], [2, 2], [3, 2],
      [3, 4], [4, 4], [5, 4],
      [1, 6], [2, 6],
    ],
    start: [0, 0],
    goal: [7, 7],
  },
  // Level 2
  {
    rows: 10,
    cols: 10,
    walls: [
      [1, 1], [2, 1], [3, 1], [4, 1],
      [4, 3], [5, 3], [6, 3], [7, 3],
      [2, 5], [3, 5], [4, 5],
      [6, 6], [7, 6], [8, 6],
      [1, 8], [2, 8], [3, 8],
    ],
    start: [0, 0],
    goal: [9, 9],
  },
  // Level 3
  {
    rows: 12,
    cols: 12,
    walls: [
      [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
      [4, 2], [5, 2], [6, 2], [7, 2],
      [4, 5], [4, 6], [4, 7], [4, 8],
      [7, 4], [8, 4], [9, 4],
      [6, 7], [7, 7], [8, 7], [9, 7],
      [10, 2], [10, 3], [10, 4],
      [2, 9], [3, 9], [4, 9], [5, 9],
      [8, 10], [9, 10],
    ],
    start: [0, 0],
    goal: [11, 11],
  },
];

export class PathFinderGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: Cell[][] = [];
  currentLevel: number = 0;
  level: LevelConfig;
  cellSize: number = 40;

  playerPath: [number, number][] = [];
  optimalPath: [number, number][] = [];
  showHint: boolean = false;

  isDrawing: boolean = false;
  status: "playing" | "won" = "playing";

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.level = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.playerPath = [];
    this.showHint = false;
    this.initGrid();
    this.calculateOptimalPath();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        steps: 0,
        optimal: this.optimalPath.length - 1,
      });
    }
  }

  private initGrid() {
    this.grid = [];
    const level = this.level;

    for (let row = 0; row < level.rows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < level.cols; col++) {
        this.grid[row][col] = {
          row,
          col,
          type: "empty",
        };
      }
    }

    // Set walls
    for (const [row, col] of level.walls) {
      if (this.grid[row] && this.grid[row][col]) {
        this.grid[row][col].type = "wall";
      }
    }

    // Set start and goal
    this.grid[level.start[0]][level.start[1]].type = "start";
    this.grid[level.goal[0]][level.goal[1]].type = "goal";
  }

  private calculateOptimalPath() {
    // A* pathfinding
    const start = this.level.start;
    const goal = this.level.goal;

    interface Node {
      row: number;
      col: number;
      g: number;
      h: number;
      f: number;
      parent: Node | null;
    }

    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const heuristic = (r: number, c: number) =>
      Math.abs(r - goal[0]) + Math.abs(c - goal[1]);

    const startNode: Node = {
      row: start[0],
      col: start[1],
      g: 0,
      h: heuristic(start[0], start[1]),
      f: heuristic(start[0], start[1]),
      parent: null,
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.row === goal[0] && current.col === goal[1]) {
        // Reconstruct path
        this.optimalPath = [];
        let node: Node | null = current;
        while (node) {
          this.optimalPath.unshift([node.row, node.col]);
          node = node.parent;
        }
        return;
      }

      closedSet.add(`${current.row},${current.col}`);

      // Check neighbors (4-directional)
      const neighbors = [
        [current.row - 1, current.col],
        [current.row + 1, current.col],
        [current.row, current.col - 1],
        [current.row, current.col + 1],
      ];

      for (const [nr, nc] of neighbors) {
        // Skip if out of bounds
        if (nr < 0 || nr >= this.level.rows || nc < 0 || nc >= this.level.cols) {
          continue;
        }

        // Skip if wall or already visited
        if (
          this.grid[nr][nc].type === "wall" ||
          closedSet.has(`${nr},${nc}`)
        ) {
          continue;
        }

        const g = current.g + 1;
        const h = heuristic(nr, nc);
        const f = g + h;

        // Check if already in open set with better score
        const existing = openSet.find((n) => n.row === nr && n.col === nc);
        if (existing && existing.f <= f) {
          continue;
        }

        if (existing) {
          existing.g = g;
          existing.h = h;
          existing.f = f;
          existing.parent = current;
        } else {
          openSet.push({
            row: nr,
            col: nc,
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    // No path found
    this.optimalPath = [];
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
    this.level = LEVELS[this.currentLevel];
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.level = LEVELS[this.currentLevel];
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing") return;

    const { row, col } = this.getCellFromPos(x, y);
    if (row < 0 || row >= this.level.rows || col < 0 || col >= this.level.cols) {
      return;
    }

    const cell = this.grid[row][col];

    if (type === "down") {
      if (cell.type === "start" || this.playerPath.length === 0) {
        this.isDrawing = true;
        this.playerPath = [[this.level.start[0], this.level.start[1]]];
      }
    } else if (type === "move" && this.isDrawing) {
      // Add to path if valid
      if (cell.type === "wall") return;

      const lastPos = this.playerPath[this.playerPath.length - 1];
      if (!lastPos) return;

      // Check if adjacent
      const dr = Math.abs(row - lastPos[0]);
      const dc = Math.abs(col - lastPos[1]);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // Check if already in path (allow backtracking)
        const existingIndex = this.playerPath.findIndex(
          ([r, c]) => r === row && c === col
        );

        if (existingIndex !== -1) {
          // Backtrack
          this.playerPath = this.playerPath.slice(0, existingIndex + 1);
        } else {
          this.playerPath.push([row, col]);
        }

        if (this.onStateChange) {
          this.onStateChange({ steps: this.playerPath.length - 1 });
        }

        // Check win
        if (row === this.level.goal[0] && col === this.level.goal[1]) {
          this.status = "won";
          this.isDrawing = false;
          if (this.onStateChange) {
            this.onStateChange({
              status: "won",
              steps: this.playerPath.length - 1,
              optimal: this.optimalPath.length - 1,
              level: this.currentLevel + 1,
              hasNextLevel: this.currentLevel < LEVELS.length - 1,
            });
          }
        }
      }
    } else if (type === "up") {
      this.isDrawing = false;
    }
  }

  private getCellFromPos(x: number, y: number): { row: number; col: number } {
    const offsetX = (this.canvas.width - this.level.cols * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.level.rows * this.cellSize) / 2;

    const col = Math.floor((x - offsetX) / this.cellSize);
    const row = Math.floor((y - offsetY) / this.cellSize);

    return { row, col };
  }

  public clearPath() {
    this.playerPath = [];
    if (this.onStateChange) {
      this.onStateChange({ steps: 0 });
    }
  }

  public toggleHint() {
    this.showHint = !this.showHint;
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1e3c72");
    gradient.addColorStop(1, "#2a5298");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    const offsetX = (width - this.level.cols * this.cellSize) / 2;
    const offsetY = (height - this.level.rows * this.cellSize) / 2;

    // Draw grid
    for (let row = 0; row < this.level.rows; row++) {
      for (let col = 0; col < this.level.cols; col++) {
        const cell = this.grid[row][col];
        const x = offsetX + col * this.cellSize;
        const y = offsetY + row * this.cellSize;

        // Cell background
        if (cell.type === "wall") {
          this.ctx.fillStyle = "#2c3e50";
        } else if (cell.type === "start") {
          this.ctx.fillStyle = "#27ae60";
        } else if (cell.type === "goal") {
          this.ctx.fillStyle = "#e74c3c";
        } else {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        }

        this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);

        // Cell border
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
      }
    }

    // Draw hint path
    if (this.showHint && this.optimalPath.length > 0) {
      this.ctx.strokeStyle = "rgba(241, 196, 15, 0.5)";
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();

      for (let i = 0; i < this.optimalPath.length; i++) {
        const [row, col] = this.optimalPath[i];
        const x = offsetX + col * this.cellSize + this.cellSize / 2;
        const y = offsetY + row * this.cellSize + this.cellSize / 2;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw player path
    if (this.playerPath.length > 0) {
      this.ctx.strokeStyle = "#3498db";
      this.ctx.lineWidth = 6;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.beginPath();

      for (let i = 0; i < this.playerPath.length; i++) {
        const [row, col] = this.playerPath[i];
        const x = offsetX + col * this.cellSize + this.cellSize / 2;
        const y = offsetY + row * this.cellSize + this.cellSize / 2;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();

      // Glow effect
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = "#3498db";
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Draw path nodes
      for (const [row, col] of this.playerPath) {
        const x = offsetX + col * this.cellSize + this.cellSize / 2;
        const y = offsetY + row * this.cellSize + this.cellSize / 2;

        this.ctx.fillStyle = "#3498db";
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Draw start/goal icons
    const startX = offsetX + this.level.start[1] * this.cellSize + this.cellSize / 2;
    const startY = offsetY + this.level.start[0] * this.cellSize + this.cellSize / 2;
    const goalX = offsetX + this.level.goal[1] * this.cellSize + this.cellSize / 2;
    const goalY = offsetY + this.level.goal[0] * this.cellSize + this.cellSize / 2;

    // Start marker
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("S", startX, startY);

    // Goal marker
    this.ctx.fillText("G", goalX, goalY);

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;

      // Adjust cell size
      const maxCellW = (this.canvas.width - 40) / this.level.cols;
      const maxCellH = (this.canvas.height - 40) / this.level.rows;
      this.cellSize = Math.min(maxCellW, maxCellH, 40);
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }

  public getOptimalLength() {
    return this.optimalPath.length - 1;
  }
}
