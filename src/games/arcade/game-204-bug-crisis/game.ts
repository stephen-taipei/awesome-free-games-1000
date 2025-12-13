/**
 * Bug Crisis Game Engine
 * Game #204 - Wave Defense
 */

interface Bug {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  type: "ant" | "beetle" | "spider" | "fly";
  health: number;
  maxHealth: number;
  angle: number;
  wobble: number;
}

interface Wave {
  bugCount: number;
  types: ("ant" | "beetle" | "spider" | "fly")[];
  spawnRate: number;
  speedMultiplier: number;
}

type GameStatus = "idle" | "playing" | "won" | "lost";

interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
}

const WAVES: Wave[] = [
  // Wave 1 - Easy ants
  { bugCount: 8, types: ["ant"], spawnRate: 1500, speedMultiplier: 1 },
  // Wave 2 - Ants and beetles
  { bugCount: 12, types: ["ant", "beetle"], spawnRate: 1200, speedMultiplier: 1.1 },
  // Wave 3 - Introduce spiders
  { bugCount: 15, types: ["ant", "beetle", "spider"], spawnRate: 1000, speedMultiplier: 1.2 },
  // Wave 4 - Add flies
  { bugCount: 18, types: ["ant", "beetle", "spider", "fly"], spawnRate: 900, speedMultiplier: 1.3 },
  // Wave 5 - Final challenge
  { bugCount: 25, types: ["beetle", "spider", "fly"], spawnRate: 700, speedMultiplier: 1.5 },
];

const BUG_CONFIG = {
  ant: { size: 20, health: 1, speed: 1.5, points: 10, color: "#4a4a4a" },
  beetle: { size: 28, health: 2, speed: 1, points: 25, color: "#2d5016" },
  spider: { size: 24, health: 1, speed: 2, points: 15, color: "#4a3728" },
  fly: { size: 18, health: 1, speed: 3, points: 20, color: "#1a237e" },
};

