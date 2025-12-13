/**
 * Electric Knight Game
 * Game #321 - Chain lightning combat
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
  health: number;
  charge: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  type: "basic" | "armored" | "fast";
  stunned: number;
  conductivity: number;
}

interface Lightning {
  points: Position[];
  alpha: number;
  color: string;
}

interface GameState {
  score: number;
  charge: number;
  wave: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class ElectricKnightGame {
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
    width: 35,
    height: 35,
    vx: 0,
    vy: 0,
    health: 100,
    charge: 100,
  };

  private enemies: Enemy[] = [];
  private lightnings: Lightning[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private electricField: { x: number; y: number; radius: number; alpha: number }[] = [];

  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
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
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    const handleAttack = (x: number, y: number) => {
      if (this.status !== "playing") return;
      if (this.attackCooldown > 0 || this.player.charge < 20) return;

      this.chainLightning(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * this.width;
      const y = (e.clientY - rect.top) / rect.height * this.height;
      handleAttack(x, y);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / rect.width * this.width;
      const y = (touch.clientY - rect.top) / rect.height * this.height;
      handleAttack(x, y);
    });
  }

  private chainLightning(targetX: number, targetY: number) {
    this.player.charge -= 20;
    this.attackCooldown = 0.3;

    // Find nearest enemy to target
    let nearestEnemy: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of this.enemies) {
      const dx = enemy.x - targetX;
      const dy = enemy.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist && dist < 100) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (!nearestEnemy) {
      // No enemy near target, just create visual lightning to point
      this.createLightning(this.player.x, this.player.y, targetX, targetY);
      return;
    }

    // Chain from player to first enemy
    this.createLightning(this.player.x, this.player.y, nearestEnemy.x, nearestEnemy.y);
    this.hitEnemy(nearestEnemy, 2);

    // Chain to nearby enemies
    const chainRange = 80;
    const maxChains = 4;
    let chainCount = 0;
    const hitEnemies = new Set<Enemy>([nearestEnemy]);
    let lastEnemy = nearestEnemy;

    while (chainCount < maxChains) {
      let nextEnemy: Enemy | null = null;
      let nextDist = Infinity;

      for (const enemy of this.enemies) {
        if (hitEnemies.has(enemy)) continue;
        if (enemy.health <= 0) continue;

        const dx = enemy.x - lastEnemy.x;
        const dy = enemy.y - lastEnemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < chainRange && dist < nextDist) {
          nextDist = dist;
          nextEnemy = enemy;
        }
      }

      if (!nextEnemy) break;

      // Create chain lightning
      this.createLightning(lastEnemy.x, lastEnemy.y, nextEnemy.x, nextEnemy.y);
      this.hitEnemy(nextEnemy, 1);
      hitEnemies.add(nextEnemy);
      lastEnemy = nextEnemy;
      chainCount++;
    }

    this.emitState();
  }

  private createLightning(x1: number, y1: number, x2: number, y2: number) {
    const points: Position[] = [{ x: x1, y: y1 }];
    const segments = 5 + Math.floor(Math.random() * 3);
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    for (let i = 1; i < segments; i++) {
      const offset = 15;
      points.push({
        x: x1 + dx * i + (Math.random() - 0.5) * offset,
        y: y1 + dy * i + (Math.random() - 0.5) * offset,
      });
    }
    points.push({ x: x2, y: y2 });

    this.lightnings.push({
      points,
      alpha: 1,
      color: "#ffff00",
    });

    // Add electric particles along the lightning
    for (let i = 0; i < 10; i++) {
      const t = Math.random();
      const idx = Math.floor(t * (points.length - 1));
      const p1 = points[idx];
      const p2 = points[Math.min(idx + 1, points.length - 1)];
      const px = p1.x + (p2.x - p1.x) * (t * (points.length - 1) - idx);
      const py = p1.y + (p2.y - p1.y) * (t * (points.length - 1) - idx);

      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        life: 0.3,
        color: Math.random() > 0.5 ? "#ffff00" : "#88ffff",
      });
    }
  }

  private hitEnemy(enemy: Enemy, damage: number) {
    const actualDamage = enemy.type === "armored" ? Math.max(1, damage - 1) : damage;
    enemy.health -= actualDamage;
    enemy.stunned = 0.5;

    // Hit particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 0.5) * 150,
        life: 0.3,
        color: "#ffff00",
      });
    }

    // Electric field effect
    this.electricField.push({
      x: enemy.x,
      y: enemy.y,
      radius: 5,
      alpha: 1,
    });
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        charge: Math.floor(this.player.charge),
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
    this.wave = 1;
    this.status = "playing";
    this.enemies = [];
    this.lightnings = [];
    this.particles = [];
    this.electricField = [];
    this.attackCooldown = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = 100;
    this.player.charge = 100;

    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnWave() {
    const count = 4 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
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
    let health = 2;
    let size = 25;
    let conductivity = 1;

    if (rand > 0.8) {
      type = "armored";
      health = 4;
      size = 35;
      conductivity = 0.5;
    } else if (rand > 0.6) {
      type = "fast";
      health = 1;
      size = 20;
      conductivity = 1.5;
    }

    this.enemies.push({
      x, y,
      width: size,
      height: size,
      vx: 0,
      vy: 0,
      health,
      maxHealth: health,
      type,
      stunned: 0,
      conductivity,
    });
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Regenerate charge
    this.player.charge = Math.min(100, this.player.charge + dt * 15);

    // Update player
    const speed = 150;
    let targetVx = 0;
    let targetVy = 0;

    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) targetVx = -speed;
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) targetVx = speed;
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) targetVy = -speed;
    if (this.keys["ArrowDown"] || this.keys["KeyS"]) targetVy = speed;

    this.player.vx += (targetVx - this.player.vx) * 0.2;
    this.player.vy += (targetVy - this.player.vy) * 0.2;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Bounds
    this.player.x = Math.max(this.player.width / 2, Math.min(this.width - this.player.width / 2, this.player.x));
    this.player.y = Math.max(this.player.height / 2, Math.min(this.height - this.player.height / 2, this.player.y));

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      enemy.stunned = Math.max(0, enemy.stunned - dt);

      if (enemy.stunned <= 0) {
        // Move towards player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        let enemySpeed = 50;
        if (enemy.type === "fast") enemySpeed = 90;
        if (enemy.type === "armored") enemySpeed = 35;

        enemy.vx += (dx / dist) * enemySpeed * dt * 5;
        enemy.vy += (dy / dist) * enemySpeed * dt * 5;
      }

      enemy.vx *= 0.95;
      enemy.vy *= 0.95;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Check if dead
      if (enemy.health <= 0) {
        this.score += enemy.type === "armored" ? 30 : enemy.type === "fast" ? 15 : 20;

        for (let j = 0; j < 15; j++) {
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 300,
            vy: (Math.random() - 0.5) * 300,
            life: 0.5,
            color: "#ffff00",
          });
        }

        this.enemies.splice(i, 1);
        continue;
      }

      // Check collision with player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < (enemy.width + this.player.width) / 2) {
        this.player.health -= 15;

        // Knockback
        this.player.vx += (dx / dist) * 200;
        this.player.vy += (dy / dist) * 200;
        enemy.vx -= (dx / dist) * 100;
        enemy.vy -= (dy / dist) * 100;

        if (this.player.health <= 0) {
          this.status = "over";
          this.emitState();
          return;
        }
      }
    }

    // Update lightnings
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      this.lightnings[i].alpha -= dt * 5;
      if (this.lightnings[i].alpha <= 0) {
        this.lightnings.splice(i, 1);
      }
    }

    // Update electric fields
    for (let i = this.electricField.length - 1; i >= 0; i--) {
      const field = this.electricField[i];
      field.radius += dt * 100;
      field.alpha -= dt * 3;
      if (field.alpha <= 0) {
        this.electricField.splice(i, 1);
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

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#0a0a18";
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid effect
    ctx.strokeStyle = "rgba(100, 100, 150, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw electric fields
    for (const field of this.electricField) {
      ctx.strokeStyle = `rgba(255, 255, 0, ${field.alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw lightnings
    for (const lightning of this.lightnings) {
      ctx.strokeStyle = `rgba(255, 255, 0, ${lightning.alpha})`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
      for (let i = 1; i < lightning.points.length; i++) {
        ctx.lineTo(lightning.points[i].x, lightning.points[i].y);
      }
      ctx.stroke();

      // Glow
      ctx.strokeStyle = `rgba(255, 255, 255, ${lightning.alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw enemies
    for (const enemy of this.enemies) {
      let color = "#44aa44";
      if (enemy.type === "armored") color = "#666688";
      if (enemy.type === "fast") color = "#44aa88";

      // Stunned effect
      if (enemy.stunned > 0) {
        ctx.fillStyle = `rgba(255, 255, 0, ${enemy.stunned})`;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.width / 2 + 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Type indicator
      if (enemy.type === "armored") {
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Health bar
      if (enemy.health < enemy.maxHealth) {
        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.height / 2 - 10, 30, 5);
        ctx.fillStyle = "#44ff44";
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.height / 2 - 10, 30 * (enemy.health / enemy.maxHealth), 5);
      }
    }

    // Draw player
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Player electric aura
    ctx.shadowColor = "#ffff00";
    ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Lightning bolt symbol
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", this.player.x, this.player.y);

    // Charge indicator ring
    ctx.strokeStyle = `rgba(255, 255, 0, 0.5)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      this.player.x, this.player.y, this.player.width / 2 + 8,
      -Math.PI / 2,
      -Math.PI / 2 + (this.player.charge / 100) * Math.PI * 2
    );
    ctx.stroke();

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = this.player.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.player.health, 15);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 100, 15);

    // Charge bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 30, 100, 10);
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(10, 30, this.player.charge, 10);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(10, 30, 100, 10);
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
    this.player.health = Math.min(100, this.player.health + 30);
    this.player.charge = 100;
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
