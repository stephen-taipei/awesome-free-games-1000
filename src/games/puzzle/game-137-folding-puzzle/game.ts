/**
 * Folding Puzzle Game
 * Game #137 - Fold paper along lines to match target pattern
 */

interface FoldLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "horizontal" | "vertical";
}

interface Layer {
  points: { x: number; y: number }[];
  color: string;
}

interface Level {
  width: number;
  height: number;
  foldLines: FoldLine[];
  targetLayers: number;
  initialColor: string;
}

const PAPER_COLORS = [
  "#fff5e6", // cream
  "#ffe6e6", // light pink
  "#e6f2ff", // light blue
  "#e6ffe6", // light green
  "#fff0f5", // lavender
];

const LEVELS: Level[] = [
  // Level 1: Simple horizontal fold
  {
    width: 200,
    height: 200,
    foldLines: [{ x1: 0, y1: 100, x2: 200, y2: 100, type: "horizontal" }],
    targetLayers: 2,
    initialColor: PAPER_COLORS[0],
  },
  // Level 2: Simple vertical fold
  {
    width: 200,
    height: 200,
    foldLines: [{ x1: 100, y1: 0, x2: 100, y2: 200, type: "vertical" }],
    targetLayers: 2,
    initialColor: PAPER_COLORS[1],
  },
  // Level 3: Two folds
  {
    width: 200,
    height: 200,
    foldLines: [
      { x1: 0, y1: 100, x2: 200, y2: 100, type: "horizontal" },
      { x1: 100, y1: 0, x2: 100, y2: 200, type: "vertical" },
    ],
    targetLayers: 4,
    initialColor: PAPER_COLORS[2],
  },
  // Level 4: Three folds
  {
    width: 240,
    height: 160,
    foldLines: [
      { x1: 80, y1: 0, x2: 80, y2: 160, type: "vertical" },
      { x1: 160, y1: 0, x2: 160, y2: 160, type: "vertical" },
      { x1: 0, y1: 80, x2: 240, y2: 80, type: "horizontal" },
    ],
    targetLayers: 6,
    initialColor: PAPER_COLORS[3],
  },
  // Level 5: Complex folds
  {
    width: 200,
    height: 200,
    foldLines: [
      { x1: 0, y1: 50, x2: 200, y2: 50, type: "horizontal" },
      { x1: 0, y1: 150, x2: 200, y2: 150, type: "horizontal" },
      { x1: 100, y1: 0, x2: 100, y2: 200, type: "vertical" },
    ],
    targetLayers: 6,
    initialColor: PAPER_COLORS[4],
  },
  // Level 6
  {
    width: 240,
    height: 240,
    foldLines: [
      { x1: 60, y1: 0, x2: 60, y2: 240, type: "vertical" },
      { x1: 120, y1: 0, x2: 120, y2: 240, type: "vertical" },
      { x1: 180, y1: 0, x2: 180, y2: 240, type: "vertical" },
      { x1: 0, y1: 120, x2: 240, y2: 120, type: "horizontal" },
    ],
    targetLayers: 8,
    initialColor: PAPER_COLORS[0],
  },
];

