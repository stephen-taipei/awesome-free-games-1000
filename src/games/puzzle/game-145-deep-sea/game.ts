/**
 * Deep Sea Game Logic
 * Game #145 - Depth Pressure Puzzle
 */

interface Tile {
  type: "empty" | "wall" | "treasure" | "oxygen" | "exit" | "danger";
  collected: boolean;
}

interface Level {
  map: string[];
  maxOxygen: number;
  oxygenDrain: number;
}

interface GameState {
  level: number;
  status: "idle" | "playing" | "won" | "complete" | "gameOver";
  depth: number;
  oxygen: number;
  maxOxygen: number;
  treasuresCollected: number;
  totalTreasures: number;
}

type StateChangeCallback = (state: GameState) => void;

const LEVELS: Level[] = [
  {
    maxOxygen: 30,
    oxygenDrain: 1,
    map: [
      "SSSSSSS",
      "S.....S",
      "S.T...S",
      "S...T.S",
      "S..O..S",
      "S.T...S",
      "SSSEXSS",
    ],
  },
  {
    maxOxygen: 25,
    oxygenDrain: 1,
    map: [
      "SSSSSSSSS",
      "S...T...S",
      "S.#...#.S",
      "S.#.O.#.S",
      "S.T...T.S",
      "S.#...#.S",
      "S...T...S",
      "SSSSEXSSS",
    ],
  },
  {
    maxOxygen: 35,
    oxygenDrain: 1.5,
    map: [
      "SSSSSSSSS",
      "S.......S",
      "S.T.#.T.S",
      "S...#...S",
      "S##.O.##S",
      "S...#...S",
      "S.T.#.T.S",
      "S..###..S",
      "SSSSEXSSS",
    ],
  },
  {
    maxOxygen: 40,
    oxygenDrain: 1.5,
    map: [
      "SSSSSSSSSSS",
      "S.........S",
      "S.T.###.T.S",
      "S...#O#...S",
      "S.#.....#.S",
      "S.#.T.T.#.S",
      "S.#######.S",
      "S....T....S",
      "S.D.....D.S",
      "SSSSSEXSSSS",
    ],
  },
  {
    maxOxygen: 50,
    oxygenDrain: 2,
    map: [
      "SSSSSSSSSSSSS",
      "S...........S",
      "S.T.#####.T.S",
      "S...#O..#...S",
      "S.###...###.S",
      "S.#.T.T.T.#.S",
      "S.#.#####.#.S",
      "S.#...O...#.S",
      "S.#D.T.T.D#.S",
      "S.#########.S",
      "S.....T.....S",
      "SSSSSSEXSSSSS",
    ],
  },
  {
    maxOxygen: 60,
    oxygenDrain: 2,
    map: [
      "SSSSSSSSSSSSSSS",
      "S.............S",
      "S.T.#######.T.S",
      "S...#.....#...S",
      "S.###.T.T.###.S",
      "S.#...###...#.S",
      "S.#.#.#O#.#.#.S",
      "S.#.#.....#.#.S",
      "S.#.#T###T#.#.S",
      "S.#.#.....#.#.S",
      "S.#.#######.#.S",
      "S.#D...T...D#.S",
      "S.###########.S",
      "S......T......S",
      "SSSSSSSEXSSSSSS",
    ],
  },
];

const TILE_SIZE = 32;

