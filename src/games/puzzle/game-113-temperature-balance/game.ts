interface Zone {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  temperature: number;
  targetTemp: number;
  neighbors: number[];
}

interface LevelConfig {
  zones: { temp: number; neighbors: number[] }[];
  targetTemp: number;
  layout: "row" | "grid";
}

const LEVELS: LevelConfig[] = [
  {
    zones: [
      { temp: 100, neighbors: [1] },
      { temp: 0, neighbors: [0, 2] },
      { temp: 50, neighbors: [1] },
    ],
    targetTemp: 50,
    layout: "row",
  },
  {
    zones: [
      { temp: 80, neighbors: [1, 2] },
      { temp: 20, neighbors: [0, 3] },
      { temp: 60, neighbors: [0, 3] },
      { temp: 40, neighbors: [1, 2] },
    ],
    targetTemp: 50,
    layout: "grid",
  },
  {
    zones: [
      { temp: 100, neighbors: [1] },
      { temp: 0, neighbors: [0, 2, 3] },
      { temp: 100, neighbors: [1] },
      { temp: 0, neighbors: [1, 4] },
      { temp: 100, neighbors: [3] },
    ],
    targetTemp: 60,
    layout: "row",
  },
  {
    zones: [
      { temp: 90, neighbors: [1, 3] },
      { temp: 10, neighbors: [0, 2, 4] },
      { temp: 70, neighbors: [1, 5] },
      { temp: 30, neighbors: [0, 4, 6] },
      { temp: 50, neighbors: [1, 3, 5, 7] },
      { temp: 50, neighbors: [2, 4, 8] },
      { temp: 40, neighbors: [3, 7] },
      { temp: 60, neighbors: [4, 6, 8] },
      { temp: 20, neighbors: [5, 7] },
    ],
    targetTemp: 50,
    layout: "grid",
  },
];

