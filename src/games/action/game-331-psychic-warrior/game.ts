/**
 * Psychic Warrior Game Engine
 * Game #331
 *
 * Psychic powers combat action game with telekinesis and mind control!
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
  psychicEnergy: number;
  maxPsychicEnergy: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  mindControlActive: boolean;
  mindControlTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "psychic-drone" | "mind-beast" | "psi-soldier";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  mindControlled: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TelekinesisOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface PsychicWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface GameState {
  score: number;
  health: number;
  psychicEnergy: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 25;
const ATTACK_RANGE = 60;

export class PsychicWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private telekinesisOrbs: TelekinesisOrb[] = [];
  private psychicWaves: PsychicWave[] = [];
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
      width: 32,
      height: 44,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      psychicEnergy: 100,
      maxPsychicEnergy: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      mindControlActive: false,
      mindControlTimer: 0,
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
        psychicEnergy: Math.floor(this.player.psychicEnergy),
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
    this.telekinesisOrbs = [];
    this.psychicWaves = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.psychicEnergy = this.player.maxPsychicEnergy;
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

    // Psychic platforms
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    // Enemies
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["psychic-drone", "mind-beast", "psi-soldier"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "mind-beast" ? 36 : 30,
        height: type === "mind-beast" ? 48 : 40,
        vx: type === "psychic-drone" ? 0 : (Math.random() > 0.5 ? 2.5 : -2.5),
        type,
        health: type === "mind-beast" ? 4 : type === "psi-soldier" ? 3 : 2,
        maxHealth: type === "mind-beast" ? 4 : type === "psi-soldier" ? 3 : 2,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 100,
        patrolRight: x + 100,
        mindControlled: false,
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
    this.updateTelekinesisOrbs();
    this.updatePsychicWaves();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Energy regeneration
    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 30) {
      this.energyRegenTimer = 0;
      p.psychicEnergy = Math.min(p.maxPsychicEnergy, p.psychicEnergy + 1);
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
    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Telekinesis Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.performTelekinesisAttack();
    }

    // Special: Mind Control Wave
    if (this.keys.special && p.psychicEnergy >= 35 && !p.mindControlActive) {
      p.psychicEnergy -= 35;
      p.mindControlActive = true;
      p.mindControlTimer = 200;
      this.createPsychicWave(p.x + p.width / 2, p.y + p.height / 2);
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update mind control timer
    if (p.mindControlActive) {
      p.mindControlTimer--;
      if (p.mindControlTimer <= 0) {
        p.mindControlActive = false;
        // Release controlled enemies
        this.enemies.forEach(e => e.mindControlled = false);
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

  private performTelekinesisAttack() {
    const p = this.player;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - ATTACK_RANGE;

    // Create telekinesis orb projectile
    this.telekinesisOrbs.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 12 : -12,
      vy: 0,
      size: 10,
      life: 40,
    });

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (
        e.x + e.width > attackX &&
        e.x < attackX + ATTACK_RANGE &&
        Math.abs(e.y - p.y) < 50
      ) {
        e.health -= 2;
        if (e.health <= 0) {
          this.score += e.type === "mind-beast" ? 40 : e.type === "psi-soldier" ? 30 : 15;
          this.createPsychicWave(e.x + e.width / 2, e.y + e.height / 2);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private createPsychicWave(x: number, y: number) {
    this.psychicWaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 100,
      alpha: 1,
    });
  }

  private updateTelekinesisOrbs() {
    for (let i = this.telekinesisOrbs.length - 1; i >= 0; i--) {
      const orb = this.telekinesisOrbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.life--;

      if (orb.life <= 0) {
        this.telekinesisOrbs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkOrbHit(orb, e)) {
          e.health--;
          this.telekinesisOrbs.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "mind-beast" ? 40 : e.type === "psi-soldier" ? 30 : 15;
            this.createPsychicWave(e.x + e.width / 2, e.y + e.height / 2);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkOrbHit(orb: TelekinesisOrb, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      orb.x > target.x &&
      orb.x < target.x + target.width &&
      orb.y > target.y &&
      orb.y < target.y + target.height
    );
  }

  private updatePsychicWaves() {
    for (let i = this.psychicWaves.length - 1; i >= 0; i--) {
      const wave = this.psychicWaves[i];
      wave.radius += 5;
      wave.alpha -= 0.03;

      // Mind control enemies in wave radius
      if (wave.radius < wave.maxRadius / 2 && this.player.mindControlActive) {
        for (const e of this.enemies) {
          const dx = (e.x + e.width / 2) - wave.x;
          const dy = (e.y + e.height / 2) - wave.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < wave.radius) {
            e.mindControlled = true;
          }
        }
      }

      // Damage enemies if not mind control wave
      if (!this.player.mindControlActive && wave.radius < wave.maxRadius / 2) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dx = (e.x + e.width / 2) - wave.x;
          const dy = (e.y + e.height / 2) - wave.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < wave.radius) {
            e.health--;
            if (e.health <= 0) {
              this.score += e.type === "mind-beast" ? 40 : e.type === "psi-soldier" ? 30 : 15;
              this.enemies.splice(j, 1);
            }
          }
        }
      }

      if (wave.alpha <= 0) {
        this.psychicWaves.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (e.mindControlled) {
        // Controlled enemies attack other enemies
        for (const target of this.enemies) {
          if (target !== e && !target.mindControlled) {
            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 150) {
              e.x += (dx / dist) * 2;
              if (this.checkEntityCollision(e, target)) {
                target.health -= 0.1;
              }
            }
          }
        }
      } else {
        // Normal AI behavior
        if (e.type === "psychic-drone") {
          // Drone floats toward player
          const dx = this.player.x - e.x;
          const dy = this.player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            e.x += (dx / dist) * 1.5;
            e.y += (dy / dist) * 0.5;
          }
          e.facing = this.player.x < e.x ? "left" : "right";
        } else {
          // Patrol movement
          e.x += e.vx;
          if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
            e.vx = -e.vx;
          }
          e.facing = e.vx < 0 ? "left" : "right";
        }

        // Check player collision
        if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
          this.hitPlayer(e.type === "mind-beast" ? 15 : e.type === "psi-soldier" ? 12 : 10);
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
    this.player.psychicEnergy = this.player.maxPsychicEnergy;
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

    // Background - psychic void
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a0033");
    gradient.addColorStop(0.4, "#2d0055");
    gradient.addColorStop(1, "#4a0088");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Psychic energy particles
    ctx.fillStyle = "rgba(147, 51, 234, 0.4)";
    for (let i = 0; i < 40; i++) {
      const px = (i * 97 + Date.now() / 50) % w;
      const py = (i * 53 + Math.sin(Date.now() / 500 + i)) % h;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw psychic waves
    for (const wave of this.psychicWaves) {
      this.drawPsychicWave(wave);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw telekinesis orbs
    for (const orb of this.telekinesisOrbs) {
      this.drawTelekinesisOrb(orb);
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
      ctx.fillStyle = "#2d1a4d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a2d7d";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Psychic platforms with glow
      ctx.shadowColor = "#9333ea";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#3d1a5d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#7d3dbd";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Mind control aura effect
    if (p.mindControlActive) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.15;
      ctx.fillStyle = "#9333ea";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Psychic warrior body (purple/pink)
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    // Head with psychic glow
    ctx.shadowColor = "#9333ea";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Third eye
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Energy trails
    if (p.isAttacking) {
      ctx.save();
      ctx.shadowColor = "#9333ea";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.moveTo(p.x + p.width, p.y + p.height / 2);
        ctx.lineTo(p.x + p.width + 35, p.y + p.height / 2 - 5);
      } else {
        ctx.moveTo(p.x, p.y + p.height / 2);
        ctx.lineTo(p.x - 35, p.y + p.height / 2 - 5);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Mind control indicator
    if (e.mindControlled) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "#9333ea";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Body color based on type
    const colors = {
      "psychic-drone": "#1e40af",
      "mind-beast": "#dc2626",
      "psi-soldier": "#65a30d",
    };

    ctx.fillStyle = colors[e.type];

    if (e.type === "psychic-drone") {
      // Floating sphere
      const gradient = ctx.createRadialGradient(e.x + e.width / 2, e.y + e.height / 2, 0, e.x + e.width / 2, e.y + e.height / 2, e.width / 2);
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(1, "#1e40af");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Eyes
      ctx.fillStyle = e.mindControlled ? "#9333ea" : "#ff0000";
      ctx.fillRect(e.x + 5, e.y + 8, 6, 4);
      ctx.fillRect(e.x + e.width - 11, e.y + 8, 6, 4);

      // Beast features
      if (e.type === "mind-beast") {
        ctx.fillStyle = "#991b1b";
        ctx.beginPath();
        ctx.moveTo(e.x + 5, e.y);
        ctx.lineTo(e.x, e.y - 10);
        ctx.lineTo(e.x + 10, e.y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.x + e.width - 5, e.y);
        ctx.lineTo(e.x + e.width, e.y - 10);
        ctx.lineTo(e.x + e.width - 10, e.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Health bar
    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = e.mindControlled ? "#9333ea" : "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawTelekinesisOrb(orb: TelekinesisOrb) {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = "#9333ea";
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
    gradient.addColorStop(0, "#fbbf24");
    gradient.addColorStop(0.5, "#9333ea");
    gradient.addColorStop(1, "rgba(147, 51, 234, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPsychicWave(wave: PsychicWave) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = wave.alpha;

    const gradient = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, wave.radius);
    gradient.addColorStop(0, "rgba(168, 85, 247, 0.8)");
    gradient.addColorStop(0.5, "rgba(147, 51, 234, 0.5)");
    gradient.addColorStop(1, "rgba(147, 51, 234, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#9333ea";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Psychic Energy bar
    const energyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, energyY, barWidth, barHeight);

    const energyPercent = p.psychicEnergy / p.maxPsychicEnergy;
    ctx.fillStyle = "#9333ea";
    ctx.fillRect(x, energyY, barWidth * energyPercent, barHeight);

    ctx.strokeStyle = "#a855f7";
    ctx.strokeRect(x, energyY, barWidth, barHeight);

    // Mind control indicator
    if (p.mindControlActive) {
      ctx.fillStyle = "#9333ea";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("MIND CONTROL", x, energyY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
