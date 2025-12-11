export interface Gear {
  id: number;
  x: number;
  y: number;
  teeth: number;
  radius: number;
  angle: number;
  velocity: number; // Angular
  type: "driver" | "target" | "normal";
  connected: boolean; // Is it powered?
}

export class GearGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  gears: Gear[] = [];
  draggingGear: Gear | null = null;

  status: "playing" | "won" = "playing";

  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.gears = [];

    // Driver (Green)
    this.gears.push({
      id: 0,
      x: 100,
      y: 200,
      teeth: 12,
      radius: 30,
      angle: 0,
      velocity: 0.05,
      type: "driver",
      connected: true,
    });

    // Target (Red)
    this.gears.push({
      id: 1,
      x: 500,
      y: 200,
      teeth: 24,
      radius: 60,
      angle: 0,
      velocity: 0,
      type: "target",
      connected: false,
    });

    // Loose Gears (Blue)
    for (let i = 0; i < 3; i++) {
      this.gears.push({
        id: 2 + i,
        x: 150 + i * 60,
        y: 100,
        teeth: 12,
        radius: 30,
        angle: 0,
        velocity: 0,
        type: "normal",
        connected: false,
      });
    }
    for (let i = 0; i < 2; i++) {
      this.gears.push({
        id: 5 + i,
        x: 180 + i * 70,
        y: 300,
        teeth: 18,
        radius: 45,
        angle: 0,
        velocity: 0,
        type: "normal",
        connected: false,
      });
    }

    this.loop();
  }

  // Physics Loop
  private loop = () => {
    if (this.status === "won") {
      // Still rotate visually
    }

    this.updatePhysics();
    this.draw();

    requestAnimationFrame(this.loop);
  };

  private updatePhysics() {
    // Reset connections (except driver)
    this.gears.forEach((g) => {
      if (g.type !== "driver") {
        g.velocity = 0;
        g.connected = false;
      }
    });

    // BFS Propagate Velocity
    const queue = [this.gears.find((g) => g.type === "driver")!];
    const visited = new Set<number>();
    visited.add(queue[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Find neighbors
      this.gears.forEach((other) => {
        if (visited.has(other.id)) return;

        // Meshing Check
        // Dist between centers should be approx sum of radii
        // Pitch radius logic: r = m * N / 2.
        // Here we just use visual radius.
        const dist = Math.hypot(current.x - other.x, current.y - other.y);
        const idealDist = current.radius + other.radius;

        // Tolerance
        if (Math.abs(dist - idealDist) < 8) {
          // 8px slop
          // Connected
          other.connected = true;
          other.velocity = -current.velocity * (current.teeth / other.teeth);
          visited.add(other.id);
          queue.push(other);
        }
      });
    }

    // Update Angles
    this.gears.forEach((g) => {
      g.angle += g.velocity;
    });

    // Check Win
    const target = this.gears.find((g) => g.type === "target")!;
    if (target.velocity !== 0 && this.status === "playing") {
      this.status = "won";
      if (this.onStateChange)
        this.onStateChange({ status: "won", isRunning: true });
    } else if (this.status === "playing") {
      if (this.onStateChange) this.onStateChange({ isRunning: false });
    }
  }

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status === "won") return;

    if (type === "down") {
      const clicked = this.gears.find((g) => {
        const d = Math.hypot(g.x - x, g.y - y);
        return d < g.radius;
      });
      if (clicked && clicked.type === "normal") {
        this.draggingGear = clicked;
      }
    } else if (type === "move") {
      if (this.draggingGear) {
        this.draggingGear.x = x;
        this.draggingGear.y = y;
      }
    } else if (type === "up") {
      this.draggingGear = null;
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.gears.forEach((g) => this.drawGear(g));

    // Draw cables? No, gears mesh directly.
  }

  private drawGear(g: Gear) {
    this.ctx.save();
    this.ctx.translate(g.x, g.y);
    this.ctx.rotate(g.angle);

    // Color
    let color = "#3498db"; // Normal
    if (g.type === "driver") color = "#2ecc71";
    if (g.type === "target") color = "#e74c3c";

    // If connected and normal, maybe lighter blue?
    if (g.type === "normal" && g.connected) color = "#5dade2";

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 2;

    // Draw Teeth
    const teeth = g.teeth;
    const outerR = g.radius + 5;
    const innerR = g.radius - 5;

    this.ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI * 2 * i) / (teeth * 2);
      this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Axle
    this.ctx.fillStyle = "#ecf0f1";
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 400; // Fixed height in CSS mostly
    }
  }

  public reset() {
    this.start();
    if (this.onStateChange)
      this.onStateChange({ status: "playing", isRunning: false });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
