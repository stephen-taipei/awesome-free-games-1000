/**
 * Wormhole - Game #127
 * Use wormholes to teleport and solve puzzles
 */

export interface Position {
  row: number;
  col: number;
}

export interface Wormhole {
  id: number;
  entries: Position[];
  color: string;
}

export interface Level {
  grid: string[][];
  wormholes: Wormhole[];
}

const LEVELS: Level[] = [
  {
    grid: [
      ['P', '.', '.', 'A'],
      ['.', '#', '#', '.'],
      ['.', '#', '#', '.'],
      ['A', '.', '.', 'G']
    ],
    wormholes: [{ id: 1, entries: [{ row: 0, col: 3 }, { row: 3, col: 0 }], color: '#e74c3c' }]
  },
  {
    grid: [
      ['P', '.', '#', '.', '.'],
      ['.', 'A', '#', 'B', '.'],
      ['#', '#', '#', '#', '.'],
      ['.', 'B', '#', 'A', '.'],
      ['.', '.', '#', '.', 'G']
    ],
    wormholes: [
      { id: 1, entries: [{ row: 1, col: 1 }, { row: 3, col: 3 }], color: '#e74c3c' },
      { id: 2, entries: [{ row: 1, col: 3 }, { row: 3, col: 1 }], color: '#3498db' }
    ]
  },
  {
    grid: [
      ['P', '.', '.', '#', '.', 'A'],
      ['.', '#', '.', '#', '.', '.'],
      ['.', '#', 'B', '.', '#', '.'],
      ['.', '.', '.', '#', 'B', '.'],
      ['#', '#', '#', '#', '.', '.'],
      ['A', '.', '.', '.', '.', 'G']
    ],
    wormholes: [
      { id: 1, entries: [{ row: 0, col: 5 }, { row: 5, col: 0 }], color: '#e74c3c' },
      { id: 2, entries: [{ row: 2, col: 2 }, { row: 3, col: 4 }], color: '#3498db' }
    ]
  },
  {
    grid: [
      ['P', '.', 'A', '#', '#', '.', '.'],
      ['.', '#', '.', '#', '#', 'C', '.'],
      ['.', '#', '.', '.', '.', '.', '.'],
      ['B', '.', '#', '#', '#', '#', '.'],
      ['.', '.', '#', '.', '.', '.', '.'],
      ['.', 'C', '#', 'A', '#', 'B', '.'],
      ['.', '.', '.', '.', '#', '.', 'G']
    ],
    wormholes: [
      { id: 1, entries: [{ row: 0, col: 2 }, { row: 5, col: 3 }], color: '#e74c3c' },
      { id: 2, entries: [{ row: 3, col: 0 }, { row: 5, col: 5 }], color: '#3498db' },
      { id: 3, entries: [{ row: 1, col: 5 }, { row: 5, col: 1 }], color: '#2ecc71' }
    ]
  },
  {
    grid: [
      ['P', 'A', '#', '#', '.', '.', '.', '.'],
      ['.', '.', '#', '#', '.', 'D', '#', '.'],
      ['.', '.', '.', '.', '#', '.', '#', '.'],
      ['#', '#', 'B', '.', '#', '.', '.', '.'],
      ['.', '.', '.', '#', '#', '#', 'C', '.'],
      ['.', 'C', '#', '#', '.', '.', '.', '.'],
      ['.', '.', '#', 'A', '.', '#', '#', 'B'],
      ['D', '.', '.', '.', '.', '#', '#', 'G']
    ],
    wormholes: [
      { id: 1, entries: [{ row: 0, col: 1 }, { row: 6, col: 3 }], color: '#e74c3c' },
      { id: 2, entries: [{ row: 3, col: 2 }, { row: 6, col: 7 }], color: '#3498db' },
      { id: 3, entries: [{ row: 4, col: 6 }, { row: 5, col: 1 }], color: '#2ecc71' },
      { id: 4, entries: [{ row: 1, col: 5 }, { row: 7, col: 0 }], color: '#f39c12' }
    ]
  }
];

