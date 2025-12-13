/**
 * Ghost Hunter Game Engine
 * Game #338
 *
 * Paranormal hunter with spirit traps and ghost vision!
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
  ectoplasm: number;
  maxEctoplasm: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  ghostVision: boolean;
  ghostVisionTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "phantom" | "poltergeist" | "wraith";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  invisible: boolean;
  invisTimer: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpiritTrap {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface EctoBlast {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  ectoplasm: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const VISION_SPEED = 6.5;
const ATTACK_DURATION = 20;

export class GhostHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private spiritTraps: SpiritTrap[] = [];
  private ectoBlasts: EctoBlast[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private ectoRegenTimer = 0;

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
      ectoplasm: 50,
      maxEctoplasm: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      ghostVision: false,
      ghostVisionTimer: 0,
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
        ectoplasm: Math.floor(this.player.ectoplasm),
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
    this.spiritTraps = [];
    this.ectoBlasts = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.ectoplasm = 50;
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

    // Haunted platforms
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
    const types: Enemy["type"][] = ["phantom", "poltergeist", "wraith"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "wraith" ? 36 : 32,
        height: type === "wraith" ? 48 : 44,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        type,
        health: type === "wraith" ? 5 : type === "poltergeist" ? 4 : 3,
        maxHealth: type === "wraith" ? 5 : type === "poltergeist" ? 4 : 3,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 100,
        patrolRight: x + 100,
        invisible: Math.random() > 0.5,
        invisTimer: 120,
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
    this.updateSpiritTraps();
    this.updateEctoBlasts();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Ectoplasm regeneration
    this.ectoRegenTimer++;
    if (this.ectoRegenTimer >= 30) {
      this.ectoRegenTimer = 0;
      p.ectoplasm = Math.min(p.maxEctoplasm, p.ectoplasm + 1);
    }

    // Horizontal movement
    const speed = p.ghostVision ? VISION_SPEED : MOVE_SPEED;
    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
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

    // Spirit Trap Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.trapAttack();
    }

    // Special: Ghost Vision
    if (this.keys.special && p.ectoplasm >= 40 && !p.ghostVision) {
      p.ectoplasm -= 40;
      p.ghostVision = true;
      p.ghostVisionTimer = 240;
      this.spawnEctoBlasts();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update ghost vision
    if (p.ghostVision) {
      p.ghostVisionTimer--;
      if (p.ghostVisionTimer <= 0) {
        p.ghostVision = false;
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

  private trapAttack() {
    const p = this.player;
    const range = p.ghostVision ? 70 : 50;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = p.ghostVision ? 3 : 2;

    // Create spirit trap effect
    this.spiritTraps.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 10 : -10,
      vy: 0,
      size: p.ghostVision ? 18 : 12,
      life: 40,
    });

    // Melee attack
    for (const e of this.enemies) {
      if (
        e.x + e.width > attackX &&
        e.x < attackX + range &&
        Math.abs(e.y - p.y) < 50
      ) {
        e.health -= damage;
        p.ectoplasm = Math.min(p.maxEctoplasm, p.ectoplasm + 8);
        if (e.health <= 0) {
          this.score += e.type === "wraith" ? 60 : e.type === "poltergeist" ? 45 : 30;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnEctoBlasts() {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.ectoBlasts.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 50,
      });
    }
  }

  private updateSpiritTraps() {
    for (let i = this.spiritTraps.length - 1; i >= 0; i--) {
      const trap = this.spiritTraps[i];
      trap.x += trap.vx;
      trap.y += trap.vy;
      trap.life--;

      if (trap.life <= 0) {
        this.spiritTraps.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkTrapHit(trap, e)) {
          e.health -= 1;
          this.spiritTraps.splice(i, 1);
          this.player.ectoplasm = Math.min(this.player.maxEctoplasm, this.player.ectoplasm + 4);
          if (e.health <= 0) {
            this.score += e.type === "wraith" ? 60 : e.type === "poltergeist" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkTrapHit(trap: SpiritTrap, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      trap.x > target.x &&
      trap.x < target.x + target.width &&
      trap.y > target.y &&
      trap.y < target.y + target.height
    );
  }

  private updateEctoBlasts() {
    for (let i = this.ectoBlasts.length - 1; i >= 0; i--) {
      const blast = this.ectoBlasts[i];
      blast.x += blast.vx;
      blast.y += blast.vy;
      blast.life--;

      if (blast.life <= 0) {
        this.ectoBlasts.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBlastHit(blast, e)) {
          e.health -= 2;
          this.ectoBlasts.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "wraith" ? 60 : e.type === "poltergeist" ? 45 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBlastHit(blast: EctoBlast, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      blast.x > target.x - 10 &&
      blast.x < target.x + target.width + 10 &&
      blast.y > target.y - 10 &&
      blast.y < target.y + target.height + 10
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

      // Toggle invisibility
      e.invisTimer--;
      if (e.invisTimer <= 0) {
        e.invisible = !e.invisible;
        e.invisTimer = 120;
      }

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "wraith" ? 20 : e.type === "poltergeist" ? 18 : 12;
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
    if (this.player.ghostVision) {
      damage = Math.floor(damage * 0.7);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.ectoplasm = Math.min(this.player.maxEctoplasm, this.player.ectoplasm + 15);

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
    this.player.ectoplasm = 50;
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

    // Background - spooky night
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Moon
    ctx.fillStyle = "rgba(220, 220, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(w - 90, 70, 40, 0, Math.PI * 2);
    ctx.fill();

    // Ghostly mist
    ctx.fillStyle = "rgba(180, 180, 200, 0.1)";
    for (let i = 0; i < 10; i++) {
      const mx = ((i * 150 + Date.now() / 30) % (w + 200)) - 100;
      const my = h - 100 + Math.sin(Date.now() / 500 + i) * 20;
      ctx.beginPath();
      ctx.arc(mx, my, 50, 0, Math.PI * 2);
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

    // Draw ecto blasts
    for (const blast of this.ectoBlasts) {
      this.drawEctoBlast(blast);
    }

    // Draw spirit traps
    for (const trap of this.spiritTraps) {
      this.drawSpiritTrap(trap);
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
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a3a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Haunted platforms
      ctx.fillStyle = "#3a3a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a4a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.ghostVision) {
      // Ghost vision form - glowing
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#224466";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);
      ctx.shadowBlur = 0;

      // Head with goggles
      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Goggles
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x + p.width / 2 - 8, p.y + 6, 6, 6);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 6, 6, 6);
      ctx.shadowBlur = 0;
    } else {
      // Normal form
      ctx.fillStyle = "#556677";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

      // Head
      ctx.fillStyle = "#deb887";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#4a90e2";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);

      // Equipment
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + p.width / 2 - 8, p.y + 20, 16, 12);
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const alpha = (e.invisible && !this.player.ghostVision) ? 0.3 : 1.0;
    ctx.globalAlpha = alpha;

    const colors = {
      phantom: "#9999cc",
      poltergeist: "#7777aa",
      wraith: "#555588",
    };

    ctx.fillStyle = colors[e.type];
    ctx.shadowColor = colors[e.type];
    ctx.shadowBlur = 10;
    ctx.fillRect(e.x, e.y, e.width, e.height);
    ctx.shadowBlur = 0;

    // Ethereal effect
    ctx.fillStyle = "rgba(150, 150, 200, 0.3)";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2 + 5, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.globalAlpha = 1;
  }

  private drawSpiritTrap(trap: SpiritTrap) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 15;

    // Pentagon trap
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = trap.x + Math.cos(angle) * trap.size;
      const y = trap.y + Math.sin(angle) * trap.size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  private drawEctoBlast(blast: EctoBlast) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(0, 255, 136, 0.7)";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(blast.x, blast.y, 6, 0, Math.PI * 2);
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

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = p.health / p.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#00c864" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Ectoplasm bar
    const ectoY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, ectoY, barWidth, barHeight);

    const ectoPercent = p.ectoplasm / p.maxEctoplasm;
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(x, ectoY, barWidth * ectoPercent, barHeight);

    ctx.strokeStyle = "#00aa66";
    ctx.strokeRect(x, ectoY, barWidth, barHeight);

    // Ghost vision indicator
    if (p.ghostVision) {
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 10;
      ctx.fillText("GHOST VISION", x, ectoY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
