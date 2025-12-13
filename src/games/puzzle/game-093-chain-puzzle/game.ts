/**
 * Chain Puzzle Game Engine
 * Game #093 - Unlink all the chains by rotating links
 */

export interface ChainLink {
  id: number;
  x: number;
  y: number;
  rotation: number; // 0 = horizontal, 90 = vertical
  color: string;
  locked: boolean;
}

export interface LevelConfig {
  links: { x: number; y: number; rotation: number; color: string }[];
  connections: [number, number][]; // Pairs of link IDs that are connected
}

export class ChainPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private links: ChainLink[] = [];
  private connections: [number, number][] = [];
  private moves = 0;

  private currentLevel = 0;
  private status: "playing" | "won" = "playing";
  private animationId = 0;

  private linkWidth = 60;
  private linkHeight = 30;

  private onStateChange: ((state: any) => void) | null = null;

  private colors = ["#74b9ff", "#fd79a8", "#55efc4", "#ffeaa7", "#a29bfe"];

  private levels: LevelConfig[] = [
    // Level 1 - Simple 2 chain
    {
      links: [
        { x: 0.35, y: 0.5, rotation: 0, color: "#74b9ff" },
        { x: 0.65, y: 0.5, rotation: 90, color: "#fd79a8" },
      ],
      connections: [[0, 1]],
    },
    // Level 2 - 3 chain
    {
      links: [
        { x: 0.25, y: 0.5, rotation: 0, color: "#74b9ff" },
        { x: 0.5, y: 0.5, rotation: 90, color: "#fd79a8" },
        { x: 0.75, y: 0.5, rotation: 0, color: "#55efc4" },
      ],
      connections: [
        [0, 1],
        [1, 2],
      ],
    },
    // Level 3 - Cross pattern
    {
      links: [
        { x: 0.5, y: 0.3, rotation: 90, color: "#74b9ff" },
        { x: 0.5, y: 0.5, rotation: 0, color: "#fd79a8" },
        { x: 0.5, y: 0.7, rotation: 90, color: "#55efc4" },
        { x: 0.3, y: 0.5, rotation: 0, color: "#ffeaa7" },
        { x: 0.7, y: 0.5, rotation: 0, color: "#a29bfe" },
      ],
      connections: [
        [0, 1],
        [1, 2],
        [1, 3],
        [1, 4],
      ],
    },
    // Level 4 - Circle
    {
      links: [
        { x: 0.5, y: 0.25, rotation: 0, color: "#74b9ff" },
        { x: 0.75, y: 0.4, rotation: 90, color: "#fd79a8" },
        { x: 0.75, y: 0.6, rotation: 0, color: "#55efc4" },
        { x: 0.5, y: 0.75, rotation: 90, color: "#ffeaa7" },
        { x: 0.25, y: 0.6, rotation: 0, color: "#a29bfe" },
        { x: 0.25, y: 0.4, rotation: 90, color: "#74b9ff" },
      ],
      connections: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 0],
      ],
    },
    // Level 5 - Complex
    {
      links: [
        { x: 0.3, y: 0.3, rotation: 0, color: "#74b9ff" },
        { x: 0.5, y: 0.3, rotation: 90, color: "#fd79a8" },
        { x: 0.7, y: 0.3, rotation: 0, color: "#55efc4" },
        { x: 0.3, y: 0.5, rotation: 90, color: "#ffeaa7" },
        { x: 0.5, y: 0.5, rotation: 0, color: "#a29bfe" },
        { x: 0.7, y: 0.5, rotation: 90, color: "#74b9ff" },
        { x: 0.3, y: 0.7, rotation: 0, color: "#fd79a8" },
        { x: 0.5, y: 0.7, rotation: 90, color: "#55efc4" },
        { x: 0.7, y: 0.7, rotation: 0, color: "#ffeaa7" },
      ],
      connections: [
        [0, 1],
        [1, 2],
        [0, 3],
        [1, 4],
        [2, 5],
        [3, 4],
        [4, 5],
        [3, 6],
        [4, 7],
        [5, 8],
        [6, 7],
        [7, 8],
      ],
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.moves = 0;
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.links = config.links.map((l, i) => ({
      id: i,
      x: l.x * w,
      y: l.y * h,
      rotation: l.rotation,
      color: l.color,
      locked: false,
    }));

    this.connections = [...config.connections];
    this.updateLockState();
  }

  public stop() {
    cancelAnimationFrame(this.animationId);
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked link
    for (const link of this.links) {
      if (this.isPointInLink(x, y, link)) {
        // Rotate the link
        link.rotation = (link.rotation + 90) % 180;
        this.moves++;

        this.updateLockState();

        if (this.onStateChange) {
          this.onStateChange({ moves: this.moves });
        }

        // Check win condition
        if (this.checkWin()) {
          this.status = "won";
          if (this.onStateChange) {
            this.onStateChange({
              status: "won",
              moves: this.moves,
              level: this.currentLevel,
            });
          }
        }
        break;
      }
    }
  }

  private isPointInLink(px: number, py: number, link: ChainLink): boolean {
    // Simple bounding box check (accounting for rotation)
    const size = Math.max(this.linkWidth, this.linkHeight);
    return (
      px >= link.x - size / 2 &&
      px <= link.x + size / 2 &&
      py >= link.y - size / 2 &&
      py <= link.y + size / 2
    );
  }

  private updateLockState() {
    // A connection is locked if both links are perpendicular (one horizontal, one vertical)
    this.links.forEach((link) => (link.locked = false));

    this.connections.forEach(([id1, id2]) => {
      const link1 = this.links[id1];
      const link2 = this.links[id2];

      // Links are locked if they have different rotations (perpendicular)
      if (link1.rotation !== link2.rotation) {
        link1.locked = true;
        link2.locked = true;
      }
    });
  }

  private checkWin(): boolean {
    // Win if no links are locked (all connections can be unlinked)
    return this.links.every((link) => !link.locked);
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, w, h);

    // Draw connections first (behind links)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    this.connections.forEach(([id1, id2]) => {
      const link1 = this.links[id1];
      const link2 = this.links[id2];
      ctx.beginPath();
      ctx.moveTo(link1.x, link1.y);
      ctx.lineTo(link2.x, link2.y);
      ctx.stroke();
    });

    // Draw links
    this.links.forEach((link) => {
      this.drawLink(link);
    });
  }

  private drawLink(link: ChainLink) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(link.x, link.y);
    ctx.rotate((link.rotation * Math.PI) / 180);

    // Draw chain link shape (rounded rectangle with hole)
    const w = this.linkWidth;
    const h = this.linkHeight;
    const holeW = w * 0.5;
    const holeH = h * 0.4;

    // Outer shape with gradient
    const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gradient.addColorStop(0, link.color);
    gradient.addColorStop(1, this.darkenColor(link.color, 30));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h / 3, h / 4);
    ctx.fill();

    // Inner hole
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.roundRect(-holeW / 2, -holeH / 2, holeW, holeH, holeH / 2);
    ctx.fill();

    // Lock indicator
    if (link.locked) {
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, h / 2 + 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.canvas.width = size;
      this.canvas.height = size;
      this.linkWidth = size / 8;
      this.linkHeight = size / 16;
    }
  }

  public reset() {
    this.stop();
    this.start(this.currentLevel);
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

  public getMoves(): number {
    return this.moves;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
