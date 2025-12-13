/**
 * Light Shadow Game Engine
 * Game #123 - Move light to cast shadow matching target
 */

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "square" | "circle" | "triangle";
}

export interface LevelConfig {
  objects: GameObject[];
  targetShadowX: number;
  lightStartX: number;
  lightStartY: number;
}

export class LightShadowGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private objects: GameObject[] = [];
  private lightPos = { x: 100, y: 100 };
  private targetShadowX = 300;
  private wallY = 350;

  private dragging = false;
  private matchPercentage = 0;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Simple square
    {
      objects: [{ x: 200, y: 200, width: 60, height: 60, type: "square" }],
      targetShadowX: 250,
      lightStartX: 100,
      lightStartY: 150,
    },
    // Level 2 - Circle
    {
      objects: [{ x: 220, y: 180, width: 50, height: 50, type: "circle" }],
      targetShadowX: 280,
      lightStartX: 80,
      lightStartY: 120,
    },
    // Level 3 - Two objects
    {
      objects: [
        { x: 180, y: 180, width: 40, height: 40, type: "square" },
        { x: 260, y: 200, width: 50, height: 50, type: "circle" },
      ],
      targetShadowX: 320,
      lightStartX: 100,
      lightStartY: 100,
    },
    // Level 4 - Triangle
    {
      objects: [{ x: 200, y: 170, width: 70, height: 70, type: "triangle" }],
      targetShadowX: 260,
      lightStartX: 120,
      lightStartY: 80,
    },
    // Level 5 - Complex arrangement
    {
      objects: [
        { x: 160, y: 160, width: 45, height: 45, type: "square" },
        { x: 230, y: 180, width: 40, height: 40, type: "circle" },
        { x: 300, y: 170, width: 50, height: 50, type: "triangle" },
      ],
      targetShadowX: 350,
      lightStartX: 80,
      lightStartY: 100,
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
      const dist = Math.hypot(pos.x - this.lightPos.x, pos.y - this.lightPos.y);

      if (dist < 40) {
        this.dragging = true;
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.dragging) return;
      e.preventDefault();

      const pos = getPos(e);
      // Constrain light to upper area
      this.lightPos.x = Math.max(50, Math.min(this.canvas.width - 50, pos.x));
      this.lightPos.y = Math.max(50, Math.min(this.wallY - 100, pos.y));

      this.updateMatch();
      this.draw();
    };

    const handleEnd = () => {
      this.dragging = false;
    };

    this.canvas.addEventListener("mousedown", handleStart);
    this.canvas.addEventListener("mousemove", handleMove);
    this.canvas.addEventListener("mouseup", handleEnd);
    this.canvas.addEventListener("mouseleave", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: false });
    this.canvas.addEventListener("touchmove", handleMove, { passive: false });
    this.canvas.addEventListener("touchend", handleEnd);
  }

  private updateMatch() {
    // Calculate shadow center based on light position
    let totalShadowX = 0;
    let shadowCount = 0;

    this.objects.forEach((obj) => {
      const shadowX = this.calculateShadowX(obj);
      totalShadowX += shadowX;
      shadowCount++;
    });

    const avgShadowX = totalShadowX / shadowCount;
    const diff = Math.abs(avgShadowX - this.targetShadowX);
    const maxDiff = 200;

    this.matchPercentage = Math.max(0, Math.min(100, 100 - (diff / maxDiff) * 100));

    if (this.onStateChange) {
      this.onStateChange({ match: Math.round(this.matchPercentage) });
    }

    if (this.matchPercentage >= 95) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  private calculateShadowX(obj: GameObject): number {
    const objCenterX = obj.x + obj.width / 2;
    const objCenterY = obj.y + obj.height / 2;

    const dx = objCenterX - this.lightPos.x;
    const dy = objCenterY - this.lightPos.y;

    // Project to wall
    const t = (this.wallY - this.lightPos.y) / dy;
    return this.lightPos.x + dx * t;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.objects = config.objects.map((o) => ({ ...o }));
    this.targetShadowX = config.targetShadowX;
    this.lightPos = { x: config.lightStartX, y: config.lightStartY };
    this.matchPercentage = 0;

    this.updateMatch();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw light rays
    this.drawLightRays(ctx);

    // Draw shadows on wall
    this.drawShadows(ctx);

    // Draw target shadow outline
    this.drawTargetShadow(ctx);

    // Draw wall
    ctx.fillStyle = "#2d2d44";
    ctx.fillRect(0, this.wallY, w, h - this.wallY);

    // Draw objects
    this.objects.forEach((obj) => {
      this.drawObject(ctx, obj);
    });

    // Draw light source
    this.drawLight(ctx);

    // Draw match indicator
    this.drawMatchIndicator(ctx);
  }

  private drawLightRays(ctx: CanvasRenderingContext2D) {
    const rayCount = 20;
    ctx.strokeStyle = "rgba(255, 255, 100, 0.1)";
    ctx.lineWidth = 2;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 0.8 + Math.PI * 0.1;
      const endX = this.lightPos.x + Math.cos(angle) * 500;
      const endY = this.lightPos.y + Math.sin(angle) * 500;

      ctx.beginPath();
      ctx.moveTo(this.lightPos.x, this.lightPos.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  private drawShadows(ctx: CanvasRenderingContext2D) {
    this.objects.forEach((obj) => {
      const shadowPoints = this.calculateShadowPolygon(obj);

      // Shadow gradient
      const gradient = ctx.createLinearGradient(
        shadowPoints[0].x,
        this.wallY,
        shadowPoints[1].x,
        this.wallY
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
      gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.9)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(shadowPoints[0].x, this.wallY);
      ctx.lineTo(shadowPoints[1].x, this.wallY);
      ctx.lineTo(shadowPoints[1].x, this.canvas.height);
      ctx.lineTo(shadowPoints[0].x, this.canvas.height);
      ctx.closePath();
      ctx.fill();
    });
  }

  private calculateShadowPolygon(obj: GameObject): { x: number; y: number }[] {
    // Get left and right edges of object
    const leftX = obj.x;
    const rightX = obj.x + obj.width;
    const topY = obj.y;
    const bottomY = obj.y + obj.height;

    // Project to wall
    const projectPoint = (px: number, py: number) => {
      const dx = px - this.lightPos.x;
      const dy = py - this.lightPos.y;
      const t = (this.wallY - this.lightPos.y) / dy;
      return { x: this.lightPos.x + dx * t, y: this.wallY };
    };

    // Find shadow edges
    const shadowLeft = projectPoint(leftX, topY);
    const shadowRight = projectPoint(rightX, topY);

    return [shadowLeft, shadowRight];
  }

  private drawTargetShadow(ctx: CanvasRenderingContext2D) {
    const targetWidth = 80;
    const targetX = this.targetShadowX - targetWidth / 2;

    // Dashed outline for target
    ctx.strokeStyle = this.matchPercentage >= 95 ? "#2ecc71" : "#f39c12";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    ctx.strokeRect(targetX, this.wallY, targetWidth, 60);

    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = "#f39c12";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TARGET", this.targetShadowX, this.wallY + 75);
  }

  private drawObject(ctx: CanvasRenderingContext2D, obj: GameObject) {
    ctx.fillStyle = "#8e44ad";
    ctx.strokeStyle = "#9b59b6";
    ctx.lineWidth = 2;

    switch (obj.type) {
      case "square":
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        break;

      case "circle":
        ctx.beginPath();
        ctx.arc(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        break;

      case "triangle":
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        ctx.lineTo(obj.x, obj.y + obj.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }
  }

  private drawLight(ctx: CanvasRenderingContext2D) {
    const x = this.lightPos.x;
    const y = this.lightPos.y;

    // Outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
    gradient.addColorStop(0, "rgba(255, 255, 100, 0.5)");
    gradient.addColorStop(1, "rgba(255, 255, 100, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.fill();

    // Light bulb
    ctx.fillStyle = this.dragging ? "#fff" : "#ffd93d";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    ctx.strokeStyle = "#ffd93d";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 25, y + Math.sin(angle) * 25);
      ctx.lineTo(x + Math.cos(angle) * 35, y + Math.sin(angle) * 35);
      ctx.stroke();
    }
  }

  private drawMatchIndicator(ctx: CanvasRenderingContext2D) {
    const barWidth = 150;
    const barHeight = 15;
    const x = this.canvas.width - barWidth - 20;
    const y = 20;

    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    const fillColor =
      this.matchPercentage >= 95
        ? "#2ecc71"
        : this.matchPercentage >= 70
        ? "#f39c12"
        : "#e74c3c";

    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, (barWidth * this.matchPercentage) / 100, barHeight);

    // Border
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(this.matchPercentage)}%`, x + barWidth / 2, y + 12);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width - 20);
      this.canvas.height = 400;
      this.wallY = this.canvas.height - 50;
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

  public getMatch(): number {
    return Math.round(this.matchPercentage);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
