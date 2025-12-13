/**
 * Stamp Puzzle - Game #132
 * Stamp patterns to create the target image
 */

export interface Stamp {
  id: number;
  pattern: boolean[][];
  color: string;
  used: boolean;
}

export interface Level {
  gridSize: number;
  target: boolean[][];
  stamps: { pattern: boolean[][]; color: string }[];
}

const LEVELS: Level[] = [
  {
    gridSize: 4,
    target: [
      [true, true, false, false],
      [true, true, false, false],
      [false, false, true, true],
      [false, false, true, true]
    ],
    stamps: [
      { pattern: [[true, true], [true, true]], color: '#e74c3c' },
      { pattern: [[true, true], [true, true]], color: '#3498db' }
    ]
  },
  {
    gridSize: 5,
    target: [
      [true, true, true, false, false],
      [true, true, true, false, false],
      [false, false, true, true, true],
      [false, false, true, true, true],
      [false, false, true, true, true]
    ],
    stamps: [
      { pattern: [[true, true, true], [true, true, true]], color: '#e74c3c' },
      { pattern: [[true, true, true], [true, true, true], [true, true, true]], color: '#3498db' }
    ]
  },
  {
    gridSize: 5,
    target: [
      [true, false, true, false, true],
      [false, true, false, true, false],
      [true, false, true, false, true],
      [false, true, false, true, false],
      [true, false, true, false, true]
    ],
    stamps: [
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' },
      { pattern: [[true]], color: '#e74c3c' }
    ]
  },
  {
    gridSize: 6,
    target: [
      [true, true, true, true, true, true],
      [true, false, false, false, false, true],
      [true, false, true, true, false, true],
      [true, false, true, true, false, true],
      [true, false, false, false, false, true],
      [true, true, true, true, true, true]
    ],
    stamps: [
      { pattern: [[true, true, true, true, true, true]], color: '#9b59b6' },
      { pattern: [[true], [true], [true], [true], [true], [true]], color: '#9b59b6' },
      { pattern: [[true, true], [true, true]], color: '#2ecc71' }
    ]
  },
  {
    gridSize: 6,
    target: [
      [false, true, true, true, true, false],
      [true, true, false, false, true, true],
      [true, false, true, true, false, true],
      [true, false, true, true, false, true],
      [true, true, false, false, true, true],
      [false, true, true, true, true, false]
    ],
    stamps: [
      { pattern: [[false, true, true, false], [true, true, true, true], [true, true, true, true], [false, true, true, false]], color: '#e74c3c' },
      { pattern: [[true, true], [true, true]], color: '#3498db' },
      { pattern: [[true]], color: '#2ecc71' },
      { pattern: [[true]], color: '#2ecc71' },
      { pattern: [[true]], color: '#2ecc71' },
      { pattern: [[true]], color: '#2ecc71' }
    ]
  }
];

