export interface Position {
  r: number;
  c: number;
}

export interface Tile {
  id: number; // type ID (e.g. 1-30)
  r: number;
  c: number;
  x: number;
  y: number;
  visible: boolean;
  selected: boolean;
}

export interface GameState {
  score: number;
  pairsLeft: number;
  time: number;
  hints: number;
  shuffles: number;
  status: "idle" | "playing" | "gameover" | "won";
}

export class MahjongConnect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Config
  private rows = 8;
  private cols = 14;
  private tileSize = 0;
  private types = 25; // number of distinct tile images/types

  // Limits
  private timeLimit = 180; // seconds
  private hintCount = 3;
  private shuffleCount = 3;

  // State
  private grid: (Tile | null)[][] = [];
  private selected: Tile | null = null;
  private startTime: number = 0;
  private currentTime: number = 0;
  private score: number = 0;
  private animationId: number | null = null;
  private hintsLine: Position[] | null = null;
  private status: GameState["status"] = "idle";

  // Callbacks
  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      // Add padding (invisible border) for pathfinding outside
      this.tileSize = Math.floor(
        Math.min(
          this.canvas.width / (this.cols + 2),
          this.canvas.height / (this.rows + 2)
        )
      );
      this.render();
    }
  }

  public start() {
    this.status = "playing";
    this.score = 0;
    this.hintCount = 3;
    this.shuffleCount = 3;
    this.startTime = Date.now();
    this.currentTime = this.timeLimit;
    this.hintsLine = null;

    this.initLevel();
    this.loop();
    this.notifyChange();
  }

  private initLevel() {
    // Total tiles must be even
    const total = this.rows * this.cols;
    const pairs = total / 2;
    const tiles: number[] = [];

    for (let i = 0; i < pairs; i++) {
      const type = (i % this.types) + 1;
      tiles.push(type, type);
    }

    // Shuffle types
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    this.grid = [];
    // The grid includes a border of nulls for pathfinding
    // Actual grid is from (1,1) to (rows, cols)
    // Internal Grid size is (rows+2) x (cols+2)

    let idx = 0;
    for (let r = 0; r < this.rows + 2; r++) {
      const row: (Tile | null)[] = [];
      for (let c = 0; c < this.cols + 2; c++) {
        if (r === 0 || r === this.rows + 1 || c === 0 || c === this.cols + 1) {
          row.push(null);
        } else {
          const type = tiles[idx++];
          row.push({
            id: type,
            r,
            c,
            x: 0,
            y: 0,
            visible: true,
            selected: false,
          });
        }
      }
      this.grid.push(row);
    }

    // Check if solvers exist, if not shuffle
    if (!this.hasAnyMove()) {
      this.shuffle(false);
    }
  }

  private loop() {
    if (this.status !== "playing") return;

    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    this.currentTime = Math.max(0, Math.ceil(this.timeLimit - elapsed));

    this.render();
    this.notifyChange();

    if (this.currentTime <= 0) {
      this.status = "gameover";
      this.render();
      this.notifyChange();
    } else {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  public handleInput(x: number, y: number) {
    if (this.status !== "playing") return;

    // Offset
    const totalW = (this.cols + 2) * this.tileSize;
    const totalH = (this.rows + 2) * this.tileSize;
    const offsetX = (this.canvas.width - totalW) / 2;
    const offsetY = (this.canvas.height - totalH) / 2;

    const c = Math.floor((x - offsetX) / this.tileSize);
    const r = Math.floor((y - offsetY) / this.tileSize);

    if (r >= 1 && r <= this.rows && c >= 1 && c <= this.cols) {
      const tile = this.grid[r][c];
      if (tile && tile.visible) {
        this.selectTile(tile);
      }
    }
  }

  private selectTile(tile: Tile) {
    if (!this.selected) {
      this.selected = tile;
      tile.selected = true;
      this.hintsLine = null; // Clear hint if any
    } else {
      if (this.selected === tile) {
        // Deselect
        tile.selected = false;
        this.selected = null;
      } else {
        if (this.selected.id === tile.id) {
          // Check Path
          const path = this.findPath(this.selected, tile);
          if (path) {
            // Match!
            this.score += 10 + Math.floor(this.currentTime / 10);
            this.selected.visible = false;
            tile.visible = false;
            this.selected.selected = false;
            this.selected = null;

            // Draw path briefly
            this.hintsLine = path;
            setTimeout(() => {
              this.hintsLine = null;
            }, 500);

            // Check empty
            if (this.getPairsLeft() === 0) {
              this.status = "won";
            } else {
              // Check moves
              if (!this.hasAnyMove()) {
                this.shuffle(false);
              }
            }
          } else {
            // Invalid path
            this.selected.selected = false;
            this.selected = tile;
            tile.selected = true;
            // Shake effect?
          }
        } else {
          this.selected.selected = false;
          this.selected = tile;
          tile.selected = true;
        }
      }
    }
    this.render();
  }

  // BFS with turn limit (max 2 turns = 3 segments)
  private findPath(t1: Position, t2: Position): Position[] | null {
    // Start, End
    if (t1.r === t2.r && t1.c === t2.c) return null;

    // Directions: Up, Down, Left, Right
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    // Queue: { pos, dir_index, turns, path }
    // We need to visit nodes. State space: (r, c, incoming_dir)
    // Optimization: simple BFS is enough because graph is small

    const queue: {
      r: number;
      c: number;
      dir: number;
      turns: number;
      path: Position[];
    }[] = [];
    const visited = new Set<string>(); // "r,c,dir"

    // Initial moves from t1
    for (let i = 0; i < 4; i++) {
      const nr = t1.r + dirs[i].dr;
      const nc = t1.c + dirs[i].dc;
      if (this.isValid(nr, nc) || (nr === t2.r && nc === t2.c)) {
        queue.push({
          r: nr,
          c: nc,
          dir: i,
          turns: 0,
          path: [
            { r: t1.r, c: t1.c },
            { r: nr, c: nc },
          ],
        });
        visited.add(`${nr},${nc},${i}`);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;

      // Reached target?
      if (curr.r === t2.r && curr.c === t2.c) {
        return curr.path;
      }

      // Blocked? (Target is blocked by tile but we allowed entering it above)
      // But intermediate steps must be empty (null or !visible)
      const tile = this.grid[curr.r][curr.c];
      if (tile && tile.visible) continue;

      // Next moves
      for (let i = 0; i < 4; i++) {
        const nr = curr.r + dirs[i].dr;
        const nc = curr.c + dirs[i].dc;

        // If out of bounds
        if (nr < 0 || nr >= this.rows + 2 || nc < 0 || nc >= this.cols + 2)
          continue;

        const newTurns = curr.dir === i ? curr.turns : curr.turns + 1;

        if (newTurns <= 2) {
          const key = `${nr},${nc},${i}`;
          // We can re-visit node if we come with fewer turns? BFS guarantees shortest 'distance' not turns.
          // Actually for "min turns", BFS works if edge weight is 0 for straight, 1 for turn.
          // Standard BFS treats all edges 1.
          // Since max turns is small (2), normal BFS exploring all valid states is fine.

          if (!visited.has(key)) {
            visited.add(key);
            // Check if passable (empty or is target)
            const isTarget = nr === t2.r && nc === t2.c;
            const isPassable =
              !this.grid[nr][nc] || !this.grid[nr][nc]!.visible;

            if (isTarget || isPassable) {
              queue.push({
                r: nr,
                c: nc,
                dir: i,
                turns: newTurns,
                path: [...curr.path, { r: nr, c: nc }],
              });
            }
          }
        }
      }
    }

    return null;
  }

  private isValid(r: number, c: number): boolean {
    return r >= 0 && r < this.rows + 2 && c >= 0 && c < this.cols + 2;
  }

  public getPairsLeft(): number {
    let count = 0;
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        if (this.grid[r][c]?.visible) count++;
      }
    }
    return count / 2;
  }

  // Hint
  public useHint() {
    if (this.hintCount <= 0 || this.status !== "playing") return;

    const move = this.findAnyMove();
    if (move) {
      this.hintCount--;
      this.hintsLine = move.path;
      setTimeout(() => {
        this.hintsLine = null;
      }, 1000);
      this.notifyChange();
    }
  }

  // Shuffle
  public shuffle(cost = true) {
    if (cost) {
      if (this.shuffleCount <= 0 || this.status !== "playing") return;
      this.shuffleCount--;
    }

    // Collect visible types
    const visibleTiles: Tile[] = [];
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        if (this.grid[r][c]?.visible) {
          visibleTiles.push(this.grid[r][c]!);
        }
      }
    }

    // Shuffle types ONLY, keep positions
    const types = visibleTiles.map((t) => t.id);
    // Fisher-Yates
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    // Re-assign
    visibleTiles.forEach((t, i) => {
      t.id = types[i];
      t.selected = false;
    });

    if (this.selected) {
      this.selected.selected = false;
      this.selected = null;
    }

    this.notifyChange();
    this.render();
  }

  private findAnyMove(): { t1: Tile; t2: Tile; path: Position[] } | null {
    const visibleTiles: Tile[] = [];
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        if (this.grid[r][c]?.visible) visibleTiles.push(this.grid[r][c]!);
      }
    }

    for (let i = 0; i < visibleTiles.length; i++) {
      for (let j = i + 1; j < visibleTiles.length; j++) {
        if (visibleTiles[i].id === visibleTiles[j].id) {
          const path = this.findPath(visibleTiles[i], visibleTiles[j]);
          if (path) return { t1: visibleTiles[i], t2: visibleTiles[j], path };
        }
      }
    }
    return null;
  }

  private hasAnyMove(): boolean {
    return this.findAnyMove() !== null;
  }

  public reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const totalW = (this.cols + 2) * this.tileSize;
    const totalH = (this.rows + 2) * this.tileSize;
    const offsetX = (this.canvas.width - totalW) / 2;
    const offsetY = (this.canvas.height - totalH) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // Grid
    for (let r = 1; r <= this.rows; r++) {
      for (let c = 1; c <= this.cols; c++) {
        const tile = this.grid[r][c];
        if (tile && tile.visible) {
          const x = c * this.tileSize;
          const y = r * this.tileSize;

          // Box
          this.ctx.fillStyle = tile.selected ? "#fffcd2" : "#f0f0f0";
          this.ctx.fillRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);

          this.ctx.strokeStyle = tile.selected ? "#e74c3c" : "#bdc3c7";
          this.ctx.lineWidth = tile.selected ? 3 : 1;
          this.ctx.strokeRect(
            x + 2,
            y + 2,
            this.tileSize - 4,
            this.tileSize - 4
          );

          // Content (Symbol, Number, or Color)
          // Just use text/emoji for simplicity or colored shape
          this.drawTileContent(x, y, tile.id);
        }
      }
    }

    // Hint Line
    if (this.hintsLine) {
      this.ctx.strokeStyle = "#e74c3c";
      this.ctx.lineWidth = 5;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.beginPath();
      const start = this.hintsLine[0];
      this.ctx.moveTo(
        start.c * this.tileSize + this.tileSize / 2,
        start.r * this.tileSize + this.tileSize / 2
      );
      for (let i = 1; i < this.hintsLine.length; i++) {
        const p = this.hintsLine[i];
        this.ctx.lineTo(
          p.c * this.tileSize + this.tileSize / 2,
          p.r * this.tileSize + this.tileSize / 2
        );
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawTileContent(x: number, y: number, id: number) {
    // Simple visuals: Colors or Icons
    // Use emojis for diversity
    const emojis = [
      "🍎",
      "🍌",
      "🍇",
      "🍓",
      "🍒",
      "🍑",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🥑",
      "🍆",
      "🥔",
      "🥕",
      "🌽",
      "🥦",
      "🍄",
      "🥜",
      "🍞",
      "🥐",
      "🧀",
      "🍖",
      "🍗",
      "🍔",
      "🍟",
    ];
    const emoji = emojis[(id - 1) % emojis.length];

    this.ctx.font = `${this.tileSize * 0.6}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "black";
    this.ctx.fillText(emoji, x + this.tileSize / 2, y + this.tileSize / 2 + 2);
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        pairsLeft: this.getPairsLeft(),
        time: Math.ceil(this.currentTime),
        hints: this.hintCount,
        shuffles: this.shuffleCount,
        status: this.status,
      });
    }
  }
}
