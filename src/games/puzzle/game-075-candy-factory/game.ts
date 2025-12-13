/**
 * Candy Factory Game
 * Game #075 - Manage conveyor belts to deliver candies
 */

type Direction = "up" | "down" | "left" | "right";
type CandyColor = "red" | "blue" | "green" | "yellow";

interface Candy {
  x: number;
  y: number;
  color: CandyColor;
  direction: Direction;
  delivered: boolean;
}

interface Switch {
  x: number;
  y: number;
  directions: [Direction, Direction];
  currentIndex: number;
}

interface Exit {
  x: number;
  y: number;
  color: CandyColor;
  count: number;
  target: number;
}

interface Spawner {
  x: number;
  y: number;
  color: CandyColor;
  direction: Direction;
  interval: number;
  count: number;
}

interface Level {
  gridWidth: number;
  gridHeight: number;
  spawners: Spawner[];
  switches: Switch[];
  exits: Exit[];
  conveyors: { x: number; y: number; direction: Direction }[];
}

const CANDY_COLORS: Record<CandyColor, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#2ecc71",
  yellow: "#f1c40f",
};

const LEVELS: Level[] = [
  // Level 1: Simple - one spawner, one exit
  {
    gridWidth: 5,
    gridHeight: 5,
    spawners: [{ x: 0, y: 2, color: "red", direction: "right", interval: 60, count: 5 }],
    switches: [{ x: 2, y: 2, directions: ["right", "down"], currentIndex: 0 }],
    exits: [{ x: 4, y: 2, color: "red", count: 0, target: 5 }],
    conveyors: [
      { x: 1, y: 2, direction: "right" },
      { x: 3, y: 2, direction: "right" },
    ],
  },
  // Level 2: Two colors
  {
    gridWidth: 6,
    gridHeight: 5,
    spawners: [
      { x: 0, y: 1, color: "red", direction: "right", interval: 80, count: 3 },
      { x: 0, y: 3, color: "blue", direction: "right", interval: 80, count: 3 },
    ],
    switches: [
      { x: 2, y: 1, directions: ["right", "down"], currentIndex: 0 },
      { x: 2, y: 3, directions: ["right", "up"], currentIndex: 0 },
    ],
    exits: [
      { x: 5, y: 1, color: "red", count: 0, target: 3 },
      { x: 5, y: 3, color: "blue", count: 0, target: 3 },
    ],
    conveyors: [
      { x: 1, y: 1, direction: "right" },
      { x: 3, y: 1, direction: "right" },
      { x: 4, y: 1, direction: "right" },
      { x: 1, y: 3, direction: "right" },
      { x: 3, y: 3, direction: "right" },
      { x: 4, y: 3, direction: "right" },
      { x: 2, y: 2, direction: "right" },
    ],
  },
  // Level 3: Cross paths
  {
    gridWidth: 7,
    gridHeight: 5,
    spawners: [
      { x: 0, y: 2, color: "green", direction: "right", interval: 70, count: 4 },
      { x: 3, y: 0, color: "yellow", direction: "down", interval: 70, count: 4 },
    ],
    switches: [
      { x: 3, y: 2, directions: ["right", "down"], currentIndex: 0 },
    ],
    exits: [
      { x: 6, y: 2, color: "green", count: 0, target: 4 },
      { x: 3, y: 4, color: "yellow", count: 0, target: 4 },
    ],
    conveyors: [
      { x: 1, y: 2, direction: "right" },
      { x: 2, y: 2, direction: "right" },
      { x: 4, y: 2, direction: "right" },
      { x: 5, y: 2, direction: "right" },
      { x: 3, y: 1, direction: "down" },
      { x: 3, y: 3, direction: "down" },
    ],
  },
  // Level 4: Multiple switches
  {
    gridWidth: 7,
    gridHeight: 6,
    spawners: [
      { x: 0, y: 1, color: "red", direction: "right", interval: 60, count: 3 },
      { x: 0, y: 4, color: "blue", direction: "right", interval: 60, count: 3 },
    ],
    switches: [
      { x: 2, y: 1, directions: ["right", "down"], currentIndex: 0 },
      { x: 4, y: 1, directions: ["right", "down"], currentIndex: 0 },
      { x: 2, y: 4, directions: ["right", "up"], currentIndex: 0 },
      { x: 4, y: 4, directions: ["right", "up"], currentIndex: 0 },
    ],
    exits: [
      { x: 6, y: 1, color: "red", count: 0, target: 3 },
      { x: 6, y: 4, color: "blue", count: 0, target: 3 },
    ],
    conveyors: [
      { x: 1, y: 1, direction: "right" },
      { x: 3, y: 1, direction: "right" },
      { x: 5, y: 1, direction: "right" },
      { x: 1, y: 4, direction: "right" },
      { x: 3, y: 4, direction: "right" },
      { x: 5, y: 4, direction: "right" },
      { x: 2, y: 2, direction: "down" },
      { x: 2, y: 3, direction: "down" },
      { x: 4, y: 2, direction: "down" },
      { x: 4, y: 3, direction: "down" },
    ],
  },
  // Level 5: Four colors
  {
    gridWidth: 8,
    gridHeight: 7,
    spawners: [
      { x: 0, y: 1, color: "red", direction: "right", interval: 90, count: 2 },
      { x: 0, y: 3, color: "blue", direction: "right", interval: 90, count: 2 },
      { x: 0, y: 5, color: "green", direction: "right", interval: 90, count: 2 },
      { x: 3, y: 0, color: "yellow", direction: "down", interval: 90, count: 2 },
    ],
    switches: [
      { x: 3, y: 1, directions: ["right", "down"], currentIndex: 0 },
      { x: 3, y: 3, directions: ["right", "down"], currentIndex: 0 },
      { x: 3, y: 5, directions: ["right", "up"], currentIndex: 0 },
      { x: 5, y: 3, directions: ["right", "up"], currentIndex: 0 },
    ],
    exits: [
      { x: 7, y: 1, color: "red", count: 0, target: 2 },
      { x: 7, y: 3, color: "blue", count: 0, target: 2 },
      { x: 7, y: 5, color: "green", count: 0, target: 2 },
      { x: 3, y: 6, color: "yellow", count: 0, target: 2 },
    ],
    conveyors: [
      { x: 1, y: 1, direction: "right" },
      { x: 2, y: 1, direction: "right" },
      { x: 4, y: 1, direction: "right" },
      { x: 5, y: 1, direction: "right" },
      { x: 6, y: 1, direction: "right" },
      { x: 1, y: 3, direction: "right" },
      { x: 2, y: 3, direction: "right" },
      { x: 4, y: 3, direction: "right" },
      { x: 6, y: 3, direction: "right" },
      { x: 1, y: 5, direction: "right" },
      { x: 2, y: 5, direction: "right" },
      { x: 4, y: 5, direction: "right" },
      { x: 5, y: 5, direction: "right" },
      { x: 6, y: 5, direction: "right" },
      { x: 3, y: 2, direction: "down" },
      { x: 3, y: 4, direction: "down" },
      { x: 5, y: 2, direction: "down" },
      { x: 5, y: 4, direction: "up" },
    ],
  },
];

