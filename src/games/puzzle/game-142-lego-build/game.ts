/**
 * Lego Build Game Logic
 * Game #142 - 3D Blocks Building
 */

interface Block {
  id: number;
  shape: number[][];
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  placed: boolean;
  rotation: number;
}

interface Level {
  grid: number[][];
  blocks: { shape: number[][]; color: string; targetX: number; targetY: number }[];
}

interface GameState {
  level: number;
  status: "idle" | "playing" | "won" | "complete";
  placedCount: number;
  totalPieces: number;
}

type StateChangeCallback = (state: GameState) => void;

const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6", "#e67e22"];

const LEVELS: Level[] = [
  {
    grid: [
      [1, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ],
    blocks: [
      { shape: [[1, 1], [1, 1]], color: COLORS[0], targetX: 0, targetY: 0 },
    ],
  },
  {
    grid: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    blocks: [
      { shape: [[1, 1, 1]], color: COLORS[1], targetX: 0, targetY: 0 },
      { shape: [[1], [1]], color: COLORS[2], targetX: 1, targetY: 1 },
    ],
  },
  {
    grid: [
      [1, 0, 1],
      [1, 1, 1],
      [1, 0, 1],
    ],
    blocks: [
      { shape: [[1], [1], [1]], color: COLORS[0], targetX: 0, targetY: 0 },
      { shape: [[1], [1], [1]], color: COLORS[1], targetX: 2, targetY: 0 },
      { shape: [[1, 1, 1]], color: COLORS[2], targetX: 0, targetY: 1 },
    ],
  },
  {
    grid: [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1],
    ],
    blocks: [
      { shape: [[1, 1, 1, 1]], color: COLORS[0], targetX: 0, targetY: 0 },
      { shape: [[1, 1, 1, 1]], color: COLORS[1], targetX: 0, targetY: 3 },
      { shape: [[1], [1]], color: COLORS[2], targetX: 0, targetY: 1 },
      { shape: [[1], [1]], color: COLORS[3], targetX: 3, targetY: 1 },
    ],
  },
  {
    grid: [
      [0, 1, 1, 0],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [0, 1, 1, 0],
    ],
    blocks: [
      { shape: [[1, 1], [1, 1]], color: COLORS[0], targetX: 1, targetY: 0 },
      { shape: [[1, 1], [1, 1]], color: COLORS[1], targetX: 1, targetY: 2 },
      { shape: [[1], [1]], color: COLORS[2], targetX: 0, targetY: 1 },
      { shape: [[1], [1]], color: COLORS[3], targetX: 3, targetY: 1 },
    ],
  },
  {
    grid: [
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1],
    ],
    blocks: [
      { shape: [[1, 1, 1, 1, 1]], color: COLORS[0], targetX: 0, targetY: 0 },
      { shape: [[1, 1, 1, 1, 1]], color: COLORS[1], targetX: 0, targetY: 2 },
      { shape: [[1]], color: COLORS[2], targetX: 0, targetY: 1 },
      { shape: [[1]], color: COLORS[3], targetX: 2, targetY: 1 },
      { shape: [[1]], color: COLORS[4], targetX: 4, targetY: 1 },
    ],
  },
];

const CELL_SIZE = 40;
const STUD_RADIUS = 8;

