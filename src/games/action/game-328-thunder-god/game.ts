/**
 * Thunder God Game Engine
 * Game #328
 *
 * Command the power of thunder and lightning!
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
  thunder: number;
  maxThunder: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  charged: boolean;
  chargeTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "golem" | "elemental" | "titan";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  stunned: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LightningBolt {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  life: number;
  branches: { x: number; y: number }[];
}

interface ThunderWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  thunder: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -15;
const MOVE_SPEED = 6;
const ATTACK_DURATION = 15;
const ATTACK_RANGE = 70;

export class ThunderGodGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private lightningBolts: LightningBolt[] = [];
  private thunderWaves: ThunderWave[] = [];
  private sparks: Spark[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private thunderRegenTimer = 0;

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
      thunder: 100,
      maxThunder: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      charged: false,
      chargeTimer: 0,
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
        thunder: Math.floor(this.player.thunder),
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
    this.lightningBolts = [];
    this.thunderWaves = [];
    this.sparks = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.thunder = this.player.maxThunder;
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

    // Cloud-like platforms
    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 170 + Math.random() * 70,
        y: h - 130 - Math.random() * 150,
        width: 100 + Math.random() * 50,
        height: 20,
      });
    }

    // Earth enemies
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["golem", "elemental", "titan"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 210 + Math.random() * 70;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "titan" ? 42 : type === "golem" ? 36 : 30,
        height: type === "titan" ? 55 : type === "golem" ? 46 : 40,
        vx: type === "elemental" ? 3 : 2,
        type,
        health: type === "titan" ? 6 : type === "golem" ? 4 : 2,
        maxHealth: type === "titan" ? 6 : type === "golem" ? 4 : 2,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 80,
        patrolRight: x + 80,
        stunned: 0,
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
    this.updateLightningBolts();
    this.updateThunderWaves();
    this.updateSparks();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Thunder regeneration
    this.thunderRegenTimer++;
    if (this.thunderRegenTimer >= 20) {
      this.thunderRegenTimer = 0;
      p.thunder = Math.min(p.maxThunder, p.thunder + 2);
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

    // Jump (higher when charged)
    if (this.keys.jump && !p.isJumping) {
      p.vy = p.charged ? JUMP_FORCE * 1.3 : JUMP_FORCE;
      p.isJumping = true;
    }

    // Lightning Strike Attack
    if (this.keys.attack && !p.isAttacking && p.thunder >= 10) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.thunder -= 10;
      this.performLightningStrike();
    }

    // Special: Thunder Charge
    if (this.keys.special && p.thunder >= 35 && !p.charged) {
      p.thunder -= 35;
      p.charged = true;
      p.chargeTimer = 240;
      this.createThunderWave(p.x + p.width / 2, p.y + p.height / 2);
      // Stun nearby enemies
      for (const e of this.enemies) {
        const dx = (e.x + e.width / 2) - (p.x + p.width / 2);
        const dy = (e.y + e.height / 2) - (p.y + p.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          e.stunned = 90;
          e.health--;
        }
      }
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update charge timer
    if (p.charged) {
      p.chargeTimer--;
      // Create sparks while charged
      if (Math.random() < 0.3) {
        this.sparks.push({
          x: p.x + Math.random() * p.width,
          y: p.y + Math.random() * p.height,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 20,
        });
      }
      if (p.chargeTimer <= 0) {
        p.charged = false;
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

  private performLightningStrike() {
    const p = this.player;
    const targetX = p.facing === "right" ? p.x + p.width + ATTACK_RANGE / 2 : p.x - ATTACK_RANGE / 2;

    // Create lightning bolt from sky
    this.lightningBolts.push({
      x: targetX,
      y: 0,
      targetX: targetX,
      targetY: p.y + p.height / 2,
      life: 20,
      branches: this.generateLightningBranches(targetX, 0, targetX, p.y + p.height / 2),
    });

    // Damage enemies in range
    const damage = this.player.charged ? 4 : 2;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = (e.x + e.width / 2) - targetX;
      const dy = (e.y + e.height / 2) - (p.y + p.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ATTACK_RANGE) {
        e.health -= damage;
        e.stunned = 30;
        this.createSparksAt(e.x + e.width / 2, e.y + e.height / 2);

        if (e.health <= 0) {
          this.score += e.type === "titan" ? 60 : e.type === "golem" ? 35 : 20;
          this.createThunderWave(e.x + e.width / 2, e.y + e.height / 2);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private generateLightningBranches(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
    const branches: { x: number; y: number }[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      branches.push({
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30 * (1 - Math.abs(t - 0.5) * 2),
        y: y1 + (y2 - y1) * t,
      });
    }
    return branches;
  }

  private createThunderWave(x: number, y: number) {
    this.thunderWaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 100,
      alpha: 1,
    });
  }

  private createSparksAt(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 25,
      });
    }
  }

  private updateLightningBolts() {
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const bolt = this.lightningBolts[i];
      bolt.life--;
      if (bolt.life <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }
  }

  private updateThunderWaves() {
    for (let i = this.thunderWaves.length - 1; i >= 0; i--) {
      const wave = this.thunderWaves[i];
      wave.radius += 5;
      wave.alpha -= 0.04;

      if (wave.alpha <= 0) {
        this.thunderWaves.splice(i, 1);
      }
    }
  }

  private updateSparks() {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.life--;

      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Skip if stunned
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }

      // Patrol movement
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "titan" ? 20 : e.type === "golem" ? 12 : 8;
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
    if (this.player.charged) {
      damage = Math.floor(damage * 0.5);
    }
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
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
    this.player.thunder = this.player.maxThunder;
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

    // Background - stormy sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a3a");
    gradient.addColorStop(0.3, "#2a2a4a");
    gradient.addColorStop(0.7, "#3a3a5a");
    gradient.addColorStop(1, "#4a4a6a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Storm clouds
    ctx.fillStyle = "rgba(30, 30, 50, 0.6)";
    for (let i = 0; i < 8; i++) {
      const cloudX = (i * 120 + Date.now() / 100) % (w + 200) - 100;
      const cloudY = 30 + Math.sin(i * 2) * 20;
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 50, 0, Math.PI * 2);
      ctx.arc(cloudX + 40, cloudY + 10, 40, 0, Math.PI * 2);
      ctx.arc(cloudX - 30, cloudY + 5, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw thunder waves
    for (const wave of this.thunderWaves) {
      this.drawThunderWave(wave);
    }

    // Draw lightning bolts
    for (const bolt of this.lightningBolts) {
      this.drawLightningBolt(bolt);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw sparks
    for (const spark of this.sparks) {
      this.drawSpark(spark);
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
      // Ground with rocky texture
      ctx.fillStyle = "#3a3a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a4a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Cloud platform
      ctx.fillStyle = "rgba(100, 100, 150, 0.8)";
      ctx.beginPath();
      ctx.ellipse(plat.x + plat.width / 2, plat.y + plat.height / 2, plat.width / 2, plat.height, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(0, 212, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Charged aura
    if (p.charged) {
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 50) * 0.2;
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#00d4ff";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Thunder god body (blue/electric)
    ctx.fillStyle = p.charged ? "#4a9fff" : "#2a5a9f";
    ctx.fillRect(p.x + 3, p.y + 14, p.width - 6, p.height - 14);

    // Helmet with lightning crown
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(p.x, p.y, p.width, 16);

    // Lightning bolt on helmet
    ctx.fillStyle = "#00d4ff";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 - 5, p.y - 8);
    ctx.lineTo(p.x + p.width / 2 + 3, p.y);
    ctx.lineTo(p.x + p.width / 2 - 2, p.y);
    ctx.lineTo(p.x + p.width / 2 + 5, p.y + 10);
    ctx.lineTo(p.x + p.width / 2 - 3, p.y + 2);
    ctx.lineTo(p.x + p.width / 2 + 2, p.y + 2);
    ctx.closePath();
    ctx.fill();

    // Eyes (glowing when charged)
    ctx.fillStyle = p.charged ? "#ffffff" : "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = p.charged ? 10 : 5;
    if (p.facing === "right") {
      ctx.fillRect(p.x + 20, p.y + 6, 8, 4);
    } else {
      ctx.fillRect(p.x + 6, p.y + 6, 8, 4);
    }
    ctx.shadowBlur = 0;

    // Cape (storm cloud color)
    ctx.fillStyle = "#1a2a4a";
    const capeOffset = Math.sin(Date.now() / 120) * 5;
    if (p.facing === "right") {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 14);
      ctx.lineTo(p.x - 12 + capeOffset, p.y + p.height + 8);
      ctx.lineTo(p.x + 12, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x + p.width, p.y + 14);
      ctx.lineTo(p.x + p.width + 12 - capeOffset, p.y + p.height + 8);
      ctx.lineTo(p.x + p.width - 12, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    }

    // Attack effect
    if (p.isAttacking) {
      ctx.strokeStyle = "#00d4ff";
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.moveTo(p.x + p.width, p.y + p.height / 2);
        ctx.lineTo(p.x + p.width + 50, p.y + p.height / 2 - 15);
      } else {
        ctx.moveTo(p.x, p.y + p.height / 2);
        ctx.lineTo(p.x - 50, p.y + p.height / 2 - 15);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Stunned flash
    if (e.stunned > 0 && Math.floor(e.stunned / 3) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }

    // Body color based on type
    const colors = {
      golem: "#6b5b4f",
      elemental: "#8b4513",
      titan: "#4a3728",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Rock texture
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(e.x + 5 + i * 10, e.y + 15 + (i % 2) * 10, 6, 6);
    }

    // Eyes (glow orange)
    ctx.fillStyle = "#ff6600";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 5;
    ctx.fillRect(e.x + 5, e.y + 8, 6, 4);
    ctx.fillRect(e.x + e.width - 11, e.y + 8, 6, 4);
    ctx.shadowBlur = 0;

    // Titan extra details
    if (e.type === "titan") {
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(e.x - 5, e.y + 20, 8, 25);
      ctx.fillRect(e.x + e.width - 3, e.y + 20, 8, 25);
    }

    ctx.globalAlpha = 1;

    // Health bar
    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#ff6600";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawLightningBolt(bolt: LightningBolt) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Main bolt
    ctx.beginPath();
    ctx.moveTo(bolt.branches[0].x, bolt.branches[0].y);
    for (let i = 1; i < bolt.branches.length; i++) {
      ctx.lineTo(bolt.branches[i].x, bolt.branches[i].y);
    }
    ctx.stroke();

    // Inner glow
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawThunderWave(wave: ThunderWave) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = wave.alpha;

    ctx.strokeStyle = "#00d4ff";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawSpark(spark: Spark) {
    const ctx = this.ctx;

    ctx.fillStyle = `rgba(0, 212, 255, ${spark.life / 25})`;
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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

    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Thunder bar
    const thunderY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, thunderY, barWidth, barHeight);

    const thunderPercent = p.thunder / p.maxThunder;
    ctx.fillStyle = "#00d4ff";
    ctx.fillRect(x, thunderY, barWidth * thunderPercent, barHeight);

    ctx.strokeStyle = "#00d4ff";
    ctx.strokeRect(x, thunderY, barWidth, barHeight);

    // Charged indicator
    if (p.charged) {
      ctx.fillStyle = "#00d4ff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("THUNDER CHARGED!", x, thunderY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
