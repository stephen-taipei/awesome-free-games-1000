/**
 * Poison Assassin Game Engine
 * Game #329
 *
 * Strike from shadows with deadly poison!
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
  venom: number;
  maxVenom: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  stealth: boolean;
  stealthTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "guard" | "captain" | "boss";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  poisoned: number;
  poisonDamage: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PoisonDart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface PoisonCloud {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  damage: number;
}

interface PoisonDrip {
  x: number;
  y: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  venom: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const JUMP_FORCE = -13;
const MOVE_SPEED = 5;
const STEALTH_SPEED = 7;
const ATTACK_DURATION = 18;
const ATTACK_RANGE = 45;

export class PoisonAssassinGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private poisonDarts: PoisonDart[] = [];
  private poisonClouds: PoisonCloud[] = [];
  private poisonDrips: PoisonDrip[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private venomRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 28,
      height: 42,
      vx: 0,
      vy: 0,
      health: 80,
      maxHealth: 80,
      venom: 100,
      maxVenom: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      stealth: false,
      stealthTimer: 0,
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
        venom: Math.floor(this.player.venom),
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
    this.poisonDarts = [];
    this.poisonClouds = [];
    this.poisonDrips = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.venom = this.player.maxVenom;
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

    // Shadowy platforms
    const platformCount = 8 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 120 + i * 160 + Math.random() * 60,
        y: h - 100 - Math.random() * 160,
        width: 80 + Math.random() * 50,
        height: 16,
      });
    }

    // Guard enemies
    const enemyCount = 5 + this.level * 2;
    const types: Enemy["type"][] = ["guard", "captain", "boss"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 250 + i * 200 + Math.random() * 60;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "boss" ? 38 : type === "captain" ? 32 : 28,
        height: type === "boss" ? 50 : type === "captain" ? 44 : 40,
        vx: type === "boss" ? 1.5 : 2,
        type,
        health: type === "boss" ? 8 : type === "captain" ? 4 : 2,
        maxHealth: type === "boss" ? 8 : type === "captain" ? 4 : 2,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 80,
        patrolRight: x + 80,
        poisoned: 0,
        poisonDamage: 0,
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
    this.updatePoisonDarts();
    this.updatePoisonClouds();
    this.updatePoisonDrips();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Venom regeneration
    this.venomRegenTimer++;
    if (this.venomRegenTimer >= 30) {
      this.venomRegenTimer = 0;
      p.venom = Math.min(p.maxVenom, p.venom + 1);
    }

    // Horizontal movement (faster in stealth)
    const speed = p.stealth ? STEALTH_SPEED : MOVE_SPEED;
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
    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Poison Dart Attack
    if (this.keys.attack && !p.isAttacking && p.venom >= 8) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.venom -= 8;
      this.throwPoisonDart();
    }

    // Special: Stealth Mode + Poison Cloud
    if (this.keys.special && p.venom >= 30 && !p.stealth) {
      p.venom -= 30;
      p.stealth = true;
      p.stealthTimer = 180;
      this.createPoisonCloud(p.x + p.width / 2, p.y + p.height / 2);
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update stealth
    if (p.stealth) {
      p.stealthTimer--;
      if (p.stealthTimer <= 0) {
        p.stealth = false;
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

  private throwPoisonDart() {
    const p = this.player;

    this.poisonDarts.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 3,
      vx: p.facing === "right" ? 12 : -12,
      vy: 0,
      life: 50,
    });
  }

  private createPoisonCloud(x: number, y: number) {
    this.poisonClouds.push({
      x,
      y,
      radius: 20,
      maxRadius: 80,
      alpha: 0.8,
      damage: 1,
    });
  }

  private updatePoisonDarts() {
    for (let i = this.poisonDarts.length - 1; i >= 0; i--) {
      const dart = this.poisonDarts[i];
      dart.x += dart.vx;
      dart.y += dart.vy;
      dart.life--;

      if (dart.life <= 0) {
        this.poisonDarts.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkDartHit(dart, e)) {
          e.health--;
          e.poisoned = 180; // 3 seconds poison
          e.poisonDamage = 0.02; // Damage per frame
          this.createPoisonDrips(e.x + e.width / 2, e.y);
          this.poisonDarts.splice(i, 1);

          if (e.health <= 0) {
            this.score += e.type === "boss" ? 80 : e.type === "captain" ? 40 : 20;
            this.createPoisonCloud(e.x + e.width / 2, e.y + e.height / 2);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkDartHit(dart: PoisonDart, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      dart.x > target.x &&
      dart.x < target.x + target.width &&
      dart.y > target.y &&
      dart.y < target.y + target.height
    );
  }

  private updatePoisonClouds() {
    for (let i = this.poisonClouds.length - 1; i >= 0; i--) {
      const cloud = this.poisonClouds[i];
      cloud.radius += 2;
      cloud.alpha -= 0.015;

      // Damage enemies in cloud
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = (e.x + e.width / 2) - cloud.x;
        const dy = (e.y + e.height / 2) - cloud.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < cloud.radius) {
          e.poisoned = Math.max(e.poisoned, 60);
          e.poisonDamage = 0.03;
        }
      }

      if (cloud.alpha <= 0) {
        this.poisonClouds.splice(i, 1);
      }
    }
  }

  private createPoisonDrips(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.poisonDrips.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vy: 1 + Math.random() * 2,
        life: 40,
      });
    }
  }

  private updatePoisonDrips() {
    for (let i = this.poisonDrips.length - 1; i >= 0; i--) {
      const drip = this.poisonDrips[i];
      drip.y += drip.vy;
      drip.vy += 0.1;
      drip.life--;

      if (drip.life <= 0) {
        this.poisonDrips.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Poison damage over time
      if (e.poisoned > 0) {
        e.poisoned--;
        e.health -= e.poisonDamage;

        // Create drip effect occasionally
        if (Math.random() < 0.1) {
          this.poisonDrips.push({
            x: e.x + Math.random() * e.width,
            y: e.y + e.height,
            vy: 1,
            life: 30,
          });
        }

        if (e.health <= 0) {
          this.score += e.type === "boss" ? 80 : e.type === "captain" ? 40 : 20;
          this.createPoisonCloud(e.x + e.width / 2, e.y + e.height / 2);
          this.enemies.splice(i, 1);
          continue;
        }
      }

      // Patrol movement
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      // Check player collision (stealth makes player invisible to enemies)
      if (!this.player.invincible && !this.player.stealth && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "boss" ? 20 : e.type === "captain" ? 12 : 8;
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
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
    this.player.venom = this.player.maxVenom;
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

    // Background - dark swamp
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0a1a0a");
    gradient.addColorStop(0.5, "#1a2a1a");
    gradient.addColorStop(1, "#0a150a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Poison mist
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 10; i++) {
      const mistX = (i * 130 + Date.now() / 80) % (w + 150) - 75;
      const mistY = h - 80 + Math.sin(Date.now() / 600 + i) * 20;
      ctx.fillStyle = "#50c878";
      ctx.beginPath();
      ctx.arc(mistX, mistY, 40 + Math.sin(i) * 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw poison clouds
    for (const cloud of this.poisonClouds) {
      this.drawPoisonCloud(cloud);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw poison darts
    for (const dart of this.poisonDarts) {
      this.drawPoisonDart(dart);
    }

    // Draw poison drips
    for (const drip of this.poisonDrips) {
      this.drawPoisonDrip(drip);
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
      // Ground with toxic appearance
      ctx.fillStyle = "#1a2a1a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#2a3a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Shadowy platform
      ctx.fillStyle = "#2a3a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a4a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    // Stealth effect
    if (p.stealth) {
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.1;
    } else if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Assassin body (dark green/black)
    ctx.fillStyle = p.stealth ? "#1a3a1a" : "#0a1a0a";
    ctx.fillRect(p.x + 2, p.y + 10, p.width - 4, p.height - 10);

    // Hood
    ctx.fillStyle = "#0a0f0a";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 12);
    ctx.lineTo(p.x + p.width / 2, p.y);
    ctx.lineTo(p.x + p.width, p.y + 12);
    ctx.closePath();
    ctx.fill();

    // Glowing green eyes
    ctx.fillStyle = "#50c878";
    ctx.shadowColor = "#50c878";
    ctx.shadowBlur = 8;
    if (p.facing === "right") {
      ctx.fillRect(p.x + 16, p.y + 8, 6, 3);
    } else {
      ctx.fillRect(p.x + 6, p.y + 8, 6, 3);
    }
    ctx.shadowBlur = 0;

    // Poison vial on belt
    ctx.fillStyle = "#50c878";
    ctx.fillRect(p.x + p.width / 2 - 3, p.y + p.height - 12, 6, 8);
    ctx.fillStyle = "#3a8a3a";
    ctx.fillRect(p.x + p.width / 2 - 2, p.y + p.height - 14, 4, 3);

    // Attack effect - poison trail
    if (p.isAttacking) {
      ctx.strokeStyle = "#50c878";
      ctx.shadowColor = "#50c878";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.moveTo(p.x + p.width, p.y + p.height / 3);
        ctx.lineTo(p.x + p.width + 30, p.y + p.height / 3);
      } else {
        ctx.moveTo(p.x, p.y + p.height / 3);
        ctx.lineTo(p.x - 30, p.y + p.height / 3);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Poisoned tint
    if (e.poisoned > 0) {
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 100) * 0.2;
    }

    // Body color based on type
    const colors = {
      guard: "#8b4513",
      captain: "#a0522d",
      boss: "#654321",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Armor details
    ctx.fillStyle = "#696969";
    ctx.fillRect(e.x + 2, e.y + 2, e.width - 4, 12);

    // Eyes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(e.x + 5, e.y + 5, 4, 3);
    ctx.fillRect(e.x + e.width - 9, e.y + 5, 4, 3);

    // Poison effect overlay
    if (e.poisoned > 0) {
      ctx.fillStyle = "rgba(80, 200, 120, 0.3)";
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }

    // Boss crown
    if (e.type === "boss") {
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(e.x + 5, e.y);
      ctx.lineTo(e.x + 10, e.y - 8);
      ctx.lineTo(e.x + e.width / 2, e.y - 3);
      ctx.lineTo(e.x + e.width - 10, e.y - 8);
      ctx.lineTo(e.x + e.width - 5, e.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Health bar
    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = e.poisoned > 0 ? "#50c878" : "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawPoisonDart(dart: PoisonDart) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(dart.x, dart.y);
    ctx.rotate(dart.vx > 0 ? 0 : Math.PI);

    // Dart body
    ctx.fillStyle = "#2a4a2a";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, -2);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();

    // Poison tip
    ctx.fillStyle = "#50c878";
    ctx.shadowColor = "#50c878";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(15, 0);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawPoisonCloud(cloud: PoisonCloud) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = cloud.alpha;

    const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
    gradient.addColorStop(0, "rgba(80, 200, 120, 0.6)");
    gradient.addColorStop(0.5, "rgba(50, 150, 80, 0.3)");
    gradient.addColorStop(1, "rgba(30, 100, 50, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPoisonDrip(drip: PoisonDrip) {
    const ctx = this.ctx;

    ctx.fillStyle = `rgba(80, 200, 120, ${drip.life / 40})`;
    ctx.beginPath();
    ctx.ellipse(drip.x, drip.y, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
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
    const hpColor = hpPercent > 0.5 ? "#50c878" : hpPercent > 0.25 ? "#9acd32" : "#ff6347";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "#50c878";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Venom bar
    const venomY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, venomY, barWidth, barHeight);

    const venomPercent = p.venom / p.maxVenom;
    ctx.fillStyle = "#9932cc";
    ctx.fillRect(x, venomY, barWidth * venomPercent, barHeight);

    ctx.strokeStyle = "#9932cc";
    ctx.strokeRect(x, venomY, barWidth, barHeight);

    // Stealth indicator
    if (p.stealth) {
      ctx.fillStyle = "#50c878";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("STEALTH", x, venomY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
