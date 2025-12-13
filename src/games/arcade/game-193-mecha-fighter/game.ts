/**
 * Mecha Fighter Game Engine
 * Game #193
 *
 * 2D fighting game with giant mechas!
 */

interface Mecha {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  direction: 1 | -1;
  isPlayer: boolean;
  state: "idle" | "walk" | "punch" | "kick" | "hit" | "block";
  stateTimer: number;
  color: string;
  attackCooldown: number;
}

interface Effect {
  x: number;
  y: number;
  type: "hit" | "spark";
  life: number;
}

interface GameState {
  playerHealth: number;
  enemyHealth: number;
  round: number;
  status: "idle" | "playing" | "roundWon" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

export class MechaFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Mecha | null = null;
  private enemy: Mecha | null = null;
  private effects: Effect[] = [];
  private round = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange && this.player && this.enemy) {
      this.onStateChange({
        playerHealth: this.player.health,
        enemyHealth: this.enemy.health,
        round: this.round,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.groundY = size * 0.85;
    this.draw();
  }

  start() {
    const w = this.canvas.width;

    this.player = this.createMecha(w * 0.25, true, "#3498db");
    this.enemy = this.createMecha(w * 0.75, false, "#e74c3c");
    this.enemy.direction = -1;

    this.effects = [];
    this.round = 1;
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  nextRound() {
    if (!this.player || !this.enemy) return;

    this.round++;
    this.player.health = this.player.maxHealth;
    this.player.x = this.canvas.width * 0.25;
    this.player.state = "idle";

    this.enemy.health = 80 + this.round * 20;
    this.enemy.maxHealth = this.enemy.health;
    this.enemy.x = this.canvas.width * 0.75;
    this.enemy.state = "idle";

    this.effects = [];
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private createMecha(x: number, isPlayer: boolean, color: string): Mecha {
    return {
      x,
      y: this.groundY,
      health: 100,
      maxHealth: 100,
      direction: 1,
      isPlayer,
      state: "idle",
      stateTimer: 0,
      color,
      attackCooldown: 0,
    };
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  punch() {
    if (!this.player || this.status !== "playing") return;
    if (this.player.attackCooldown > 0 || this.player.state !== "idle") return;

    this.player.state = "punch";
    this.player.stateTimer = 20;
    this.player.attackCooldown = 30;
  }

  kick() {
    if (!this.player || this.status !== "playing") return;
    if (this.player.attackCooldown > 0 || this.player.state !== "idle") return;

    this.player.state = "kick";
    this.player.stateTimer = 25;
    this.player.attackCooldown = 35;
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    if (!this.player || !this.enemy) return;

    const w = this.canvas.width;
    const speed = 4;

    // Handle player input
    if (this.player.state === "idle" || this.player.state === "walk") {
      if (this.keys.has("a") || this.keys.has("A") || this.keys.has("ArrowLeft")) {
        this.player.x -= speed;
        this.player.direction = -1;
        this.player.state = "walk";
      } else if (this.keys.has("d") || this.keys.has("D") || this.keys.has("ArrowRight")) {
        this.player.x += speed;
        this.player.direction = 1;
        this.player.state = "walk";
      } else if (this.player.state === "walk") {
        this.player.state = "idle";
      }

      if (this.keys.has("j") || this.keys.has("J")) {
        this.punch();
      }
      if (this.keys.has("k") || this.keys.has("K")) {
        this.kick();
      }
    }

    // Keep player in bounds
    this.player.x = Math.max(50, Math.min(w - 50, this.player.x));

    // Update player state
    if (this.player.stateTimer > 0) {
      this.player.stateTimer--;
      if (this.player.stateTimer === 0) {
        this.player.state = "idle";
      }
    }
    if (this.player.attackCooldown > 0) {
      this.player.attackCooldown--;
    }

    // Check player attack hit
    if ((this.player.state === "punch" && this.player.stateTimer === 15) ||
        (this.player.state === "kick" && this.player.stateTimer === 18)) {
      const attackRange = this.player.state === "kick" ? 80 : 60;
      const dx = this.enemy.x - this.player.x;

      if (Math.abs(dx) < attackRange && Math.sign(dx) === this.player.direction) {
        const damage = this.player.state === "kick" ? 15 : 10;
        this.enemy.health -= damage;
        this.enemy.state = "hit";
        this.enemy.stateTimer = 15;

        this.effects.push({
          x: this.enemy.x,
          y: this.groundY - 80,
          type: "hit",
          life: 15,
        });

        this.emitState();
      }
    }

    // Enemy AI
    this.updateEnemyAI();

    // Check enemy attack hit
    if ((this.enemy.state === "punch" && this.enemy.stateTimer === 15) ||
        (this.enemy.state === "kick" && this.enemy.stateTimer === 18)) {
      const attackRange = this.enemy.state === "kick" ? 80 : 60;
      const dx = this.player.x - this.enemy.x;

      if (Math.abs(dx) < attackRange && Math.sign(dx) === this.enemy.direction) {
        const damage = this.enemy.state === "kick" ? 12 : 8;
        this.player.health -= damage;
        this.player.state = "hit";
        this.player.stateTimer = 15;

        this.effects.push({
          x: this.player.x,
          y: this.groundY - 80,
          type: "hit",
          life: 15,
        });

        this.emitState();
      }
    }

    // Update enemy state
    if (this.enemy.stateTimer > 0) {
      this.enemy.stateTimer--;
      if (this.enemy.stateTimer === 0) {
        this.enemy.state = "idle";
      }
    }
    if (this.enemy.attackCooldown > 0) {
      this.enemy.attackCooldown--;
    }

    // Update effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life--;
      if (this.effects[i].life <= 0) {
        this.effects.splice(i, 1);
      }
    }

    // Check win/lose
    if (this.enemy.health <= 0) {
      if (this.round >= 3) {
        this.status = "won";
      } else {
        this.status = "roundWon";
      }
      this.emitState();
    } else if (this.player.health <= 0) {
      this.status = "over";
      this.emitState();
    }
  }

  private updateEnemyAI() {
    if (!this.player || !this.enemy) return;
    if (this.enemy.state !== "idle") return;

    const dx = this.player.x - this.enemy.x;
    this.enemy.direction = dx > 0 ? 1 : -1;

    const distance = Math.abs(dx);

    // Move toward player
    if (distance > 100) {
      this.enemy.x += this.enemy.direction * 2;
      this.enemy.state = "walk";
      this.enemy.stateTimer = 1;
    } else if (distance > 60 && Math.random() < 0.02) {
      this.enemy.x += this.enemy.direction * 2;
    }

    // Attack when close
    if (distance < 80 && this.enemy.attackCooldown === 0 && Math.random() < 0.05) {
      if (Math.random() > 0.5) {
        this.enemy.state = "punch";
        this.enemy.stateTimer = 20;
        this.enemy.attackCooldown = 40;
      } else {
        this.enemy.state = "kick";
        this.enemy.stateTimer = 25;
        this.enemy.attackCooldown = 50;
      }
    }
  }

  movePlayer(direction: "left" | "right") {
    if (!this.player || this.status !== "playing") return;
    if (this.player.state !== "idle" && this.player.state !== "walk") return;

    const speed = 6;
    if (direction === "left") {
      this.player.x -= speed;
      this.player.direction = -1;
    } else {
      this.player.x += speed;
      this.player.direction = 1;
    }
    this.player.x = Math.max(50, Math.min(this.canvas.width - 50, this.player.x));
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(1, "#16213e");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Grid lines (futuristic effect)
    ctx.strokeStyle = "rgba(52, 152, 219, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Ground line
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();

    // Draw effects
    for (const effect of this.effects) {
      this.drawEffect(effect);
    }

    // Draw mechas
    if (this.enemy) this.drawMecha(this.enemy);
    if (this.player) this.drawMecha(this.player);

    // Health bars
    this.drawHealthBars();
  }

  private drawMecha(mecha: Mecha) {
    const ctx = this.ctx;
    const x = mecha.x;
    const y = mecha.y;
    const scale = mecha.isPlayer ? 1 : 0.9 + this.round * 0.05;

    ctx.save();
    ctx.translate(x, y);
    if (mecha.direction === -1) {
      ctx.scale(-1, 1);
    }

    // Flash when hit
    if (mecha.state === "hit" && mecha.stateTimer % 4 < 2) {
      ctx.globalAlpha = 0.5;
    }

    const bodyColor = mecha.color;
    const darkColor = this.darkenColor(bodyColor, 30);

    // Legs
    const legOffset = mecha.state === "walk" ? Math.sin(Date.now() / 100) * 5 : 0;

    ctx.fillStyle = darkColor;
    // Left leg
    ctx.fillRect(-25 * scale + legOffset, -30 * scale, 15 * scale, 30 * scale);
    ctx.fillRect(-30 * scale + legOffset, -5 * scale, 25 * scale, 8 * scale);
    // Right leg
    ctx.fillRect(10 * scale - legOffset, -30 * scale, 15 * scale, 30 * scale);
    ctx.fillRect(5 * scale - legOffset, -5 * scale, 25 * scale, 8 * scale);

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-30 * scale, -90 * scale, 60 * scale, 60 * scale);

    // Chest detail
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(-20 * scale, -80 * scale);
    ctx.lineTo(0, -60 * scale);
    ctx.lineTo(20 * scale, -80 * scale);
    ctx.closePath();
    ctx.fill();

    // Cockpit/head
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(-15 * scale, -115 * scale, 30 * scale, 25 * scale);

    // Visor
    ctx.fillStyle = mecha.isPlayer ? "#3498db" : "#e74c3c";
    ctx.fillRect(-12 * scale, -110 * scale, 24 * scale, 10 * scale);

    // Arms
    const armAngle = mecha.state === "punch" ? 0.8 : mecha.state === "kick" ? -0.3 : 0;

    ctx.save();
    ctx.translate(-30 * scale, -75 * scale);
    ctx.rotate(-0.2 + armAngle);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(0, 0, -40 * scale, 15 * scale);
    // Fist
    ctx.fillStyle = darkColor;
    ctx.fillRect(-45 * scale, -3 * scale, 15 * scale, 20 * scale);
    ctx.restore();

    // Right arm (attack arm)
    ctx.save();
    ctx.translate(30 * scale, -75 * scale);

    if (mecha.state === "punch") {
      ctx.rotate(-0.5);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(0, 0, 50 * scale, 15 * scale);
      ctx.fillStyle = darkColor;
      ctx.fillRect(45 * scale, -3 * scale, 20 * scale, 20 * scale);
    } else if (mecha.state === "kick") {
      ctx.rotate(0.2);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(0, 0, 35 * scale, 15 * scale);
      ctx.fillStyle = darkColor;
      ctx.fillRect(30 * scale, -3 * scale, 15 * scale, 20 * scale);
    } else {
      ctx.rotate(0.2);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(0, 0, 35 * scale, 15 * scale);
      ctx.fillStyle = darkColor;
      ctx.fillRect(30 * scale, -3 * scale, 15 * scale, 20 * scale);
    }
    ctx.restore();

    // Kick leg extension
    if (mecha.state === "kick") {
      ctx.fillStyle = darkColor;
      ctx.save();
      ctx.translate(20 * scale, -20 * scale);
      ctx.rotate(-0.3);
      ctx.fillRect(0, 0, 50 * scale, 12 * scale);
      ctx.fillRect(45 * scale, -2 * scale, 15 * scale, 16 * scale);
      ctx.restore();
    }

    // Shoulder pads
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(-35 * scale, -80 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.arc(35 * scale, -80 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawEffect(effect: Effect) {
    const ctx = this.ctx;

    if (effect.type === "hit") {
      const size = (15 - effect.life) * 3;
      ctx.strokeStyle = `rgba(255, 200, 0, ${effect.life / 15})`;
      ctx.lineWidth = 3;

      // Starburst
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        ctx.lineTo(
          effect.x + Math.cos(angle) * size,
          effect.y + Math.sin(angle) * size
        );
        ctx.stroke();
      }
    }
  }

  private drawHealthBars() {
    if (!this.player || !this.enemy) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const barWidth = w * 0.35;
    const barHeight = 15;
    const y = 20;

    // Player health bar
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(20, y, barWidth, barHeight);

    ctx.fillStyle = "#3498db";
    ctx.fillRect(20, y, barWidth * (this.player.health / this.player.maxHealth), barHeight);

    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, y, barWidth, barHeight);

    // Enemy health bar
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(w - 20 - barWidth, y, barWidth, barHeight);

    ctx.fillStyle = "#e74c3c";
    const enemyHealthWidth = barWidth * (this.enemy.health / this.enemy.maxHealth);
    ctx.fillRect(w - 20 - enemyHealthWidth, y, enemyHealthWidth, barHeight);

    ctx.strokeStyle = "#e74c3c";
    ctx.strokeRect(w - 20 - barWidth, y, barWidth, barHeight);

    // Round indicator
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Round ${this.round}`, w / 2, y + 12);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, "0")}`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
