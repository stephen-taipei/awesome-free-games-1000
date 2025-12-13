/**
 * Rotate Blocks - Game #042
 * Rotate blocks to fill the target shape
 */

export interface Block {
  shape: boolean[][];
  rotation: number; // 0, 90, 180, 270
  color: string;
  x: number;
  y: number;
  placed: boolean;
}

export interface Level {
  target: boolean[][];
  blocks: { shape: boolean[][]; color: string }[];
}

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

const LEVELS: Level[] = [
  {
    target: [
      [true, true],
      [true, true]
    ],
    blocks: [
      { shape: [[true, true]], color: COLORS[0] },
      { shape: [[true, true]], color: COLORS[1] }
    ]
  },
  {
    target: [
      [true, true, true],
      [true, true, true]
    ],
    blocks: [
      { shape: [[true, true, true]], color: COLORS[0] },
      { shape: [[true, true, true]], color: COLORS[1] }
    ]
  },
  {
    target: [
      [true, true, true],
      [true, true, true],
      [true, true, true]
    ],
    blocks: [
      { shape: [[true, true], [true, false]], color: COLORS[0] },
      { shape: [[true], [true], [true]], color: COLORS[1] },
      { shape: [[true, true], [false, true]], color: COLORS[2] },
      { shape: [[true]], color: COLORS[3] }
    ]
  },
  {
    target: [
      [false, true, false],
      [true, true, true],
      [false, true, false]
    ],
    blocks: [
      { shape: [[true, true, true]], color: COLORS[0] },
      { shape: [[true]], color: COLORS[1] },
      { shape: [[true]], color: COLORS[2] }
    ]
  },
  {
    target: [
      [true, true, true, true],
      [true, true, true, true]
    ],
    blocks: [
      { shape: [[true, true], [true, true]], color: COLORS[0] },
      { shape: [[true, true], [true, true]], color: COLORS[1] }
    ]
  }
];