export class FoldingPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  currentLevel: number = 0;
  layers: Layer[] = [];
  foldedLines: Set<number> = new Set();
  moves: number = 0;
  history: { layers: Layer[]; foldedLines: Set<number> }[] = [];

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private animating: boolean = false;
  private animationProgress: number = 0;
  private animatingLine: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.render();
  }

  public start() {
    this.loadLevel(this.currentLevel);
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({
          status: "complete",
          level: levelIndex + 1,
          moves: this.moves,
        });
      }
      return;
    }

    const level = LEVELS[levelIndex];

    // Initialize with single layer (full paper)
    this.layers = [
      {
        points: [
          { x: 0, y: 0 },
          { x: level.width, y: 0 },
          { x: level.width, y: level.height },
          { x: 0, y: level.height },
        ],
        color: level.initialColor,
      },
    ];

    this.foldedLines = new Set();
    this.moves = 0;
    this.history = [];
    this.status = "playing";
    this.animating = false;

    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        moves: 0,
        targetLayers: level.targetLayers,
        currentLayers: 1,
      });
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing" || this.animating) return;

    const level = LEVELS[this.currentLevel];
    const offsetX = (this.width - level.width) / 2;
    const offsetY = (this.height - level.height) / 2 - 30;

    // Convert to paper coordinates
    const paperX = x - offsetX;
    const paperY = y - offsetY;

    // Check if click is near a fold line
    for (let i = 0; i < level.foldLines.length; i++) {
      if (this.foldedLines.has(i)) continue;

      const line = level.foldLines[i];
      if (this.isNearLine(paperX, paperY, line)) {
        this.fold(i);
        return;
      }
    }
  }

  private isNearLine(x: number, y: number, line: FoldLine): boolean {
    const threshold = 15;

    if (line.type === "horizontal") {
      return (
        y >= line.y1 - threshold &&
        y <= line.y1 + threshold &&
        x >= line.x1 &&
        x <= line.x2
      );
    } else {
      return (
        x >= line.x1 - threshold &&
        x <= line.x1 + threshold &&
        y >= line.y1 &&
        y <= line.y2
      );
    }
  }

  private fold(lineIndex: number) {
    // Save state for undo
    this.history.push({
      layers: JSON.parse(JSON.stringify(this.layers)),
      foldedLines: new Set(this.foldedLines),
    });

    this.animatingLine = lineIndex;
    this.animating = true;
    this.animationProgress = 0;

    const animate = () => {
      this.animationProgress += 0.05;
      this.render();

      if (this.animationProgress >= 1) {
        this.animating = false;
        this.performFold(lineIndex);
        this.foldedLines.add(lineIndex);
        this.moves++;
        this.render();
        this.checkWin();

        if (this.onStateChange) {
          const level = LEVELS[this.currentLevel];
          this.onStateChange({
            status: this.status,
            level: this.currentLevel + 1,
            moves: this.moves,
            targetLayers: level.targetLayers,
            currentLayers: this.layers.length,
          });
        }
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private performFold(lineIndex: number) {
    const level = LEVELS[this.currentLevel];
    const line = level.foldLines[lineIndex];
    const newLayers: Layer[] = [];

    this.layers.forEach((layer) => {
      const above: { x: number; y: number }[] = [];
      const below: { x: number; y: number }[] = [];

      layer.points.forEach((point) => {
        if (line.type === "horizontal") {
          if (point.y <= line.y1) {
            above.push(point);
          }
          if (point.y >= line.y1) {
            below.push(point);
          }
        } else {
          if (point.x <= line.x1) {
            above.push(point);
          }
          if (point.x >= line.x1) {
            below.push(point);
          }
        }
      });

      // Add points on fold line
      if (line.type === "horizontal") {
        above.push({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y1 });
        below.push({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y1 });
      } else {
        above.push({ x: line.x1, y: line.y1 }, { x: line.x1, y: line.y2 });
        below.push({ x: line.x1, y: line.y1 }, { x: line.x1, y: line.y2 });
      }

      // Sort points to form proper polygon
      const sortedAbove = this.sortPolygonPoints(above);
      const sortedBelow = this.sortPolygonPoints(below);

      if (sortedAbove.length >= 3) {
        newLayers.push({ points: sortedAbove, color: layer.color });
      }

      // Mirror the "below" part
      if (sortedBelow.length >= 3) {
        const mirrored = sortedBelow.map((p) => {
          if (line.type === "horizontal") {
            return { x: p.x, y: 2 * line.y1 - p.y };
          } else {
            return { x: 2 * line.x1 - p.x, y: p.y };
          }
        });
        newLayers.push({ points: mirrored, color: this.getDarkerColor(layer.color) });
      }
    });

    this.layers = newLayers;
  }

  private sortPolygonPoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length < 3) return points;

    // Find centroid
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Sort by angle
    return [...points].sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });
  }

  private getDarkerColor(color: string): string {
    // Simple darkening
    const colors: Record<string, string> = {
      "#fff5e6": "#ffe6cc",
      "#ffe6e6": "#ffcccc",
      "#e6f2ff": "#cce0ff",
      "#e6ffe6": "#ccffcc",
      "#fff0f5": "#ffe6f0",
      "#ffe6cc": "#ffd699",
      "#ffcccc": "#ffb3b3",
      "#cce0ff": "#99c2ff",
      "#ccffcc": "#99ff99",
      "#ffe6f0": "#ffd6e8",
    };
    return colors[color] || color;
  }

  private checkWin() {
    const level = LEVELS[this.currentLevel];
    if (this.layers.length >= level.targetLayers) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          moves: this.moves,
        });
      }
    }
  }

  public undo() {
    if (this.history.length === 0 || this.animating) return;

    const lastState = this.history.pop()!;
    this.layers = lastState.layers;
    this.foldedLines = lastState.foldedLines;
    this.moves = Math.max(0, this.moves - 1);

    this.render();

    if (this.onStateChange) {
      const level = LEVELS[this.currentLevel];
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        moves: this.moves,
        targetLayers: level.targetLayers,
        currentLayers: this.layers.length,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.width, this.height);

    const level = LEVELS[this.currentLevel];
    if (!level) return;

    const offsetX = (this.width - level.width) / 2;
    const offsetY = (this.height - level.height) / 2 - 30;

    // Draw target indicator
    this.drawTarget(level);

    // Draw paper shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(offsetX + 5, offsetY + 5, level.width, level.height);

    // Draw layers
    ctx.save();
    ctx.translate(offsetX, offsetY);

    this.layers.forEach((layer, index) => {
      ctx.fillStyle = layer.color;
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (layer.points.length > 0) {
        ctx.moveTo(layer.points[0].x, layer.points[0].y);
        for (let i = 1; i < layer.points.length; i++) {
          ctx.lineTo(layer.points[i].x, layer.points[i].y);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      // Layer number
      if (layer.points.length > 0) {
        const cx = layer.points.reduce((s, p) => s + p.x, 0) / layer.points.length;
        const cy = layer.points.reduce((s, p) => s + p.y, 0) / layer.points.length;
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${index + 1}`, cx, cy);
      }
    });

    // Draw fold lines
    level.foldLines.forEach((line, index) => {
      if (this.foldedLines.has(index)) return;

      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();

      ctx.setLineDash([]);
    });

    // Animation
    if (this.animating && this.animatingLine >= 0) {
      const line = level.foldLines[this.animatingLine];
      ctx.fillStyle = `rgba(231, 76, 60, ${0.3 * (1 - this.animationProgress)})`;
      ctx.fillRect(0, 0, level.width, level.height);
    }

    ctx.restore();
  }

  private drawTarget(level: Level) {
    const ctx = this.ctx;
    const targetX = this.width - 80;
    const targetY = 20;

    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(targetX - 10, targetY - 5, 70, 50);

    ctx.fillStyle = "#3498db";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TARGET", targetX + 25, targetY + 10);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`${level.targetLayers}`, targetX + 25, targetY + 35);

    ctx.fillStyle = "#7f8c8d";
    ctx.font = "10px Arial";
    ctx.fillText("layers", targetX + 25, targetY + 45);
  }

  public nextLevel() {
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public restart() {
    this.currentLevel = 0;
    this.loadLevel(0);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
