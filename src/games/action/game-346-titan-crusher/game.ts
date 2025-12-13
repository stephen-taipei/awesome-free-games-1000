/**
 * Titan Crusher Game Engine
 * Game #346
 *
 * Climb giant titans and attack weak points in epic battles!
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
  isClimbing: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  godMode: boolean;
  godModeTimer: number;
}

interface Titan {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  type: "colossus" | "behemoth" | "ancient";
  weakPoints: WeakPoint[];
  attackTimer: number;
  isRoaring: boolean;
}

interface WeakPoint {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  glowPhase: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  climbable?: boolean;
}

interface LightningBolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
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
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const CLIMB_SPEED = 4;
const ATTACK_DURATION = 20;

export class TitanCrusherGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private titan: Titan | null = null;
  private platforms: Platform[] = [];
  private lightningBolts: LightningBolt[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
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
      width: 28,
      height: 42,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 60,
      maxEnergy: 100,
      facing: "right",
      isJumping: false,
      isClimbing: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      godMode: false,
      godModeTimer: 0,
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
    this.platforms = [];
    this.lightningBolts = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.energy = 60;
    this.cameraX = 0;

    const h = this.canvas.height;
    const w = this.canvas.width;

    // Ground
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: w,
      height: 40,
    });

    // Climbing platforms on titan
    const platformCount = 4 + this.level;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: w * 0.4 + Math.random() * 60 - 30,
        y: h - 100 - i * 80,
        width: 80,
        height: 15,
        climbable: true,
      });
    }

    // Create titan
    const types: Titan["type"][] = ["colossus", "behemoth", "ancient"];
    const type = types[Math.min(this.level - 1, types.length - 1)];

    const titanHealth = type === "ancient" ? 12 : type === "behemoth" ? 10 : 8;
    const weakPointCount = type === "ancient" ? 4 : type === "behemoth" ? 3 : 3;

    const weakPoints: WeakPoint[] = [];
    for (let i = 0; i < weakPointCount; i++) {
      weakPoints.push({
        x: 50 + Math.random() * 100,
        y: 100 + i * 120,
        width: 24,
        height: 24,
        health: 3,
        maxHealth: 3,
        glowPhase: Math.random() * Math.PI * 2,
      });
    }

    this.titan = {
      x: w * 0.3,
      y: h - 480,
      width: 220,
      height: 480,
      health: titanHealth,
      maxHealth: titanHealth,
      type,
      weakPoints,
      attackTimer: 120,
      isRoaring: false,
    };
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
    this.updateTitan();
    this.updateLightningBolts();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Energy regeneration
    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 20) {
      this.energyRegenTimer = 0;
      p.energy = Math.min(p.maxEnergy, p.energy + 1);
    }

    // Check if on climbable platform
    const onClimbable = this.platforms.some(
      plat => plat.climbable && this.checkPlatformCollision(p, plat)
    );

    // Climbing movement
    if (onClimbable && (this.keys.jump || this.keys.left || this.keys.right)) {
      p.isClimbing = true;
      p.vy = -CLIMB_SPEED;
    } else {
      p.isClimbing = false;
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
    if (this.keys.jump && !p.isJumping && !p.isClimbing) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Attack weak points
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.attackWeakPoints();
    }

    // Special: God Mode (Zeus power)
    if (this.keys.special && p.energy >= 50 && !p.godMode) {
      p.energy -= 50;
      p.godMode = true;
      p.godModeTimer = 180; // 3 seconds
      this.spawnLightningBolts();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update god mode
    if (p.godMode) {
      p.godModeTimer--;
      if (p.godModeTimer <= 0) {
        p.godMode = false;
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
    if (!p.isClimbing) {
      p.vy += GRAVITY;
    }

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
    p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));

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

  private attackWeakPoints() {
    if (!this.titan) return;

    const p = this.player;
    const range = 60;

    for (const wp of this.titan.weakPoints) {
      const wpWorldX = this.titan.x + wp.x;
      const wpWorldY = this.titan.y + wp.y;

      if (
        Math.abs(p.x + p.width / 2 - wpWorldX - wp.width / 2) < range &&
        Math.abs(p.y + p.height / 2 - wpWorldY - wp.height / 2) < range &&
        wp.health > 0
      ) {
        const damage = p.godMode ? 2 : 1;
        wp.health -= damage;
        p.energy = Math.min(p.maxEnergy, p.energy + 10);

        if (wp.health <= 0) {
          this.score += 50;
          this.titan.health--;
        }
      }
    }
  }

  private spawnLightningBolts() {
    if (!this.titan) return;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.lightningBolts.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        size: 12,
        life: 60,
      });
    }
  }

  private updateLightningBolts() {
    if (!this.titan) return;

    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const bolt = this.lightningBolts[i];
      bolt.x += bolt.vx;
      bolt.y += bolt.vy;
      bolt.life--;

      if (bolt.life <= 0) {
        this.lightningBolts.splice(i, 1);
        continue;
      }

      // Hit weak points
      for (const wp of this.titan.weakPoints) {
        const wpWorldX = this.titan.x + wp.x;
        const wpWorldY = this.titan.y + wp.y;

        if (
          bolt.x > wpWorldX &&
          bolt.x < wpWorldX + wp.width &&
          bolt.y > wpWorldY &&
          bolt.y < wpWorldY + wp.height &&
          wp.health > 0
        ) {
          wp.health -= 2;
          this.lightningBolts.splice(i, 1);
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 5);

          if (wp.health <= 0) {
            this.score += 50;
            this.titan.health--;
          }
          break;
        }
      }
    }
  }

  private updateTitan() {
    if (!this.titan) return;

    const titan = this.titan;
    titan.attackTimer--;

    // Update weak point glow
    for (const wp of titan.weakPoints) {
      wp.glowPhase += 0.05;
    }

    // Titan attacks
    if (titan.attackTimer <= 0) {
      titan.attackTimer = 120 - this.level * 10;
      titan.isRoaring = true;

      // Ground slam damage
      if (!this.player.invincible && this.player.y > this.canvas.height - 100) {
        this.hitPlayer(25);
      }

      setTimeout(() => {
        if (titan) titan.isRoaring = false;
      }, 500);
    }
  }

  private hitPlayer(damage: number) {
    if (this.player.godMode) {
      damage = Math.floor(damage * 0.4);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 20);

    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  private checkLevelComplete() {
    if (this.titan && this.titan.health <= 0) {
      this.status = "clear";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.score += 200;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
    this.player.energy = 60;
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

    // Background - epic sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a3a5a");
    gradient.addColorStop(0.5, "#2a4a6a");
    gradient.addColorStop(1, "#3a5a7a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    for (let i = 0; i < 8; i++) {
      const cx = (i * 120 + Date.now() * 0.01) % (w + 100);
      const cy = 40 + i * 30;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.arc(cx + 25, cy, 25, 0, Math.PI * 2);
      ctx.arc(cx - 25, cy, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw titan
    if (this.titan) {
      this.drawTitan(this.titan);
    }

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw lightning bolts
    for (const bolt of this.lightningBolts) {
      this.drawLightningBolt(bolt);
    }

    // Draw player
    this.drawPlayer();

    // UI overlay
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      // Ground
      ctx.fillStyle = "#8b7355";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#a68965";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Stone platforms
      ctx.fillStyle = plat.climbable ? "#6a7a8a" : "#5a6a7a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#7a8a9a";
      ctx.fillRect(plat.x, plat.y, plat.width, 3);

      if (plat.climbable) {
        // Climbable indicator
        ctx.strokeStyle = "#4a9aff";
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x + 2, plat.y + 2, plat.width - 4, plat.height - 4);
      }
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.godMode) {
      // God mode glow
      ctx.shadowColor = "#4a9aff";
      ctx.shadowBlur = 20;
    }

    // Body - Greek warrior
    ctx.fillStyle = "#c8a882";
    ctx.fillRect(p.x + 6, p.y + 14, p.width - 12, p.height - 14);

    // Head
    ctx.fillStyle = "#deb887";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 9, 8, 0, Math.PI * 2);
    ctx.fill();

    // Greek helmet
    ctx.fillStyle = "#d4a017";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 7, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    // Plume
    ctx.fillStyle = "#c41e3a";
    ctx.fillRect(p.x + p.width / 2 - 2, p.y - 4, 4, 10);

    // Eyes
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 9, 2, 2);
    ctx.fillRect(p.x + p.width / 2 + 3, p.y + 9, 2, 2);

    // Sword
    ctx.fillStyle = "#c0c0c0";
    const swordX = p.facing === "right" ? p.x + p.width : p.x - 12;
    ctx.fillRect(swordX, p.y + 18, 12, 3);
    ctx.fillRect(swordX + 10, p.y + 14, 3, 11);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawTitan(titan: Titan) {
    const ctx = this.ctx;

    // Titan body
    const colors = {
      colossus: "#5a4a3a",
      behemoth: "#4a3a5a",
      ancient: "#6a4a2a",
    };

    // Shake effect when roaring
    const shakeX = titan.isRoaring ? (Math.random() - 0.5) * 8 : 0;
    const shakeY = titan.isRoaring ? (Math.random() - 0.5) * 8 : 0;

    ctx.fillStyle = colors[titan.type];
    ctx.fillRect(titan.x + shakeX, titan.y + shakeY, titan.width, titan.height);

    // Titan features
    ctx.fillStyle = "#3a2a1a";
    // Eyes
    ctx.fillRect(titan.x + 50, titan.y + 30, 15, 15);
    ctx.fillRect(titan.x + 155, titan.y + 30, 15, 15);

    // Glowing eyes
    ctx.fillStyle = titan.isRoaring ? "#ff4444" : "#ffaa44";
    ctx.shadowColor = titan.isRoaring ? "#ff4444" : "#ffaa44";
    ctx.shadowBlur = 15;
    ctx.fillRect(titan.x + 54, titan.y + 34, 7, 7);
    ctx.fillRect(titan.x + 159, titan.y + 34, 7, 7);
    ctx.shadowBlur = 0;

    // Mouth
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(titan.x + 80, titan.y + 60, 60, titan.isRoaring ? 25 : 10);

    // Draw weak points
    for (const wp of titan.weakPoints) {
      if (wp.health > 0) {
        const glow = Math.sin(wp.glowPhase) * 0.3 + 0.7;

        ctx.shadowColor = "#ff6a3a";
        ctx.shadowBlur = 15 * glow;
        ctx.fillStyle = `rgba(255, 106, 58, ${glow})`;

        ctx.beginPath();
        ctx.arc(
          titan.x + wp.x + wp.width / 2,
          titan.y + wp.y + wp.height / 2,
          wp.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Inner core
        ctx.fillStyle = `rgba(255, 200, 100, ${glow})`;
        ctx.beginPath();
        ctx.arc(
          titan.x + wp.x + wp.width / 2,
          titan.y + wp.y + wp.height / 2,
          wp.width / 4,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.shadowBlur = 0;

        // Health indicator
        if (wp.health < wp.maxHealth) {
          const barW = 20;
          const barH = 3;
          const hpPercent = wp.health / wp.maxHealth;

          ctx.fillStyle = "#333";
          ctx.fillRect(titan.x + wp.x + 2, titan.y + wp.y - 6, barW, barH);
          ctx.fillStyle = "#ff6a3a";
          ctx.fillRect(titan.x + wp.x + 2, titan.y + wp.y - 6, barW * hpPercent, barH);
        }
      }
    }

    // Titan health bar
    const barW = 200;
    const barH = 8;
    const hpPercent = titan.health / titan.maxHealth;

    ctx.fillStyle = "#333";
    ctx.fillRect(titan.x + 10, titan.y - 20, barW, barH);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(titan.x + 10, titan.y - 20, barW * hpPercent, barH);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.strokeRect(titan.x + 10, titan.y - 20, barW, barH);
  }

  private drawLightningBolt(bolt: LightningBolt) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#4a9aff";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#4a9aff";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(bolt.x, bolt.y);
    ctx.lineTo(bolt.x + bolt.vx * 0.5, bolt.y + bolt.vy * 0.5);
    ctx.lineTo(bolt.x - 3, bolt.y + 3);
    ctx.lineTo(bolt.x + bolt.vx * 0.3, bolt.y + bolt.vy * 0.3);
    ctx.stroke();

    // Core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

    // Energy bar with god mode indicator
    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const energyPercent = p.energy / p.maxEnergy;
    ctx.fillStyle = "#4a9aff";
    ctx.fillRect(x, y, barWidth * energyPercent, barHeight);

    ctx.strokeStyle = "#2a5a8f";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // God mode indicator
    if (p.godMode) {
      ctx.fillStyle = "#4a9aff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#4a9aff";
      ctx.shadowBlur = 10;
      ctx.fillText("ZEUS POWER", x, y + barHeight + 18);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
