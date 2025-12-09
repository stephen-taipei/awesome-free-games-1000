export type Shape = number[][]; // 0 or 1 grid

const SHAPES: Shape[] = [
  [[1]], // Dot
  [[1, 1]], // 2-H
  [[1], [1]], // 2-V
  [[1, 1, 1]], // 3-H
  [[1], [1], [1]], // 3-V
  [
    [1, 1],
    [1, 1],
  ], // O
  [
    [1, 1, 1],
    [0, 1, 0],
  ], // T
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // Z
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // S
  [
    [1, 0, 0],
    [1, 1, 1],
  ], // L
  [
    [0, 0, 1],
    [1, 1, 1],
  ], // J
  // Add larger lines?
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
];

const COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#1abc9c",
];

export class BlockBlastGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Config
  rows = 8;
  cols = 8;
  tileSize = 40; // Calculated on resize

  // State
  grid: (string | null)[][] = [];
  score = 0;
  highScore = 0;

  // Current pieces
  // We handle available pieces state here, but rendering them is handled largely by main or helper.
  // Let's store available indices or shape objects.
  availableShapes: { shape: Shape; color: string; id: number }[] = [];

  status: "playing" | "gameover" = "playing";
  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.highScore = parseInt(
      localStorage.getItem("blockBlastData") || "0",
      10
    );
  }

  public start() {
    this.score = 0;
    this.status = "playing";

    // Init Grid
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid.push(new Array(this.cols).fill(null));
    }

    this.spawnShapes();
    this.resize();
    this.draw();
    this.notify();
  }

  public resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.tileSize = Math.floor(this.canvas.width / this.cols);
    this.draw();
  }

  private spawnShapes() {
    this.availableShapes = [];
    for (let i = 0; i < 3; i++) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.availableShapes.push({ shape, color, id: Math.random() });
    }

    // Check game over immediately if grid full?
    // Usually checked after placement.
    if (!this.canPlaceAny()) {
      this.status = "gameover";
    }
    this.notify();
  }

  public tryPlace(pieceId: number, gridX: number, gridY: number): boolean {
    if (this.status !== "playing") return false;

    const pieceIdx = this.availableShapes.findIndex((p) => p.id === pieceId);
    if (pieceIdx === -1) return false;

    const piece = this.availableShapes[pieceIdx];

    if (this.canPlace(piece.shape, gridX, gridY)) {
      // Place
      this.place(piece.shape, piece.color, gridX, gridY);
      // Remove from available
      this.availableShapes.splice(pieceIdx, 1);

      // Check Clears
      this.checkClears();

      // Replenish if empty
      if (this.availableShapes.length === 0) {
        this.spawnShapes();
      }

      // Check Game Over
      if (!this.canPlaceAny()) {
        this.status = "gameover";
      }

      this.draw();
      this.notify();
      return true;
    }

    return false;
  }

  private canPlace(shape: Shape, x: number, y: number): boolean {
    const h = shape.length;
    const w = shape[0].length;

    // Check bounds and collision
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          const gx = x + c;
          const gy = y + r;
          if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows)
            return false;
          if (this.grid[gy][gx] !== null) return false;
        }
      }
    }
    return true;
  }

  private place(shape: Shape, color: string, x: number, y: number) {
    const h = shape.length;
    const w = shape[0].length;

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          this.grid[y + r][x + c] = color;
        }
      }
    }

    this.score += 10; // Placement score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("blockBlastData", this.highScore.toString());
    }
  }

  private checkClears() {
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    // Rows
    for (let r = 0; r < this.rows; r++) {
      if (this.grid[r].every((c) => c !== null)) fullRows.push(r);
    }

    // Cols
    for (let c = 0; c < this.cols; c++) {
      let full = true;
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) fullCols.push(c);
    }

    if (fullRows.length === 0 && fullCols.length === 0) return;

    // Clear logic
    fullRows.forEach((r) => {
      this.grid[r].fill(null);
    });

    fullCols.forEach((c) => {
      for (let r = 0; r < this.rows; r++) {
        this.grid[r][c] = null;
      }
    });

    // Score bonus
    const total = fullRows.length + fullCols.length;
    this.score += total * 100 * total; // Combo multiplier
  }

  private canPlaceAny(): boolean {
    // Optimization: Brute force is fine for 3 shapes on 8x8.
    for (const piece of this.availableShapes) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.canPlace(piece.shape, c, r)) return true;
        }
      }
    }
    return false;
  }

  public draw() {
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid
    const ts = this.tileSize;

    // Draw Empty Grid
    this.ctx.strokeStyle = "#34495e";
    this.ctx.lineWidth = 1;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.ctx.strokeRect(c * ts, r * ts, ts, ts);

        const color = this.grid[r][c];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(c * ts + 1, r * ts + 1, ts - 2, ts - 2);
          // Bevel effect
          this.ctx.fillStyle = "rgba(255,255,255,0.2)";
          this.ctx.fillRect(c * ts + 1, r * ts + 1, ts - 2, ts / 3);
        } else {
          this.ctx.fillStyle = "rgba(0,0,0,0.1)";
          this.ctx.fillRect(c * ts + 1, r * ts + 1, ts - 2, ts - 2);
        }
      }
    }
  }

  public notify() {
    if (this.onStateChange)
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        status: this.status,
        shapes: this.availableShapes, // UI needs this to render
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
