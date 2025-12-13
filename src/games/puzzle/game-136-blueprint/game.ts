/**
 * Blueprint Game
 * Game #136 - Build structures according to blueprint
 */

type BlockType = 0 | 1 | 2 | 3 | 4; // 0=empty, 1=brick, 2=wood, 3=glass, 4=metal

interface Level {
  width: number;
  height: number;
  blueprint: BlockType[][];
  availableBlocks: { type: BlockType; count: number }[];
}

const BLOCK_COLORS: Record<BlockType, { fill: string; stroke: string; name: string }> = {
  0: { fill: "transparent", stroke: "#555", name: "empty" },
  1: { fill: "#c0392b", stroke: "#962d22", name: "brick" },
  2: { fill: "#8B4513", stroke: "#654321", name: "wood" },
  3: { fill: "#85C1E9", stroke: "#5DADE2", name: "glass" },
  4: { fill: "#7f8c8d", stroke: "#566573", name: "metal" },
};

const LEVELS: Level[] = [
  // Level 1: Simple house shape
  {
    width: 5,
    height: 5,
    blueprint: [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1],
      [1, 1, 0, 1, 1],
    ],
    availableBlocks: [{ type: 1, count: 15 }],
  },
  // Level 2: Tower
  {
    width: 5,
    height: 6,
    blueprint: [
      [0, 0, 2, 0, 0],
      [0, 2, 2, 2, 0],
      [0, 2, 3, 2, 0],
      [0, 2, 2, 2, 0],
      [2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2],
    ],
    availableBlocks: [
      { type: 2, count: 18 },
      { type: 3, count: 1 },
    ],
  },
  // Level 3: Modern building
  {
    width: 6,
    height: 5,
    blueprint: [
      [4, 4, 4, 4, 4, 4],
      [4, 3, 3, 3, 3, 4],
      [4, 3, 3, 3, 3, 4],
      [4, 3, 3, 3, 3, 4],
      [4, 4, 0, 0, 4, 4],
    ],
    availableBlocks: [
      { type: 4, count: 14 },
      { type: 3, count: 12 },
    ],
  },
  // Level 4: Castle
  {
    width: 7,
    height: 6,
    blueprint: [
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 3, 3, 3, 1, 1],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1],
    ],
    availableBlocks: [
      { type: 1, count: 28 },
      { type: 3, count: 3 },
    ],
  },
  // Level 5: Skyscraper
  {
    width: 5,
    height: 8,
    blueprint: [
      [0, 0, 4, 0, 0],
      [0, 4, 4, 4, 0],
      [4, 3, 3, 3, 4],
      [4, 3, 3, 3, 4],
      [4, 3, 3, 3, 4],
      [4, 3, 3, 3, 4],
      [4, 4, 4, 4, 4],
      [4, 4, 0, 4, 4],
    ],
    availableBlocks: [
      { type: 4, count: 20 },
      { type: 3, count: 12 },
    ],
  },
  // Level 6: Bridge
  {
    width: 9,
    height: 4,
    blueprint: [
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 2, 2, 2, 2, 2, 0, 0],
      [2, 2, 2, 2, 2, 2, 2, 2, 2],
      [4, 0, 0, 0, 0, 0, 0, 0, 4],
    ],
    availableBlocks: [
      { type: 2, count: 15 },
      { type: 4, count: 2 },
    ],
  },
  // Level 7: Complex structure
  {
    width: 7,
    height: 7,
    blueprint: [
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 3, 3, 3, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2],
      [2, 3, 2, 0, 2, 3, 2],
      [2, 2, 2, 0, 2, 2, 2],
      [4, 4, 4, 4, 4, 4, 4],
    ],
    availableBlocks: [
      { type: 1, count: 12 },
      { type: 2, count: 14 },
      { type: 3, count: 5 },
      { type: 4, count: 7 },
    ],
  },
  // Level 8: Temple
  {
    width: 9,
    height: 6,
    blueprint: [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 4, 4, 4, 4, 4, 1, 0],
      [0, 1, 4, 3, 4, 3, 4, 1, 0],
      [4, 4, 4, 4, 0, 4, 4, 4, 4],
    ],
    availableBlocks: [
      { type: 1, count: 10 },
      { type: 4, count: 18 },
      { type: 3, count: 2 },
    ],
  },
];

