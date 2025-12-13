/**
 * Volcano Puzzle Game Engine
 * Game #146
 *
 * Guide heat energy through connected pipes to the volcano core!
 */

// Pipe types: each bit represents an opening (top, right, bottom, left)
// 0b1111 = all directions, 0b0101 = top-bottom, etc.
type PipeType = "straight" | "corner" | "tee" | "cross" | "end" | "empty";

interface Tile {
  type: PipeType;
  rotation: number; // 0, 90, 180, 270
  heated: boolean;
  isSource: boolean;
  isTarget: boolean;
}

interface Level {
  grid: string[][];
  sourcePos: [number, number];
  targetPos: [number, number];
}

interface GameState {
  level: number;
  maxLevel: number;
  heatPercent: number;
  status: "idle" | "playing" | "won";
}

type StateCallback = (state: GameState) => void;

// Direction vectors: top, right, bottom, left
const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

// Pipe connections for each type at rotation 0
const PIPE_CONNECTIONS: Record<PipeType, boolean[]> = {
  straight: [true, false, true, false], // top-bottom
  corner: [true, true, false, false], // top-right
  tee: [true, true, false, true], // top-right-left
  cross: [true, true, true, true], // all
  end: [true, false, false, false], // top only
  empty: [false, false, false, false],
};

const LEVELS: Level[] = [
  // Level 1: Simple straight connection
  {
    grid: [
      ["S", "s", "s", "T"],
    ],
    sourcePos: [0, 0],
    targetPos: [3, 0],
  },
  // Level 2: Need rotation
  {
    grid: [
      ["S", "c", "e"],
      ["e", "s", "e"],
      ["e", "c", "T"],
    ],
    sourcePos: [0, 0],
    targetPos: [2, 2],
  },
  // Level 3: More complex
  {
    grid: [
      ["S", "t", "c", "e"],
      ["e", "s", "e", "e"],
      ["e", "c", "s", "e"],
      ["e", "e", "c", "T"],
    ],
    sourcePos: [0, 0],
    targetPos: [3, 3],
  },
  // Level 4: Larger grid
  {
    grid: [
      ["S", "c", "s", "c", "e"],
      ["e", "e", "e", "s", "e"],
      ["e", "t", "c", "c", "e"],
      ["e", "s", "e", "e", "e"],
      ["e", "c", "s", "s", "T"],
    ],
    sourcePos: [0, 0],
    targetPos: [4, 4],
  },
  // Level 5: Complex maze
  {
    grid: [
      ["S", "t", "c", "e", "e"],
      ["e", "s", "e", "c", "e"],
      ["c", "x", "t", "s", "e"],
      ["e", "s", "e", "c", "e"],
      ["e", "c", "s", "t", "T"],
    ],
    sourcePos: [0, 0],
    targetPos: [4, 4],
  },
];

function charToType(char: string): PipeType {
  switch (char) {
    case "s":
    case "S":
      return "straight";
    case "c":
      return "corner";
    case "t":
      return "tee";
    case "x":
      return "cross";
    case "e":
      return "end";
    case "T":
      return "end";
    default:
      return "empty";
  }
}

