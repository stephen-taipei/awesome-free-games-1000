// Axial Coordinates: q, r. (s = -q-r)
// Hexagon Flat-topped usually? Or Pointy-topped.
// Let's use Pointy-topped.
// Neighbors: +q,-r; +r,-q; ... 6 directions.

export interface Hex {
  q: number;
  r: number;
  value: number; // 0=empty, 1=filled
  color?: string;
}

export interface Shape {
  id: number;
  cells: { q: number; r: number }[]; // Relative coords to center
  color: string;
  x: number; // Display X
  y: number; // Display Y
  originalX: number;
  originalY: number;
}

const HEX_SIZE = 25;
const BOARD_RADIUS = 4; // 0 to 4 rings? Total Width ~ 9 hexes

export class HexGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Board stored as map "q,r" -> Hex
  board = new Map<string, Hex>();

  shapes: Shape[] = [];
  draggingShape: Shape | null = null;

  score = 0;
  status: "playing" | "gameover" = "playing";

  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.initBoard();
  }

  private initBoard() {
    this.board.clear();
    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
      const r1 = Math.max(-BOARD_RADIUS, -q - BOARD_RADIUS);
      const r2 = Math.min(BOARD_RADIUS, -q + BOARD_RADIUS);
      for (let r = r1; r <= r2; r++) {
        this.board.set(`${q},${r}`, { q, r, value: 0 });
      }
    }
  }

  public start() {
    this.status = "playing";
    this.score = 0;
    this.initBoard();
    this.spawnShapes();
    this.draw();
    this.notify();
  }

  private spawnShapes() {
    this.shapes = [];
    for (let i = 0; i < 3; i++) {
      this.shapes.push(this.createRandomShape(i));
    }
  }

  private createRandomShape(slot: number): Shape {
    // Types: Single, Line 2/3/4, Triangle, Diamond...
    // Relative coords.
    const types = [
      [{ q: 0, r: 0 }], // Dot
      [
        { q: 0, r: 0 },
        { q: 0, r: -1 },
      ], // Line 2 (Vertical?)
      [
        { q: 0, r: 0 },
        { q: 1, r: -1 },
      ], // Line 2 Diagonal
      [
        { q: 0, r: 0 },
        { q: -1, r: 0 },
      ], // Line 2 Diagonal
      [
        { q: 0, r: 0 },
        { q: 0, r: -1 },
        { q: 0, r: 1 },
      ], // Line 3
      [
        { q: 0, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
      ], // Triangle info
      [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 1, r: 1 },
        { q: 0, r: 1 },
      ], // Rhombus
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];

    // Positioning in bottom area
    const spacing = 150;
    const startX = (this.canvas.width - spacing * 2) / 2;

    return {
      id: Math.random(),
      cells: type,
      color: colors[Math.floor(Math.random() * colors.length)],
      x: startX + slot * spacing,
      y: this.canvas.height - 100,
      originalX: startX + slot * spacing,
      originalY: this.canvas.height - 100,
    };
  }

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing") return;

    if (type === "down") {
      // Check shape hit
      for (let s of this.shapes) {
        // Approximate hit box circle r=60
        const dist = Math.hypot(x - s.x, y - s.y);
        if (dist < 60) {
          this.draggingShape = s;
          // Lift up slightly
          s.y -= 50;
          this.draw();
          return;
        }
      }
    } else if (type === "move") {
      if (this.draggingShape) {
        this.draggingShape.x = x;
        this.draggingShape.y = y;
        this.draw();
      }
    } else if (type === "up") {
      if (this.draggingShape) {
        // Check drop
        const boardCenter = {
          x: this.canvas.width / 2,
          y: this.canvas.height / 2 - 80,
        }; // Shift up slightly

        // Convert mouse pos relative to board center to Hex
        // But draggingShape cells are relative to mouse.
        // We need to match center of shape hex 0,0 to a board hex logic?

        // Mouse is at center of shape 0,0 cell essentially.
        const hex = this.pixelToHex(x - boardCenter.x, y - boardCenter.y);

        if (this.canPlace(this.draggingShape, hex)) {
          this.placeShape(this.draggingShape, hex);
          this.shapes = this.shapes.filter((s) => s !== this.draggingShape);
          if (this.shapes.length === 0) this.spawnShapes();

          this.checkLines();
          this.checkGameover();
        } else {
          // Revert
          this.draggingShape.x = this.draggingShape.originalX;
          this.draggingShape.y = this.draggingShape.originalY;
        }

        this.draggingShape = null;
        this.draw();
        this.notify();
      }
    }
  }

  private pixelToHex(x: number, y: number): { q: number; r: number } {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / HEX_SIZE;
    const r = ((2 / 3) * y) / HEX_SIZE;
    return this.cubeRound(q, r, -q - r);
  }

  private cubeRound(fracQ: number, fracR: number, fracS: number) {
    let q = Math.round(fracQ);
    let r = Math.round(fracR);
    let s = Math.round(fracS);

    const q_diff = Math.abs(q - fracQ);
    const r_diff = Math.abs(r - fracR);
    const s_diff = Math.abs(s - fracS);

    if (q_diff > r_diff && q_diff > s_diff) {
      q = -r - s;
    } else if (r_diff > s_diff) {
      r = -q - s;
    } else {
      // s derived
    }
    return { q, r };
  }

  private canPlace(shape: Shape, at: { q: number; r: number }): boolean {
    for (let cell of shape.cells) {
      const absQ = at.q + cell.q;
      const absR = at.r + cell.r;
      const key = `${absQ},${absR}`;
      const boardCell = this.board.get(key);
      if (!boardCell || boardCell.value !== 0) return false;
    }
    return true;
  }

  private placeShape(shape: Shape, at: { q: number; r: number }) {
    for (let cell of shape.cells) {
      const key = `${at.q + cell.q},${at.r + cell.r}`;
      const h = this.board.get(key);
      if (h) {
        h.value = 1;
        h.color = shape.color;
      }
    }
    this.score += shape.cells.length * 10;
  }

  private checkLines() {
    // 3 Axis: q, r, s
    // Collect all lines on each axis.
    // Range -BOARD_RADIUS to BOARD_RADIUS

    const toClear = new Set<string>();

    // Q-lines (Verticals in some orientation)
    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
      // Iterate all r for this q
      // Range depends on q
      const r1 = Math.max(-BOARD_RADIUS, -q - BOARD_RADIUS);
      const r2 = Math.min(BOARD_RADIUS, -q + BOARD_RADIUS);
      let full = true;
      const cells = [];
      for (let r = r1; r <= r2; r++) {
        const key = `${q},${r}`;
        const h = this.board.get(key);
        if (!h || h.value === 0) {
          full = false;
          break;
        }
        cells.push(key);
      }
      if (full && cells.length > 0) cells.forEach((c) => toClear.add(c));
    }

    // R-lines
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
      // Range logic similar
      const q1 = Math.max(-BOARD_RADIUS, -r - BOARD_RADIUS);
      const q2 = Math.min(BOARD_RADIUS, -r + BOARD_RADIUS);
      let full = true;
      const cells = [];
      for (let q = q1; q <= q2; q++) {
        const key = `${q},${r}`;
        const h = this.board.get(key);
        if (!h || h.value === 0) {
          full = false;
          break;
        }
        cells.push(key);
      }
      if (full && cells.length > 0) cells.forEach((c) => toClear.add(c));
    }

    // S-lines (s constant) s = -q-r
    for (let s = -BOARD_RADIUS; s <= BOARD_RADIUS; s++) {
      // q + r = -s
      // Iterate q?
      // q range: max(-R, -s - R) to min(R, -s + R)
      const q1 = Math.max(-BOARD_RADIUS, -s - BOARD_RADIUS);
      const q2 = Math.min(BOARD_RADIUS, -s + BOARD_RADIUS);
      let full = true;
      const cells = [];
      for (let q = q1; q <= q2; q++) {
        const r = -s - q;
        const key = `${q},${r}`;
        const h = this.board.get(key);
        if (!h || h.value === 0) {
          full = false;
          break;
        }
        cells.push(key);
      }
      if (full && cells.length > 0) cells.forEach((c) => toClear.add(c));
    }

    if (toClear.size > 0) {
      toClear.forEach((key) => {
        const h = this.board.get(key);
        if (h) {
          h.value = 0;
          h.color = undefined;
        }
      });
      this.score += toClear.size * 20; // Bonus
    }
  }

  private checkGameover() {
    // Can any shape be placed?
    for (let s of this.shapes) {
      let can = false;
      // Iterate all board cells
      for (let h of this.board.values()) {
        if (h.value === 0) {
          // Try place centered here
          if (this.canPlace(s, h)) {
            can = true;
            break;
          }
        }
      }
      if (can) return; // Found at least 1 move
    }

    // If exhausted all checks
    this.status = "gameover";
    this.notify();
  }

  private draw() {
    // BG
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Board Center
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 - 80;

    // Draw Board
    for (let h of this.board.values()) {
      const pix = this.hexToPixel(h.q, h.r);
      this.drawHex(
        cx + pix.x,
        cy + pix.y,
        HEX_SIZE - 2,
        h.value ? h.color! : "#34495e"
      );
    }

    // Draw Shapes
    for (let s of this.shapes) {
      // If dragging, use s.x/y (mouse centered), else s.x/y (slot position)
      const sx = s.x;
      const sy = s.y;

      // Draw relative hexes
      for (let cell of s.cells) {
        const pix = this.hexToPixel(cell.q, cell.r);
        this.drawHex(sx + pix.x, sy + pix.y, HEX_SIZE - 2, s.color);
      }
    }
  }

  private hexToPixel(q: number, r: number) {
    const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = HEX_SIZE * ((3 / 2) * r);
    return { x, y };
  }

  private drawHex(x: number, y: number, r: number, color: string) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angleDeg = 60 * i + 30;
      const angleRad = (Math.PI / 180) * angleDeg;
      const px = x + r * Math.cos(angleRad);
      const py = y + r * Math.sin(angleRad);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.closePath();
  }

  public notify() {
    if (this.onStateChange)
      this.onStateChange({
        score: this.score,
        status: this.status,
      });
  }
  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = 600; // Fixed relative height
    this.draw();
  }
}
