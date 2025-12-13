/**
 * Wind Ninja Game
 * Game #324 - Wind dash combat
 */

interface Position { x: number; y: number; }

interface Player extends Position {
  width: number; height: number; vx: number; vy: number; health: number; dashes: number; dashing: boolean; dashTarget: Position | null;
}

interface Enemy extends Position {
  width: number; height: number; vx: number; vy: number; health: number; type: "basic" | "heavy" | "ranged";
}

interface WindSlash extends Position {
  angle: number; life: number; length: number;
}

interface GameState {
  score: number; dash: number; wave: number; status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class WindNinjaGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  private player: Player = { x: 0, y: 0, width: 30, height: 30, vx: 0, vy: 0, health: 100, dashes: 3, dashing: false, dashTarget: null };
  private enemies: Enemy[] = [];
  private windSlashes: WindSlash[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private dashTrail: { x: number; y: number; alpha: number }[] = [];

  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private dashCooldown = 0;

  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => { this.keys[e.code] = true; });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    const handleDash = (x: number, y: number) => {
      if (this.status !== "playing" || this.player.dashes <= 0 || this.dashCooldown > 0) return;
      this.windDash(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      handleDash((e.clientX - rect.left) / rect.width * this.width, (e.clientY - rect.top) / rect.height * this.height);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleDash((touch.clientX - rect.left) / rect.width * this.width, (touch.clientY - rect.top) / rect.height * this.height);
    });
  }

  private windDash(targetX: number, targetY: number) {
    this.player.dashes--;
    this.dashCooldown = 0.15;

    const startX = this.player.x;
    const startY = this.player.y;
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 150;
    const actualDist = Math.min(dist, maxDist);

    // Dash to target
    this.player.x += (dx / dist) * actualDist;
    this.player.y += (dy / dist) * actualDist;

    // Clamp to bounds
    this.player.x = Math.max(20, Math.min(this.width - 20, this.player.x));
    this.player.y = Math.max(20, Math.min(this.height - 20, this.player.y));

    // Create wind slash
    const angle = Math.atan2(dy, dx);
    this.windSlashes.push({ x: (startX + this.player.x) / 2, y: (startY + this.player.y) / 2, angle, life: 0.3, length: actualDist });

    // Dash trail
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      this.dashTrail.push({ x: startX + (this.player.x - startX) * t, y: startY + (this.player.y - startY) * t, alpha: 1 - t * 0.5 });
    }

    // Wind particles
    for (let i = 0; i < 15; i++) {
      const t = Math.random();
      this.particles.push({
        x: startX + (this.player.x - startX) * t,
        y: startY + (this.player.y - startY) * t,
        vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100,
        life: 0.4, color: "#88ffaa"
      });
    }

    // Hit enemies along path
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      // Check if enemy is near the dash path
      const ex = enemy.x - startX;
      const ey = enemy.y - startY;
      const edx = this.player.x - startX;
      const edy = this.player.y - startY;
      const t = Math.max(0, Math.min(1, (ex * edx + ey * edy) / (edx * edx + edy * edy)));
      const closestX = startX + t * edx;
      const closestY = startY + t * edy;
      const distToPath = Math.sqrt((enemy.x - closestX) ** 2 + (enemy.y - closestY) ** 2);

      if (distToPath < enemy.width / 2 + 20) {
        enemy.health -= 2;
        for (let j = 0; j < 8; j++) {
          this.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
            life: 0.3, color: "#aaffcc"
          });
        }
      }
    }

    this.emitState();
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({ score: this.score, dash: this.player.dashes, wave: this.wave, status: this.status });
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
    this.windSlashes = [];
    this.particles = [];
    this.dashTrail = [];
    this.dashCooldown = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = 100;
    this.player.dashes = 3;

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
      if (rand > 0.75) type = "heavy";
      else if (rand > 0.5) type = "ranged";

      this.enemies.push({
        x, y, width: type === "heavy" ? 35 : 25, height: type === "heavy" ? 35 : 25,
        vx: 0, vy: 0, health: type === "heavy" ? 4 : 2, type
      });
    }
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

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

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.health <= 0) {
        this.score += enemy.type === "heavy" ? 30 : 20;
        // Refund dash on kill
        this.player.dashes = Math.min(5, this.player.dashes + 1);
        for (let j = 0; j < 12; j++) {
          this.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
            life: 0.5, color: "#88ffaa"
          });
        }
        this.enemies.splice(i, 1);
        continue;
      }

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = enemy.type === "heavy" ? 35 : 50;

      enemy.vx += (dx / dist) * speed * dt * 3;
      enemy.vy += (dy / dist) * speed * dt * 3;
      enemy.vx *= 0.95;
      enemy.vy *= 0.95;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

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

    // Update wind slashes
    for (let i = this.windSlashes.length - 1; i >= 0; i--) {
      this.windSlashes[i].life -= dt;
      if (this.windSlashes[i].life <= 0) this.windSlashes.splice(i, 1);
    }

    // Update dash trail
    for (let i = this.dashTrail.length - 1; i >= 0; i--) {
      this.dashTrail[i].alpha -= dt * 4;
      if (this.dashTrail[i].alpha <= 0) this.dashTrail.splice(i, 1);
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
    ctx.fillStyle = "#0a1a10";
    ctx.fillRect(0, 0, this.width, this.height);

    // Dash trail
    for (const t of this.dashTrail) {
      ctx.globalAlpha = t.alpha * 0.5;
      ctx.fillStyle = "#88ffaa";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Wind slashes
    for (const slash of this.windSlashes) {
      ctx.globalAlpha = slash.life * 3;
      ctx.strokeStyle = "#aaffcc";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(slash.x - Math.cos(slash.angle) * slash.length / 2, slash.y - Math.sin(slash.angle) * slash.length / 2);
      ctx.lineTo(slash.x + Math.cos(slash.angle) * slash.length / 2, slash.y + Math.sin(slash.angle) * slash.length / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Enemies
    for (const enemy of this.enemies) {
      ctx.fillStyle = enemy.type === "heavy" ? "#666688" : "#aa4444";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    ctx.fillStyle = "#44cc77";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "#88ffaa";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#aaffcc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dash indicators
    for (let i = 0; i < this.player.dashes; i++) {
      ctx.fillStyle = "#88ffaa";
      ctx.beginPath();
      ctx.arc(this.player.x - 20 + i * 12, this.player.y - 25, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // UI
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 100, 12);
    ctx.fillStyle = this.player.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.player.health, 12);
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
    this.player.dashes = 3;
    this.status = "playing";
    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
