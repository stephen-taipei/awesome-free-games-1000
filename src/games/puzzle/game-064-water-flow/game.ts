// Pipe types and their connections
// 0=top, 1=right, 2=bottom, 3=left
type PipeType = "straight" | "corner" | "tee" | "cross" | "source" | "target" | "empty";

export interface Pipe {
  type: PipeType;
  rotation: number; // 0, 90, 180, 270
  hasWater: boolean;
  waterLevel: number; // 0-1 for animation
}

export interface Level {
  grid: string[][];
  sourcePos: [number, number];
  targetPos: [number, number];
}

const PIPE_CONNECTIONS: Record<PipeType, number[]> = {
  straight: [0, 2], // top-bottom
  corner: [0, 1], // top-right
  tee: [0, 1, 2], // top-right-bottom
  cross: [0, 1, 2, 3], // all
  source: [1], // right only
  target: [3], // left only
  empty: [],
};

const LEVELS: Level[] = [
  {
    grid: [
      ["source", "straight", "corner", "empty"],
      ["empty", "empty", "straight", "empty"],
      ["empty", "empty", "corner", "target"],
    ],
    sourcePos: [0, 0],
    targetPos: [2, 3],
  },
  {
    grid: [
      ["source", "corner", "empty", "empty"],
      ["empty", "tee", "corner", "empty"],
      ["empty", "corner", "tee", "target"],
    ],
    sourcePos: [0, 0],
    targetPos: [2, 3],
  },
  {
    grid: [
      ["source", "straight", "corner", "empty", "empty"],
      ["empty", "empty", "tee", "corner", "empty"],
      ["empty", "empty", "corner", "straight", "target"],
    ],
    sourcePos: [0, 0],
    targetPos: [2, 4],
  },
  {
    grid: [
      ["source", "corner", "empty", "corner", "straight"],
      ["empty", "tee", "corner", "tee", "corner"],
      ["empty", "corner", "straight", "corner", "target"],
    ],
    sourcePos: [0, 0],
    targetPos: [2, 4],
  },
];

