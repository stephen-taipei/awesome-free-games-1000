/**
 * Symmetry Draw Game Engine
 * Game #089 - Draw symmetric patterns with mirroring
 */

export type SymmetryMode = "vertical" | "horizontal" | "quad" | "radial";

export class SymmetryDrawGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  private brushColor = "#e74c3c";
  private brushSize = 8;
  private mode: SymmetryMode = "vertical";
  private radialSegments = 8;

  private onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  public start() {
    this.clear();
    this.drawGuideLines();
  }

  private drawGuideLines() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    if (this.mode === "vertical" || this.mode === "quad") {
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
    }

    if (this.mode === "horizontal" || this.mode === "quad") {
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }

    if (this.mode === "radial") {
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < this.radialSegments; i++) {
        const angle = (i * Math.PI * 2) / this.radialSegments;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle) * Math.max(w, h),
          cy + Math.sin(angle) * Math.max(w, h)
        );
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
  }

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (type === "down") {
      this.isDrawing = true;
      this.lastX = x;
      this.lastY = y;
    } else if (type === "move" && this.isDrawing) {
      this.drawSymmetric(this.lastX, this.lastY, x, y);
      this.lastX = x;
      this.lastY = y;
    } else if (type === "up") {
      this.isDrawing = false;
    }
  }

  private drawSymmetric(x1: number, y1: number, x2: number, y2: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = this.brushColor;
    ctx.lineWidth = this.brushSize;
    ctx.setLineDash([]);

    // Original stroke
    this.drawLine(x1, y1, x2, y2);

    if (this.mode === "vertical") {
      // Mirror horizontally (across vertical axis)
      this.drawLine(w - x1, y1, w - x2, y2);
    } else if (this.mode === "horizontal") {
      // Mirror vertically (across horizontal axis)
      this.drawLine(x1, h - y1, x2, h - y2);
    } else if (this.mode === "quad") {
      // Mirror in all 4 quadrants
      this.drawLine(w - x1, y1, w - x2, y2);
      this.drawLine(x1, h - y1, x2, h - y2);
      this.drawLine(w - x1, h - y1, w - x2, h - y2);
    } else if (this.mode === "radial") {
      // Radial symmetry
      for (let i = 1; i < this.radialSegments; i++) {
        const angle = (i * Math.PI * 2) / this.radialSegments;

        // Transform points relative to center
        const dx1 = x1 - cx;
        const dy1 = y1 - cy;
        const dx2 = x2 - cx;
        const dy2 = y2 - cy;

        // Rotate
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rx1 = dx1 * cos - dy1 * sin + cx;
        const ry1 = dx1 * sin + dy1 * cos + cy;
        const rx2 = dx2 * cos - dy2 * sin + cx;
        const ry2 = dx2 * sin + dy2 * cos + cy;

        this.drawLine(rx1, ry1, rx2, ry2);

        // Also draw mirrored (for kaleidoscope effect)
        const mrx1 = -dx1 * cos - dy1 * sin + cx;
        const mry1 = -dx1 * sin + dy1 * cos + cy;
        const mrx2 = -dx2 * cos - dy2 * sin + cx;
        const mry2 = -dx2 * sin + dy2 * cos + cy;

        this.drawLine(mrx1, mry1, mrx2, mry2);
      }
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  public setColor(color: string) {
    this.brushColor = color;
  }

  public setBrushSize(size: number) {
    this.brushSize = size;
  }

  public setMode(mode: SymmetryMode) {
    this.mode = mode;
    this.clear();
    this.drawGuideLines();

    if (this.onStateChange) {
      this.onStateChange({ mode });
    }
  }

  public nextMode() {
    const modes: SymmetryMode[] = ["vertical", "horizontal", "quad", "radial"];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);
  }

  public getMode(): SymmetryMode {
    return this.mode;
  }

  public clear() {
    const ctx = this.ctx;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGuideLines();
  }

  public save() {
    // Create a temporary canvas without guide lines
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext("2d")!;

    // Copy current canvas
    tempCtx.drawImage(this.canvas, 0, 0);

    // Download
    const link = document.createElement("a");
    link.download = `symmetry-art-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.canvas.width = size;
      this.canvas.height = size;
      this.clear();
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
