/**
 * Harpy Hunter Game Engine
 * Game #353
 *
 * Aerial combat against bird-women creatures!
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
  wind: number;
  maxWind: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  windGlide: boolean;
  windGlideTimer: number;
  canDoubleJump: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: "harpy-scout" | "harpy-warrior" | "harpy-queen";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  flyPattern: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindBlade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  rotation: number;
}

interface Feather {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  wind: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const JUMP_FORCE = -13;
const MOVE_SPEED = 5;
const GLIDE_GRAVITY = 0.15;
const ATTACK_DURATION = 20;

export class HarpyHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private windBlades: WindBlade[] = [];
  private feathers: Feather[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private windRegenTimer = 0;

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
      wind: 50,
      maxWind: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      windGlide: false,
      windGlideTimer: 0,
      canDoubleJump: true,
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
        wind: Math.floor(this.player.wind),
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
    this.windBlades = [];
    this.feathers = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.wind = 50;
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
        x: 120 + i * 160 + Math.random() * 70,
        y: h - 100 - Math.random() * 180,
        width: 80 + Math.random() * 50,
        height: 16,
      });
    }

    const enemyCount = 5 + this.level * 2;
    const types: Enemy["type"][] = ["harpy-scout", "harpy-warrior", "harpy-queen"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 250 + i * 200 + Math.random() * 100;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 200 - Math.random() * 100,
        width: type === "harpy-queen" ? 44 : 36,
        height: type === "harpy-queen" ? 52 : 42,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        vy: Math.sin(Math.random() * Math.PI * 2) * 2,
        type,
        health: type === "harpy-queen" ? 7 : type === "harpy-warrior" ? 5 : 3,
        maxHealth: type === "harpy-queen" ? 7 : type === "harpy-warrior" ? 5 : 3,
        facing: "left",
        attackTimer: 0,
        flyPattern: Math.random() * Math.PI * 2,
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
    this.updateWindBlades();
    this.updateFeathers();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.windRegenTimer++;
    if (this.windRegenTimer >= 30) {
      this.windRegenTimer = 0;
      p.wind = Math.min(p.maxWind, p.wind + 1);
    }

    const speed = MOVE_SPEED;
    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    if (this.keys.jump) {
      if (!p.isJumping) {
        p.vy = JUMP_FORCE;
        p.isJumping = true;
        p.canDoubleJump = true;
      } else if (p.canDoubleJump && p.wind >= 15) {
        p.vy = JUMP_FORCE * 0.8;
        p.canDoubleJump = false;
        p.wind -= 15;
      }
    }

    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.windBladeAttack();
    }

    if (this.keys.special && p.wind >= 30 && !p.windGlide) {
      p.wind -= 30;
      p.windGlide = true;
      p.windGlideTimer = 150;
      this.spawnFeathers();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    if (p.windGlide) {
      p.windGlideTimer--;
      if (p.windGlideTimer <= 0) {
        p.windGlide = false;
      }
    }

    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) {
        p.invincible = false;
      }
    }

    const gravity = p.windGlide ? GLIDE_GRAVITY : GRAVITY;
    p.vy += gravity;

    if (p.windGlide && p.vy > 2) {
      p.vy = 2;
    }

    p.x += p.vx;
    p.y += p.vy;

    p.isJumping = true;
    for (const plat of this.platforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.isJumping = false;
          p.canDoubleJump = true;
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

  private windBladeAttack() {
    const p = this.player;

    this.windBlades.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 11 : -11,
      vy: 0,
      size: 18,
      life: 35,
      rotation: 0,
    });
  }

  private spawnFeathers() {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.feathers.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 50,
      });
    }
  }

  private updateWindBlades() {
    for (let i = this.windBlades.length - 1; i >= 0; i--) {
      const blade = this.windBlades[i];
      blade.x += blade.vx;
      blade.y += blade.vy;
      blade.rotation += 0.3;
      blade.life--;

      if (blade.life <= 0) {
        this.windBlades.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBladeHit(blade, e)) {
          e.health -= 2;
          this.windBlades.splice(i, 1);
          this.player.wind = Math.min(this.player.maxWind, this.player.wind + 8);
          if (e.health <= 0) {
            this.score += e.type === "harpy-queen" ? 70 : e.type === "harpy-warrior" ? 50 : 35;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBladeHit(blade: WindBlade, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      blade.x > target.x &&
      blade.x < target.x + target.width &&
      blade.y > target.y &&
      blade.y < target.y + target.height
    );
  }

  private updateFeathers() {
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const feather = this.feathers[i];
      feather.x += feather.vx;
      feather.y += feather.vy;
      feather.vy += 0.2;
      feather.life--;

      if (feather.life <= 0) {
        this.feathers.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFeatherHit(feather, e)) {
          e.health -= 1;
          this.feathers.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "harpy-queen" ? 70 : e.type === "harpy-warrior" ? 50 : 35;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkFeatherHit(feather: Feather, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      feather.x > target.x - 8 &&
      feather.x < target.x + target.width + 8 &&
      feather.y > target.y - 8 &&
      feather.y < target.y + target.height + 8
    );
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.flyPattern += 0.05;
      e.x += e.vx;
      e.y += Math.sin(e.flyPattern) * 1.5;

      if (e.x < 100 || e.x > this.levelWidth - 100) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "harpy-queen" ? 20 : e.type === "harpy-warrior" ? 16 : 12;
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
    if (this.player.windGlide) {
      damage = Math.floor(damage * 0.6);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.wind = Math.min(this.player.maxWind, this.player.wind + 10);

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
    this.player.wind = 50;
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

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(0.6, "#b0d4e3");
    gradient.addColorStop(1, "#d0e4f0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 30; i++) {
      const cx = (i * 107 + Date.now() * 0.02) % w;
      const cy = (i * 83) % h;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    for (const feather of this.feathers) {
      this.drawFeather(feather);
    }

    for (const blade of this.windBlades) {
      this.drawWindBlade(blade);
    }

    this.drawPlayer();

    ctx.restore();

    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      ctx.fillStyle = "#8b7355";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#9b8365";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      ctx.fillStyle = "#9b8365";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#ab9375";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.windGlide) {
      ctx.save();
      ctx.strokeStyle = "#66ccff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#66ccff";
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(p.x - 15, p.y + 10);
      ctx.quadraticCurveTo(p.x - 20, p.y, p.x - 15, p.y - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p.x + p.width + 15, p.y + 10);
      ctx.quadraticCurveTo(p.x + p.width + 20, p.y, p.x + p.width + 15, p.y - 10);
      ctx.stroke();

      ctx.restore();
    }

    ctx.fillStyle = "#6a9a8a";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#66ccff";
    ctx.shadowColor = "#66ccff";
    ctx.shadowBlur = 6;
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    ctx.fillStyle = e.type === "harpy-queen" ? "#9966cc" : e.type === "harpy-warrior" ? "#8855aa" : "#7744aa";
    ctx.fillRect(e.x, e.y + 15, e.width, e.height - 15);

    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + 12, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = e.type === "harpy-queen" ? "#9966cc" : "#7744aa";
    ctx.lineWidth = 2;

    const wingOffset = Math.sin(e.flyPattern * 4) * 8;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + 20);
    ctx.quadraticCurveTo(e.x - 15, e.y + 15 + wingOffset, e.x - 20, e.y + 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(e.x + e.width, e.y + 20);
    ctx.quadraticCurveTo(e.x + e.width + 15, e.y + 15 + wingOffset, e.x + e.width + 20, e.y + 25);
    ctx.stroke();

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

  private drawWindBlade(blade: WindBlade) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(blade.x, blade.y);
    ctx.rotate(blade.rotation);

    ctx.strokeStyle = "#66ccff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#66ccff";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.stroke();

    ctx.restore();
  }

  private drawFeather(feather: Feather) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(200, 230, 255, 0.8)";
    ctx.shadowColor = "#66ccff";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.ellipse(feather.x, feather.y, 8, 3, Math.atan2(feather.vy, feather.vx), 0, Math.PI * 2);
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

    ctx.strokeStyle = "#8b7355";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    const windY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, windY, barWidth, barHeight);

    const windPercent = p.wind / p.maxWind;
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(x, windY, barWidth * windPercent, barHeight);

    ctx.strokeStyle = "#4488cc";
    ctx.strokeRect(x, windY, barWidth, barHeight);

    if (p.windGlide) {
      ctx.fillStyle = "#66ccff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#66ccff";
      ctx.shadowBlur = 10;
      ctx.fillText("WIND GLIDE", x, windY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
