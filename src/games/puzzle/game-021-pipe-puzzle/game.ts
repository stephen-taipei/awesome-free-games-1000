export type PipeType =
  | "straight"
  | "elbow"
  | "cross"
  | "t"
  | "start"
  | "end"
  | "empty";

export interface Pipe {
  x: number;
  y: number;
  type: PipeType;
  rotation: number; // 0, 90, 180, 270
  active: boolean; // connected to start
  fixed?: boolean; // start/end are fixed
}

// Connectivity mask for 0 rotation [Top, Right, Bottom, Left]
const CONNECTIONS: Record<PipeType, boolean[]> = {
  straight: [true, false, true, false], // Top-Bottom
  elbow: [true, true, false, false], // Top-Right
  cross: [true, true, true, true],
  t: [true, true, true, false], // Top-Right-Bottom (Left open? No, T pointing Right usually means T junction)
  // Let's standardise: T shape usually 'Top, Right, Bottom' connected.
  start: [false, true, false, false], // Right
  end: [false, false, false, true], // Left
  empty: [false, false, false, false],
};

export class PipeGame {
  container: HTMLElement;
  grid: Pipe[][] = [];
  rows = 6;
  cols = 6;

  startPos = { x: 0, y: 0 };
  endPos = { x: 5, y: 5 };

  status: "playing" | "won" = "playing";
  time = 0;
  timerInterval: number | null = null;
  onStateChange: ((s: any) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public start() {
    this.status = "playing";
    this.time = 0;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);

    this.generateLevel();
    this.checkConnectivity();
    this.render();
    this.notify();
  }

  public reset() {
    this.start();
  }

  private generateLevel() {
    // Simple generation:
    // 1. Create path from Start to End.
    // 2. Fill rest with random pipes.
    // 3. Randomize rotations.

    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      const row: Pipe[] = [];
      for (let x = 0; x < this.cols; x++) {
        row.push({ x, y, type: "empty", rotation: 0, active: false });
      }
      this.grid.push(row);
    }

    // Random Walk for Solution Path
    let curr = { x: 0, y: 0 };
    this.startPos = { x: 0, y: 0 };
    this.endPos = { x: this.cols - 1, y: this.rows - 1 };

    this.grid[0][0] = {
      x: 0,
      y: 0,
      type: "start",
      rotation: 0,
      active: true,
      fixed: true,
    };
    this.grid[this.rows - 1][this.cols - 1] = {
      x: this.cols - 1,
      y: this.rows - 1,
      type: "end",
      rotation: 0,
      active: false,
      fixed: true,
    };

    // We construct a path logic?
    // Actually, ensuring a valid puzzle is tricky with just random walk.
    // Easier: Pre-generate a fully connected Grid (Spanning Tree), then cut edges?
    // Or simplified: Just Grid of random pieces, might be solvable.
    // Better: Valid Solvable Board.
    // Let's create a guaranteed path first.

    // Just fill with random for MVP and hope? No, frustrating.
    // Let's use Prim's or similar for MST to generate a "Perfect Maze" of pipes, then randomize rotation.
    // Since we have 'cross' and 't', loops are allowed.
    // Let's just fill with 'straight', 'elbow', 't', 'cross' randomly,
    // BUT ensuring at least ONE path exists is hard if completely random.

    // Algorithm:
    // 1. Generate a Maze (DFS).
    // 2. Convert Maze cells to Pipe Types based on walls.
    //    - 4 walls = empty (isolated)
    //    - 3 walls = end/tip
    //    - 2 walls = straight or elbow
    //    - 1 wall = T
    //    - 0 walls = Cross

    const maze = this.generateMazeStructure();

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (
          (x === 0 && y === 0) ||
          (x === this.cols - 1 && y === this.rows - 1)
        )
          continue;

        const neighbors = maze[y][x]; // [Top, Right, Bottom, Left] bools
        const count = neighbors.filter((b) => b).length;

        let type: PipeType = "empty";
        let rotation = 0;

        // Map connectivity to Type + Rotation
        // Determine pattern
        const [t, r, b, l] = neighbors;

        if (count === 4) type = "cross";
        else if (count === 3) {
          type = "t";
          // T default: Top,Right,Bottom (Left missing).
          // If t,r,b -> rot 0.
          // If r,b,l -> rot 90 (Right,Bottom,Left)
          // If b,l,t -> rot 180
          // If l,t,r -> rot 270
          if (!l) rotation = 0;
          else if (!t) rotation = 90;
          else if (!r) rotation = 180;
          else if (!b) rotation = 270;
        } else if (count === 2) {
          // Straight or Elbow
          if ((t && b) || (l && r)) {
            type = "straight";
            rotation = t && b ? 0 : 90;
          } else {
            type = "elbow";
            // Elbow default: Top-Right
            if (t && r) rotation = 0;
            else if (r && b) rotation = 90;
            else if (b && l) rotation = 180;
            else if (l && t) rotation = 270;
          }
        } else if (count === 1) {
          // Dead end / Tip. Should separate pipe type? Or just use 'straight' ending in wall?
          // Let's stick to using Elbow or Straight as dead ends visually?
          // Or define a Cap?
          // Actually, let's just make them Straight or Elbows that connect to nothing?
          // Or use 'start'/'end' graphics for dead ends? No.
          // Let's assume Dead Ends are just Straight pipes pointing to neighbor.
          type = "straight";
          if (t || b) rotation = 0;
          else rotation = 90;
        }

