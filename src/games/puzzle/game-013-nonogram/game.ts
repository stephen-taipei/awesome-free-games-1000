export type CellState = 0 | 1 | 2; // 0: Empty, 1: Fill, 2: X

export interface LevelData {
  name: string;
  rows: number;
  cols: number;
  data: number[]; // Flattened array 0/1
}

export interface GameState {
  status: "idle" | "playing" | "won";
  time: number;
}

const LEVELS: LevelData[] = [
  {
    name: "Heart",
    rows: 5,
    cols: 5,
    data: [
      0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0,
    ],
  },
  {
    name: "Smile",
    rows: 5,
    cols: 5,
    data: [
      0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0,
    ],
  },
  {
    name: "Duck",
    rows: 10,
    cols: 10,
    data: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
      0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1,
      1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    name: "House",
    rows: 10,
    cols: 10,
    data: [
      0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1,
      1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0,
    ],
  },
];

export class NonogramGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Config
  private cellSize = 30;
  private hintSize = 80; // Space for hints

  // State
  private currentLevel: LevelData | null = null;
  private userGrid: CellState[] = [];
  private rowHints: number[][] = [];
  private colHints: number[][] = [];

  private status: GameState["status"] = "idle";
  private time = 0;
  private timerInterval: number | null = null;

  private dragValue: CellState | null = null;

  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize() {
    // Just triggers re-render if loaded
    if (this.currentLevel) this.render();
  }

  public startLevel(index: number) {
    if (index < 0 || index >= LEVELS.length) index = 0;
    this.currentLevel = LEVELS[index];
    this.userGrid = new Array(
      this.currentLevel.rows * this.currentLevel.cols
    ).fill(0);

    this.calculateHints();
    this.calculateLayout();

    this.status = "playing";
    this.time = 0;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      this.time++;
      this.notifyChange();
    }, 1000);

    this.render();
    this.notifyChange();
  }

  public reset() {
    if (!this.currentLevel) return;
    this.userGrid.fill(0);
    this.status = "playing";
    this.time = 0;
    this.render();
    this.notifyChange();
  }

  private calculateHints() {
    if (!this.currentLevel) return;
    this.rowHints = [];
    this.colHints = [];

    // Rows
    for (let r = 0; r < this.currentLevel.rows; r++) {
      const hints: number[] = [];
      let count = 0;
      for (let c = 0; c < this.currentLevel.cols; c++) {
        const val = this.currentLevel.data[r * this.currentLevel.cols + c];
        if (val === 1) count++;
        else if (count > 0) {
          hints.push(count);
          count = 0;
        }
      }
      if (count > 0) hints.push(count);
      if (hints.length === 0) hints.push(0);
      this.rowHints.push(hints);
    }

    // Cols
    for (let c = 0; c < this.currentLevel.cols; c++) {
      const hints: number[] = [];
      let count = 0;
      for (let r = 0; r < this.currentLevel.rows; r++) {
        const val = this.currentLevel.data[r * this.currentLevel.cols + c];
        if (val === 1) count++;
        else if (count > 0) {
          hints.push(count);
          count = 0;
        }
      }
      if (count > 0) hints.push(count);
      if (hints.length === 0) hints.push(0);
      this.colHints.push(hints);
    }
  }

  private calculateLayout() {
    // Fit to canvas
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : 500;
    const h = w; // Keep square aspect usually, but logic allows rectangular

    this.canvas.width = w;
    this.canvas.height = h;

    // Dynamic sizing
    if (!this.currentLevel) return;

    // Max hints length?
    const maxRowHints = Math.max(...this.rowHints.map((h) => h.length));
    const maxColHints = Math.max(...this.colHints.map((h) => h.length));

    // Rough estimation: hint space proportional to max hints
    // But simpler: Fixed percentage or calculated

    // Let's try to fit everything
    // width = hintW + cols * cell
    // height = hintH + rows * cell

    const hintCellSize = 20; // smaller for hints?

    // Let's deduce cellSize from available width
    // We need area for hints. Let's reserve left 25% and top 25% for hints
    // Or calculate exactly

    const availableW = w * 0.8;
    const availableH = h * 0.8;

    // Try to make grid occupy most space
    const cellW = availableW / this.currentLevel.cols;
    const cellH = availableH / this.currentLevel.rows;
    this.cellSize = Math.floor(Math.min(cellW, cellH));

    this.hintSize = Math.max(80, w - this.currentLevel.cols * this.cellSize);

    // Re-center
    // Actually top-left hint area is empty
  }

  public handleInput(
    x: number,
    y: number,
    isRightClick: boolean,
    isDrag: boolean
  ) {
    if (this.status !== "playing" || !this.currentLevel) return;

    // Offset
    const gridX = x - this.hintSize;
    const gridY = y - this.hintSize;

    if (gridX < 0 || gridY < 0) return; // In hint area

    const c = Math.floor(gridX / this.cellSize);
    const r = Math.floor(gridY / this.cellSize);

    if (
      c >= 0 &&
      c < this.currentLevel.cols &&
      r >= 0 &&
      r < this.currentLevel.rows
    ) {
      const idx = r * this.currentLevel.cols + c;

      // Logic:
      // If click start: determine action (Fill or Clear or Mark)
      // If drag: apply that action

      if (!isDrag) {
        // Determine drag value on start
        const current = this.userGrid[idx];
        if (isRightClick) {
          // Toggle X
          this.dragValue = current === 2 ? 0 : 2;
        } else {
          // Toggle Fill
          this.dragValue = current === 1 ? 0 : 1;
        }
        this.userGrid[idx] = this.dragValue;
      } else {
        // Continue drag
        if (this.dragValue !== null) {
          // Only overwrite if compatible?
          // Typically you don't overwrite X with Fill in same drag unless intuitive
          // Simple: Overwrite whatever
          this.userGrid[idx] = this.dragValue;
        }
      }
      this.render();
    }
  }

  public endDrag() {
    this.dragValue = null;
  }

  public checkWithButton() {
    if (!this.currentLevel) return;

    let correct = true;
    for (let i = 0; i < this.userGrid.length; i++) {
      const user = this.userGrid[i] === 1 ? 1 : 0;
      const sol = this.currentLevel.data[i];
      if (user !== sol) {
        correct = false;
        break;
      }
    }

    if (correct) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.render();
      this.notifyChange();
    } else {
      // Flash error or alert?
      // Simple alert via specific callback? or just nothing happen
      // Maybe notify main to shake
      alert("Incorrect!"); // Ideally use UI overlay but alert is simple for now
    }
  }

  private render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    if (!this.currentLevel) return;

    const topOffset = this.hintSize;
    const leftOffset = this.hintSize;

    this.ctx.font = "12px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Draw Row Hints (Left)
    for (let r = 0; r < this.currentLevel.rows; r++) {
      const hints = this.rowHints[r];
      const y = topOffset + r * this.cellSize + this.cellSize / 2;
      // Draw from right to left in the hint area
      let x = leftOffset - 10;
      for (let i = hints.length - 1; i >= 0; i--) {
        this.ctx.fillStyle = "#333";
        this.ctx.fillText(hints[i].toString(), x, y);
        x -= 20; // spacing
      }
    }

    // Draw Col Hints (Top)
    for (let c = 0; c < this.currentLevel.cols; c++) {
      const hints = this.colHints[c];
      const x = leftOffset + c * this.cellSize + this.cellSize / 2;
      // Draw from bottom to top
      let y = topOffset - 10;
      for (let i = hints.length - 1; i >= 0; i--) {
        this.ctx.fillStyle = "#333";
        this.ctx.fillText(hints[i].toString(), x, y);
        y -= 20;
      }
    }

    // Draw Grid
    this.ctx.translate(leftOffset, topOffset);

    for (let r = 0; r < this.currentLevel.rows; r++) {
      for (let c = 0; c < this.currentLevel.cols; c++) {
        const x = c * this.cellSize;
        const y = r * this.cellSize;
        const idx = r * this.currentLevel.cols + c;
        const val = this.userGrid[idx];

        // Border
        this.ctx.strokeStyle = "#ccc";
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        if (val === 1) {
          // Fill
          this.ctx.fillStyle = "#2c3e50";
          this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
        } else if (val === 2) {
          // X
          this.ctx.strokeStyle = "#e74c3c";
          this.ctx.beginPath();
          this.ctx.moveTo(x + 4, y + 4);
          this.ctx.lineTo(x + this.cellSize - 4, y + this.cellSize - 4);
          this.ctx.moveTo(x + this.cellSize - 4, y + 4);
          this.ctx.lineTo(x + 4, y + this.cellSize - 4);
          this.ctx.stroke();
        }
      }
    }

    // Thicker lines every 5 cells
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "#555";
    this.ctx.beginPath();
    // Verticals
    for (let c = 0; c <= this.currentLevel.cols; c += 5) {
      this.ctx.moveTo(c * this.cellSize, 0);
      this.ctx.lineTo(
        c * this.cellSize,
        this.currentLevel.rows * this.cellSize
      );
    }
    // Horizontals
    for (let r = 0; r <= this.currentLevel.rows; r += 5) {
      this.ctx.moveTo(0, r * this.cellSize);
      this.ctx.lineTo(
        this.currentLevel.cols * this.cellSize,
        r * this.cellSize
      );
    }
    this.ctx.stroke();
    this.ctx.lineWidth = 1;

    this.ctx.translate(-leftOffset, -topOffset);
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  public notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        time: this.time,
      });
    }
  }
}
