export interface Block {
  id: number;
  shape: boolean[][]; // 2D array representing block shape
  x: number;
  y: number;
  color: string;
  placed: boolean;
  rotation: number; // 0, 90, 180, 270
}

interface LevelConfig {
  gridSize: number;
  blocks: { shape: boolean[][]; color: string }[];
}

const COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e91e63",
];

const LEVELS: LevelConfig[] = [
  // Level 1 - 4x4 grid, simple shapes
  {
    gridSize: 4,
    blocks: [
      {
        shape: [
          [true, true],
          [true, true],
        ],
        color: COLORS[0],
      },
      {
        shape: [
          [true, true],
          [true, false],
        ],
        color: COLORS[1],
      },
      {
        shape: [[true], [true], [true], [true]],
        color: COLORS[2],
      },
    ],
  },
  // Level 2 - 5x5 grid
  {
    gridSize: 5,
    blocks: [
      {
        shape: [
          [true, true, true],
          [false, true, false],
        ],
        color: COLORS[0],
      },
      {
        shape: [
          [true, false],
          [true, true],
        ],
        color: COLORS[1],
      },
      {
        shape: [
          [true, true],
          [true, false],
          [true, false],
        ],
        color: COLORS[2],
      },
      {
        shape: [[true, true, true]],
        color: COLORS[3],
      },
    ],
  },
  // Level 3 - 6x6 grid
  {
    gridSize: 6,
    blocks: [
      {
        shape: [
          [true, true, true],
          [true, false, false],
        ],
        color: COLORS[0],
      },
      {
        shape: [
          [true, true],
          [true, true],
        ],
        color: COLORS[1],
      },
      {
        shape: [
          [false, true],
          [true, true],
          [true, false],
        ],
        color: COLORS[2],
      },
      {
        shape: [[true], [true], [true]],
        color: COLORS[3],
      },
      {
        shape: [
          [true, true],
          [false, true],
          [false, true],
        ],
        color: COLORS[4],
      },
    ],
  },
];

