type Direction = "left" | "right" | "up" | "down";

interface Track {
  x: number;
  y: number;
  type: "horizontal" | "vertical" | "corner-tl" | "corner-tr" | "corner-bl" | "corner-br" | "switch";
  switchState?: "left" | "right";
}

interface Train {
  x: number;
  y: number;
  direction: Direction;
  color: string;
  targetStation: number;
  arrived: boolean;
}

interface Station {
  x: number;
  y: number;
  color: string;
  id: number;
}

interface LevelConfig {
  gridWidth: number;
  gridHeight: number;
  tracks: Track[];
  trains: { x: number; y: number; direction: Direction; color: string; target: number }[];
  stations: { x: number; y: number; color: string }[];
}

const LEVELS: LevelConfig[] = [
  {
    gridWidth: 8,
    gridHeight: 6,
    tracks: [
      { x: 0, y: 2, type: "horizontal" },
      { x: 1, y: 2, type: "horizontal" },
      { x: 2, y: 2, type: "switch", switchState: "left" },
      { x: 3, y: 2, type: "horizontal" },
      { x: 4, y: 2, type: "horizontal" },
      { x: 5, y: 2, type: "horizontal" },
      { x: 6, y: 2, type: "horizontal" },
      { x: 7, y: 2, type: "horizontal" },
      { x: 2, y: 1, type: "vertical" },
      { x: 2, y: 0, type: "corner-tr" },
      { x: 3, y: 0, type: "horizontal" },
      { x: 4, y: 0, type: "horizontal" },
    ],
    trains: [{ x: 0, y: 2, direction: "right", color: "#e74c3c", target: 0 }],
    stations: [{ x: 7, y: 2, color: "#e74c3c" }],
  },
  {
    gridWidth: 8,
    gridHeight: 6,
    tracks: [
      { x: 0, y: 1, type: "horizontal" },
      { x: 1, y: 1, type: "horizontal" },
      { x: 2, y: 1, type: "switch", switchState: "right" },
      { x: 3, y: 1, type: "horizontal" },
      { x: 4, y: 1, type: "corner-br" },
      { x: 4, y: 2, type: "vertical" },
      { x: 4, y: 3, type: "corner-tr" },
      { x: 5, y: 3, type: "horizontal" },
      { x: 6, y: 3, type: "horizontal" },
      { x: 7, y: 3, type: "horizontal" },
      { x: 2, y: 2, type: "vertical" },
      { x: 2, y: 3, type: "corner-tr" },
      { x: 3, y: 3, type: "horizontal" },
    ],
    trains: [{ x: 0, y: 1, direction: "right", color: "#3498db", target: 0 }],
    stations: [{ x: 7, y: 3, color: "#3498db" }],
  },
  {
    gridWidth: 8,
    gridHeight: 6,
    tracks: [
      { x: 0, y: 1, type: "horizontal" },
      { x: 1, y: 1, type: "switch", switchState: "left" },
      { x: 2, y: 1, type: "horizontal" },
      { x: 3, y: 1, type: "horizontal" },
      { x: 1, y: 2, type: "vertical" },
      { x: 1, y: 3, type: "corner-tr" },
      { x: 2, y: 3, type: "horizontal" },
      { x: 3, y: 3, type: "switch", switchState: "right" },
      { x: 4, y: 3, type: "horizontal" },
      { x: 5, y: 3, type: "horizontal" },
      { x: 3, y: 4, type: "vertical" },
      { x: 3, y: 5, type: "horizontal" },
    ],
    trains: [
      { x: 0, y: 1, direction: "right", color: "#e74c3c", target: 0 },
    ],
    stations: [{ x: 5, y: 3, color: "#e74c3c" }],
  },
];

