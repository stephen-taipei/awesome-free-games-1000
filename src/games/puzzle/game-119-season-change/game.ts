/**
 * Season Change Game Engine
 * Game #119 - Switch seasons to solve puzzles
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface GameObject {
  type: "player" | "goal" | "water" | "flower" | "tree" | "rock" | "leaf" | "snow";
  x: number;
  y: number;
}

export interface LevelConfig {
  grid: string[];
  playerStart: { x: number; y: number };
  goalPos: { x: number; y: number };
  requiredSeason?: Season;
}

export class SeasonChangeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private gridSize = 8;
  private cellSize = 0;

  private objects: GameObject[] = [];
  private playerPos = { x: 0, y: 0 };
  private goalPos = { x: 0, y: 0 };

  private currentSeason: Season = "spring";
  private moves = 0;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Simple path with water
    {
      grid: [
        "........",
        ".P......",
        "..wwww..",
        "........",
        "........",
        "..wwww..",
        "......G.",
        "........",
      ],
      playerStart: { x: 1, y: 1 },
      goalPos: { x: 6, y: 6 },
    },
    // Level 2 - Flowers and leaves
    {
      grid: [
        "........",
        ".P.fff..",
        "........",
        "..lll...",
        "........",
        ".fff....",
        "......G.",
        "........",
      ],
      playerStart: { x: 1, y: 1 },
      goalPos: { x: 6, y: 6 },
    },
    // Level 3 - Mixed obstacles
    {
      grid: [
        "........",
        ".P..www.",
        "..r.....",
        ".wwww...",
        "......r.",
        ".fff....",
        "..lll.G.",
        "........",
      ],
      playerStart: { x: 1, y: 1 },
      goalPos: { x: 6, y: 6 },
    },
    // Level 4 - Trees and water
    {
      grid: [
        "........",
        ".P.ttt..",
        "..www...",
        ".t...t..",
        "..www...",
        ".ttt....",
        "......G.",
        "........",
      ],
      playerStart: { x: 1, y: 1 },
      goalPos: { x: 6, y: 6 },
    },
    // Level 5 - Complex maze
    {
      grid: [
        ".P......",
        "wwwwww..",
        ".....fff",
        ".ttt....",
        "...wwwww",
        ".lll....",
        "...ttt..",
        "......G.",
      ],
      playerStart: { x: 1, y: 0 },
      goalPos: { x: 6, y: 7 },
    },
  ];

  private seasonColors: Record<Season, { bg: string; ground: string }> = {
    spring: { bg: "#87CEEB", ground: "#90EE90" },
    summer: { bg: "#00BFFF", ground: "#228B22" },
    autumn: { bg: "#DEB887", ground: "#CD853F" },
    winter: { bg: "#B0C4DE", ground: "#F0F8FF" },
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const handleKey = (e: KeyboardEvent) => {
      if (this.status !== "playing") return;

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dy = -1;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dy = 1;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dx = -1;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dx = 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      this.movePlayer(dx, dy);
    };

    window.addEventListener("keydown", handleKey);

    // Touch/click controls
    let touchStart: { x: number; y: number } | null = null;

    this.canvas.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    });

    this.canvas.addEventListener("touchend", (e) => {
      if (!touchStart) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;

      if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.movePlayer(dx > 0 ? 1 : -1, 0);
        } else {
          this.movePlayer(0, dy > 0 ? 1 : -1);
        }
      }
      touchStart = null;
    });
  }

  private movePlayer(dx: number, dy: number) {
    const newX = this.playerPos.x + dx;
    const newY = this.playerPos.y + dy;

    // Check bounds
    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      return;
    }

    // Check obstacles based on season
    if (this.isBlocked(newX, newY)) {
      return;
    }

    this.playerPos.x = newX;
    this.playerPos.y = newY;
    this.moves++;

    if (this.onStateChange) {
      this.onStateChange({ moves: this.moves });
    }

    this.draw();
    this.checkWin();
  }

  private isBlocked(x: number, y: number): boolean {
    for (const obj of this.objects) {
      if (obj.x !== x || obj.y !== y) continue;

      switch (obj.type) {
        case "rock":
          return true;
        case "water":
          // Water is frozen in winter
          return this.currentSeason !== "winter";
        case "flower":
          // Flowers block in spring (blooming)
          return this.currentSeason === "spring";
        case "tree":
          // Trees always block except in winter (leafless)
          return this.currentSeason !== "winter";
        case "leaf":
          // Leaves pile up in autumn
          return this.currentSeason === "autumn";
        case "snow":
          // Snow blocks in winter
          return this.currentSeason === "winter";
      }
    }
    return false;
  }

  public setSeason(season: Season) {
    if (this.status !== "playing") return;

    this.currentSeason = season;
    this.moves++;

    if (this.onStateChange) {
      this.onStateChange({ moves: this.moves, season });
    }

    this.draw();
  }

  private checkWin() {
    if (this.playerPos.x === this.goalPos.x && this.playerPos.y === this.goalPos.y) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.objects = [];
    this.moves = 0;
    this.currentSeason = "spring";
    this.playerPos = { ...config.playerStart };
    this.goalPos = { ...config.goalPos };
    this.gridSize = config.grid.length;

    // Parse grid
    for (let y = 0; y < config.grid.length; y++) {
      for (let x = 0; x < config.grid[y].length; x++) {
        const char = config.grid[y][x];
        switch (char) {
          case "w":
            this.objects.push({ type: "water", x, y });
            break;
          case "f":
            this.objects.push({ type: "flower", x, y });
            break;
          case "t":
            this.objects.push({ type: "tree", x, y });
            break;
          case "r":
            this.objects.push({ type: "rock", x, y });
            break;
          case "l":
            this.objects.push({ type: "leaf", x, y });
            break;
          case "s":
            this.objects.push({ type: "snow", x, y });
            break;
        }
      }
    }

    if (this.onStateChange) {
      this.onStateChange({ moves: 0, season: this.currentSeason });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.cellSize = Math.min(w, h) / this.gridSize;
    const colors = this.seasonColors[this.currentSeason];

    // Sky
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Ground cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        ctx.fillStyle = colors.ground;
        ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
      }
    }

    // Draw objects
    this.objects.forEach((obj) => {
      this.drawObject(ctx, obj);
    });

    // Draw goal
    this.drawGoal(ctx);

    // Draw player
    this.drawPlayer(ctx);
  }

  private drawObject(ctx: CanvasRenderingContext2D, obj: GameObject) {
    const x = obj.x * this.cellSize + this.cellSize / 2;
    const y = obj.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.4;

    switch (obj.type) {
      case "water":
        if (this.currentSeason === "winter") {
          // Frozen - ice
          ctx.fillStyle = "#ADD8E6";
          ctx.fillRect(
            x - size,
            y - size * 0.3,
            size * 2,
            size * 0.6
          );
          ctx.strokeStyle = "#87CEEB";
          ctx.lineWidth = 2;
          ctx.strokeRect(x - size, y - size * 0.3, size * 2, size * 0.6);
        } else {
          // Water waves
          ctx.fillStyle = "#4169E1";
          ctx.beginPath();
          ctx.moveTo(x - size, y);
          ctx.quadraticCurveTo(x - size / 2, y - size / 2, x, y);
          ctx.quadraticCurveTo(x + size / 2, y + size / 2, x + size, y);
          ctx.lineTo(x + size, y + size / 2);
          ctx.lineTo(x - size, y + size / 2);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case "flower":
        if (this.currentSeason === "spring") {
          // Blooming flower
          ctx.fillStyle = "#FF69B4";
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            ctx.beginPath();
            ctx.ellipse(
              x + Math.cos(angle) * size * 0.4,
              y + Math.sin(angle) * size * 0.4,
              size * 0.3,
              size * 0.2,
              angle,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          ctx.fillStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Wilted/dormant
          ctx.fillStyle = "#8B4513";
          ctx.beginPath();
          ctx.moveTo(x, y - size * 0.5);
          ctx.lineTo(x, y + size * 0.5);
          ctx.stroke();
        }
        break;

      case "tree":
        if (this.currentSeason === "winter") {
          // Bare tree
          ctx.strokeStyle = "#8B4513";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, y + size);
          ctx.lineTo(x, y - size * 0.5);
          ctx.moveTo(x, y - size * 0.3);
          ctx.lineTo(x - size * 0.5, y - size * 0.7);
          ctx.moveTo(x, y - size * 0.3);
          ctx.lineTo(x + size * 0.5, y - size * 0.7);
          ctx.stroke();
        } else {
          // Full tree
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(x - size * 0.15, y, size * 0.3, size);

          const leafColor =
            this.currentSeason === "autumn" ? "#FF8C00" : "#228B22";
          ctx.fillStyle = leafColor;
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x - size * 0.7, y + size * 0.2);
          ctx.lineTo(x + size * 0.7, y + size * 0.2);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case "rock":
        ctx.fillStyle = "#696969";
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#808080";
        ctx.beginPath();
        ctx.ellipse(x - size * 0.2, y - size * 0.15, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "leaf":
        if (this.currentSeason === "autumn") {
          // Pile of leaves
          const colors = ["#FF8C00", "#FF6347", "#FFD700"];
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.ellipse(
              x + (Math.random() - 0.5) * size,
              y + (Math.random() - 0.5) * size * 0.5,
              size * 0.3,
              size * 0.2,
              Math.random() * Math.PI,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        } else {
          // No leaves visible
          ctx.fillStyle = "rgba(139, 69, 19, 0.3)";
          ctx.beginPath();
          ctx.ellipse(x, y, size * 0.3, size * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case "snow":
        if (this.currentSeason === "winter") {
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x - size * 0.3, y + size * 0.2, size * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D) {
    const x = this.goalPos.x * this.cellSize + this.cellSize / 2;
    const y = this.goalPos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;

    // Star shape
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * 0.5;
      if (i === 0) {
        ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      } else {
        ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
    }
    ctx.closePath();
    ctx.fill();

    // Glow
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const x = this.playerPos.x * this.cellSize + this.cellSize / 2;
    const y = this.playerPos.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;

    // Body
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(x, y - size * 0.3, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Hat changes with season
    const hatColors: Record<Season, string> = {
      spring: "#FF69B4",
      summer: "#FFD700",
      autumn: "#FF8C00",
      winter: "#1E90FF",
    };

    ctx.fillStyle = hatColors[this.currentSeason];
    ctx.beginPath();
    ctx.moveTo(x - size * 0.4, y - size * 0.3);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size * 0.4, y - size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
    ctx.arc(x + size * 0.15, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.4, size * 0.05, 0, Math.PI * 2);
    ctx.arc(x + size * 0.15, y - size * 0.4, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(x - size * 0.3, y, size * 0.6, size * 0.6);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(400, rect.width - 20);
      this.canvas.width = size;
      this.canvas.height = size;
      this.draw();
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
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

  public getCurrentSeason(): Season {
    return this.currentSeason;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
