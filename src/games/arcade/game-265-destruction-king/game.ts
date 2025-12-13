/**
 * Destruction King Game Engine
 * Game #265
 *
 * Destroy buildings with cannonballs!
 */

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  color: string;
  destroyed: boolean;
  health: number;
}

interface Cannonball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface GameState {
  score: number;
  shotsLeft: number;
  level: number;
  status: "idle" | "playing" | "aiming" | "complete" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 300;
const CANNON_X = 50;
const CANNON_Y_OFFSET = 80;
const MAX_LEVELS = 5;

export class DestructionKingGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blocks: Block[] = [];
  private cannonballs: Cannonball[] = [];
  private particles: Particle[] = [];
  private score = 0;
  private shotsLeft = 5;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private size = 0;
  private isDragging = false;
  private aimAngle = -Math.PI / 4;
  private aimPower = 0;
  private dragStart = { x: 0, y: 0 };
  private cannonY = 0;

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
      if (this.status !== "playing" || this.shotsLeft <= 0) return;
      const pos = getPos(e);
      if (pos.x < 120 && pos.y > this.cannonY - 50) {
        this.isDragging = true;
        this.dragStart = pos;
        this.status = "aiming";
      }
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      this.updateAim(pos);
    });

    this.canvas.addEventListener("mouseup", () => {
      if (this.isDragging && this.status === "aiming") {
        this.fire();
      }
      this.isDragging = false;
      if (this.status === "aiming") this.status = "playing";
    });

    // Touch events
    this.canvas.addEventListener("touchstart", (e) => {
      if (this.status !== "playing" || this.shotsLeft <= 0) return;
      e.preventDefault();
      const pos = getPos(e.touches[0]);
      if (pos.x < 120 && pos.y > this.cannonY - 50) {
        this.isDragging = true;
        this.dragStart = pos;
        this.status = "aiming";
      }
    });

    this.canvas.addEventListener("touchmove", (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const pos = getPos(e.touches[0]);
      this.updateAim(pos);
    });

    this.canvas.addEventListener("touchend", (e) => {
      if (this.isDragging && this.status === "aiming") {
        e.preventDefault();
        this.fire();
      }
      this.isDragging = false;
      if (this.status === "aiming") this.status = "playing";
    });
  }

  private updateAim(pos: { x: number; y: number }) {
    const dx = this.dragStart.x - pos.x;
    const dy = this.dragStart.y - pos.y;
    this.aimAngle = Math.atan2(dy, dx);
    this.aimAngle = Math.max(-Math.PI / 2, Math.min(0, this.aimAngle));
    this.aimPower = Math.min(15, Math.hypot(dx, dy) / 10);
  }

  private fire() {
    if (this.shotsLeft <= 0 || this.aimPower < 2) return;

    const speed = this.aimPower * 50;
    this.cannonballs.push({
      x: CANNON_X + 30,
      y: this.cannonY,
      vx: Math.cos(this.aimAngle) * speed,
      vy: Math.sin(this.aimAngle) * speed,
      radius: 12,
      active: true,
    });

    this.shotsLeft--;
    this.aimPower = 0;
    this.emitState();
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        shotsLeft: this.shotsLeft,
        level: this.level,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.cannonY = this.size - CANNON_Y_OFFSET;
    this.draw();
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.loadLevel();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  nextLevel() {
    this.level++;
    if (this.level > MAX_LEVELS) {
      this.level = 1;
      this.score += 500;
    }
    this.loadLevel();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private loadLevel() {
    this.blocks = [];
    this.cannonballs = [];
    this.particles = [];
    this.shotsLeft = 5 + this.level;
    this.aimPower = 0;

    // Build a structure
    const groundY = this.size - 30;
    const startX = this.size * 0.5;
    const blockWidth = 30;
    const blockHeight = 20;

    const colors = ["#c0392b", "#e74c3c", "#d35400", "#e67e22", "#f39c12"];

    // Create tower based on level
    const rows = 3 + this.level;
    const cols = 2 + Math.floor(this.level / 2);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.blocks.push({
          x: startX + col * (blockWidth + 2),
          y: groundY - (row + 1) * blockHeight,
          width: blockWidth,
          height: blockHeight,
          vx: 0,
          vy: 0,
          angle: 0,
          angularVel: 0,
          color: colors[row % colors.length],
          destroyed: false,
          health: 2,
        });
      }
    }

    // Add some support beams
    if (this.level > 2) {
      this.blocks.push({
        x: startX - 20,
        y: groundY - blockHeight * 2,
        width: 15,
        height: blockHeight * 2,
        vx: 0,
        vy: 0,
        angle: 0,
        angularVel: 0,
        color: "#8b4513",
        destroyed: false,
        health: 3,
      });
    }
  }

  private gameLoop() {
    if (this.status === "idle" || this.status === "complete" || this.status === "over") return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    const groundY = this.size - 30;

    // Update cannonballs
    for (const ball of this.cannonballs) {
      if (!ball.active) continue;

      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Ground collision
      if (ball.y + ball.radius > groundY) {
        ball.y = groundY - ball.radius;
        ball.vy *= -0.5;
        ball.vx *= 0.8;
        if (Math.abs(ball.vy) < 20) {
          ball.active = false;
        }
      }

      // Wall collision
      if (ball.x + ball.radius > this.size) {
        ball.x = this.size - ball.radius;
        ball.vx *= -0.5;
      }

      // Block collision
      for (const block of this.blocks) {
        if (block.destroyed) continue;
        if (this.ballBlockCollision(ball, block)) {
          block.health--;
          if (block.health <= 0) {
            this.destroyBlock(block);
          } else {
            // Push block
            block.vx += ball.vx * 0.3;
            block.vy += ball.vy * 0.3;
          }
          ball.vx *= 0.7;
          ball.vy *= 0.7;
        }
      }
    }

    // Update blocks
    for (const block of this.blocks) {
      if (block.destroyed) continue;

      // Apply physics if block is falling
      if (block.vy !== 0 || block.y + block.height < groundY - 1) {
        block.vy += GRAVITY * dt;
        block.x += block.vx * dt;
        block.y += block.vy * dt;
        block.angle += block.angularVel * dt;

        // Ground
        if (block.y + block.height > groundY) {
          block.y = groundY - block.height;
          block.vy *= -0.3;
          block.vx *= 0.8;
          block.angularVel *= 0.8;
          if (Math.abs(block.vy) < 10) {
            block.vy = 0;
            block.vx = 0;
          }
        }

        // Walls
        if (block.x < 0) {
          block.x = 0;
          block.vx *= -0.5;
        }
        if (block.x + block.width > this.size) {
          block.x = this.size - block.width;
          block.vx *= -0.5;
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 5;
      p.life -= dt * 2;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Check win/lose conditions
    const activeBlocks = this.blocks.filter((b) => !b.destroyed).length;
    const activeBalls = this.cannonballs.filter((b) => b.active).length;

    if (activeBlocks === 0) {
      this.levelComplete();
    } else if (this.shotsLeft === 0 && activeBalls === 0) {
      // Wait a moment for settling
      setTimeout(() => {
        if (this.blocks.filter((b) => !b.destroyed).length > 0) {
          this.gameOver();
        }
      }, 1000);
    }

    this.emitState();
  }

  private ballBlockCollision(ball: Cannonball, block: Block): boolean {
    // Simple AABB collision with circle
    const closestX = Math.max(block.x, Math.min(ball.x, block.x + block.width));
    const closestY = Math.max(block.y, Math.min(ball.y, block.y + block.height));
    const dist = Math.hypot(ball.x - closestX, ball.y - closestY);
    return dist < ball.radius;
  }

  private destroyBlock(block: Block) {
    block.destroyed = true;
    this.score += 10;

    // Create debris particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      this.particles.push({
        x: block.x + block.width / 2,
        y: block.y + block.height / 2,
        vx: Math.cos(angle) * (3 + Math.random() * 3),
        vy: Math.sin(angle) * (3 + Math.random() * 3) - 3,
        life: 1,
        color: block.color,
        size: 4 + Math.random() * 4,
      });
    }

    // Check if blocks above should fall
    for (const other of this.blocks) {
      if (other.destroyed) continue;
      if (
        other.y + other.height <= block.y + 5 &&
        other.x < block.x + block.width &&
        other.x + other.width > block.x
      ) {
        other.vy = 1;
        other.angularVel = (Math.random() - 0.5) * 0.1;
      }
    }
  }

  private levelComplete() {
    this.status = "complete";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.size;
    const groundY = s - 30;

    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0, "#1a1a2e");
    skyGradient.addColorStop(1, "#16213e");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, s, groundY);

    // Ground
    ctx.fillStyle = "#2d4a22";
    ctx.fillRect(0, groundY, s, s - groundY);

    // Grass line
    ctx.fillStyle = "#4a7c23";
    ctx.fillRect(0, groundY, s, 5);

    // Draw blocks
    for (const block of this.blocks) {
      if (!block.destroyed) {
        this.drawBlock(block);
      }
    }

    // Draw cannonballs
    for (const ball of this.cannonballs) {
      if (ball.active) {
        this.drawCannonball(ball);
      }
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Draw cannon
    this.drawCannon();

    // Draw aim trajectory
    if (this.isDragging && this.aimPower > 0) {
      this.drawTrajectory();
    }
  }

  private drawBlock(block: Block) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(block.x + block.width / 2, block.y + block.height / 2);
    ctx.rotate(block.angle);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(
      -block.width / 2 + 2,
      -block.height / 2 + 2,
      block.width,
      block.height
    );

    // Block
    const gradient = ctx.createLinearGradient(
      -block.width / 2,
      -block.height / 2,
      block.width / 2,
      block.height / 2
    );
    gradient.addColorStop(0, block.color);
    gradient.addColorStop(1, this.darkenColor(block.color, 20));
    ctx.fillStyle = gradient;
    ctx.fillRect(-block.width / 2, -block.height / 2, block.width, block.height);

    // Border
    ctx.strokeStyle = this.darkenColor(block.color, 40);
    ctx.lineWidth = 1;
    ctx.strokeRect(-block.width / 2, -block.height / 2, block.width, block.height);

    // Damage indicator
    if (block.health === 1) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-block.width / 4, -block.height / 4);
      ctx.lineTo(block.width / 4, block.height / 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawCannonball(ball: Cannonball) {
    const ctx = this.ctx;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(ball.x + 2, ball.y + 2, ball.radius, ball.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      0,
      ball.x,
      ball.y,
      ball.radius
    );
    gradient.addColorStop(0, "#555");
    gradient.addColorStop(1, "#222");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawCannon() {
    const ctx = this.ctx;
    const x = CANNON_X;
    const y = this.cannonY;

    // Wheel
    ctx.fillStyle = "#5d4e37";
    ctx.beginPath();
    ctx.arc(x, y + 15, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3d2e17";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = "#3d2e17";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.lineTo(x + Math.cos(angle) * 15, y + 15 + Math.sin(angle) * 15);
      ctx.stroke();
    }

    // Barrel
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.aimAngle);

    const gradient = ctx.createLinearGradient(0, -10, 0, 10);
    gradient.addColorStop(0, "#555");
    gradient.addColorStop(0.5, "#333");
    gradient.addColorStop(1, "#555");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, -10, 40, 20);

    // Muzzle
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(40, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTrajectory() {
    const ctx = this.ctx;
    const speed = this.aimPower * 50;
    const vx = Math.cos(this.aimAngle) * speed;
    const vy = Math.sin(this.aimAngle) * speed;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.setLineDash([5, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();

    let x = CANNON_X + 30;
    let y = this.cannonY;
    let velX = vx;
    let velY = vy;

    ctx.moveTo(x, y);

    for (let i = 0; i < 20; i++) {
      velY += GRAVITY * 0.05;
      x += velX * 0.05;
      y += velY * 0.05;

      if (y > this.size - 30) break;

      ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Power indicator
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Power: ${Math.round(this.aimPower * 10)}%`, CANNON_X, this.cannonY - 50);
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
