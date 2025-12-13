/**
 * Balloon Puzzle Game Engine
 * Game #076 - Physics-based balloon navigation puzzle
 */

interface Vector2 {
  x: number;
  y: number;
}

interface Balloon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Obstacle {
  type: "rect" | "circle" | "spike";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

interface Goal {
  x: number;
  y: number;
  radius: number;
}

interface WindZone {
  x: number;
  y: number;
  width: number;
  height: number;
  forceX: number;
  forceY: number;
}

interface Level {
  balloon: { x: number; y: number };
  goal: Goal;
  obstacles: Obstacle[];
  windZones?: WindZone[];
}

const LEVELS: Level[] = [
  // Level 1 - Simple introduction
  {
    balloon: { x: 100, y: 350 },
    goal: { x: 500, y: 100, radius: 30 },
    obstacles: [],
  },
  // Level 2 - One obstacle
  {
    balloon: { x: 100, y: 350 },
    goal: { x: 500, y: 100, radius: 30 },
    obstacles: [{ type: "rect", x: 300, y: 150, width: 20, height: 200 }],
  },
  // Level 3 - Multiple obstacles
  {
    balloon: { x: 100, y: 350 },
    goal: { x: 500, y: 350, radius: 30 },
    obstacles: [
      { type: "rect", x: 200, y: 0, width: 20, height: 250 },
      { type: "rect", x: 400, y: 200, width: 20, height: 250 },
    ],
  },
  // Level 4 - Spikes
  {
    balloon: { x: 100, y: 200 },
    goal: { x: 500, y: 200, radius: 30 },
    obstacles: [
      { type: "spike", x: 300, y: 100, width: 40, height: 40 },
      { type: "spike", x: 300, y: 300, width: 40, height: 40 },
    ],
  },
  // Level 5 - Wind zones
  {
    balloon: { x: 100, y: 350 },
    goal: { x: 500, y: 50, radius: 30 },
    obstacles: [{ type: "rect", x: 250, y: 100, width: 20, height: 300 }],
    windZones: [{ x: 270, y: 0, width: 100, height: 200, forceX: 0, forceY: -0.3 }],
  },
];

export class BalloonGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  balloon: Balloon = { x: 0, y: 0, vx: 0, vy: 0, radius: 20 };
  goal: Goal = { x: 0, y: 0, radius: 30 };
  obstacles: Obstacle[] = [];
  windZones: WindZone[] = [];

  currentLevel: number = 0;
  moves: number = 0;
  status: "playing" | "won" | "lost" = "playing";

  // Physics
  gravity: number = 0.05;
  buoyancy: number = 0.08;
  drag: number = 0.99;
  clickForce: number = 0.8;