export class RotateBlocksGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  blocks: Block[] = [];
  target: boolean[][] = [];
  placed: (number | null)[][] = [];

  currentLevel = 0;
  cellSize = 50;

  selectedBlock: Block | null = null;
  draggingBlock: Block | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  status: 'playing' | 'won' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private targetOffsetX = 0;
  private targetOffsetY = 0;
  private blocksAreaY = 0;

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
    this.target = level.target.map(row => [...row]);

    // Initialize placed grid
    this.placed = [];
    for (let y = 0; y < this.target.length; y++) {
      this.placed.push(new Array(this.target[0].length).fill(null));
    }

    // Calculate positions
    const targetWidth = this.target[0].length * this.cellSize;
    const targetHeight = this.target.length * this.cellSize;
    this.targetOffsetX = (this.canvas.width - targetWidth) / 2;
    this.targetOffsetY = 30;
    this.blocksAreaY = this.targetOffsetY + targetHeight + 40;

    // Create blocks
    this.blocks = level.blocks.map((b, i) => ({
      shape: b.shape.map(row => [...row]),
      rotation: 0,
      color: b.color,
      x: 30 + (i % 3) * 120,
      y: this.blocksAreaY + Math.floor(i / 3) * 80,
      placed: false
    }));

    this.selectedBlock = null;
    this.notifyState();
  }

  private rotateShape(shape: boolean[][]): boolean[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: boolean[][] = [];

    for (let x = 0; x < cols; x++) {
      const newRow: boolean[] = [];
      for (let y = rows - 1; y >= 0; y--) {
        newRow.push(shape[y][x]);
      }
      rotated.push(newRow);
    }

    return rotated;
  }

  public handleInput(type: 'down' | 'move' | 'up' | 'dblclick', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      // Find clicked block
      const clicked = this.findBlockAt(x, y);
      if (clicked && !clicked.placed) {
        this.selectedBlock = clicked;
        this.draggingBlock = clicked;
        this.dragOffsetX = x - clicked.x;
        this.dragOffsetY = y - clicked.y;

        // Bring to top
        const idx = this.blocks.indexOf(clicked);
        this.blocks.splice(idx, 1);
        this.blocks.push(clicked);

        this.draw();
      }
    } else if (type === 'move') {
      if (this.draggingBlock) {
        this.draggingBlock.x = x - this.dragOffsetX;
        this.draggingBlock.y = y - this.dragOffsetY;
        this.draw();
      }
    } else if (type === 'up') {
      if (this.draggingBlock) {
        this.tryPlaceBlock(this.draggingBlock);
        this.draggingBlock = null;
        this.draw();
      }
    } else if (type === 'dblclick') {
      const clicked = this.findBlockAt(x, y);
      if (clicked && !clicked.placed) {
        clicked.shape = this.rotateShape(clicked.shape);
        clicked.rotation = (clicked.rotation + 90) % 360;
        this.draw();
      }
    }
  }

  private findBlockAt(x: number, y: number): Block | null {
    // Search in reverse order (top blocks first)
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.placed) continue;

      const width = block.shape[0].length * this.cellSize;
      const height = block.shape.length * this.cellSize;

      if (x >= block.x && x <= block.x + width &&
          y >= block.y && y <= block.y + height) {
        return block;
      }
    }
    return null;
  }

  private tryPlaceBlock(block: Block) {
    // Check if block is over target area
    const blockCenterX = block.x + (block.shape[0].length * this.cellSize) / 2;
    const blockCenterY = block.y + (block.shape.length * this.cellSize) / 2;

    const targetEndX = this.targetOffsetX + this.target[0].length * this.cellSize;
    const targetEndY = this.targetOffsetY + this.target.length * this.cellSize;

    if (blockCenterX < this.targetOffsetX || blockCenterX > targetEndX ||
        blockCenterY < this.targetOffsetY || blockCenterY > targetEndY) {
      // Reset to blocks area
      this.resetBlockPosition(block);
      return;
    }

    // Calculate grid position
    const gridX = Math.round((block.x - this.targetOffsetX) / this.cellSize);
    const gridY = Math.round((block.y - this.targetOffsetY) / this.cellSize);

    // Check if can place
    if (this.canPlace(block, gridX, gridY)) {
      this.placeBlock(block, gridX, gridY);
      this.checkWin();
    } else {
      this.resetBlockPosition(block);
    }
  }

  private canPlace(block: Block, gridX: number, gridY: number): boolean {
    for (let y = 0; y < block.shape.length; y++) {
      for (let x = 0; x < block.shape[0].length; x++) {
        if (!block.shape[y][x]) continue;

        const tx = gridX + x;
        const ty = gridY + y;

        // Check bounds
        if (ty < 0 || ty >= this.target.length ||
            tx < 0 || tx >= this.target[0].length) {
          return false;
        }

        // Check if target cell exists
        if (!this.target[ty][tx]) {
          return false;
        }

        // Check if already occupied
        if (this.placed[ty][tx] !== null) {
          return false;
        }
      }
    }
    return true;
  }

  private placeBlock(block: Block, gridX: number, gridY: number) {
    const blockIndex = this.blocks.indexOf(block);

    for (let y = 0; y < block.shape.length; y++) {
      for (let x = 0; x < block.shape[0].length; x++) {
        if (block.shape[y][x]) {
          this.placed[gridY + y][gridX + x] = blockIndex;
        }
      }
    }

    block.x = this.targetOffsetX + gridX * this.cellSize;
    block.y = this.targetOffsetY + gridY * this.cellSize;
    block.placed = true;
  }

  private resetBlockPosition(block: Block) {
    const idx = this.blocks.filter(b => !b.placed).indexOf(block);
    block.x = 30 + (idx % 3) * 120;
    block.y = this.blocksAreaY + Math.floor(idx / 3) * 80;
  }

  private checkWin() {
    // Check if all target cells are filled
    for (let y = 0; y < this.target.length; y++) {
      for (let x = 0; x < this.target[0].length; x++) {
        if (this.target[y][x] && this.placed[y][x] === null) {
          return;
        }
      }
    }

    this.status = 'won';
    this.notifyState();
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw target area
    this.drawTarget();

    // Draw placed blocks
    this.drawPlacedBlocks();

    // Draw unplaced blocks
    this.blocks.forEach(block => {
      if (!block.placed) {
        this.drawBlock(block);
      }
    });
  }

  private drawTarget() {
    for (let y = 0; y < this.target.length; y++) {
      for (let x = 0; x < this.target[0].length; x++) {
        const px = this.targetOffsetX + x * this.cellSize;
        const py = this.targetOffsetY + y * this.cellSize;

        if (this.target[y][x]) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          this.ctx.fillRect(px, py, this.cellSize - 2, this.cellSize - 2);

          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(px, py, this.cellSize - 2, this.cellSize - 2);
        }
      }
    }
  }

  private drawPlacedBlocks() {
    for (let y = 0; y < this.placed.length; y++) {
      for (let x = 0; x < this.placed[0].length; x++) {
        const blockIdx = this.placed[y][x];
        if (blockIdx !== null) {
          const block = this.blocks[blockIdx];
          const px = this.targetOffsetX + x * this.cellSize;
          const py = this.targetOffsetY + y * this.cellSize;

          this.ctx.fillStyle = block.color;
          this.ctx.fillRect(px + 2, py + 2, this.cellSize - 6, this.cellSize - 6);

          // Highlight
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          this.ctx.fillRect(px + 2, py + 2, this.cellSize - 6, (this.cellSize - 6) / 3);
        }
      }
    }
  }

  private drawBlock(block: Block) {
    const isSelected = block === this.selectedBlock;
    const isDragging = block === this.draggingBlock;

    this.ctx.save();

    if (isDragging) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowOffsetX = 5;
      this.ctx.shadowOffsetY = 5;
    }

    for (let y = 0; y < block.shape.length; y++) {
      for (let x = 0; x < block.shape[0].length; x++) {
        if (block.shape[y][x]) {
          const px = block.x + x * this.cellSize;
          const py = block.y + y * this.cellSize;

          this.ctx.fillStyle = block.color;
          this.ctx.fillRect(px + 2, py + 2, this.cellSize - 6, this.cellSize - 6);

          // Highlight
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.fillRect(px + 2, py + 2, this.cellSize - 6, (this.cellSize - 6) / 3);
        }
      }
    }

    // Selection indicator
    if (isSelected && !isDragging) {
      const width = block.shape[0].length * this.cellSize;
      const height = block.shape.length * this.cellSize;
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(block.x - 2, block.y - 2, width + 4, height + 4);
      this.ctx.setLineDash([]);
    }

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }

    if (this.target.length > 0) {
      const targetWidth = this.target[0].length * this.cellSize;
      this.targetOffsetX = (this.canvas.width - targetWidth) / 2;
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
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
