/**
 * Pirate Adventure Game Engine
 * Game #274
 *
 * Navigate the seas, collect gold, defeat enemies!
 */

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facing: "left" | "right";
  attacking: boolean;
  attackTimer: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "wood" | "stone";
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  type: "skeleton" | "crab";
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

interface Treasure {
  x: number;
  y: number;
  collected: boolean;
}

interface GameState {
  gold: number;
  health: number;
  level: number;
  status: "idle" | "playing" | "over" | "clear";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 20;

export class PirateGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private coins: Coin[] = [];
  private treasure: Treasure | null = null;
  private gold = 0;
  private health = 100;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private cameraX = 0;
  private levelWidth = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 100,
      vx: 0,
      vy: 0,
      width: 40,
      height: 50,
      onGround: false,
      facing: "right",
      attacking: false,
      attackTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        gold: this.gold,
        health: this.health,
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

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  jump() {
    if (this.player.onGround) {
      this.player.vy = JUMP_FORCE;
      this.player.onGround = false;
    }
  }

  attack() {
    if (!this.player.attacking) {
      this.player.attacking = true;
      this.player.attackTimer = ATTACK_DURATION;
    }
  }

  start() {
    this.gold = 0;
    this.health = 100;
    this.level = 1;
    this.status = "playing";
    this.keys.clear();
    this.generateLevel();
    this.emitState();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    this.generateLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private generateLevel() {
    this.platforms = [];
    this.enemies = [];
    this.coins = [];
    this.treasure = null;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = 800 + this.level * 400;

    // Ground platform
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
      type: "stone",
    });

    // Generate platforms
    const numPlatforms = 5 + this.level * 2;
    for (let i = 0; i < numPlatforms; i++) {
      const x = 150 + i * (this.levelWidth / numPlatforms);
      const y = h - 100 - Math.random() * 150;
      this.platforms.push({
        x,
        y,
        width: 80 + Math.random() * 60,
        height: 20,
        type: Math.random() > 0.5 ? "wood" : "stone",
      });
    }

    // Generate coins
    const numCoins = 10 + this.level * 3;
    for (let i = 0; i < numCoins; i++) {
      this.coins.push({
        x: 100 + Math.random() * (this.levelWidth - 200),
        y: h - 80 - Math.random() * 200,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }

    // Generate enemies
    const numEnemies = 3 + this.level * 2;
    for (let i = 0; i < numEnemies; i++) {
      this.enemies.push({
        x: 200 + i * (this.levelWidth / numEnemies),
        y: h - 80,
        width: 35,
        height: 40,
        vx: (Math.random() > 0.5 ? 1 : -1) * (1 + this.level * 0.3),
        health: 1 + Math.floor(this.level / 3),
        type: Math.random() > 0.5 ? "skeleton" : "crab",
      });
    }

    // Treasure at the end
    this.treasure = {
      x: this.levelWidth - 80,
      y: h - 100,
      collected: false,
    };

    // Reset player
    this.player = this.createPlayer();
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
    this.updateCoins();
    this.checkTreasure();
    this.updateCamera();

    if (this.health <= 0) {
      this.gameOver();
    }

    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Horizontal movement
    p.vx = 0;
    if (this.keys.has("left")) {
      p.vx = -MOVE_SPEED;
      p.facing = "left";
    }
    if (this.keys.has("right")) {
      p.vx = MOVE_SPEED;
      p.facing = "right";
    }

    // Apply gravity
    p.vy += GRAVITY;

    // Move
    p.x += p.vx;
    p.y += p.vy;

    // Platform collision
    p.onGround = false;
    for (const plat of this.platforms) {
      if (this.checkCollision(p, plat)) {
        // Landing on top
        if (p.vy > 0 && p.y + p.height - p.vy <= plat.y) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.onGround = true;
        }
        // Hitting from below
        else if (p.vy < 0 && p.y - p.vy >= plat.y + plat.height) {
          p.y = plat.y + plat.height;
          p.vy = 0;
        }
      }
    }

    // Bounds
    if (p.x < 0) p.x = 0;
    if (p.x > this.levelWidth - p.width) p.x = this.levelWidth - p.width;

    // Fall off screen
    if (p.y > this.canvas.height) {
      this.health -= 30;
      p.x = 50;
      p.y = 100;
      p.vy = 0;
    }

    // Attack timer
    if (p.attacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.attacking = false;
      }
    }

