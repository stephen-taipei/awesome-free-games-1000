/**
 * Oracle Warrior Game Engine
 * Game #355
 *
 * Prophecy-powered combat with time manipulation!
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
  prophecy: number;
  maxProphecy: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  timeStop: boolean;
  timeStopTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "fate-guard" | "time-keeper" | "oracle-beast";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  frozen: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FateBolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface TimeRift {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

interface GameState {
  score: number;
  health: number;
  prophecy: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 20;

export class OracleWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private fateBolts: FateBolt[] = [];
  private timeRifts: TimeRift[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private prophecyRegenTimer = 0;

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
      prophecy: 50,
      maxProphecy: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      timeStop: false,
      timeStopTimer: 0,
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
        prophecy: Math.floor(this.player.prophecy),
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
    this.fateBolts = [];
    this.timeRifts = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.prophecy = 50;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 145 + i * 175 + Math.random() * 75,
        y: h - 115 - Math.random() * 145,
        width: 88 + Math.random() * 57,
        height: 17,
      });
    }

    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["fate-guard", "time-keeper", "oracle-beast"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 290 + i * 215 + Math.random() * 85;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "oracle-beast" ? 45 : 33,
        height: type === "oracle-beast" ? 53 : 45,
        vx: Math.random() > 0.5 ? 2.3 : -2.3,
        type,
        health: type === "oracle-beast" ? 8 : type === "time-keeper" ? 5 : 3,
        maxHealth: type === "oracle-beast" ? 8 : type === "time-keeper" ? 5 : 3,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 100,
        patrolRight: x + 100,
        frozen: false,
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
    this.updateFateBolts();
    this.updateTimeRifts();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.prophecyRegenTimer++;
    if (this.prophecyRegenTimer >= 33) {
      this.prophecyRegenTimer = 0;
      p.prophecy = Math.min(p.maxProphecy, p.prophecy + 1);
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

    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.fateBoltAttack();
    }

    if (this.keys.special && p.prophecy >= 45 && !p.timeStop) {
      p.prophecy -= 45;
      p.timeStop = true;
      p.timeStopTimer = 200;
      this.spawnTimeRifts();
      this.freezeEnemies();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.timeStop) {
      p.timeStopTimer--;
      if (p.timeStopTimer <= 0) {
        p.timeStop = false;
        this.unfreezeEnemies();
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

  private fateBoltAttack() {
    const p = this.player;

    this.fateBolts.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 11 : -11,
      vy: 0,
      size: 16,
      life: 36,
    });
  }

  private spawnTimeRifts() {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.timeRifts.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 5.5,
        vy: Math.sin(angle) * 5.5,
        life: 60,
        size: 13,
      });
    }
  }

  private freezeEnemies() {
    for (const e of this.enemies) {
      e.frozen = true;
    }
  }

  private unfreezeEnemies() {
    for (const e of this.enemies) {
      e.frozen = false;
    }
  }

  private updateFateBolts() {
    for (let i = this.fateBolts.length - 1; i >= 0; i--) {
      const bolt = this.fateBolts[i];
      bolt.x += bolt.vx;
      bolt.y += bolt.vy;
      bolt.life--;

      if (bolt.life <= 0) {
        this.fateBolts.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBoltHit(bolt, e)) {
          e.health -= 2;
          this.fateBolts.splice(i, 1);
          this.player.prophecy = Math.min(this.player.maxProphecy, this.player.prophecy + 9);
          if (e.health <= 0) {
            this.score += e.type === "oracle-beast" ? 90 : e.type === "time-keeper" ? 65 : 42;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBoltHit(bolt: FateBolt, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      bolt.x > target.x &&
      bolt.x < target.x + target.width &&
      bolt.y > target.y &&
      bolt.y < target.y + target.height
    );
  }

  private updateTimeRifts() {
    for (let i = this.timeRifts.length - 1; i >= 0; i--) {
      const rift = this.timeRifts[i];
      rift.x += rift.vx;
      rift.y += rift.vy;
      rift.life--;

      if (rift.life <= 0) {
        this.timeRifts.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkRiftHit(rift, e)) {
          e.health -= 2;
          this.timeRifts.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "oracle-beast" ? 90 : e.type === "time-keeper" ? 65 : 42;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkRiftHit(rift: TimeRift, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      rift.x > target.x - rift.size &&
      rift.x < target.x + target.width + rift.size &&
      rift.y > target.y - rift.size &&
      rift.y < target.y + target.height + rift.size
    );
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (!e.frozen) {
        e.x += e.vx;
        if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
          e.vx = -e.vx;
        }
        e.facing = e.vx < 0 ? "left" : "right";

        if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
          const damage = e.type === "oracle-beast" ? 23 : e.type === "time-keeper" ? 17 : 13;
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
    if (this.player.timeStop) {
      damage = Math.floor(damage * 0.4);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.prophecy = Math.min(this.player.maxProphecy, this.player.prophecy + 13);

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
    this.player.prophecy = 50;
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
    gradient.addColorStop(0, "#2a1a3a");
    gradient.addColorStop(0.5, "#3a2a4a");
    gradient.addColorStop(1, "#4a3a5a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Time sparkles
    ctx.fillStyle = "rgba(255, 215, 100, 0.6)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 89 + Date.now() * 0.02) % w;
      const sy = (i * 67 + Math.sin(Date.now() * 0.001 + i) * 50) % h;
      const size = 1 + Math.sin(Date.now() * 0.003 + i) * 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
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

    for (const rift of this.timeRifts) {
      this.drawTimeRift(rift);
    }

    for (const bolt of this.fateBolts) {
      this.drawFateBolt(bolt);
    }

    this.drawPlayer();

    ctx.restore();

    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      ctx.fillStyle = "#3a2a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a3a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      ctx.fillStyle = "#4a3a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#5a4a6a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.timeStop) {
      ctx.save();
      ctx.strokeStyle = "#ffd764";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ffd764";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 34 + Math.sin(Date.now() * 0.01) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#6a4a7a";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd764";
    ctx.shadowColor = "#ffd764";
    ctx.shadowBlur = 10;
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.frozen) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#aaddff";
    } else {
      ctx.fillStyle = e.type === "oracle-beast" ? "#aa66cc" : e.type === "time-keeper" ? "#9955bb" : "#8844aa";
    }

    ctx.fillRect(e.x, e.y, e.width, e.height);

    if (e.frozen) {
      ctx.strokeStyle = "#aaddff";
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x - 2, e.y - 2, e.width + 4, e.height + 4);
    }

    ctx.globalAlpha = 1;

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

  private drawFateBolt(bolt: FateBolt) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "#ffd764";
    ctx.shadowColor = "#ffd764";
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, bolt.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffdd88";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bolt.x - 8, bolt.y);
    ctx.lineTo(bolt.x + 8, bolt.y);
    ctx.moveTo(bolt.x, bolt.y - 8);
    ctx.lineTo(bolt.x, bolt.y + 8);
    ctx.stroke();

    ctx.restore();
  }

  private drawTimeRift(rift: TimeRift) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(170, 153, 255, 0.85)";
    ctx.shadowColor = "#aa99ff";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(rift.x, rift.y, rift.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 215, 100, 0.6)";
    ctx.beginPath();
    ctx.arc(rift.x, rift.y, rift.size / 2, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#4a3a5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    const prophecyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, prophecyY, barWidth, barHeight);

    const prophecyPercent = p.prophecy / p.maxProphecy;
    ctx.fillStyle = "#ffd764";
    ctx.fillRect(x, prophecyY, barWidth * prophecyPercent, barHeight);

    ctx.strokeStyle = "#cc9944";
    ctx.strokeRect(x, prophecyY, barWidth, barHeight);

    if (p.timeStop) {
      ctx.fillStyle = "#ffd764";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ffd764";
      ctx.shadowBlur = 10;
      ctx.fillText("TIME STOP", x, prophecyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
