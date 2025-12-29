/**
 * Air Hockey Game
 * Game #168 - Physics-based puck game
 */

interface Paddle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

interface Puck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PendingEvents {
  playerHit: { x: number; y: number; force: number }[];
  cpuHit: { x: number; y: number; force: number }[];
  wallBounce: { x: number; y: number; nx: number; ny: number }[];
  goalScored: { x: number; y: number; isPlayer: boolean }[];
  puckTrail: { x: number; y: number }[];
  gameOver: { x: number; y: number; victory: boolean }[];
  start: boolean;
}

export class AirHockeyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private player: Paddle;
  private cpu: Paddle;
  private puck: Puck;
  private playerScore: number = 0;
  private cpuScore: number = 0;
  private winScore: number = 7;
  private status: "idle" | "playing" | "over" = "idle";
  private animationId: number = 0;
  private goalWidth: number = 120;
  private friction: number = 0.995;
  private targetX: number = 0;
  private targetY: number = 0;
  private trailTimer: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  public pendingEvents: PendingEvents = {
    playerHit: [],
    cpuHit: [],
    wallBounce: [],
    goalScored: [],
    puckTrail: [],
    gameOver: [],
    start: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, radius: 30, vx: 0, vy: 0 };
    this.cpu = { x: 0, y: 0, radius: 30, vx: 0, vy: 0 };
    this.puck = { x: 0, y: 0, vx: 0, vy: 0, radius: 15 };
  }

  public clearPendingEvents() {
    this.pendingEvents = {
      playerHit: [],
      cpuHit: [],
      wallBounce: [],
      goalScored: [],
      puckTrail: [],
      gameOver: [],
      start: false,
    };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.resetPositions();
    this.draw();
  }

  private resetPositions() {
    this.player.x = this.width / 2;
    this.player.y = this.height - 60;
    this.player.vx = 0;
    this.player.vy = 0;

    this.cpu.x = this.width / 2;
    this.cpu.y = 60;
    this.cpu.vx = 0;
    this.cpu.vy = 0;

    this.puck.x = this.width / 2;
    this.puck.y = this.height / 2;
    this.puck.vx = 0;
    this.puck.vy = 0;

    this.targetX = this.width / 2;
    this.targetY = this.height - 60;
  }

  public start() {
    this.playerScore = 0;
    this.cpuScore = 0;
    this.status = "playing";
    this.resetPositions();

    // Random initial velocity for puck
    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    const dir = Math.random() > 0.5 ? 1 : -1;
    this.puck.vx = Math.sin(angle) * 3;
    this.puck.vy = dir * Math.cos(angle) * 3;

    this.pendingEvents.start = true;
    this.emitState();
    this.loop();
  }

  private loop = () => {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    // Update player position towards target
    const dx = this.targetX - this.player.x;
    const dy = this.targetY - this.player.y;
    this.player.vx = dx * 0.15;
    this.player.vy = dy * 0.15;
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Constrain player to their half
    this.player.y = Math.max(
      this.height / 2 + this.player.radius,
      Math.min(this.height - this.player.radius, this.player.y)
    );
    this.player.x = Math.max(
      this.player.radius,
      Math.min(this.width - this.player.radius, this.player.x)
    );

    // CPU AI
    this.updateCPU();

    // Update puck
    this.puck.x += this.puck.vx;
    this.puck.y += this.puck.vy;
    this.puck.vx *= this.friction;
    this.puck.vy *= this.friction;

    // Puck trail
    this.trailTimer += 1 / 60;
    const puckSpeed = Math.sqrt(this.puck.vx ** 2 + this.puck.vy ** 2);
    if (this.trailTimer > 0.05 && puckSpeed > 1) {
      this.trailTimer = 0;
      this.pendingEvents.puckTrail.push({
        x: this.puck.x / this.width,
        y: this.puck.y / this.height,
      });
    }

    // Wall collisions
    if (this.puck.x - this.puck.radius < 0) {
      this.puck.x = this.puck.radius;
      this.puck.vx *= -0.9;
      this.pendingEvents.wallBounce.push({
        x: this.puck.x / this.width,
        y: this.puck.y / this.height,
        nx: 1,
        ny: 0,
      });
    }
    if (this.puck.x + this.puck.radius > this.width) {
      this.puck.x = this.width - this.puck.radius;
      this.puck.vx *= -0.9;
      this.pendingEvents.wallBounce.push({
        x: this.puck.x / this.width,
        y: this.puck.y / this.height,
        nx: -1,
        ny: 0,
      });
    }

    // Goal detection
    const goalLeft = (this.width - this.goalWidth) / 2;
    const goalRight = (this.width + this.goalWidth) / 2;

    // Top goal (player scores)
    if (this.puck.y - this.puck.radius < 0) {
      if (this.puck.x > goalLeft && this.puck.x < goalRight) {
        this.playerScore++;
        this.pendingEvents.goalScored.push({
          x: this.puck.x / this.width,
          y: 0.02,
          isPlayer: true,
        });
        this.emitState();
        if (this.playerScore >= this.winScore) {
          this.endGame(true);
        } else {
          this.resetPuck(-1);
        }
        return;
      } else {
        this.puck.y = this.puck.radius;
        this.puck.vy *= -0.9;
        this.pendingEvents.wallBounce.push({
          x: this.puck.x / this.width,
          y: this.puck.y / this.height,
          nx: 0,
          ny: 1,
        });
      }
    }

    // Bottom goal (CPU scores)
    if (this.puck.y + this.puck.radius > this.height) {
      if (this.puck.x > goalLeft && this.puck.x < goalRight) {
        this.cpuScore++;
        this.pendingEvents.goalScored.push({
          x: this.puck.x / this.width,
          y: 0.98,
          isPlayer: false,
        });
        this.emitState();
        if (this.cpuScore >= this.winScore) {
          this.endGame(false);
        } else {
          this.resetPuck(1);
        }
        return;
      } else {
        this.puck.y = this.height - this.puck.radius;
        this.puck.vy *= -0.9;
        this.pendingEvents.wallBounce.push({
          x: this.puck.x / this.width,
          y: this.puck.y / this.height,
          nx: 0,
          ny: -1,
        });
      }
    }

    // Paddle-puck collisions
    this.checkPaddleCollision(this.player, true);
    this.checkPaddleCollision(this.cpu, false);
  }

  private updateCPU() {
    const targetX = this.puck.x;
    let targetY: number;

    if (this.puck.y < this.height / 2 && this.puck.vy < 0) {
      // Puck coming towards CPU
      targetY = Math.min(this.puck.y + 20, this.height / 2 - this.cpu.radius);
    } else {
      // Defend goal
      targetY = 60;
    }

    const dx = targetX - this.cpu.x;
    const dy = targetY - this.cpu.y;

    this.cpu.vx = dx * 0.08;
    this.cpu.vy = dy * 0.08;
    this.cpu.x += this.cpu.vx;
    this.cpu.y += this.cpu.vy;

    // Constrain CPU to their half
    this.cpu.y = Math.max(
      this.cpu.radius,
      Math.min(this.height / 2 - this.cpu.radius, this.cpu.y)
    );
    this.cpu.x = Math.max(
      this.cpu.radius,
      Math.min(this.width - this.cpu.radius, this.cpu.x)
    );
  }

  private checkPaddleCollision(paddle: Paddle, isPlayer: boolean) {
    const dx = this.puck.x - paddle.x;
    const dy = this.puck.y - paddle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.puck.radius + paddle.radius;

    if (dist < minDist && dist > 0) {
      // Collision normal
      const nx = dx / dist;
      const ny = dy / dist;

      // Separate objects
      const overlap = minDist - dist;
      this.puck.x += nx * overlap;
      this.puck.y += ny * overlap;

      // Calculate relative velocity
      const dvx = this.puck.vx - paddle.vx;
      const dvy = this.puck.vy - paddle.vy;

      // Relative velocity in collision normal direction
      const dvn = dvx * nx + dvy * ny;

      // Do not resolve if velocities are separating
      if (dvn > 0) return;

      // Apply impulse
      const restitution = 1.1;
      const impulse = -(1 + restitution) * dvn;

      this.puck.vx += impulse * nx + paddle.vx * 0.3;
      this.puck.vy += impulse * ny + paddle.vy * 0.3;

      // Clamp velocity
      const maxSpeed = 15;
      const speed = Math.sqrt(this.puck.vx ** 2 + this.puck.vy ** 2);
      if (speed > maxSpeed) {
        this.puck.vx = (this.puck.vx / speed) * maxSpeed;
        this.puck.vy = (this.puck.vy / speed) * maxSpeed;
      }

      // Emit hit event
      const force = Math.min(speed / maxSpeed, 1);
      const hitX = this.puck.x / this.width;
      const hitY = this.puck.y / this.height;

      if (isPlayer) {
        this.pendingEvents.playerHit.push({ x: hitX, y: hitY, force });
      } else {
        this.pendingEvents.cpuHit.push({ x: hitX, y: hitY, force });
      }
    }
  }

  private resetPuck(direction: number) {
    this.puck.x = this.width / 2;
    this.puck.y = this.height / 2;

    const angle = (Math.random() - 0.5) * Math.PI * 0.3;
    this.puck.vx = Math.sin(angle) * 3;
    this.puck.vy = direction * Math.cos(angle) * 3;
  }

  private endGame(playerWon: boolean) {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);

    this.pendingEvents.gameOver.push({
      x: 0.5,
      y: 0.5,
      victory: playerWon,
    });

    this.emitState();
    if (this.onStateChange) {
      this.onStateChange({
        playerScore: this.playerScore,
        cpuScore: this.cpuScore,
        status: "over",
        playerWon,
      });
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw table (transparent for WebGPU background)
    this.ctx.fillStyle = "rgba(30, 95, 138, 0.3)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Center line
    this.ctx.strokeStyle = "rgba(255,255,255,0.3)";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Center circle
    this.ctx.beginPath();
    this.ctx.arc(this.width / 2, this.height / 2, 50, 0, Math.PI * 2);
    this.ctx.stroke();

    // Goals
    const goalLeft = (this.width - this.goalWidth) / 2;
    this.ctx.fillStyle = "rgba(44, 62, 80, 0.8)";
    this.ctx.fillRect(goalLeft, 0, this.goalWidth, 10);
    this.ctx.fillRect(goalLeft, this.height - 10, this.goalWidth, 10);

    // Goal edges with neon glow
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "#e74c3c";
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.fillRect(goalLeft - 10, 0, 10, 20);
    this.ctx.fillRect(goalLeft + this.goalWidth, 0, 10, 20);

    this.ctx.shadowColor = "#3498db";
    this.ctx.fillRect(goalLeft - 10, this.height - 20, 10, 20);
    this.ctx.fillRect(goalLeft + this.goalWidth, this.height - 20, 10, 20);
    this.ctx.shadowBlur = 0;

    // Draw CPU paddle with glow
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = "#ff3366";
    this.ctx.beginPath();
    this.ctx.arc(this.cpu.x, this.cpu.y, this.cpu.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.fill();
    this.ctx.strokeStyle = "#ff6666";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // CPU paddle inner circle
    this.ctx.beginPath();
    this.ctx.arc(this.cpu.x, this.cpu.y, this.cpu.radius * 0.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(255,255,255,0.8)";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw player paddle with glow
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = "#00ffff";
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#3498db";
    this.ctx.fill();
    this.ctx.strokeStyle = "#66ccff";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Player paddle inner circle
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius * 0.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(255,255,255,0.8)";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw puck with glow
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = "rgba(255,255,255,0.5)";
    this.ctx.beginPath();
    this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.fill();
    this.ctx.strokeStyle = "#1a252f";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  public handleMouseMove(x: number, y: number) {
    if (this.status !== "playing") return;
    this.targetX = x;
    this.targetY = y;
  }

  public reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        playerScore: this.playerScore,
        cpuScore: this.cpuScore,
        status: this.status,
      });
    }
  }
}
