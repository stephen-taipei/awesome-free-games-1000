type Direction = "up" | "down" | "left" | "right";

interface WindSource {
  x: number;
  y: number;
  direction: Direction;
  strength: number;
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
}

interface LevelConfig {
  leafStart: { x: number; y: number };
  goal: { x: number; y: number };
  windSources: { x: number; y: number; direction: Direction }[];
  obstacles: { x: number; y: number; w: number; h: number }[];
}

const LEVELS: LevelConfig[] = [
  {
    leafStart: { x: 100, y: 200 },
    goal: { x: 500, y: 200 },
    windSources: [{ x: 300, y: 200, direction: "right" }],
    obstacles: [],
  },
  {
    leafStart: { x: 100, y: 100 },
    goal: { x: 500, y: 300 },
    windSources: [
      { x: 200, y: 100, direction: "right" },
      { x: 400, y: 200, direction: "down" },
    ],
    obstacles: [{ x: 250, y: 150, w: 100, h: 20 }],
  },
  {
    leafStart: { x: 80, y: 300 },
    goal: { x: 520, y: 80 },
    windSources: [
      { x: 150, y: 300, direction: "up" },
      { x: 250, y: 150, direction: "right" },
      { x: 450, y: 100, direction: "right" },
    ],
    obstacles: [
      { x: 200, y: 200, w: 20, h: 150 },
      { x: 350, y: 50, w: 20, h: 150 },
    ],
  },
  {
    leafStart: { x: 300, y: 350 },
    goal: { x: 300, y: 50 },
    windSources: [
      { x: 100, y: 300, direction: "up" },
      { x: 300, y: 200, direction: "up" },
      { x: 500, y: 300, direction: "left" },
    ],
    obstacles: [
      { x: 150, y: 150, w: 100, h: 20 },
      { x: 350, y: 150, w: 100, h: 20 },
    ],
  },
];