export class BlockFitGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: (number | null)[][] = [];
  blocks: Block[] = [];
  currentLevel: number = 0;
  gridSize: number = 4;
  cellSize: number = 50;

  draggingBlock: Block | null = null;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  gridOffsetX: number = 0;
  gridOffsetY: number = 0;
  blockAreaY: number = 0;

  status: "playing" | "won" = "playing";

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.draggingBlock = null;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        placed: `0/${this.blocks.length}`,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.gridSize = config.gridSize;
    this.cellSize = Math.min(50, (this.canvas.width - 100) / this.gridSize);

    // Calculate positions
    this.gridOffsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    this.gridOffsetY = 30;
    this.blockAreaY = this.gridOffsetY + this.gridSize * this.cellSize + 40;

    // Initialize empty grid
    this.grid = [];
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        this.grid[row][col] = null;
      }
    }

    // Create blocks
    this.blocks = [];
    let xOffset = 30;
    for (let i = 0; i < config.blocks.length; i++) {
      const blockConfig = config.blocks[i];
      this.blocks.push({
        id: i,
        shape: JSON.parse(JSON.stringify(blockConfig.shape)),
        x: xOffset,
        y: this.blockAreaY,
        color: blockConfig.color,
        placed: false,
        rotation: 0,
      });

      // Calculate block width for spacing
      const blockWidth = blockConfig.shape[0].length * this.cellSize;
      xOffset += blockWidth + 20;

      // Wrap to next row if needed
      if (xOffset > this.canvas.width - 80) {
        xOffset = 30;
      }
    }
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
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

  public handleInput(
    type: "down" | "move" | "up" | "click",
    x: number,
    y: number
  ) {
    if (this.status !== "playing") return;

    if (type === "down") {
      // Find clicked block (unplaced first, then placed)
      const unplacedBlock = this.blocks.find(
        (b) => !b.placed && this.isPointInBlock(x, y, b)
      );
      const placedBlock = this.blocks.find(
        (b) => b.placed && this.isPointInBlock(x, y, b)
      );

      const block = unplacedBlock || placedBlock;

      if (block) {
        if (block.placed) {
          // Remove from grid
          this.removeBlockFromGrid(block);
          block.placed = false;
        }

        this.draggingBlock = block;
        this.dragOffsetX = x - block.x;
        this.dragOffsetY = y - block.y;
      }
    } else if (type === "move") {
      if (this.draggingBlock) {
        this.draggingBlock.x = x - this.dragOffsetX;
        this.draggingBlock.y = y - this.dragOffsetY;
      }
    } else if (type === "up") {
      if (this.draggingBlock) {
        // Try to place block
        const placed = this.tryPlaceBlock(this.draggingBlock);
        if (!placed) {
          // Return to block area
          this.draggingBlock.y = this.blockAreaY;
        }
        this.draggingBlock = null;

        // Update placed count
        const placedCount = this.blocks.filter((b) => b.placed).length;
        if (this.onStateChange) {
          this.onStateChange({
            placed: `${placedCount}/${this.blocks.length}`,
          });
        }

        // Check win
        if (placedCount === this.blocks.length) {
          this.status = "won";
          if (this.onStateChange) {
            this.onStateChange({
              status: "won",
              level: this.currentLevel + 1,
              hasNextLevel: this.currentLevel < LEVELS.length - 1,
            });
          }
        }
      }
    } else if (type === "click") {
      // Rotate block on click (if not dragging)
      if (!this.draggingBlock) {
        const block = this.blocks.find(
          (b) => !b.placed && this.isPointInBlock(x, y, b)
        );
        if (block) {
          this.rotateBlock(block);
        }
      }
    }
  }

  private isPointInBlock(x: number, y: number, block: Block): boolean {
    const shape = block.shape;
    const rows = shape.length;
    const cols = shape[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          const cellX = block.x + c * this.cellSize;
          const cellY = block.y + r * this.cellSize;
          if (
            x >= cellX &&
            x <= cellX + this.cellSize &&
            y >= cellY &&
            y <= cellY + this.cellSize
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private rotateBlock(block: Block) {
    const rows = block.shape.length;
    const cols = block.shape[0].length;
    const newShape: boolean[][] = [];

    for (let c = 0; c < cols; c++) {
      newShape[c] = [];
      for (let r = rows - 1; r >= 0; r--) {
        newShape[c][rows - 1 - r] = block.shape[r][c];
      }
    }

    block.shape = newShape;
    block.rotation = (block.rotation + 90) % 360;
  }

  private tryPlaceBlock(block: Block): boolean {
    // Calculate grid position
    const gridX = Math.round(
      (block.x - this.gridOffsetX) / this.cellSize
    );
    const gridY = Math.round(
      (block.y - this.gridOffsetY) / this.cellSize
    );

    // Check if block fits
    const shape = block.shape;
    const rows = shape.length;
    const cols = shape[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          const gr = gridY + r;
          const gc = gridX + c;

          // Out of bounds
          if (gr < 0 || gr >= this.gridSize || gc < 0 || gc >= this.gridSize) {
            return false;
          }

          // Already occupied
          if (this.grid[gr][gc] !== null) {
            return false;
          }
        }
      }
    }

    // Place block
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          this.grid[gridY + r][gridX + c] = block.id;
        }
      }
    }

    block.x = this.gridOffsetX + gridX * this.cellSize;
    block.y = this.gridOffsetY + gridY * this.cellSize;
    block.placed = true;

    return true;
  }

  private removeBlockFromGrid(block: Block) {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === block.id) {
          this.grid[r][c] = null;
        }
      }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#2d3436");
    gradient.addColorStop(1, "#636e72");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGrid();

    // Draw separator line
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(20, this.blockAreaY - 20);
    this.ctx.lineTo(width - 20, this.blockAreaY - 20);
    this.ctx.stroke();

    // Draw blocks (unplaced first, then placed, dragging last)
    const sortedBlocks = [...this.blocks].sort((a, b) => {
      if (a === this.draggingBlock) return 1;
      if (b === this.draggingBlock) return -1;
      if (a.placed && !b.placed) return 1;
      if (!a.placed && b.placed) return -1;
      return 0;
    });

    for (const block of sortedBlocks) {
      this.drawBlock(block);
    }

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawGrid() {
    // Grid background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(
      this.gridOffsetX - 5,
      this.gridOffsetY - 5,
      this.gridSize * this.cellSize + 10,
      this.gridSize * this.cellSize + 10
    );

    // Grid cells
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.gridOffsetX + c * this.cellSize;
        const y = this.gridOffsetY + r * this.cellSize;

        this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);

        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
      }
    }
  }

  private drawBlock(block: Block) {
    const shape = block.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const isDragging = block === this.draggingBlock;

    // Shadow for dragging block
    if (isDragging) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (shape[r][c]) {
            this.ctx.fillRect(
              block.x + c * this.cellSize + 5,
              block.y + r * this.cellSize + 5,
              this.cellSize - 2,
              this.cellSize - 2
            );
          }
        }
      }
    }

    // Block cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          const x = block.x + c * this.cellSize;
          const y = block.y + r * this.cellSize;

          // Cell gradient
          const cellGradient = this.ctx.createLinearGradient(
            x,
            y,
            x + this.cellSize,
            y + this.cellSize
          );
          cellGradient.addColorStop(0, block.color);
          cellGradient.addColorStop(1, this.darkenColor(block.color, 30));

          this.ctx.fillStyle = cellGradient;
          this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);

          // Highlight
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, 4);

          // Border
          this.ctx.strokeStyle = isDragging
            ? "#fff"
            : "rgba(255, 255, 255, 0.5)";
          this.ctx.lineWidth = isDragging ? 2 : 1;
          this.ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        }
      }
    }
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
    const B = Math.max((num & 0x0000ff) - amt, 0);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 500;
      if (this.blocks.length > 0) {
        this.initLevel();
      }
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
}
