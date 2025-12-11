export class OrigamiGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Config
  size = 200; // Paper size
  cx = 0;
  cy = 0;

  // State
  // 0: TL, 1: TR, 2: BR, 3: BL
  folds: boolean[] = [false, false, false, false];

  level = 1;
  targetFolds: boolean[] = [];

  levels = [
    [true, false, false, false], // 1 corner
    [true, false, true, false], // Opposite
    [true, true, true, true], // All (Small square)
    [true, true, false, false], // Top half (if folds are big enough? No, just side by side)
    [false, true, true, false],
  ];

  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.level = 1;
    this.loadLevel(0);
  }

  private loadLevel(idx: number) {
    if (idx >= this.levels.length) {
      // Loop or end? Loop for now with clear
      idx = 0;
      this.level = 1;
    }
    this.targetFolds = this.levels[idx];
    this.folds = [false, false, false, false];
    this.draw();
    this.notify();
  }

  public handleInput(x: number, y: number) {
    // Check corners relative to center
    // Paper is at cx - size/2, cy - size/2
    const half = this.size / 2;
    const left = this.cx - half;
    const right = this.cx + half;
    const top = this.cy - half;
    const bottom = this.cy + half;

    // Define clickable zones for unfolded corners
    // TL: (left, top) to (left+half, top+half) rect? Or triangle?
    // Let's use Rect quadrants for simplicity.
    // TL Quadrant
    if (x < this.cx && y < this.cy) this.toggleFold(0);
    // TR Quadrant
    else if (x >= this.cx && y < this.cy) this.toggleFold(1);
    // BR
    else if (x >= this.cx && y >= this.cy) this.toggleFold(2);
    // BL
    else if (x < this.cx && y >= this.cy) this.toggleFold(3);

    this.draw();
    this.checkWin();
  }

  private toggleFold(idx: number) {
    this.folds[idx] = !this.folds[idx];
  }

  private checkWin() {
    const win = this.folds.every((f, i) => f === this.targetFolds[i]);
    if (win) {
      this.notify(true); // Won
      // Simple delay next level
      setTimeout(() => {
        this.level++;
        this.loadLevel(this.level - 1);
      }, 1000);
    }
  }

  public draw() {
    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Center
    this.cx = this.canvas.width / 2;
    this.cy = this.canvas.height / 2;

    const half = this.size / 2;

    // Draw Base Paper (Unfolded parts)
    this.ctx.save();
    this.ctx.translate(this.cx, this.cy);

    // Draw full square first? No, we need to cut out folded parts if possible.
    // Actually, just draw full square in background color (front side),
    // then draw folded flaps on top (back side color).
    // Wait, if I fold TL, the top-left area of the "front" is gone, revealed background?
    // Or is it just covered?
    // Real origami: The corner comes Inwards.

    // Front Side Color: #ecf0f1
    // Back Side Color: #bdc3c7 (Darker) or #e74c3c?

    // Let's draw Full Square
    this.ctx.fillStyle = "#ecf0f1";
    this.ctx.fillRect(-half, -half, this.size, this.size);
    this.ctx.strokeStyle = "#bdc3c7";
    this.ctx.strokeRect(-half, -half, this.size, this.size);

    // Draw Folds
    // TL: 0
    if (this.folds[0]) this.drawFold(0, -half, -half, 1, 1);
    if (this.folds[1]) this.drawFold(1, half, -half, -1, 1);
    if (this.folds[2]) this.drawFold(2, half, half, -1, -1);
    if (this.folds[3]) this.drawFold(3, -half, half, 1, -1);

    this.ctx.restore();
  }

  private drawFold(
    idx: number,
    cornerX: number,
    cornerY: number,
    dx: number,
    dy: number
  ) {
    // Fold is a triangle from corner to center
    // Original corner is at (cornerX, cornerY).
    // It folds to (0,0) (Center).
    // Visual: The triangle (cornerX, cornerY) -> (cornerX + size/2 * dx, cornerY) -> (cornerX, cornerY + size/2 * dy) is "gone"
    // And a new triangle appears on top of (0,0) -> ...

    // Actually, simpler:
    // Draw the "Backside" Triangle pointing to center.
    // Vertices: (0,0), (0, cornerY), (cornerX, 0) ?? No.
    // Midpoints of edges: (0, -half) top-mid, (-half, 0) left-mid.
    // Fold line connects these midpoints.
    // The flap triangle is (0,0), (0, -half), (-half, 0).

    const half = this.size / 2;

    // Erase the corner (simulate fold away)
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.beginPath();
    // Corner, Right-along-edge, Down-along-edge
    // E.g. TL (-half, -half) -> (0, -half) -> (-half, 0)
    this.ctx.moveTo(cornerX, cornerY);
    this.ctx.lineTo(cornerX + dx * half, cornerY);
    this.ctx.lineTo(cornerX, cornerY + dy * half);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw Flap (Backside)
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#95a5a6"; // Backside color
    this.ctx.beginPath();
    // Center (0,0) -> (0, -half) -> (-half, 0)
    this.ctx.moveTo(0, 0); // Tip touches center
    this.ctx.lineTo(cornerX + dx * half, cornerY); // Actually this point is mid-edge
    this.ctx.lineTo(cornerX, cornerY + dy * half); // mid-edge
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  // Draw Target Preview into a separate mini canvas or return data URL?
  // Let's implement a helper to draw target to a context
  public drawTarget(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    ctx.clearRect(0, 0, width, height);
    const s = width * 0.6;
    const cx = width / 2;
    const cy = height / 2;
    const half = s / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Base
    ctx.fillStyle = "#ecf0f1";
    ctx.fillRect(-half, -half, s, s);
    ctx.strokeRect(-half, -half, s, s);

    // Folds
    const fs = this.targetFolds;

    // Reuse logic logic roughly
    const drawMiniFold = (
      idx: number,
      cX: number,
      cY: number,
      dx: number,
      dy: number
    ) => {
      // Erase corner
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(cX, cY);
      ctx.lineTo(cX + dx * half, cY);
      ctx.lineTo(cX, cY + dy * half);
      ctx.fill();

      // Draw flap
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#95a5a6";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cX + dx * half, cY);
      ctx.lineTo(cX, cY + dy * half);
      ctx.fill();
      ctx.stroke();
    };

    if (fs[0]) drawMiniFold(0, -half, -half, 1, 1);
    if (fs[1]) drawMiniFold(1, half, -half, -1, 1);
    if (fs[2]) drawMiniFold(2, half, half, -1, -1);
    if (fs[3]) drawMiniFold(3, -half, half, 1, -1);

    ctx.restore();
  }

  public resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = 300;
    this.draw();
  }

  private notify(win: boolean = false) {
    if (this.onStateChange)
      this.onStateChange({
        level: this.level,
        targetFolds: this.targetFolds,
        win,
      });
  }
  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public reset() {
    this.loadLevel(this.level - 1);
    this.draw();
  }
}