export class WaterFlowGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: Pipe[][] = [];
  level: number = 1;
  currentLevel: Level;
  moves: number = 0;
  status: "playing" | "flowing" | "won" | "failed" = "playing";
  cellSize: number = 80;
  offsetX: number = 0;
  offsetY: number = 0;

  onStateChange: ((s: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.currentLevel = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.initGrid();
    this.scramble();
    this.resize();
    this.draw();
    this.notifyChange();
  }

  private initGrid() {
    this.grid = this.currentLevel.grid.map((row) =>
      row.map((type) => ({
        type: type as PipeType,
        rotation: 0,
        hasWater: false,
        waterLevel: 0,
      }))
    );
  }

  private scramble() {
    this.grid.forEach((row, r) => {
      row.forEach((pipe, c) => {
        if (pipe.type !== "source" && pipe.type !== "target" && pipe.type !== "empty") {
          pipe.rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
        }
      });
    });
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const col = Math.floor((x - this.offsetX) / this.cellSize);
    const row = Math.floor((y - this.offsetY) / this.cellSize);

    if (row < 0 || row >= this.grid.length || col < 0 || col >= this.grid[0].length) {
      return;
    }

    const pipe = this.grid[row][col];
    if (pipe.type !== "source" && pipe.type !== "target" && pipe.type !== "empty") {
      pipe.rotation = (pipe.rotation + 90) % 360;
      this.moves++;
      this.draw();
      this.notifyChange();
    }
  }

  public startFlow() {
    if (this.status !== "playing") return;
    this.status = "flowing";

    // Reset water
    this.grid.forEach((row) => {
      row.forEach((pipe) => {
        pipe.hasWater = false;
        pipe.waterLevel = 0;
      });
    });

    // Start from source
    const [sourceRow, sourceCol] = this.currentLevel.sourcePos;
    this.grid[sourceRow][sourceCol].hasWater = true;
    this.grid[sourceRow][sourceCol].waterLevel = 1;

    this.flowWater();
  }

  private flowWater() {
    const [sourceRow, sourceCol] = this.currentLevel.sourcePos;
    const [targetRow, targetCol] = this.currentLevel.targetPos;
    const visited = new Set<string>();
    const queue: [number, number][] = [[sourceRow, sourceCol]];
    visited.add(`${sourceRow},${sourceCol}`);

    const flowStep = () => {
      if (queue.length === 0) {
        // Check if target has water
        if (this.grid[targetRow][targetCol].hasWater) {
          this.status = "won";
        } else {
          this.status = "failed";
        }
        this.notifyChange();
        return;
      }

      const [r, c] = queue.shift()!;
      const pipe = this.grid[r][c];
      pipe.hasWater = true;

      // Animate water fill
      this.animateWaterFill(r, c, () => {
        // Find connected neighbors
        const connections = this.getRotatedConnections(pipe);

        const directions = [
          [-1, 0, 0, 2], // top connects to neighbor's bottom
          [0, 1, 1, 3], // right connects to neighbor's left
          [1, 0, 2, 0], // bottom connects to neighbor's top
          [0, -1, 3, 1], // left connects to neighbor's right
        ];

        directions.forEach(([dr, dc, myDir, neighborDir]) => {
          if (!connections.includes(myDir)) return;

          const nr = r + dr;
          const nc = c + dc;
          const key = `${nr},${nc}`;

          if (
            nr >= 0 &&
            nr < this.grid.length &&
            nc >= 0 &&
            nc < this.grid[0].length &&
            !visited.has(key)
          ) {
            const neighbor = this.grid[nr][nc];
            const neighborConnections = this.getRotatedConnections(neighbor);

            if (neighborConnections.includes(neighborDir)) {
              visited.add(key);
              queue.push([nr, nc]);
            }
          }
        });

        this.draw();
        setTimeout(flowStep, 200);
      });
    };

    flowStep();
  }

  private animateWaterFill(row: number, col: number, callback: () => void) {
    const pipe = this.grid[row][col];
    const duration = 150;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      pipe.waterLevel = Math.min(elapsed / duration, 1);
      this.draw();

      if (pipe.waterLevel < 1) {
        requestAnimationFrame(animate);
      } else {
        callback();
      }
    };

    animate();
  }

  private getRotatedConnections(pipe: Pipe): number[] {
    const base = PIPE_CONNECTIONS[pipe.type];
    const rotationSteps = pipe.rotation / 90;
    return base.map((dir) => (dir + rotationSteps) % 4);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;

      // Calculate cell size and offset
      const rows = this.grid.length;
      const cols = this.grid[0]?.length || 1;
      const maxCellW = (this.canvas.width - 40) / cols;
      const maxCellH = (this.canvas.height - 40) / rows;
      this.cellSize = Math.min(maxCellW, maxCellH, 80);
      this.offsetX = (this.canvas.width - cols * this.cellSize) / 2;
      this.offsetY = (this.canvas.height - rows * this.cellSize) / 2;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    this.grid.forEach((row, r) => {
      row.forEach((pipe, c) => {
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;
        this.drawPipe(x, y, pipe);
      });
    });
  }

  private drawPipe(x: number, y: number, pipe: Pipe) {
    const ctx = this.ctx;
    const size = this.cellSize;
    const center = size / 2;
    const pipeWidth = size * 0.3;

    // Background
    ctx.fillStyle = "#34495e";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    if (pipe.type === "empty") return;

    ctx.save();
    ctx.translate(x + center, y + center);
    ctx.rotate((pipe.rotation * Math.PI) / 180);

    const connections = PIPE_CONNECTIONS[pipe.type];

    // Draw pipe body
    ctx.fillStyle = "#7f8c8d";
    connections.forEach((dir) => {
      ctx.save();
      ctx.rotate((dir * Math.PI) / 2);
      ctx.fillRect(-pipeWidth / 2, -center, pipeWidth, center);
      ctx.restore();
    });

    // Draw center
    if (connections.length > 1 || pipe.type === "source" || pipe.type === "target") {
      ctx.beginPath();
      ctx.arc(0, 0, pipeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw water
    if (pipe.hasWater && pipe.waterLevel > 0) {
      ctx.fillStyle = "#3498db";
      const waterWidth = pipeWidth * 0.6;
      const waterAlpha = pipe.waterLevel;

      ctx.globalAlpha = waterAlpha;

      connections.forEach((dir) => {
        ctx.save();
        ctx.rotate((dir * Math.PI) / 2);
        ctx.fillRect(-waterWidth / 2, -center, waterWidth, center * pipe.waterLevel);
        ctx.restore();
      });

      if (connections.length > 1 || pipe.type === "source" || pipe.type === "target") {
        ctx.beginPath();
        ctx.arc(0, 0, waterWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    // Draw source/target icons
    if (pipe.type === "source") {
      ctx.fillStyle = "#27ae60";
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
    } else if (pipe.type === "target") {
      ctx.fillStyle = pipe.hasWater ? "#27ae60" : "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public reset() {
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        moves: this.moves,
        status: this.status,
      });
    }
  }
}