export class StampPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private gridSize = 4;
  private grid: boolean[][] = [];
  private target: boolean[][] = [];
  private stamps: Stamp[] = [];

  private cellSize = 50;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private targetOffsetX = 0;
  private targetOffsetY = 0;
  private stampAreaY = 0;

  private currentLevel = 0;
  private selectedStamp: Stamp | null = null;

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
    this.gridSize = level.gridSize;
    this.target = level.target.map(row => [...row]);

    // Initialize empty grid
    this.grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      this.grid.push(new Array(this.gridSize).fill(false));
    }

    // Create stamps
    this.stamps = level.stamps.map((s, i) => ({
      id: i,
      pattern: s.pattern.map(row => [...row]),
      color: s.color,
      used: false
    }));

    this.selectedStamp = null;
    this.calculateLayout();
    this.notifyState();
  }

  private calculateLayout() {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Calculate cell size based on available space
    const maxGridWidth = canvasWidth * 0.4;
    this.cellSize = Math.min(Math.floor(maxGridWidth / this.gridSize), 45);

    const gridWidth = this.gridSize * this.cellSize;

    // Main grid position (left side)
    this.gridOffsetX = canvasWidth * 0.08;
    this.gridOffsetY = 30;

    // Target preview position (right side)
    this.targetOffsetX = canvasWidth * 0.55;
    this.targetOffsetY = 30;

    // Stamp area at bottom
    this.stampAreaY = this.gridOffsetY + gridWidth + 30;
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      // Check if clicking on stamp selection
      const stampClicked = this.getStampAtPosition(x, y);
      if (stampClicked !== null && !this.stamps[stampClicked].used) {
        this.selectedStamp = this.stamps[stampClicked];
        this.draw();
        return;
      }

      // Check if clicking on grid to place stamp
      if (this.selectedStamp) {
        const gridPos = this.getGridPosition(x, y);
        if (gridPos) {
          this.placeStamp(gridPos.row, gridPos.col);
        }
      }
    }
  }

  private getStampAtPosition(x: number, y: number): number | null {
    const stampSize = 60;
    const stampSpacing = 10;
    const stampsPerRow = Math.floor((this.canvas.width - 40) / (stampSize + stampSpacing));

    for (let i = 0; i < this.stamps.length; i++) {
      const row = Math.floor(i / stampsPerRow);
      const col = i % stampsPerRow;
      const stampX = 20 + col * (stampSize + stampSpacing);
      const stampY = this.stampAreaY + row * (stampSize + stampSpacing);

      if (x >= stampX && x <= stampX + stampSize &&
          y >= stampY && y <= stampY + stampSize) {
        return i;
      }
    }

    return null;
  }

  private getGridPosition(x: number, y: number): { row: number; col: number } | null {
    const gridWidth = this.gridSize * this.cellSize;

    if (x >= this.gridOffsetX && x <= this.gridOffsetX + gridWidth &&
        y >= this.gridOffsetY && y <= this.gridOffsetY + gridWidth) {
      const col = Math.floor((x - this.gridOffsetX) / this.cellSize);
      const row = Math.floor((y - this.gridOffsetY) / this.cellSize);
      return { row, col };
    }

    return null;
  }

  private placeStamp(startRow: number, startCol: number) {
    if (!this.selectedStamp) return;

    const pattern = this.selectedStamp.pattern;
    const patternRows = pattern.length;
    const patternCols = pattern[0].length;

    // Check if stamp fits
    if (startRow + patternRows > this.gridSize || startCol + patternCols > this.gridSize) {
      return;
    }

    // Apply stamp (toggle pattern)
    for (let r = 0; r < patternRows; r++) {
      for (let c = 0; c < patternCols; c++) {
        if (pattern[r][c]) {
          this.grid[startRow + r][startCol + c] = !this.grid[startRow + r][startCol + c];
        }
      }
    }

    this.selectedStamp.used = true;
    this.selectedStamp = null;

    this.checkWin();
    this.notifyState();
    this.draw();
  }

  private checkWin() {
    // Check if grid matches target
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== this.target[r][c]) {
          // Check if all stamps are used
          const allUsed = this.stamps.every(s => s.used);
          if (allUsed) {
            this.status = 'lost';
          }
          return;
        }
      }
    }

    this.status = 'won';
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#ffecd2');
    gradient.addColorStop(1, '#fcb69f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw labels
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Your Canvas', this.gridOffsetX + (this.gridSize * this.cellSize) / 2, this.gridOffsetY - 10);
    this.ctx.fillText('Target', this.targetOffsetX + (this.gridSize * this.cellSize) / 2, this.targetOffsetY - 10);

    // Draw main grid
    this.drawGrid(this.gridOffsetX, this.gridOffsetY, this.grid, true);

    // Draw target preview
    this.drawGrid(this.targetOffsetX, this.targetOffsetY, this.target, false);

    // Draw stamps
    this.drawStamps();

    // Draw selected stamp preview on cursor
    if (this.selectedStamp) {
      this.drawStampPreview();
    }
  }

  private drawGrid(offsetX: number, offsetY: number, gridData: boolean[][], isMain: boolean) {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const x = offsetX + c * this.cellSize;
        const y = offsetY + r * this.cellSize;

        // Cell background
        if (gridData[r][c]) {
          this.ctx.fillStyle = isMain ? '#e74c3c' : '#3498db';
        } else {
          this.ctx.fillStyle = '#fff';
        }
        this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);

        // Cell border
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
      }
    }

    // Grid outer border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(offsetX, offsetY, this.gridSize * this.cellSize, this.gridSize * this.cellSize);
  }

  private drawStamps() {
    const stampSize = 60;
    const stampSpacing = 10;
    const stampsPerRow = Math.floor((this.canvas.width - 40) / (stampSize + stampSpacing));

    // Background for stamp area
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const stampRows = Math.ceil(this.stamps.length / stampsPerRow);
    this.ctx.beginPath();
    this.ctx.roundRect(10, this.stampAreaY - 10, this.canvas.width - 20, stampRows * (stampSize + stampSpacing) + 10, 8);
    this.ctx.fill();

    for (let i = 0; i < this.stamps.length; i++) {
      const stamp = this.stamps[i];
      const row = Math.floor(i / stampsPerRow);
      const col = i % stampsPerRow;
      const stampX = 20 + col * (stampSize + stampSpacing);
      const stampY = this.stampAreaY + row * (stampSize + stampSpacing);

      // Stamp background
      this.ctx.fillStyle = stamp.used ? '#ccc' : (this.selectedStamp === stamp ? '#fff8e1' : '#fff');
      this.ctx.strokeStyle = this.selectedStamp === stamp ? '#f39c12' : '#999';
      this.ctx.lineWidth = this.selectedStamp === stamp ? 3 : 1;

      this.ctx.beginPath();
      this.ctx.roundRect(stampX, stampY, stampSize, stampSize, 4);
      this.ctx.fill();
      this.ctx.stroke();

      // Draw stamp pattern preview
      if (!stamp.used) {
        const patternRows = stamp.pattern.length;
        const patternCols = stamp.pattern[0].length;
        const previewCellSize = Math.min(
          (stampSize - 10) / patternCols,
          (stampSize - 10) / patternRows
        );
        const previewOffsetX = stampX + (stampSize - patternCols * previewCellSize) / 2;
        const previewOffsetY = stampY + (stampSize - patternRows * previewCellSize) / 2;

        for (let r = 0; r < patternRows; r++) {
          for (let c = 0; c < patternCols; c++) {
            if (stamp.pattern[r][c]) {
              this.ctx.fillStyle = stamp.color;
              this.ctx.fillRect(
                previewOffsetX + c * previewCellSize + 1,
                previewOffsetY + r * previewCellSize + 1,
                previewCellSize - 2,
                previewCellSize - 2
              );
            }
          }
        }
      } else {
        // Draw X for used stamps
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(stampX + 10, stampY + 10);
        this.ctx.lineTo(stampX + stampSize - 10, stampY + stampSize - 10);
        this.ctx.moveTo(stampX + stampSize - 10, stampY + 10);
        this.ctx.lineTo(stampX + 10, stampY + stampSize - 10);
        this.ctx.stroke();
      }
    }
  }

  private drawStampPreview() {
    if (!this.selectedStamp) return;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Click on grid to place stamp', this.canvas.width / 2, this.stampAreaY - 20);
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
    const usedStamps = this.stamps.filter(s => s.used).length;
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        stampsUsed: usedStamps,
        totalStamps: this.stamps.length
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
