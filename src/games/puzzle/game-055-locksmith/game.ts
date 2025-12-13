export interface Pin {
  id: number;
  x: number;
  y: number;
  targetY: number;
  currentY: number;
  width: number;
  height: number;
  set: boolean;
  tolerance: number; // How close to target to be "set"
}

interface LevelConfig {
  pinCount: number;
  tolerance: number;
}

const LEVELS: LevelConfig[] = [
  { pinCount: 4, tolerance: 20 },
  { pinCount: 5, tolerance: 15 },
  { pinCount: 6, tolerance: 12 },
  { pinCount: 7, tolerance: 10 },
];

export class LocksmithGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  pins: Pin[] = [];
  currentLevel: number = 0;
  activePin: Pin | null = null;

  status: "playing" | "won" = "playing";
  lockBodyY: number = 0;
  shearLine: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.activePin = null;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        pins: `0/${this.pins.length}`,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.pins = [];

    const { width, height } = this.canvas;
    this.lockBodyY = height * 0.35;
    this.shearLine = this.lockBodyY + 80;

    const pinWidth = 40;
    const pinGap = 15;
    const totalWidth = config.pinCount * pinWidth + (config.pinCount - 1) * pinGap;
    const startX = (width - totalWidth) / 2;

    for (let i = 0; i < config.pinCount; i++) {
      const x = startX + i * (pinWidth + pinGap);
      const targetY = this.shearLine - 10 - Math.random() * 50; // Random target above shear line

      this.pins.push({
        id: i,
        x,
        y: this.lockBodyY,
        targetY,
        currentY: this.lockBodyY + 120, // Start position (pushed down)
        width: pinWidth,
        height: 100,
        set: false,
        tolerance: config.tolerance,
      });
    }
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    // Apply spring physics to non-set pins
    for (const pin of this.pins) {
      if (!pin.set && pin !== this.activePin) {
        // Spring back to default position
        const defaultY = this.lockBodyY + 120;
        pin.currentY += (defaultY - pin.currentY) * 0.1;
      }
    }
  }

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing") return;

    if (type === "down") {
      // Find clicked pin
      for (const pin of this.pins) {
        if (pin.set) continue;

        if (
          x >= pin.x &&
          x <= pin.x + pin.width &&
          y >= pin.y &&
          y <= pin.y + pin.height + 50
        ) {
          this.activePin = pin;
          break;
        }
      }
    } else if (type === "move") {
      if (this.activePin) {
        // Move pin up/down based on mouse Y
        const minY = this.lockBodyY - 30;
        const maxY = this.lockBodyY + 150;
        this.activePin.currentY = Math.max(minY, Math.min(maxY, y - 30));
      }
    } else if (type === "up") {
      if (this.activePin) {
        // Check if pin is set at the correct position
        const pin = this.activePin;
        const diff = Math.abs(pin.currentY - pin.targetY);

        if (diff <= pin.tolerance) {
          pin.set = true;
          pin.currentY = pin.targetY;

          // Update pins count
          const setCount = this.pins.filter((p) => p.set).length;
          if (this.onStateChange) {
            this.onStateChange({
              pins: `${setCount}/${this.pins.length}`,
            });
          }

          // Check win
          if (setCount === this.pins.length) {
            this.status = "won";
            if (this.onStateChange) {
              this.onStateChange({
                status: "won",
                level: this.currentLevel + 1,
                hasNextLevel: this.currentLevel < LEVELS.length - 1,
              });
            }
          }
        }

        this.activePin = null;
      }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(1, "#16213e");
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw lock body
    this.drawLockBody();

    // Draw pins
    for (const pin of this.pins) {
      this.drawPin(pin);
    }

    // Draw shear line indicator
    this.drawShearLine();

    // Draw pick tool
    this.drawPickTool();

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
      this.drawUnlockedIndicator();
    }
  }

  private drawLockBody() {
    const { width } = this.canvas;

    // Outer lock case
    this.ctx.fillStyle = "#4a4a4a";
    this.ctx.fillRect(20, this.lockBodyY - 20, width - 40, 200);

    // Inner channel (where pins sit)
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.fillRect(40, this.lockBodyY, width - 80, 160);

    // Lock cylinder (plug)
    const plugGradient = this.ctx.createLinearGradient(
      0,
      this.shearLine,
      0,
      this.shearLine + 80
    );
    plugGradient.addColorStop(0, "#b8860b");
    plugGradient.addColorStop(0.5, "#ffd700");
    plugGradient.addColorStop(1, "#b8860b");
    this.ctx.fillStyle = plugGradient;
    this.ctx.fillRect(40, this.shearLine, width - 80, 80);

    // Label
    this.ctx.fillStyle = "#888";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("LOCK CYLINDER", width / 2, this.lockBodyY - 30);
  }

  private drawShearLine() {
    const { width } = this.canvas;

    // Shear line marker
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeStyle = "#e74c3c";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(30, this.shearLine);
    this.ctx.lineTo(width - 30, this.shearLine);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Label
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.font = "bold 10px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText("SHEAR LINE", width - 35, this.shearLine - 5);
  }

  private drawPin(pin: Pin) {
    const { x, currentY, width: w, height: h, set } = pin;

    // Driver pin (top part)
    const driverGradient = this.ctx.createLinearGradient(x, currentY - 60, x + w, currentY);
    driverGradient.addColorStop(0, "#666");
    driverGradient.addColorStop(0.5, "#888");
    driverGradient.addColorStop(1, "#666");
    this.ctx.fillStyle = driverGradient;
    this.ctx.fillRect(x + 5, this.lockBodyY + 10, w - 10, currentY - this.lockBodyY - 20);

    // Key pin (bottom part)
    const keyPinGradient = this.ctx.createLinearGradient(x, currentY, x + w, currentY + h);
    if (set) {
      keyPinGradient.addColorStop(0, "#27ae60");
      keyPinGradient.addColorStop(0.5, "#2ecc71");
      keyPinGradient.addColorStop(1, "#27ae60");
    } else if (pin === this.activePin) {
      keyPinGradient.addColorStop(0, "#d4a017");
      keyPinGradient.addColorStop(0.5, "#ffd700");
      keyPinGradient.addColorStop(1, "#d4a017");
    } else {
      keyPinGradient.addColorStop(0, "#c0392b");
      keyPinGradient.addColorStop(0.5, "#e74c3c");
      keyPinGradient.addColorStop(1, "#c0392b");
    }

    this.ctx.fillStyle = keyPinGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(x + 2, currentY, w - 4, 60, 3);
    this.ctx.fill();

    // Pin number
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(String(pin.id + 1), x + w / 2, currentY + 30);

    // Set indicator
    if (set) {
      this.ctx.fillStyle = "#2ecc71";
      this.ctx.beginPath();
      this.ctx.arc(x + w / 2, currentY - 15, 8, 0, Math.PI * 2);
      this.ctx.fill();

      // Checkmark
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + w / 2 - 4, currentY - 15);
      this.ctx.lineTo(x + w / 2 - 1, currentY - 12);
      this.ctx.lineTo(x + w / 2 + 5, currentY - 20);
      this.ctx.stroke();
    }
  }

  private drawPickTool() {
    const { width, height } = this.canvas;

    // Tension wrench
    this.ctx.fillStyle = "#555";
    this.ctx.fillRect(width - 100, height - 60, 80, 8);
    this.ctx.fillRect(width - 100, height - 60, 8, 40);

    // Pick
    this.ctx.fillRect(20, height - 50, 100, 4);
    // Pick tip
    this.ctx.beginPath();
    this.ctx.moveTo(120, height - 48);
    this.ctx.lineTo(140, height - 45);
    this.ctx.lineTo(120, height - 48);
    this.ctx.lineTo(140, height - 51);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawUnlockedIndicator() {
    const { width, height } = this.canvas;

    // Big padlock icon
    this.ctx.save();
    this.ctx.translate(width / 2, height - 100);

    // Lock body
    this.ctx.fillStyle = "#ffd700";
    this.ctx.fillRect(-30, 0, 60, 50);

    // Shackle (open)
    this.ctx.strokeStyle = "#ffd700";
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.arc(0, -10, 20, Math.PI, 0);
    this.ctx.stroke();

    // Keyhole
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.beginPath();
    this.ctx.arc(0, 20, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillRect(-4, 20, 8, 15);

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.pins.length > 0) {
        this.initLevel();
      }
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
