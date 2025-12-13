/**
 * Kraken Hunter Game Engine
 * Game #343
 *
 * Ocean-themed action - fight sea monsters with harpoons!
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
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  underwaterMode: boolean;
  underwaterTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: "shark" | "octopus" | "sea-serpent";
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

interface Harpoon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  stuck: boolean;
}

interface WaterBubble {
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

const GRAVITY = 0.5;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const UNDERWATER_SPEED = 3.5;
const ATTACK_DURATION = 25;

export class KrakenHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private harpoons: Harpoon[] = [];
  private waterBubbles: WaterBubble[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
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
      width: 36,
      height: 50,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 60,
      maxEnergy: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      underwaterMode: false,
      underwaterTimer: 0,
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
    this.enemies = [];
    this.platforms = [];
    this.harpoons = [];
    this.waterBubbles = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.energy = 60;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    // Ocean floor
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    // Coral platforms
    const platformCount = 9 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 130 + i * 170 + Math.random() * 70,
        y: h - 90 - Math.random() * 170,
        width: 75 + Math.random() * 60,
        height: 18,
      });
    }

    // Sea monster enemies
    const enemyCount = 6 + this.level * 2;
    const types: Enemy["type"][] = ["shark", "octopus", "sea-serpent"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 300 + i * 220 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 100 - Math.random() * 120,
        width: type === "sea-serpent" ? 42 : type === "octopus" ? 38 : 36,
        height: type === "sea-serpent" ? 54 : type === "octopus" ? 48 : 44,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        vy: Math.random() > 0.5 ? 0.5 : -0.5,
        type,
        health: type === "sea-serpent" ? 7 : type === "octopus" ? 5 : 4,
        maxHealth: type === "sea-serpent" ? 7 : type === "octopus" ? 5 : 4,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 130,
        patrolRight: x + 130,
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
    this.updateHarpoons();
    this.updateWaterBubbles();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Energy regeneration
    this.energyRegenTimer++;
    if (this.energyRegenTimer >= 22) {
      this.energyRegenTimer = 0;
      p.energy = Math.min(p.maxEnergy, p.energy + 1.2);
    }

    // Underwater mode timer
    if (p.underwaterMode) {
      p.underwaterTimer--;
      if (p.underwaterTimer <= 0) {
        p.underwaterMode = false;
      }
      // Spawn bubbles
      if (p.underwaterTimer % 5 === 0) {
        this.spawnBubble();
      }
    }

    // Horizontal movement
    const speed = p.underwaterMode ? UNDERWATER_SPEED : MOVE_SPEED;
    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump/Swim
    if (this.keys.jump) {
      if (!p.isJumping || p.underwaterMode) {
        p.vy = p.underwaterMode ? JUMP_FORCE * 0.7 : JUMP_FORCE;
        p.isJumping = true;
      }
    }

    // Harpoon attack
    if (this.keys.attack && !p.isAttacking && p.energy >= 15) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.energy -= 15;
      this.shootHarpoon();
    }

    // Special: Underwater mode (swim freely, slower gravity)
    if (this.keys.special && p.energy >= 35 && !p.underwaterMode) {
      p.energy -= 35;
      p.underwaterMode = true;
      p.underwaterTimer = 180;
      this.spawnBubbleBurst();
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

    // Apply gravity (reduced underwater)
    const gravity = p.underwaterMode ? GRAVITY * 0.4 : GRAVITY;
    p.vy += gravity;
    p.vy = Math.min(p.vy, 10);

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
    p.y = Math.max(0, p.y);

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

  private shootHarpoon() {
    const p = this.player;
    const speed = 14;
    const offsetX = p.facing === "right" ? p.width : 0;

    this.harpoons.push({
      x: p.x + offsetX,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? speed : -speed,
      vy: 0,
      length: 25,
      life: 100,
      stuck: false,
    });
  }

  private spawnBubble() {
    const p = this.player;
    this.waterBubbles.push({
      x: p.x + p.width / 2 + (Math.random() - 0.5) * 20,
      y: p.y + p.height,
      vx: (Math.random() - 0.5) * 1,
      vy: -1 - Math.random() * 1.5,
      size: 3 + Math.random() * 5,
      life: 60,
    });
  }

  private spawnBubbleBurst() {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.waterBubbles.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 6,
        life: 50,
      });
    }
  }

  private updateHarpoons() {
    for (let i = this.harpoons.length - 1; i >= 0; i--) {
      const harpoon = this.harpoons[i];

      if (!harpoon.stuck) {
        harpoon.x += harpoon.vx;
        harpoon.y += harpoon.vy;
      }

      harpoon.life--;

      if (harpoon.life <= 0) {
        this.harpoons.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkHarpoonHit(harpoon, e)) {
          e.health -= 3;
          harpoon.stuck = true;
          harpoon.life = Math.min(harpoon.life, 20);
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 5);
          if (e.health <= 0) {
            this.score += e.type === "sea-serpent" ? 80 : e.type === "octopus" ? 65 : 50;
            this.enemies.splice(j, 1);
            this.harpoons.splice(i, 1);
          }
          break;
        }
      }
    }
  }

  private checkHarpoonHit(harpoon: Harpoon, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      harpoon.x > target.x &&
      harpoon.x < target.x + target.width &&
      harpoon.y > target.y &&
      harpoon.y < target.y + target.height
    );
  }

  private updateWaterBubbles() {
    for (let i = this.waterBubbles.length - 1; i >= 0; i--) {
      const bubble = this.waterBubbles[i];
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;
      bubble.life--;

      // Bubbles rise
      bubble.vy -= 0.05;

      if (bubble.life <= 0 || bubble.y < -10) {
        this.waterBubbles.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Patrol movement (swimming)
      e.x += e.vx;
      e.y += e.vy;

      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx = -e.vx;
      }

      // Vertical bobbing
      if (Math.random() < 0.02) {
        e.vy = -e.vy;
      }

      e.facing = e.vx < 0 ? "left" : "right";

      // Keep in bounds
      const h = this.canvas.height;
      if (e.y < 50) e.vy = Math.abs(e.vy);
      if (e.y > h - 60) e.vy = -Math.abs(e.vy);

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "sea-serpent" ? 28 : e.type === "octopus" ? 22 : 18;
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
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 12);

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

    // Background - ocean depths
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a4d6d");
    gradient.addColorStop(0.5, "#2a6d8d");
    gradient.addColorStop(1, "#0d3d5d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Water rays
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const x = (i * w) / 4 + Math.sin(Date.now() / 1000 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 50, h);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms (coral reefs)
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw water bubbles
    for (const bubble of this.waterBubbles) {
      this.drawWaterBubble(bubble);
    }

    // Draw harpoons
    for (const harpoon of this.harpoons) {
      this.drawHarpoon(harpoon);
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
      // Ocean floor
      ctx.fillStyle = "#2a5a4a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a6a5a";
      ctx.fillRect(plat.x, plat.y, plat.width, 6);
    } else {
      // Coral platforms
      ctx.fillStyle = "#ff6b9d";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#ff8bb0";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
      // Coral texture
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#ff5588";
        ctx.beginPath();
        ctx.arc(plat.x + (i + 1) * (plat.width / 4), plat.y + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Underwater aura
    if (p.underwaterMode) {
      ctx.fillStyle = "rgba(100, 200, 255, 0.2)";
      ctx.shadowColor = "#64c8ff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Diver body
    ctx.fillStyle = "#1a5a7a";
    ctx.fillRect(p.x + 6, p.y + 16, p.width - 12, p.height - 16);

    // Diving helmet
    ctx.fillStyle = "#c8b273";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 12, 13, 0, Math.PI * 2);
    ctx.fill();

    // Helmet glass
    ctx.fillStyle = "rgba(100, 200, 255, 0.5)";
    ctx.fillRect(p.x + p.width / 2 - 8, p.y + 8, 16, 10);

    // Eyes visible through glass
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(p.x + p.width / 2 - 6, p.y + 11, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 3, p.y + 11, 3, 3);

    // Air tank
    ctx.fillStyle = "#4a4a4a";
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 20, 10, 18);
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(p.x + p.width / 2 - 4, p.y + 21, 8, 2);

    // Flippers
    ctx.fillStyle = "#2a8aaa";
    const flipperMove = Math.sin(Date.now() / 100) * 3;
    ctx.fillRect(p.x + 2, p.y + p.height - 5, 12, 5 + flipperMove);
    ctx.fillRect(p.x + p.width - 14, p.y + p.height - 5, 12, 5 - flipperMove);

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      shark: "#5a6a7a",
      octopus: "#8a5a7a",
      "sea-serpent": "#2a6a4a",
    };

    ctx.fillStyle = colors[e.type];

    if (e.type === "shark") {
      // Shark shape
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.height / 2);
      ctx.lineTo(e.x + e.width, e.y + e.height / 2 - 10);
      ctx.lineTo(e.x + e.width, e.y + e.height / 2 + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(e.x, e.y + 10, e.width - 10, e.height - 20);

      // Dorsal fin
      ctx.beginPath();
      ctx.moveTo(e.x + e.width / 2, e.y + 10);
      ctx.lineTo(e.x + e.width / 2 - 5, e.y);
      ctx.lineTo(e.x + e.width / 2 + 5, e.y + 10);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "octopus") {
      // Octopus head
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 15, 15, 0, Math.PI * 2);
      ctx.fill();

      // Tentacles
      for (let i = 0; i < 4; i++) {
        const tentacleX = e.x + (i + 1) * (e.width / 5);
        ctx.beginPath();
        ctx.moveTo(tentacleX, e.y + 25);
        ctx.quadraticCurveTo(
          tentacleX + Math.sin(Date.now() / 200 + i) * 5,
          e.y + 35,
          tentacleX,
          e.y + e.height
        );
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors[e.type];
        ctx.stroke();
      }
    } else {
      // Sea serpent - long body
      ctx.fillRect(e.x, e.y + 10, e.width, e.height - 20);
      // Head
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 8, 12, 0, Math.PI * 2);
      ctx.fill();
      // Spikes
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x + 10 + i * 10, e.y + 10);
        ctx.lineTo(e.x + 7 + i * 10, e.y + 3);
        ctx.lineTo(e.x + 13 + i * 10, e.y + 10);
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

  private drawHarpoon(harpoon: Harpoon) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#8a8a8a";
    ctx.lineWidth = 3;

    // Harpoon shaft
    const endX = harpoon.x - (harpoon.vx > 0 ? harpoon.length : -harpoon.length);
    ctx.beginPath();
    ctx.moveTo(harpoon.x, harpoon.y);
    ctx.lineTo(endX, harpoon.y);
    ctx.stroke();

    // Harpoon tip
    ctx.fillStyle = "#aaaaaa";
    ctx.beginPath();
    if (harpoon.vx > 0) {
      ctx.moveTo(harpoon.x, harpoon.y);
      ctx.lineTo(harpoon.x + 8, harpoon.y - 4);
      ctx.lineTo(harpoon.x + 8, harpoon.y + 4);
    } else {
      ctx.moveTo(harpoon.x, harpoon.y);
      ctx.lineTo(harpoon.x - 8, harpoon.y - 4);
      ctx.lineTo(harpoon.x - 8, harpoon.y + 4);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawWaterBubble(bubble: WaterBubble) {
    const ctx = this.ctx;

    ctx.save();
    const alpha = Math.min(1, bubble.life / 30);
    ctx.fillStyle = `rgba(200, 230, 255, ${alpha * 0.5})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bubble highlight
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(bubble.x - bubble.size / 3, bubble.y - bubble.size / 3, bubble.size / 3, 0, Math.PI * 2);
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

    ctx.strokeStyle = "#1a5a7a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Energy bar
    const energyY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, energyY, barWidth, barHeight);

    const energyPercent = p.energy / p.maxEnergy;
    ctx.fillStyle = "#64c8ff";
    ctx.fillRect(x, energyY, barWidth * energyPercent, barHeight);

    ctx.strokeStyle = "#2a8aaa";
    ctx.strokeRect(x, energyY, barWidth, barHeight);

    // Underwater mode indicator
    if (p.underwaterMode) {
      ctx.fillStyle = "#64c8ff";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#64c8ff";
      ctx.shadowBlur = 10;
      ctx.fillText("DEEP DIVE!", x, energyY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
