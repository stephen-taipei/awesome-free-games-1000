/**
 * Rope Puzzle Game Engine
 * Game #086 - Untangle the ropes by moving nodes
 * Neon / String / Glow Theme
 */

export interface Node {
  id: number;
  x: number;
  y: number;
  radius: number;
  colorIndex: number;
}

export interface Edge {
  from: number;
  to: number;
}

export interface Level {
  nodes: { x: number; y: number }[];
  edges: [number, number][];
}

type GameEvent = "grab" | "drag" | "release" | "untangle" | "victory" | "levelStart" | "reset";

export interface GameState {
  moves: number;
  status: "playing" | "won";
  event?: GameEvent;
  eventX?: number;
  eventY?: number;
  eventColorIndex?: number;
}

export class RopePuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private draggingNode: Node | null = null;
  private dragOffset = { x: 0, y: 0 };

  private currentLevel = 0;
  private moves = 0;
  private status: "playing" | "won" = "playing";
  private previousIntersections = 0;

  private onStateChange: ((state: GameState) => void) | null = null;

  private levels: Level[] = [
    // Level 1 - Simple cross (4 nodes)
    {
      nodes: [
        { x: 0.2, y: 0.3 },
        { x: 0.8, y: 0.3 },
        { x: 0.2, y: 0.7 },
        { x: 0.8, y: 0.7 },
      ],
      edges: [
        [0, 3],
        [1, 2],
      ],
    },
    // Level 2 - Triangle with cross
    {
      nodes: [
        { x: 0.5, y: 0.2 },
        { x: 0.2, y: 0.7 },
        { x: 0.8, y: 0.7 },
        { x: 0.5, y: 0.5 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 0],
        [3, 0],
        [3, 1],
        [3, 2],
      ],
    },
    // Level 3 - Pentagon
    {
      nodes: [
        { x: 0.5, y: 0.15 },
        { x: 0.85, y: 0.4 },
        { x: 0.7, y: 0.85 },
        { x: 0.3, y: 0.85 },
        { x: 0.15, y: 0.4 },
      ],
      edges: [
        [0, 2],
        [0, 3],
        [1, 3],
        [1, 4],
        [2, 4],
      ],
    },
    // Level 4 - Star shape
    {
      nodes: [
        { x: 0.5, y: 0.1 },
        { x: 0.9, y: 0.35 },
        { x: 0.75, y: 0.9 },
        { x: 0.25, y: 0.9 },
        { x: 0.1, y: 0.35 },
        { x: 0.5, y: 0.45 },
      ],
      edges: [
        [0, 2],
        [0, 3],
        [1, 3],
        [1, 4],
        [2, 4],
        [5, 0],
        [5, 1],
        [5, 2],
        [5, 3],
        [5, 4],
      ],
    },
    // Level 5 - Complex web
    {
      nodes: [
        { x: 0.3, y: 0.2 },
        { x: 0.7, y: 0.2 },
        { x: 0.9, y: 0.5 },
        { x: 0.7, y: 0.8 },
        { x: 0.3, y: 0.8 },
        { x: 0.1, y: 0.5 },
        { x: 0.5, y: 0.5 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 0],
        [0, 6],
        [1, 6],
        [2, 6],
        [3, 6],
        [4, 6],
        [5, 6],
      ],
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.moves = 0;
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.scrambleNodes();
    this.previousIntersections = this.countIntersections();
    this.emitState("levelStart");
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    const level = this.levels[levelIndex % this.levels.length];
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padding = 40;

    this.nodes = level.nodes.map((n, i) => ({
      id: i,
      x: padding + n.x * (w - padding * 2),
      y: padding + n.y * (h - padding * 2),
      radius: 18,
      colorIndex: i % 6,
    }));

    this.edges = level.edges.map(([from, to]) => ({ from, to }));
  }

  private scrambleNodes() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padding = 50;

    // Scramble positions to create intersections
    this.nodes.forEach((node) => {
      node.x = padding + Math.random() * (w - padding * 2);
      node.y = padding + Math.random() * (h - padding * 2);
    });
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private checkWin(): boolean {
    // Check if any edges intersect
    for (let i = 0; i < this.edges.length; i++) {
      for (let j = i + 1; j < this.edges.length; j++) {
        const e1 = this.edges[i];
        const e2 = this.edges[j];

        // Skip if edges share a node
        if (
          e1.from === e2.from ||
          e1.from === e2.to ||
          e1.to === e2.from ||
          e1.to === e2.to
        ) {
          continue;
        }

        const n1 = this.nodes[e1.from];
        const n2 = this.nodes[e1.to];
        const n3 = this.nodes[e2.from];
        const n4 = this.nodes[e2.to];

        if (this.linesIntersect(n1.x, n1.y, n2.x, n2.y, n3.x, n3.y, n4.x, n4.y)) {
          return false;
        }
      }
    }
    return true;
  }

  private linesIntersect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < 0.0001) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    // Check if intersection point is within both line segments
    const eps = 0.01;
    return ua > eps && ua < 1 - eps && ub > eps && ub < 1 - eps;
  }

  private countIntersections(): number {
    let count = 0;
    for (let i = 0; i < this.edges.length; i++) {
      for (let j = i + 1; j < this.edges.length; j++) {
        const e1 = this.edges[i];
        const e2 = this.edges[j];

        if (
          e1.from === e2.from ||
          e1.from === e2.to ||
          e1.to === e2.from ||
          e1.to === e2.to
        ) {
          continue;
        }

        const n1 = this.nodes[e1.from];
        const n2 = this.nodes[e1.to];
        const n3 = this.nodes[e2.from];
        const n4 = this.nodes[e2.to];

        if (this.linesIntersect(n1.x, n1.y, n2.x, n2.y, n3.x, n3.y, n4.x, n4.y)) {
          count++;
        }
      }
    }
    return count;
  }

  private emitState(event?: GameEvent, node?: Node) {
    if (this.onStateChange) {
      this.onStateChange({
        moves: this.moves,
        status: this.status,
        event,
        eventX: node?.x,
        eventY: node?.y,
        eventColorIndex: node?.colorIndex,
      });
    }
  }

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status === "won") return;

    if (type === "down") {
      // Find clicked node
      for (const node of this.nodes) {
        const dist = Math.hypot(node.x - x, node.y - y);
        if (dist < node.radius + 10) {
          this.draggingNode = node;
          this.dragOffset = { x: node.x - x, y: node.y - y };
          this.emitState("grab", node);
          break;
        }
      }
    } else if (type === "move") {
      if (this.draggingNode) {
        const padding = 20;
        this.draggingNode.x = Math.max(
          padding,
          Math.min(this.canvas.width - padding, x + this.dragOffset.x)
        );
        this.draggingNode.y = Math.max(
          padding,
          Math.min(this.canvas.height - padding, y + this.dragOffset.y)
        );

        // Emit drag event occasionally
        if (Math.random() < 0.2) {
          this.emitState("drag", this.draggingNode);
        }
      }
    } else if (type === "up") {
      if (this.draggingNode) {
        this.moves++;
        const releasedNode = this.draggingNode;
        this.draggingNode = null;

        // Check if untangle happened
        const currentIntersections = this.countIntersections();
        if (currentIntersections < this.previousIntersections) {
          this.emitState("untangle", releasedNode);
        } else {
          this.emitState("release", releasedNode);
        }
        this.previousIntersections = currentIntersections;

        // Check win condition
        if (this.checkWin()) {
          this.status = "won";
          this.emitState("victory", releasedNode);
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Find intersecting edges for coloring
    const intersectingEdges = new Set<number>();
    for (let i = 0; i < this.edges.length; i++) {
      for (let j = i + 1; j < this.edges.length; j++) {
        const e1 = this.edges[i];
        const e2 = this.edges[j];

        if (
          e1.from === e2.from ||
          e1.from === e2.to ||
          e1.to === e2.from ||
          e1.to === e2.to
        ) {
          continue;
        }

        const n1 = this.nodes[e1.from];
        const n2 = this.nodes[e1.to];
        const n3 = this.nodes[e2.from];
        const n4 = this.nodes[e2.to];

        if (this.linesIntersect(n1.x, n1.y, n2.x, n2.y, n3.x, n3.y, n4.x, n4.y)) {
          intersectingEdges.add(i);
          intersectingEdges.add(j);
        }
      }
    }

    // Draw edges (ropes) with neon glow
    this.edges.forEach((edge, index) => {
      const from = this.nodes[edge.from];
      const to = this.nodes[edge.to];

      // Glow effect
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      if (this.status === "won") {
        ctx.strokeStyle = "#2ecc71";
        ctx.shadowColor = "#2ecc71";
        ctx.shadowBlur = 15;
      } else if (intersectingEdges.has(index)) {
        ctx.strokeStyle = "#e74c3c";
        ctx.shadowColor = "#e74c3c";
        ctx.shadowBlur = 12;
      } else {
        ctx.strokeStyle = "#9b59b6";
        ctx.shadowColor = "#9b59b6";
        ctx.shadowBlur = 10;
      }

      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw nodes with neon glow
    this.nodes.forEach((node) => {
      // Outer glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);

      if (this.status === "won") {
        ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      } else if (node === this.draggingNode) {
        ctx.fillStyle = "rgba(243, 156, 18, 0.4)";
      } else {
        ctx.fillStyle = "rgba(102, 126, 234, 0.3)";
      }
      ctx.fill();

      // Main node
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      const nodeGradient = ctx.createRadialGradient(
        node.x - 5,
        node.y - 5,
        0,
        node.x,
        node.y,
        node.radius
      );

      if (this.status === "won") {
        nodeGradient.addColorStop(0, "#2ecc71");
        nodeGradient.addColorStop(1, "#27ae60");
        ctx.shadowColor = "#2ecc71";
      } else if (node === this.draggingNode) {
        nodeGradient.addColorStop(0, "#f39c12");
        nodeGradient.addColorStop(1, "#e67e22");
        ctx.shadowColor = "#f39c12";
      } else {
        nodeGradient.addColorStop(0, "#667eea");
        nodeGradient.addColorStop(1, "#764ba2");
        ctx.shadowColor = "#667eea";
      }

      ctx.shadowBlur = 15;
      ctx.fillStyle = nodeGradient;
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Shine effect
      ctx.beginPath();
      ctx.arc(node.x - 5, node.y - 5, node.radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();
    });

    // Draw intersection count
    if (this.status !== "won") {
      const intersections = this.countIntersections();
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "right";
      ctx.shadowColor = "#667eea";
      ctx.shadowBlur = 5;
      ctx.fillText(`Intersections: ${intersections}`, this.canvas.width - 20, 30);
      ctx.shadowBlur = 0;
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  public reset() {
    this.emitState("reset");
    this.start(this.currentLevel);
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getMoves(): number {
    return this.moves;
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }
}
