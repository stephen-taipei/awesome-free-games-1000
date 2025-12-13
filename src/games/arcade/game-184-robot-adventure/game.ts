/**
 * Robot Adventure Game Logic
 * Game #184 - Platform Action Game
 */

interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "moving" | "crumbling";
  moveRange?: number;
  moveSpeed?: number;
  originalX?: number;
  crumbleTimer?: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Goal {
  x: number;
  y: number;
}

interface Level {
  platforms: Platform[];
  coins: Coin[];
  goal: Goal;
  playerStart: { x: number; y: number };
}

interface GameState {
  level: number;
  coins: number;
  lives: number;
  status: "idle" | "playing" | "won" | "complete" | "gameOver";
}

type StateChangeCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;

const LEVELS: Level[] = [
  {
    platforms: [
      { x: 0, y: 350, width: 200, type: "normal" },
      { x: 250, y: 300, width: 100, type: "normal" },
      { x: 400, y: 250, width: 100, type: "normal" },
    ],
    coins: [
      { x: 270, y: 260, collected: false },
      { x: 420, y: 210, collected: false },
    ],
    goal: { x: 440, y: 200 },
    playerStart: { x: 50, y: 300 },
  },
  {
    platforms: [
      { x: 0, y: 380, width: 120, type: "normal" },
      { x: 150, y: 320, width: 80, type: "moving", moveRange: 100, moveSpeed: 2 },
      { x: 350, y: 260, width: 100, type: "normal" },
      { x: 400, y: 180, width: 100, type: "normal" },
    ],
    coins: [
      { x: 180, y: 270, collected: false },
      { x: 370, y: 220, collected: false },
      { x: 440, y: 130, collected: false },
    ],
    goal: { x: 430, y: 130 },
    playerStart: { x: 40, y: 330 },
  },
  {
    platforms: [
      { x: 0, y: 380, width: 100, type: "normal" },
      { x: 130, y: 340, width: 80, type: "crumbling" },
      { x: 240, y: 280, width: 80, type: "normal" },
      { x: 200, y: 200, width: 80, type: "moving", moveRange: 150, moveSpeed: 3 },
      { x: 400, y: 150, width: 100, type: "normal" },
    ],
    coins: [
      { x: 155, y: 290, collected: false },
      { x: 260, y: 230, collected: false },
      { x: 230, y: 150, collected: false },
      { x: 440, y: 100, collected: false },
    ],
    goal: { x: 430, y: 100 },
    playerStart: { x: 30, y: 330 },
  },
];

