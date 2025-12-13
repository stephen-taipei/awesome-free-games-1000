/**
 * Way of Samurai Game Engine
 * Game #273
 *
 * Slash enemies with precise timing and direction!
 */

type Direction = "up" | "down" | "left" | "right";

interface Enemy {
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  size: number;
  slashed: boolean;
  missed: boolean;
}

interface SlashEffect {
  x: number;
  y: number;
  direction: Direction;
  timer: number;
}

interface GameState {
  score: number;
  combo: number;
  honor: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const DIRECTION_ARROWS: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export class SamuraiGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enemies: Enemy[] = [];
  private slashEffects: SlashEffect[] = [];
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private honor = 100;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private spawnTimer = 0;
  private difficulty = 1;
  private centerX = 0;
  private centerY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        combo: this.combo,
        honor: this.honor,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.draw();
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.honor = 100;
    this.difficulty = 1;
    this.enemies = [];
    this.slashEffects = [];
    this.spawnTimer = 0;
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  slash(direction: Direction) {
    if (this.status !== "playing") return;

    // Find enemy to slash
    let slashedAny = false;
    for (const enemy of this.enemies) {
      if (enemy.slashed || enemy.missed) continue;

      const dx = enemy.x - this.centerX;
      const dy = enemy.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if enemy is in slash range
      if (dist < 80) {
        if (enemy.direction === direction) {
          // Perfect slash!
          enemy.slashed = true;
          slashedAny = true;
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.score += 10 * this.combo;

          this.slashEffects.push({
            x: enemy.x,
            y: enemy.y,
            direction,
            timer: 20,
          });
          break;
        }
      }
    }

    if (!slashedAny) {
      // Missed slash
      this.combo = 0;
      this.honor -= 5;
    }

    this.emitState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Increase difficulty
    this.difficulty = 1 + Math.floor(this.score / 500) * 0.2;

    // Spawn enemies
    this.spawnTimer++;
    const spawnRate = Math.max(30, 90 - this.difficulty * 10);
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // Update enemies
    this.updateEnemies();

    // Update slash effects
    this.updateSlashEffects();

    // Check game over
    if (this.honor <= 0) {
      this.gameOver();
    }

    this.emitState();
  }

  private spawnEnemy() {
    const directions: Direction[] = ["up", "down", "left", "right"];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    let x = 0, y = 0;
    switch (direction) {
      case "up":
        x = this.centerX;
        y = this.canvas.height + 50;
        break;
      case "down":
        x = this.centerX;
        y = -50;
        break;
      case "left":
        x = this.canvas.width + 50;
        y = this.centerY;
        break;
      case "right":
        x = -50;
        y = this.centerY;
        break;
    }

    this.enemies.push({
      x,
      y,
      direction,
      speed: 2 + this.difficulty,
      size: 40,
      slashed: false,
      missed: false,
    });
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.slashed) {
        // Fade out slashed enemies
        enemy.size -= 2;
        if (enemy.size <= 0) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Move towards center
      const dx = this.centerX - enemy.x;
      const dy = this.centerY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }

      // Check if passed center (missed)
      if (dist < 30 && !enemy.missed) {
        enemy.missed = true;
        this.honor -= 10;
        this.combo = 0;
        this.emitState();
      }

      // Remove if too far past center
      if (enemy.missed) {
        switch (enemy.direction) {
          case "up":
            if (enemy.y < -50) this.enemies.splice(i, 1);
            break;
          case "down":
            if (enemy.y > this.canvas.height + 50) this.enemies.splice(i, 1);
            break;
          case "left":
            if (enemy.x < -50) this.enemies.splice(i, 1);
            break;
          case "right":
            if (enemy.x > this.canvas.width + 50) this.enemies.splice(i, 1);
            break;
        }
      }
    }
  }

  private updateSlashEffects() {
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      this.slashEffects[i].timer--;
      if (this.slashEffects[i].timer <= 0) {
        this.slashEffects.splice(i, 1);
      }
    }
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

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Japanese pattern
    ctx.strokeStyle = "rgba(196, 30, 58, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, 30 + i * 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw slash effects
    for (const effect of this.slashEffects) {
      this.drawSlashEffect(effect);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw samurai (center)
    this.drawSamurai();

    // Draw combo
    if (this.combo > 1) {
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${this.combo}x COMBO!`, this.centerX, 50);
    }
  }

  private drawSamurai() {
    const ctx = this.ctx;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, 60
    );
    gradient.addColorStop(0, "rgba(196, 30, 58, 0.3)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 60, 0, Math.PI * 2);
    ctx.fill();

    // Samurai body
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Katana
    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.centerX - 20, this.centerY - 20);
    ctx.lineTo(this.centerX + 25, this.centerY + 25);
    ctx.stroke();

    // Handle
    ctx.strokeStyle = "#8b0000";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.centerX - 20, this.centerY - 20);
    ctx.lineTo(this.centerX - 10, this.centerY - 10);
    ctx.stroke();
  }

  private drawEnemy(enemy: Enemy) {
    const ctx = this.ctx;

    if (enemy.slashed) {
      ctx.globalAlpha = enemy.size / 40;
    }

    // Enemy body
    ctx.fillStyle = enemy.missed ? "#666" : "#c41e3a";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    ctx.fillStyle = "white";
    ctx.font = `bold ${enemy.size * 0.6}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(DIRECTION_ARROWS[enemy.direction], enemy.x, enemy.y);

    ctx.globalAlpha = 1;
  }

  private drawSlashEffect(effect: SlashEffect) {
    const ctx = this.ctx;
    const alpha = effect.timer / 20;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();
    switch (effect.direction) {
      case "up":
        ctx.moveTo(effect.x - 30, effect.y + 30);
        ctx.lineTo(effect.x + 30, effect.y - 30);
        break;
      case "down":
        ctx.moveTo(effect.x - 30, effect.y - 30);
        ctx.lineTo(effect.x + 30, effect.y + 30);
        break;
      case "left":
        ctx.moveTo(effect.x + 30, effect.y - 30);
        ctx.lineTo(effect.x - 30, effect.y + 30);
        break;
      case "right":
        ctx.moveTo(effect.x - 30, effect.y - 30);
        ctx.lineTo(effect.x + 30, effect.y + 30);
        break;
    }
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
