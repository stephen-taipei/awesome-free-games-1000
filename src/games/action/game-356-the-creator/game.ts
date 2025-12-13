/**
 * The Creator Game Engine
 * Game #356
 *
 * Create beings to fight enemies!
 */

interface Creation {
  x: number;
  y: number;
  type: 1 | 2 | 3;
  health: number;
  maxHealth: number;
  attackTimer: number;
  target: Enemy | null;
}

interface Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackTimer: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  fromPlayer: boolean;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  energy: number;
  creations: number;
  score: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const CREATION_COSTS = { 1: 20, 2: 35, 3: 50 };
const CREATION_STATS = {
  1: { health: 50, attack: 10, range: 150, rate: 30 },
  2: { health: 80, attack: 8, range: 200, rate: 20 },
  3: { health: 120, attack: 15, range: 100, rate: 50 },
};

export class CreatorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private creations: Creation[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private energy = 100;
  private maxEnergy = 100;
  private creationCount = 0;
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private spawnTimer = 0;
  private energyRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, width: 40, height: 50 };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        energy: Math.floor(this.energy),
        creations: this.creationCount,
        score: this.score,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 80;
    this.draw();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }

  create(type: 1 | 2 | 3) {
    if (this.status !== "playing") return;

    const cost = CREATION_COSTS[type];
    if (this.energy < cost) return;

    this.energy -= cost;
    const stats = CREATION_STATS[type];

    this.creations.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y - 20,
      type,
      health: stats.health,
      maxHealth: stats.health,
      attackTimer: 0,
      target: null,
    });

    this.creationCount++;
    this.emitState();
  }

  start() {
    this.energy = 100;
    this.maxEnergy = 100;
    this.creationCount = 0;
    this.score = 0;
    this.wave = 1;
    this.creations = [];
    this.enemies = [];
    this.projectiles = [];
    this.keys.clear();
    this.spawnTimer = 0;
    this.energyRegenTimer = 0;
    this.status = "playing";

    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 80;

    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.updatePlayer();
    this.updateCreations();
    this.updateEnemies();
    this.updateProjectiles();
    this.spawnEnemies();
    this.regenEnergy();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const speed = 5;
    if (this.keys.has("left")) {
      this.player.x -= speed;
    }
    if (this.keys.has("right")) {
      this.player.x += speed;
    }

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
  }

  private updateCreations() {
    for (let i = this.creations.length - 1; i >= 0; i--) {
      const c = this.creations[i];
      const stats = CREATION_STATS[c.type];

      // Find target
      if (!c.target || c.target.health <= 0) {
        c.target = this.findNearestEnemy(c.x, c.y);
      }

      // Attack
      if (c.target) {
        const dx = c.target.x - c.x;
        const dy = c.target.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= stats.range) {
          c.attackTimer++;
          if (c.attackTimer >= stats.rate) {
            c.attackTimer = 0;
            this.projectiles.push({
              x: c.x,
              y: c.y,
              vx: (dx / dist) * 8,
              vy: (dy / dist) * 8,
              damage: stats.attack,
              fromPlayer: true,
            });
          }
        } else {
          // Move towards target
          c.x += (dx / dist) * 2;
          c.y += (dy / dist) * 2;
        }
      }

      // Remove dead creations
      if (c.health <= 0) {
        this.creations.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Find target (player or creation)
      let targetX = this.player.x + this.player.width / 2;
      let targetY = this.player.y;
      let minDist = Infinity;

      for (const c of this.creations) {
        const dx = c.x - e.x;
        const dy = c.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          targetX = c.x;
          targetY = c.y;
        }
      }

      const dx = targetX - e.x;
      const dy = targetY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 30) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      } else {
        // Attack
        e.attackTimer++;
        if (e.attackTimer >= 60) {
          e.attackTimer = 0;
          // Damage creation or player
          for (const c of this.creations) {
            const cdx = c.x - e.x;
            const cdy = c.y - e.y;
            if (Math.sqrt(cdx * cdx + cdy * cdy) < 40) {
              c.health -= e.damage;
              break;
            }
          }
        }
      }

      // Remove dead enemies
      if (e.health <= 0) {
        this.enemies.splice(i, 1);
        this.score += 10 * this.wave;
      }
    }
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Check bounds
      if (p.x < 0 || p.x > this.canvas.width || p.y < 0 || p.y > this.canvas.height) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hits
      if (p.fromPlayer) {
        for (const e of this.enemies) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            e.health -= p.damage;
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private findNearestEnemy(x: number, y: number): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const e of this.enemies) {
      const dx = e.x - x;
      const dy = e.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }

    return nearest;
  }

  private spawnEnemies() {
    this.spawnTimer++;
    const spawnRate = Math.max(60, 150 - this.wave * 10);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      const x = Math.random() * this.canvas.width;
      const health = 30 + this.wave * 10;

      this.enemies.push({
        x,
        y: -30,
        health,
        maxHealth: health,
        speed: 1 + this.wave * 0.1,
        damage: 5 + this.wave * 2,
        attackTimer: 0,
      });

      if (this.enemies.length > 5 + this.wave * 2) {
        this.wave++;
        this.maxEnergy += 10;
      }
    }
  }

  private regenEnergy() {
    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 30) {
      this.energyRegenTimer = 0;
      this.energy = Math.min(this.maxEnergy, this.energy + 1);
    }
  }

  private checkGameOver() {
    // Game over if enemy reaches player
    for (const e of this.enemies) {
      const dx = this.player.x + this.player.width / 2 - e.x;
      const dy = this.player.y - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        this.gameOver();
        return;
      }
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

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0a0a1a");
    gradient.addColorStop(1, "#1a0a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137) % w;
      const sy = (i * 89) % h;
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw creations
    for (const c of this.creations) {
      this.drawCreation(c);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw projectiles
    for (const p of this.projectiles) {
      ctx.fillStyle = p.fromPlayer ? "#b482ff" : "#ff4444";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player
    this.drawPlayer();

    // Draw energy bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, h - 25, 150, 15);
    ctx.fillStyle = "#00d4ff";
    ctx.fillRect(10, h - 25, (this.energy / this.maxEnergy) * 150, 15);

    // Wave indicator
    ctx.fillStyle = "#b482ff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Wave ${this.wave}`, w - 10, 25);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    // Glow
    const gradient = ctx.createRadialGradient(
      p.x + p.width / 2, p.y + p.height / 2, 0,
      p.x + p.width / 2, p.y + p.height / 2, 50
    );
    gradient.addColorStop(0, "rgba(180, 130, 255, 0.3)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 50, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#4a2c7a";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y);
    ctx.lineTo(p.x + p.width, p.y + p.height);
    ctx.lineTo(p.x, p.y + p.height);
    ctx.closePath();
    ctx.fill();

    // Core
    ctx.fillStyle = "#b482ff";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCreation(c: Creation) {
    const ctx = this.ctx;
    const colors = {
      1: { main: "#ff6464", glow: "rgba(255, 100, 100, 0.3)" },
      2: { main: "#64c8ff", glow: "rgba(100, 200, 255, 0.3)" },
      3: { main: "#64ff96", glow: "rgba(100, 255, 150, 0.3)" },
    };
    const color = colors[c.type];

    // Glow
    ctx.fillStyle = color.glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color.main;
    if (c.type === 1) {
      // Triangle
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 15);
      ctx.lineTo(c.x + 15, c.y + 15);
      ctx.lineTo(c.x - 15, c.y + 15);
      ctx.closePath();
      ctx.fill();
    } else if (c.type === 2) {
      // Square
      ctx.fillRect(c.x - 12, c.y - 12, 24, 24);
    } else {
      // Circle
      ctx.beginPath();
      ctx.arc(c.x, c.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(c.x - 15, c.y - 25, 30, 5);
    ctx.fillStyle = "#44ff44";
    ctx.fillRect(c.x - 15, c.y - 25, (c.health / c.maxHealth) * 30, 5);
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Body
    ctx.fillStyle = "#8b0000";
    ctx.beginPath();
    ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Spikes
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(angle) * 20, e.y + Math.sin(angle) * 20);
      ctx.lineTo(e.x + Math.cos(angle) * 28, e.y + Math.sin(angle) * 28);
      ctx.stroke();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(e.x - 20, e.y - 35, 40, 5);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(e.x - 20, e.y - 35, (e.health / e.maxHealth) * 40, 5);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
