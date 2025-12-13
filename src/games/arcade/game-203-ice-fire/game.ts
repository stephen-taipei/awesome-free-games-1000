/**
 * Ice & Fire Game Engine
 * Game #203 - Dual Control Platformer
 */

interface Character {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  type: "ice" | "fire";
  reachedGoal: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "normal" | "ice" | "fire" | "water" | "lava";
}

interface Gem {
  x: number;
  y: number;
  type: "ice" | "fire";
  collected: boolean;
}

interface Goal {
  x: number;
  y: number;
  type: "ice" | "fire";
}

interface Level {
  platforms: Platform[];
  gems: Gem[];
  goals: Goal[];
  iceStart: { x: number; y: number };
  fireStart: { x: number; y: number };
}

type GameStatus = "idle" | "playing" | "won" | "lost";

interface GameState {
  status: GameStatus;
  gems: number;
}

const LEVELS: Level[] = [
  // Level 1 - Introduction
  {
    platforms: [
      { x: 0, y: 380, width: 500, height: 20, type: "normal" },
      { x: 100, y: 300, width: 100, height: 15, type: "normal" },
      { x: 300, y: 300, width: 100, height: 15, type: "normal" },
    ],
    gems: [
      { x: 140, y: 270, type: "ice", collected: false },
      { x: 340, y: 270, type: "fire", collected: false },
    ],
    goals: [
      { x: 50, y: 350, type: "ice" },
      { x: 420, y: 350, type: "fire" },
    ],
    iceStart: { x: 50, y: 340 },
    fireStart: { x: 420, y: 340 },
  },
  // Level 2 - Hazards
  {
    platforms: [
      { x: 0, y: 380, width: 150, height: 20, type: "normal" },
      { x: 150, y: 380, width: 50, height: 20, type: "water" },
      { x: 200, y: 380, width: 100, height: 20, type: "normal" },
      { x: 300, y: 380, width: 50, height: 20, type: "lava" },
      { x: 350, y: 380, width: 150, height: 20, type: "normal" },
      { x: 150, y: 280, width: 80, height: 15, type: "ice" },
      { x: 270, y: 280, width: 80, height: 15, type: "fire" },
    ],
    gems: [
      { x: 180, y: 250, type: "ice", collected: false },
      { x: 300, y: 250, type: "fire", collected: false },
    ],
    goals: [
      { x: 420, y: 350, type: "ice" },
      { x: 50, y: 350, type: "fire" },
    ],
    iceStart: { x: 50, y: 340 },
    fireStart: { x: 420, y: 340 },
  },
  // Level 3 - Coordination
  {
    platforms: [
      { x: 0, y: 380, width: 120, height: 20, type: "normal" },
      { x: 380, y: 380, width: 120, height: 20, type: "normal" },
      { x: 180, y: 320, width: 140, height: 15, type: "normal" },
      { x: 100, y: 250, width: 80, height: 15, type: "ice" },
      { x: 320, y: 250, width: 80, height: 15, type: "fire" },
      { x: 200, y: 180, width: 100, height: 15, type: "normal" },
      { x: 120, y: 380, width: 60, height: 20, type: "lava" },
      { x: 320, y: 380, width: 60, height: 20, type: "water" },
    ],
    gems: [
      { x: 130, y: 220, type: "ice", collected: false },
      { x: 350, y: 220, type: "fire", collected: false },
      { x: 240, y: 150, type: "ice", collected: false },
      { x: 260, y: 150, type: "fire", collected: false },
    ],
    goals: [
      { x: 420, y: 350, type: "ice" },
      { x: 50, y: 350, type: "fire" },
    ],
    iceStart: { x: 50, y: 340 },
    fireStart: { x: 420, y: 340 },
  },
  // Level 4 - Advanced
  {
    platforms: [
      { x: 0, y: 380, width: 80, height: 20, type: "normal" },
      { x: 420, y: 380, width: 80, height: 20, type: "normal" },
      { x: 80, y: 380, width: 40, height: 20, type: "water" },
      { x: 380, y: 380, width: 40, height: 20, type: "lava" },
      { x: 120, y: 380, width: 260, height: 20, type: "normal" },
      { x: 60, y: 300, width: 80, height: 15, type: "fire" },
      { x: 360, y: 300, width: 80, height: 15, type: "ice" },
      { x: 180, y: 250, width: 140, height: 15, type: "normal" },
      { x: 120, y: 180, width: 60, height: 15, type: "ice" },
      { x: 320, y: 180, width: 60, height: 15, type: "fire" },
      { x: 200, y: 120, width: 100, height: 15, type: "normal" },
    ],
    gems: [
      { x: 140, y: 150, type: "ice", collected: false },
      { x: 340, y: 150, type: "fire", collected: false },
      { x: 240, y: 90, type: "ice", collected: false },
      { x: 260, y: 90, type: "fire", collected: false },
    ],
    goals: [
      { x: 200, y: 90, type: "ice" },
      { x: 270, y: 90, type: "fire" },
    ],
    iceStart: { x: 30, y: 340 },
    fireStart: { x: 450, y: 340 },
  },
  // Level 5 - Final
  {
    platforms: [
      { x: 0, y: 380, width: 70, height: 20, type: "normal" },
      { x: 430, y: 380, width: 70, height: 20, type: "normal" },
      { x: 70, y: 380, width: 30, height: 20, type: "lava" },
      { x: 400, y: 380, width: 30, height: 20, type: "water" },
      { x: 100, y: 380, width: 300, height: 20, type: "normal" },
      { x: 50, y: 310, width: 60, height: 15, type: "ice" },
      { x: 390, y: 310, width: 60, height: 15, type: "fire" },
      { x: 150, y: 280, width: 80, height: 15, type: "fire" },
      { x: 270, y: 280, width: 80, height: 15, type: "ice" },
      { x: 200, y: 210, width: 100, height: 15, type: "normal" },
      { x: 80, y: 160, width: 70, height: 15, type: "fire" },
      { x: 350, y: 160, width: 70, height: 15, type: "ice" },
      { x: 190, y: 100, width: 120, height: 15, type: "normal" },
    ],
    gems: [
      { x: 70, y: 280, type: "ice", collected: false },
      { x: 410, y: 280, type: "fire", collected: false },
      { x: 180, y: 250, type: "fire", collected: false },
      { x: 300, y: 250, type: "ice", collected: false },
      { x: 100, y: 130, type: "fire", collected: false },
      { x: 370, y: 130, type: "ice", collected: false },
    ],
    goals: [
      { x: 210, y: 70, type: "ice" },
      { x: 270, y: 70, type: "fire" },
    ],
    iceStart: { x: 30, y: 340 },
    fireStart: { x: 450, y: 340 },
  },
];

