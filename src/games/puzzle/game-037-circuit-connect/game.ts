/**
 * Circuit Connect - Game #037
 * Connect circuit components to light up the bulb
 */

export type NodeType = 'power' | 'bulb' | 'wire' | 'switch' | 'empty';

export interface CircuitNode {
  type: NodeType;
  rotation: number; // 0, 90, 180, 270
  connections: boolean[]; // [top, right, bottom, left]
  powered: boolean;
  isOn: boolean; // For switches
}

export interface Level {
  grid: NodeType[][];
  rotations?: number[][];
}

const LEVELS: Level[] = [
  {
    grid: [
      ['power', 'wire', 'bulb'],
      ['empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty']
    ]
  },
  {
    grid: [
      ['power', 'wire', 'wire'],
      ['empty', 'empty', 'wire'],
      ['empty', 'bulb', 'wire']
    ]
  },
  {
    grid: [
      ['power', 'wire', 'empty', 'empty'],
      ['empty', 'wire', 'wire', 'wire'],
      ['empty', 'empty', 'empty', 'wire'],
      ['empty', 'bulb', 'wire', 'wire']
    ]
  },
  {
    grid: [
      ['power', 'wire', 'wire', 'empty'],
      ['empty', 'empty', 'wire', 'empty'],
      ['bulb', 'wire', 'wire', 'empty'],
      ['empty', 'empty', 'empty', 'empty']
    ]
  },
  {
    grid: [
      ['empty', 'power', 'wire', 'empty', 'empty'],
      ['empty', 'empty', 'wire', 'wire', 'empty'],
      ['empty', 'empty', 'empty', 'wire', 'empty'],
      ['bulb', 'wire', 'wire', 'wire', 'empty'],
      ['empty', 'empty', 'empty', 'empty', 'empty']
    ]
  }
];

// Connection patterns for each piece type
// [top, right, bottom, left] - true means has connection on that side
const PIECE_CONNECTIONS: Record<NodeType, boolean[]> = {
  'power': [false, true, false, false],
  'bulb': [false, false, false, true],
  'wire': [false, true, false, true], // Straight wire
  'switch': [false, true, false, true],
  'empty': [false, false, false, false]
};

