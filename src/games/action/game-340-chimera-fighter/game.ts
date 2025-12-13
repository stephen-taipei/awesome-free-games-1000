/**
 * Chimera Fighter Game Engine
 * Game #340
 *
 * Fight mythical chimera beasts with special weapons!
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
  mythicPower: number;
  maxMythicPower: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  berserkerMode: boolean;
  berserkerTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "gryphon" | "manticore" | "chimera";
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

interface MythicBlade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  rotation: number;
}

interface PowerWave {
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
  mythicPower: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const BERSERKER_SPEED = 7.5;
const ATTACK_DURATION = 20;

export class ChimeraFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private mythicBlades: MythicBlade[] = [];
  private powerWaves: PowerWave[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private powerRegenTimer = 0;

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
      mythicPower: 50,
      maxMythicPower: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      berserkerMode: false,
      berserkerTimer: 0,
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
        mythicPower: Math.floor(this.player.mythicPower),
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
    this.mythicBlades = [];
    this.powerWaves = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.mythicPower = 50;
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
    const types: Enemy["type"][] = ["gryphon", "manticore", "chimera"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "chimera" ? 40 : 34,
        height: type === "chimera" ? 50 : 46,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        type,
        health: type === "chimera" ? 6 : type === "manticore" ? 5 : 4,
        maxHealth: type === "chimera" ? 6 : type === "manticore" ? 5 : 4,
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
    this.updateMythicBlades();
    this.updatePowerWaves();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.powerRegenTimer++;
    if (this.powerRegenTimer >= 30) {
      this.powerRegenTimer = 0;
      p.mythicPower = Math.min(p.maxMythicPower, p.mythicPower + 1);
    }

    const speed = p.berserkerMode ? BERSERKER_SPEED : MOVE_SPEED;
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
      p.vy = p.berserkerMode ? JUMP_FORCE * 1.1 : JUMP_FORCE;
      p.isJumping = true;
    }

    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.bladeAttack();
    }

    if (this.keys.special && p.mythicPower >= 40 && !p.berserkerMode) {
      p.mythicPower -= 40;
      p.berserkerMode = true;
      p.berserkerTimer = 240;
      this.spawnPowerWaves();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.berserkerMode) {
      p.berserkerTimer--;
      if (p.berserkerTimer <= 0) p.berserkerMode = false;
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

  private bladeAttack() {
    const p = this.player;
    const range = p.berserkerMode ? 75 : 55;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = p.berserkerMode ? 4 : 2;

    this.mythicBlades.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 13 : -13,
      vy: 0,
      size: p.berserkerMode ? 22 : 16,
      life: 30,
      rotation: 0,
    });

    for (const e of this.enemies) {
      if (e.x + e.width > attackX && e.x < attackX + range && Math.abs(e.y - p.y) < 50) {
        e.health -= damage;
        p.mythicPower = Math.min(p.maxMythicPower, p.mythicPower + 8);
        if (e.health <= 0) {
          this.score += e.type === "chimera" ? 70 : e.type === "manticore" ? 55 : 40;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnPowerWaves() {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.powerWaves.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        life: 50,
        size: 12,
      });
    }
  }

  private updateMythicBlades() {
    for (let i = this.mythicBlades.length - 1; i >= 0; i--) {
      const blade = this.mythicBlades[i];
      blade.x += blade.vx;
      blade.y += blade.vy;
      blade.rotation += 0.3;
      blade.life--;

      if (blade.life <= 0) {
        this.mythicBlades.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBladeHit(blade, e)) {
          e.health -= 2;
          this.mythicBlades.splice(i, 1);
          this.player.mythicPower = Math.min(this.player.maxMythicPower, this.player.mythicPower + 5);
          if (e.health <= 0) {
            this.score += e.type === "chimera" ? 70 : e.type === "manticore" ? 55 : 40;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBladeHit(blade: MythicBlade, target: { x: number; y: number; width: number; height: number }): boolean {
    return blade.x > target.x && blade.x < target.x + target.width && blade.y > target.y && blade.y < target.y + target.height;
  }

  private updatePowerWaves() {
    for (let i = this.powerWaves.length - 1; i >= 0; i--) {
      const wave = this.powerWaves[i];
      wave.x += wave.vx;
      wave.y += wave.vy;
      wave.life--;
      wave.size += 0.2;

      if (wave.life <= 0) {
        this.powerWaves.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkWaveHit(wave, e)) {
          e.health -= 2;
          this.powerWaves.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "chimera" ? 70 : e.type === "manticore" ? 55 : 40;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkWaveHit(wave: PowerWave, target: { x: number; y: number; width: number; height: number }): boolean {
    return wave.x > target.x - 10 && wave.x < target.x + target.width + 10 && wave.y > target.y - 10 && wave.y < target.y + target.height + 10;
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx = -e.vx;
      e.facing = e.vx < 0 ? "left" : "right";

      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "chimera" ? 22 : e.type === "manticore" ? 20 : 15;
        this.hitPlayer(damage);
      }
    }
  }

  private checkEntityCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private hitPlayer(damage: number) {
    if (this.player.berserkerMode) damage = Math.floor(damage * 0.5);
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.mythicPower = Math.min(this.player.maxMythicPower, this.player.mythicPower + 15);
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
    this.player.mythicPower = 50;
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
    gradient.addColorStop(0, "#2a1a3a");
    gradient.addColorStop(0.5, "#3a2a4a");
    gradient.addColorStop(1, "#4a3a5a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(138, 43, 226, 0.15)";
    for (let i = 0; i < 15; i++) {
      const cx = ((i * 180 + Date.now() / 40) % (w + 100)) - 50;
      const cy = 60 + i * 25;
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) this.drawPlatform(plat);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const wave of this.powerWaves) this.drawPowerWave(wave);
    for (const blade of this.mythicBlades) this.drawMythicBlade(blade);
    this.drawPlayer();

    ctx.restore();
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;
    if (plat.height === 40) {
      ctx.fillStyle = "#3a2a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#5a4a6a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      ctx.fillStyle = "#4a3a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#6a5a7a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.5;

    if (p.berserkerMode) {
      ctx.shadowColor = "#8a2be2";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#6a4a7a";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#8a2be2";
      ctx.shadowColor = "#8a2be2";
      ctx.shadowBlur = 15;
      ctx.fillRect(p.x + p.width / 2 - 7, p.y + 7, 5, 5);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 5, 5);
      ctx.shadowBlur = 0;

      // Energy lines
      ctx.strokeStyle = "#8a2be2";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 20 + i * 10);
        ctx.lineTo(p.x + p.width, p.y + 20 + i * 10);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#665588";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#4a3a5a";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);

      // Weapon
      ctx.strokeStyle = "#c0c0c0";
      ctx.lineWidth = 3;
      const weaponX = p.facing === "right" ? p.x + p.width : p.x;
      ctx.beginPath();
      ctx.moveTo(weaponX, p.y + 25);
      ctx.lineTo(weaponX + (p.facing === "right" ? 12 : -12), p.y + 30);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { gryphon: "#d4a574", manticore: "#c85a54", chimera: "#8b4789" };
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Wings for gryphon
    if (e.type === "gryphon") {
      ctx.fillStyle = "rgba(212, 165, 116, 0.6)";
      ctx.beginPath();
      ctx.ellipse(e.x - 5, e.y + 15, 8, 15, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(e.x + e.width + 5, e.y + 15, 8, 15, 0.3, 0, Math.PI * 2);
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

  private drawMythicBlade(blade: MythicBlade) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(blade.x, blade.y);
    ctx.rotate(blade.rotation);

    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(-blade.size / 2, 0);
    ctx.lineTo(blade.size / 2, 0);
    ctx.moveTo(0, -blade.size / 2);
    ctx.lineTo(0, blade.size / 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawPowerWave(wave: PowerWave) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(138, 43, 226, 0.6)";
    ctx.shadowColor = "#8a2be2";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.size, 0, Math.PI * 2);
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
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    const powerY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, powerY, barWidth, barHeight);
    const powerPercent = p.mythicPower / p.maxMythicPower;
    ctx.fillStyle = "#8a2be2";
    ctx.fillRect(x, powerY, barWidth * powerPercent, barHeight);
    ctx.strokeStyle = "#6a1ab2";
    ctx.strokeRect(x, powerY, barWidth, barHeight);

    if (p.berserkerMode) {
      ctx.fillStyle = "#8a2be2";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#8a2be2";
      ctx.shadowBlur = 10;
      ctx.fillText("BERSERKER MODE", x, powerY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