export class IceFireGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 500;
  private height = 400;

  private ice: Character;
  private fire: Character;
  private platforms: Platform[] = [];
  private gems: Gem[] = [];
  private goals: Goal[] = [];

  private currentLevel = 0;
  private totalGems = 0;
  private status: GameStatus = "idle";
  private animationId = 0;

  private keys: Set<string> = new Set();
  private onStateChange?: (state: GameState) => void;

  private readonly GRAVITY = 0.5;
  private readonly JUMP_FORCE = -12;
  private readonly MOVE_SPEED = 4;
  private readonly CHAR_SIZE = 24;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.ice = this.createCharacter("ice", 50, 340);
    this.fire = this.createCharacter("fire", 420, 340);

    this.setupInput();
    this.loadLevel(0);
    this.draw();
  }

  private createCharacter(
    type: "ice" | "fire",
    x: number,
    y: number
  ): Character {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      width: this.CHAR_SIZE,
      height: this.CHAR_SIZE,
      onGround: false,
      type,
      reachedGoal: false,
    };
  }

  private setupInput() {
    const handleKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      if (["w", "arrowup", " "].includes(e.key.toLowerCase())) {
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
    this.gems = level.gems.map((g) => ({ ...g, collected: false }));
    this.goals = level.goals.map((g) => ({ ...g }));

    this.ice = this.createCharacter("ice", level.iceStart.x, level.iceStart.y);
    this.fire = this.createCharacter(
      "fire",
      level.fireStart.x,
      level.fireStart.y
    );

    this.totalGems = 0;
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
      this.gameLoop();
    }
  }

  getLevel(): number {
    return this.currentLevel + 1;
  }

  getGems(): number {
    return this.totalGems;
  }

  hasMoreLevels(): boolean {
    return this.currentLevel < LEVELS.length - 1;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Handle input for Ice (A/D/W)
    if (!this.ice.reachedGoal) {
      if (this.keys.has("a")) {
        this.ice.vx = -this.MOVE_SPEED;
      } else if (this.keys.has("d")) {
        this.ice.vx = this.MOVE_SPEED;
      } else {
        this.ice.vx = 0;
      }

      if (this.keys.has("w") && this.ice.onGround) {
        this.ice.vy = this.JUMP_FORCE;
        this.ice.onGround = false;
      }
    }

    // Handle input for Fire (Arrow keys)
    if (!this.fire.reachedGoal) {
      if (this.keys.has("arrowleft")) {
        this.fire.vx = -this.MOVE_SPEED;
      } else if (this.keys.has("arrowright")) {
        this.fire.vx = this.MOVE_SPEED;
      } else {
        this.fire.vx = 0;
      }

      if (this.keys.has("arrowup") && this.fire.onGround) {
        this.fire.vy = this.JUMP_FORCE;
        this.fire.onGround = false;
      }
    }

    // Update physics
    this.updateCharacter(this.ice);
    this.updateCharacter(this.fire);

    // Check gem collection
    this.checkGemCollection();

    // Check goals
    this.checkGoals();

    // Check hazards
    if (this.checkHazards()) {
      this.status = "lost";
      this.onStateChange?.({ status: "lost", gems: this.totalGems });
    }

    // Check win condition
    if (this.ice.reachedGoal && this.fire.reachedGoal) {
      this.status = "won";
      this.onStateChange?.({ status: "won", gems: this.totalGems });
    }
  }

  private updateCharacter(char: Character) {
    if (char.reachedGoal) return;

    // Apply gravity
    char.vy += this.GRAVITY;

    // Update position
    char.x += char.vx;
    char.y += char.vy;

    // Platform collision
    char.onGround = false;
    for (const platform of this.platforms) {
      if (this.checkCollision(char, platform)) {
        // Check if landing on top
        if (
          char.vy > 0 &&
          char.y + char.height - char.vy <= platform.y + 5
        ) {
          char.y = platform.y - char.height;
          char.vy = 0;
          char.onGround = true;
        }
        // Check if hitting from below
        else if (
          char.vy < 0 &&
          char.y - char.vy >= platform.y + platform.height - 5
        ) {
          char.y = platform.y + platform.height;
          char.vy = 0;
        }
        // Side collision
        else {
          if (char.vx > 0) {
            char.x = platform.x - char.width;
          } else if (char.vx < 0) {
            char.x = platform.x + platform.width;
          }
          char.vx = 0;
        }
      }
    }

    // Boundary collision
    if (char.x < 0) char.x = 0;
    if (char.x + char.width > this.width) char.x = this.width - char.width;
    if (char.y + char.height > this.height) {
      char.y = this.height - char.height;
      char.vy = 0;
      char.onGround = true;
    }
  }

  private checkCollision(
    char: Character,
    platform: Platform
  ): boolean {
    return (
      char.x < platform.x + platform.width &&
      char.x + char.width > platform.x &&
      char.y < platform.y + platform.height &&
      char.y + char.height > platform.y
    );
  }

  private checkGemCollection() {
    for (const gem of this.gems) {
      if (gem.collected) continue;

      const char = gem.type === "ice" ? this.ice : this.fire;
      const dx = char.x + char.width / 2 - gem.x;
      const dy = char.y + char.height / 2 - gem.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 20) {
        gem.collected = true;
        this.totalGems++;
        this.onStateChange?.({ status: "playing", gems: this.totalGems });
      }
    }
  }

  private checkGoals() {
    for (const goal of this.goals) {
      const char = goal.type === "ice" ? this.ice : this.fire;
      const dx = char.x + char.width / 2 - (goal.x + 15);
      const dy = char.y + char.height / 2 - (goal.y + 15);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        char.reachedGoal = true;
      }
    }
  }

  private checkHazards(): boolean {
    for (const platform of this.platforms) {
      // Ice dies in lava
      if (platform.type === "lava" && this.checkCollision(this.ice, platform)) {
        return true;
      }
      // Fire dies in water
      if (platform.type === "water" && this.checkCollision(this.fire, platform)) {
        return true;
      }
    }
    return false;
  }

  private draw() {
    const ctx = this.ctx;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw platforms
    for (const platform of this.platforms) {
      this.drawPlatform(platform);
    }

    // Draw goals
    for (const goal of this.goals) {
      this.drawGoal(goal);
    }

    // Draw gems
    for (const gem of this.gems) {
      if (!gem.collected) {
        this.drawGem(gem);
      }
    }

    // Draw characters
    this.drawCharacter(this.ice);
    this.drawCharacter(this.fire);
  }

  private drawPlatform(platform: Platform) {
    const ctx = this.ctx;

    switch (platform.type) {
      case "normal":
        ctx.fillStyle = "#555";
        break;
      case "ice":
        ctx.fillStyle = "#4fc3f7";
        break;
      case "fire":
        ctx.fillStyle = "#ff7043";
        break;
      case "water":
        ctx.fillStyle = "#2196f3";
        break;
      case "lava":
        ctx.fillStyle = "#f44336";
        break;
    }

    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    // Add visual effects for hazards
    if (platform.type === "water" || platform.type === "lava") {
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.1;
      ctx.fillStyle = platform.type === "water" ? "#64b5f6" : "#ff8a65";
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.globalAlpha = 1;
    }
  }

  private drawGoal(goal: Goal) {
    const ctx = this.ctx;
    const x = goal.x + 15;
    const y = goal.y + 15;

    // Glow effect
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 25);
    if (goal.type === "ice") {
      glow.addColorStop(0, "rgba(79, 195, 247, 0.5)");
      glow.addColorStop(1, "rgba(79, 195, 247, 0)");
    } else {
      glow.addColorStop(0, "rgba(255, 112, 67, 0.5)");
      glow.addColorStop(1, "rgba(255, 112, 67, 0)");
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Door/portal
    ctx.fillStyle = goal.type === "ice" ? "#4fc3f7" : "#ff7043";
    ctx.fillRect(goal.x, goal.y, 30, 30);
    ctx.strokeStyle = goal.type === "ice" ? "#81d4fa" : "#ffab91";
    ctx.lineWidth = 2;
    ctx.strokeRect(goal.x, goal.y, 30, 30);

    // Symbol
    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(goal.type === "ice" ? "❄" : "🔥", x, y + 5);
  }

  private drawGem(gem: Gem) {
    const ctx = this.ctx;
    const x = gem.x;
    const y = gem.y;
    const pulse = Math.sin(Date.now() / 200) * 2;

    // Glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 15 + pulse);
    if (gem.type === "ice") {
      glow.addColorStop(0, "rgba(79, 195, 247, 0.6)");
      glow.addColorStop(1, "rgba(79, 195, 247, 0)");
    } else {
      glow.addColorStop(0, "rgba(255, 112, 67, 0.6)");
      glow.addColorStop(1, "rgba(255, 112, 67, 0)");
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 15 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 8, y);
    ctx.closePath();

    ctx.fillStyle = gem.type === "ice" ? "#4fc3f7" : "#ff7043";
    ctx.fill();
    ctx.strokeStyle = gem.type === "ice" ? "#b3e5fc" : "#ffccbc";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawCharacter(char: Character) {
    const ctx = this.ctx;
    const x = char.x + char.width / 2;
    const y = char.y + char.height / 2;

    // Glow effect
    const glow = ctx.createRadialGradient(x, y, 0, x, y, char.width);
    if (char.type === "ice") {
      glow.addColorStop(0, "rgba(79, 195, 247, 0.4)");
      glow.addColorStop(1, "rgba(79, 195, 247, 0)");
    } else {
      glow.addColorStop(0, "rgba(255, 112, 67, 0.4)");
      glow.addColorStop(1, "rgba(255, 112, 67, 0)");
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, char.width, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = char.type === "ice" ? "#4fc3f7" : "#ff7043";
    ctx.fillRect(char.x, char.y, char.width, char.height);

    // Border
    ctx.strokeStyle = char.type === "ice" ? "#81d4fa" : "#ffab91";
    ctx.lineWidth = 2;
    ctx.strokeRect(char.x, char.y, char.width, char.height);

    // Eyes
    ctx.fillStyle = "#fff";
    const eyeY = char.y + 8;
    ctx.beginPath();
    ctx.arc(char.x + 7, eyeY, 4, 0, Math.PI * 2);
    ctx.arc(char.x + 17, eyeY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(char.x + 8, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(char.x + 18, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Reached goal indicator
    if (char.reachedGoal) {
      ctx.fillStyle = "rgba(76, 175, 80, 0.5)";
      ctx.fillRect(char.x, char.y, char.width, char.height);
      ctx.fillStyle = "#4caf50";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("✓", x, y + 6);
    }
  }
}
