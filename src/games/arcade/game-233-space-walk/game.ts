/**
 * Space Walk Game Engine
 * Game #233
 *
 * Zero gravity space exploration - survive and collect!
 */

interface Vector2D {
  x: number;
  y: number;
}

interface GameObject {
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
}

interface Astronaut extends GameObject {
  angle: number;
  oxygenLevel: number;
  invulnerable: number;
}

interface EnergyOrb extends GameObject {
  type: "energy" | "star";
  points: number;
  pulse: number;
}

interface Obstacle extends GameObject {
  type: "debris" | "meteor";
  rotation: number;
  rotationSpeed: number;
  size: number;
}

interface OxygenTank extends GameObject {
  amount: number;
  spin: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameState {
  score: number;
  highScore: number;
  oxygen: number;
  status: "idle" | "playing" | "over";
  survivalTime: number;
}

type StateCallback = (state: GameState) => void;

const OXYGEN_DECAY_RATE = 0.1;
const MAX_OXYGEN = 100;
const MOVE_FORCE = 0.3;
const FRICTION = 0.98;
const MAX_SPEED = 8;

export class SpaceWalkGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private astronaut: Astronaut;
  private energyOrbs: EnergyOrb[] = [];
  private obstacles: Obstacle[] = [];
  private oxygenTanks: OxygenTank[] = [];
  private particles: Particle[] = [];
  private stars: { x: number; y: number; size: number; twinkle: number }[] = [];
  private score = 0;
  private highScore = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private startTime = 0;
  private elapsedTime = 0;
  private spawnTimer = 0;
  private difficulty = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Load high score
    const saved = localStorage.getItem("space-walk-high-score");
    if (saved) this.highScore = parseInt(saved, 10);

