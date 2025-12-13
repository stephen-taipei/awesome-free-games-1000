/**
 * Frisbee Dog Game Engine
 * Game #247
 *
 * Control a dog to catch frisbees thrown from different angles
 */

interface Frisbee {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  points: number;
  active: boolean;
}

interface Dog {
  x: number;
  y: number;
  targetX: number;
  jumping: boolean;
  jumpVelocity: number;
  groundY: number;
  catching: boolean;
}

interface GameState {
  score: number;
  highScore: number;
  lives: number;
  status: "idle" | "playing" | "over";
  combo: number;
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.4;
const JUMP_FORCE = -12;
const DOG_SPEED = 8;

export class FrisbeeDogGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dog: Dog;
  private frisbees: Frisbee[] = [];
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private combo = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private throwTimer = 0;
  private throwInterval = 2000;
  private lastTime = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private clouds: { x: number; y: number; size: number; speed: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.dog = this.createDog();
    this.loadHighScore();
    this.initClouds();
  }

  private createDog(): Dog {
    return {
      x: this.width / 2,
      y: 0,
      targetX: this.width / 2,
      jumping: false,
      jumpVelocity: 0,
      groundY: 0,
      catching: false,
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem("frisbee_dog_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("frisbee_dog_highscore", this.highScore.toString());
  }

  private initClouds() {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: 30 + Math.random() * 80,
        size: 30 + Math.random() * 40,
        speed: 0.2 + Math.random() * 0.3,
      });
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        lives: this.lives,
        status: this.status,
        combo: this.combo,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);

    this.dog.groundY = this.height - 60;
    this.dog.y = this.dog.groundY;
    this.dog.x = this.width / 2;
    this.dog.targetX = this.width / 2;

