/**
 * Pixel Survival Game Engine
 * Game #235 - Arcade survival shooter
 */

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  health: number;
  type: 'normal' | 'fast' | 'tank';
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

export interface Powerup {
  x: number;
  y: number;
  type: 'weapon' | 'shield' | 'speed';
  collected: boolean;
}

export class PixelSurvivalGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player = {
    x: 250,
    y: 200,
    size: 16,
    speed: 3,
    maxSpeed: 3,
    shielded: false,
    shieldTime: 0,
    weaponLevel: 0,
    weaponTime: 0,
  };

  private keys: Record<string, boolean> = {};
  private mousePos = { x: 0, y: 0 };
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private powerups: Powerup[] = [];

  private score = 0;
  private survivalTime = 0;
  private enemySpawnRate = 120; // frames
  private powerupSpawnRate = 300; // frames
  private lastEnemySpawn = 0;
  private lastPowerupSpawn = 0;
  private difficulty = 1;

  private status: "idle" | "playing" | "gameover" = "idle";
  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;
  private lastShotTime = 0;
  private shotCooldown = 15; // frames

  // Touch controls
  private touchStartPos = { x: 0, y: 0 };
  private isTouching = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    // Keyboard
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) * this.canvas.width) / rect.width;
      this.mousePos.y = ((e.clientY - rect.top) * this.canvas.height) / rect.height;
    });

    this.canvas.addEventListener("click", () => {
      if (this.status === "playing") {
        this.shoot();
      }
    });

    // Touch
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchStartPos.x = ((touch.clientX - rect.left) * this.canvas.width) / rect.width;
      this.touchStartPos.y = ((touch.clientY - rect.top) * this.canvas.height) / rect.height;
      this.isTouching = true;

      // Shoot at touch position
      this.mousePos.x = this.touchStartPos.x;
      this.mousePos.y = this.touchStartPos.y;
      this.shoot();
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.isTouching) return;

      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const currentX = ((touch.clientX - rect.left) * this.canvas.width) / rect.width;
      const currentY = ((touch.clientY - rect.top) * this.canvas.height) / rect.height;

      // Move player based on touch drag
      const dx = currentX - this.touchStartPos.x;
      const dy = currentY - this.touchStartPos.y;

      this.player.x += dx * 0.5;
      this.player.y += dy * 0.5;

      this.touchStartPos.x = currentX;
      this.touchStartPos.y = currentY;
      this.mousePos.x = currentX;
      this.mousePos.y = currentY;
    });

    this.canvas.addEventListener("touchend", () => {
      this.isTouching = false;
    });
  }

  public start() {
    this.reset();
    this.status = "playing";
    this.gameLoop();
  }

  private reset() {
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.player.speed = 3;
    this.player.maxSpeed = 3;
    this.player.shielded = false;
    this.player.shieldTime = 0;
    this.player.weaponLevel = 0;
    this.player.weaponTime = 0;

    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.score = 0;
    this.survivalTime = 0;
    this.difficulty = 1;
    this.frameCount = 0;
    this.lastEnemySpawn = 0;
    this.lastPowerupSpawn = 0;
    this.lastShotTime = 0;

    this.updateState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update survival time
    if (this.frameCount % 60 === 0) {
      this.survivalTime++;
      this.score += 10;
      this.updateState();

      // Increase difficulty every 30 seconds
      if (this.survivalTime % 30 === 0) {
        this.difficulty += 0.2;
      }
    }

    // Player movement
    let dx = 0;
    let dy = 0;

    if (this.keys["arrowleft"] || this.keys["a"]) dx -= 1;
    if (this.keys["arrowright"] || this.keys["d"]) dx += 1;
    if (this.keys["arrowup"] || this.keys["w"]) dy -= 1;
    if (this.keys["arrowdown"] || this.keys["s"]) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      this.player.x += dx * this.player.speed;
      this.player.y += dy * this.player.speed;
    }

    // Keep player in bounds
    this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
    this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));

    // Auto-shoot
    if (this.frameCount - this.lastShotTime > this.shotCooldown) {
      this.shoot();
    }

    // Update powerup timers
    if (this.player.shielded) {
      this.player.shieldTime--;
      if (this.player.shieldTime <= 0) {
        this.player.shielded = false;
      }
    }

    if (this.player.weaponLevel > 0) {
      this.player.weaponTime--;
      if (this.player.weaponTime <= 0) {
        this.player.weaponLevel = 0;
      }
    }

    // Spawn enemies
    if (this.frameCount - this.lastEnemySpawn > this.enemySpawnRate / this.difficulty) {
      this.spawnEnemy();
      this.lastEnemySpawn = this.frameCount;
    }

    // Spawn powerups
    if (this.frameCount - this.lastPowerupSpawn > this.powerupSpawnRate) {
      this.spawnPowerup();
      this.lastPowerupSpawn = this.frameCount;
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Move toward player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.vx = (dx / dist) * (enemy.type === 'fast' ? 2 : enemy.type === 'tank' ? 1 : 1.5) * this.difficulty;
        enemy.vy = (dy / dist) * (enemy.type === 'fast' ? 2 : enemy.type === 'tank' ? 1 : 1.5) * this.difficulty;
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // Check collision with player
      const playerDist = Math.sqrt(
        (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
      );

      if (playerDist < enemy.size + this.player.size) {
        if (this.player.shielded) {
          // Shield absorbs hit
          this.enemies.splice(i, 1);
          this.score += 50;
          this.updateState();
        } else {
          // Game over
          this.gameOver();
          return;
        }
      }

      // Remove if health depleted
      if (enemy.health <= 0) {
        this.enemies.splice(i, 1);
        this.score += enemy.type === 'tank' ? 30 : enemy.type === 'fast' ? 20 : 10;
        this.updateState();
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Remove if out of bounds
      if (
        bullet.x < 0 ||
        bullet.x > this.canvas.width ||
        bullet.y < 0 ||
        bullet.y > this.canvas.height
      ) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);

        if (dist < enemy.size) {
          enemy.health -= bullet.damage;
          this.bullets.splice(i, 1);
          break;
        }
      }
    }

    // Update powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];

      // Check collection
      const dist = Math.sqrt(
        (powerup.x - this.player.x) ** 2 + (powerup.y - this.player.y) ** 2
      );

      if (dist < 20 && !powerup.collected) {
        powerup.collected = true;
        this.collectPowerup(powerup.type);
        this.powerups.splice(i, 1);
      }
    }
  }

  private spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    switch (side) {
      case 0: // top
        x = Math.random() * this.canvas.width;
        y = -20;
        break;
      case 1: // right
        x = this.canvas.width + 20;
        y = Math.random() * this.canvas.height;
        break;
      case 2: // bottom
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + 20;
        break;
      case 3: // left
        x = -20;
        y = Math.random() * this.canvas.height;
        break;
    }

    const rand = Math.random();
    let type: Enemy['type'] = 'normal';
    let health = 1;
    let size = 12;

    if (rand < 0.1) {
      type = 'tank';
      health = 3;
      size = 16;
    } else if (rand < 0.3) {
      type = 'fast';
      health = 1;
      size = 10;
    }

    this.enemies.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size,
      health,
      type,
    });
  }

  private spawnPowerup() {
    const types: Powerup['type'][] = ['weapon', 'shield', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.powerups.push({
      x: Math.random() * (this.canvas.width - 40) + 20,
      y: Math.random() * (this.canvas.height - 40) + 20,
      type,
      collected: false,
    });
  }

  private collectPowerup(type: Powerup['type']) {
    switch (type) {
      case 'weapon':
        this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
        this.player.weaponTime = 600; // 10 seconds
        this.shotCooldown = Math.max(5, 15 - this.player.weaponLevel * 3);
        break;
      case 'shield':
        this.player.shielded = true;
        this.player.shieldTime = 300; // 5 seconds
        break;
      case 'speed':
        this.player.speed = 5;
        this.player.maxSpeed = 5;
        setTimeout(() => {
          this.player.speed = 3;
          this.player.maxSpeed = 3;
        }, 5000);
        break;
    }
    this.score += 100;
    this.updateState();
  }

  private shoot() {
    if (this.status !== "playing") return;

    const dx = this.mousePos.x - this.player.x;
    const dy = this.mousePos.y - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const speed = 8;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const damage = 1 + this.player.weaponLevel * 0.5;

    // Main bullet
    this.bullets.push({
      x: this.player.x,
      y: this.player.y,
      vx,
      vy,
      damage,
    });

    // Additional bullets for weapon level
    if (this.player.weaponLevel >= 2) {
      // Spread shot
      const angle = Math.atan2(dy, dx);
      const spread = Math.PI / 8;

      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        damage,
      });

      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle - spread) * speed,
        vy: Math.sin(angle - spread) * speed,
        damage,
      });
    }

    if (this.player.weaponLevel >= 3) {
      // Side shots
      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        vx: -vy * 0.3,
        vy: vx * 0.3,
        damage,
      });

      this.bullets.push({
        x: this.player.x,
        y: this.player.y,
        vx: vy * 0.3,
        vy: -vx * 0.3,
        damage,
      });
    }

    this.lastShotTime = this.frameCount;
  }

  private gameOver() {
    this.status = "gameover";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "gameover" });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: this.survivalTime,
        enemyCount: this.enemies.length,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - dark pixel gradient
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = "rgba(74, 222, 74, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw powerups
    for (const powerup of this.powerups) {
      this.drawPowerup(ctx, powerup);
    }

    // Draw bullets
    for (const bullet of this.bullets) {
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);

      // Glow effect
      ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
      ctx.fillRect(bullet.x - 3, bullet.y - 3, 6, 6);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(ctx, enemy);
    }

    // Draw player
    this.drawPlayer(ctx);

    // Draw aim line
    if (!this.isTouching) {
      ctx.strokeStyle = "rgba(74, 222, 74, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.mousePos.x, this.mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // UI
    this.drawUI(ctx);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    // Shield effect
    if (p.shielded) {
      const pulse = Math.sin(this.frameCount * 0.2) * 2 + 4;
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = "#4ade4a";
    ctx.fillRect(p.x - 6, p.y - 6, 12, 12);

    // Core
    ctx.fillStyle = "#2a8a2a";
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);

    // Eyes (facing mouse)
    const dx = this.mousePos.x - p.x;
    const dy = this.mousePos.y - p.y;
    const angle = Math.atan2(dy, dx);
    const eyeX = Math.cos(angle) * 2;
    const eyeY = Math.sin(angle) * 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(p.x + eyeX - 1, p.y + eyeY - 1, 2, 2);

    // Weapon indicator
    if (p.weaponLevel > 0) {
      ctx.fillStyle = "#ff0000";
      for (let i = 0; i < p.weaponLevel; i++) {
        ctx.fillRect(p.x - 8 + i * 4, p.y - 10, 3, 3);
      }
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    let color = "#ff4444";
    if (enemy.type === 'fast') color = "#ff8844";
    if (enemy.type === 'tank') color = "#8844ff";

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size + 2, enemy.size * 2, enemy.size * 2);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size, enemy.size * 2, enemy.size * 2);

    // Core
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);

    // Health bar
    if (enemy.health < (enemy.type === 'tank' ? 3 : 1)) {
      const maxHealth = enemy.type === 'tank' ? 3 : 1;
      const healthWidth = (enemy.size * 2) * (enemy.health / maxHealth);

      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size - 4, enemy.size * 2, 2);

      ctx.fillStyle = "#00ff00";
      ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size - 4, healthWidth, 2);
    }
  }

  private drawPowerup(ctx: CanvasRenderingContext2D, powerup: Powerup) {
    const bounce = Math.sin(this.frameCount * 0.1) * 2;
    const size = 12;

    let color = "#ffffff";
    let symbol = "";

    switch (powerup.type) {
      case 'weapon':
        color = "#ff0000";
        symbol = "W";
        break;
      case 'shield':
        color = "#00ffff";
        symbol = "S";
        break;
      case 'speed':
        color = "#ffff00";
        symbol = ">";
        break;
    }

    // Glow
    ctx.fillStyle = color + "33";
    ctx.fillRect(powerup.x - size - 2, powerup.y - size - 2 + bounce, (size + 2) * 2, (size + 2) * 2);

    // Box
    ctx.fillStyle = color;
    ctx.fillRect(powerup.x - size, powerup.y - size + bounce, size * 2, size * 2);

    // Inner
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(powerup.x - size / 2, powerup.y - size / 2 + bounce, size, size);

    // Symbol
    ctx.fillStyle = "#000";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, powerup.x, powerup.y + bounce);
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Timer and score in corners
    ctx.fillStyle = "#4ade4a";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";

    // Survival time
    const minutes = Math.floor(this.survivalTime / 60);
    const seconds = this.survivalTime % 60;
    ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, 10, 20);

    // Enemy count
    ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 40);

    // Powerup timers
    if (this.player.shielded) {
      const shieldSec = Math.ceil(this.player.shieldTime / 60);
      ctx.fillStyle = "#00ffff";
      ctx.fillText(`Shield: ${shieldSec}s`, 10, 60);
    }

    if (this.player.weaponLevel > 0) {
      const weaponSec = Math.ceil(this.player.weaponTime / 60);
      ctx.fillStyle = "#ff0000";
      ctx.fillText(`Weapon: ${weaponSec}s`, 10, 80);
    }
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.draw();
  }

  public getScore(): number {
    return this.score;
  }

  public getTime(): number {
    return this.survivalTime;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
