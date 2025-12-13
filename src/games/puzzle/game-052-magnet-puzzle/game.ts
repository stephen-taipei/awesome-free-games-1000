export type Polarity = "N" | "S";

export interface MagneticPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  polarity: Polarity;
  isFixed: boolean;
  isGoal?: boolean;
}

interface LevelConfig {
  pieces: {
    x: number;
    y: number;
    polarity: Polarity;
    isFixed: boolean;
  }[];
  goals: { x: number; y: number }[];
}

const LEVELS: LevelConfig[] = [
  // Level 1 - Simple
  {
    pieces: [
      { x: 100, y: 200, polarity: "N", isFixed: true },
      { x: 300, y: 200, polarity: "S", isFixed: false },
    ],
    goals: [{ x: 500, y: 200 }],
  },
  // Level 2
  {
    pieces: [
      { x: 100, y: 150, polarity: "N", isFixed: true },
      { x: 100, y: 300, polarity: "S", isFixed: true },
      { x: 300, y: 225, polarity: "N", isFixed: false },
    ],
    goals: [{ x: 500, y: 225 }],
  },
  // Level 3
  {
    pieces: [
      { x: 150, y: 100, polarity: "N", isFixed: true },
      { x: 150, y: 350, polarity: "N", isFixed: true },
      { x: 450, y: 225, polarity: "S", isFixed: true },
      { x: 300, y: 225, polarity: "S", isFixed: false },
    ],
    goals: [{ x: 300, y: 100 }],
  },
  // Level 4
  {
    pieces: [
      { x: 100, y: 100, polarity: "N", isFixed: true },
      { x: 500, y: 100, polarity: "S", isFixed: true },
      { x: 100, y: 350, polarity: "S", isFixed: true },
      { x: 500, y: 350, polarity: "N", isFixed: true },
      { x: 300, y: 225, polarity: "N", isFixed: false },
      { x: 350, y: 225, polarity: "S", isFixed: false },
    ],
    goals: [
      { x: 200, y: 225 },
      { x: 450, y: 225 },
    ],
  },
];

