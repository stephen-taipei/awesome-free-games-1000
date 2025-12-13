/**
 * Pac-Man Game Engine
 * Game #152
 *
 * Classic Pac-Man - eat dots, avoid ghosts!
 */

interface Point {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right" | "none";

interface Ghost {
  x: number;
  y: number;
  color: string;
  direction: Direction;
  scared: boolean;
}

interface GameState {
  score: number;
  lives: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

// Simple maze: 0=wall, 1=dot, 2=power, 3=empty
const MAZE = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2, 0],
  [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 1, 3, 3, 3, 1, 0, 1, 0, 0, 0],
  [3, 3, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 3, 3],
  [0, 0, 0, 1, 0, 1, 3, 3, 3, 1, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  [0, 2, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const GHOST_COLORS = ["#e74c3c", "#e91e63", "#00bcd4", "#ff9800"];

export class PacManGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze: number[][] = [];
  private pacman: Point = { x: 7, y: 11 };
  private pacmanDir: Direction = "none";
  private nextDir: Direction = "none";
  private ghosts: Ghost[] = [];
  private score = 0;
  private lives = 3;
  private status: "idle" | "playing" | "won" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private mouthAngle = 0;
  private mouthDir = 1;
  private powerTimer = 0;
  private cellSize = 0;
  private lastUpdate = 0;
  private moveTimer = 0;
  private moveInterval = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        lives: this.lives,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = size / MAZE.length;
    this.draw();
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.resetLevel();
    this.status = "playing";
    this.emitState();
    this.lastUpdate = performance.now();
    this.gameLoop();
  }

  private resetLevel() {
    // Copy maze
    this.maze = MAZE.map((row) => [...row]);

    // Reset pacman
    this.pacman = { x: 7, y: 11 };
    this.pacmanDir = "none";
    this.nextDir = "none";

    // Reset ghosts
    this.ghosts = [
      { x: 6, y: 7, color: GHOST_COLORS[0], direction: "up", scared: false },
      { x: 7, y: 7, color: GHOST_COLORS[1], direction: "up", scared: false },
      { x: 8, y: 7, color: GHOST_COLORS[2], direction: "up", scared: false },
    ];

    this.powerTimer = 0;
  }

  setDirection(dir: Direction) {
    if (this.status !== "playing") return;
    this.nextDir = dir;
  }

  private canMove(x: number, y: number): boolean {
    if (x < 0 || x >= MAZE[0].length || y < 0 || y >= MAZE.length) {
      return false;
    }
    return this.maze[y][x] !== 0;
  }

  private gameLoop() {
    const now = performance.now();
    const delta = now - this.lastUpdate;
    this.lastUpdate = now;

    this.update(delta);
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update(delta: number) {
    // Animate mouth
    this.mouthAngle += this.mouthDir * 0.15;
    if (this.mouthAngle > 0.4 || this.mouthAngle < 0) {
      this.mouthDir *= -1;
    }

    // Movement timer
    this.moveTimer += delta;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    // Power pellet timer
    if (this.powerTimer > 0) {
      this.powerTimer -= this.moveInterval;
      if (this.powerTimer <= 0) {
        this.ghosts.forEach((g) => (g.scared = false));
      }
    }

    // Try next direction
    if (this.nextDir !== "none") {
      const nextPos = this.getNextPos(this.pacman, this.nextDir);
      if (this.canMove(nextPos.x, nextPos.y)) {
        this.pacmanDir = this.nextDir;
      }
    }

    // Move pacman
    if (this.pacmanDir !== "none") {
      const nextPos = this.getNextPos(this.pacman, this.pacmanDir);
      if (this.canMove(nextPos.x, nextPos.y)) {
        this.pacman = nextPos;

        // Wrap around
        if (this.pacman.x < 0) this.pacman.x = MAZE[0].length - 1;
        if (this.pacman.x >= MAZE[0].length) this.pacman.x = 0;

        // Eat dots
        const tile = this.maze[this.pacman.y][this.pacman.x];
        if (tile === 1) {
          this.maze[this.pacman.y][this.pacman.x] = 3;
          this.score += 10;
          this.emitState();
        } else if (tile === 2) {
          this.maze[this.pacman.y][this.pacman.x] = 3;
          this.score += 50;
          this.powerTimer = 5000;
          this.ghosts.forEach((g) => (g.scared = true));
          this.emitState();
        }
      }
    }

    // Move ghosts
    this.moveGhosts();

    // Check ghost collision
    for (const ghost of this.ghosts) {
      if (ghost.x === this.pacman.x && ghost.y === this.pacman.y) {
        if (ghost.scared) {
          // Eat ghost
          ghost.x = 7;
          ghost.y = 7;
          ghost.scared = false;
          this.score += 200;
          this.emitState();
        } else {
          // Die
          this.lives--;
          this.emitState();
          if (this.lives <= 0) {
            this.status = "over";
            this.emitState();
          } else {
            this.pacman = { x: 7, y: 11 };
            this.pacmanDir = "none";
          }
          return;
        }
      }
    }

    // Check win
    let dotsRemaining = false;
    for (const row of this.maze) {
      if (row.some((cell) => cell === 1 || cell === 2)) {
        dotsRemaining = true;
        break;
      }
    }
    if (!dotsRemaining) {
      this.status = "won";
      this.emitState();
    }
  }

  private getNextPos(pos: Point, dir: Direction): Point {
    switch (dir) {
      case "up":
        return { x: pos.x, y: pos.y - 1 };
      case "down":
        return { x: pos.x, y: pos.y + 1 };
      case "left":
        return { x: pos.x - 1, y: pos.y };
      case "right":
        return { x: pos.x + 1, y: pos.y };
      default:
        return pos;
    }
  }

  private moveGhosts() {
    const dirs: Direction[] = ["up", "down", "left", "right"];

    for (const ghost of this.ghosts) {
      // Random movement with some chase behavior
      const validDirs = dirs.filter((dir) => {
        const next = this.getNextPos(ghost, dir);
        return this.canMove(next.x, next.y);
      });

      if (validDirs.length > 0) {
        // Prefer chasing pacman if not scared
        if (!ghost.scared && Math.random() > 0.3) {
          const dx = this.pacman.x - ghost.x;
          const dy = this.pacman.y - ghost.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            const preferred = dx > 0 ? "right" : "left";
            if (validDirs.includes(preferred)) {
              ghost.direction = preferred;
            } else {
              ghost.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
            }
          } else {
            const preferred = dy > 0 ? "down" : "up";
            if (validDirs.includes(preferred)) {
              ghost.direction = preferred;
            } else {
              ghost.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
            }
          }
        } else {
          // Random or run away
          ghost.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
        }

        const next = this.getNextPos(ghost, ghost.direction);
        if (this.canMove(next.x, next.y)) {
          ghost.x = next.x;
          ghost.y = next.y;
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // Draw maze
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        const cell = this.maze[y][x];
        const cx = x * this.cellSize + this.cellSize / 2;
        const cy = y * this.cellSize + this.cellSize / 2;

        if (cell === 0) {
          // Wall
          ctx.fillStyle = "#0984e3";
          ctx.fillRect(x * this.cellSize + 2, y * this.cellSize + 2, this.cellSize - 4, this.cellSize - 4);
        } else if (cell === 1) {
          // Dot
          ctx.fillStyle = "#f39c12";
          ctx.beginPath();
          ctx.arc(cx, cy, this.cellSize * 0.1, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 2) {
          // Power pellet
          ctx.fillStyle = "#f39c12";
          ctx.beginPath();
          ctx.arc(cx, cy, this.cellSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Pac-Man
    this.drawPacman();

    // Draw ghosts
    for (const ghost of this.ghosts) {
      this.drawGhost(ghost);
    }
  }

  private drawPacman() {
    const ctx = this.ctx;
    const cx = this.pacman.x * this.cellSize + this.cellSize / 2;
    const cy = this.pacman.y * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.4;

    // Direction angle
    let angle = 0;
    switch (this.pacmanDir) {
      case "right":
        angle = 0;
        break;
      case "down":
        angle = Math.PI / 2;
        break;
      case "left":
        angle = Math.PI;
        break;
      case "up":
        angle = -Math.PI / 2;
        break;
    }

    ctx.fillStyle = "#fdcb6e";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle + this.mouthAngle, angle + Math.PI * 2 - this.mouthAngle);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Eye
    const eyeX = cx + Math.cos(angle - Math.PI / 4) * radius * 0.4;
    const eyeY = cy + Math.sin(angle - Math.PI / 4) * radius * 0.4;
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGhost(ghost: Ghost) {
    const ctx = this.ctx;
    const cx = ghost.x * this.cellSize + this.cellSize / 2;
    const cy = ghost.y * this.cellSize + this.cellSize / 2;
    const radius = this.cellSize * 0.4;

    // Body
    ctx.fillStyle = ghost.scared ? "#3498db" : ghost.color;
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.2, radius, Math.PI, 0);
    ctx.lineTo(cx + radius, cy + radius * 0.6);

    // Wavy bottom
    const waves = 4;
    const waveWidth = (radius * 2) / waves;
    for (let i = waves; i > 0; i--) {
      const wx = cx + radius - i * waveWidth + waveWidth / 2;
      ctx.quadraticCurveTo(wx + waveWidth / 4, cy + radius, wx, cy + radius * 0.6);
    }

    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.arc(cx + radius * 0.3, cy - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    if (ghost.scared) {
      ctx.fillStyle = "white";
    } else {
      ctx.fillStyle = "#2d3436";
      ctx.beginPath();
      ctx.arc(cx - radius * 0.25, cy - radius * 0.3, radius * 0.12, 0, Math.PI * 2);
      ctx.arc(cx + radius * 0.35, cy - radius * 0.3, radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
