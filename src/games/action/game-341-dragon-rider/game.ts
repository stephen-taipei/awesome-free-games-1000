/**
 * Dragon Rider Game Engine
 * Game #341
 *
 * Ride majestic dragons and breathe fire to defeat enemies!
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
  dragonBreath: boolean;
  dragonBreathTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "archer" | "ballista" | "dragon-slayer";
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

interface Fireball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface FlameWave {
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

const GRAVITY = 0.4;
const FLY_FORCE = -0.8;
const MOVE_SPEED = 6;
const ATTACK_DURATION = 20;

export class DragonRiderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private fireballs: Fireball[] = [];
  private flameWaves: FlameWave[] = [];
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
      width: 48,
      height: 40,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 50,
      maxEnergy: 100,
      facing: "right",
      isFlying: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      dragonBreath: false,
      dragonBreathTimer: 0,
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
    this.fireballs = [];
    this.flameWaves = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.energy = 50;
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

    // Mountain platforms
    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 120 + i * 200 + Math.random() * 60,
        y: h - 100 - Math.random() * 160,
        width: 80 + Math.random() * 70,
        height: 15,
      });
    }

    // Enemies
    const enemyCount = 5 + this.level * 2;
    const types: Enemy["type"][] = ["archer", "ballista", "dragon-slayer"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 350 + i * 240 + Math.random() * 70;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "dragon-slayer" ? 38 : 34,
        height: type === "dragon-slayer" ? 50 : 46,
        vx: Math.random() > 0.5 ? 2 : -2,
        type,
        health: type === "dragon-slayer" ? 6 : type === "ballista" ? 5 : 3,
        maxHealth: type === "dragon-slayer" ? 6 : type === "ballista" ? 5 : 3,
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
    this.updateFireballs();
    this.updateFlameWaves();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Energy regeneration
    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 25) {
      this.energyRegenTimer = 0;
      p.energy = Math.min(p.maxEnergy, p.energy + 1);
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

    // Flying (dragons can fly continuously)
    if (this.keys.jump && p.energy > 0) {
      p.vy += FLY_FORCE;
      p.isFlying = true;
      p.energy -= 0.3;
    } else {
      p.isFlying = false;
    }

    // Fireball Attack
    if (this.keys.attack && !p.isAttacking && p.energy >= 10) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.energy -= 10;
      this.shootFireball();
    }

    // Special: Dragon Breath (massive flame wave)
    if (this.keys.special && p.energy >= 40 && !p.dragonBreath) {
      p.energy -= 40;
      p.dragonBreath = true;
      p.dragonBreathTimer = 60;
      this.spawnFlameWave();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update dragon breath
    if (p.dragonBreath) {
      p.dragonBreathTimer--;
      if (p.dragonBreathTimer <= 0) {
        p.dragonBreath = false;
      }
    }

    // Update invincibility
    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) {
        p.invincible = false;
      }
    }

    // Apply gravity (lighter when flying)
    p.vy += p.isFlying ? GRAVITY * 0.3 : GRAVITY;
    p.vy = Math.min(p.vy, 12); // Terminal velocity

    // Apply velocity
    p.x += p.vx;
    p.y += p.vy;

    // Platform collision
    for (const plat of this.platforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
        }
      }
    }

    // World bounds
    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));
    p.y = Math.max(0, p.y);

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

  private shootFireball() {
    const p = this.player;
    const speed = 12;
    const offsetX = p.facing === "right" ? p.width : 0;

    this.fireballs.push({
      x: p.x + offsetX,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? speed : -speed,
      vy: 0,
      size: 10,
      life: 100,
    });
  }

  private spawnFlameWave() {
    const p = this.player;
    const speed = 8;

    this.flameWaves.push({
      x: p.x,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? speed : -speed,
      vy: 0,
      life: 80,
      width: 0,
    });
  }

  private updateFireballs() {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.x += fb.vx;
      fb.y += fb.vy;
      fb.life--;

      if (fb.life <= 0) {
        this.fireballs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFireballHit(fb, e)) {
          e.health -= 2;
          this.fireballs.splice(i, 1);
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 3);
          if (e.health <= 0) {
            this.score += e.type === "dragon-slayer" ? 70 : e.type === "ballista" ? 55 : 35;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkFireballHit(fb: Fireball, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      fb.x > target.x &&
      fb.x < target.x + target.width &&
      fb.y > target.y &&
      fb.y < target.y + target.height
    );
  }

  private updateFlameWaves() {
    for (let i = this.flameWaves.length - 1; i >= 0; i--) {
      const wave = this.flameWaves[i];
      wave.x += wave.vx;
      wave.y += wave.vy;
      wave.life--;
      wave.width = Math.min(120, wave.width + 3);

      if (wave.life <= 0) {
        this.flameWaves.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkFlameWaveHit(wave, e)) {
          e.health -= 1;
          if (e.health <= 0) {
            this.score += e.type === "dragon-slayer" ? 70 : e.type === "ballista" ? 55 : 35;
            this.enemies.splice(j, 1);
          }
        }
      }
    }
  }

  private checkFlameWaveHit(wave: FlameWave, target: { x: number; y: number; width: number; height: number }): boolean {
    const waveDirection = wave.vx > 0 ? 1 : -1;
    const waveLeft = waveDirection > 0 ? wave.x : wave.x - wave.width;
    const waveRight = waveDirection > 0 ? wave.x + wave.width : wave.x;

    return (
      waveRight > target.x &&
      waveLeft < target.x + target.width &&
      wave.y > target.y - 20 &&
      wave.y < target.y + target.height + 20
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
        const damage = e.type === "dragon-slayer" ? 25 : e.type === "ballista" ? 20 : 15;
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
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 10);

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
    this.player.energy = 50;
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

    // Background - sky with mountains
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a2a4a");
    gradient.addColorStop(0.5, "#2a4a6a");
    gradient.addColorStop(1, "#3a5a7a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Sun
    ctx.fillStyle = "rgba(255, 200, 100, 0.9)";
    ctx.shadowColor = "rgba(255, 200, 100, 0.5)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(w - 100, 80, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 5; i++) {
      const cx = (i * 150 + this.cameraX * 0.3) % (w + 100);
      const cy = 60 + i * 25;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.arc(cx + 25, cy, 25, 0, Math.PI * 2);
      ctx.arc(cx + 45, cy, 30, 0, Math.PI * 2);
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

    // Draw flame waves
    for (const wave of this.flameWaves) {
      this.drawFlameWave(wave);
    }

    // Draw fireballs
    for (const fb of this.fireballs) {
      this.drawFireball(fb);
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
      // Ground - mountain rock
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Mountain ledges
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#7a6a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Dragon body
    ctx.fillStyle = "#8b0000";
    ctx.fillRect(p.x + 8, p.y + 12, p.width - 16, p.height - 12);

    // Dragon head
    ctx.fillStyle = "#a00000";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 10, 16, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = "#5a0000";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 - 10, p.y + 5);
    ctx.lineTo(p.x + p.width / 2 - 15, p.y - 8);
    ctx.lineTo(p.x + p.width / 2 - 5, p.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2 + 10, p.y + 5);
    ctx.lineTo(p.x + p.width / 2 + 15, p.y - 8);
    ctx.lineTo(p.x + p.width / 2 + 5, p.y + 2);
    ctx.closePath();
    ctx.fill();

    // Eyes - glowing
    ctx.fillStyle = "#ff6600";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x + p.width / 2 - 8, p.y + 8, 4, 4);
    ctx.fillRect(p.x + p.width / 2 + 4, p.y + 8, 4, 4);
    ctx.shadowBlur = 0;

    // Wings
    ctx.fillStyle = "rgba(139, 0, 0, 0.7)";
    const wingFlap = Math.sin(Date.now() / 100) * 5;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 15);
    ctx.lineTo(p.x - 5, p.y + 10 + wingFlap);
    ctx.lineTo(p.x + 5, p.y + 25);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 15);
    ctx.lineTo(p.x + p.width + 5, p.y + 10 - wingFlap);
    ctx.lineTo(p.x + p.width - 5, p.y + 25);
    ctx.closePath();
    ctx.fill();

    // Tail
    ctx.strokeStyle = "#8b0000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + p.height);
    ctx.quadraticCurveTo(
      p.x + p.width / 2 + 15,
      p.y + p.height + 10,
      p.x + p.width / 2 + 20,
      p.y + p.height
    );
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      archer: "#2d5016",
      ballista: "#4a4a4a",
      "dragon-slayer": "#6a0000",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Weapon indicators
    if (e.type === "archer") {
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 2;
      const bowX = e.facing === "right" ? e.x + e.width : e.x - 12;
      ctx.beginPath();
      ctx.arc(bowX + 6, e.y + e.height / 3, 8, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }

    if (e.type === "ballista") {
      ctx.fillStyle = "#333";
      const balX = e.facing === "right" ? e.x + e.width : e.x - 20;
      ctx.fillRect(balX, e.y + e.height / 3, 20, 8);
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

  private drawFireball(fb: Fireball) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "#ff6600";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, fb.size, 0, Math.PI * 2);
    ctx.fill();

    // Inner flame
    ctx.fillStyle = "#ffcc00";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(fb.x, fb.y, fb.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFlameWave(wave: FlameWave) {
    const ctx = this.ctx;

    ctx.save();
    const direction = wave.vx > 0 ? 1 : -1;
    const startX = direction > 0 ? wave.x : wave.x - wave.width;

    // Outer flame
    ctx.fillStyle = "rgba(255, 102, 0, 0.6)";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 20;
    ctx.fillRect(startX, wave.y - 20, wave.width, 40);

    // Inner flame
    ctx.fillStyle = "rgba(255, 204, 0, 0.8)";
    ctx.shadowBlur = 15;
    ctx.fillRect(startX + wave.width * 0.2, wave.y - 15, wave.width * 0.6, 30);

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

    ctx.strokeStyle = "#8b0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Energy bar
    const energyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, energyY, barWidth, barHeight);

    const energyPercent = p.energy / p.maxEnergy;
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(x, energyY, barWidth * energyPercent, barHeight);

    ctx.strokeStyle = "#a00000";
    ctx.strokeRect(x, energyY, barWidth, barHeight);

    // Dragon Breath indicator
    if (p.dragonBreath) {
      ctx.fillStyle = "#ff6600";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 10;
      ctx.fillText("DRAGON BREATH!", x, energyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
