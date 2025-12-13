/**
 * Telescope - Game #131
 * Align telescope to view stars
 */

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  found: boolean;
}

export interface Level {
  stars: { x: number; y: number; size: number }[];
  viewRadius: number;
}

const LEVELS: Level[] = [
  {
    stars: [
      { x: 0.3, y: 0.3, size: 15 },
      { x: 0.7, y: 0.6, size: 12 }
    ],
    viewRadius: 60
  },
  {
    stars: [
      { x: 0.2, y: 0.4, size: 12 },
      { x: 0.5, y: 0.2, size: 10 },
      { x: 0.8, y: 0.7, size: 14 }
    ],
    viewRadius: 55
  },
  {
    stars: [
      { x: 0.15, y: 0.25, size: 10 },
      { x: 0.4, y: 0.6, size: 12 },
      { x: 0.65, y: 0.35, size: 8 },
      { x: 0.85, y: 0.75, size: 11 }
    ],
    viewRadius: 50
  },
  {
    stars: [
      { x: 0.1, y: 0.3, size: 8 },
      { x: 0.3, y: 0.7, size: 10 },
      { x: 0.5, y: 0.15, size: 9 },
      { x: 0.7, y: 0.5, size: 11 },
      { x: 0.9, y: 0.8, size: 8 }
    ],
    viewRadius: 45
  },
  {
    stars: [
      { x: 0.08, y: 0.2, size: 7 },
      { x: 0.25, y: 0.55, size: 9 },
      { x: 0.42, y: 0.8, size: 8 },
      { x: 0.58, y: 0.35, size: 10 },
      { x: 0.75, y: 0.65, size: 7 },
      { x: 0.92, y: 0.25, size: 9 }
    ],
    viewRadius: 40
  }
];

