/**
 * Boomerang Fighter Game Engine
 * Game #304
 *
 * Throw returning boomerangs to defeat enemies!
 */

interface Fighter {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  boomerangs: number;
  maxBoomerangs: number;
  state: "idle" | "throw" | "catch" | "hit";
  stateTimer: number;
}

interface Boomerang {
  x: number;
  y: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  rotation: number;
  phase: "out" | "return";
  distance: number;
  maxDistance: number;
  damage: number;
  hitEnemies: Set<Enemy>;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "runner" | "tank" | "flyer";
  state: "idle" | "move" | "hit" | "dead";
  stateTimer: number;
  floatOffset: number;
}

interface GameState {
  health: number;
  boomerangs: number;
  score: number;
  wave: number;
  status: "idle" | "playing" | "waveEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const BOOMERANG_SPEED = 12;
const BOOMERANG_DAMAGE = 20;
const MAX_DISTANCE = 250;

export class BoomerangGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Fighter;
  private enemies: Enemy[] = [];
  private boomerangs: Boomerang[] = [];
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Fighter {
    return {
      x: 100,
      y: 0,
      width: 40,
      height: 60,
      health: 100,
      maxHealth: 100,
      boomerangs: 3,
      maxBoomerangs: 3,
      state: "idle",
      stateTimer: 0,
    };
  }

  private createEnemy(type: Enemy["type"], x: number, y: number): Enemy {
    const stats = {
      runner: { health: 25, width: 30, height: 45, speed: 3 },
      tank: { health: 60, width: 45, height: 55, speed: 1.2 },
      flyer: { health: 20, width: 35, height: 35, speed: 2 },
    };
    const s = stats[type];
    return {
      x,
      y: type === "flyer" ? y : this.groundY - s.height,
      width: s.width,
      height: s.height,
      vx: -s.speed,
      health: s.health + this.wave * 3,
      maxHealth: s.health + this.wave * 3,
      type,
      state: "idle",
      stateTimer: 0,
      floatOffset: Math.random() * Math.PI * 2,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: this.player.health,
        boomerangs: this.player.boomerangs,
        score: this.score,
        wave: this.wave,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.groundY = this.canvas.height - 60;
    this.draw();
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.player = this.createPlayer();
    this.player.y = this.groundY - this.player.height;
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.enemies = [];
    this.boomerangs = [];
    this.player.boomerangs = this.player.maxBoomerangs;

    const count = 5 + this.wave * 2;
    const types: Enemy["type"][] = ["runner", "runner", "tank"];
    if (this.wave >= 2) types.push("flyer");

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const x = this.canvas.width + 50 + i * 100;
      const y = type === "flyer" ? 80 + Math.random() * 100 : 0;
      this.enemies.push(this.createEnemy(type, x, y));
    }
  }

  handleMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  handleClick() {
    if (this.status !== "playing") return;
    if (this.player.boomerangs <= 0) return;

    this.throwBoomerang();
  }

