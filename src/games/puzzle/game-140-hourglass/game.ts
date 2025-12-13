/**
 * Hourglass Game
 * Game #140 - Flip hourglass to manage time and collect stars
 */

interface Star {
  x: number;
  y: number;
  collected: boolean;
  appearTime: number; // time when star appears
  disappearTime: number; // time when star disappears
}

interface Level {
  totalTime: number;
  stars: Star[];
  flipCount: number;
}

const LEVELS: Level[] = [
  // Level 1: Simple timing
  {
    totalTime: 10,
    stars: [
      { x: 100, y: 150, collected: false, appearTime: 0, disappearTime: 5 },
      { x: 200, y: 200, collected: false, appearTime: 3, disappearTime: 8 },
      { x: 300, y: 150, collected: false, appearTime: 6, disappearTime: 10 },
    ],
    flipCount: 2,
  },
  // Level 2: More stars
  {
    totalTime: 15,
    stars: [
      { x: 80, y: 120, collected: false, appearTime: 0, disappearTime: 4 },
      { x: 180, y: 180, collected: false, appearTime: 2, disappearTime: 7 },
      { x: 280, y: 120, collected: false, appearTime: 5, disappearTime: 10 },
      { x: 130, y: 220, collected: false, appearTime: 8, disappearTime: 13 },
      { x: 230, y: 160, collected: false, appearTime: 11, disappearTime: 15 },
    ],
    flipCount: 3,
  },
  // Level 3: Tighter timing
  {
    totalTime: 12,
    stars: [
      { x: 100, y: 140, collected: false, appearTime: 0, disappearTime: 3 },
      { x: 200, y: 200, collected: false, appearTime: 1, disappearTime: 4 },
      { x: 300, y: 140, collected: false, appearTime: 3, disappearTime: 6 },
      { x: 150, y: 180, collected: false, appearTime: 5, disappearTime: 8 },
      { x: 250, y: 160, collected: false, appearTime: 7, disappearTime: 10 },
      { x: 200, y: 220, collected: false, appearTime: 9, disappearTime: 12 },
    ],
    flipCount: 4,
  },
  // Level 4
  {
    totalTime: 20,
    stars: [
      { x: 80, y: 130, collected: false, appearTime: 0, disappearTime: 4 },
      { x: 160, y: 190, collected: false, appearTime: 2, disappearTime: 6 },
      { x: 240, y: 130, collected: false, appearTime: 4, disappearTime: 8 },
      { x: 320, y: 190, collected: false, appearTime: 6, disappearTime: 10 },
      { x: 120, y: 220, collected: false, appearTime: 8, disappearTime: 12 },
      { x: 200, y: 150, collected: false, appearTime: 10, disappearTime: 14 },
      { x: 280, y: 220, collected: false, appearTime: 12, disappearTime: 16 },
      { x: 200, y: 180, collected: false, appearTime: 16, disappearTime: 20 },
    ],
    flipCount: 5,
  },
  // Level 5
  {
    totalTime: 15,
    stars: [
      { x: 100, y: 140, collected: false, appearTime: 0, disappearTime: 2 },
      { x: 200, y: 140, collected: false, appearTime: 1, disappearTime: 3 },
      { x: 300, y: 140, collected: false, appearTime: 2, disappearTime: 4 },
      { x: 100, y: 200, collected: false, appearTime: 4, disappearTime: 6 },
      { x: 200, y: 200, collected: false, appearTime: 5, disappearTime: 7 },
      { x: 300, y: 200, collected: false, appearTime: 6, disappearTime: 8 },
      { x: 150, y: 170, collected: false, appearTime: 9, disappearTime: 12 },
      { x: 250, y: 170, collected: false, appearTime: 10, disappearTime: 13 },
      { x: 200, y: 230, collected: false, appearTime: 12, disappearTime: 15 },
    ],
    flipCount: 4,
  },
];