export class RobotAdventureGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private platforms: Platform[] = [];
  private coins: Coin[] = [];
  private goal: Goal = { x: 0, y: 0 };

  private playerX: number = 0;
  private playerY: number = 0;
  private playerVX: number = 0;
  private playerVY: number = 0;
  private isGrounded: boolean = false;
  private totalCoins: number = 0;
  private lives: number = 3;

  private keys: Set<string> = new Set();
  private isPlaying: boolean = false;
  private animationId: number = 0;

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
    this.platforms = level.platforms.map((p) => ({
      ...p,
      originalX: p.x,
      crumbleTimer: undefined,
    }));
    this.coins = level.coins.map((c) => ({ ...c, collected: false }));
    this.goal = { ...level.goal };
    this.playerX = level.playerStart.x;
    this.playerY = level.playerStart.y;
    this.playerVX = 0;
    this.playerVY = 0;
    this.isGrounded = false;

    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        coins: this.totalCoins,
        lives: this.lives,
        status: this.getStatus(),
      });
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" | "gameOver" {
    if (!this.isPlaying) return "idle";
    if (this.lives <= 0) return "gameOver";
    // Check if reached goal
    const dx = this.playerX + PLAYER_WIDTH / 2 - this.goal.x;
    const dy = this.playerY + PLAYER_HEIGHT / 2 - this.goal.y;
    if (Math.sqrt(dx * dx + dy * dy) < 30) {
      if (this.currentLevel >= LEVELS.length - 1) return "complete";
      return "won";
    }
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.currentLevel = 0;
    this.totalCoins = 0;
    this.lives = 3;
    this.initLevel();
    this.gameLoop();
  }

  reset() {
    this.initLevel();
  }

  restart() {
    this.currentLevel = 0;
    this.totalCoins = 0;
    this.lives = 3;
    this.isPlaying = false;
    this.draw();
    this.emitState();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.initLevel();
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  handleKeyDown(key: string) {
    this.keys.add(key);
    if ((key === " " || key === "ArrowUp" || key === "w" || key === "W") && this.isGrounded) {
      this.playerVY = JUMP_FORCE;
      this.isGrounded = false;
    }
  }

  handleKeyUp(key: string) {
    this.keys.delete(key);
  }

  private gameLoop() {
    if (!this.isPlaying) return;

    this.update();
    this.draw();

    const status = this.getStatus();
    if (status === "won" || status === "complete" || status === "gameOver") {
      this.emitState();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Handle input
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.playerVX = -MOVE_SPEED;
    } else if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.playerVX = MOVE_SPEED;
    } else {
      this.playerVX = 0;
    }

    // Apply gravity
    this.playerVY += GRAVITY;

    // Update position
    this.playerX += this.playerVX;
    this.playerY += this.playerVY;

    // Update moving platforms
    for (const platform of this.platforms) {
      if (platform.type === "moving" && platform.originalX !== undefined) {
        platform.x += platform.moveSpeed || 2;
        if (
          platform.x > platform.originalX + (platform.moveRange || 100) ||
          platform.x < platform.originalX
        ) {
          platform.moveSpeed = -(platform.moveSpeed || 2);
        }
      }

      // Update crumbling platforms
      if (platform.type === "crumbling" && platform.crumbleTimer !== undefined) {
        platform.crumbleTimer--;
        if (platform.crumbleTimer <= 0) {
          platform.y = 9999; // Move off screen
        }
      }
    }

    // Platform collision
    this.isGrounded = false;
    for (const platform of this.platforms) {
      if (platform.y > 9000) continue; // Skip fallen platforms

      if (
        this.playerX + PLAYER_WIDTH > platform.x &&
        this.playerX < platform.x + platform.width &&
        this.playerY + PLAYER_HEIGHT > platform.y &&
        this.playerY + PLAYER_HEIGHT < platform.y + 20 &&
        this.playerVY >= 0
      ) {
        this.playerY = platform.y - PLAYER_HEIGHT;
        this.playerVY = 0;
        this.isGrounded = true;

        // Start crumbling
        if (platform.type === "crumbling" && platform.crumbleTimer === undefined) {
          platform.crumbleTimer = 30;
        }

        // Move with platform
        if (platform.type === "moving") {
          this.playerX += platform.moveSpeed || 0;
        }
      }
    }

    // Wall boundaries
    if (this.playerX < 0) this.playerX = 0;
    if (this.playerX + PLAYER_WIDTH > this.width) this.playerX = this.width - PLAYER_WIDTH;

    // Fall death
    if (this.playerY > this.height + 50) {
      this.lives--;
      if (this.lives > 0) {
        this.initLevel();
      }
      this.emitState();
    }

    // Collect coins
    for (const coin of this.coins) {
      if (coin.collected) continue;
      const dx = this.playerX + PLAYER_WIDTH / 2 - coin.x;
      const dy = this.playerY + PLAYER_HEIGHT / 2 - coin.y;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        coin.collected = true;
        this.totalCoins++;
        this.emitState();
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isPlaying && this.lives > 0) {
      ctx.fillStyle = "#00FF87";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Robot Adventure", this.width / 2, this.height / 2);
      return;
    }

    // Draw platforms
    for (const platform of this.platforms) {
      if (platform.y > 9000) continue;
      this.drawPlatform(platform);
    }

    // Draw coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        this.drawCoin(coin.x, coin.y);
      }
    }

    // Draw goal
    this.drawGoal();

    // Draw player
    this.drawRobot();
  }

  private drawPlatform(platform: Platform) {
    const ctx = this.ctx;

    let color = "#4a6fa5";
    if (platform.type === "moving") color = "#9b59b6";
    if (platform.type === "crumbling") {
      color = platform.crumbleTimer !== undefined ? "#e74c3c" : "#e67e22";
    }

    ctx.fillStyle = color;
    ctx.fillRect(platform.x, platform.y, platform.width, 15);

    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(platform.x, platform.y + 15, platform.width, 5);
  }

  private drawCoin(x: number, y: number) {
    const ctx = this.ctx;

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFA500";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", x, y);
  }

  private drawGoal() {
    const ctx = this.ctx;
    const { x, y } = this.goal;

    // Flag pole
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x - 3, y, 6, 50);

    // Flag
    ctx.fillStyle = "#00FF87";
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x + 35, y + 15);
    ctx.lineTo(x + 3, y + 30);
    ctx.closePath();
    ctx.fill();

    // Star on flag
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", x + 18, y + 15);
  }

  private drawRobot() {
    const ctx = this.ctx;
    const x = this.playerX;
    const y = this.playerY;

    // Body
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(x + 5, y + 15, PLAYER_WIDTH - 10, PLAYER_HEIGHT - 20);

    // Head
    ctx.fillStyle = "#95a5a6";
    ctx.fillRect(x + 3, y, PLAYER_WIDTH - 6, 18);

    // Eyes
    ctx.fillStyle = "#00FF87";
    ctx.fillRect(x + 8, y + 5, 5, 5);
    ctx.fillRect(x + 17, y + 5, 5, 5);

    // Antenna
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(x + PLAYER_WIDTH / 2, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(x + PLAYER_WIDTH / 2 - 1, y - 5, 2, 8);

    // Arms
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(x - 3, y + 18, 8, 15);
    ctx.fillRect(x + PLAYER_WIDTH - 5, y + 18, 8, 15);

    // Legs
    ctx.fillStyle = "#5d6d7e";
    ctx.fillRect(x + 7, y + PLAYER_HEIGHT - 8, 6, 8);
    ctx.fillRect(x + PLAYER_WIDTH - 13, y + PLAYER_HEIGHT - 8, 6, 8);
  }
}
