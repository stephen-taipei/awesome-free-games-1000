/**
 * Plant Growth Game
 * Game #067 - Guide plant growth to reach the flower
 */

export type TileType = "empty" | "soil" | "rock" | "water" | "sun" | "seed" | "flower" | "vine";

export interface Tile {
  type: TileType;
  hasVine: boolean;
  vineDirection: string; // "up", "down", "left", "right", ""
  growthProgress: number; // 0-1
}

export interface Level {
  id: number;
  grid: TileType[][];
  seedPos: { x: number; y: number };
  flowerPos: { x: number; y: number };
}

const LEVELS: Level[] = [
  // Level 1: Simple path
  {
    id: 1,
    grid: [
      ["empty", "empty", "empty", "empty", "flower"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["seed", "empty", "empty", "empty", "empty"],
    ],
    seedPos: { x: 0, y: 4 },
    flowerPos: { x: 4, y: 0 },
  },
  // Level 2: With obstacles
  {
    id: 2,
    grid: [
      ["empty", "empty", "empty", "flower", "empty"],
      ["empty", "rock", "empty", "empty", "empty"],
      ["empty", "rock", "rock", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["seed", "empty", "empty", "empty", "empty"],
    ],
    seedPos: { x: 0, y: 4 },
    flowerPos: { x: 3, y: 0 },
  },
  // Level 3: Water boost
  {
    id: 3,
    grid: [
      ["empty", "empty", "rock", "empty", "flower"],
      ["empty", "water", "rock", "empty", "empty"],
      ["empty", "empty", "rock", "water", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["seed", "empty", "empty", "empty", "empty"],
    ],
    seedPos: { x: 0, y: 4 },
    flowerPos: { x: 4, y: 0 },
  },
  // Level 4: Sun boost
  {
    id: 4,
    grid: [
      ["empty", "rock", "rock", "empty", "flower"],
      ["empty", "rock", "sun", "empty", "empty"],
      ["empty", "empty", "empty", "rock", "empty"],
      ["sun", "empty", "rock", "empty", "empty"],
      ["seed", "empty", "empty", "empty", "empty"],
    ],
    seedPos: { x: 0, y: 4 },
    flowerPos: { x: 4, y: 0 },
  },
  // Level 5: Complex maze
  {
    id: 5,
    grid: [
      ["empty", "rock", "empty", "empty", "flower"],
      ["water", "rock", "empty", "rock", "empty"],
      ["empty", "empty", "sun", "rock", "empty"],
      ["rock", "rock", "empty", "empty", "water"],
      ["seed", "empty", "empty", "rock", "empty"],
    ],
    seedPos: { x: 0, y: 4 },
    flowerPos: { x: 4, y: 0 },
  },
];

export class PlantGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  grid: Tile[][] = [];
  gridSize: number = 5;
  tileSize: number = 70;

  vinePath: { x: number; y: number }[] = [];
  growthSpeed: number = 0.05;
  currentGrowingIndex: number = 0;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  colors = {
    empty: "#8fbc8f",
    soil: "#8b4513",
    rock: "#696969",
    water: "#4169e1",
    sun: "#ffd700",
    seed: "#228b22",
    flower: "#ff69b4",
    vine: "#228b22",
    bg: "#f0fff0",
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({ status: "complete", level: levelIndex + 1 });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.grid.length;
    this.grid = [];

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = {
          type: level.grid[y][x],
          hasVine: false,
          vineDirection: "",
          growthProgress: 0,
        };
      }
    }

    // Mark seed as having vine
    this.grid[level.seedPos.y][level.seedPos.x].hasVine = true;
    this.grid[level.seedPos.y][level.seedPos.x].growthProgress = 1;

    this.vinePath = [{ x: level.seedPos.x, y: level.seedPos.y }];
    this.currentGrowingIndex = 0;
    this.status = "playing";

    if (this.onStateChange) {
      this.onStateChange({ status: "playing", level: levelIndex + 1 });
    }
  }

  private loop = () => {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private update() {
    if (this.status !== "playing") return;

    // Animate vine growth
    for (let i = 0; i < this.vinePath.length; i++) {
      const pos = this.vinePath[i];
      const tile = this.grid[pos.y][pos.x];

      if (tile.growthProgress < 1) {
        let speed = this.growthSpeed;
        // Boost from water/sun
        if (tile.type === "water") speed *= 2;
        if (tile.type === "sun") speed *= 1.5;
        tile.growthProgress = Math.min(1, tile.growthProgress + speed);
      }
    }

    // Check win
    const level = LEVELS[this.currentLevel];
    const flowerTile = this.grid[level.flowerPos.y][level.flowerPos.x];
    if (flowerTile.hasVine && flowerTile.growthProgress >= 1) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won", level: this.currentLevel + 1 });
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const offsetX = (this.canvas.width - this.gridSize * this.tileSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.tileSize) / 2;

    // Clear
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiles
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const tile = this.grid[y][x];
        const px = offsetX + x * this.tileSize;
        const py = offsetY + y * this.tileSize;

        // Tile background
        ctx.fillStyle = this.getTileColor(tile.type);
        ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);

        // Draw tile content
        this.drawTileContent(tile, px, py);

        // Draw vine
        if (tile.hasVine) {
          this.drawVine(tile, px, py, x, y);
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * this.tileSize, offsetY);
      ctx.lineTo(offsetX + i * this.tileSize, offsetY + this.gridSize * this.tileSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * this.tileSize);
      ctx.lineTo(offsetX + this.gridSize * this.tileSize, offsetY + i * this.tileSize);
      ctx.stroke();
    }
  }

  private getTileColor(type: TileType): string {
    switch (type) {
      case "rock": return "#808080";
      case "water": return "#87ceeb";
      case "sun": return "#fffacd";
      default: return "#90ee90";
    }
  }

  private drawTileContent(tile: Tile, px: number, py: number) {
    const ctx = this.ctx;
    const cx = px + this.tileSize / 2;
    const cy = py + this.tileSize / 2;

    switch (tile.type) {
      case "rock":
        // Draw rock
        ctx.fillStyle = "#555";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 25, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#777";
        ctx.beginPath();
        ctx.ellipse(cx - 5, cy, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "water":
        // Draw water ripples
        ctx.strokeStyle = "rgba(65, 105, 225, 0.5)";
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, 8 * i, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Drop icon
        ctx.fillStyle = "#4169e1";
        ctx.beginPath();
        ctx.moveTo(cx, cy - 15);
        ctx.quadraticCurveTo(cx + 12, cy, cx, cy + 15);
        ctx.quadraticCurveTo(cx - 12, cy, cx, cy - 15);
        ctx.fill();
        break;

      case "sun":
        // Draw sun
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
        // Rays
        ctx.strokeStyle = "#ffa500";
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * 20, cy + Math.sin(angle) * 20);
          ctx.lineTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
          ctx.stroke();
        }
        break;

      case "seed":
        // Draw seed
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sprout
        ctx.strokeStyle = "#228b22";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 5);
        ctx.quadraticCurveTo(cx - 5, cy - 10, cx, cy - 15);
        ctx.stroke();
        // Leaf
        ctx.fillStyle = "#32cd32";
        ctx.beginPath();
        ctx.ellipse(cx + 8, cy - 10, 8, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "flower":
        // Draw flower
        const bloomed = tile.hasVine && tile.growthProgress >= 1;
        if (bloomed) {
          // Full bloom
          ctx.fillStyle = "#ff69b4";
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(
              cx + Math.cos(angle) * 12,
              cy + Math.sin(angle) * 12,
              10, 6, angle, 0, Math.PI * 2
            );
            ctx.fill();
          }
          ctx.fillStyle = "#ffff00";
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Bud
          ctx.fillStyle = "#90ee90";
          ctx.beginPath();
          ctx.ellipse(cx, cy, 10, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#228b22";
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy + 5);
          ctx.quadraticCurveTo(cx, cy - 5, cx + 8, cy + 5);
          ctx.fill();
        }
        break;
    }
  }

  private drawVine(tile: Tile, px: number, py: number, gx: number, gy: number) {
    const ctx = this.ctx;
    const cx = px + this.tileSize / 2;
    const cy = py + this.tileSize / 2;
    const progress = tile.growthProgress;

    if (tile.type === "seed" || tile.type === "flower") return;

    // Find position in vine path
    const pathIndex = this.vinePath.findIndex(p => p.x === gx && p.y === gy);
    if (pathIndex < 0) return;

    // Draw vine segment
    ctx.strokeStyle = "#228b22";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    // Connect from previous tile
    if (pathIndex > 0) {
      const prev = this.vinePath[pathIndex - 1];
      const dx = gx - prev.x;
      const dy = gy - prev.y;

      const startX = cx - dx * this.tileSize / 2;
      const startY = cy - dy * this.tileSize / 2;
      const endX = cx;
      const endY = cy;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + (endX - startX) * progress,
        startY + (endY - startY) * progress
      );
      ctx.stroke();
    }

    // Connect to next tile
    if (pathIndex < this.vinePath.length - 1 && progress >= 1) {
      const next = this.vinePath[pathIndex + 1];
      const dx = next.x - gx;
      const dy = next.y - gy;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx * this.tileSize / 2, cy + dy * this.tileSize / 2);
      ctx.stroke();
    }

    // Draw leaves
    if (progress > 0.5) {
      ctx.fillStyle = "#32cd32";
      const leafAngle = Math.sin(Date.now() / 500 + pathIndex) * 0.2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(leafAngle);
      ctx.beginPath();
      ctx.ellipse(10, 0, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public handleClick(canvasX: number, canvasY: number) {
    if (this.status !== "playing") return;

    const offsetX = (this.canvas.width - this.gridSize * this.tileSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.tileSize) / 2;

    const gx = Math.floor((canvasX - offsetX) / this.tileSize);
    const gy = Math.floor((canvasY - offsetY) / this.tileSize);

    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) return;

    const tile = this.grid[gy][gx];
    if (tile.type === "rock") return;
    if (tile.hasVine) return;

    // Check if adjacent to vine
    const lastVine = this.vinePath[this.vinePath.length - 1];
    const dx = Math.abs(gx - lastVine.x);
    const dy = Math.abs(gy - lastVine.y);

    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      // Extend vine
      tile.hasVine = true;
      tile.growthProgress = 0;
      this.vinePath.push({ x: gx, y: gy });
    }
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

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(450, rect.width);
      this.canvas.height = 450;
      this.tileSize = Math.min(70, (this.canvas.width - 40) / this.gridSize);
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
