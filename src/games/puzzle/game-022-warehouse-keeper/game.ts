export enum Tile {
  Empty = 0,
  Wall = 1,
  Target = 2,
}

export enum Entity {
  None = 0,
  Player = 1,
  Crate = 2,
}

interface Pos {
  x: number;
  y: number;
}

interface GameState {
  player: Pos;
  crates: Pos[];
}

const LEVELS = [
  // Level 1
  [
    "  ##### ",
    "  #   # ",
    "  #$  # ",
    "###  $##",
    "#  $ $ #",
    "# # . ##",
    "#   .  #",
    "#####  #",
    "    ####",
  ],
  // Add more... #=Wall, $=Crate, .=Target, @=Player, +=Player on Target, *=Crate on Target
];
// Wait, classic format:
// #: Wall, @: Player, +: Player on Goal, $: Box, *: Box on Goal, .: Goal, Score is space?

const CLASSIC_LEVELS = [
  [
    "    #####",
    "    #   #",
    "    #$  #",
    "  ###  $##",
    "  #  $ $ #",
    "### # . ##",
    "#   # .  #",
    "#   #####",
    "#####",
  ].map((s) => s.replace(/$/g, " ")), // Ensure proper padding? Parsing handles it.

  // A simpler one for test
  ["#####", "#@$.#", "#####"],
];

