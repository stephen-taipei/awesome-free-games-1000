/**
 * Scale Balance Game Engine
 * Game #118 - Balance the scale by placing weights
 */

export interface Weight {
  id: string;
  value: number;
  x: number;
  y: number;
  size: number;
  color: string;
  onScale: "left" | "right" | null;
  position: number; // Position on scale arm (-3 to 3)
}

export interface LevelConfig {
  availableWeights: { value: number; color: string }[];
  fixedLeft: { value: number; position: number }[];
  fixedRight: { value: number; position: number }[];
}

export class ScaleBalanceGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private weights: Weight[] = [];
  private draggedWeight: Weight | null = null;
  private dragOffset = { x: 0, y: 0 };

  private scaleAngle = 0;
  private targetAngle = 0;
  private pivotX = 300;
  private pivotY = 180;
  private armLength = 220;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Simple balance
    {
      availableWeights: [
        { value: 2, color: "#e74c3c" },
        { value: 2, color: "#3498db" },
      ],
      fixedLeft: [],
      fixedRight: [],
    },
    // Level 2 - Unequal weights
    {
      availableWeights: [
        { value: 1, color: "#e74c3c" },
        { value: 2, color: "#3498db" },
        { value: 3, color: "#2ecc71" },
      ],
      fixedLeft: [{ value: 3, position: -2 }],
      fixedRight: [],
    },
    // Level 3 - Position matters
    {
      availableWeights: [
        { value: 2, color: "#e74c3c" },
        { value: 4, color: "#3498db" },
      ],
      fixedLeft: [{ value: 2, position: -3 }],
      fixedRight: [],
    },
    // Level 4 - Multiple weights
    {
      availableWeights: [
        { value: 1, color: "#e74c3c" },
        { value: 2, color: "#3498db" },
        { value: 3, color: "#2ecc71" },
        { value: 1, color: "#f39c12" },
      ],
      fixedLeft: [{ value: 4, position: -2 }],
      fixedRight: [{ value: 2, position: 1 }],
    },
    // Level 5 - Complex balance
    {
      availableWeights: [
        { value: 1, color: "#e74c3c" },
        { value: 2, color: "#3498db" },
        { value: 2, color: "#2ecc71" },
        { value: 3, color: "#f39c12" },
        { value: 4, color: "#9b59b6" },
      ],
      fixedLeft: [
        { value: 3, position: -3 },
        { value: 2, position: -1 },
      ],
      fixedRight: [{ value: 1, position: 3 }],
    },
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

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "playing") return;

      const pos = getPos(e);

      for (let i = this.weights.length - 1; i >= 0; i--) {
        const w = this.weights[i];
        if (w.onScale && w.position !== 0) continue; // Fixed weights

        const dist = Math.hypot(pos.x - w.x, pos.y - w.y);
        if (dist < w.size) {
          this.draggedWeight = w;
          this.dragOffset = {
            x: pos.x - w.x,
            y: pos.y - w.y,
          };

          // Remove from scale if placed
          if (w.onScale) {
            w.onScale = null;
            w.position = 0;
          }
          break;
        }
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.draggedWeight) return;
      e.preventDefault();

      const pos = getPos(e);
      this.draggedWeight.x = pos.x - this.dragOffset.x;
      this.draggedWeight.y = pos.y - this.dragOffset.y;

      this.updateScale();
      this.draw();
    };

    const handleEnd = () => {
      if (!this.draggedWeight) return;

      // Check if dropped on scale
      const w = this.draggedWeight;
      const armY = this.pivotY;

      // Left side
      if (w.x < this.pivotX - 20 && w.x > this.pivotX - this.armLength - 20) {
        if (Math.abs(w.y - armY) < 80) {
          const relX = (w.x - this.pivotX) / (this.armLength / 3);
          w.position = Math.round(Math.max(-3, Math.min(-1, relX)));
          w.onScale = "left";
          this.snapWeightToArm(w);
        }
      }
      // Right side
      else if (w.x > this.pivotX + 20 && w.x < this.pivotX + this.armLength + 20) {
        if (Math.abs(w.y - armY) < 80) {
          const relX = (w.x - this.pivotX) / (this.armLength / 3);
          w.position = Math.round(Math.min(3, Math.max(1, relX)));
          w.onScale = "right";
          this.snapWeightToArm(w);
        }
      }

      // Return to tray if not on scale
      if (!w.onScale) {
        this.returnWeightToTray(w);
      }

      this.draggedWeight = null;
      this.updateScale();
      this.draw();
      this.checkWin();
    };

    this.canvas.addEventListener("mousedown", handleStart);
    this.canvas.addEventListener("mousemove", handleMove);
    this.canvas.addEventListener("mouseup", handleEnd);
    this.canvas.addEventListener("mouseleave", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: false });
    this.canvas.addEventListener("touchmove", handleMove, { passive: false });
    this.canvas.addEventListener("touchend", handleEnd);
  }

  private snapWeightToArm(w: Weight) {
    const angle = this.scaleAngle;
    const posX = this.pivotX + w.position * (this.armLength / 3);
    const posY = this.pivotY + Math.sin(angle) * w.position * (this.armLength / 3);
    w.x = posX;
    w.y = posY - w.size;
  }

  private returnWeightToTray(w: Weight) {
    const index = this.weights.indexOf(w);
    w.x = 80 + (index % 5) * 60;
    w.y = 380;
    w.onScale = null;
    w.position = 0;
  }

  private updateScale() {
    let leftTorque = 0;
    let rightTorque = 0;

    this.weights.forEach((w) => {
      if (w.onScale === "left") {
        leftTorque += w.value * Math.abs(w.position);
      } else if (w.onScale === "right") {
        rightTorque += w.value * Math.abs(w.position);
      }
    });

    const diff = rightTorque - leftTorque;
    this.targetAngle = Math.max(-0.3, Math.min(0.3, diff * 0.05));

    // Animate scale
    this.scaleAngle += (this.targetAngle - this.scaleAngle) * 0.1;

    // Update positioned weights
    this.weights.forEach((w) => {
      if (w.onScale && w !== this.draggedWeight) {
        this.snapWeightToArm(w);
      }
    });

    if (this.onStateChange) {
      this.onStateChange({
        leftTorque,
        rightTorque,
        balanced: Math.abs(leftTorque - rightTorque) < 0.1,
      });
    }
  }

  private checkWin() {
    let leftTorque = 0;
    let rightTorque = 0;

    this.weights.forEach((w) => {
      if (w.onScale === "left") {
        leftTorque += w.value * Math.abs(w.position);
      } else if (w.onScale === "right") {
        rightTorque += w.value * Math.abs(w.position);
      }
    });

    // Check if all weights are placed and balanced
    const allPlaced = this.weights.every((w) => w.onScale !== null);
    const balanced = Math.abs(leftTorque - rightTorque) < 0.1;

    if (allPlaced && balanced) {
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
    this.weights = [];
    this.scaleAngle = 0;
    this.targetAngle = 0;

    let id = 0;

    // Add fixed weights on left
    config.fixedLeft.forEach((fw) => {
      const w: Weight = {
        id: `fixed-left-${id++}`,
        value: fw.value,
        x: 0,
        y: 0,
        size: 15 + fw.value * 5,
        color: "#7f8c8d",
        onScale: "left",
        position: fw.position,
      };
      this.weights.push(w);
      this.snapWeightToArm(w);
    });

    // Add fixed weights on right
    config.fixedRight.forEach((fw) => {
      const w: Weight = {
        id: `fixed-right-${id++}`,
        value: fw.value,
        x: 0,
        y: 0,
        size: 15 + fw.value * 5,
        color: "#7f8c8d",
        onScale: "right",
        position: fw.position,
      };
      this.weights.push(w);
      this.snapWeightToArm(w);
    });

    // Add available weights in tray
    config.availableWeights.forEach((aw, i) => {
      this.weights.push({
        id: `weight-${id++}`,
        value: aw.value,
        x: 80 + (i % 5) * 60,
        y: 380,
        size: 15 + aw.value * 5,
        color: aw.color,
        onScale: null,
        position: 0,
      });
    });

    this.updateScale();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw scale stand
    this.drawScaleStand(ctx);

    // Draw scale arm
    this.drawScaleArm(ctx);

    // Draw weight tray
    ctx.fillStyle = "#252540";
    ctx.fillRect(30, 340, w - 60, 80);
    ctx.strokeStyle = "#3a3a5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 340, w - 60, 80);

    // Draw position markers on arm
    this.drawPositionMarkers(ctx);

    // Draw weights
    this.weights.forEach((weight) => {
      this.drawWeight(ctx, weight, weight === this.draggedWeight);
    });

    // Draw balance indicator
    this.drawBalanceIndicator(ctx);
  }

  private drawScaleStand(ctx: CanvasRenderingContext2D) {
    // Base
    ctx.fillStyle = "#5d4e37";
    ctx.beginPath();
    ctx.moveTo(this.pivotX - 60, 320);
    ctx.lineTo(this.pivotX + 60, 320);
    ctx.lineTo(this.pivotX + 40, 280);
    ctx.lineTo(this.pivotX - 40, 280);
    ctx.closePath();
    ctx.fill();

    // Pillar
    ctx.fillStyle = "#6d5e47";
    ctx.fillRect(this.pivotX - 10, this.pivotY, 20, 100);

    // Pivot point
    ctx.fillStyle = "#8b7355";
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a08060";
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawScaleArm(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pivotX, this.pivotY);
    ctx.rotate(this.scaleAngle);

    // Main arm
    ctx.fillStyle = "#8b7355";
    ctx.fillRect(-this.armLength - 10, -8, this.armLength * 2 + 20, 16);

    // Plates
    const plateWidth = 60;
    const plateHeight = 8;
    const plateOffset = this.armLength;

    // Left plate
    ctx.fillStyle = "#a08060";
    ctx.beginPath();
    ctx.moveTo(-plateOffset - plateWidth / 2, 10);
    ctx.lineTo(-plateOffset + plateWidth / 2, 10);
    ctx.lineTo(-plateOffset + plateWidth / 2 - 5, 25);
    ctx.lineTo(-plateOffset - plateWidth / 2 + 5, 25);
    ctx.closePath();
    ctx.fill();

    // Right plate
    ctx.beginPath();
    ctx.moveTo(plateOffset - plateWidth / 2, 10);
    ctx.lineTo(plateOffset + plateWidth / 2, 10);
    ctx.lineTo(plateOffset + plateWidth / 2 - 5, 25);
    ctx.lineTo(plateOffset - plateWidth / 2 + 5, 25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawPositionMarkers(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pivotX, this.pivotY);
    ctx.rotate(this.scaleAngle);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const x = i * (this.armLength / 3);
      ctx.beginPath();
      ctx.arc(x, -12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(Math.abs(i).toString(), x, -25);
    }

    ctx.restore();
  }

  private drawWeight(
    ctx: CanvasRenderingContext2D,
    weight: Weight,
    isDragging: boolean
  ) {
    ctx.save();

    if (isDragging) {
      ctx.shadowColor = weight.color;
      ctx.shadowBlur = 20;
    }

    // Weight body
    const gradient = ctx.createRadialGradient(
      weight.x - weight.size * 0.3,
      weight.y - weight.size * 0.3,
      0,
      weight.x,
      weight.y,
      weight.size
    );
    gradient.addColorStop(0, this.lightenColor(weight.color));
    gradient.addColorStop(1, weight.color);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(weight.x, weight.y, weight.size, 0, Math.PI * 2);
    ctx.fill();

    // Weight value
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${weight.size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(weight.value.toString(), weight.x, weight.y);

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(
      weight.x - weight.size * 0.3,
      weight.y - weight.size * 0.3,
      weight.size * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  private drawBalanceIndicator(ctx: CanvasRenderingContext2D) {
    const centerX = this.pivotX;
    const y = 60;

    // Calculate torques
    let leftTorque = 0;
    let rightTorque = 0;

    this.weights.forEach((w) => {
      if (w.onScale === "left") {
        leftTorque += w.value * Math.abs(w.position);
      } else if (w.onScale === "right") {
        rightTorque += w.value * Math.abs(w.position);
      }
    });

    const balanced = Math.abs(leftTorque - rightTorque) < 0.1;

    // Background
    ctx.fillStyle = balanced ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)";
    ctx.fillRect(centerX - 80, y - 15, 160, 30);

    // Text
    ctx.fillStyle = balanced ? "#2ecc71" : "#e74c3c";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (balanced) {
      ctx.fillText("BALANCED", centerX, y);
    } else {
      ctx.fillText(`L:${leftTorque} | R:${rightTorque}`, centerX, y);
    }
  }

  private lightenColor(color: string): string {
    return color + "cc";
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(600, rect.width - 20);
      this.canvas.height = 450;
      this.pivotX = this.canvas.width / 2;
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
