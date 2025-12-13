/**
 * Magnet Hero Game
 * Game #320 - Use magnetic forces to defeat enemies
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
  polarity: 1 | -1; // 1 = positive (red), -1 = negative (blue)
  health: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  vx: number;
  vy: number;
  polarity: 1 | -1;
  health: number;
  type: "basic" | "strong" | "neutral";
}

interface MetalObject extends Position {
  vx: number;
  vy: number;
  size: number;
}

interface GameState {
  score: number;
  polarity: string;
  wave: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class MagnetHeroGame {
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
    polarity: 1,
    health: 100,
  };

  private enemies: Enemy[] = [];
  private metalObjects: MetalObject[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private magneticLines: { x1: number; y1: number; x2: number; y2: number; alpha: number }[] = [];

  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private polarityCooldown = 0;

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
        this.switchPolarity();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener("click", () => {
      if (this.status === "playing") {
        this.switchPolarity();
      }
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.status === "playing") {
        this.switchPolarity();
      }
    });
  }

  private switchPolarity() {
    if (this.polarityCooldown > 0) return;

    this.player.polarity = this.player.polarity === 1 ? -1 : 1;
    this.polarityCooldown = 0.3;

    // Switch particles
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.4,
        color: this.player.polarity === 1 ? "#ff4444" : "#4444ff",
      });
    }

    this.emitState();
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        polarity: this.player.polarity === 1 ? "+" : "-",
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
    this.metalObjects = [];
    this.particles = [];
    this.magneticLines = [];
    this.polarityCooldown = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.polarity = 1;
    this.player.health = 100;

    this.spawnWave();
    this.spawnMetalObjects();
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
    const margin = 50;
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
    let polarity: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    let health = 1;
    let size = 25;

    if (rand > 0.8) {
      type = "strong";
      health = 3;
      size = 35;
    } else if (rand > 0.6) {
      type = "neutral";
      polarity = 1; // Neutral enemies are always attracted
      health = 2;
      size = 30;
    }

    this.enemies.push({
      x, y,
      width: size,
      height: size,
      vx: 0,
      vy: 0,
      polarity,
      health,
      type,
    });
  }

  private spawnMetalObjects() {
    const count = 5 + this.wave;
    for (let i = 0; i < count; i++) {
      const margin = 60;
      this.metalObjects.push({
        x: margin + Math.random() * (this.width - margin * 2),
        y: margin + Math.random() * (this.height - margin * 2),
        vx: 0,
        vy: 0,
        size: 15 + Math.random() * 10,
      });
    }
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.polarityCooldown = Math.max(0, this.polarityCooldown - dt);

    // Update player movement
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

    // Clear magnetic lines
    this.magneticLines = [];

    // Update metal objects with magnetic force
    for (const metal of this.metalObjects) {
      const dx = this.player.x - metal.x;
      const dy = this.player.y - metal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200 && dist > 10) {
        const force = 5000 / (dist * dist);
        // Metal is always attracted (positive interaction)
        metal.vx += (dx / dist) * force * this.player.polarity * dt;
        metal.vy += (dy / dist) * force * this.player.polarity * dt;

        // Add magnetic line
        if (Math.random() > 0.7) {
          this.magneticLines.push({
            x1: this.player.x,
            y1: this.player.y,
            x2: metal.x,
            y2: metal.y,
            alpha: 1 - dist / 200,
          });
        }
      }

      metal.vx *= 0.95;
      metal.vy *= 0.95;
      metal.x += metal.vx * dt;
      metal.y += metal.vy * dt;

      // Bounds
      if (metal.x < metal.size) { metal.x = metal.size; metal.vx *= -0.5; }
      if (metal.x > this.width - metal.size) { metal.x = this.width - metal.size; metal.vx *= -0.5; }
      if (metal.y < metal.size) { metal.y = metal.size; metal.vy *= -0.5; }
      if (metal.y > this.height - metal.size) { metal.y = this.height - metal.size; metal.vy *= -0.5; }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Magnetic interaction with player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        const interaction = enemy.type === "neutral" ? -1 : this.player.polarity * enemy.polarity;
        // Same polarity repels, opposite attracts
        const force = 3000 / (dist * dist) * -interaction;

        enemy.vx += (dx / dist) * force * dt;
        enemy.vy += (dy / dist) * force * dt;

        // Add magnetic line
        if (Math.random() > 0.8) {
          this.magneticLines.push({
            x1: this.player.x,
            y1: this.player.y,
            x2: enemy.x,
            y2: enemy.y,
            alpha: (1 - dist / 200) * 0.5,
          });
        }
      }

      // Also move towards player slowly
      if (dist > 50) {
        enemy.vx += (dx / dist) * 30 * dt;
        enemy.vy += (dy / dist) * 30 * dt;
      }

      enemy.vx *= 0.97;
      enemy.vy *= 0.97;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Check collision with metal objects
      for (let j = this.metalObjects.length - 1; j >= 0; j--) {
        const metal = this.metalObjects[j];
        const mdx = enemy.x - metal.x;
        const mdy = enemy.y - metal.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

        const metalSpeed = Math.sqrt(metal.vx * metal.vx + metal.vy * metal.vy);

        if (mDist < enemy.width / 2 + metal.size && metalSpeed > 50) {
          enemy.health--;

          // Hit particles
          for (let k = 0; k < 10; k++) {
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 200,
              vy: (Math.random() - 0.5) * 200,
              life: 0.3,
              color: "#ffaa00",
            });
          }

          // Bounce metal
          metal.vx *= -0.5;
          metal.vy *= -0.5;

          if (enemy.health <= 0) {
            this.score += enemy.type === "strong" ? 30 : enemy.type === "neutral" ? 20 : 10;

            for (let k = 0; k < 15; k++) {
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 0.5,
                color: enemy.polarity === 1 ? "#ff4444" : "#4444ff",
              });
            }

            this.enemies.splice(i, 1);
            break;
          }
        }
      }

      // Check if still in array (might have been removed)
      if (!this.enemies[i]) continue;

      // Bounds - enemies bounce
      if (enemy.x < enemy.width / 2) { enemy.x = enemy.width / 2; enemy.vx *= -0.5; }
      if (enemy.x > this.width - enemy.width / 2) { enemy.x = this.width - enemy.width / 2; enemy.vx *= -0.5; }
      if (enemy.y < enemy.height / 2) { enemy.y = enemy.height / 2; enemy.vy *= -0.5; }
      if (enemy.y > this.height - enemy.height / 2) { enemy.y = this.height - enemy.height / 2; enemy.vy *= -0.5; }

      // Check collision with player
      if (dist < (enemy.width + this.player.width) / 2) {
        this.player.health -= 10;

        // Knockback
        this.player.vx += (dx < 0 ? -1 : 1) * 200;
        this.player.vy += (dy < 0 ? -1 : 1) * 200;

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
    ctx.fillStyle = "#1a0a08";
    ctx.fillRect(0, 0, this.width, this.height);

    // Magnetic field effect
    const gradient = ctx.createRadialGradient(
      this.player.x, this.player.y, 0,
      this.player.x, this.player.y, 150
    );
    const fieldColor = this.player.polarity === 1 ? "rgba(255, 50, 50, 0.1)" : "rgba(50, 50, 255, 0.1)";
    gradient.addColorStop(0, fieldColor);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, 150, 0, Math.PI * 2);
    ctx.fill();

    // Draw magnetic lines
    for (const line of this.magneticLines) {
      ctx.strokeStyle = `rgba(200, 200, 255, ${line.alpha * 0.3})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw metal objects
    for (const metal of this.metalObjects) {
      ctx.fillStyle = "#888";
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(metal.x, metal.y, metal.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(metal.x - metal.size * 0.3, metal.y - metal.size * 0.3, metal.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      const color = enemy.type === "neutral" ? "#888" : (enemy.polarity === 1 ? "#ff4444" : "#4444ff");

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Polarity symbol
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${enemy.width * 0.5}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(enemy.type === "neutral" ? "N" : (enemy.polarity === 1 ? "+" : "-"), enemy.x, enemy.y);

      // Health bar for strong enemies
      if (enemy.type === "strong") {
        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x - 20, enemy.y - enemy.height / 2 - 10, 40, 5);
        ctx.fillStyle = "#44ff44";
        ctx.fillRect(enemy.x - 20, enemy.y - enemy.height / 2 - 10, 40 * (enemy.health / 3), 5);
      }
    }

    // Draw player
    const playerColor = this.player.polarity === 1 ? "#ff6644" : "#4466ff";
    ctx.fillStyle = playerColor;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Player glow
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Polarity symbol
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.player.polarity === 1 ? "+" : "-", this.player.x, this.player.y);

    // Cooldown indicator
    if (this.polarityCooldown > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.arc(
        this.player.x, this.player.y, this.player.width / 2 + 10,
        -Math.PI / 2,
        -Math.PI / 2 + (1 - this.polarityCooldown / 0.3) * Math.PI * 2
      );
      ctx.fill();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = this.player.health > 30 ? "#44ff44" : "#ff4444";
    ctx.fillRect(10, 10, this.player.health, 15);
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
    this.player.health = Math.min(100, this.player.health + 30);
    this.status = "playing";
    this.metalObjects = [];
    this.spawnWave();
    this.spawnMetalObjects();
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
