/**
 * Shadow Clone Game
 * Game #316 - Create shadow clones to fight enemies
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
  facing: number; // 1 = right, -1 = left
}

interface Clone extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
  facing: number;
  alpha: number;
  lifetime: number;
  attacking: boolean;
  attackFrame: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "basic" | "fast" | "tank";
}

interface GameState {
  score: number;
  clones: number;
  wave: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class ShadowCloneGame {
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

  private clonesList: Clone[] = [];
  private enemies: Enemy[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  private score = 0;
  private clonesLeft = 3;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private cloneCooldown = 0;

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
        this.createClone();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (this.status !== "playing") return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.abs(dx) > 20) {
        this.keys["ArrowLeft"] = dx < 0;
        this.keys["ArrowRight"] = dx > 0;
      }
      if (Math.abs(dy) > 20) {
        this.keys["ArrowUp"] = dy < 0;
        this.keys["ArrowDown"] = dy > 0;
      }
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.keys["ArrowLeft"] = false;
      this.keys["ArrowRight"] = false;
      this.keys["ArrowUp"] = false;
      this.keys["ArrowDown"] = false;

      // Double tap to create clone
      if (this.status === "playing") {
        this.createClone();
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
        clones: this.clonesLeft,
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
    this.clonesLeft = 3;
    this.wave = 1;
    this.status = "playing";
    this.clonesList = [];
    this.enemies = [];
    this.particles = [];
    this.cloneCooldown = 0;

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
      case 0: // top
        x = Math.random() * this.width;
        y = -30;
        break;
      case 1: // right
        x = this.width + 30;
        y = Math.random() * this.height;
        break;
      case 2: // bottom
        x = Math.random() * this.width;
        y = this.height + 30;
        break;
      case 3: // left
        x = -30;
        y = Math.random() * this.height;
        break;
    }

    const types: Enemy["type"][] = ["basic", "fast", "tank"];
    const typeWeights = [0.6, 0.25, 0.15];
    const rand = Math.random();
    let type: Enemy["type"] = "basic";
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += typeWeights[i];
      if (rand < cumulative) {
        type = types[i];
        break;
      }
    }

    let health = 1;
    let width = 25;
    let height = 25;

    if (type === "fast") {
      health = 1;
      width = 20;
      height = 20;
    } else if (type === "tank") {
      health = 3;
      width = 35;
      height = 35;
    }

    this.enemies.push({
      x,
      y,
      width,
      height,
      vx: 0,
      health,
      maxHealth: health,
      type,
    });
  }

  private createClone() {
    if (this.clonesLeft <= 0 || this.cloneCooldown > 0) return;

    this.clonesLeft--;
    this.cloneCooldown = 0.3;

    const clone: Clone = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
      vx: this.player.facing * 200,
      vy: 0,
      facing: this.player.facing,
      alpha: 0.7,
      lifetime: 3,
      attacking: true,
      attackFrame: 0,
    };

    this.clonesList.push(clone);

    // Create spawn particles
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        life: 0.5,
        color: "#8b7cf7",
      });
    }

    this.emitState();
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.cloneCooldown = Math.max(0, this.cloneCooldown - dt);

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

    // Bounds
    this.player.x = Math.max(
      this.player.width / 2,
      Math.min(this.width - this.player.width / 2, this.player.x)
    );
    this.player.y = Math.max(
      this.player.height / 2,
      Math.min(this.height - this.player.height / 2, this.player.y)
    );

    // Update clones
    for (let i = this.clonesList.length - 1; i >= 0; i--) {
      const clone = this.clonesList[i];
      clone.lifetime -= dt;
      clone.alpha = Math.min(0.7, clone.lifetime / 3);
      clone.attackFrame += dt * 10;

      clone.x += clone.vx * dt;
      clone.y += clone.vy * dt;

      // Bounce off walls
      if (clone.x < clone.width / 2 || clone.x > this.width - clone.width / 2) {
        clone.vx *= -1;
        clone.facing *= -1;
      }
      if (clone.y < clone.height / 2 || clone.y > this.height - clone.height / 2) {
        clone.vy *= -1;
      }

      clone.x = Math.max(
        clone.width / 2,
        Math.min(this.width - clone.width / 2, clone.x)
      );
      clone.y = Math.max(
        clone.height / 2,
        Math.min(this.height - clone.height / 2, clone.y)
      );

      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (this.checkCollision(clone, enemy)) {
          enemy.health--;

          // Knockback
          const dx = enemy.x - clone.x;
          const dy = enemy.y - clone.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.x += (dx / dist) * 30;
          enemy.y += (dy / dist) * 30;

          // Hit particles
          for (let k = 0; k < 5; k++) {
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 150,
              vy: (Math.random() - 0.5) * 150,
              life: 0.3,
              color: "#ff6b6b",
            });
          }

          if (enemy.health <= 0) {
            this.score += enemy.type === "tank" ? 30 : enemy.type === "fast" ? 15 : 10;
            this.enemies.splice(j, 1);

            // Death particles
            for (let k = 0; k < 15; k++) {
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.5,
                color: "#ff4444",
              });
            }
          }

          clone.lifetime -= 0.5;
        }
      }

      if (clone.lifetime <= 0) {
        this.clonesList.splice(i, 1);
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      // Move towards player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      let enemySpeed = 60;
      if (enemy.type === "fast") enemySpeed = 100;
      if (enemy.type === "tank") enemySpeed = 40;

      enemy.x += (dx / dist) * enemySpeed * dt;
      enemy.y += (dy / dist) * enemySpeed * dt;

      // Check collision with player
      if (this.checkCollision(enemy, this.player)) {
        this.status = "over";
        this.emitState();
        return;
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
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid
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

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw enemies
    for (const enemy of this.enemies) {
      let color = "#ff4444";
      if (enemy.type === "fast") color = "#ff8844";
      if (enemy.type === "tank") color = "#aa4444";

      ctx.fillStyle = color;
      ctx.fillRect(
        enemy.x - enemy.width / 2,
        enemy.y - enemy.height / 2,
        enemy.width,
        enemy.height
      );

      // Health bar
      if (enemy.health < enemy.maxHealth) {
        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.height / 2 - 8, 30, 4);
        ctx.fillStyle = "#44ff44";
        ctx.fillRect(
          enemy.x - 15,
          enemy.y - enemy.height / 2 - 8,
          30 * (enemy.health / enemy.maxHealth),
          4
        );
      }

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(enemy.x - 5, enemy.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(enemy.x + 5, enemy.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw clones
    for (const clone of this.clonesList) {
      ctx.globalAlpha = clone.alpha;
      ctx.fillStyle = "#6b5ce7";

      // Body
      ctx.fillRect(
        clone.x - clone.width / 2,
        clone.y - clone.height / 2,
        clone.width,
        clone.height
      );

      // Attack effect
      if (clone.attacking) {
        const attackX = clone.x + clone.facing * 25;
        ctx.fillStyle = "#a0a0ff";
        ctx.beginPath();
        ctx.arc(attackX, clone.y, 10 + Math.sin(clone.attackFrame) * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(clone.x - 5 * clone.facing, clone.y - 5, 3, 0, Math.PI * 2);
      ctx.arc(clone.x + 3 * clone.facing, clone.y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw player
    ctx.fillStyle = "#4a90d9";
    ctx.fillRect(
      this.player.x - this.player.width / 2,
      this.player.y - this.player.height / 2,
      this.player.width,
      this.player.height
    );

    // Player eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      this.player.x - 5 * this.player.facing,
      this.player.y - 5,
      4,
      0,
      Math.PI * 2
    );
    ctx.arc(
      this.player.x + 3 * this.player.facing,
      this.player.y - 5,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Clone cooldown indicator
    if (this.cloneCooldown > 0 && this.clonesLeft > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y - 30);
      ctx.arc(
        this.player.x,
        this.player.y - 30,
        8,
        -Math.PI / 2,
        -Math.PI / 2 + (1 - this.cloneCooldown / 0.3) * Math.PI * 2
      );
      ctx.fill();
    }
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
    this.clonesLeft = Math.min(5, 3 + Math.floor(this.wave / 2));
    this.status = "playing";
    this.clonesList = [];
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
