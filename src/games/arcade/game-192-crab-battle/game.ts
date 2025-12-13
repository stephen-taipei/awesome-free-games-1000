/**
 * Crab Battle Game Engine
 * Game #192
 *
 * Side-scrolling crab fighting game!
 */

interface Crab {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  direction: 1 | -1;
  isPlayer: boolean;
  attackCooldown: number;
  hitCooldown: number;
  color: string;
  size: number;
}

interface Attack {
  x: number;
  y: number;
  direction: 1 | -1;
  life: number;
  isPlayer: boolean;
}

interface GameState {
  score: number;
  health: number;
  wave: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

const ENEMY_COLORS = ["#e74c3c", "#9b59b6", "#1abc9c", "#e91e63"];

export class CrabBattleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Crab | null = null;
  private enemies: Crab[] = [];
  private attacks: Attack[] = [];
  private score = 0;
  private wave = 1;
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
    if (this.onStateChange && this.player) {
      this.onStateChange({
        score: this.score,
        health: this.player.health,
        wave: this.wave,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.groundY = size * 0.75;
    this.draw();
  }

  start() {
    const w = this.canvas.width;

    this.player = {
      x: w * 0.2,
      y: this.groundY,
      health: 100,
      maxHealth: 100,
      direction: 1,
      isPlayer: true,
      attackCooldown: 0,
      hitCooldown: 0,
      color: "#3498db",
      size: 40,
    };

    this.enemies = [];
    this.attacks = [];
    this.score = 0;
    this.wave = 1;

    this.spawnWave();

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private spawnWave() {
    const w = this.canvas.width;
    const enemyCount = 2 + this.wave;

    for (let i = 0; i < enemyCount; i++) {
      this.enemies.push({
        x: w * 0.6 + i * 60 + Math.random() * 40,
        y: this.groundY,
        health: 30 + this.wave * 10,
        maxHealth: 30 + this.wave * 10,
        direction: -1,
        isPlayer: false,
        attackCooldown: Math.random() * 60,
        hitCooldown: 0,
        color: ENEMY_COLORS[i % ENEMY_COLORS.length],
        size: 30 + Math.random() * 10,
      });
    }
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  attack() {
    if (!this.player || this.status !== "playing") return;
    if (this.player.attackCooldown > 0) return;

    this.player.attackCooldown = 30;
    this.attacks.push({
      x: this.player.x + this.player.direction * 30,
      y: this.player.y,
      direction: this.player.direction,
      life: 15,
      isPlayer: true,
    });
  }

  movePlayer(direction: "left" | "right") {
    if (!this.player || this.status !== "playing") return;
    const speed = 5;
    if (direction === "left") {
      this.player.x -= speed;
      this.player.direction = -1;
    } else {
      this.player.x += speed;
      this.player.direction = 1;
    }
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    if (!this.player) return;

    const w = this.canvas.width;
    const speed = 4;

    // Handle input
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.player.x -= speed;
      this.player.direction = -1;
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.player.x += speed;
      this.player.direction = 1;
    }
    if (this.keys.has(" ") || this.keys.has("Spacebar")) {
      this.attack();
    }

    // Keep player in bounds
    this.player.x = Math.max(30, Math.min(w - 30, this.player.x));

    // Update cooldowns
    if (this.player.attackCooldown > 0) this.player.attackCooldown--;
    if (this.player.hitCooldown > 0) this.player.hitCooldown--;

    // Update enemies
    for (const enemy of this.enemies) {
      if (enemy.attackCooldown > 0) enemy.attackCooldown--;
      if (enemy.hitCooldown > 0) enemy.hitCooldown--;

      // Simple AI
      const dx = this.player.x - enemy.x;
      enemy.direction = dx > 0 ? 1 : -1;

      // Move toward player
      if (Math.abs(dx) > 60) {
        enemy.x += enemy.direction * 1.5;
      }

      // Attack when close
      if (Math.abs(dx) < 80 && enemy.attackCooldown === 0) {
        enemy.attackCooldown = 60 + Math.random() * 30;
        this.attacks.push({
          x: enemy.x + enemy.direction * 20,
          y: enemy.y,
          direction: enemy.direction,
          life: 10,
          isPlayer: false,
        });
      }
    }

    // Update attacks
    for (let i = this.attacks.length - 1; i >= 0; i--) {
      const attack = this.attacks[i];
      attack.x += attack.direction * 10;
      attack.life--;

      if (attack.life <= 0) {
        this.attacks.splice(i, 1);
        continue;
      }

      // Check collisions
      if (attack.isPlayer) {
        // Player attack hits enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          if (enemy.hitCooldown > 0) continue;

          const dx = Math.abs(attack.x - enemy.x);
          const dy = Math.abs(attack.y - enemy.y);

          if (dx < 40 && dy < 40) {
            enemy.health -= 20;
            enemy.hitCooldown = 15;
            this.attacks.splice(i, 1);

            if (enemy.health <= 0) {
              this.enemies.splice(j, 1);
              this.score += 100;
              this.emitState();
            }
            break;
          }
        }
      } else {
        // Enemy attack hits player
        if (this.player.hitCooldown === 0) {
          const dx = Math.abs(attack.x - this.player.x);
          const dy = Math.abs(attack.y - this.player.y);

          if (dx < 40 && dy < 40) {
            this.player.health -= 10;
            this.player.hitCooldown = 30;
            this.attacks.splice(i, 1);
            this.emitState();

            if (this.player.health <= 0) {
              this.status = "over";
              this.emitState();
              return;
            }
          }
        }
      }
    }

    // Check wave complete
    if (this.enemies.length === 0) {
      if (this.wave >= 5) {
        this.status = "won";
        this.score += 500;
        this.emitState();
      } else {
        this.wave++;
        this.spawnWave();
        this.emitState();
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(1, "#e0f4ff");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, this.groundY);

    // Sun
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.15, w * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Beach/sand
    ctx.fillStyle = "#f5d6a7";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Water line
    const waveOffset = Math.sin(Date.now() / 500) * 5;
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.moveTo(0, this.groundY + 20 + waveOffset);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, this.groundY + 20 + Math.sin(x / 30 + Date.now() / 300) * 5);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Draw attacks
    for (const attack of this.attacks) {
      this.drawAttack(attack);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawCrab(enemy);
    }

    // Draw player
    if (this.player) {
      this.drawCrab(this.player);
    }

    // Wave indicator
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Wave ${this.wave}/5`, w / 2, 30);
  }

  private drawCrab(crab: Crab) {
    const ctx = this.ctx;
    const x = crab.x;
    const y = crab.y;
    const size = crab.size;

    // Flash when hit
    if (crab.hitCooldown > 0 && crab.hitCooldown % 4 < 2) {
      ctx.globalAlpha = 0.5;
    }

    ctx.save();
    ctx.translate(x, y);
    if (crab.direction === -1) {
      ctx.scale(-1, 1);
    }

    // Body
    ctx.fillStyle = crab.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell pattern
    ctx.strokeStyle = this.darkenColor(crab.color, 20);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.6, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(size * 0.3, -size * 0.4, size * 0.15, size * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.6, -size * 0.35, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(size * 0.35, -size * 0.4, size * 0.06, 0, Math.PI * 2);
    ctx.arc(size * 0.63, -size * 0.35, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Claws
    const clawWave = Math.sin(Date.now() / 200) * 0.1;
    ctx.fillStyle = crab.color;

    // Left claw
    ctx.save();
    ctx.translate(-size * 0.8, size * 0.1);
    ctx.rotate(-0.5 + clawWave);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Claw pincer
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.1);
    ctx.lineTo(-size * 0.5, -size * 0.2);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.1);
    ctx.lineTo(-size * 0.5, size * 0.2);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right claw (bigger attack claw)
    ctx.save();
    ctx.translate(size * 0.8, size * 0.1);
    ctx.rotate(0.5 - clawWave);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.4, -size * 0.15);
    ctx.lineTo(size * 0.7, -size * 0.25);
    ctx.lineTo(size * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.4, size * 0.15);
    ctx.lineTo(size * 0.7, size * 0.25);
    ctx.lineTo(size * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.strokeStyle = crab.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const legAngle = (i - 1) * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(legAngle) * size * 0.6, size * 0.3);
      ctx.lineTo(Math.cos(legAngle) * size, size * 0.6);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    // Health bar
    if (!crab.isPlayer && crab.health < crab.maxHealth) {
      const barWidth = size * 1.5;
      const barHeight = 6;
      const barX = x - barWidth / 2;
      const barY = y - size - 15;

      ctx.fillStyle = "#2d3436";
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(barX, barY, barWidth * (crab.health / crab.maxHealth), barHeight);
    }
  }

  private drawAttack(attack: Attack) {
    const ctx = this.ctx;
    const x = attack.x;
    const y = attack.y;
    const size = 15;

    ctx.fillStyle = attack.isPlayer ? "#3498db" : "#e74c3c";
    ctx.globalAlpha = attack.life / 15;

    // Claw swipe effect
    ctx.beginPath();
    ctx.arc(x, y, size + (15 - attack.life) * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
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
