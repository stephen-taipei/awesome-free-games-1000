/**
 * Rainbow Bridge - Game #129
 * Build rainbow bridges by placing colors in sequence
 */

export interface BridgeSegment {
  color: string;
  placed: boolean;
}

export interface Level {
  bridgeLength: number;
  availableColors: string[];
  sequence: string[];
}

const RAINBOW_COLORS = [
  '#e74c3c', // Red
  '#e67e22', // Orange
  '#f1c40f', // Yellow
  '#2ecc71', // Green
  '#3498db', // Blue
  '#9b59b6', // Indigo
  '#8e44ad'  // Violet
];

const LEVELS: Level[] = [
  {
    bridgeLength: 3,
    availableColors: ['#e74c3c', '#f1c40f', '#3498db'],
    sequence: ['#e74c3c', '#f1c40f', '#3498db']
  },
  {
    bridgeLength: 4,
    availableColors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71'],
    sequence: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71']
  },
  {
    bridgeLength: 5,
    availableColors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'],
    sequence: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db']
  },
  {
    bridgeLength: 6,
    availableColors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'],
    sequence: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6']
  },
  {
    bridgeLength: 7,
    availableColors: RAINBOW_COLORS,
    sequence: RAINBOW_COLORS
  }
];

export class RainbowBridgeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private bridgeSegments: BridgeSegment[] = [];
  private availableColors: string[] = [];
  private targetSequence: string[] = [];
  private currentPlacementIndex = 0;

  private currentLevel = 0;
  private attempts = 0;

  private selectedColor: string | null = null;
  private colorPaletteY = 0;
  private bridgeY = 0;
  private segmentWidth = 0;
  private colorSlotSize = 0;

  private animating = false;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  private loadLevel(index: number) {
    const level = LEVELS[index % LEVELS.length];
    this.targetSequence = [...level.sequence];
    this.availableColors = this.shuffleArray([...level.availableColors]);
    this.currentPlacementIndex = 0;
    this.attempts = 0;

    this.bridgeSegments = level.sequence.map(() => ({
      color: '',
      placed: false
    }));

    this.calculateLayout();
    this.notifyState();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private calculateLayout() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.bridgeY = height * 0.4;
    this.colorPaletteY = height * 0.75;

    const bridgeWidth = width * 0.8;
    this.segmentWidth = Math.min(bridgeWidth / this.bridgeSegments.length, 70);

    this.colorSlotSize = Math.min(50, (width * 0.8) / this.availableColors.length);
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing' || this.animating) return;

    if (type === 'down') {
      // Check if clicking on color palette
      const paletteStartX = (this.canvas.width - this.availableColors.length * (this.colorSlotSize + 10)) / 2;

      for (let i = 0; i < this.availableColors.length; i++) {
        const slotX = paletteStartX + i * (this.colorSlotSize + 10);
        if (x >= slotX && x <= slotX + this.colorSlotSize &&
            y >= this.colorPaletteY && y <= this.colorPaletteY + this.colorSlotSize) {
          this.selectedColor = this.availableColors[i];
          this.draw();
          return;
        }
      }

      // Check if clicking on bridge segment
      if (this.selectedColor) {
        const bridgeStartX = (this.canvas.width - this.bridgeSegments.length * this.segmentWidth) / 2;

        for (let i = 0; i < this.bridgeSegments.length; i++) {
          const segX = bridgeStartX + i * this.segmentWidth;
          if (x >= segX && x <= segX + this.segmentWidth &&
              y >= this.bridgeY - 30 && y <= this.bridgeY + 30) {
            if (!this.bridgeSegments[i].placed) {
              this.placeColor(i, this.selectedColor);
              return;
            }
          }
        }
      }
    }
  }

  private placeColor(index: number, color: string) {
    this.bridgeSegments[index].color = color;
    this.bridgeSegments[index].placed = true;
    this.attempts++;

    // Remove from available colors
    const colorIndex = this.availableColors.indexOf(color);
    if (colorIndex !== -1) {
      this.availableColors.splice(colorIndex, 1);
    }

    this.selectedColor = null;
    this.currentPlacementIndex++;

    // Check if all placed
    if (this.currentPlacementIndex >= this.bridgeSegments.length) {
      this.checkWin();
    }

    this.notifyState();
    this.draw();
  }

  private checkWin() {
    let correct = true;
    for (let i = 0; i < this.bridgeSegments.length; i++) {
      if (this.bridgeSegments[i].color !== this.targetSequence[i]) {
        correct = false;
        break;
      }
    }

    if (correct) {
      this.animating = true;
      this.animateSuccess();
    } else {
      this.status = 'lost';
      this.notifyState();
    }
  }

  private animateSuccess() {
    let frame = 0;
    const animate = () => {
      frame++;
      this.draw();

      // Draw rainbow glow
      const ctx = this.ctx;
      const bridgeStartX = (this.canvas.width - this.bridgeSegments.length * this.segmentWidth) / 2;
      const bridgeEndX = bridgeStartX + this.bridgeSegments.length * this.segmentWidth;

      const glowIntensity = Math.sin(frame * 0.1) * 0.3 + 0.5;
      const gradient = ctx.createLinearGradient(bridgeStartX, 0, bridgeEndX, 0);

      this.bridgeSegments.forEach((seg, i) => {
        gradient.addColorStop(i / this.bridgeSegments.length, seg.color);
      });

      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 20 * glowIntensity;

      if (frame < 60) {
        requestAnimationFrame(animate);
      } else {
        this.animating = false;
        this.status = 'won';
        this.notifyState();
      }
    };

    animate();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Sky background
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(0.6, '#e0f7fa');
    skyGradient.addColorStop(1, '#81c784');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw clouds
    this.drawClouds();

    // Draw ground
    this.ctx.fillStyle = '#66bb6a';
    this.ctx.fillRect(0, this.canvas.height - 60, this.canvas.width, 60);

    // Draw bridge pillars
    this.drawPillars();

    // Draw bridge
    this.drawBridge();

    // Draw color palette
    this.drawColorPalette();

    // Draw target hint
    this.drawTargetHint();
  }

  private drawClouds() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    const clouds = [
      { x: 50, y: 50, scale: 1 },
      { x: 200, y: 80, scale: 0.8 },
      { x: 350, y: 40, scale: 1.2 },
      { x: 450, y: 90, scale: 0.9 }
    ];

    clouds.forEach(cloud => {
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, 20 * cloud.scale, 0, Math.PI * 2);
      this.ctx.arc(cloud.x + 25 * cloud.scale, cloud.y - 10 * cloud.scale, 25 * cloud.scale, 0, Math.PI * 2);
      this.ctx.arc(cloud.x + 50 * cloud.scale, cloud.y, 20 * cloud.scale, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawPillars() {
    const bridgeStartX = (this.canvas.width - this.bridgeSegments.length * this.segmentWidth) / 2;
    const bridgeEndX = bridgeStartX + this.bridgeSegments.length * this.segmentWidth;

    // Left pillar
    this.ctx.fillStyle = '#8d6e63';
    this.ctx.fillRect(bridgeStartX - 20, this.bridgeY, 20, this.canvas.height - this.bridgeY - 60);

    // Right pillar
    this.ctx.fillRect(bridgeEndX, this.bridgeY, 20, this.canvas.height - this.bridgeY - 60);
  }

  private drawBridge() {
    const bridgeStartX = (this.canvas.width - this.bridgeSegments.length * this.segmentWidth) / 2;

    this.bridgeSegments.forEach((segment, i) => {
      const x = bridgeStartX + i * this.segmentWidth;

      // Bridge segment base
      this.ctx.fillStyle = segment.placed ? segment.color : 'rgba(200, 200, 200, 0.5)';
      this.ctx.fillRect(x + 2, this.bridgeY - 20, this.segmentWidth - 4, 40);

      // Highlight effect for placed segments
      if (segment.placed) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x + 2, this.bridgeY - 20, this.segmentWidth - 4, 10);
      }

      // Segment border
      this.ctx.strokeStyle = segment.placed ? 'rgba(0, 0, 0, 0.2)' : 'rgba(100, 100, 100, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 2, this.bridgeY - 20, this.segmentWidth - 4, 40);

      // Position indicator
      if (!segment.placed) {
        this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('?', x + this.segmentWidth / 2, this.bridgeY + 5);
      }
    });
  }

  private drawColorPalette() {
    const paletteStartX = (this.canvas.width - this.availableColors.length * (this.colorSlotSize + 10)) / 2;

    // Palette background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.beginPath();
    this.ctx.roundRect(
      paletteStartX - 15,
      this.colorPaletteY - 15,
      this.availableColors.length * (this.colorSlotSize + 10) + 20,
      this.colorSlotSize + 30,
      10
    );
    this.ctx.fill();

    // Color slots
    this.availableColors.forEach((color, i) => {
      const x = paletteStartX + i * (this.colorSlotSize + 10);

      // Selection highlight
      if (this.selectedColor === color) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x - 4, this.colorPaletteY - 4, this.colorSlotSize + 8, this.colorSlotSize + 8);
      }

      // Color circle
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x + this.colorSlotSize / 2, this.colorPaletteY + this.colorSlotSize / 2, this.colorSlotSize / 2 - 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Highlight
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(x + this.colorSlotSize / 2 - 5, this.colorPaletteY + this.colorSlotSize / 2 - 5, this.colorSlotSize / 4, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawTargetHint() {
    const hintY = 30;
    const hintText = 'Target: ';
    const colorSize = 15;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(hintText, 20, hintY);

    const textWidth = this.ctx.measureText(hintText).width;
    this.targetSequence.forEach((color, i) => {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(25 + textWidth + i * (colorSize + 4), hintY - 12, colorSize, colorSize);
    });
  }

  resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    this.calculateLayout();
    this.draw();
  }

  reset() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  nextLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        placed: this.currentPlacementIndex,
        total: this.bridgeSegments.length
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
