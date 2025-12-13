/**
 * Flood Fill - Game #041
 * Fill the board with one color using minimum moves
 */

export interface Level {
  size: number;
  maxMoves: number;
  colorCount: number;
}

const COLORS = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f1c40f', // Yellow
  '#9b59b6', // Purple
  '#e67e22', // Orange
];

const LEVELS: Level[] = [
  { size: 6, maxMoves: 10, colorCount: 4 },
  { size: 8, maxMoves: 15, colorCount: 4 },
  { size: 10, maxMoves: 20, colorCount: 5 },
  { size: 12, maxMoves: 25, colorCount: 5 },
  { size: 14, maxMoves: 30, colorCount: 6 },
];

export class FloodFillGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: number[][] = [];
  gridSize = 6;
  cellSize = 40;
  colorCount = 4;

  currentLevel = 0;
  moves = 0;
  maxMoves = 10;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

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
    this.gridSize = level.size;
    this.maxMoves = level.maxMoves;
    this.colorCount = level.colorCount;
    this.moves = 0;

    this.cellSize = Math.floor(Math.min(360, this.canvas.width - 40) / this.gridSize);

    // Generate random grid
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push(Math.floor(Math.random() * this.colorCount));
      }
      this.grid.push(row);
    }

    this.notifyState();
  }

  public selectColor(colorIndex: number) {
    if (this.status !== 'playing') return;
    if (colorIndex < 0 || colorIndex >= this.colorCount) return;

    const currentColor = this.grid[0][0];
    if (colorIndex === currentColor) return; // No change

    this.moves++;
    this.floodFill(0, 0, currentColor, colorIndex);

    // Check win
    if (this.isAllSameColor()) {
      this.status = 'won';
    } else if (this.moves >= this.maxMoves) {
      this.status = 'lost';
    }

    this.draw();
    this.notifyState();
  }

  private floodFill(x: number, y: number, oldColor: number, newColor: number) {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
    if (this.grid[y][x] !== oldColor) return;

    this.grid[y][x] = newColor;

    this.floodFill(x + 1, y, oldColor, newColor);
    this.floodFill(x - 1, y, oldColor, newColor);
    this.floodFill(x, y + 1, oldColor, newColor);
    this.floodFill(x, y - 1, oldColor, newColor);
  }

  private isAllSameColor(): boolean {
    const targetColor = this.grid[0][0];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x] !== targetColor) return false;
      }
    }
    return true;
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = 20;

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const colorIndex = this.grid[y][x];
        const px = offsetX + x * this.cellSize;
        const py = offsetY + y * this.cellSize;

        this.ctx.fillStyle = COLORS[colorIndex];
        this.ctx.fillRect(px, py, this.cellSize - 1, this.cellSize - 1);

        // Highlight top-left cell
        if (x === 0 && y === 0) {
          this.ctx.strokeStyle = 'white';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(px + 1, py + 1, this.cellSize - 3, this.cellSize - 3);
        }
      }
    }

    // Draw color buttons
    this.drawColorButtons();
  }

  private drawColorButtons() {
    const buttonSize = 45;
    const gap = 10;
    const totalWidth = this.colorCount * buttonSize + (this.colorCount - 1) * gap;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - buttonSize - 20;

    for (let i = 0; i < this.colorCount; i++) {
      const x = startX + i * (buttonSize + gap);
      const y = startY;

      this.ctx.fillStyle = COLORS[i];
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, buttonSize, buttonSize, 8);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Highlight if current color
      if (this.grid[0][0] === i) {
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - 2, y - 2, buttonSize + 4, buttonSize + 4);
      }
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== 'playing') return;

    const buttonSize = 45;
    const gap = 10;
    const totalWidth = this.colorCount * buttonSize + (this.colorCount - 1) * gap;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - buttonSize - 20;

    // Check if clicked on a color button
    for (let i = 0; i < this.colorCount; i++) {
      const bx = startX + i * (buttonSize + gap);
      const by = startY;

      if (x >= bx && x <= bx + buttonSize && y >= by && y <= by + buttonSize) {
        this.selectColor(i);
        return;
      }
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(450, rect.width);
      this.canvas.height = 450;
      this.cellSize = Math.floor(Math.min(360, this.canvas.width - 40) / this.gridSize);
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

  public getAvailableColors(): string[] {
    return COLORS.slice(0, this.colorCount);
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        moves: this.moves,
        maxMoves: this.maxMoves,
        colors: this.getAvailableColors()
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
