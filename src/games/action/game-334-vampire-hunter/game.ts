/**
 * Vampire Hunter Game Engine
 * Game #334
 *
 * Vampire-themed combat with blood drain and bat transformation!
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
  blood: number;
  maxBlood: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  batForm: boolean;
  batFormTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "hunter" | "cleric" | "vampire-slayer";
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

interface BloodOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface Bat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  score: number;
  health: number;
  blood: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const BAT_SPEED = 7;
const ATTACK_DURATION = 25;

export class VampireHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private bloodOrbs: BloodOrb[] = [];
  private bats: Bat[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private bloodRegenTimer = 0;

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
      blood: 100,
      maxBlood: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      batForm: false,
      batFormTimer: 0,
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
        blood: Math.floor(this.player.blood),
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
    this.bloodOrbs = [];
    this.bats = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.blood = this.player.maxBlood;
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

    // Dark castle platforms
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 180 + Math.random() * 80,
        y: h - 120 - Math.random() * 140,
        width: 90 + Math.random() * 60,
        height: 18,
      });
    }

    // Vampire hunters (enemies)
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["hunter", "cleric", "vampire-slayer"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "vampire-slayer" ? 36 : 32,
        height: type === "vampire-slayer" ? 48 : 44,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        type,
        health: type === "vampire-slayer" ? 5 : type === "cleric" ? 3 : 3,
        maxHealth: type === "vampire-slayer" ? 5 : type === "cleric" ? 3 : 3,
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
    this.updateBloodOrbs();
    this.updateBats();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Blood regeneration
    this.bloodRegenTimer++;
    if (this.bloodRegenTimer >= 35) {
      this.bloodRegenTimer = 0;
      p.blood = Math.min(p.maxBlood, p.blood + 1);
    }

    // Horizontal movement
    const speed = p.batForm ? BAT_SPEED : MOVE_SPEED;
    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump / Fly
    if (this.keys.jump) {
      if (p.batForm) {
        p.vy = -5; // Continuous flight
      } else if (!p.isJumping) {
        p.vy = JUMP_FORCE;
        p.isJumping = true;
      }
    }

    // Blood Drain Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.bloodDrainAttack();
    }

    // Special: Bat Transformation
    if (this.keys.special && p.blood >= 30 && !p.batForm) {
      p.blood -= 30;
      p.batForm = true;
      p.batFormTimer = 180; // 3 seconds
      this.spawnBats();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update bat form
    if (p.batForm) {
      p.batFormTimer--;
      if (p.batFormTimer <= 0) {
        p.batForm = false;
      }
    }

    // Update invincibility
    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) {
        p.invincible = false;
      }
    }

    // Apply gravity (less in bat form)
    if (!p.batForm) {
      p.vy += GRAVITY;
    } else {
      p.vy += GRAVITY * 0.3;
    }

    // Apply velocity
    p.x += p.vx;
    p.y += p.vy;

    // Platform collision (not in bat form)
    if (!p.batForm) {
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
    }

    // World bounds
    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));
    if (p.batForm) {
      p.y = Math.max(0, Math.min(this.canvas.height - p.height, p.y));
    }

    // Fall death
    if (p.y > this.canvas.height + 100 && !p.batForm) {
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

  private bloodDrainAttack() {
    const p = this.player;
    const range = 50;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;

    // Create blood orb
    this.bloodOrbs.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 11 : -11,
      vy: 0,
      size: 10,
      life: 45,
    });

    // Melee drain
    for (const e of this.enemies) {
      if (
        e.x + e.width > attackX &&
        e.x < attackX + range &&
        Math.abs(e.y - p.y) < 50
      ) {
        e.health -= 2;
        p.blood = Math.min(p.maxBlood, p.blood + 5); // Heal from draining
        if (e.health <= 0) {
          this.score += e.type === "vampire-slayer" ? 50 : e.type === "cleric" ? 40 : 30;
          const idx = this.enemies.indexOf(e);
          if (idx !== -1) this.enemies.splice(idx, 1);
        }
      }
    }
  }

  private spawnBats() {
    for (let i = 0; i < 5; i++) {
      this.bats.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 60,
      });
    }
  }

  private updateBloodOrbs() {
    for (let i = this.bloodOrbs.length - 1; i >= 0; i--) {
      const orb = this.bloodOrbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.life--;

      if (orb.life <= 0) {
        this.bloodOrbs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkOrbHit(orb, e)) {
          e.health -= 1;
          this.bloodOrbs.splice(i, 1);
          this.player.blood = Math.min(this.player.maxBlood, this.player.blood + 3);
          if (e.health <= 0) {
            this.score += e.type === "vampire-slayer" ? 50 : e.type === "cleric" ? 40 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkOrbHit(orb: BloodOrb, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      orb.x > target.x &&
      orb.x < target.x + target.width &&
      orb.y > target.y &&
      orb.y < target.y + target.height
    );
  }

  private updateBats() {
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const bat = this.bats[i];
      bat.x += bat.vx;
      bat.y += bat.vy;
      bat.life--;

      if (bat.life <= 0) {
        this.bats.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBatHit(bat, e)) {
          e.health--;
          this.bats.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "vampire-slayer" ? 50 : e.type === "cleric" ? 40 : 30;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBatHit(bat: Bat, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      bat.x > target.x - 10 &&
      bat.x < target.x + target.width + 10 &&
      bat.y > target.y - 10 &&
      bat.y < target.y + target.height + 10
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
      if (!this.player.invincible && !this.player.batForm && this.checkEntityCollision(this.player, e)) {
        this.hitPlayer(e.type === "vampire-slayer" ? 20 : e.type === "cleric" ? 15 : 12);
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
    this.player.blood = this.player.maxBlood;
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

    // Background - night sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0a0015");
    gradient.addColorStop(0.5, "#1a0033");
    gradient.addColorStop(1, "#2a0044");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Moon
    ctx.fillStyle = "rgba(220, 220, 240, 0.9)";
    ctx.beginPath();
    ctx.arc(w - 80, 60, 40, 0, Math.PI * 2);
    ctx.fill();

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 73) % w;
      const sy = (i * 37) % (h / 2);
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
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

    // Draw bats
    for (const bat of this.bats) {
      this.drawBat(bat);
    }

    // Draw blood orbs
    for (const orb of this.bloodOrbs) {
      this.drawBloodOrb(orb);
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
      ctx.fillStyle = "#1a0033";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#2a0044";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Castle platforms
      ctx.fillStyle = "#3a1a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#5a3a6a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.batForm) {
      // Bat form
      ctx.fillStyle = "#1a0033";
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2, p.y + 10);
      ctx.lineTo(p.x, p.y + 5);
      ctx.lineTo(p.x + 5, p.y + 15);
      ctx.lineTo(p.x + p.width / 2, p.y + 12);
      ctx.lineTo(p.x + p.width - 5, p.y + 15);
      ctx.lineTo(p.x + p.width, p.y + 5);
      ctx.closePath();
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = "#dc143c";
      ctx.fillRect(p.x + 10, p.y + 8, 3, 2);
      ctx.fillRect(p.x + 19, p.y + 8, 3, 2);
    } else {
      // Vampire form (pale with cape)
      ctx.fillStyle = "#2a0044";
      ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

      // Head
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Vampire eyes
      ctx.fillStyle = "#dc143c";
      ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
      ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);

      // Fangs
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2 - 3, p.y + 12);
      ctx.lineTo(p.x + p.width / 2 - 3, p.y + 16);
      ctx.lineTo(p.x + p.width / 2 - 1, p.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 2 + 3, p.y + 12);
      ctx.lineTo(p.x + p.width / 2 + 3, p.y + 16);
      ctx.lineTo(p.x + p.width / 2 + 1, p.y + 12);
      ctx.closePath();
      ctx.fill();

      // Cape
      ctx.fillStyle = "#dc143c";
      const capeOffset = Math.sin(Date.now() / 200) * 3;
      if (p.facing === "right") {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 12);
        ctx.lineTo(p.x - 10 + capeOffset, p.y + p.height);
        ctx.lineTo(p.x + 10, p.y + p.height);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x + p.width, p.y + 12);
        ctx.lineTo(p.x + p.width + 10 - capeOffset, p.y + p.height);
        ctx.lineTo(p.x + p.width - 10, p.y + p.height);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Hunter colors
    const colors = {
      hunter: "#654321",
      cleric: "#e0e0e0",
      "vampire-slayer": "#4a4a4a",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Cross symbol for hunters
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + e.width / 2, e.y + 8);
    ctx.lineTo(e.x + e.width / 2, e.y + 18);
    ctx.moveTo(e.x + e.width / 2 - 5, e.y + 13);
    ctx.lineTo(e.x + e.width / 2 + 5, e.y + 13);
    ctx.stroke();

    // Weapon for slayer
    if (e.type === "vampire-slayer") {
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + e.width, e.y + e.height / 2);
      ctx.lineTo(e.x + e.width + 15, e.y + e.height / 2);
      ctx.stroke();
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

  private drawBloodOrb(orb: BloodOrb) {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = "#dc143c";
    ctx.shadowBlur = 15;

    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
    gradient.addColorStop(0, "#ff0000");
    gradient.addColorStop(0.5, "#dc143c");
    gradient.addColorStop(1, "rgba(220, 20, 60, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawBat(bat: Bat) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "#1a0033";
    ctx.beginPath();
    ctx.arc(bat.x, bat.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    const wingAngle = Math.sin(Date.now() / 50) * 0.5;
    ctx.beginPath();
    ctx.moveTo(bat.x, bat.y);
    ctx.lineTo(bat.x - 8, bat.y - 3 + wingAngle);
    ctx.lineTo(bat.x - 6, bat.y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bat.x, bat.y);
    ctx.lineTo(bat.x + 8, bat.y - 3 + wingAngle);
    ctx.lineTo(bat.x + 6, bat.y + 2);
    ctx.closePath();
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

    ctx.strokeStyle = "#dc143c";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Blood bar
    const bloodY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, bloodY, barWidth, barHeight);

    const bloodPercent = p.blood / p.maxBlood;
    ctx.fillStyle = "#dc143c";
    ctx.fillRect(x, bloodY, barWidth * bloodPercent, barHeight);

    ctx.strokeStyle = "#8b0000";
    ctx.strokeRect(x, bloodY, barWidth, barHeight);

    // Bat form indicator
    if (p.batForm) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("BAT FORM", x, bloodY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
