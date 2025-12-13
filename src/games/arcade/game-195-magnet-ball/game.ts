/**
 * Magnet Ball Game Engine
 * Game #195
 */

export interface GameState {
  level: number;
  collected: number;
  total: number;
  status: "idle" | "playing" | "won" | "over";
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: "metal" | "danger";
  collected: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CollectionZone {
  x: number;
  y: number;
  radius: number;
}

type StateChangeCallback = (state: GameState) => void;

export class MagnetBallGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number = 500;

  private state: GameState = {
    level: 1,
    collected: 0,
    total: 5,
    status: "idle",
  };

  private onStateChange: StateChangeCallback | null = null;
  private animationId: number = 0;
  private lastTime: number = 0;

  private balls: Ball[] = [];
  private obstacles: Obstacle[] = [];
  private collectionZone: CollectionZone = { x: 0, y: 0, radius: 40 };

  private magnetActive: boolean = false;
  private magnetX: number = 0;
  private magnetY: number = 0;
  private magnetMode: "attract" | "repel" = "attract";
  private magnetStrength: number = 200;

  private friction: number = 0.98;
  private maxLevels: number = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.draw();
  }

  setOnStateChange(cb: StateChangeCallback) {
    this.onStateChange = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  setMagnetMode(mode: "attract" | "repel") {
    this.magnetMode = mode;
  }

  setMagnetActive(active: boolean, x?: number, y?: number) {
    this.magnetActive = active;
    if (x !== undefined && y !== undefined) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.size / rect.width;
      const scaleY = this.size / rect.height;
      this.magnetX = (x - rect.left) * scaleX;
      this.magnetY = (y - rect.top) * scaleY;
    }
  }

  updateMagnetPosition(clientX: number, clientY: number) {
    if (!this.magnetActive) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.size / rect.width;
    const scaleY = this.size / rect.height;
    this.magnetX = (clientX - rect.left) * scaleX;
    this.magnetY = (clientY - rect.top) * scaleY;
  }

  start() {
    this.state = {
      level: 1,
      collected: 0,
      total: 5,
      status: "playing",
    };

    this.setupLevel(1);
    this.notifyState();
    this.lastTime = performance.now();
    this.loop();
  }

  private setupLevel(level: number) {
    this.balls = [];
    this.obstacles = [];
    this.state.collected = 0;
    this.state.total = 4 + level;

    // Collection zone at center
    this.collectionZone = {
      x: this.size / 2,
      y: this.size / 2,
      radius: 35 - level,
    };

    // Create metal balls
    for (let i = 0; i < this.state.total; i++) {
      this.balls.push(this.createBall("metal", level));
    }

    // Add danger balls in later levels
    const dangerCount = Math.floor(level / 2);
    for (let i = 0; i < dangerCount; i++) {
      this.balls.push(this.createBall("danger", level));
    }

    // Add obstacles in later levels
    if (level >= 3) {
      this.createObstacles(level);
    }

    // Increase magnet strength with level
    this.magnetStrength = 200 + level * 20;
  }

  private createBall(type: "metal" | "danger", level: number): Ball {
    let x: number, y: number;
    let attempts = 0;

    do {
      x = 50 + Math.random() * (this.size - 100);
      y = 50 + Math.random() * (this.size - 100);
      attempts++;
    } while (
      attempts < 100 &&
      Math.sqrt(
        (x - this.collectionZone.x) ** 2 + (y - this.collectionZone.y) ** 2
      ) < 100
    );

    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: type === "metal" ? 15 : 12,
      type,
      collected: false,
    };
  }

  private createObstacles(level: number) {
    const count = Math.min(level - 2, 4);

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      const width = 60 + Math.random() * 40;
      const height = 15;

      // Place obstacles avoiding center
      let attempts = 0;
      do {
        x = 50 + Math.random() * (this.size - 150);
        y = 50 + Math.random() * (this.size - 100);
        attempts++;
      } while (
        attempts < 50 &&
        Math.sqrt(
          (x + width / 2 - this.collectionZone.x) ** 2 +
            (y + height / 2 - this.collectionZone.y) ** 2
        ) < 80
      );

      this.obstacles.push({ x, y, width, height });
    }
  }

  nextLevel() {
    this.state.level++;
    if (this.state.level > this.maxLevels) {
      // Game complete - restart
      this.state.level = 1;
    }
    this.state.status = "playing";
    this.setupLevel(this.state.level);
    this.notifyState();
    this.lastTime = performance.now();
    this.loop();
  }

  private loop() {
    if (this.state.status !== "playing") {
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number) {
    for (const ball of this.balls) {
      if (ball.collected) continue;

      // Apply magnet force
      if (this.magnetActive) {
        const dx = this.magnetX - ball.x;
        const dy = this.magnetY - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
          const force =
            (this.magnetStrength / (dist * dist)) *
            (this.magnetMode === "attract" ? 1 : -1);
          const maxForce = 500;
          const clampedForce = Math.min(Math.abs(force), maxForce) * Math.sign(force);

          ball.vx += (dx / dist) * clampedForce * dt;
          ball.vy += (dy / dist) * clampedForce * dt;
        }
      }

      // Apply friction
      ball.vx *= this.friction;
      ball.vy *= this.friction;

      // Update position
      ball.x += ball.vx * dt * 60;
      ball.y += ball.vy * dt * 60;

      // Wall collisions
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -0.8;
      }
      if (ball.x + ball.radius > this.size) {
        ball.x = this.size - ball.radius;
        ball.vx *= -0.8;
      }
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -0.8;
      }
      if (ball.y + ball.radius > this.size) {
        ball.y = this.size - ball.radius;
        ball.vy *= -0.8;
      }

      // Obstacle collisions
      for (const obs of this.obstacles) {
        this.handleObstacleCollision(ball, obs);
      }

      // Ball-to-ball collisions
      for (const other of this.balls) {
        if (other === ball || other.collected) continue;
        this.handleBallCollision(ball, other);
      }

      // Check collection zone
      const distToZone = Math.sqrt(
        (ball.x - this.collectionZone.x) ** 2 +
          (ball.y - this.collectionZone.y) ** 2
      );

      if (distToZone < this.collectionZone.radius + ball.radius * 0.5) {
        if (ball.type === "metal") {
          ball.collected = true;
          this.state.collected++;
          this.notifyState();

          // Check win
          if (this.state.collected >= this.state.total) {
            this.state.status = "won";
            this.notifyState();
          }
        } else if (ball.type === "danger") {
          // Game over
          this.state.status = "over";
          this.notifyState();
        }
      }
    }
  }

  private handleObstacleCollision(ball: Ball, obs: Obstacle) {
    // Find closest point on obstacle to ball
    const closestX = Math.max(obs.x, Math.min(ball.x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(ball.y, obs.y + obs.height));

    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ball.radius) {
      // Collision response
      if (dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        ball.x = closestX + nx * ball.radius;
        ball.y = closestY + ny * ball.radius;

        // Reflect velocity
        const dotProduct = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dotProduct * nx * 0.8;
        ball.vy -= 2 * dotProduct * ny * 0.8;
      }
    }
  }

  private handleBallCollision(a: Ball, b: Ball) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0) {
      // Separate balls
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      a.x -= (nx * overlap) / 2;
      a.y -= (ny * overlap) / 2;
      b.x += (nx * overlap) / 2;
      b.y += (ny * overlap) / 2;

      // Exchange velocities along collision normal
      const dvx = a.vx - b.vx;
      const dvy = a.vy - b.vy;
      const dvn = dvx * nx + dvy * ny;

      if (dvn > 0) {
        a.vx -= dvn * nx * 0.9;
        a.vy -= dvn * ny * 0.9;
        b.vx += dvn * nx * 0.9;
        b.vy += dvn * ny * 0.9;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.size, this.size);

    // Background
    const gradient = ctx.createRadialGradient(
      this.size / 2,
      this.size / 2,
      0,
      this.size / 2,
      this.size / 2,
      this.size / 2
    );
    gradient.addColorStop(0, "#2c3e50");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.size, this.size);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let i = 0; i <= this.size; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, this.size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(this.size, i);
      ctx.stroke();
    }

    // Draw obstacles
    for (const obs of this.obstacles) {
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      ctx.strokeStyle = "#95a5a6";
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw collection zone
    const zone = this.collectionZone;

    // Outer glow
    const zoneGradient = ctx.createRadialGradient(
      zone.x,
      zone.y,
      0,
      zone.x,
      zone.y,
      zone.radius * 1.5
    );
    zoneGradient.addColorStop(0, "rgba(46, 204, 113, 0.3)");
    zoneGradient.addColorStop(0.7, "rgba(46, 204, 113, 0.1)");
    zoneGradient.addColorStop(1, "rgba(46, 204, 113, 0)");
    ctx.fillStyle = zoneGradient;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Zone circle
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zone icon
    ctx.fillStyle = "#2ecc71";
    ctx.font = `${zone.radius}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎯", zone.x, zone.y);

    // Draw magnet effect
    if (this.magnetActive) {
      this.drawMagnetEffect();
    }

    // Draw balls
    for (const ball of this.balls) {
      if (ball.collected) continue;
      this.drawBall(ball);
    }
  }

  private drawMagnetEffect() {
    const ctx = this.ctx;
    const color = this.magnetMode === "attract" ? "#e74c3c" : "#3498db";

    // Magnetic field lines
    const numLines = 8;
    const maxRadius = 80;

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const time = performance.now() / 1000;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;

      ctx.beginPath();
      for (let r = 10; r < maxRadius; r += 5) {
        const offset =
          this.magnetMode === "attract"
            ? Math.sin(r * 0.1 - time * 5) * 5
            : Math.sin(r * 0.1 + time * 5) * 5;
        const x =
          this.magnetX +
          Math.cos(angle + offset * 0.02) *
            (this.magnetMode === "attract" ? maxRadius - r : r);
        const y =
          this.magnetY +
          Math.sin(angle + offset * 0.02) *
            (this.magnetMode === "attract" ? maxRadius - r : r);

        if (r === 10) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Center indicator
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.magnetX, this.magnetY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.magnetMode === "attract" ? "N" : "S", this.magnetX, this.magnetY);
  }

  private drawBall(ball: Ball) {
    const ctx = this.ctx;

    // Ball shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(
      ball.x + 3,
      ball.y + 3,
      ball.radius,
      ball.radius * 0.6,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Ball body
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      0,
      ball.x,
      ball.y,
      ball.radius
    );

    if (ball.type === "metal") {
      gradient.addColorStop(0, "#ecf0f1");
      gradient.addColorStop(0.5, "#bdc3c7");
      gradient.addColorStop(1, "#7f8c8d");
    } else {
      gradient.addColorStop(0, "#e74c3c");
      gradient.addColorStop(0.5, "#c0392b");
      gradient.addColorStop(1, "#922b21");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Danger indicator
    if (ball.type === "danger") {
      ctx.fillStyle = "white";
      ctx.font = `${ball.radius}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", ball.x, ball.y);
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
