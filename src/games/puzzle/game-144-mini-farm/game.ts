/**
 * Mini Farm Game Logic
 * Game #144 - Grid Planning Puzzle
 */

type CropType = "carrot" | "corn" | "wheat" | "tomato" | null;

interface Cell {
  row: number;
  col: number;
  crop: CropType;
  locked: boolean;
}

interface Level {
  gridSize: number;
  crops: CropType[];
  requirements: { crop: CropType; count: number }[];
  presets: { row: number; col: number; crop: CropType }[];
}

interface GameState {
  level: number;
  status: "idle" | "playing" | "won" | "complete";
  placedCount: number;
  totalCells: number;
  selectedCrop: CropType;
}

type StateChangeCallback = (state: GameState) => void;

const CROP_COLORS: Record<string, string> = {
  carrot: "#e67e22",
  corn: "#f1c40f",
  wheat: "#d4a574",
  tomato: "#e74c3c",
};

const CROP_ICONS: Record<string, string> = {
  carrot: "🥕",
  corn: "🌽",
  wheat: "🌾",
  tomato: "🍅",
};

const LEVELS: Level[] = [
  {
    gridSize: 3,
    crops: ["carrot", "corn"],
    requirements: [
      { crop: "carrot", count: 4 },
      { crop: "corn", count: 5 },
    ],
    presets: [],
  },
  {
    gridSize: 3,
    crops: ["carrot", "corn", "wheat"],
    requirements: [
      { crop: "carrot", count: 3 },
      { crop: "corn", count: 3 },
      { crop: "wheat", count: 3 },
    ],
    presets: [{ row: 1, col: 1, crop: "wheat" }],
  },
  {
    gridSize: 4,
    crops: ["carrot", "corn", "wheat"],
    requirements: [
      { crop: "carrot", count: 5 },
      { crop: "corn", count: 5 },
      { crop: "wheat", count: 6 },
    ],
    presets: [],
  },
  {
    gridSize: 4,
    crops: ["carrot", "corn", "wheat", "tomato"],
    requirements: [
      { crop: "carrot", count: 4 },
      { crop: "corn", count: 4 },
      { crop: "wheat", count: 4 },
      { crop: "tomato", count: 4 },
    ],
    presets: [
      { row: 0, col: 0, crop: "carrot" },
      { row: 3, col: 3, crop: "tomato" },
    ],
  },
  {
    gridSize: 5,
    crops: ["carrot", "corn", "wheat", "tomato"],
    requirements: [
      { crop: "carrot", count: 6 },
      { crop: "corn", count: 6 },
      { crop: "wheat", count: 7 },
      { crop: "tomato", count: 6 },
    ],
    presets: [{ row: 2, col: 2, crop: "wheat" }],
  },
  {
    gridSize: 5,
    crops: ["carrot", "corn", "wheat", "tomato"],
    requirements: [
      { crop: "carrot", count: 7 },
      { crop: "corn", count: 6 },
      { crop: "wheat", count: 6 },
      { crop: "tomato", count: 6 },
    ],
    presets: [
      { row: 0, col: 2, crop: "corn" },
      { row: 2, col: 0, crop: "wheat" },
      { row: 2, col: 4, crop: "carrot" },
      { row: 4, col: 2, crop: "tomato" },
    ],
  },
];

const CELL_SIZE = 60;

