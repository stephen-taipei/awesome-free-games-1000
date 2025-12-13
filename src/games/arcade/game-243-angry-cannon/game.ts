/**
 * Angry Cannon Game Engine
 * Game #243
 *
 * Physics-based projectile destruction game!
 */

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  type: "wood" | "stone" | "target";
}

interface GameState {
  level: number;
  shots: number;
  score: number;
  status: "idle" | "playing" | "aiming" | "flying" | "win" | "lose";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.3;
const CANNON_X = 60;
const CANNON_Y_RATIO = 0.7;
const MAX_POWER = 20;
const BALL_RADIUS = 12;

export class AngryCannonGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private status: "idle" | "playing" | "aiming" | "flying" | "win" | "lose" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private level = 1;
  private shots = 3;
  private score = 0;
  private cannonY = 0;
  private cannonAngle = -Math.PI / 4;

  private projectile: Projectile | null = null;
  private blocks: Block[] = [];

  private isDragging = false;
  private dragX = 0;
  private dragY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.setupControls();
  }

  private setupControls() {
    this.canvas.addEventListener("mousedown", (e) => this.startAim(e));
    this.canvas.addEventListener("mousemove", (e) => this.updateAim(e));
    this.canvas.addEventListener("mouseup", () => this.fire());

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.startAim(e.touches[0]);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.updateAim(e.touches[0]);
    });
    this.canvas.addEventListener("touchend", () => this.fire());
  }

  private getCanvasCoords(e: MouseEvent | Touch) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private startAim(e: MouseEvent | Touch) {
    if (this.status !== "playing" || this.shots <= 0) return;

    this.isDragging = true;
    this.status = "aiming";
    const pos = this.getCanvasCoords(e);
    this.dragX = pos.x;
    this.dragY = pos.y;
  }

  private updateAim(e: MouseEvent | Touch) {
    if (!this.isDragging) return;

    const pos = this.getCanvasCoords(e);
    this.dragX = pos.x;
    this.dragY = pos.y;

    // Calculate angle from cannon to drag point (inverted for slingshot feel)
    const dx = CANNON_X - this.dragX;
    const dy = this.cannonY - this.dragY;
    this.cannonAngle = Math.atan2(dy, dx);

    this.draw();
  }

  private fire() {
    if (!this.isDragging || this.status !== "aiming") return;

    this.isDragging = false;

    const dx = CANNON_X - this.dragX;
    const dy = this.cannonY - this.dragY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist / 10, MAX_POWER);

    if (power < 2) {
      this.status = "playing";
      return;
    }

    const angle = Math.atan2(dy, dx);

    this.projectile = {
      x: CANNON_X + Math.cos(angle) * 40,
      y: this.cannonY + Math.sin(angle) * 40,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      radius: BALL_RADIUS,
      active: true,
    };

    this.shots--;
    this.status = "flying";
    this.emitState();
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        shots: this.shots,
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

    this.cannonY = size * CANNON_Y_RATIO;
    this.draw();
  }

  start() {
    this.level = 1;
    this.score = 0;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private loadLevel() {
    this.shots = 3 + Math.floor(this.level / 3);
    this.projectile = null;
    this.blocks = [];

    const w = this.canvas.width;
    const h = this.canvas.height;
    const groundY = h * 0.85;

    // Generate level structure
    const baseX = w * 0.6;
    const blockW = 30;
    const blockH = 60;

    // Build a tower structure
    const layers = 2 + Math.min(this.level, 4);

    for (let layer = 0; layer < layers; layer++) {
      const blocksInLayer = layers - layer;
      const layerWidth = blocksInLayer * blockW;
      const startX = baseX + (layers * blockW - layerWidth) / 2;

      for (let i = 0; i < blocksInLayer; i++) {
        const type = layer === layers - 1 ? "target" : Math.random() > 0.5 ? "wood" : "stone";
        const hp = type === "wood" ? 1 : type === "stone" ? 2 : 1;

        this.blocks.push({
          x: startX + i * blockW,
          y: groundY - (layer + 1) * blockH,
          width: blockW - 2,
          height: blockH - 2,
          hp,
          type,
        });
      }
    }

    this.emitState();
  }

  private gameLoop() {
    if (this.status === "idle" || this.status === "win" || this.status === "lose") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    if (this.status !== "flying" || !this.projectile) return;

    // Apply gravity
    this.projectile.vy += GRAVITY;

    // Apply velocity
    this.projectile.x += this.projectile.vx;
    this.projectile.y += this.projectile.vy;

    // Check block collisions
    this.blocks = this.blocks.filter((block) => {
      if (!this.projectile) return true;

      const collision = this.checkCircleRectCollision(
        this.projectile.x,
        this.projectile.y,
        this.projectile.radius,
        block.x,
        block.y,
        block.width,
        block.height
      );

      if (collision) {
        block.hp--;
        this.projectile.vx *= 0.5;
        this.projectile.vy *= 0.5;

        if (block.hp <= 0) {
          this.score += block.type === "target" ? 500 : block.type === "stone" ? 100 : 50;
          this.emitState();
          return false;
        }
      }

      return true;
    });

    // Ground collision
    const groundY = this.canvas.height * 0.85;
    if (this.projectile.y + this.projectile.radius > groundY) {
      this.projectile.y = groundY - this.projectile.radius;
      this.projectile.vy *= -0.5;
      this.projectile.vx *= 0.8;

      if (Math.abs(this.projectile.vy) < 0.5) {
        this.projectile.active = false;
      }
    }

    // Wall collision
    if (this.projectile.x < 0 || this.projectile.x > this.canvas.width) {
      this.projectile.active = false;
    }

    // Check if projectile stopped
    const speed = Math.sqrt(
      this.projectile.vx * this.projectile.vx + this.projectile.vy * this.projectile.vy
    );
    if (speed < 0.5 && this.projectile.y >= groundY - this.projectile.radius - 5) {
      this.projectile.active = false;
    }

    // Check round end
    if (!this.projectile.active) {
      const targetsRemaining = this.blocks.some((b) => b.type === "target");

      if (!targetsRemaining) {
        this.level++;
        this.score += this.shots * 100;
        this.loadLevel();
        this.status = "playing";
      } else if (this.shots <= 0) {
        this.status = "lose";
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
        }
      } else {
        this.status = "playing";
        this.projectile = null;
      }

      this.emitState();
    }
  }

  private checkCircleRectCollision(
    cx: number,
    cy: number,
    cr: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));

    const dx = cx - closestX;
    const dy = cy - closestY;

    return dx * dx + dy * dy < cr * cr;
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(1, "#e0f6ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    const groundY = h * 0.85;
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, groundY, w, h - groundY);

    // Grass
    ctx.fillStyle = "#228b22";
    ctx.fillRect(0, groundY, w, 10);

    // Draw cannon
    this.drawCannon();

    // Draw blocks
    this.blocks.forEach((block) => this.drawBlock(block));

    // Draw projectile
    if (this.projectile) {
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(this.projectile.x, this.projectile.y, this.projectile.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(
        this.projectile.x - 3,
        this.projectile.y - 3,
        this.projectile.radius * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw aim line
    if (this.isDragging) {
      const dx = CANNON_X - this.dragX;
      const dy = this.cannonY - this.dragY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist / 10, MAX_POWER);

      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANNON_X, this.cannonY);
      ctx.lineTo(this.dragX, this.dragY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Power indicator
      ctx.fillStyle = power > MAX_POWER * 0.7 ? "#ff0000" : "#00ff00";
      ctx.fillRect(10, 10, (power / MAX_POWER) * 100, 10);
      ctx.strokeStyle = "#333";
      ctx.strokeRect(10, 10, 100, 10);
    }
  }

  private drawCannon() {
    const ctx = this.ctx;

    // Cannon base
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.arc(CANNON_X, this.cannonY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Cannon barrel
    ctx.save();
    ctx.translate(CANNON_X, this.cannonY);
    ctx.rotate(this.cannonAngle);

    ctx.fillStyle = "#333";
    ctx.fillRect(0, -10, 45, 20);

    // Barrel opening
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(45, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Wheels
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(CANNON_X - 15, this.cannonY + 15, 12, 0, Math.PI * 2);
    ctx.arc(CANNON_X + 15, this.cannonY + 15, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBlock(block: Block) {
    const ctx = this.ctx;

    let color: string;
    if (block.type === "wood") {
      color = "#deb887";
    } else if (block.type === "stone") {
      color = "#808080";
    } else {
      color = "#ff4444";
    }

    ctx.fillStyle = color;
    ctx.fillRect(block.x, block.y, block.width, block.height);

    // Border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x, block.y, block.width, block.height);

    // Target indicator
    if (block.type === "target") {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(
        block.x + block.width / 2,
        block.y + block.height / 2,
        10,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.arc(
        block.x + block.width / 2,
        block.y + block.height / 2,
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
