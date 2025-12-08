export interface Point {
  x: number;
  y: number;
}

export interface LevelData {
  nodes: Point[];
  edges: [number, number][]; // indices of nodes
}

export interface GameState {
  level: number;
  progress: number; // 0-100
  status: "idle" | "playing" | "won";
}

const LEVELS: LevelData[] = [
  // Level 1: Triangle
  {
    nodes: [
      { x: 0.5, y: 0.2 },
      { x: 0.2, y: 0.8 },
      { x: 0.8, y: 0.8 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  },
  // Level 2: Square with cross
  {
    nodes: [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 2],
      [1, 3],
    ], // Note: This might not be Eulerian? 4 odd nodes impossible.
    // Wait, House shape is better for solvable.
    // House: 0(top), 1(TL), 2(TR), 3(BL), 4(BR)
  },
  // Level 2 Fixed: Envelope (House)
  {
    nodes: [
      { x: 0.5, y: 0.2 },
      { x: 0.2, y: 0.5 },
      { x: 0.8, y: 0.5 },
      { x: 0.2, y: 0.8 },
      { x: 0.8, y: 0.8 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
      [1, 4],
      [2, 3],
    ], // internal cross
  },
  // Level 3: Star
  {
    nodes: [
      { x: 0.5, y: 0.1 }, // 0 Top
      { x: 0.8, y: 0.35 }, // 1 TR
      { x: 0.7, y: 0.8 }, // 2 BR
      { x: 0.3, y: 0.8 }, // 3 BL
      { x: 0.2, y: 0.35 }, // 4 TL
    ],
    edges: [
      [0, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 4],
    ],
  },
];

export class OneLineGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // State
  private levelIndex = 0;
  private currentLevel: LevelData | null = null;

  private path: number[] = []; // Node indices
  private visitedEdges: Set<string> = new Set();
  private currentNode: number | null = null;

  private interactionStartNode: number | null = null;
  private interactionCurrentPos: Point | null = null;

  private status: GameState["status"] = "idle";

  // Config
  private nodeRadius = 15;

  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Input
    // We handle input in main.ts passing coordinates here, or bind here?
    // Let's rely on handleInput methods called from main.ts for consistency
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      this.render();
    }
  }

  public startLevel(idx: number) {
    if (idx < 0) idx = 0;
    if (idx >= LEVELS.length) idx = 0; // Loop or end?

    this.levelIndex = idx;
    this.currentLevel = LEVELS[idx];

    this.reset();
  }

  public reset() {
    this.path = [];
    this.visitedEdges.clear();
    this.currentNode = null;
    this.status = "playing";
    this.interactionStartNode = null;
    this.interactionCurrentPos = null;
    this.render();
    this.notifyChange();
  }

  public undo() {
    if (this.path.length <= 1) {
      this.reset();
      return;
    }

    const last = this.path.pop();
    const prev = this.path[this.path.length - 1];
    this.currentNode = prev;

    // Remove edge
    const key1 = `${prev}-${last}`;
    const key2 = `${last}-${prev}`;
    if (this.visitedEdges.has(key1)) this.visitedEdges.delete(key1);
    else if (this.visitedEdges.has(key2)) this.visitedEdges.delete(key2);

    this.status = "playing";
    this.render();
    this.notifyChange();
  }

  public handleDown(x: number, y: number) {
    if (this.status !== "playing" || !this.currentLevel) return;

    const idx = this.getHitNode(x, y);
    if (idx !== -1) {
      // If path empty, start here
      if (this.path.length === 0) {
        this.path.push(idx);
        this.currentNode = idx;
        this.interactionStartNode = idx;
        this.render();
        this.notifyChange();
      } else {
        // Determine if we can drag from current
        if (idx === this.currentNode) {
          this.interactionStartNode = idx;
        }
      }
    }
  }

  public handleMove(x: number, y: number) {
    if (this.status !== "playing" || !this.currentLevel) return;

    if (this.interactionStartNode !== null) {
      this.interactionCurrentPos = { x, y };

      // Check hover
      const hoverIdx = this.getHitNode(x, y);
      if (hoverIdx !== -1 && hoverIdx !== this.interactionStartNode) {
        this.tryConnect(this.interactionStartNode, hoverIdx);
      }
      this.render();
    }
  }

  public handleUp() {
    this.interactionStartNode = null;
    this.interactionCurrentPos = null;
    this.render();
  }

  private tryConnect(u: number, v: number) {
    // Must be neighbors existing in edges
    const validEdge = this.currentLevel!.edges.some(
      (e) => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u)
    );

    if (!validEdge) return;

    // Must not be visited
    const key1 = `${u}-${v}`;
    const key2 = `${v}-${u}`;

    // Multi-edge support: If there are multiple edges between nodes, we might need to count them.
    // Simplified: Set assumes unique edges for now.
    // If levels have duplicate edges, we should use indices or counters.
    // Assuming simple graphs for now.

    if (this.visitedEdges.has(key1) || this.visitedEdges.has(key2)) return;

    // Connect
    this.visitedEdges.add(key1);
    this.path.push(v);
    this.currentNode = v;

    // Interaction continues from new node
    this.interactionStartNode = v;

    this.checkWin();
    this.notifyChange();
  }

  private checkWin() {
    if (!this.currentLevel) return;
    if (this.visitedEdges.size === this.currentLevel.edges.length) {
      this.status = "won";
      this.interactionStartNode = null;
      this.interactionCurrentPos = null;
    }
  }

  private getHitNode(x: number, y: number): number {
    if (!this.currentLevel) return -1;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = 40;
    const availW = w - pad * 2;
    const availH = h - pad * 2;

    for (let i = 0; i < this.currentLevel.nodes.length; i++) {
      const n = this.currentLevel.nodes[i];
      const nx = pad + n.x * availW;
      const ny = pad + n.y * availH;

      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
      if (dist < 30) return i; // Hit radius
    }
    return -1;
  }

  private render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    if (!this.currentLevel) return;

    const pad = 40;
    const availW = w - pad * 2;
    const availH = h - pad * 2;

    const getPos = (i: number) => ({
      x: pad + this.currentLevel!.nodes[i].x * availW,
      y: pad + this.currentLevel!.nodes[i].y * availH,
    });

    // Draw unvisited edges (Grey)
    this.ctx.strokeStyle = "#e0e0e0";
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.currentLevel.edges.forEach((e) => {
      const p1 = getPos(e[0]);
      const p2 = getPos(e[1]);
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
    });
    this.ctx.stroke();

    // Draw visited path (Color)
    if (this.path.length > 1) {
      this.ctx.strokeStyle = "#5c9ce6"; // Blue
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();

      // Draw segment by segment to handle non-continuous drawing (impossible in this logic but good practice)
      // Path is sequence of nodes
      let p1 = getPos(this.path[0]);
      this.ctx.moveTo(p1.x, p1.y);
      for (let i = 1; i < this.path.length; i++) {
        const p2 = getPos(this.path[i]);
        this.ctx.lineTo(p2.x, p2.y);
      }
      this.ctx.stroke();
    }

    // Draw drag line
    if (this.interactionStartNode !== null && this.interactionCurrentPos) {
      const p1 = getPos(this.interactionStartNode);
      const p2 = this.interactionCurrentPos;

      this.ctx.strokeStyle = "#5c9ce6";
      this.ctx.lineWidth = 4;
      this.ctx.globalAlpha = 0.6;
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;
    }

    // Draw Nodes
    this.currentLevel.nodes.forEach((n, i) => {
      const pos = getPos(i);
      const isCurrent = i === this.currentNode;
      const isStart = this.path.length > 0 && i === this.path[0];
      const isVisited = this.path.includes(i);

      this.ctx.fillStyle = isCurrent
        ? "#2ecc71"
        : isVisited
        ? "#5c9ce6"
        : "#bdc3c7";
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, isCurrent ? 12 : 8, 0, Math.PI * 2);
      this.ctx.fill();

      if (isStart) {
        this.ctx.strokeStyle = "#2ecc71";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    });
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  public notifyChange() {
    if (this.onStateChange && this.currentLevel) {
      const progress = Math.round(
        (this.visitedEdges.size / this.currentLevel.edges.length) * 100
      );
      this.onStateChange({
        level: this.levelIndex + 1,
        progress,
        status: this.status,
      });
    }
  }

  public nextLevel() {
    this.startLevel(this.levelIndex + 1);
  }

  public prevLevel() {
    if (this.levelIndex > 0) this.startLevel(this.levelIndex - 1);
  }
}
