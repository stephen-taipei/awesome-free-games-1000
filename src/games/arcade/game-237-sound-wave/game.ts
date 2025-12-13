/**
 * Sound Wave Game Engine
 * Game #237
 *
 * Use sound waves to attack enemies!
 */

interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface Enemy {
  x: number;
  y: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  color: string;
}

interface GameState {
  score: number;
  wave: number;
  hp: number;
  power: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const PLAYER_RADIUS = 25;
const MAX_POWER = 100;
const POWER_REGEN = 0.5;
const WAVE_COST = 20;

export class SoundWaveGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score = 0;
  private wave = 1;
  private hp = 100;
  private power = MAX_POWER;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private playerX = 0;
  private playerY = 0;
  private soundWaves: SoundWave[] = [];
  private enemies: Enemy[] = [];
  private enemiesKilled = 0;
  private enemiesPerWave = 5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handleTouch(e);
    });
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        wave: this.wave,
        hp: this.hp,
        power: this.power,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.playerX = size / 2;
    this.playerY = size / 2;

    this.draw();
  }

  start() {
    this.score = 0;
    this.wave = 1;
    this.hp = 100;
    this.power = MAX_POWER;
    this.status = "playing";
    this.soundWaves = [];
    this.enemies = [];
    this.enemiesKilled = 0;
    this.enemiesPerWave = 5;

    this.spawnWave();
    this.emitState();
    this.gameLoop();
  }

  private handleClick(e: MouseEvent) {
    if (this.status !== "playing") return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    this.fireSoundWave(x, y);
  }

  private handleTouch(e: TouchEvent) {
    if (this.status !== "playing") return;

    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    this.fireSoundWave(x, y);
  }

  private fireSoundWave(targetX: number, targetY: number) {
    if (this.power < WAVE_COST) return;

    this.power -= WAVE_COST;

    const dx = targetX - this.playerX;
    const dy = targetY - this.playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.soundWaves.push({
      x: this.playerX,
      y: this.playerY,
      radius: 10,
      maxRadius: Math.max(100, distance + 50),
      alpha: 1,
    });

    this.emitState();
  }

  private spawnWave() {
    const enemyCount = this.enemiesPerWave + (this.wave - 1) * 2;

    for (let i = 0; i < enemyCount; i++) {
      setTimeout(() => {
        if (this.status !== "playing") return;
        this.spawnEnemy();
      }, i * 500);
    }
  }

  private spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.canvas.width;
        y = -30;
        break;
      case 1: // Right
        x = this.canvas.width + 30;
        y = Math.random() * this.canvas.height;
        break;
      case 2: // Bottom
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + 30;
        break;
      default: // Left
        x = -30;
        y = Math.random() * this.canvas.height;
        break;
    }

    const baseHp = 1 + Math.floor(this.wave / 3);
    const colors = ["#e74c3c", "#9b59b6", "#3498db", "#e67e22", "#1abc9c"];

    this.enemies.push({
      x,
      y,
      radius: 15 + Math.random() * 10,
      speed: 0.5 + this.wave * 0.1 + Math.random() * 0.3,
      hp: baseHp,
      maxHp: baseHp,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Regenerate power
    this.power = Math.min(MAX_POWER, this.power + POWER_REGEN);

    // Update sound waves
    this.soundWaves = this.soundWaves.filter((wave) => {
      wave.radius += 8;
      wave.alpha = 1 - wave.radius / wave.maxRadius;
      return wave.radius < wave.maxRadius;
    });

    // Update enemies
    this.enemies.forEach((enemy) => {
      const dx = this.playerX - enemy.x;
      const dy = this.playerY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;

      // Check collision with player
      if (dist < PLAYER_RADIUS + enemy.radius) {
        this.hp -= 10;
        enemy.hp = 0;
        this.emitState();
      }

      // Check collision with sound waves
      this.soundWaves.forEach((wave) => {
        const waveDistance = Math.sqrt(
          Math.pow(enemy.x - wave.x, 2) + Math.pow(enemy.y - wave.y, 2)
        );

        if (Math.abs(waveDistance - wave.radius) < enemy.radius + 10) {
          enemy.hp--;
        }
      });
    });

    // Remove dead enemies
    const beforeCount = this.enemies.length;
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    const killed = beforeCount - this.enemies.length;

    if (killed > 0) {
      this.score += killed * 100 * this.wave;
      this.enemiesKilled += killed;
      this.emitState();
    }

    // Check for wave complete
    if (
      this.enemies.length === 0 &&
      this.enemiesKilled >= this.enemiesPerWave + (this.wave - 1) * 2
    ) {
      this.wave++;
      this.enemiesKilled = 0;
      this.hp = Math.min(100, this.hp + 20); // Heal between waves
      this.emitState();
      this.spawnWave();
    }

    // Check game over
    if (this.hp <= 0) {
      this.gameOver();
    }

    this.emitState();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    // Grid effect
    ctx.strokeStyle = "rgba(100, 100, 255, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw sound waves
    this.soundWaves.forEach((wave) => {
      ctx.strokeStyle = `rgba(0, 255, 255, ${wave.alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner wave
      ctx.strokeStyle = `rgba(100, 200, 255, ${wave.alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw enemies
    this.enemies.forEach((enemy) => {
      // Enemy body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      const barWidth = enemy.radius * 2;
      const barHeight = 4;
      const hpRatio = enemy.hp / enemy.maxHp;

      ctx.fillStyle = "#333";
      ctx.fillRect(
        enemy.x - barWidth / 2,
        enemy.y - enemy.radius - 10,
        barWidth,
        barHeight
      );
      ctx.fillStyle = hpRatio > 0.5 ? "#2ecc71" : hpRatio > 0.25 ? "#f1c40f" : "#e74c3c";
      ctx.fillRect(
        enemy.x - barWidth / 2,
        enemy.y - enemy.radius - 10,
        barWidth * hpRatio,
        barHeight
      );
    });

    // Draw player
    this.drawPlayer();
  }

  private drawPlayer() {
    const ctx = this.ctx;

    // Glow effect
    const gradient = ctx.createRadialGradient(
      this.playerX,
      this.playerY,
      0,
      this.playerX,
      this.playerY,
      PLAYER_RADIUS * 2
    );
    gradient.addColorStop(0, "rgba(0, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_RADIUS * 2, 0, Math.PI * 2);
    ctx.fill();

    // Player body
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = "#001a1a";
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, PLAYER_RADIUS * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Speaker icon
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.moveTo(this.playerX - 5, this.playerY - 5);
    ctx.lineTo(this.playerX - 5, this.playerY + 5);
    ctx.lineTo(this.playerX + 5, this.playerY + 10);
    ctx.lineTo(this.playerX + 5, this.playerY - 10);
    ctx.closePath();
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
