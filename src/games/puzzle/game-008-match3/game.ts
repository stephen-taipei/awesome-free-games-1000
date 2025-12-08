export interface Position {
  row: number;
  col: number;
}

export type GemType = 0 | 1 | 2 | 3 | 4 | 5; // 6 colors

export interface Gem {
  type: GemType;
  row: number;
  col: number;
  x: number; // visual x
  y: number; // visual y
  scale: number;
  alpha: number;
  isMatched: boolean;
}

export interface GameState {
  status: "idle" | "swapping" | "matching" | "falling" | "gameover";
  score: number;
  highScore: number;
  time: number;
}

export class Match3Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Config
  private rows = 8;
  private cols = 8;
  private gemSize = 0;
  private colors = [
    "#e74c3c",
    "#e67e22",
    "#f1c40f",
    "#2ecc71",
    "#3498db",
    "#9b59b6",
  ]; // Red, Orange, Yellow, Green, Blue, Purple

  // State
  private grid: (Gem | null)[][] = [];
  private selected: Position | null = null;
  private status: GameState["status"] = "idle";
  private animationId: number | null = null;
  private lastTime = 0;

  private score = 0;
  private highScore = 0;
  private timeLeft = 60;

  // Animation queues
  private falling: boolean = false;

  // Callbacks
  private onStateChange: ((state: GameState) => void) | null = null;
  private onGameOver: ((score: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Load High Score
    const saved = localStorage.getItem("match3_highscore");
    if (saved) this.highScore = parseInt(saved, 10);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      this.gemSize = Math.min(
        this.canvas.width / this.cols,
        this.canvas.height / this.rows
      );
      // Center grid
      this.render();
    }
  }

  public start() {
    this.initGrid();
    this.score = 0;
    this.timeLeft = 60;
    this.status = "idle";
    this.lastTime = performance.now();
    this.notifyChange();

    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.loop(this.lastTime);
  }

  private initGrid() {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: Gem[] = [];
      for (let c = 0; c < this.cols; c++) {
        let type: GemType;
        do {
          type = Math.floor(Math.random() * 6) as GemType;
        } while (
          (c >= 2 && row[c - 1].type === type && row[c - 2].type === type) ||
          (r >= 2 &&
            this.grid[r - 1][c]?.type === type &&
            this.grid[r - 2][c]?.type === type)
        );

        row.push(this.createGem(r, c, type));
      }
      this.grid.push(row);
    }
  }

  private createGem(r: number, c: number, type: GemType): Gem {
    return {
      type,
      row: r,
      col: c,
      x: c * this.gemSize,
      y: r * this.gemSize,
      scale: 1,
      alpha: 1,
      isMatched: false,
    };
  }

  private loop(timestamp: number) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    if (this.status !== "gameover") {
      this.animationId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  public updateTime(deltaSeconds: number) {} // Handled externally or here? Let's do externally for simplicity via main loop timer

  private update(dt: number) {
    if (this.status === "swapping" || this.status === "falling") {
      // Animate positions
      let moving = false;
      const speed = this.gemSize * 10; // pixels per second

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const gem = this.grid[r][c];
          if (gem) {
            const targetX = gem.col * this.gemSize;
            const targetY = gem.row * this.gemSize;

            // Lerp
            if (Math.abs(gem.x - targetX) > 1) {
              gem.x += (targetX - gem.x) * 0.2; // faster
              moving = true;
            } else {
              gem.x = targetX;
            }

            if (Math.abs(gem.y - targetY) > 1) {
              gem.y += (targetY - gem.y) * 0.2; // Gravity
              moving = true;
            } else {
              gem.y = targetY;
            }

            if (gem.scale < 1) {
              gem.scale += 0.1;
              moving = true;
            }
          }
        }
      }

      if (!moving) {
        if (this.status === "swapping") {
          // Check matches after swap
          this.checkMatches();
        } else if (this.status === "falling") {
          this.checkMatches();
        }
      }
    } else if (this.status === "matching") {
      // Animate scale down
      let animating = false;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const gem = this.grid[r][c];
          if (gem && gem.isMatched) {
            gem.scale -= 0.1;
            gem.alpha -= 0.1;
            if (gem.scale > 0) animating = true;
          }
        }
      }

      if (!animating) {
        this.removeMatched();
        this.fillHoles();
      }
    }
  }

  public handleInput(x: number, y: number) {
    if (this.status !== "idle") return;

    // Offset for centering
    const offsetX = (this.canvas.width - this.cols * this.gemSize) / 2;
    const offsetY = (this.canvas.height - this.rows * this.gemSize) / 2;

    const col = Math.floor((x - offsetX) / this.gemSize);
    const row = Math.floor((y - offsetY) / this.gemSize);

    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.selectGem(row, col);
    }
  }

  private selectGem(r: number, c: number) {
    if (!this.selected) {
      this.selected = { row: r, col: c };
      this.render();
    } else {
      const r1 = this.selected.row;
      const c1 = this.selected.col;

      // Check if adjacent
      if (Math.abs(r1 - r) + Math.abs(c1 - c) === 1) {
        this.swap(r1, c1, r, c);
        this.selected = null;
      } else {
        this.selected = { row: r, col: c }; // Update selection
      }
      this.render();
    }
  }

  private swap(r1: number, c1: number, r2: number, c2: number) {
    const g1 = this.grid[r1][c1];
    const g2 = this.grid[r2][c2];
    if (!g1 || !g2) return;

    // Swap data
    this.grid[r1][c1] = g2;
    this.grid[r2][c2] = g1;
    g1.row = r2;
    g1.col = c2;
    g2.row = r1;
    g2.col = c1;

    this.status = "swapping";

    // Check immediate validity? Typically we wait for animation end,
    // but to keep it simple: if no match, swap back.
    // We will do that in checkMatches() logic.
  }

  private checkMatches() {
    const matches: Gem[] = [];

    // Horizontal
    for (let r = 0; r < this.rows; r++) {
      let count = 1;
      for (let c = 1; c < this.cols; c++) {
        if (this.grid[r][c]?.type === this.grid[r][c - 1]?.type) {
          count++;
        } else {
          if (count >= 3) {
            for (let k = 0; k < count; k++)
              matches.push(this.grid[r][c - 1 - k]!);
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (let k = 0; k < count; k++)
          matches.push(this.grid[r][this.cols - 1 - k]!);
      }
    }

    // Vertical
    for (let c = 0; c < this.cols; c++) {
      let count = 1;
      for (let r = 1; r < this.rows; r++) {
        if (this.grid[r][c]?.type === this.grid[r - 1][c]?.type) {
          count++;
        } else {
          if (count >= 3) {
            for (let k = 0; k < count; k++)
              matches.push(this.grid[r - 1 - k][c]!);
          }
          count = 1;
        }
      }
      if (count >= 3) {
        for (let k = 0; k < count; k++)
          matches.push(this.grid[this.rows - 1][c]!);
      }
    }

    if (matches.length > 0) {
      // Remove duplicates
      const unique = [...new Set(matches)];
      unique.forEach((g) => (g.isMatched = true));
      this.score += unique.length * 10;
      this.notifyChange();
      this.status = "matching";
    } else {
      // Swap back if this was a swap action and no match found?
      // Need to track if previous state was swapping triggered by user or falling.
      // Simplified: Just idle.
      this.status = "idle";
    }
  }

  private removeMatched() {
    // Nullify matched
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]?.isMatched) {
          this.grid[r][c] = null;
        }
      }
    }
  }

  private fillHoles() {
    // Shift down
    for (let c = 0; c < this.cols; c++) {
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          // Find nearest above
          let found = false;
          for (let k = r - 1; k >= 0; k--) {
            if (this.grid[k][c] !== null) {
              this.grid[r][c] = this.grid[k][c];
              this.grid[k][c] = null;
              if (this.grid[r][c]) {
                this.grid[r][c]!.row = r;
                // Don't change x/y immediately to allow animation
              }
              found = true;
              break;
            }
          }
          if (!found) {
            // Generate new
            const type = Math.floor(Math.random() * 6) as GemType;
            const gem = this.createGem(r, c, type);
            gem.y = -this.gemSize; // Start above
            gem.scale = 0;
            this.grid[r][c] = gem;
          }
        }
      }
    }
    this.status = "falling";
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const offsetX = (this.canvas.width - this.cols * this.gemSize) / 2;
    const offsetY = (this.canvas.height - this.rows * this.gemSize) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // Draw Grid BG
    /* this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.fillRect(0, 0, this.cols * this.gemSize, this.rows * this.gemSize); */

    // Draw Gems
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const gem = this.grid[r][c];
        if (gem) {
          this.ctx.save();
          this.ctx.globalAlpha = gem.alpha;
          this.ctx.translate(
            gem.x + this.gemSize / 2,
            gem.y + this.gemSize / 2
          );
          this.ctx.scale(gem.scale, gem.scale);

          // Draw Gem Shape
          this.ctx.fillStyle = this.colors[gem.type];
          this.ctx.beginPath();
          // Rounded rect
          const s = this.gemSize * 0.8;
          this.ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.2);
          this.ctx.fill();

          // Shine
          this.ctx.fillStyle = "rgba(255,255,255,0.3)";
          this.ctx.beginPath();
          this.ctx.arc(-s / 4, -s / 4, s / 5, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.restore();
        }
      }
    }

    // Selection Box
    if (this.selected) {
      const { row, col } = this.selected;
      const gem = this.grid[row][col];
      if (gem) {
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
          gem.x + 2,
          gem.y + 2,
          this.gemSize - 4,
          this.gemSize - 4
        );
      }
    }

    this.ctx.restore();
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  public setOnGameOver(cb: (score: number) => void) {
    this.onGameOver = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        score: this.score,
        highScore: this.highScore,
        time: this.timeLeft,
      });
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("match3_highscore", this.highScore.toString());
    }
  }

  // Hint
  public getHint() {
    // Simple horizontal check for potential match...
  }

  public timeTick() {
    if (
      this.status !== "idle" &&
      this.status !== "swapping" &&
      this.status !== "matching" &&
      this.status !== "falling"
    )
      return;
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.notifyChange();
      if (this.timeLeft <= 0) {
        this.status = "gameover";
        this.notifyChange();
        if (this.onGameOver) this.onGameOver(this.score);
      }
    }
  }
}
