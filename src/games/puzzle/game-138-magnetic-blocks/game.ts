/**
 * Magnetic Blocks Game
 * Game #138 - Use magnetism to unite blocks
 */

type CellType = 0 | 1 | 2 | 3 | 4; // 0=empty, 1=wall, 2=red(+), 3=blue(-), 4=neutral
type Direction = "up" | "down" | "left" | "right";

interface Block {
  x: number;
  y: number;
  type: "red" | "blue" | "neutral";
  targetX?: number;
  targetY?: number;
}

interface Level {
  width: number;
  height: number;
  grid: CellType[][];
  blocks: Block[];
}

const LEVELS: Level[] = [
  // Level 1: Simple
  {
    width: 5,
    height: 5,
    grid: [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ],
    blocks: [
      { x: 1, y: 1, type: "red" },
      { x: 3, y: 3, type: "blue" },
    ],
  },
  // Level 2: With walls
  {
    width: 6,
    height: 6,
    grid: [
      [1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1],
    ],
    blocks: [
      { x: 1, y: 1, type: "red" },
      { x: 4, y: 4, type: "blue" },
    ],
  },
  // Level 3: Three blocks
  {
    width: 7,
    height: 5,
    grid: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ],
    blocks: [
      { x: 1, y: 1, type: "red" },
      { x: 5, y: 1, type: "blue" },
      { x: 3, y: 3, type: "neutral" },
    ],
  },
  // Level 4: Complex maze
  {
    width: 7,
    height: 7,
    grid: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ],
    blocks: [
      { x: 1, y: 1, type: "red" },
      { x: 5, y: 5, type: "blue" },
    ],
  },
  // Level 5: Multiple pairs
  {
    width: 8,
    height: 6,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    blocks: [
      { x: 1, y: 1, type: "red" },
      { x: 6, y: 1, type: "blue" },
      { x: 1, y: 4, type: "blue" },
      { x: 6, y: 4, type: "red" },
    ],
  },
  // Level 6: Tricky
  {
    width: 8,
    height: 8,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    blocks: [
      { x: 1, y: 1, type: "red" },
      { x: 3, y: 3, type: "blue" },
      { x: 4, y: 4, type: "neutral" },
    ],
  },
];

