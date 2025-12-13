export interface Node {
  id: number;
  x: number;
  y: number;
  fixed: boolean;
  vx: number;
  vy: number;
}

export interface Beam {
  id: number;
  node1: number;
  node2: number;
  stress: number; // 0-1, 1 = breaking point
}

export interface Car {
  x: number;
  y: number;
  width: number;
  height: number;
  onBridge: boolean;
  finished: boolean;
}

export interface Level {
  budget: number;
  gapStart: number;
  gapEnd: number;
  fixedNodes: { x: number; y: number }[];
  buildNodes: { x: number; y: number }[];
}

const LEVELS: Level[] = [
  {
    budget: 500,
    gapStart: 200,
    gapEnd: 500,
    fixedNodes: [
      { x: 200, y: 240 },
      { x: 500, y: 240 },
    ],
    buildNodes: [
      { x: 275, y: 240 },
      { x: 350, y: 240 },
      { x: 425, y: 240 },
      { x: 350, y: 300 },
    ],
  },
  {
    budget: 800,
    gapStart: 150,
    gapEnd: 550,
    fixedNodes: [
      { x: 150, y: 240 },
      { x: 550, y: 240 },
    ],
    buildNodes: [
      { x: 230, y: 240 },
      { x: 310, y: 240 },
      { x: 390, y: 240 },
      { x: 470, y: 240 },
      { x: 270, y: 300 },
      { x: 350, y: 300 },
      { x: 430, y: 300 },
    ],
  },
  {
    budget: 1200,
    gapStart: 100,
    gapEnd: 600,
    fixedNodes: [
      { x: 100, y: 240 },
      { x: 600, y: 240 },
      { x: 350, y: 350 },
    ],
    buildNodes: [
      { x: 175, y: 240 },
      { x: 250, y: 240 },
      { x: 350, y: 240 },
      { x: 450, y: 240 },
      { x: 525, y: 240 },
      { x: 225, y: 295 },
      { x: 350, y: 295 },
      { x: 475, y: 295 },
    ],
  },
];

const BEAM_COST = 50;
const GRAVITY = 0.5;
const DAMPING = 0.98;
const MAX_STRESS = 0.8;

