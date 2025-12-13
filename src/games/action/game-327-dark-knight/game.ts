/**
 * Dark Knight Game Engine
 * Game #327
 *
 * Embrace darkness and unleash shadow power!
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
  darkPower: number;
  maxDarkPower: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  shadowForm: boolean;
  shadowTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "knight" | "mage" | "guardian";
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

interface ShadowBlade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  life: number;
}

interface DarkVortex {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  rotation: number;
}

interface GameState {
  score: number;
  health: number;
  darkPower: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 6;
const ATTACK_DURATION = 20;
const ATTACK_RANGE = 55;

export class DarkKnightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private shadowBlades: ShadowBlade[] = [];
  private darkVortexes: DarkVortex[] = [];
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
      height: 44,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      darkPower: 100,
      maxDarkPower: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      shadowForm: false,
      shadowTimer: 0,
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
        darkPower: Math.floor(this.player.darkPower),
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
    this.shadowBlades = [];
    this.darkVortexes = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.darkPower = this.player.maxDarkPower;
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

    // Dark floating platforms
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    // Light enemies
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["knight", "mage", "guardian"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "guardian" ? 38 : 30,
        height: type === "guardian" ? 50 : 42,
        vx: type === "mage" ? 0 : (Math.random() > 0.5 ? 2 : -2),
        type,
        health: type === "guardian" ? 5 : type === "mage" ? 2 : 3,
        maxHealth: type === "guardian" ? 5 : type === "mage" ? 2 : 3,
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
    this.updateShadowBlades();
    this.updateDarkVortexes();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Dark power regeneration
    this.powerRegenTimer++;
    if (this.powerRegenTimer >= 25) {
      this.powerRegenTimer = 0;
      p.darkPower = Math.min(p.maxDarkPower, p.darkPower + 1);
    }

    // Horizontal movement (faster in shadow form)
    const speed = p.shadowForm ? MOVE_SPEED * 1.5 : MOVE_SPEED;
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
    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Shadow Slash Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.performShadowSlash();
    }

    // Special: Shadow Form
    if (this.keys.special && p.darkPower >= 25 && !p.shadowForm) {
      p.darkPower -= 25;
      p.shadowForm = true;
      p.shadowTimer = 150;
      this.createDarkVortex(p.x + p.width / 2, p.y + p.height / 2);
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update shadow form
    if (p.shadowForm) {
      p.shadowTimer--;
      if (p.shadowTimer <= 0) {
        p.shadowForm = false;
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

  private performShadowSlash() {
    const p = this.player;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - ATTACK_RANGE;

    // Create shadow blade projectile
    this.shadowBlades.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 14 : -14,
      vy: 0,
      rotation: 0,
      life: 35,
    });

    // Melee damage
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (
        e.x + e.width > attackX &&
        e.x < attackX + ATTACK_RANGE &&
        Math.abs(e.y - p.y) < 50
      ) {
        const damage = p.shadowForm ? 3 : 2;
        e.health -= damage;
        if (e.health <= 0) {
          this.score += e.type === "guardian" ? 50 : e.type === "mage" ? 30 : 20;
          this.createDarkVortex(e.x + e.width / 2, e.y + e.height / 2);
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private createDarkVortex(x: number, y: number) {
    this.darkVortexes.push({
      x,
      y,
      radius: 10,
      maxRadius: 70,
      alpha: 1,
      rotation: 0,
    });
  }

  private updateShadowBlades() {
    for (let i = this.shadowBlades.length - 1; i >= 0; i--) {
      const blade = this.shadowBlades[i];
      blade.x += blade.vx;
      blade.y += blade.vy;
      blade.rotation += 0.3;
      blade.life--;

      if (blade.life <= 0) {
        this.shadowBlades.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBladeHit(blade, e)) {
          e.health -= 2;
          this.shadowBlades.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "guardian" ? 50 : e.type === "mage" ? 30 : 20;
            this.createDarkVortex(e.x + e.width / 2, e.y + e.height / 2);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBladeHit(blade: ShadowBlade, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      blade.x > target.x &&
      blade.x < target.x + target.width &&
      blade.y > target.y &&
      blade.y < target.y + target.height
    );
  }

  private updateDarkVortexes() {
    for (let i = this.darkVortexes.length - 1; i >= 0; i--) {
      const vortex = this.darkVortexes[i];
      vortex.radius += 3;
      vortex.alpha -= 0.03;
      vortex.rotation += 0.1;

      if (vortex.alpha <= 0) {
        this.darkVortexes.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // AI behavior
      if (e.type === "mage") {
        // Mage stays still and tracks player
        e.facing = this.player.x < e.x ? "left" : "right";
        e.attackTimer++;
        if (e.attackTimer >= 90) {
          e.attackTimer = 0;
          // Mage attack (player takes damage if in range)
          const dx = this.player.x - e.x;
          const dy = this.player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && !this.player.invincible && !this.player.shadowForm) {
            this.hitPlayer(12);
          }
        }
      } else {
        // Patrol movement
        e.x += e.vx;
        if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
          e.vx = -e.vx;
        }
        e.facing = e.vx < 0 ? "left" : "right";
      }

      // Check player collision (shadow form makes player invincible)
      if (!this.player.invincible && !this.player.shadowForm && this.checkEntityCollision(this.player, e)) {
        this.hitPlayer(e.type === "guardian" ? 15 : 10);
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
    this.player.darkPower = this.player.maxDarkPower;
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

    // Background - dark abyss
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0a0a0a");
    gradient.addColorStop(0.5, "#1a1a2a");
    gradient.addColorStop(1, "#0d0d1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Dark mist particles
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 20; i++) {
      const mistX = (i * 97 + Date.now() / 50) % (w + 100) - 50;
      const mistY = h - 100 + Math.sin(Date.now() / 500 + i) * 30;
      ctx.fillStyle = "#3a3a5a";
      ctx.beginPath();
      ctx.arc(mistX, mistY, 30 + Math.sin(i) * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Dim red moon
    ctx.fillStyle = "rgba(139, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(w - 80, 70, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw dark vortexes
    for (const vortex of this.darkVortexes) {
      this.drawDarkVortex(vortex);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw shadow blades
    for (const blade of this.shadowBlades) {
      this.drawShadowBlade(blade);
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
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Dark floating platform
      ctx.shadowColor = "#4a0080";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#2a2a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#3a3a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Shadow form effect
    if (p.shadowForm) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#1a0030";
      for (let i = 0; i < 5; i++) {
        const offset = Math.sin(Date.now() / 100 + i) * 8;
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width / 2 + 10 + i * 3, p.height / 2 + 5 + i * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Dark armor body
    ctx.fillStyle = p.shadowForm ? "#2a0050" : "#1a1a2a";
    ctx.fillRect(p.x + 2, p.y + 10, p.width - 4, p.height - 10);

    // Helmet with red visor
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(p.x, p.y, p.width, 12);

    // Glowing red eyes
    ctx.fillStyle = "#ff0000";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 8;
    if (p.facing === "right") {
      ctx.fillRect(p.x + 18, p.y + 4, 8, 3);
    } else {
      ctx.fillRect(p.x + 6, p.y + 4, 8, 3);
    }
    ctx.shadowBlur = 0;

    // Dark cape
    ctx.fillStyle = "#0a0020";
    const capeOffset = Math.sin(Date.now() / 150) * 4;
    if (p.facing === "right") {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 10);
      ctx.lineTo(p.x - 10 + capeOffset, p.y + p.height + 5);
      ctx.lineTo(p.x + 10, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x + p.width, p.y + 10);
      ctx.lineTo(p.x + p.width + 10 - capeOffset, p.y + p.height + 5);
      ctx.lineTo(p.x + p.width - 10, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    }

    // Attack slash effect
    if (p.isAttacking) {
      ctx.save();
      ctx.shadowColor = "#8b0000";
      ctx.shadowBlur = 15;
      ctx.strokeStyle = "#8b0000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.arc(p.x + p.width + 15, p.y + p.height / 2, 30, -0.6, 0.6);
      } else {
        ctx.arc(p.x - 15, p.y + p.height / 2, 30, Math.PI - 0.6, Math.PI + 0.6);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Light glow around enemies
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body color based on type
    const colors = {
      knight: "#c0c0c0",
      mage: "#e8e8ff",
      guardian: "#ffd700",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Helmet/hood
    ctx.fillStyle = e.type === "mage" ? "#4169e1" : "#808080";
    ctx.fillRect(e.x, e.y, e.width, 12);

    // Eyes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(e.x + 5, e.y + 5, 5, 3);
    ctx.fillRect(e.x + e.width - 10, e.y + 5, 5, 3);

    // Guardian shield
    if (e.type === "guardian") {
      ctx.fillStyle = "#ffd700";
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x + e.width + 5, e.y + e.height / 2, 8, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Mage staff glow
    if (e.type === "mage") {
      ctx.fillStyle = "#87ceeb";
      ctx.shadowColor = "#87ceeb";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(e.x - 10, e.y + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Health bar
    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawShadowBlade(blade: ShadowBlade) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(blade.x, blade.y);
    ctx.rotate(blade.rotation);

    ctx.shadowColor = "#8b0000";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#2a0030";

    // Spinning blade shape
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(0, -4);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Core
    ctx.fillStyle = "#8b0000";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawDarkVortex(vortex: DarkVortex) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = vortex.alpha;
    ctx.translate(vortex.x, vortex.y);
    ctx.rotate(vortex.rotation);

    // Spiral effect
    for (let i = 0; i < 3; i++) {
      const radius = vortex.radius * (1 - i * 0.2);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, "rgba(74, 0, 128, 0.8)");
      gradient.addColorStop(0.5, "rgba(42, 0, 48, 0.5)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }

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
    const hpColor = hpPercent > 0.5 ? "#8b0000" : hpPercent > 0.25 ? "#b22222" : "#ff0000";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "#4a0080";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Dark Power bar
    const powerY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, powerY, barWidth, barHeight);

    const powerPercent = p.darkPower / p.maxDarkPower;
    ctx.fillStyle = "#4a0080";
    ctx.fillRect(x, powerY, barWidth * powerPercent, barHeight);

    ctx.strokeStyle = "#4a0080";
    ctx.strokeRect(x, powerY, barWidth, barHeight);

    // Shadow form indicator
    if (p.shadowForm) {
      ctx.fillStyle = "#8b0000";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("SHADOW FORM", x, powerY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
