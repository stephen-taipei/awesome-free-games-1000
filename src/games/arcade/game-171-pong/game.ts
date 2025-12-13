/**
 * Classic Pong Game
 * Game #171 - Canvas basic Pong
 */

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

export class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private player: Paddle;
  private cpu: Paddle;
  private ball: Ball;
  private playerScore: number = 0;
  private cpuScore: number = 0;
  private winScore: number = 11;
  private status: "idle" | "playing" | "over" = "idle";
  private animationId: number = 0;
  private targetY: number = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, width: 10, height: 80 };
    this.cpu = { x: 0, y: 0, width: 10, height: 80 };
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8, speed: 5 };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.player.x = 30;
    this.player.y = this.height / 2 - this.player.height / 2;
    this.cpu.x = this.width - 30 - this.cpu.width;
    this.cpu.y = this.height / 2 - this.cpu.height / 2;
    this.targetY = this.height / 2;

    this.resetBall(1);
    this.draw();
  }

  public start() {
    this.playerScore = 0;
    this.cpuScore = 0;
    this.status = "playing";
    this.particles = [];
    this.ball.speed = 5;
    this.resetBall(Math.random() > 0.5 ? 1 : -1);

    this.emitState();
    this.loop();
  }

  private resetBall(direction: number) {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;

    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    this.ball.vx = direction * Math.cos(angle) * this.ball.speed;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
  }

  private loop = () => {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    // Update player paddle
    const playerTargetY = this.targetY - this.player.height / 2;
    this.player.y += (playerTargetY - this.player.y) * 0.15;
    this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y));

    // CPU AI
    const cpuTarget = this.ball.y - this.cpu.height / 2;
    const cpuSpeed = 0.06 + (this.cpuScore / 20) * 0.02; // Gets harder
    this.cpu.y += (cpuTarget - this.cpu.y) * cpuSpeed;
    this.cpu.y = Math.max(0, Math.min(this.height - this.cpu.height, this.cpu.y));

    // Update ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Wall collisions (top/bottom)
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -1;
      this.addWallParticles(this.ball.x, 0);
    }
    if (this.ball.y + this.ball.radius > this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.vy *= -1;
      this.addWallParticles(this.ball.x, this.height);
    }

    // Paddle collisions
    if (this.checkPaddleCollision(this.player)) {
      this.ball.x = this.player.x + this.player.width + this.ball.radius;
      this.reflectBall(this.player, 1);
      this.addPaddleParticles(this.player.x + this.player.width, this.ball.y);
    }

    if (this.checkPaddleCollision(this.cpu)) {
      this.ball.x = this.cpu.x - this.ball.radius;
      this.reflectBall(this.cpu, -1);
      this.addPaddleParticles(this.cpu.x, this.ball.y);
    }

    // Score
    if (this.ball.x < 0) {
      this.cpuScore++;
      this.addScoreParticles(0, this.height / 2);
      this.emitState();
      if (this.cpuScore >= this.winScore) {
        this.endGame(false);
      } else {
        this.ball.speed = Math.min(this.ball.speed + 0.2, 10);
        this.resetBall(-1);
      }
    }

    if (this.ball.x > this.width) {
      this.playerScore++;
      this.addScoreParticles(this.width, this.height / 2);
      this.emitState();
      if (this.playerScore >= this.winScore) {
        this.endGame(true);
      } else {
        this.ball.speed = Math.min(this.ball.speed + 0.2, 10);
        this.resetBall(1);
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private checkPaddleCollision(paddle: Paddle): boolean {
    return (
      this.ball.x - this.ball.radius < paddle.x + paddle.width &&
      this.ball.x + this.ball.radius > paddle.x &&
      this.ball.y > paddle.y &&
      this.ball.y < paddle.y + paddle.height
    );
  }

  private reflectBall(paddle: Paddle, direction: number) {
    const hitPos = (this.ball.y - paddle.y) / paddle.height;
    const angle = (hitPos - 0.5) * Math.PI * 0.6;

    const speed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.05;
    this.ball.vx = direction * Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;

    // Clamp speed
    const maxSpeed = 12;
    const currentSpeed = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
    if (currentSpeed > maxSpeed) {
      this.ball.vx = (this.ball.vx / currentSpeed) * maxSpeed;
      this.ball.vy = (this.ball.vy / currentSpeed) * maxSpeed;
    }
  }

  private addWallParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (y === 0 ? 1 : -1) * Math.random() * 2,
        life: 1,
      });
    }
  }

  private addPaddleParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
      });
    }
  }

  private addScoreParticles(x: number, y: number) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x,
        y: y + (Math.random() - 0.5) * 100,
        vx: (x === 0 ? 1 : -1) * Math.random() * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1,
      });
    }
  }

  private endGame(playerWon: boolean) {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
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
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Center line
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 0);
    this.ctx.lineTo(this.width / 2, this.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Large score display
    this.ctx.fillStyle = "#222";
    this.ctx.font = "bold 100px 'Courier New', monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(String(this.playerScore), this.width / 4, this.height / 2 + 35);
    this.ctx.fillText(String(this.cpuScore), (this.width * 3) / 4, this.height / 2 + 35);

    // Particles
    this.ctx.fillStyle = "#fff";
    for (const p of this.particles) {
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Player paddle
    this.ctx.fillStyle = "#27ae60";
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

    // CPU paddle
    this.ctx.fillStyle = "#c0392b";
    this.ctx.fillRect(this.cpu.x, this.cpu.y, this.cpu.width, this.cpu.height);

    // Ball with glow effect
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "#fff";
    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Ball trail
    const trailLength = 5;
    for (let i = 1; i <= trailLength; i++) {
      const alpha = 1 - i / trailLength;
      this.ctx.fillStyle = `rgba(255,255,255,${alpha * 0.3})`;
      this.ctx.beginPath();
      this.ctx.arc(
        this.ball.x - this.ball.vx * i * 0.5,
        this.ball.y - this.ball.vy * i * 0.5,
        this.ball.radius * (1 - i / trailLength * 0.3),
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  public handleMouseMove(y: number) {
    if (this.status !== "playing") return;
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
