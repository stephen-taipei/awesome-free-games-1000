/**
 * Endless Mode Game Engine
 * Game #269
 *
 * Survive endless waves of enemies!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  invincible: boolean;
  invincibleTimer: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isEnemy: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: "basic" | "fast" | "tank" | "shooter";
  hp: number;
  maxHp: number;
  shootTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameState {
  score: number;
  wave: number;
  lives: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class EndlessGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private wave = 1;
  private lives = 3;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { up: false, down: false, left: false, right: false, fire: false };
  private lastShotTime = 0;
  private shotCooldown = 150;
  private enemiesRemaining = 0;
  private waveDelay = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 0,
      y: 0,
      width: 30,
      height: 30,
      speed: 5,
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
        wave: this.wave,
        lives: this.lives,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.draw();
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.status = "playing";
    this.spawnWave();
    this.emitState();
    this.gameLoop();
  }

  setKey(key: keyof typeof this.keys, value: boolean) {
    this.keys[key] = value;
  }

  private spawnWave() {
    const enemyCount = 3 + this.wave * 2;
    this.enemiesRemaining = enemyCount;

    for (let i = 0; i < enemyCount; i++) {
      setTimeout(() => {
        if (this.status === "playing") {
          this.spawnEnemy();
        }
      }, i * 300);
    }
  }

  private spawnEnemy() {
    const types: Enemy["type"][] = ["basic", "fast", "tank", "shooter"];
    const weights = [40, 25, 20, 15];
    let type: Enemy["type"] = "basic";

    // Random weighted selection based on wave
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0 || this.wave < i + 1) {
        type = types[Math.min(i, Math.min(this.wave - 1, types.length - 1))];
        break;
      }
    }

    // Spawn from edges
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const margin = 50;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.canvas.width;
        y = -margin;
        break;
      case 1: // Right
        x = this.canvas.width + margin;
        y = Math.random() * this.canvas.height;
        break;
      case 2: // Bottom
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + margin;
        break;
      case 3: // Left
        x = -margin;
        y = Math.random() * this.canvas.height;
        break;
    }

    const stats = this.getEnemyStats(type);
    this.enemies.push({
      x,
      y,
      width: stats.size,
      height: stats.size,
      vx: 0,
      vy: 0,
      type,
      hp: stats.hp,
      maxHp: stats.hp,
      shootTimer: 0,
    });
  }

  private getEnemyStats(type: Enemy["type"]) {
    switch (type) {
      case "basic":
        return { size: 25, hp: 1, speed: 2, color: "#e74c3c" };
      case "fast":
        return { size: 20, hp: 1, speed: 4, color: "#f39c12" };
      case "tank":
        return { size: 35, hp: 3, speed: 1, color: "#9b59b6" };
      case "shooter":
        return { size: 28, hp: 2, speed: 1.5, color: "#3498db" };
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const now = Date.now();

    // Player movement
    if (this.keys.left) this.player.x -= this.player.speed;
    if (this.keys.right) this.player.x += this.player.speed;
    if (this.keys.up) this.player.y -= this.player.speed;
    if (this.keys.down) this.player.y += this.player.speed;

    // Clamp player position
    this.player.x = Math.max(
      this.player.width / 2,
      Math.min(this.canvas.width - this.player.width / 2, this.player.x)
    );
    this.player.y = Math.max(
      this.player.height / 2,
      Math.min(this.canvas.height - this.player.height / 2, this.player.y)
    );

    // Player shooting
    if (this.keys.fire && now - this.lastShotTime > this.shotCooldown) {
      this.shoot();
      this.lastShotTime = now;
    }

    // Update invincibility
    if (this.player.invincible) {
      this.player.invincibleTimer--;
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
      }
    }

    // Update bullets
    this.updateBullets();

    // Update enemies
    this.updateEnemies();

    // Update particles
    this.updateParticles();

    // Check wave completion
    if (this.enemies.length === 0 && this.enemiesRemaining <= 0) {
      if (this.waveDelay <= 0) {
        this.wave++;
        this.score += this.wave * 100;
        this.waveDelay = 60;
        this.emitState();
      } else {
        this.waveDelay--;
        if (this.waveDelay === 0) {
          this.spawnWave();
        }
      }
    }
  }

  private shoot() {
    // Find nearest enemy for auto-aim
    let targetX = this.player.x;
    let targetY = this.player.y - 100;

    if (this.enemies.length > 0) {
      let nearestDist = Infinity;
      for (const enemy of this.enemies) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          targetX = enemy.x;
          targetY = enemy.y;
        }
      }
    }

    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 10;

    this.bullets.push({
      x: this.player.x,
      y: this.player.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 5,
      isEnemy: false,
    });
  }

  private updateBullets() {
    const toRemove: number[] = [];

    for (let i = 0; i < this.bullets.length; i++) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Out of bounds
      if (
        bullet.x < -20 ||
        bullet.x > this.canvas.width + 20 ||
        bullet.y < -20 ||
        bullet.y > this.canvas.height + 20
      ) {
        toRemove.push(i);
        continue;
      }

      if (bullet.isEnemy) {
        // Check player collision
        if (!this.player.invincible && this.checkCollision(bullet, this.player)) {
          this.hitPlayer();
          toRemove.push(i);
        }
      } else {
        // Check enemy collision
        for (let j = 0; j < this.enemies.length; j++) {
          const enemy = this.enemies[j];
          if (this.checkCollision(bullet, enemy)) {
            enemy.hp--;
            this.spawnParticles(bullet.x, bullet.y, "#00d4ff", 5);
            toRemove.push(i);

            if (enemy.hp <= 0) {
              this.killEnemy(j);
            }
            break;
          }
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.bullets.splice(toRemove[i], 1);
    }
  }

  private updateEnemies() {
    for (const enemy of this.enemies) {
      const stats = this.getEnemyStats(enemy.type);

      // Move towards player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.vx = (dx / dist) * stats.speed;
        enemy.vy = (dy / dist) * stats.speed;
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // Shooter enemy
      if (enemy.type === "shooter") {
        enemy.shootTimer++;
        if (enemy.shootTimer >= 120) {
          enemy.shootTimer = 0;
          this.enemyShoot(enemy);
        }
      }

      // Check player collision
      if (!this.player.invincible && this.checkCollision(enemy, this.player)) {
        this.hitPlayer();
      }
    }
  }

  private enemyShoot(enemy: Enemy) {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 4;

    this.bullets.push({
      x: enemy.x,
      y: enemy.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 6,
      isEnemy: true,
    });
  }

  private checkCollision(
    a: { x: number; y: number; radius?: number; width?: number; height?: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    const aRadius = a.radius || (a.width! / 2);
    const bRadius = b.width / 2;

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < aRadius + bRadius;
  }

  private hitPlayer() {
    this.lives--;
    this.player.invincible = true;
    this.player.invincibleTimer = 90;
    this.spawnParticles(this.player.x, this.player.y, "#ff6464", 20);
    this.emitState();

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  private killEnemy(index: number) {
    const enemy = this.enemies[index];
    this.score += (this.getEnemyStats(enemy.type).hp + 1) * 10;
    this.spawnParticles(enemy.x, enemy.y, this.getEnemyStats(enemy.type).color, 15);
    this.enemies.splice(index, 1);
    this.enemiesRemaining--;
    this.emitState();
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % w;
      const y = (i * 47) % h;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw bullets
    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.isEnemy ? "#ff6464" : "#00d4ff";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();

      // Glow effect
      ctx.shadowColor = bullet.isEnemy ? "#ff6464" : "#00d4ff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw player
    this.drawPlayer();

    // Wave indicator
    if (this.waveDelay > 0) {
      ctx.fillStyle = "rgba(0, 212, 255, 0.8)";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`WAVE ${this.wave}`, w / 2, h / 2);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const { x, y, width, height, invincible } = this.player;

    if (invincible && Math.floor(this.player.invincibleTimer / 5) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Ship body
    ctx.fillStyle = "#00d4ff";
    ctx.beginPath();
    ctx.moveTo(x, y - height / 2);
    ctx.lineTo(x - width / 2, y + height / 2);
    ctx.lineTo(x + width / 2, y + height / 2);
    ctx.closePath();
    ctx.fill();

    // Glow
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cockpit
    ctx.fillStyle = "#0a0a15";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private drawEnemy(enemy: Enemy) {
    const ctx = this.ctx;
    const stats = this.getEnemyStats(enemy.type);

    // Enemy body
    ctx.fillStyle = stats.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Health bar for tanks
    if (enemy.type === "tank" || enemy.type === "shooter") {
      const barWidth = enemy.width;
      const barHeight = 4;
      const hpPercent = enemy.hp / enemy.maxHp;

      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10, barWidth, barHeight);
      ctx.fillStyle = "#00ff88";
      ctx.fillRect(
        enemy.x - barWidth / 2,
        enemy.y - enemy.height / 2 - 10,
        barWidth * hpPercent,
        barHeight
      );
    }

    // Type indicator
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.font = `${enemy.width * 0.6}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const emoji =
      enemy.type === "basic" ? "👾" :
      enemy.type === "fast" ? "⚡" :
      enemy.type === "tank" ? "🛡️" : "🔫";
    ctx.fillText(emoji, enemy.x, enemy.y);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
