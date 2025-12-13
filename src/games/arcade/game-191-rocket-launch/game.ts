/**
 * Rocket Launch Game Engine
 * Game #191
 *
 * Launch your rocket to space while avoiding obstacles!
 */

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "asteroid" | "satellite" | "bird";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  altitude: number;
  fuel: number;
  score: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

const TARGET_ALTITUDE = 10000;

export class RocketLaunchGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rocketX = 0;
  private rocketY = 0;
  private rocketVx = 0;
  private rocketVy = 0;
  private rocketAngle = 0;
  private altitude = 0;
  private fuel = 100;
  private score = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private thrusting = false;
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private cameraY = 0;

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
        altitude: Math.floor(this.altitude),
        fuel: Math.floor(this.fuel),
        score: this.score,
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
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.rocketX = w / 2;
    this.rocketY = h - 80;
    this.rocketVx = 0;
    this.rocketVy = 0;
    this.rocketAngle = 0;
    this.altitude = 0;
    this.fuel = 100;
    this.score = 0;
    this.cameraY = 0;
    this.obstacles = [];
    this.particles = [];

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  setThrust(active: boolean) {
    this.thrusting = active;
  }

  steer(direction: "left" | "right") {
    if (this.status !== "playing") return;
    const turnSpeed = 0.1;
    if (direction === "left") {
      this.rocketAngle -= turnSpeed;
    } else {
      this.rocketAngle += turnSpeed;
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
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gravity = 0.05;
    const thrustPower = 0.2;
    const turnSpeed = 0.03;
    const maxAngle = Math.PI / 4;

    // Handle input
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.rocketAngle = Math.max(-maxAngle, this.rocketAngle - turnSpeed);
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.rocketAngle = Math.min(maxAngle, this.rocketAngle + turnSpeed);
    }

    const isThrusting =
      this.thrusting ||
      this.keys.has("ArrowUp") ||
      this.keys.has("w") ||
      this.keys.has("W") ||
      this.keys.has(" ");

    // Apply thrust
    if (isThrusting && this.fuel > 0) {
      const thrustX = Math.sin(this.rocketAngle) * thrustPower;
      const thrustY = -Math.cos(this.rocketAngle) * thrustPower;
      this.rocketVx += thrustX;
      this.rocketVy += thrustY;
      this.fuel -= 0.2;

      // Create exhaust particles
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: this.rocketX - Math.sin(this.rocketAngle) * 25,
          y: this.rocketY + Math.cos(this.rocketAngle) * 25,
          vx: -Math.sin(this.rocketAngle) * (2 + Math.random() * 2) + (Math.random() - 0.5),
          vy: Math.cos(this.rocketAngle) * (2 + Math.random() * 2) + (Math.random() - 0.5),
          life: 30,
          color: Math.random() > 0.5 ? "#f39c12" : "#e74c3c",
        });
      }

      this.emitState();
    }

    // Apply gravity (less as altitude increases)
    const gravityFactor = Math.max(0.1, 1 - this.altitude / TARGET_ALTITUDE);
    this.rocketVy += gravity * gravityFactor;

    // Air resistance
    this.rocketVx *= 0.99;
    this.rocketVy *= 0.995;

    // Move rocket
    this.rocketX += this.rocketVx;
    this.rocketY += this.rocketVy;

    // Update altitude
    this.altitude = Math.max(0, -this.rocketY + h - 80);
    this.score = Math.floor(this.altitude / 10);

    // Update camera
    if (this.rocketY < this.cameraY + h * 0.4) {
      this.cameraY = this.rocketY - h * 0.4;
    }

    // Horizontal bounds
    if (this.rocketX < 30) {
      this.rocketX = 30;
      this.rocketVx *= -0.5;
    } else if (this.rocketX > w - 30) {
      this.rocketX = w - 30;
      this.rocketVx *= -0.5;
    }

    // Spawn obstacles
    if (this.altitude > 500 && Math.random() < 0.02) {
      this.spawnObstacle();
    }

    // Update obstacles
    for (const obs of this.obstacles) {
      if (obs.type === "satellite") {
        obs.x += 1;
        if (obs.x > w + 50) obs.x = -50;
      }
    }

    // Check obstacle collisions
    for (const obs of this.obstacles) {
      const obsScreenY = obs.y - this.cameraY;
      if (
        this.rocketX > obs.x - 20 &&
        this.rocketX < obs.x + obs.width + 20 &&
        this.rocketY - this.cameraY > obsScreenY - 20 &&
        this.rocketY - this.cameraY < obsScreenY + obs.height + 20
      ) {
        this.status = "over";
        this.emitState();
        return;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Check ground collision
    if (this.rocketY > h - 40 && this.altitude === 0) {
      if (Math.abs(this.rocketVy) > 3 || Math.abs(this.rocketVx) > 2) {
        this.status = "over";
        this.emitState();
        return;
      }
    }

    // Check win
    if (this.altitude >= TARGET_ALTITUDE) {
      this.status = "won";
      this.score += Math.floor(this.fuel) * 10;
      this.emitState();
    }

    this.emitState();
  }

  private spawnObstacle() {
    const w = this.canvas.width;
    const types: Obstacle["type"][] = ["asteroid", "satellite", "bird"];
    const type = types[Math.floor(Math.random() * types.length)];

    this.obstacles.push({
      x: Math.random() * (w - 60),
      y: this.cameraY - 100,
      width: 40 + Math.random() * 30,
      height: 40 + Math.random() * 30,
      type,
    });
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background gradient based on altitude
    const altitudeFactor = Math.min(1, this.altitude / TARGET_ALTITUDE);
    this.drawBackground(altitudeFactor);

    ctx.save();
    ctx.translate(0, -this.cameraY);

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + (30 - p.life) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw obstacles
    for (const obs of this.obstacles) {
      this.drawObstacle(obs);
    }

    // Draw rocket
    this.drawRocket();

    ctx.restore();

    // Ground (only visible at low altitude)
    if (this.cameraY > -100) {
      const groundY = h - 40 - this.cameraY;
      if (groundY < h) {
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(0, Math.max(0, groundY), w, h);

        // Launch pad
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(w / 2 - 40, groundY - 10, 80, 15);
      }
    }

    // Altitude meter
    this.drawAltitudeMeter();
  }

  private drawBackground(altitudeFactor: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky to space gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    if (altitudeFactor < 0.3) {
      gradient.addColorStop(0, "#87ceeb");
      gradient.addColorStop(1, "#3498db");
    } else if (altitudeFactor < 0.6) {
      gradient.addColorStop(0, "#2c3e50");
      gradient.addColorStop(1, "#1a1a2e");
    } else {
      gradient.addColorStop(0, "#0c0c0c");
      gradient.addColorStop(1, "#1a1a2e");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stars (more visible at higher altitude)
    if (altitudeFactor > 0.2) {
      const starAlpha = Math.min(1, (altitudeFactor - 0.2) * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
      for (let i = 0; i < 100; i++) {
        const x = (i * 137 + this.cameraY * 0.1) % w;
        const y = (i * 251) % h;
        const size = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawRocket() {
    const ctx = this.ctx;
    const x = this.rocketX;
    const y = this.rocketY;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.rocketAngle);

    // Rocket body
    ctx.fillStyle = "#ecf0f1";
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(12, 10);
    ctx.lineTo(12, 25);
    ctx.lineTo(-12, 25);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();

    // Nose cone
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(8, -10);
    ctx.lineTo(-8, -10);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(-12, 15);
    ctx.lineTo(-20, 30);
    ctx.lineTo(-12, 25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12, 15);
    ctx.lineTo(20, 30);
    ctx.lineTo(12, 25);
    ctx.closePath();
    ctx.fill();

    // Window
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow (when thrusting)
    const isThrusting =
      this.thrusting ||
      this.keys.has("ArrowUp") ||
      this.keys.has("w") ||
      this.keys.has("W") ||
      this.keys.has(" ");

    if (isThrusting && this.fuel > 0) {
      const flameLength = 20 + Math.random() * 15;
      const gradient = ctx.createLinearGradient(0, 25, 0, 25 + flameLength);
      gradient.addColorStop(0, "#f39c12");
      gradient.addColorStop(0.5, "#e74c3c");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-8, 25);
      ctx.lineTo(0, 25 + flameLength);
      ctx.lineTo(8, 25);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawObstacle(obs: Obstacle) {
    const ctx = this.ctx;

    if (obs.type === "asteroid") {
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Craters
      ctx.fillStyle = "#636e72";
      ctx.beginPath();
      ctx.arc(obs.x + obs.width * 0.3, obs.y + obs.height * 0.4, obs.width * 0.15, 0, Math.PI * 2);
      ctx.arc(obs.x + obs.width * 0.7, obs.y + obs.height * 0.6, obs.width * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === "satellite") {
      // Body
      ctx.fillStyle = "#bdc3c7";
      ctx.fillRect(obs.x, obs.y + obs.height * 0.3, obs.width, obs.height * 0.4);

      // Solar panels
      ctx.fillStyle = "#3498db";
      ctx.fillRect(obs.x - 20, obs.y + obs.height * 0.35, 20, obs.height * 0.3);
      ctx.fillRect(obs.x + obs.width, obs.y + obs.height * 0.35, 20, obs.height * 0.3);
    } else {
      // Bird
      ctx.fillStyle = "#2d3436";
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      const wingFlap = Math.sin(Date.now() / 100) * 0.3;
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.width * 0.3, obs.y + obs.height / 2);
      ctx.quadraticCurveTo(obs.x, obs.y + wingFlap * 20, obs.x + obs.width * 0.3, obs.y);
      ctx.stroke();
    }
  }

  private drawAltitudeMeter() {
    const ctx = this.ctx;
    const w = this.canvas.width;

    // Meter background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(w - 30, 50, 20, 200);

    // Progress
    const progress = Math.min(1, this.altitude / TARGET_ALTITUDE);
    const gradient = ctx.createLinearGradient(0, 250, 0, 50);
    gradient.addColorStop(0, "#27ae60");
    gradient.addColorStop(0.5, "#f39c12");
    gradient.addColorStop(1, "#e74c3c");

    ctx.fillStyle = gradient;
    ctx.fillRect(w - 28, 250 - progress * 198, 16, progress * 198);

    // Target line
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w - 35, 52);
    ctx.lineTo(w - 5, 52);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SPACE", w - 20, 45);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
