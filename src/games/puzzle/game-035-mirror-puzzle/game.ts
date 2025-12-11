export interface GameObject {
  id: number;
  type: "source" | "target" | "mirror" | "wall";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians
  obj?: any; // Extra data
}

export interface RayPath {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hit: boolean;
}

export class MirrorGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  objects: GameObject[] = [];
  rays: RayPath[] = [];

  draggingObj: GameObject | null = null;

  status: "playing" | "won" = "playing";

  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.objects = [];

    // Source
    this.objects.push({
      id: 0,
      type: "source",
      x: 50,
      y: 200,
      width: 30,
      height: 30,
      rotation: 0,
    });

    // Target
    this.objects.push({
      id: 1,
      type: "target",
      x: 550,
      y: 350,
      width: 30,
      height: 30,
      rotation: 0,
    });

    // Walls
    this.objects.push({
      id: 2,
      type: "wall",
      x: 300,
      y: 200,
      width: 20,
      height: 200,
      rotation: 0,
    });

    // Mirrors
    this.objects.push({
      id: 3,
      type: "mirror",
      x: 150,
      y: 200,
      width: 60,
      height: 10,
      rotation: Math.PI / 4,
    }); // 45 deg
    this.objects.push({
      id: 4,
      type: "mirror",
      x: 300,
      y: 100,
      width: 60,
      height: 10,
      rotation: -Math.PI / 4,
    });
    this.objects.push({
      id: 5,
      type: "mirror",
      x: 450,
      y: 250,
      width: 60,
      height: 10,
      rotation: Math.PI / 2,
    });

    this.loop();
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") requestAnimationFrame(this.loop);
  };

  private update() {
    // Cast Ray
    this.rays = [];
    const source = this.objects.find((o) => o.type === "source")!;

    let cx = source.x;
    let cy = source.y;
    let angle = source.rotation; // right 0

    // Max bounces
    for (let i = 0; i < 10; i++) {
      const hit = this.castRay(cx, cy, angle);
      this.rays.push(hit.segment);

      if (!hit.hitObject) break; // Went off screen

      // Check win
      if (hit.hitObject.type === "target") {
        if (this.status === "playing") {
          this.status = "won";
          if (this.onStateChange)
            this.onStateChange({ status: "won", hit: true });
        }
        break; // Stop at target
      }

      // If mirror, reflect
      if (hit.hitObject.type === "mirror") {
        // Reflect angle
        // Normal of line segment intersection
        // Line is object. Rotation defines line.
        // Normal is rotation + PI/2
        const normal = hit.hitObject.rotation + Math.PI / 2;
        // Reflect: R = I - 2(I.N)N
        // I = vector(cosA, sinA)
        // Vector reflection formula:
        // angleOut = 2*normal - angleIn + PI ??
        // Just use geometry:
        // angleOut = 2 * wallAngle - angleIn.
        // Wait wallAngle is rotation.
        angle = 2 * hit.hitObject.rotation - angle;

        cx = hit.segment.x2;
        cy = hit.segment.y2;
        // Nudge slightly to avoid self-intersect
        cx += Math.cos(angle) * 1;
        cy += Math.sin(angle) * 1;
      } else {
        // Wall or other
        break;
      }
    }

    if (this.status === "playing") {
      const targetHit = this.rays.some((r, i) => {
        // Actually relying on the loop break above is cleaner
        return false;
      });
      if (!targetHit && this.status !== "won") {
        // Still playing
      }
    }
  }

  private castRay(
    x: number,
    y: number,
    angle: number
  ): { segment: RayPath; hitObject: GameObject | null } {
    // Ray Line: x + t*cos, y + t*sin.
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // Find closest intersection
    let closestDist = Infinity;
    let closestObj: GameObject | null = null;
    let hitX = x + dx * 1000; // Far away
    let hitY = y + dy * 1000;

    // Check screen bounds
    // ... (Optional, for now infinite)

    this.objects.forEach((obj) => {
      if (obj.type === "source") return; // Don't hit self

      // Intersect Line (Mirror) or Circle (Target/Source) or Rect (Wall)
      // For MVP: Treat everything as Circles (Dist check) or Lines.
      // Mirrors are Lines. Walls are Rects (4 lines). Source/Target are Circles.

      let dist = Infinity;

      if (obj.type === "mirror") {
        // Line segment intersection
        // Obj line: center (ox, oy), length (w), rotation (r)
        const lx1 = obj.x - (Math.cos(obj.rotation) * obj.width) / 2;
        const ly1 = obj.y - (Math.sin(obj.rotation) * obj.width) / 2;
        const lx2 = obj.x + (Math.cos(obj.rotation) * obj.width) / 2;
        const ly2 = obj.y + (Math.sin(obj.rotation) * obj.width) / 2;

        const int = this.getLineIntersection(
          x,
          y,
          x + dx * 1000,
          y + dy * 1000,
          lx1,
          ly1,
          lx2,
          ly2
        );
        if (int && int.onLine1 && int.onLine2) {
          // Check if ray is moving towards (dot product < 0?)
          // Or just check distance
          const d = Math.hypot(int.x - x, int.y - y);
          if (d > 1 && d < closestDist) {
            // >1 to avoid start point
            closestDist = d;
            closestObj = obj;
            hitX = int.x;
            hitY = int.y;
          }
        }
      } else if (obj.type === "target" || obj.type === "wall") {
        // AABB or Circle intersection
        // Simplified: Circle radius 15
        // Ray-Circle Intersection
        // Vector CP = O - P (P is ray origin)
        // t = CP . D
        // P' = P + tD (closest point on line)
        // dist to center = |P' - O|
        // if dist < r, intersection.
        // Actual intersection t_int = t - sqrt(r^2 - dist^2)

        const cx = obj.x;
        const cy = obj.y;
        const r = (obj.width + obj.height) / 4; // Approx radius

        const vx = cx - x;
        const vy = cy - y;
        const t = vx * dx + vy * dy;

        if (t > 0) {
          const closestX = x + t * dx;
          const closestY = y + t * dy;
          const d2 = (closestX - cx) ** 2 + (closestY - cy) ** 2;
          if (d2 < r ** 2) {
            const dt = Math.sqrt(r ** 2 - d2);
            const t_int = t - dt;
            if (t_int > 1 && t_int < closestDist) {
              closestDist = t_int;
              closestObj = obj;
              hitX = x + t_int * dx;
              hitY = y + t_int * dy;
            }
          }
        }
      }
    });

    return {
      segment: { x1: x, y1: y, x2: hitX, y2: hitY, hit: !!closestObj },
      hitObject: closestObj,
    };
  }

  // Helper: Line-Line Intersection
  private getLineIntersection(
    p0_x: number,
    p0_y: number,
    p1_x: number,
    p1_y: number,
    p2_x: number,
    p2_y: number,
    p3_x: number,
    p3_y: number
  ) {
    const s1_x = p1_x - p0_x;
    const s1_y = p1_y - p0_y;
    const s2_x = p3_x - p2_x;
    const s2_y = p3_y - p2_y;

    const s =
      (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) /
      (-s2_x * s1_y + s1_x * s2_y);
    const t =
      (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) /
      (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      return {
        x: p0_x + t * s1_x,
        y: p0_y + t * s1_y,
        onLine1: true,
        onLine2: true,
      }; // collision detected
    }
    // Check standard line intersection, t is for segment 1?
    // Logic might be slightly swapped, verification: t is along s1?
    return {
      x: p0_x + t * s1_x,
      y: p0_y + t * s1_y,
      onLine1: t >= 0 && t <= 1,
      onLine2: s >= 0 && s <= 1,
    };
  }

  public handleInput(
    type: "down" | "move" | "up" | "dblclick",
    x: number,
    y: number
  ) {
    if (this.status === "won") return;

    if (type === "down") {
      const clicked = this.objects.find((o) => {
        if (o.type !== "mirror") return false;
        const d = Math.hypot(o.x - x, o.y - y);
        return d < 20; // Click center area
      });
      if (clicked) this.draggingObj = clicked;
    } else if (type === "move") {
      if (this.draggingObj) {
        this.draggingObj.x = x;
        this.draggingObj.y = y;
      }
    } else if (type === "up") {
      this.draggingObj = null;
    } else if (type === "dblclick") {
      const clicked = this.objects.find((o) => {
        if (o.type !== "mirror") return false;
        const d = Math.hypot(o.x - x, o.y - y);
        return d < 20;
      });
      if (clicked) {
        clicked.rotation += Math.PI / 4;
      }
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Rays
    this.ctx.lineCap = "round";
    this.rays.forEach((r) => {
      this.ctx.strokeStyle = "#e74c3c"; // Laser Red
      this.ctx.lineWidth = 3;
      this.ctx.globalCompositeOperation = "lighter"; // Glow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = "#e74c3c";
      this.ctx.beginPath();
      this.ctx.moveTo(r.x1, r.y1);
      this.ctx.lineTo(r.x2, r.y2);
      this.ctx.stroke();
    });
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.shadowBlur = 0;

    // Draw Objects
    this.objects.forEach((o) => {
      this.ctx.save();
      this.ctx.translate(o.x, o.y);
      this.ctx.rotate(o.rotation);

      if (o.type === "source") {
        this.ctx.fillStyle = "#2ecc71";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (o.type === "target") {
        this.ctx.fillStyle = this.status === "won" ? "#f1c40f" : "#c0392b";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = "white";
        this.ctx.stroke();
      } else if (o.type === "wall") {
        this.ctx.fillStyle = "#7f8c8d";
        this.ctx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height);
      } else if (o.type === "mirror") {
        this.ctx.fillStyle = "#3498db";
        // Draw Mirror Bar
        this.ctx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height);
        // Highlight Reflective surface (Top?)
        this.ctx.fillStyle = "rgba(255,255,255,0.5)";
        this.ctx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height / 2);
      }

      this.ctx.restore();
    });
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 400;
    }
  }

  public reset() {
    this.start();
    if (this.onStateChange)
      this.onStateChange({ status: "playing", hit: false });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
