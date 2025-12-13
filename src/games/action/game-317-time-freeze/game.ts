/**
 * Time Freeze Game
 * Game #317 - Freeze time to defeat enemies
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
  facing: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  frozen: boolean;
  frozenTime: number;
  type: "basic" | "shooter" | "charger";
  attackCooldown: number;
}

interface Bullet extends Position {
  vx: number;
  vy: number;
  fromPlayer: boolean;
  frozen: boolean;
}

interface GameState {
  score: number;
  energy: number;
  wave: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class TimeFreezeGame {
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
    height: 40,
    vx: 0,
    vy: 0,
    facing: 1,
  };

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; frozen: boolean }[] = [];

  private score = 0;
  private energy = 100;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private timeFrozen = false;
  private freezeRadius = 0;
  private attackCooldown = 0;

  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Touch controls
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.status === "playing") {
        this.timeFrozen = true;
      }
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.timeFrozen = false;
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (this.status !== "playing") return;

      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / rect.width * this.width;
      const y = (touch.clientY - rect.top) / rect.height * this.height;

      // Move towards touch
      const dx = x - this.player.x;
      const dy = y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 20) {
        this.player.vx = (dx / dist) * 150;
        this.player.vy = (dy / dist) * 150;
        this.player.facing = dx > 0 ? 1 : -1;
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
        energy: Math.floor(this.energy),
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
    this.energy = 100;
    this.wave = 1;
    this.status = "playing";
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.timeFrozen = false;
    this.freezeRadius = 0;
    this.attackCooldown = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;

    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x = 0,
      y = 0;

    switch (side) {
      case 0:
        x = Math.random() * this.width;
        y = -30;
        break;
      case 1:
        x = this.width + 30;
        y = Math.random() * this.height;
        break;
      case 2:
        x = Math.random() * this.width;
        y = this.height + 30;
        break;
      case 3:
        x = -30;
        y = Math.random() * this.height;
        break;
    }

    const types: Enemy["type"][] = ["basic", "shooter", "charger"];
    const rand = Math.random();
    let type: Enemy["type"] = "basic";
    if (rand > 0.7) type = "shooter";
    else if (rand > 0.5) type = "charger";

    this.enemies.push({
      x,
      y,
      width: type === "charger" ? 35 : 25,
      height: type === "charger" ? 35 : 25,
      vx: 0,
      vy: 0,
      health: type === "charger" ? 2 : 1,
      frozen: false,
      frozenTime: 0,
      type,
      attackCooldown: Math.random() * 2,
    });
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    // Time freeze logic
    if (this.keys["Space"] && this.energy > 0) {
      this.timeFrozen = true;
      this.energy = Math.max(0, this.energy - dt * 30);
      this.freezeRadius = Math.min(this.width, this.freezeRadius + dt * 500);
    } else {
      this.timeFrozen = false;
      this.energy = Math.min(100, this.energy + dt * 10);
      this.freezeRadius = Math.max(0, this.freezeRadius - dt * 300);
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Update player
    const speed = 150;
    this.player.vx = 0;
    this.player.vy = 0;

    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
      this.player.vx = -speed;
      this.player.facing = -1;
    }
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
      this.player.vx = speed;
      this.player.facing = 1;
    }
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) {
      this.player.vy = -speed;
    }
    if (this.keys["ArrowDown"] || this.keys["KeyS"]) {
      this.player.vy = speed;
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    this.player.x = Math.max(this.player.width / 2, Math.min(this.width - this.player.width / 2, this.player.x));
    this.player.y = Math.max(this.player.height / 2, Math.min(this.height - this.player.height / 2, this.player.y));

    // Attack frozen enemies
    if (this.attackCooldown <= 0) {
      for (const enemy of this.enemies) {
        if (enemy.frozen) {
          const dx = enemy.x - this.player.x;
          const dy = enemy.y - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 50) {
            enemy.health--;
            this.attackCooldown = 0.3;

            // Hit particles
            for (let i = 0; i < 8; i++) {
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.4,
                color: "#4cc9f0",
                frozen: false,
              });
            }
            break;
          }
        }
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Check if in freeze radius
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.timeFrozen && dist < this.freezeRadius) {
        enemy.frozen = true;
        enemy.frozenTime = 0.5;
      } else if (enemy.frozenTime > 0) {
        enemy.frozenTime -= dt;
        if (enemy.frozenTime <= 0) {
          enemy.frozen = false;
        }
      }

      if (!enemy.frozen) {
        // Move towards player
        const distToPlayer = Math.sqrt(dx * dx + dy * dy) || 1;
        let enemySpeed = 60;

        if (enemy.type === "charger") {
          enemySpeed = 40;
          if (distToPlayer < 150) enemySpeed = 120;
        } else if (enemy.type === "shooter") {
          enemySpeed = 30;
          enemy.attackCooldown -= dt;

          if (enemy.attackCooldown <= 0 && distToPlayer < 250) {
            enemy.attackCooldown = 2;
            this.bullets.push({
              x: enemy.x,
              y: enemy.y,
              vx: (-dx / distToPlayer) * 150,
              vy: (-dy / distToPlayer) * 150,
              fromPlayer: false,
              frozen: false,
            });
          }
        }

        enemy.x -= (dx / distToPlayer) * enemySpeed * dt;
        enemy.y -= (dy / distToPlayer) * enemySpeed * dt;

        // Check collision with player
        if (this.checkCollision(enemy, this.player)) {
          this.status = "over";
          this.emitState();
          return;
        }
      }

      // Remove dead enemies
      if (enemy.health <= 0) {
        this.score += enemy.type === "charger" ? 30 : enemy.type === "shooter" ? 20 : 10;

        for (let j = 0; j < 15; j++) {
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 0.5,
            color: "#ff6b6b",
            frozen: false,
          });
        }

        this.enemies.splice(i, 1);
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      // Check freeze
      const dx = bullet.x - this.player.x;
      const dy = bullet.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.timeFrozen && dist < this.freezeRadius) {
        bullet.frozen = true;
      } else if (!this.timeFrozen) {
        bullet.frozen = false;
      }

      if (!bullet.frozen) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
      }

      // Check bounds
      if (bullet.x < 0 || bullet.x > this.width || bullet.y < 0 || bullet.y > this.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (!bullet.fromPlayer && !bullet.frozen) {
        if (Math.abs(bullet.x - this.player.x) < 15 && Math.abs(bullet.y - this.player.y) < 20) {
          this.status = "over";
          this.emitState();
          return;
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.frozen) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
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

  private checkCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
      Math.abs(a.y - b.y) < (a.height + b.height) / 2
    );
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, this.width, this.height);

    // Time freeze effect
    if (this.freezeRadius > 0) {
      const gradient = ctx.createRadialGradient(
        this.player.x, this.player.y, 0,
        this.player.x, this.player.y, this.freezeRadius
      );
      gradient.addColorStop(0, "rgba(76, 201, 240, 0.1)");
      gradient.addColorStop(0.7, "rgba(76, 201, 240, 0.05)");
      gradient.addColorStop(1, "rgba(76, 201, 240, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.freezeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Freeze ring
      ctx.strokeStyle = "rgba(76, 201, 240, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.freezeRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw bullets
    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.frozen ? "#88ccff" : "#ff4444";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
      ctx.fill();

      if (bullet.frozen) {
        ctx.strokeStyle = "#aaddff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      let color = "#ff4444";
      if (enemy.type === "shooter") color = "#ff8844";
      if (enemy.type === "charger") color = "#ff4488";

      if (enemy.frozen) {
        color = "#88ccff";
      }

      ctx.fillStyle = color;
      ctx.fillRect(
        enemy.x - enemy.width / 2,
        enemy.y - enemy.height / 2,
        enemy.width,
        enemy.height
      );

      // Frozen effect
      if (enemy.frozen) {
        ctx.strokeStyle = "#aaddff";
        ctx.lineWidth = 3;
        ctx.strokeRect(
          enemy.x - enemy.width / 2 - 3,
          enemy.y - enemy.height / 2 - 3,
          enemy.width + 6,
          enemy.height + 6
        );

        // Ice crystals
        ctx.fillStyle = "#ccf";
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const cx = enemy.x + Math.cos(angle) * (enemy.width / 2 + 8);
          const cy = enemy.y + Math.sin(angle) * (enemy.height / 2 + 8);
          ctx.beginPath();
          ctx.moveTo(cx, cy - 5);
          ctx.lineTo(cx + 3, cy);
          ctx.lineTo(cx, cy + 5);
          ctx.lineTo(cx - 3, cy);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Eyes
      ctx.fillStyle = enemy.frozen ? "#fff" : "#fff";
      ctx.beginPath();
      ctx.arc(enemy.x - 5, enemy.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(enemy.x + 5, enemy.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player
    ctx.fillStyle = "#4361ee";
    ctx.fillRect(
      this.player.x - this.player.width / 2,
      this.player.y - this.player.height / 2,
      this.player.width,
      this.player.height
    );

    // Player glow when freezing
    if (this.timeFrozen) {
      ctx.shadowColor = "#4cc9f0";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#4cc9f0";
      ctx.fillRect(
        this.player.x - this.player.width / 2,
        this.player.y - this.player.height / 2,
        this.player.width,
        this.player.height
      );
      ctx.shadowBlur = 0;
    }

    // Player eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.player.x - 5 * this.player.facing, this.player.y - 5, 4, 0, Math.PI * 2);
    ctx.arc(this.player.x + 3 * this.player.facing, this.player.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Energy bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, this.height - 30, 100, 15);
    ctx.fillStyle = this.energy > 30 ? "#4cc9f0" : "#ff6b6b";
    ctx.fillRect(10, this.height - 30, this.energy, 15);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, this.height - 30, 100, 15);
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
    this.energy = 100;
    this.status = "playing";
    this.bullets = [];
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
