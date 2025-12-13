export interface Domino {
  id: number;
  x: number;
  y: number;
  angle: number; // 0 = standing, 90 = fallen right, -90 = fallen left
  targetAngle: number;
  falling: boolean;
  fallen: boolean;
  color: string;
}

export interface Level {
  targetCount: number;
  obstacles: { x: number; y: number; width: number; height: number }[];
  targets: { x: number; y: number }[];
}

const LEVELS: Level[] = [
  {
    targetCount: 8,
    obstacles: [],
    targets: [{ x: 550, y: 350 }],
  },
  {
    targetCount: 10,
    obstacles: [{ x: 300, y: 150, width: 20, height: 100 }],
    targets: [{ x: 550, y: 350 }],
  },
  {
    targetCount: 12,
    obstacles: [
      { x: 200, y: 100, width: 20, height: 150 },
      { x: 400, y: 200, width: 20, height: 150 },
    ],
    targets: [{ x: 550, y: 100 }, { x: 550, y: 350 }],
  },
  {
    targetCount: 15,
    obstacles: [
      { x: 250, y: 50, width: 200, height: 20 },
      { x: 250, y: 180, width: 200, height: 20 },
      { x: 250, y: 310, width: 200, height: 20 },
    ],
    targets: [{ x: 550, y: 350 }],
  },
];

const DOMINO_WIDTH = 8;
const DOMINO_HEIGHT = 40;
const FALL_SPEED = 8;
const CHAIN_DISTANCE = 45;

