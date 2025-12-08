export interface Position {
  x: number;
  y: number;
}

export interface Bubble {
  x: number;
  y: number;
  r: number; // row
  c: number; // col
  type: number; // color index
  active: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: number;
}

export interface GameState {
  score: number;
  highScore: number;
  level: number;
  status: "idle" | "playing" | "gameover" | "won";
}

export class BubbleShooter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Config
  private radius = 20;
  private diameter = 40;
  private rows = 12;
  private cols = 8; // Adjust based on hex packing
  private colors = [
    "#e74c3c",
    "#e67e22",
    "#f1c40f",
    "#2ecc71",
    "#3498db",
    "#9b59b6",
  ];

  // State
  private grid: (Bubble | null)[][] = [];
  private projectile: Projectile | null = null;
  private nextBubbleType: number = 0;
  private currentBubbleType: number = 0;

  private score = 0;
  private highScore = 0;
  private level = 1;
  private status: GameState["status"] = "idle";

  private animationId: number | null = null;
  private mousePos: Position = { x: 0, y: 0 };

  // Callbacks
  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    const saved = localStorage.getItem("bubble_highscore");
    if (saved) this.highScore = parseInt(saved, 10);

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Track mouse
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      // Calibrate radius to fit width
      // Grid width: (cols + 0.5) * diameter approx
      this.radius = Math.floor(this.canvas.width / ((this.cols + 0.5) * 2));
      this.diameter = this.radius * 2;
    }
  }

  public start() {
    this.score = 0;
    this.level = 1;
    this.status = "playing";

    this.initGrid();
    this.nextBubbleType = Math.floor(Math.random() * this.colors.length);
    this.currentBubbleType = Math.floor(Math.random() * this.colors.length);

    this.loop();
    this.notifyChange();
  }

  private initGrid() {
    this.grid = [];
    // Fill top rows
    const initialRows = 5;
    for (let r = 0; r < this.rows; r++) {
      const rowArr: (Bubble | null)[] = [];
      const colsInRow = r % 2 === 0 ? this.cols : this.cols - 1;

      for (let c = 0; c < colsInRow; c++) {
        if (r < initialRows) {
          const type = Math.floor(Math.random() * this.colors.length);
          const pos = this.getGridPosition(r, c);
          rowArr.push({
            r,
            c,
            type,
            x: pos.x,
            y: pos.y,
            active: true,
          });
        } else {
          rowArr.push(null);
        }
      }
      this.grid.push(rowArr);
    }
  }

  private getGridPosition(r: number, c: number): Position {
    // Hex Layout
    // Odd rows shifted by radius
    const offsetX = r % 2 === 0 ? 0 : this.radius;
    const x = c * this.diameter + this.radius + offsetX;
    // Vertical spacing: row * diameter * sin(60) approx => row * radius * sqrt(3) is tight packing
    // Actually row * (diameter - overlap)
    const y = r * (this.radius * Math.sqrt(3)) + this.radius;
    return { x, y };
  }

  private loop() {
    if (this.status !== "playing") return;

    this.update();
    this.render();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  public shoot() {
    if (this.status !== "playing" || this.projectile) return;

    const startX = this.canvas.width / 2;
    const startY = this.canvas.height - this.radius * 2;

    const angle = Math.atan2(
      this.mousePos.y - startY,
      this.mousePos.x - startX
    );
    const speed = 15;

    this.projectile = {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      type: this.currentBubbleType,
    };

    this.currentBubbleType = this.nextBubbleType;
    this.nextBubbleType = Math.floor(Math.random() * this.colors.length);
  }

  private update() {
    if (!this.projectile) return;

    // Move
    this.projectile.x += this.projectile.vx;
    this.projectile.y += this.projectile.vy;

    // Wall Bounce
    if (
      this.projectile.x < this.radius ||
      this.projectile.x > this.canvas.width - this.radius
    ) {
      this.projectile.vx *= -1;
      this.projectile.x = Math.max(
        this.radius,
        Math.min(this.canvas.width - this.radius, this.projectile.x)
      );
    }

    // Ceiling Collision
    if (this.projectile.y < this.radius) {
      this.snapProjectile();
      return;
    }

    // Bubble Collision
    for (let r = 0; r < this.rows; r++) {
      const colsInRow = this.grid[r].length;
      for (let c = 0; c < colsInRow; c++) {
        const b = this.grid[r][c];
        if (b && b.active) {
          const dx = this.projectile.x - b.x;
          const dy = this.projectile.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < this.diameter * 0.8) {
            // Collision threshold
            this.snapProjectile();
            return;
          }
        }
      }
    }
  }

  private snapProjectile() {
    if (!this.projectile) return;

    // Find nearest grid slot
    let bestR = -1,
      bestC = -1;
    let minTime = Infinity;

    // Simple scan of all potential slots
    // Optimization: just scan nearby based on position
    for (let r = 0; r < this.rows; r++) {
      const cols = r % 2 === 0 ? this.cols : this.cols - 1;
      for (let c = 0; c < cols; c++) {
        if (!this.grid[r][c]) {
          const pos = this.getGridPosition(r, c);
          const dx = this.projectile.x - pos.x;
          const dy = this.projectile.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.diameter) {
            if (dist < minTime) {
              minTime = dist;
              bestR = r;
              bestC = c;
            }
          }
        }
      }
    }

    if (bestR !== -1) {
      const pos = this.getGridPosition(bestR, bestC);
      this.grid[bestR][bestC] = {
        r: bestR,
        c: bestC,
        type: this.projectile.type,
        x: pos.x,
        y: pos.y,
        active: true,
      };
      this.processHit(bestR, bestC);
    } else {
      // Lost ball if somehow no proper slot (e.g. too low), usually Game Over check
      // For now just ignore
    }

    this.projectile = null;
    this.checkWinLoss();
  }

  private processHit(r: number, c: number) {
    const cluster = this.findCluster(r, c, this.grid[r][c]!.type);
    if (cluster.length >= 3) {
      // Remove
      let points = 0;
      cluster.forEach((b) => {
        this.grid[b.r][b.c] = null;
        points += 10;
      });
      this.score += points;

      // Check floating
      this.removeFloating();
    }
  }

  private findCluster(r: number, c: number, type: number): Bubble[] {
    const cluster: Bubble[] = [];
    const queue: Bubble[] = [this.grid[r][c]!];
    const visited = new Set<string>();
    visited.add(`${r},${c}`);

    while (queue.length > 0) {
      const curr = queue.pop()!;
      cluster.push(curr);

      const neighbors = this.getNeighbors(curr.r, curr.c);
      for (const n of neighbors) {
        if (n && n.active && n.type === type && !visited.has(`${n.r},${n.c}`)) {
          visited.add(`${n.r},${n.c}`);
          queue.push(n);
        }
      }
    }
    return cluster;
  }

  private removeFloating() {
    // Find all connected to ceiling (row 0)
    const connected = new Set<string>();
    const queue: Bubble[] = [];

    for (let c = 0; c < this.cols; c++) {
      if (this.grid[0][c]) {
        queue.push(this.grid[0][c]!);
        connected.add(`0,${c}`);
      }
    }

    while (queue.length > 0) {
      const curr = queue.pop()!;
      const neighbors = this.getNeighbors(curr.r, curr.c);
      for (const n of neighbors) {
        if (n && n.active && !connected.has(`${n.r},${n.c}`)) {
          connected.add(`${n.r},${n.c}`);
          queue.push(n);
        }
      }
    }

    // Remove unconnected
    let removed = 0;
    for (let r = 0; r < this.rows; r++) {
      const cols = this.grid[r].length;
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c] && !connected.has(`${r},${c}`)) {
          this.grid[r][c] = null;
          removed++;
        }
      }
    }
    if (removed > 0) this.score += removed * 20;
  }

  private getNeighbors(r: number, c: number): (Bubble | null)[] {
    const neighbors: (Bubble | null)[] = [];
    // Hex Offsets
    const isEven = r % 2 === 0;
    // Directions: [dr, dc]
    // Even row: (-1, -1), (-1, 0), (0, -1), (0, 1), (1, -1), (1, 0)
    // Odd row:  (-1, 0), (-1, 1), (0, -1), (0, 1), (1, 0), (1, 1)

    const offsets = isEven
      ? [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
        ]
      : [
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [1, 1],
        ];

    for (const off of offsets) {
      const nr = r + off[0];
      const nc = c + off[1];
      if (nr >= 0 && nr < this.rows) {
        const cols = nr % 2 === 0 ? this.cols : this.cols - 1;
        if (nc >= 0 && nc < cols) {
          if (this.grid[nr][nc]) neighbors.push(this.grid[nr][nc]);
        }
      }
    }
    return neighbors;
  }

  private checkWinLoss() {
    // If bottom row reached -> Game Over
    const lastRow = this.rows - 1;
    const len = this.grid[lastRow].length;
    for (let c = 0; c < len; c++) {
      if (this.grid[lastRow][c]) {
        this.status = "gameover";
        this.notifyChange();
        return;
      }
    }

    // If cleared -> Win
    let empty = true;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c]) {
          empty = false;
          break;
        }
      }
      if (!empty) break;
    }

    if (empty) {
      this.status = "won";
      this.notifyChange();
    }
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    for (let r = 0; r < this.rows; r++) {
      const cols = this.grid[r].length;
      for (let c = 0; c < cols; c++) {
        const b = this.grid[r][c];
        if (b && b.active) {
          this.drawBubble(b.x, b.y, b.type);
        }
      }
    }

    // Projectile
    if (this.projectile) {
      this.drawBubble(
        this.projectile.x,
        this.projectile.y,
        this.projectile.type
      );
    }

    // Shooter (Bottom Center)
    const startX = this.canvas.width / 2;
    const startY = this.canvas.height - this.radius * 2;

    // Guide line
    this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
    this.ctx.stroke();

    // Current Bubble
    if (!this.projectile) {
      this.drawBubble(startX, startY, this.currentBubbleType);
    }

    // Next Bubble Hint
    this.drawBubble(
      startX - this.diameter * 2,
      startY,
      this.nextBubbleType,
      0.5
    );
  }

  private drawBubble(x: number, y: number, type: number, scale = 1) {
    const r = this.radius * scale;
    this.ctx.fillStyle = this.colors[type];
    this.ctx.beginPath();
    this.ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Shine
    this.ctx.fillStyle = "rgba(255,255,255,0.4)";
    this.ctx.beginPath();
    this.ctx.arc(x - r / 3, y - r / 3, r / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        level: this.level,
        status: this.status,
      });
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("bubble_highscore", this.highScore.toString());
    }
  }
}