  private throwBoomerang() {
    const dx = this.mouseX - (this.player.x + this.player.width / 2);
    const dy = this.mouseY - (this.player.y + 30);
    const angle = Math.atan2(dy, dx);

    this.boomerangs.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y + 30,
      startX: this.player.x + this.player.width / 2,
      startY: this.player.y + 30,
      angle,
      speed: BOOMERANG_SPEED,
      rotation: 0,
      phase: "out",
      distance: 0,
      maxDistance: MAX_DISTANCE,
      damage: BOOMERANG_DAMAGE + this.wave * 2,
      hitEnemies: new Set(),
    });

    this.player.boomerangs--;
    this.player.state = "throw";
    this.player.stateTimer = 15;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // State timer
    if (this.player.stateTimer > 0) {
      this.player.stateTimer--;
      if (this.player.stateTimer === 0) {
        this.player.state = "idle";
      }
    }

    this.updateBoomerangs();
    this.updateEnemies();
    this.checkCollisions();
    this.checkWaveEnd();
    this.emitState();
  }

  private updateBoomerangs() {
    for (let i = this.boomerangs.length - 1; i >= 0; i--) {
      const b = this.boomerangs[i];
      b.rotation += 0.4;

      if (b.phase === "out") {
        b.x += Math.cos(b.angle) * b.speed;
        b.y += Math.sin(b.angle) * b.speed;
        b.distance += b.speed;

        // Start returning
        if (b.distance >= b.maxDistance) {
          b.phase = "return";
        }
      } else {
        // Return to player
        const dx = this.player.x + this.player.width / 2 - b.x;
        const dy = this.player.y + 30 - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
          // Caught!
          this.player.boomerangs++;
          this.player.state = "catch";
          this.player.stateTimer = 10;
          this.boomerangs.splice(i, 1);
          continue;
        }

        const returnAngle = Math.atan2(dy, dx);
        b.x += Math.cos(returnAngle) * b.speed * 1.2;
        b.y += Math.sin(returnAngle) * b.speed * 1.2;
      }

      // Out of bounds (lost boomerang)
      if (b.x < -100 || b.x > this.canvas.width + 100 ||
          b.y < -100 || b.y > this.canvas.height + 100) {
        this.boomerangs.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (e.state === "dead") continue;

      // State timer
      if (e.stateTimer > 0) {
        e.stateTimer--;
        if (e.stateTimer === 0 && e.state !== "dead") {
          e.state = "move";
        }
      }

      if (e.state !== "hit") {
        e.state = "move";
        e.x += e.vx;

        // Flyer movement
        if (e.type === "flyer") {
          e.floatOffset += 0.05;
          e.y = 80 + Math.sin(e.floatOffset) * 30;
        }

        // Attack player
        if (e.x < this.player.x + this.player.width + 10) {
          const damage = e.type === "tank" ? 20 : e.type === "flyer" ? 10 : 12;
          this.player.health -= damage;
          this.player.state = "hit";
          this.player.stateTimer = 20;
          e.x = this.canvas.width + 50;
        }
      }
    }
  }

  private checkCollisions() {
    for (const b of this.boomerangs) {
      for (const e of this.enemies) {
        if (e.state === "dead") continue;
        if (b.hitEnemies.has(e)) continue;

        if (
          b.x > e.x && b.x < e.x + e.width &&
          b.y > e.y && b.y < e.y + e.height
        ) {
          e.health -= b.damage;
          e.state = "hit";
          e.stateTimer = 15;
          e.x += 30;
          b.hitEnemies.add(e);

          if (e.health <= 0) {
            e.health = 0;
            e.state = "dead";
            const points = e.type === "tank" ? 50 : e.type === "flyer" ? 35 : 25;
            this.score += points;
          }
        }
      }
    }

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.gameOver();
    }
  }

  private checkWaveEnd() {
    const alive = this.enemies.filter((e) => e.state !== "dead").length;
    if (alive === 0) {
      this.status = "waveEnd";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextWave() {
    this.wave++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#f39c12");
    gradient.addColorStop(0.4, "#e67e22");
    gradient.addColorStop(1, "#d35400");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Sun
    ctx.fillStyle = "#fff5d0";
    ctx.beginPath();
    ctx.arc(w - 100, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Draw boomerangs
    for (const b of this.boomerangs) {
      this.drawBoomerang(b);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw player
    this.drawPlayer();

    // UI
    this.drawUI();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();

    if (p.state === "hit" && Math.floor(p.stateTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(p.x + 5, p.y + 18, p.width - 10, p.height - 18);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(p.x + 5, p.y + 8, p.width - 10, 6);

    // Arm
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width - 5, p.y + 30);
    if (p.state === "throw") {
      ctx.lineTo(p.x + p.width + 25, p.y + 15);
    } else if (p.state === "catch") {
      ctx.lineTo(p.x + p.width + 20, p.y + 30);
    } else {
      ctx.lineTo(p.x + p.width + 10, p.y + 40);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawBoomerang(b: Boomerang) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    // Boomerang shape
    ctx.fillStyle = "#f1c40f";
    ctx.strokeStyle = "#d68910";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.quadraticCurveTo(15, -10, 20, 0);
    ctx.quadraticCurveTo(15, 5, 0, 0);
    ctx.quadraticCurveTo(-15, 5, -20, 0);
    ctx.quadraticCurveTo(-15, -10, 0, -15);
    ctx.fill();
    ctx.stroke();

    // Motion blur effect
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.state === "dead") {
      ctx.globalAlpha = 0.3;
    } else if (e.state === "hit") {
      ctx.globalAlpha = 0.7;
    }

    const colors = {
      runner: "#27ae60",
      tank: "#8e44ad",
      flyer: "#3498db",
    };

    ctx.fillStyle = colors[e.type];

    if (e.type === "flyer") {
      // Wings
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2 + 10, e.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Face
    ctx.fillStyle = "#ecf0f1";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + e.height * 0.25, e.height * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(e.x + e.width * 0.35, e.y + e.height * 0.22, 3, 0, Math.PI * 2);
    ctx.arc(e.x + e.width * 0.65, e.y + e.height * 0.22, 3, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    if (e.health < e.maxHealth && e.state !== "dead") {
      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, e.width, 6);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, e.width * (e.health / e.maxHealth), 6);
    }

    ctx.globalAlpha = 1;
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 20, 150, 15);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(20, 20, 150 * (this.player.health / this.player.maxHealth), 15);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 15);

    // Boomerang count
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Boomerangs: ${this.player.boomerangs}`, 20, 55);

    // Score and wave
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.score}`, this.canvas.width - 20, 30);
    ctx.fillText(`Wave ${this.wave}`, this.canvas.width - 20, 50);
    ctx.textAlign = "left";
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