export class WormholeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private grid: string[][] = [];
  private wormholes: Wormhole[] = [];
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
  private isTeleporting = false;

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
    this.wormholes = level.wormholes;
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
        // Vertical movement
        if (dr > 0) this.move(1, 0);
        else if (dr < 0) this.move(-1, 0);
      } else if (Math.abs(dc) > Math.abs(dr)) {
        // Horizontal movement
        if (dc > 0) this.move(0, 1);
        else if (dc < 0) this.move(0, -1);
      }
    }
  }

  handleKey(key: string) {
    if (this.status !== 'playing' || this.animating) return;

    switch (key) {
      case 'ArrowUp':
      case 'w':
        this.move(-1, 0);
        break;
      case 'ArrowDown':
      case 's':
        this.move(1, 0);
        break;
      case 'ArrowLeft':
      case 'a':
        this.move(0, -1);
        break;
      case 'ArrowRight':
      case 'd':
        this.move(0, 1);
        break;
    }
  }

  private move(dr: number, dc: number) {
    const newRow = this.playerPos.row + dr;
    const newCol = this.playerPos.col + dc;

    if (newRow < 0 || newRow >= this.gridRows || newCol < 0 || newCol >= this.gridCols) return;
    if (this.grid[newRow][newCol] === '#') return;

    this.animationFrom = { ...this.playerPos };
    this.animationTo = { row: newRow, col: newCol };
    this.animating = true;
    this.animationProgress = 0;
    this.isTeleporting = false;

    this.animate();
  }

  private animate() {
    this.animationProgress += 0.15;

    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.completeMove();
      return;
    }

    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  private completeMove() {
    if (!this.animationTo) return;

    this.playerPos = { ...this.animationTo };
    this.moveCount++;
    this.animating = false;

    // Check for wormhole
    const wormhole = this.findWormholeAt(this.playerPos);
    if (wormhole && !this.isTeleporting) {
      const otherEntry = wormhole.entries.find(
        e => e.row !== this.playerPos.row || e.col !== this.playerPos.col
      );
      if (otherEntry) {
        this.teleport(otherEntry);
        return;
      }
    }

    // Check win
    if (this.playerPos.row === this.goalPos.row && this.playerPos.col === this.goalPos.col) {
      this.status = 'won';
    }

    this.notifyState();
    this.draw();
  }

  private teleport(to: Position) {
    this.animationFrom = { ...this.playerPos };
    this.animationTo = to;
    this.animating = true;
    this.animationProgress = 0;
    this.isTeleporting = true;

    this.animateTeleport();
  }

  private animateTeleport() {
    this.animationProgress += 0.1;

    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.completeTeleport();
      return;
    }

    this.draw();
    requestAnimationFrame(() => this.animateTeleport());
  }

  private completeTeleport() {
    if (!this.animationTo) return;

    this.playerPos = { ...this.animationTo };
    this.animating = false;
    this.isTeleporting = false;

    // Check win
    if (this.playerPos.row === this.goalPos.row && this.playerPos.col === this.goalPos.col) {
      this.status = 'won';
    }

    this.notifyState();
    this.draw();
  }

  private findWormholeAt(pos: Position): Wormhole | null {
    for (const wh of this.wormholes) {
      for (const entry of wh.entries) {
        if (entry.row === pos.row && entry.col === pos.col) {
          return wh;
        }
      }
    }
    return null;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.drawStars();

    // Draw grid
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;
        const cell = this.grid[r][c];

        // Cell background
        if (cell === '#') {
          this.ctx.fillStyle = 'rgba(100, 100, 150, 0.8)';
        } else {
          this.ctx.fillStyle = 'rgba(30, 30, 60, 0.5)';
        }
        this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);

        // Border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
      }
    }

    // Draw wormholes
    for (const wh of this.wormholes) {
      for (const entry of wh.entries) {
        this.drawWormhole(entry, wh.color);
      }
    }

    // Draw goal
    this.drawGoal();

    // Draw player
    this.drawPlayer();
  }

  private drawStars() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const starPositions = [
      [50, 30], [120, 80], [200, 45], [300, 90], [400, 35],
      [80, 150], [180, 200], [320, 180], [450, 120], [30, 250],
      [250, 300], [380, 280], [480, 250], [100, 380], [220, 420]
    ];

    for (const [x, y] of starPositions) {
      this.ctx.beginPath();
      this.ctx.arc(x % this.canvas.width, y % this.canvas.height, 1, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawWormhole(pos: Position, color: string) {
    const x = this.offsetX + pos.col * this.cellSize + this.cellSize / 2;
    const y = this.offsetY + pos.row * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.35;

    // Outer glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner spiral
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = (Date.now() / 500 + i * Math.PI * 2 / 3) % (Math.PI * 2);
      const spiralRadius = radius * 0.8;
      this.ctx.moveTo(x, y);
      this.ctx.arc(x, y, spiralRadius, angle, angle + Math.PI);
    }
    this.ctx.stroke();

    // Center
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawGoal() {
    const x = this.offsetX + this.goalPos.col * this.cellSize + this.cellSize / 2;
    const y = this.offsetY + this.goalPos.row * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.3;

    // Glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    gradient.addColorStop(0, '#f1c40f');
    gradient.addColorStop(0.5, '#f1c40f80');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Star
    this.ctx.fillStyle = '#f1c40f';
    this.drawStar(x, y, 5, radius, radius * 0.5);
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawPlayer() {
    let x: number, y: number;

    if (this.animating && this.animationFrom && this.animationTo) {
      if (this.isTeleporting) {
        // Fade out/in effect
        const alpha = this.animationProgress < 0.5
          ? 1 - this.animationProgress * 2
          : (this.animationProgress - 0.5) * 2;

        const pos = this.animationProgress < 0.5 ? this.animationFrom : this.animationTo;
        x = this.offsetX + pos.col * this.cellSize + this.cellSize / 2;
        y = this.offsetY + pos.row * this.cellSize + this.cellSize / 2;

        this.ctx.globalAlpha = alpha;
      } else {
        // Linear interpolation
        const fromX = this.offsetX + this.animationFrom.col * this.cellSize + this.cellSize / 2;
        const fromY = this.offsetY + this.animationFrom.row * this.cellSize + this.cellSize / 2;
        const toX = this.offsetX + this.animationTo.col * this.cellSize + this.cellSize / 2;
        const toY = this.offsetY + this.animationTo.row * this.cellSize + this.cellSize / 2;

        x = fromX + (toX - fromX) * this.animationProgress;
        y = fromY + (toY - fromY) * this.animationProgress;
      }
    } else {
      x = this.offsetX + this.playerPos.col * this.cellSize + this.cellSize / 2;
      y = this.offsetY + this.playerPos.row * this.cellSize + this.cellSize / 2;
    }

    const radius = this.cellSize * 0.3;

    // Glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
    gradient.addColorStop(0, '#9b59b6');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Player body
    this.ctx.fillStyle = '#9b59b6';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 1;
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