    this.initClouds();
    this.draw();
  }

  moveTo(x: number) {
    if (this.status !== "playing") return;
    this.dog.targetX = Math.max(40, Math.min(this.width - 40, x));
  }

  jump() {
    if (this.status !== "playing") return;
    if (!this.dog.jumping) {
      this.dog.jumping = true;
      this.dog.jumpVelocity = JUMP_FORCE;
    }
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.frisbees = [];
    this.particles = [];
    this.throwTimer = 0;
    this.throwInterval = 2000;
    this.dog = this.createDog();
    this.dog.groundY = this.height - 60;
    this.dog.y = this.dog.groundY;
    this.dog.x = this.width / 2;
    this.dog.targetX = this.width / 2;
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Update throw timer
    this.throwTimer += dt;
    if (this.throwTimer >= this.throwInterval) {
      this.throwFrisbee();
      this.throwTimer = 0;
      this.throwInterval = Math.max(800, this.throwInterval - 20);
    }

    // Update dog position
    const dx = this.dog.targetX - this.dog.x;
    if (Math.abs(dx) > 2) {
      this.dog.x += Math.sign(dx) * Math.min(DOG_SPEED, Math.abs(dx));
    }

    // Update dog jump
    if (this.dog.jumping) {
      this.dog.jumpVelocity += GRAVITY;
      this.dog.y += this.dog.jumpVelocity;

      if (this.dog.y >= this.dog.groundY) {
        this.dog.y = this.dog.groundY;
        this.dog.jumping = false;
        this.dog.jumpVelocity = 0;
      }
    }

    // Update frisbees
    for (const frisbee of this.frisbees) {
      if (!frisbee.active) continue;

      frisbee.x += frisbee.vx;
      frisbee.y += frisbee.vy;
      frisbee.vy += GRAVITY * 0.3;
      frisbee.rotation += frisbee.rotationSpeed;

      // Check catch
      const catchDist = 50;
      const dogCatchY = this.dog.y - 30;
      const distX = Math.abs(frisbee.x - this.dog.x);
      const distY = Math.abs(frisbee.y - dogCatchY);

      if (distX < catchDist && distY < catchDist) {
        this.catchFrisbee(frisbee);
        continue;
      }

      // Check if missed (fell below screen)
      if (frisbee.y > this.height + 50) {
        frisbee.active = false;
        this.combo = 0;
        this.lives--;
        this.emitState();

        if (this.lives <= 0) {
          this.gameOver();
        }
      }

      // Remove if out of bounds horizontally
      if (frisbee.x < -50 || frisbee.x > this.width + 50) {
        frisbee.active = false;
      }
    }

    // Clean up inactive frisbees
    this.frisbees = this.frisbees.filter((f) => f.active);

    // Update clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > this.width + cloud.size) {
        cloud.x = -cloud.size;
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private throwFrisbee() {
    const fromLeft = Math.random() > 0.5;
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const frisbee: Frisbee = {
      x: fromLeft ? -30 : this.width + 30,
      y: 50 + Math.random() * 100,
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 3),
      vy: 1 + Math.random() * 2,
      rotation: 0,
      rotationSpeed: (fromLeft ? 1 : -1) * (0.2 + Math.random() * 0.2),
      color,
      points: 10,
      active: true,
    };

    // Golden frisbee (rare, more points)
    if (Math.random() < 0.15) {
      frisbee.color = "#ffd700";
      frisbee.points = 50;
    }

    this.frisbees.push(frisbee);
  }

  private catchFrisbee(frisbee: Frisbee) {
    frisbee.active = false;
    this.combo++;
    const points = frisbee.points * Math.min(this.combo, 5);
    this.score += points;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }

    this.dog.catching = true;
    setTimeout(() => {
      this.dog.catching = false;
    }, 200);

    // Spawn particles
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: frisbee.x,
        y: frisbee.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1,
        color: frisbee.color,
      });
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

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(0.7, "#98D8E8");
    skyGradient.addColorStop(1, "#7EC8E3");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw sun
    ctx.fillStyle = "#FFD93D";
    ctx.beginPath();
    ctx.arc(this.width - 60, 60, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 217, 61, 0.3)";
    ctx.beginPath();
    ctx.arc(this.width - 60, 60, 55, 0, Math.PI * 2);
    ctx.fill();

    // Draw clouds
    for (const cloud of this.clouds) {
      this.drawCloud(cloud.x, cloud.y, cloud.size);
    }

    // Draw grass
    const grassGradient = ctx.createLinearGradient(0, this.height - 60, 0, this.height);
    grassGradient.addColorStop(0, "#4CAF50");
    grassGradient.addColorStop(1, "#388E3C");
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, this.height - 60, this.width, 60);

    // Grass texture
    ctx.strokeStyle = "#2E7D32";
    for (let x = 0; x < this.width; x += 15) {
      const h = 5 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(x, this.height - 60);
      ctx.lineTo(x + 3, this.height - 60 - h);
      ctx.stroke();
    }

    // Draw frisbees
    for (const frisbee of this.frisbees) {
      if (!frisbee.active) continue;
      this.drawFrisbee(frisbee);
    }

    // Draw dog
    this.drawDog();

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw combo indicator
    if (this.combo > 1 && this.status === "playing") {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`x${this.combo} COMBO!`, this.width / 2, 50);
    }
  }

  private drawCloud(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";

    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFrisbee(frisbee: Frisbee) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(frisbee.x, frisbee.y);
    ctx.rotate(frisbee.rotation);

    // Frisbee disc
    ctx.fillStyle = frisbee.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.ellipse(-8, -3, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawDog() {
    const ctx = this.ctx;
    const x = this.dog.x;
    const y = this.dog.y;

    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#D2691E";
    ctx.beginPath();
    ctx.ellipse(0, -30, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#CD853F";
    ctx.beginPath();
    ctx.arc(25, -50, 22, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = "#DEB887";
    ctx.beginPath();
    ctx.ellipse(40, -45, 12, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(48, -45, 5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(28, -55, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(30, -55, 4, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.ellipse(10, -65, 10, 18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(35, -68, 10, 18, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#D2691E";
    const legOffset = this.dog.jumping ? -5 : 0;

    // Front legs
    ctx.fillRect(15, -15, 10, 20 + legOffset);
    ctx.fillRect(-5, -15, 10, 20 + legOffset);

    // Back legs
    ctx.fillRect(-25, -15, 10, 18 + legOffset);

    // Paws
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.ellipse(20, 5 + legOffset, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 5 + legOffset, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(-20, 3 + legOffset, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.strokeStyle = "#D2691E";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-30, -35);
    const tailWag = Math.sin(Date.now() / 100) * 0.3;
    ctx.quadraticCurveTo(-45, -50 + tailWag * 10, -40, -60 + tailWag * 15);
    ctx.stroke();

    // Catching expression
    if (this.dog.catching) {
      ctx.fillStyle = "#2d3436";
      ctx.beginPath();
      ctx.arc(45, -43, 8, 0, Math.PI, false);
      ctx.fill();
    }

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
