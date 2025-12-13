/**
 * Penguin Push Game Logic
 * Game #181 - Ice Physics Puzzle
 */

type TileType = "empty" | "wall" | "ice" | "enemy" | "player";

interface Level {
  map: string[];
}

interface GameState {
  level: number;
  status: "idle" | "playing" | "won" | "complete";
  moves: number;
  enemiesLeft: number;
}

type StateChangeCallback = (state: GameState) => void;

const LEVELS: Level[] = [
  {
    map: [
      "########",
      "#P.....#",
      "#..I...#",
      "#......#",
      "#....E.#",
      "########",
    ],
  },
  {
    map: [
      "########",
      "#P...E.#",
      "#..#...#",
      "#..I...#",
      "#..#.E.#",
      "########",
    ],
  },
  {
    map: [
      "#########",
      "#P......#",
      "#.I..I..#",
      "#..##...#",
      "#E....E.#",
      "#########",
    ],
  },
  {
    map: [
      "##########",
      "#P.......#",
      "#..I.I...#",
      "#....#...#",
      "#.E..#.E.#",
      "#....#...#",
      "#..I.I...#",
      "#.....E..#",
      "##########",
    ],
  },
  {
    map: [
      "##########",
      "#P.....E.#",
      "#.I......#",
      "#...##...#",
      "#.I....I.#",
      "#...##...#",
      "#.E....E.#",
      "##########",
    ],
  },
  {
    map: [
      "###########",
      "#P........#",
      "#..I..I...#",
      "#.....#...#",
      "#..E..#.E.#",
      "#.....#...#",
      "#..I..I...#",
      "#.E.....E.#",
      "###########",
    ],
  },
];

const TILE_SIZE = 45;

export class PenguinPushGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private grid: TileType[][] = [];
  private playerX: number = 0;
  private playerY: number = 0;
  private moves: number = 0;
  private isPlaying: boolean = false;
  private isAnimating: boolean = false;

  private onStateChange: StateChangeCallback | null = null;

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
    this.draw();
  }

  private initLevel() {
    const level = LEVELS[this.currentLevel];
    this.grid = [];
    this.moves = 0;

    for (let y = 0; y < level.map.length; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < level.map[y].length; x++) {
        const char = level.map[y][x];
        switch (char) {
          case "#":
            row.push("wall");
            break;
          case "I":
            row.push("ice");
            break;
          case "E":
            row.push("enemy");
            break;
          case "P":
            row.push("player");
            this.playerX = x;
            this.playerY = y;
            break;
          default:
            row.push("empty");
        }
      }
      this.grid.push(row);
    }

    this.emitState();
  }

  private countEnemies(): number {
    let count = 0;
    for (const row of this.grid) {
      for (const tile of row) {
        if (tile === "enemy") count++;
      }
    }
    return count;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        status: this.getStatus(),
        moves: this.moves,
        enemiesLeft: this.countEnemies(),
      });
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" {
    if (!this.isPlaying) return "idle";
    if (this.countEnemies() === 0) {
      if (this.currentLevel >= LEVELS.length - 1) return "complete";
      return "won";
    }
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.initLevel();
    this.draw();
  }

  reset() {
    this.initLevel();
    this.draw();
  }

  restart() {
    this.currentLevel = 0;
    this.isPlaying = false;
    this.grid = [];
    this.draw();
    this.emitState();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
      this.draw();
    }
  }

  move(dx: number, dy: number) {
    if (!this.isPlaying || this.isAnimating) return;
    if (this.countEnemies() === 0) return;

    const newX = this.playerX + dx;
    const newY = this.playerY + dy;

    if (newY < 0 || newY >= this.grid.length) return;
    if (newX < 0 || newX >= this.grid[newY].length) return;

    const targetTile = this.grid[newY][newX];

    if (targetTile === "wall") return;

    if (targetTile === "ice") {
      // Push ice
      this.pushIce(newX, newY, dx, dy);
    }

    if (this.grid[newY][newX] === "empty" || this.grid[newY][newX] === "player") {
      // Move player
      this.grid[this.playerY][this.playerX] = "empty";
      this.playerX = newX;
      this.playerY = newY;
      this.grid[newY][newX] = "player";
      this.moves++;
    }

    this.draw();
    this.emitState();
  }

  private pushIce(iceX: number, iceY: number, dx: number, dy: number) {
    let x = iceX;
    let y = iceY;

    // Slide ice until it hits something
    while (true) {
      const nextX = x + dx;
      const nextY = y + dy;

      if (nextY < 0 || nextY >= this.grid.length) break;
      if (nextX < 0 || nextX >= this.grid[nextY].length) break;

      const nextTile = this.grid[nextY][nextX];

      if (nextTile === "wall" || nextTile === "ice") {
        break;
      }

      if (nextTile === "enemy") {
        // Eliminate enemy
        this.grid[y][x] = "empty";
        this.grid[nextY][nextX] = "empty";
        return;
      }

      // Continue sliding
      this.grid[y][x] = "empty";
      x = nextX;
      y = nextY;
      this.grid[y][x] = "ice";
    }
  }

  handleKey(key: string) {
    switch (key) {
      case "ArrowUp":
      case "w":
      case "W":
        this.move(0, -1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        this.move(0, 1);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        this.move(-1, 0);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.move(1, 0);
        break;
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.grid.length === 0) {
      ctx.fillStyle = "#00CED1";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Penguin Push", this.width / 2, this.height / 2);
      return;
    }

    const gridWidth = this.grid[0].length * TILE_SIZE;
    const gridHeight = this.grid.length * TILE_SIZE;
    const offsetX = (this.width - gridWidth) / 2;
    const offsetY = (this.height - gridHeight) / 2;

    // Draw tiles
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const tile = this.grid[y][x];
        const px = offsetX + x * TILE_SIZE;
        const py = offsetY + y * TILE_SIZE;

        // Floor
        ctx.fillStyle = "#4a6fa5";
        ctx.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);

        switch (tile) {
          case "wall":
            this.drawWall(px, py);
            break;
          case "ice":
            this.drawIce(px, py);
            break;
          case "enemy":
            this.drawEnemy(px, py);
            break;
          case "player":
            this.drawPenguin(px, py);
            break;
        }
      }
    }
  }

  private drawWall(x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(x, y, TILE_SIZE - 1, TILE_SIZE - 1);
    ctx.fillStyle = "#34495e";
    ctx.fillRect(x + 3, y + 3, TILE_SIZE - 7, TILE_SIZE - 7);
  }

  private drawIce(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;

    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(x + 5, y + 5, TILE_SIZE - 11, TILE_SIZE - 11);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(x + 8, y + 8, 10, 10);

    ctx.strokeStyle = "#ADD8E6";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, TILE_SIZE - 11, TILE_SIZE - 11);
  }

  private drawEnemy(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;

    // Body
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(cx, cy + 5, 15, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#D2691E";
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 10, 3, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 10, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 10, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 10, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPenguin(x: number, y: number) {
    const ctx = this.ctx;
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;

    // Body
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 12, 3, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 12, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 12, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 12, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#FFA500";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 4, cy - 5);
    ctx.lineTo(cx + 4, cy - 5);
    ctx.closePath();
    ctx.fill();
  }
}
