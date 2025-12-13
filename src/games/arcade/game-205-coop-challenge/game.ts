/**
 * Co-op Challenge Game Engine
 * Game #205 - Local Multiplayer
 */

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  id: 1 | 2;
  color: string;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Star {
  x: number;
  y: number;
  collected: boolean;
  requiredPlayer?: 1 | 2;
}

interface Switch {
  x: number;
  y: number;
  activated: boolean;
  targetDoor: number;
  color: string;
}

interface Door {
  x: number;
  y: number;
  width: number;
  height: number;
  open: boolean;
  id: number;
}

interface Goal {
  x: number;
  y: number;
  playerId: 1 | 2;
  reached: boolean;
}

interface Level {
  platforms: Platform[];
  stars: Star[];
  switches: Switch[];
  doors: Door[];
  goals: Goal[];
  p1Start: { x: number; y: number };
  p2Start: { x: number; y: number };
  timeLimit: number;
}

type GameStatus = "idle" | "playing" | "won" | "lost";

interface GameState {
  status: GameStatus;
  time: number;
}

const LEVELS: Level[] = [
  // Level 1 - Introduction
  {
    platforms: [
      { x: 0, y: 380, width: 200, height: 20 },
      { x: 300, y: 380, width: 200, height: 20 },
      { x: 200, y: 300, width: 100, height: 15 },
    ],
    stars: [
      { x: 240, y: 270, collected: false },
      { x: 260, y: 270, collected: false },
    ],
    switches: [],
    doors: [],
    goals: [
      { x: 50, y: 350, playerId: 1, reached: false },
      { x: 420, y: 350, playerId: 2, reached: false },
    ],
    p1Start: { x: 50, y: 340 },
    p2Start: { x: 420, y: 340 },
    timeLimit: 30,
  },
  // Level 2 - First Switch
  {
    platforms: [
      { x: 0, y: 380, width: 150, height: 20 },
      { x: 350, y: 380, width: 150, height: 20 },
      { x: 150, y: 300, width: 200, height: 15 },
      { x: 200, y: 200, width: 100, height: 15 },
    ],
    stars: [
      { x: 240, y: 170, collected: false },
      { x: 260, y: 170, collected: false },
    ],
    switches: [{ x: 100, y: 360, activated: false, targetDoor: 0, color: "#ff9800" }],
    doors: [{ x: 150, y: 285, width: 15, height: 95, open: false, id: 0 }],
    goals: [
      { x: 420, y: 350, playerId: 1, reached: false },
      { x: 50, y: 350, playerId: 2, reached: false },
    ],
    p1Start: { x: 50, y: 340 },
    p2Start: { x: 420, y: 340 },
    timeLimit: 45,
  },
  // Level 3 - Double Switch
  {
    platforms: [
      { x: 0, y: 380, width: 100, height: 20 },
      { x: 400, y: 380, width: 100, height: 20 },
      { x: 100, y: 320, width: 120, height: 15 },
      { x: 280, y: 320, width: 120, height: 15 },
      { x: 180, y: 240, width: 140, height: 15 },
      { x: 200, y: 150, width: 100, height: 15 },
    ],
    stars: [
      { x: 130, y: 290, collected: false, requiredPlayer: 1 },
      { x: 370, y: 290, collected: false, requiredPlayer: 2 },
      { x: 240, y: 120, collected: false },
      { x: 260, y: 120, collected: false },
    ],
    switches: [
      { x: 50, y: 360, activated: false, targetDoor: 0, color: "#2196f3" },
      { x: 440, y: 360, activated: false, targetDoor: 1, color: "#f44336" },
    ],
    doors: [
      { x: 280, y: 225, width: 15, height: 95, open: false, id: 0 },
      { x: 200, y: 135, width: 15, height: 105, open: false, id: 1 },
    ],
    goals: [
      { x: 220, y: 120, playerId: 1, reached: false },
      { x: 270, y: 120, playerId: 2, reached: false },
    ],
    p1Start: { x: 30, y: 340 },
    p2Start: { x: 450, y: 340 },
    timeLimit: 60,
  },
  // Level 4 - Complex Paths
  {
    platforms: [
      { x: 0, y: 380, width: 80, height: 20 },
      { x: 420, y: 380, width: 80, height: 20 },
      { x: 80, y: 330, width: 80, height: 15 },
      { x: 340, y: 330, width: 80, height: 15 },
      { x: 180, y: 380, width: 140, height: 20 },
      { x: 120, y: 260, width: 100, height: 15 },
      { x: 280, y: 260, width: 100, height: 15 },
      { x: 180, y: 190, width: 140, height: 15 },
      { x: 200, y: 110, width: 100, height: 15 },
    ],
    stars: [
      { x: 160, y: 230, collected: false, requiredPlayer: 1 },
      { x: 340, y: 230, collected: false, requiredPlayer: 2 },
      { x: 240, y: 160, collected: false },
      { x: 260, y: 160, collected: false },
      { x: 240, y: 80, collected: false },
      { x: 260, y: 80, collected: false },
    ],
    switches: [
      { x: 220, y: 360, activated: false, targetDoor: 0, color: "#9c27b0" },
      { x: 280, y: 360, activated: false, targetDoor: 1, color: "#4caf50" },
    ],
    doors: [
      { x: 180, y: 175, width: 15, height: 85, open: false, id: 0 },
      { x: 305, y: 175, width: 15, height: 85, open: false, id: 1 },
    ],
    goals: [
      { x: 220, y: 80, playerId: 1, reached: false },
      { x: 270, y: 80, playerId: 2, reached: false },
    ],
    p1Start: { x: 30, y: 340 },
    p2Start: { x: 450, y: 340 },
    timeLimit: 75,
  },
  // Level 5 - Final Challenge
  {
    platforms: [
      { x: 0, y: 380, width: 70, height: 20 },
      { x: 430, y: 380, width: 70, height: 20 },
      { x: 100, y: 340, width: 60, height: 15 },
      { x: 340, y: 340, width: 60, height: 15 },
      { x: 180, y: 380, width: 140, height: 20 },
      { x: 70, y: 280, width: 80, height: 15 },
      { x: 350, y: 280, width: 80, height: 15 },
      { x: 180, y: 300, width: 140, height: 15 },
      { x: 120, y: 220, width: 80, height: 15 },
      { x: 300, y: 220, width: 80, height: 15 },
      { x: 200, y: 230, width: 100, height: 15 },
      { x: 150, y: 150, width: 200, height: 15 },
      { x: 200, y: 80, width: 100, height: 15 },
    ],
    stars: [
      { x: 100, y: 250, collected: false, requiredPlayer: 1 },
      { x: 400, y: 250, collected: false, requiredPlayer: 2 },
      { x: 150, y: 200, collected: false, requiredPlayer: 1 },
      { x: 350, y: 200, collected: false, requiredPlayer: 2 },
      { x: 240, y: 200, collected: false },
      { x: 260, y: 200, collected: false },
      { x: 220, y: 120, collected: false },
      { x: 280, y: 120, collected: false },
      { x: 240, y: 50, collected: false },
      { x: 260, y: 50, collected: false },
    ],
    switches: [
      { x: 30, y: 360, activated: false, targetDoor: 0, color: "#ff5722" },
      { x: 460, y: 360, activated: false, targetDoor: 1, color: "#00bcd4" },
      { x: 240, y: 360, activated: false, targetDoor: 2, color: "#ffeb3b" },
    ],
    doors: [
      { x: 180, y: 285, width: 15, height: 95, open: false, id: 0 },
      { x: 305, y: 285, width: 15, height: 95, open: false, id: 1 },
      { x: 200, y: 65, width: 15, height: 85, open: false, id: 2 },
    ],
    goals: [
      { x: 220, y: 50, playerId: 1, reached: false },
      { x: 270, y: 50, playerId: 2, reached: false },
    ],
    p1Start: { x: 20, y: 340 },
    p2Start: { x: 460, y: 340 },
    timeLimit: 90,
  },
];

