/**
 * Number Link - Game #043
 * Connect matching numbers without crossing lines
 */

export interface Cell {
  number: number | null; // null = empty, 0+ = endpoint number
  pathId: number | null; // Which path passes through this cell
}

export interface Path {
  id: number;
  cells: [number, number][]; // Array of [x, y] coordinates
  color: string;
  complete: boolean;
}

export interface Level {
  size: number;
  endpoints: { x: number; y: number; num: number }[];
}

const COLORS = [
  '#e74c3c', // 1 - Red
  '#3498db', // 2 - Blue
  '#2ecc71', // 3 - Green
  '#f1c40f', // 4 - Yellow
  '#9b59b6', // 5 - Purple
  '#e67e22', // 6 - Orange
];

const LEVELS: Level[] = [
  {
    size: 4,
    endpoints: [
      { x: 0, y: 0, num: 1 }, { x: 3, y: 3, num: 1 },
      { x: 0, y: 3, num: 2 }, { x: 3, y: 0, num: 2 }
    ]
  },
  {
    size: 5,
    endpoints: [
      { x: 0, y: 0, num: 1 }, { x: 4, y: 4, num: 1 },
      { x: 0, y: 4, num: 2 }, { x: 4, y: 0, num: 2 },
      { x: 2, y: 0, num: 3 }, { x: 2, y: 4, num: 3 }
    ]
  },
  {
    size: 5,
    endpoints: [
      { x: 0, y: 0, num: 1 }, { x: 2, y: 2, num: 1 },
      { x: 4, y: 0, num: 2 }, { x: 4, y: 4, num: 2 },
      { x: 0, y: 4, num: 3 }, { x: 2, y: 4, num: 3 }
    ]
  },
  {
    size: 6,
    endpoints: [
      { x: 0, y: 0, num: 1 }, { x: 5, y: 5, num: 1 },
      { x: 0, y: 5, num: 2 }, { x: 5, y: 0, num: 2 },
      { x: 2, y: 0, num: 3 }, { x: 2, y: 5, num: 3 },
      { x: 3, y: 0, num: 4 }, { x: 3, y: 5, num: 4 }
    ]
  },
  {
    size: 6,
    endpoints: [
      { x: 0, y: 0, num: 1 }, { x: 3, y: 3, num: 1 },
      { x: 5, y: 0, num: 2 }, { x: 2, y: 3, num: 2 },
      { x: 0, y: 5, num: 3 }, { x: 5, y: 5, num: 3 },
      { x: 1, y: 1, num: 4 }, { x: 4, y: 4, num: 4 }
    ]
  }
];

