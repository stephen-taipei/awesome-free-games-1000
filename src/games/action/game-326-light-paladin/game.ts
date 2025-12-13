/**
 * Light Paladin Game Engine
 * Game #326
 *
 * Holy light combat action game!
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
  mana: number;
  maxMana: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  holyShield: boolean;
  shieldTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "shadow" | "demon" | "wraith";
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

interface LightBeam {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface HolyBurst {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface GameState {
  score: number;
  health: number;
  mana: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 25;
const ATTACK_RANGE = 60;

export class LightPaladinGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private lightBeams: LightBeam[] = [];
  private holyBursts: HolyBurst[] = [];
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
      height: 44,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      holyShield: false,
      shieldTimer: 0,
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
        mana: Math.floor(this.player.mana),
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
    this.lightBeams = [];
    this.holyBursts = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.mana = this.player.maxMana;
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

    // Platforms with holy glow
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    // Dark enemies
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["shadow", "demon", "wraith"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "demon" ? 36 : 30,
        height: type === "demon" ? 48 : 40,
        vx: type === "wraith" ? 0 : (Math.random() > 0.5 ? 2.5 : -2.5),
        type,
        health: type === "demon" ? 4 : type === "wraith" ? 2 : 2,
        maxHealth: type === "demon" ? 4 : type === "wraith" ? 2 : 2,
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
    this.updateLightBeams();
    this.updateHolyBursts();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Mana regeneration
    this.manaRegenTimer++;
    if (this.manaRegenTimer >= 30) {
      this.manaRegenTimer = 0;
      p.mana = Math.min(p.maxMana, p.mana + 1);
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

    // Holy Attack (Light Sword)
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.performLightAttack();
    }

    // Special: Holy Shield / Holy Burst
    if (this.keys.special && p.mana >= 30 && !p.holyShield) {
      p.mana -= 30;
      p.holyShield = true;
      p.shieldTimer = 180; // 3 seconds at 60fps
      this.createHolyBurst(p.x + p.width / 2, p.y + p.height / 2);
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update shield timer
    if (p.holyShield) {
      p.shieldTimer--;
      if (p.shieldTimer <= 0) {
        p.holyShield = false;
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

  private performLightAttack() {
    const p = this.player;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - ATTACK_RANGE;

    // Create light beam projectile
    this.lightBeams.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 12 : -12,
      vy: 0,
      size: 8,
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
          this.score += e.type === "demon" ? 40 : e.type === "wraith" ? 25 : 15;
          this.createHolyBurst(e.x + e.width / 2, e.y + e.height / 2);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private createHolyBurst(x: number, y: number) {
    this.holyBursts.push({
      x,
      y,
      radius: 10,
      maxRadius: 80,
      alpha: 1,
    });
  }

  private updateLightBeams() {
    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const beam = this.lightBeams[i];
      beam.x += beam.vx;
      beam.y += beam.vy;
      beam.life--;

      if (beam.life <= 0) {
        this.lightBeams.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBeamHit(beam, e)) {
          e.health--;
          this.lightBeams.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "demon" ? 40 : e.type === "wraith" ? 25 : 15;
            this.createHolyBurst(e.x + e.width / 2, e.y + e.height / 2);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBeamHit(beam: LightBeam, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      beam.x > target.x &&
      beam.x < target.x + target.width &&
      beam.y > target.y &&
      beam.y < target.y + target.height
    );
  }

  private updateHolyBursts() {
    for (let i = this.holyBursts.length - 1; i >= 0; i--) {
      const burst = this.holyBursts[i];
      burst.radius += 4;
      burst.alpha -= 0.04;

      // Damage enemies in burst radius
      if (burst.radius < burst.maxRadius / 2) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dx = (e.x + e.width / 2) - burst.x;
          const dy = (e.y + e.height / 2) - burst.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < burst.radius) {
            e.health--;
            if (e.health <= 0) {
              this.score += e.type === "demon" ? 40 : e.type === "wraith" ? 25 : 15;
              this.enemies.splice(j, 1);
            }
          }
        }
      }

      if (burst.alpha <= 0) {
        this.holyBursts.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // AI behavior
      if (e.type === "wraith") {
        // Wraith floats toward player
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
      if (!this.player.invincible && !this.player.holyShield && this.checkEntityCollision(this.player, e)) {
        this.hitPlayer(e.type === "demon" ? 15 : 10);
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
    this.player.mana = this.player.maxMana;
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

    // Background - holy temple sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a3e");
    gradient.addColorStop(0.4, "#2d2d5e");
    gradient.addColorStop(1, "#4a4a7e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Divine light rays from sky
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.2);
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(x - 30, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 80, h);
      ctx.lineTo(x - 80, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Stars
    ctx.fillStyle = "rgba(255, 255, 200, 0.6)";
    for (let i = 0; i < 30; i++) {
      const starX = (i * 73 + Date.now() / 100) % w;
      const starY = (i * 37) % (h / 2);
      ctx.beginPath();
      ctx.arc(starX, starY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw holy bursts
    for (const burst of this.holyBursts) {
      this.drawHolyBurst(burst);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw light beams
    for (const beam of this.lightBeams) {
      this.drawLightBeam(beam);
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
      // Ground with holy runes
      ctx.fillStyle = "#3d3d5d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#5d5d8d";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);

      // Holy rune pattern
      ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < plat.width; i += 50) {
        ctx.beginPath();
        ctx.arc(plat.x + i + 25, plat.y + 20, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Platform with glow
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#4d4d7d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#7d7dbd";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Holy shield effect
    if (p.holyShield) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.1;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Paladin body (white/gold armor)
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    // Helmet
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(p.x + 2, p.y, p.width - 4, 14);

    // Visor
    ctx.fillStyle = "#333";
    ctx.fillRect(p.x + 6, p.y + 6, p.width - 12, 4);

    // Cape (flowing)
    ctx.fillStyle = "#4169e1";
    const capeOffset = Math.sin(Date.now() / 200) * 3;
    if (p.facing === "right") {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 12);
      ctx.lineTo(p.x - 8 + capeOffset, p.y + p.height);
      ctx.lineTo(p.x + 8, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x + p.width, p.y + 12);
      ctx.lineTo(p.x + p.width + 8 - capeOffset, p.y + p.height);
      ctx.lineTo(p.x + p.width - 8, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    }

    // Holy sword glow
    if (p.isAttacking) {
      ctx.save();
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.moveTo(p.x + p.width, p.y + p.height / 2);
        ctx.lineTo(p.x + p.width + 40, p.y + p.height / 2 - 10);
      } else {
        ctx.moveTo(p.x, p.y + p.height / 2);
        ctx.lineTo(p.x - 40, p.y + p.height / 2 - 10);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Shadow/smoke effect for dark creatures
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(Date.now() / 200 + i) * 5;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2 + offset, e.y + e.height - 5, 15 - i * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Body color based on type
    const colors = {
      shadow: "#1a1a1a",
      demon: "#8b0000",
      wraith: "#4a0080",
    };

    ctx.fillStyle = colors[e.type];

    if (e.type === "wraith") {
      // Ghostly wraith
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(e.x + e.width / 3, e.y + e.height / 3, 4, 0, Math.PI * 2);
      ctx.arc(e.x + 2 * e.width / 3, e.y + e.height / 3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Evil eyes
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(e.x + 5, e.y + 8, 6, 4);
      ctx.fillRect(e.x + e.width - 11, e.y + 8, 6, 4);

      // Horns for demon
      if (e.type === "demon") {
        ctx.fillStyle = "#4a0000";
        ctx.beginPath();
        ctx.moveTo(e.x + 5, e.y);
        ctx.lineTo(e.x - 5, e.y - 15);
        ctx.lineTo(e.x + 12, e.y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.x + e.width - 5, e.y);
        ctx.lineTo(e.x + e.width + 5, e.y - 15);
        ctx.lineTo(e.x + e.width - 12, e.y);
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
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawLightBeam(beam: LightBeam) {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 15;

    // Glowing orb
    const gradient = ctx.createRadialGradient(beam.x, beam.y, 0, beam.x, beam.y, beam.size);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#ffd700");
    gradient.addColorStop(1, "rgba(255, 215, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(beam.x, beam.y, beam.size, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.x - beam.vx * 2, beam.y);
    ctx.stroke();

    ctx.restore();
  }

  private drawHolyBurst(burst: HolyBurst) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = burst.alpha;

    const gradient = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, burst.radius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.5, "rgba(255, 215, 0, 0.5)");
    gradient.addColorStop(1, "rgba(255, 215, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Mana bar
    const manaY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, manaY, barWidth, barHeight);

    const manaPercent = p.mana / p.maxMana;
    ctx.fillStyle = "#4169e1";
    ctx.fillRect(x, manaY, barWidth * manaPercent, barHeight);

    ctx.strokeStyle = "#4169e1";
    ctx.strokeRect(x, manaY, barWidth, barHeight);

    // Shield indicator
    if (p.holyShield) {
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("HOLY SHIELD", x, manaY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
