/**
 * Sphinx Riddle Game Engine
 * Game #352
 *
 * Battle the sphinx with puzzle-based combat!
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
  wisdom: number;
  maxWisdom: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  riddlePower: boolean;
  riddlePowerTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "puzzle-guard" | "riddle-keeper" | "sphinx";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  riddleActive: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RiddleBolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  symbol: string;
}

interface WisdomOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rotation: number;
}

interface GameState {
  score: number;
  health: number;
  wisdom: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const RIDDLE_SPEED = 3.5;
const ATTACK_DURATION = 20;

export class SphinxRiddleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private riddleBolts: RiddleBolt[] = [];
  private wisdomOrbs: WisdomOrb[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private wisdomRegenTimer = 0;

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
      wisdom: 50,
      maxWisdom: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      riddlePower: false,
      riddlePowerTimer: 0,
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
        wisdom: Math.floor(this.player.wisdom),
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
    this.riddleBolts = [];
    this.wisdomOrbs = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.wisdom = 50;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    // Ground - Desert sand
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    // Ancient pyramid platforms
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
    const types: Enemy["type"][] = ["puzzle-guard", "riddle-keeper", "sphinx"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "sphinx" ? 52 : 32,
        height: type === "sphinx" ? 60 : 44,
        vx: Math.random() > 0.5 ? 2 : -2,
        type,
        health: type === "sphinx" ? 9 : type === "riddle-keeper" ? 5 : 3,
        maxHealth: type === "sphinx" ? 9 : type === "riddle-keeper" ? 5 : 3,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 100,
        patrolRight: x + 100,
        riddleActive: false,
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
    this.updateRiddleBolts();
    this.updateWisdomOrbs();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Wisdom regeneration
    this.wisdomRegenTimer++;
    if (this.wisdomRegenTimer >= 35) {
      this.wisdomRegenTimer = 0;
      p.wisdom = Math.min(p.maxWisdom, p.wisdom + 1);
    }

    // Horizontal movement
    const speed = p.riddlePower ? RIDDLE_SPEED : MOVE_SPEED;
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

    // Riddle Bolt Attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.riddleBoltAttack();
    }

    // Special: Riddle Power
    if (this.keys.special && p.wisdom >= 40 && !p.riddlePower) {
      p.wisdom -= 40;
      p.riddlePower = true;
      p.riddlePowerTimer = 180;
      this.spawnWisdomOrbs();
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update riddle power
    if (p.riddlePower) {
      p.riddlePowerTimer--;
      if (p.riddlePowerTimer <= 0) {
        p.riddlePower = false;
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

  private riddleBoltAttack() {
    const p = this.player;
    const symbols = ["Ω", "Ψ", "Φ", "Σ"];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    // Create riddle bolt with Greek symbol
    this.riddleBolts.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 9 : -9,
      vy: 0,
      size: 16,
      life: 40,
      symbol,
    });
  }

  private spawnWisdomOrbs() {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.wisdomOrbs.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 70,
        rotation: angle,
      });
    }
  }

  private updateRiddleBolts() {
    for (let i = this.riddleBolts.length - 1; i >= 0; i--) {
      const bolt = this.riddleBolts[i];
      bolt.x += bolt.vx;
      bolt.y += bolt.vy;
      bolt.life--;

      if (bolt.life <= 0) {
        this.riddleBolts.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkBoltHit(bolt, e)) {
          const damage = this.player.riddlePower ? 3 : 2;
          e.health -= damage;
          this.riddleBolts.splice(i, 1);
          this.player.wisdom = Math.min(this.player.maxWisdom, this.player.wisdom + 7);
          if (e.health <= 0) {
            this.score += e.type === "sphinx" ? 90 : e.type === "riddle-keeper" ? 55 : 40;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkBoltHit(bolt: RiddleBolt, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      bolt.x > target.x &&
      bolt.x < target.x + target.width &&
      bolt.y > target.y &&
      bolt.y < target.y + target.height
    );
  }

  private updateWisdomOrbs() {
    for (let i = this.wisdomOrbs.length - 1; i >= 0; i--) {
      const orb = this.wisdomOrbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.rotation += 0.1;
      orb.life--;

      if (orb.life <= 0) {
        this.wisdomOrbs.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkOrbHit(orb, e)) {
          e.health -= 2;
          this.wisdomOrbs.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "sphinx" ? 90 : e.type === "riddle-keeper" ? 55 : 40;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkOrbHit(orb: WisdomOrb, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      orb.x > target.x - 10 &&
      orb.x < target.x + target.width + 10 &&
      orb.y > target.y - 10 &&
      orb.y < target.y + target.height + 10
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

      // Sphinx riddle attack
      if (e.type === "sphinx") {
        e.riddleActive = Math.random() < 0.02;
      }

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "sphinx" ? 22 : e.type === "riddle-keeper" ? 16 : 12;
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
    if (this.player.riddlePower) {
      damage = Math.floor(damage * 0.7);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.wisdom = Math.min(this.player.maxWisdom, this.player.wisdom + 10);

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
    this.player.wisdom = 50;
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

    // Background - Egyptian desert
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#d4a574");
    gradient.addColorStop(0.5, "#c49060");
    gradient.addColorStop(1, "#a47850");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Desert sun
    ctx.fillStyle = "rgba(255, 220, 120, 0.9)";
    ctx.shadowColor = "rgba(255, 220, 120, 0.5)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(w - 100, 80, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pyramids in background
    ctx.fillStyle = "rgba(150, 120, 80, 0.4)";
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h - 40);
    ctx.lineTo(w * 0.4, h - 150);
    ctx.lineTo(w * 0.5, h - 40);
    ctx.closePath();
    ctx.fill();

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

    // Draw wisdom orbs
    for (const orb of this.wisdomOrbs) {
      this.drawWisdomOrb(orb);
    }

    // Draw riddle bolts
    for (const bolt of this.riddleBolts) {
      this.drawRiddleBolt(bolt);
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
      // Ground - sand
      ctx.fillStyle = "#d4a574";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#c49060";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      // Platforms - stone blocks
      ctx.fillStyle = "#a47850";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#b48860";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Riddle power aura
    if (p.riddlePower) {
      ctx.save();
      ctx.strokeStyle = "#cc99ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#cc99ff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 28 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Body - scholar
    ctx.fillStyle = "#8a6a4a";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    // Head
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - wise
    ctx.fillStyle = "#cc99ff";
    ctx.shadowColor = "#cc99ff";
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);
    ctx.shadowBlur = 0;

    // Scroll/book
    ctx.fillStyle = "#f4d4a4";
    ctx.fillRect(p.x + (p.facing === "right" ? p.width - 8 : 2), p.y + 20, 6, 10);

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.type === "sphinx") {
      // Sphinx - lion body with woman head
      ctx.fillStyle = "#c49060";
      ctx.fillRect(e.x, e.y + 25, e.width, e.height - 25);

      // Sphinx head
      ctx.fillStyle = "#d4a574";
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 18, 15, 0, Math.PI * 2);
      ctx.fill();

      // Eyes - mysterious
      ctx.fillStyle = "#9966ff";
      ctx.shadowColor = "#9966ff";
      ctx.shadowBlur = 12;
      ctx.fillRect(e.x + e.width / 2 - 6, e.y + 16, 4, 4);
      ctx.fillRect(e.x + e.width / 2 + 3, e.y + 16, 4, 4);
      ctx.shadowBlur = 0;

      // Riddle symbols when active
      if (e.riddleActive) {
        ctx.fillStyle = "#cc99ff";
        ctx.font = "bold 14px serif";
        ctx.fillText("?", e.x + e.width / 2 - 4, e.y - 5);
      }
    } else if (e.type === "riddle-keeper") {
      // Ancient guardian
      ctx.fillStyle = "#7a5a3a";
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Glowing hieroglyphs
      ctx.fillStyle = "#ffcc66";
      ctx.fillRect(e.x + e.width / 2 - 3, e.y + 12, 6, 2);
      ctx.fillRect(e.x + e.width / 2 - 3, e.y + 18, 6, 2);
    } else {
      // Puzzle guard
      ctx.fillStyle = "#8a6a4a";
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Eyes
      ctx.fillStyle = "#ffcc66";
      ctx.fillRect(e.x + e.width / 2 - 5, e.y + 10, 3, 3);
      ctx.fillRect(e.x + e.width / 2 + 2, e.y + 10, 3, 3);
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

  private drawRiddleBolt(bolt: RiddleBolt) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "#cc99ff";
    ctx.font = "bold 18px serif";
    ctx.shadowColor = "#cc99ff";
    ctx.shadowBlur = 15;
    ctx.fillText(bolt.symbol, bolt.x - 8, bolt.y + 8);
    ctx.restore();
  }

  private drawWisdomOrb(orb: WisdomOrb) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.rotate(orb.rotation);

    ctx.fillStyle = "rgba(204, 153, 255, 0.9)";
    ctx.shadowColor = "#cc99ff";
    ctx.shadowBlur = 18;

    // Triangle shape for wisdom
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-8, 8);
    ctx.lineTo(8, 8);
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

    ctx.strokeStyle = "#a47850";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Wisdom bar
    const wisdomY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, wisdomY, barWidth, barHeight);

    const wisdomPercent = p.wisdom / p.maxWisdom;
    ctx.fillStyle = "#cc99ff";
    ctx.fillRect(x, wisdomY, barWidth * wisdomPercent, barHeight);

    ctx.strokeStyle = "#9966ff";
    ctx.strokeRect(x, wisdomY, barWidth, barHeight);

    // Riddle power indicator
    if (p.riddlePower) {
      ctx.fillStyle = "#cc99ff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#cc99ff";
      ctx.shadowBlur = 10;
      ctx.fillText("RIDDLE POWER", x, wisdomY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