export class CandyFactoryGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private cellSize: number = 50;

  currentLevel: number = 0;
  candies: Candy[] = [];
  switches: Switch[] = [];
  exits: Exit[] = [];
  spawners: Spawner[] = [];
  conveyors: { x: number; y: number; direction: Direction }[] = [];

  score: number = 0;
  isRunning: boolean = false;
  frameCount: number = 0;
  spawnCounters: number[] = [];

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private animationId: number = 0;
  private conveyorOffset: number = 0;

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

    // Calculate cell size based on level grid
    if (LEVELS[this.currentLevel]) {
      const level = LEVELS[this.currentLevel];
      this.cellSize = Math.min(
        (this.width - 40) / level.gridWidth,
        (this.height - 40) / level.gridHeight,
        60
      );
    }

    this.render();
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({
          status: "complete",
          level: levelIndex + 1,
          score: this.score,
        });
      }
      return;
    }

    const level = LEVELS[levelIndex];

    this.candies = [];
    this.switches = level.switches.map((s) => ({ ...s }));
    this.exits = level.exits.map((e) => ({ ...e, count: 0 }));
    this.spawners = level.spawners.map((s) => ({ ...s }));
    this.conveyors = [...level.conveyors];
    this.spawnCounters = level.spawners.map(() => 0);
    this.frameCount = 0;
    this.isRunning = false;
    this.status = "playing";

    this.cellSize = Math.min(
      (this.width - 40) / level.gridWidth,
      (this.height - 40) / level.gridHeight,
      60
    );

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        score: this.score,
        exits: this.exits,
        isRunning: false,
      });
    }
  }

  private gameLoop() {
    if (this.isRunning) {
      this.update();
    }
    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.frameCount++;
    this.conveyorOffset = (this.conveyorOffset + 1) % 20;

    // Spawn candies
    this.spawners.forEach((spawner, index) => {
      if (this.spawnCounters[index] < spawner.count) {
        if (this.frameCount % spawner.interval === 0) {
          this.candies.push({
            x: spawner.x,
            y: spawner.y,
            color: spawner.color,
            direction: spawner.direction,
            delivered: false,
          });
          this.spawnCounters[index]++;
        }
      }
    });

    // Move candies
    if (this.frameCount % 15 === 0) {
      this.candies.forEach((candy) => {
        if (candy.delivered) return;

        // Check for switch
        const switchAtPos = this.switches.find(
          (s) => s.x === candy.x && s.y === candy.y
        );
        if (switchAtPos) {
          candy.direction = switchAtPos.directions[switchAtPos.currentIndex];
        }

        // Move in direction
        switch (candy.direction) {
          case "up":
            candy.y--;
            break;
          case "down":
            candy.y++;
            break;
          case "left":
            candy.x--;
            break;
          case "right":
            candy.x++;
            break;
        }

        // Check for exit
        const exitAtPos = this.exits.find(
          (e) => e.x === candy.x && e.y === candy.y
        );
        if (exitAtPos) {
          candy.delivered = true;
          if (exitAtPos.color === candy.color) {
            exitAtPos.count++;
            this.score += 10;
          } else {
            this.score -= 5;
          }
        }

        // Check for conveyor direction
        const conveyorAtPos = this.conveyors.find(
          (c) => c.x === candy.x && c.y === candy.y
        );
        if (conveyorAtPos) {
          candy.direction = conveyorAtPos.direction;
        }

        // Check out of bounds - remove candy
        const level = LEVELS[this.currentLevel];
        if (
          candy.x < 0 ||
          candy.x >= level.gridWidth ||
          candy.y < 0 ||
          candy.y >= level.gridHeight
        ) {
          candy.delivered = true;
        }
      });

      // Remove delivered candies
      this.candies = this.candies.filter((c) => !c.delivered);

      // Check win condition
      const allDelivered = this.spawnCounters.every(
        (count, index) => count >= this.spawners[index].count
      );
      const allCandiesGone = this.candies.length === 0;
      const allTargetsMet = this.exits.every((e) => e.count >= e.target);

      if (allDelivered && allCandiesGone) {
        this.isRunning = false;
        if (allTargetsMet) {
          this.status = "won";
          if (this.onStateChange) {
            this.onStateChange({
              status: "won",
              level: this.currentLevel + 1,
              score: this.score,
              exits: this.exits,
            });
          }
        } else {
          // Failed - reset level
          setTimeout(() => this.loadLevel(this.currentLevel), 1000);
        }
      }

      if (this.onStateChange) {
        this.onStateChange({
          status: this.status,
          level: this.currentLevel + 1,
          score: this.score,
          exits: this.exits,
          isRunning: this.isRunning,
        });
      }
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const level = LEVELS[this.currentLevel];
    const offsetX = (this.width - level.gridWidth * this.cellSize) / 2;
    const offsetY = (this.height - level.gridHeight * this.cellSize) / 2;

    const gridX = Math.floor((x - offsetX) / this.cellSize);
    const gridY = Math.floor((y - offsetY) / this.cellSize);

    // Toggle switch
    const switchClicked = this.switches.find(
      (s) => s.x === gridX && s.y === gridY
    );
    if (switchClicked) {
      switchClicked.currentIndex =
        (switchClicked.currentIndex + 1) % switchClicked.directions.length;
    }
  }

  public toggleRunning() {
    if (this.status !== "playing") return;
    this.isRunning = !this.isRunning;

    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        score: this.score,
        exits: this.exits,
        isRunning: this.isRunning,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, this.width, this.height);

    const level = LEVELS[this.currentLevel];
    if (!level) return;

    const offsetX = (this.width - level.gridWidth * this.cellSize) / 2;
    const offsetY = (this.height - level.gridHeight * this.cellSize) / 2;

    // Draw grid
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 1;
    for (let x = 0; x <= level.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * this.cellSize, offsetY);
      ctx.lineTo(offsetX + x * this.cellSize, offsetY + level.gridHeight * this.cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= level.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * this.cellSize);
      ctx.lineTo(offsetX + level.gridWidth * this.cellSize, offsetY + y * this.cellSize);
      ctx.stroke();
    }

    // Draw conveyors
    this.conveyors.forEach((conv) => {
      this.drawConveyor(
        offsetX + conv.x * this.cellSize,
        offsetY + conv.y * this.cellSize,
        conv.direction
      );
    });

    // Draw spawners
    this.spawners.forEach((spawner) => {
      this.drawSpawner(
        offsetX + spawner.x * this.cellSize,
        offsetY + spawner.y * this.cellSize,
        spawner.color,
        spawner.direction
      );
    });

    // Draw switches
    this.switches.forEach((sw) => {
      this.drawSwitch(
        offsetX + sw.x * this.cellSize,
        offsetY + sw.y * this.cellSize,
        sw.directions[sw.currentIndex]
      );
    });

    // Draw exits
    this.exits.forEach((exit) => {
      this.drawExit(
        offsetX + exit.x * this.cellSize,
        offsetY + exit.y * this.cellSize,
        exit.color,
        exit.count,
        exit.target
      );
    });

    // Draw candies
    this.candies.forEach((candy) => {
      this.drawCandy(
        offsetX + candy.x * this.cellSize + this.cellSize / 2,
        offsetY + candy.y * this.cellSize + this.cellSize / 2,
        candy.color
      );
    });
  }

  private drawConveyor(x: number, y: number, direction: Direction) {
    const ctx = this.ctx;
    const size = this.cellSize;

    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Animated stripes
    ctx.strokeStyle = "#95a5a6";
    ctx.lineWidth = 2;

    const stripeCount = 3;
    for (let i = 0; i < stripeCount; i++) {
      const offset = ((this.conveyorOffset + i * 7) % 20) / 20;
      ctx.beginPath();

      if (direction === "right" || direction === "left") {
        const stripeX = x + (direction === "right" ? offset : 1 - offset) * size;
        ctx.moveTo(stripeX, y + 5);
        ctx.lineTo(stripeX, y + size - 5);
      } else {
        const stripeY = y + (direction === "down" ? offset : 1 - offset) * size;
        ctx.moveTo(x + 5, stripeY);
        ctx.lineTo(x + size - 5, stripeY);
      }
      ctx.stroke();
    }

    // Arrow
    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const arrowSize = size / 4;

    if (direction === "right") {
      ctx.moveTo(cx + arrowSize, cy);
      ctx.lineTo(cx - arrowSize / 2, cy - arrowSize / 2);
      ctx.lineTo(cx - arrowSize / 2, cy + arrowSize / 2);
    } else if (direction === "left") {
      ctx.moveTo(cx - arrowSize, cy);
      ctx.lineTo(cx + arrowSize / 2, cy - arrowSize / 2);
      ctx.lineTo(cx + arrowSize / 2, cy + arrowSize / 2);
    } else if (direction === "down") {
      ctx.moveTo(cx, cy + arrowSize);
      ctx.lineTo(cx - arrowSize / 2, cy - arrowSize / 2);
      ctx.lineTo(cx + arrowSize / 2, cy - arrowSize / 2);
    } else {
      ctx.moveTo(cx, cy - arrowSize);
      ctx.lineTo(cx - arrowSize / 2, cy + arrowSize / 2);
      ctx.lineTo(cx + arrowSize / 2, cy + arrowSize / 2);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawSpawner(x: number, y: number, color: CandyColor, direction: Direction) {
    const ctx = this.ctx;
    const size = this.cellSize;

    ctx.fillStyle = "#1a252f";
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Inner glow
    const glow = ctx.createRadialGradient(
      x + size / 2,
      y + size / 2,
      0,
      x + size / 2,
      y + size / 2,
      size / 2
    );
    glow.addColorStop(0, CANDY_COLORS[color] + "40");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Border
    ctx.strokeStyle = CANDY_COLORS[color];
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
  }

  private drawSwitch(x: number, y: number, direction: Direction) {
    const ctx = this.ctx;
    const size = this.cellSize;

    ctx.fillStyle = "#9b59b6";
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Direction indicator
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const arrowSize = size / 3;

    if (direction === "right") {
      ctx.moveTo(cx + arrowSize, cy);
      ctx.lineTo(cx - arrowSize / 2, cy - arrowSize / 2);
      ctx.lineTo(cx - arrowSize / 2, cy + arrowSize / 2);
    } else if (direction === "left") {
      ctx.moveTo(cx - arrowSize, cy);
      ctx.lineTo(cx + arrowSize / 2, cy - arrowSize / 2);
      ctx.lineTo(cx + arrowSize / 2, cy + arrowSize / 2);
    } else if (direction === "down") {
      ctx.moveTo(cx, cy + arrowSize);
      ctx.lineTo(cx - arrowSize / 2, cy - arrowSize / 2);
      ctx.lineTo(cx + arrowSize / 2, cy - arrowSize / 2);
    } else {
      ctx.moveTo(cx, cy - arrowSize);
      ctx.lineTo(cx - arrowSize / 2, cy + arrowSize / 2);
      ctx.lineTo(cx + arrowSize / 2, cy + arrowSize / 2);
    }
    ctx.closePath();
    ctx.fill();

    // Click indicator
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
  }

  private drawExit(x: number, y: number, color: CandyColor, count: number, target: number) {
    const ctx = this.ctx;
    const size = this.cellSize;

    // Background
    ctx.fillStyle = CANDY_COLORS[color] + "40";
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Border
    ctx.strokeStyle = CANDY_COLORS[color];
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

    // Count
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${size / 3}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${count}/${target}`, x + size / 2, y + size / 2);
  }

  private drawCandy(x: number, y: number, color: CandyColor) {
    const ctx = this.ctx;
    const radius = this.cellSize / 3;

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
    glow.addColorStop(0, CANDY_COLORS[color]);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Main candy
    ctx.fillStyle = CANDY_COLORS[color];
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(x - radius / 3, y - radius / 3, radius / 3, 0, Math.PI * 2);
    ctx.fill();
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
    this.score = 0;
    this.loadLevel(0);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