export class CircuitGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: CircuitNode[][] = [];
  gridSize = 3;
  cellSize = 80;
  currentLevel = 0;

  status: 'playing' | 'won' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.grid.length;

    this.grid = level.grid.map((row, y) =>
      row.map((type, x) => {
        const baseConnections = [...PIECE_CONNECTIONS[type]];
        // Randomize rotation for wires
        let rotation = 0;
        if (type === 'wire') {
          rotation = Math.floor(Math.random() * 4) * 90;
        }

        return {
          type,
          rotation,
          connections: this.rotateConnections(baseConnections, rotation),
          powered: type === 'power',
          isOn: true
        };
      })
    );

    this.updatePower();
    this.notifyState();
  }

  private rotateConnections(connections: boolean[], rotation: number): boolean[] {
    const steps = Math.floor(rotation / 90) % 4;
    const result = [...connections];
    for (let i = 0; i < steps; i++) {
      const last = result.pop()!;
      result.unshift(last);
    }
    return result;
  }

  private updatePower() {
    // Reset power state
    this.grid.forEach(row => {
      row.forEach(node => {
        if (node.type !== 'power') {
          node.powered = false;
        }
      });
    });

    // BFS from power sources
    const queue: [number, number][] = [];

    // Find power sources
    this.grid.forEach((row, y) => {
      row.forEach((node, x) => {
        if (node.type === 'power') {
          queue.push([x, y]);
        }
      });
    });

    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const node = this.grid[y][x];
      node.powered = true;

      // Check neighbors
      const neighbors = [
        { dx: 0, dy: -1, fromDir: 2, toDir: 0 }, // top
        { dx: 1, dy: 0, fromDir: 3, toDir: 1 },  // right
        { dx: 0, dy: 1, fromDir: 0, toDir: 2 },  // bottom
        { dx: -1, dy: 0, fromDir: 1, toDir: 3 }  // left
      ];

      neighbors.forEach(({ dx, dy, fromDir, toDir }) => {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) return;

        const neighbor = this.grid[ny][nx];

        // Check if current node connects to this direction
        if (!node.connections[toDir]) return;

        // Check if neighbor connects back
        if (!neighbor.connections[fromDir]) return;

        // Check if switch is on
        if (neighbor.type === 'switch' && !neighbor.isOn) return;

        if (!visited.has(`${nx},${ny}`)) {
          queue.push([nx, ny]);
        }
      });
    }

    // Check win condition
    const allBulbsLit = this.grid.every(row =>
      row.every(node => node.type !== 'bulb' || node.powered)
    );

    if (allBulbsLit && this.status === 'playing') {
      this.status = 'won';
      this.notifyState();
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== 'playing') return;

    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    const gridX = Math.floor((x - offsetX) / this.cellSize);
    const gridY = Math.floor((y - offsetY) / this.cellSize);

    if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) return;

    const node = this.grid[gridY][gridX];

    if (node.type === 'wire') {
      // Rotate wire
      node.rotation = (node.rotation + 90) % 360;
      const baseConnections = [...PIECE_CONNECTIONS[node.type]];
      node.connections = this.rotateConnections(baseConnections, node.rotation);

      this.updatePower();
      this.draw();
    } else if (node.type === 'switch') {
      node.isOn = !node.isOn;
      this.updatePower();
      this.draw();
    }
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    // Draw grid background
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const px = offsetX + x * this.cellSize;
        const py = offsetY + y * this.cellSize;

        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
        this.ctx.strokeStyle = '#2d2d4a';
        this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
      }
    }

    // Draw nodes
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const node = this.grid[y][x];
        const px = offsetX + x * this.cellSize + this.cellSize / 2;
        const py = offsetY + y * this.cellSize + this.cellSize / 2;

        this.drawNode(node, px, py);
      }
    }
  }

  private drawNode(node: CircuitNode, cx: number, cy: number) {
    const size = this.cellSize * 0.8;
    const wireWidth = 8;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate((node.rotation * Math.PI) / 180);

    const color = node.powered ? '#f1c40f' : '#555';
    const glowColor = node.powered ? 'rgba(241, 196, 15, 0.5)' : 'transparent';

    if (node.type === 'power') {
      // Power source
      this.ctx.shadowColor = '#e74c3c';
      this.ctx.shadowBlur = node.powered ? 20 : 0;
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Connection wire
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = wireWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(size / 3, 0);
      this.ctx.lineTo(size / 2, 0);
      this.ctx.stroke();

      // + symbol
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('+', 0, 0);
    } else if (node.type === 'bulb') {
      // Bulb
      this.ctx.shadowColor = node.powered ? '#f1c40f' : 'transparent';
      this.ctx.shadowBlur = node.powered ? 30 : 0;

      this.ctx.fillStyle = node.powered ? '#f1c40f' : '#444';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Connection wire
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = wireWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(-size / 2, 0);
      this.ctx.lineTo(-size / 3, 0);
      this.ctx.stroke();

      // Bulb base
      this.ctx.fillStyle = '#7f8c8d';
      this.ctx.fillRect(-5, size / 3 - 5, 10, 10);
    } else if (node.type === 'wire') {
      // Wire (straight)
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = node.powered ? 15 : 0;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = wireWidth;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(-size / 2, 0);
      this.ctx.lineTo(size / 2, 0);
      this.ctx.stroke();

      // Node point
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, wireWidth / 2 + 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (node.type === 'switch') {
      // Switch
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = wireWidth;

      if (node.isOn) {
        this.ctx.beginPath();
        this.ctx.moveTo(-size / 2, 0);
        this.ctx.lineTo(size / 2, 0);
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(-size / 2, 0);
        this.ctx.lineTo(-size / 6, 0);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(-size / 6, 0);
        this.ctx.lineTo(size / 6, -size / 4);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(size / 6, 0);
        this.ctx.lineTo(size / 2, 0);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 400;
      this.cellSize = Math.min(80, (this.canvas.width - 40) / this.gridSize);
    }
    this.draw();
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  public nextLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