    this.astronaut = this.createAstronaut();
    this.generateStars();
  }

  private createAstronaut(): Astronaut {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      pos: { x: w / 2, y: h / 2 },
      vel: { x: 0, y: 0 },
      radius: w * 0.03,
      angle: 0,
      oxygenLevel: MAX_OXYGEN,
      invulnerable: 0,
    };
  }

  private generateStars() {
    this.stars = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        oxygen: Math.round(this.astronaut.oxygenLevel),
        status: this.status,
        survivalTime: this.elapsedTime,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 600);
    this.canvas.width = size;
    this.canvas.height = size;

    // Recreate astronaut with new size
    const oldPos = this.astronaut ? this.astronaut.pos : { x: size / 2, y: size / 2 };
    const oldVel = this.astronaut ? this.astronaut.vel : { x: 0, y: 0 };
    const oldOxygen = this.astronaut ? this.astronaut.oxygenLevel : MAX_OXYGEN;

    this.astronaut = this.createAstronaut();
    this.astronaut.pos = oldPos;
    this.astronaut.vel = oldVel;
    this.astronaut.oxygenLevel = oldOxygen;

    this.generateStars();
    this.draw();
  }

  start() {
    this.score = 0;
    this.astronaut = this.createAstronaut();
    this.energyOrbs = [];
    this.obstacles = [];
    this.oxygenTanks = [];
    this.particles = [];
    this.status = "playing";
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.spawnTimer = 0;
    this.difficulty = 1;
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

  movePlayer(direction: "up" | "down" | "left" | "right") {
    if (this.status !== "playing") return;

    const force = MOVE_FORCE;
    switch (direction) {
      case "up":
        this.astronaut.vel.y -= force;
        this.astronaut.angle = -Math.PI / 2;
        break;
      case "down":
        this.astronaut.vel.y += force;
        this.astronaut.angle = Math.PI / 2;
        break;
      case "left":
        this.astronaut.vel.x -= force;
        this.astronaut.angle = Math.PI;
        break;
      case "right":
        this.astronaut.vel.x += force;
        this.astronaut.angle = 0;
        break;
    }

    // Add thruster particles
    this.createThrusterParticles();
  }

  private createThrusterParticles() {
    const a = this.astronaut;
    const oppositeAngle = a.angle + Math.PI;

    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: a.pos.x - Math.cos(a.angle) * a.radius,
        y: a.pos.y - Math.sin(a.angle) * a.radius,
        vx: Math.cos(oppositeAngle) * 2 + (Math.random() - 0.5),
        vy: Math.sin(oppositeAngle) * 2 + (Math.random() - 0.5),
        life: 30,
        maxLife: 30,
        color: "#00ffff",
        size: 3,
      });
    }
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Update elapsed time
    this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
    this.difficulty = 1 + this.elapsedTime / 30;

    // Handle keyboard input
    if (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has("W")) {
      this.movePlayer("up");
    }
    if (this.keys.has("ArrowDown") || this.keys.has("s") || this.keys.has("S")) {
      this.movePlayer("down");
    }
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.movePlayer("left");
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.movePlayer("right");
    }

    // Update astronaut
    const a = this.astronaut;

    // Apply friction
    a.vel.x *= FRICTION;
    a.vel.y *= FRICTION;

    // Limit speed
    const speed = Math.sqrt(a.vel.x ** 2 + a.vel.y ** 2);
    if (speed > MAX_SPEED) {
      a.vel.x = (a.vel.x / speed) * MAX_SPEED;
      a.vel.y = (a.vel.y / speed) * MAX_SPEED;
    }

    // Update position
    a.pos.x += a.vel.x;
    a.pos.y += a.vel.y;

    // Wrap around screen
    if (a.pos.x < -a.radius) a.pos.x = w + a.radius;
    if (a.pos.x > w + a.radius) a.pos.x = -a.radius;
    if (a.pos.y < -a.radius) a.pos.y = h + a.radius;
    if (a.pos.y > h + a.radius) a.pos.y = -a.radius;

    // Decrease oxygen
    a.oxygenLevel -= OXYGEN_DECAY_RATE;
    if (a.oxygenLevel <= 0) {
      this.gameOver();
      return;
    }

    // Update invulnerability
    if (a.invulnerable > 0) a.invulnerable--;

    // Spawn collectibles and obstacles
    this.spawnTimer++;
    if (this.spawnTimer > 60 / this.difficulty) {
      this.spawnTimer = 0;
      this.spawnObjects();
    }

    // Update energy orbs
    for (const orb of this.energyOrbs) {
      orb.pulse += 0.1;
    }

    // Update obstacles
    for (const obs of this.obstacles) {
      obs.pos.x += obs.vel.x;
      obs.pos.y += obs.vel.y;
      obs.rotation += obs.rotationSpeed;

      // Wrap around
      if (obs.pos.x < -obs.radius) obs.pos.x = w + obs.radius;
      if (obs.pos.x > w + obs.radius) obs.pos.x = -obs.radius;
      if (obs.pos.y < -obs.radius) obs.pos.y = h + obs.radius;
      if (obs.pos.y > h + obs.radius) obs.pos.y = -obs.radius;
    }

    // Update oxygen tanks
    for (const tank of this.oxygenTanks) {
      tank.spin += 0.05;
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // Update stars twinkle
    for (const star of this.stars) {
      star.twinkle += 0.05;
    }

    // Check collisions
    this.checkCollisions();

    // Add score for survival
    if (this.elapsedTime % 10 === 0 && this.elapsedTime > 0) {
      // Only add once per 10 seconds
    }

    this.emitState();
  }

  private spawnObjects() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const rand = Math.random();

    // Random spawn position at edge
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    switch (edge) {
      case 0: x = Math.random() * w; y = -20; break; // top
      case 1: x = Math.random() * w; y = h + 20; break; // bottom
      case 2: x = -20; y = Math.random() * h; break; // left
      case 3: x = w + 20; y = Math.random() * h; break; // right
    }

    if (rand < 0.35) {
      // Spawn energy orb
      this.energyOrbs.push({
        pos: { x, y },
        vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        radius: w * 0.02,
        type: Math.random() > 0.7 ? "star" : "energy",
        points: Math.random() > 0.7 ? 50 : 10,
        pulse: 0,
      });
    } else if (rand < 0.55) {
      // Spawn oxygen tank
      if (this.oxygenTanks.length < 3) {
        this.oxygenTanks.push({
          pos: { x, y },
          vel: { x: (Math.random() - 0.5), y: (Math.random() - 0.5) },
          radius: w * 0.025,
          amount: 30,
          spin: 0,
        });
      }
    } else {
      // Spawn obstacle
      const type = Math.random() > 0.5 ? "debris" : "meteor";
      const size = Math.random() * 0.5 + 0.5;
      this.obstacles.push({
        pos: { x, y },
        vel: {
          x: (Math.random() - 0.5) * 3 * this.difficulty,
          y: (Math.random() - 0.5) * 3 * this.difficulty,
        },
        radius: w * 0.03 * size,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        size,
      });
    }

    // Limit object counts
    if (this.energyOrbs.length > 15) this.energyOrbs.shift();
    if (this.obstacles.length > 12) this.obstacles.shift();
  }

  private checkCollisions() {
    const a = this.astronaut;

    // Check energy orbs
    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i];
      const dist = Math.sqrt((a.pos.x - orb.pos.x) ** 2 + (a.pos.y - orb.pos.y) ** 2);

      if (dist < a.radius + orb.radius) {
        this.score += orb.points;
        this.energyOrbs.splice(i, 1);
        this.createCollectParticles(orb.pos.x, orb.pos.y, orb.type === "star" ? "#ffff00" : "#00ffff");

        if (this.score > this.highScore) {
          this.highScore = this.score;
          localStorage.setItem("space-walk-high-score", this.score.toString());
        }
      }
    }

    // Check oxygen tanks
    for (let i = this.oxygenTanks.length - 1; i >= 0; i--) {
      const tank = this.oxygenTanks[i];
      const dist = Math.sqrt((a.pos.x - tank.pos.x) ** 2 + (a.pos.y - tank.pos.y) ** 2);

      if (dist < a.radius + tank.radius) {
        a.oxygenLevel = Math.min(MAX_OXYGEN, a.oxygenLevel + tank.amount);
        this.oxygenTanks.splice(i, 1);
        this.createCollectParticles(tank.pos.x, tank.pos.y, "#00ff00");
      }
    }

    // Check obstacles
    if (a.invulnerable === 0) {
      for (const obs of this.obstacles) {
        const dist = Math.sqrt((a.pos.x - obs.pos.x) ** 2 + (a.pos.y - obs.pos.y) ** 2);

        if (dist < a.radius + obs.radius) {
          a.oxygenLevel -= 20;
          a.invulnerable = 60; // 1 second invulnerability
          this.createExplosionParticles(a.pos.x, a.pos.y);

          if (a.oxygenLevel <= 0) {
            this.gameOver();
            return;
          }
        }
      }
    }
  }

  private createCollectParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 20,
        maxLife: 20,
        color,
        size: 3,
      });
    }
  }

  private createExplosionParticles(x: number, y: number) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (Math.random() * 4 + 2),
        vy: Math.sin(angle) * (Math.random() * 4 + 2),
        life: 30,
        maxLife: 30,
        color: "#ff0000",
        size: 4,
      });
    }
  }

  private gameOver() {
    this.status = "over";
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "#0a0a1e");
    gradient.addColorStop(1, "#000510");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw stars
    for (const star of this.stars) {
      const alpha = 0.5 + Math.sin(star.twinkle) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw energy orbs
    for (const orb of this.energyOrbs) {
      const pulseSize = orb.radius + Math.sin(orb.pulse) * 3;

      if (orb.type === "star") {
        this.drawStar(ctx, orb.pos.x, orb.pos.y, pulseSize, "#ffff00");
      } else {
        // Energy orb
        const gradient = ctx.createRadialGradient(
          orb.pos.x, orb.pos.y, 0,
          orb.pos.x, orb.pos.y, pulseSize
        );
        gradient.addColorStop(0, "#00ffff");
        gradient.addColorStop(0.5, "#0088ff");
        gradient.addColorStop(1, "rgba(0, 136, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.pos.x, orb.pos.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw oxygen tanks
    for (const tank of this.oxygenTanks) {
      ctx.save();
      ctx.translate(tank.pos.x, tank.pos.y);
      ctx.rotate(tank.spin);

      // Tank body
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(-tank.radius * 0.6, -tank.radius, tank.radius * 1.2, tank.radius * 2);

      // Tank cap
      ctx.fillStyle = "#00cc00";
      ctx.fillRect(-tank.radius * 0.3, -tank.radius * 1.2, tank.radius * 0.6, tank.radius * 0.4);

      // O2 symbol
      ctx.fillStyle = "#000";
      ctx.font = `${tank.radius * 0.8}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("O₂", 0, 0);

      ctx.restore();
    }

    // Draw obstacles
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.translate(obs.pos.x, obs.pos.y);
      ctx.rotate(obs.rotation);

      if (obs.type === "debris") {
        // Space debris - angular shape
        ctx.fillStyle = "#888888";
        ctx.beginPath();
        const points = 6;
        for (let i = 0; i < points; i++) {
          const angle = (Math.PI * 2 * i) / points;
          const r = obs.radius * (0.7 + Math.random() * 0.3);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Meteor - rough circle with craters
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        ctx.fill();

        // Craters
        ctx.fillStyle = "#654321";
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 * i) / 3;
          const x = Math.cos(angle) * obs.radius * 0.4;
          const y = Math.sin(angle) * obs.radius * 0.4;
          ctx.beginPath();
          ctx.arc(x, y, obs.radius * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // Draw astronaut
    this.drawAstronaut();

    // Draw oxygen bar
    this.drawOxygenBar();
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < 5; i++) {
      const angle1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const angle2 = (Math.PI * 2 * (i + 0.5)) / 5 - Math.PI / 2;
      const x1 = Math.cos(angle1) * radius;
      const y1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius * 0.5;
      const y2 = Math.sin(angle2) * radius * 0.5;

      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }

    ctx.closePath();
    ctx.fill();

    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawAstronaut() {
    const ctx = this.ctx;
    const a = this.astronaut;

    // Blink effect when invulnerable
    if (a.invulnerable > 0 && Math.floor(a.invulnerable / 5) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    ctx.save();
    ctx.translate(a.pos.x, a.pos.y);

    // Rotate based on movement direction
    if (Math.abs(a.vel.x) > 0.1 || Math.abs(a.vel.y) > 0.1) {
      const targetAngle = Math.atan2(a.vel.y, a.vel.x);
      a.angle = targetAngle;
    }
    ctx.rotate(a.angle);

    // Backpack (oxygen tank)
    ctx.fillStyle = "#555555";
    ctx.fillRect(-a.radius * 0.6, -a.radius * 0.8, a.radius * 1.2, a.radius * 1.6);

    // Body (spacesuit)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, a.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#cccccc";
    ctx.beginPath();
    ctx.arc(a.radius * 0.3, -a.radius * 0.2, a.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    const gradient = ctx.createRadialGradient(
      a.radius * 0.3, -a.radius * 0.2, 0,
      a.radius * 0.3, -a.radius * 0.2, a.radius * 0.5
    );
    gradient.addColorStop(0, "#4444ff");
    gradient.addColorStop(1, "#000044");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(a.radius * 0.3, -a.radius * 0.2, a.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = a.radius * 0.3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-a.radius * 0.3, 0);
    ctx.lineTo(-a.radius * 0.8, a.radius * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-a.radius * 0.3, 0);
    ctx.lineTo(-a.radius * 0.8, -a.radius * 0.5);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(-a.radius * 0.2, a.radius * 0.3);
    ctx.lineTo(-a.radius * 0.5, a.radius * 0.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(a.radius * 0.2, a.radius * 0.3);
    ctx.lineTo(a.radius * 0.5, a.radius * 0.9);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawOxygenBar() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const barWidth = w * 0.3;
    const barHeight = w * 0.03;
    const x = w * 0.05;
    const y = w * 0.05;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Oxygen level
    const oxygenPercent = this.astronaut.oxygenLevel / MAX_OXYGEN;
    const oxygenWidth = barWidth * oxygenPercent;

    let color = "#00ff00";
    if (oxygenPercent < 0.3) color = "#ff0000";
    else if (oxygenPercent < 0.6) color = "#ffaa00";

    ctx.fillStyle = color;
    ctx.fillRect(x, y, oxygenWidth, barHeight);

    // Border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Label
    ctx.fillStyle = "#ffffff";
    ctx.font = `${barHeight * 0.6}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText("O₂", x + barWidth + 10, y + barHeight * 0.8);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.keys.clear();
  }
}