        this.grid[y][x] = { x, y, type, rotation, active: false };
      }
    }

    // NOW SHUFFLE ROTATIONS
    this.grid.forEach((row) => {
      row.forEach((p) => {
        if (!p.fixed && p.type !== "cross") {
          // Cross is symetric
          p.rotation = Math.floor(Math.random() * 4) * 90;
        }
      });
    });
  }

  private generateMazeStructure(): boolean[][][] {
    // Similar to Game 20, but returns connectivity per cell
    // [Top, Right, Bottom, Left]
    const w = this.cols;
    const h = this.rows;
    const visited = Array(h)
      .fill(false)
      .map(() => Array(w).fill(false));
    const cells = Array(h)
      .fill(null)
      .map(() =>
        Array(w)
          .fill(null)
          .map(() => [false, false, false, false])
      );

    const stack = [{ x: 0, y: 0 }];
    visited[0][0] = true;

    while (stack.length) {
      const curr = stack[stack.length - 1];
      const neighbors = [];

      // Directions: 0:Top, 1:Right, 2:Bottom, 3:Left
      const dirs = [
        { x: 0, y: -1, d: 0, op: 2 },
        { x: 1, y: 0, d: 1, op: 3 },
        { x: 0, y: 1, d: 2, op: 0 },
        { x: -1, y: 0, d: 3, op: 1 },
      ];

      dirs.forEach((dir) => {
        const nx = curr.x + dir.x;
        const ny = curr.y + dir.y;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
          neighbors.push({ x: nx, y: ny, dir });
        }
      });

      if (neighbors.length) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Connect
        cells[curr.y][curr.x][next.dir.d] = true;
        cells[next.y][next.x][next.dir.op] = true;

        visited[next.y][next.x] = true;
        stack.push({ x: next.x, y: next.y });

        // Randomly add loops? (Remove from stack randomly?)
        if (Math.random() < 0.1 && stack.length > 2) {
          // small chance to backtrack early to create branches
        }
      } else {
        stack.pop();
      }
    }

    // Add random loops (extra connections)
    // Iterate and add some connections between adjacent visited?
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * (w - 1));
      const y = Math.floor(Math.random() * (h - 1));
      // Try connecting right
      if (!cells[y][x][1]) {
        cells[y][x][1] = true;
        cells[y][x + 1][3] = true;
      }
    }

    return cells;
  }

  public rotatePipe(x: number, y: number) {
    if (this.status !== "playing") return;
    const p = this.grid[y][x];
    if (p.fixed) return;

    p.rotation = (p.rotation + 90) % 360;
    this.checkConnectivity();
    this.render(); // Or partial update
    this.checkWin();
  }

  private checkConnectivity() {
    // Reset active
    this.grid.forEach((r) => r.forEach((p) => (p.active = false)));

    // BFS from Start
    const q = [this.grid[this.startPos.y][this.startPos.x]];
    q[0].active = true;

    // Start is fixed Right.

    while (q.length) {
      const curr = q.shift()!;
      const conns = this.getConnections(curr); // [T, R, B, L] booleans based on rotation

      // Check neighbors
      const neighbors = [
        { x: curr.x, y: curr.y - 1, idx: 0, opp: 2 }, // Top
        { x: curr.x + 1, y: curr.y, idx: 1, opp: 3 }, // Right
        { x: curr.x, y: curr.y + 1, idx: 2, opp: 0 }, // Bottom
        { x: curr.x - 1, y: curr.y, idx: 3, opp: 1 }, // Left
      ];

      neighbors.forEach((n) => {
        // If current pipe outputs to this direction
        if (conns[n.idx]) {
          if (n.x >= 0 && n.x < this.cols && n.y >= 0 && n.y < this.rows) {
            const target = this.grid[n.y][n.x];
            // AND target pipe accepts from opposite direction
            const targetConns = this.getConnections(target);
            if (targetConns[n.opp] && !target.active) {
              target.active = true;
              q.push(target);
            }
          }
        }
      });
    }
  }

  private getConnections(p: Pipe): boolean[] {
    // Base connections
    const base = CONNECTIONS[p.type]; // [T, R, B, L]
    // Rotate array right by (rot/90) steps
    const steps = (p.rotation / 90) % 4;

    // e.g. steps = 1 (90deg). T becomes R. R becomes B.
    // [T, R, B, L] -> [L, T, R, B]
    // Slice logic:
    // shift right: [0,1,2,3] -> [3,0,1,2]

    const res = [...base];
    for (let i = 0; i < steps; i++) {
      res.unshift(res.pop()!);
    }
    return res;
  }

  private checkWin() {
    if (this.grid[this.endPos.y][this.endPos.x].active) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.notify();
    }
  }

  private render() {
    // This will be called by main.ts or we dispatch event?
    // Let's rely on event to triggering main render updates?
    // Or main calls render initially, and rotate calls render.
    // Better: Dispatch 'update' event with grid data.
    if (this.onStateChange)
      this.onStateChange({
        time: this.time,
        status: this.status,
        grid: this.grid,
      });
  }

  public notify() {
    if (this.onStateChange)
      this.onStateChange({
        time: this.time++,
        status: this.status,
        grid: this.grid,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
