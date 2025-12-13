export interface FoldLine {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  folded: boolean;
  required: boolean;
  order: number; // Required fold order
}

export interface PaperLayer {
  points: { x: number; y: number }[];
  color: string;
  zIndex: number;
}

interface LevelConfig {
  maxFolds: number;
  correctSequence: number[];
}

const LEVELS: LevelConfig[] = [
  { maxFolds: 3, correctSequence: [0, 1, 2] },
  { maxFolds: 4, correctSequence: [0, 1, 2, 3] },
  { maxFolds: 5, correctSequence: [0, 1, 2, 3, 4] },
];

export class PaperPlaneGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  foldLines: FoldLine[] = [];
  layers: PaperLayer[] = [];
  currentLevel: number = 0;
  foldHistory: number[] = [];
  correctSequence: number[] = [];

  status: "playing" | "won" = "playing";
  animating: boolean = false;
  animationProgress: number = 0;
  currentFoldLine: FoldLine | null = null;

  paperWidth: number = 300;
  paperHeight: number = 400;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.foldHistory = [];
    this.animating = false;
    this.initPaper();
    this.loop();

    const config = LEVELS[this.currentLevel];
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        folds: `0/${config.maxFolds}`,
      });
    }
  }

  private initPaper() {
    const config = LEVELS[this.currentLevel];
    this.correctSequence = config.correctSequence;

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const pw = this.paperWidth;
    const ph = this.paperHeight;

    // Reset layers - start with flat paper
    this.layers = [
      {
        points: [
          { x: cx - pw / 2, y: cy - ph / 2 },
          { x: cx + pw / 2, y: cy - ph / 2 },
          { x: cx + pw / 2, y: cy + ph / 2 },
          { x: cx - pw / 2, y: cy + ph / 2 },
        ],
        color: "#f5f5f5",
        zIndex: 0,
      },
    ];

    // Create fold lines for paper plane
    this.foldLines = [];

    // Fold line 0: Top fold (fold in half vertically at top)
    this.foldLines.push({
      id: 0,
      x1: cx - pw / 2,
      y1: cy - ph / 2 + 60,
      x2: cx + pw / 2,
      y2: cy - ph / 2 + 60,
      folded: false,
      required: true,
      order: 0,
    });

    // Fold line 1: Left diagonal fold
    this.foldLines.push({
      id: 1,
      x1: cx - pw / 2,
      y1: cy - ph / 2,
      x2: cx,
      y2: cy - ph / 2 + 120,
      folded: false,
      required: true,
      order: 1,
    });

    // Fold line 2: Right diagonal fold
    this.foldLines.push({
      id: 2,
      x1: cx + pw / 2,
      y1: cy - ph / 2,
      x2: cx,
      y2: cy - ph / 2 + 120,
      folded: false,
      required: true,
      order: 2,
    });

    if (config.maxFolds >= 4) {
      // Fold line 3: Center vertical fold
      this.foldLines.push({
        id: 3,
        x1: cx,
        y1: cy - ph / 2,
        x2: cx,
        y2: cy + ph / 2,
        folded: false,
        required: true,
        order: 3,
      });
    }

    if (config.maxFolds >= 5) {
      // Fold line 4: Wing fold
      this.foldLines.push({
        id: 4,
        x1: cx - pw / 4,
        y1: cy,
        x2: cx + pw / 4,
        y2: cy,
        folded: false,
        required: true,
        order: 4,
      });
    }
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
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
    if (this.animating && this.currentFoldLine) {
      this.animationProgress += 0.05;
      if (this.animationProgress >= 1) {
        this.animationProgress = 0;
        this.animating = false;
        this.currentFoldLine.folded = true;
        this.currentFoldLine = null;

        // Check win
        this.checkWin();
      }
    }
  }

  private checkWin() {
    const config = LEVELS[this.currentLevel];

    if (this.foldHistory.length === config.maxFolds) {
      // Check if sequence is correct
      const isCorrect = this.foldHistory.every(
        (id, i) => id === this.correctSequence[i]
      );

      if (isCorrect) {
        this.status = "won";
        if (this.onStateChange) {
          this.onStateChange({
            status: "won",
            level: this.currentLevel + 1,
            hasNextLevel: this.currentLevel < LEVELS.length - 1,
          });
        }
      }
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing" || this.animating) return;

    // Find clicked fold line
    for (const line of this.foldLines) {
      if (line.folded) continue;

      const dist = this.pointToLineDistance(x, y, line);
      if (dist < 15) {
        this.performFold(line);
        return;
      }
    }
  }

  private pointToLineDistance(px: number, py: number, line: FoldLine): number {
    const { x1, y1, x2, y2 } = line;
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private performFold(line: FoldLine) {
    this.foldHistory.push(line.id);
    this.currentFoldLine = line;
    this.animating = true;
    this.animationProgress = 0;

    const config = LEVELS[this.currentLevel];
    if (this.onStateChange) {
      this.onStateChange({
        folds: `${this.foldHistory.length}/${config.maxFolds}`,
      });
    }
  }

  public undo() {
    if (this.foldHistory.length === 0 || this.animating) return;

    const lastId = this.foldHistory.pop();
    const line = this.foldLines.find((l) => l.id === lastId);
    if (line) {
      line.folded = false;
    }

    const config = LEVELS[this.currentLevel];
    if (this.onStateChange) {
      this.onStateChange({
        folds: `${this.foldHistory.length}/${config.maxFolds}`,
      });
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Sky background
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, "#74b9ff");
    skyGradient.addColorStop(1, "#a29bfe");
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Clouds
    this.drawClouds();

    // Draw paper
    this.drawPaper();

    // Draw fold lines
    this.drawFoldLines();

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
      this.drawPaperPlane();
    }
  }

  private drawClouds() {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

    // Cloud 1
    this.drawCloud(80, 60, 40);
    // Cloud 2
    this.drawCloud(450, 100, 50);
    // Cloud 3
    this.drawCloud(200, 350, 35);
  }

  private drawCloud(x: number, y: number, size: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
    this.ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPaper() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Paper shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.beginPath();
    this.ctx.rect(
      cx - this.paperWidth / 2 + 5,
      cy - this.paperHeight / 2 + 5,
      this.paperWidth,
      this.paperHeight
    );
    this.ctx.fill();

    // Calculate folded paper shape based on fold history
    this.ctx.save();

    // Draw base paper
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 2;

    const paperPoints = this.calculatePaperShape();

    this.ctx.beginPath();
    this.ctx.moveTo(paperPoints[0].x, paperPoints[0].y);
    for (let i = 1; i < paperPoints.length; i++) {
      this.ctx.lineTo(paperPoints[i].x, paperPoints[i].y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Paper texture lines
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(
        cx - this.paperWidth / 2,
        cy - this.paperHeight / 2 + i * 40
      );
      this.ctx.lineTo(
        cx + this.paperWidth / 2,
        cy - this.paperHeight / 2 + i * 40
      );
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private calculatePaperShape(): { x: number; y: number }[] {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const pw = this.paperWidth;
    const ph = this.paperHeight;

    // Base rectangle
    let points = [
      { x: cx - pw / 2, y: cy - ph / 2 },
      { x: cx + pw / 2, y: cy - ph / 2 },
      { x: cx + pw / 2, y: cy + ph / 2 },
      { x: cx - pw / 2, y: cy + ph / 2 },
    ];

    // Apply folds visually (simplified)
    const foldedCount = this.foldHistory.length;

    if (foldedCount >= 1) {
      // Top corners folded in
      points[0].y += 60;
      points[1].y += 60;
    }

    if (foldedCount >= 2) {
      // Left diagonal
      points[0].x += 40;
    }

    if (foldedCount >= 3) {
      // Right diagonal
      points[1].x -= 40;
    }

    return points;
  }

  private drawFoldLines() {
    for (const line of this.foldLines) {
      if (line.folded) continue;

      const isAnimating = this.currentFoldLine === line;

      // Dashed line
      this.ctx.setLineDash([8, 4]);
      this.ctx.strokeStyle = isAnimating ? "#e74c3c" : "#3498db";
      this.ctx.lineWidth = 3;

      this.ctx.beginPath();
      this.ctx.moveTo(line.x1, line.y1);
      this.ctx.lineTo(line.x2, line.y2);
      this.ctx.stroke();

      this.ctx.setLineDash([]);

      // Fold indicator circles at ends
      this.ctx.fillStyle = isAnimating ? "#e74c3c" : "#3498db";
      this.ctx.beginPath();
      this.ctx.arc(line.x1, line.y1, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(line.x2, line.y2, 5, 0, Math.PI * 2);
      this.ctx.fill();

      // Order number
      const midX = (line.x1 + line.x2) / 2;
      const midY = (line.y1 + line.y2) / 2;
      this.ctx.fillStyle = "white";
      this.ctx.beginPath();
      this.ctx.arc(midX, midY, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#3498db";
      this.ctx.font = "bold 14px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(String(line.order + 1), midX, midY);
    }
  }

  private drawPaperPlane() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 - 50;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(-Math.PI / 6);

    // Paper plane shape
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.strokeStyle = "#bbb";
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(0, -80); // Nose
    this.ctx.lineTo(60, 40); // Right wing
    this.ctx.lineTo(15, 30);
    this.ctx.lineTo(0, 80); // Tail
    this.ctx.lineTo(-15, 30);
    this.ctx.lineTo(-60, 40); // Left wing
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Center fold line
    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -80);
    this.ctx.lineTo(0, 80);
    this.ctx.stroke();

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 450;
      this.initPaper();
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
