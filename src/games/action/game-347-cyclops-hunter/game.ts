/**
 * Cyclops Hunter Game Engine
 * Game #347
 *
 * Hunt one-eyed giants with ranged bow attacks!
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
  focus: number;
  maxFocus: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAiming: boolean;
  aimPower: number;
  invincible: boolean;
  invincibleTimer: number;
  multiShot: boolean;
  multiShotTimer: number;
}

interface Cyclops {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "small" | "large" | "giant";
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  stunned: boolean;
  stunnedTimer: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}

interface Boulder {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface GameState {
  score: number;
  health: number;
  focus: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MOVE_SPEED = 6;
const ARROW_SPEED = 15;
const MAX_AIM_POWER = 60;

export class CyclopsHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private cyclopes: Cyclops[] = [];
  private platforms: Platform[] = [];
  private arrows: Arrow[] = [];
  private boulders: Boulder[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private focusRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 26,
      height: 40,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      focus: 50,
      maxFocus: 100,
      facing: "right",
      isJumping: false,
      isAiming: false,
      aimPower: 0,
      invincible: false,
      invincibleTimer: 0,
      multiShot: false,
      multiShotTimer: 0,
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
        focus: Math.floor(this.player.focus),
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
    this.cyclopes = [];
    this.platforms = [];
    this.arrows = [];
    this.boulders = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.focus = 50;
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
    const platformCount = 8 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 120 + i * 200 + Math.random() * 60,
        y: h - 100 - Math.random() * 180,
        width: 80 + Math.random() * 50,
        height: 15,
      });
    }

    // Cyclopes
    const cyclopsCount = 3 + this.level * 2;
    const types: Cyclops["type"][] = ["small", "large", "giant"];

    for (let i = 0; i < cyclopsCount; i++) {
      const x = 400 + i * 300 + Math.random() * 100;
      const type = types[Math.floor(Math.random() * Math.min(types.length, Math.ceil(this.level / 2)))];

      const sizeMultiplier = type === "giant" ? 1.5 : type === "large" ? 1.2 : 1;

      this.cyclopes.push({
        x,
        y: h - 80 * sizeMultiplier,
        width: 40 * sizeMultiplier,
        height: 56 * sizeMultiplier,
        vx: Math.random() > 0.5 ? 1.5 : -1.5,
        health: type === "giant" ? 6 : type === "large" ? 4 : 3,
        maxHealth: type === "giant" ? 6 : type === "large" ? 4 : 3,
        type,
        facing: "left",
        attackTimer: 90,
        patrolLeft: x - 120,
        patrolRight: x + 120,
        stunned: false,
        stunnedTimer: 0,
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
    this.updateCyclopes();
    this.updateArrows();
    this.updateBoulders();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Focus regeneration
    this.focusRegenTimer++;
    if (this.focusRegenTimer >= 25) {
      this.focusRegenTimer = 0;
      p.focus = Math.min(p.maxFocus, p.focus + 1);
    }

    // Horizontal movement (slower when aiming)
    const moveMultiplier = p.isAiming ? 0.5 : 1;
    if (this.keys.left) {
      p.vx = -MOVE_SPEED * moveMultiplier;
      if (!p.isAiming) p.facing = "left";
    } else if (this.keys.right) {
      p.vx = MOVE_SPEED * moveMultiplier;
      if (!p.isAiming) p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump
    if (this.keys.jump) {
      if (!p.isJumping) {
        p.vy = JUMP_FORCE;
        p.isJumping = true;
      }
    }

    // Aim and shoot
    if (this.keys.attack) {
      p.isAiming = true;
      p.aimPower = Math.min(MAX_AIM_POWER, p.aimPower + 2);
    } else if (p.isAiming) {
      // Release arrow
      this.shootArrow(p.aimPower);
      p.isAiming = false;
      p.aimPower = 0;
    }

    // Special: Multi-shot ability
    if (this.keys.special && p.focus >= 40 && !p.multiShot) {
      p.focus -= 40;
      p.multiShot = true;
      p.multiShotTimer = 120; // 2 seconds
    }

    // Update multi-shot
    if (p.multiShot) {
      p.multiShotTimer--;
      if (p.multiShotTimer <= 0) {
        p.multiShot = false;
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

  private shootArrow(power: number) {
    const p = this.player;
    const speed = ARROW_SPEED * (0.5 + power / MAX_AIM_POWER);
    const dir = p.facing === "right" ? 1 : -1;
    const damage = Math.ceil(1 + power / 20);

    // Create arrow
    const arrow: Arrow = {
      x: p.x + p.width / 2,
      y: p.y + p.height / 2 - 5,
      vx: speed * dir,
      vy: -1 - power / 30,
      damage,
      life: 120,
    };
    this.arrows.push(arrow);

    // Multi-shot: shoot 2 additional arrows
    if (p.multiShot) {
      this.arrows.push({
        ...arrow,
        vy: arrow.vy - 2,
      });
      this.arrows.push({
        ...arrow,
        vy: arrow.vy + 2,
      });
    }

    // Gain focus on shot
    p.focus = Math.min(p.maxFocus, p.focus + 3);
  }

  private updateArrows() {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.vy += GRAVITY * 0.3; // Slight arc
      arrow.life--;

      if (arrow.life <= 0 || arrow.y > this.canvas.height) {
        this.arrows.splice(i, 1);
        continue;
      }

      // Hit cyclopes
      for (let j = this.cyclopes.length - 1; j >= 0; j--) {
        const c = this.cyclopes[j];
        if (this.checkArrowHit(arrow, c)) {
          c.health -= arrow.damage;
          this.player.focus = Math.min(this.player.maxFocus, this.player.focus + 8);
          this.arrows.splice(i, 1);

          // Headshot (stun)
          if (arrow.y < c.y + c.height * 0.3) {
            c.stunned = true;
            c.stunnedTimer = 60;
            this.score += 20;
          }

          if (c.health <= 0) {
            const points = c.type === "giant" ? 100 : c.type === "large" ? 70 : 50;
            this.score += points;
            this.cyclopes.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkArrowHit(arrow: Arrow, target: Cyclops): boolean {
    return (
      arrow.x > target.x &&
      arrow.x < target.x + target.width &&
      arrow.y > target.y &&
      arrow.y < target.y + target.height
    );
  }

  private updateCyclopes() {
    for (const c of this.cyclopes) {
      // Update stun
      if (c.stunned) {
        c.stunnedTimer--;
        if (c.stunnedTimer <= 0) {
          c.stunned = false;
        }
        continue;
      }

      // Patrol movement
      c.x += c.vx;
      if (c.x <= c.patrolLeft || c.x >= c.patrolRight) {
        c.vx = -c.vx;
      }
      c.facing = c.vx < 0 ? "left" : "right";

      // Attack (throw boulders)
      c.attackTimer--;
      if (c.attackTimer <= 0) {
        c.attackTimer = 90 - this.level * 5;
        this.throwBoulder(c);
      }

      // Melee damage
      if (!this.player.invincible && this.checkEntityCollision(this.player, c)) {
        const damage = c.type === "giant" ? 30 : c.type === "large" ? 22 : 15;
        this.hitPlayer(damage);
      }
    }
  }

  private throwBoulder(c: Cyclops) {
    const dx = this.player.x - c.x;
    const dy = this.player.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 6;

    this.boulders.push({
      x: c.x + c.width / 2,
      y: c.y + c.height * 0.3,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed - 3,
      size: c.type === "giant" ? 20 : c.type === "large" ? 16 : 12,
    });
  }

  private updateBoulders() {
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const boulder = this.boulders[i];
      boulder.x += boulder.vx;
      boulder.y += boulder.vy;
      boulder.vy += GRAVITY;

      // Remove if out of bounds
      if (boulder.y > this.canvas.height || boulder.x < 0 || boulder.x > this.levelWidth) {
        this.boulders.splice(i, 1);
        continue;
      }

      // Hit player
      if (!this.player.invincible && this.checkBoulderHit(boulder, this.player)) {
        this.hitPlayer(20);
        this.boulders.splice(i, 1);
      }
    }
  }

  private checkBoulderHit(boulder: Boulder, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      boulder.x > target.x - boulder.size / 2 &&
      boulder.x < target.x + target.width + boulder.size / 2 &&
      boulder.y > target.y - boulder.size / 2 &&
      boulder.y < target.y + target.height + boulder.size / 2
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
    this.player.focus = Math.min(this.player.maxFocus, this.player.focus + 15);

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
    if (this.cyclopes.length === 0 && this.player.x > this.levelWidth - 100) {
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
    this.player.focus = 50;
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

    // Background - rocky mountain
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#5a7a8a");
    gradient.addColorStop(0.5, "#4a6a7a");
    gradient.addColorStop(1, "#3a5a6a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Mountains in background
    ctx.fillStyle = "rgba(90, 110, 120, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, h - 100);
    ctx.lineTo(w * 0.3, h - 250);
    ctx.lineTo(w * 0.6, h - 200);
    ctx.lineTo(w, h - 280);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw boulders
    for (const boulder of this.boulders) {
      this.drawBoulder(boulder);
    }

    // Draw cyclopes
    for (const cyclops of this.cyclopes) {
      this.drawCyclops(cyclops);
    }

    // Draw arrows
    for (const arrow of this.arrows) {
      this.drawArrow(arrow);
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
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#7a6a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Rock platforms
      ctx.fillStyle = "#7a8a9a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#8a9aaa";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.multiShot) {
      ctx.shadowColor = "#8a6aff";
      ctx.shadowBlur = 15;
    }

    // Body - hunter
    ctx.fillStyle = "#5a7a4a";
    ctx.fillRect(p.x + 5, p.y + 12, p.width - 10, p.height - 12);

    // Head
    ctx.fillStyle = "#deb887";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = "#4a6a3a";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 7, 9, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(p.x + p.width / 2 - 4, p.y + 8, 2, 2);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 8, 2, 2);

    // Bow
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    const bowX = p.facing === "right" ? p.x + p.width : p.x;
    const bowY = p.y + p.height / 2;

    ctx.beginPath();
    if (p.isAiming) {
      // Drawn bow
      ctx.arc(bowX + (p.facing === "right" ? 5 : -5), bowY, 12, p.facing === "right" ? Math.PI * 0.7 : Math.PI * 0.3, p.facing === "right" ? Math.PI * 1.3 : Math.PI * 1.7);
      // Bowstring
      ctx.moveTo(bowX + (p.facing === "right" ? 5 : -5), bowY - 12);
      ctx.lineTo(bowX + (p.facing === "right" ? -p.aimPower / 4 : p.aimPower / 4), bowY);
      ctx.lineTo(bowX + (p.facing === "right" ? 5 : -5), bowY + 12);
    } else {
      // Relaxed bow
      ctx.arc(bowX + (p.facing === "right" ? 5 : -5), bowY, 12, p.facing === "right" ? Math.PI * 0.8 : Math.PI * 0.2, p.facing === "right" ? Math.PI * 1.2 : Math.PI * 1.8);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawCyclops(c: Cyclops) {
    const ctx = this.ctx;

    const colors = {
      small: "#6a5a4a",
      large: "#7a6a5a",
      giant: "#8a7a6a",
    };

    if (c.stunned && Math.floor(c.stunnedTimer / 8) % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    // Body
    ctx.fillStyle = colors[c.type];
    ctx.fillRect(c.x, c.y, c.width, c.height);

    // Head
    ctx.fillStyle = "#8a7a6a";
    ctx.beginPath();
    ctx.arc(c.x + c.width / 2, c.y + c.height * 0.25, c.width * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Single eye
    const eyeColor = c.stunned ? "#ffff00" : "#ff4a3a";
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(c.x + c.width / 2, c.y + c.height * 0.25, c.width * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = "#2a1a0a";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(c.x + c.width / 2, c.y + c.height * 0.25, c.width * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // Health bar
    if (c.health < c.maxHealth) {
      const barWidth = c.width;
      const barHeight = 4;
      const hpPercent = c.health / c.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(c.x, c.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(c.x, c.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawArrow(arrow: Arrow) {
    const ctx = this.ctx;

    const angle = Math.atan2(arrow.vy, arrow.vx);

    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(angle);

    // Arrow shaft
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(5, 0);
    ctx.stroke();

    // Arrow head
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(2, -3);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();

    // Fletching
    ctx.strokeStyle = "#8a4a2a";
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawBoulder(boulder: Boulder) {
    const ctx = this.ctx;

    ctx.fillStyle = "#5a4a3a";
    ctx.beginPath();
    ctx.arc(boulder.x, boulder.y, boulder.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Shading
    ctx.fillStyle = "#4a3a2a";
    ctx.beginPath();
    ctx.arc(boulder.x - boulder.size / 6, boulder.y - boulder.size / 6, boulder.size / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

    // Focus bar
    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const focusPercent = p.focus / p.maxFocus;
    ctx.fillStyle = "#8a6aff";
    ctx.fillRect(x, y, barWidth * focusPercent, barHeight);

    ctx.strokeStyle = "#6a4adf";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Multi-shot indicator
    if (p.multiShot) {
      ctx.fillStyle = "#8a6aff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#8a6aff";
      ctx.shadowBlur = 10;
      ctx.fillText("MULTI-SHOT", x, y + barHeight + 18);
      ctx.shadowBlur = 0;
    }

    // Aim power indicator
    if (p.isAiming) {
      const aimBarY = y + 30;
      const aimPercent = p.aimPower / MAX_AIM_POWER;

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(x, aimBarY, barWidth, 8);

      ctx.fillStyle = aimPercent > 0.8 ? "#ff6a3a" : aimPercent > 0.5 ? "#ffa03a" : "#ffca3a";
      ctx.fillRect(x, aimBarY, barWidth * aimPercent, 8);

      ctx.strokeStyle = "#cc5a2a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, aimBarY, barWidth, 8);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