export class TemperatureBalanceGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  zones: Zone[] = [];
  targetTemp: number = 50;
  selectedZone: Zone | null = null;

  moves: number = 0;
  status: "playing" | "won" = "playing";
  animOffset: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.selectedZone = null;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: this.moves,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.targetTemp = config.targetTemp;

    const { width, height } = this.canvas;
    const zoneCount = config.zones.length;

    this.zones = [];

    if (config.layout === "row") {
      const zoneWidth = (width - 100) / zoneCount;
      const zoneHeight = 200;
      const startY = (height - zoneHeight) / 2;

      config.zones.forEach((z, i) => {
        this.zones.push({
          id: i,
          x: 50 + i * zoneWidth,
          y: startY,
          width: zoneWidth - 10,
          height: zoneHeight,
          temperature: z.temp,
          targetTemp: config.targetTemp,
          neighbors: z.neighbors,
        });
      });
    } else {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(zoneCount));
      const rows = Math.ceil(zoneCount / cols);
      const zoneWidth = (width - 100) / cols;
      const zoneHeight = (height - 100) / rows;

      config.zones.forEach((z, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        this.zones.push({
          id: i,
          x: 50 + col * zoneWidth,
          y: 50 + row * zoneHeight,
          width: zoneWidth - 10,
          height: zoneHeight - 10,
          temperature: z.temp,
          targetTemp: config.targetTemp,
          neighbors: z.neighbors,
        });
      });
    }
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
    this.animOffset += 0.05;
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    for (const zone of this.zones) {
      if (
        x >= zone.x &&
        x <= zone.x + zone.width &&
        y >= zone.y &&
        y <= zone.y + zone.height
      ) {
        if (this.selectedZone === null) {
          this.selectedZone = zone;
        } else if (this.selectedZone.id === zone.id) {
          this.selectedZone = null;
        } else if (this.selectedZone.neighbors.includes(zone.id)) {
          // Transfer heat
          this.transferHeat(this.selectedZone, zone);
          this.selectedZone = null;
        } else {
          this.selectedZone = zone;
        }
        return;
      }
    }
    this.selectedZone = null;
  }

  private transferHeat(from: Zone, to: Zone) {
    const transfer = 10;
    if (from.temperature >= transfer) {
      from.temperature -= transfer;
      to.temperature += transfer;
      this.moves++;

      if (this.onStateChange) {
        this.onStateChange({ moves: this.moves });
      }

      this.checkWin();
    }
  }

  private checkWin() {
    const tolerance = 5;
    const allBalanced = this.zones.every(
      (z) => Math.abs(z.temperature - this.targetTemp) <= tolerance
    );

    if (allBalanced) {
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

  private getTemperatureColor(temp: number): string {
    // Cold (0) = blue, Hot (100) = red
    const ratio = temp / 100;
    const r = Math.round(ratio * 255);
    const b = Math.round((1 - ratio) * 255);
    return `rgb(${r}, 50, ${b})`;
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#2c3e50");
    bgGradient.addColorStop(1, "#1a252f");
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw connection lines
    this.drawConnections();

    // Draw zones
    for (const zone of this.zones) {
      this.drawZone(zone);
    }

    // Draw target temperature indicator
    this.drawTargetIndicator();

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawConnections() {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 2;

    const drawn = new Set<string>();

    for (const zone of this.zones) {
      for (const neighborId of zone.neighbors) {
        const key = [zone.id, neighborId].sort().join("-");
        if (drawn.has(key)) continue;
        drawn.add(key);

        const neighbor = this.zones.find((z) => z.id === neighborId);
        if (!neighbor) continue;

        const fromX = zone.x + zone.width / 2;
        const fromY = zone.y + zone.height / 2;
        const toX = neighbor.x + neighbor.width / 2;
        const toY = neighbor.y + neighbor.height / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
      }
    }
  }

  private drawZone(zone: Zone) {
    const isSelected = this.selectedZone?.id === zone.id;
    const isNeighbor = this.selectedZone?.neighbors.includes(zone.id);
    const isBalanced = Math.abs(zone.temperature - this.targetTemp) <= 5;

    // Zone background with temperature color
    const tempGradient = this.ctx.createLinearGradient(
      zone.x,
      zone.y,
      zone.x,
      zone.y + zone.height
    );
    tempGradient.addColorStop(0, this.getTemperatureColor(zone.temperature));
    tempGradient.addColorStop(1, this.getTemperatureColor(zone.temperature * 0.8));

    this.ctx.fillStyle = tempGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 10);
    this.ctx.fill();

    // Heat waves animation
    if (zone.temperature > 50) {
      this.ctx.strokeStyle = `rgba(255, 100, 100, ${0.3 + Math.sin(this.animOffset + zone.id) * 0.2})`;
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const waveY = zone.y + 20 + i * 15 + Math.sin(this.animOffset * 2 + i) * 5;
        this.ctx.beginPath();
        this.ctx.moveTo(zone.x + 10, waveY);
        this.ctx.quadraticCurveTo(zone.x + zone.width / 2, waveY - 10, zone.x + zone.width - 10, waveY);
        this.ctx.stroke();
      }
    }

    // Border
    if (isSelected) {
      this.ctx.strokeStyle = "#f1c40f";
      this.ctx.lineWidth = 4;
    } else if (isNeighbor) {
      this.ctx.strokeStyle = "#2ecc71";
      this.ctx.lineWidth = 3;
    } else if (isBalanced) {
      this.ctx.strokeStyle = "#27ae60";
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.lineWidth = 2;
    }
    this.ctx.stroke();

    // Temperature display
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(`${Math.round(zone.temperature)}°`, zone.x + zone.width / 2, zone.y + zone.height / 2);

    // Thermometer icon
    this.drawThermometer(zone.x + zone.width / 2, zone.y + zone.height - 30, zone.temperature);
  }

  private drawThermometer(x: number, y: number, temp: number) {
    const height = 40;
    const width = 12;

    // Tube
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.beginPath();
    this.ctx.roundRect(x - width / 2, y - height, width, height, width / 2);
    this.ctx.fill();

    // Mercury
    const mercuryHeight = (temp / 100) * (height - 10);
    this.ctx.fillStyle = this.getTemperatureColor(temp);
    this.ctx.beginPath();
    this.ctx.roundRect(x - width / 2 + 2, y - mercuryHeight, width - 4, mercuryHeight, (width - 4) / 2);
    this.ctx.fill();

    // Bulb
    this.ctx.beginPath();
    this.ctx.arc(x, y + 5, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawTargetIndicator() {
    const { width } = this.canvas;

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`Target: ${this.targetTemp}°`, width / 2, 30);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.zones.length > 0) {
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
