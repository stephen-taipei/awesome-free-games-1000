/**
 * Solar System Puzzle Game Engine
 * Game #125 - Align planets to target orbital positions
 */

export interface Planet {
  name: string;
  orbitRadius: number;
  angle: number;
  targetAngle: number;
  size: number;
  color: string;
  orbitSpeed: number;
  ringColor?: string;
}

export interface LevelConfig {
  planets: Planet[];
}

export class SolarSystemGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private centerX = 250;
  private centerY = 200;

  private planets: Planet[] = [];
  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;

  private stars: { x: number; y: number; size: number; brightness: number }[] = [];

  private levels: LevelConfig[] = [
    // Level 1 - Two planets
    {
      planets: [
        {
          name: "Mercury",
          orbitRadius: 60,
          angle: 0,
          targetAngle: Math.PI / 2,
          size: 8,
          color: "#a0522d",
          orbitSpeed: 0.02,
        },
        {
          name: "Venus",
          orbitRadius: 90,
          angle: Math.PI,
          targetAngle: 0,
          size: 12,
          color: "#daa520",
          orbitSpeed: 0.015,
        },
      ],
    },
    // Level 2 - Three planets
    {
      planets: [
        {
          name: "Mercury",
          orbitRadius: 55,
          angle: Math.PI / 4,
          targetAngle: Math.PI,
          size: 8,
          color: "#a0522d",
          orbitSpeed: 0.02,
        },
        {
          name: "Venus",
          orbitRadius: 85,
          angle: Math.PI,
          targetAngle: Math.PI / 2,
          size: 12,
          color: "#daa520",
          orbitSpeed: 0.015,
        },
        {
          name: "Earth",
          orbitRadius: 115,
          angle: 0,
          targetAngle: (3 * Math.PI) / 2,
          size: 14,
          color: "#4169e1",
          orbitSpeed: 0.012,
        },
      ],
    },
    // Level 3 - Four planets including Mars
    {
      planets: [
        {
          name: "Mercury",
          orbitRadius: 50,
          angle: Math.PI / 2,
          targetAngle: 0,
          size: 7,
          color: "#a0522d",
          orbitSpeed: 0.02,
        },
        {
          name: "Venus",
          orbitRadius: 75,
          angle: (3 * Math.PI) / 4,
          targetAngle: Math.PI / 4,
          size: 11,
          color: "#daa520",
          orbitSpeed: 0.015,
        },
        {
          name: "Earth",
          orbitRadius: 100,
          angle: Math.PI / 4,
          targetAngle: (3 * Math.PI) / 4,
          size: 12,
          color: "#4169e1",
          orbitSpeed: 0.012,
        },
        {
          name: "Mars",
          orbitRadius: 130,
          angle: Math.PI,
          targetAngle: (5 * Math.PI) / 4,
          size: 10,
          color: "#cd5c5c",
          orbitSpeed: 0.01,
        },
      ],
    },
    // Level 4 - Outer planets
    {
      planets: [
        {
          name: "Earth",
          orbitRadius: 50,
          angle: 0,
          targetAngle: Math.PI,
          size: 10,
          color: "#4169e1",
          orbitSpeed: 0.015,
        },
        {
          name: "Mars",
          orbitRadius: 75,
          angle: Math.PI / 2,
          targetAngle: (3 * Math.PI) / 2,
          size: 9,
          color: "#cd5c5c",
          orbitSpeed: 0.012,
        },
        {
          name: "Jupiter",
          orbitRadius: 110,
          angle: Math.PI,
          targetAngle: Math.PI / 3,
          size: 22,
          color: "#d2691e",
          orbitSpeed: 0.008,
        },
        {
          name: "Saturn",
          orbitRadius: 150,
          angle: (3 * Math.PI) / 2,
          targetAngle: (2 * Math.PI) / 3,
          size: 18,
          color: "#f4a460",
          orbitSpeed: 0.006,
          ringColor: "#deb887",
        },
      ],
    },
    // Level 5 - Full solar system
    {
      planets: [
        {
          name: "Mercury",
          orbitRadius: 40,
          angle: Math.PI / 6,
          targetAngle: (7 * Math.PI) / 6,
          size: 6,
          color: "#a0522d",
          orbitSpeed: 0.025,
        },
        {
          name: "Venus",
          orbitRadius: 55,
          angle: (2 * Math.PI) / 3,
          targetAngle: (Math.PI) / 3,
          size: 9,
          color: "#daa520",
          orbitSpeed: 0.018,
        },
        {
          name: "Earth",
          orbitRadius: 75,
          angle: Math.PI,
          targetAngle: 0,
          size: 10,
          color: "#4169e1",
          orbitSpeed: 0.015,
        },
        {
          name: "Mars",
          orbitRadius: 95,
          angle: (5 * Math.PI) / 4,
          targetAngle: Math.PI / 4,
          size: 8,
          color: "#cd5c5c",
          orbitSpeed: 0.012,
        },
        {
          name: "Jupiter",
          orbitRadius: 125,
          angle: (3 * Math.PI) / 2,
          targetAngle: Math.PI / 2,
          size: 18,
          color: "#d2691e",
          orbitSpeed: 0.008,
        },
        {
          name: "Saturn",
          orbitRadius: 160,
          angle: 0,
          targetAngle: Math.PI,
          size: 15,
          color: "#f4a460",
          orbitSpeed: 0.005,
          ringColor: "#deb887",
        },
      ],
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.initStars();
    this.setupInput();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 500,
        y: Math.random() * 400,
        size: Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  }

  private setupInput() {
    this.canvas.addEventListener("click", (e) => {
      if (this.status !== "playing") return;

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Check if clicked on a planet
      for (const planet of this.planets) {
        const px = this.centerX + Math.cos(planet.angle) * planet.orbitRadius;
        const py = this.centerY + Math.sin(planet.angle) * planet.orbitRadius;

        const dist = Math.hypot(x - px, y - py);
        if (dist < planet.size + 10) {
          // Advance planet by 45 degrees (π/4)
          planet.angle = (planet.angle + Math.PI / 4) % (Math.PI * 2);
          this.checkWin();
          this.draw();
          break;
        }
      }
    });
  }

  private checkWin() {
    const tolerance = 0.2; // ~11 degrees tolerance
    let alignedCount = 0;

    for (const planet of this.planets) {
      const diff = Math.abs(this.normalizeAngle(planet.angle - planet.targetAngle));
      if (diff < tolerance || diff > Math.PI * 2 - tolerance) {
        alignedCount++;
      }
    }

    if (this.onStateChange) {
      this.onStateChange({
        aligned: alignedCount,
        total: this.planets.length,
      });
    }

    if (alignedCount === this.planets.length) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.planets = config.planets.map((p) => ({ ...p }));

    // Notify initial state
    if (this.onStateChange) {
      this.onStateChange({
        aligned: 0,
        total: this.planets.length,
      });
    }
  }

  private gameLoop() {
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Space background
    ctx.fillStyle = "#0a0a20";
    ctx.fillRect(0, 0, w, h);

    // Stars
    this.drawStars(ctx);

    // Draw orbit paths and targets
    this.planets.forEach((planet) => {
      this.drawOrbit(ctx, planet);
      this.drawTarget(ctx, planet);
    });

    // Draw sun
    this.drawSun(ctx);

    // Draw planets
    this.planets.forEach((planet) => {
      this.drawPlanet(ctx, planet);
    });

    // Draw alignment indicators
    this.drawAlignmentIndicators(ctx);
  }

  private drawStars(ctx: CanvasRenderingContext2D) {
    const time = Date.now() * 0.001;

    this.stars.forEach((star) => {
      const twinkle = 0.5 + Math.sin(time * 2 + star.x * 0.1) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawOrbit(ctx: CanvasRenderingContext2D, planet: Planet) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, planet.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawTarget(ctx: CanvasRenderingContext2D, planet: Planet) {
    const x = this.centerX + Math.cos(planet.targetAngle) * planet.orbitRadius;
    const y = this.centerY + Math.sin(planet.targetAngle) * planet.orbitRadius;

    // Target marker
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.arc(x, y, planet.size + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);

    // Target crosshair
    ctx.beginPath();
    ctx.moveTo(x - planet.size - 12, y);
    ctx.lineTo(x - planet.size - 5, y);
    ctx.moveTo(x + planet.size + 5, y);
    ctx.lineTo(x + planet.size + 12, y);
    ctx.moveTo(x, y - planet.size - 12);
    ctx.lineTo(x, y - planet.size - 5);
    ctx.moveTo(x, y + planet.size + 5);
    ctx.lineTo(x, y + planet.size + 12);
    ctx.stroke();
  }

  private drawSun(ctx: CanvasRenderingContext2D) {
    const time = Date.now() * 0.002;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      0,
      this.centerX,
      this.centerY,
      35
    );
    gradient.addColorStop(0, "rgba(255, 200, 50, 0.8)");
    gradient.addColorStop(0.5, "rgba(255, 150, 0, 0.4)");
    gradient.addColorStop(1, "rgba(255, 100, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Sun body
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Sun rays
    ctx.strokeStyle = "#ffec8b";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time;
      const innerR = 22;
      const outerR = 28 + Math.sin(time * 3 + i) * 3;

      ctx.beginPath();
      ctx.moveTo(
        this.centerX + Math.cos(angle) * innerR,
        this.centerY + Math.sin(angle) * innerR
      );
      ctx.lineTo(
        this.centerX + Math.cos(angle) * outerR,
        this.centerY + Math.sin(angle) * outerR
      );
      ctx.stroke();
    }
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet) {
    const x = this.centerX + Math.cos(planet.angle) * planet.orbitRadius;
    const y = this.centerY + Math.sin(planet.angle) * planet.orbitRadius;

    // Check if aligned
    const tolerance = 0.2;
    const diff = Math.abs(this.normalizeAngle(planet.angle - planet.targetAngle));
    const isAligned = diff < tolerance || diff > Math.PI * 2 - tolerance;

    // Planet glow when aligned
    if (isAligned) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, planet.size + 10);
      gradient.addColorStop(0, "rgba(76, 175, 80, 0.5)");
      gradient.addColorStop(1, "rgba(76, 175, 80, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, planet.size + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Saturn's ring
    if (planet.ringColor) {
      ctx.strokeStyle = planet.ringColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y, planet.size + 8, planet.size * 0.3, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Planet body
    const gradient = ctx.createRadialGradient(
      x - planet.size * 0.3,
      y - planet.size * 0.3,
      0,
      x,
      y,
      planet.size
    );
    gradient.addColorStop(0, this.lightenColor(planet.color, 30));
    gradient.addColorStop(1, planet.color);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, planet.size, 0, Math.PI * 2);
    ctx.fill();

    // Planet outline
    ctx.strokeStyle = isAligned ? "#4caf50" : "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = isAligned ? 3 : 1;
    ctx.stroke();

    // Planet name
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(planet.name, x, y + planet.size + 15);
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private drawAlignmentIndicators(ctx: CanvasRenderingContext2D) {
    const x = 20;
    let y = 20;

    ctx.font = "12px sans-serif";

    this.planets.forEach((planet) => {
      const tolerance = 0.2;
      const diff = Math.abs(this.normalizeAngle(planet.angle - planet.targetAngle));
      const isAligned = diff < tolerance || diff > Math.PI * 2 - tolerance;

      // Indicator dot
      ctx.fillStyle = isAligned ? "#4caf50" : "#666";
      ctx.beginPath();
      ctx.arc(x, y + 6, 6, 0, Math.PI * 2);
      ctx.fill();

      // Planet name
      ctx.fillStyle = isAligned ? "#4caf50" : "#aaa";
      ctx.textAlign = "left";
      ctx.fillText(planet.name, x + 15, y + 10);

      y += 22;
    });
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width - 20);
      this.canvas.height = 400;
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
      this.draw();
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getAligned(): number {
    const tolerance = 0.2;
    let count = 0;
    for (const planet of this.planets) {
      const diff = Math.abs(this.normalizeAngle(planet.angle - planet.targetAngle));
      if (diff < tolerance || diff > Math.PI * 2 - tolerance) {
        count++;
      }
    }
    return count;
  }

  public getTotal(): number {
    return this.planets.length;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