export class TelescopeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private stars: Star[] = [];
  private viewX = 0;
  private viewY = 0;
  private viewRadius = 50;
  private skyArea = { x: 0, y: 0, width: 0, height: 0 };

  private currentLevel = 0;
  private starsFound = 0;
  private totalStars = 0;

  private isDragging = false;
  private backgroundStars: { x: number; y: number; size: number; twinkle: number }[] = [];

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';
  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.generateBackgroundStars();
  }

  private generateBackgroundStars() {
    this.backgroundStars = [];
    for (let i = 0; i < 100; i++) {
      this.backgroundStars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  private loadLevel(index: number) {
    const level = LEVELS[index % LEVELS.length];
    this.viewRadius = level.viewRadius;
    this.totalStars = level.stars.length;
    this.starsFound = 0;

    this.calculateLayout();

    this.stars = level.stars.map(s => ({
      x: this.skyArea.x + s.x * this.skyArea.width,
      y: this.skyArea.y + s.y * this.skyArea.height,
      size: s.size,
      brightness: 1,
      found: false
    }));

    this.viewX = this.canvas.width / 2;
    this.viewY = this.skyArea.y + this.skyArea.height / 2;

    this.notifyState();
  }

  private calculateLayout() {
    this.skyArea = {
      x: 20,
      y: 20,
      width: this.canvas.width - 40,
      height: this.canvas.height - 100
    };
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      this.isDragging = true;
      this.updateViewPosition(x, y);
    } else if (type === 'move' && this.isDragging) {
      this.updateViewPosition(x, y);
    } else if (type === 'up') {
      this.isDragging = false;
    }
  }

  private updateViewPosition(x: number, y: number) {
    // Clamp to sky area
    this.viewX = Math.max(this.skyArea.x + this.viewRadius,
      Math.min(this.skyArea.x + this.skyArea.width - this.viewRadius, x));
    this.viewY = Math.max(this.skyArea.y + this.viewRadius,
      Math.min(this.skyArea.y + this.skyArea.height - this.viewRadius, y));

    this.checkStarDiscovery();
  }

  private checkStarDiscovery() {
    for (const star of this.stars) {
      if (star.found) continue;

      const dx = star.x - this.viewX;
      const dy = star.y - this.viewY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.viewRadius * 0.5) {
        star.found = true;
        this.starsFound++;
        this.notifyState();

        if (this.starsFound >= this.totalStars) {
          this.status = 'won';
          this.notifyState();
        }
      }
    }
  }

  private loop = () => {
    this.draw();
    if (this.status === 'playing') {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Night sky background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a20');
    gradient.addColorStop(0.5, '#1a1a40');
    gradient.addColorStop(1, '#2a2a50');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background stars with twinkle
    const time = Date.now() / 1000;
    for (const star of this.backgroundStars) {
      const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
      const x = this.skyArea.x + star.x * this.skyArea.width;
      const y = this.skyArea.y + star.y * this.skyArea.height;

      this.ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.5})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw target stars (dim when not in view)
    for (const star of this.stars) {
      const dx = star.x - this.viewX;
      const dy = star.y - this.viewY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inView = dist < this.viewRadius;

      if (star.found) {
        // Found star - bright and marked
        this.drawFoundStar(star);
      } else if (inView) {
        // In telescope view - visible
        this.drawVisibleStar(star, dist);
      }
      // Not in view - invisible
    }

    // Draw telescope view circle
    this.drawTelescopeView();

    // Draw star map hint (bottom)
    this.drawStarMap();
  }

  private drawFoundStar(star: Star) {
    const time = Date.now() / 500;

    // Glow
    const gradient = this.ctx.createRadialGradient(
      star.x, star.y, 0,
      star.x, star.y, star.size * 3
    );
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Star
    this.ctx.fillStyle = '#ffd700';
    this.drawStarShape(star.x, star.y, star.size);

    // Checkmark
    this.ctx.strokeStyle = '#4caf50';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawVisibleStar(star: Star, distance: number) {
    const visibility = 1 - (distance / this.viewRadius);

    // Glow
    const gradient = this.ctx.createRadialGradient(
      star.x, star.y, 0,
      star.x, star.y, star.size * 2
    );
    gradient.addColorStop(0, `rgba(255, 255, 200, ${visibility})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 200, ${visibility * 0.5})`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Star
    this.ctx.fillStyle = `rgba(255, 255, 200, ${visibility})`;
    this.drawStarShape(star.x, star.y, star.size * visibility);
  }

  private drawStarShape(x: number, y: number, size: number) {
    const spikes = 4;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    this.ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawTelescopeView() {
    // Outer ring
    this.ctx.strokeStyle = '#4a4a6a';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(this.viewX, this.viewY, this.viewRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner circle (view area)
    this.ctx.strokeStyle = 'rgba(100, 149, 237, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.viewX, this.viewY, this.viewRadius * 0.5, 0, Math.PI * 2);
    this.ctx.stroke();

    // Crosshairs
    this.ctx.strokeStyle = 'rgba(100, 149, 237, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.viewX - this.viewRadius, this.viewY);
    this.ctx.lineTo(this.viewX + this.viewRadius, this.viewY);
    this.ctx.moveTo(this.viewX, this.viewY - this.viewRadius);
    this.ctx.lineTo(this.viewX, this.viewY + this.viewRadius);
    this.ctx.stroke();

    // Lens flare effect
    const gradient = this.ctx.createRadialGradient(
      this.viewX, this.viewY, 0,
      this.viewX, this.viewY, this.viewRadius
    );
    gradient.addColorStop(0, 'rgba(100, 149, 237, 0.1)');
    gradient.addColorStop(0.7, 'rgba(100, 149, 237, 0.05)');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.viewX, this.viewY, this.viewRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawStarMap() {
    const mapY = this.canvas.height - 60;
    const mapWidth = this.canvas.width - 40;
    const mapHeight = 40;
    const mapX = 20;

    // Map background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(mapX, mapY, mapWidth, mapHeight, 5);
    this.ctx.fill();

    // Map label
    this.ctx.fillStyle = '#888';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Star Map', mapX + 5, mapY + 12);

    // Star positions on map
    for (const star of this.stars) {
      const mapStarX = mapX + ((star.x - this.skyArea.x) / this.skyArea.width) * mapWidth;
      const mapStarY = mapY + 20 + ((star.y - this.skyArea.y) / this.skyArea.height) * 15;

      this.ctx.fillStyle = star.found ? '#ffd700' : '#555';
      this.ctx.beginPath();
      this.ctx.arc(mapStarX, mapStarY, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Current view position on map
    const viewMapX = mapX + ((this.viewX - this.skyArea.x) / this.skyArea.width) * mapWidth;
    const viewMapY = mapY + 20 + ((this.viewY - this.skyArea.y) / this.skyArea.height) * 15;

    this.ctx.strokeStyle = '#6495ed';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(viewMapX, viewMapY, 5, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    if (this.stars.length > 0) {
      this.loadLevel(this.currentLevel);
    }
    this.draw();
  }

  reset() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
  }

  nextLevel() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.loop();
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
        starsFound: this.starsFound,
        totalStars: this.totalStars
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