export class BugCrisisGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 500;
  private height = 400;

  private bugs: Bug[] = [];
  private currentWave = 0;
  private score = 0;
  private lives = 5;
  private bugsSpawned = 0;
  private bugsKilled = 0;

  private status: GameStatus = "idle";
  private animationId = 0;
  private spawnTimer = 0;
  private lastSpawn = 0;
  private bugIdCounter = 0;

  private onStateChange?: (state: GameState) => void;
  private scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.setupInput();
    this.draw();
  }

  private setupInput() {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "playing") return;

      const rect = this.canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if (e instanceof TouchEvent) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = (clientX - rect.left) / this.scale;
      const y = (clientY - rect.top) / this.scale;

      this.checkHit(x, y);
    };

    this.canvas.addEventListener("click", handleClick);
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleClick(e);
    });
  }

  private checkHit(x: number, y: number) {
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const bug = this.bugs[i];
      const dx = x - bug.x;
      const dy = y - bug.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bug.size) {
        bug.health--;
        if (bug.health <= 0) {
          const config = BUG_CONFIG[bug.type];
          this.score += config.points;
          this.bugsKilled++;
          this.bugs.splice(i, 1);
          this.onStateChange?.({ status: "playing", score: this.score, lives: this.lives });
        }
        return;
      }
    }
  }

  setOnStateChange(callback: (state: GameState) => void) {
    this.onStateChange = callback;
  }

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const maxWidth = Math.min(container.clientWidth - 20, 500);
    this.scale = maxWidth / this.width;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width * this.scale}px`;
    this.canvas.style.height = `${this.height * this.scale}px`;

    this.draw();
  }

  start() {
    this.status = "playing";
    this.bugs = [];
    this.score = 0;
    this.lives = 5;
    this.bugsSpawned = 0;
    this.bugsKilled = 0;
    this.lastSpawn = Date.now();
    this.gameLoop();
  }

  reset() {
    cancelAnimationFrame(this.animationId);
    this.currentWave = 0;
    this.status = "idle";
    this.bugs = [];
    this.score = 0;
    this.lives = 5;
    this.draw();
  }

  nextLevel() {
    if (this.currentWave < WAVES.length - 1) {
      this.currentWave++;
      this.bugs = [];
      this.bugsSpawned = 0;
      this.bugsKilled = 0;
      this.lastSpawn = Date.now();
      this.status = "playing";
      this.gameLoop();
    }
  }

  getLevel(): number {
    return this.currentWave + 1;
  }

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  hasMoreLevels(): boolean {
    return this.currentWave < WAVES.length - 1;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const wave = WAVES[this.currentWave];
    const now = Date.now();

    // Spawn bugs
    if (this.bugsSpawned < wave.bugCount && now - this.lastSpawn > wave.spawnRate) {
      this.spawnBug(wave);
      this.lastSpawn = now;
    }

    // Update bugs
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const bug = this.bugs[i];

      // Move down with wobble
      bug.wobble += 0.1;
      bug.y += bug.speed;
      bug.x += Math.sin(bug.wobble) * 0.5;

      // Update angle for visual effect
      bug.angle = Math.sin(bug.wobble * 2) * 0.2;

      // Check if reached bottom
      if (bug.y > this.height + bug.size) {
        this.bugs.splice(i, 1);
        this.lives--;
        this.onStateChange?.({ status: "playing", score: this.score, lives: this.lives });

        if (this.lives <= 0) {
          this.status = "lost";
          this.onStateChange?.({ status: "lost", score: this.score, lives: 0 });
          return;
        }
      }
    }

    // Check wave complete
    if (this.bugsSpawned >= wave.bugCount && this.bugs.length === 0) {
      this.status = "won";
      this.onStateChange?.({ status: "won", score: this.score, lives: this.lives });
    }
  }

  private spawnBug(wave: Wave) {
    const typeIndex = Math.floor(Math.random() * wave.types.length);
    const type = wave.types[typeIndex];
    const config = BUG_CONFIG[type];

    const bug: Bug = {
      id: this.bugIdCounter++,
      x: Math.random() * (this.width - 60) + 30,
      y: -config.size,
      size: config.size,
      speed: config.speed * wave.speedMultiplier,
      type,
      health: config.health,
      maxHealth: config.health,
      angle: 0,
      wobble: Math.random() * Math.PI * 2,
    };

    this.bugs.push(bug);
    this.bugsSpawned++;
  }

  private draw() {
    const ctx = this.ctx;

    // Background - garden/grass
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(0.3, "#98d977");
    gradient.addColorStop(1, "#4a7c23");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw grass pattern
    ctx.fillStyle = "#3d6b1e";
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.width;
      const y = 150 + (i * 13) % 250;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y - 15);
      ctx.lineTo(x + 3, y - 15);
      ctx.closePath();
      ctx.fill();
    }

    // Draw danger zone at bottom
    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
    ctx.fillRect(0, this.height - 50, this.width, 50);
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, this.height - 50);
    ctx.lineTo(this.width, this.height - 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bugs
    for (const bug of this.bugs) {
      this.drawBug(bug);
    }

    // Draw wave progress
    if (this.status === "playing") {
      const wave = WAVES[this.currentWave];
      const progress = this.bugsKilled / wave.bugCount;

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(10, 10, 100, 8);
      ctx.fillStyle = "#4caf50";
      ctx.fillRect(10, 10, 100 * progress, 8);
    }
  }

  private drawBug(bug: Bug) {
    const ctx = this.ctx;
    const config = BUG_CONFIG[bug.type];

    ctx.save();
    ctx.translate(bug.x, bug.y);
    ctx.rotate(bug.angle);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(2, 4, bug.size * 0.7, bug.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (bug.type) {
      case "ant":
        this.drawAnt(bug.size, config.color);
        break;
      case "beetle":
        this.drawBeetle(bug.size, config.color);
        break;
      case "spider":
        this.drawSpider(bug.size, config.color);
        break;
      case "fly":
        this.drawFly(bug.size, config.color);
        break;
    }

    // Health bar for multi-hit bugs
    if (bug.maxHealth > 1) {
      const barWidth = bug.size;
      const barHeight = 4;
      ctx.fillStyle = "#333";
      ctx.fillRect(-barWidth / 2, -bug.size - 8, barWidth, barHeight);
      ctx.fillStyle = "#f44336";
      ctx.fillRect(-barWidth / 2, -bug.size - 8, barWidth * (bug.health / bug.maxHealth), barHeight);
    }

    ctx.restore();
  }

  private drawAnt(size: number, color: string) {
    const ctx = this.ctx;

    // Body segments
    ctx.fillStyle = color;
    // Head
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.35, size * 0.2, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Thorax
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.15, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Abdomen
    ctx.beginPath();
    ctx.ellipse(0, size * 0.35, size * 0.25, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, i * 8);
      ctx.lineTo(-size * 0.5, i * 8 + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.15, i * 8);
      ctx.lineTo(size * 0.5, i * 8 + 5);
      ctx.stroke();
    }

    // Antennae
    ctx.beginPath();
    ctx.moveTo(-3, -size * 0.45);
    ctx.lineTo(-8, -size * 0.6);
    ctx.moveTo(3, -size * 0.45);
    ctx.lineTo(8, -size * 0.6);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-3, -size * 0.38, 2, 0, Math.PI * 2);
    ctx.arc(3, -size * 0.38, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBeetle(size: number, color: string) {
    const ctx = this.ctx;

    // Shell
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell line
    ctx.strokeStyle = "#1a3008";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(0, size * 0.4);
    ctx.stroke();

    // Head
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.45, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.35, i * 10);
      ctx.lineTo(-size * 0.6, i * 10 + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.35, i * 10);
      ctx.lineTo(size * 0.6, i * 10 + 8);
      ctx.stroke();
    }

    // Shell highlights
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.ellipse(-5, -5, 4, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSpider(size: number, color: string) {
    const ctx = this.ctx;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Abdomen
    ctx.beginPath();
    ctx.ellipse(0, size * 0.3, size * 0.3, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs - 8 legs
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i - 1.5) * 0.4;
      // Left legs
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, i * 5 - 7);
      ctx.quadraticCurveTo(-size * 0.6, i * 5 - 10, -size * 0.7, i * 5 + 5);
      ctx.stroke();
      // Right legs
      ctx.beginPath();
      ctx.moveTo(size * 0.2, i * 5 - 7);
      ctx.quadraticCurveTo(size * 0.6, i * 5 - 10, size * 0.7, i * 5 + 5);
      ctx.stroke();
    }

    // Eyes (8 eyes pattern)
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(-4, -5, 2, 0, Math.PI * 2);
    ctx.arc(4, -5, 2, 0, Math.PI * 2);
    ctx.arc(-2, -8, 1.5, 0, Math.PI * 2);
    ctx.arc(2, -8, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFly(size: number, color: string) {
    const ctx = this.ctx;
    const time = Date.now() / 50;

    // Wings (animated)
    ctx.fillStyle = "rgba(200, 200, 255, 0.5)";
    ctx.save();
    ctx.translate(-size * 0.3, -size * 0.1);
    ctx.rotate(Math.sin(time) * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(size * 0.3, -size * 0.1);
    ctx.rotate(-Math.sin(time) * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.15, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.2, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -size * 0.35, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (large compound eyes)
    ctx.fillStyle = "#b71c1c";
    ctx.beginPath();
    ctx.ellipse(-5, -size * 0.35, 5, 6, -0.3, 0, Math.PI * 2);
    ctx.ellipse(5, -size * 0.35, 5, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, i * 6 - 3);
      ctx.lineTo(-size * 0.35, i * 6 + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.15, i * 6 - 3);
      ctx.lineTo(size * 0.35, i * 6 + 5);
      ctx.stroke();
    }
  }
}