  // Wind particles for visual effect
  windParticles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  public loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex] || LEVELS[0];

    this.balloon = {
      x: level.balloon.x,
      y: level.balloon.y,
      vx: 0,
      vy: 0,
      radius: 20,
    };

    this.goal = { ...level.goal };
    this.obstacles = level.obstacles.map((o) => ({ ...o }));
    this.windZones = level.windZones?.map((w) => ({ ...w })) || [];
    this.moves = 0;
    this.status = "playing";
    this.windParticles = [];

    this.notifyState();
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (this.status !== "playing") return;

    // Apply gravity and buoyancy
    this.balloon.vy += this.gravity - this.buoyancy;

    // Apply wind zones
    this.windZones.forEach((zone) => {
      if (this.isInZone(this.balloon, zone)) {
        this.balloon.vx += zone.forceX;
        this.balloon.vy += zone.forceY;
      }
    });

    // Apply drag
    this.balloon.vx *= this.drag;
    this.balloon.vy *= this.drag;

    // Update position
    this.balloon.x += this.balloon.vx;
    this.balloon.y += this.balloon.vy;

    // Boundary collision
    this.handleBoundaryCollision();

    // Obstacle collision
    this.handleObstacleCollision();

    // Check goal
    this.checkGoal();

    // Update wind particles
    this.updateWindParticles();
  }

  private isInZone(balloon: Balloon, zone: WindZone): boolean {
    return (
      balloon.x > zone.x &&
      balloon.x < zone.x + zone.width &&
      balloon.y > zone.y &&
      balloon.y < zone.y + zone.height
    );
  }

  private handleBoundaryCollision() {
    const r = this.balloon.radius;

    if (this.balloon.x - r < 0) {
      this.balloon.x = r;
      this.balloon.vx *= -0.5;
    }
    if (this.balloon.x + r > this.canvas.width) {
      this.balloon.x = this.canvas.width - r;
      this.balloon.vx *= -0.5;
    }
    if (this.balloon.y - r < 0) {
      this.balloon.y = r;
      this.balloon.vy *= -0.5;
    }
    if (this.balloon.y + r > this.canvas.height) {
      this.balloon.y = this.canvas.height - r;
      this.balloon.vy *= -0.5;
    }
  }

  private handleObstacleCollision() {
    this.obstacles.forEach((obs) => {
      if (obs.type === "rect" && obs.width && obs.height) {
        if (this.circleRectCollision(this.balloon, obs)) {
          // Bounce off
          this.resolveRectCollision(obs);
        }
      } else if (obs.type === "spike" && obs.width && obs.height) {
        if (this.circleRectCollision(this.balloon, obs)) {
          // Game over
          this.status = "lost";
          this.notifyState();
        }
      } else if (obs.type === "circle" && obs.radius) {
        const dist = Math.hypot(this.balloon.x - obs.x, this.balloon.y - obs.y);
        if (dist < this.balloon.radius + obs.radius) {
          // Bounce off
          const angle = Math.atan2(this.balloon.y - obs.y, this.balloon.x - obs.x);
          this.balloon.vx = Math.cos(angle) * 2;
          this.balloon.vy = Math.sin(angle) * 2;
        }
      }
    });
  }

  private circleRectCollision(
    circle: Balloon,
    rect: { x: number; y: number; width?: number; height?: number }
  ): boolean {
    const w = rect.width || 0;
    const h = rect.height || 0;
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + w));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + h));
    const dist = Math.hypot(circle.x - closestX, circle.y - closestY);
    return dist < circle.radius;
  }

  private resolveRectCollision(rect: { x: number; y: number; width?: number; height?: number }) {
    const w = rect.width || 0;
    const h = rect.height || 0;
    const cx = rect.x + w / 2;
    const cy = rect.y + h / 2;

    const dx = this.balloon.x - cx;
    const dy = this.balloon.y - cy;

    // Determine which side we hit
    const overlapX = w / 2 + this.balloon.radius - Math.abs(dx);
    const overlapY = h / 2 + this.balloon.radius - Math.abs(dy);

    if (overlapX < overlapY) {
      // Horizontal collision
      this.balloon.x += dx > 0 ? overlapX : -overlapX;
      this.balloon.vx *= -0.5;
    } else {
      // Vertical collision
      this.balloon.y += dy > 0 ? overlapY : -overlapY;
      this.balloon.vy *= -0.5;
    }
  }

  private checkGoal() {
    const dist = Math.hypot(this.balloon.x - this.goal.x, this.balloon.y - this.goal.y);
    if (dist < this.balloon.radius + this.goal.radius) {
      this.status = "won";
      this.notifyState();
    }
  }

  private updateWindParticles() {
    // Spawn new particles in wind zones
    this.windZones.forEach((zone) => {
      if (Math.random() < 0.3) {
        this.windParticles.push({
          x: zone.x + Math.random() * zone.width,
          y: zone.y + Math.random() * zone.height,
          vx: zone.forceX * 10,
          vy: zone.forceY * 10,
          life: 1,
        });
      }
    });

    // Update particles
    this.windParticles = this.windParticles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Apply force away from click point
    const dx = this.balloon.x - x;
    const dy = this.balloon.y - y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      const force = this.clickForce * Math.min(1, 100 / dist);
      this.balloon.vx += (dx / dist) * force;
      this.balloon.vy += (dy / dist) * force;
    }

    this.moves++;
    this.notifyState();
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F7FF");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw clouds
    this.drawClouds();

    // Draw wind zones
    this.drawWindZones();

    // Draw wind particles
    this.drawWindParticles();

    // Draw obstacles
    this.drawObstacles();

    // Draw goal
    this.drawGoal();

    // Draw balloon
    this.drawBalloon();
  }

  private drawClouds() {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    const clouds = [
      { x: 50, y: 50, r: 30 },
      { x: 100, y: 80, r: 40 },
      { x: 400, y: 60, r: 35 },
      { x: 450, y: 40, r: 25 },
    ];
    clouds.forEach((c) => {
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      this.ctx.arc(c.x + c.r * 0.7, c.y, c.r * 0.8, 0, Math.PI * 2);
      this.ctx.arc(c.x - c.r * 0.5, c.y + 5, c.r * 0.6, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawWindZones() {
    this.ctx.fillStyle = "rgba(173, 216, 230, 0.3)";
    this.ctx.strokeStyle = "rgba(100, 149, 237, 0.5)";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.windZones.forEach((zone) => {
      this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      this.ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

      // Draw arrow indicating wind direction
      const cx = zone.x + zone.width / 2;
      const cy = zone.y + zone.height / 2;
      const angle = Math.atan2(zone.forceY, zone.forceX);
      const arrowLen = 30;

      this.ctx.setLineDash([]);
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx + Math.cos(angle) * arrowLen, cy + Math.sin(angle) * arrowLen);
      this.ctx.strokeStyle = "rgba(100, 149, 237, 0.8)";
      this.ctx.stroke();
    });

    this.ctx.setLineDash([]);
  }

  private drawWindParticles() {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    this.windParticles.forEach((p) => {
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  private drawObstacles() {
    this.obstacles.forEach((obs) => {
      if (obs.type === "rect" && obs.width && obs.height) {
        this.ctx.fillStyle = "#7f8c8d";
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Highlight
        this.ctx.fillStyle = "rgba(255,255,255,0.2)";
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height / 3);
      } else if (obs.type === "spike" && obs.width && obs.height) {
        this.ctx.fillStyle = "#e74c3c";
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        this.ctx.lineTo(obs.x, obs.y + obs.height);
        this.ctx.closePath();
        this.ctx.fill();
        // Glow
        this.ctx.shadowColor = "#e74c3c";
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      } else if (obs.type === "circle" && obs.radius) {
        this.ctx.fillStyle = "#7f8c8d";
        this.ctx.beginPath();
        this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  private drawGoal() {
    // Outer glow
    this.ctx.shadowColor = "#f1c40f";
    this.ctx.shadowBlur = 20;

    // Goal circle
    const gradient = this.ctx.createRadialGradient(
      this.goal.x,
      this.goal.y,
      0,
      this.goal.x,
      this.goal.y,
      this.goal.radius
    );
    gradient.addColorStop(0, "#f1c40f");
    gradient.addColorStop(1, "#e67e22");

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.goal.x, this.goal.y, this.goal.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    // Star icon
    this.ctx.fillStyle = "white";
    this.ctx.font = `${this.goal.radius}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("★", this.goal.x, this.goal.y);
  }

  private drawBalloon() {
    const { x, y, radius } = this.balloon;

    // String
    this.ctx.strokeStyle = "#888";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + radius);
    this.ctx.quadraticCurveTo(x + 5, y + radius + 20, x, y + radius + 35);
    this.ctx.stroke();

    // Balloon body
    const gradient = this.ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
    gradient.addColorStop(0, "#ff6b6b");
    gradient.addColorStop(1, "#c0392b");

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, radius, radius * 1.2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Highlight
    this.ctx.fillStyle = "rgba(255,255,255,0.4)";
    this.ctx.beginPath();
    this.ctx.ellipse(x - 5, y - 8, radius * 0.3, radius * 0.4, -0.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Knot
    this.ctx.fillStyle = "#a93226";
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, y + radius);
    this.ctx.lineTo(x + 5, y + radius);
    this.ctx.lineTo(x, y + radius + 8);
    this.ctx.closePath();
    this.ctx.fill();
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.loop();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 450;
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    if (this.status !== "playing") {
      this.status = "playing";
      this.loop();
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: this.moves,
        status: this.status,
        maxLevel: LEVELS.length,
      });
    }
  }
}
