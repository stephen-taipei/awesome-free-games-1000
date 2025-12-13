/**
 * Hydra Slayer Game Engine
 * Game #344
 *
 * Fight multi-headed hydras with strategic attacks!
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
  flameMode: boolean;
  flameModeTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "hydra-spawn" | "hydra-warrior" | "hydra-boss";
  health: number;
  maxHealth: number;
  heads: number;
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

interface SwordSlash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface FlameBreath {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  width: number;
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
const JUMP_FORCE = -14.5;
const MOVE_SPEED = 5.5;
const ATTACK_DURATION = 22;

export class HydraSlayerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private swordSlashes: SwordSlash[] = [];
  private flameBreaths: FlameBreath[] = [];
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
      width: 36,
      height: 50,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 70,
      maxEnergy: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      flameMode: false,
      flameModeTimer: 0,
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
    this.swordSlashes = [];
    this.flameBreaths = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.energy = 70;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    const platformCount = 8 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 60,
        y: h - 100 - Math.random() * 140,
        width: 80 + Math.random() * 70,
        height: 16,
      });
    }

    const enemyCount = 5 + this.level * 2;
    const types: Enemy["type"][] = ["hydra-spawn", "hydra-warrior", "hydra-boss"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 350 + i * 250 + Math.random() * 70;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];
      const heads = type === "hydra-boss" ? 5 : type === "hydra-warrior" ? 3 : 2;

      this.enemies.push({
        x,
        y: h - 90,
        width: type === "hydra-boss" ? 44 : type === "hydra-warrior" ? 40 : 36,
        height: type === "hydra-boss" ? 56 : type === "hydra-warrior" ? 52 : 48,
        vx: Math.random() > 0.5 ? 2.2 : -2.2,
        type,
        health: heads * 3,
        maxHealth: heads * 3,
        heads,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 120,
        patrolRight: x + 120,
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
    this.updateSwordSlashes();
    this.updateFlameBreaths();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 24) {
      this.energyRegenTimer = 0;
      p.energy = Math.min(p.maxEnergy, p.energy + 1.3);
    }

    if (p.flameMode) {
      p.flameModeTimer--;
      if (p.flameModeTimer <= 0) {
        p.flameMode = false;
      }
      if (p.flameModeTimer % 8 === 0) {
        this.spawnFlameBreath();
      }
    }

    if (this.keys.left) {
      p.vx = -MOVE_SPEED;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = MOVE_SPEED;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    if (this.keys.attack && !p.isAttacking && p.energy >= 10) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.energy -= 10;
      this.swordAttack();
    }

    if (this.keys.special && p.energy >= 45 && !p.flameMode) {
      p.energy -= 45;
      p.flameMode = true;
      p.flameModeTimer = 100;
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) p.invincible = false;
    }

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

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

    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));

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

  private swordAttack() {
    const p = this.player;
    const range = 55;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;

    this.swordSlashes.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 10 : -10,
      vy: 0,
      size: 14,
      life: 25,
    });

    for (const e of this.enemies) {
      if (e.x + e.width > attackX && e.x < attackX + range && Math.abs(e.y - p.y) < 50) {
        e.health -= 2;
        e.heads = Math.max(1, Math.ceil(e.health / 3));
        p.energy = Math.min(p.maxEnergy, p.energy + 5);
        if (e.health <= 0) {
          this.score += e.type === "hydra-boss" ? 90 : e.type === "hydra-warrior" ? 70 : 50;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnFlameBreath() {
    const p = this.player;
    this.flameBreaths.push({
      x: p.x,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 7 : -7,
      vy: 0,
      life: 70,
      width: 0,
    });
  }

  private updateSwordSlashes() {
    for (let i = this.swordSlashes.length - 1; i >= 0; i--) {
      const slash = this.swordSlashes[i];
      slash.x += slash.vx;
      slash.y += slash.vy;
      slash.life--;

      if (slash.life <= 0) {
        this.swordSlashes.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkSlashHit(slash, e)) {
          e.health -= 1;
          e.heads = Math.max(1, Math.ceil(e.health / 3));
          this.swordSlashes.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "hydra-boss" ? 90 : e.type === "hydra-warrior" ? 70 : 50;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkSlashHit(slash: SwordSlash, target: { x: number; y: number; width: number; height: number }): boolean {
    return slash.x > target.x && slash.x < target.x + target.width && slash.y > target.y && slash.y < target.y + target.height;
  }

  private updateFlameBreaths() {
    for (let i = this.flameBreaths.length - 1; i >= 0; i--) {
      const flame = this.flameBreaths[i];
      flame.x += flame.vx;
      flame.y += flame.vy;
      flame.life--;
      flame.width = Math.min(100, flame.width + 2.5);

      if (flame.life <= 0) {
        this.flameBreaths.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFlameHit(flame, e)) {
          e.health -= 1;
          e.heads = Math.max(1, Math.ceil(e.health / 3));
          if (e.health <= 0) {
            this.score += e.type === "hydra-boss" ? 90 : e.type === "hydra-warrior" ? 70 : 50;
            this.enemies.splice(j, 1);
          }
        }
      }
    }
  }

  private checkFlameHit(flame: FlameBreath, target: { x: number; y: number; width: number; height: number }): boolean {
    const dir = flame.vx > 0 ? 1 : -1;
    const left = dir > 0 ? flame.x : flame.x - flame.width;
    const right = dir > 0 ? flame.x + flame.width : flame.x;
    return right > target.x && left < target.x + target.width && flame.y > target.y - 20 && flame.y < target.y + target.height + 20;
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx = -e.vx;
      e.facing = e.vx < 0 ? "left" : "right";

      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "hydra-boss" ? 30 : e.type === "hydra-warrior" ? 24 : 18;
        this.hitPlayer(damage);
      }
    }
  }

  private checkEntityCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private hitPlayer(damage: number) {
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 10);
    if (this.player.health <= 0) this.gameOver();
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 3;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, this.cameraX));
  }

  private checkLevelComplete() {
    if (this.enemies.length === 0 && this.player.x > this.levelWidth - 100) {
      this.status = "clear";
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
    this.player.energy = 70;
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#2a1a0a");
    gradient.addColorStop(0.5, "#3a2a1a");
    gradient.addColorStop(1, "#4a3a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255, 150, 50, 0.15)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(100 + i * 200, 80, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) this.drawPlatform(plat);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const flame of this.flameBreaths) this.drawFlameBreath(flame);
    for (const slash of this.swordSlashes) this.drawSwordSlash(slash);
    this.drawPlayer();

    ctx.restore();
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;
    if (plat.height === 40) {
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.5;

    if (p.flameMode) {
      ctx.fillStyle = "rgba(255, 100, 0, 0.25)";
      ctx.shadowColor = "#ff6400";
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x + 5, p.y + 14, p.width - 10, p.height - 14);
    ctx.fillStyle = "#deb887";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(p.x + p.width / 2 - 6, p.y + 9, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 3, p.y + 9, 3, 3);

    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 3;
    const swordX = p.facing === "right" ? p.x + p.width : p.x - 18;
    ctx.beginPath();
    ctx.moveTo(swordX, p.y + p.height / 2);
    ctx.lineTo(swordX + (p.facing === "right" ? 18 : -18), p.y + p.height / 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { "hydra-spawn": "#2a5a2a", "hydra-warrior": "#4a4a2a", "hydra-boss": "#5a2a2a" };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y + 20, e.width, e.height - 20);

    for (let i = 0; i < e.heads; i++) {
      const headX = e.x + (i + 1) * (e.width / (e.heads + 1));
      const headY = e.y + 5 + Math.sin(Date.now() / 200 + i) * 3;
      ctx.fillStyle = colors[e.type];
      ctx.beginPath();
      ctx.arc(headX, headY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headX, headY + 8);
      ctx.lineTo(headX, e.y + 20);
      ctx.stroke();
    }

    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const hpPercent = e.health / e.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, 4);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, 4);
    }
  }

  private drawSwordSlash(slash: SwordSlash) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#c0c0c0";
    ctx.shadowBlur = 8;
    const dir = slash.vx > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(slash.x, slash.y, slash.size, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  private drawFlameBreath(flame: FlameBreath) {
    const ctx = this.ctx;
    ctx.save();
    const dir = flame.vx > 0 ? 1 : -1;
    const startX = dir > 0 ? flame.x : flame.x - flame.width;
    ctx.fillStyle = "rgba(255, 100, 0, 0.5)";
    ctx.shadowColor = "#ff6400";
    ctx.shadowBlur = 18;
    ctx.fillRect(startX, flame.y - 18, flame.width, 36);
    ctx.fillStyle = "rgba(255, 200, 0, 0.7)";
    ctx.shadowBlur = 12;
    ctx.fillRect(startX + flame.width * 0.2, flame.y - 12, flame.width * 0.6, 24);
    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;
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

    const energyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, energyY, barWidth, barHeight);
    ctx.fillStyle = "#ff6400";
    ctx.fillRect(x, energyY, barWidth * (p.energy / p.maxEnergy), barHeight);
    ctx.strokeStyle = "#8a3200";
    ctx.strokeRect(x, energyY, barWidth, barHeight);

    if (p.flameMode) {
      ctx.fillStyle = "#ff6400";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff6400";
      ctx.shadowBlur = 10;
      ctx.fillText("FLAME SWORD!", x, energyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
