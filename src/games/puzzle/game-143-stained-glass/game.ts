/**
 * Stained Glass Game Logic
 * Game #143 - Color Fill Puzzle
 */

interface Region {
  id: number;
  path: Path2D;
  points: { x: number; y: number }[];
  color: string | null;
  colorIndex: number;
  neighbors: number[];
  cx: number;
  cy: number;
}

interface Level {
  regions: { points: number[][]; neighbors: number[] }[];
  numColors: number;
}

interface GameState {
  level: number;
  status: "idle" | "playing" | "won" | "complete";
  filledCount: number;
  totalRegions: number;
  selectedColor: string;
}

type StateChangeCallback = (state: GameState & {
  regionFill?: { x: number; y: number; colorIndex: number };
  validColoring?: { x: number; y: number };
  invalidColoring?: boolean;
  reset?: boolean;
}) => void;

const COLORS = [
  "#e74c3c", // Red
  "#3498db", // Blue
  "#f1c40f", // Yellow
  "#2ecc71", // Green
  "#9b59b6", // Purple
  "#e67e22", // Orange
];

const LEVELS: Level[] = [
  {
    numColors: 3,
    regions: [
      { points: [[0, 0], [150, 0], [150, 150], [0, 150]], neighbors: [1, 2] },
      { points: [[150, 0], [300, 0], [300, 150], [150, 150]], neighbors: [0, 3] },
      { points: [[0, 150], [150, 150], [150, 300], [0, 300]], neighbors: [0, 3] },
      { points: [[150, 150], [300, 150], [300, 300], [150, 300]], neighbors: [1, 2] },
    ],
  },
  {
    numColors: 3,
    regions: [
      { points: [[150, 0], [300, 150], [150, 150]], neighbors: [1, 2, 4] },
      { points: [[150, 0], [150, 150], [0, 150]], neighbors: [0, 2, 3] },
      { points: [[0, 150], [150, 150], [150, 300]], neighbors: [0, 1, 3, 4] },
      { points: [[0, 150], [150, 300], [0, 300]], neighbors: [1, 2] },
      { points: [[150, 150], [300, 150], [300, 300], [150, 300]], neighbors: [0, 2] },
    ],
  },
  {
    numColors: 4,
    regions: [
      { points: [[150, 0], [300, 0], [225, 100]], neighbors: [1, 5] },
      { points: [[0, 0], [150, 0], [75, 100]], neighbors: [0, 2, 5] },
      { points: [[0, 0], [75, 100], [0, 200]], neighbors: [1, 3, 5] },
      { points: [[0, 200], [75, 100], [150, 200], [75, 300]], neighbors: [2, 4, 5] },
      { points: [[75, 300], [150, 200], [225, 300]], neighbors: [3, 5, 6] },
      { points: [[75, 100], [225, 100], [150, 200]], neighbors: [0, 1, 2, 3, 4, 6] },
      { points: [[225, 100], [300, 0], [300, 300], [225, 300], [150, 200]], neighbors: [0, 4, 5] },
    ],
  },
  {
    numColors: 4,
    regions: [
      { points: [[150, 150], [100, 50], [200, 50]], neighbors: [1, 2, 3, 4] },
      { points: [[100, 50], [150, 150], [50, 150], [50, 50]], neighbors: [0, 2, 4] },
      { points: [[50, 150], [150, 150], [100, 250], [50, 250]], neighbors: [0, 1, 3] },
      { points: [[150, 150], [200, 50], [250, 50], [250, 150], [200, 250], [100, 250]], neighbors: [0, 2, 4] },
      { points: [[200, 50], [150, 150], [250, 150]], neighbors: [0, 1, 3] },
    ],
  },
  {
    numColors: 4,
    regions: [
      { points: [[150, 150], [150, 50], [250, 50], [250, 150]], neighbors: [1, 3, 5] },
      { points: [[50, 50], [150, 50], [150, 150], [50, 150]], neighbors: [0, 2, 4] },
      { points: [[50, 150], [150, 150], [150, 250], [50, 250]], neighbors: [1, 3, 4, 5] },
      { points: [[150, 150], [250, 150], [250, 250], [150, 250]], neighbors: [0, 2, 4, 5] },
      { points: [[50, 250], [150, 250], [150, 350], [50, 350]], neighbors: [1, 2, 3] },
      { points: [[150, 250], [250, 250], [250, 350], [150, 350]], neighbors: [0, 2, 3] },
    ],
  },
  {
    numColors: 5,
    regions: [
      { points: [[150, 20], [200, 100], [150, 180], [100, 100]], neighbors: [1, 2, 3, 4] },
      { points: [[100, 100], [150, 20], [50, 50]], neighbors: [0, 2, 4] },
      { points: [[50, 50], [150, 20], [200, 100], [250, 50], [150, 100]], neighbors: [0, 1, 3] },
      { points: [[200, 100], [250, 50], [250, 200], [200, 280], [150, 180]], neighbors: [0, 2, 4] },
      { points: [[50, 50], [100, 100], [150, 180], [200, 280], [150, 350], [50, 280]], neighbors: [0, 1, 3] },
    ],
  },
];