export class WarehouseGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Config
  tileSize = 40;

  // State
  grid: Tile[][] = [];
  playerPos: Pos = { x: 0, y: 0 };
  crates: Pos[] = [];
  targets: Pos[] = [];

  // History
  history: GameState[] = [];

  levelIndex = 0;
  status: "playing" | "won" = "playing";
  moves = 0;
  time = 0;
  timerInterval: number | null = null;
  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public loadLevel(idx: number) {
    if (idx >= CLASSIC_LEVELS.length) idx = 0;
    this.levelIndex = idx;

    // Parse Lvl
    // Hardcoded simple level 1 replacement for robustness
    const raw = [
      "  ##### ",
      "###   # ",
      "# @$  # ",
      "### $.# ",
      "#.##$ # ",
      "# # . ##",
      "#$ *.  #",
      "#   .  #",
      "########",
    ];

    this.parseLevel(raw);

    this.history = [];
    this.moves = 0;
    this.time = 0;
    this.status = "playing";
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);

    this.draw();
    this.notify();
  }

  private parseLevel(rows: string[]) {
    this.grid = [];
    this.crates = [];
    this.targets = [];
    this.playerPos = { x: 0, y: 0 };

    rows.forEach((rowStr, y) => {
      const row: Tile[] = [];
      for (let x = 0; x < rowStr.length; x++) {
        const char = rowStr[x];
        let tile = Tile.Empty;

        if (char === "#") tile = Tile.Wall;
        else if (char === ".") {
          tile = Tile.Target;
          this.targets.push({ x, y });
        } else if (char === "$") {
          this.crates.push({ x, y });
        } else if (char === "*") {
          tile = Tile.Target;
          this.targets.push({ x, y });
          this.crates.push({ x, y });
        } else if (char === "@") {
          this.playerPos = { x, y };
        } else if (char === "+") {
          tile = Tile.Target;
          this.targets.push({ x, y });
          this.playerPos = { x, y };
        }

        row.push(tile);
      }
      this.grid.push(row);
    });

    // Resize canvas
    this.canvas.width = rows[0].length * this.tileSize;
    this.canvas.height = rows.length * this.tileSize;
  }

  public move(dx: number, dy: number) {
    if (this.status !== "playing") return;

    const nextX = this.playerPos.x + dx;
    const nextY = this.playerPos.y + dy;

    // Check bounds
    if (!this.isValid(nextX, nextY)) return;

    // Check Wall
    if (this.grid[nextY][nextX] === Tile.Wall) return;

    // Check Crate
    const crateIdx = this.crates.findIndex(
      (c) => c.x === nextX && c.y === nextY
    );

    if (crateIdx !== -1) {
      // Pushing crate
      const pushX = nextX + dx;
      const pushY = nextY + dy;

      // Can push?
      // Check Wall
      if (!this.isValid(pushX, pushY) || this.grid[pushY][pushX] === Tile.Wall)
        return;
      // Check Other Crate
      if (this.crates.some((c) => c.x === pushX && c.y === pushY)) return;

      // Save State
      this.pushHistory();

      // Move Crate
      this.crates[crateIdx].x = pushX;
      this.crates[crateIdx].y = pushY;

      // Move Player
      this.playerPos.x = nextX;
      this.playerPos.y = nextY;
      this.moves++;

      this.draw();
      this.checkWin();
    } else {
      // Just Move
      this.pushHistory();
      this.playerPos.x = nextX;
      this.playerPos.y = nextY;
      this.moves++;
      this.draw();
    }
  }

  private isValid(x: number, y: number) {
    return y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length;
  }

  private pushHistory() {
    this.history.push({
      player: { ...this.playerPos },
      crates: this.crates.map((c) => ({ ...c })),
    });
    if (this.history.length > 50) this.history.shift();
  }

  public undo() {
    if (this.history.length === 0 || this.status !== "playing") return;
    const state = this.history.pop()!;
    this.playerPos = state.player;
    this.crates = state.crates;
    this.moves--; // Keep time running? Yes.
    this.draw();
  }

  public reset() {
    this.loadLevel(this.levelIndex);
  }

  private checkWin() {
    // All crates on targets?
    // Simple count check not enough if multiples.
    // Check every crate matches A target
    const allOnTarget = this.crates.every((c) =>
      this.targets.some((t) => t.x === c.x && t.y === c.y)
    );

    if (allOnTarget) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.notify();
    }
    this.notify();
  }

  private draw() {
    this.ctx.fillStyle = "#34495e";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const ts = this.tileSize;

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const type = this.grid[y][x];
        const px = x * ts;
        const py = y * ts;

        // Ground
        this.ctx.fillStyle = "#95a5a6";
        if (type !== Tile.Wall) this.ctx.fillRect(px, py, ts, ts);

        if (type === Tile.Wall) {
          this.ctx.fillStyle = "#7f8c8d";
          this.ctx.fillRect(px, py, ts, ts);
          // Detail
          this.ctx.strokeStyle = "#2c3e50";
          this.ctx.strokeRect(px, py, ts, ts);
        } else if (type === Tile.Target) {
          this.ctx.fillStyle = "#e74c3c";
          this.ctx.beginPath();
          this.ctx.arc(px + ts / 2, py + ts / 2, 5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Draw Crates
    this.crates.forEach((c) => {
      const px = c.x * ts;
      const py = c.y * ts;
      // Check if on target
      const onTarget = this.targets.some((t) => t.x === c.x && t.y === c.y);

      this.ctx.fillStyle = onTarget ? "#2ecc71" : "#f1c40f";
      this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
      // X pattern
      this.ctx.strokeStyle = "#d35400";
      this.ctx.beginPath();
      this.ctx.moveTo(px + 2, py + 2);
      this.ctx.lineTo(px + ts - 2, py + ts - 2);
      this.ctx.moveTo(px + ts - 2, py + 2);
      this.ctx.lineTo(px + 2, py + ts - 2);
      this.ctx.stroke();
    });

    // Draw Player
    const px = this.playerPos.x * ts;
    const py = this.playerPos.y * ts;
    this.ctx.fillStyle = "#3498db";
    this.ctx.beginPath();
    this.ctx.arc(px + ts / 2, py + ts / 2, ts / 3, 0, Math.PI * 2);
    this.ctx.fill();
    // Face
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(px + ts / 2 - 2, py + ts / 3, 4, 4);
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        moves: this.moves,
        time: this.time++,
        status: this.status,
        level: this.levelIndex + 1,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
