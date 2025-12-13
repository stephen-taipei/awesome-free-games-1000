/**
 * Gravity Warrior Game
 * Game #319 - Control gravity to defeat enemies
 */

interface Position {
  x: number;
  y: number;
}

interface Player extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  type: "basic" | "heavy" | "flying";
  grounded: boolean;
}

interface Platform extends Position {
  width: number;
  height: number;
}

type GravityDirection = "down" | "up" | "left" | "right";

interface GameState {
  score: number;
  health: number;
  wave: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class GravityWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  private player: Player = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    vx: 0,
    vy: 0,
  };

  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  private score = 0;
  private health = 100;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private gravity: GravityDirection = "down";
  private gravityStrength = 500;
  private gravityCooldown = 0;
  private gravityAngle = 0;
  private targetGravityAngle = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const cycleGravity = () => {
      if (this.status !== "playing") return;
      if (this.gravityCooldown > 0) return;

      const directions: GravityDirection[] = ["down", "right", "up", "left"];
      const currentIndex = directions.indexOf(this.gravity);
      this.gravity = directions[(currentIndex + 1) % 4];
      this.gravityCooldown = 0.3;

      // Target angle for smooth rotation
      switch (this.gravity) {
        case "down": this.targetGravityAngle = 0; break;
        case "right": this.targetGravityAngle = Math.PI * 0.5; break;
        case "up": this.targetGravityAngle = Math.PI; break;
        case "left": this.targetGravityAngle = Math.PI * 1.5; break;
      }

      // Create gravity shift particles
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: (Math.random() - 0.5) * 300,
          vy: (Math.random() - 0.5) * 300,
          life: 0.4,
          color: "#8080ff",
        });
      }
    };

    this.canvas.addEventListener("click", cycleGravity);
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      cycleGravity();
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        cycleGravity();
      }
    });
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        health: this.health,
        wave: this.wave,
        status: this.status,
      });
    }
  }

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const size = Math.min(container.clientWidth, container.clientHeight);
    this.canvas.width = size;
    this.canvas.height = size;
    this.width = size;
    this.height = size;
  }

  start() {
    this.score = 0;
    this.health = 100;
    this.wave = 1;
    this.status = "playing";
    this.gravity = "down";
    this.gravityAngle = 0;
    this.targetGravityAngle = 0;
    this.gravityCooldown = 0;
    this.enemies = [];
    this.particles = [];

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;

    this.createPlatforms();
    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private createPlatforms() {
    this.platforms = [
      // Center platform
      { x: this.width / 2 - 60, y: this.height / 2 - 10, width: 120, height: 20 },
      // Corner platforms
      { x: 30, y: 80, width: 80, height: 15 },
      { x: this.width - 110, y: 80, width: 80, height: 15 },
      { x: 30, y: this.height - 95, width: 80, height: 15 },
      { x: this.width - 110, y: this.height - 95, width: 80, height: 15 },
      // Side platforms
      { x: 50, y: this.height / 2 - 40, width: 15, height: 80 },
      { x: this.width - 65, y: this.height / 2 - 40, width: 15, height: 80 },
    ];
  }

  private spawnWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
    const margin = 50;
    const x = margin + Math.random() * (this.width - margin * 2);
    const y = margin + Math.random() * (this.height - margin * 2);

    // Avoid spawning too close to player
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 80) return this.spawnEnemy();

    const rand = Math.random();
    let type: Enemy["type"] = "basic";
    if (rand > 0.8) type = "heavy";
    else if (rand > 0.6) type = "flying";

    let size = 25;
    let health = 1;
    if (type === "heavy") {
      size = 35;
      health = 3;
    }

    this.enemies.push({
      x,
      y,
      width: size,
      height: size,
      vx: 0,
      vy: 0,
      health,
      type,
      grounded: false,
    });
  }

  private getGravityVector(): { gx: number; gy: number } {
    switch (this.gravity) {
      case "down": return { gx: 0, gy: this.gravityStrength };
      case "up": return { gx: 0, gy: -this.gravityStrength };
      case "left": return { gx: -this.gravityStrength, gy: 0 };
      case "right": return { gx: this.gravityStrength, gy: 0 };
    }
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.gravityCooldown = Math.max(0, this.gravityCooldown - dt);

    // Smooth gravity angle transition
    let angleDiff = this.targetGravityAngle - this.gravityAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.gravityAngle += angleDiff * dt * 10;

    const { gx, gy } = this.getGravityVector();

    // Update player
    this.player.vx += gx * dt;
    this.player.vy += gy * dt;

    // Friction
    this.player.vx *= 0.98;
    this.player.vy *= 0.98;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Platform collision for player
    this.handlePlatformCollision(this.player);

    // Wall collision for player
    if (this.player.x < this.player.width / 2) {
      this.player.x = this.player.width / 2;
      this.player.vx = 0;
    }
    if (this.player.x > this.width - this.player.width / 2) {
      this.player.x = this.width - this.player.width / 2;
      this.player.vx = 0;
    }
    if (this.player.y < this.player.height / 2) {
      this.player.y = this.player.height / 2;
      this.player.vy = 0;
    }
    if (this.player.y > this.height - this.player.height / 2) {
      this.player.y = this.height - this.player.height / 2;
      this.player.vy = 0;
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.type !== "flying") {
        enemy.vx += gx * dt * (enemy.type === "heavy" ? 1.5 : 1);
        enemy.vy += gy * dt * (enemy.type === "heavy" ? 1.5 : 1);
      } else {
        // Flying enemies resist gravity but move towards player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        enemy.vx += (dx / dist) * 100 * dt;
        enemy.vy += (dy / dist) * 100 * dt;
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;
      }

      enemy.vx *= 0.98;
      enemy.vy *= 0.98;

      const prevX = enemy.x;
      const prevY = enemy.y;

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Platform collision
      this.handlePlatformCollision(enemy);

      // Wall collision - enemies take damage when hitting walls at high speed
      const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
      let hitWall = false;

      if (enemy.x < enemy.width / 2) {
        enemy.x = enemy.width / 2;
        if (Math.abs(enemy.vx) > 200) {
          enemy.health--;
          hitWall = true;
        }
        enemy.vx = -enemy.vx * 0.3;
      }
      if (enemy.x > this.width - enemy.width / 2) {
        enemy.x = this.width - enemy.width / 2;
        if (Math.abs(enemy.vx) > 200) {
          enemy.health--;
          hitWall = true;
        }
        enemy.vx = -enemy.vx * 0.3;
      }
      if (enemy.y < enemy.height / 2) {
        enemy.y = enemy.height / 2;
        if (Math.abs(enemy.vy) > 200) {
          enemy.health--;
          hitWall = true;
        }
        enemy.vy = -enemy.vy * 0.3;
      }
      if (enemy.y > this.height - enemy.height / 2) {
        enemy.y = this.height - enemy.height / 2;
        if (Math.abs(enemy.vy) > 200) {
          enemy.health--;
          hitWall = true;
        }
        enemy.vy = -enemy.vy * 0.3;
      }

      if (hitWall) {
        for (let j = 0; j < 10; j++) {
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 0.3,
            color: "#ff8888",
          });
        }
      }

      // Check if enemy is dead
      if (enemy.health <= 0) {
        this.score += enemy.type === "heavy" ? 30 : enemy.type === "flying" ? 20 : 10;

        for (let j = 0; j < 15; j++) {
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 300,
            vy: (Math.random() - 0.5) * 300,
            life: 0.5,
            color: "#ff4444",
          });
        }

        this.enemies.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (this.checkCollision(enemy, this.player)) {
        this.health -= 10;

        // Knockback
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.player.vx += (dx / dist) * 200;
        this.player.vy += (dy / dist) * 200;

        if (this.health <= 0) {
          this.status = "over";
          this.emitState();
          return;
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Check wave complete
    if (this.enemies.length === 0) {
      this.status = "complete";
      this.emitState();
    }

    this.emitState();
  }

  private handlePlatformCollision(entity: { x: number; y: number; width: number; height: number; vx: number; vy: number }) {
    for (const platform of this.platforms) {
      if (this.checkBoxCollision(
        entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height,
        platform.x, platform.y, platform.width, platform.height
      )) {
        // Determine collision side
        const overlapLeft = (entity.x + entity.width / 2) - platform.x;
        const overlapRight = (platform.x + platform.width) - (entity.x - entity.width / 2);
        const overlapTop = (entity.y + entity.height / 2) - platform.y;
        const overlapBottom = (platform.y + platform.height) - (entity.y - entity.height / 2);

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          if (overlapLeft < overlapRight) {
            entity.x = platform.x - entity.width / 2;
          } else {
            entity.x = platform.x + platform.width + entity.width / 2;
          }
          entity.vx = 0;
        } else {
          if (overlapTop < overlapBottom) {
            entity.y = platform.y - entity.height / 2;
          } else {
            entity.y = platform.y + platform.height + entity.height / 2;
          }
          entity.vy = 0;
        }
      }
    }
  }

  private checkBoxCollision(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private checkCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background with gravity effect
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width / 2
    );
    gradient.addColorStop(0, "#1a1a40");
    gradient.addColorStop(1, "#0f0f25");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Gravity direction indicator
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.rotate(this.gravityAngle);

    // Gravity arrows
    ctx.strokeStyle = "rgba(100, 100, 200, 0.3)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const y = -80 + i * 40;
      ctx.beginPath();
      ctx.moveTo(-20, y);
      ctx.lineTo(0, y + 20);
      ctx.lineTo(20, y);
      ctx.stroke();
    }
    ctx.restore();

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw platforms
    ctx.fillStyle = "#4040aa";
    for (const platform of this.platforms) {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = "#6060dd";
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      let color = "#ff4444";
      if (enemy.type === "heavy") color = "#aa2222";
      if (enemy.type === "flying") color = "#ff8844";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Health indicator
      if (enemy.health > 1) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(enemy.health.toString(), enemy.x, enemy.y + 4);
      }

      // Flying indicator
      if (enemy.type === "flying") {
        ctx.strokeStyle = "#ffaa44";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.width / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw player
    ctx.fillStyle = "#4488ff";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Player glow
    ctx.shadowColor = "#4488ff";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#88bbff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Gravity indicator on player
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.gravityAngle);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(0, 0);
    ctx.lineTo(5, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Cooldown indicator
    if (this.gravityCooldown > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.arc(
        this.player.x, this.player.y, 25,
        -Math.PI / 2,
        -Math.PI / 2 + (1 - this.gravityCooldown / 0.3) * Math.PI * 2
      );
      ctx.fill();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = this.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.health, 15);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 100, 15);
  }

  private gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  nextWave() {
    this.wave++;
    this.health = Math.min(100, this.health + 30);
    this.status = "playing";
    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
