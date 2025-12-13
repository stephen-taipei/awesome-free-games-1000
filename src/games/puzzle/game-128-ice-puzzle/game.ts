/**
 * Ice Puzzle - Game #128
 * Slide on ice until hitting a wall or obstacle
 */

export interface Position {
  row: number;
  col: number;
}

export interface Level {
  grid: string[][];
}

const LEVELS: Level[] = [
  {
    grid: [
      ['P', '.', '.', '.', 'G'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '#', '.', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.']
    ]
  },
  {
    grid: [
      ['P', '.', '.', '.', '.'],
      ['.', '#', '.', '.', '.'],
      ['.', '.', '.', '#', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', 'G']
    ]
  },
  {
    grid: [
      ['P', '.', '.', '#', '.', '.'],
      ['.', '.', '.', '.', '.', '.'],
      ['.', '#', '.', '.', '#', '.'],
      ['.', '.', '.', '.', '.', '.'],
      ['.', '.', '#', '.', '.', '.'],
      ['.', '.', '.', '.', '.', 'G']
    ]
  },
  {
    grid: [
      ['.', '.', '.', '.', '#', '.', '.'],
      ['.', 'P', '.', '.', '.', '.', '.'],
      ['.', '#', '.', '#', '.', '#', '.'],
      ['.', '.', '.', '.', '.', '.', '.'],
      ['#', '.', '.', '.', '.', '.', '#'],
      ['.', '.', '.', '#', '.', '.', '.'],
      ['.', '.', '.', '.', '.', 'G', '.']
    ]
  },
  {
    grid: [
      ['.', '.', '#', '.', '.', '.', '.', '.'],
      ['.', 'P', '.', '.', '#', '.', '.', '.'],
      ['.', '#', '.', '.', '.', '.', '#', '.'],
      ['.', '.', '.', '#', '.', '.', '.', '.'],
      ['#', '.', '.', '.', '.', '#', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '#'],
      ['.', '#', '.', '.', '#', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', 'G', '.']
    ]
  }
];

export class IcePuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private grid: string[][] = [];
  private playerPos: Position = { row: 0, col: 0 };
  private goalPos: Position = { row: 0, col: 0 };

  private gridRows = 0;
  private gridCols = 0;
  private cellSize = 50;
  private offsetX = 0;
  private offsetY = 0;

  private currentLevel = 0;
  private moveCount = 0;

  private animating = false;
  private animationProgress = 0;
  private animationFrom: Position | null = null;
  private animationTo: Position | null = null;
  private slidePath: Position[] = [];

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  private loadLevel(index: number) {
    const level = LEVELS[index % LEVELS.length];
    this.grid = level.grid.map(row => [...row]);
    this.gridRows = this.grid.length;
    this.gridCols = this.grid[0].length;
    this.moveCount = 0;

    // Find player and goal positions
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        if (this.grid[r][c] === 'P') {
          this.playerPos = { row: r, col: c };
          this.grid[r][c] = '.';
        } else if (this.grid[r][c] === 'G') {
          this.goalPos = { row: r, col: c };
        }
      }
    }

    this.calculateLayout();
    this.notifyState();
  }

  private calculateLayout() {
    const maxWidth = this.canvas.width - 40;
    const maxHeight = this.canvas.height - 40;

    this.cellSize = Math.min(
      Math.floor(maxWidth / this.gridCols),
      Math.floor(maxHeight / this.gridRows),
      60
    );

    const gridWidth = this.gridCols * this.cellSize;
    const gridHeight = this.gridRows * this.cellSize;

    this.offsetX = (this.canvas.width - gridWidth) / 2;
    this.offsetY = (this.canvas.height - gridHeight) / 2;
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing' || this.animating) return;

    if (type === 'down') {
      const col = Math.floor((x - this.offsetX) / this.cellSize);
      const row = Math.floor((y - this.offsetY) / this.cellSize);

      // Determine direction based on clicked cell relative to player
      const dr = row - this.playerPos.row;
      const dc = col - this.playerPos.col;

      if (Math.abs(dr) > Math.abs(dc)) {
        if (dr > 0) this.slide(1, 0);
        else if (dr < 0) this.slide(-1, 0);
      } else if (Math.abs(dc) > Math.abs(dr)) {
        if (dc > 0) this.slide(0, 1);
        else if (dc < 0) this.slide(0, -1);
      }
    }
  }

  handleKey(key: string) {
    if (this.status !== 'playing' || this.animating) return;

    switch (key) {
      case 'ArrowUp':
      case 'w':
        this.slide(-1, 0);
        break;
      case 'ArrowDown':
      case 's':
        this.slide(1, 0);
        break;
      case 'ArrowLeft':
      case 'a':
        this.slide(0, -1);
        break;
      case 'ArrowRight':
      case 'd':
        this.slide(0, 1);
        break;
    }
  }

  private slide(dr: number, dc: number) {
    // Calculate slide path - keep going until hitting wall or obstacle
    this.slidePath = [{ ...this.playerPos }];
    let currentRow = this.playerPos.row;
    let currentCol = this.playerPos.col;

    while (true) {
      const nextRow = currentRow + dr;
      const nextCol = currentCol + dc;

      // Check boundaries
      if (nextRow < 0 || nextRow >= this.gridRows || nextCol < 0 || nextCol >= this.gridCols) {
        break;
      }

      // Check obstacle
      if (this.grid[nextRow][nextCol] === '#') {
        break;
      }

      currentRow = nextRow;
      currentCol = nextCol;
      this.slidePath.push({ row: currentRow, col: currentCol });
    }

    // If no movement, return
    if (this.slidePath.length <= 1) {
      return;
    }

    this.animationFrom = { ...this.playerPos };
    this.animationTo = this.slidePath[this.slidePath.length - 1];
    this.animating = true;
    this.animationProgress = 0;
    this.moveCount++;

    this.animate();
  }

  private animate() {
    this.animationProgress += 0.08;

    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.completeSlide();
      return;
    }

    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  private completeSlide() {
    if (!this.animationTo) return;

    this.playerPos = { ...this.animationTo };
    this.animating = false;
    this.slidePath = [];

    // Check win
    if (this.playerPos.row === this.goalPos.row && this.playerPos.col === this.goalPos.col) {
      this.status = 'won';
    }

    this.notifyState();
    this.draw();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background - ice blue gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#e0f7fa');
    gradient.addColorStop(1, '#b2ebf2');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;
        const cell = this.grid[r][c];

        if (cell === '#') {
          // Rock/obstacle
          this.drawRock(x, y);
        } else {
          // Ice tile
          this.drawIceTile(x, y);
        }
      }
    }

    // Draw slide trail
    if (this.animating && this.slidePath.length > 1) {
      this.ctx.strokeStyle = 'rgba(144, 202, 249, 0.6)';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();

      const startX = this.offsetX + this.slidePath[0].col * this.cellSize + this.cellSize / 2;
      const startY = this.offsetY + this.slidePath[0].row * this.cellSize + this.cellSize / 2;
      this.ctx.moveTo(startX, startY);

      for (let i = 1; i < this.slidePath.length; i++) {
        const px = this.offsetX + this.slidePath[i].col * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + this.slidePath[i].row * this.cellSize + this.cellSize / 2;
        this.ctx.lineTo(px, py);
      }

      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw goal
    this.drawGoal();

    // Draw player
    this.drawPlayer();
  }

  private drawIceTile(x: number, y: number) {
    // Ice surface
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);

    // Ice cracks/texture
    this.ctx.strokeStyle = 'rgba(144, 202, 249, 0.4)';
    this.ctx.lineWidth = 1;

    // Random crack pattern based on position
    const seed = x * 31 + y * 17;
    const crack1 = (seed % 20) + 5;
    const crack2 = (seed % 15) + 10;

    this.ctx.beginPath();
    this.ctx.moveTo(x + crack1, y + 5);
    this.ctx.lineTo(x + crack1 + 10, y + crack2);
    this.ctx.stroke();

    // Border
    this.ctx.strokeStyle = 'rgba(100, 181, 246, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
  }

  private drawRock(x: number, y: number) {
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;
    const radius = this.cellSize * 0.4;

    // Rock shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX + 3, centerY + 5, radius, radius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Rock body
    const rockGradient = this.ctx.createRadialGradient(
      centerX - radius * 0.3, centerY - radius * 0.3, 0,
      centerX, centerY, radius
    );
    rockGradient.addColorStop(0, '#78909c');
    rockGradient.addColorStop(0.5, '#546e7a');
    rockGradient.addColorStop(1, '#37474f');

    this.ctx.fillStyle = rockGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Rock highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawGoal() {
    const x = this.offsetX + this.goalPos.col * this.cellSize + this.cellSize / 2;
    const y = this.offsetY + this.goalPos.row * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.35;

    // Glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
    gradient.addColorStop(0, '#4caf50');
    gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.5)');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Flag pole
    this.ctx.strokeStyle = '#5d4037';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + radius);
    this.ctx.lineTo(x, y - radius);
    this.ctx.stroke();

    // Flag
    this.ctx.fillStyle = '#4caf50';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - radius);
    this.ctx.lineTo(x + radius * 0.8, y - radius * 0.5);
    this.ctx.lineTo(x, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawPlayer() {
    let x: number, y: number;

    if (this.animating && this.animationFrom && this.animationTo) {
      const fromX = this.offsetX + this.animationFrom.col * this.cellSize + this.cellSize / 2;
      const fromY = this.offsetY + this.animationFrom.row * this.cellSize + this.cellSize / 2;
      const toX = this.offsetX + this.animationTo.col * this.cellSize + this.cellSize / 2;
      const toY = this.offsetY + this.animationTo.row * this.cellSize + this.cellSize / 2;

      x = fromX + (toX - fromX) * this.animationProgress;
      y = fromY + (toY - fromY) * this.animationProgress;
    } else {
      x = this.offsetX + this.playerPos.col * this.cellSize + this.cellSize / 2;
      y = this.offsetY + this.playerPos.row * this.cellSize + this.cellSize / 2;
    }

    const radius = this.cellSize * 0.3;

    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(x + 2, y + radius * 0.8, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Penguin body
    const bodyGradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    bodyGradient.addColorStop(0, '#37474f');
    bodyGradient.addColorStop(1, '#263238');
    this.ctx.fillStyle = bodyGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Belly
    this.ctx.fillStyle = '#eceff1';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + radius * 0.1, radius * 0.5, radius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.25, y - radius * 0.2, radius * 0.2, 0, Math.PI * 2);
    this.ctx.arc(x + radius * 0.25, y - radius * 0.2, radius * 0.2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.25, y - radius * 0.2, radius * 0.1, 0, Math.PI * 2);
    this.ctx.arc(x + radius * 0.25, y - radius * 0.2, radius * 0.1, 0, Math.PI * 2);
    this.ctx.fill();

    // Beak
    this.ctx.fillStyle = '#ff9800';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - radius * 0.15, y + radius * 0.15);
    this.ctx.lineTo(x + radius * 0.15, y + radius * 0.15);
    this.ctx.closePath();
    this.ctx.fill();
  }

  resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    this.calculateLayout();
    this.draw();
  }

  reset() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  nextLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        moves: this.moveCount
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
