/**
 * Radar Puzzle Game Engine
 * Game #091 - Use radar to find hidden targets
 * Radar / Sonar / Military Theme
 */

export interface Target {
  id: number;
  angle: number;
  distance: number;
  found: boolean;
  visible: boolean;
  fadeTime: number;
}

export interface LevelConfig {
  targetCount: number;
  radarSpeed: number;
  visibleDuration: number;
}

export interface GameState {
  event?: "sweep" | "targetVisible" | "targetFound" | "miss" | "victory" | "levelStart" | "reset";
  x?: number;
  y?: number;
  targetId?: number;
  found?: string;
  time?: string;
  level?: number;
  status?: "playing" | "won";
}

export class RadarPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private targets: Target[] = [];
  private radarAngle = 0;
  private foundCount = 0;
  private totalTargets = 0;

  private startTime = 0;
  private elapsedTime = 0;
  private lastSweepEmit = 0;

  private currentLevel = 0;
  private status: "playing" | "won" = "playing";
  private animationId = 0;

  private onStateChange: ((state: GameState) => void) | null = null;

  private levels: LevelConfig[] = [
    { targetCount: 3, radarSpeed: 0.02, visibleDuration: 1500 },
    { targetCount: 4, radarSpeed: 0.025, visibleDuration: 1200 },
    { targetCount: 5, radarSpeed: 0.03, visibleDuration: 1000 },
    { targetCount: 6, radarSpeed: 0.035, visibleDuration: 800 },
    { targetCount: 7, radarSpeed: 0.04, visibleDuration: 600 },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.radarAngle = 0;
    this.foundCount = 0;
    this.status = "playing";
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.lastSweepEmit = 0;

    this.loadLevel(this.currentLevel);

    // Emit level start
    if (this.onStateChange) {
      this.onStateChange({
        event: "levelStart",
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        level: this.currentLevel,
      });
    }

    this.loop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.totalTargets = config.targetCount;

    this.targets = [];
    for (let i = 0; i < config.targetCount; i++) {
      // Spread targets around the radar, avoiding center
      this.targets.push({
        id: i,
        angle: (Math.PI * 2 * i) / config.targetCount + Math.random() * 0.5,
        distance: 0.3 + Math.random() * 0.5, // 30% to 80% from center
        found: false,
        visible: false,
        fadeTime: 0,
      });
    }
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
    const config = this.levels[this.currentLevel % this.levels.length];
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const maxRadius = Math.min(cx, cy) * 0.9;

    // Update radar angle
    const prevAngle = this.radarAngle;
    this.radarAngle += config.radarSpeed;
    if (this.radarAngle > Math.PI * 2) {
      this.radarAngle -= Math.PI * 2;
    }

    // Emit sweep periodically
    const now = Date.now();
    if (now - this.lastSweepEmit > 500) {
      this.lastSweepEmit = now;
      const sweepX = cx + Math.cos(this.radarAngle) * maxRadius * 0.5;
      const sweepY = cy + Math.sin(this.radarAngle) * maxRadius * 0.5;
      if (this.onStateChange) {
        this.onStateChange({
          event: "sweep",
          x: sweepX,
          y: sweepY,
        });
      }
    }

    // Update time
    this.elapsedTime = Date.now() - this.startTime;

    // Update target visibility based on radar sweep
    const sweepWidth = 0.15; // Radians
    this.targets.forEach((target) => {
      if (target.found) return;

      // Check if radar is passing over this target
      let angleDiff = Math.abs(this.radarAngle - target.angle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      const wasVisible = target.visible;

      if (angleDiff < sweepWidth) {
        if (!target.visible) {
          target.visible = true;
          target.fadeTime = Date.now();

          // Emit target visible event
          if (this.onStateChange) {
            const targetX = cx + Math.cos(target.angle) * target.distance * maxRadius;
            const targetY = cy + Math.sin(target.angle) * target.distance * maxRadius;
            this.onStateChange({
              event: "targetVisible",
              x: targetX,
              y: targetY,
              targetId: target.id,
            });
          }
        }
      } else if (target.visible && Date.now() - target.fadeTime > config.visibleDuration) {
        target.visible = false;
      }
    });

    if (this.onStateChange) {
      this.onStateChange({
        found: `${this.foundCount}/${this.totalTargets}`,
        time: `${Math.floor(this.elapsedTime / 1000)}s`,
      });
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const maxRadius = Math.min(cx, cy) * 0.9;

    let foundTarget = false;

    // Check if click is on a visible, unfound target
    for (const target of this.targets) {
      if (target.found || !target.visible) continue;

      const targetX = cx + Math.cos(target.angle) * target.distance * maxRadius;
      const targetY = cy + Math.sin(target.angle) * target.distance * maxRadius;

      const dist = Math.hypot(x - targetX, y - targetY);
      if (dist < 25) {
        target.found = true;
        this.foundCount++;
        foundTarget = true;

        // Emit target found event
        if (this.onStateChange) {
          this.onStateChange({
            event: "targetFound",
            x: targetX,
            y: targetY,
            targetId: target.id,
          });
        }

        if (this.foundCount >= this.totalTargets) {
          this.status = "won";
          if (this.onStateChange) {
            this.onStateChange({
              event: "victory",
              status: "won",
              time: `${Math.floor(this.elapsedTime / 1000)}s`,
              level: this.currentLevel,
            });
          }
        }
        break;
      }
    }

    // Emit miss event if no target was clicked
    if (!foundTarget && this.onStateChange) {
      this.onStateChange({
        event: "miss",
        x,
        y,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(cx, cy) * 0.9;

    // Clear with transparent background (WebGPU handles the visuals)
    ctx.clearRect(0, 0, w, h);

    // Draw radar circles
    ctx.strokeStyle = "rgba(46, 204, 113, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxRadius * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw cross lines
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius, cy);
    ctx.lineTo(cx + maxRadius, cy);
    ctx.moveTo(cx, cy - maxRadius);
    ctx.lineTo(cx, cy + maxRadius);
    ctx.stroke();

    // Draw radar sweep (cone with gradient)
    const sweepWidth = 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxRadius, this.radarAngle - sweepWidth, this.radarAngle);
    ctx.closePath();
    ctx.fillStyle = "rgba(46, 204, 113, 0.15)";
    ctx.fill();
    ctx.restore();

    // Draw radar line
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#2ecc71";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(this.radarAngle) * maxRadius,
      cy + Math.sin(this.radarAngle) * maxRadius
    );
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw targets
    this.targets.forEach((target) => {
      const targetX = cx + Math.cos(target.angle) * target.distance * maxRadius;
      const targetY = cy + Math.sin(target.angle) * target.distance * maxRadius;

      if (target.found) {
        // Found target - solid green
        ctx.fillStyle = "#2ecc71";
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Checkmark
        ctx.strokeStyle = "#0a0a0a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(targetX - 5, targetY);
        ctx.lineTo(targetX - 1, targetY + 4);
        ctx.lineTo(targetX + 6, targetY - 4);
        ctx.stroke();
      } else if (target.visible) {
        // Visible target - pulsing blip
        const config = this.levels[this.currentLevel % this.levels.length];
        const fadeProgress = (Date.now() - target.fadeTime) / config.visibleDuration;
        const alpha = Math.max(0, 1 - fadeProgress);

        // Outer glow
        ctx.fillStyle = `rgba(46, 204, 113, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 22, 0, Math.PI * 2);
        ctx.fill();

        // Inner blip
        ctx.fillStyle = `rgba(46, 204, 113, ${alpha})`;
        ctx.shadowColor = `rgba(46, 204, 113, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw center dot
    ctx.fillStyle = "#2ecc71";
    ctx.shadowColor = "#2ecc71";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  public reset() {
    this.stop();

    if (this.onStateChange) {
      this.onStateChange({
        event: "reset",
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
      });
    }

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

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }
}
