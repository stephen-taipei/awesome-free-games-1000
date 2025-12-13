interface WebNode {
  id: number;
  x: number;
  y: number;
  ring: number;
}

interface Thread {
  from: number;
  to: number;
}

interface LevelConfig {
  rings: number;
  spokes: number;
  requiredThreads: [number, number][];
}

const LEVELS: LevelConfig[] = [
  {
    rings: 2,
    spokes: 6,
    requiredThreads: [],
  },
  {
    rings: 3,
    spokes: 6,
    requiredThreads: [],
  },
  {
    rings: 3,
    spokes: 8,
    requiredThreads: [],
  },
  {
    rings: 4,
    spokes: 8,
    requiredThreads: [],
  },
];

export class SpiderWebGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  nodes: WebNode[] = [];
  threads: Thread[] = [];
  requiredThreads: Thread[] = [];

  centerX: number = 0;
  centerY: number = 0;
  maxRadius: number = 150;

  selectedNode: WebNode | null = null;
  dragX: number = 0;
  dragY: number = 0;
  isDragging: boolean = false;

  status: "playing" | "won" = "playing";
  animOffset: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.threads = [];
    this.selectedNode = null;
    this.isDragging = false;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        threads: `${this.threads.length}/${this.requiredThreads.length}`,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    const { width, height } = this.canvas;

    this.centerX = width / 2;
    this.centerY = height / 2;
    this.maxRadius = Math.min(width, height) * 0.35;

    // Create nodes
    this.nodes = [];
    let nodeId = 0;

    // Center node
    this.nodes.push({ id: nodeId++, x: this.centerX, y: this.centerY, ring: 0 });

    // Ring nodes
    for (let ring = 1; ring <= config.rings; ring++) {
      const radius = (ring / config.rings) * this.maxRadius;
      for (let spoke = 0; spoke < config.spokes; spoke++) {
        const angle = (spoke / config.spokes) * Math.PI * 2 - Math.PI / 2;
        this.nodes.push({
          id: nodeId++,
          x: this.centerX + Math.cos(angle) * radius,
          y: this.centerY + Math.sin(angle) * radius,
          ring,
        });
      }
    }

    // Generate required threads
    this.requiredThreads = [];

    // Radial threads (spokes)
    for (let spoke = 0; spoke < config.spokes; spoke++) {
      // From center to first ring
      const firstRingNode = 1 + spoke;
      this.requiredThreads.push({ from: 0, to: firstRingNode });

      // Between rings
      for (let ring = 1; ring < config.rings; ring++) {
        const fromNode = 1 + (ring - 1) * config.spokes + spoke;
        const toNode = 1 + ring * config.spokes + spoke;
        this.requiredThreads.push({ from: fromNode, to: toNode });
      }
    }

    // Spiral threads (connecting nodes on same ring)
    for (let ring = 1; ring <= config.rings; ring++) {
      for (let spoke = 0; spoke < config.spokes; spoke++) {
        const fromNode = 1 + (ring - 1) * config.spokes + spoke;
        const toNode = 1 + (ring - 1) * config.spokes + ((spoke + 1) % config.spokes);
        this.requiredThreads.push({ from: fromNode, to: toNode });
      }
    }

    this.threads = [];
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
    this.animOffset += 0.02;
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing") return;

    if (type === "down") {
      for (const node of this.nodes) {
        const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (dist < 20) {
          this.selectedNode = node;
          this.isDragging = true;
          this.dragX = x;
          this.dragY = y;
          return;
        }
      }
    } else if (type === "move") {
      if (this.isDragging) {
        this.dragX = x;
        this.dragY = y;
      }
    } else if (type === "up") {
      if (this.selectedNode && this.isDragging) {
        // Check if released on another node
        for (const node of this.nodes) {
          if (node.id === this.selectedNode.id) continue;

          const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
          if (dist < 20) {
            this.tryAddThread(this.selectedNode.id, node.id);
            break;
          }
        }
      }
      this.selectedNode = null;
      this.isDragging = false;
    }
  }

  private tryAddThread(fromId: number, toId: number) {
    // Check if this is a valid required thread
    const isRequired = this.requiredThreads.some(
      (t) => (t.from === fromId && t.to === toId) || (t.from === toId && t.to === fromId)
    );

    if (!isRequired) return;

    // Check if already exists
    const exists = this.threads.some(
      (t) => (t.from === fromId && t.to === toId) || (t.from === toId && t.to === fromId)
    );

    if (exists) return;

    this.threads.push({ from: fromId, to: toId });

    if (this.onStateChange) {
      this.onStateChange({
        threads: `${this.threads.length}/${this.requiredThreads.length}`,
      });
    }

    // Check win
    if (this.threads.length === this.requiredThreads.length) {
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

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Night sky background
    const bgGradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, width
    );
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(1, "#0f0f1a");
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Stars
    this.drawStars();

    // Moon
    this.drawMoon();

    // Draw required threads (faded guides)
    this.drawGuideThreads();

    // Draw placed threads
    this.drawThreads();

    // Draw drag line
    if (this.isDragging && this.selectedNode) {
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.selectedNode.x, this.selectedNode.y);
      this.ctx.lineTo(this.dragX, this.dragY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw nodes
    this.drawNodes();

    // Draw spider
    this.drawSpider();

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(108, 92, 231, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawStars() {
    this.ctx.fillStyle = "white";
    const stars = [
      [50, 30], [120, 80], [500, 50], [450, 120], [80, 350],
      [520, 320], [200, 40], [350, 60], [100, 180], [480, 200],
    ];
    for (const [x, y] of stars) {
      const twinkle = Math.sin(this.animOffset * 2 + x) * 0.5 + 0.5;
      this.ctx.globalAlpha = 0.3 + twinkle * 0.7;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawMoon() {
    const { width } = this.canvas;
    this.ctx.fillStyle = "#f5f5dc";
    this.ctx.beginPath();
    this.ctx.arc(width - 60, 60, 30, 0, Math.PI * 2);
    this.ctx.fill();

    // Moon glow
    const moonGlow = this.ctx.createRadialGradient(width - 60, 60, 30, width - 60, 60, 80);
    moonGlow.addColorStop(0, "rgba(245, 245, 220, 0.3)");
    moonGlow.addColorStop(1, "rgba(245, 245, 220, 0)");
    this.ctx.fillStyle = moonGlow;
    this.ctx.beginPath();
    this.ctx.arc(width - 60, 60, 80, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawGuideThreads() {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 1;

    for (const thread of this.requiredThreads) {
      const exists = this.threads.some(
        (t) =>
          (t.from === thread.from && t.to === thread.to) ||
          (t.from === thread.to && t.to === thread.from)
      );
      if (exists) continue;

      const fromNode = this.nodes.find((n) => n.id === thread.from)!;
      const toNode = this.nodes.find((n) => n.id === thread.to)!;

      this.ctx.beginPath();
      this.ctx.moveTo(fromNode.x, fromNode.y);
      this.ctx.lineTo(toNode.x, toNode.y);
      this.ctx.stroke();
    }
  }

  private drawThreads() {
    for (const thread of this.threads) {
      const fromNode = this.nodes.find((n) => n.id === thread.from)!;
      const toNode = this.nodes.find((n) => n.id === thread.to)!;

      // Thread glow
      this.ctx.strokeStyle = "rgba(192, 192, 192, 0.3)";
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(fromNode.x, fromNode.y);
      this.ctx.lineTo(toNode.x, toNode.y);
      this.ctx.stroke();

      // Main thread
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(fromNode.x, fromNode.y);
      this.ctx.lineTo(toNode.x, toNode.y);
      this.ctx.stroke();
    }
  }

  private drawNodes() {
    for (const node of this.nodes) {
      const isSelected = this.selectedNode?.id === node.id;

      // Glow
      if (isSelected) {
        const glow = this.ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 25);
        glow.addColorStop(0, "rgba(108, 92, 231, 0.5)");
        glow.addColorStop(1, "rgba(108, 92, 231, 0)");
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Node
      this.ctx.fillStyle = isSelected ? "#6c5ce7" : node.ring === 0 ? "#e74c3c" : "#f5f5dc";
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.ring === 0 ? 12 : 8, 0, Math.PI * 2);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  private drawSpider() {
    const x = this.centerX + Math.sin(this.animOffset) * 20;
    const y = this.centerY + Math.cos(this.animOffset) * 20;

    // Body
    this.ctx.fillStyle = "#2c2c2c";
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 8, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.beginPath();
    this.ctx.arc(x, y - 12, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.beginPath();
    this.ctx.arc(x - 2, y - 13, 2, 0, Math.PI * 2);
    this.ctx.arc(x + 2, y - 13, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Legs
    this.ctx.strokeStyle = "#2c2c2c";
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const legOffset = Math.sin(this.animOffset * 3 + i) * 3;
      // Left legs
      this.ctx.beginPath();
      this.ctx.moveTo(x - 5, y - 5 + i * 4);
      this.ctx.quadraticCurveTo(x - 20, y - 10 + i * 4 + legOffset, x - 25, y + i * 4);
      this.ctx.stroke();
      // Right legs
      this.ctx.beginPath();
      this.ctx.moveTo(x + 5, y - 5 + i * 4);
      this.ctx.quadraticCurveTo(x + 20, y - 10 + i * 4 - legOffset, x + 25, y + i * 4);
      this.ctx.stroke();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.nodes.length > 0) {
        this.initLevel();
      }
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
