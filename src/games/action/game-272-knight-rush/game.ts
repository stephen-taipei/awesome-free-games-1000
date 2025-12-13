/**
 * Knight Rush Game Engine
 * Game #272
 *
 * Side-scrolling knight combat game!
 */

interface Knight {
  x: number;
  y: number;
  targetY: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "goblin" | "orc" | "skeleton";
  health: number;
  speed: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rock" | "pit";
}

interface GameState {
  score: number;
  health: number;
  distance: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const LANES = [120, 200, 280];
const LANE_COUNT = 3;
const KNIGHT_X = 100;
const ATTACK_DURATION = 15;
const ATTACK_RANGE = 80;

export class KnightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private knight: Knight;
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private score = 0;
  private distance = 0;
  private scrollSpeed = 5;
  private currentLane = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private spawnTimer = 0;
  private bgOffset = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.knight = this.createKnight();
  }

  private createKnight(): Knight {
    return {
      x: KNIGHT_X,
      y: LANES[1],
      targetY: LANES[1],
      width: 50,
      height: 60,
      health: 100,
      maxHealth: 100,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        health: this.knight.health,
        distance: Math.floor(this.distance),
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  start() {
    this.score = 0;
    this.distance = 0;
    this.scrollSpeed = 5;
    this.currentLane = 1;
    this.knight = this.createKnight();
    this.enemies = [];
    this.obstacles = [];
    this.spawnTimer = 0;
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  moveUp() {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.knight.targetY = LANES[this.currentLane];
    }
  }

  moveDown() {
    if (this.currentLane < LANE_COUNT - 1) {
      this.currentLane++;
      this.knight.targetY = LANES[this.currentLane];
    }
  }

  attack() {
    if (!this.knight.isAttacking) {
      this.knight.isAttacking = true;
      this.knight.attackTimer = ATTACK_DURATION;
      this.performAttack();
    }
  }

  private performAttack() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (
        e.x < this.knight.x + this.knight.width + ATTACK_RANGE &&
        e.x + e.width > this.knight.x &&
        Math.abs(e.y - this.knight.y) < 40
      ) {
        e.health--;
        if (e.health <= 0) {
          const points = e.type === "orc" ? 30 : e.type === "skeleton" ? 20 : 10;
          this.score += points;
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update distance and speed
    this.distance += this.scrollSpeed * 0.1;
    this.scrollSpeed = 5 + Math.floor(this.distance / 500);
    this.bgOffset = (this.bgOffset + this.scrollSpeed) % 100;

    // Smooth lane transition
    this.knight.y += (this.knight.targetY - this.knight.y) * 0.2;

    // Update attack
    if (this.knight.isAttacking) {
      this.knight.attackTimer--;
      if (this.knight.attackTimer <= 0) {
        this.knight.isAttacking = false;
      }
    }

    // Update invincibility
    if (this.knight.invincible) {
      this.knight.invincibleTimer--;
      if (this.knight.invincibleTimer <= 0) {
        this.knight.invincible = false;
      }
    }

    // Spawn enemies
    this.spawnTimer++;
    if (this.spawnTimer >= 60 - Math.min(30, this.distance / 100)) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // Update enemies
    this.updateEnemies();

    // Update obstacles
    this.updateObstacles();

    this.emitState();
  }

  private spawnEnemy() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const types: Enemy["type"][] = ["goblin", "skeleton", "orc"];
    const weights = [50, 30, 20];
    let type: Enemy["type"] = "goblin";

    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        type = types[i];
        break;
      }
    }

    const stats = this.getEnemyStats(type);
    this.enemies.push({
      x: this.canvas.width + 50,
      y: LANES[lane],
      width: stats.width,
      height: stats.height,
      type,
      health: stats.health,
      speed: stats.speed + this.scrollSpeed,
    });
  }

  private getEnemyStats(type: Enemy["type"]) {
    switch (type) {
      case "goblin":
        return { width: 35, height: 40, health: 1, speed: 3 };
      case "skeleton":
        return { width: 40, height: 50, health: 2, speed: 2 };
      case "orc":
        return { width: 50, height: 60, health: 3, speed: 1 };
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x -= e.speed + this.scrollSpeed;

      // Remove if off screen
      if (e.x + e.width < 0) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Check collision with knight
      if (!this.knight.invincible && this.checkCollision(this.knight, e)) {
        this.hitKnight(e.type === "orc" ? 20 : e.type === "skeleton" ? 15 : 10);
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateObstacles() {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= this.scrollSpeed;

      if (o.x + o.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private hitKnight(damage: number) {
    this.knight.health -= damage;
    this.knight.invincible = true;
    this.knight.invincibleTimer = 60;

    if (this.knight.health <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, h - 80, w, 80);

    // Lane lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.setLineDash([20, 20]);
    for (const y of LANES) {
      ctx.beginPath();
      ctx.moveTo(0, y + 30);
      ctx.lineTo(w, y + 30);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Scrolling background elements
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let i = 0; i < 10; i++) {
      const x = ((i * 100) - this.bgOffset + w) % (w + 100) - 50;
      ctx.fillRect(x, 50 + (i % 3) * 20, 30, 30);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw knight
    this.drawKnight();

    // UI
    this.drawUI();
  }

  private drawKnight() {
    const ctx = this.ctx;
    const k = this.knight;

    if (k.invincible && Math.floor(k.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Horse
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(k.x - 20, k.y + 20, 60, 35);

    // Horse legs
    ctx.fillRect(k.x - 15, k.y + 50, 8, 15);
    ctx.fillRect(k.x + 25, k.y + 50, 8, 15);

    // Knight body
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(k.x, k.y - 10, 30, 40);

    // Helmet
    ctx.fillStyle = "#a0a0a0";
    ctx.fillRect(k.x + 5, k.y - 25, 20, 20);

    // Plume
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(k.x + 10, k.y - 35, 10, 15);

    // Shield
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.ellipse(k.x - 5, k.y + 10, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sword/Attack effect
    if (k.isAttacking) {
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(k.x + k.width, k.y);
      ctx.lineTo(k.x + k.width + ATTACK_RANGE, k.y - 20);
      ctx.stroke();

      // Slash effect
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(k.x + k.width + 30, k.y, 40, -0.5, 0.5);
      ctx.stroke();
    } else {
      // Sword at rest
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(k.x + k.width - 5, k.y - 5, 35, 6);
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      goblin: "#27ae60",
      skeleton: "#ecf0f1",
      orc: "#8e44ad",
    };

    // Body
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Eyes
    ctx.fillStyle = e.type === "skeleton" ? "#2c3e50" : "#e74c3c";
    ctx.fillRect(e.x + 5, e.y + 10, 8, 8);
    ctx.fillRect(e.x + e.width - 13, e.y + 10, 8, 8);

    // Weapon
    ctx.fillStyle = "#7f8c8d";
    if (e.type === "orc") {
      ctx.fillRect(e.x - 15, e.y + 10, 20, 8);
    } else if (e.type === "skeleton") {
      ctx.fillRect(e.x - 10, e.y + 15, 15, 4);
    }

    // Health indicator for tough enemies
    if (e.type !== "goblin" && e.health > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(e.x, e.y - 10, e.width, 5);
      ctx.fillStyle = "#e74c3c";
      const maxHealth = this.getEnemyStats(e.type).health;
      ctx.fillRect(e.x, e.y - 10, e.width * (e.health / maxHealth), 5);
    }
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = this.knight.health / this.knight.maxHealth;
    ctx.fillStyle = hpPercent > 0.5 ? "#2ecc71" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