export class MagnetPuzzleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  pieces: MagneticPiece[] = [];
  goals: { x: number; y: number }[] = [];
  currentLevel: number = 0;
  moves: number = 0;

  activeMagnet: MagneticPiece | null = null;
  status: "playing" | "won" = "playing";

  friction = 0.95;
  magnetStrength = 500;
  pieceRadius = 25;
  goalRadius = 30;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.activeMagnet = null;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: 0,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.pieces = [];
    this.goals = [...config.goals];

    for (let i = 0; i < config.pieces.length; i++) {
      const p = config.pieces[i];
      this.pieces.push({
        id: i,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        radius: this.pieceRadius,
        polarity: p.polarity,
        isFixed: p.isFixed,
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
    if (this.status !== "playing") return;

    // Apply magnetic forces
    for (const piece of this.pieces) {
      if (piece.isFixed) continue;

      let fx = 0;
      let fy = 0;

      for (const other of this.pieces) {
        if (piece.id === other.id) continue;
        if (!other.isFixed && this.activeMagnet !== other) continue;

        const dx = piece.x - other.x;
        const dy = piece.y - other.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);

        // Only apply force if this magnet is active
        if (this.activeMagnet === other) {
          const force = this.magnetStrength / (dist * dist);

          // Same polarity repels, opposite attracts
          const attract = piece.polarity !== other.polarity ? 1 : -1;

          fx += (attract * force * dx) / dist;
          fy += (attract * force * dy) / dist;
        }
      }

      piece.vx += fx * 0.016; // dt
      piece.vy += fy * 0.016;

      // Apply friction
      piece.vx *= this.friction;
      piece.vy *= this.friction;

      // Update position
      piece.x += piece.vx;
      piece.y += piece.vy;

      // Boundary collision
      if (piece.x - piece.radius < 0) {
        piece.x = piece.radius;
        piece.vx = -piece.vx * 0.5;
      }
      if (piece.x + piece.radius > this.canvas.width) {
        piece.x = this.canvas.width - piece.radius;
        piece.vx = -piece.vx * 0.5;
      }
      if (piece.y - piece.radius < 0) {
        piece.y = piece.radius;
        piece.vy = -piece.vy * 0.5;
      }
      if (piece.y + piece.radius > this.canvas.height) {
        piece.y = this.canvas.height - piece.radius;
        piece.vy = -piece.vy * 0.5;
      }
    }

    // Check win condition
    this.checkWin();
  }

  private checkWin() {
    const movablePieces = this.pieces.filter((p) => !p.isFixed);
    let allInGoals = true;

    for (const goal of this.goals) {
      const pieceInGoal = movablePieces.some((p) => {
        const dist = Math.hypot(p.x - goal.x, p.y - goal.y);
        return dist < this.goalRadius;
      });

      if (!pieceInGoal) {
        allInGoals = false;
        break;
      }
    }

    if (allInGoals && movablePieces.length >= this.goals.length) {
      // Check pieces are nearly stopped
      const allStopped = movablePieces.every(
        (p) => Math.hypot(p.vx, p.vy) < 0.5
      );

      if (allStopped) {
        this.status = "won";
        if (this.onStateChange) {
          this.onStateChange({
            status: "won",
            level: this.currentLevel + 1,
            moves: this.moves,
            hasNextLevel: this.currentLevel < LEVELS.length - 1,
          });
        }
      }
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked fixed magnet
    const clicked = this.pieces.find((p) => {
      if (!p.isFixed) return false;
      const dist = Math.hypot(p.x - x, p.y - y);
      return dist < p.radius + 10;
    });

    if (clicked) {
      if (this.activeMagnet === clicked) {
        this.activeMagnet = null;
      } else {
        this.activeMagnet = clicked;
        this.moves++;
        if (this.onStateChange) {
          this.onStateChange({ moves: this.moves });
        }
      }
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#2c3e50");
    gradient.addColorStop(1, "#34495e");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Grid pattern
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Draw goals
    for (const goal of this.goals) {
      this.ctx.beginPath();
      this.ctx.arc(goal.x, goal.y, this.goalRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = "#2ecc71";
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Goal glow
      const goalGradient = this.ctx.createRadialGradient(
        goal.x,
        goal.y,
        0,
        goal.x,
        goal.y,
        this.goalRadius
      );
      goalGradient.addColorStop(0, "rgba(46, 204, 113, 0.3)");
      goalGradient.addColorStop(1, "rgba(46, 204, 113, 0)");
      this.ctx.fillStyle = goalGradient;
      this.ctx.fill();
    }

    // Draw magnetic field lines from active magnet
    if (this.activeMagnet) {
      this.drawMagneticField(this.activeMagnet);
    }

    // Draw pieces
    for (const piece of this.pieces) {
      this.drawPiece(piece);
    }

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawMagneticField(magnet: MagneticPiece) {
    const lines = 8;
    for (let i = 0; i < lines; i++) {
      const angle = (Math.PI * 2 * i) / lines;
      const length = 60;

      this.ctx.beginPath();
      this.ctx.moveTo(
        magnet.x + Math.cos(angle) * magnet.radius,
        magnet.y + Math.sin(angle) * magnet.radius
      );
      this.ctx.lineTo(
        magnet.x + Math.cos(angle) * (magnet.radius + length),
        magnet.y + Math.sin(angle) * (magnet.radius + length)
      );

      this.ctx.strokeStyle =
        magnet.polarity === "N"
          ? "rgba(231, 76, 60, 0.5)"
          : "rgba(52, 152, 219, 0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private drawPiece(piece: MagneticPiece) {
    const { x, y, radius, polarity, isFixed } = piece;
    const isActive = this.activeMagnet === piece;

    // Shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.ellipse(x + 3, y + 3, radius, radius * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Magnet body
    const bodyGradient = this.ctx.createRadialGradient(
      x - radius / 3,
      y - radius / 3,
      0,
      x,
      y,
      radius
    );

    if (polarity === "N") {
      bodyGradient.addColorStop(0, isActive ? "#ff6b6b" : "#e74c3c");
      bodyGradient.addColorStop(1, isActive ? "#c0392b" : "#922b21");
    } else {
      bodyGradient.addColorStop(0, isActive ? "#74b9ff" : "#3498db");
      bodyGradient.addColorStop(1, isActive ? "#2980b9" : "#1a5276");
    }

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = bodyGradient;
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = isFixed ? "#f1c40f" : "rgba(255,255,255,0.3)";
    this.ctx.lineWidth = isFixed ? 3 : 2;
    this.ctx.stroke();

    // Polarity label
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 18px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(polarity, x, y);

    // Active indicator
    if (isActive) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
      this.ctx.strokeStyle = "#f1c40f";
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Highlight
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.beginPath();
    this.ctx.arc(x - radius / 3, y - radius / 3, radius / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
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
