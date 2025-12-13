/**
 * Physics Sandbox Game Engine
 * Game #264
 *
 * Interactive physics playground!
 */

type ObjectType = "ball" | "box" | "plank";

interface PhysicsObject {
  type: ObjectType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  radius?: number;
  angle: number;
  angularVel: number;
  color: string;
  mass: number;
}

const GRAVITY = 500;
const FRICTION = 0.99;
const BOUNCE = 0.7;
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

export class PhysicsSandboxGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private objects: PhysicsObject[] = [];
  private currentTool: ObjectType = "ball";
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };
  private animationId: number | null = null;
  private lastTime = 0;
  private size = 0;
  private isPlaying = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupEvents();
  }

  private setupEvents() {
    const getPos = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    this.canvas.addEventListener("mousedown", (e) => {
      if (!this.isPlaying) return;
      const pos = getPos(e);
      this.isDragging = true;
      this.dragStart = pos;
      this.dragCurrent = pos;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.isPlaying || !this.isDragging) return;
      this.dragCurrent = getPos(e);
    });

    this.canvas.addEventListener("mouseup", () => {
      if (!this.isPlaying || !this.isDragging) return;
      this.spawnObject();
      this.isDragging = false;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.isDragging = false;
    });

    // Touch events
    this.canvas.addEventListener("touchstart", (e) => {
      if (!this.isPlaying) return;
      e.preventDefault();
      const pos = getPos(e.touches[0]);
      this.isDragging = true;
      this.dragStart = pos;
      this.dragCurrent = pos;
    });

    this.canvas.addEventListener("touchmove", (e) => {
      if (!this.isPlaying || !this.isDragging) return;
      e.preventDefault();
      this.dragCurrent = getPos(e.touches[0]);
    });

    this.canvas.addEventListener("touchend", (e) => {
      if (!this.isPlaying || !this.isDragging) return;
      e.preventDefault();
      this.spawnObject();
      this.isDragging = false;
    });
  }

  private spawnObject() {
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    let obj: PhysicsObject;

    switch (this.currentTool) {
      case "ball":
        obj = {
          type: "ball",
          x: this.dragStart.x,
          y: this.dragStart.y,
          vx: dx * 3,
          vy: dy * 3,
          width: 0,
          height: 0,
          radius: 15 + Math.random() * 15,
          angle: 0,
          angularVel: (Math.random() - 0.5) * 0.2,
          color,
          mass: 1,
        };
        break;

      case "box":
        const size = 20 + Math.random() * 20;
        obj = {
          type: "box",
          x: this.dragStart.x,
          y: this.dragStart.y,
          vx: dx * 3,
          vy: dy * 3,
          width: size,
          height: size,
          angle: 0,
          angularVel: (Math.random() - 0.5) * 0.1,
          color,
          mass: 1.5,
        };
        break;

      case "plank":
        obj = {
          type: "plank",
          x: this.dragStart.x,
          y: this.dragStart.y,
          vx: dx * 2,
          vy: dy * 2,
          width: 80 + Math.random() * 40,
          height: 12,
          angle: (Math.random() - 0.5) * 0.5,
          angularVel: (Math.random() - 0.5) * 0.05,
          color,
          mass: 2,
        };
        break;

      default:
        return;
    }

    this.objects.push(obj);

    // Limit objects
    if (this.objects.length > 50) {
      this.objects.shift();
    }
  }

  setTool(tool: ObjectType | "clear") {
    if (tool === "clear") {
      this.objects = [];
    } else {
      this.currentTool = tool;
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.draw();
  }

  start() {
    this.isPlaying = true;
    this.objects = [];
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    for (const obj of this.objects) {
      // Apply gravity
      obj.vy += GRAVITY * dt;

      // Apply velocity
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Apply angular velocity
      obj.angle += obj.angularVel;

      // Apply friction
      obj.vx *= FRICTION;
      obj.vy *= FRICTION;
      obj.angularVel *= FRICTION;

      // Ground collision
      const bottom = this.getBottom(obj);
      if (bottom > this.size) {
        obj.y -= bottom - this.size;
        obj.vy *= -BOUNCE;
        obj.vx *= 0.9;
        obj.angularVel *= 0.8;
      }

      // Wall collisions
      const left = this.getLeft(obj);
      const right = this.getRight(obj);

      if (left < 0) {
        obj.x -= left;
        obj.vx *= -BOUNCE;
      }
      if (right > this.size) {
        obj.x -= right - this.size;
        obj.vx *= -BOUNCE;
      }

      // Ceiling collision
      const top = this.getTop(obj);
      if (top < 0) {
        obj.y -= top;
        obj.vy *= -BOUNCE;
      }
    }

    // Simple object-to-object collision
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        this.resolveCollision(this.objects[i], this.objects[j]);
      }
    }
  }

  private getBottom(obj: PhysicsObject): number {
    if (obj.type === "ball") {
      return obj.y + obj.radius!;
    }
    return obj.y + obj.height / 2;
  }

  private getTop(obj: PhysicsObject): number {
    if (obj.type === "ball") {
      return obj.y - obj.radius!;
    }
    return obj.y - obj.height / 2;
  }

  private getLeft(obj: PhysicsObject): number {
    if (obj.type === "ball") {
      return obj.x - obj.radius!;
    }
    return obj.x - obj.width / 2;
  }

  private getRight(obj: PhysicsObject): number {
    if (obj.type === "ball") {
      return obj.x + obj.radius!;
    }
    return obj.x + obj.width / 2;
  }

  private resolveCollision(a: PhysicsObject, b: PhysicsObject) {
    // Simplified circle-based collision for all objects
    const radiusA = a.type === "ball" ? a.radius! : Math.max(a.width, a.height) / 2;
    const radiusB = b.type === "ball" ? b.radius! : Math.max(b.width, b.height) / 2;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = radiusA + radiusB;

    if (dist < minDist && dist > 0) {
      // Collision response
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Separate objects
      const totalMass = a.mass + b.mass;
      a.x -= (overlap * nx * b.mass) / totalMass;
      a.y -= (overlap * ny * b.mass) / totalMass;
      b.x += (overlap * nx * a.mass) / totalMass;
      b.y += (overlap * ny * a.mass) / totalMass;

      // Calculate relative velocity
      const dvx = a.vx - b.vx;
      const dvy = a.vy - b.vy;
      const dvn = dvx * nx + dvy * ny;

      // Only resolve if objects are moving towards each other
      if (dvn > 0) {
        const restitution = 0.5;
        const impulse = (-(1 + restitution) * dvn) / totalMass;

        a.vx += impulse * b.mass * nx;
        a.vy += impulse * b.mass * ny;
        b.vx -= impulse * a.mass * nx;
        b.vy -= impulse * a.mass * ny;

        // Add spin
        a.angularVel += (Math.random() - 0.5) * 0.1;
        b.angularVel += (Math.random() - 0.5) * 0.1;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.size;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, s);
    gradient.addColorStop(0, "#1a2634");
    gradient.addColorStop(1, "#2c3e50");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, s, s);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= s; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    for (let y = 0; y <= s; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
    }

    // Draw objects
    for (const obj of this.objects) {
      this.drawObject(obj);
    }

    // Draw drag indicator
    if (this.isDragging) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.dragStart.x, this.dragStart.y);
      ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw arrow head
      const dx = this.dragStart.x - this.dragCurrent.x;
      const dy = this.dragStart.y - this.dragCurrent.y;
      const angle = Math.atan2(dy, dx);

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.moveTo(this.dragStart.x, this.dragStart.y);
      ctx.lineTo(
        this.dragStart.x - 10 * Math.cos(angle - 0.3),
        this.dragStart.y - 10 * Math.sin(angle - 0.3)
      );
      ctx.lineTo(
        this.dragStart.x - 10 * Math.cos(angle + 0.3),
        this.dragStart.y - 10 * Math.sin(angle + 0.3)
      );
      ctx.closePath();
      ctx.fill();

      // Draw preview
      this.drawPreview();
    }
  }

  private drawObject(obj: PhysicsObject) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.angle);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    if (obj.type === "ball") {
      ctx.beginPath();
      ctx.ellipse(3, 3, obj.radius!, obj.radius! * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(
        -obj.width / 2 + 3,
        -obj.height / 2 + 3,
        obj.width,
        obj.height
      );
    }

    // Main body
    if (obj.type === "ball") {
      const gradient = ctx.createRadialGradient(
        -obj.radius! * 0.3,
        -obj.radius! * 0.3,
        0,
        0,
        0,
        obj.radius!
      );
      gradient.addColorStop(0, this.lightenColor(obj.color, 30));
      gradient.addColorStop(1, obj.color);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius!, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const gradient = ctx.createLinearGradient(
        -obj.width / 2,
        -obj.height / 2,
        obj.width / 2,
        obj.height / 2
      );
      gradient.addColorStop(0, this.lightenColor(obj.color, 20));
      gradient.addColorStop(1, obj.color);
      ctx.fillStyle = gradient;
      ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);

      // Border
      ctx.strokeStyle = this.darkenColor(obj.color, 20);
      ctx.lineWidth = 2;
      ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    }

    ctx.restore();
  }

  private drawPreview() {
    const ctx = this.ctx;
    const x = this.dragStart.x;
    const y = this.dragStart.y;

    ctx.globalAlpha = 0.5;

    switch (this.currentTool) {
      case "ball":
        ctx.fillStyle = "#3498db";
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "box":
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(x - 15, y - 15, 30, 30);
        break;
      case "plank":
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(x - 50, y - 6, 100, 12);
        break;
    }

    ctx.globalAlpha = 1;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `rgb(${R},${G},${B})`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `rgb(${R},${G},${B})`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
