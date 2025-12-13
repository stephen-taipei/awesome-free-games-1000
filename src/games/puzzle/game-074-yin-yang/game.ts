/**
 * Yin Yang Balance Game
 * Game #074 - Balance yin and yang elements on a scale
 */

export interface Element {
  type: "yin" | "yang";
  x: number;
  y: number;
  weight: number;
  side: "left" | "right";
}

interface Level {
  targetBalance: number;
  tolerance: number;
  maxElements: number;
  availableYin: number;
  availableYang: number;
  yinWeight: number;
  yangWeight: number;
}

const LEVELS: Level[] = [
  { targetBalance: 0, tolerance: 0.1, maxElements: 4, availableYin: 2, availableYang: 2, yinWeight: 1, yangWeight: 1 },
  { targetBalance: 0, tolerance: 0.1, maxElements: 6, availableYin: 3, availableYang: 3, yinWeight: 1, yangWeight: 1 },
  { targetBalance: 0, tolerance: 0.1, maxElements: 6, availableYin: 4, availableYang: 2, yinWeight: 1, yangWeight: 2 },
  { targetBalance: 0, tolerance: 0.1, maxElements: 8, availableYin: 4, availableYang: 4, yinWeight: 1, yangWeight: 1 },
  { targetBalance: 0, tolerance: 0.05, maxElements: 8, availableYin: 5, availableYang: 3, yinWeight: 1, yangWeight: 1.5 },
  { targetBalance: 0, tolerance: 0.05, maxElements: 10, availableYin: 5, availableYang: 5, yinWeight: 1, yangWeight: 1 },
  { targetBalance: 0, tolerance: 0.05, maxElements: 10, availableYin: 6, availableYang: 4, yinWeight: 1, yangWeight: 1.5 },
  { targetBalance: 0, tolerance: 0.03, maxElements: 12, availableYin: 6, availableYang: 6, yinWeight: 1, yangWeight: 1 },
];

