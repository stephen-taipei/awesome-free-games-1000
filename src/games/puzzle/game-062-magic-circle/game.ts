export interface Ring {
  radius: number;
  segments: number;
  rotation: number;
  targetRotation: number;
  symbols: string[];
  color: string;
}

export interface Level {
  rings: number;
  segments: number[];
}

const LEVELS: Level[] = [
  { rings: 2, segments: [4, 4] },
  { rings: 3, segments: [4, 6, 4] },
  { rings: 3, segments: [6, 8, 6] },
  { rings: 4, segments: [4, 6, 8, 4] },
  { rings: 4, segments: [6, 8, 10, 6] },
];

const RUNE_SYMBOLS = [
  "\u16A0", "\u16A2", "\u16A6", "\u16A8", "\u16B1", "\u16B2", // Runic
  "\u16B7", "\u16B9", "\u16BA", "\u16BE", "\u16C1", "\u16C3",
  "\u2625", "\u2626", "\u2627", "\u2628", "\u2629", "\u262A", // Misc symbols
  "\u2721", "\u2638", "\u2608", "\u2609", "\u263D", "\u263E",
];

const RING_COLORS = [
  "#9b59b6",
  "#3498db",
  "#e74c3c",
  "#f1c40f",
  "#1abc9c",
];

export class MagicCircleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  rings: Ring[] = [];
  level: number = 1;
  currentLevel: Level;
  moves: number = 0;
  status: "playing" | "won" = "playing";

  animating: boolean = false;
  onStateChange: ((s: any) => void) | null = null;
  centerX: number = 0;
  centerY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.currentLevel = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.animating = false;
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.initRings();
    this.scramble();
    this.resize();
    this.draw();
    this.notifyChange();
  }

  private initRings() {
    this.rings = [];
    const baseRadius = 60;
    const ringWidth = 40;

    for (let i = 0; i < this.currentLevel.rings; i++) {
      const segments = this.currentLevel.segments[i];
      const symbols: string[] = [];

      for (let j = 0; j < segments; j++) {
        symbols.push(RUNE_SYMBOLS[(i * 7 + j) % RUNE_SYMBOLS.length]);
      }

      this.rings.push({
        radius: baseRadius + i * ringWidth,
        segments,
        rotation: 0,
        targetRotation: 0,
        symbols,
        color: RING_COLORS[i % RING_COLORS.length],
      });
    }
  }

  private scramble() {
    this.rings.forEach((ring) => {
      const rotations = Math.floor(Math.random() * ring.segments);
      ring.rotation = (rotations * 360) / ring.segments;
      ring.targetRotation = ring.rotation;
    });

    // Make sure at least one ring is not aligned
    if (this.rings.every((r) => r.rotation === 0)) {
      this.rings[0].rotation = 360 / this.rings[0].segments;
      this.rings[0].targetRotation = this.rings[0].rotation;
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing" || this.animating) return;

    const dist = Math.hypot(x - this.centerX, y - this.centerY);
    const ringWidth = 40;
    const baseRadius = 60;

    // Find which ring was clicked
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      const innerRadius = ring.radius - ringWidth / 2;
      const outerRadius = ring.radius + ringWidth / 2;

      if (dist >= innerRadius && dist <= outerRadius) {
        // Determine rotation direction based on click position
        const angle = Math.atan2(y - this.centerY, x - this.centerX);
        const rotateAmount = 360 / ring.segments;

        // Rotate clockwise
        ring.targetRotation = ring.rotation + rotateAmount;
        this.moves++;
        this.animateRotation(ring);
        this.notifyChange();
        break;
      }
    }
  }

  private animateRotation(ring: Ring) {
    this.animating = true;

    const animate = () => {
      const diff = ring.targetRotation - ring.rotation;

      if (Math.abs(diff) > 1) {
        ring.rotation += diff * 0.2;
        this.draw();
        requestAnimationFrame(animate);
      } else {
        ring.rotation = ring.targetRotation % 360;
        ring.targetRotation = ring.rotation;
        this.animating = false;
        this.draw();
        this.checkWin();
      }
    };

    animate();
  }

  private checkWin() {
    const aligned = this.rings.every((ring) => {
      const normalizedRotation = ((ring.rotation % 360) + 360) % 360;
      return normalizedRotation < 1 || normalizedRotation > 359;
    });

    if (aligned) {
      this.status = "won";
      this.notifyChange();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#1a0a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw mystical background
    this.drawBackground();

    // Draw rings from outer to inner
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.drawRing(this.rings[i], i);
    }

    // Draw center gem
    this.drawCenterGem();

    // Win effect
    if (this.status === "won") {
      this.drawWinEffect();
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const time = Date.now() / 2000;

    // Animated magical particles
    ctx.fillStyle = "rgba(155, 89, 182, 0.1)";
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2 + time;
      const radius = 50 + i * 3 + Math.sin(time * 2 + i) * 10;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      const size = 2 + Math.sin(time + i) * 1;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRing(ring: Ring, index: number) {
    const ctx = this.ctx;
    const ringWidth = 35;

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate((ring.rotation * Math.PI) / 180);

    // Ring background
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ringWidth;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Ring border
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius - ringWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius + ringWidth / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Symbols
    const segmentAngle = (Math.PI * 2) / ring.segments;
    ctx.font = "bold 18px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < ring.segments; i++) {
      const angle = i * segmentAngle;
      const x = Math.cos(angle) * ring.radius;
      const y = Math.sin(angle) * ring.radius;

      // Symbol glow
      ctx.fillStyle = ring.color;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 10;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(ring.symbols[i], 0, 0);
      ctx.restore();
    }

    ctx.shadowBlur = 0;

    // Segment dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i < ring.segments; i++) {
      const angle = i * segmentAngle + segmentAngle / 2;
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(angle) * (ring.radius - ringWidth / 2),
        Math.sin(angle) * (ring.radius - ringWidth / 2)
      );
      ctx.lineTo(
        Math.cos(angle) * (ring.radius + ringWidth / 2),
        Math.sin(angle) * (ring.radius + ringWidth / 2)
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawCenterGem() {
    const ctx = this.ctx;
    const time = Date.now() / 1000;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      0,
      this.centerX,
      this.centerY,
      40
    );
    gradient.addColorStop(0, "rgba(155, 89, 182, 0.8)");
    gradient.addColorStop(0.5, "rgba(155, 89, 182, 0.3)");
    gradient.addColorStop(1, "rgba(155, 89, 182, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Inner gem
    ctx.fillStyle = "#9b59b6";
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(this.centerX - 5, this.centerY - 5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing effect
    const pulse = Math.sin(time * 3) * 0.2 + 0.8;
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 25 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawWinEffect() {
    const ctx = this.ctx;
    const time = Date.now() / 500;

    // Magical burst
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#f1c40f";
    ctx.shadowBlur = 20;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time;
      const length = 100 + Math.sin(time * 2 + i) * 20;

      ctx.beginPath();
      ctx.moveTo(
        this.centerX + Math.cos(angle) * 50,
        this.centerY + Math.sin(angle) * 50
      );
      ctx.lineTo(
        this.centerX + Math.cos(angle) * length,
        this.centerY + Math.sin(angle) * length
      );
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  public reset() {
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        moves: this.moves,
        status: this.status,
      });
    }
  }
}
