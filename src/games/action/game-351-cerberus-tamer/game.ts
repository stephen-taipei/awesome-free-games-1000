/**
 * Cerberus Tamer Game Engine
 * Game #351
 *
 * Fight and tame the three-headed dog of Hades!
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
  souls: number;
  maxSouls: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  soulShield: boolean;
  soulShieldTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "hellhound" | "shade" | "cerberus";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  headAttackPhase: number; // For Cerberus triple attack
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SoulChain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface SoulOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  souls: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const SHIELD_SPEED = 3;
const ATTACK_DURATION = 20;

export class CerberusTamerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private soulChains: SoulChain[] = [];
  private soulOrbs: SoulOrb[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private soulRegenTimer = 0;

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
      souls: 50,
      maxSouls: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      soulShield: false,
      soulShieldTimer: 0,
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
        souls: Math.floor(this.player.souls),
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
    this.soulChains = [];
    this.soulOrbs = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.souls = 50;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    // Ground - Underworld floor
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    // Underworld platforms
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
    const types: Enemy["type"][] = ["hellhound", "shade", "cerberus"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "cerberus" ? 48 : 32,
        height: type === "cerberus" ? 56 : 44,
        vx: Math.random() > 0.5 ? 2 : -2,
        type,
        health: type === "cerberus" ? 8 : type === "shade" ? 4 : 3,
        maxHealth: type === "cerberus" ? 8 : type === "shade" ? 4 : 3,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 100,
        patrolRight: x + 100,
        headAttackPhase: 0,
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
    this.updateSoulChains();
    this.updateSoulOrbs();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Soul regeneration
    this.soulRegenTimer++;
    if (this.soulRegenTimer >= 40) {
      this.soulRegenTimer = 0;
      p.souls = Math.min(p.maxSouls, p.souls + 1);
    }

    // Horizontal movement
    const speed = p.soulShield ? SHIELD_SPEED : MOVE_SPEED;
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

    // Soul Chain Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.soulChainAttack();
    }

    // Special: Soul Shield
    if (this.keys.special && p.souls >= 35 && !p.soulShield) {
      p.souls -= 35;
      p.soulShield = true;
      p.soulShieldTimer = 200;
      this.spawnSoulOrbs();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update soul shield
    if (p.soulShield) {
      p.soulShieldTimer--;
      if (p.soulShieldTimer <= 0) {
        p.soulShield = false;
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

  private soulChainAttack() {
    const p = this.player;
    const range = 60;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = 2;

    // Create soul chain effect
    this.soulChains.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 10 : -10,
      vy: 0,
      size: 14,
      life: 35,
    });

    // Melee attack
    for (const e of this.enemies) {
      if (
        e.x + e.width > attackX &&
        e.x < attackX + range &&
        Math.abs(e.y - p.y) < 50
      ) {
        e.health -= damage;
        p.souls = Math.min(p.maxSouls, p.souls + 10);
        if (e.health <= 0) {
          this.score += e.type === "cerberus" ? 80 : e.type === "shade" ? 50 : 35;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnSoulOrbs() {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.soulOrbs.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 60,
      });
    }
  }

  private updateSoulChains() {
    for (let i = this.soulChains.length - 1; i >= 0; i--) {
      const chain = this.soulChains[i];
      chain.x += chain.vx;
      chain.y += chain.vy;
      chain.life--;

      if (chain.life <= 0) {
        this.soulChains.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkChainHit(chain, e)) {
          e.health -= 1;
          this.soulChains.splice(i, 1);
          this.player.souls = Math.min(this.player.maxSouls, this.player.souls + 5);
          if (e.health <= 0) {
            this.score += e.type === "cerberus" ? 80 : e.type === "shade" ? 50 : 35;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkChainHit(chain: SoulChain, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      chain.x > target.x &&
      chain.x < target.x + target.width &&
      chain.y > target.y &&
      chain.y < target.y + target.height
    );
  }

  private updateSoulOrbs() {
    for (let i = this.soulOrbs.length - 1; i >= 0; i--) {
      const orb = this.soulOrbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.life--;

      if (orb.life <= 0) {
        this.soulOrbs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkOrbHit(orb, e)) {
          e.health -= 2;
          this.soulOrbs.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "cerberus" ? 80 : e.type === "shade" ? 50 : 35;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkOrbHit(orb: SoulOrb, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      orb.x > target.x - 12 &&
      orb.x < target.x + target.width + 12 &&
      orb.y > target.y - 12 &&
      orb.y < target.y + target.height + 12
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

      // Cerberus triple head attack
      if (e.type === "cerberus") {
        e.headAttackPhase = (e.headAttackPhase + 1) % 120;
      }

      // Check player collision
      if (!this.player.invincible && !this.player.soulShield && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "cerberus" ? 25 : e.type === "shade" ? 18 : 15;
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
    if (this.player.soulShield) {
      damage = Math.floor(damage * 0.5);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.souls = Math.min(this.player.maxSouls, this.player.souls + 12);

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
    this.player.souls = 50;
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

    // Background - Underworld
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a0a0a");
    gradient.addColorStop(0.5, "#2a1515");
    gradient.addColorStop(1, "#3a2020");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Underworld flames
    ctx.fillStyle = "rgba(200, 50, 0, 0.3)";
    for (let i = 0; i < 30; i++) {
      const fx = (i * 97 + Date.now() * 0.05) % w;
      const fy = h - 40 + Math.sin(Date.now() * 0.01 + i) * 10;
      ctx.beginPath();
      ctx.arc(fx, fy, 15 + Math.sin(Date.now() * 0.02 + i) * 5, 0, Math.PI * 2);
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

    // Draw soul orbs
    for (const orb of this.soulOrbs) {
      this.drawSoulOrb(orb);
    }

    // Draw soul chains
    for (const chain of this.soulChains) {
      this.drawSoulChain(chain);
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
      // Ground - dark stone
      ctx.fillStyle = "#2a1a1a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a2525";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Platforms - obsidian
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Soul shield aura
    if (p.soulShield) {
      ctx.save();
      ctx.strokeStyle = "#88ccff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#88ccff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 30 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Body - warrior
    ctx.fillStyle = "#6a4a3a";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    // Head
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#88ccff";
    ctx.shadowColor = "#88ccff";
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);
    ctx.shadowBlur = 0;

    // Soul chain weapon
    ctx.strokeStyle = "#66aacc";
    ctx.lineWidth = 2;
    const chainX = p.facing === "right" ? p.x + p.width : p.x;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 20);
    ctx.lineTo(chainX, p.y + 25);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.type === "cerberus") {
      // Three-headed dog
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(e.x, e.y + 20, e.width, e.height - 20);

      // Three heads
      const heads = [-12, 0, 12];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === Math.floor(e.headAttackPhase / 40) ? "#5a3a2a" : "#4a3a2a";
        ctx.beginPath();
        ctx.arc(e.x + e.width / 2 + heads[i], e.y + 15, 10, 0, Math.PI * 2);
        ctx.fill();

        // Red eyes
        ctx.fillStyle = "#cc0000";
        ctx.shadowColor = "#cc0000";
        ctx.shadowBlur = 10;
        ctx.fillRect(e.x + e.width / 2 + heads[i] - 4, e.y + 13, 2, 2);
        ctx.fillRect(e.x + e.width / 2 + heads[i] + 2, e.y + 13, 2, 2);
        ctx.shadowBlur = 0;
      }
    } else if (e.type === "shade") {
      // Ghost-like shade
      ctx.fillStyle = "rgba(100, 100, 150, 0.7)";
      ctx.shadowColor = "#6688aa";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Hellhound
      ctx.fillStyle = "#4a2a1a";
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Red glow
      ctx.fillStyle = "#aa3333";
      ctx.fillRect(e.x + e.width / 2 - 4, e.y + 8, 3, 3);
      ctx.fillRect(e.x + e.width / 2 + 2, e.y + 8, 3, 3);
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

  private drawSoulChain(chain: SoulChain) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#88ccff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#88ccff";
    ctx.shadowBlur = 12;

    // Draw chain links
    const dir = chain.vx > 0 ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(chain.x - dir * i * 10, chain.y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSoulOrb(orb: SoulOrb) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(136, 204, 255, 0.8)";
    ctx.shadowColor = "#88ccff";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = "rgba(200, 220, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 5, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#3a2020";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Soul bar
    const soulY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, soulY, barWidth, barHeight);

    const soulPercent = p.souls / p.maxSouls;
    ctx.fillStyle = "#88ccff";
    ctx.fillRect(x, soulY, barWidth * soulPercent, barHeight);

    ctx.strokeStyle = "#6688aa";
    ctx.strokeRect(x, soulY, barWidth, barHeight);

    // Soul shield indicator
    if (p.soulShield) {
      ctx.fillStyle = "#88ccff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#88ccff";
      ctx.shadowBlur = 10;
      ctx.fillText("SOUL SHIELD", x, soulY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
