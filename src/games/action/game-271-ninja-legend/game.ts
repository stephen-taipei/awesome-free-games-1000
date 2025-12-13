/**
 * Ninja Legend Game Engine
 * Game #271
 *
 * Platform action game with ninja combat!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  isJumping: boolean;
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
  vx: number;
  type: "ninja" | "samurai" | "archer";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
}

interface GameState {
  score: number;
  health: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 20;
const ATTACK_RANGE = 50;

export class NinjaGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private projectiles: Projectile[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false };
  private cameraX = 0;
  private levelWidth = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 30,
      height: 40,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      facing: "right",
      isJumping: false,
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
        health: this.player.health,
        level: this.level,
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
    this.level = 1;
    this.player = this.createPlayer();
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupLevel() {
    this.enemies = [];
    this.platforms = [];
    this.projectiles = [];
    this.player.x = 50;
    this.player.y = 200;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    // Ground
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    // Platforms
    const platformCount = 5 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 200 + Math.random() * 100,
        y: h - 100 - Math.random() * 150,
        width: 100 + Math.random() * 80,
        height: 20,
      });
    }

    // Enemies
    const enemyCount = 3 + this.level * 2;
    const types: Enemy["type"][] = ["ninja", "samurai", "archer"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 250 + Math.random() * 100;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: 30,
        height: 40,
        vx: type === "archer" ? 0 : (Math.random() > 0.5 ? 2 : -2),
        type,
        health: type === "samurai" ? 3 : type === "archer" ? 2 : 1,
        maxHealth: type === "samurai" ? 3 : type === "archer" ? 2 : 1,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 100,
        patrolRight: x + 100,
      });
    }
  }

  setKey(key: keyof typeof this.keys, value: boolean) {
    this.keys[key] = value;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.updatePlayer();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Horizontal movement
    if (this.keys.left) {
      p.vx = -MOVE_SPEED;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = MOVE_SPEED;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump
    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.performAttack();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update invincibility
    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) {
        p.invincible = false;
      }
    }

    // Apply gravity
    p.vy += GRAVITY;

    // Apply velocity
    p.x += p.vx;
    p.y += p.vy;

    // Platform collision
    p.isJumping = true;
    for (const plat of this.platforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.isJumping = false;
        }
      }
    }

    // World bounds
    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));

    // Fall death
    if (p.y > this.canvas.height + 100) {
      p.health = 0;
      this.gameOver();
    }
  }

  private checkPlatformCollision(entity: { x: number; y: number; width: number; height: number; vy?: number }, plat: Platform): boolean {
    return (
      entity.x < plat.x + plat.width &&
      entity.x + entity.width > plat.x &&
      entity.y + entity.height >= plat.y &&
      entity.y + entity.height <= plat.y + plat.height + 10 &&
      (entity.vy === undefined || entity.vy >= 0)
    );
  }

  private performAttack() {
    const p = this.player;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - ATTACK_RANGE;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (
        e.x + e.width > attackX &&
        e.x < attackX + ATTACK_RANGE &&
        Math.abs(e.y - p.y) < 50
      ) {
        e.health--;
        if (e.health <= 0) {
          this.score += e.type === "samurai" ? 30 : e.type === "archer" ? 20 : 10;
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // AI behavior
      if (e.type === "archer") {
        // Archer shoots at player
        e.attackTimer++;
        if (e.attackTimer >= 120) {
          e.attackTimer = 0;
          this.shootArrow(e);
        }
        e.facing = this.player.x < e.x ? "left" : "right";
      } else {
        // Patrol movement
        e.x += e.vx;
        if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
          e.vx = -e.vx;
        }
        e.facing = e.vx < 0 ? "left" : "right";
      }

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        this.hitPlayer(10);
      }
    }
  }

  private shootArrow(e: Enemy) {
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 8;

    this.projectiles.push({
      x: e.x + e.width / 2,
      y: e.y + e.height / 2,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      isEnemy: true,
    });
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Out of bounds
      if (
        proj.x < this.cameraX - 50 ||
        proj.x > this.cameraX + this.canvas.width + 50 ||
        proj.y < -50 ||
        proj.y > this.canvas.height + 50
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit player
      if (
        proj.isEnemy &&
        !this.player.invincible &&
        this.checkProjectileHit(proj, this.player)
      ) {
        this.hitPlayer(15);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkEntityCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private checkProjectileHit(proj: Projectile, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      proj.x > target.x &&
      proj.x < target.x + target.width &&
      proj.y > target.y &&
      proj.y < target.y + target.height
    );
  }

  private hitPlayer(damage: number) {
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;

    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 3;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, this.cameraX));
  }

  private checkLevelComplete() {
    if (this.enemies.length === 0 && this.player.x > this.levelWidth - 100) {
      this.status = "clear";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
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
    gradient.addColorStop(0, "#0f0c29");
    gradient.addColorStop(0.5, "#302b63");
    gradient.addColorStop(1, "#24243e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Moon
    ctx.fillStyle = "rgba(255, 255, 200, 0.3)";
    ctx.beginPath();
    ctx.arc(w - 100, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw projectiles
    for (const proj of this.projectiles) {
      this.drawProjectile(proj);
    }

    // Draw player
    this.drawPlayer();

    ctx.restore();

    // UI overlay - health bar
    this.drawHealthBar();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      // Ground
      ctx.fillStyle = "#2d3436";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#636e72";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Platform
      ctx.fillStyle = "#4a5568";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#718096";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(p.x, p.y, p.width, p.height);

    // Ninja mask (red)
    ctx.fillStyle = "#e94560";
    ctx.fillRect(p.x, p.y + 8, p.width, 12);

    // Eyes
    ctx.fillStyle = "white";
    if (p.facing === "right") {
      ctx.fillRect(p.x + 18, p.y + 12, 8, 4);
    } else {
      ctx.fillRect(p.x + 4, p.y + 12, 8, 4);
    }

    // Attack effect
    if (p.isAttacking) {
      ctx.strokeStyle = "#e94560";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.arc(p.x + p.width + 20, p.y + p.height / 2, 25, -0.5, 0.5);
      } else {
        ctx.arc(p.x - 20, p.y + p.height / 2, 25, Math.PI - 0.5, Math.PI + 0.5);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Body color based on type
    const colors = {
      ninja: "#2d3436",
      samurai: "#6c5ce7",
      archer: "#00b894",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Face
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(e.x, e.y + 8, e.width, 10);

    // Health bar
    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }

    // Type indicator
    if (e.type === "archer") {
      ctx.fillStyle = "#00b894";
      ctx.beginPath();
      ctx.moveTo(e.x + e.width / 2, e.y - 5);
      ctx.lineTo(e.x + e.width / 2 - 5, e.y + 5);
      ctx.lineTo(e.x + e.width / 2 + 5, e.y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawProjectile(proj: Projectile) {
    const ctx = this.ctx;

    ctx.fillStyle = proj.isEnemy ? "#e74c3c" : "#00d4ff";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    ctx.strokeStyle = proj.isEnemy ? "rgba(231, 76, 60, 0.5)" : "rgba(0, 212, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    ctx.lineTo(proj.x - proj.vx * 2, proj.y - proj.vy * 2);
    ctx.stroke();
  }

  private drawHealthBar() {
    const ctx = this.ctx;
    const p = this.player;

    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Health
    const hpPercent = p.health / p.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#00c864" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    // Border
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