export class StainedGlassGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private regions: Region[] = [];
  private selectedColor: string = COLORS[0];
  private selectedColorIndex: number = 0;
  private availableColors: string[] = [];
  private isPlaying: boolean = false;

  private onStateChange: StateChangeCallback | null = null;

  private pendingEvents: {
    regionFill?: { x: number; y: number; colorIndex: number };
    validColoring?: { x: number; y: number };
    invalidColoring?: boolean;
    reset?: boolean;
  } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  getAvailableColors(): string[] {
    return this.availableColors;
  }

  getSelectedColor(): string {
    return this.selectedColor;
  }

  setSelectedColor(color: string) {
    this.selectedColor = color;
    this.selectedColorIndex = this.availableColors.indexOf(color);
    this.emitState();
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.scale = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.initLevel();
    this.draw();
  }

  private initLevel() {
    const level = LEVELS[this.currentLevel];
    this.availableColors = COLORS.slice(0, level.numColors);
    this.selectedColor = this.availableColors[0];
    this.selectedColorIndex = 0;
    this.regions = [];

    const offsetX = (this.width - 300) / 2;
    const offsetY = 20;

    level.regions.forEach((regionDef, i) => {
      const path = new Path2D();
      const points = regionDef.points.map((p) => ({
        x: p[0] + offsetX,
        y: p[1] + offsetY,
      }));

      path.moveTo(points[0].x, points[0].y);
      for (let j = 1; j < points.length; j++) {
        path.lineTo(points[j].x, points[j].y);
      }
      path.closePath();

      const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

      this.regions.push({
        id: i,
        path,
        points,
        color: null,
        colorIndex: -1,
        neighbors: [...regionDef.neighbors],
        cx,
        cy,
      });
    });

    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      const filledCount = this.regions.filter((r) => r.color !== null).length;
      this.onStateChange({
        level: this.currentLevel + 1,
        status: this.getStatus(),
        filledCount,
        totalRegions: this.regions.length,
        selectedColor: this.selectedColor,
        ...this.pendingEvents,
      });

      this.pendingEvents = {};
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" {
    if (!this.isPlaying) return "idle";

    const allFilled = this.regions.every((r) => r.color !== null);
    if (allFilled && this.isValidColoring()) {
      if (this.currentLevel >= LEVELS.length - 1) return "complete";
      return "won";
    }
    return "playing";
  }

  private isValidColoring(): boolean {
    for (const region of this.regions) {
      if (!region.color) return false;
      for (const neighborId of region.neighbors) {
        const neighbor = this.regions[neighborId];
        if (neighbor.color === region.color) return false;
      }
    }
    return true;
  }

  private checkRegionValid(region: Region): boolean {
    if (!region.color) return true;
    for (const neighborId of region.neighbors) {
      const neighbor = this.regions[neighborId];
      if (neighbor.color && neighbor.color === region.color) return false;
    }
    return true;
  }

  start() {
    this.isPlaying = true;
    this.initLevel();
    this.draw();
  }

  reset() {
    this.regions.forEach((r) => {
      r.color = null;
      r.colorIndex = -1;
    });
    this.pendingEvents.reset = true;
    this.emitState();
    this.draw();
  }

  restart() {
    this.currentLevel = 0;
    this.isPlaying = false;
    this.regions = [];
    this.draw();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
      this.draw();
    }
  }

  handleClick(x: number, y: number) {
    if (!this.isPlaying) return;

    for (const region of this.regions) {
      if (this.ctx.isPointInPath(region.path, x * this.scale, y * this.scale)) {
        region.color = this.selectedColor;
        region.colorIndex = this.selectedColorIndex;

        // Emit fill event
        this.pendingEvents.regionFill = {
          x: region.cx,
          y: region.cy,
          colorIndex: this.selectedColorIndex,
        };

        // Check if this is a valid placement
        if (this.checkRegionValid(region)) {
          this.pendingEvents.validColoring = {
            x: region.cx,
            y: region.cy,
          };
        } else {
          this.pendingEvents.invalidColoring = true;
        }

        this.draw();
        this.emitState();
        break;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#2d1f3d");
    gradient.addColorStop(1, "#1a1428");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isPlaying) {
      ctx.fillStyle = "#9b59b6";
      ctx.font = "bold 24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Stained Glass", this.width / 2, this.height / 2);
      return;
    }

    this.drawRegions();
  }

  private drawRegions() {
    const ctx = this.ctx;

    for (const region of this.regions) {
      if (region.color) {
        // Glass effect with color
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = region.color;
        ctx.fill(region.path);
        ctx.globalAlpha = 1;

        // Glass highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fill(region.path);
        ctx.restore();
      } else {
        // Empty region - frosted glass
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill(region.path);
      }

      // Lead frame - outer
      ctx.strokeStyle = "#1a1428";
      ctx.lineWidth = 4;
      ctx.stroke(region.path);

      // Lead frame - inner highlight
      ctx.strokeStyle = "#3d2a4d";
      ctx.lineWidth = 1.5;
      ctx.stroke(region.path);
    }

    // Window frame
    ctx.strokeStyle = "#1a1428";
    ctx.lineWidth = 10;
    ctx.strokeRect(
      (this.width - 300) / 2 - 5,
      15,
      310,
      this.height - 95
    );

    // Frame highlight
    ctx.strokeStyle = "#3d2a4d";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (this.width - 300) / 2 - 5,
      15,
      310,
      this.height - 95
    );

    this.drawDecorations();
  }

  private drawDecorations() {
    const ctx = this.ctx;
    const offsetX = (this.width - 300) / 2;

    // Decorative rosette at bottom
    ctx.beginPath();
    ctx.arc(offsetX + 150, this.height - 55, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fill();

    // Rosette inner circle
    ctx.beginPath();
    ctx.arc(offsetX + 150, this.height - 55, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(155, 89, 182, 0.3)";
    ctx.fill();

    // Lead frame for rosette
    ctx.strokeStyle = "#3d2a4d";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