export class CoopChallengeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 500;
  private height = 400;

  private player1: Player;
  private player2: Player;
  private platforms: Platform[] = [];
  private stars: Star[] = [];
  private switches: Switch[] = [];
  private doors: Door[] = [];
  private goals: Goal[] = [];

  private currentLevel = 0;
  private timeRemaining = 0;
  private status: GameStatus = "idle";
  private animationId = 0;
  private lastTime = 0;

  private keys: Set<string> = new Set();
  private onStateChange?: (state: GameState) => void;

  private readonly GRAVITY = 0.5;
  private readonly JUMP_FORCE = -11;
  private readonly MOVE_SPEED = 4;
  private readonly PLAYER_SIZE = 24;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.player1 = this.createPlayer(1, 50, 340, "#2196f3");
    this.player2 = this.createPlayer(2, 420, 340, "#f44336");

    this.setupInput();
    this.loadLevel(0);
    this.draw();
  }

  private createPlayer(
    id: 1 | 2,
    x: number,
    y: number,
    color: string
  ): Player {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      width: this.PLAYER_SIZE,
      height: this.PLAYER_SIZE,
      onGround: false,
      id,
      color,
    };
  }

  private setupInput() {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if (["w", "arrowup", " "].includes(key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  private loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex];
    this.platforms = level.platforms.map((p) => ({ ...p }));
    this.stars = level.stars.map((s) => ({ ...s, collected: false }));
    this.switches = level.switches.map((s) => ({ ...s, activated: false }));
    this.doors = level.doors.map((d) => ({ ...d, open: false }));
    this.goals = level.goals.map((g) => ({ ...g, reached: false }));

    this.player1 = this.createPlayer(1, level.p1Start.x, level.p1Start.y, "#2196f3");
    this.player2 = this.createPlayer(2, level.p2Start.x, level.p2Start.y, "#f44336");

    this.timeRemaining = level.timeLimit;
  }

  setOnStateChange(callback: (state: GameState) => void) {
    this.onStateChange = callback;
  }

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const maxWidth = Math.min(container.clientWidth - 20, 500);
    const scale = maxWidth / this.width;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width * scale}px`;
    this.canvas.style.height = `${this.height * scale}px`;

    this.draw();
  }

  start() {
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.lastTime = Date.now();
    this.gameLoop();
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.currentLevel = 0;
    this.status = "idle";
    this.loadLevel(0);
    this.draw();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.status = "playing";
      this.lastTime = Date.now();
      this.gameLoop();
    }
  }

  getLevel(): number {
    return this.currentLevel + 1;
  }

  getTime(): number {
    return Math.ceil(this.timeRemaining);
  }

  hasMoreLevels(): boolean {
    return this.currentLevel < LEVELS.length - 1;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = Date.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Update timer
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.status = "lost";
      this.onStateChange?.({ status: "lost", time: 0 });
      return;
    }

    this.onStateChange?.({ status: "playing", time: Math.ceil(this.timeRemaining) });

    // Player 1 controls (WASD)
    if (this.keys.has("a")) {
      this.player1.vx = -this.MOVE_SPEED;
    } else if (this.keys.has("d")) {
      this.player1.vx = this.MOVE_SPEED;
    } else {
      this.player1.vx = 0;
    }

    if (this.keys.has("w") && this.player1.onGround) {
      this.player1.vy = this.JUMP_FORCE;
      this.player1.onGround = false;
    }

    // Player 2 controls (Arrow keys)
    if (this.keys.has("arrowleft")) {
      this.player2.vx = -this.MOVE_SPEED;
    } else if (this.keys.has("arrowright")) {
      this.player2.vx = this.MOVE_SPEED;
    } else {
      this.player2.vx = 0;
    }

    if (this.keys.has("arrowup") && this.player2.onGround) {
      this.player2.vy = this.JUMP_FORCE;
      this.player2.onGround = false;
    }

    // Update physics
    this.updatePlayer(this.player1);
    this.updatePlayer(this.player2);

    // Check switches
    this.checkSwitches();

    // Check star collection
    this.checkStars();

    // Check goals
    this.checkGoals();

    // Check win condition
    if (this.goals.every((g) => g.reached)) {
      this.status = "won";
      this.onStateChange?.({ status: "won", time: Math.ceil(this.timeRemaining) });
    }
  }

  private updatePlayer(player: Player) {
    // Apply gravity
    player.vy += this.GRAVITY;

    // Update position
    player.x += player.vx;
    player.y += player.vy;

    // Platform collision
    player.onGround = false;

    // Check closed doors as platforms
    const allObstacles = [
      ...this.platforms,
      ...this.doors.filter((d) => !d.open),
    ];

    for (const platform of allObstacles) {
      if (this.checkCollision(player, platform)) {
        // Landing on top
        if (
          player.vy > 0 &&
          player.y + player.height - player.vy <= platform.y + 5
        ) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.onGround = true;
        }
        // Hitting from below
        else if (
          player.vy < 0 &&
          player.y - player.vy >= platform.y + platform.height - 5
        ) {
          player.y = platform.y + platform.height;
          player.vy = 0;
        }
        // Side collision
        else {
          if (player.vx > 0) {
            player.x = platform.x - player.width;
          } else if (player.vx < 0) {
            player.x = platform.x + platform.width;
          }
          player.vx = 0;
        }
      }
    }

    // Boundary collision
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > this.width) player.x = this.width - player.width;
    if (player.y + player.height > this.height) {
      player.y = this.height - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }

  private checkCollision(
    player: Player,
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      player.x < rect.x + rect.width &&
      player.x + player.width > rect.x &&
      player.y < rect.y + rect.height &&
      player.y + player.height > rect.y
    );
  }

  private checkSwitches() {
    for (const sw of this.switches) {
      const p1OnSwitch = this.isPlayerOnSwitch(this.player1, sw);
      const p2OnSwitch = this.isPlayerOnSwitch(this.player2, sw);

      const wasActivated = sw.activated;
      sw.activated = p1OnSwitch || p2OnSwitch;

      // Update corresponding door
      const door = this.doors.find((d) => d.id === sw.targetDoor);
      if (door) {
        door.open = sw.activated;
      }
    }
  }

  private isPlayerOnSwitch(player: Player, sw: Switch): boolean {
    const switchRect = { x: sw.x - 15, y: sw.y - 5, width: 30, height: 10 };
    return (
      player.x < switchRect.x + switchRect.width &&
      player.x + player.width > switchRect.x &&
      player.y + player.height >= switchRect.y &&
      player.y + player.height <= switchRect.y + switchRect.height + 10
    );
  }

  private checkStars() {
    for (const star of this.stars) {
      if (star.collected) continue;

      const checkPlayer = (player: Player) => {
        if (star.requiredPlayer && star.requiredPlayer !== player.id) return false;

        const dx = player.x + player.width / 2 - star.x;
        const dy = player.y + player.height / 2 - star.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 25;
      };

      if (checkPlayer(this.player1) || checkPlayer(this.player2)) {
        star.collected = true;
      }
    }
  }

  private checkGoals() {
    for (const goal of this.goals) {
      const player = goal.playerId === 1 ? this.player1 : this.player2;
      const dx = player.x + player.width / 2 - (goal.x + 15);
      const dy = player.y + player.height / 2 - (goal.y + 15);
      const dist = Math.sqrt(dx * dx + dy * dy);

      goal.reached = dist < 25;
    }
  }

  private draw() {
    const ctx = this.ctx;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw platforms
    for (const platform of this.platforms) {
      this.drawPlatform(platform);
    }

    // Draw doors
    for (const door of this.doors) {
      this.drawDoor(door);
    }

    // Draw switches
    for (const sw of this.switches) {
      this.drawSwitch(sw);
    }

    // Draw goals
    for (const goal of this.goals) {
      this.drawGoal(goal);
    }

    // Draw stars
    for (const star of this.stars) {
      if (!star.collected) {
        this.drawStar(star);
      }
    }

    // Draw players
    this.drawPlayer(this.player1);
    this.drawPlayer(this.player2);
  }

  private drawPlatform(platform: Platform) {
    const ctx = this.ctx;

    ctx.fillStyle = "#444";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    // Top highlight
    ctx.fillStyle = "#666";
    ctx.fillRect(platform.x, platform.y, platform.width, 3);
  }

  private drawDoor(door: Door) {
    const ctx = this.ctx;

    if (door.open) {
      // Open door - transparent
      ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#666";
      ctx.strokeRect(door.x, door.y, door.width, door.height);
      ctx.setLineDash([]);
    } else {
      // Closed door - solid
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(door.x, door.y, door.width, door.height);
      ctx.strokeStyle = "#5d2e0c";
      ctx.lineWidth = 2;
      ctx.strokeRect(door.x, door.y, door.width, door.height);
    }
  }

  private drawSwitch(sw: Switch) {
    const ctx = this.ctx;

    // Base
    ctx.fillStyle = "#333";
    ctx.fillRect(sw.x - 20, sw.y, 40, 8);

    // Button
    ctx.fillStyle = sw.activated ? "#4caf50" : sw.color;
    const buttonY = sw.activated ? sw.y - 3 : sw.y - 8;
    ctx.beginPath();
    ctx.arc(sw.x, buttonY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Glow when activated
    if (sw.activated) {
      ctx.fillStyle = "rgba(76, 175, 80, 0.3)";
      ctx.beginPath();
      ctx.arc(sw.x, buttonY, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGoal(goal: Goal) {
    const ctx = this.ctx;
    const x = goal.x + 15;
    const y = goal.y + 15;
    const color = goal.playerId === 1 ? "#2196f3" : "#f44336";

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 25);
    glow.addColorStop(0, goal.reached ? "rgba(76, 175, 80, 0.6)" : `${color}44`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Flag pole
    ctx.fillStyle = "#888";
    ctx.fillRect(goal.x + 12, goal.y, 6, 30);

    // Flag
    ctx.fillStyle = goal.reached ? "#4caf50" : color;
    ctx.beginPath();
    ctx.moveTo(goal.x + 18, goal.y);
    ctx.lineTo(goal.x + 35, goal.y + 8);
    ctx.lineTo(goal.x + 18, goal.y + 16);
    ctx.closePath();
    ctx.fill();

    // Player indicator
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`P${goal.playerId}`, x, goal.y + 38);
  }

  private drawStar(star: Star) {
    const ctx = this.ctx;
    const x = star.x;
    const y = star.y;
    const pulse = Math.sin(Date.now() / 200) * 2;

    // Player-specific coloring
    let color = "#ffd700";
    if (star.requiredPlayer === 1) color = "#64b5f6";
    if (star.requiredPlayer === 2) color = "#ef9a9a";

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 15 + pulse);
    glow.addColorStop(0, color + "88");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 15 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Star shape
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? 10 : 5;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Player indicator for required stars
    if (star.requiredPlayer) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`P${star.requiredPlayer}`, x, y + 20);
    }
  }

  private drawPlayer(player: Player) {
    const ctx = this.ctx;
    const x = player.x + player.width / 2;
    const y = player.y + player.height / 2;

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, player.width);
    glow.addColorStop(0, player.color + "44");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, player.width, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.width, player.height, 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = player.id === 1 ? "#64b5f6" : "#ef9a9a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#fff";
    const eyeY = player.y + 8;
    ctx.beginPath();
    ctx.arc(player.x + 7, eyeY, 4, 0, Math.PI * 2);
    ctx.arc(player.x + 17, eyeY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(player.x + 8, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 18, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Player number
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`P${player.id}`, x, player.y - 5);
  }
}
