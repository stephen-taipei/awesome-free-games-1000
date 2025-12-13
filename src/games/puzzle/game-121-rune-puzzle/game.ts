/**
 * Rune Puzzle Game Engine
 * Game #121 - Rotate runes to align with magic circle
 */

export interface Rune {
  id: number;
  x: number;
  y: number;
  currentRotation: number;
  targetRotation: number;
  symbol: string;
  color: string;
}

export interface LevelConfig {
  runeCount: number;
  rotations: number[];
}

export class RunePuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private runes: Rune[] = [];
  private centerX = 0;
  private centerY = 0;
  private circleRadius = 0;
  private runeRadius = 30;

  private moves = 0;
  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";
  private animating = false;

  private onStateChange: ((state: any) => void) | null = null;

  private runeSymbols = ["᛭", "ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᛁ", "ᛃ"];
  private runeColors = ["#9b59b6", "#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#1abc9c"];

  private levels: LevelConfig[] = [
    { runeCount: 3, rotations: [90, 180, 270] },
    { runeCount: 4, rotations: [90, 180, 270, 90] },
    { runeCount: 5, rotations: [90, 180, 270, 90, 180] },
    { runeCount: 6, rotations: [90, 180, 270, 90, 180, 270] },
    { runeCount: 8, rotations: [90, 180, 270, 90, 180, 270, 90, 180] },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "playing" || this.animating) return;

      const pos = getPos(e);

      for (const rune of this.runes) {
        const dist = Math.hypot(pos.x - rune.x, pos.y - rune.y);
        if (dist < this.runeRadius + 10) {
          this.rotateRune(rune);
          break;
        }
      }
    };

    this.canvas.addEventListener("click", handleClick);
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      handleClick(e);
    });
  }

  private rotateRune(rune: Rune) {
    this.animating = true;
    const startRotation = rune.currentRotation;
    const targetRotation = rune.currentRotation + 90;
    const duration = 200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      rune.currentRotation = startRotation + (90 * eased);
      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        rune.currentRotation = targetRotation % 360;
        this.animating = false;
        this.moves++;

        if (this.onStateChange) {
          this.onStateChange({ moves: this.moves });
        }

        this.checkWin();
      }
    };

    animate();
  }

  private checkWin() {
    const allAligned = this.runes.every(
      (rune) => rune.currentRotation % 360 === rune.targetRotation % 360
    );

    if (allAligned) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.runes = [];
    this.moves = 0;

    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.circleRadius = Math.min(this.canvas.width, this.canvas.height) * 0.35;

    for (let i = 0; i < config.runeCount; i++) {
      const angle = (i * Math.PI * 2) / config.runeCount - Math.PI / 2;
      const x = this.centerX + Math.cos(angle) * this.circleRadius;
      const y = this.centerY + Math.sin(angle) * this.circleRadius;

      this.runes.push({
        id: i,
        x,
        y,
        currentRotation: config.rotations[i] || 0,
        targetRotation: 0,
        symbol: this.runeSymbols[i % this.runeSymbols.length],
        color: this.runeColors[i % this.runeColors.length],
      });
    }

    if (this.onStateChange) {
      this.onStateChange({ moves: 0 });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, 0, w, h);

    // Draw magic circle
    this.drawMagicCircle(ctx);

    // Draw connection lines
    this.drawConnections(ctx);

    // Draw runes
    this.runes.forEach((rune) => {
      this.drawRune(ctx, rune);
    });

    // Draw center crystal
    this.drawCenterCrystal(ctx);
  }

  private drawMagicCircle(ctx: CanvasRenderingContext2D) {
    // Outer circle glow
    ctx.strokeStyle = "rgba(155, 89, 182, 0.3)";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.circleRadius + 40, 0, Math.PI * 2);
    ctx.stroke();

    // Main circle
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.circleRadius + 30, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.strokeStyle = "rgba(155, 89, 182, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.circleRadius - 20, 0, Math.PI * 2);
    ctx.stroke();

    // Decorative arcs
    ctx.strokeStyle = "rgba(155, 89, 182, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.arc(
        this.centerX,
        this.centerY,
        this.circleRadius,
        angle - 0.1,
        angle + 0.1
      );
      ctx.stroke();
    }
  }

  private drawConnections(ctx: CanvasRenderingContext2D) {
    const allAligned = this.runes.every(
      (rune) => rune.currentRotation % 360 === rune.targetRotation % 360
    );

    ctx.strokeStyle = allAligned ? "#2ecc71" : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;

    // Connect runes to center
    this.runes.forEach((rune) => {
      ctx.beginPath();
      ctx.moveTo(rune.x, rune.y);
      ctx.lineTo(this.centerX, this.centerY);
      ctx.stroke();
    });

    // Connect adjacent runes
    for (let i = 0; i < this.runes.length; i++) {
      const next = this.runes[(i + 1) % this.runes.length];
      ctx.beginPath();
      ctx.moveTo(this.runes[i].x, this.runes[i].y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
  }

  private drawRune(ctx: CanvasRenderingContext2D, rune: Rune) {
    const isAligned = rune.currentRotation % 360 === rune.targetRotation % 360;

    ctx.save();
    ctx.translate(rune.x, rune.y);
    ctx.rotate((rune.currentRotation * Math.PI) / 180);

    // Rune background
    ctx.fillStyle = isAligned ? "#2ecc71" : "#2a2a4a";
    ctx.beginPath();
    ctx.arc(0, 0, this.runeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    if (isAligned) {
      ctx.shadowColor = "#2ecc71";
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = rune.color;
      ctx.shadowBlur = 10;
    }

    // Border
    ctx.strokeStyle = isAligned ? "#27ae60" : rune.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.runeRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Direction indicator (arrow pointing up when aligned)
    ctx.fillStyle = isAligned ? "#fff" : rune.color;
    ctx.beginPath();
    ctx.moveTo(0, -this.runeRadius + 8);
    ctx.lineTo(-6, -this.runeRadius + 18);
    ctx.lineTo(6, -this.runeRadius + 18);
    ctx.closePath();
    ctx.fill();

    // Rune symbol
    ctx.fillStyle = isAligned ? "#fff" : rune.color;
    ctx.font = `bold ${this.runeRadius}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rune.symbol, 0, 2);

    ctx.restore();
  }

  private drawCenterCrystal(ctx: CanvasRenderingContext2D) {
    const allAligned = this.runes.every(
      (rune) => rune.currentRotation % 360 === rune.targetRotation % 360
    );

    const size = 25;

    // Glow
    ctx.shadowColor = allAligned ? "#2ecc71" : "#9b59b6";
    ctx.shadowBlur = allAligned ? 30 : 15;

    // Crystal shape
    ctx.fillStyle = allAligned ? "#2ecc71" : "#9b59b6";
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY - size);
    ctx.lineTo(this.centerX + size * 0.7, this.centerY);
    ctx.lineTo(this.centerX, this.centerY + size);
    ctx.lineTo(this.centerX - size * 0.7, this.centerY);
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY - size * 0.5);
    ctx.lineTo(this.centerX + size * 0.3, this.centerY);
    ctx.lineTo(this.centerX, this.centerY + size * 0.2);
    ctx.lineTo(this.centerX - size * 0.3, this.centerY);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(400, rect.width - 20, rect.height - 100);
      this.canvas.width = size;
      this.canvas.height = size;

      // Recalculate positions
      this.centerX = size / 2;
      this.centerY = size / 2;
      this.circleRadius = size * 0.35;

      this.runes.forEach((rune, i) => {
        const angle = (i * Math.PI * 2) / this.runes.length - Math.PI / 2;
        rune.x = this.centerX + Math.cos(angle) * this.circleRadius;
        rune.y = this.centerY + Math.sin(angle) * this.circleRadius;
      });

      this.draw();
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
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

  public getMoves(): number {
    return this.moves;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
