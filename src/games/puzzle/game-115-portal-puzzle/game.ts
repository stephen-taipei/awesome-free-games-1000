type CellType = "empty" | "wall" | "player" | "goal" | "portal-a" | "portal-b";

interface Portal {
  x: number;
  y: number;
  color: "orange" | "blue";
}

interface LevelConfig {
  grid: string[];
  portalWalls: { x: number; y: number }[]; // Walls where portals can be placed
}

const LEVELS: LevelConfig[] = [
  {
    grid: [
      "########",
      "#P.....#",
      "#......#",
      "#..##..#",
      "#..##..#",
      "#.....G#",
      "########",
    ],
    portalWalls: [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ],
  },
  {
    grid: [
      "##########",
      "#P.......#",
      "#........#",
      "####..####",
      "#........#",
      "#........#",
      "####..####",
      "#.......G#",
      "##########",
    ],
    portalWalls: [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ],
  },
  {
    grid: [
      "############",
      "#P.........#",
      "#..########.#",
      "#..#......#.#",
      "#..#......#.#",
      "#..#......#.#",
      "#..########.#",
      "#..........G#",
      "############",
    ],
    portalWalls: [
      { x: 3, y: 2 },
      { x: 3, y: 6 },
      { x: 10, y: 2 },
      { x: 10, y: 6 },
    ],
  },
  {
    grid: [
      "##############",
      "#P...#.......#",
      "#....#.......#",
      "#....#.......#",
      "#....#####...#",
      "#............#",
      "#####....#####",
      "#............#",
      "#....#####...#",
      "#....#.......#",
      "#....#......G#",
      "##############",
    ],
    portalWalls: [
      { x: 5, y: 1 },
      { x: 5, y: 4 },
      { x: 9, y: 4 },
      { x: 5, y: 8 },
      { x: 9, y: 8 },
    ],
  },
];

