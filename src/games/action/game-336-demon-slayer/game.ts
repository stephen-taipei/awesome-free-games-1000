/**
 * Demon Slayer Game Engine
 * Game #336
 *
 * Holy warrior fighting demons with sacred attacks and demon form transformation!
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
  holy: number;
  maxHoly: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  demonForm: boolean;
  demonFormTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "imp" | "demon-warrior" | "arch-demon";
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

interface HolyBolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface DemonFlame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  holy: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const DEMON_SPEED = 8;
const ATTACK_DURATION = 20;

export class DemonSlayerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private holyBolts: HolyBolt[] = [];
  private demonFlames: DemonFlame[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private holyRegenTimer = 0;

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
      holy: 50,
      maxHoly: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      demonForm: false,
      demonFormTimer: 0,
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
        holy: Math.floor(this.player.holy),
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
    this.holyBolts = [];
    this.demonFlames = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.holy = 50;
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

    // Hell platforms
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
    const types: Enemy["type"][] = ["imp", "demon-warrior", "arch-demon"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "arch-demon" ? 36 : 32,
        height: type === "arch-demon" ? 48 : 44,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        type,
        health: type === "arch-demon" ? 5 : type === "demon-warrior" ? 4 : 3,
        maxHealth: type === "arch-demon" ? 5 : type === "demon-warrior" ? 4 : 3,
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
    this.updateHolyBolts();
    this.updateDemonFlames();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Holy energy regeneration
    this.holyRegenTimer++;
    if (this.holyRegenTimer >= 30) {
      this.holyRegenTimer = 0;
      p.holy = Math.min(p.maxHoly, p.holy + 1);
    }

    // Horizontal movement
    const speed = p.demonForm ? DEMON_SPEED : MOVE_SPEED;
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
        p.vy = p.demonForm ? JUMP_FORCE * 1.2 : JUMP_FORCE;
        p.isJumping = true;
      }
    }

    // Holy Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.holyAttack();
    }

    // Special: Demon Form Transformation
    if (this.keys.special && p.holy >= 40 && !p.demonForm) {
      p.holy -= 40;
      p.demonForm = true;
      p.demonFormTimer = 240; // 4 seconds
      p.width = 40;
      p.height = 50;
      this.spawnDemonFlames();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update demon form
    if (p.demonForm) {
      p.demonFormTimer--;
      if (p.demonFormTimer <= 0) {
        p.demonForm = false;
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

  private holyAttack() {
    const p = this.player;
    const range = p.demonForm ? 70 : 50;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = p.demonForm ? 3 : 2;

    // Create holy bolt effect
    this.holyBolts.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 12 : -12,
      vy: 0,
      size: p.demonForm ? 18 : 12,
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
        p.holy = Math.min(p.maxHoly, p.holy + 8);
        if (e.health <= 0) {
          this.score += e.type === "arch-demon" ? 60 : e.type === "demon-warrior" ? 45 : 30;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnDemonFlames() {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.demonFlames.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 50,
      });
    }
  }

  private updateHolyBolts() {
    for (let i = this.holyBolts.length - 1; i >= 0; i--) {
      const bolt = this.holyBolts[i];
      bolt.x += bolt.vx;
      bolt.y += bolt.vy;
      bolt.life--;

      if (bolt.life <= 0) {
        this.holyBolts.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBoltHit(bolt, e)) {
          e.health -= 1;
          this.holyBolts.splice(i, 1);
          this.player.holy = Math.min(this.player.maxHoly, this.player.holy + 4);
          if (e.health <= 0) {
            this.score += e.type === "arch-demon" ? 60 : e.type === "demon-warrior" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBoltHit(bolt: HolyBolt, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      bolt.x > target.x &&
      bolt.x < target.x + target.width &&
      bolt.y > target.y &&
      bolt.y < target.y + target.height
    );
  }

  private updateDemonFlames() {
    for (let i = this.demonFlames.length - 1; i >= 0; i--) {
      const flame = this.demonFlames[i];
      flame.x += flame.vx;
      flame.y += flame.vy;
      flame.life--;

      if (flame.life <= 0) {
        this.demonFlames.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFlameHit(flame, e)) {
          e.health -= 2;
          this.demonFlames.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "arch-demon" ? 60 : e.type === "demon-warrior" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkFlameHit(flame: DemonFlame, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      flame.x > target.x - 10 &&
      flame.x < target.x + target.width + 10 &&
      flame.y > target.y - 10 &&
      flame.y < target.y + target.height + 10
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
        const damage = e.type === "arch-demon" ? 20 : e.type === "demon-warrior" ? 18 : 12;
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
    if (this.player.demonForm) {
      damage = Math.floor(damage * 0.6);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.holy = Math.min(this.player.maxHoly, this.player.holy + 15);

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
    this.player.holy = 50;
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

    // Background - hellish realm
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a0a0a");
    gradient.addColorStop(0.5, "#3a1a1a");
    gradient.addColorStop(1, "#5a2a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Pentagram in sky
    ctx.strokeStyle = "rgba(200, 50, 50, 0.3)";
    ctx.lineWidth = 2;
    const px = w - 100;
    const py = 80;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = px + Math.cos(angle) * 30;
      const y = py + Math.sin(angle) * 30;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const nextI = (i * 2) % 5;
        const nextAngle = (Math.PI * 2 * nextI) / 5 - Math.PI / 2;
        const nextX = px + Math.cos(nextAngle) * 30;
        const nextY = py + Math.sin(nextAngle) * 30;
        ctx.lineTo(nextX, nextY);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Ember particles
    ctx.fillStyle = "rgba(255, 100, 50, 0.5)";
    for (let i = 0; i < 30; i++) {
      const ex = (i * 97) % w;
      const ey = (i * 53 + Date.now() / 10) % h;
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
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

    // Draw demon flames
    for (const flame of this.demonFlames) {
      this.drawDemonFlame(flame);
    }

    // Draw holy bolts
    for (const bolt of this.holyBolts) {
      this.drawHolyBolt(bolt);
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
      // Ground - cracked stone
      ctx.fillStyle = "#2a1a1a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a2a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Floating platforms - demonic stone
      ctx.fillStyle = "#3a2a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#5a3a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.demonForm) {
      // Demon form - darker, more powerful
      ctx.fillStyle = "#8a2a2a";
      ctx.fillRect(p.x + 5, p.y + 15, p.width - 10, p.height - 15);

      // Horned head
      ctx.fillStyle = "#6a1a1a";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 12, 14, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.fillStyle = "#4a0a0a";
      ctx.beginPath();
      ctx.moveTo(p.x + 8, p.y + 5);
      ctx.lineTo(p.x + 5, p.y - 8);
      ctx.lineTo(p.x + 12, p.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + p.width - 8, p.y + 5);
      ctx.lineTo(p.x + p.width - 5, p.y - 8);
      ctx.lineTo(p.x + p.width - 12, p.y + 8);
      ctx.closePath();
      ctx.fill();

      // Glowing red eyes
      ctx.fillStyle = "#ff3300";
      ctx.shadowColor = "#ff3300";
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x + p.width / 2 - 8, p.y + 8, 4, 4);
      ctx.fillRect(p.x + p.width / 2 + 4, p.y + 8, 4, 4);
      ctx.shadowBlur = 0;

      // Claws
      ctx.strokeStyle = "#ff6633";
      ctx.lineWidth = 2;
      const clawX = p.facing === "right" ? p.x + p.width : p.x;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(clawX, p.y + 25 + i * 8);
        ctx.lineTo(clawX + (p.facing === "right" ? 8 : -8), p.y + 28 + i * 8);
        ctx.stroke();
      }
    } else {
      // Holy warrior form
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

      // Head
      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#4a90e2";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);

      // Holy symbol on chest
      ctx.strokeStyle = "#gold";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2, p.y + 20);
      ctx.lineTo(p.x + p.width / 2, p.y + 32);
      ctx.moveTo(p.x + p.width / 2 - 5, p.y + 25);
      ctx.lineTo(p.x + p.width / 2 + 5, p.y + 25);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      imp: "#8b4500",
      "demon-warrior": "#b30000",
      "arch-demon": "#660000",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Demonic features
    if (e.type === "arch-demon") {
      ctx.fillStyle = "#330000";
      // Horns
      ctx.beginPath();
      ctx.moveTo(e.x + 5, e.y + 5);
      ctx.lineTo(e.x, e.y - 5);
      ctx.lineTo(e.x + 10, e.y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x + e.width - 5, e.y + 5);
      ctx.lineTo(e.x + e.width, e.y - 5);
      ctx.lineTo(e.x + e.width - 10, e.y + 5);
      ctx.closePath();
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

  private drawHolyBolt(bolt: HolyBolt) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Cross shape
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bolt.x - 5, bolt.y);
    ctx.lineTo(bolt.x + 5, bolt.y);
    ctx.moveTo(bolt.x, bolt.y - 5);
    ctx.lineTo(bolt.x, bolt.y + 5);
    ctx.stroke();

    ctx.restore();
  }

  private drawDemonFlame(flame: DemonFlame) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(255, 50, 0, 0.8)";
    ctx.shadowColor = "#ff3300";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(flame.x, flame.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Flame trail
    ctx.fillStyle = "rgba(255, 100, 0, 0.4)";
    ctx.beginPath();
    ctx.arc(flame.x - flame.vx * 0.5, flame.y - flame.vy * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = p.health / p.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#00c864" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Holy energy bar
    const holyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, holyY, barWidth, barHeight);

    const holyPercent = p.holy / p.maxHoly;
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x, holyY, barWidth * holyPercent, barHeight);

    ctx.strokeStyle = "#b8860b";
    ctx.strokeRect(x, holyY, barWidth, barHeight);

    // Demon form indicator
    if (p.demonForm) {
      ctx.fillStyle = "#ff3300";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff3300";
      ctx.shadowBlur = 10;
      ctx.fillText("DEMON FORM", x, holyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