export class NumberLinkGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: Cell[][] = [];
  paths: Map<number, Path> = new Map();
  gridSize = 5;
  cellSize = 60;

  currentLevel = 0;
  currentPath: Path | null = null;
  isDrawing = false;

  status: 'playing' | 'won' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.size;
    this.cellSize = Math.floor(Math.min(300, this.canvas.width - 60) / this.gridSize);

    // Initialize grid
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({ number: null, pathId: null });
      }
      this.grid.push(row);
    }

    // Place endpoints
    level.endpoints.forEach(ep => {
      this.grid[ep.y][ep.x].number = ep.num;
    });

    // Initialize paths
    this.paths.clear();
    const uniqueNums = [...new Set(level.endpoints.map(e => e.num))];
    uniqueNums.forEach((num, idx) => {
      this.paths.set(num, {
        id: num,
        cells: [],
        color: COLORS[idx % COLORS.length],
        complete: false
      });
    });

    this.currentPath = null;
    this.isDrawing = false;
    this.notifyState();
  }

  public handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    const gridX = Math.floor((x - offsetX) / this.cellSize);
    const gridY = Math.floor((y - offsetY) / this.cellSize);

    if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) {
      if (type === 'up') {
        this.isDrawing = false;
        this.currentPath = null;
      }
      return;
    }

    const cell = this.grid[gridY][gridX];

    if (type === 'down') {
      // Start drawing from an endpoint
      if (cell.number !== null) {
        const path = this.paths.get(cell.number)!;

        // Clear existing path for this number
        this.clearPath(cell.number);

        path.cells = [[gridX, gridY]];
        path.complete = false;
        this.grid[gridY][gridX].pathId = cell.number;

        this.currentPath = path;
        this.isDrawing = true;
      }
      // Or continue from end of existing path
      else if (cell.pathId !== null) {
        const path = this.paths.get(cell.pathId)!;
        const lastCell = path.cells[path.cells.length - 1];

        if (lastCell[0] === gridX && lastCell[1] === gridY) {
          this.currentPath = path;
          this.isDrawing = true;
        }
      }
    } else if (type === 'move' && this.isDrawing && this.currentPath) {
      this.extendPath(gridX, gridY);
    } else if (type === 'up') {
      if (this.currentPath) {
        this.checkPathComplete(this.currentPath);
      }
      this.isDrawing = false;
      this.currentPath = null;

      // Check win
      if (this.checkWin()) {
        this.status = 'won';
        this.notifyState();
      }
    }

    this.draw();
  }

  private extendPath(gridX: number, gridY: number) {
    if (!this.currentPath) return;

    const lastCell = this.currentPath.cells[this.currentPath.cells.length - 1];
    const dx = Math.abs(gridX - lastCell[0]);
    const dy = Math.abs(gridY - lastCell[1]);

    // Only allow adjacent cells (no diagonals)
    if (dx + dy !== 1) return;

    const cell = this.grid[gridY][gridX];

    // Check if we're going back on our path
    if (this.currentPath.cells.length >= 2) {
      const prevCell = this.currentPath.cells[this.currentPath.cells.length - 2];
      if (prevCell[0] === gridX && prevCell[1] === gridY) {
        // Remove last cell from path
        const removed = this.currentPath.cells.pop()!;
        this.grid[removed[1]][removed[0]].pathId = null;
        return;
      }
    }

    // Check if cell is available
    if (cell.pathId !== null && cell.pathId !== this.currentPath.id) {
      return; // Occupied by another path
    }

    // Check if this is a valid endpoint
    if (cell.number !== null) {
      if (cell.number !== this.currentPath.id) {
        return; // Wrong endpoint
      }
      // Reached matching endpoint
      this.currentPath.cells.push([gridX, gridY]);
      this.grid[gridY][gridX].pathId = this.currentPath.id;
      this.currentPath.complete = true;
      return;
    }

    // Add to path
    this.currentPath.cells.push([gridX, gridY]);
    this.grid[gridY][gridX].pathId = this.currentPath.id;
  }

  private clearPath(pathId: number) {
    const path = this.paths.get(pathId);
    if (!path) return;

    // Clear cells except endpoints
    path.cells.forEach(([x, y]) => {
      if (this.grid[y][x].number === null) {
        this.grid[y][x].pathId = null;
      }
    });

    path.cells = [];
    path.complete = false;
  }

  private checkPathComplete(path: Path) {
    if (path.cells.length < 2) {
      path.complete = false;
      return;
    }

    const first = path.cells[0];
    const last = path.cells[path.cells.length - 1];

    const firstCell = this.grid[first[1]][first[0]];
    const lastCell = this.grid[last[1]][last[0]];

    path.complete = firstCell.number === path.id && lastCell.number === path.id;
  }

  private checkWin(): boolean {
    // All paths must be complete
    for (const path of this.paths.values()) {
      if (!path.complete) return false;
    }

    // All cells must be filled
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].pathId === null && this.grid[y][x].number === null) {
          return false;
        }
      }
    }

    return true;
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const px = offsetX + x * this.cellSize;
        const py = offsetY + y * this.cellSize;

        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(px, py, this.cellSize - 2, this.cellSize - 2);

        this.ctx.strokeStyle = '#2d2d4a';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px, py, this.cellSize - 2, this.cellSize - 2);
      }
    }

    // Draw paths
    this.paths.forEach(path => {
      this.drawPath(path, offsetX, offsetY);
    });

    // Draw endpoints
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        if (cell.number !== null) {
          this.drawEndpoint(x, y, cell.number, offsetX, offsetY);
        }
      }
    }
  }

  private drawPath(path: Path, offsetX: number, offsetY: number) {
    if (path.cells.length < 2) return;

    this.ctx.strokeStyle = path.color;
    this.ctx.lineWidth = this.cellSize * 0.4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    path.cells.forEach((cell, i) => {
      const px = offsetX + cell[0] * this.cellSize + this.cellSize / 2;
      const py = offsetY + cell[1] * this.cellSize + this.cellSize / 2;

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    });
    this.ctx.stroke();
  }

  private drawEndpoint(x: number, y: number, num: number, offsetX: number, offsetY: number) {
    const px = offsetX + x * this.cellSize + this.cellSize / 2;
    const py = offsetY + y * this.cellSize + this.cellSize / 2;
    const path = this.paths.get(num)!;

    // Circle background
    this.ctx.fillStyle = path.color;
    this.ctx.beginPath();
    this.ctx.arc(px, py, this.cellSize * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    // Number
    this.ctx.fillStyle = 'white';
    this.ctx.font = `bold ${Math.floor(this.cellSize * 0.4)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(num.toString(), px, py);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(450, rect.width);
      this.canvas.height = 400;
      this.cellSize = Math.floor(Math.min(300, this.canvas.width - 60) / this.gridSize);
    }
    this.draw();
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  public nextLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      const completePaths = Array.from(this.paths.values()).filter(p => p.complete).length;
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        completePaths,
        totalPaths: this.paths.size
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