export class LegoBuildGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private blocks: Block[] = [];
  private grid: number[][] = [];
  private placedGrid: (Block | null)[][] = [];
  private isPlaying: boolean = false;

  private dragging: Block | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

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
    this.grid = level.grid.map((row) => [...row]);
    this.placedGrid = level.grid.map((row) => row.map(() => null));
    this.blocks = [];

    const paletteY = 280;
    let paletteX = 30;

    level.blocks.forEach((blockDef, i) => {
      const block: Block = {
        id: i,
        shape: blockDef.shape.map((row) => [...row]),
        color: blockDef.color,
        x: paletteX,
        y: paletteY,
        targetX: blockDef.targetX,
        targetY: blockDef.targetY,
        placed: false,
        rotation: 0,
      };
      this.blocks.push(block);
      paletteX += (block.shape[0].length + 1) * 35;
    });

    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      const placedCount = this.blocks.filter((b) => b.placed).length;
      this.onStateChange({
        level: this.currentLevel + 1,
        status: this.getStatus(),
        placedCount,
        totalPieces: this.blocks.length,
      });
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" {
    if (!this.isPlaying) return "idle";
    const allPlaced = this.blocks.every((b) => b.placed);
    if (allPlaced) {
      if (this.currentLevel >= LEVELS.length - 1) return "complete";
      return "won";
    }
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.initLevel();
    this.draw();
  }

  reset() {
    this.initLevel();
    this.draw();
  }

  restart() {
    this.currentLevel = 0;
    this.isPlaying = false;
    this.blocks = [];
    this.draw();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
      this.draw();
    }
  }

  handleMouseDown(x: number, y: number) {
    if (!this.isPlaying) return;

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.placed) continue;

      const bw = block.shape[0].length * CELL_SIZE;
      const bh = block.shape.length * CELL_SIZE;

      if (x >= block.x && x <= block.x + bw && y >= block.y && y <= block.y + bh) {
        this.dragging = block;
        this.dragOffsetX = x - block.x;
        this.dragOffsetY = y - block.y;

        const idx = this.blocks.indexOf(block);
        this.blocks.splice(idx, 1);
        this.blocks.push(block);
        break;
      }
    }
  }

  handleMouseMove(x: number, y: number) {
    if (!this.dragging) return;

    this.dragging.x = x - this.dragOffsetX;
    this.dragging.y = y - this.dragOffsetY;
    this.draw();
  }

  handleMouseUp() {
    if (!this.dragging) return;

    const block = this.dragging;
    this.dragging = null;

    const gridOffsetX = (this.width - this.grid[0].length * CELL_SIZE) / 2;
    const gridOffsetY = 30;

    const gridX = Math.round((block.x - gridOffsetX) / CELL_SIZE);
    const gridY = Math.round((block.y - gridOffsetY) / CELL_SIZE);

    if (this.canPlace(block, gridX, gridY)) {
      block.x = gridOffsetX + gridX * CELL_SIZE;
      block.y = gridOffsetY + gridY * CELL_SIZE;
      block.placed = true;

      for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
          if (block.shape[r][c]) {
            this.placedGrid[gridY + r][gridX + c] = block;
          }
        }
      }

      this.emitState();
    }

    this.draw();
  }

  private canPlace(block: Block, gridX: number, gridY: number): boolean {
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (!block.shape[r][c]) continue;

        const gx = gridX + c;
        const gy = gridY + r;

        if (gy < 0 || gy >= this.grid.length) return false;
        if (gx < 0 || gx >= this.grid[gy].length) return false;
        if (this.grid[gy][gx] === 0) return false;
        if (this.placedGrid[gy][gx] !== null) return false;
      }
    }
    return true;
  }

  handleClick(x: number, y: number) {
    if (!this.isPlaying) return;

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.placed) continue;

      const bw = block.shape[0].length * CELL_SIZE;
      const bh = block.shape.length * CELL_SIZE;

      if (x >= block.x && x <= block.x + bw && y >= block.y && y <= block.y + bh) {
        this.rotateBlock(block);
        this.draw();
        break;
      }
    }
  }

  private rotateBlock(block: Block) {
    const rows = block.shape.length;
    const cols = block.shape[0].length;
    const newShape: number[][] = [];

    for (let c = 0; c < cols; c++) {
      const newRow: number[] = [];
      for (let r = rows - 1; r >= 0; r--) {
        newRow.push(block.shape[r][c]);
      }
      newShape.push(newRow);
    }

    block.shape = newShape;
    block.rotation = (block.rotation + 90) % 360;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isPlaying) {
      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Lego Build", this.width / 2, this.height / 2);
      return;
    }

    this.drawGrid();
    this.drawBlocks();
  }

  private drawGrid() {
    const ctx = this.ctx;
    const gridOffsetX = (this.width - this.grid[0].length * CELL_SIZE) / 2;
    const gridOffsetY = 30;

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const x = gridOffsetX + c * CELL_SIZE;
        const y = gridOffsetY + r * CELL_SIZE;

        if (this.grid[r][c] === 1) {
          const placedBlock = this.placedGrid[r][c];
          if (placedBlock) {
            this.drawCell(x, y, placedBlock.color, true);
          } else {
            ctx.fillStyle = "#2d2d4d";
            ctx.fillRect(x, y, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.strokeStyle = "#3d3d6d";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }
    }
  }

  private drawBlocks() {
    for (const block of this.blocks) {
      if (block.placed) continue;

      for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
          if (block.shape[r][c]) {
            const x = block.x + c * CELL_SIZE;
            const y = block.y + r * CELL_SIZE;
            this.drawCell(x, y, block.color, false);
          }
        }
      }
    }
  }

  private drawCell(x: number, y: number, color: string, placed: boolean) {
    const ctx = this.ctx;
    const size = CELL_SIZE - 2;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(x, y, size, 4);
    ctx.fillRect(x, y, 4, size);

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(x, y + size - 4, size, 4);
    ctx.fillRect(x + size - 4, y, 4, size);

    const studX = x + size / 2;
    const studY = y + size / 2;

    ctx.beginPath();
    ctx.arc(studX, studY, STUD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(studX - 2, studY - 2, STUD_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();

    if (!placed) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.shadowBlur = 0;
    }
  }
}
