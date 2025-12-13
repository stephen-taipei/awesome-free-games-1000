/**
 * Space Station Game Engine
 * Game #092 - Rotate modules to dock with station
 */

export interface Module {
  id: number;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  ports: number[]; // Array of directions with ports (0=up, 1=right, 2=down, 3=left)
  isStation: boolean;
  docked: boolean;
}

export interface LevelConfig {
  station: { x: number; y: number; ports: number[] };
  modules: { x: number; y: number; ports: number[]; targetRotation: number }[];
}

export class SpaceStationGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private modules: Module[] = [];
  private station: Module | null = null;
  private dockedCount = 0;
  private totalModules = 0;

  private currentLevel = 0;
  private status: "playing" | "won" = "playing";
  private animationId = 0;

  private onStateChange: ((state: any) => void) | null = null;

  private moduleSize = 60;

  private levels: LevelConfig[] = [
    // Level 1 - Simple
    {
      station: { x: 0.5, y: 0.5, ports: [0, 1, 2, 3] },
      modules: [
        { x: 0.5, y: 0.2, ports: [2], targetRotation: 0 },
        { x: 0.8, y: 0.5, ports: [3], targetRotation: 0 },
        { x: 0.5, y: 0.8, ports: [0], targetRotation: 0 },
      ],
    },
    // Level 2 - More modules
    {
      station: { x: 0.5, y: 0.5, ports: [0, 1, 2, 3] },
      modules: [
        { x: 0.5, y: 0.15, ports: [2], targetRotation: 0 },
        { x: 0.85, y: 0.5, ports: [3], targetRotation: 0 },
        { x: 0.5, y: 0.85, ports: [0], targetRotation: 0 },
        { x: 0.15, y: 0.5, ports: [1], targetRotation: 0 },
      ],
    },
    // Level 3 - Different rotations needed
    {
      station: { x: 0.5, y: 0.5, ports: [0, 1, 2, 3] },
      modules: [
        { x: 0.5, y: 0.15, ports: [0], targetRotation: 180 },
        { x: 0.85, y: 0.5, ports: [0], targetRotation: 270 },
        { x: 0.5, y: 0.85, ports: [1], targetRotation: 270 },
        { x: 0.15, y: 0.5, ports: [2], targetRotation: 270 },
      ],
    },
    // Level 4 - Multi-port modules
    {
      station: { x: 0.5, y: 0.5, ports: [0, 1, 2, 3] },
      modules: [
        { x: 0.5, y: 0.15, ports: [1, 2], targetRotation: 90 },
        { x: 0.85, y: 0.5, ports: [0, 3], targetRotation: 90 },
        { x: 0.5, y: 0.85, ports: [0, 1], targetRotation: 180 },
        { x: 0.15, y: 0.5, ports: [1, 2], targetRotation: 0 },
      ],
    },
    // Level 5 - Complex
    {
      station: { x: 0.5, y: 0.5, ports: [0, 1, 2, 3] },
      modules: [
        { x: 0.5, y: 0.1, ports: [0, 2], targetRotation: 0 },
        { x: 0.9, y: 0.5, ports: [1, 3], targetRotation: 0 },
        { x: 0.5, y: 0.9, ports: [0, 2], targetRotation: 0 },
        { x: 0.1, y: 0.5, ports: [1, 3], targetRotation: 0 },
        { x: 0.25, y: 0.25, ports: [1, 2], targetRotation: 0 },
      ],
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.dockedCount = 0;
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.modules = [];

    // Create station
    this.station = {
      id: -1,
      x: config.station.x * w,
      y: config.station.y * h,
      rotation: 0,
      ports: config.station.ports,
      isStation: true,
      docked: true,
    };

    // Create modules with random initial rotation
    this.totalModules = config.modules.length;
    config.modules.forEach((m, i) => {
      // Start with random rotation that isn't the target
      let initialRotation;
      do {
        initialRotation = Math.floor(Math.random() * 4) * 90;
      } while (initialRotation === m.targetRotation);

      this.modules.push({
        id: i,
        x: m.x * w,
        y: m.y * h,
        rotation: initialRotation,
        ports: m.ports,
        isStation: false,
        docked: false,
      });
    });

    this.checkAllDocking();
  }

  public stop() {
    cancelAnimationFrame(this.animationId);
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked module
    for (const module of this.modules) {
      const dist = Math.hypot(x - module.x, y - module.y);
      if (dist < this.moduleSize / 2 + 10) {
        // Rotate module
        module.rotation = (module.rotation + 90) % 360;
        this.checkAllDocking();
        break;
      }
    }
  }

  private checkAllDocking() {
    if (!this.station) return;

    this.dockedCount = 0;
    const config = this.levels[this.currentLevel % this.levels.length];

    this.modules.forEach((module, index) => {
      const targetConfig = config.modules[index];
      // Check if rotation matches target
      module.docked = module.rotation === targetConfig.targetRotation;
      if (module.docked) this.dockedCount++;
    });

    if (this.onStateChange) {
      this.onStateChange({
        docked: `${this.dockedCount}/${this.totalModules}`,
      });
    }

    if (this.dockedCount >= this.totalModules) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel,
        });
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear with space background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    // Draw stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 50; i++) {
      const sx = (Math.sin(i * 123.456) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 789.012) * 0.5 + 0.5) * h;
      const size = (Math.sin(i * 345.678) * 0.5 + 0.5) * 2 + 1;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw connection lines (docking tubes)
    if (this.station) {
      this.modules.forEach((module) => {
        ctx.strokeStyle = module.docked
          ? "rgba(46, 204, 113, 0.5)"
          : "rgba(116, 185, 255, 0.2)";
        ctx.lineWidth = module.docked ? 8 : 4;
        ctx.setLineDash(module.docked ? [] : [5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.station!.x, this.station!.y);
        ctx.lineTo(module.x, module.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Draw station
    if (this.station) {
      this.drawModule(this.station);
    }

    // Draw modules
    this.modules.forEach((module) => {
      this.drawModule(module);
    });
  }

  private drawModule(module: Module) {
    const ctx = this.ctx;
    const size = module.isStation ? this.moduleSize * 1.3 : this.moduleSize;

    ctx.save();
    ctx.translate(module.x, module.y);
    ctx.rotate((module.rotation * Math.PI) / 180);

    // Module body
    if (module.isStation) {
      // Station - octagonal shape
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides - Math.PI / 8;
        const x = Math.cos(angle) * size * 0.5;
        const y = Math.sin(angle) * size * 0.5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Station border
      ctx.strokeStyle = "#74b9ff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center light
      ctx.fillStyle = "#74b9ff";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Regular module - rounded rectangle
      const color = module.docked ? "#27ae60" : "#34495e";
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 8);
      ctx.fill();

      // Module border
      ctx.strokeStyle = module.docked ? "#2ecc71" : "#74b9ff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw ports
    module.ports.forEach((portDir) => {
      this.drawPort(ctx, portDir, size, module.isStation);
    });

    ctx.restore();
  }

  private drawPort(
    ctx: CanvasRenderingContext2D,
    direction: number,
    moduleSize: number,
    isStation: boolean
  ) {
    const portSize = 12;
    const offset = moduleSize / 2;

    ctx.save();
    ctx.rotate((direction * Math.PI) / 2);

    // Port body
    ctx.fillStyle = isStation ? "#74b9ff" : "#f39c12";
    ctx.fillRect(-portSize / 2, -offset - 5, portSize, 10);

    // Port indicator
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -offset, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.canvas.width = size;
      this.canvas.height = size;
      this.moduleSize = size / 8;
    }
  }

  public reset() {
    this.stop();
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
