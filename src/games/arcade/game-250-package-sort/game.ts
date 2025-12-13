/**
 * Package Sort Game Engine
 * Game #250
 *
 * Sort packages into the correct delivery bins quickly
 */

interface Package {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  destination: number;
  speed: number;
  grabbed: boolean;
}

interface Bin {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  packages: number;
  flash: number;
}

interface GameState {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const BIN_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];
const BIN_LABELS = ["A", "B", "C", "D"];

export class PackageSortGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private packages: Package[] = [];
  private bins: Bin[] = [];
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private level = 1;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private spawnTimer = 0;
  private spawnInterval = 2000;
  private draggedPackage: Package | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  private combo = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("package_sort_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("package_sort_highscore", this.highScore.toString());
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
        level: this.level,
        status: this.status,
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
    this.initBins();
    this.draw();
  }

  private initBins() {
    const binWidth = this.width / 4 - 20;
    const binHeight = 80;
    this.bins = [];

    for (let i = 0; i < 4; i++) {
      this.bins.push({
        x: 10 + i * (binWidth + 15),
        y: this.height - binHeight - 10,
        width: binWidth,
        height: binHeight,
        color: BIN_COLORS[i],
        label: BIN_LABELS[i],
        packages: 0,
        flash: 0,
      });
    }
  }

  handlePointerDown(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicking a package
    for (let i = this.packages.length - 1; i >= 0; i--) {
      const pkg = this.packages[i];
      if (
        x >= pkg.x &&
        x <= pkg.x + pkg.width &&
        y >= pkg.y &&
        y <= pkg.y + pkg.height
      ) {
        pkg.grabbed = true;
        this.draggedPackage = pkg;
        this.dragOffsetX = x - pkg.x;
        this.dragOffsetY = y - pkg.y;

        // Move to front
        this.packages.splice(i, 1);
        this.packages.push(pkg);
        break;
      }
    }
  }

  handlePointerMove(x: number, y: number) {
    if (this.draggedPackage) {
      this.draggedPackage.x = x - this.dragOffsetX;
      this.draggedPackage.y = y - this.dragOffsetY;
    }
  }

  handlePointerUp() {
    if (this.draggedPackage) {
      this.checkDrop(this.draggedPackage);
      this.draggedPackage.grabbed = false;
      this.draggedPackage = null;
    }
  }

  private checkDrop(pkg: Package) {
    const pkgCenterX = pkg.x + pkg.width / 2;
    const pkgBottom = pkg.y + pkg.height;

    for (let i = 0; i < this.bins.length; i++) {
      const bin = this.bins[i];
      if (
        pkgCenterX >= bin.x &&
        pkgCenterX <= bin.x + bin.width &&
        pkgBottom >= bin.y - 20
      ) {
        // Dropped in a bin
        if (pkg.destination === i) {
          // Correct bin
          this.combo++;
          const points = 10 * Math.min(this.combo, 5);
          this.score += points;
          bin.packages++;
          bin.flash = 1;

          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }

          // Success particles
          for (let j = 0; j < 15; j++) {
            this.particles.push({
              x: pkgCenterX,
              y: bin.y,
              vx: (Math.random() - 0.5) * 8,
              vy: -Math.random() * 6 - 2,
              life: 1,
              color: bin.color,
            });
          }

          // Level up check
          const totalPackages = this.bins.reduce((sum, b) => sum + b.packages, 0);
          if (totalPackages >= 5 + this.level * 3) {
            this.levelUp();
          }
        } else {
          // Wrong bin
          this.combo = 0;
          this.lives--;

          // Error particles
          for (let j = 0; j < 10; j++) {
            this.particles.push({
              x: pkgCenterX,
              y: pkg.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 1,
              color: "#e74c3c",
            });
          }

          if (this.lives <= 0) {
            this.gameOver();
            return;
          }
        }

        // Remove package
        const idx = this.packages.indexOf(pkg);
        if (idx !== -1) {
          this.packages.splice(idx, 1);
        }

        this.emitState();
        return;
      }
    }
  }

  private levelUp() {
    this.level++;
    this.spawnInterval = Math.max(800, 2000 - this.level * 150);
    this.bins.forEach((bin) => (bin.packages = 0));
    this.emitState();
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.packages = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 2000;
    this.initBins();
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
    // Spawn packages
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPackage();
    }

    // Update packages
    for (const pkg of this.packages) {
      if (!pkg.grabbed) {
        pkg.y += pkg.speed;

        // Package fell off screen
        if (pkg.y > this.height) {
          this.lives--;
          this.combo = 0;
          const idx = this.packages.indexOf(pkg);
          if (idx !== -1) {
            this.packages.splice(idx, 1);
          }
          this.emitState();

          if (this.lives <= 0) {
            this.gameOver();
            return;
          }
        }
      }
    }

    // Update bin flash
    for (const bin of this.bins) {
      if (bin.flash > 0) {
        bin.flash -= 0.03;
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.025;
      return p.life > 0;
    });
  }

  private spawnPackage() {
    const destination = Math.floor(Math.random() * 4);
    const pkg: Package = {
      x: 30 + Math.random() * (this.width - 100),
      y: -60,
      width: 50,
      height: 50,
      color: BIN_COLORS[destination],
      destination,
      speed: 1 + this.level * 0.3 + Math.random() * 0.5,
      grabbed: false,
    };
    this.packages.push(pkg);
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

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#2c3e50");
    gradient.addColorStop(1, "#34495e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Conveyor belt lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    for (let y = 0; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw bins
    for (const bin of this.bins) {
      this.drawBin(bin);
    }

    // Draw packages
    for (const pkg of this.packages) {
      this.drawPackage(pkg);
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw combo
    if (this.combo > 1) {
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`COMBO x${this.combo}!`, this.width / 2, 40);
    }
  }

  private drawBin(bin: Bin) {
    const ctx = this.ctx;

    // Bin container
    ctx.fillStyle = bin.flash > 0 ? `rgba(255, 255, 255, ${bin.flash * 0.5})` : "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.roundRect(bin.x, bin.y, bin.width, bin.height, 8);
    ctx.fill();

    // Bin color stripe
    ctx.fillStyle = bin.color;
    ctx.fillRect(bin.x, bin.y, bin.width, 15);

    // Bin opening
    ctx.strokeStyle = bin.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bin.x + 5, bin.y + 5, bin.width - 10, bin.height - 10, 6);
    ctx.stroke();

    // Label
    ctx.fillStyle = "white";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(bin.label, bin.x + bin.width / 2, bin.y + bin.height / 2 + 10);

    // Package count
    ctx.font = "12px sans-serif";
    ctx.fillText(`${bin.packages}`, bin.x + bin.width / 2, bin.y + bin.height - 8);
  }

  private drawPackage(pkg: Package) {
    const ctx = this.ctx;

    ctx.save();

    // Shadow
    if (pkg.grabbed) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(pkg.x + 5, pkg.y + 5, pkg.width, pkg.height);
    }

    // Box
    ctx.fillStyle = "#D4A574";
    ctx.beginPath();
    ctx.roundRect(pkg.x, pkg.y, pkg.width, pkg.height, 4);
    ctx.fill();

    // Box tape
    ctx.fillStyle = "#C4A35A";
    ctx.fillRect(pkg.x + pkg.width / 2 - 5, pkg.y, 10, pkg.height);
    ctx.fillRect(pkg.x, pkg.y + pkg.height / 2 - 5, pkg.width, 10);

    // Destination label
    ctx.fillStyle = pkg.color;
    ctx.beginPath();
    ctx.arc(pkg.x + pkg.width / 2, pkg.y + pkg.height / 2, 15, 0, Math.PI * 2);
    ctx.fill();

    // Label text
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(BIN_LABELS[pkg.destination], pkg.x + pkg.width / 2, pkg.y + pkg.height / 2 + 6);

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
