/**
 * Map Puzzle Game Engine
 * Game #120 - Assemble map pieces
 */

export interface MapPiece {
  id: number;
  correctRow: number;
  correctCol: number;
  currentX: number;
  currentY: number;
  width: number;
  height: number;
  placed: boolean;
  color: string;
  landType: "land" | "water" | "mountain" | "forest" | "desert";
}

export interface LevelConfig {
  rows: number;
  cols: number;
  mapType: string;
}

export class MapPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private pieces: MapPiece[] = [];
  private draggedPiece: MapPiece | null = null;
  private dragOffset = { x: 0, y: 0 };

  private gridRows = 3;
  private gridCols = 4;
  private pieceWidth = 0;
  private pieceHeight = 0;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private snapDistance = 30;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    { rows: 2, cols: 3, mapType: "island" },
    { rows: 3, cols: 3, mapType: "continent" },
    { rows: 3, cols: 4, mapType: "world" },
    { rows: 4, cols: 4, mapType: "terrain" },
    { rows: 4, cols: 5, mapType: "fantasy" },
  ];

  private mapPatterns: Record<string, string[][]> = {
    island: [
      ["water", "water", "water"],
      ["water", "land", "water"],
    ],
    continent: [
      ["water", "land", "water"],
      ["land", "land", "land"],
      ["water", "land", "water"],
    ],
    world: [
      ["water", "land", "water", "land"],
      ["land", "land", "water", "water"],
      ["water", "land", "land", "water"],
    ],
    terrain: [
      ["mountain", "forest", "land", "water"],
      ["forest", "land", "land", "water"],
      ["land", "land", "desert", "water"],
      ["water", "water", "water", "water"],
    ],
    fantasy: [
      ["mountain", "forest", "land", "water", "water"],
      ["forest", "land", "land", "land", "water"],
      ["land", "land", "desert", "land", "land"],
      ["water", "land", "land", "forest", "mountain"],
    ],
  };

  private landColors: Record<string, { fill: string; pattern: string }> = {
    land: { fill: "#7CB342", pattern: "#689F38" },
    water: { fill: "#42A5F5", pattern: "#1E88E5" },
    mountain: { fill: "#795548", pattern: "#5D4037" },
    forest: { fill: "#388E3C", pattern: "#2E7D32" },
    desert: { fill: "#FFB74D", pattern: "#FFA726" },
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "playing") return;

      const pos = getPos(e);

      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const piece = this.pieces[i];
        if (piece.placed) continue;

        if (this.isPointInPiece(pos.x, pos.y, piece)) {
          this.draggedPiece = piece;
          this.dragOffset = {
            x: pos.x - piece.currentX,
            y: pos.y - piece.currentY,
          };

          // Move to top
          this.pieces.splice(i, 1);
          this.pieces.push(piece);
          break;
        }
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.draggedPiece) return;
      e.preventDefault();

      const pos = getPos(e);
      this.draggedPiece.currentX = pos.x - this.dragOffset.x;
      this.draggedPiece.currentY = pos.y - this.dragOffset.y;
      this.draw();
    };

    const handleEnd = () => {
      if (!this.draggedPiece) return;

      const piece = this.draggedPiece;
      const targetX = this.gridOffsetX + piece.correctCol * this.pieceWidth;
      const targetY = this.gridOffsetY + piece.correctRow * this.pieceHeight;

      const dist = Math.hypot(piece.currentX - targetX, piece.currentY - targetY);

      if (dist < this.snapDistance) {
        piece.currentX = targetX;
        piece.currentY = targetY;
        piece.placed = true;

        if (this.onStateChange) {
          const placed = this.pieces.filter((p) => p.placed).length;
          this.onStateChange({ pieces: `${placed}/${this.pieces.length}` });
        }

        this.checkWin();
      }

      this.draggedPiece = null;
      this.draw();
    };

    this.canvas.addEventListener("mousedown", handleStart);
    this.canvas.addEventListener("mousemove", handleMove);
    this.canvas.addEventListener("mouseup", handleEnd);
    this.canvas.addEventListener("mouseleave", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: false });
    this.canvas.addEventListener("touchmove", handleMove, { passive: false });
    this.canvas.addEventListener("touchend", handleEnd);
  }

  private isPointInPiece(px: number, py: number, piece: MapPiece): boolean {
    return (
      px >= piece.currentX &&
      px <= piece.currentX + piece.width &&
      py >= piece.currentY &&
      py <= piece.currentY + piece.height
    );
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.gridRows = config.rows;
    this.gridCols = config.cols;

    const mapPattern = this.mapPatterns[config.mapType];
    this.pieces = [];

    // Calculate piece dimensions
    const maxWidth = this.canvas.width - 40;
    const maxHeight = this.canvas.height * 0.5;
    this.pieceWidth = Math.min(maxWidth / this.gridCols, 80);
    this.pieceHeight = Math.min(maxHeight / this.gridRows, 60);

    this.gridOffsetX = (this.canvas.width - this.pieceWidth * this.gridCols) / 2;
    this.gridOffsetY = 30;

    // Create pieces
    let id = 0;
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const landType = (mapPattern[row]?.[col] || "water") as MapPiece["landType"];
        const colors = this.landColors[landType];

        this.pieces.push({
          id: id++,
          correctRow: row,
          correctCol: col,
          currentX: 0,
          currentY: 0,
          width: this.pieceWidth - 4,
          height: this.pieceHeight - 4,
          placed: false,
          color: colors.fill,
          landType,
        });
      }
    }

    // Shuffle pieces
    this.shufflePieces();

    if (this.onStateChange) {
      this.onStateChange({ pieces: `0/${this.pieces.length}` });
    }
  }

  private shufflePieces() {
    const trayY = this.gridOffsetY + this.gridRows * this.pieceHeight + 40;
    const trayWidth = this.canvas.width - 40;

    this.pieces.forEach((piece, i) => {
      piece.currentX = 30 + Math.random() * (trayWidth - piece.width);
      piece.currentY = trayY + Math.random() * (this.canvas.height - trayY - piece.height - 20);
    });
  }

  private checkWin() {
    if (this.pieces.every((p) => p.placed)) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw grid outline
    this.drawGrid(ctx);

    // Draw tray area
    const trayY = this.gridOffsetY + this.gridRows * this.pieceHeight + 30;
    ctx.fillStyle = "#252540";
    ctx.fillRect(20, trayY, w - 40, h - trayY - 20);
    ctx.strokeStyle = "#3a3a5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, trayY, w - 40, h - trayY - 20);

    // Draw placed pieces in grid
    this.pieces.forEach((piece) => {
      if (piece.placed) {
        this.drawPiece(ctx, piece, false);
      }
    });

    // Draw unplaced pieces
    this.pieces.forEach((piece) => {
      if (!piece.placed) {
        this.drawPiece(ctx, piece, piece === this.draggedPiece);
      }
    });
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;

    for (let row = 0; row <= this.gridRows; row++) {
      const y = this.gridOffsetY + row * this.pieceHeight;
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX, y);
      ctx.lineTo(this.gridOffsetX + this.gridCols * this.pieceWidth, y);
      ctx.stroke();
    }

    for (let col = 0; col <= this.gridCols; col++) {
      const x = this.gridOffsetX + col * this.pieceWidth;
      ctx.beginPath();
      ctx.moveTo(x, this.gridOffsetY);
      ctx.lineTo(x, this.gridOffsetY + this.gridRows * this.pieceHeight);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  private drawPiece(
    ctx: CanvasRenderingContext2D,
    piece: MapPiece,
    isDragging: boolean
  ) {
    const x = piece.currentX;
    const y = piece.currentY;
    const w = piece.width;
    const h = piece.height;

    if (isDragging) {
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 15;
    }

    // Base fill
    ctx.fillStyle = piece.color;
    ctx.fillRect(x, y, w, h);

    // Pattern based on land type
    this.drawLandPattern(ctx, piece, x, y, w, h);

    // Border
    ctx.strokeStyle = piece.placed ? "#4CAF50" : "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.shadowBlur = 0;

    // Puzzle notch indicators
    this.drawPuzzleNotches(ctx, piece, x, y, w, h);
  }

  private drawLandPattern(
    ctx: CanvasRenderingContext2D,
    piece: MapPiece,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const colors = this.landColors[piece.landType];

    switch (piece.landType) {
      case "water":
        // Waves
        ctx.strokeStyle = colors.pattern;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 10 + i * 15);
          ctx.quadraticCurveTo(x + w / 4, y + 5 + i * 15, x + w / 2, y + 10 + i * 15);
          ctx.quadraticCurveTo(x + (w * 3) / 4, y + 15 + i * 15, x + w - 5, y + 10 + i * 15);
          ctx.stroke();
        }
        break;

      case "mountain":
        // Mountain peaks
        ctx.fillStyle = colors.pattern;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y + h - 5);
        ctx.lineTo(x + w * 0.35, y + 10);
        ctx.lineTo(x + w * 0.5, y + h - 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5, y + h - 5);
        ctx.lineTo(x + w * 0.7, y + 15);
        ctx.lineTo(x + w * 0.9, y + h - 5);
        ctx.fill();
        // Snow caps
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y + 15);
        ctx.lineTo(x + w * 0.35, y + 10);
        ctx.lineTo(x + w * 0.4, y + 15);
        ctx.fill();
        break;

      case "forest":
        // Trees
        ctx.fillStyle = colors.pattern;
        for (let i = 0; i < 3; i++) {
          const tx = x + 15 + i * (w / 3);
          const ty = y + h - 10;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + 10, ty - 20);
          ctx.lineTo(tx + 20, ty);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case "desert":
        // Dunes
        ctx.fillStyle = colors.pattern;
        ctx.beginPath();
        ctx.moveTo(x, y + h - 5);
        ctx.quadraticCurveTo(x + w / 4, y + h - 20, x + w / 2, y + h - 5);
        ctx.quadraticCurveTo(x + (w * 3) / 4, y + h - 15, x + w, y + h - 5);
        ctx.fill();
        break;

      case "land":
        // Grass dots
        ctx.fillStyle = colors.pattern;
        for (let i = 0; i < 5; i++) {
          const gx = x + 10 + Math.random() * (w - 20);
          const gy = y + 10 + Math.random() * (h - 20);
          ctx.beginPath();
          ctx.arc(gx, gy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }

  private drawPuzzleNotches(
    ctx: CanvasRenderingContext2D,
    piece: MapPiece,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const notchSize = 8;
    ctx.fillStyle = "#333";

    // Top notch (if not top row)
    if (piece.correctRow > 0) {
      ctx.beginPath();
      ctx.arc(x + w / 2, y, notchSize, 0, Math.PI);
      ctx.fill();
    }

    // Left notch (if not left column)
    if (piece.correctCol > 0) {
      ctx.beginPath();
      ctx.arc(x, y + h / 2, notchSize, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(550, rect.width - 20);
      this.canvas.height = 450;

      if (this.pieces.length > 0) {
        // Recalculate piece dimensions
        const maxWidth = this.canvas.width - 40;
        const maxHeight = this.canvas.height * 0.5;
        this.pieceWidth = Math.min(maxWidth / this.gridCols, 80);
        this.pieceHeight = Math.min(maxHeight / this.gridRows, 60);
        this.gridOffsetX = (this.canvas.width - this.pieceWidth * this.gridCols) / 2;

        // Update piece dimensions
        this.pieces.forEach((p) => {
          p.width = this.pieceWidth - 4;
          p.height = this.pieceHeight - 4;
        });
      }

      this.draw();
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getPiecesPlaced(): string {
    const placed = this.pieces.filter((p) => p.placed).length;
    return `${placed}/${this.pieces.length}`;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