export class TrackSwitchGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  gridWidth: number = 8;
  gridHeight: number = 6;
  cellSize: number = 50;
  offsetX: number = 0;
  offsetY: number = 0;

  tracks: Track[] = [];
  trains: Train[] = [];
  stations: Station[] = [];

  arrivedCount: number = 0;
  status: "playing" | "won" | "lost" = "playing";

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.arrivedCount = 0;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        trains: `0/${this.trains.length}`,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.gridWidth = config.gridWidth;
    this.gridHeight = config.gridHeight;

    const { width, height } = this.canvas;
    this.cellSize = Math.min(
      (width - 40) / this.gridWidth,
      (height - 40) / this.gridHeight
    );
    this.offsetX = (width - this.gridWidth * this.cellSize) / 2;
    this.offsetY = (height - this.gridHeight * this.cellSize) / 2;

    // Copy tracks
    this.tracks = config.tracks.map((t) => ({ ...t }));

    // Create trains
    this.trains = config.trains.map((t) => ({
      x: t.x * this.cellSize + this.cellSize / 2,
      y: t.y * this.cellSize + this.cellSize / 2,
      direction: t.direction,
      color: t.color,
      targetStation: t.target,
      arrived: false,
    }));

    // Create stations
    this.stations = config.stations.map((s, i) => ({
      x: s.x,
      y: s.y,
      color: s.color,
      id: i,
    }));

    this.arrivedCount = 0;
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
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    const speed = 1.5;

    for (const train of this.trains) {
      if (train.arrived) continue;

      // Move train
      switch (train.direction) {
        case "right":
          train.x += speed;
          break;
        case "left":
          train.x -= speed;
          break;
        case "up":
          train.y -= speed;
          break;
        case "down":
          train.y += speed;
          break;
      }

      // Check track transitions
      const gridX = Math.floor((train.x - this.offsetX) / this.cellSize);
      const gridY = Math.floor((train.y - this.offsetY) / this.cellSize);

      const track = this.tracks.find((t) => t.x === gridX && t.y === gridY);
      if (track) {
        const cellCenterX = this.offsetX + (gridX + 0.5) * this.cellSize;
        const cellCenterY = this.offsetY + (gridY + 0.5) * this.cellSize;

        // At center of cell, change direction based on track type
        const distToCenter = Math.sqrt((train.x - cellCenterX) ** 2 + (train.y - cellCenterY) ** 2);
        if (distToCenter < speed * 2) {
          train.direction = this.getNewDirection(train.direction, track);
        }
      }

      // Check station arrival
      for (const station of this.stations) {
        const stationX = this.offsetX + (station.x + 0.5) * this.cellSize;
        const stationY = this.offsetY + (station.y + 0.5) * this.cellSize;
        const dist = Math.sqrt((train.x - stationX) ** 2 + (train.y - stationY) ** 2);

        if (dist < this.cellSize / 3 && station.id === train.targetStation) {
          train.arrived = true;
          this.arrivedCount++;

          if (this.onStateChange) {
            this.onStateChange({
              trains: `${this.arrivedCount}/${this.trains.length}`,
            });
          }

          if (this.arrivedCount === this.trains.length) {
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
      }

      // Check out of bounds
      if (
        train.x < this.offsetX - 50 ||
        train.x > this.offsetX + this.gridWidth * this.cellSize + 50 ||
        train.y < this.offsetY - 50 ||
        train.y > this.offsetY + this.gridHeight * this.cellSize + 50
      ) {
        this.status = "lost";
        if (this.onStateChange) {
          this.onStateChange({ status: "lost" });
        }
      }
    }
  }

  private getNewDirection(current: Direction, track: Track): Direction {
    if (track.type === "switch") {
      if (current === "right" && track.switchState === "right") {
        return "down";
      }
      if (current === "right" && track.switchState === "left") {
        return "right";
      }
      if (current === "left" && track.switchState === "right") {
        return "up";
      }
      if (current === "up" && track.switchState === "right") {
        return "left";
      }
      if (current === "down" && track.switchState === "right") {
        return "right";
      }
    }

    switch (track.type) {
      case "corner-tl":
        return current === "right" ? "down" : current === "up" ? "left" : current;
      case "corner-tr":
        return current === "left" ? "down" : current === "up" ? "right" : current;
      case "corner-bl":
        return current === "right" ? "up" : current === "down" ? "left" : current;
      case "corner-br":
        return current === "left" ? "up" : current === "down" ? "right" : current;
      default:
        return current;
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const gridX = Math.floor((x - this.offsetX) / this.cellSize);
    const gridY = Math.floor((y - this.offsetY) / this.cellSize);

    const track = this.tracks.find((t) => t.x === gridX && t.y === gridY && t.type === "switch");
    if (track) {
      track.switchState = track.switchState === "left" ? "right" : "left";
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Background (grass)
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#4a7c44");
    gradient.addColorStop(1, "#3d6339");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid pattern (subtle)
    this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.gridWidth; x++) {
      const px = this.offsetX + x * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(px, this.offsetY);
      this.ctx.lineTo(px, this.offsetY + this.gridHeight * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      const py = this.offsetY + y * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, py);
      this.ctx.lineTo(this.offsetX + this.gridWidth * this.cellSize, py);
      this.ctx.stroke();
    }

    // Draw tracks
    for (const track of this.tracks) {
      this.drawTrack(track);
    }

    // Draw stations
    for (const station of this.stations) {
      this.drawStation(station);
    }

    // Draw trains
    for (const train of this.trains) {
      if (!train.arrived) {
        this.drawTrain(train);
      }
    }

    // Win/lose effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    } else if (this.status === "lost") {
      this.ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawTrack(track: Track) {
    const x = this.offsetX + track.x * this.cellSize;
    const y = this.offsetY + track.y * this.cellSize;
    const size = this.cellSize;

    // Track bed
    this.ctx.fillStyle = "#5d4037";

    // Draw track based on type
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 8;

    const cx = x + size / 2;
    const cy = y + size / 2;

    this.ctx.beginPath();

    switch (track.type) {
      case "horizontal":
        this.ctx.moveTo(x, cy);
        this.ctx.lineTo(x + size, cy);
        break;
      case "vertical":
        this.ctx.moveTo(cx, y);
        this.ctx.lineTo(cx, y + size);
        break;
      case "corner-tl":
        this.ctx.arc(x, y, size / 2, 0, Math.PI / 2);
        break;
      case "corner-tr":
        this.ctx.arc(x + size, y, size / 2, Math.PI / 2, Math.PI);
        break;
      case "corner-bl":
        this.ctx.arc(x, y + size, size / 2, -Math.PI / 2, 0);
        break;
      case "corner-br":
        this.ctx.arc(x + size, y + size, size / 2, Math.PI, -Math.PI / 2);
        break;
      case "switch":
        // Main track
        this.ctx.moveTo(x, cy);
        this.ctx.lineTo(x + size, cy);
        this.ctx.stroke();

        // Switch track
        this.ctx.beginPath();
        this.ctx.strokeStyle = track.switchState === "right" ? "#f39c12" : "#888";
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(cx, y + size);
        break;
    }

    this.ctx.stroke();

    // Rail ties
    this.ctx.strokeStyle = "#8d6e63";
    this.ctx.lineWidth = 3;

    if (track.type === "horizontal" || track.type === "switch") {
      for (let i = 0; i < 4; i++) {
        const tx = x + (i + 0.5) * (size / 4);
        this.ctx.beginPath();
        this.ctx.moveTo(tx, cy - 8);
        this.ctx.lineTo(tx, cy + 8);
        this.ctx.stroke();
      }
    }

    if (track.type === "vertical") {
      for (let i = 0; i < 4; i++) {
        const ty = y + (i + 0.5) * (size / 4);
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, ty);
        this.ctx.lineTo(cx + 8, ty);
        this.ctx.stroke();
      }
    }

    // Switch indicator
    if (track.type === "switch") {
      this.ctx.fillStyle = track.switchState === "right" ? "#f39c12" : "#2ecc71";
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      if (track.switchState === "right") {
        this.ctx.moveTo(cx, cy - 4);
        this.ctx.lineTo(cx, cy + 4);
      } else {
        this.ctx.moveTo(cx - 4, cy);
        this.ctx.lineTo(cx + 4, cy);
      }
      this.ctx.stroke();
    }
  }

  private drawStation(station: Station) {
    const x = this.offsetX + (station.x + 0.5) * this.cellSize;
    const y = this.offsetY + (station.y + 0.5) * this.cellSize;
    const size = this.cellSize * 0.4;

    // Platform
    this.ctx.fillStyle = "#bdc3c7";
    this.ctx.fillRect(x - size * 1.2, y - size, size * 2.4, size * 2);

    // Building
    this.ctx.fillStyle = station.color;
    this.ctx.fillRect(x - size, y - size * 0.8, size * 2, size * 1.6);

    // Roof
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.moveTo(x - size * 1.2, y - size * 0.8);
    this.ctx.lineTo(x, y - size * 1.5);
    this.ctx.lineTo(x + size * 1.2, y - size * 0.8);
    this.ctx.closePath();
    this.ctx.fill();

    // Door
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.fillRect(x - size * 0.2, y, size * 0.4, size * 0.8);
  }

  private drawTrain(train: Train) {
    this.ctx.save();
    this.ctx.translate(train.x, train.y);

    // Rotate based on direction
    let angle = 0;
    switch (train.direction) {
      case "right":
        angle = 0;
        break;
      case "down":
        angle = Math.PI / 2;
        break;
      case "left":
        angle = Math.PI;
        break;
      case "up":
        angle = -Math.PI / 2;
        break;
    }
    this.ctx.rotate(angle);

    const w = this.cellSize * 0.6;
    const h = this.cellSize * 0.35;

    // Train body
    this.ctx.fillStyle = train.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-w / 2, -h / 2, w, h, 5);
    this.ctx.fill();

    // Front
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.moveTo(w / 2, -h / 2);
    this.ctx.lineTo(w / 2 + 8, 0);
    this.ctx.lineTo(w / 2, h / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Windows
    this.ctx.fillStyle = "#3498db";
    this.ctx.fillRect(-w / 4, -h / 3, w / 4, h / 2);
    this.ctx.fillRect(w / 8, -h / 3, w / 4, h / 2);

    // Wheels
    this.ctx.fillStyle = "#333";
    this.ctx.beginPath();
    this.ctx.arc(-w / 3, h / 2, 5, 0, Math.PI * 2);
    this.ctx.arc(w / 4, h / 2, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.tracks.length > 0) {
        this.cellSize = Math.min(
          (this.canvas.width - 40) / this.gridWidth,
          (this.canvas.height - 40) / this.gridHeight
        );
        this.offsetX = (this.canvas.width - this.gridWidth * this.cellSize) / 2;
        this.offsetY = (this.canvas.height - this.gridHeight * this.cellSize) / 2;
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
