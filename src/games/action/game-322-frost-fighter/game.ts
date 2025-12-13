/**
 * Frost Fighter Game
 * Game #322 - Ice magic combat with freeze and shatter mechanics
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
  mana: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  frozen: number;
  type: "basic" | "fire" | "ice";
}

interface IceShard extends Position {
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface GameState {
  score: number;
  mana: number;
  wave: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class FrostFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  private player: Player = { x: 0, y: 0, width: 35, height: 35, vx: 0, vy: 0, health: 100, mana: 100 };
  private enemies: Enemy[] = [];
  private iceShards: IceShard[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private snowflakes: { x: number; y: number; vy: number; size: number }[] = [];

  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private freezeCooldown = 0;

  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space" && this.status === "playing") {
        e.preventDefault();
        this.shatterFrozen();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    const handleFreeze = (x: number, y: number) => {
      if (this.status !== "playing" || this.freezeCooldown > 0 || this.player.mana < 15) return;
      this.castFreeze(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      handleFreeze((e.clientX - rect.left) / rect.width * this.width, (e.clientY - rect.top) / rect.height * this.height);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleFreeze((touch.clientX - rect.left) / rect.width * this.width, (touch.clientY - rect.top) / rect.height * this.height);
    });
  }

  private castFreeze(x: number, y: number) {
    this.player.mana -= 15;
    this.freezeCooldown = 0.3;

    const freezeRadius = 60;
    for (const enemy of this.enemies) {
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < freezeRadius && enemy.type !== "fire") {
        enemy.frozen = enemy.type === "ice" ? 1 : 3;
        for (let i = 0; i < 8; i++) {
          this.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100,
            life: 0.4, color: "#88ddff"
          });
        }
      }
    }

    // Freeze effect
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * freezeRadius;
      this.particles.push({
        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 50, vy: Math.sin(angle) * 50,
        life: 0.5, color: "#aaeeff"
      });
    }
    this.emitState();
  }

  private shatterFrozen() {
    if (this.player.mana < 10) return;

    let shattered = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.frozen > 0) {
        shattered = true;
        this.score += enemy.type === "ice" ? 15 : 25;

        // Shatter particles
        for (let j = 0; j < 20; j++) {
          this.iceShards.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300,
            size: 3 + Math.random() * 5, life: 1
          });
        }
        this.enemies.splice(i, 1);
      }
    }

    if (shattered) {
      this.player.mana -= 10;
      this.emitState();
    }
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({ score: this.score, mana: Math.floor(this.player.mana), wave: this.wave, status: this.status });
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

    // Initialize snowflakes
    this.snowflakes = [];
    for (let i = 0; i < 30; i++) {
      this.snowflakes.push({ x: Math.random() * size, y: Math.random() * size, vy: 20 + Math.random() * 30, size: 2 + Math.random() * 3 });
    }
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.status = "playing";
    this.enemies = [];
    this.iceShards = [];
    this.particles = [];
    this.freezeCooldown = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = 100;
    this.player.mana = 100;

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
      if (rand > 0.8) type = "fire";
      else if (rand > 0.6) type = "ice";

      this.enemies.push({ x, y, width: 25, height: 25, vx: 0, vy: 0, health: 2, frozen: 0, type });
    }
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.freezeCooldown = Math.max(0, this.freezeCooldown - dt);
    this.player.mana = Math.min(100, this.player.mana + dt * 8);

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
      if (enemy.frozen > 0) {
        enemy.frozen -= dt;
        continue;
      }

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = enemy.type === "fire" ? 70 : 50;

      enemy.vx += (dx / dist) * speed * dt * 3;
      enemy.vy += (dy / dist) * speed * dt * 3;
      enemy.vx *= 0.95;
      enemy.vy *= 0.95;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      if (dist < 30) {
        this.player.health -= enemy.type === "fire" ? 20 : 15;
        enemy.vx = -dx / dist * 100;
        enemy.vy = -dy / dist * 100;
        if (this.player.health <= 0) {
          this.status = "over";
          this.emitState();
          return;
        }
      }
    }

    // Update ice shards
    for (let i = this.iceShards.length - 1; i >= 0; i--) {
      const s = this.iceShards[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 200 * dt;
      s.life -= dt;
      if (s.life <= 0) this.iceShards.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update snowflakes
    for (const s of this.snowflakes) {
      s.y += s.vy * dt;
      if (s.y > this.height) { s.y = -10; s.x = Math.random() * this.width; }
    }

    if (this.enemies.length === 0) {
      this.status = "complete";
      this.emitState();
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a1a2a";
    ctx.fillRect(0, 0, this.width, this.height);

    // Snowflakes
    ctx.fillStyle = "rgba(200, 220, 255, 0.5)";
    for (const s of this.snowflakes) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ice shards
    ctx.fillStyle = "#aaddff";
    for (const s of this.iceShards) {
      ctx.globalAlpha = s.life;
      ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
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
      let color = "#44aa44";
      if (enemy.type === "fire") color = "#ff6644";
      if (enemy.type === "ice") color = "#88ccff";
      if (enemy.frozen > 0) color = "#aaddff";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.frozen > 0) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.width / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Player
    ctx.fillStyle = "#5bc0eb";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "#88ddff";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Health & Mana bars
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 100, 12);
    ctx.fillRect(10, 26, 100, 8);
    ctx.fillStyle = this.player.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.player.health, 12);
    ctx.fillStyle = "#4488ff";
    ctx.fillRect(10, 26, this.player.mana, 8);
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
    this.player.mana = 100;
    this.status = "playing";
    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
