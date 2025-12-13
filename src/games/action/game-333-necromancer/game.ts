/**
 * Necromancer Game Engine
 * Game #333
 *
 * Undead summoning action game where player summons skeletons to fight!
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
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "paladin" | "priest" | "exorcist";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
}

interface Skeleton {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  facing: "left" | "right";
  isJumping: boolean;
  health: number;
  attackTimer: number;
  targetEnemy: Enemy | null;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DarkOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface SoulParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
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
const ATTACK_DURATION = 25;
const SUMMON_COST = 25;

export class NecromancerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private skeletons: Skeleton[] = [];
  private platforms: Platform[] = [];
  private darkOrbs: DarkOrb[] = [];
  private soulParticles: SoulParticle[] = [];
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
      height: 48,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      souls: 100,
      maxSouls: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
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
    this.skeletons = [];
    this.platforms = [];
    this.darkOrbs = [];
    this.soulParticles = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.souls = this.player.maxSouls;
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

    // Dark platforms
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    // Holy warriors (enemies)
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["paladin", "priest", "exorcist"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "exorcist" ? 34 : 32,
        height: type === "exorcist" ? 46 : 44,
        vx: Math.random() > 0.5 ? 2 : -2,
        type,
        health: type === "exorcist" ? 4 : type === "priest" ? 3 : 3,
        maxHealth: type === "exorcist" ? 4 : type === "priest" ? 3 : 3,
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
    this.updateSkeletons();
    this.updateDarkOrbs();
    this.updateSoulParticles();
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

    // Dark Magic Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.castDarkMagic();
    }

    // Special: Summon Skeleton
    if (this.keys.special && p.souls >= SUMMON_COST) {
      p.souls -= SUMMON_COST;
      this.summonSkeleton();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
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

  private castDarkMagic() {
    const p = this.player;

    this.darkOrbs.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 10 : -10,
      vy: 0,
      size: 12,
      life: 50,
    });
  }

  private summonSkeleton() {
    const p = this.player;

    this.skeletons.push({
      x: p.x + (p.facing === "right" ? p.width : -30),
      y: p.y,
      width: 28,
      height: 40,
      vx: 0,
      vy: 0,
      facing: p.facing,
      isJumping: false,
      health: 2,
      attackTimer: 0,
      targetEnemy: null,
    });

    // Soul particles
    for (let i = 0; i < 10; i++) {
      this.soulParticles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        alpha: 1,
      });
    }
  }

  private updateDarkOrbs() {
    for (let i = this.darkOrbs.length - 1; i >= 0; i--) {
      const orb = this.darkOrbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.life--;

      if (orb.life <= 0) {
        this.darkOrbs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkOrbHit(orb, e)) {
          e.health--;
          this.darkOrbs.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "exorcist" ? 45 : e.type === "priest" ? 35 : 30;
            this.collectSoul(e.x + e.width / 2, e.y + e.height / 2);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkOrbHit(orb: DarkOrb, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      orb.x > target.x &&
      orb.x < target.x + target.width &&
      orb.y > target.y &&
      orb.y < target.y + target.height
    );
  }

  private collectSoul(x: number, y: number) {
    for (let i = 0; i < 15; i++) {
      this.soulParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        alpha: 1,
      });
    }
  }

  private updateSoulParticles() {
    for (let i = this.soulParticles.length - 1; i >= 0; i--) {
      const soul = this.soulParticles[i];
      soul.x += soul.vx;
      soul.y += soul.vy;
      soul.alpha -= 0.02;

      if (soul.alpha <= 0) {
        this.soulParticles.splice(i, 1);
      }
    }
  }

  private updateSkeletons() {
    for (let i = this.skeletons.length - 1; i >= 0; i--) {
      const skel = this.skeletons[i];

      // Find closest enemy
      let closestEnemy: Enemy | null = null;
      let closestDist = Infinity;

      for (const e of this.enemies) {
        const dist = Math.abs(e.x - skel.x);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = e;
        }
      }

      skel.targetEnemy = closestEnemy;

      // Move toward enemy
      if (closestEnemy && closestDist < 300) {
        if (closestEnemy.x > skel.x) {
          skel.vx = 3;
          skel.facing = "right";
        } else {
          skel.vx = -3;
          skel.facing = "left";
        }

        // Attack if close
        if (closestDist < 40 && skel.attackTimer === 0) {
          closestEnemy.health--;
          skel.attackTimer = 30;
          if (closestEnemy.health <= 0) {
            this.score += closestEnemy.type === "exorcist" ? 45 : closestEnemy.type === "priest" ? 35 : 30;
            this.collectSoul(closestEnemy.x + closestEnemy.width / 2, closestEnemy.y + closestEnemy.height / 2);
            const idx = this.enemies.indexOf(closestEnemy);
            if (idx !== -1) this.enemies.splice(idx, 1);
          }
        }
      } else {
        skel.vx = 0;
      }

      if (skel.attackTimer > 0) {
        skel.attackTimer--;
      }

      // Apply physics
      skel.vy += GRAVITY;
      skel.x += skel.vx;
      skel.y += skel.vy;

      // Platform collision
      skel.isJumping = true;
      for (const plat of this.platforms) {
        if (this.checkPlatformCollision(skel, plat)) {
          if (skel.vy > 0) {
            skel.y = plat.y - skel.height;
            skel.vy = 0;
            skel.isJumping = false;
          }
        }
      }

      // Remove if fallen or dead
      if (skel.y > this.canvas.height + 100 || skel.health <= 0) {
        this.skeletons.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Patrol movement
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      // Attack skeletons
      for (let i = this.skeletons.length - 1; i >= 0; i--) {
        const skel = this.skeletons[i];
        if (this.checkEntityCollision(e, skel)) {
          skel.health--;
          if (skel.health <= 0) {
            this.skeletons.splice(i, 1);
          }
        }
      }

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        this.hitPlayer(e.type === "exorcist" ? 18 : e.type === "priest" ? 15 : 12);
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
    this.player.souls = this.player.maxSouls;
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

    // Background - dark necromancer realm
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0d0d1a");
    gradient.addColorStop(0.5, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Floating souls
    ctx.fillStyle = "rgba(100, 200, 100, 0.3)";
    for (let i = 0; i < 25; i++) {
      const sx = (i * 67 + Date.now() / 80) % w;
      const sy = (i * 43 + Math.sin(Date.now() / 400 + i)) % h;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw soul particles
    for (const soul of this.soulParticles) {
      this.drawSoulParticle(soul);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw skeletons
    for (const skel of this.skeletons) {
      this.drawSkeleton(skel);
    }

    // Draw dark orbs
    for (const orb of this.darkOrbs) {
      this.drawDarkOrb(orb);
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
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#2e2e4e";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Dark platforms
      ctx.shadowColor = "#64c864";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#2a2a3e";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#3a3a5e";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Necromancer robe (black/purple)
    ctx.fillStyle = "#1a0033";
    ctx.fillRect(p.x, p.y + 12, p.width, p.height - 12);

    // Hood
    ctx.fillStyle = "#2d004a";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 12);
    ctx.lineTo(p.x + p.width / 2, p.y);
    ctx.lineTo(p.x + p.width, p.y + 12);
    ctx.closePath();
    ctx.fill();

    // Skull face
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // Dark eyes
    ctx.fillStyle = "#64c864";
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 8, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 8, 3, 3);

    // Dark magic when attacking
    if (p.isAttacking) {
      ctx.save();
      ctx.shadowColor = "#64c864";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "rgba(100, 200, 100, 0.5)";
      ctx.beginPath();
      const handX = p.facing === "right" ? p.x + p.width : p.x;
      ctx.arc(handX, p.y + p.height / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Holy warriors (white/gold armor)
    const colors = {
      paladin: "#ffd700",
      priest: "#ffffff",
      exorcist: "#e0e0e0",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Holy symbol
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + e.width / 2, e.y + 10);
    ctx.lineTo(e.x + e.width / 2, e.y + 20);
    ctx.moveTo(e.x + e.width / 2 - 5, e.y + 15);
    ctx.lineTo(e.x + e.width / 2 + 5, e.y + 15);
    ctx.stroke();

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

  private drawSkeleton(skel: Skeleton) {
    const ctx = this.ctx;

    // Skeleton bones
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 3;

    // Skull
    ctx.fillStyle = "#d8d8d8";
    ctx.beginPath();
    ctx.arc(skel.x + skel.width / 2, skel.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();

    // Spine and bones
    ctx.beginPath();
    ctx.moveTo(skel.x + skel.width / 2, skel.y + 15);
    ctx.lineTo(skel.x + skel.width / 2, skel.y + skel.height);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(skel.x + skel.width / 2, skel.y + 20);
    ctx.lineTo(skel.x, skel.y + 25);
    ctx.moveTo(skel.x + skel.width / 2, skel.y + 20);
    ctx.lineTo(skel.x + skel.width, skel.y + 25);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#64c864";
    ctx.fillRect(skel.x + skel.width / 2 - 4, skel.y + 7, 2, 2);
    ctx.fillRect(skel.x + skel.width / 2 + 2, skel.y + 7, 2, 2);
  }

  private drawDarkOrb(orb: DarkOrb) {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = "#64c864";
    ctx.shadowBlur = 15;

    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
    gradient.addColorStop(0, "#64c864");
    gradient.addColorStop(0.5, "#2d8b57");
    gradient.addColorStop(1, "rgba(100, 200, 100, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSoulParticle(soul: SoulParticle) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = soul.alpha;
    ctx.fillStyle = "#64c864";
    ctx.beginPath();
    ctx.arc(soul.x, soul.y, 3, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#64c864";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Soul energy bar
    const soulY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, soulY, barWidth, barHeight);

    const soulPercent = p.souls / p.maxSouls;
    ctx.fillStyle = "#64c864";
    ctx.fillRect(x, soulY, barWidth * soulPercent, barHeight);

    ctx.strokeStyle = "#2d8b57";
    ctx.strokeRect(x, soulY, barWidth, barHeight);

    // Skeleton count
    ctx.fillStyle = "#e8e8e8";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`Skeletons: ${this.skeletons.length}`, x, soulY + barHeight + 20);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
