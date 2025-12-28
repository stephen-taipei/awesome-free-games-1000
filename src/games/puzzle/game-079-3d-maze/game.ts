/**
 * 3D Maze Game Engine
 * Game #079 - First-person maze exploration using raycasting
 * Sci-Fi Corridor / Cyberpunk Dungeon Theme
 */

interface Player {
  x: number;
  y: number;
  angle: number; // Facing direction in radians
}

interface Level {
  map: number[][];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface GameState {
  level: number;
  maxLevel: number;
  time: string;
  status: "playing" | "won";
  event?: "move" | "turn" | "wallHit" | "portal" | "goalReached" | "victory" | "levelStart" | "reset";
  playerAngle?: number;
}

const LEVELS: Level[] = [
  // Level 1 - Simple maze
  {
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    startX: 1.5,
    startY: 1.5,
    endX: 6.5,
    endY: 6.5,
  },
  // Level 2 - Larger maze
  {
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    startX: 1.5,
    startY: 1.5,
    endX: 8.5,
    endY: 8.5,
  },
  // Level 3 - Complex maze
  {
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    startX: 1.5,
    startY: 1.5,
    endX: 10.5,
    endY: 9.5,
  },
];

export class Maze3DGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  map: number[][] = [];
  mapWidth: number = 0;
  mapHeight: number = 0;

  player: Player = { x: 0, y: 0, angle: 0 };
  endX: number = 0;
  endY: number = 0;

  currentLevel: number = 0;
  startTime: number = 0;
  elapsedTime: number = 0;
  status: "playing" | "won" = "playing";

  // Rendering settings
  fov: number = Math.PI / 3; // 60 degrees
  numRays: number = 120;
  maxDepth: number = 20;

  // Movement
  moveSpeed: number = 0.08;
  rotSpeed: number = 0.05;
  keys: { [key: string]: boolean } = {};

  // Event tracking
  private lastMoveTime: number = 0;
  private lastTurnTime: number = 0;
  private portalProximityEmitted: boolean = false;

  onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.startTime = Date.now();
    this.notifyState("levelStart");
    this.loop();
  }

  public loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex] || LEVELS[0];
    this.map = level.map.map((row) => [...row]);
    this.mapHeight = this.map.length;
    this.mapWidth = this.map[0].length;

    this.player = {
      x: level.startX,
      y: level.startY,
      angle: 0,
    };

    this.endX = level.endX;
    this.endY = level.endY;

    this.status = "playing";
    this.startTime = Date.now();
    this.portalProximityEmitted = false;
    this.notifyState("levelStart");
  }

  private loop = () => {
    if (this.status === "playing") {
      this.update();
      this.elapsedTime = Date.now() - this.startTime;
    }
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    // Handle movement
    let dx = 0;
    let dy = 0;
    let moved = false;
    let turned = false;
    const now = Date.now();

    if (this.keys["w"] || this.keys["ArrowUp"]) {
      dx += Math.cos(this.player.angle) * this.moveSpeed;
      dy += Math.sin(this.player.angle) * this.moveSpeed;
      moved = true;
    }
    if (this.keys["s"] || this.keys["ArrowDown"]) {
      dx -= Math.cos(this.player.angle) * this.moveSpeed;
      dy -= Math.sin(this.player.angle) * this.moveSpeed;
      moved = true;
    }
    if (this.keys["a"] || this.keys["ArrowLeft"]) {
      this.player.angle -= this.rotSpeed;
      turned = true;
    }
    if (this.keys["d"] || this.keys["ArrowRight"]) {
      this.player.angle += this.rotSpeed;
      turned = true;
    }

    // Collision detection
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
    let hitWall = false;

    if (this.map[Math.floor(this.player.y)][Math.floor(newX)] === 0 ||
        this.map[Math.floor(this.player.y)][Math.floor(newX)] === 2) {
      this.player.x = newX;
    } else if (dx !== 0) {
      hitWall = true;
    }

    if (this.map[Math.floor(newY)][Math.floor(this.player.x)] === 0 ||
        this.map[Math.floor(newY)][Math.floor(this.player.x)] === 2) {
      this.player.y = newY;
    } else if (dy !== 0) {
      hitWall = true;
    }

    // Emit events with throttling
    if (moved && now - this.lastMoveTime > 150) {
      this.lastMoveTime = now;
      if (hitWall) {
        this.notifyState("wallHit");
      } else {
        this.notifyState("move");
      }
    }

    if (turned && now - this.lastTurnTime > 100) {
      this.lastTurnTime = now;
      this.notifyState("turn");
    }

    // Check if near portal (exit)
    const distToEnd = Math.hypot(this.player.x - this.endX, this.player.y - this.endY);

    if (distToEnd < 2 && !this.portalProximityEmitted) {
      this.portalProximityEmitted = true;
      this.notifyState("portal");
    } else if (distToEnd >= 2) {
      this.portalProximityEmitted = false;
    }

    // Check if reached end
    if (distToEnd < 0.5) {
      this.status = "won";
      this.notifyState("goalReached");
      setTimeout(() => {
        this.notifyState("victory");
      }, 300);
    }
  }

  public handleKeyDown(key: string) {
    this.keys[key] = true;
  }

  public handleKeyUp(key: string) {
    this.keys[key] = false;
  }

  public move(direction: "up" | "down" | "left" | "right") {
    if (direction === "up") {
      this.keys["w"] = true;
      setTimeout(() => (this.keys["w"] = false), 100);
    } else if (direction === "down") {
      this.keys["s"] = true;
      setTimeout(() => (this.keys["s"] = false), 100);
    } else if (direction === "left") {
      this.keys["a"] = true;
      setTimeout(() => (this.keys["a"] = false), 100);
    } else if (direction === "right") {
      this.keys["d"] = true;
      setTimeout(() => (this.keys["d"] = false), 100);
    }
  }

  private draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear and draw sky/floor with sci-fi gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGradient.addColorStop(0, "#0a0a15");
    skyGradient.addColorStop(1, "#1a1a2e");
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, height / 2);

    const floorGradient = this.ctx.createLinearGradient(0, height / 2, 0, height);
    floorGradient.addColorStop(0, "#1a1a2e");
    floorGradient.addColorStop(1, "#2d2d44");
    this.ctx.fillStyle = floorGradient;
    this.ctx.fillRect(0, height / 2, width, height / 2);

    // Raycasting
    const rayWidth = width / this.numRays;

    for (let i = 0; i < this.numRays; i++) {
      const rayAngle = this.player.angle - this.fov / 2 + (i / this.numRays) * this.fov;
      const { dist, isEnd } = this.castRay(rayAngle);

      // Fix fisheye effect
      const correctedDist = dist * Math.cos(rayAngle - this.player.angle);

      // Calculate wall height
      const wallHeight = Math.min(height, height / correctedDist);

      // Shading based on distance
      const shade = Math.max(0, 1 - correctedDist / this.maxDepth);

      if (isEnd) {
        // Exit portal is neon green/cyan
        const green = Math.floor(100 + shade * 155);
        const cyan = Math.floor(80 + shade * 100);
        this.ctx.fillStyle = `rgb(0, ${green}, ${cyan})`;

        // Add glow effect for portal
        this.ctx.shadowColor = "#00ff88";
        this.ctx.shadowBlur = 15 * shade;
      } else {
        // Walls are cyberpunk blue
        const blue = Math.floor(50 + shade * 150);
        const gray = Math.floor(30 + shade * 80);
        this.ctx.fillStyle = `rgb(${gray}, ${gray + 10}, ${blue})`;
        this.ctx.shadowBlur = 0;
      }

      const wallTop = (height - wallHeight) / 2;
      this.ctx.fillRect(i * rayWidth, wallTop, rayWidth + 1, wallHeight);

      // Add neon edge lighting for depth
      if (shade > 0.3) {
        this.ctx.fillStyle = `rgba(0, 255, 255, ${shade * 0.15})`;
        this.ctx.fillRect(i * rayWidth, wallTop, rayWidth + 1, 2);
        this.ctx.fillStyle = `rgba(0, 200, 255, ${shade * 0.1})`;
        this.ctx.fillRect(i * rayWidth, wallTop + wallHeight - 2, rayWidth + 1, 2);
      }
    }

    this.ctx.shadowBlur = 0;

    // Draw minimap
    this.drawMinimap();

    // Draw crosshair (sci-fi style)
    this.ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    // Horizontal line
    this.ctx.moveTo(width / 2 - 15, height / 2);
    this.ctx.lineTo(width / 2 - 5, height / 2);
    this.ctx.moveTo(width / 2 + 5, height / 2);
    this.ctx.lineTo(width / 2 + 15, height / 2);
    // Vertical line
    this.ctx.moveTo(width / 2, height / 2 - 15);
    this.ctx.lineTo(width / 2, height / 2 - 5);
    this.ctx.moveTo(width / 2, height / 2 + 5);
    this.ctx.lineTo(width / 2, height / 2 + 15);
    // Center dot
    this.ctx.arc(width / 2, height / 2, 2, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private castRay(angle: number): { dist: number; isEnd: boolean } {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    for (let t = 0; t < this.maxDepth; t += 0.02) {
      const x = this.player.x + cos * t;
      const y = this.player.y + sin * t;

      const mapX = Math.floor(x);
      const mapY = Math.floor(y);

      if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) {
        return { dist: t, isEnd: false };
      }

      const cell = this.map[mapY][mapX];
      if (cell === 1) {
        return { dist: t, isEnd: false };
      }
      if (cell === 2) {
        return { dist: t, isEnd: true };
      }
    }

    return { dist: this.maxDepth, isEnd: false };
  }

  private drawMinimap() {
    const scale = 8;
    const offsetX = 10;
    const offsetY = 10;

    // Background with sci-fi border
    this.ctx.fillStyle = "rgba(0, 20, 40, 0.7)";
    this.ctx.fillRect(offsetX - 3, offsetY - 3, this.mapWidth * scale + 6, this.mapHeight * scale + 6);
    this.ctx.strokeStyle = "rgba(0, 255, 255, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(offsetX - 3, offsetY - 3, this.mapWidth * scale + 6, this.mapHeight * scale + 6);

    // Draw map cells
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.map[y][x] === 1) {
          this.ctx.fillStyle = "#3a3a5a";
        } else if (this.map[y][x] === 2) {
          this.ctx.fillStyle = "#00ff88";
        } else {
          this.ctx.fillStyle = "#0a0a15";
        }
        this.ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale - 1, scale - 1);
      }
    }

    // Draw player
    const px = offsetX + this.player.x * scale;
    const py = offsetY + this.player.y * scale;

    this.ctx.fillStyle = "#00ffff";
    this.ctx.beginPath();
    this.ctx.arc(px, py, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw direction with glow
    this.ctx.strokeStyle = "#00ffff";
    this.ctx.shadowColor = "#00ffff";
    this.ctx.shadowBlur = 5;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(px, py);
    this.ctx.lineTo(
      px + Math.cos(this.player.angle) * 12,
      py + Math.sin(this.player.angle) * 12
    );
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.loop();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 400;
      this.numRays = Math.floor(rect.width / 4);
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.notifyState("reset");
    if (this.status !== "playing") {
      this.status = "playing";
      this.loop();
    }
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  private notifyState(event?: GameState["event"]) {
    if (this.onStateChange) {
      const seconds = Math.floor(this.elapsedTime / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.onStateChange({
        level: this.currentLevel + 1,
        maxLevel: LEVELS.length,
        time: `${minutes}:${secs.toString().padStart(2, "0")}`,
        status: this.status,
        event,
        playerAngle: (this.player.angle * 180 / Math.PI) % 360,
      });
    }
  }
}
