/**
 * Golem Master Game Engine
 * Game #339
 *
 * Control and summon golems to fight enemies!
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
  earthMana: number;
  maxEarthMana: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  golemForm: boolean;
  golemFormTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "scout" | "soldier" | "commander";
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

interface RockBlast {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface GolemMinion {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  targetEnemy: number;
}

interface GameState {
  score: number;
  health: number;
  earthMana: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const GOLEM_SPEED = 4;
const ATTACK_DURATION = 20;

export class GolemMasterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private rockBlasts: RockBlast[] = [];
  private golemMinions: GolemMinion[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private manaRegenTimer = 0;

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
      earthMana: 50,
      maxEarthMana: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      golemForm: false,
      golemFormTimer: 0,
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
        earthMana: Math.floor(this.player.earthMana),
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
    this.rockBlasts = [];
    this.golemMinions = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.earthMana = 50;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["scout", "soldier", "commander"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "commander" ? 36 : 32,
        height: type === "commander" ? 48 : 44,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        type,
        health: type === "commander" ? 5 : type === "soldier" ? 4 : 3,
        maxHealth: type === "commander" ? 5 : type === "soldier" ? 4 : 3,
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
    this.updateRockBlasts();
    this.updateGolemMinions();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.manaRegenTimer++;
    if (this.manaRegenTimer >= 30) {
      this.manaRegenTimer = 0;
      p.earthMana = Math.min(p.maxEarthMana, p.earthMana + 1);
    }

    const speed = p.golemForm ? GOLEM_SPEED : MOVE_SPEED;
    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    if (this.keys.jump && !p.isJumping) {
      p.vy = p.golemForm ? JUMP_FORCE * 0.9 : JUMP_FORCE;
      p.isJumping = true;
    }

    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.rockAttack();
    }

    if (this.keys.special && p.earthMana >= 40 && !p.golemForm) {
      p.earthMana -= 40;
      p.golemForm = true;
      p.golemFormTimer = 240;
      p.width = 42;
      p.height = 52;
      this.spawnGolemMinions();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.golemForm) {
      p.golemFormTimer--;
      if (p.golemFormTimer <= 0) {
        p.golemForm = false;
        p.width = 32;
        p.height = 46;
      }
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

  private rockAttack() {
    const p = this.player;
    const range = p.golemForm ? 70 : 50;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = p.golemForm ? 4 : 2;

    this.rockBlasts.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 11 : -11,
      vy: 0,
      size: p.golemForm ? 20 : 14,
      life: 35,
    });

    for (const e of this.enemies) {
      if (e.x + e.width > attackX && e.x < attackX + range && Math.abs(e.y - p.y) < 50) {
        e.health -= damage;
        p.earthMana = Math.min(p.maxEarthMana, p.earthMana + 8);
        if (e.health <= 0) {
          this.score += e.type === "commander" ? 60 : e.type === "soldier" ? 45 : 30;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnGolemMinions() {
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4;
      this.golemMinions.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 60,
        targetEnemy: -1,
      });
    }
  }

  private updateRockBlasts() {
    for (let i = this.rockBlasts.length - 1; i >= 0; i--) {
      const blast = this.rockBlasts[i];
      blast.x += blast.vx;
      blast.y += blast.vy;
      blast.life--;

      if (blast.life <= 0) {
        this.rockBlasts.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBlastHit(blast, e)) {
          e.health -= 1;
          this.rockBlasts.splice(i, 1);
          this.player.earthMana = Math.min(this.player.maxEarthMana, this.player.earthMana + 4);
          if (e.health <= 0) {
            this.score += e.type === "commander" ? 60 : e.type === "soldier" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBlastHit(blast: RockBlast, target: { x: number; y: number; width: number; height: number }): boolean {
    return blast.x > target.x && blast.x < target.x + target.width && blast.y > target.y && blast.y < target.y + target.height;
  }

  private updateGolemMinions() {
    for (let i = this.golemMinions.length - 1; i >= 0; i--) {
      const minion = this.golemMinions[i];
      minion.x += minion.vx;
      minion.y += minion.vy;
      minion.life--;

      if (minion.life <= 0) {
        this.golemMinions.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkMinionHit(minion, e)) {
          e.health -= 2;
          this.golemMinions.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "commander" ? 60 : e.type === "soldier" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkMinionHit(minion: GolemMinion, target: { x: number; y: number; width: number; height: number }): boolean {
    return minion.x > target.x - 10 && minion.x < target.x + target.width + 10 && minion.y > target.y - 10 && minion.y < target.y + target.height + 10;
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx = -e.vx;
      e.facing = e.vx < 0 ? "left" : "right";

      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "commander" ? 20 : e.type === "soldier" ? 18 : 12;
        this.hitPlayer(damage);
      }
    }
  }

  private checkEntityCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private hitPlayer(damage: number) {
    if (this.player.golemForm) damage = Math.floor(damage * 0.4);
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.earthMana = Math.min(this.player.maxEarthMana, this.player.earthMana + 15);
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
    this.player.earthMana = 50;
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
    gradient.addColorStop(0, "#3a2a1a");
    gradient.addColorStop(0.5, "#5a4a3a");
    gradient.addColorStop(1, "#7a6a5a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(139, 90, 43, 0.3)";
    for (let i = 0; i < 20; i++) {
      const rx = (i * 113) % w;
      const ry = (i * 71) % h;
      ctx.fillRect(rx, ry, 4, 4);
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) this.drawPlatform(plat);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const minion of this.golemMinions) this.drawGolemMinion(minion);
    for (const blast of this.rockBlasts) this.drawRockBlast(blast);
    this.drawPlayer();

    ctx.restore();
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;
    if (plat.height === 40) {
      ctx.fillStyle = "#654321";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#8b5a3c";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      ctx.fillStyle = "#8b5a3c";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#a0694f";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.5;

    if (p.golemForm) {
      ctx.fillStyle = "#5a5a5a";
      ctx.fillRect(p.x + 5, p.y + 15, p.width - 10, p.height - 15);
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(p.x + 10, p.y + 5, p.width - 20, 20);
      ctx.fillStyle = "#ff6600";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x + p.width / 2 - 8, p.y + 12, 5, 5);
      ctx.fillRect(p.x + p.width / 2 + 3, p.y + 12, 5, 5);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#8b7355";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);
      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#654321";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { scout: "#556b2f", soldier: "#8b4513", commander: "#8b0000" };
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

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

  private drawRockBlast(blast: RockBlast) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#a0522d";
    ctx.shadowColor = "#8b4513";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGolemMinion(minion: GolemMinion) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(90, 90, 90, 0.8)";
    ctx.shadowColor = "#5a5a5a";
    ctx.shadowBlur = 10;
    ctx.fillRect(minion.x - 6, minion.y - 6, 12, 12);
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(minion.x - 2, minion.y - 2, 4, 4);
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
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    const manaY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, manaY, barWidth, barHeight);
    const manaPercent = p.earthMana / p.maxEarthMana;
    ctx.fillStyle = "#8b5a3c";
    ctx.fillRect(x, manaY, barWidth * manaPercent, barHeight);
    ctx.strokeStyle = "#654321";
    ctx.strokeRect(x, manaY, barWidth, barHeight);

    if (p.golemForm) {
      ctx.fillStyle = "#ff6600";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 10;
      ctx.fillText("GOLEM FORM", x, manaY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
