export class MazeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Config
  private cellSize = 20;
  private cols = 0;
  private rows = 0;

  // State
  private grid: boolean[][] = []; // true = wall, false = path? Or Cell objects.
  // Recursive Backtracker needs visited state.
  // Let's use Cell logic: Top, Right, Bottom, Left walls.

  private cells: Cell[][] = [];
  private player = { x: 0, y: 0 };
  private exit = { x: 0, y: 0 };

  private status: "playing" | "won" = "playing";
  private time = 0;
  private timerInterval: number | null = null;
  private onStateChange: ((s: any) => void) | null = null;

  // Input Handling
  private targetPos = { x: 0, y: 0 }; // For smooth movement or just grid jump?
  // Grid jump is classic.

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(difficulty: number) {
    // Difficulty = Cell Size (smaller = harder)
    this.cellSize = Math.max(10, 40 - difficulty);
    // Logic: Diff 10 (Easy) -> Size 30. Diff 20 (Hard) -> Size 20.

    // Resize canvas internal resolution to match display aspect or fixed?
    // Let's layout based on container size.
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.cols = Math.floor(this.canvas.width / this.cellSize);
    this.rows = Math.floor(this.canvas.height / this.cellSize);

    // Ensure odd dimensions for some algorithms?
    // Recursive backtracker works on graph.

    this.generateMaze();

    this.player = { x: 0, y: 0 };
    this.exit = { x: this.cols - 1, y: this.rows - 1 };

    this.status = "playing";
    this.time = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);

    this.draw();
    this.notify();
  }

  public reset() {
    this.start(20); // Default or remember last?
  }

  private generateMaze() {
    // Initialize grid with all walls
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.cols; x++) {
        row.push(new Cell(x, y));
      }
      this.cells.push(row);
    }

    // DFS
    const stack: Cell[] = [];
    const start = this.cells[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const next = this.getUnvisitedNeighbor(current);

      if (next) {
        next.visited = true;
        // Remove walls
        this.removeWalls(current, next);
        stack.push(next);
      } else {
        stack.pop();
      }
    }
  }

  private getUnvisitedNeighbor(cell: Cell): Cell | null {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !this.cells[y - 1][x].visited)
      neighbors.push(this.cells[y - 1][x]);
    if (y < this.rows - 1 && !this.cells[y + 1][x].visited)
      neighbors.push(this.cells[y + 1][x]);
    if (x > 0 && !this.cells[y][x - 1].visited)
      neighbors.push(this.cells[y][x - 1]);
    if (x < this.cols - 1 && !this.cells[y][x + 1].visited)
      neighbors.push(this.cells[y][x + 1]);

    if (neighbors.length > 0) {
      const r = Math.floor(Math.random() * neighbors.length);
      return neighbors[r];
    }
    return null;
  }

  private removeWalls(a: Cell, b: Cell) {
    const x = a.x - b.x;
    const y = a.y - b.y;

    if (x === 1) {
      a.walls.left = false;
      b.walls.right = false;
    } else if (x === -1) {
      a.walls.right = false;
      b.walls.left = false;
    }

    if (y === 1) {
      a.walls.top = false;
      b.walls.bottom = false;
    } else if (y === -1) {
      a.walls.bottom = false;
      b.walls.top = false;
    }
  }

  public move(dir: "up" | "down" | "left" | "right") {
    if (this.status !== "playing") return;

    const current = this.cells[this.player.y][this.player.x];
    let moved = false;

    if (dir === "up" && !current.walls.top) {
      this.player.y--;
      moved = true;
    } else if (dir === "down" && !current.walls.bottom) {
      this.player.y++;
      moved = true;
    } else if (dir === "left" && !current.walls.left) {
      this.player.x--;
      moved = true;
    } else if (dir === "right" && !current.walls.right) {
      this.player.x++;
      moved = true;
    }

    if (moved) {
      this.draw();
      this.checkWin();
    }
  }

  private checkWin() {
    if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.notify();
      this.draw(); // Draw final state
    }
  }

  private draw() {
    this.ctx.fillStyle = "#ecf0f1";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cs = this.cellSize;

    // Draw Cells
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 2;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.cells[y][x];
        const cx = x * cs;
        const cy = y * cs;

        this.ctx.beginPath();
        if (cell.walls.top) {
          this.ctx.moveTo(cx, cy);
          this.ctx.lineTo(cx + cs, cy);
        }
        if (cell.walls.right) {
          this.ctx.moveTo(cx + cs, cy);
          this.ctx.lineTo(cx + cs, cy + cs);
        }
        if (cell.walls.bottom) {
          this.ctx.moveTo(cx + cs, cy + cs);
          this.ctx.lineTo(cx, cy + cs);
        }
        if (cell.walls.left) {
          this.ctx.moveTo(cx, cy + cs);
          this.ctx.lineTo(cx, cy);
        }
        this.ctx.stroke();
      }
    }

    // Draw Exit
    this.ctx.fillStyle = "#2ecc71";
    this.ctx.fillRect(
      this.exit.x * cs + 4,
      this.exit.y * cs + 4,
      cs - 8,
      cs - 8
    );

    // Draw Player
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.beginPath();
    this.ctx.arc(
      this.player.x * cs + cs / 2,
      this.player.y * cs + cs / 2,
      cs / 3,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        time: this.time++,
        status: this.status,
      });
  }
}

class Cell {
  x: number;
  y: number;
  visited = false;
  walls = { top: true, right: true, bottom: true, left: true };

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
