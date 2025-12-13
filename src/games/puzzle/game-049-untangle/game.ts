export interface Node {
  id: number;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
}

export interface Edge {
  from: number;
  to: number;
}

interface LevelConfig {
  nodeCount: number;
  edgeCount: number;
}

const LEVELS: LevelConfig[] = [
  { nodeCount: 5, edgeCount: 6 },
  { nodeCount: 6, edgeCount: 8 },
  { nodeCount: 7, edgeCount: 10 },
  { nodeCount: 8, edgeCount: 12 },
  { nodeCount: 10, edgeCount: 15 },
  { nodeCount: 12, edgeCount: 18 },
];

export class UntangleGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  nodes: Node[] = [];
  edges: Edge[] = [];
  currentLevel: number = 0;
  crossings: number = 0;

  draggingNode: Node | null = null;
  status: "playing" | "won" = "playing";

  nodeRadius: number = 15;
  padding: number = 50;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.generateLevel();
    this.shuffleNodes();
    this.crossings = this.countCrossings();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        crossings: this.crossings,
      });
    }
  }

  private generateLevel() {
    const config = LEVELS[this.currentLevel];
    this.nodes = [];
    this.edges = [];

    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - this.padding;

    // Generate nodes in a circle (solution state)
    for (let i = 0; i < config.nodeCount; i++) {
      const angle = (2 * Math.PI * i) / config.nodeCount - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      this.nodes.push({
        id: i,
        x,
        y,
        originalX: x,
        originalY: y,
      });
    }

    // Generate edges ensuring the graph is connected and planar
    // First, create a ring
    for (let i = 0; i < config.nodeCount; i++) {
      this.edges.push({
        from: i,
        to: (i + 1) % config.nodeCount,
      });
    }

    // Add some additional non-crossing edges
    const additionalEdges = config.edgeCount - config.nodeCount;
    let attempts = 0;
    const maxAttempts = 100;

    while (this.edges.length < config.edgeCount && attempts < maxAttempts) {
      const from = Math.floor(Math.random() * config.nodeCount);
      let to = Math.floor(Math.random() * config.nodeCount);

      // Ensure different nodes and no duplicate edges
      if (from === to) {
        attempts++;
        continue;
      }

      const edgeExists = this.edges.some(
        (e) =>
          (e.from === from && e.to === to) || (e.from === to && e.to === from)
      );

      if (edgeExists) {
        attempts++;
        continue;
      }

      // Check if adding this edge would cause a crossing in the solution
      const newEdge = { from, to };
      let wouldCross = false;

      for (const edge of this.edges) {
        if (this.edgesCross(newEdge, edge, true)) {
          wouldCross = true;
          break;
        }
      }

      if (!wouldCross) {
        this.edges.push(newEdge);
      }

      attempts++;
    }
  }

  private shuffleNodes() {
    const { width, height } = this.canvas;
    const padding = this.padding + this.nodeRadius;

    for (const node of this.nodes) {
      node.x = padding + Math.random() * (width - 2 * padding);
      node.y = padding + Math.random() * (height - 2 * padding);
    }
  }

  private countCrossings(): number {
    let count = 0;

    for (let i = 0; i < this.edges.length; i++) {
      for (let j = i + 1; j < this.edges.length; j++) {
        if (this.edgesCross(this.edges[i], this.edges[j])) {
          count++;
        }
      }
    }

    return count;
  }

  private edgesCross(e1: Edge, e2: Edge, useOriginal: boolean = false): boolean {
    // Skip if edges share a node
    if (
      e1.from === e2.from ||
      e1.from === e2.to ||
      e1.to === e2.from ||
      e1.to === e2.to
    ) {
      return false;
    }

    const n1 = this.nodes[e1.from];
    const n2 = this.nodes[e1.to];
    const n3 = this.nodes[e2.from];
    const n4 = this.nodes[e2.to];

    let x1, y1, x2, y2, x3, y3, x4, y4;

    if (useOriginal) {
      x1 = n1.originalX;
      y1 = n1.originalY;
      x2 = n2.originalX;
      y2 = n2.originalY;
      x3 = n3.originalX;
      y3 = n3.originalY;
      x4 = n4.originalX;
      y4 = n4.originalY;
    } else {
      x1 = n1.x;
      y1 = n1.y;
      x2 = n2.x;
      y2 = n2.y;
      x3 = n3.x;
      y3 = n3.y;
      x4 = n4.x;
      y4 = n4.y;
    }

    return this.linesCross(x1, y1, x2, y2, x3, y3, x4, y4);
  }

  private linesCross(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): boolean {
    const d1 = this.direction(x3, y3, x4, y4, x1, y1);
    const d2 = this.direction(x3, y3, x4, y4, x2, y2);
    const d3 = this.direction(x1, y1, x2, y2, x3, y3);
    const d4 = this.direction(x1, y1, x2, y2, x4, y4);

    if (
      ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    ) {
      return true;
    }

    return false;
  }

  private direction(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number
  ): number {
    return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
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
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleInput(
    type: "down" | "move" | "up",
    x: number,
    y: number
  ) {
    if (this.status !== "playing") return;

    if (type === "down") {
      for (const node of this.nodes) {
        const dist = Math.hypot(node.x - x, node.y - y);
        if (dist < this.nodeRadius + 5) {
          this.draggingNode = node;
          break;
        }
      }
    } else if (type === "move") {
      if (this.draggingNode) {
        // Keep node within bounds
        this.draggingNode.x = Math.max(
          this.nodeRadius,
          Math.min(this.canvas.width - this.nodeRadius, x)
        );
        this.draggingNode.y = Math.max(
          this.nodeRadius,
          Math.min(this.canvas.height - this.nodeRadius, y)
        );

        // Update crossings
        this.crossings = this.countCrossings();

        if (this.onStateChange) {
          this.onStateChange({ crossings: this.crossings });
        }

        // Check win
        if (this.crossings === 0) {
          this.status = "won";
          if (this.onStateChange) {
            this.onStateChange({
              status: "won",
              level: this.currentLevel + 1,
              hasNextLevel: this.currentLevel < LEVELS.length - 1,
            });
          }
        }
      }
    } else if (type === "up") {
      this.draggingNode = null;
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const gradient = this.ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) / 2
    );
    gradient.addColorStop(0, "#2d3436");
    gradient.addColorStop(1, "#000000");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw edges
    for (const edge of this.edges) {
      const n1 = this.nodes[edge.from];
      const n2 = this.nodes[edge.to];

      // Check if this edge crosses any other
      let crosses = false;
      for (const otherEdge of this.edges) {
        if (edge !== otherEdge && this.edgesCross(edge, otherEdge)) {
          crosses = true;
          break;
        }
      }

      this.ctx.beginPath();
      this.ctx.moveTo(n1.x, n1.y);
      this.ctx.lineTo(n2.x, n2.y);

      if (crosses) {
        this.ctx.strokeStyle = "#e74c3c";
        this.ctx.lineWidth = 2;
      } else {
        this.ctx.strokeStyle = "#00b894";
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00b894";
      }

      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // Draw nodes
    for (const node of this.nodes) {
      const isActive = node === this.draggingNode;

      // Outer glow
      if (isActive) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, this.nodeRadius + 8, 0, Math.PI * 2);
        this.ctx.fillStyle = "rgba(0, 184, 148, 0.3)";
        this.ctx.fill();
      }

      // Node
      const nodeGradient = this.ctx.createRadialGradient(
        node.x - 4,
        node.y - 4,
        0,
        node.x,
        node.y,
        this.nodeRadius
      );

      if (isActive) {
        nodeGradient.addColorStop(0, "#55efc4");
        nodeGradient.addColorStop(1, "#00b894");
      } else {
        nodeGradient.addColorStop(0, "#74b9ff");
        nodeGradient.addColorStop(1, "#0984e3");
      }

      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = nodeGradient;
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Highlight
      this.ctx.beginPath();
      this.ctx.arc(
        node.x - 4,
        node.y - 4,
        this.nodeRadius * 0.4,
        0,
        Math.PI * 2
      );
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      this.ctx.fill();
    }

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(0, 184, 148, 0.2)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
    }
  }

  public reset() {
    this.shuffleNodes();
    this.crossings = this.countCrossings();
    this.status = "playing";
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        crossings: this.crossings,
        level: this.currentLevel + 1,
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