export class MiniFarmGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private grid: Cell[][] = [];
  private selectedCrop: CropType = "carrot";
  private isPlaying: boolean = false;

  private onStateChange: StateChangeCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  getAvailableCrops(): CropType[] {
    return LEVELS[this.currentLevel].crops;
  }

  getSelectedCrop(): CropType {
    return this.selectedCrop;
  }

  setSelectedCrop(crop: CropType) {
    this.selectedCrop = crop;
    this.emitState();
  }

  getRequirements(): { crop: CropType; count: number; current: number }[] {
    const level = LEVELS[this.currentLevel];
    return level.requirements.map((req) => ({
      crop: req.crop,
      count: req.count,
      current: this.countCrop(req.crop),
    }));
  }

  private countCrop(crop: CropType): number {
    let count = 0;
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.crop === crop) count++;
      }
    }
    return count;
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

  private initLevel() {
    const level = LEVELS[this.currentLevel];
    this.grid = [];
    this.selectedCrop = level.crops[0];

    for (let r = 0; r < level.gridSize; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < level.gridSize; c++) {
        row.push({
          row: r,
          col: c,
          crop: null,
          locked: false,
        });
      }
      this.grid.push(row);
    }

    for (const preset of level.presets) {
      this.grid[preset.row][preset.col].crop = preset.crop;
      this.grid[preset.row][preset.col].locked = true;
    }

    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      const placedCount = this.grid.flat().filter((c) => c.crop !== null).length;
      const totalCells = this.grid.flat().length;

      this.onStateChange({
        level: this.currentLevel + 1,
        status: this.getStatus(),
        placedCount,
        totalCells,
        selectedCrop: this.selectedCrop,
      });
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" {
    if (!this.isPlaying) return "idle";

    const allFilled = this.grid.flat().every((c) => c.crop !== null);
    if (allFilled && this.isValidPlacement()) {
      if (this.currentLevel >= LEVELS.length - 1) return "complete";
      return "won";
    }
    return "playing";
  }

  private isValidPlacement(): boolean {
    const level = LEVELS[this.currentLevel];

    for (const req of level.requirements) {
      if (this.countCrop(req.crop) !== req.count) return false;
    }

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const cell = this.grid[r][c];
        if (!cell.crop) return false;

        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];

        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.grid[0].length) {
            if (this.grid[nr][nc].crop === cell.crop) return false;
          }
        }
      }
    }

    return true;
  }

  start() {
    this.isPlaying = true;
    this.initLevel();
    this.draw();
  }

  reset() {
    const level = LEVELS[this.currentLevel];
    for (const row of this.grid) {
      for (const cell of row) {
        if (!cell.locked) {
          cell.crop = null;
        }
      }
    }
    this.emitState();
    this.draw();
  }

  restart() {
    this.currentLevel = 0;
    this.isPlaying = false;
    this.grid = [];
    this.draw();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
      this.draw();
    }
  }

  handleClick(x: number, y: number) {
    if (!this.isPlaying) return;

    const level = LEVELS[this.currentLevel];
    const gridSize = level.gridSize;
    const offsetX = (this.width - gridSize * CELL_SIZE) / 2;
    const offsetY = 30;

    const col = Math.floor((x - offsetX) / CELL_SIZE);
    const row = Math.floor((y - offsetY) / CELL_SIZE);

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      const cell = this.grid[row][col];
      if (!cell.locked) {
        if (cell.crop === this.selectedCrop) {
          cell.crop = null;
        } else {
          cell.crop = this.selectedCrop;
        }
        this.draw();
        this.emitState();
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#2d5a27";
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isPlaying) {
      ctx.fillStyle = "#8bc34a";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Mini Farm", this.width / 2, this.height / 2);
      return;
    }

    this.drawGrid();
    this.drawRequirements();
  }

  private drawGrid() {
    const ctx = this.ctx;
    const level = LEVELS[this.currentLevel];
    const gridSize = level.gridSize;
    const offsetX = (this.width - gridSize * CELL_SIZE) / 2;
    const offsetY = 30;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = offsetX + c * CELL_SIZE;
        const y = offsetY + r * CELL_SIZE;
        const cell = this.grid[r][c];

        ctx.fillStyle = "#8bc34a";
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        ctx.strokeStyle = "#5d8a3a";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        if (cell.crop) {
          const color = CROP_COLORS[cell.crop];
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = "24px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(CROP_ICONS[cell.crop], x + CELL_SIZE / 2, y + CELL_SIZE / 2);

          if (cell.locked) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 22, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (this.hasAdjacentConflict(r, c)) {
            ctx.strokeStyle = "#e74c3c";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
          }
        }
      }
    }
  }

  private hasAdjacentConflict(row: number, col: number): boolean {
    const cell = this.grid[row][col];
    if (!cell.crop) return false;

    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < this.grid.length && nc >= 0 && nc < this.grid[0].length) {
        if (this.grid[nr][nc].crop === cell.crop) return true;
      }
    }
    return false;
  }

  private drawRequirements() {
    const ctx = this.ctx;
    const requirements = this.getRequirements();
    const startY = this.height - 60;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, startY - 10, this.width - 20, 50);

    const spacing = (this.width - 40) / requirements.length;

    requirements.forEach((req, i) => {
      const x = 30 + i * spacing;
      const isMet = req.current === req.count;

      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.fillText(CROP_ICONS[req.crop!], x, startY + 15);

      ctx.fillStyle = isMet ? "#2ecc71" : "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${req.current}/${req.count}`, x, startY + 35);
    });
  }
}