export class MagneticBlocksGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private cellSize: number = 50;

  currentLevel: number = 0;
  grid: CellType[][] = [];
  blocks: Block[] = [];
  moves: number = 0;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private animating: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.calculateCellSize();
    this.render();
  }

  private calculateCellSize() {
    const level = LEVELS[this.currentLevel];
    if (!level) return;

    const maxCellWidth = (this.width - 40) / level.width;
    const maxCellHeight = (this.height - 60) / level.height;
    this.cellSize = Math.min(maxCellWidth, maxCellHeight, 55);
  }

  public start() {
    this.loadLevel(this.currentLevel);
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({
          status: "complete",
          level: levelIndex + 1,
          moves: this.moves,
        });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.grid = level.grid.map((row) => [...row]);
    this.blocks = level.blocks.map((b) => ({ ...b }));
    this.moves = 0;
    this.status = "playing";
    this.animating = false;

    this.calculateCellSize();
    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        moves: 0,
      });
    }
  }

  public move(direction: Direction) {
    if (this.status !== "playing" || this.animating) return;

    let moved = false;

    // Move all blocks
    this.blocks.forEach((block) => {
      const { newX, newY } = this.calculateNewPosition(block, direction);
      if (newX !== block.x || newY !== block.y) {
        block.targetX = newX;
        block.targetY = newY;
        moved = true;
      }
    });

    if (moved) {
      this.animating = true;
      this.moves++;
      this.animateMove();
    }
  }

  private calculateNewPosition(block: Block, direction: Direction): { newX: number; newY: number } {
    let newX = block.x;
    let newY = block.y;

    const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;

    // Slide until hitting wall or another block
    while (true) {
      const nextX = newX + dx;
      const nextY = newY + dy;

      // Check bounds and walls
      if (
        nextY < 0 ||
        nextY >= this.grid.length ||
        nextX < 0 ||
        nextX >= this.grid[0].length ||
        this.grid[nextY][nextX] === 1
      ) {
        break;
      }

      // Check other blocks
      const hitBlock = this.blocks.find(
        (b) => b !== block && b.x === nextX && b.y === nextY
      );
      if (hitBlock) {
        // Magnetic interaction
        if (
          (block.type === "red" && hitBlock.type === "blue") ||
          (block.type === "blue" && hitBlock.type === "red")
        ) {
          // Opposites attract - stop adjacent
          break;
        } else if (block.type !== "neutral" && hitBlock.type === block.type) {
          // Same poles repel - can't move closer
          break;
        } else {
          // Neutral or different types
          break;
        }
      }

      newX = nextX;
      newY = nextY;
    }

    return { newX, newY };
  }

  private animateMove() {
    let allDone = true;

    this.blocks.forEach((block) => {
      if (block.targetX !== undefined && block.targetY !== undefined) {
        const dx = block.targetX - block.x;
        const dy = block.targetY - block.y;

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          block.x += dx * 0.3;
          block.y += dy * 0.3;
          allDone = false;
        } else {
          block.x = block.targetX;
          block.y = block.targetY;
          block.targetX = undefined;
          block.targetY = undefined;
        }
      }
    });

    this.render();

    if (allDone) {
      this.animating = false;
      this.checkWin();

      if (this.onStateChange) {
        this.onStateChange({
          status: this.status,
          level: this.currentLevel + 1,
          moves: this.moves,
        });
      }
    } else {
      requestAnimationFrame(() => this.animateMove());
    }
  }

  private checkWin() {
    // Check if all red-blue pairs are adjacent
    const redBlocks = this.blocks.filter((b) => b.type === "red");
    const blueBlocks = this.blocks.filter((b) => b.type === "blue");

    let allPaired = true;

    redBlocks.forEach((red) => {
      const hasAdjacentBlue = blueBlocks.some(
        (blue) =>
          (Math.abs(Math.round(red.x) - Math.round(blue.x)) === 1 &&
            Math.round(red.y) === Math.round(blue.y)) ||
          (Math.abs(Math.round(red.y) - Math.round(blue.y)) === 1 &&
            Math.round(red.x) === Math.round(blue.x))
      );
      if (!hasAdjacentBlue) allPaired = false;
    });

    if (allPaired && redBlocks.length > 0 && blueBlocks.length > 0) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          moves: this.moves,
        });
      }
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.width, this.height);

    const level = LEVELS[this.currentLevel];
    if (!level) return;

    const gridWidth = level.width * this.cellSize;
    const gridHeight = level.height * this.cellSize;
    const offsetX = (this.width - gridWidth) / 2;
    const offsetY = (this.height - gridHeight) / 2;

    // Draw grid
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const cellX = offsetX + x * this.cellSize;
        const cellY = offsetY + y * this.cellSize;

        if (this.grid[y][x] === 1) {
          // Wall
          ctx.fillStyle = "#2c3e50";
          ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);

          ctx.strokeStyle = "#1a252f";
          ctx.lineWidth = 2;
          ctx.strokeRect(cellX, cellY, this.cellSize, this.cellSize);
        } else {
          // Empty floor
          ctx.fillStyle = "#34495e";
          ctx.fillRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);

          // Grid lines
          ctx.strokeStyle = "#2c3e50";
          ctx.lineWidth = 1;
          ctx.strokeRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);
        }
      }
    }

    // Draw magnetic field lines (decorative)
    this.drawMagneticField(offsetX, offsetY);

    // Draw blocks
    this.blocks.forEach((block) => {
      this.drawBlock(block, offsetX, offsetY);
    });
  }

  private drawMagneticField(offsetX: number, offsetY: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.1;

    this.blocks.forEach((block) => {
      if (block.type === "neutral") return;

      const cx = offsetX + block.x * this.cellSize + this.cellSize / 2;
      const cy = offsetY + block.y * this.cellSize + this.cellSize / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.cellSize * 2);
      gradient.addColorStop(0, block.type === "red" ? "#e74c3c" : "#3498db");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, this.cellSize * 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private drawBlock(block: Block, offsetX: number, offsetY: number) {
    const ctx = this.ctx;
    const x = offsetX + block.x * this.cellSize + 4;
    const y = offsetY + block.y * this.cellSize + 4;
    const size = this.cellSize - 8;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(x + 3, y + 3, size, size);

    // Block body
    let color: string;
    let symbol: string;
    if (block.type === "red") {
      color = "#e74c3c";
      symbol = "+";
    } else if (block.type === "blue") {
      color = "#3498db";
      symbol = "-";
    } else {
      color = "#95a5a6";
      symbol = "o";
    }

    // Gradient
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, this.darkenColor(color));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, size - 4, size / 3, 4);
    ctx.fill();

    // Symbol
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x + size / 2, y + size / 2);

    // Glow effect for magnetic blocks
    if (block.type !== "neutral") {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, size + 4, size + 4, 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  private darkenColor(color: string): string {
    const colors: Record<string, string> = {
      "#e74c3c": "#c0392b",
      "#3498db": "#2980b9",
      "#95a5a6": "#7f8c8d",
    };
    return colors[color] || color;
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
