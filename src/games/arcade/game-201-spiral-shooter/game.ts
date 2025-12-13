/**
 * Spiral Shooter Game Engine
 * Game #201 - Rotate and shoot enemies
 */

export interface Enemy {
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  health: number;
  color: string;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class SpiralShooterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private centerX = 250;
  private centerY = 200;
  private playerAngle = 0;
  private playerRadius = 15;

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];

  private mouseX = 250;
  private mouseY = 200;

  private score = 0;
  private health = 100;
  private shootCooldown = 0;

  private currentWave = 0;
  private enemiesRemaining = 0;
  private waveSpawnTimer = 0;

  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;

  private waveConfigs = [
    { enemyCount: 8, speed: 1, health: 1, spawnRate: 60 },
    { enemyCount: 12, speed: 1.2, health: 1, spawnRate: 50 },
    { enemyCount: 15, speed: 1.3, health: 2, spawnRate: 45 },
    { enemyCount: 20, speed: 1.5, health: 2, spawnRate: 40 },
    { enemyCount: 25, speed: 1.7, health: 3, spawnRate: 35 },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("click", () => {
      if (this.status === "playing") {
        this.shoot();
      }
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.mouseX = (touch.clientX - rect.left) * scaleX;
      this.mouseY = (touch.clientY - rect.top) * scaleY;

      if (this.status === "playing") {
        this.shoot();
      }
    });
  }

  private shoot() {
    if (this.shootCooldown > 0) return;

    const angle = this.playerAngle;
    const speed = 8;

    this.bullets.push({
      x: this.centerX + Math.cos(angle) * 30,
      y: this.centerY + Math.sin(angle) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });

    this.shootCooldown = 10;
  }

  public start(wave?: number) {
    this.currentWave = wave ?? this.currentWave;
    this.loadWave(this.currentWave);
    this.status = "playing";
    this.gameLoop();
  }

  private loadWave(waveIndex: number) {
    const config = this.waveConfigs[waveIndex % this.waveConfigs.length];

    this.bullets = [];
    this.enemies = [];
    this.particles = [];

    this.score = 0;
    this.health = 100;
    this.enemiesRemaining = config.enemyCount;
    this.waveSpawnTimer = 0;

    this.updateState();
  }

  private spawnEnemy() {
    const config = this.waveConfigs[this.currentWave % this.waveConfigs.length];

    // Spawn from edge of screen
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) * 0.7;

    const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bcb"];

    this.enemies.push({
      x: this.centerX + Math.cos(angle) * distance,
      y: this.centerY + Math.sin(angle) * distance,
      angle: 0,
      speed: config.speed * (0.8 + Math.random() * 0.4),
      size: 15 + Math.random() * 10,
      health: config.health,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const config = this.waveConfigs[this.currentWave % this.waveConfigs.length];

    // Update player angle to face mouse
    this.playerAngle = Math.atan2(
      this.mouseY - this.centerY,
      this.mouseX - this.centerX
    );

    // Spawn enemies
    if (this.enemiesRemaining > 0) {
      this.waveSpawnTimer++;
      if (this.waveSpawnTimer >= config.spawnRate) {
        this.spawnEnemy();
        this.enemiesRemaining--;
        this.waveSpawnTimer = 0;
      }
    }

    // Update cooldown
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Remove if off screen
      if (
        bullet.x < -20 ||
        bullet.x > this.canvas.width + 20 ||
        bullet.y < -20 ||
        bullet.y > this.canvas.height + 20
      ) {
        this.bullets.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Move toward center with spiral
      const toCenter = Math.atan2(this.centerY - enemy.y, this.centerX - enemy.x);
      enemy.angle = toCenter + Math.sin(this.frameCount * 0.05) * 0.3;

      enemy.x += Math.cos(enemy.angle) * enemy.speed;
      enemy.y += Math.sin(enemy.angle) * enemy.speed;

      // Check collision with player
      const distToCenter = Math.hypot(enemy.x - this.centerX, enemy.y - this.centerY);
      if (distToCenter < this.playerRadius + enemy.size) {
        this.health -= 10;
        this.createParticles(enemy.x, enemy.y, enemy.color, 5);
        this.enemies.splice(i, 1);

        if (this.health <= 0) {
          this.lose();
          return;
        }
        continue;
      }

      // Check collision with bullets
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const bullet = this.bullets[j];
        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);

        if (dist < enemy.size) {
          enemy.health--;
          this.bullets.splice(j, 1);

          if (enemy.health <= 0) {
            this.score += 10;
            this.createParticles(enemy.x, enemy.y, enemy.color, 10);
            this.enemies.splice(i, 1);
          } else {
            this.createParticles(bullet.x, bullet.y, "#fff", 3);
          }

          this.updateState();
          break;
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Check wave complete
    if (this.enemiesRemaining === 0 && this.enemies.length === 0) {
      this.win();
    }
  }

  private createParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }

  private win() {
    this.status = "won";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "won" });
    }
  }

  private lose() {
    this.status = "lost";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "lost" });
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
        health: this.health,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    // Spiral background effect
    this.drawSpiralBackground(ctx);

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw bullets
    for (const bullet of this.bullets) {
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Bullet trail
      ctx.fillStyle = "rgba(255, 235, 59, 0.3)";
      ctx.beginPath();
      ctx.arc(bullet.x - bullet.vx, bullet.y - bullet.vy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(ctx, enemy);
    }

    // Draw player
    this.drawPlayer(ctx);

    // Draw UI
    this.drawUI(ctx);
  }

  private drawSpiralBackground(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "rgba(100, 100, 150, 0.1)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 8; angle += 0.1) {
        const r = angle * 15 + i * 30;
        const x = this.centerX + Math.cos(angle + this.frameCount * 0.01) * r;
        const y = this.centerY + Math.sin(angle + this.frameCount * 0.01) * r;
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    // Enemy body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    const gradient = ctx.createRadialGradient(
      enemy.x, enemy.y, 0,
      enemy.x, enemy.y, enemy.size
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();

    // Health indicator
    if (enemy.health > 1) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(enemy.health.toString(), enemy.x, enemy.y + 4);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    // Player base
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.playerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Rotating cannon
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.playerAngle);

    ctx.fillStyle = "#81c784";
    ctx.fillRect(10, -4, 20, 8);

    // Cannon tip
    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath();
    ctx.arc(30, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Center glow
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.playerRadius + 10
    );
    gradient.addColorStop(0, "rgba(76, 175, 80, 0.5)");
    gradient.addColorStop(1, "rgba(76, 175, 80, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.playerRadius + 10, 0, Math.PI * 2);
    ctx.fill();

    // Aim line
    ctx.strokeStyle = "rgba(255, 235, 59, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(
      this.centerX + Math.cos(this.playerAngle) * 35,
      this.centerY + Math.sin(this.playerAngle) * 35
    );
    ctx.lineTo(
      this.centerX + Math.cos(this.playerAngle) * 100,
      this.centerY + Math.sin(this.playerAngle) * 100
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Health bar
    const barWidth = 150;
    const barHeight = 12;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = this.health > 30 ? "#4caf50" : "#f44336";
    ctx.fillRect(x, y, (barWidth * this.health) / 100, barHeight);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`HP ${this.health}%`, x + barWidth / 2, y + 10);

    // Score
    ctx.textAlign = "right";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Score: ${this.score}`, this.canvas.width - 20, 28);

    // Enemies remaining
    const remaining = this.enemiesRemaining + this.enemies.length;
    ctx.fillText(`Enemies: ${remaining}`, this.canvas.width - 20, 50);
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.draw();
  }

  public reset() {
    this.loadWave(this.currentWave);
    this.status = "playing";
    this.gameLoop();
  }

  public nextLevel() {
    this.currentWave++;
    this.start(this.currentWave);
  }

  public hasMoreLevels(): boolean {
    return this.currentWave < this.waveConfigs.length - 1;
  }

  public getLevel(): number {
    return this.currentWave + 1;
  }

  public getScore(): number {
    return this.score;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
