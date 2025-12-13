type Direction = "up" | "down" | "left" | "right";

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LevelConfig {
  playerStart: { x: number; y: number };
  goal: { x: number; y: number };
  platforms: Platform[];
  spikes: { x: number; y: number; direction: Direction }[];
}

const LEVELS: LevelConfig[] = [
  {
    playerStart: { x: 80, y: 300 },
    goal: { x: 500, y: 80 },
    platforms: [
      { x: 50, y: 340, width: 100, height: 20 },
      { x: 200, y: 250, width: 150, height: 20 },
      { x: 400, y: 150, width: 150, height: 20 },
    ],
    spikes: [],
  },
  {
    playerStart: { x: 80, y: 350 },
    goal: { x: 500, y: 350 },
    platforms: [
      { x: 50, y: 380, width: 100, height: 20 },
      { x: 200, y: 50, width: 200, height: 20 },
      { x: 450, y: 380, width: 100, height: 20 },
    ],
    spikes: [{ x: 300, y: 380, direction: "up" }],
  },
  {
    playerStart: { x: 80, y: 200 },
    goal: { x: 520, y: 200 },
    platforms: [
      { x: 50, y: 180, width: 80, height: 20 },
      { x: 50, y: 220, width: 80, height: 20 },
      { x: 200, y: 100, width: 20, height: 200 },
      { x: 350, y: 100, width: 20, height: 200 },
      { x: 480, y: 180, width: 80, height: 20 },
      { x: 480, y: 220, width: 80, height: 20 },
    ],
    spikes: [],
  },
  {
    playerStart: { x: 300, y: 350 },
    goal: { x: 300, y: 50 },
    platforms: [
      { x: 250, y: 380, width: 100, height: 20 },
      { x: 100, y: 300, width: 120, height: 20 },
      { x: 380, y: 300, width: 120, height: 20 },
      { x: 150, y: 200, width: 100, height: 20 },
      { x: 350, y: 200, width: 100, height: 20 },
      { x: 250, y: 100, width: 100, height: 20 },
    ],
    spikes: [
      { x: 50, y: 350, direction: "right" },
      { x: 530, y: 350, direction: "left" },
    ],
  },
];

