/**
 * Flame Knight Game
 * Game #323 - Fire magic combat with fireball and burn mechanics
 */

interface Position { x: number; y: number; }

interface Player extends Position {
  width: number; height: number; vx: number; vy: number; health: number; heat: number;
}

interface Enemy extends Position {
  width: number; height: number; vx: number; vy: number; health: number; burning: number; type: "basic" | "ice" | "fire";
}

interface Fireball extends Position {
  vx: number; vy: number; size: number;
}

interface GameState {
  score: number; heat: number; wave: number; status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class FlameKnightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  private player: Player = { x: 0, y: 0, width: 35, height: 35, vx: 0, vy: 0, health: 100, heat: 0 };
  private enemies: Enemy[] = [];
  private fireballs: Fireball[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];

  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private fireCooldown = 0;

  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => { this.keys[e.code] = true; });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    const handleFire = (x: number, y: number) => {
      if (this.status !== "playing" || this.fireCooldown > 0) return;
      this.shootFireball(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      handleFire((e.clientX - rect.left) / rect.width * this.width, (e.clientY - rect.top) / rect.height * this.height);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleFire((touch.clientX - rect.left) / rect.width * this.width, (touch.clientY - rect.top) / rect.height * this.height);
    });
  }

  private shootFireball(targetX: number, targetY: number) {
    this.fireCooldown = 0.2;
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 300;

    // Heat affects fireball size
    const size = 10 + Math.min(this.player.heat / 10, 15);

    this.fireballs.push({
      x: this.player.x, y: this.player.y,
      vx: (dx / dist) * speed, vy: (dy / dist) * speed,
      size
    });

    // Fire particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: (dx / dist) * 50 + (Math.random() - 0.5) * 50,
        vy: (dy / dist) * 50 + (Math.random() - 0.5) * 50,
        life: 0.3, color: "#ff6633", size: 4
      });
    }
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({ score: this.score, heat: Math.floor(this.player.heat), wave: this.wave, status: this.status });
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
    this.wave = 1;
    this.status = "playing";
    this.enemies = [];
    this.fireballs = [];
    this.particles = [];
    this.fireCooldown = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = 100;
    this.player.heat = 0;

    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnWave() {
    const count = 4 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      switch (side) {
        case 0: x = Math.random() * this.width; y = -30; break;
        case 1: x = this.width + 30; y = Math.random() * this.height; break;
        case 2: x = Math.random() * this.width; y = this.height + 30; break;
        case 3: x = -30; y = Math.random() * this.height; break;
      }

      const rand = Math.random();
      let type: Enemy["type"] = "basic";
      if (rand > 0.75) type = "ice";
      else if (rand > 0.5) type = "fire";

      this.enemies.push({
        x, y, width: type === "ice" ? 30 : 25, height: type === "ice" ? 30 : 25,
        vx: 0, vy: 0, health: type === "ice" ? 3 : 2, burning: 0, type
      });
    }
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // Heat builds up over time, resets when not attacking
    if (this.fireCooldown > 0) {
      this.player.heat = Math.min(100, this.player.heat + dt * 30);
    } else {
      this.player.heat = Math.max(0, this.player.heat - dt * 10);
    }

    // Update player
    const speed = 150;
    let tx = 0, ty = 0;
    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) tx = -speed;
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) tx = speed;
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) ty = -speed;
    if (this.keys["ArrowDown"] || this.keys["KeyS"]) ty = speed;

    this.player.vx += (tx - this.player.vx) * 0.2;
    this.player.vy += (ty - this.player.vy) * 0.2;
    this.player.x = Math.max(20, Math.min(this.width - 20, this.player.x + this.player.vx * dt));
    this.player.y = Math.max(20, Math.min(this.height - 20, this.player.y + this.player.vy * dt));

    // Update fireballs
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;

      // Trail particles
      if (Math.random() > 0.5) {
        this.particles.push({
          x: fb.x, y: fb.y,
          vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
          life: 0.3, color: Math.random() > 0.5 ? "#ff4400" : "#ffaa00", size: fb.size * 0.5
        });
      }

      // Check bounds
      if (fb.x < -20 || fb.x > this.width + 20 || fb.y < -20 || fb.y > this.height + 20) {
        this.fireballs.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dx = enemy.x - fb.x;
        const dy = enemy.y - fb.y;
        if (Math.sqrt(dx * dx + dy * dy) < fb.size + enemy.width / 2) {
          // Hit!
          const damage = enemy.type === "fire" ? 0.5 : (enemy.type === "ice" ? 2 : 1);
          enemy.health -= damage;
          enemy.burning = enemy.type === "fire" ? 0 : 2;

          // Hit particles
          for (let k = 0; k < 10; k++) {
            this.particles.push({
              x: enemy.x, y: enemy.y,
              vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
              life: 0.4, color: "#ff6600", size: 5
            });
          }

          this.fireballs.splice(i, 1);
          break;
        }
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Burning damage
      if (enemy.burning > 0) {
        enemy.burning -= dt;
        enemy.health -= dt * 0.5;

        if (Math.random() > 0.7) {
          this.particles.push({
            x: enemy.x + (Math.random() - 0.5) * enemy.width,
            y: enemy.y + (Math.random() - 0.5) * enemy.height,
            vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30,
            life: 0.3, color: "#ff8800", size: 4
          });
        }
      }

      // Dead?
      if (enemy.health <= 0) {
        this.score += enemy.type === "ice" ? 30 : 20;
        for (let k = 0; k < 15; k++) {
          this.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
            life: 0.5, color: "#ff4400", size: 6
          });
        }
        this.enemies.splice(i, 1);
        continue;
      }

      // Move
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = enemy.type === "ice" ? 40 : 55;

      enemy.vx += (dx / dist) * speed * dt * 3;
      enemy.vy += (dy / dist) * speed * dt * 3;
      enemy.vx *= 0.95;
      enemy.vy *= 0.95;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Collision with player
      if (dist < 30) {
        this.player.health -= 15;
        enemy.vx = -dx / dist * 100;
        enemy.vy = -dy / dist * 100;
        if (this.player.health <= 0) {
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
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.enemies.length === 0) {
      this.status = "complete";
      this.emitState();
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#1a0a05";
    ctx.fillRect(0, 0, this.width, this.height);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fireballs
    for (const fb of this.fireballs) {
      const gradient = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.size);
      gradient.addColorStop(0, "#ffff00");
      gradient.addColorStop(0.5, "#ff6600");
      gradient.addColorStop(1, "#ff0000");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, fb.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const enemy of this.enemies) {
      let color = "#44aa44";
      if (enemy.type === "ice") color = "#44aaff";
      if (enemy.type === "fire") color = "#aa4422";

      if (enemy.burning > 0) {
        ctx.shadowColor = "#ff6600";
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Player
    ctx.fillStyle = "#ff6633";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Heat aura
    if (this.player.heat > 0) {
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 10 + this.player.heat / 5;
    }
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // UI
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 100, 12);
    ctx.fillRect(10, 26, 100, 8);
    ctx.fillStyle = this.player.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.player.health, 12);
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(10, 26, this.player.heat, 8);
  }

  private gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    if (this.status === "playing") this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  nextWave() {
    this.wave++;
    this.player.health = Math.min(100, this.player.health + 30);
    this.status = "playing";
    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
