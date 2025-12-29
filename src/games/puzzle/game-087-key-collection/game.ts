/**
 * Key Collection Game Engine
 * Game #087 - Collect all keys to open the door
 * WebGPU Enhanced with Event Emissions
 */

export type CellType = "empty" | "wall" | "player" | "key" | "door" | "doorOpen";

export interface Level {
  map: string[];
  keys: number;
}

export interface GameState {
  event?: "move" | "keyCollect" | "doorUnlock" | "doorBlocked" | "victory" | "levelStart" | "reset";
  x?: number;
  y?: number;
  colorIndex?: number;
  moves?: number;
  keys?: string;
  status?: "playing" | "won";
  level?: number;
}

export class KeyCollectionGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private grid: CellType[][] = [];
  private gridSize = 10;
  private cellSize = 0;

  private playerPos = { x: 0, y: 0 };
  private keysCollected = 0;
  private totalKeys = 0;
  private moves = 0;

  private currentLevel = 0;
  private status: "playing" | "won" = "playing";

  private onStateChange: ((state: GameState) => void) | null = null;

  private levels: Level[] = [
    // Level 1 - Simple introduction
    {
      map: [
        "##########",
        "#P.......#",
        "#........#",
        "#...K....#",
        "#........#",
        "#....K...#",
        "#........#",
        "#.....K..#",
        "#.......D#",
        "##########",
      ],
      keys: 3,
    },
    // Level 2 - More walls
    {
      map: [
        "##########",
        "#P...#...#",
        "#....#.K.#",
        "#....#...#",
        "###..#####",
        "#........#",
        "#.K......#",
        "#....###.#",
        "#..K...D.#",
        "##########",
      ],
      keys: 3,
    },
    // Level 3 - Maze-like
    {
      map: [
        "##########",
        "#P.#..K..#",
        "#..#..#..#",
        "#..#..#..#",
        "#.....#..#",
        "####..#..#",
        "#K....#..#",
        "#..####..#",
        "#..K....D#",
        "##########",
      ],
      keys: 3,
    },
    // Level 4 - Complex maze
    {
      map: [
        "##########",
        "#P..#....#",
        "#.#.#.##.#",
        "#.#K#..#.#",
        "#.#.##.#.#",
        "#.#....#K#",
        "#.######.#",
        "#....K...#",
        "#.######D#",
        "##########",
      ],
      keys: 3,
    },
    // Level 5 - Final challenge
    {
      map: [
        "##########",
        "#P.#K#..K#",
        "#..#.#.#.#",
        "#....#.#.#",
        "####.#.#.#",
        "#....#.#.#",
        "#.####.#.#",
        "#K.....#.#",
        "#.######D#",
        "##########",
      ],
      keys: 3,
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  private emitState(state: GameState) {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  private getScreenPos(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.cellSize + this.cellSize / 2,
      y: gridY * this.cellSize + this.cellSize / 2,
    };
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.moves = 0;
    this.keysCollected = 0;
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.draw();

    const pos = this.getScreenPos(this.playerPos.x, this.playerPos.y);
    this.emitState({
      event: "levelStart",
      x: pos.x,
      y: pos.y,
      colorIndex: 0,
    });
  }

  private loadLevel(levelIndex: number) {
    const level = this.levels[levelIndex % this.levels.length];
    this.totalKeys = level.keys;
    this.gridSize = level.map.length;

    this.grid = [];
    for (let y = 0; y < level.map.length; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < level.map[y].length; x++) {
        const char = level.map[y][x];
        switch (char) {
          case "#":
            row.push("wall");
            break;
          case "P":
            row.push("empty");
            this.playerPos = { x, y };
            break;
          case "K":
            row.push("key");
            break;
          case "D":
            row.push("door");
            break;
          default:
            row.push("empty");
        }
      }
      this.grid.push(row);
    }
  }

  public move(dx: number, dy: number) {
    if (this.status !== "playing") return;

    const newX = this.playerPos.x + dx;
    const newY = this.playerPos.y + dy;

    // Check bounds
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      return;
    }

    const targetCell = this.grid[newY][newX];

    // Check wall
    if (targetCell === "wall") return;

    // Check door
    if (targetCell === "door") {
      if (this.keysCollected >= this.totalKeys) {
        this.grid[newY][newX] = "doorOpen";
        const pos = this.getScreenPos(newX, newY);
        this.emitState({
          event: "doorUnlock",
          x: pos.x,
          y: pos.y,
          colorIndex: 0,
        });
      } else {
        // Door blocked
        const pos = this.getScreenPos(newX, newY);
        this.emitState({
          event: "doorBlocked",
          x: pos.x,
          y: pos.y,
          colorIndex: 3,
        });
        return; // Can't pass through locked door
      }
    }

    // Move player
    this.playerPos = { x: newX, y: newY };
    this.moves++;

    const pos = this.getScreenPos(newX, newY);

    // Collect key
    if (targetCell === "key") {
      this.keysCollected++;
      this.grid[newY][newX] = "empty";
      this.emitState({
        event: "keyCollect",
        x: pos.x,
        y: pos.y,
        colorIndex: 0, // Gold
      });
    } else if (targetCell !== "door") {
      // Normal move
      this.emitState({
        event: "move",
        x: pos.x,
        y: pos.y,
        colorIndex: 5,
      });
    }

    // Check win (on open door)
    if (targetCell === "doorOpen" || this.grid[newY][newX] === "doorOpen") {
      this.status = "won";
      this.emitState({
        event: "victory",
        x: pos.x,
        y: pos.y,
        colorIndex: 0,
      });
      this.emitState({
        status: "won",
        moves: this.moves,
        level: this.currentLevel,
      });
    }

    this.emitState({
      moves: this.moves,
      keys: `${this.keysCollected}/${this.totalKeys}`,
    });

    this.draw();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.cellSize = Math.min(w, h) / this.gridSize;

    // Clear with transparency for WebGPU background
    ctx.clearRect(0, 0, w, h);

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        this.drawCell(ctx, cell, px, py);
      }
    }

    // Draw player
    this.drawPlayer(ctx);
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    cell: CellType,
    px: number,
    py: number
  ) {
    const size = this.cellSize;
    const padding = 2;

    switch (cell) {
      case "wall":
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Brick pattern
        ctx.strokeStyle = "#1a252f";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Stone texture
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(px + size * 0.3, py + padding, 1, size - padding * 2);
        ctx.fillRect(px + size * 0.6, py + padding, 1, size - padding * 2);
        break;

      case "empty":
        // Transparent floor to show WebGPU background
        ctx.fillStyle = "rgba(26, 26, 46, 0.6)";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        break;

      case "key":
        // Transparent floor
        ctx.fillStyle = "rgba(26, 26, 46, 0.6)";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Key with glow
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 15;
        this.drawKey(ctx, px + size / 2, py + size / 2, size * 0.35);
        ctx.shadowBlur = 0;
        break;

      case "door":
        // Locked door
        const doorGradient = ctx.createLinearGradient(px, py, px + size, py + size);
        doorGradient.addColorStop(0, "#8b4513");
        doorGradient.addColorStop(0.5, "#a0522d");
        doorGradient.addColorStop(1, "#654321");
        ctx.fillStyle = doorGradient;
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Door frame
        ctx.strokeStyle = "#5d3a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + padding + 2, py + padding + 2, size - padding * 2 - 4, size - padding * 2 - 4);
        // Lock with glow
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#0f0f1a";
        ctx.fillRect(px + size / 2 - size * 0.05, py + size / 2, size * 0.1, size * 0.2);
        break;

      case "doorOpen":
        // Open door (green)
        const openGradient = ctx.createLinearGradient(px, py, px + size, py + size);
        openGradient.addColorStop(0, "#27ae60");
        openGradient.addColorStop(1, "#1e8449");
        ctx.fillStyle = openGradient;
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Open symbol with glow
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "white";
        ctx.font = `${size * 0.4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✓", px + size / 2, py + size / 2);
        ctx.shadowBlur = 0;
        break;
    }
  }

  private drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);

    // Key gradient
    const keyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    keyGradient.addColorStop(0, "#ffd700");
    keyGradient.addColorStop(0.5, "#f1c40f");
    keyGradient.addColorStop(1, "#d4a50a");

    // Key head (circle)
    ctx.fillStyle = keyGradient;
    ctx.beginPath();
    ctx.arc(-size * 0.3, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Key hole
    ctx.fillStyle = "#0f0f1a";
    ctx.beginPath();
    ctx.arc(-size * 0.3, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Key shaft
    ctx.fillStyle = keyGradient;
    ctx.fillRect(-size * 0.1, -size * 0.1, size * 0.8, size * 0.2);

    // Key teeth
    ctx.fillRect(size * 0.4, 0, size * 0.15, size * 0.3);
    ctx.fillRect(size * 0.55, 0, size * 0.15, size * 0.2);

    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const x = this.playerPos.x * this.cellSize + this.cellSize / 2;
    const y = this.playerPos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;

    // Glow effect
    ctx.shadowColor = "#3498db";
    ctx.shadowBlur = 20;

    // Player body gradient
    const gradient = ctx.createRadialGradient(x, y - size * 0.2, 0, x, y, size);
    gradient.addColorStop(0, "#7ecbf5");
    gradient.addColorStop(0.5, "#5dade2");
    gradient.addColorStop(1, "#2980b9");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#0f0f1a";
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.35, y - size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.canvas.width = size;
      this.canvas.height = size;
      this.draw();
    }
  }

  public reset() {
    this.emitState({
      event: "reset",
    });
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

  public getKeysStatus(): string {
    return `${this.keysCollected}/${this.totalKeys}`;
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }
}
