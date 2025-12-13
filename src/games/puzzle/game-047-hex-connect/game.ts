export interface HexCell {
  row: number;
  col: number;
  x: number;
  y: number;
  rotation: number; // 0-5 (60 degrees each)
  sides: boolean[]; // 6 sides, true = has connection line
  color: string;
}

interface Level {
  rows: number;
  cols: number;
  pattern: number[][]; // Each number represents which sides have lines (bitfield)
}

const COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dfe6e9",
  "#a29bfe",
  "#fd79a8",
];

const LEVELS: Level[] = [
  // Level 1 - Simple 3x3
  {
    rows: 3,
    cols: 3,
    pattern: [
      [0b000001, 0b000011, 0b000010],
      [0b000101, 0b001111, 0b001010],
      [0b000100, 0b001100, 0b001000],
    ],
  },
  // Level 2 - 4x4
  {
    rows: 4,
    cols: 4,
    pattern: [
      [0b000001, 0b000011, 0b000011, 0b000010],
      [0b000101, 0b001111, 0b001111, 0b001010],
      [0b000101, 0b001111, 0b001111, 0b001010],
      [0b000100, 0b001100, 0b001100, 0b001000],
    ],
  },
  // Level 3 - 5x5
  {
    rows: 5,
    cols: 5,
    pattern: [
      [0b000001, 0b000011, 0b000011, 0b000011, 0b000010],
      [0b000101, 0b001111, 0b001111, 0b001111, 0b001010],
      [0b000101, 0b001111, 0b111111, 0b001111, 0b001010],
      [0b000101, 0b001111, 0b001111, 0b001111, 0b001010],
      [0b000100, 0b001100, 0b001100, 0b001100, 0b001000],
    ],
  },
];

export class HexConnectGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  cells: HexCell[][] = [];
  currentLevel: number = 0;
  level: Level;
  hexSize: number = 40;
  moves: number = 0;

  status: "playing" | "won" = "playing";
  animatingCell: HexCell | null = null;
  animationProgress: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.level = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.initLevel();
    this.shuffleCells();
    this.loop();
  }

  private initLevel() {
    this.cells = [];
    const level = this.level;

    for (let row = 0; row < level.rows; row++) {
      this.cells[row] = [];
      for (let col = 0; col < level.cols; col++) {
        const pattern = level.pattern[row][col];
        const sides = this.patternToSides(pattern);
        const { x, y } = this.getHexPosition(row, col);

        this.cells[row][col] = {
          row,
          col,
          x,
          y,
          rotation: 0,
          sides,
          color: COLORS[(row + col) % COLORS.length],
        };
      }
    }
  }

  private patternToSides(pattern: number): boolean[] {
    const sides: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      sides.push((pattern & (1 << i)) !== 0);
    }
    return sides;
  }

  private shuffleCells() {
    for (const row of this.cells) {
      for (const cell of row) {
        // Random rotation (0-5)
        const rotations = Math.floor(Math.random() * 6);
        for (let i = 0; i < rotations; i++) {
          this.rotateSides(cell.sides);
        }
        cell.rotation = rotations;
      }
    }
  }

  private rotateSides(sides: boolean[]) {
    const last = sides.pop()!;
    sides.unshift(last);
  }

  private getHexPosition(row: number, col: number): { x: number; y: number } {
    const w = this.hexSize * 1.8;
    const h = this.hexSize * 1.55;
    const offsetX = (this.canvas.width - this.level.cols * w) / 2 + w / 2;
    const offsetY = (this.canvas.height - this.level.rows * h) / 2 + h / 2;

    const x = offsetX + col * w + (row % 2) * (w / 2);
    const y = offsetY + row * h;

    return { x, y };
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
    this.level = LEVELS[this.currentLevel];
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.level = LEVELS[this.currentLevel];
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    // Update positions for current level
    for (let row = 0; row < this.cells.length; row++) {
      for (let col = 0; col < this.cells[row].length; col++) {
        const { x, y } = this.getHexPosition(row, col);
        this.cells[row][col].x = x;
        this.cells[row][col].y = y;
      }
    }
  }

  private checkWin(): boolean {
    // Check if all adjacent connections match
    for (let row = 0; row < this.cells.length; row++) {
      for (let col = 0; col < this.cells[row].length; col++) {
        const cell = this.cells[row][col];
        const neighbors = this.getNeighbors(row, col);

        for (let side = 0; side < 6; side++) {
          if (cell.sides[side]) {
            const neighbor = neighbors[side];
            if (neighbor) {
              const oppositeSide = (side + 3) % 6;
              if (!neighbor.sides[oppositeSide]) {
                return false;
              }
            }
          }
        }
      }
    }
    return true;
  }

  private getNeighbors(row: number, col: number): (HexCell | null)[] {
    const neighbors: (HexCell | null)[] = [];
    const isOddRow = row % 2 === 1;

    // Hex neighbor offsets depend on row parity
    const offsets = isOddRow
      ? [
          [-1, 1], // 0: top-right
          [0, 1], // 1: right
          [1, 1], // 2: bottom-right
          [1, 0], // 3: bottom-left
          [0, -1], // 4: left
          [-1, 0], // 5: top-left
        ]
      : [
          [-1, 0], // 0: top-right
          [0, 1], // 1: right
          [1, 0], // 2: bottom-right
          [1, -1], // 3: bottom-left
          [0, -1], // 4: left
          [-1, -1], // 5: top-left
        ];

    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (
        nr >= 0 &&
        nr < this.cells.length &&
        nc >= 0 &&
        nc < this.cells[nr].length
      ) {
        neighbors.push(this.cells[nr][nc]);
      } else {
        neighbors.push(null);
      }
    }

    return neighbors;
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked hex
    for (const row of this.cells) {
      for (const cell of row) {
        const dist = Math.hypot(x - cell.x, y - cell.y);
        if (dist < this.hexSize) {
          // Rotate this cell
          this.rotateSides(cell.sides);
          cell.rotation = (cell.rotation + 1) % 6;
          this.moves++;

          if (this.onStateChange) {
            this.onStateChange({ moves: this.moves });
          }

          // Check win after rotation
          if (this.checkWin()) {
            this.status = "won";
            if (this.onStateChange) {
              this.onStateChange({
                status: "won",
                moves: this.moves,
                level: this.currentLevel + 1,
                hasNextLevel: this.currentLevel < LEVELS.length - 1,
              });
            }
          }
          return;
        }
      }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw background
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0f0c29");
    gradient.addColorStop(0.5, "#302b63");
    gradient.addColorStop(1, "#24243e");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw cells
    for (const row of this.cells) {
      for (const cell of row) {
        this.drawHex(cell);
      }
    }

    // Draw connections
    for (const row of this.cells) {
      for (const cell of row) {
        this.drawConnections(cell);
      }
    }
  }

  private drawHex(cell: HexCell) {
    const { x, y } = cell;
    const size = this.hexSize;

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();

    // Fill
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Stroke
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawConnections(cell: HexCell) {
    const { x, y, sides } = cell;
    const size = this.hexSize * 0.6;

    this.ctx.strokeStyle = cell.color;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = "round";

    // Draw lines from center to each active side
    for (let i = 0; i < 6; i++) {
      if (sides[i]) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const endX = x + size * Math.cos(angle);
        const endY = y + size * Math.sin(angle);

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Glow effect
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = cell.color;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
      }
    }

    // Draw center dot
    this.ctx.fillStyle = cell.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 450;

      // Adjust hex size based on level
      const maxCells = Math.max(this.level.rows, this.level.cols);
      this.hexSize = Math.min(50, this.canvas.width / (maxCells * 2.2));
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
