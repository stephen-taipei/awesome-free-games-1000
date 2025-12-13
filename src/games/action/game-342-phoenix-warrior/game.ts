/**
 * Phoenix Warrior Game Engine
 * Game #342
 *
 * Fire-based warrior with rebirth ability - rise from the ashes!
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
  energy: number;
  maxEnergy: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  rebirthReady: boolean;
  rebirthActive: boolean;
  rebirthTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "frost-mage" | "ice-warrior" | "shadow-demon";
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

interface FireOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface PhoenixFeather {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rotation: number;
}

interface GameState {
  score: number;
  health: number;
  energy: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5.5;
const ATTACK_DURATION = 18;

export class PhoenixWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private fireOrbs: FireOrb[] = [];
  private phoenixFeathers: PhoenixFeather[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private energyRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 34,
      height: 48,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      rebirthReady: true,
      rebirthActive: false,
      rebirthTimer: 0,
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
        energy: Math.floor(this.player.energy),
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
    this.fireOrbs = [];
    this.phoenixFeathers = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.energy = 100;
    this.player.rebirthReady = true;
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
    const platformCount = 8 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 140 + i * 190 + Math.random() * 50,
        y: h - 110 - Math.random() * 150,
        width: 85 + Math.random() * 65,
        height: 16,
      });
    }

    // Enemies
    const enemyCount = 5 + this.level * 2;
    const types: Enemy["type"][] = ["frost-mage", "ice-warrior", "shadow-demon"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 320 + i * 230 + Math.random() * 60;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "shadow-demon" ? 40 : 35,
        height: type === "shadow-demon" ? 52 : 47,
        vx: Math.random() > 0.5 ? 2.3 : -2.3,
        type,
        health: type === "shadow-demon" ? 6 : type === "ice-warrior" ? 5 : 4,
        maxHealth: type === "shadow-demon" ? 6 : type === "ice-warrior" ? 5 : 4,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 110,
        patrolRight: x + 110,
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
    this.updateFireOrbs();
    this.updatePhoenixFeathers();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Energy regeneration
    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 20) {
      this.energyRegenTimer = 0;
      p.energy = Math.min(p.maxEnergy, p.energy + 1.5);
    }

    // Rebirth cooldown
    if (!p.rebirthReady && p.energy >= p.maxEnergy) {
      p.rebirthReady = true;
    }

    // Rebirth effect active
    if (p.rebirthActive) {
      p.rebirthTimer--;
      if (p.rebirthTimer <= 0) {
        p.rebirthActive = false;
        p.invincible = false;
      }
      // Spawn feathers during rebirth
      if (p.rebirthTimer % 3 === 0) {
        this.spawnPhoenixFeather();
      }
    }

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
    if (this.keys.jump) {
      if (!p.isJumping) {
        p.vy = JUMP_FORCE;
        p.isJumping = true;
      }
    }

    // Fire orb attack
    if (this.keys.attack && !p.isAttacking && p.energy >= 12) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.energy -= 12;
      this.shootFireOrb();
    }

    // Special: Phoenix Rebirth (resurrect with full health if about to die)
    if (this.keys.special && p.rebirthReady) {
      p.rebirthReady = false;
      p.rebirthActive = true;
      p.rebirthTimer = 90;
      p.health = p.maxHealth;
      p.energy = 0;
      p.invincible = true;
      p.invincibleTimer = 90;
      this.spawnPhoenixBurst();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update invincibility
    if (p.invincible && !p.rebirthActive) {
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
      if (p.rebirthReady) {
        // Auto-trigger rebirth
        p.rebirthReady = false;
        p.rebirthActive = true;
        p.rebirthTimer = 90;
        p.health = p.maxHealth;
        p.energy = 0;
        p.invincible = true;
        p.invincibleTimer = 90;
        p.y = 100;
        this.spawnPhoenixBurst();
      } else {
        p.health = 0;
        this.gameOver();
      }
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

  private shootFireOrb() {
    const p = this.player;
    const speed = 10;
    const offsetX = p.facing === "right" ? p.width : 0;

    this.fireOrbs.push({
      x: p.x + offsetX,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? speed : -speed,
      vy: 0,
      size: 8,
      life: 90,
    });
  }

  private spawnPhoenixFeather() {
    const p = this.player;
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 3;

    this.phoenixFeathers.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60,
      rotation: 0,
    });
  }

  private spawnPhoenixBurst() {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 7;
      this.phoenixFeathers.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50,
        rotation: 0,
      });
    }
  }

  private updateFireOrbs() {
    for (let i = this.fireOrbs.length - 1; i >= 0; i--) {
      const orb = this.fireOrbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.life--;

      if (orb.life <= 0) {
        this.fireOrbs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkOrbHit(orb, e)) {
          e.health -= 2;
          this.fireOrbs.splice(i, 1);
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 4);
          if (e.health <= 0) {
            this.score += e.type === "shadow-demon" ? 75 : e.type === "ice-warrior" ? 60 : 45;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkOrbHit(orb: FireOrb, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      orb.x > target.x &&
      orb.x < target.x + target.width &&
      orb.y > target.y &&
      orb.y < target.y + target.height
    );
  }

  private updatePhoenixFeathers() {
    for (let i = this.phoenixFeathers.length - 1; i >= 0; i--) {
      const feather = this.phoenixFeathers[i];
      feather.x += feather.vx;
      feather.y += feather.vy;
      feather.vy += 0.2; // Gravity on feathers
      feather.rotation += 0.15;
      feather.life--;

      if (feather.life <= 0) {
        this.phoenixFeathers.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFeatherHit(feather, e)) {
          e.health -= 1;
          if (e.health <= 0) {
            this.score += e.type === "shadow-demon" ? 75 : e.type === "ice-warrior" ? 60 : 45;
            this.enemies.splice(j, 1);
          }
        }
      }
    }
  }

  private checkFeatherHit(feather: PhoenixFeather, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      feather.x > target.x - 5 &&
      feather.x < target.x + target.width + 5 &&
      feather.y > target.y - 5 &&
      feather.y < target.y + target.height + 5
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
        const damage = e.type === "shadow-demon" ? 22 : e.type === "ice-warrior" ? 18 : 15;
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
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 8);

    if (this.player.health <= 0) {
      if (this.player.rebirthReady) {
        // Auto-trigger rebirth on death
        this.player.rebirthReady = false;
        this.player.rebirthActive = true;
        this.player.rebirthTimer = 90;
        this.player.health = this.player.maxHealth;
        this.player.energy = 0;
        this.player.invincibleTimer = 90;
        this.spawnPhoenixBurst();
      } else {
        this.gameOver();
      }
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
    this.player.energy = 100;
    this.player.rebirthReady = true;
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

    // Background - sunset sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#ff6600");
    gradient.addColorStop(0.4, "#ff9933");
    gradient.addColorStop(0.7, "#ffcc66");
    gradient.addColorStop(1, "#ffd699");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Sun
    ctx.fillStyle = "rgba(255, 220, 100, 0.8)";
    ctx.shadowColor = "rgba(255, 220, 100, 0.6)";
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(w / 2, h / 3, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

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

    // Draw phoenix feathers
    for (const feather of this.phoenixFeathers) {
      this.drawPhoenixFeather(feather);
    }

    // Draw fire orbs
    for (const orb of this.fireOrbs) {
      this.drawFireOrb(orb);
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
      ctx.fillStyle = "#8b6914";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#9b7924";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Platforms
      ctx.fillStyle = "#a0826d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#b0927d";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0 && !p.rebirthActive) {
      ctx.globalAlpha = 0.5;
    }

    // Rebirth aura
    if (p.rebirthActive) {
      ctx.fillStyle = "rgba(255, 150, 0, 0.3)";
      ctx.shadowColor = "#ff9600";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Body
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(p.x + 6, p.y + 14, p.width - 12, p.height - 14);

    // Head
    ctx.fillStyle = "#ff7700";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 10, 11, 0, Math.PI * 2);
    ctx.fill();

    // Phoenix crown
    ctx.fillStyle = "#ff9933";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 - 8, p.y + 5);
    ctx.lineTo(p.x + p.width / 2 - 10, p.y - 5);
    ctx.lineTo(p.x + p.width / 2 - 3, p.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 2);
    ctx.lineTo(p.x + p.width / 2, p.y - 8);
    ctx.lineTo(p.x + p.width / 2 + 3, p.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 + 8, p.y + 5);
    ctx.lineTo(p.x + p.width / 2 + 10, p.y - 5);
    ctx.lineTo(p.x + p.width / 2 + 3, p.y + 2);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ffcc00";
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 5;
    ctx.fillRect(p.x + p.width / 2 - 6, p.y + 9, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 3, p.y + 9, 3, 3);
    ctx.shadowBlur = 0;

    // Wings
    ctx.fillStyle = "rgba(255, 102, 0, 0.6)";
    const wingFlap = Math.sin(Date.now() / 80) * 6;
    ctx.beginPath();
    ctx.moveTo(p.x + 6, p.y + 20);
    ctx.lineTo(p.x - 8, p.y + 15 + wingFlap);
    ctx.lineTo(p.x + 2, p.y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width - 6, p.y + 20);
    ctx.lineTo(p.x + p.width + 8, p.y + 15 - wingFlap);
    ctx.lineTo(p.x + p.width - 2, p.y + 30);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      "frost-mage": "#4da6ff",
      "ice-warrior": "#80bfff",
      "shadow-demon": "#330033",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Ice effects
    if (e.type === "frost-mage" || e.type === "ice-warrior") {
      ctx.fillStyle = "rgba(173, 216, 230, 0.5)";
      ctx.fillRect(e.x + 5, e.y + 5, e.width - 10, e.height - 10);
    }

    // Shadow effect
    if (e.type === "shadow-demon") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, 20, 0, Math.PI * 2);
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

  private drawFireOrb(orb: FireOrb) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "#ff9933";
    ctx.shadowColor = "#ff9933";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffcc66";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPhoenixFeather(feather: PhoenixFeather) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(feather.x, feather.y);
    ctx.rotate(feather.rotation);

    const alpha = Math.min(1, feather.life / 30);
    ctx.fillStyle = `rgba(255, 102, 0, ${alpha})`;
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 153, 51, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Energy bar
    const energyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, energyY, barWidth, barHeight);

    const energyPercent = p.energy / p.maxEnergy;
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(x, energyY, barWidth * energyPercent, barHeight);

    ctx.strokeStyle = "#ff9933";
    ctx.strokeRect(x, energyY, barWidth, barHeight);

    // Rebirth indicator
    if (p.rebirthReady) {
      ctx.fillStyle = "#ff9933";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff9933";
      ctx.shadowBlur = 10;
      ctx.fillText("REBIRTH READY!", x, energyY + barHeight + 20);
      ctx.shadowBlur = 0;
    } else if (p.rebirthActive) {
      ctx.fillStyle = "#ff6600";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 10;
      ctx.fillText("PHOENIX RISING!", x, energyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
