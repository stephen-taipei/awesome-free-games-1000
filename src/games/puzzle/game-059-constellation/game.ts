export interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  brightness: number;
}

export interface Line {
  star1: number;
  star2: number;
}

export interface Constellation {
  name: string;
  nameKey: string;
  stars: { x: number; y: number; size: number }[];
  connections: [number, number][];
}

const CONSTELLATIONS: Constellation[] = [
  {
    name: "Big Dipper",
    nameKey: "constellation.bigDipper",
    stars: [
      { x: 0.2, y: 0.3, size: 3 },
      { x: 0.28, y: 0.28, size: 2.5 },
      { x: 0.38, y: 0.32, size: 2.5 },
      { x: 0.48, y: 0.38, size: 3 },
      { x: 0.55, y: 0.5, size: 2.5 },
      { x: 0.68, y: 0.52, size: 2.5 },
      { x: 0.75, y: 0.42, size: 3 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    name: "Orion",
    nameKey: "constellation.orion",
    stars: [
      { x: 0.35, y: 0.15, size: 3 },
      { x: 0.65, y: 0.15, size: 3 },
      { x: 0.3, y: 0.35, size: 2.5 },
      { x: 0.5, y: 0.4, size: 2 },
      { x: 0.7, y: 0.35, size: 2.5 },
      { x: 0.5, y: 0.5, size: 2 },
      { x: 0.5, y: 0.6, size: 2 },
      { x: 0.35, y: 0.8, size: 3 },
      { x: 0.65, y: 0.8, size: 3 },
    ],
    connections: [
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [3, 5],
      [5, 6],
      [6, 7],
      [6, 8],
    ],
  },
  {
    name: "Cassiopeia",
    nameKey: "constellation.cassiopeia",
    stars: [
      { x: 0.2, y: 0.4, size: 3 },
      { x: 0.35, y: 0.25, size: 2.5 },
      { x: 0.5, y: 0.4, size: 3 },
      { x: 0.65, y: 0.3, size: 2.5 },
      { x: 0.8, y: 0.45, size: 3 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "Leo",
    nameKey: "constellation.leo",
    stars: [
      { x: 0.25, y: 0.3, size: 3 },
      { x: 0.35, y: 0.2, size: 2.5 },
      { x: 0.45, y: 0.25, size: 2.5 },
      { x: 0.4, y: 0.4, size: 2 },
      { x: 0.3, y: 0.5, size: 2.5 },
      { x: 0.55, y: 0.5, size: 2 },
      { x: 0.7, y: 0.55, size: 3 },
      { x: 0.8, y: 0.65, size: 2.5 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [3, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    name: "Cygnus",
    nameKey: "constellation.cygnus",
    stars: [
      { x: 0.5, y: 0.15, size: 3 },
      { x: 0.5, y: 0.35, size: 2.5 },
      { x: 0.5, y: 0.55, size: 3 },
      { x: 0.3, y: 0.45, size: 2.5 },
      { x: 0.7, y: 0.45, size: 2.5 },
      { x: 0.5, y: 0.8, size: 2.5 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 5],
      [3, 1],
      [1, 4],
    ],
  },
  {
    name: "Scorpius",
    nameKey: "constellation.scorpius",
    stars: [
      { x: 0.2, y: 0.25, size: 2.5 },
      { x: 0.3, y: 0.3, size: 2.5 },
      { x: 0.4, y: 0.4, size: 3 },
      { x: 0.5, y: 0.5, size: 2.5 },
      { x: 0.55, y: 0.6, size: 2.5 },
      { x: 0.5, y: 0.7, size: 2.5 },
      { x: 0.4, y: 0.75, size: 2.5 },
      { x: 0.35, y: 0.65, size: 2 },
      { x: 0.6, y: 0.8, size: 2.5 },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [5, 8],
      [6, 7],
    ],
  },
];

export class ConstellationGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  stars: Star[] = [];
  playerLines: Line[] = [];
  targetLines: Line[] = [];

  level: number = 1;
  currentConstellation: Constellation;
  status: "playing" | "won" = "playing";
  showHint: boolean = false;

  dragging: boolean = false;
  dragStart: number | null = null;
  mouseX: number = 0;
  mouseY: number = 0;

  bgStars: { x: number; y: number; size: number; twinkle: number }[] = [];
  onStateChange: ((s: any) => void) | null = null;
  animationId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.currentConstellation = CONSTELLATIONS[0];
    this.generateBgStars();
  }

  private generateBgStars() {
    this.bgStars = [];
    for (let i = 0; i < 100; i++) {
      this.bgStars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  public start() {
    this.status = "playing";
    this.playerLines = [];
    this.showHint = false;
    this.currentConstellation = CONSTELLATIONS[(this.level - 1) % CONSTELLATIONS.length];

    this.initStars();
    this.targetLines = this.currentConstellation.connections.map(([a, b]) => ({
      star1: a,
      star2: b,
    }));

    this.resize();
    this.loop();
    this.notifyChange();
  }

  private initStars() {
    this.stars = this.currentConstellation.stars.map((s, i) => ({
      id: i,
      x: s.x,
      y: s.y,
      size: s.size,
      brightness: 0.7 + Math.random() * 0.3,
    }));
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  public handleMouseDown(x: number, y: number) {
    if (this.status !== "playing") return;

    const star = this.findStarAt(x, y);
    if (star !== null) {
      this.dragging = true;
      this.dragStart = star;
    }
  }

  public handleMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  public handleMouseUp(x: number, y: number) {
    if (!this.dragging || this.dragStart === null) return;

    const endStar = this.findStarAt(x, y);
    if (endStar !== null && endStar !== this.dragStart) {
      this.tryAddLine(this.dragStart, endStar);
    }

    this.dragging = false;
    this.dragStart = null;
  }

  private findStarAt(x: number, y: number): number | null {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const star of this.stars) {
      const sx = star.x * w;
      const sy = star.y * h;
      const dist = Math.hypot(x - sx, y - sy);
      if (dist < 20) {
        return star.id;
      }
    }
    return null;
  }

  private tryAddLine(star1: number, star2: number) {
    const [s1, s2] = star1 < star2 ? [star1, star2] : [star2, star1];

    // Check if line exists
    const exists = this.playerLines.some(
      (l) =>
        (l.star1 === s1 && l.star2 === s2) || (l.star1 === s2 && l.star2 === s1)
    );

    if (exists) {
      // Remove line
      this.playerLines = this.playerLines.filter(
        (l) =>
          !((l.star1 === s1 && l.star2 === s2) || (l.star1 === s2 && l.star2 === s1))
      );
    } else {
      // Add line
      this.playerLines.push({ star1: s1, star2: s2 });
    }

    this.checkWin();
    this.notifyChange();
  }

  private checkWin() {
    if (this.playerLines.length !== this.targetLines.length) return;

    const targetSet = new Set(
      this.targetLines.map((l) => {
        const [a, b] = l.star1 < l.star2 ? [l.star1, l.star2] : [l.star2, l.star1];
        return `${a}-${b}`;
      })
    );

    const playerSet = new Set(
      this.playerLines.map((l) => {
        const [a, b] = l.star1 < l.star2 ? [l.star1, l.star2] : [l.star2, l.star1];
        return `${a}-${b}`;
      })
    );

    const match =
      targetSet.size === playerSet.size &&
      [...targetSet].every((t) => playerSet.has(t));

    if (match) {
      this.status = "won";
      cancelAnimationFrame(this.animationId);
      this.draw();
      if (this.onStateChange) {
        this.onStateChange({ status: "won", level: this.level });
      }
    }
  }

  public toggleHint() {
    this.showHint = !this.showHint;
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() / 1000;

    // Clear
    ctx.fillStyle = "#0c0c1e";
    ctx.fillRect(0, 0, w, h);

    // Background stars
    this.bgStars.forEach((s) => {
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * 2 + s.twinkle));
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.5})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hint lines
    if (this.showHint) {
      ctx.strokeStyle = "rgba(241, 196, 15, 0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      this.targetLines.forEach((line) => {
        const s1 = this.stars[line.star1];
        const s2 = this.stars[line.star2];
        ctx.beginPath();
        ctx.moveTo(s1.x * w, s1.y * h);
        ctx.lineTo(s2.x * w, s2.y * h);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Player lines
    ctx.strokeStyle = this.status === "won" ? "#f1c40f" : "#3498db";
    ctx.lineWidth = 2;
    ctx.shadowBlur = this.status === "won" ? 15 : 5;
    ctx.shadowColor = this.status === "won" ? "#f1c40f" : "#3498db";
    this.playerLines.forEach((line) => {
      const s1 = this.stars[line.star1];
      const s2 = this.stars[line.star2];
      ctx.beginPath();
      ctx.moveTo(s1.x * w, s1.y * h);
      ctx.lineTo(s2.x * w, s2.y * h);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Dragging line
    if (this.dragging && this.dragStart !== null) {
      const s = this.stars[this.dragStart];
      ctx.strokeStyle = "rgba(52, 152, 219, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x * w, s.y * h);
      ctx.lineTo(this.mouseX, this.mouseY);
      ctx.stroke();
    }

    // Stars
    this.stars.forEach((star) => {
      const x = star.x * w;
      const y = star.y * h;
      const twinkle = 0.7 + 0.3 * Math.sin(time * 3 + star.id);
      const size = star.size * 3 * twinkle;

      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      gradient.addColorStop(0, `rgba(255, 255, 200, ${twinkle * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 150, ${twinkle * 0.3})`);
      gradient.addColorStop(1, "rgba(255, 255, 100, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  public reset() {
    cancelAnimationFrame(this.animationId);
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public getConstellationName(): string {
    return this.currentConstellation.nameKey;
  }

  public getLinesProgress(): string {
    return `${this.playerLines.length}/${this.targetLines.length}`;
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        constellation: this.currentConstellation.nameKey,
        lines: this.getLinesProgress(),
        status: this.status,
      });
    }
  }
}