export class BridgeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  nodes: Node[] = [];
  beams: Beam[] = [];
  car: Car;

  level: number = 1;
  currentLevel: Level;
  budget: number = 0;
  spent: number = 0;

  selectedNode: number | null = null;
  status: "building" | "testing" | "won" | "failed" = "building";

  onStateChange: ((s: any) => void) | null = null;
  animationId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.currentLevel = LEVELS[0];
    this.car = { x: 50, y: 210, width: 40, height: 25, onBridge: false, finished: false };
  }

  public start() {
    this.status = "building";
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.budget = this.currentLevel.budget;
    this.spent = 0;
    this.initNodes();
    this.beams = [];
    this.car = { x: 50, y: 210, width: 40, height: 25, onBridge: false, finished: false };
    this.selectedNode = null;
    this.resize();
    this.draw();
    this.notifyChange();
  }

  private initNodes() {
    this.nodes = [];
    let id = 0;

    // Fixed anchor nodes
    this.currentLevel.fixedNodes.forEach((pos) => {
      this.nodes.push({
        id: id++,
        x: pos.x,
        y: pos.y,
        fixed: true,
        vx: 0,
        vy: 0,
      });
    });

    // Buildable nodes
    this.currentLevel.buildNodes.forEach((pos) => {
      this.nodes.push({
        id: id++,
        x: pos.x,
        y: pos.y,
        fixed: false,
        vx: 0,
        vy: 0,
      });
    });
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "building") return;

    // Find clicked node
    const clickedNode = this.nodes.find((n) => {
      const dist = Math.hypot(n.x - x, n.y - y);
      return dist < 20;
    });

    if (!clickedNode) {
      this.selectedNode = null;
      this.draw();
      return;
    }

    if (this.selectedNode === null) {
      this.selectedNode = clickedNode.id;
    } else if (this.selectedNode !== clickedNode.id) {
      // Try to create beam
      this.tryCreateBeam(this.selectedNode, clickedNode.id);
      this.selectedNode = null;
    } else {
      this.selectedNode = null;
    }

    this.draw();
  }

  private tryCreateBeam(node1Id: number, node2Id: number) {
    // Check if beam already exists
    const exists = this.beams.some(
      (b) =>
        (b.node1 === node1Id && b.node2 === node2Id) ||
        (b.node1 === node2Id && b.node2 === node1Id)
    );
    if (exists) {
      // Remove beam (refund)
      const idx = this.beams.findIndex(
        (b) =>
          (b.node1 === node1Id && b.node2 === node2Id) ||
          (b.node1 === node2Id && b.node2 === node1Id)
      );
      if (idx >= 0) {
        this.beams.splice(idx, 1);
        this.spent -= BEAM_COST;
        this.notifyChange();
      }
      return;
    }

    // Check budget
    if (this.spent + BEAM_COST > this.budget) return;

    this.beams.push({
      id: this.beams.length,
      node1: node1Id,
      node2: node2Id,
      stress: 0,
    });
    this.spent += BEAM_COST;
    this.notifyChange();
  }

  public testBridge() {
    if (this.status !== "building") return;
    this.status = "testing";

    // Reset node velocities
    this.nodes.forEach((n) => {
      n.vx = 0;
      n.vy = 0;
    });

    this.car = {
      x: 50,
      y: 210,
      width: 40,
      height: 25,
      onBridge: false,
      finished: false,
    };

    this.simulate();
  }

  private simulate = () => {
    if (this.status !== "testing") return;

    // Physics simulation
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      // Apply gravity to non-fixed nodes
      this.nodes.forEach((n) => {
        if (!n.fixed) {
          n.vy += GRAVITY / iterations;
        }
      });

      // Beam constraints
      this.beams.forEach((beam) => {
        const n1 = this.nodes[beam.node1];
        const n2 = this.nodes[beam.node2];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy);
        const restLength = Math.hypot(
          this.getOriginalPos(beam.node1).x - this.getOriginalPos(beam.node2).x,
          this.getOriginalPos(beam.node1).y - this.getOriginalPos(beam.node2).y
        );

        const diff = (dist - restLength) / dist;
        beam.stress = Math.abs(diff) * 5; // Stress factor

        // Move nodes to satisfy constraint
        const offsetX = (dx * diff * 0.5) / iterations;
        const offsetY = (dy * diff * 0.5) / iterations;

        if (!n1.fixed) {
          n1.x += offsetX;
          n1.y += offsetY;
        }
        if (!n2.fixed) {
          n2.x -= offsetX;
          n2.y -= offsetY;
        }
      });

      // Damping
      this.nodes.forEach((n) => {
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        if (!n.fixed) {
          n.x += n.vx / iterations;
          n.y += n.vy / iterations;
        }
      });
    }

    // Check for broken beams
    const broken = this.beams.some((b) => b.stress > MAX_STRESS);
    if (broken) {
      this.status = "failed";
      this.notifyChange();
      this.draw();
      return;
    }

    // Move car
    if (!this.car.finished) {
      this.car.x += 2;

      // Check if car is on bridge area
      if (this.car.x > this.currentLevel.gapStart && this.car.x < this.currentLevel.gapEnd) {
        this.car.onBridge = true;
        // Find supporting beam and apply weight
        const roadY = this.getRoadY(this.car.x + this.car.width / 2);
        if (roadY) {
          this.car.y = roadY - this.car.height;
          // Apply downward force to nearby nodes
          this.nodes.forEach((n) => {
            if (!n.fixed && Math.abs(n.x - this.car.x) < 60 && n.y < 260) {
              n.vy += 0.3;
            }
          });
        } else {
          // Car fell!
          this.status = "failed";
          this.notifyChange();
          this.draw();
          return;
        }
      } else {
        this.car.onBridge = false;
        this.car.y = 210;
      }

      // Check win
      if (this.car.x > this.currentLevel.gapEnd + 50) {
        this.car.finished = true;
        this.status = "won";
        this.notifyChange();
      }
    }

    this.draw();

    if (this.status === "testing") {
      this.animationId = requestAnimationFrame(this.simulate);
    }
  };

  private getOriginalPos(nodeId: number): { x: number; y: number } {
    const allOriginal = [...this.currentLevel.fixedNodes, ...this.currentLevel.buildNodes];
    return allOriginal[nodeId] || { x: 0, y: 0 };
  }

  private getRoadY(x: number): number | null {
    // Find beams that could support the car at position x
    for (const beam of this.beams) {
      const n1 = this.nodes[beam.node1];
      const n2 = this.nodes[beam.node2];

      // Check if this is a "road" beam (roughly horizontal and at road level)
      if (n1.y < 280 && n2.y < 280) {
        const minX = Math.min(n1.x, n2.x);
        const maxX = Math.max(n1.x, n2.x);

        if (x >= minX && x <= maxX) {
          // Interpolate Y position
          const t = (x - n1.x) / (n2.x - n1.x || 1);
          const y = n1.y + t * (n2.y - n1.y);
          if (y < 280) return y;
        }
      }
    }
    return null;
  }

  public reset() {
    cancelAnimationFrame(this.animationId);
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, "#87ceeb");
    skyGrad.addColorStop(1, "#b0e0e6");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.6);

    // Draw ground
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // Draw gap
    ctx.fillStyle = "#4a90a4";
    ctx.fillRect(this.currentLevel.gapStart, h * 0.6, this.currentLevel.gapEnd - this.currentLevel.gapStart, h * 0.2);

    // Draw beams
    this.beams.forEach((beam) => {
      const n1 = this.nodes[beam.node1];
      const n2 = this.nodes[beam.node2];

      // Color based on stress
      let color = "#8b4513";
      if (beam.stress > 0.3) color = "#e67e22";
      if (beam.stress > 0.6) color = "#e74c3c";

      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();

      // Inner highlight
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();
    });

    // Draw nodes
    this.nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);

      if (node.fixed) {
        ctx.fillStyle = "#7f8c8d";
      } else if (this.selectedNode === node.id) {
        ctx.fillStyle = "#f1c40f";
      } else {
        ctx.fillStyle = "#3498db";
      }
      ctx.fill();

      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw car
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(this.car.x, this.car.y, this.car.width, this.car.height);

    // Wheels
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(this.car.x + 10, this.car.y + this.car.height, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.car.x + this.car.width - 10, this.car.y + this.car.height, 6, 0, Math.PI * 2);
    ctx.fill();

    // Window
    ctx.fillStyle = "#3498db";
    ctx.fillRect(this.car.x + 25, this.car.y + 5, 12, 10);
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        budget: this.budget,
        spent: this.spent,
        status: this.status,
      });
    }
  }
}
