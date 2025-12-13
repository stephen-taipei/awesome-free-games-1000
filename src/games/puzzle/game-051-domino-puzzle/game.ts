export interface Domino {
  id: number;
  top: number;
  bottom: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  matched: boolean;
}

interface LevelConfig {
  dominoCount: number;
}

const LEVELS: LevelConfig[] = [
  { dominoCount: 6 },
  { dominoCount: 8 },
  { dominoCount: 10 },
  { dominoCount: 12 },
];

export class DominoPuzzleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  dominoes: Domino[] = [];
  currentLevel: number = 0;
  selectedDomino: Domino | null = null;

  status: "playing" | "won" = "playing";
  dominoWidth: number = 50;
  dominoHeight: number = 100;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.selectedDomino = null;
    this.generateDominoes();
    this.layoutDominoes();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        remaining: this.dominoes.filter((d) => !d.matched).length,
      });
    }
  }

  private generateDominoes() {
    this.dominoes = [];
    const config = LEVELS[this.currentLevel];
    const pairs = config.dominoCount / 2;

    // Generate matching pairs
    const values: [number, number][] = [];
    for (let i = 0; i < pairs; i++) {
      const top = Math.floor(Math.random() * 7);
      const bottom = Math.floor(Math.random() * 7);
      values.push([top, bottom]);
      values.push([top, bottom]); // Pair
    }

    // Shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    // Create dominoes
    for (let i = 0; i < values.length; i++) {
      this.dominoes.push({
        id: i,
        top: values[i][0],
        bottom: values[i][1],
        x: 0,
        y: 0,
        width: this.dominoWidth,
        height: this.dominoHeight,
        selected: false,
        matched: false,
      });
    }
  }

  private layoutDominoes() {
    const { width, height } = this.canvas;
    const padding = 20;
    const gap = 15;

    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(this.dominoes.length * 2));
    const rows = Math.ceil(this.dominoes.length / cols);

    const totalWidth = cols * (this.dominoWidth + gap) - gap;
    const totalHeight = rows * (this.dominoHeight + gap) - gap;

    const startX = (width - totalWidth) / 2;
    const startY = (height - totalHeight) / 2;

    for (let i = 0; i < this.dominoes.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      this.dominoes[i].x = startX + col * (this.dominoWidth + gap);
      this.dominoes[i].y = startY + row * (this.dominoHeight + gap);
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
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked domino
    const clicked = this.dominoes.find(
      (d) =>
        !d.matched &&
        x >= d.x &&
        x <= d.x + d.width &&
        y >= d.y &&
        y <= d.y + d.height
    );

    if (!clicked) return;

    if (this.selectedDomino === null) {
      // First selection
      clicked.selected = true;
      this.selectedDomino = clicked;
    } else if (this.selectedDomino.id === clicked.id) {
      // Clicked same domino - deselect
      clicked.selected = false;
      this.selectedDomino = null;
    } else {
      // Second selection - check match
      if (
        this.selectedDomino.top === clicked.top &&
        this.selectedDomino.bottom === clicked.bottom
      ) {
        // Match!
        this.selectedDomino.matched = true;
        clicked.matched = true;
        this.selectedDomino.selected = false;

        // Check win
        const remaining = this.dominoes.filter((d) => !d.matched).length;
        if (this.onStateChange) {
          this.onStateChange({ remaining });
        }

        if (remaining === 0) {
          this.status = "won";
          if (this.onStateChange) {
            this.onStateChange({
              status: "won",
              level: this.currentLevel + 1,
              hasNextLevel: this.currentLevel < LEVELS.length - 1,
            });
          }
        }
      } else {
        // No match - deselect first
        this.selectedDomino.selected = false;
        clicked.selected = true;
      }

      this.selectedDomino = clicked.selected ? clicked : null;
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#2e8b57");
    gradient.addColorStop(1, "#228b22");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Felt texture
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    for (let i = 0; i < width; i += 4) {
      for (let j = 0; j < height; j += 4) {
        if (Math.random() > 0.5) {
          this.ctx.fillRect(i, j, 2, 2);
        }
      }
    }

    // Draw dominoes
    for (const domino of this.dominoes) {
      if (!domino.matched) {
        this.drawDomino(domino);
      }
    }

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawDomino(domino: Domino) {
    const { x, y, width: w, height: h, top, bottom, selected } = domino;

    // Shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(x + 3, y + 3, w, h);

    // Domino body
    const bodyGradient = this.ctx.createLinearGradient(x, y, x + w, y + h);
    if (selected) {
      bodyGradient.addColorStop(0, "#ffd700");
      bodyGradient.addColorStop(1, "#ffcc00");
    } else {
      bodyGradient.addColorStop(0, "#f5f5f5");
      bodyGradient.addColorStop(1, "#e0e0e0");
    }
    this.ctx.fillStyle = bodyGradient;
    this.ctx.fillRect(x, y, w, h);

    // Border
    this.ctx.strokeStyle = selected ? "#b8860b" : "#333";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, w, h);

    // Divider line
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + h / 2);
    this.ctx.lineTo(x + w, y + h / 2);
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw dots
    this.drawDots(x + w / 2, y + h / 4, top);
    this.drawDots(x + w / 2, y + (3 * h) / 4, bottom);
  }

  private drawDots(cx: number, cy: number, count: number) {
    const dotRadius = 4;
    const spacing = 12;

    this.ctx.fillStyle = "#1a1a1a";

    const positions: [number, number][] = [];

    switch (count) {
      case 0:
        break;
      case 1:
        positions.push([0, 0]);
        break;
      case 2:
        positions.push([-spacing / 2, -spacing / 2]);
        positions.push([spacing / 2, spacing / 2]);
        break;
      case 3:
        positions.push([0, 0]);
        positions.push([-spacing / 2, -spacing / 2]);
        positions.push([spacing / 2, spacing / 2]);
        break;
      case 4:
        positions.push([-spacing / 2, -spacing / 2]);
        positions.push([spacing / 2, -spacing / 2]);
        positions.push([-spacing / 2, spacing / 2]);
        positions.push([spacing / 2, spacing / 2]);
        break;
      case 5:
        positions.push([0, 0]);
        positions.push([-spacing / 2, -spacing / 2]);
        positions.push([spacing / 2, -spacing / 2]);
        positions.push([-spacing / 2, spacing / 2]);
        positions.push([spacing / 2, spacing / 2]);
        break;
      case 6:
        positions.push([-spacing / 2, -spacing / 2]);
        positions.push([spacing / 2, -spacing / 2]);
        positions.push([-spacing / 2, 0]);
        positions.push([spacing / 2, 0]);
        positions.push([-spacing / 2, spacing / 2]);
        positions.push([spacing / 2, spacing / 2]);
        break;
    }

    for (const [dx, dy] of positions) {
      this.ctx.beginPath();
      this.ctx.arc(cx + dx, cy + dy, dotRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 450;
      this.layoutDominoes();
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