export class HourglassGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  currentLevel: number = 0;
  stars: Star[] = [];
  currentTime: number = 0;
  isFlipped: boolean = false;
  flipsRemaining: number = 0;
  sandAmount: number = 1; // 1 = full top, 0 = full bottom

  status: "playing" | "won" | "failed" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private animationId: number = 0;
  private lastTime: number = 0;
  private hourglassAngle: number = 0;
  private sandParticles: { x: number; y: number; vy: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.render();
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({
          status: "complete",
          level: levelIndex + 1,
        });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.stars = level.stars.map((s) => ({ ...s, collected: false }));
    this.currentTime = 0;
    this.isFlipped = false;
    this.sandAmount = 1;
    this.flipsRemaining = level.flipCount;
    this.hourglassAngle = 0;
    this.sandParticles = [];
    this.status = "playing";

    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        time: 0,
        totalTime: level.totalTime,
        starsCollected: 0,
        totalStars: level.stars.length,
        flipsRemaining: this.flipsRemaining,
      });
    }
  }

  private gameLoop() {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.status === "playing") {
      this.update(delta);
    }

    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(delta: number) {
    const level = LEVELS[this.currentLevel];

    // Update time based on sand flow direction
    if (this.isFlipped) {
      this.currentTime -= delta;
      this.sandAmount = Math.min(1, this.sandAmount + delta / level.totalTime);
    } else {
      this.currentTime += delta;
      this.sandAmount = Math.max(0, this.sandAmount - delta / level.totalTime);
    }

    // Update sand particles
    this.updateSandParticles(delta);

    // Check time bounds
    if (this.currentTime >= level.totalTime) {
      this.currentTime = level.totalTime;
      this.checkWinLose();
    } else if (this.currentTime < 0) {
      this.currentTime = 0;
    }

    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        time: Math.max(0, this.currentTime),
        totalTime: level.totalTime,
        starsCollected: this.stars.filter((s) => s.collected).length,
        totalStars: this.stars.length,
        flipsRemaining: this.flipsRemaining,
      });
    }
  }

  private updateSandParticles(delta: number) {
    // Add new particles
    if (Math.random() < 0.3) {
      const hgX = this.width / 2;
      const hgY = this.height / 2;
      this.sandParticles.push({
        x: hgX + (Math.random() - 0.5) * 10,
        y: hgY,
        vy: this.isFlipped ? -100 : 100,
      });
    }

    // Update particles
    this.sandParticles = this.sandParticles.filter((p) => {
      p.y += p.vy * delta;
      return Math.abs(p.y - this.height / 2) < 80;
    });
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check star clicks
    this.stars.forEach((star) => {
      if (star.collected) return;
      if (
        this.currentTime >= star.appearTime &&
        this.currentTime <= star.disappearTime
      ) {
        const dx = x - star.x;
        const dy = y - star.y;
        if (dx * dx + dy * dy < 30 * 30) {
          star.collected = true;
          this.checkWinLose();
        }
      }
    });
  }

  public flip() {
    if (this.status !== "playing" || this.flipsRemaining <= 0) return;

    this.flipsRemaining--;
    this.isFlipped = !this.isFlipped;

    // Animate hourglass rotation
    const startAngle = this.hourglassAngle;
    const targetAngle = startAngle + Math.PI;
    const duration = 500;
    const startTime = performance.now();

    const animateFlip = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.hourglassAngle = startAngle + (targetAngle - startAngle) * eased;

      if (progress < 1) {
        requestAnimationFrame(animateFlip);
      }
    };

    animateFlip();

    if (this.onStateChange) {
      const level = LEVELS[this.currentLevel];
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        time: this.currentTime,
        totalTime: level.totalTime,
        starsCollected: this.stars.filter((s) => s.collected).length,
        totalStars: this.stars.length,
        flipsRemaining: this.flipsRemaining,
      });
    }
  }

  private checkWinLose() {
    const allCollected = this.stars.every((s) => s.collected);
    const level = LEVELS[this.currentLevel];

    if (allCollected) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
        });
      }
    } else if (this.currentTime >= level.totalTime) {
      this.status = "failed";
      if (this.onStateChange) {
        this.onStateChange({
          status: "failed",
          level: this.currentLevel + 1,
        });
      }
      // Auto reset
      setTimeout(() => this.loadLevel(this.currentLevel), 1500);
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, "#1a1a2e");
    bgGrad.addColorStop(1, "#16213e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw stars
    this.drawStars();

    // Draw hourglass
    this.drawHourglass();

    // Draw time bar
    this.drawTimeBar();
  }

  private drawStars() {
    const ctx = this.ctx;

    this.stars.forEach((star) => {
      const isVisible =
        this.currentTime >= star.appearTime &&
        this.currentTime <= star.disappearTime;

      if (star.collected) {
        // Draw collected indicator
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#95a5a6";
        ctx.beginPath();
        ctx.arc(star.x, star.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (isVisible) {
        // Pulsing glow
        const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 200);

        ctx.save();
        ctx.globalAlpha = pulse;

        // Glow
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 30);
        glow.addColorStop(0, "#f1c40f");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 30, 0, Math.PI * 2);
        ctx.fill();

        // Star shape
        ctx.fillStyle = "#f1c40f";
        this.drawStarShape(star.x, star.y, 15, 7, 5);

        ctx.restore();

        // Time remaining indicator
        const timeLeft = star.disappearTime - this.currentTime;
        const totalTime = star.disappearTime - star.appearTime;
        const ratio = timeLeft / totalTime;

        ctx.strokeStyle = ratio < 0.3 ? "#e74c3c" : "#2ecc71";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 20, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  private drawStarShape(cx: number, cy: number, outerR: number, innerR: number, points: number) {
    const ctx = this.ctx;
    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
  }

  private drawHourglass() {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.hourglassAngle);
    ctx.translate(-cx, -cy);

    const hgWidth = 60;
    const hgHeight = 120;

    // Frame
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 4;

    // Top bulb
    ctx.beginPath();
    ctx.moveTo(cx - hgWidth / 2, cy - hgHeight / 2);
    ctx.lineTo(cx - hgWidth / 2, cy - hgHeight / 4);
    ctx.quadraticCurveTo(cx, cy - 10, cx + hgWidth / 2, cy - hgHeight / 4);
    ctx.lineTo(cx + hgWidth / 2, cy - hgHeight / 2);
    ctx.lineTo(cx - hgWidth / 2, cy - hgHeight / 2);
    ctx.stroke();

    // Bottom bulb
    ctx.beginPath();
    ctx.moveTo(cx - hgWidth / 2, cy + hgHeight / 2);
    ctx.lineTo(cx - hgWidth / 2, cy + hgHeight / 4);
    ctx.quadraticCurveTo(cx, cy + 10, cx + hgWidth / 2, cy + hgHeight / 4);
    ctx.lineTo(cx + hgWidth / 2, cy + hgHeight / 2);
    ctx.lineTo(cx - hgWidth / 2, cy + hgHeight / 2);
    ctx.stroke();

    // Sand in top
    const topSand = this.sandAmount;
    if (topSand > 0) {
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      const sandHeight = (hgHeight / 2 - 15) * topSand;
      ctx.moveTo(cx - hgWidth / 2 + 5, cy - hgHeight / 2 + 5);
      ctx.lineTo(cx - hgWidth / 2 + 5, cy - hgHeight / 2 + 5 + sandHeight * 0.5);
      ctx.quadraticCurveTo(cx, cy - 15, cx + hgWidth / 2 - 5, cy - hgHeight / 2 + 5 + sandHeight * 0.5);
      ctx.lineTo(cx + hgWidth / 2 - 5, cy - hgHeight / 2 + 5);
      ctx.closePath();
      ctx.fill();
    }

    // Sand in bottom
    const bottomSand = 1 - this.sandAmount;
    if (bottomSand > 0) {
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      const sandHeight = (hgHeight / 2 - 15) * bottomSand;
      ctx.moveTo(cx - hgWidth / 2 + 5, cy + hgHeight / 2 - 5);
      ctx.lineTo(cx - hgWidth / 2 + 5, cy + hgHeight / 2 - 5 - sandHeight * 0.3);
      ctx.quadraticCurveTo(cx, cy + 15 + sandHeight * 0.3, cx + hgWidth / 2 - 5, cy + hgHeight / 2 - 5 - sandHeight * 0.3);
      ctx.lineTo(cx + hgWidth / 2 - 5, cy + hgHeight / 2 - 5);
      ctx.closePath();
      ctx.fill();
    }

    // Sand stream
    if (this.sandAmount > 0.05 && this.sandAmount < 0.95) {
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      this.sandParticles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  private drawTimeBar() {
    const ctx = this.ctx;
    const level = LEVELS[this.currentLevel];
    if (!level) return;

    const barWidth = this.width - 40;
    const barHeight = 10;
    const barX = 20;
    const barY = this.height - 30;

    // Background
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress
    const progress = this.currentTime / level.totalTime;
    const progressGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    progressGrad.addColorStop(0, "#27ae60");
    progressGrad.addColorStop(0.7, "#f1c40f");
    progressGrad.addColorStop(1, "#e74c3c");

    ctx.fillStyle = progressGrad;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // Star markers
    this.stars.forEach((star) => {
      const appearX = barX + (star.appearTime / level.totalTime) * barWidth;
      const disappearX = barX + (star.disappearTime / level.totalTime) * barWidth;

      ctx.fillStyle = star.collected ? "#95a5a6" : "#f1c40f";
      ctx.fillRect(appearX, barY - 3, disappearX - appearX, 2);
    });
  }

  public nextLevel() {
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public restart() {
    this.currentLevel = 0;
    this.loadLevel(0);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
