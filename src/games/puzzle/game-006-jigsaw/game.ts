export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface GameConfig {
  rows: number;
  cols: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { rows: 3, cols: 3 },
  medium: { rows: 4, cols: 4 },
  hard: { rows: 6, cols: 6 },
  expert: { rows: 8, cols: 8 },
};

interface Piece {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imgX: number;
  imgY: number;
  currentX: number;
  currentY: number;
  isLocked: boolean;
  edges: { top: number; right: number; bottom: number; left: number }; // 0=flat, 1=out, -1=in
}

export interface GameState {
  status: "loading" | "playing" | "won";
  pieces: Piece[];
  startTime: number;
  playTime: number; // seconds
}

export class JigsawGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private pieces: Piece[] = [];
  private selectedPiece: Piece | null = null;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private config: GameConfig;
  private state: GameState;
  private onStateChange: ((state: GameState) => void) | null = null;
  private onGameEnd: ((won: boolean) => void) | null = null;
  private pieceWidth: number = 0;
  private pieceHeight: number = 0;
  private scale: number = 1;
  private puzzleWidth: number = 0;
  private puzzleHeight: number = 0;
  private puzzleOffsetX: number = 0;
  private puzzleOffsetY: number = 0;

  constructor(canvas: HTMLCanvasElement, difficulty: Difficulty) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.config = DIFFICULTY_CONFIGS[difficulty];
    this.state = {
      status: "loading",
      pieces: [],
      startTime: 0,
      playTime: 0,
    };

    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  private resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      if (this.state.status === "playing" || this.state.status === "won") {
        this.render();
      }
    }
  }

  public async loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.image = new Image();
      this.image.crossOrigin = "anonymous"; // critical for canvas
      this.image.onload = () => resolve();
      this.image.onerror = () => reject(new Error("Failed to load image"));
      this.image.src = src;
    });
  }

  public start(): void {
    if (!this.image) return;

    this.initPieces();
    this.scramblePieces();
    this.state.status = "playing";
    this.state.startTime = Date.now();
    this.state.playTime = 0;

    this.notifyStateChange();
    this.render();
  }

  private initPieces() {
    const { rows, cols } = this.config;
    this.pieces = [];

    // Calculate dimensions to fit image in canvas with padding
    // We want the puzzle to fit within approx 80% of canvas
    const maxWidth = this.canvas.width * 0.8;
    const maxHeight = this.canvas.height * 0.8;

    const imgRatio = this.image!.width / this.image!.height;
    const canvasRatio = maxWidth / maxHeight;

    if (imgRatio > canvasRatio) {
      this.puzzleWidth = maxWidth;
      this.puzzleHeight = maxWidth / imgRatio;
    } else {
      this.puzzleHeight = maxHeight;
      this.puzzleWidth = maxHeight * imgRatio;
    }

    this.scale = this.puzzleWidth / this.image!.width;
    this.pieceWidth = this.puzzleWidth / cols;
    this.pieceHeight = this.puzzleHeight / rows;

    // Center the puzzle target area
    this.puzzleOffsetX = (this.canvas.width - this.puzzleWidth) / 2;
    this.puzzleOffsetY = (this.canvas.height - this.puzzleHeight) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const edges = {
          top:
            r === 0
              ? 0
              : this.pieces[this.pieces.length - cols].edges.bottom * -1,
          right: c === cols - 1 ? 0 : Math.random() > 0.5 ? 1 : -1,
          bottom: r === rows - 1 ? 0 : Math.random() > 0.5 ? 1 : -1,
          left:
            c === 0 ? 0 : this.pieces[this.pieces.length - 1].edges.right * -1,
        };

        this.pieces.push({
          id: r * cols + c,
          row: r,
          col: c,
          x: this.puzzleOffsetX + c * this.pieceWidth, // Target X
          y: this.puzzleOffsetY + r * this.pieceHeight, // Target Y
          width: this.pieceWidth,
          height: this.pieceHeight,
          imgX: c * (this.image!.width / cols),
          imgY: r * (this.image!.height / rows),
          currentX: 0, // Will be set by scramble
          currentY: 0,
          isLocked: false,
          edges,
        });
      }
    }
  }

  private scramblePieces() {
    this.pieces.forEach((p) => {
      // Random position within canvas, keeping pieces mostly visible
      p.currentX = Math.random() * (this.canvas.width - p.width);
      p.currentY = Math.random() * (this.canvas.height - p.height);
      p.isLocked = false;
    });
  }

  public handleDown(x: number, y: number) {
    if (this.state.status !== "playing") return;

    // Find clicked piece (reverse order to pick top-most)
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (p.isLocked) continue;

      if (
        x >= p.currentX &&
        x <= p.currentX + p.width &&
        y >= p.currentY &&
        y <= p.currentY + p.height
      ) {
        this.selectedPiece = p;
        this.offsetX = x - p.currentX;
        this.offsetY = y - p.currentY;

        // Move to top of stack
        this.pieces.splice(i, 1);
        this.pieces.push(p);

        this.render();
        break;
      }
    }
  }

  public handleMove(x: number, y: number) {
    if (this.selectedPiece) {
      this.selectedPiece.currentX = x - this.offsetX;
      this.selectedPiece.currentY = y - this.offsetY;

      // Keep within bounds
      // this.selectedPiece.currentX = Math.max(0, Math.min(this.canvas.width - this.selectedPiece.width, this.selectedPiece.currentX));
      // this.selectedPiece.currentY = Math.max(0, Math.min(this.canvas.height - this.selectedPiece.height, this.selectedPiece.currentY));

      this.render();
    }
  }

  public handleUp() {
    if (this.selectedPiece) {
      const p = this.selectedPiece;
      const snapDist = 20; // pixels

      // Check distance to target
      const dist = Math.hypot(p.currentX - p.x, p.currentY - p.y);
      if (dist < snapDist) {
        p.currentX = p.x;
        p.currentY = p.y;
        p.isLocked = true;

        // Play snap sound (optional)
      }

      this.selectedPiece = null;
      this.checkWin();
      this.render();
    }
  }

  private checkWin() {
    if (this.pieces.every((p) => p.isLocked)) {
      this.state.status = "won";
      if (this.onGameEnd) this.onGameEnd(true);
      this.notifyStateChange();
    }
  }

  private drawPieceShape(
    ctx: CanvasRenderingContext2D,
    p: Piece,
    drawPathOnly: boolean = false
  ) {
    const w = p.width;
    const h = p.height;
    const x = drawPathOnly ? 0 : p.currentX;
    const y = drawPathOnly ? 0 : p.currentY;
    const neck = Math.min(w, h) * 0.2;
    const tabHeight = Math.min(w, h) * 0.2;
    const tabWidth = Math.min(w, h) * 0.3;

    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();

    // Top
    ctx.moveTo(0, 0);
    if (p.edges.top !== 0) {
      const dir = p.edges.top; // 1 = out (up), -1 = in (down)
      // Custom bezier for tab
      // Simplified: Just a bump
      ctx.lineTo(w / 2 - tabWidth / 2, 0);
      ctx.bezierCurveTo(
        w / 2 - tabWidth / 2,
        -tabHeight * dir,
        w / 2 + tabWidth / 2,
        -tabHeight * dir,
        w / 2 + tabWidth / 2,
        0
      );
    }
    ctx.lineTo(w, 0);

    // Right
    if (p.edges.right !== 0) {
      const dir = p.edges.right; // 1 = out (right), -1 = in (left)
      ctx.lineTo(w, h / 2 - tabWidth / 2);
      ctx.bezierCurveTo(
        w + tabHeight * dir,
        h / 2 - tabWidth / 2,
        w + tabHeight * dir,
        h / 2 + tabWidth / 2,
        w,
        h / 2 + tabWidth / 2
      );
    }
    ctx.lineTo(w, h);

    // Bottom
    if (p.edges.bottom !== 0) {
      const dir = p.edges.bottom; // 1 = out (down), -1 = in (up)
      ctx.lineTo(w / 2 + tabWidth / 2, h);
      ctx.bezierCurveTo(
        w / 2 + tabWidth / 2,
        h + tabHeight * dir,
        w / 2 - tabWidth / 2,
        h + tabHeight * dir,
        w / 2 - tabWidth / 2,
        h
      );
    }
    ctx.lineTo(0, h);

    // Left
    if (p.edges.left !== 0) {
      const dir = p.edges.left; // 1 = out (left), -1 = in (right)
      ctx.lineTo(0, h / 2 + tabWidth / 2);
      ctx.bezierCurveTo(
        -tabHeight * dir,
        h / 2 + tabWidth / 2,
        -tabHeight * dir,
        h / 2 - tabWidth / 2,
        0,
        h / 2 - tabWidth / 2
      );
    }
    ctx.closePath();
    ctx.restore();
  }

  private render() {
    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background guide (faint)
    if (this.image) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.2;
      this.ctx.drawImage(
        this.image,
        this.puzzleOffsetX,
        this.puzzleOffsetY,
        this.puzzleWidth,
        this.puzzleHeight
      );
      this.ctx.restore();
    }

    // Draw Outline/Grid (Optional)
    this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
    this.ctx.strokeRect(
      this.puzzleOffsetX,
      this.puzzleOffsetY,
      this.puzzleWidth,
      this.puzzleHeight
    );

    // Draw Locked Pieces (Background Layer)
    this.pieces.forEach((p) => {
      if (p.isLocked) {
        this.drawPiece(p);
      }
    });

    // Draw Loose Pieces
    this.pieces.forEach((p) => {
      if (!p.isLocked) {
        // Shadow for loose pieces
        this.ctx.save();
        this.ctx.shadowColor = "rgba(0,0,0,0.2)";
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.drawPiece(p);
        this.ctx.restore();
      }
    });
  }

  private drawPiece(p: Piece) {
    if (!this.image) return;

    // Create path for clipping
    this.ctx.save();
    this.drawPieceShape(this.ctx, p, false);
    this.ctx.clip(); // Clip to the puzzle shape

    // Draw image segment
    // We need to calculate where in the source image this piece draws from
    // AND adjust for the tabs sticking out.
    // The "box" [0,0,w,h] corresponds to [imgX, imgY, imgW/cols, imgH/rows]
    // BUT the clipping path extends outside.
    // So we need to draw a slightly larger chunk of the image, OR simpler:
    // Just map the image coordinates correctly.

    // Simplest approach: Draw the WHOLE scaled image but translated so the correct part shows through hole
    // p.currentX is where the top-left of the box is.
    // The image part at (imgX, imgY) should align with (p.currentX, p.currentY)

    const scale = this.scale;
    const drawX = p.currentX - p.imgX * scale;
    const drawY = p.currentY - p.imgY * scale;

    // We draw the full image (scaled)
    this.ctx.drawImage(
      this.image,
      drawX,
      drawY,
      this.image.width * scale,
      this.image.height * scale
    );

    // Stroke border
    this.ctx.stroke();

    this.ctx.restore();

    // Draw Border on top to define shape clearly
    this.ctx.save();
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 1;
    this.drawPieceShape(this.ctx, p, false);
    this.ctx.stroke();
    this.ctx.restore();
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
    this.notifyStateChange();
  }

  public setOnGameEnd(cb: (won: boolean) => void) {
    this.onGameEnd = cb;
  }

  private notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  public getPlayTime(): number {
    return Math.floor((Date.now() - this.state.startTime) / 1000);
  }
}
