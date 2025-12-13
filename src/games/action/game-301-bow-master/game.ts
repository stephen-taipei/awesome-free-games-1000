/**
 * Bow Master Game Engine
 * Game #301
 *
 * Archery action with precision aiming!
 */

interface Archer {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  arrows: number;
  maxArrows: number;
  aimAngle: number;
  power: number;
  isAiming: boolean;
  state: "idle" | "aim" | "shoot" | "hit";
  stateTimer: number;
}

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  isEnemy: boolean;
  stuck: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  type: "soldier" | "archer" | "knight";
  facing: "left" | "right";
  state: "idle" | "walk" | "attack" | "hit" | "dead";
  stateTimer: number;
  attackTimer: number;
}

interface GameState {
  health: number;
  arrows: number;
  score: number;
  wave: number;
  status: "idle" | "playing" | "waveEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.3;
const MAX_POWER = 20;
const ARROW_DAMAGE = 25;
const HEADSHOT_MULTIPLIER = 2;

export class BowMasterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private archer: Archer;
  private enemies: Enemy[] = [];
  private arrows: Arrow[] = [];
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private isMouseDown = false;
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.archer = this.createArcher();
  }

  private createArcher(): Archer {
    return {
      x: 80,
      y: 0,
      width: 40,
      height: 70,
      health: 100,
      maxHealth: 100,
      arrows: 20,
      maxArrows: 20,
      aimAngle: 0,
      power: 0,
      isAiming: false,
      state: "idle",
      stateTimer: 0,
    };
  }

  private createEnemy(type: Enemy["type"], x: number): Enemy {
    const stats = {
      soldier: { health: 40, width: 35, height: 55 },
      archer: { health: 30, width: 30, height: 55 },
      knight: { health: 80, width: 45, height: 65 },
    };
    const s = stats[type];
    return {
      x,
      y: this.groundY - s.height,
      width: s.width,
      height: s.height,
      health: s.health + this.wave * 5,
      maxHealth: s.health + this.wave * 5,
      type,
      facing: "left",
      state: "idle",
      stateTimer: 0,
      attackTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: this.archer.health,
        arrows: this.archer.arrows,
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
    this.archer = this.createArcher();
    this.archer.y = this.groundY - this.archer.height;
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.enemies = [];
    this.arrows = [];

    const count = 3 + this.wave * 2;
    const types: Enemy["type"][] = ["soldier", "soldier", "archer"];
    if (this.wave >= 2) types.push("archer");
    if (this.wave >= 3) types.push("knight");

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const x = this.canvas.width + 50 + i * 100;
      this.enemies.push(this.createEnemy(type, x));
    }

    // Replenish arrows
    this.archer.arrows = Math.min(this.archer.maxArrows, this.archer.arrows + 10);
  }

  handleMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;

    if (this.archer.isAiming) {
      const dx = x - (this.archer.x + this.archer.width);
      const dy = y - (this.archer.y + 20);
      this.archer.aimAngle = Math.atan2(dy, dx);
      this.archer.aimAngle = Math.max(-Math.PI / 2, Math.min(0.3, this.archer.aimAngle));
    }
  }

  handleMouseDown() {
    if (this.status !== "playing") return;
    if (this.archer.arrows <= 0) return;

    this.isMouseDown = true;
    this.archer.isAiming = true;
    this.archer.state = "aim";
    this.archer.power = 0;
  }

  handleMouseUp() {
    if (!this.archer.isAiming) return;

    this.isMouseDown = false;
    this.archer.isAiming = false;

    if (this.archer.power > 3) {
      this.shootArrow();
    }

    this.archer.state = "idle";
    this.archer.power = 0;
  }

  private shootArrow() {
    const speed = this.archer.power;
    this.arrows.push({
      x: this.archer.x + this.archer.width,
      y: this.archer.y + 20,
      vx: Math.cos(this.archer.aimAngle) * speed,
      vy: Math.sin(this.archer.aimAngle) * speed,
      angle: this.archer.aimAngle,
      isEnemy: false,
      stuck: false,
    });
    this.archer.arrows--;
    this.archer.state = "shoot";
    this.archer.stateTimer = 10;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Power charge
    if (this.archer.isAiming && this.archer.power < MAX_POWER) {
      this.archer.power += 0.4;
    }

    // State timer
    if (this.archer.stateTimer > 0) {
      this.archer.stateTimer--;
      if (this.archer.stateTimer === 0) {
        this.archer.state = "idle";
      }
    }

    this.updateArrows();
    this.updateEnemies();
    this.checkCollisions();
    this.checkWaveEnd();
    this.emitState();
  }

  private updateArrows() {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      if (a.stuck) continue;

      a.vy += GRAVITY;
      a.x += a.vx;
      a.y += a.vy;
      a.angle = Math.atan2(a.vy, a.vx);

      // Ground collision
      if (a.y >= this.groundY) {
        a.y = this.groundY;
        a.stuck = true;
      }

      // Out of bounds
      if (a.x < -50 || a.x > this.canvas.width + 50 || a.y > this.canvas.height + 50) {
        this.arrows.splice(i, 1);
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
          e.state = "idle";
        }
      }

      const canMove = e.state === "idle" || e.state === "walk";
      const dx = this.archer.x - e.x;

      if (canMove) {
        if (e.type === "archer") {
          // Archers keep distance
          if (Math.abs(dx) > 300) {
            e.x += dx > 0 ? 1 : -1;
            e.state = "walk";
          } else {
            if (e.state === "walk") e.state = "idle";
          }

          // Shoot arrows
          e.attackTimer++;
          if (e.attackTimer >= 120) {
            e.attackTimer = 0;
            this.enemyShoot(e);
          }
        } else {
          // Soldiers and knights advance
          const speed = e.type === "knight" ? 1.5 : 2;
          if (Math.abs(dx) > 50) {
            e.x += dx > 0 ? speed : -speed;
            e.state = "walk";
          } else {
            if (e.state === "walk") e.state = "idle";
            // Attack
            e.attackTimer++;
            if (e.attackTimer >= 60) {
              e.attackTimer = 0;
              e.state = "attack";
              e.stateTimer = 20;
              const damage = e.type === "knight" ? 20 : 10;
              this.archer.health -= damage;
              this.archer.state = "hit";
              this.archer.stateTimer = 15;
            }
          }
        }
      }

      e.facing = dx > 0 ? "right" : "left";
    }
  }

  private enemyShoot(e: Enemy) {
    const dx = this.archer.x - e.x;
    const dy = this.archer.y + 20 - e.y - 20;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 8;

    // Add some prediction
    const time = dist / speed;
    const predictY = dy + GRAVITY * time * time * 0.3;

    const angle = Math.atan2(predictY, dx);

    this.arrows.push({
      x: e.x + (e.facing === "right" ? e.width : 0),
      y: e.y + 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      isEnemy: true,
      stuck: false,
    });
  }

  private checkCollisions() {
    // Player arrows hit enemies
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      if (a.isEnemy || a.stuck) continue;

      for (const e of this.enemies) {
        if (e.state === "dead") continue;

        if (
          a.x > e.x && a.x < e.x + e.width &&
          a.y > e.y && a.y < e.y + e.height
        ) {
          // Check headshot
          const isHeadshot = a.y < e.y + 15;
          const damage = ARROW_DAMAGE * (isHeadshot ? HEADSHOT_MULTIPLIER : 1);

          e.health -= damage;
          e.state = "hit";
          e.stateTimer = 10;

          if (e.health <= 0) {
            e.health = 0;
            e.state = "dead";
            this.score += (isHeadshot ? 50 : 25) * (e.type === "knight" ? 2 : 1);
          }

          a.stuck = true;
          break;
        }
      }
    }

    // Enemy arrows hit player
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      if (!a.isEnemy || a.stuck) continue;

      if (
        a.x > this.archer.x && a.x < this.archer.x + this.archer.width &&
        a.y > this.archer.y && a.y < this.archer.y + this.archer.height
      ) {
        this.archer.health -= 15;
        this.archer.state = "hit";
        this.archer.stateTimer = 15;
        this.arrows.splice(i, 1);
      }
    }

    // Game over check
    if (this.archer.health <= 0) {
      this.archer.health = 0;
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
    this.archer.health = Math.min(this.archer.maxHealth, this.archer.health + 20);
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

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(0.7, "#e0f0ff");
    gradient.addColorStop(1, "#98d8a0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Sun
    ctx.fillStyle = "#fff5d0";
    ctx.beginPath();
    ctx.arc(w - 80, 60, 30, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = "#4a7c59";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Draw arrows
    for (const a of this.arrows) {
      this.drawArrow(a);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw archer
    this.drawArcher();

    // Draw aim line
    if (this.archer.isAiming) {
      this.drawAimLine();
    }

    // UI
    this.drawUI();
  }

  private drawArcher() {
    const ctx = this.ctx;
    const a = this.archer;

    ctx.save();

    if (a.state === "hit" && Math.floor(a.stateTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(a.x + 5, a.y + 20, a.width - 10, a.height - 20);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(a.x + a.width / 2, a.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = "#1b5e20";
    ctx.beginPath();
    ctx.arc(a.x + a.width / 2, a.y + 8, 10, Math.PI, 0);
    ctx.fill();

    // Bow
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 3;
    const bowX = a.x + a.width;
    const bowY = a.y + 25;

    ctx.save();
    ctx.translate(bowX, bowY);
    ctx.rotate(a.isAiming ? a.aimAngle : 0);

    // Bow curve
    ctx.beginPath();
    ctx.arc(0, 0, 25, -0.8, 0.8);
    ctx.stroke();

    // String
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25 * Math.cos(-0.8), 25 * Math.sin(-0.8));
    if (a.isAiming) {
      const pullBack = a.power * 0.8;
      ctx.lineTo(-pullBack, 0);
    } else {
      ctx.lineTo(25, 0);
    }
    ctx.lineTo(25 * Math.cos(0.8), 25 * Math.sin(0.8));
    ctx.stroke();

    // Arrow on bow
    if (a.isAiming && a.arrows > 0) {
      const pullBack = a.power * 0.8;
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-pullBack, -1, 35 + pullBack, 2);
      ctx.fillStyle = "#c0c0c0";
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(40, -3);
      ctx.lineTo(40, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
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
      soldier: "#c0392b",
      archer: "#27ae60",
      knight: "#2c3e50",
    };

    // Body
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y + 15, e.width, e.height - 15);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Helmet for knight
    if (e.type === "knight") {
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + 6, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(e.x + e.width / 2 - 2, e.y, 4, 20);
    }

    // Weapon
    if (e.type === "archer") {
      ctx.strokeStyle = "#8b4513";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x + (e.facing === "right" ? e.width : 0), e.y + 25, 15, -0.6, 0.6);
      ctx.stroke();
    } else {
      // Sword/Axe
      ctx.fillStyle = "#c0c0c0";
      const wx = e.facing === "right" ? e.x + e.width : e.x - 20;
      ctx.fillRect(wx, e.y + 20, 20, 4);
    }

    // Health bar
    if (e.health < e.maxHealth && e.state !== "dead") {
      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 8, e.width, 5);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 8, e.width * (e.health / e.maxHealth), 5);
    }

    ctx.globalAlpha = 1;
  }

  private drawArrow(a: Arrow) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);

    // Shaft
    ctx.fillStyle = a.isEnemy ? "#8b0000" : "#8b4513";
    ctx.fillRect(-25, -1.5, 30, 3);

    // Head
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-2, -4);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    // Feathers
    ctx.fillStyle = a.isEnemy ? "#dc143c" : "#fff";
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(-30, -5);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-30, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawAimLine() {
    const ctx = this.ctx;
    const a = this.archer;

    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const startX = a.x + a.width;
    const startY = a.y + 25;
    const power = a.power;

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Draw trajectory prediction
    for (let t = 0; t < 30; t += 2) {
      const px = startX + Math.cos(a.aimAngle) * power * t;
      const py = startY + Math.sin(a.aimAngle) * power * t + GRAVITY * t * t * 0.5;
      if (py > this.groundY) break;
      ctx.lineTo(px, py);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 20, 150, 15);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(20, 20, 150 * (this.archer.health / this.archer.maxHealth), 15);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 15);

    // Arrow count
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Arrows: ${this.archer.arrows}`, 20, 55);

    // Score and wave
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.score}`, this.canvas.width - 20, 30);
    ctx.fillText(`Wave ${this.wave}`, this.canvas.width - 20, 50);
    ctx.textAlign = "left";

    // Power meter when aiming
    if (this.archer.isAiming) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(20, 70, 100, 10);
      const powerColor = this.archer.power > 15 ? "#e74c3c" : this.archer.power > 8 ? "#f39c12" : "#2ecc71";
      ctx.fillStyle = powerColor;
      ctx.fillRect(20, 70, 100 * (this.archer.power / MAX_POWER), 10);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
