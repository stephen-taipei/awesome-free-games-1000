/**
 * Gravity Blocks - Game #036
 * A physics puzzle where gravity affects block movement
 */

export interface Block {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  vx: number;
  vy: number;
  isTarget: boolean;
  isPlayer: boolean;
}

export interface Level {
  blocks: Omit<Block, 'vx' | 'vy'>[];
  gravity: { x: number; y: number };
  targetZone: { x: number; y: number; width: number; height: number };
}

const LEVELS: Level[] = [
  {
    gravity: { x: 0, y: 0.5 },
    targetZone: { x: 450, y: 320, width: 80, height: 80 },
    blocks: [
      { id: 0, x: 100, y: 100, width: 40, height: 40, color: '#3498db', isTarget: false, isPlayer: true },
      { id: 1, x: 200, y: 200, width: 100, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 2, x: 350, y: 280, width: 100, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
    ]
  },
  {
    gravity: { x: 0, y: 0.5 },
    targetZone: { x: 50, y: 320, width: 80, height: 80 },
    blocks: [
      { id: 0, x: 500, y: 50, width: 40, height: 40, color: '#3498db', isTarget: false, isPlayer: true },
      { id: 1, x: 400, y: 150, width: 80, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 2, x: 250, y: 220, width: 80, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 3, x: 100, y: 280, width: 80, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
    ]
  },
  {
    gravity: { x: 0, y: 0.5 },
    targetZone: { x: 260, y: 320, width: 80, height: 80 },
    blocks: [
      { id: 0, x: 50, y: 50, width: 40, height: 40, color: '#3498db', isTarget: false, isPlayer: true },
      { id: 1, x: 150, y: 150, width: 60, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 2, x: 300, y: 100, width: 60, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 3, x: 200, y: 250, width: 200, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 4, x: 450, y: 180, width: 60, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
    ]
  },
  {
    gravity: { x: 0.3, y: 0.3 },
    targetZone: { x: 480, y: 320, width: 80, height: 80 },
    blocks: [
      { id: 0, x: 50, y: 50, width: 40, height: 40, color: '#3498db', isTarget: false, isPlayer: true },
      { id: 1, x: 200, y: 150, width: 80, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 2, x: 350, y: 250, width: 80, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
    ]
  },
  {
    gravity: { x: -0.3, y: 0.5 },
    targetZone: { x: 20, y: 320, width: 80, height: 80 },
    blocks: [
      { id: 0, x: 500, y: 50, width: 40, height: 40, color: '#3498db', isTarget: false, isPlayer: true },
      { id: 1, x: 400, y: 120, width: 100, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 2, x: 200, y: 200, width: 100, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
      { id: 3, x: 80, y: 280, width: 100, height: 20, color: '#7f8c8d', isTarget: false, isPlayer: false },
    ]
  }
];

export class GravityBlocksGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  blocks: Block[] = [];
  currentLevel = 0;
  gravity = { x: 0, y: 0.5 };
  targetZone = { x: 0, y: 0, width: 0, height: 0 };

  draggingBlock: Block | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  status: 'playing' | 'won' | 'paused' = 'paused';
  moves = 0;

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];
    this.gravity = { ...level.gravity };
    this.targetZone = { ...level.targetZone };
    this.moves = 0;

    this.blocks = level.blocks.map(b => ({
      ...b,
      vx: 0,
      vy: 0
    }));

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

    const friction = 0.98;
    const bounce = 0.5;

    this.blocks.forEach(block => {
      if (block === this.draggingBlock) return;
      if (!block.isPlayer) return; // Only player blocks move

      // Apply gravity
      block.vx += this.gravity.x;
      block.vy += this.gravity.y;

      // Apply friction
      block.vx *= friction;
      block.vy *= friction;

      // Update position
      block.x += block.vx;
      block.y += block.vy;

      // Collision with canvas bounds
      if (block.x < 0) {
        block.x = 0;
        block.vx = -block.vx * bounce;
      }
      if (block.x + block.width > this.canvas.width) {
        block.x = this.canvas.width - block.width;
        block.vx = -block.vx * bounce;
      }
      if (block.y < 0) {
        block.y = 0;
        block.vy = -block.vy * bounce;
      }
      if (block.y + block.height > this.canvas.height) {
        block.y = this.canvas.height - block.height;
        block.vy = -block.vy * bounce;
      }

      // Collision with other blocks (platforms)
      this.blocks.forEach(other => {
        if (other === block || other.isPlayer) return;

        if (this.checkCollision(block, other)) {
          this.resolveCollision(block, other, bounce);
        }
      });
    });

    // Check win condition
    const playerBlock = this.blocks.find(b => b.isPlayer);
    if (playerBlock && this.isInTargetZone(playerBlock)) {
      const speed = Math.sqrt(playerBlock.vx ** 2 + playerBlock.vy ** 2);
      if (speed < 1) {
        this.status = 'won';
        this.notifyState();
      }
    }
  }

  private checkCollision(a: Block, b: Block): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  private resolveCollision(moving: Block, static_: Block, bounce: number) {
    // Find overlap
    const overlapLeft = (moving.x + moving.width) - static_.x;
    const overlapRight = (static_.x + static_.width) - moving.x;
    const overlapTop = (moving.y + moving.height) - static_.y;
    const overlapBottom = (static_.y + static_.height) - moving.y;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      // Horizontal collision
      if (overlapLeft < overlapRight) {
        moving.x = static_.x - moving.width;
      } else {
        moving.x = static_.x + static_.width;
      }
      moving.vx = -moving.vx * bounce;
    } else {
      // Vertical collision
      if (overlapTop < overlapBottom) {
        moving.y = static_.y - moving.height;
        moving.vy = -moving.vy * bounce;
        // Add friction when on top
        moving.vx *= 0.9;
      } else {
        moving.y = static_.y + static_.height;
        moving.vy = -moving.vy * bounce;
      }
    }
  }

  private isInTargetZone(block: Block): boolean {
    const centerX = block.x + block.width / 2;
    const centerY = block.y + block.height / 2;

    return centerX >= this.targetZone.x &&
           centerX <= this.targetZone.x + this.targetZone.width &&
           centerY >= this.targetZone.y &&
           centerY <= this.targetZone.y + this.targetZone.height;
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Draw gravity indicator
    this.drawGravityIndicator();

    // Draw target zone
    this.ctx.fillStyle = this.status === 'won' ? 'rgba(46, 204, 113, 0.5)' : 'rgba(241, 196, 15, 0.3)';
    this.ctx.strokeStyle = this.status === 'won' ? '#2ecc71' : '#f1c40f';
    this.ctx.lineWidth = 3;
    this.ctx.fillRect(this.targetZone.x, this.targetZone.y, this.targetZone.width, this.targetZone.height);
    this.ctx.strokeRect(this.targetZone.x, this.targetZone.y, this.targetZone.width, this.targetZone.height);

    // Draw blocks
    this.blocks.forEach(block => {
      this.ctx.save();

      if (block.isPlayer) {
        // Player block with shadow
        this.ctx.shadowColor = block.color;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(block.x, block.y, block.width, block.height);

        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(block.x, block.y, block.width, block.height / 3);
      } else {
        // Platform block
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(block.x, block.y, block.width, block.height);

        // 3D effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(block.x, block.y, block.width, 3);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(block.x, block.y + block.height - 3, block.width, 3);
      }

      this.ctx.restore();
    });
  }

  private drawGravityIndicator() {
    const cx = 50;
    const cy = 50;
    const radius = 25;

    // Background circle
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Gravity arrow
    const angle = Math.atan2(this.gravity.y, this.gravity.x);
    const magnitude = Math.sqrt(this.gravity.x ** 2 + this.gravity.y ** 2);
    const arrowLength = Math.min(magnitude * 30, radius - 5);

    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(
      cx + Math.cos(angle) * arrowLength,
      cy + Math.sin(angle) * arrowLength
    );
    this.ctx.stroke();

    // Arrow head
    const headLength = 8;
    const headAngle = Math.PI / 6;
    const tipX = cx + Math.cos(angle) * arrowLength;
    const tipY = cy + Math.sin(angle) * arrowLength;

    this.ctx.beginPath();
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(
      tipX - Math.cos(angle - headAngle) * headLength,
      tipY - Math.sin(angle - headAngle) * headLength
    );
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(
      tipX - Math.cos(angle + headAngle) * headLength,
      tipY - Math.sin(angle + headAngle) * headLength
    );
    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = 'white';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('G', cx, cy + radius + 15);
  }

  public handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      // Check if clicking on a platform (not player)
      const clicked = this.blocks.find(b => {
        if (b.isPlayer) return false;
        return x >= b.x && x <= b.x + b.width &&
               y >= b.y && y <= b.y + b.height;
      });

      if (clicked) {
        this.draggingBlock = clicked;
        this.dragOffsetX = x - clicked.x;
        this.dragOffsetY = y - clicked.y;
      }
    } else if (type === 'move') {
      if (this.draggingBlock) {
        this.draggingBlock.x = x - this.dragOffsetX;
        this.draggingBlock.y = y - this.dragOffsetY;

        // Keep in bounds
        this.draggingBlock.x = Math.max(0, Math.min(this.canvas.width - this.draggingBlock.width, this.draggingBlock.x));
        this.draggingBlock.y = Math.max(0, Math.min(this.canvas.height - this.draggingBlock.height, this.draggingBlock.y));
      }
    } else if (type === 'up') {
      if (this.draggingBlock) {
        this.moves++;
        this.notifyState();
      }
      this.draggingBlock = null;
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(600, rect.width);
      this.canvas.height = 400;
    }
  }

  public reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  public nextLevel() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
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
        moves: this.moves
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
