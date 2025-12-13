/**
 * Earth Mage Game
 * Game #325 - Earth magic combat with boulders
 */

interface Position { x: number; y: number; }

interface Player extends Position {
  width: number; height: number; vx: number; vy: number; health: number; mana: number;
}

interface Enemy extends Position {
  width: number; height: number; vx: number; vy: number; health: number; type: "basic" | "armored" | "flying";
}

interface Boulder extends Position {
  vx: number; vy: number; size: number; life: number;
}

interface Wall extends Position {
  width: number; height: number; life: number;
}

interface GameState {
  score: number; mana: number; wave: number; status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class EarthMageGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  private player: Player = { x: 0, y: 0, width: 35, height: 35, vx: 0, vy: 0, health: 100, mana: 100 };
  private enemies: Enemy[] = [];
  private boulders: Boulder[] = [];
  private walls: Wall[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];

  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private castCooldown = 0;

  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space" && this.status === "playing" && this.player.mana >= 30) {
        e.preventDefault();
        this.createWall();
      }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    const handleBoulder = (x: number, y: number) => {
      if (this.status !== "playing" || this.castCooldown > 0 || this.player.mana < 20) return;
      this.summonBoulder(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      handleBoulder((e.clientX - rect.left) / rect.width * this.width, (e.clientY - rect.top) / rect.height * this.height);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleBoulder((touch.clientX - rect.left) / rect.width * this.width, (touch.clientY - rect.top) / rect.height * this.height);
    });
  }

  private summonBoulder(targetX: number, targetY: number) {
    this.player.mana -= 20;
    this.castCooldown = 0.3;

    // Boulder falls from above target
    this.boulders.push({
      x: targetX, y: -30,
      vx: 0, vy: 300,
      size: 25, life: 3
    });

    // Dust particles
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 50,
        life: 0.4, color: "#8b7355", size: 4
      });
    }
  }

  private createWall() {
    this.player.mana -= 30;

    // Create wall in front of player
    const dx = this.keys["ArrowRight"] || this.keys["KeyD"] ? 1 : this.keys["ArrowLeft"] || this.keys["KeyA"] ? -1 : 0;
    const dy = this.keys["ArrowDown"] || this.keys["KeyS"] ? 1 : this.keys["ArrowUp"] || this.keys["KeyW"] ? -1 : 0;

    const wallX = this.player.x + (dx !== 0 ? dx * 50 : 0);
    const wallY = this.player.y + (dy !== 0 ? dy * 50 : 0);

    this.walls.push({
      x: wallX, y: wallY,
      width: dx !== 0 ? 20 : 60,
      height: dx !== 0 ? 60 : 20,
      life: 5
    });

    // Ground burst
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: wallX, y: wallY,
        vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
        life: 0.4, color: "#6b5335", size: 5
      });
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
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.status = "playing";
    this.enemies = [];
    this.boulders = [];
    this.walls = [];
    this.particles = [];
    this.castCooldown = 0;

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
      if (rand > 0.75) type = "armored";
      else if (rand > 0.5) type = "flying";

      this.enemies.push({
        x, y, width: type === "armored" ? 35 : 25, height: type === "armored" ? 35 : 25,
        vx: 0, vy: 0, health: type === "armored" ? 4 : 2, type
      });
    }
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.castCooldown = Math.max(0, this.castCooldown - dt);
    this.player.mana = Math.min(100, this.player.mana + dt * 10);

    // Update player
    const speed = 130;
    let tx = 0, ty = 0;
    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) tx = -speed;
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) tx = speed;
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) ty = -speed;
    if (this.keys["ArrowDown"] || this.keys["KeyS"]) ty = speed;

    this.player.vx += (tx - this.player.vx) * 0.2;
    this.player.vy += (ty - this.player.vy) * 0.2;

    let newX = this.player.x + this.player.vx * dt;
    let newY = this.player.y + this.player.vy * dt;

    // Wall collision for player
    for (const wall of this.walls) {
      if (this.boxCollision(newX - 15, newY - 15, 30, 30, wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height)) {
        newX = this.player.x;
        newY = this.player.y;
      }
    }

    this.player.x = Math.max(20, Math.min(this.width - 20, newX));
    this.player.y = Math.max(20, Math.min(this.height - 20, newY));

    // Update boulders
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i];
      b.y += b.vy * dt;
      b.life -= dt;

      // Landing effect
      if (b.y > this.height - b.size && b.vy > 0) {
        b.y = this.height - b.size;
        b.vy = -b.vy * 0.3;

        // Impact particles
        for (let j = 0; j < 15; j++) {
          this.particles.push({
            x: b.x, y: b.y,
            vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 100,
            life: 0.4, color: "#8b7355", size: 5
          });
        }
      }

      // Hit enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (enemy.type === "flying") continue; // Flying enemies dodge boulders

        const dx = enemy.x - b.x;
        const dy = enemy.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < b.size + enemy.width / 2) {
          enemy.health -= 2;
          for (let k = 0; k < 8; k++) {
            this.particles.push({
              x: enemy.x, y: enemy.y,
              vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
              life: 0.3, color: "#aa8866", size: 4
            });
          }
        }
      }

      if (b.life <= 0) this.boulders.splice(i, 1);
    }

    // Update walls
    for (let i = this.walls.length - 1; i >= 0; i--) {
      this.walls[i].life -= dt;
      if (this.walls[i].life <= 0) this.walls.splice(i, 1);
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.health <= 0) {
        this.score += enemy.type === "armored" ? 30 : 20;
        for (let j = 0; j < 12; j++) {
          this.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
            life: 0.5, color: "#cc9966", size: 5
          });
        }
        this.enemies.splice(i, 1);
        continue;
      }

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = enemy.type === "flying" ? 70 : 45;

      enemy.vx += (dx / dist) * speed * dt * 3;
      enemy.vy += (dy / dist) * speed * dt * 3;

      // Wall collision for enemies
      let blocked = false;
      for (const wall of this.walls) {
        if (this.boxCollision(enemy.x - 10 + enemy.vx * dt, enemy.y - 10 + enemy.vy * dt, 20, 20,
            wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height)) {
          blocked = true;
          enemy.health -= dt * 2; // Take damage from wall
        }
      }

      if (!blocked || enemy.type === "flying") {
        enemy.vx *= 0.95;
        enemy.vy *= 0.95;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

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
      p.vy += 100 * dt; // Gravity
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.enemies.length === 0) {
      this.status = "complete";
      this.emitState();
    }
    this.emitState();
  }

  private boxCollision(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#1a1510";
    ctx.fillRect(0, 0, this.width, this.height);

    // Ground texture
    ctx.fillStyle = "rgba(100, 80, 60, 0.1)";
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc((i * 50 + 25) % this.width, ((i * 37 + 20) % this.height), 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Walls
    for (const wall of this.walls) {
      ctx.fillStyle = `rgba(107, 83, 53, ${wall.life / 5})`;
      ctx.fillRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
      ctx.strokeStyle = "#8b7355";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Boulders
    for (const b of this.boulders) {
      ctx.fillStyle = "#6b5335";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8b7355";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Enemies
    for (const enemy of this.enemies) {
      let color = "#aa4444";
      if (enemy.type === "armored") color = "#666666";
      if (enemy.type === "flying") color = "#8888aa";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.type === "flying") {
        ctx.strokeStyle = "#aaaacc";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.width / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Player
    ctx.fillStyle = "#8b7355";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#cc9966";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();

    // UI
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 100, 12);
    ctx.fillRect(10, 26, 100, 8);
    ctx.fillStyle = this.player.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.player.health, 12);
    ctx.fillStyle = "#8b7355";
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
    this.walls = [];
    this.status = "playing";
    this.spawnWave();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