export class DeepSeaGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private grid: Tile[][] = [];
  private playerX: number = 0;
  private playerY: number = 0;
  private oxygen: number = 0;
  private isPlaying: boolean = false;
  private treasuresCollected: number = 0;
  private totalTreasures: number = 0;
  private animationId: number = 0;
  private bubbles: { x: number; y: number; r: number; speed: number }[] = [];

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
    this.oxygen = level.maxOxygen;
    this.treasuresCollected = 0;
    this.totalTreasures = 0;
    this.bubbles = [];

    for (let y = 0; y < level.map.length; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < level.map[y].length; x++) {
        const char = level.map[y][x];
        let tile: Tile = { type: "empty", collected: false };

        switch (char) {
          case "S":
          case "#":
            tile.type = "wall";
            break;
          case "T":
            tile.type = "treasure";
            this.totalTreasures++;
            break;
          case "O":
            tile.type = "oxygen";
            break;
          case "E":
            tile.type = "exit";
            break;
          case "D":
            tile.type = "danger";
            break;
          case "X":
            this.playerX = x;
            this.playerY = y;
            break;
        }
        row.push(tile);
      }
      this.grid.push(row);
    }

    for (let i = 0; i < 20; i++) {
      this.bubbles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1,
      });
    }

    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        status: this.getStatus(),
        depth: this.playerY * 10,
        oxygen: this.oxygen,
        maxOxygen: LEVELS[this.currentLevel].maxOxygen,
        treasuresCollected: this.treasuresCollected,
        totalTreasures: this.totalTreasures,
      });
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (this.oxygen <= 0) return "gameOver";
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.initLevel();
    this.startGameLoop();
  }

  private startGameLoop() {
    const loop = () => {
      if (!this.isPlaying) return;

      const level = LEVELS[this.currentLevel];
      this.oxygen -= level.oxygenDrain * 0.016;

      if (this.oxygen <= 0) {
        this.oxygen = 0;
        this.isPlaying = false;
        this.emitState();
      }

      this.updateBubbles();
      this.draw();
      this.emitState();

      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private updateBubbles() {
    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed;
      bubble.x += Math.sin(bubble.y * 0.05) * 0.3;
      if (bubble.y < -10) {
        bubble.y = this.height + 10;
        bubble.x = Math.random() * this.width;
      }
    }
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.initLevel();
    this.startGameLoop();
  }

  restart() {
    cancelAnimationFrame(this.animationId);
    this.currentLevel = 0;
    this.isPlaying = false;
    this.grid = [];
    this.draw();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
      this.startGameLoop();
    }
  }

  move(dx: number, dy: number) {
    if (!this.isPlaying || this.oxygen <= 0) return;

    const newX = this.playerX + dx;
    const newY = this.playerY + dy;

    if (newY < 0 || newY >= this.grid.length) return;
    if (newX < 0 || newX >= this.grid[newY].length) return;

    const tile = this.grid[newY][newX];
    if (tile.type === "wall") return;

    this.playerX = newX;
    this.playerY = newY;

    if (tile.type === "treasure" && !tile.collected) {
      tile.collected = true;
      this.treasuresCollected++;
    } else if (tile.type === "oxygen" && !tile.collected) {
      tile.collected = true;
      const level = LEVELS[this.currentLevel];
      this.oxygen = Math.min(this.oxygen + 15, level.maxOxygen);
    } else if (tile.type === "danger" && !tile.collected) {
      tile.collected = true;
      this.oxygen -= 10;
      if (this.oxygen < 0) this.oxygen = 0;
    } else if (tile.type === "exit" && this.treasuresCollected >= this.totalTreasures) {
      this.isPlaying = false;
      cancelAnimationFrame(this.animationId);

      if (this.currentLevel >= LEVELS.length - 1) {
        if (this.onStateChange) {
          this.onStateChange({
            level: this.currentLevel + 1,
            status: "complete",
            depth: this.playerY * 10,
            oxygen: this.oxygen,
            maxOxygen: LEVELS[this.currentLevel].maxOxygen,
            treasuresCollected: this.treasuresCollected,
            totalTreasures: this.totalTreasures,
          });
        }
      } else {
        if (this.onStateChange) {
          this.onStateChange({
            level: this.currentLevel + 1,
            status: "won",
            depth: this.playerY * 10,
            oxygen: this.oxygen,
            maxOxygen: LEVELS[this.currentLevel].maxOxygen,
            treasuresCollected: this.treasuresCollected,
            totalTreasures: this.totalTreasures,
          });
        }
      }
    }

    this.emitState();
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

  handleClick(x: number, y: number) {
    if (!this.isPlaying) return;

    const level = LEVELS[this.currentLevel];
    const offsetX = (this.width - level.map[0].length * TILE_SIZE) / 2;
    const offsetY = 20;

    const playerScreenX = offsetX + this.playerX * TILE_SIZE + TILE_SIZE / 2;
    const playerScreenY = offsetY + this.playerY * TILE_SIZE + TILE_SIZE / 2;

    const dx = x - playerScreenX;
    const dy = y - playerScreenY;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.move(dx > 0 ? 1 : -1, 0);
    } else {
      this.move(0, dy > 0 ? 1 : -1);
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#0a1628");
    gradient.addColorStop(1, "#020810");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
    for (const bubble of this.bubbles) {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!this.isPlaying && this.grid.length === 0) {
      ctx.fillStyle = "#3498db";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Deep Sea", this.width / 2, this.height / 2);
      return;
    }

    this.drawGrid();
    this.drawPlayer();
  }

  private drawGrid() {
    const ctx = this.ctx;
    const level = LEVELS[this.currentLevel];
    const offsetX = (this.width - level.map[0].length * TILE_SIZE) / 2;
    const offsetY = 20;

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const tile = this.grid[y][x];
        const screenX = offsetX + x * TILE_SIZE;
        const screenY = offsetY + y * TILE_SIZE;

        if (tile.type === "wall") {
          ctx.fillStyle = "#1a3a5c";
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#0d1f30";
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = `rgba(20, 60, 100, ${0.3 + y * 0.05})`;
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tile.type === "treasure" && !tile.collected) {
          ctx.font = "20px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("💎", screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
        } else if (tile.type === "oxygen" && !tile.collected) {
          ctx.font = "20px serif";
          ctx.fillText("🫧", screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
        } else if (tile.type === "exit") {
          ctx.fillStyle = this.treasuresCollected >= this.totalTreasures ? "#27ae60" : "#7f8c8d";
          ctx.beginPath();
          ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = "14px serif";
          ctx.fillText("⬆️", screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
        } else if (tile.type === "danger" && !tile.collected) {
          ctx.font = "20px serif";
          ctx.fillText("🦈", screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
        }
      }
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const level = LEVELS[this.currentLevel];
    const offsetX = (this.width - level.map[0].length * TILE_SIZE) / 2;
    const offsetY = 20;

    const screenX = offsetX + this.playerX * TILE_SIZE;
    const screenY = offsetY + this.playerY * TILE_SIZE;

    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.ellipse(
      screenX + TILE_SIZE / 2,
      screenY + TILE_SIZE / 2,
      14,
      10,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.arc(screenX + TILE_SIZE / 2 + 5, screenY + TILE_SIZE / 2 - 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + TILE_SIZE / 2 - 8, screenY + TILE_SIZE / 2 + 5);
    ctx.lineTo(screenX + TILE_SIZE / 2 - 14, screenY + TILE_SIZE / 2 + 3);
    ctx.stroke();
  }
}