export class GravitySwitchGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  player: Player = { x: 0, y: 0, vx: 0, vy: 0, size: 20 };
  goal: { x: number; y: number } = { x: 0, y: 0 };
  platforms: Platform[] = [];
  spikes: { x: number; y: number; direction: Direction }[] = [];

  gravity: Direction = "down";
  gravityStrength: number = 0.5;
  switches: number = 0;

  status: "playing" | "won" | "lost" = "playing";
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.switches = 0;
    this.gravity = "down";
    this.particles = [];
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        switches: this.switches,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];

    this.player = {
      x: config.playerStart.x,
      y: config.playerStart.y,
      vx: 0,
      vy: 0,
      size: 20,
    };

    this.goal = { ...config.goal };
    this.platforms = config.platforms.map((p) => ({ ...p }));
    this.spikes = config.spikes.map((s) => ({ ...s }));
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
    // Apply gravity
    switch (this.gravity) {
      case "down":
        this.player.vy += this.gravityStrength;
        break;
      case "up":
        this.player.vy -= this.gravityStrength;
        break;
      case "left":
        this.player.vx -= this.gravityStrength;
        break;
      case "right":
        this.player.vx += this.gravityStrength;
        break;
    }

    // Apply friction
    this.player.vx *= 0.99;
    this.player.vy *= 0.99;

    // Limit velocity
    const maxVel = 10;
    this.player.vx = Math.max(-maxVel, Math.min(maxVel, this.player.vx));
    this.player.vy = Math.max(-maxVel, Math.min(maxVel, this.player.vy));

    // Update position
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Platform collision
    for (const plat of this.platforms) {
      if (this.checkCollision(this.player, plat)) {
        this.resolveCollision(this.player, plat);
      }
    }

    // Bounds collision
    const { width, height } = this.canvas;
    if (this.player.x - this.player.size / 2 < 0) {
      this.player.x = this.player.size / 2;
      this.player.vx = 0;
    }
    if (this.player.x + this.player.size / 2 > width) {
      this.player.x = width - this.player.size / 2;
      this.player.vx = 0;
    }
    if (this.player.y - this.player.size / 2 < 0) {
      this.player.y = this.player.size / 2;
      this.player.vy = 0;
    }
    if (this.player.y + this.player.size / 2 > height) {
      this.player.y = height - this.player.size / 2;
      this.player.vy = 0;
    }

    // Spike collision
    for (const spike of this.spikes) {
      const dist = Math.sqrt((this.player.x - spike.x) ** 2 + (this.player.y - spike.y) ** 2);
      if (dist < this.player.size + 15) {
        this.status = "lost";
        if (this.onStateChange) {
          this.onStateChange({ status: "lost" });
        }
      }
    }

    // Goal collision
    const goalDist = Math.sqrt((this.player.x - this.goal.x) ** 2 + (this.player.y - this.goal.y) ** 2);
    if (goalDist < this.player.size + 20) {
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

  private checkCollision(player: Player, plat: Platform): boolean {
    return (
      player.x + player.size / 2 > plat.x &&
      player.x - player.size / 2 < plat.x + plat.width &&
      player.y + player.size / 2 > plat.y &&
      player.y - player.size / 2 < plat.y + plat.height
    );
  }

  private resolveCollision(player: Player, plat: Platform) {
    const overlapLeft = player.x + player.size / 2 - plat.x;
    const overlapRight = plat.x + plat.width - (player.x - player.size / 2);
    const overlapTop = player.y + player.size / 2 - plat.y;
    const overlapBottom = plat.y + plat.height - (player.y - player.size / 2);

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapTop) {
      player.y = plat.y - player.size / 2;
      player.vy = 0;
    } else if (minOverlap === overlapBottom) {
      player.y = plat.y + plat.height + player.size / 2;
      player.vy = 0;
    } else if (minOverlap === overlapLeft) {
      player.x = plat.x - player.size / 2;
      player.vx = 0;
    } else {
      player.x = plat.x + plat.width + player.size / 2;
      player.vx = 0;
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    // Check arrow buttons
    const arrowSize = 40;
    const arrowDist = 60;

    // Up arrow
    if (Math.abs(x - centerX) < arrowSize && y < arrowDist + arrowSize && y > arrowDist - arrowSize) {
      this.setGravity("up");
    }
    // Down arrow
    else if (Math.abs(x - centerX) < arrowSize && y > height - arrowDist - arrowSize && y < height - arrowDist + arrowSize) {
      this.setGravity("down");
    }
    // Left arrow
    else if (x < arrowDist + arrowSize && x > arrowDist - arrowSize && Math.abs(y - centerY) < arrowSize) {
      this.setGravity("left");
    }
    // Right arrow
    else if (x > width - arrowDist - arrowSize && x < width - arrowDist + arrowSize && Math.abs(y - centerY) < arrowSize) {
      this.setGravity("right");
    }
  }

  private setGravity(dir: Direction) {
    if (this.gravity === dir) return;

    this.gravity = dir;
    this.switches++;

    // Create particles
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 30,
        color: "#00d4ff",
      });
    }

    if (this.onStateChange) {
      this.onStateChange({ switches: this.switches });
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Space background
    this.drawBackground();

    // Draw platforms
    this.drawPlatforms();

    // Draw spikes
    this.drawSpikes();

    // Draw goal
    this.drawGoal();

    // Draw particles
    this.drawParticles();

    // Draw player
    this.drawPlayer();

    // Draw gravity arrows
    this.drawGravityArrows();

    // Status effects
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    } else if (this.status === "lost") {
      this.ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawBackground() {
    const { width, height } = this.canvas;

    const bgGradient = this.ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
    bgGradient.addColorStop(0, "#1a1a3e");
    bgGradient.addColorStop(1, "#0c0c1e");
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Stars
    this.ctx.fillStyle = "white";
    const stars = [[50, 50], [150, 80], [250, 30], [400, 60], [500, 100], [100, 350], [450, 320]];
    for (const [sx, sy] of stars) {
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPlatforms() {
    for (const plat of this.platforms) {
      const gradient = this.ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
      gradient.addColorStop(0, "#4a90a4");
      gradient.addColorStop(1, "#2d5a6a");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

      this.ctx.strokeStyle = "#00d4ff";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
    }
  }

  private drawSpikes() {
    for (const spike of this.spikes) {
      this.ctx.fillStyle = "#e74c3c";
      this.ctx.beginPath();

      switch (spike.direction) {
        case "up":
          this.ctx.moveTo(spike.x, spike.y - 15);
          this.ctx.lineTo(spike.x - 15, spike.y + 15);
          this.ctx.lineTo(spike.x + 15, spike.y + 15);
          break;
        case "down":
          this.ctx.moveTo(spike.x, spike.y + 15);
          this.ctx.lineTo(spike.x - 15, spike.y - 15);
          this.ctx.lineTo(spike.x + 15, spike.y - 15);
          break;
        case "left":
          this.ctx.moveTo(spike.x - 15, spike.y);
          this.ctx.lineTo(spike.x + 15, spike.y - 15);
          this.ctx.lineTo(spike.x + 15, spike.y + 15);
          break;
        case "right":
          this.ctx.moveTo(spike.x + 15, spike.y);
          this.ctx.lineTo(spike.x - 15, spike.y - 15);
          this.ctx.lineTo(spike.x - 15, spike.y + 15);
          break;
      }

      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawGoal() {
    // Glowing portal
    const glow = this.ctx.createRadialGradient(this.goal.x, this.goal.y, 0, this.goal.x, this.goal.y, 40);
    glow.addColorStop(0, "rgba(46, 204, 113, 0.8)");
    glow.addColorStop(0.5, "rgba(46, 204, 113, 0.3)");
    glow.addColorStop(1, "rgba(46, 204, 113, 0)");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(this.goal.x, this.goal.y, 40, 0, Math.PI * 2);
    this.ctx.fill();

    // Portal ring
    this.ctx.strokeStyle = "#2ecc71";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(this.goal.x, this.goal.y, 20, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawParticles() {
    for (const p of this.particles) {
      const alpha = p.life / 30;
      this.ctx.fillStyle = p.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPlayer() {
    // Player glow
    const glow = this.ctx.createRadialGradient(this.player.x, this.player.y, 0, this.player.x, this.player.y, this.player.size * 2);
    glow.addColorStop(0, "rgba(0, 212, 255, 0.5)");
    glow.addColorStop(1, "rgba(0, 212, 255, 0)");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.size * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Player body
    const playerGradient = this.ctx.createRadialGradient(
      this.player.x - 5,
      this.player.y - 5,
      0,
      this.player.x,
      this.player.y,
      this.player.size
    );
    playerGradient.addColorStop(0, "#00ffff");
    playerGradient.addColorStop(1, "#0088aa");
    this.ctx.fillStyle = playerGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Eye indicating gravity direction
    let eyeX = this.player.x;
    let eyeY = this.player.y;
    switch (this.gravity) {
      case "down": eyeY += 3; break;
      case "up": eyeY -= 3; break;
      case "left": eyeX -= 3; break;
      case "right": eyeX += 3; break;
    }
    this.ctx.fillStyle = "white";
    this.ctx.beginPath();
    this.ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawGravityArrows() {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const arrowDist = 60;

    const arrows: { x: number; y: number; dir: Direction; rotation: number }[] = [
      { x: centerX, y: arrowDist, dir: "up", rotation: -Math.PI / 2 },
      { x: centerX, y: height - arrowDist, dir: "down", rotation: Math.PI / 2 },
      { x: arrowDist, y: centerY, dir: "left", rotation: Math.PI },
      { x: width - arrowDist, y: centerY, dir: "right", rotation: 0 },
    ];

    for (const arrow of arrows) {
      const isActive = this.gravity === arrow.dir;

      this.ctx.save();
      this.ctx.translate(arrow.x, arrow.y);
      this.ctx.rotate(arrow.rotation);

      // Arrow button
      this.ctx.fillStyle = isActive ? "rgba(0, 212, 255, 0.8)" : "rgba(255, 255, 255, 0.3)";
      this.ctx.beginPath();
      this.ctx.moveTo(20, 0);
      this.ctx.lineTo(-10, -15);
      this.ctx.lineTo(-10, 15);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }
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