export class YinYangGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  currentLevel: number = 0;
  elements: Element[] = [];
  selectedType: "yin" | "yang" = "yin";
  placedYin: number = 0;
  placedYang: number = 0;
  balance: number = 0;
  scaleAngle: number = 0;
  targetAngle: number = 0;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private animationId: number = 0;

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
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({
          status: "complete",
          level: levelIndex + 1,
          balance: 0,
        });
      }
      return;
    }

    this.elements = [];
    this.placedYin = 0;
    this.placedYang = 0;
    this.balance = 0;
    this.scaleAngle = 0;
    this.targetAngle = 0;
    this.selectedType = "yin";
    this.status = "playing";

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        balance: 0,
        placedYin: 0,
        placedYang: 0,
        availableYin: LEVELS[levelIndex].availableYin,
        availableYang: LEVELS[levelIndex].availableYang,
        selectedType: this.selectedType,
      });
    }
  }

  private gameLoop() {
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Smooth scale animation
    const angleDiff = this.targetAngle - this.scaleAngle;
    this.scaleAngle += angleDiff * 0.1;
  }

  private calculateBalance(): number {
    const level = LEVELS[this.currentLevel];
    let leftWeight = 0;
    let rightWeight = 0;

    this.elements.forEach((el) => {
      const weight = el.type === "yin" ? level.yinWeight : level.yangWeight;
      const distance = Math.abs(el.x - this.width / 2) / (this.width / 4);
      const torque = weight * distance;

      if (el.side === "left") {
        leftWeight += torque;
      } else {
        rightWeight += torque;
      }
    });

    const total = leftWeight + rightWeight;
    if (total === 0) return 0;

    return (rightWeight - leftWeight) / Math.max(total, 1);
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const level = LEVELS[this.currentLevel];
    const scaleY = this.height * 0.5;
    const scaleTop = scaleY - 60;
    const scaleBottom = scaleY + 20;

    // Check if click is on the scale platform
    if (y < scaleTop || y > scaleBottom) return;

    const centerX = this.width / 2;
    const side: "left" | "right" = x < centerX ? "left" : "right";

    // Check availability
    if (this.selectedType === "yin" && this.placedYin >= level.availableYin) return;
    if (this.selectedType === "yang" && this.placedYang >= level.availableYang) return;

    // Place element
    const element: Element = {
      type: this.selectedType,
      x: x,
      y: scaleY - 30,
      weight: this.selectedType === "yin" ? level.yinWeight : level.yangWeight,
      side: side,
    };

    this.elements.push(element);

    if (this.selectedType === "yin") {
      this.placedYin++;
    } else {
      this.placedYang++;
    }

    // Calculate new balance
    this.balance = this.calculateBalance();
    this.targetAngle = this.balance * 0.3; // Max 0.3 radians tilt

    // Check win condition
    const totalPlaced = this.placedYin + this.placedYang;
    if (totalPlaced >= level.maxElements ||
        (this.placedYin >= level.availableYin && this.placedYang >= level.availableYang)) {
      if (Math.abs(this.balance) <= level.tolerance) {
        this.status = "won";
        if (this.onStateChange) {
          this.onStateChange({
            status: "won",
            level: this.currentLevel + 1,
            balance: this.balance,
          });
        }
        return;
      }
    }

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: this.currentLevel + 1,
        balance: this.balance,
        placedYin: this.placedYin,
        placedYang: this.placedYang,
        availableYin: level.availableYin,
        availableYang: level.availableYang,
        selectedType: this.selectedType,
      });
    }
  }

  public selectType(type: "yin" | "yang") {
    this.selectedType = type;
    if (this.onStateChange) {
      const level = LEVELS[this.currentLevel];
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        balance: this.balance,
        placedYin: this.placedYin,
        placedYang: this.placedYang,
        availableYin: level.availableYin,
        availableYang: level.availableYang,
        selectedType: this.selectedType,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, this.width, this.height);
    bgGrad.addColorStop(0, "#1a1a2e");
    bgGrad.addColorStop(1, "#16213e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw yin yang symbol in background
    this.drawYinYangSymbol(this.width / 2, this.height * 0.2, 40);

    // Draw scale
    this.drawScale();

    // Draw elements
    this.elements.forEach((el) => this.drawElement(el));

    // Draw balance indicator
    this.drawBalanceIndicator();
  }

  private drawYinYangSymbol(x: number, y: number, radius: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.3;

    // White half
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, Math.PI / 2, false);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Black half
    ctx.beginPath();
    ctx.arc(x, y, radius, Math.PI / 2, -Math.PI / 2, false);
    ctx.fillStyle = "#000000";
    ctx.fill();

    // Small circles
    ctx.beginPath();
    ctx.arc(x, y - radius / 2, radius / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y + radius / 2, radius / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();

    // Dots
    ctx.beginPath();
    ctx.arc(x, y - radius / 2, radius / 6, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y + radius / 2, radius / 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
  }

  private drawScale() {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height * 0.5;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.scaleAngle);
    ctx.translate(-centerX, -centerY);

    // Scale beam
    const beamWidth = this.width * 0.8;
    const beamHeight = 15;

    ctx.fillStyle = "#8b7355";
    ctx.fillRect(centerX - beamWidth / 2, centerY - beamHeight / 2, beamWidth, beamHeight);

    // Scale platforms
    const platformWidth = beamWidth * 0.35;
    const platformHeight = 8;

    // Left platform
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(centerX - beamWidth / 2 + 20, centerY - 50, platformWidth, platformHeight);

    // Right platform
    ctx.fillRect(centerX + beamWidth / 2 - platformWidth - 20, centerY - 50, platformWidth, platformHeight);

    // Platform supports
    ctx.strokeStyle = "#5d4e37";
    ctx.lineWidth = 3;

    // Left support
    ctx.beginPath();
    ctx.moveTo(centerX - beamWidth / 2 + 20 + platformWidth / 2, centerY - 50);
    ctx.lineTo(centerX - beamWidth / 2 + 20 + platformWidth / 2, centerY);
    ctx.stroke();

    // Right support
    ctx.beginPath();
    ctx.moveTo(centerX + beamWidth / 2 - platformWidth / 2 - 20, centerY - 50);
    ctx.lineTo(centerX + beamWidth / 2 - platformWidth / 2 - 20, centerY);
    ctx.stroke();

    ctx.restore();

    // Fixed pivot point
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Base
    ctx.fillStyle = "#5d4e37";
    ctx.beginPath();
    ctx.moveTo(centerX - 40, this.height * 0.85);
    ctx.lineTo(centerX + 40, this.height * 0.85);
    ctx.lineTo(centerX + 15, centerY + 20);
    ctx.lineTo(centerX - 15, centerY + 20);
    ctx.closePath();
    ctx.fill();
  }

  private drawElement(el: Element) {
    const ctx = this.ctx;
    const radius = 20;

    // Apply scale rotation to element position
    const centerX = this.width / 2;
    const centerY = this.height * 0.5;

    const dx = el.x - centerX;
    const dy = el.y - centerY;
    const cos = Math.cos(this.scaleAngle);
    const sin = Math.sin(this.scaleAngle);

    const rotatedX = centerX + dx * cos - dy * sin;
    const rotatedY = centerY + dx * sin + dy * cos;

    ctx.save();

    if (el.type === "yin") {
      // Yin - Black with glow
      const glow = ctx.createRadialGradient(rotatedX, rotatedY, 0, rotatedX, rotatedY, radius * 1.5);
      glow.addColorStop(0, "rgba(0, 0, 0, 0.8)");
      glow.addColorStop(0.5, "rgba(30, 30, 50, 0.6)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rotatedX, rotatedY, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(rotatedX, rotatedY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#4a4a6a";
      ctx.lineWidth = 2;
      ctx.stroke();

      // White dot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(rotatedX, rotatedY, radius / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Yang - White with glow
      const glow = ctx.createRadialGradient(rotatedX, rotatedY, 0, rotatedX, rotatedY, radius * 1.5);
      glow.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      glow.addColorStop(0.5, "rgba(255, 255, 200, 0.4)");
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rotatedX, rotatedY, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.arc(rotatedX, rotatedY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Black dot
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(rotatedX, rotatedY, radius / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBalanceIndicator() {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const y = this.height * 0.9;
    const width = 200;

    // Background bar
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(centerX - width / 2, y - 8, width, 16);

    // Center marker
    ctx.fillStyle = "#27ae60";
    ctx.fillRect(centerX - 2, y - 12, 4, 24);

    // Balance indicator
    const indicatorX = centerX + this.balance * (width / 2);
    ctx.fillStyle = Math.abs(this.balance) < LEVELS[this.currentLevel].tolerance ? "#27ae60" : "#e74c3c";
    ctx.beginPath();
    ctx.arc(indicatorX, y, 8, 0, Math.PI * 2);
    ctx.fill();
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

  public getSelectedType(): "yin" | "yang" {
    return this.selectedType;
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
