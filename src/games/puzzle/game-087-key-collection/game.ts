/**
 * Key Collection Game Engine
 * Game #087 - Collect all keys to open the door
 */

export type CellType = "empty" | "wall" | "player" | "key" | "door" | "doorOpen";

export interface Level {
  map: string[];
  keys: number;
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

  private onStateChange: ((state: any) => void) | null = null;

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

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.moves = 0;
    this.keysCollected = 0;
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.draw();
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
      } else {
        return; // Can't pass through locked door
      }
    }

    // Move player
    this.playerPos = { x: newX, y: newY };
    this.moves++;

    // Collect key
    if (targetCell === "key") {
      this.keysCollected++;
      this.grid[newY][newX] = "empty";
    }

    // Check win (on open door)
    if (targetCell === "doorOpen" || this.grid[newY][newX] === "doorOpen") {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          moves: this.moves,
          level: this.currentLevel,
        });
      }
    }

    if (this.onStateChange) {
      this.onStateChange({
        moves: this.moves,
        keys: `${this.keysCollected}/${this.totalKeys}`,
      });
    }

    this.draw();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.cellSize = Math.min(w, h) / this.gridSize;

    // Clear
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, w, h);

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
        break;

      case "empty":
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        break;

      case "key":
        // Floor
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Key
        this.drawKey(ctx, px + size / 2, py + size / 2, size * 0.35);
        break;

      case "door":
        // Locked door
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Lock
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.arc(px + size / 2, py + size / 2, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f0f1a";
        ctx.fillRect(px + size / 2 - size * 0.05, py + size / 2, size * 0.1, size * 0.2);
        break;

      case "doorOpen":
        // Open door (green)
        ctx.fillStyle = "#27ae60";
        ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
        // Open symbol
        ctx.fillStyle = "white";
        ctx.font = `${size * 0.4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✓", px + size / 2, py + size / 2);
        break;
    }
  }

  private drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);

    // Key head (circle)
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(-size * 0.3, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Key hole
    ctx.fillStyle = "#0f0f1a";
    ctx.beginPath();
    ctx.arc(-size * 0.3, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Key shaft
    ctx.fillStyle = "#f1c40f";
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
    ctx.shadowBlur = 15;

    // Player body
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, "#5dade2");
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
