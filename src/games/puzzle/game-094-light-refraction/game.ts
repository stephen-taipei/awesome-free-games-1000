/**
 * Light Refraction Game Engine
 * Game #094 - Refract light through prisms to hit targets
 */

export interface Prism {
  id: number;
  x: number;
  y: number;
  rotation: number;
  size: number;
}

export interface LevelConfig {
  source: { x: number; y: number; angle: number };
  target: { x: number; y: number };
  prisms: { x: number; y: number; rotation: number }[];
  walls: { x1: number; y1: number; x2: number; y2: number }[];
}

export class LightRefractionGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private source = { x: 0, y: 0, angle: 0 };
  private target = { x: 0, y: 0, radius: 20 };
  private prisms: Prism[] = [];
  private walls: { x1: number; y1: number; x2: number; y2: number }[] = [];
  private lightPath: { x: number; y: number }[] = [];

  private draggingPrism: Prism | null = null;
  private dragOffset = { x: 0, y: 0 };

  private currentLevel = 0;
  private status: "playing" | "won" = "playing";
  private animationId = 0;
  private targetHit = false;

  private prismSize = 40;

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Single prism
    {
      source: { x: 0.1, y: 0.3, angle: 0 },
      target: { x: 0.9, y: 0.7 },
      prisms: [{ x: 0.5, y: 0.3, rotation: 45 }],
      walls: [],
    },
    // Level 2 - Two prisms
    {
      source: { x: 0.1, y: 0.5, angle: 0 },
      target: { x: 0.9, y: 0.5 },
      prisms: [
        { x: 0.35, y: 0.5, rotation: 30 },
        { x: 0.65, y: 0.3, rotation: -30 },
      ],
      walls: [{ x1: 0.5, y1: 0.6, x2: 0.5, y2: 0.9 }],
    },
    // Level 3 - Wall obstacle
    {
      source: { x: 0.1, y: 0.2, angle: 0 },
      target: { x: 0.9, y: 0.8 },
      prisms: [
        { x: 0.3, y: 0.2, rotation: 45 },
        { x: 0.5, y: 0.5, rotation: 0 },
        { x: 0.7, y: 0.8, rotation: -45 },
      ],
      walls: [{ x1: 0.4, y1: 0.3, x2: 0.6, y2: 0.3 }],
    },
    // Level 4 - Complex path
    {
      source: { x: 0.1, y: 0.8, angle: -45 },
      target: { x: 0.9, y: 0.2 },
      prisms: [
        { x: 0.25, y: 0.6, rotation: 30 },
        { x: 0.5, y: 0.3, rotation: 60 },
        { x: 0.75, y: 0.5, rotation: -30 },
      ],
      walls: [
        { x1: 0.35, y1: 0.1, x2: 0.35, y2: 0.4 },
        { x1: 0.65, y1: 0.6, x2: 0.65, y2: 0.9 },
      ],
    },
    // Level 5 - Maze
    {
      source: { x: 0.05, y: 0.5, angle: 0 },
      target: { x: 0.95, y: 0.5 },
      prisms: [
        { x: 0.2, y: 0.5, rotation: 45 },
        { x: 0.4, y: 0.25, rotation: -45 },
        { x: 0.6, y: 0.75, rotation: 45 },
        { x: 0.8, y: 0.5, rotation: -45 },
      ],
      walls: [
        { x1: 0.3, y1: 0.0, x2: 0.3, y2: 0.35 },
        { x1: 0.3, y1: 0.65, x2: 0.3, y2: 1.0 },
        { x1: 0.5, y1: 0.35, x2: 0.5, y2: 0.65 },
        { x1: 0.7, y1: 0.0, x2: 0.7, y2: 0.35 },
        { x1: 0.7, y1: 0.65, x2: 0.7, y2: 1.0 },
      ],
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.status = "playing";
    this.targetHit = false;
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.source = {
      x: config.source.x * w,
      y: config.source.y * h,
      angle: (config.source.angle * Math.PI) / 180,
    };

    this.target = {
      x: config.target.x * w,
      y: config.target.y * h,
      radius: 20,
    };

    this.prisms = config.prisms.map((p, i) => ({
      id: i,
      x: p.x * w,
      y: p.y * h,
      rotation: (p.rotation * Math.PI) / 180,
      size: this.prismSize,
    }));

    this.walls = config.walls.map((wall) => ({
      x1: wall.x1 * w,
      y1: wall.y1 * h,
      x2: wall.x2 * w,
      y2: wall.y2 * h,
    }));
  }

  public stop() {
    cancelAnimationFrame(this.animationId);
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  private update() {
    this.traceLightPath();

    if (this.onStateChange) {
      this.onStateChange({ hit: this.targetHit });
    }

    if (this.targetHit && this.status === "playing") {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won", level: this.currentLevel });
      }
    }
  }

  private traceLightPath() {
    this.lightPath = [{ x: this.source.x, y: this.source.y }];
    this.targetHit = false;

    let x = this.source.x;
    let y = this.source.y;
    let angle = this.source.angle;

    for (let bounce = 0; bounce < 20; bounce++) {
      const hit = this.castRay(x, y, angle);

      this.lightPath.push({ x: hit.x, y: hit.y });

      if (hit.type === "target") {
        this.targetHit = true;
        break;
      } else if (hit.type === "wall" || hit.type === "none") {
        break;
      } else if (hit.type === "prism") {
        // Refract through prism
        const prism = this.prisms.find((p) => p.id === hit.prismId);
        if (prism) {
          // Simple refraction: change angle based on prism rotation
          angle = 2 * prism.rotation - angle + Math.PI;
          x = hit.x + Math.cos(angle) * 2;
          y = hit.y + Math.sin(angle) * 2;
        }
      }
    }
  }

  private castRay(
    x: number,
    y: number,
    angle: number
  ): { x: number; y: number; type: string; prismId?: number } {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const maxDist = 2000;

    let closestDist = maxDist;
    let result = { x: x + dx * maxDist, y: y + dy * maxDist, type: "none" as string };

    // Check target
    const targetHit = this.rayCircleIntersect(
      x,
      y,
      dx,
      dy,
      this.target.x,
      this.target.y,
      this.target.radius
    );
    if (targetHit && targetHit.dist < closestDist) {
      closestDist = targetHit.dist;
      result = { x: targetHit.x, y: targetHit.y, type: "target" };
    }

    // Check prisms
    this.prisms.forEach((prism) => {
      const hit = this.rayPrismIntersect(x, y, dx, dy, prism);
      if (hit && hit.dist > 5 && hit.dist < closestDist) {
        closestDist = hit.dist;
        result = { x: hit.x, y: hit.y, type: "prism", prismId: prism.id };
      }
    });

    // Check walls
    this.walls.forEach((wall) => {
      const hit = this.rayLineIntersect(x, y, dx, dy, wall.x1, wall.y1, wall.x2, wall.y2);
      if (hit && hit.dist > 1 && hit.dist < closestDist) {
        closestDist = hit.dist;
        result = { x: hit.x, y: hit.y, type: "wall" };
      }
    });

    // Check canvas bounds
    const bounds = [
      { x1: 0, y1: 0, x2: this.canvas.width, y2: 0 },
      { x1: this.canvas.width, y1: 0, x2: this.canvas.width, y2: this.canvas.height },
      { x1: 0, y1: this.canvas.height, x2: this.canvas.width, y2: this.canvas.height },
      { x1: 0, y1: 0, x2: 0, y2: this.canvas.height },
    ];
    bounds.forEach((wall) => {
      const hit = this.rayLineIntersect(x, y, dx, dy, wall.x1, wall.y1, wall.x2, wall.y2);
      if (hit && hit.dist > 1 && hit.dist < closestDist) {
        closestDist = hit.dist;
        result = { x: hit.x, y: hit.y, type: "none" };
      }
    });

    return result;
  }

  private rayCircleIntersect(
    rx: number,
    ry: number,
    dx: number,
    dy: number,
    cx: number,
    cy: number,
    r: number
  ): { x: number; y: number; dist: number } | null {
    const vx = cx - rx;
    const vy = cy - ry;
    const t = vx * dx + vy * dy;

    if (t < 0) return null;

    const closestX = rx + t * dx;
    const closestY = ry + t * dy;
    const dist = Math.hypot(closestX - cx, closestY - cy);

    if (dist > r) return null;

    const dt = Math.sqrt(r * r - dist * dist);
    const hitT = t - dt;

    if (hitT < 0) return null;

    return { x: rx + hitT * dx, y: ry + hitT * dy, dist: hitT };
  }

  private rayPrismIntersect(
    rx: number,
    ry: number,
    dx: number,
    dy: number,
    prism: Prism
  ): { x: number; y: number; dist: number } | null {
    // Treat prism as a triangle
    const size = prism.size;
    const points = [
      { x: 0, y: -size * 0.6 },
      { x: -size * 0.5, y: size * 0.4 },
      { x: size * 0.5, y: size * 0.4 },
    ];

    // Rotate and translate points
    const cos = Math.cos(prism.rotation);
    const sin = Math.sin(prism.rotation);
    const rotated = points.map((p) => ({
      x: prism.x + p.x * cos - p.y * sin,
      y: prism.y + p.x * sin + p.y * cos,
    }));

    let closest: { x: number; y: number; dist: number } | null = null;

    for (let i = 0; i < 3; i++) {
      const p1 = rotated[i];
      const p2 = rotated[(i + 1) % 3];
      const hit = this.rayLineIntersect(rx, ry, dx, dy, p1.x, p1.y, p2.x, p2.y);
      if (hit && (!closest || hit.dist < closest.dist)) {
        closest = hit;
      }
    }

    return closest;
  }

  private rayLineIntersect(
    rx: number,
    ry: number,
    dx: number,
    dy: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { x: number; y: number; dist: number } | null {
    const x3 = rx;
    const y3 = ry;
    const x4 = rx + dx * 2000;
    const y4 = ry + dy * 2000;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0) {
      const ix = x1 + t * (x2 - x1);
      const iy = y1 + t * (y2 - y1);
      return { x: ix, y: iy, dist: Math.hypot(ix - rx, iy - ry) };
    }

    return null;
  }

  public handleInput(type: "down" | "move" | "up" | "click", x: number, y: number) {
    if (this.status !== "playing") return;

    if (type === "down") {
      for (const prism of this.prisms) {
        if (Math.hypot(x - prism.x, y - prism.y) < prism.size) {
          this.draggingPrism = prism;
          this.dragOffset = { x: prism.x - x, y: prism.y - y };
          break;
        }
      }
    } else if (type === "move" && this.draggingPrism) {
      const padding = this.prismSize;
      this.draggingPrism.x = Math.max(
        padding,
        Math.min(this.canvas.width - padding, x + this.dragOffset.x)
      );
      this.draggingPrism.y = Math.max(
        padding,
        Math.min(this.canvas.height - padding, y + this.dragOffset.y)
      );
    } else if (type === "up") {
      this.draggingPrism = null;
    } else if (type === "click") {
      // Rotate prism on click
      for (const prism of this.prisms) {
        if (Math.hypot(x - prism.x, y - prism.y) < prism.size) {
          prism.rotation += Math.PI / 8;
          break;
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let j = 0; j < h; j += 30) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(w, j);
      ctx.stroke();
    }

    // Draw walls
    ctx.strokeStyle = "#636e72";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    this.walls.forEach((wall) => {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    });

    // Draw light path with rainbow effect
    if (this.lightPath.length > 1) {
      const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"];

      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = "white";
      ctx.shadowBlur = 10;

      for (let i = 0; i < this.lightPath.length - 1; i++) {
        const p1 = this.lightPath[i];
        const p2 = this.lightPath[i + 1];

        ctx.strokeStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    }

    // Draw source
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(this.source.x, this.source.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw target
    ctx.fillStyle = this.targetHit ? "#f1c40f" : "#e74c3c";
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw prisms
    this.prisms.forEach((prism) => {
      this.drawPrism(prism);
    });
  }

  private drawPrism(prism: Prism) {
    const ctx = this.ctx;
    const size = prism.size;

    ctx.save();
    ctx.translate(prism.x, prism.y);
    ctx.rotate(prism.rotation);

    // Triangle prism with gradient
    const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(0.5, "rgba(200, 200, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.3)");

    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(-size * 0.5, size * 0.4);
    ctx.lineTo(size * 0.5, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 450;
      this.prismSize = Math.min(rect.width, 450) / 12;
    }
  }

  public reset() {
    this.stop();
    this.start(this.currentLevel);
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