export class WindDirectionGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  leaf: Leaf = { x: 0, y: 0, vx: 0, vy: 0, rotation: 0 };
  goal: { x: number; y: number } = { x: 0, y: 0 };
  windSources: WindSource[] = [];
  obstacles: { x: number; y: number; w: number; h: number }[] = [];

  moves: number = 0;
  status: "playing" | "won" | "lost" = "playing";
  particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: this.moves,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];

    this.leaf = {
      x: config.leafStart.x,
      y: config.leafStart.y,
      vx: 0,
      vy: 0,
      rotation: 0,
    };

    this.goal = { ...config.goal };

    this.windSources = config.windSources.map((ws) => ({
      ...ws,
      strength: 0.5,
    }));

    this.obstacles = config.obstacles.map((o) => ({ ...o }));
    this.particles = [];
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    // Apply wind forces
    for (const ws of this.windSources) {
      const dx = this.leaf.x - ws.x;
      const dy = this.leaf.y - ws.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        const force = ws.strength * (1 - dist / 200);
        switch (ws.direction) {
          case "up":
            this.leaf.vy -= force;
            break;
          case "down":
            this.leaf.vy += force;
            break;
          case "left":
            this.leaf.vx -= force;
            break;
          case "right":
            this.leaf.vx += force;
            break;
        }
      }
    }

    // Apply friction
    this.leaf.vx *= 0.98;
    this.leaf.vy *= 0.98;

    // Update position
    this.leaf.x += this.leaf.vx;
    this.leaf.y += this.leaf.vy;

    // Rotate based on velocity
    this.leaf.rotation += (this.leaf.vx + this.leaf.vy) * 0.02;

    // Check obstacle collision
    for (const obs of this.obstacles) {
      if (
        this.leaf.x > obs.x &&
        this.leaf.x < obs.x + obs.w &&
        this.leaf.y > obs.y &&
        this.leaf.y < obs.y + obs.h
      ) {
        // Bounce off
        if (Math.abs(this.leaf.vx) > Math.abs(this.leaf.vy)) {
          this.leaf.vx *= -0.5;
          this.leaf.x += this.leaf.vx > 0 ? obs.w : -obs.w;
        } else {
          this.leaf.vy *= -0.5;
          this.leaf.y += this.leaf.vy > 0 ? obs.h : -obs.h;
        }
      }
    }

    // Check bounds
    const { width, height } = this.canvas;
    if (this.leaf.x < 0 || this.leaf.x > width || this.leaf.y < 0 || this.leaf.y > height) {
      this.status = "lost";
      if (this.onStateChange) {
        this.onStateChange({ status: "lost" });
      }
    }

    // Check goal
    const goalDist = Math.sqrt(
      (this.leaf.x - this.goal.x) ** 2 + (this.leaf.y - this.goal.y) ** 2
    );
    if (goalDist < 30) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          hasNextLevel: this.currentLevel < LEVELS.length - 1,
        });
      }
    }

    // Update particles
    this.updateParticles();
  }

  private updateParticles() {
    // Spawn new particles from wind sources
    for (const ws of this.windSources) {
      if (Math.random() < 0.3) {
        let vx = 0, vy = 0;
        switch (ws.direction) {
          case "up": vy = -3; break;
          case "down": vy = 3; break;
          case "left": vx = -3; break;
          case "right": vx = 3; break;
        }
        this.particles.push({
          x: ws.x + (Math.random() - 0.5) * 30,
          y: ws.y + (Math.random() - 0.5) * 30,
          vx: vx + (Math.random() - 0.5),
          vy: vy + (Math.random() - 0.5),
          life: 60,
        });
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
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicking on a wind source
    for (const ws of this.windSources) {
      const dist = Math.sqrt((x - ws.x) ** 2 + (y - ws.y) ** 2);
      if (dist < 30) {
        // Cycle direction
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const idx = dirs.indexOf(ws.direction);
        ws.direction = dirs[(idx + 1) % 4];
        this.moves++;

        if (this.onStateChange) {
          this.onStateChange({ moves: this.moves });
        }
        return;
      }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Sky background
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(1, "#e0f4ff");
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw clouds
    this.drawClouds();

    // Draw particles
    this.drawParticles();

    // Draw obstacles
    this.drawObstacles();

    // Draw wind sources
    this.drawWindSources();

    // Draw goal
    this.drawGoal();

    // Draw leaf
    this.drawLeaf();

    // Status effects
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    } else if (this.status === "lost") {
      this.ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawClouds() {
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

    const drawCloud = (x: number, y: number, scale: number) => {
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
      this.ctx.arc(x + 25 * scale, y - 10 * scale, 25 * scale, 0, Math.PI * 2);
      this.ctx.arc(x + 50 * scale, y, 20 * scale, 0, Math.PI * 2);
      this.ctx.fill();
    };

    drawCloud(100, 50, 1);
    drawCloud(350, 80, 0.8);
    drawCloud(500, 40, 1.2);
  }

  private drawParticles() {
    for (const p of this.particles) {
      const alpha = p.life / 60;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawObstacles() {
    for (const obs of this.obstacles) {
      this.ctx.fillStyle = "#8b4513";
      this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

      // Wood texture
      this.ctx.strokeStyle = "#5d3a1a";
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        this.ctx.beginPath();
        if (obs.w > obs.h) {
          const y = obs.y + (obs.h / 4) * (i + 1);
          this.ctx.moveTo(obs.x, y);
          this.ctx.lineTo(obs.x + obs.w, y);
        } else {
          const x = obs.x + (obs.w / 4) * (i + 1);
          this.ctx.moveTo(x, obs.y);
          this.ctx.lineTo(x, obs.y + obs.h);
        }
        this.ctx.stroke();
      }
    }
  }

  private drawWindSources() {
    for (const ws of this.windSources) {
      // Fan base
      this.ctx.fillStyle = "#3498db";
      this.ctx.beginPath();
      this.ctx.arc(ws.x, ws.y, 25, 0, Math.PI * 2);
      this.ctx.fill();

      // Direction arrow
      this.ctx.save();
      this.ctx.translate(ws.x, ws.y);

      let angle = 0;
      switch (ws.direction) {
        case "up": angle = -Math.PI / 2; break;
        case "down": angle = Math.PI / 2; break;
        case "left": angle = Math.PI; break;
        case "right": angle = 0; break;
      }
      this.ctx.rotate(angle);

      this.ctx.fillStyle = "white";
      this.ctx.beginPath();
      this.ctx.moveTo(15, 0);
      this.ctx.lineTo(-5, -10);
      this.ctx.lineTo(-5, 10);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();

      // Glow effect
      const glowGradient = this.ctx.createRadialGradient(ws.x, ws.y, 0, ws.x, ws.y, 50);
      glowGradient.addColorStop(0, "rgba(52, 152, 219, 0.3)");
      glowGradient.addColorStop(1, "rgba(52, 152, 219, 0)");
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(ws.x, ws.y, 50, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawGoal() {
    // Target circle
    this.ctx.strokeStyle = "#27ae60";
    this.ctx.lineWidth = 3;

    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(this.goal.x, this.goal.y, 30 - i * 10, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Flag
    this.ctx.fillStyle = "#27ae60";
    this.ctx.fillRect(this.goal.x - 2, this.goal.y - 35, 4, 35);

    this.ctx.beginPath();
    this.ctx.moveTo(this.goal.x + 2, this.goal.y - 35);
    this.ctx.lineTo(this.goal.x + 25, this.goal.y - 25);
    this.ctx.lineTo(this.goal.x + 2, this.goal.y - 15);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawLeaf() {
    this.ctx.save();
    this.ctx.translate(this.leaf.x, this.leaf.y);
    this.ctx.rotate(this.leaf.rotation);

    // Leaf shape
    this.ctx.fillStyle = "#27ae60";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -15);
    this.ctx.quadraticCurveTo(15, -5, 0, 15);
    this.ctx.quadraticCurveTo(-15, -5, 0, -15);
    this.ctx.fill();

    // Stem
    this.ctx.strokeStyle = "#1e8449";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -15);
    this.ctx.lineTo(0, 15);
    this.ctx.stroke();

    // Veins
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = -8 + i * 8;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(8, y - 3);
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(-8, y - 3);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