export class BlueprintGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private cellSize: number = 40;

  currentLevel: number = 0;
  buildGrid: BlockType[][] = [];
  selectedBlock: BlockType = 1;
  blockCounts: Map<BlockType, number> = new Map();
  score: number = 0;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

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

    const maxCellWidth = (this.width - 40) / (level.width * 2 + 2);
    const maxCellHeight = (this.height - 100) / level.height;
    this.cellSize = Math.min(maxCellWidth, maxCellHeight, 45);
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
          score: this.score,
        });
      }
      return;
    }

    const level = LEVELS[levelIndex];

    // Initialize empty build grid
    this.buildGrid = [];
    for (let y = 0; y < level.height; y++) {
      this.buildGrid.push(new Array(level.width).fill(0));
    }

    // Initialize block counts
    this.blockCounts.clear();
    level.availableBlocks.forEach((block) => {
      this.blockCounts.set(block.type, block.count);
    });

    // Set first available block as selected
    this.selectedBlock = level.availableBlocks[0]?.type || 1;
    this.status = "playing";

    this.calculateCellSize();
    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        score: this.score,
        blocks: this.getBlocksState(),
        selectedBlock: this.selectedBlock,
      });
    }
  }

  private getBlocksState() {
    const blocks: { type: BlockType; count: number; color: string }[] = [];
    this.blockCounts.forEach((count, type) => {
      blocks.push({
        type,
        count,
        color: BLOCK_COLORS[type].fill,
      });
    });
    return blocks;
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const level = LEVELS[this.currentLevel];
    const gridWidth = level.width * this.cellSize;
    const startX = (this.width - gridWidth) / 2;
    const startY = 60;

    // Check if click is on build grid
    const gridX = Math.floor((x - startX) / this.cellSize);
    const gridY = Math.floor((y - startY) / this.cellSize);

    if (gridX >= 0 && gridX < level.width && gridY >= 0 && gridY < level.height) {
      this.toggleCell(gridX, gridY);
    }
  }

  private toggleCell(x: number, y: number) {
    const currentBlock = this.buildGrid[y][x];

    if (currentBlock === 0) {
      // Place selected block if available
      const count = this.blockCounts.get(this.selectedBlock) || 0;
      if (count > 0) {
        this.buildGrid[y][x] = this.selectedBlock;
        this.blockCounts.set(this.selectedBlock, count - 1);
      }
    } else {
      // Remove block and return to inventory
      const count = this.blockCounts.get(currentBlock) || 0;
      this.blockCounts.set(currentBlock, count + 1);
      this.buildGrid[y][x] = 0;
    }

    this.render();
    this.checkWin();

    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        score: this.score,
        blocks: this.getBlocksState(),
        selectedBlock: this.selectedBlock,
      });
    }
  }

  public selectBlock(type: BlockType) {
    if (this.blockCounts.has(type)) {
      this.selectedBlock = type;
      this.render();

      if (this.onStateChange) {
        this.onStateChange({
          status: this.status,
          level: this.currentLevel + 1,
          score: this.score,
          blocks: this.getBlocksState(),
          selectedBlock: this.selectedBlock,
        });
      }
    }
  }

  private checkWin() {
    const level = LEVELS[this.currentLevel];
    let match = true;

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        if (this.buildGrid[y][x] !== level.blueprint[y][x]) {
          match = false;
          break;
        }
      }
      if (!match) break;
    }

    if (match) {
      this.status = "won";
      this.score += 100 + this.currentLevel * 20;

      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          score: this.score,
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
    const startX = (this.width - gridWidth) / 2;
    const startY = 60;

    // Draw blueprint (semi-transparent reference)
    this.drawBlueprint(level, startX, startY);

    // Draw build grid
    this.drawBuildGrid(level, startX, startY);

    // Draw block selector
    this.drawBlockSelector();
  }

  private drawBlueprint(level: Level, startX: number, startY: number) {
    const ctx = this.ctx;
    const smallSize = this.cellSize * 0.4;
    const bpStartX = 20;
    const bpStartY = startY;

    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(bpStartX - 5, bpStartY - 25, level.width * smallSize + 10, level.height * smallSize + 35);

    ctx.fillStyle = "#3498db";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BLUEPRINT", bpStartX + (level.width * smallSize) / 2, bpStartY - 10);

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const blockType = level.blueprint[y][x];
        const bx = bpStartX + x * smallSize;
        const by = bpStartY + y * smallSize;

        if (blockType !== 0) {
          ctx.fillStyle = BLOCK_COLORS[blockType].fill;
          ctx.fillRect(bx, by, smallSize - 1, smallSize - 1);
        } else {
          ctx.strokeStyle = "#555";
          ctx.strokeRect(bx, by, smallSize - 1, smallSize - 1);
        }
      }
    }
  }

  private drawBuildGrid(level: Level, startX: number, startY: number) {
    const ctx = this.ctx;

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const blockType = this.buildGrid[y][x];
        const bx = startX + x * this.cellSize;
        const by = startY + y * this.cellSize;

        // Draw cell background
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(bx, by, this.cellSize - 2, this.cellSize - 2);

        if (blockType !== 0) {
          // Draw placed block
          ctx.fillStyle = BLOCK_COLORS[blockType].fill;
          ctx.fillRect(bx + 2, by + 2, this.cellSize - 6, this.cellSize - 6);

          // Highlight effect
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.fillRect(bx + 2, by + 2, this.cellSize - 6, (this.cellSize - 6) / 3);

          ctx.strokeStyle = BLOCK_COLORS[blockType].stroke;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx + 2, by + 2, this.cellSize - 6, this.cellSize - 6);
        } else {
          // Show blueprint hint
          const hintType = level.blueprint[y][x];
          if (hintType !== 0) {
            ctx.fillStyle = BLOCK_COLORS[hintType].fill + "30";
            ctx.fillRect(bx + 4, by + 4, this.cellSize - 10, this.cellSize - 10);
          }
        }

        // Grid lines
        ctx.strokeStyle = "#34495e";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, this.cellSize - 2, this.cellSize - 2);
      }
    }
  }

  private drawBlockSelector() {
    const ctx = this.ctx;
    const selectorY = this.height - 70;
    const blockTypes = Array.from(this.blockCounts.keys());
    const totalWidth = blockTypes.length * 60;
    let startX = (this.width - totalWidth) / 2;

    blockTypes.forEach((type) => {
      const count = this.blockCounts.get(type) || 0;
      const isSelected = type === this.selectedBlock;

      // Background
      ctx.fillStyle = isSelected ? "#3498db" : "#2c3e50";
      ctx.fillRect(startX, selectorY, 50, 60);

      // Block preview
      ctx.fillStyle = BLOCK_COLORS[type].fill;
      ctx.fillRect(startX + 10, selectorY + 8, 30, 30);

      ctx.strokeStyle = BLOCK_COLORS[type].stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(startX + 10, selectorY + 8, 30, 30);

      // Count
      ctx.fillStyle = count > 0 ? "#fff" : "#e74c3c";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${count}`, startX + 25, selectorY + 55);

      if (isSelected) {
        ctx.strokeStyle = "#f39c12";
        ctx.lineWidth = 3;
        ctx.strokeRect(startX - 2, selectorY - 2, 54, 64);
      }

      startX += 60;
    });
  }

  public selectBlockByPosition(x: number, y: number) {
    const selectorY = this.height - 70;
    if (y < selectorY || y > selectorY + 60) return;

    const blockTypes = Array.from(this.blockCounts.keys());
    const totalWidth = blockTypes.length * 60;
    const startX = (this.width - totalWidth) / 2;

    const index = Math.floor((x - startX) / 60);
    if (index >= 0 && index < blockTypes.length) {
      this.selectBlock(blockTypes[index]);
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
    this.score = 0;
    this.loadLevel(0);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public getAvailableBlocks(): { type: BlockType; count: number; color: string }[] {
    return this.getBlocksState();
  }
}