export class PortalPuzzleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  grid: CellType[][] = [];
  gridWidth: number = 0;
  gridHeight: number = 0;
  cellSize: number = 40;
  offsetX: number = 0;
  offsetY: number = 0;

  playerX: number = 0;
  playerY: number = 0;
  goalX: number = 0;
  goalY: number = 0;

  portalA: Portal | null = null;
  portalB: Portal | null = null;
  portalWalls: { x: number; y: number }[] = [];
  nextPortalColor: "orange" | "blue" = "orange";

  moves: number = 0;
  status: "playing" | "won" = "playing";
  animOffset: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.portalA = null;
    this.portalB = null;
    this.nextPortalColor = "orange";
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: this.moves,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];

    this.gridHeight = config.grid.length;
    this.gridWidth = config.grid[0].length;

    const { width, height } = this.canvas;
    this.cellSize = Math.min(
      (width - 40) / this.gridWidth,
      (height - 40) / this.gridHeight
    );
    this.offsetX = (width - this.gridWidth * this.cellSize) / 2;
    this.offsetY = (height - this.gridHeight * this.cellSize) / 2;

    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        const char = config.grid[y][x];
        switch (char) {
          case "#":
            row.push("wall");
            break;
          case "P":
            row.push("empty");
            this.playerX = x;
            this.playerY = y;
            break;
          case "G":
            row.push("goal");
            this.goalX = x;
            this.goalY = y;
            break;
          default:
            row.push("empty");
        }
      }
      this.grid.push(row);
    }

    this.portalWalls = [...config.portalWalls];
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.animOffset += 0.05;
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Convert to grid coordinates
    const gx = Math.floor((x - this.offsetX) / this.cellSize);
    const gy = Math.floor((y - this.offsetY) / this.cellSize);

    // Check if clicking on a portal wall
    const isPortalWall = this.portalWalls.some((pw) => pw.x === gx && pw.y === gy);
    if (!isPortalWall) return;

    // Place portal
    if (this.nextPortalColor === "orange") {
      this.portalA = { x: gx, y: gy, color: "orange" };
      this.nextPortalColor = "blue";
    } else {
      this.portalB = { x: gx, y: gy, color: "blue" };
      this.nextPortalColor = "orange";
    }
  }

  public handleKeyDown(key: string) {
    if (this.status !== "playing") return;

    let dx = 0;
    let dy = 0;

    switch (key) {
      case "ArrowUp":
      case "w":
        dy = -1;
        break;
      case "ArrowDown":
      case "s":
        dy = 1;
        break;
      case "ArrowLeft":
      case "a":
        dx = -1;
        break;
      case "ArrowRight":
      case "d":
        dx = 1;
        break;
      default:
        return;
    }

    const newX = this.playerX + dx;
    const newY = this.playerY + dy;

    // Check bounds
    if (newX < 0 || newX >= this.gridWidth || newY < 0 || newY >= this.gridHeight) {
      return;
    }

    // Check wall
    if (this.grid[newY][newX] === "wall") {
      // Check for portal teleport
      if (this.portalA && this.portalB) {
        if (this.portalA.x === newX && this.portalA.y === newY) {
          // Teleport to portal B
          this.playerX = this.portalB.x;
          this.playerY = this.portalB.y;
          this.moves++;
        } else if (this.portalB.x === newX && this.portalB.y === newY) {
          // Teleport to portal A
          this.playerX = this.portalA.x;
          this.playerY = this.portalA.y;
          this.moves++;
        }
      }
    } else {
      // Normal move
      this.playerX = newX;
      this.playerY = newY;
      this.moves++;
    }

    if (this.onStateChange) {
      this.onStateChange({ moves: this.moves });
    }

    // Check win
    if (this.playerX === this.goalX && this.playerY === this.goalY) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          hasNextLevel: this.currentLevel < LEVELS.length - 1,
        });
      }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const bgGradient = this.ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(1, "#16213e");
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGrid();

    // Draw portals
    this.drawPortals();

    // Draw goal
    this.drawGoal();

    // Draw player
    this.drawPlayer();

    // Draw portal indicator
    this.drawPortalIndicator();

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawGrid() {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.grid[y][x];
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;

        if (cell === "wall") {
          // Check if it's a portal wall
          const isPortalWall = this.portalWalls.some((pw) => pw.x === x && pw.y === y);

          if (isPortalWall) {
            // Portal-placeable wall
            const gradient = this.ctx.createLinearGradient(px, py, px + this.cellSize, py + this.cellSize);
            gradient.addColorStop(0, "#4a4a6a");
            gradient.addColorStop(1, "#3a3a5a");
            this.ctx.fillStyle = gradient;
          } else {
            // Regular wall
            this.ctx.fillStyle = "#2c3e50";
          }
          this.ctx.fillRect(px, py, this.cellSize, this.cellSize);

          // Wall border
          this.ctx.strokeStyle = "#1a252f";
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
        } else {
          // Floor
          this.ctx.fillStyle = "#34495e";
          this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
        }
      }
    }
  }

  private drawPortals() {
    if (this.portalA) {
      this.drawPortal(this.portalA, "#ff6b35");
    }
    if (this.portalB) {
      this.drawPortal(this.portalB, "#00b4d8");
    }
  }

  private drawPortal(portal: Portal, color: string) {
    const px = this.offsetX + (portal.x + 0.5) * this.cellSize;
    const py = this.offsetY + (portal.y + 0.5) * this.cellSize;
    const radius = this.cellSize * 0.4;

    // Outer glow
    const glow = this.ctx.createRadialGradient(px, py, 0, px, py, radius * 2);
    glow.addColorStop(0, color);
    glow.addColorStop(0.5, color.replace(")", ", 0.3)").replace("rgb", "rgba"));
    glow.addColorStop(1, "transparent");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Portal ring
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Swirl effect
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const angle = this.animOffset * 2 + (i * Math.PI * 2) / 3;
      const spiralRadius = radius * (0.3 + Math.sin(this.animOffset + i) * 0.2);
      this.ctx.beginPath();
      this.ctx.arc(
        px + Math.cos(angle) * spiralRadius * 0.3,
        py + Math.sin(angle) * spiralRadius * 0.3,
        spiralRadius,
        angle,
        angle + Math.PI
      );
      this.ctx.stroke();
    }
  }

  private drawGoal() {
    const px = this.offsetX + (this.goalX + 0.5) * this.cellSize;
    const py = this.offsetY + (this.goalY + 0.5) * this.cellSize;
    const size = this.cellSize * 0.3;

    // Glow
    const glow = this.ctx.createRadialGradient(px, py, 0, px, py, size * 2);
    glow.addColorStop(0, "rgba(46, 204, 113, 0.8)");
    glow.addColorStop(1, "rgba(46, 204, 113, 0)");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, size * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Star shape
    this.ctx.fillStyle = "#2ecc71";
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerRadius = size;
      const innerRadius = size * 0.4;

      if (i === 0) {
        this.ctx.moveTo(px + Math.cos(angle) * outerRadius, py + Math.sin(angle) * outerRadius);
      } else {
        this.ctx.lineTo(px + Math.cos(angle) * outerRadius, py + Math.sin(angle) * outerRadius);
      }

      const innerAngle = angle + Math.PI / 5;
      this.ctx.lineTo(px + Math.cos(innerAngle) * innerRadius, py + Math.sin(innerAngle) * innerRadius);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawPlayer() {
    const px = this.offsetX + (this.playerX + 0.5) * this.cellSize;
    const py = this.offsetY + (this.playerY + 0.5) * this.cellSize;
    const size = this.cellSize * 0.35;

    // Player glow
    const glow = this.ctx.createRadialGradient(px, py, 0, px, py, size * 2);
    glow.addColorStop(0, "rgba(241, 196, 15, 0.5)");
    glow.addColorStop(1, "rgba(241, 196, 15, 0)");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, size * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Player body
    const playerGradient = this.ctx.createRadialGradient(px - 3, py - 3, 0, px, py, size);
    playerGradient.addColorStop(0, "#f1c40f");
    playerGradient.addColorStop(1, "#f39c12");
    this.ctx.fillStyle = playerGradient;
    this.ctx.beginPath();
    this.ctx.arc(px, py, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.arc(px - 5, py - 3, 3, 0, Math.PI * 2);
    this.ctx.arc(px + 5, py - 3, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPortalIndicator() {
    const { width } = this.canvas;

    // Show which portal color is next
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Next Portal:", width / 2, 25);

    const indicatorColor = this.nextPortalColor === "orange" ? "#ff6b35" : "#00b4d8";
    this.ctx.fillStyle = indicatorColor;
    this.ctx.beginPath();
    this.ctx.arc(width / 2, 45, 12, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.grid.length > 0) {
        this.cellSize = Math.min(
          (this.canvas.width - 40) / this.gridWidth,
          (this.canvas.height - 40) / this.gridHeight
        );
        this.offsetX = (this.canvas.width - this.gridWidth * this.cellSize) / 2;
        this.offsetY = (this.canvas.height - this.gridHeight * this.cellSize) / 2;
      }
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
