export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  r: number; // Rotation in radians? Simplified: No rotation for MVP to avoid complexity?
  // Let's do simple AABB stacking first.
  // If we want rotation, separating axis theorem is needed.
  // Let's stick to AABB but allow slight sliding?
  // Or just simple tower stacking: Blocks fall, if they land on another block, they stop.
  // If they land mostly off-center, they fall off (simulate by modifying x/vx).

  isStatic: boolean;
  color: string;
}

export class BlockTowerGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  bodies: Body[] = [];
  currentBlock: Body | null = null;

  cameraY = 0;

  status: "playing" | "gameover" = "playing";
  height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Ground
    this.bodies.push({
      x: 0,
      y: 600 - 20,
      w: 500,
      h: 20,
      vx: 0,
      vy: 0,
      r: 0,
      isStatic: true,
      color: "#7f8c8d",
    });
  }

  public start() {
    this.bodies = this.bodies.filter((b) => b.isStatic); // Keep ground
    this.status = "playing";
    this.height = 0;
    this.cameraY = 0;

    this.spawnBlock();
    this.loop();
  }

  private spawnBlock() {
    if (this.status !== "playing") return;

    const w = 60;
    const h = 40;
    // Oscillating spawn position at top
    this.currentBlock = {
      x: this.canvas.width / 2 - w / 2,
      y: 0, // In world space? Screen space?
      // Let's use world space. Ground is at 600.
      // Camera moves up.
      // Spawn at Camera Y + 100?
      w,
      h,
      vx: 3, // moving side to side
      vy: 0,
      r: 0,
      isStatic: false,
      color: "#e74c3c",
    };
  }

  private loop = () => {
    if (this.status === "gameover") return;

    this.update();
    this.draw();

    requestAnimationFrame(this.loop);
  };

  private update() {
    // Move current block (oscillate)
    if (this.currentBlock && !this.currentBlock.vy) {
      // Not falling
      this.currentBlock.x += this.currentBlock.vx;
      if (
        this.currentBlock.x <= 0 ||
        this.currentBlock.x + this.currentBlock.w >= this.canvas.width
      ) {
        this.currentBlock.vx *= -1;
      }
    }

    // Physics for falling bodies
    this.bodies.forEach((b) => {
      if (b.isStatic || b === this.currentBlock) return; // Current block managed separately until drop

      // Gravity
      b.vy += 0.5;
      b.y += b.vy;

      // Ground Collision
      if (b.y + b.h > 600 && !b.isStatic) {
        b.y = 600 - b.h;
        b.vy = 0;
        b.isStatic = true; // Landed on ground (should fail usually if ground is far below)
      }

      // Block Collision (Check against static bodies)
      // Simple loop
      this.bodies
        .filter((sb) => sb.isStatic)
        .forEach((sb) => {
          if (b === sb) return;

          if (this.checkCollision(b, sb)) {
            // Check overlap amount
            const overlapX =
              Math.min(b.x + b.w, sb.x + sb.w) - Math.max(b.x, sb.x);
            const centerDiff = Math.abs(b.x + b.w / 2 - (sb.x + sb.w / 2));

            if (centerDiff > sb.w / 2 + 10) {
              // Topple (Simple: rotate or just slide off)
              // For MVP: Just fall past it is enough?
              // If we are strictly checking Y collision:
              // If Center of Mass is outside support, it falls.
            } else {
              // Landed
              b.y = sb.y - b.h; // Place on top
              b.vy = 0;
              b.vx = 0;
              b.isStatic = true;
              this.height++;
              this.onStateChange &&
                this.onStateChange({
                  height: this.height,
                  blocks: this.bodies.length - 1,
                });

              // Next block
              this.spawnBlock();
            }
          }
        });

      // Check fall off world
      if (b.y > 800) {
        this.status = "gameover";
        this.onStateChange && this.onStateChange({ status: "gameover" });
      }
    });

    // Current block falling logic specific
    if (this.currentBlock && this.currentBlock.vy > 0) {
      const b = this.currentBlock;
      b.vy += 0.5;
      b.y += b.vy;

      // Check collisions
      const statics = this.bodies.filter((sb) => sb.isStatic);
      let landed = false;

      for (let sb of statics) {
        if (this.checkCollision(b, sb)) {
          // Logic: center check
          const centerDist = Math.abs(b.x + b.w / 2 - (sb.x + sb.w / 2));
          if (centerDist < sb.w / 2 + b.w / 4) {
            // Stable enough
            b.y = sb.y - b.h;
            b.vy = 0;
            b.vx = 0;
            b.isStatic = true;
            this.bodies.push(b);
            this.currentBlock = null;
            landed = true;
            this.height++;

            // Correct Y camera if needed? (Not accumulating Y yet)
            // this.stackY ?

            this.onStateChange &&
              this.onStateChange({
                height: this.height,
                blocks: this.bodies.length - 1,
              });
            this.spawnBlock();
            break;
          } else {
            // Unstable - Slide off
            // Just continue falling? Or add horizontal velocity?
            b.vx = b.x > sb.x ? 2 : -2;
            // Don't mark static, let it fall
          }
        }
      }

      if (!landed && b.y > 700) {
        this.status = "gameover";
        this.onStateChange && this.onStateChange({ status: "gameover" });
      }
    }
  }

  private checkCollision(a: Body, b: Body) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  public drop() {
    if (this.currentBlock && this.currentBlock.vy === 0) {
      this.currentBlock.vy = 2; // Start fal
    }
  }

  private draw() {
    // Clear
    this.ctx.fillStyle = "#ecf0f1";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Camera logic?
    // Move everything up if stack gets high
    // Find highest static block
    let minY = 600;
    this.bodies.forEach((b) => {
      if (b.y < minY) minY = b.y;
    });

    let targetCamY = 0;
    if (minY < 300) {
      targetCamY = 300 - minY;
    }
    // Smooth cam? linear for now
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

    this.ctx.save();
    this.ctx.translate(0, this.cameraY);

    this.bodies.forEach((b) => this.drawBody(b));
    if (this.currentBlock) this.drawBody(this.currentBlock);

    this.ctx.restore();
  }

  private drawBody(b: Body) {
    this.ctx.fillStyle = b.color;
    this.ctx.fillRect(b.x, b.y, b.w, b.h);
    this.ctx.strokeStyle = "rgba(0,0,0,0.2)";
    this.ctx.strokeRect(b.x, b.y, b.w, b.h);
  }

  public resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  // Callbacks
  onStateChange: any;
  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public reset() {
    this.bodies = this.bodies.filter((b) => b.color === "#7f8c8d"); // Reset to only ground
    this.start();
  }
}
