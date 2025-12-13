/**
 * Stack Puzzle - Game #045
 * Stack blocks to reach the target height
 */

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  color: string;
  settled: boolean;
}

export interface Level {
  targetHeight: number;
  blocksAvailable: number;
  blockWidth: number;
}

const COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#e67e22',
  '#1abc9c',
  '#34495e'
];

const LEVELS: Level[] = [
  { targetHeight: 100, blocksAvailable: 3, blockWidth: 80 },
  { targetHeight: 150, blocksAvailable: 4, blockWidth: 70 },
  { targetHeight: 200, blocksAvailable: 5, blockWidth: 60 },
  { targetHeight: 250, blocksAvailable: 6, blockWidth: 55 },
  { targetHeight: 300, blocksAvailable: 8, blockWidth: 50 }
];

export class StackPuzzleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  blocks: Block[] = [];
  currentBlock: Block | null = null;

  currentLevel = 0;
  blocksUsed = 0;
  blocksAvailable = 3;
  targetHeight = 100;
  blockWidth = 80;
  blockHeight = 30;

  groundY = 0;
  swingSpeed = 3;
  swingDirection = 1;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.spawnBlock();
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];
    this.targetHeight = level.targetHeight;
    this.blocksAvailable = level.blocksAvailable;
    this.blockWidth = level.blockWidth;
    this.blocksUsed = 0;

    this.groundY = this.canvas.height - 50;
    this.blocks = [];
    this.currentBlock = null;

    this.notifyState();
  }

  private spawnBlock() {
    if (this.blocksUsed >= this.blocksAvailable) {
      this.checkWinCondition();
      return;
    }

    this.currentBlock = {
      x: this.canvas.width / 2 - this.blockWidth / 2,
      y: 50,
      width: this.blockWidth,
      height: this.blockHeight,
      vx: 0,
      vy: 0,
      color: COLORS[this.blocksUsed % COLORS.length],
      settled: false
    };

    this.swingDirection = 1;
  }

  public dropBlock() {
    if (this.status !== 'playing' || !this.currentBlock) return;

    this.currentBlock.vy = 5;
    this.blocksUsed++;
    this.notifyState();
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === 'playing') {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (this.status !== 'playing') return;

    // Update current block swing
    if (this.currentBlock && this.currentBlock.vy === 0) {
      this.currentBlock.x += this.swingSpeed * this.swingDirection;

      // Bounce at edges
      if (this.currentBlock.x + this.currentBlock.width > this.canvas.width - 20) {
        this.swingDirection = -1;
      } else if (this.currentBlock.x < 20) {
        this.swingDirection = 1;
      }
    }

    // Update falling block
    if (this.currentBlock && this.currentBlock.vy > 0) {
      this.currentBlock.vy += 0.5; // Gravity
      this.currentBlock.y += this.currentBlock.vy;

      // Check collision with ground
      if (this.currentBlock.y + this.currentBlock.height >= this.groundY) {
        this.currentBlock.y = this.groundY - this.currentBlock.height;
        this.settleBlock(this.currentBlock);
      }

      // Check collision with other blocks
      for (const block of this.blocks) {
        if (this.checkCollision(this.currentBlock, block)) {
          this.currentBlock.y = block.y - this.currentBlock.height;
          this.settleBlock(this.currentBlock);
          break;
        }
      }
    }

    // Simple physics for settled blocks
    this.updatePhysics();
  }

  private checkCollision(a: Block, b: Block): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y + a.height >= b.y &&
           a.y < b.y + b.height;
  }

  private settleBlock(block: Block) {
    block.vy = 0;
    block.settled = true;
    this.blocks.push(block);
    this.currentBlock = null;

    // Check stability
    setTimeout(() => {
      if (this.checkStability()) {
        this.spawnBlock();
      } else {
        this.status = 'lost';
        this.notifyState();
      }
    }, 500);
  }

  private updatePhysics() {
    // Simple stability check - blocks that extend too far fall
    this.blocks.forEach(block => {
      if (!block.settled) return;

      // Find support
      const support = this.findSupport(block);

      if (support === null && block.y + block.height < this.groundY) {
        // No support, fall
        block.vy += 0.5;
        block.y += block.vy;

        if (block.y + block.height >= this.groundY) {
          block.y = this.groundY - block.height;
          block.vy = 0;
        }
      }
    });
  }

  private findSupport(block: Block): Block | 'ground' | null {
    // Check ground
    if (block.y + block.height >= this.groundY - 1) {
      return 'ground';
    }

    // Check other blocks below
    for (const other of this.blocks) {
      if (other === block) continue;

      // Check if other block is directly below
      if (Math.abs((other.y) - (block.y + block.height)) < 5) {
        // Check horizontal overlap
        const overlapLeft = Math.max(block.x, other.x);
        const overlapRight = Math.min(block.x + block.width, other.x + other.width);
        const overlap = overlapRight - overlapLeft;

        if (overlap > block.width * 0.3) { // At least 30% overlap
          return other;
        }
      }
    }

    return null;
  }

  private checkStability(): boolean {
    for (const block of this.blocks) {
      const support = this.findSupport(block);
      if (support === null) {
        return false;
      }
    }
    return true;
  }

  private checkWinCondition() {
    // Calculate stack height
    let minY = this.groundY;
    for (const block of this.blocks) {
      minY = Math.min(minY, block.y);
    }

    const stackHeight = this.groundY - minY;

    if (stackHeight >= this.targetHeight) {
      this.status = 'won';
    } else {
      this.status = 'lost';
    }

    this.notifyState();
  }

  private getStackHeight(): number {
    if (this.blocks.length === 0) return 0;

    let minY = this.groundY;
    for (const block of this.blocks) {
      minY = Math.min(minY, block.y);
    }

    return this.groundY - minY;
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw target height line
    const targetY = this.groundY - this.targetHeight;
    this.ctx.strokeStyle = '#2ecc71';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, targetY);
    this.ctx.lineTo(this.canvas.width, targetY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Target height label
    this.ctx.fillStyle = '#2ecc71';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Target: ${this.targetHeight}px`, 10, targetY - 5);

    // Draw current height
    const currentHeight = this.getStackHeight();
    if (currentHeight > 0) {
      const currentHeightY = this.groundY - currentHeight;
      this.ctx.strokeStyle = '#f39c12';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(this.canvas.width - 50, currentHeightY);
      this.ctx.lineTo(this.canvas.width - 10, currentHeightY);
      this.ctx.stroke();

      this.ctx.fillStyle = '#f39c12';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${Math.round(currentHeight)}px`, this.canvas.width - 55, currentHeightY + 4);
    }

    // Draw ground
    this.ctx.fillStyle = '#34495e';
    this.ctx.fillRect(0, this.groundY, this.canvas.width, 50);

    // Draw ground texture
    this.ctx.fillStyle = '#2c3e50';
    for (let i = 0; i < this.canvas.width; i += 20) {
      this.ctx.fillRect(i, this.groundY, 10, 50);
    }

    // Draw settled blocks
    this.blocks.forEach(block => {
      this.drawBlock(block);
    });

    // Draw current block
    if (this.currentBlock) {
      this.drawBlock(this.currentBlock);

      // Draw drop indicator
      if (this.currentBlock.vy === 0) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.currentBlock.x + this.currentBlock.width / 2, this.currentBlock.y + this.currentBlock.height);
        this.ctx.lineTo(this.currentBlock.x + this.currentBlock.width / 2, this.groundY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
  }

  private drawBlock(block: Block) {
    this.ctx.save();

    // Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 5;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // Block
    this.ctx.fillStyle = block.color;
    this.ctx.fillRect(block.x, block.y, block.width, block.height);

    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(block.x, block.y, block.width, block.height / 3);

    // Border
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(block.x, block.y, block.width, block.height);

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
      this.groundY = this.canvas.height - 50;
    }
    this.draw();
  }

  public reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.spawnBlock();
    this.loop();
  }

  public nextLevel() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.spawnBlock();
    this.loop();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        blocksUsed: this.blocksUsed,
        blocksAvailable: this.blocksAvailable,
        currentHeight: Math.round(this.getStackHeight()),
        targetHeight: this.targetHeight
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
