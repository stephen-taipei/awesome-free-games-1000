interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorButton {
  x: number;
  y: number;
  radius: number;
  color: RGB;
  name: string;
}

interface LevelConfig {
  target: RGB;
  availableColors: RGB[];
}

const PRIMARY_COLORS: RGB[] = [
  { r: 255, g: 0, b: 0 },    // Red
  { r: 255, g: 255, b: 0 },  // Yellow
  { r: 0, g: 0, b: 255 },    // Blue
];

const SECONDARY_COLORS: RGB[] = [
  { r: 255, g: 165, b: 0 },  // Orange
  { r: 0, g: 128, b: 0 },    // Green
  { r: 128, g: 0, b: 128 },  // Purple
];

const ALL_COLORS: RGB[] = [...PRIMARY_COLORS, ...SECONDARY_COLORS];

const LEVELS: LevelConfig[] = [
  // Level 1: Orange (Red + Yellow)
  {
    target: { r: 255, g: 165, b: 0 },
    availableColors: [
      { r: 255, g: 0, b: 0 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ],
  },
  // Level 2: Green (Yellow + Blue)
  {
    target: { r: 0, g: 128, b: 0 },
    availableColors: [
      { r: 255, g: 0, b: 0 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ],
  },
  // Level 3: Purple (Red + Blue)
  {
    target: { r: 128, g: 0, b: 128 },
    availableColors: [
      { r: 255, g: 0, b: 0 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ],
  },
  // Level 4: Teal (mix multiple)
  {
    target: { r: 0, g: 128, b: 128 },
    availableColors: [
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 255 },
    ],
  },
];

export class ColorPaletteGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  targetColor: RGB = { r: 0, g: 0, b: 0 };
  currentColor: RGB = { r: 255, g: 255, b: 255 };
  colorButtons: ColorButton[] = [];
  mixedColors: RGB[] = [];

  moves: number = 0;
  status: "playing" | "won" = "playing";

  clearButton: { x: number; y: number; width: number; height: number } | null = null;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.mixedColors = [];
    this.currentColor = { r: 255, g: 255, b: 255 };
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: this.moves,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.targetColor = { ...config.target };
    this.currentColor = { r: 255, g: 255, b: 255 };
    this.mixedColors = [];

    const { width, height } = this.canvas;

    // Create color buttons
    this.colorButtons = [];
    const colors = config.availableColors;
    const buttonRadius = 35;
    const startY = height - 80;
    const totalWidth = colors.length * (buttonRadius * 2 + 20);
    const startX = (width - totalWidth) / 2 + buttonRadius + 10;

    colors.forEach((color, i) => {
      this.colorButtons.push({
        x: startX + i * (buttonRadius * 2 + 20),
        y: startY,
        radius: buttonRadius,
        color,
        name: this.getColorName(color),
      });
    });

    // Clear button position
    this.clearButton = {
      x: width - 80,
      y: startY - 20,
      width: 60,
      height: 30,
    };
  }

  private getColorName(color: RGB): string {
    if (color.r === 255 && color.g === 0 && color.b === 0) return "Red";
    if (color.r === 255 && color.g === 255 && color.b === 0) return "Yellow";
    if (color.r === 0 && color.g === 0 && color.b === 255) return "Blue";
    if (color.r === 0 && color.g === 255 && color.b === 0) return "Green";
    if (color.r === 255 && color.g === 255 && color.b === 255) return "White";
    return "Color";
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
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check color buttons
    for (const btn of this.colorButtons) {
      const dist = Math.sqrt((x - btn.x) ** 2 + (y - btn.y) ** 2);
      if (dist <= btn.radius) {
        this.addColor(btn.color);
        return;
      }
    }

    // Check clear button
    if (this.clearButton) {
      const cb = this.clearButton;
      if (x >= cb.x && x <= cb.x + cb.width && y >= cb.y && y <= cb.y + cb.height) {
        this.clearMix();
        return;
      }
    }
  }

  private addColor(color: RGB) {
    this.mixedColors.push(color);
    this.currentColor = this.mixColors(this.mixedColors);
    this.moves++;

    if (this.onStateChange) {
      this.onStateChange({ moves: this.moves });
    }

    // Check win
    if (this.colorsMatch(this.currentColor, this.targetColor)) {
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

  private clearMix() {
    this.mixedColors = [];
    this.currentColor = { r: 255, g: 255, b: 255 };
  }

  private mixColors(colors: RGB[]): RGB {
    if (colors.length === 0) return { r: 255, g: 255, b: 255 };

    // Subtractive color mixing (like paint)
    let r = 0, g = 0, b = 0;

    for (const color of colors) {
      r += color.r;
      g += color.g;
      b += color.b;
    }

    // Average and adjust for subtractive mixing
    r = Math.round(r / colors.length);
    g = Math.round(g / colors.length);
    b = Math.round(b / colors.length);

    // Special mixing rules for primary colors
    const hasRed = colors.some(c => c.r === 255 && c.g === 0 && c.b === 0);
    const hasYellow = colors.some(c => c.r === 255 && c.g === 255 && c.b === 0);
    const hasBlue = colors.some(c => c.r === 0 && c.g === 0 && c.b === 255);
    const hasGreen = colors.some(c => c.r === 0 && c.g === 255 && c.b === 0);

    if (hasRed && hasYellow && !hasBlue) {
      return { r: 255, g: 165, b: 0 }; // Orange
    }
    if (hasYellow && hasBlue && !hasRed) {
      return { r: 0, g: 128, b: 0 }; // Green
    }
    if (hasRed && hasBlue && !hasYellow) {
      return { r: 128, g: 0, b: 128 }; // Purple
    }
    if (hasGreen && hasBlue) {
      return { r: 0, g: 128, b: 128 }; // Teal
    }

    return { r, g, b };
  }

  private colorsMatch(c1: RGB, c2: RGB): boolean {
    const tolerance = 30;
    return (
      Math.abs(c1.r - c2.r) <= tolerance &&
      Math.abs(c1.g - c2.g) <= tolerance &&
      Math.abs(c1.b - c2.b) <= tolerance
    );
  }

  private rgbToString(color: RGB): string {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f8f9fa");
    gradient.addColorStop(1, "#e9ecef");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Palette shape
    this.drawPalette();

    // Target color display
    this.drawTargetColor();

    // Current mix display
    this.drawCurrentColor();

    // Color buttons
    this.drawColorButtons();

    // Clear button
    this.drawClearButton();

    // Win effect
    if (this.status === "won") {
      this.drawWinEffect();
    }
  }

  private drawPalette() {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2 - 40;

    // Artist palette shape
    this.ctx.fillStyle = "#d4a76a";
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, 180, 120, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Palette hole
    this.ctx.fillStyle = "#f8f9fa";
    this.ctx.beginPath();
    this.ctx.ellipse(centerX - 100, centerY + 20, 25, 20, -0.3, 0, Math.PI * 2);
    this.ctx.fill();

    // Wood texture
    this.ctx.strokeStyle = "#b8956a";
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, 180 - i * 30, 120 - i * 20, 0, 0, Math.PI * 2);
      this.ctx.globalAlpha = 0.2;
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawTargetColor() {
    const { width } = this.canvas;
    const x = width / 2 - 80;
    const y = 60;

    // Label
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("TARGET", x + 35, y - 10);

    // Color circle
    this.ctx.fillStyle = this.rgbToString(this.targetColor);
    this.ctx.beginPath();
    this.ctx.arc(x + 35, y + 35, 35, 0, Math.PI * 2);
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  private drawCurrentColor() {
    const { width } = this.canvas;
    const x = width / 2 + 10;
    const y = 60;

    // Label
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("YOUR MIX", x + 35, y - 10);

    // Color circle
    this.ctx.fillStyle = this.rgbToString(this.currentColor);
    this.ctx.beginPath();
    this.ctx.arc(x + 35, y + 35, 35, 0, Math.PI * 2);
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Match indicator
    if (this.colorsMatch(this.currentColor, this.targetColor)) {
      this.ctx.strokeStyle = "#27ae60";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // Checkmark
      this.ctx.fillStyle = "#27ae60";
      this.ctx.font = "bold 24px Arial";
      this.ctx.fillText("✓", x + 35, y + 75);
    }
  }

  private drawColorButtons() {
    for (const btn of this.colorButtons) {
      // Shadow
      this.ctx.fillStyle = "rgba(0,0,0,0.2)";
      this.ctx.beginPath();
      this.ctx.arc(btn.x + 3, btn.y + 3, btn.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Button
      this.ctx.fillStyle = this.rgbToString(btn.color);
      this.ctx.beginPath();
      this.ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = "#2c3e50";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Highlight
      const gradient = this.ctx.createRadialGradient(
        btn.x - 10, btn.y - 10, 0,
        btn.x, btn.y, btn.radius
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.4)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(btn.x, btn.y, btn.radius - 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawClearButton() {
    if (!this.clearButton) return;

    const cb = this.clearButton;

    this.ctx.fillStyle = "#e74c3c";
    this.ctx.beginPath();
    this.ctx.roundRect(cb.x, cb.y, cb.width, cb.height, 5);
    this.ctx.fill();

    this.ctx.fillStyle = "white";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("Clear", cb.x + cb.width / 2, cb.y + cb.height / 2);
  }

  private drawWinEffect() {
    const { width, height } = this.canvas;

    this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
    this.ctx.fillRect(0, 0, width, height);

    // Rainbow sparkles
    const colors = ["#e74c3c", "#f39c12", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"];
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.colorButtons.length > 0) {
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
