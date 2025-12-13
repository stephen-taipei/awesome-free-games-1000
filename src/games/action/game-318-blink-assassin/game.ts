/**
 * Blink Assassin Game
 * Game #318 - Teleport and assassinate enemies
 */

interface Position {
  x: number;
  y: number;
}

interface Player extends Position {
  width: number;
  height: number;
  blinking: boolean;
  blinkTarget: Position | null;
  attackCooldown: number;
  combo: number;
  comboTimer: number;
}

interface Enemy extends Position {
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  facing: number;
  alertLevel: number;
  type: "guard" | "elite" | "boss";
  visionAngle: number;
  patrolPoints: Position[];
  patrolIndex: number;
  speed: number;
}

interface GameState {
  score: number;
  blinks: number;
  targets: number;
  status: "idle" | "playing" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

export class BlinkAssassinGame {
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
    width: 25,
    height: 35,
    blinking: false,
    blinkTarget: null,
    attackCooldown: 0,
    combo: 0,
    comboTimer: 0,
  };

  private enemies: Enemy[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private blinkTrail: { x: number; y: number; alpha: number }[] = [];

  private score = 0;
  private blinksLeft = 5;
  private level = 1;
  private status: GameState["status"] = "idle";
  private blinkCooldown = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const handleClick = (x: number, y: number) => {
      if (this.status !== "playing") return;
      if (this.blinksLeft <= 0 || this.blinkCooldown > 0) return;

      this.blink(x, y);
    };

    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * this.width;
      const y = (e.clientY - rect.top) / rect.height * this.height;
      handleClick(x, y);
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / rect.width * this.width;
      const y = (touch.clientY - rect.top) / rect.height * this.height;
      handleClick(x, y);
    });
  }

  private blink(targetX: number, targetY: number) {
    // Check if clicking near an enemy - blink behind them
    let blinkX = targetX;
    let blinkY = targetY;

    for (const enemy of this.enemies) {
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 50) {
        // Blink behind enemy
        const behindAngle = Math.atan2(Math.sin(enemy.visionAngle + Math.PI), Math.cos(enemy.visionAngle + Math.PI));
        blinkX = enemy.x + Math.cos(behindAngle) * 30;
        blinkY = enemy.y + Math.sin(behindAngle) * 30;
        break;
      }
    }

    // Clamp to bounds
    blinkX = Math.max(20, Math.min(this.width - 20, blinkX));
    blinkY = Math.max(20, Math.min(this.height - 20, blinkY));

    // Create trail
    this.blinkTrail.push({ x: this.player.x, y: this.player.y, alpha: 1 });

    // Blink particles at start
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.3,
        color: "#9b59b6",
      });
    }

    // Move player
    this.player.x = blinkX;
    this.player.y = blinkY;
    this.player.blinking = true;

    // Blink particles at end
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.3,
        color: "#c896ff",
      });
    }

    this.blinksLeft--;
    this.blinkCooldown = 0.2;
    this.player.attackCooldown = 0;

    // Immediately attack nearby enemies from behind
    this.attackNearbyEnemies();

    setTimeout(() => {
      this.player.blinking = false;
    }, 100);

    this.emitState();
  }

  private attackNearbyEnemies() {
    const attackRange = 40;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < attackRange) {
        // Check if behind enemy (backstab bonus)
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToPlayer - enemy.visionAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        const isBackstab = angleDiff < Math.PI / 3;
        const damage = isBackstab ? 3 : 1;

        enemy.health -= damage;

        // Hit particles
        const hitColor = isBackstab ? "#ff0" : "#f88";
        for (let j = 0; j < (isBackstab ? 15 : 8); j++) {
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 250,
            vy: (Math.random() - 0.5) * 250,
            life: 0.4,
            color: hitColor,
          });
        }

        if (enemy.health <= 0) {
          // Combo system
          this.player.combo++;
          this.player.comboTimer = 2;

          const baseScore = enemy.type === "boss" ? 100 : enemy.type === "elite" ? 50 : 20;
          const comboMultiplier = Math.min(this.player.combo, 5);
          this.score += baseScore * comboMultiplier;

          // Death particles
          for (let j = 0; j < 20; j++) {
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 300,
              vy: (Math.random() - 0.5) * 300,
              life: 0.5,
              color: "#ff4444",
            });
          }

          // Refund blink on kill
          this.blinksLeft = Math.min(this.blinksLeft + 1, 5);

          this.enemies.splice(i, 1);
        } else {
          // Enemy becomes alert
          enemy.alertLevel = 1;
        }
      }
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        blinks: this.blinksLeft,
        targets: this.enemies.length,
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
    this.blinksLeft = 5;
    this.level = 1;
    this.status = "playing";
    this.enemies = [];
    this.particles = [];
    this.blinkTrail = [];
    this.blinkCooldown = 0;
    this.player.combo = 0;
    this.player.comboTimer = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height - 50;

    this.spawnLevel();
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private spawnLevel() {
    const guardCount = 2 + this.level;
    const eliteCount = Math.floor(this.level / 2);
    const bossCount = this.level >= 3 ? 1 : 0;

    for (let i = 0; i < guardCount; i++) {
      this.spawnEnemy("guard");
    }
    for (let i = 0; i < eliteCount; i++) {
      this.spawnEnemy("elite");
    }
    for (let i = 0; i < bossCount; i++) {
      this.spawnEnemy("boss");
    }
  }

  private spawnEnemy(type: Enemy["type"]) {
    const margin = 60;
    const x = margin + Math.random() * (this.width - margin * 2);
    const y = margin + Math.random() * (this.height - margin * 2 - 100);

    // Generate patrol points
    const patrolPoints: Position[] = [{ x, y }];
    const numPoints = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPoints; i++) {
      patrolPoints.push({
        x: margin + Math.random() * (this.width - margin * 2),
        y: margin + Math.random() * (this.height - margin * 2 - 100),
      });
    }

    let health = 1;
    let speed = 30;
    let size = 25;

    if (type === "elite") {
      health = 2;
      speed = 40;
      size = 30;
    } else if (type === "boss") {
      health = 5;
      speed = 25;
      size = 40;
    }

    this.enemies.push({
      x,
      y,
      width: size,
      height: size,
      health,
      maxHealth: health,
      facing: 1,
      alertLevel: 0,
      type,
      visionAngle: Math.random() * Math.PI * 2,
      patrolPoints,
      patrolIndex: 0,
      speed,
    });
  }

  private update(dt: number) {
    if (this.status !== "playing") return;

    this.blinkCooldown = Math.max(0, this.blinkCooldown - dt);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);

    // Combo timer
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 0;
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      if (enemy.alertLevel > 0) {
        // Chase player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        enemy.x += (dx / dist) * enemy.speed * 2 * dt;
        enemy.y += (dy / dist) * enemy.speed * 2 * dt;
        enemy.visionAngle = Math.atan2(dy, dx);

        enemy.alertLevel -= dt * 0.3;
        if (enemy.alertLevel < 0) enemy.alertLevel = 0;

        // Check collision with player
        if (dist < (enemy.width + this.player.width) / 2) {
          this.status = "over";
          this.emitState();
          return;
        }
      } else {
        // Patrol
        const target = enemy.patrolPoints[enemy.patrolIndex];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
        } else {
          enemy.x += (dx / dist) * enemy.speed * dt;
          enemy.y += (dy / dist) * enemy.speed * dt;
          enemy.visionAngle = Math.atan2(dy, dx);
        }

        // Check if player in vision
        const playerDx = this.player.x - enemy.x;
        const playerDy = this.player.y - enemy.y;
        const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
        const angleToPlayer = Math.atan2(playerDy, playerDx);

        let angleDiff = Math.abs(angleToPlayer - enemy.visionAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        const visionRange = enemy.type === "elite" ? 120 : enemy.type === "boss" ? 150 : 100;
        const visionCone = Math.PI / 3;

        if (playerDist < visionRange && angleDiff < visionCone && !this.player.blinking) {
          enemy.alertLevel = 1;
        }
      }
    }

    // Update blink trail
    for (let i = this.blinkTrail.length - 1; i >= 0; i--) {
      this.blinkTrail[i].alpha -= dt * 3;
      if (this.blinkTrail[i].alpha <= 0) {
        this.blinkTrail.splice(i, 1);
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

    // Check level complete
    if (this.enemies.length === 0) {
      this.status = "complete";
      this.emitState();
    }

    // Check game over (no blinks and enemies remain)
    if (this.blinksLeft <= 0 && this.enemies.length > 0) {
      // Give player a moment to see the situation
      let anyAlert = false;
      for (const enemy of this.enemies) {
        if (enemy.alertLevel > 0) anyAlert = true;
      }
      if (!anyAlert) {
        // No immediate danger, continue playing
      }
    }

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = "#0a0515";
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid pattern
    ctx.strokeStyle = "rgba(150, 100, 200, 0.1)";
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

    // Draw blink trail
    for (const trail of this.blinkTrail) {
      ctx.globalAlpha = trail.alpha * 0.5;
      ctx.fillStyle = "#9b59b6";
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw enemy vision cones
    for (const enemy of this.enemies) {
      const visionRange = enemy.type === "elite" ? 120 : enemy.type === "boss" ? 150 : 100;
      const visionCone = Math.PI / 3;

      ctx.fillStyle = enemy.alertLevel > 0 ? "rgba(255, 100, 100, 0.2)" : "rgba(255, 255, 100, 0.1)";
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.arc(enemy.x, enemy.y, visionRange, enemy.visionAngle - visionCone, enemy.visionAngle + visionCone);
      ctx.closePath();
      ctx.fill();
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      let color = "#ff4444";
      if (enemy.type === "elite") color = "#ff8800";
      if (enemy.type === "boss") color = "#ff0044";

      if (enemy.alertLevel > 0) {
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 10;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Direction indicator
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(
        enemy.x + Math.cos(enemy.visionAngle) * enemy.width * 0.8,
        enemy.y + Math.sin(enemy.visionAngle) * enemy.width * 0.8
      );
      ctx.stroke();

      // Health bar
      if (enemy.health < enemy.maxHealth) {
        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.height / 2 - 10, 30, 5);
        ctx.fillStyle = "#44ff44";
        ctx.fillRect(enemy.x - 15, enemy.y - enemy.height / 2 - 10, 30 * (enemy.health / enemy.maxHealth), 5);
      }

      // Type indicator
      if (enemy.type === "elite") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("E", enemy.x, enemy.y + 4);
      } else if (enemy.type === "boss") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("B", enemy.x, enemy.y + 5);
      }
    }

    // Draw player
    ctx.fillStyle = this.player.blinking ? "#c896ff" : "#9b59b6";
    if (this.player.blinking) {
      ctx.shadowColor = "#c896ff";
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Dagger
    ctx.fillStyle = "#ddd";
    ctx.beginPath();
    ctx.moveTo(this.player.x + 15, this.player.y - 5);
    ctx.lineTo(this.player.x + 25, this.player.y);
    ctx.lineTo(this.player.x + 15, this.player.y + 5);
    ctx.closePath();
    ctx.fill();

    // Combo display
    if (this.player.combo > 0) {
      ctx.fillStyle = "#ff0";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${this.player.combo}x COMBO!`, this.player.x, this.player.y - 40);
    }

    // Blink indicator
    if (this.blinksLeft > 0 && this.blinkCooldown <= 0) {
      ctx.strokeStyle = "rgba(200, 150, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
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

  nextLevel() {
    this.level++;
    this.blinksLeft = 5;
    this.status = "playing";
    this.enemies = [];
    this.player.x = this.width / 2;
    this.player.y = this.height - 50;
    this.player.combo = 0;
    this.player.comboTimer = 0;
    this.spawnLevel();
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
