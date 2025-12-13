/**
 * Electronic Puzzle Game Engine
 * Game #078 - Connect circuit components to power the LED
 */

type Direction = "up" | "right" | "down" | "left";
type ComponentType = "wire" | "corner" | "tee" | "cross" | "battery" | "led" | "resistor" | "empty";

interface Component {
  type: ComponentType;
  rotation: number; // 0, 90, 180, 270
  powered: boolean;
  x: number;
  y: number;
}

interface Level {
  grid: string[][];
  batteryPos: { x: number; y: number };
  ledPos: { x: number; y: number };
}

// Component connection definitions (which sides connect when rotation=0)
const CONNECTIONS: Record<ComponentType, Direction[]> = {
  wire: ["left", "right"],
  corner: ["right", "down"],
  tee: ["left", "right", "down"],
  cross: ["up", "right", "down", "left"],
  battery: ["right"],
  led: ["left"],
  resistor: ["left", "right"],
  empty: [],
};

const LEVELS: Level[] = [
  // Level 1 - Simple straight line
  {
    grid: [
      ["empty", "empty", "empty", "empty", "empty"],
      ["battery", "wire", "wire", "wire", "led"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    batteryPos: { x: 0, y: 1 },
    ledPos: { x: 4, y: 1 },
  },
  // Level 2 - One corner
  {
    grid: [
      ["empty", "empty", "empty", "led", "empty"],
      ["empty", "empty", "empty", "wire", "empty"],
      ["battery", "wire", "wire", "corner", "empty"],
    ],
    batteryPos: { x: 0, y: 2 },
    ledPos: { x: 3, y: 0 },
  },
  // Level 3 - Multiple corners
  {
    grid: [
      ["battery", "wire", "corner", "empty", "empty"],
      ["empty", "empty", "wire", "empty", "empty"],
      ["empty", "empty", "corner", "wire", "led"],
    ],
    batteryPos: { x: 0, y: 0 },
    ledPos: { x: 4, y: 2 },
  },
  // Level 4 - T-junction
  {
    grid: [
      ["empty", "empty", "led", "empty", "empty"],
      ["battery", "wire", "tee", "wire", "led"],
      ["empty", "empty", "empty", "empty", "empty"],
    ],
    batteryPos: { x: 0, y: 1 },
    ledPos: { x: 4, y: 1 },
  },
  // Level 5 - Complex
  {
    grid: [
      ["empty", "corner", "wire", "corner", "empty"],
      ["battery", "corner", "empty", "tee", "led"],
      ["empty", "empty", "empty", "wire", "empty"],
      ["empty", "empty", "empty", "corner", "corner"],
    ],
    batteryPos: { x: 0, y: 1 },
    ledPos: { x: 4, y: 1 },
  },
];

export class ElectronicGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: Component[][] = [];
  gridWidth: number = 5;
  gridHeight: number = 3;
  cellSize: number = 80;

  currentLevel: number = 0;
  isPowered: boolean = false;
  status: "playing" | "won" = "playing";

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  public loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex] || LEVELS[0];
    this.gridHeight = level.grid.length;
    this.gridWidth = level.grid[0].length;

    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        const type = level.grid[y][x] as ComponentType;
        this.grid[y][x] = {
          type,
          rotation: this.getRandomRotation(type),
          powered: false,
          x,
          y,
        };
      }
    }

    this.status = "playing";
    this.checkCircuit();
    this.notifyState();
  }

  private getRandomRotation(type: ComponentType): number {
    if (type === "battery" || type === "led" || type === "empty") {
      return 0; // Fixed components
    }
    return [0, 90, 180, 270][Math.floor(Math.random() * 4)];
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);

    if (cellX < 0 || cellX >= this.gridWidth || cellY < 0 || cellY >= this.gridHeight) {
      return;
    }

    const component = this.grid[cellY][cellX];
    if (component.type !== "battery" && component.type !== "led" && component.type !== "empty") {
      component.rotation = (component.rotation + 90) % 360;
      this.checkCircuit();
      this.notifyState();
    }
  }

  private checkCircuit() {
    // Reset power state
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x].powered = false;
      }
    }

    // Find battery
    let batteryPos: { x: number; y: number } | null = null;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x].type === "battery") {
          batteryPos = { x, y };
          break;
        }
      }
    }

    if (!batteryPos) return;

    // BFS from battery
    const visited = new Set<string>();
    const queue: { x: number; y: number; fromDir: Direction | null }[] = [];

    this.grid[batteryPos.y][batteryPos.x].powered = true;
    queue.push({ x: batteryPos.x, y: batteryPos.y, fromDir: null });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const component = this.grid[current.y][current.x];
      component.powered = true;

      // Get connected directions for this component
      const connections = this.getRotatedConnections(component);

      // Check all connected directions
      for (const dir of connections) {
        const nextPos = this.getNeighbor(current.x, current.y, dir);
        if (!nextPos) continue;

        const neighbor = this.grid[nextPos.y][nextPos.x];
        if (neighbor.type === "empty") continue;

        const oppositeDir = this.getOppositeDirection(dir);
        const neighborConnections = this.getRotatedConnections(neighbor);

        // Check if neighbor connects back
        if (neighborConnections.includes(oppositeDir)) {
          queue.push({ x: nextPos.x, y: nextPos.y, fromDir: oppositeDir });
        }
      }
    }

    // Check if LED is powered
    this.isPowered = false;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x].type === "led" && this.grid[y][x].powered) {
          this.isPowered = true;
          this.status = "won";
        }
      }
    }
  }

  private getRotatedConnections(component: Component): Direction[] {
    const baseConnections = CONNECTIONS[component.type];
    const rotationSteps = component.rotation / 90;

    return baseConnections.map((dir) => {
      const directions: Direction[] = ["up", "right", "down", "left"];
      const currentIndex = directions.indexOf(dir);
      const newIndex = (currentIndex + rotationSteps) % 4;
      return directions[newIndex];
    });
  }

  private getNeighbor(x: number, y: number, dir: Direction): { x: number; y: number } | null {
    const offsets: Record<Direction, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -1 },
      right: { dx: 1, dy: 0 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
    };

    const nx = x + offsets[dir].dx;
    const ny = y + offsets[dir].dy;

    if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) {
      return null;
    }

    return { x: nx, y: ny };
  }

  private getOppositeDirection(dir: Direction): Direction {
    const opposites: Record<Direction, Direction> = {
      up: "down",
      right: "left",
      down: "up",
      left: "right",
    };
    return opposites[dir];
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background grid
    this.ctx.fillStyle = "#0a0a1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid pattern
    this.ctx.strokeStyle = "#1a1a3a";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.gridHeight * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.gridWidth * this.cellSize, y * this.cellSize);
      this.ctx.stroke();
    }

    // Draw components
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.drawComponent(this.grid[y][x]);
      }
    }
  }

  private drawComponent(component: Component) {
    const x = component.x * this.cellSize + this.cellSize / 2;
    const y = component.y * this.cellSize + this.cellSize / 2;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate((component.rotation * Math.PI) / 180);

    const color = component.powered ? "#00ff88" : "#444";
    const glowColor = component.powered ? "rgba(0, 255, 136, 0.5)" : "transparent";

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = "round";

    if (component.powered) {
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 15;
    }

    const size = this.cellSize / 2 - 5;

    switch (component.type) {
      case "wire":
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.stroke();
        break;

      case "corner":
        this.ctx.beginPath();
        this.ctx.moveTo(size, 0);
        this.ctx.lineTo(0, 0);
        this.ctx.lineTo(0, size);
        this.ctx.stroke();
        break;

      case "tee":
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, size);
        this.ctx.stroke();
        break;

      case "cross":
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(0, size);
        this.ctx.stroke();
        break;

      case "battery":
        // Battery body
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(-20, -15, 35, 30);
        this.ctx.fillStyle = component.powered ? "#00ff88" : "#666";
        this.ctx.fillRect(-15, -10, 10, 20);
        this.ctx.fillRect(0, -10, 10, 20);
        // + terminal
        this.ctx.fillStyle = "#ff0";
        this.ctx.fillRect(15, -5, 10, 10);
        // Wire out
        this.ctx.beginPath();
        this.ctx.moveTo(25, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.stroke();
        break;

      case "led":
        // Wire in
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(-10, 0);
        this.ctx.stroke();
        // LED body
        this.ctx.beginPath();
        this.ctx.arc(5, 0, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = component.powered ? "#ff0" : "#333";
        if (component.powered) {
          this.ctx.shadowColor = "#ff0";
          this.ctx.shadowBlur = 30;
        }
        this.ctx.fill();
        this.ctx.strokeStyle = component.powered ? "#ff0" : "#666";
        this.ctx.stroke();
        break;

      case "resistor":
        // Wire in/out
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(-15, 0);
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.stroke();
        // Zigzag
        this.ctx.beginPath();
        this.ctx.moveTo(-15, 0);
        this.ctx.lineTo(-10, -8);
        this.ctx.lineTo(-5, 8);
        this.ctx.lineTo(0, -8);
        this.ctx.lineTo(5, 8);
        this.ctx.lineTo(10, -8);
        this.ctx.lineTo(15, 0);
        this.ctx.stroke();
        break;
    }

    this.ctx.restore();
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.loop();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 400;

      // Calculate cell size
      this.cellSize = Math.min(
        Math.floor(this.canvas.width / this.gridWidth),
        Math.floor(this.canvas.height / this.gridHeight)
      );

      this.draw();
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        maxLevel: LEVELS.length,
        powered: this.isPowered,
        status: this.status,
      });
    }
  }
}
