export interface Difference {
  id: number;
  x: number;
  y: number;
  r: number; // Radius of diff zone
  found: boolean;
  type: "color" | "size" | "missing" | "pos";
}

interface Shape {
  type: "circle" | "rect";
  x: number;
  y: number;
  w: number; // radius or width
  h: number; // height
  color: string;
  rotation: number;
}

export class SpotDifferenceGame {
  private canvasL: HTMLCanvasElement;
  private canvasR: HTMLCanvasElement;
  private ctxL: CanvasRenderingContext2D;
  private ctxR: CanvasRenderingContext2D;

  // Config
  private width = 800;
  private height = 600;

  // State
  private shapes: Shape[] = [];
  private differences: Difference[] = [];
  private foundCount = 0;
  private readonly MAX_DIFF = 3;

  public level = 1;

  private status: "playing" | "won" = "playing";
  private time = 0;
  private timerInterval: number | null = null;
  private onStateChange: ((s: any) => void) | null = null;

  constructor(c1: HTMLCanvasElement, c2: HTMLCanvasElement) {
    this.canvasL = c1;
    this.canvasR = c2;
    this.ctxL = c1.getContext("2d")!;
    this.ctxR = c2.getContext("2d")!;

    // Internal Res
    this.canvasL.width = this.width;
    this.canvasL.height = this.height;
    this.canvasR.width = this.width;
    this.canvasR.height = this.height;
  }

  public startLevel(lvl: number) {
    this.level = lvl;
    this.foundCount = 0;
    this.time = 0;
    this.status = "playing";

    this.generateScene();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);
    this.notify();
  }

  public reset() {
    this.startLevel(this.level);
  }

  private generateScene() {
    // RNG based on random Math
    this.shapes = [];
    this.differences = [];

    const shapeCount = 20 + this.level * 5;

    // Generate Base Shapes
    for (let i = 0; i < shapeCount; i++) {
      this.shapes.push({
        type: Math.random() > 0.5 ? "circle" : "rect",
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        w: 20 + Math.random() * 60,
        h: 20 + Math.random() * 60,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`, // Vibrant
        rotation: Math.random() * Math.PI * 2,
      });
    }

    // Select 3 differences
    // indices to modify
    const indices = new Set<number>();
    while (indices.size < this.MAX_DIFF) {
      indices.add(Math.floor(Math.random() * shapeCount));
    }

    const diffIndices = Array.from(indices);

    diffIndices.forEach((idx, i) => {
      const shape = this.shapes[idx];
      const typeRoll = Math.random();
      let type: Difference["type"] = "color";

      if (typeRoll < 0.33) type = "color";
      else if (typeRoll < 0.66) type = "size";
      else type = "missing"; // 'pos' is hard to spot without overlap check? 'missing' is distinct.

      this.differences.push({
        id: idx,
        x: shape.x,
        y: shape.y,
        r: 40, // standard hit radius
        found: false,
        type,
      });
    });

    this.drawScene();
  }

  private drawScene() {
    // Draw Left (Original)
    this.drawCanvas(this.ctxL, false);
    // Draw Right (Modified)
    this.drawCanvas(this.ctxR, true);
  }

  private drawCanvas(ctx: CanvasRenderingContext2D, isRight: boolean) {
    ctx.fillStyle = "#f0f8ff"; // bg
    ctx.fillRect(0, 0, this.width, this.height);

    this.shapes.forEach((s, i) => {
      const diff = this.differences.find((d) => d.id === i);

      // Skip if missing in Right
      if (isRight && diff && diff.type === "missing") return;

      ctx.save();

      let color = s.color;
      let w = s.w;
      let h = s.h;

      // Apply Diff
      if (isRight && diff) {
        if (diff.type === "color") {
          // Shift Hue
          color = `hsl(${
            (parseFloat(s.color.split("(")[1]) + 180) % 360
          }, 70%, 60%)`;
        } else if (diff.type === "size") {
          w *= 0.5;
          h *= 0.5;
        }
      }

      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.fillStyle = color;

      if (s.type === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      ctx.restore();
    });

    // Draw Markers for Found
    this.differences
      .filter((d) => d.found)
      .forEach((d) => {
        this.drawMarker(ctx, d.x, d.y);
      });
  }

  private drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  public checkClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Scale input x,y (client) to internal width/height?
    // Main.ts should handle coordinate mapping to 0..width range.

    let hit = false;

    this.differences.forEach((d) => {
      if (d.found) return;
      // Distance
      const dist = Math.sqrt((x - d.x) ** 2 + (y - d.y) ** 2);
      if (dist < d.r) {
        d.found = true;
        this.foundCount++;
        hit = true;

        // Re-draw both to show markers
        this.drawScene();
        this.notify();

        if (this.foundCount >= this.MAX_DIFF) {
          this.status = "won";
          if (this.timerInterval) clearInterval(this.timerInterval);
          this.notify();
        }
      }
    });

    return hit;
  }

  public hint() {
    // Find one unfound
    const d = this.differences.find((d) => !d.found);
    if (d) {
      // flash marker or just mark it? simple mark for now (cheat)
      // Or better: temporary marker?
      // Let's just find it.
      this.checkClick(d.x, d.y);
    }
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  private notify() {
    const time =
      this.status === "playing" ? Math.floor((Date.now() - 0) / 1000) : 0; // Fix time calc logic later
    if (this.onStateChange)
      this.onStateChange({
        found: this.foundCount,
        total: this.MAX_DIFF,
        time: this.time++,
        status: this.status,
        level: this.level,
      });
  }
}