export class VolcanoPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tiles: Tile[][] = [];
  private gridWidth = 0;
  private gridHeight = 0;
  private tileSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private level = 1;
  private status: "idle" | "playing" | "won" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private heatProgress = 0;
  private heatedTiles: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      const totalTiles = this.gridWidth * this.gridHeight;
      const heatedCount = this.heatedTiles.size;
      this.onStateChange({
        level: this.level,
        maxLevel: LEVELS.length,
        heatPercent: Math.round((heatedCount / totalTiles) * 100),
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.calculateLayout();
    this.draw();
  }

  private calculateLayout() {
    if (this.gridWidth === 0 || this.gridHeight === 0) return;

    const maxTileW = (this.canvas.width - 40) / this.gridWidth;
    const maxTileH = (this.canvas.height - 40) / this.gridHeight;
    this.tileSize = Math.min(maxTileW, maxTileH, 80);

    this.offsetX = (this.canvas.width - this.tileSize * this.gridWidth) / 2;
    this.offsetY = (this.canvas.height - this.tileSize * this.gridHeight) / 2;
  }

  start() {
    this.level = 1;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  reset() {
    this.loadLevel();
    this.status = "playing";
    this.emitState();
  }

  nextLevel() {
    if (this.level < LEVELS.length) {
      this.level++;
      this.loadLevel();
      this.status = "playing";
      this.emitState();
    }
  }

  private loadLevel() {
    const levelData = LEVELS[this.level - 1];
    this.gridHeight = levelData.grid.length;
    this.gridWidth = levelData.grid[0].length;

    this.tiles = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        const char = levelData.grid[y][x];
        const isSource = char === "S";
        const isTarget = char === "T";
        row.push({
          type: charToType(char),
          rotation: Math.floor(Math.random() * 4) * 90,
          heated: false,
          isSource,
          isTarget,
        });
      }
      this.tiles.push(row);
    }

    // Set source tile to correct rotation
    const [sx, sy] = levelData.sourcePos;
    this.tiles[sy][sx].rotation = 180; // Point down initially
    this.tiles[sy][sx].heated = true;

    this.heatedTiles.clear();
    this.heatProgress = 0;
    this.calculateLayout();
    this.propagateHeat();
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked tile
    const tileX = Math.floor((x - this.offsetX) / this.tileSize);
    const tileY = Math.floor((y - this.offsetY) / this.tileSize);

    if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) {
      return;
    }

    const tile = this.tiles[tileY][tileX];
    if (tile.isSource) return; // Can't rotate source

    // Rotate tile
    tile.rotation = (tile.rotation + 90) % 360;

    // Recalculate heat propagation
    this.propagateHeat();
    this.emitState();

    // Check win
    this.checkWin();
  }

  private getConnections(tile: Tile): boolean[] {
    const base = PIPE_CONNECTIONS[tile.type];
    const rotations = tile.rotation / 90;

    // Rotate connections array
    const result = [...base];
    for (let i = 0; i < rotations; i++) {
      const last = result.pop()!;
      result.unshift(last);
    }
    return result;
  }

  private propagateHeat() {
    // Reset heat
    for (const row of this.tiles) {
      for (const tile of row) {
        tile.heated = tile.isSource;
      }
    }
    this.heatedTiles.clear();

    // BFS from source
    const levelData = LEVELS[this.level - 1];
    const [sx, sy] = levelData.sourcePos;
    const queue: [number, number][] = [[sx, sy]];
    const visited = new Set<string>();
    visited.add(`${sx},${sy}`);
    this.heatedTiles.add(`${sx},${sy}`);

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const tile = this.tiles[y][x];
      const connections = this.getConnections(tile);

      for (let dir = 0; dir < 4; dir++) {
        if (!connections[dir]) continue;

        const nx = x + DIRS[dir][0];
        const ny = y + DIRS[dir][1];

        if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) {
          continue;
        }

        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;

        const neighbor = this.tiles[ny][nx];
        const neighborConnections = this.getConnections(neighbor);
        const oppositeDir = (dir + 2) % 4;

        if (neighborConnections[oppositeDir]) {
          visited.add(key);
          this.heatedTiles.add(key);
          neighbor.heated = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  private checkWin() {
    const levelData = LEVELS[this.level - 1];
    const [tx, ty] = levelData.targetPos;
    if (this.tiles[ty][tx].heated) {
      this.status = "won";
      this.emitState();
    }
  }

  private gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Animate heat glow
    this.heatProgress += 0.02;
    if (this.heatProgress > Math.PI * 2) {
      this.heatProgress = 0;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - volcanic rock
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#2d3436");
    bgGrad.addColorStop(1, "#636e72");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw tiles
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.drawTile(x, y);
      }
    }
  }

  private drawTile(x: number, y: number) {
    const ctx = this.ctx;
    const tile = this.tiles[y][x];
    const px = this.offsetX + x * this.tileSize;
    const py = this.offsetY + y * this.tileSize;
    const size = this.tileSize;
    const padding = 2;

    ctx.save();
    ctx.translate(px + size / 2, py + size / 2);
    ctx.rotate((tile.rotation * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);

    // Tile background
    ctx.fillStyle = tile.heated ? "#ff7675" : "#636e72";
    ctx.fillRect(padding, padding, size - padding * 2, size - padding * 2);

    // Heat glow effect
    if (tile.heated) {
      const glow = Math.sin(this.heatProgress) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 118, 117, ${glow * 0.5})`;
      ctx.fillRect(padding, padding, size - padding * 2, size - padding * 2);
    }

    // Draw pipe
    const pipeWidth = size * 0.3;
    const center = size / 2;
    const connections = PIPE_CONNECTIONS[tile.type];

    ctx.fillStyle = tile.heated ? "#fdcb6e" : "#b2bec3";
    ctx.strokeStyle = tile.heated ? "#e17055" : "#2d3436";
    ctx.lineWidth = 2;

    // Draw connections
    if (connections[0]) {
      // Top
      ctx.fillRect(center - pipeWidth / 2, 0, pipeWidth, center);
    }
    if (connections[1]) {
      // Right
      ctx.fillRect(center, center - pipeWidth / 2, center, pipeWidth);
    }
    if (connections[2]) {
      // Bottom
      ctx.fillRect(center - pipeWidth / 2, center, pipeWidth, center);
    }
    if (connections[3]) {
      // Left
      ctx.fillRect(0, center - pipeWidth / 2, center, pipeWidth);
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, pipeWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Source/Target markers
    if (tile.isSource) {
      ctx.fillStyle = "#e17055";
      ctx.beginPath();
      ctx.arc(center, center, pipeWidth / 3, 0, Math.PI * 2);
      ctx.fill();

      // Fire icon
      ctx.fillStyle = "#fdcb6e";
      ctx.font = `${size * 0.3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    }

    if (tile.isTarget) {
      ctx.fillStyle = tile.heated ? "#00b894" : "#d63031";
      ctx.beginPath();
      ctx.arc(center, center, pipeWidth / 3, 0, Math.PI * 2);
      ctx.fill();

      // Volcano icon
      ctx.fillStyle = tile.heated ? "#00b894" : "#fdcb6e";
      ctx.font = `${size * 0.25}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    }

    ctx.restore();

    // Tile border
    ctx.strokeStyle = tile.heated ? "#e17055" : "#2d3436";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
