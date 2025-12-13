/**
 * Butterfly Effect - Game #130
 * Chain reaction puzzle - trigger events that cascade
 */

export interface Tile {
  row: number;
  col: number;
  type: 'empty' | 'butterfly' | 'flower' | 'wind' | 'rain' | 'sun' | 'target';
  activated: boolean;
  direction?: 'up' | 'down' | 'left' | 'right' | 'all';
}

export interface Level {
  grid: string[][];
  targetCount: number;
}

const LEVELS: Level[] = [
  {
    grid: [
      ['.', 'B>', 'F', '.'],
      ['.', '.', '.', '.'],
      ['.', '.', '.', 'T'],
      ['.', '.', '.', '.']
    ],
    targetCount: 1
  },
  {
    grid: [
      ['B>', 'F', '.', 'W>', 'T'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', 'T'],
      ['.', '.', '.', '.', '.']
    ],
    targetCount: 2
  },
  {
    grid: [
      ['B*', '.', '.', '.', '.'],
      ['.', 'Fv', '.', '.', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', 'W>', '.', 'T', '.'],
      ['.', '.', '.', '.', 'T']
    ],
    targetCount: 2
  },
  {
    grid: [
      ['.', 'B>', 'F', '.', '.', '.'],
      ['.', '.', 'Wv', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.'],
      ['.', '.', 'F', '.', 'T', '.'],
      ['.', '.', 'W>', '.', '.', 'T'],
      ['.', '.', '.', '.', '.', '.']
    ],
    targetCount: 2
  },
  {
    grid: [
      ['B*', '.', '.', '.', '.', '.', '.'],
      ['.', 'F', '.', '.', 'F', '.', '.'],
      ['.', 'Wv', '.', '.', 'W>', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.'],
      ['.', 'F', '.', 'T', '.', 'T', '.'],
      ['.', 'W>', '.', '.', '.', '.', 'T'],
      ['.', '.', '.', '.', '.', '.', '.']
    ],
    targetCount: 3
  }
];

export class ButterflyEffectGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private grid: Tile[][] = [];
  private gridRows = 0;
  private gridCols = 0;
  private cellSize = 60;
  private offsetX = 0;
  private offsetY = 0;

  private currentLevel = 0;
  private targetsActivated = 0;
  private targetCount = 0;

  private chainQueue: Tile[] = [];
  private animating = false;

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
    this.gridRows = level.grid.length;
    this.gridCols = level.grid[0].length;
    this.targetCount = level.targetCount;
    this.targetsActivated = 0;

    this.grid = [];
    for (let r = 0; r < this.gridRows; r++) {
      const row: Tile[] = [];
      for (let c = 0; c < this.gridCols; c++) {
        row.push(this.parseTile(level.grid[r][c], r, c));
      }
      this.grid.push(row);
    }

    this.calculateLayout();
    this.notifyState();
  }

  private parseTile(char: string, row: number, col: number): Tile {
    const tile: Tile = {
      row,
      col,
      type: 'empty',
      activated: false
    };

    const type = char[0];
    const dir = char[1];

    switch (type) {
      case 'B':
        tile.type = 'butterfly';
        break;
      case 'F':
        tile.type = 'flower';
        break;
      case 'W':
        tile.type = 'wind';
        break;
      case 'R':
        tile.type = 'rain';
        break;
      case 'S':
        tile.type = 'sun';
        break;
      case 'T':
        tile.type = 'target';
        break;
    }

    switch (dir) {
      case '^':
        tile.direction = 'up';
        break;
      case 'v':
        tile.direction = 'down';
        break;
      case '<':
        tile.direction = 'left';
        break;
      case '>':
        tile.direction = 'right';
        break;
      case '*':
        tile.direction = 'all';
        break;
    }

    return tile;
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

      if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
        const tile = this.grid[row][col];
        if (tile.type === 'butterfly' && !tile.activated) {
          this.triggerChain(tile);
        }
      }
    }
  }

  private triggerChain(startTile: Tile) {
    this.animating = true;
    this.chainQueue = [startTile];
    this.processChain();
  }

  private processChain() {
    if (this.chainQueue.length === 0) {
      this.animating = false;
      this.checkWinCondition();
      return;
    }

    const tile = this.chainQueue.shift()!;
    if (tile.activated) {
      this.processChain();
      return;
    }

    tile.activated = true;

    if (tile.type === 'target') {
      this.targetsActivated++;
      this.notifyState();
    }

    // Find tiles to activate based on direction
    const targets = this.getTargetTiles(tile);

    this.draw();

    // Delay for animation effect
    setTimeout(() => {
      for (const target of targets) {
        if (!target.activated && target.type !== 'empty') {
          this.chainQueue.push(target);
        }
      }
      this.processChain();
    }, 400);
  }

  private getTargetTiles(tile: Tile): Tile[] {
    const targets: Tile[] = [];
    const dirs: [number, number][] = [];

    if (tile.direction === 'all') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    } else if (tile.direction === 'up') {
      dirs.push([-1, 0]);
    } else if (tile.direction === 'down') {
      dirs.push([1, 0]);
    } else if (tile.direction === 'left') {
      dirs.push([0, -1]);
    } else if (tile.direction === 'right') {
      dirs.push([0, 1]);
    }

    for (const [dr, dc] of dirs) {
      // Spread effect for wind
      if (tile.type === 'wind' || tile.type === 'butterfly') {
        let r = tile.row + dr;
        let c = tile.col + dc;
        while (r >= 0 && r < this.gridRows && c >= 0 && c < this.gridCols) {
          const target = this.grid[r][c];
          if (target.type !== 'empty') {
            targets.push(target);
            break;
          }
          r += dr;
          c += dc;
        }
      } else {
        // Adjacent only for flowers
        const r = tile.row + dr;
        const c = tile.col + dc;
        if (r >= 0 && r < this.gridRows && c >= 0 && c < this.gridCols) {
          targets.push(this.grid[r][c]);
        }
      }
    }

    return targets;
  }

  private checkWinCondition() {
    if (this.targetsActivated >= this.targetCount) {
      this.status = 'won';
    } else {
      // Check if any butterflies are left
      let hasButterfly = false;
      for (const row of this.grid) {
        for (const tile of row) {
          if (tile.type === 'butterfly' && !tile.activated) {
            hasButterfly = true;
            break;
          }
        }
      }

      if (!hasButterfly) {
        this.status = 'lost';
      }
    }

    this.notifyState();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Nature background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(0.7, '#98fb98');
    gradient.addColorStop(1, '#228b22');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const tile = this.grid[r][c];
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;

        // Cell background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);

        // Draw tile
        this.drawTile(tile, x, y);
      }
    }
  }

  private drawTile(tile: Tile, x: number, y: number) {
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;
    const size = this.cellSize * 0.35;

    if (tile.activated) {
      // Glow effect for activated tiles
      this.ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, size * 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    switch (tile.type) {
      case 'butterfly':
        this.drawButterfly(centerX, centerY, size, tile.activated);
        break;
      case 'flower':
        this.drawFlower(centerX, centerY, size, tile.activated);
        break;
      case 'wind':
        this.drawWind(centerX, centerY, size, tile.activated, tile.direction);
        break;
      case 'target':
        this.drawTarget(centerX, centerY, size, tile.activated);
        break;
    }

    // Draw direction indicator
    if (tile.direction && tile.type !== 'empty' && !tile.activated) {
      this.drawDirectionArrow(centerX, centerY, size, tile.direction);
    }
  }

  private drawButterfly(x: number, y: number, size: number, activated: boolean) {
    const color = activated ? '#ffeb3b' : '#e91e63';

    // Wings
    this.ctx.fillStyle = color;

    // Left wing
    this.ctx.beginPath();
    this.ctx.ellipse(x - size * 0.5, y, size * 0.6, size * 0.8, -Math.PI / 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Right wing
    this.ctx.beginPath();
    this.ctx.ellipse(x + size * 0.5, y, size * 0.6, size * 0.8, Math.PI / 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Body
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, size * 0.15, size * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Antennae
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size * 0.4);
    this.ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.8, x - size * 0.2, y - size * 0.9);
    this.ctx.moveTo(x, y - size * 0.4);
    this.ctx.quadraticCurveTo(x + size * 0.3, y - size * 0.8, x + size * 0.2, y - size * 0.9);
    this.ctx.stroke();
  }

  private drawFlower(x: number, y: number, size: number, activated: boolean) {
    const petalColor = activated ? '#ffeb3b' : '#ff69b4';
    const centerColor = activated ? '#ffa000' : '#ffd700';

    // Petals
    this.ctx.fillStyle = petalColor;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size * 0.5;
      const py = y + Math.sin(angle) * size * 0.5;
      this.ctx.beginPath();
      this.ctx.ellipse(px, py, size * 0.3, size * 0.4, angle, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Center
    this.ctx.fillStyle = centerColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawWind(x: number, y: number, size: number, activated: boolean, direction?: string) {
    const color = activated ? 'rgba(255, 255, 100, 0.8)' : 'rgba(135, 206, 235, 0.8)';

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    // Wind swirls
    for (let i = 0; i < 3; i++) {
      const offsetY = (i - 1) * size * 0.4;
      this.ctx.beginPath();
      this.ctx.moveTo(x - size * 0.6, y + offsetY);
      this.ctx.quadraticCurveTo(x, y + offsetY - size * 0.2, x + size * 0.6, y + offsetY);
      this.ctx.stroke();
    }
  }

  private drawTarget(x: number, y: number, size: number, activated: boolean) {
    // Star shape
    const color = activated ? '#4caf50' : '#f44336';

    this.ctx.fillStyle = color;
    this.drawStar(x, y, 5, size, size * 0.5);

    if (activated) {
      // Checkmark
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x - size * 0.3, y);
      this.ctx.lineTo(x - size * 0.1, y + size * 0.3);
      this.ctx.lineTo(x + size * 0.3, y - size * 0.2);
      this.ctx.stroke();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let sx = cx + Math.cos(rot) * outerRadius;
      let sy = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(sx, sy);
      rot += step;

      sx = cx + Math.cos(rot) * innerRadius;
      sy = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(sx, sy);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawDirectionArrow(x: number, y: number, size: number, direction: string) {
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    const arrowSize = size * 0.4;

    if (direction === 'all') {
      // Draw four small arrows
      const dirs = [
        [0, -1], [0, 1], [-1, 0], [1, 0]
      ];
      for (const [dx, dy] of dirs) {
        const startX = x + dx * size * 0.3;
        const startY = y + dy * size * 0.3;
        const endX = x + dx * size * 0.6;
        const endY = y + dy * size * 0.6;

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    } else {
      let dx = 0, dy = 0;
      switch (direction) {
        case 'up': dy = -1; break;
        case 'down': dy = 1; break;
        case 'left': dx = -1; break;
        case 'right': dx = 1; break;
      }

      const endX = x + dx * arrowSize;
      const endY = y + dy * arrowSize;

      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
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
        targetsActivated: this.targetsActivated,
        targetCount: this.targetCount
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
