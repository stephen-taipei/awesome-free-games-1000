/**
 * Werewolf Fighter Game Engine
 * Game #335
 *
 * Werewolf-themed combat with rage system and wolf transformation!
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
  rage: number;
  maxRage: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  wolfForm: boolean;
  wolfFormTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "hunter" | "silver-knight" | "beast-slayer";
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

interface ClawSlash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface WolfSpirit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  rage: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const WOLF_SPEED = 8;
const ATTACK_DURATION = 20;

export class WerewolfFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private clawSlashes: ClawSlash[] = [];
  private wolfSpirits: WolfSpirit[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private rageRegenTimer = 0;

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
      height: 46,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      rage: 50,
      maxRage: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      wolfForm: false,
      wolfFormTimer: 0,
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
        rage: Math.floor(this.player.rage),
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
    this.clawSlashes = [];
    this.wolfSpirits = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.rage = 50;
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

    // Enemies
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["hunter", "silver-knight", "beast-slayer"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "beast-slayer" ? 36 : 32,
        height: type === "beast-slayer" ? 48 : 44,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        type,
        health: type === "beast-slayer" ? 5 : type === "silver-knight" ? 4 : 3,
        maxHealth: type === "beast-slayer" ? 5 : type === "silver-knight" ? 4 : 3,
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
    this.updateClawSlashes();
    this.updateWolfSpirits();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Rage regeneration (faster in combat)
    this.rageRegenTimer++;
    if (this.rageRegenTimer >= 30) {
      this.rageRegenTimer = 0;
      p.rage = Math.min(p.maxRage, p.rage + 1);
    }

    // Horizontal movement
    const speed = p.wolfForm ? WOLF_SPEED : MOVE_SPEED;
    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump
    if (this.keys.jump) {
      if (!p.isJumping) {
        p.vy = p.wolfForm ? JUMP_FORCE * 1.2 : JUMP_FORCE;
        p.isJumping = true;
      }
    }

    // Claw Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.clawAttack();
    }

    // Special: Wolf Transformation
    if (this.keys.special && p.rage >= 40 && !p.wolfForm) {
      p.rage -= 40;
      p.wolfForm = true;
      p.wolfFormTimer = 240; // 4 seconds
      p.width = 40;
      p.height = 50;
      this.spawnWolfSpirits();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update wolf form
    if (p.wolfForm) {
      p.wolfFormTimer--;
      if (p.wolfFormTimer <= 0) {
        p.wolfForm = false;
        p.width = 32;
        p.height = 46;
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

  private clawAttack() {
    const p = this.player;
    const range = p.wolfForm ? 70 : 50;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = p.wolfForm ? 3 : 2;

    // Create claw slash effect
    this.clawSlashes.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 12 : -12,
      vy: 0,
      size: p.wolfForm ? 18 : 12,
      life: 30,
    });

    // Melee attack
    for (const e of this.enemies) {
      if (
        e.x + e.width > attackX &&
        e.x < attackX + range &&
        Math.abs(e.y - p.y) < 50
      ) {
        e.health -= damage;
        p.rage = Math.min(p.maxRage, p.rage + 8); // Gain rage from attacks
        if (e.health <= 0) {
          this.score += e.type === "beast-slayer" ? 60 : e.type === "silver-knight" ? 45 : 30;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnWolfSpirits() {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.wolfSpirits.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 50,
      });
    }
  }

  private updateClawSlashes() {
    for (let i = this.clawSlashes.length - 1; i >= 0; i--) {
      const slash = this.clawSlashes[i];
      slash.x += slash.vx;
      slash.y += slash.vy;
      slash.life--;

      if (slash.life <= 0) {
        this.clawSlashes.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkSlashHit(slash, e)) {
          e.health -= 1;
          this.clawSlashes.splice(i, 1);
          this.player.rage = Math.min(this.player.maxRage, this.player.rage + 4);
          if (e.health <= 0) {
            this.score += e.type === "beast-slayer" ? 60 : e.type === "silver-knight" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkSlashHit(slash: ClawSlash, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      slash.x > target.x &&
      slash.x < target.x + target.width &&
      slash.y > target.y &&
      slash.y < target.y + target.height
    );
  }

  private updateWolfSpirits() {
    for (let i = this.wolfSpirits.length - 1; i >= 0; i--) {
      const spirit = this.wolfSpirits[i];
      spirit.x += spirit.vx;
      spirit.y += spirit.vy;
      spirit.life--;

      if (spirit.life <= 0) {
        this.wolfSpirits.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkSpiritHit(spirit, e)) {
          e.health -= 2;
          this.wolfSpirits.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "beast-slayer" ? 60 : e.type === "silver-knight" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkSpiritHit(spirit: WolfSpirit, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      spirit.x > target.x - 10 &&
      spirit.x < target.x + target.width + 10 &&
      spirit.y > target.y - 10 &&
      spirit.y < target.y + target.height + 10
    );
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Patrol movement
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "beast-slayer" ? 20 : e.type === "silver-knight" ? 18 : 12;
        this.hitPlayer(damage);
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
    // Wolf form reduces damage
    if (this.player.wolfForm) {
      damage = Math.floor(damage * 0.6);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.rage = Math.min(this.player.maxRage, this.player.rage + 15); // Rage on hit

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
    this.player.rage = 50;
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

    // Background - moonlit forest
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0a1628");
    gradient.addColorStop(0.5, "#1a2a3a");
    gradient.addColorStop(1, "#2a3a4a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Full moon
    ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
    ctx.beginPath();
    ctx.arc(w - 80, 60, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220, 220, 200, 0.3)";
    ctx.beginPath();
    ctx.arc(w - 85, 55, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w - 70, 70, 5, 0, Math.PI * 2);
    ctx.fill();

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 73) % w;
      const sy = (i * 37) % (h / 2);
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Draw wolf spirits
    for (const spirit of this.wolfSpirits) {
      this.drawWolfSpirit(spirit);
    }

    // Draw claw slashes
    for (const slash of this.clawSlashes) {
      this.drawClawSlash(slash);
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
      // Ground
      ctx.fillStyle = "#2a3a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a4a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Forest platforms (wooden)
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.wolfForm) {
      // Werewolf form
      // Body
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(p.x + 5, p.y + 15, p.width - 10, p.height - 15);

      // Wolf head
      ctx.fillStyle = "#5a4a3a";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 12, 14, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.fillStyle = "#4a3a2a";
      ctx.beginPath();
      ctx.moveTo(p.x + 8, p.y + 8);
      ctx.lineTo(p.x + 5, p.y - 5);
      ctx.lineTo(p.x + 15, p.y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + p.width - 8, p.y + 8);
      ctx.lineTo(p.x + p.width - 5, p.y - 5);
      ctx.lineTo(p.x + p.width - 15, p.y + 5);
      ctx.closePath();
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = "#ffcc00";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x + p.width / 2 - 8, p.y + 8, 4, 4);
      ctx.fillRect(p.x + p.width / 2 + 4, p.y + 8, 4, 4);
      ctx.shadowBlur = 0;

      // Snout
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2, p.y + 12);
      ctx.lineTo(p.x + p.width / 2 - 5, p.y + 22);
      ctx.lineTo(p.x + p.width / 2 + 5, p.y + 22);
      ctx.closePath();
      ctx.fill();

      // Claws
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 2;
      const clawX = p.facing === "right" ? p.x + p.width : p.x;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(clawX, p.y + 25 + i * 8);
        ctx.lineTo(clawX + (p.facing === "right" ? 8 : -8), p.y + 28 + i * 8);
        ctx.stroke();
      }
    } else {
      // Human form
      ctx.fillStyle = "#654321";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

      // Head
      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);

      // Hair (wild)
      ctx.fillStyle = "#2a1a0a";
      ctx.beginPath();
      ctx.moveTo(p.x + 5, p.y + 5);
      ctx.lineTo(p.x + 2, p.y - 2);
      ctx.lineTo(p.x + 10, p.y + 2);
      ctx.lineTo(p.x + p.width / 2, p.y - 3);
      ctx.lineTo(p.x + p.width - 10, p.y + 2);
      ctx.lineTo(p.x + p.width - 2, p.y - 2);
      ctx.lineTo(p.x + p.width - 5, p.y + 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Enemy colors
    const colors = {
      hunter: "#556b2f",
      "silver-knight": "#c0c0c0",
      "beast-slayer": "#8b0000",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Silver weapon for silver-knight
    if (e.type === "silver-knight") {
      ctx.fillStyle = "#e0e0e0";
      const swordX = e.facing === "right" ? e.x + e.width : e.x - 15;
      ctx.fillRect(swordX, e.y + e.height / 3, 15, 4);
    }

    // Crossbow for beast-slayer
    if (e.type === "beast-slayer") {
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + e.width / 2 - 10, e.y + e.height / 2);
      ctx.lineTo(e.x + e.width / 2 + 10, e.y + e.height / 2);
      ctx.moveTo(e.x + e.width / 2, e.y + e.height / 2 - 8);
      ctx.lineTo(e.x + e.width / 2, e.y + e.height / 2 + 8);
      ctx.stroke();
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

  private drawClawSlash(slash: ClawSlash) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 10;

    // Draw claw marks
    const dir = slash.vx > 0 ? 1 : -1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(slash.x - dir * 10, slash.y + i * 8 - 5);
      ctx.lineTo(slash.x + dir * 10, slash.y + i * 8 + 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawWolfSpirit(spirit: WolfSpirit) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(200, 220, 255, 0.7)";
    ctx.shadowColor = "#88aaff";
    ctx.shadowBlur = 15;

    // Small wolf spirit shape
    ctx.beginPath();
    ctx.arc(spirit.x, spirit.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Trail effect
    ctx.fillStyle = "rgba(200, 220, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(spirit.x - spirit.vx * 0.5, spirit.y - spirit.vy * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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

    // Rage bar
    const rageY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, rageY, barWidth, barHeight);

    const ragePercent = p.rage / p.maxRage;
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(x, rageY, barWidth * ragePercent, barHeight);

    ctx.strokeStyle = "#8b4513";
    ctx.strokeRect(x, rageY, barWidth, barHeight);

    // Wolf form indicator
    if (p.wolfForm) {
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 10;
      ctx.fillText("WOLF FORM", x, rageY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