export class DominoGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  dominoes: Domino[] = [];
  level: number = 1;
  currentLevel: Level;
  status: "placing" | "running" | "won" | "failed" = "placing";
  fallenCount: number = 0;
  targetsHit: number = 0;

  onStateChange: ((s: any) => void) | null = null;
  animationId: number = 0;

  colors = ["#ecf0f1", "#f1c40f", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c"];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.currentLevel = LEVELS[0];
  }

  public start() {
    this.status = "placing";
    this.dominoes = [];
    this.fallenCount = 0;
    this.targetsHit = 0;
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.resize();
    this.draw();
    this.notifyChange();
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "placing") return;
    if (this.dominoes.length >= this.currentLevel.targetCount) return;

    // Check if too close to another domino
    const tooClose = this.dominoes.some((d) => {
      const dist = Math.hypot(d.x - x, d.y - y);
      return dist < 20;
    });
    if (tooClose) return;

    // Check if inside obstacle
    const inObstacle = this.currentLevel.obstacles.some((o) => {
      return x > o.x && x < o.x + o.width && y > o.y && y < o.y + o.height;
    });
    if (inObstacle) return;

    this.dominoes.push({
      id: this.dominoes.length,
      x,
      y,
      angle: 0,
      targetAngle: 0,
      falling: false,
      fallen: false,
      color: this.colors[this.dominoes.length % this.colors.length],
    });

    this.draw();
    this.notifyChange();
  }

  public push() {
    if (this.status !== "placing" || this.dominoes.length === 0) return;

    this.status = "running";
    this.dominoes[0].falling = true;
    this.dominoes[0].targetAngle = 90;

    this.simulate();
  }

  private simulate = () => {
    if (this.status !== "running") return;

    let anyMoving = false;

    this.dominoes.forEach((domino) => {
      if (domino.falling && !domino.fallen) {
        anyMoving = true;

        // Animate falling
        const diff = domino.targetAngle - domino.angle;
        if (Math.abs(diff) > 1) {
          domino.angle += Math.sign(diff) * FALL_SPEED;
        } else {
          domino.angle = domino.targetAngle;
          domino.fallen = true;
          domino.falling = false;
          this.fallenCount++;
          this.notifyChange();

          // Check chain reaction
          this.checkChainReaction(domino);
        }
      }
    });

    // Check targets
    this.currentLevel.targets.forEach((target) => {
      const hit = this.dominoes.some((d) => {
        if (!d.fallen) return false;
        const dist = Math.hypot(d.x - target.x, d.y - target.y);
        return dist < 30;
      });
      if (hit) this.targetsHit++;
    });

    this.draw();

    if (anyMoving) {
      this.animationId = requestAnimationFrame(this.simulate);
    } else {
      // Check win/lose
      this.checkResult();
    }
  };

  private checkChainReaction(fallenDomino: Domino) {
    const fallDirection = Math.sign(fallenDomino.targetAngle);

    this.dominoes.forEach((other) => {
      if (other.id === fallenDomino.id || other.falling || other.fallen) return;

      // Calculate if this domino would hit the other
      const dx = other.x - fallenDomino.x;
      const dy = other.y - fallenDomino.y;
      const dist = Math.hypot(dx, dy);

      if (dist < CHAIN_DISTANCE) {
        // Determine fall direction based on relative position
        const angle = Math.atan2(dy, dx);
        const relativeAngle = angle * (180 / Math.PI);

        // Check if the falling domino would hit this one
        if (fallDirection > 0 && dx > 0) {
          other.falling = true;
          other.targetAngle = 90;
        } else if (fallDirection < 0 && dx < 0) {
          other.falling = true;
          other.targetAngle = -90;
        } else if (Math.abs(dx) < 20) {
          // Vertical chain
          other.falling = true;
          other.targetAngle = dy > 0 ? 90 : -90;
        }
      }
    });
  }

  private checkResult() {
    const allFallen = this.dominoes.every((d) => d.fallen);
    const allTargetsHit = this.targetsHit >= this.currentLevel.targets.length;

    if (allFallen && allTargetsHit) {
      this.status = "won";
    } else {
      this.status = "failed";
    }

    this.notifyChange();
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

    // Clear with wood texture
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#8b4513");
    gradient.addColorStop(1, "#654321");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw wood grain
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < h; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i + Math.sin(i * 0.1) * 5);
      ctx.stroke();
    }

    // Draw obstacles
    ctx.fillStyle = "#2c3e50";
    this.currentLevel.obstacles.forEach((o) => {
      ctx.fillRect(o.x, o.y, o.width, o.height);
    });

    // Draw targets
    ctx.fillStyle = "#27ae60";
    this.currentLevel.targets.forEach((t) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#27ae60";
    });

    // Draw dominoes
    this.dominoes.forEach((domino, index) => {
      ctx.save();
      ctx.translate(domino.x, domino.y);
      ctx.rotate((domino.angle * Math.PI) / 180);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(
        -DOMINO_WIDTH / 2 + 2,
        -DOMINO_HEIGHT + 2,
        DOMINO_WIDTH,
        DOMINO_HEIGHT
      );

      // Domino body
      ctx.fillStyle = domino.color;
      ctx.fillRect(-DOMINO_WIDTH / 2, -DOMINO_HEIGHT, DOMINO_WIDTH, DOMINO_HEIGHT);

      // Domino border
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 1;
      ctx.strokeRect(-DOMINO_WIDTH / 2, -DOMINO_HEIGHT, DOMINO_WIDTH, DOMINO_HEIGHT);

      // Dots
      ctx.fillStyle = "#2c3e50";
      const dots = (index % 6) + 1;
      const dotPositions: [number, number][] = [
        [0, -DOMINO_HEIGHT / 2], // center
        [-2, -DOMINO_HEIGHT + 8], // top
        [2, -8], // bottom
        [-2, -8], // bottom left
        [2, -DOMINO_HEIGHT + 8], // top right
        [-2, -DOMINO_HEIGHT / 2], // middle left
      ];

      for (let i = 0; i < Math.min(dots, dotPositions.length); i++) {
        ctx.beginPath();
        ctx.arc(dotPositions[i][0], dotPositions[i][1], 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // First domino indicator
      if (index === 0 && this.status === "placing") {
        ctx.fillStyle = "rgba(241, 196, 15, 0.5)";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Draw placement preview
    if (this.status === "placing" && this.dominoes.length < this.currentLevel.targetCount) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${this.dominoes.length}/${this.currentLevel.targetCount}`,
        w - 50,
        30
      );
    }
  }

  public reset() {
    cancelAnimationFrame(this.animationId);
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
        dominoes: `${this.dominoes.length}/${this.currentLevel.targetCount}`,
        fallen: this.fallenCount,
        status: this.status,
      });
    }
  }
}
