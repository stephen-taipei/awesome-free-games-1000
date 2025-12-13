/**
 * Medusa Slayer Game Engine
 * Game #348
 *
 * Fight gorgons while avoiding their petrifying gaze!
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
  resistance: number;
  maxResistance: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  petrified: number;
  mirrorShield: boolean;
  mirrorShieldTimer: number;
}

interface Gorgon {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "medusa" | "stheno" | "euryale";
  facing: "left" | "right";
  gazeTimer: number;
  isGazing: boolean;
  gazeDuration: number;
  patrolLeft: number;
  patrolRight: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SwordSlash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface SnakeProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface GameState {
  score: number;
  health: number;
  resistance: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 20;
const PETRIFY_THRESHOLD = 100;

export class MedusaSlayerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private gorgons: Gorgon[] = [];
  private platforms: Platform[] = [];
  private swordSlashes: SwordSlash[] = [];
  private snakeProjectiles: SnakeProjectile[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private resistanceRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 30,
      height: 44,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      resistance: 100,
      maxResistance: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      petrified: 0,
      mirrorShield: false,
      mirrorShieldTimer: 0,
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
        resistance: Math.floor(this.player.resistance),
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
    this.gorgons = [];
    this.platforms = [];
    this.swordSlashes = [];
    this.snakeProjectiles = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.resistance = this.player.maxResistance;
    this.player.petrified = 0;
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

    // Greek temple platforms
    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 140 + i * 190 + Math.random() * 70,
        y: h - 110 - Math.random() * 150,
        width: 85 + Math.random() * 55,
        height: 16,
      });
    }

    // Gorgons
    const gorgonCount = 2 + this.level;
    const types: Gorgon["type"][] = ["medusa", "stheno", "euryale"];

    for (let i = 0; i < gorgonCount; i++) {
      const x = 350 + i * 350 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, 1 + Math.floor(this.level / 2)))];

      this.gorgons.push({
        x,
        y: h - 90,
        width: type === "medusa" ? 38 : 34,
        height: type === "medusa" ? 54 : 50,
        vx: Math.random() > 0.5 ? 2 : -2,
        health: type === "medusa" ? 8 : type === "stheno" ? 6 : 5,
        maxHealth: type === "medusa" ? 8 : type === "stheno" ? 6 : 5,
        type,
        facing: "left",
        gazeTimer: 120,
        isGazing: false,
        gazeDuration: 0,
        patrolLeft: x - 110,
        patrolRight: x + 110,
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
    this.updateGorgons();
    this.updateSwordSlashes();
    this.updateSnakeProjectiles();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Resistance regeneration (when not under gaze)
    this.resistanceRegenTimer++;
    if (this.resistanceRegenTimer >= 15) {
      this.resistanceRegenTimer = 0;
      if (p.resistance < p.maxResistance) {
        p.resistance = Math.min(p.maxResistance, p.resistance + 2);
      }
    }

    // Petrified check
    if (p.petrified > PETRIFY_THRESHOLD) {
      p.health = 0;
      this.gameOver();
      return;
    }

    // Decay petrification slowly
    if (p.petrified > 0) {
      p.petrified = Math.max(0, p.petrified - 0.5);
    }

    // Reduced movement if petrified
    const petrifySlowdown = 1 - p.petrified / PETRIFY_THRESHOLD * 0.7;

    // Horizontal movement
    if (this.keys.left) {
      p.vx = -MOVE_SPEED * petrifySlowdown;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = MOVE_SPEED * petrifySlowdown;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump
    if (this.keys.jump) {
      if (!p.isJumping && p.petrified < 50) {
        p.vy = JUMP_FORCE * petrifySlowdown;
        p.isJumping = true;
      }
    }

    // Sword attack
    if (this.keys.attack && !p.isAttacking && p.petrified < 80) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.swordAttack();
    }

    // Special: Mirror Shield (reflects gaze)
    if (this.keys.special && p.resistance >= 50 && !p.mirrorShield) {
      p.resistance -= 50;
      p.mirrorShield = true;
      p.mirrorShieldTimer = 150; // 2.5 seconds
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update mirror shield
    if (p.mirrorShield) {
      p.mirrorShieldTimer--;
      if (p.mirrorShieldTimer <= 0) {
        p.mirrorShield = false;
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

  private swordAttack() {
    const p = this.player;
    const range = 55;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;

    // Create sword slash effect
    this.swordSlashes.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 10 : -10,
      vy: 0,
      size: 14,
      life: 25,
    });

    // Melee attack
    for (const g of this.gorgons) {
      if (
        g.x + g.width > attackX &&
        g.x < attackX + range &&
        Math.abs(g.y - p.y) < 60
      ) {
        g.health -= 2;
        p.resistance = Math.min(p.maxResistance, p.resistance + 10);
        if (g.health <= 0) {
          const points = g.type === "medusa" ? 150 : g.type === "stheno" ? 100 : 80;
          this.score += points;
          const idx = this.gorgons.indexOf(g);
          if (idx !== -1) this.gorgons.splice(idx, 1);
        }
      }
    }
  }

  private updateSwordSlashes() {
    for (let i = this.swordSlashes.length - 1; i >= 0; i--) {
      const slash = this.swordSlashes[i];
      slash.x += slash.vx;
      slash.y += slash.vy;
      slash.life--;

      if (slash.life <= 0) {
        this.swordSlashes.splice(i, 1);
        continue;
      }

      // Hit gorgons
      for (let j = this.gorgons.length - 1; j >= 0; j--) {
        const g = this.gorgons[j];
        if (this.checkSlashHit(slash, g)) {
          g.health -= 1;
          this.swordSlashes.splice(i, 1);
          this.player.resistance = Math.min(this.player.maxResistance, this.player.resistance + 5);
          if (g.health <= 0) {
            const points = g.type === "medusa" ? 150 : g.type === "stheno" ? 100 : 80;
            this.score += points;
            this.gorgons.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkSlashHit(slash: SwordSlash, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      slash.x > target.x &&
      slash.x < target.x + target.width &&
      slash.y > target.y &&
      slash.y < target.y + target.height
    );
  }

  private updateGorgons() {
    for (const g of this.gorgons) {
      // Patrol movement
      g.x += g.vx;
      if (g.x <= g.patrolLeft || g.x >= g.patrolRight) {
        g.vx = -g.vx;
      }
      g.facing = g.vx < 0 ? "left" : "right";

      // Gaze attack
      g.gazeTimer--;
      if (g.gazeTimer <= 0 && !g.isGazing) {
        g.isGazing = true;
        g.gazeDuration = 60; // 1 second gaze
        g.gazeTimer = 150 - this.level * 10;
      }

      if (g.isGazing) {
        g.gazeDuration--;
        if (g.gazeDuration <= 0) {
          g.isGazing = false;
        }

        // Check if player is in gaze cone
        const dx = this.player.x - g.x;
        const inFront = (g.facing === "right" && dx > 0) || (g.facing === "left" && dx < 0);
        const distance = Math.abs(dx);

        if (inFront && distance < 250 && Math.abs(this.player.y - g.y) < 80) {
          if (this.player.mirrorShield) {
            // Reflect gaze back - damage gorgon
            g.health -= 0.5;
            if (g.health <= 0) {
              const points = g.type === "medusa" ? 150 : g.type === "stheno" ? 100 : 80;
              this.score += points + 50; // Bonus for reflection kill
              const idx = this.gorgons.indexOf(g);
              if (idx !== -1) this.gorgons.splice(idx, 1);
            }
          } else {
            // Petrify player
            const gazePower = g.type === "medusa" ? 2 : g.type === "stheno" ? 1.5 : 1;
            this.player.petrified += gazePower;
            this.player.resistance = Math.max(0, this.player.resistance - 0.8);
          }
        }
      }

      // Snake projectile attack
      if (Math.random() < 0.01 && g.type !== "euryale") {
        this.shootSnake(g);
      }

      // Melee damage
      if (!this.player.invincible && this.checkEntityCollision(this.player, g)) {
        this.hitPlayer(18);
      }
    }
  }

  private shootSnake(g: Gorgon) {
    const dx = this.player.x - g.x;
    const dy = this.player.y - g.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 5;

    this.snakeProjectiles.push({
      x: g.x + g.width / 2,
      y: g.y + g.height * 0.4,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      size: 10,
    });
  }

  private updateSnakeProjectiles() {
    for (let i = this.snakeProjectiles.length - 1; i >= 0; i--) {
      const snake = this.snakeProjectiles[i];
      snake.x += snake.vx;
      snake.y += snake.vy;

      // Remove if out of bounds
      if (snake.y > this.canvas.height || snake.x < 0 || snake.x > this.levelWidth) {
        this.snakeProjectiles.splice(i, 1);
        continue;
      }

      // Hit player
      if (!this.player.invincible && this.checkSnakeHit(snake, this.player)) {
        this.hitPlayer(12);
        this.player.petrified += 15;
        this.snakeProjectiles.splice(i, 1);
      }
    }
  }

  private checkSnakeHit(snake: SnakeProjectile, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      snake.x > target.x - snake.size / 2 &&
      snake.x < target.x + target.width + snake.size / 2 &&
      snake.y > target.y - snake.size / 2 &&
      snake.y < target.y + target.height + snake.size / 2
    );
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
    this.player.resistance = Math.min(this.player.maxResistance, this.player.resistance + 15);

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
    if (this.gorgons.length === 0 && this.player.x > this.levelWidth - 100) {
      this.status = "clear";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
    this.player.resistance = this.player.maxResistance;
    this.player.petrified = 0;
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

    // Background - Greek temple
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#2a3a4a");
    gradient.addColorStop(0.5, "#3a4a5a");
    gradient.addColorStop(1, "#4a5a6a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Temple columns (background)
    ctx.fillStyle = "rgba(200, 200, 180, 0.15)";
    for (let i = 0; i < 6; i++) {
      const cx = i * w / 5;
      ctx.fillRect(cx, 0, 25, h - 100);
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw snake projectiles
    for (const snake of this.snakeProjectiles) {
      this.drawSnake(snake);
    }

    // Draw gorgons
    for (const gorgon of this.gorgons) {
      this.drawGorgon(gorgon);
    }

    // Draw sword slashes
    for (const slash of this.swordSlashes) {
      this.drawSwordSlash(slash);
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
      ctx.fillStyle = "#8a7a6a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#9a8a7a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Temple platforms (marble)
      ctx.fillStyle = "#c8c8b8";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#d8d8c8";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Petrification effect
    const petrifyEffect = p.petrified / PETRIFY_THRESHOLD;
    if (petrifyEffect > 0) {
      ctx.globalAlpha *= 1 - petrifyEffect * 0.5;
    }

    if (p.mirrorShield) {
      ctx.shadowColor = "#4ac8ff";
      ctx.shadowBlur = 20;
    }

    // Body - Greek hero
    const bodyColor = petrifyEffect > 0.5 ? "#a0a0a0" : "#7a6a5a";
    ctx.fillStyle = bodyColor;
    ctx.fillRect(p.x + 6, p.y + 14, p.width - 12, p.height - 14);

    // Head
    const skinColor = petrifyEffect > 0.5 ? "#b0b0b0" : "#deb887";
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 9, 8, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    const helmetColor = petrifyEffect > 0.5 ? "#888888" : "#c8a862";
    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 7, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    // Crest
    ctx.fillStyle = petrifyEffect > 0.5 ? "#666666" : "#8a4a2a";
    ctx.fillRect(p.x + p.width / 2 - 2, p.y - 4, 4, 10);

    // Eyes (closed if high petrification)
    if (petrifyEffect < 0.7) {
      ctx.fillStyle = "#2a1a0a";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 9, 2, 2);
      ctx.fillRect(p.x + p.width / 2 + 3, p.y + 9, 2, 2);
    }

    // Sword
    const swordColor = petrifyEffect > 0.5 ? "#a0a0a0" : "#d0d0d0";
    ctx.fillStyle = swordColor;
    const swordX = p.facing === "right" ? p.x + p.width : p.x - 14;
    ctx.fillRect(swordX, p.y + 20, 14, 3);
    ctx.fillRect(swordX + 11, p.y + 16, 3, 11);

    // Mirror shield indicator
    if (p.mirrorShield) {
      ctx.strokeStyle = "#4ac8ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const shieldX = p.facing === "left" ? p.x + p.width : p.x;
      ctx.arc(shieldX, p.y + p.height / 2, 18, p.facing === "left" ? Math.PI * 0.3 : Math.PI * 0.7, p.facing === "left" ? Math.PI * 0.7 : Math.PI * 1.3);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawGorgon(g: Gorgon) {
    const ctx = this.ctx;

    const colors = {
      medusa: "#4a6a4a",
      stheno: "#6a4a6a",
      euryale: "#6a6a4a",
    };

    // Body
    ctx.fillStyle = colors[g.type];
    ctx.fillRect(g.x, g.y, g.width, g.height);

    // Head with snake hair
    ctx.fillStyle = "#8a9a8a";
    ctx.beginPath();
    ctx.arc(g.x + g.width / 2, g.y + g.height * 0.25, g.width * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Snake hair
    ctx.strokeStyle = "#3a5a3a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const hairLen = 12 + Math.sin(Date.now() * 0.01 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(g.x + g.width / 2, g.y + g.height * 0.25);
      ctx.lineTo(
        g.x + g.width / 2 + Math.cos(angle) * hairLen,
        g.y + g.height * 0.25 + Math.sin(angle) * hairLen
      );
      ctx.stroke();
    }

    // Eyes with gaze effect
    const eyeColor = g.isGazing ? "#ff4a4a" : "#ffa44a";
    ctx.fillStyle = eyeColor;
    if (g.isGazing) {
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 20;

      // Gaze beam
      ctx.fillStyle = "rgba(255, 74, 74, 0.3)";
      const beamWidth = 60;
      const beamLength = 250;
      const beamX = g.facing === "right" ? g.x + g.width : g.x - beamLength;
      ctx.fillRect(beamX, g.y + g.height * 0.25 - beamWidth / 2, g.facing === "right" ? beamLength : beamLength, beamWidth);
    }

    ctx.fillRect(g.x + g.width / 2 - 8, g.y + g.height * 0.25 - 3, 5, 5);
    ctx.fillRect(g.x + g.width / 2 + 3, g.y + g.height * 0.25 - 3, 5, 5);
    ctx.shadowBlur = 0;

    // Health bar
    if (g.health < g.maxHealth) {
      const barWidth = g.width;
      const barHeight = 4;
      const hpPercent = g.health / g.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(g.x, g.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#8a4aaa";
      ctx.fillRect(g.x, g.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawSwordSlash(slash: SwordSlash) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#d0d0ff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#a0a0ff";
    ctx.shadowBlur = 10;

    const dir = slash.vx > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(slash.x, slash.y, slash.size, dir > 0 ? Math.PI * 0.2 : Math.PI * 0.8, dir > 0 ? Math.PI * 0.8 : Math.PI * 1.2);
    ctx.stroke();

    ctx.restore();
  }

  private drawSnake(snake: SnakeProjectile) {
    const ctx = this.ctx;

    // Snake body
    ctx.fillStyle = "#3a5a3a";
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, snake.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Snake head
    ctx.fillStyle = "#4a6a4a";
    const angle = Math.atan2(snake.vy, snake.vx);
    ctx.save();
    ctx.translate(snake.x, snake.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(snake.size / 2, 0);
    ctx.lineTo(snake.size / 2 - 5, -3);
    ctx.lineTo(snake.size / 2 - 5, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Snake eyes
    ctx.fillStyle = "#ff4a4a";
    ctx.fillRect(snake.x - 2, snake.y - 2, 2, 2);
    ctx.fillRect(snake.x + 1, snake.y - 2, 2, 2);
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

    // Resistance bar
    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const resistancePercent = p.resistance / p.maxResistance;
    ctx.fillStyle = resistancePercent > 0.5 ? "#4ac8ff" : resistancePercent > 0.25 ? "#8aa8ff" : "#aa88ff";
    ctx.fillRect(x, y, barWidth * resistancePercent, barHeight);

    ctx.strokeStyle = "#2a8acf";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Petrification warning
    const petrifyPercent = p.petrified / PETRIFY_THRESHOLD;
    if (petrifyPercent > 0.3) {
      const warnY = y + barHeight + 8;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(x, warnY, barWidth, 10);

      ctx.fillStyle = petrifyPercent > 0.7 ? "#ff4a4a" : "#ffa44a";
      ctx.fillRect(x, warnY, barWidth * petrifyPercent, 10);

      ctx.strokeStyle = "#cc3a3a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, warnY, barWidth, 10);

      if (petrifyPercent > 0.7) {
        ctx.fillStyle = "#ff4a4a";
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "#ff4a4a";
        ctx.shadowBlur = 10;
        ctx.fillText("PETRIFYING!", x, warnY + 25);
        ctx.shadowBlur = 0;
      }
    }

    // Mirror shield indicator
    if (p.mirrorShield) {
      ctx.fillStyle = "#4ac8ff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#4ac8ff";
      ctx.shadowBlur = 10;
      ctx.fillText("MIRROR SHIELD", x, y + 45);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