    // Attack enemies
    if (p.attacking) {
      const attackRange = {
        x: p.facing === "right" ? p.x + p.width : p.x - 40,
        y: p.y,
        width: 40,
        height: p.height,
      };

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (this.checkCollision(attackRange, e)) {
          e.health--;
          if (e.health <= 0) {
            this.enemies.splice(i, 1);
            this.gold += 5;
          }
        }
      }
    }
  }

  private updateEnemies() {
    const h = this.canvas.height;

    for (const e of this.enemies) {
      e.x += e.vx;

      // Reverse at edges
      if (e.x < 50 || e.x > this.levelWidth - 50) {
        e.vx *= -1;
      }

      // Check collision with player
      if (!this.player.attacking && this.checkCollision(this.player, e)) {
        this.health -= 10;
        // Knockback
        this.player.vx = e.x > this.player.x ? -8 : 8;
        this.player.vy = -5;
      }
    }
  }

  private updateCoins() {
    for (const coin of this.coins) {
      if (coin.collected) continue;

      const coinBox = { x: coin.x - 15, y: coin.y - 15, width: 30, height: 30 };
      if (this.checkCollision(this.player, coinBox)) {
        coin.collected = true;
        this.gold += 1;
      }
    }
  }

  private checkTreasure() {
    if (!this.treasure || this.treasure.collected) return;

    const tBox = {
      x: this.treasure.x - 25,
      y: this.treasure.y - 25,
      width: 50,
      height: 50,
    };

    if (this.checkCollision(this.player, tBox)) {
      this.treasure.collected = true;
      this.gold += 50;
      this.levelClear();
    }
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 2;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.cameraX, this.levelWidth - this.canvas.width));
  }

  private checkCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private levelClear() {
    this.status = "clear";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
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

    // Sky background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(0.6, "#4a90d9");
    gradient.addColorStop(1, "#2e6bb5");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 200 - this.cameraX * 0.2) % (w + 100)) - 50;
      const cy = 40 + i * 30;
      this.drawCloud(cx, cy);
    }

    // Water waves at bottom
    ctx.fillStyle = "#1e5799";
    ctx.fillRect(0, h - 40, w, 40);

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        this.drawCoin(coin);
      }
    }

    // Draw treasure
    if (this.treasure && !this.treasure.collected) {
      this.drawTreasure(this.treasure);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw player
    this.drawPlayer();

    ctx.restore();
  }

  private drawCloud(x: number, y: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 30, y - 10, 30, 0, Math.PI * 2);
    ctx.arc(x + 60, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 10, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.type === "wood") {
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = "#5c3317";
      ctx.lineWidth = 2;
      for (let i = 0; i < plat.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(plat.x + i, plat.y);
        ctx.lineTo(plat.x + i, plat.y + plat.height);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#696969";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#808080";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    }
  }

  private drawCoin(coin: Coin) {
    const ctx = this.ctx;
    const bob = Math.sin(Date.now() / 200 + coin.bobOffset) * 3;

    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffec8b";
    ctx.beginPath();
    ctx.arc(coin.x - 3, coin.y + bob - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTreasure(t: Treasure) {
    const ctx = this.ctx;

    // Chest body
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(t.x - 25, t.y, 50, 35);

    // Chest lid
    ctx.fillStyle = "#a0522d";
    ctx.beginPath();
    ctx.ellipse(t.x, t.y, 25, 15, 0, Math.PI, 0);
    ctx.fill();

    // Gold trim
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(t.x - 25, t.y + 15, 50, 5);

    // Lock
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(t.x, t.y + 17, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.type === "skeleton") {
      // Skeleton body
      ctx.fillStyle = "#f5f5dc";
      ctx.fillRect(e.x, e.y, e.width, e.height);

      // Skull
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 10, 12, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2 - 4, e.y + 8, 3, 0, Math.PI * 2);
      ctx.arc(e.x + e.width / 2 + 4, e.y + 8, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Crab body
      ctx.fillStyle = "#ff6347";
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Claws
      ctx.beginPath();
      ctx.arc(e.x - 5, e.y + e.height / 2, 10, 0, Math.PI * 2);
      ctx.arc(e.x + e.width + 5, e.y + e.height / 2, 10, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2 - 8, e.y + 10, 4, 0, Math.PI * 2);
      ctx.arc(e.x + e.width / 2 + 8, e.y + 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    // Body
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(p.x, p.y + 15, p.width, p.height - 15);

    // Head
    ctx.fillStyle = "#f5cba7";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Pirate hat
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(p.x + p.width / 2, p.y + 5, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(p.x + p.width / 2 - 10, p.y - 8, 20, 12);

    // Skull on hat
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y - 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Sword
    if (p.attacking) {
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      if (p.facing === "left") ctx.scale(-1, 1);

      const angle = ((ATTACK_DURATION - p.attackTimer) / ATTACK_DURATION) * Math.PI - Math.PI / 2;
      ctx.rotate(angle);

      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(0, -3, 45, 6);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-5, -5, 10, 10);

      ctx.restore();
    } else {
      // Sword at rest
      ctx.fillStyle = "#c0c0c0";
      const sx = p.facing === "right" ? p.x + p.width - 5 : p.x - 25;
      ctx.fillRect(sx, p.y + 25, 30, 4);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(p.facing === "right" ? p.x + p.width - 8 : p.x - 3, p.y + 22, 8, 10);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
