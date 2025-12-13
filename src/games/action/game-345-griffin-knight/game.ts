/**
 * Griffin Knight Game Engine
 * Game #345
 *
 * Aerial combat on griffin mounts - soar through the skies!
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
  isFlying: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  diveBombActive: boolean;
  diveBombTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: "harpy" | "wyvern" | "sky-demon";
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

interface Talon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface Feather {
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

const GRAVITY = 0.35;
const FLY_FORCE = -0.9;
const MOVE_SPEED = 6.5;
const ATTACK_DURATION = 20;

export class GriffinKnightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private talons: Talon[] = [];
  private feathers: Feather[] = [];
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
      y: 150,
      width: 46,
      height: 42,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 80,
      maxEnergy: 100,
      facing: "right",
      isFlying: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      diveBombActive: false,
      diveBombTimer: 0,
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
    this.talons = [];
    this.feathers = [];
    this.player.x = 50;
    this.player.y = 150;
    this.player.health = this.player.maxHealth;
    this.player.energy = 80;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    this.platforms.push({ x: 0, y: h - 40, width: this.levelWidth, height: 40 });

    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 160 + i * 200 + Math.random() * 50,
        y: h - 120 - Math.random() * 150,
        width: 70 + Math.random() * 60,
        height: 14,
      });
    }

    const enemyCount = 6 + this.level * 2;
    const types: Enemy["type"][] = ["harpy", "wyvern", "sky-demon"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 340 + i * 240 + Math.random() * 60;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: 80 + Math.random() * 100,
        width: type === "sky-demon" ? 42 : type === "wyvern" ? 40 : 36,
        height: type === "sky-demon" ? 54 : type === "wyvern" ? 50 : 46,
        vx: Math.random() > 0.5 ? 2.8 : -2.8,
        vy: Math.random() > 0.5 ? 0.6 : -0.6,
        type,
        health: type === "sky-demon" ? 7 : type === "wyvern" ? 6 : 4,
        maxHealth: type === "sky-demon" ? 7 : type === "wyvern" ? 6 : 4,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 140,
        patrolRight: x + 140,
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
    this.updateTalons();
    this.updateFeathers();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 18) {
      this.energyRegenTimer = 0;
      p.energy = Math.min(p.maxEnergy, p.energy + 1.5);
    }

    if (p.diveBombActive) {
      p.diveBombTimer--;
      if (p.diveBombTimer <= 0) p.diveBombActive = false;
      if (p.diveBombTimer % 4 === 0) this.spawnFeather();
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

    if (this.keys.jump && p.energy > 0) {
      p.vy += FLY_FORCE;
      p.isFlying = true;
      p.energy -= 0.25;
    } else {
      p.isFlying = false;
    }

    if (this.keys.attack && !p.isAttacking && p.energy >= 12) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.energy -= 12;
      this.shootTalon();
    }

    if (this.keys.special && p.energy >= 40 && !p.diveBombActive) {
      p.energy -= 40;
      p.diveBombActive = true;
      p.diveBombTimer = 100;
      p.vy = 10;
      this.spawnFeatherBurst();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) p.invincible = false;
    }

    p.vy += p.isFlying ? GRAVITY * 0.25 : GRAVITY;
    p.vy = Math.min(p.vy, 12);
    p.x += p.vx;
    p.y += p.vy;

    for (const plat of this.platforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
        }
      }
    }

    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));
    p.y = Math.max(0, p.y);

    if (p.y > this.canvas.height + 100) {
      p.health = 0;
      this.gameOver();
    }
  }

  private checkPlatformCollision(entity: { x: number; y: number; width: number; height: number; vy?: number }, plat: Platform): boolean {
    return entity.x < plat.x + plat.width && entity.x + entity.width > plat.x && entity.y + entity.height >= plat.y &&
           entity.y + entity.height <= plat.y + plat.height + 10 && (entity.vy === undefined || entity.vy >= 0);
  }

  private shootTalon() {
    const p = this.player;
    this.talons.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 13 : -13,
      vy: 0,
      size: 9,
      life: 90,
    });
  }

  private spawnFeather() {
    const p = this.player;
    this.feathers.push({
      x: p.x + p.width / 2 + (Math.random() - 0.5) * 20,
      y: p.y + p.height / 2 + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 60,
      rotation: Math.random() * Math.PI * 2,
    });
  }

  private spawnFeatherBurst() {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.feathers.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 55,
        rotation: angle,
      });
    }
  }

  private updateTalons() {
    for (let i = this.talons.length - 1; i >= 0; i--) {
      const talon = this.talons[i];
      talon.x += talon.vx;
      talon.y += talon.vy;
      talon.life--;

      if (talon.life <= 0) {
        this.talons.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkTalonHit(talon, e)) {
          e.health -= 2;
          this.talons.splice(i, 1);
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 4);
          if (e.health <= 0) {
            this.score += e.type === "sky-demon" ? 85 : e.type === "wyvern" ? 70 : 55;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkTalonHit(talon: Talon, target: { x: number; y: number; width: number; height: number }): boolean {
    return talon.x > target.x && talon.x < target.x + target.width && talon.y > target.y && talon.y < target.y + target.height;
  }

  private updateFeathers() {
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const feather = this.feathers[i];
      feather.x += feather.vx;
      feather.y += feather.vy;
      feather.vy += 0.15;
      feather.rotation += 0.1;
      feather.life--;

      if (feather.life <= 0) {
        this.feathers.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFeatherHit(feather, e)) {
          e.health -= 1;
          if (e.health <= 0) {
            this.score += e.type === "sky-demon" ? 85 : e.type === "wyvern" ? 70 : 55;
            this.enemies.splice(j, 1);
          }
        }
      }
    }
  }

  private checkFeatherHit(feather: Feather, target: { x: number; y: number; width: number; height: number }): boolean {
    return feather.x > target.x - 5 && feather.x < target.x + target.width + 5 &&
           feather.y > target.y - 5 && feather.y < target.y + target.height + 5;
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.x += e.vx;
      e.y += e.vy;

      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx = -e.vx;
      if (Math.random() < 0.015) e.vy = -e.vy;

      e.facing = e.vx < 0 ? "left" : "right";
      const h = this.canvas.height;
      if (e.y < 40) e.vy = Math.abs(e.vy);
      if (e.y > h - 80) e.vy = -Math.abs(e.vy);

      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "sky-demon" ? 26 : e.type === "wyvern" ? 22 : 16;
        this.hitPlayer(damage);
      }
    }
  }

  private checkEntityCollision(a: { x: number; y: number; width: number; height: number },
                                b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private hitPlayer(damage: number) {
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 11);
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
    this.player.energy = 80;
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
    gradient.addColorStop(0, "#4a6a9a");
    gradient.addColorStop(0.5, "#5a8aba");
    gradient.addColorStop(1, "#6aaadb");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    for (let i = 0; i < 15; i++) {
      const cx = ((i * 97 + this.cameraX * 0.2) % (w + 100)) - 50;
      const cy = (i * 53) % (h / 2);
      ctx.beginPath();
      ctx.arc(cx, cy, 2 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) this.drawPlatform(plat);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const feather of this.feathers) this.drawFeather(feather);
    for (const talon of this.talons) this.drawTalon(talon);
    this.drawPlayer();

    ctx.restore();
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;
    if (plat.height === 40) {
      ctx.fillStyle = "#5a8a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#6a9a6a";
      ctx.fillRect(plat.x, plat.y, plat.width, 6);
    } else {
      ctx.fillStyle = "#d4a574";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#e4b584";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.5;

    if (p.diveBombActive) {
      ctx.fillStyle = "rgba(218, 165, 32, 0.3)";
      ctx.shadowColor = "#daa520";
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "#daa520";
    ctx.fillRect(p.x + 8, p.y + 14, p.width - 16, p.height - 14);

    ctx.fillStyle = "#e4b542";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 12, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c89420";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 - 6, p.y + 8);
    ctx.lineTo(p.x + p.width / 2 - 10, p.y);
    ctx.lineTo(p.x + p.width / 2, p.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 + 6, p.y + 8);
    ctx.lineTo(p.x + p.width / 2 + 10, p.y);
    ctx.lineTo(p.x + p.width / 2, p.y + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8b4513";
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 10, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 10, 3, 3);

    ctx.fillStyle = "rgba(218, 165, 32, 0.75)";
    const wingFlap = Math.sin(Date.now() / 70) * 8;
    ctx.beginPath();
    ctx.moveTo(p.x + 8, p.y + 18);
    ctx.lineTo(p.x - 12, p.y + 12 + wingFlap);
    ctx.lineTo(p.x + 4, p.y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width - 8, p.y + 18);
    ctx.lineTo(p.x + p.width + 12, p.y + 12 - wingFlap);
    ctx.lineTo(p.x + p.width - 4, p.y + 28);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { harpy: "#8a5a8a", wyvern: "#5a7a5a", "sky-demon": "#7a4a4a" };
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    if (e.type === "wyvern") {
      ctx.strokeStyle = colors[e.type];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(e.x - 10, e.y + e.height / 2);
      ctx.lineTo(e.x, e.y + e.height / 2 - 8);
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

  private drawTalon(talon: Talon) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#c89420";
    ctx.shadowColor = "#c89420";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(talon.x, talon.y, talon.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#daa520";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(talon.x, talon.y, talon.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFeather(feather: Feather) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(feather.x, feather.y);
    ctx.rotate(feather.rotation);
    const alpha = Math.min(1, feather.life / 30);
    ctx.fillStyle = `rgba(218, 165, 32, ${alpha})`;
    ctx.shadowColor = "#daa520";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(228, 181, 66, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
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

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);
    const hpPercent = p.health / p.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#00c864" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
    ctx.strokeStyle = "#daa520";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    const energyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, energyY, barWidth, barHeight);
    ctx.fillStyle = "#daa520";
    ctx.fillRect(x, energyY, barWidth * (p.energy / p.maxEnergy), barHeight);
    ctx.strokeStyle = "#c89420";
    ctx.strokeRect(x, energyY, barWidth, barHeight);

    if (p.diveBombActive) {
      ctx.fillStyle = "#daa520";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#daa520";
      ctx.shadowBlur = 10;
      ctx.fillText("DIVE BOMB!", x, energyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
