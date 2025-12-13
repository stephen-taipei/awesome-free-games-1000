/**
 * Beast Hunter Game Engine
 * Game #332
 *
 * Beast hunting action game with traps and ranged weapons!
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
  arrows: number;
  maxArrows: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  trapCooldown: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "wild-boar" | "dire-wolf" | "grizzly-bear";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  trapped: boolean;
  trapTimer: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  life: number;
}

interface Trap {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  triggered: boolean;
}

interface GameState {
  score: number;
  health: number;
  arrows: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 25;
const ATTACK_RANGE = 50;

export class BeastHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private arrows: Arrow[] = [];
  private traps: Trap[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
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
      width: 32,
      height: 44,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      arrows: 20,
      maxArrows: 20,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      trapCooldown: 0,
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
        arrows: this.player.arrows,
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
    this.arrows = [];
    this.traps = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.arrows = this.player.maxArrows;
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

    // Forest platforms
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    // Wild beasts
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["wild-boar", "dire-wolf", "grizzly-bear"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "grizzly-bear" ? 42 : type === "dire-wolf" ? 36 : 32,
        height: type === "grizzly-bear" ? 52 : type === "dire-wolf" ? 44 : 40,
        vx: type === "wild-boar" ? 3 : type === "dire-wolf" ? 4 : 2,
        type,
        health: type === "grizzly-bear" ? 5 : type === "dire-wolf" ? 3 : 2,
        maxHealth: type === "grizzly-bear" ? 5 : type === "dire-wolf" ? 3 : 2,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 120,
        patrolRight: x + 120,
        trapped: false,
        trapTimer: 0,
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
    this.updateArrows();
    this.updateTraps();
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

    // Bow Attack (shoot arrow)
    if (this.keys.attack && !p.isAttacking && p.arrows > 0) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.arrows--;
      this.shootArrow();
    }

    // Special: Set Trap
    if (this.keys.special && p.trapCooldown === 0 && !p.isJumping) {
      p.trapCooldown = 120;
      this.placeTrap();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update trap cooldown
    if (p.trapCooldown > 0) {
      p.trapCooldown--;
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

  private shootArrow() {
    const p = this.player;
    const arrowSpeed = 15;

    this.arrows.push({
      x: p.x + (p.facing === "right" ? p.width : 0),
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? arrowSpeed : -arrowSpeed,
      vy: 0,
      rotation: p.facing === "right" ? 0 : Math.PI,
      life: 60,
    });
  }

  private placeTrap() {
    const p = this.player;

    this.traps.push({
      x: p.x,
      y: p.y + p.height,
      width: 40,
      height: 10,
      active: true,
      triggered: false,
    });
  }

  private updateArrows() {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.vy += GRAVITY * 0.3; // Slight arc
      arrow.rotation = Math.atan2(arrow.vy, arrow.vx);
      arrow.life--;

      if (arrow.life <= 0) {
        this.arrows.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkArrowHit(arrow, e)) {
          e.health -= 2;
          this.arrows.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "grizzly-bear" ? 50 : e.type === "dire-wolf" ? 35 : 20;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkArrowHit(arrow: Arrow, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      arrow.x > target.x &&
      arrow.x < target.x + target.width &&
      arrow.y > target.y &&
      arrow.y < target.y + target.height
    );
  }

  private updateTraps() {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i];

      if (!trap.active) continue;

      // Check if enemy steps on trap
      for (const e of this.enemies) {
        if (!e.trapped && this.checkTrapCollision(trap, e)) {
          trap.triggered = true;
          trap.active = false;
          e.trapped = true;
          e.trapTimer = 120; // Trapped for 2 seconds
          e.vx = 0;
        }
      }

      // Remove triggered traps after animation
      if (trap.triggered) {
        this.traps.splice(i, 1);
      }
    }
  }

  private checkTrapCollision(trap: Trap, entity: { x: number; y: number; width: number; height: number }): boolean {
    return (
      entity.x < trap.x + trap.width &&
      entity.x + entity.width > trap.x &&
      entity.y + entity.height >= trap.y &&
      entity.y + entity.height <= trap.y + trap.height + 10
    );
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Update trap status
      if (e.trapped) {
        e.trapTimer--;
        if (e.trapTimer <= 0) {
          e.trapped = false;
          e.vx = Math.abs(e.vx) * (e.facing === "left" ? -1 : 1);
        }
      }

      if (!e.trapped) {
        // AI behavior - aggressive chase
        const distToPlayer = Math.abs(this.player.x - e.x);

        if (distToPlayer < 200 && e.type !== "wild-boar") {
          // Chase player
          if (this.player.x > e.x) {
            e.vx = Math.abs(e.vx);
            e.facing = "right";
          } else {
            e.vx = -Math.abs(e.vx);
            e.facing = "left";
          }
        } else {
          // Patrol
          e.x += e.vx;
          if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
            e.vx = -e.vx;
          }
          e.facing = e.vx < 0 ? "left" : "right";
        }

        // Move enemy
        if (!e.trapped) {
          e.x += e.vx;
        }

        // Check player collision
        if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
          const damage = e.type === "grizzly-bear" ? 20 : e.type === "dire-wolf" ? 15 : 10;
          this.hitPlayer(damage);
        }
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
    this.player.arrows = this.player.maxArrows;
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

    // Background - dark forest
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a2f1a");
    gradient.addColorStop(0.5, "#2d4a2d");
    gradient.addColorStop(1, "#1a3d1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Trees in background
    ctx.fillStyle = "rgba(20, 40, 20, 0.5)";
    for (let i = 0; i < 8; i++) {
      const tx = (i * 120 + this.cameraX * 0.3) % w;
      ctx.fillRect(tx - 10, 0, 20, h - 40);
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx - 30, h / 3);
      ctx.lineTo(tx + 30, h / 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw traps
    for (const trap of this.traps) {
      this.drawTrap(trap);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw arrows
    for (const arrow of this.arrows) {
      this.drawArrow(arrow);
    }

    // Draw player
    this.drawPlayer();

    ctx.restore();

    // UI overlay
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      // Ground - forest floor
      ctx.fillStyle = "#2d4a2d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3d5a3d";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);

      // Grass texture
      ctx.strokeStyle = "#4a7a4a";
      for (let i = 0; i < plat.width; i += 10) {
        ctx.beginPath();
        ctx.moveTo(plat.x + i, plat.y);
        ctx.lineTo(plat.x + i + 3, plat.y - 5);
        ctx.stroke();
      }
    } else {
      // Wood platforms
      ctx.fillStyle = "#654321";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = "#3d2812";
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Hunter body (brown/green)
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    // Head
    ctx.fillStyle = "#d2691e";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hunter hat
    ctx.fillStyle = "#4a7a4a";
    ctx.fillRect(p.x + p.width / 2 - 10, p.y - 2, 20, 6);
    ctx.fillRect(p.x + p.width / 2 - 6, p.y - 8, 12, 6);

    // Bow when attacking
    if (p.isAttacking) {
      ctx.save();
      ctx.strokeStyle = "#8b4513";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.arc(p.x + p.width, p.y + p.height / 2, 15, -Math.PI / 3, Math.PI / 3);
      } else {
        ctx.arc(p.x, p.y + p.height / 2, 15, Math.PI * 2 / 3, Math.PI * 4 / 3);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Trap chains if trapped
    if (e.trapped) {
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x + i * 10, e.y + e.height);
        ctx.lineTo(e.x + i * 10 + 5, e.y + e.height + 10);
        ctx.stroke();
      }
    }

    // Body color based on type
    const colors = {
      "wild-boar": "#8b4513",
      "dire-wolf": "#4a4a4a",
      "grizzly-bear": "#654321",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Eyes
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(e.x + (e.facing === "right" ? e.width - 8 : 8), e.y + 10, 3, 0, Math.PI * 2);
    ctx.fill();

    // Type-specific features
    if (e.type === "wild-boar") {
      // Tusks
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(e.x + (e.facing === "right" ? e.width : 0), e.y + e.height / 2);
      ctx.lineTo(e.x + (e.facing === "right" ? e.width + 8 : -8), e.y + e.height / 2 + 5);
      ctx.lineTo(e.x + (e.facing === "right" ? e.width : 0), e.y + e.height / 2 + 10);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "dire-wolf") {
      // Sharp ears
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.moveTo(e.x + 8, e.y);
      ctx.lineTo(e.x + 5, e.y - 10);
      ctx.lineTo(e.x + 11, e.y);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "grizzly-bear") {
      // Round ears
      ctx.fillStyle = "#554321";
      ctx.beginPath();
      ctx.arc(e.x + 8, e.y + 3, 6, 0, Math.PI * 2);
      ctx.arc(e.x + e.width - 8, e.y + 3, 6, 0, Math.PI * 2);
      ctx.fill();
    }

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
  }

  private drawArrow(arrow: Arrow) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.rotation);

    // Arrow shaft
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(-15, -1, 15, 2);

    // Arrow head
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5, -3);
    ctx.lineTo(-5, 3);
    ctx.closePath();
    ctx.fill();

    // Fletching
    ctx.fillStyle = "#ff6347";
    ctx.beginPath();
    ctx.moveTo(-15, -2);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawTrap(trap: Trap) {
    const ctx = this.ctx;

    if (!trap.active) return;

    // Steel trap
    ctx.fillStyle = "#666";
    ctx.fillRect(trap.x, trap.y, trap.width, trap.height);

    // Teeth
    ctx.fillStyle = "#888";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(trap.x + i * 8 + 2, trap.y);
      ctx.lineTo(trap.x + i * 8 + 6, trap.y - 5);
      ctx.lineTo(trap.x + i * 8 + 10, trap.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

    // Health bar
    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = p.health / p.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#00c864" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Arrows count
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Arrows: ${p.arrows}`, x, y + barHeight + 25);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
