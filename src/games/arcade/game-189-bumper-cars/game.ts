/**
 * Bumper Cars Game Engine
 * Game #189
 *
 * Bump into other cars to score points!
 */

interface Car {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  hitCooldown: number;
}

interface GameState {
  score: number;
  time: number;
  hits: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const CAR_COLORS = ["#3498db", "#2ecc71", "#9b59b6", "#1abc9c", "#e91e63"];

export class BumperCarsGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Car | null = null;
  private cars: Car[] = [];
  private score = 0;
  private time = 60;
  private hits = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private timerInterval: number | null = null;
  private keys: Set<string> = new Set();

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
        time: this.time,
        hits: this.hits,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.draw();
  }

  start() {
    this.score = 0;
    this.time = 60;
    this.hits = 0;
    this.cars = [];

    const w = this.canvas.width;
    const carRadius = w * 0.05;

    // Create player
    this.player = {
      x: w / 2,
      y: w / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: carRadius,
      color: "#e74c3c",
      isPlayer: true,
      hitCooldown: 0,
    };

    // Create AI cars
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const dist = w * 0.3;
      this.cars.push({
        x: w / 2 + Math.cos(angle) * dist,
        y: w / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        angle: Math.random() * Math.PI * 2,
        radius: carRadius,
        color: CAR_COLORS[i % CAR_COLORS.length],
        isPlayer: false,
        hitCooldown: 0,
      });
    }

    this.status = "playing";
    this.emitState();
    this.startTimer();
    this.gameLoop();
  }

  private startTimer() {
    this.timerInterval = window.setInterval(() => {
      if (this.status !== "playing") return;

      this.time--;
      this.emitState();

      if (this.time <= 0) {
        this.status = "over";
        this.emitState();
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  accelerate(direction: "up" | "down" | "left" | "right") {
    if (!this.player || this.status !== "playing") return;
    const accel = 0.5;
    switch (direction) {
      case "up":
        this.player.vy -= accel;
        break;
      case "down":
        this.player.vy += accel;
        break;
      case "left":
        this.player.vx -= accel;
        break;
      case "right":
        this.player.vx += accel;
        break;
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
    const h = this.canvas.height;
    const friction = 0.98;
    const maxSpeed = 8;
    const accel = 0.3;

    // Handle input
    if (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has("W")) {
      this.player.vy -= accel;
    }
    if (this.keys.has("ArrowDown") || this.keys.has("s") || this.keys.has("S")) {
      this.player.vy += accel;
    }
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.player.vx -= accel;
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.player.vx += accel;
    }

    // Update all cars including player
    const allCars = [this.player, ...this.cars];

    for (const car of allCars) {
      // Apply friction
      car.vx *= friction;
      car.vy *= friction;

      // Limit speed
      const speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
      if (speed > maxSpeed) {
        car.vx = (car.vx / speed) * maxSpeed;
        car.vy = (car.vy / speed) * maxSpeed;
      }

      // Move
      car.x += car.vx;
      car.y += car.vy;

      // Update angle
      if (speed > 0.5) {
        car.angle = Math.atan2(car.vy, car.vx);
      }

      // Bounce off walls
      const padding = 30;
      if (car.x - car.radius < padding) {
        car.x = padding + car.radius;
        car.vx *= -0.8;
      } else if (car.x + car.radius > w - padding) {
        car.x = w - padding - car.radius;
        car.vx *= -0.8;
      }
      if (car.y - car.radius < padding) {
        car.y = padding + car.radius;
        car.vy *= -0.8;
      } else if (car.y + car.radius > h - padding) {
        car.y = h - padding - car.radius;
        car.vy *= -0.8;
      }

      // Reduce hit cooldown
      if (car.hitCooldown > 0) {
        car.hitCooldown--;
      }
    }

    // AI movement
    for (const car of this.cars) {
      // Random wandering
      if (Math.random() < 0.02) {
        car.vx += (Math.random() - 0.5) * 2;
        car.vy += (Math.random() - 0.5) * 2;
      }

      // Occasionally chase player
      if (Math.random() < 0.01) {
        const dx = this.player.x - car.x;
        const dy = this.player.y - car.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          car.vx += (dx / dist) * 0.5;
          car.vy += (dy / dist) * 0.5;
        }
      }
    }

    // Check collisions
    for (let i = 0; i < allCars.length; i++) {
      for (let j = i + 1; j < allCars.length; j++) {
        const car1 = allCars[i];
        const car2 = allCars[j];

        const dx = car2.x - car1.x;
        const dy = car2.y - car1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = car1.radius + car2.radius;

        if (dist < minDist && dist > 0) {
          // Collision response
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // Separate cars
          car1.x -= (nx * overlap) / 2;
          car1.y -= (ny * overlap) / 2;
          car2.x += (nx * overlap) / 2;
          car2.y += (ny * overlap) / 2;

          // Calculate relative velocity
          const dvx = car1.vx - car2.vx;
          const dvy = car1.vy - car2.vy;
          const dvn = dvx * nx + dvy * ny;

          // Apply impulse
          const impulse = dvn * 1.5;
          car1.vx -= impulse * nx;
          car1.vy -= impulse * ny;
          car2.vx += impulse * nx;
          car2.vy += impulse * ny;

          // Score for player hits
          if (
            (car1.isPlayer || car2.isPlayer) &&
            car1.hitCooldown === 0 &&
            car2.hitCooldown === 0
          ) {
            this.hits++;
            this.score += 50;
            car1.hitCooldown = 30;
            car2.hitCooldown = 30;
            this.emitState();
          }
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Arena background
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, w, h);

    // Arena floor pattern
    ctx.fillStyle = "#34495e";
    const tileSize = 40;
    for (let x = 0; x < w; x += tileSize * 2) {
      for (let y = 0; y < h; y += tileSize * 2) {
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.fillRect(x + tileSize, y + tileSize, tileSize, tileSize);
      }
    }

    // Arena border
    const padding = 30;
    ctx.strokeStyle = "#f39c12";
    ctx.lineWidth = 8;
    ctx.strokeRect(padding, padding, w - padding * 2, h - padding * 2);

    // Corner bumpers
    ctx.fillStyle = "#e74c3c";
    const cornerSize = 40;
    ctx.beginPath();
    ctx.arc(padding, padding, cornerSize, 0, Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w - padding, padding, cornerSize, Math.PI / 2, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w - padding, h - padding, cornerSize, Math.PI, (Math.PI * 3) / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(padding, h - padding, cornerSize, (Math.PI * 3) / 2, Math.PI * 2);
    ctx.fill();

    // Draw AI cars
    for (const car of this.cars) {
      this.drawCar(car);
    }

    // Draw player
    if (this.player) {
      this.drawCar(this.player);
    }
  }

  private drawCar(car: Car) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(3, 3, car.radius * 1.1, car.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body
    const gradient = ctx.createRadialGradient(
      -car.radius * 0.3,
      -car.radius * 0.3,
      0,
      0,
      0,
      car.radius
    );
    gradient.addColorStop(0, this.lightenColor(car.color, 30));
    gradient.addColorStop(1, car.color);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, car.radius, car.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bumper ring
    ctx.strokeStyle = car.hitCooldown > 0 ? "#fff" : "#333";
    ctx.lineWidth = car.hitCooldown > 0 ? 4 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, car.radius, car.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Front indicator
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(car.radius * 0.5, 0, car.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Driver
    ctx.fillStyle = "#ffd5a3";
    ctx.beginPath();
    ctx.arc(0, 0, car.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Driver details
    if (car.isPlayer) {
      ctx.fillStyle = "#e74c3c";
    } else {
      ctx.fillStyle = "#3498db";
    }
    ctx.beginPath();
    ctx.arc(0, -car.radius * 0.15, car.radius * 0.15, Math.PI, 0);
    ctx.fill();

    ctx.restore();

    // Hit effect
    if (car.hitCooldown > 20) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(car.hitCooldown - 20) / 10})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(car.x, car.y, car.radius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  destroy() {
    this.stopTimer();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
