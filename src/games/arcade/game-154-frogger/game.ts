/**
 * Frogger Game Engine
 * Game #154
 *
 * Classic Frogger - cross the road safely!
 */

interface Vehicle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: "car" | "truck" | "log";
  color: string;
}

interface Lane {
  y: number;
  type: "road" | "water" | "safe" | "goal";
  vehicles: Vehicle[];
  direction: 1 | -1;
  speed: number;
}

interface GameState {
  score: number;
  lives: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

const GRID_ROWS = 13;
const VEHICLE_COLORS = ["#e74c3c", "#3498db", "#f39c12", "#9b59b6", "#1abc9c"];

export class FroggerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frogX = 0;
  private frogY = 0;
  private cellWidth = 0;
  private cellHeight = 0;
  private lanes: Lane[] = [];
  private score = 0;
  private lives = 3;
  private status: "idle" | "playing" | "won" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private goalsReached: boolean[] = [false, false, false, false, false];
  private frogOnLog: Vehicle | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        lives: this.lives,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.cellWidth = size / 11;
    this.cellHeight = size / GRID_ROWS;

    this.createLanes();
    this.draw();
  }

  private createLanes() {
    this.lanes = [];

    // Row 0: Goal
    this.lanes.push({ y: 0, type: "goal", vehicles: [], direction: 1, speed: 0 });

    // Rows 1-5: Water with logs
    for (let i = 1; i <= 5; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = 1 + Math.random() * 1.5;
      const lane: Lane = {
        y: i,
        type: "water",
        vehicles: [],
        direction: dir as 1 | -1,
        speed,
      };

      // Add logs
      const logCount = 2 + Math.floor(Math.random() * 2);
      const logWidth = this.cellWidth * (2 + Math.floor(Math.random() * 2));
      for (let j = 0; j < logCount; j++) {
        lane.vehicles.push({
          x: j * (this.canvas.width / logCount) + Math.random() * 50,
          y: i * this.cellHeight,
          width: logWidth,
          height: this.cellHeight - 4,
          speed: speed * dir,
          type: "log",
          color: "#8b4513",
        });
      }
      this.lanes.push(lane);
    }

    // Row 6: Safe zone
    this.lanes.push({ y: 6, type: "safe", vehicles: [], direction: 1, speed: 0 });

    // Rows 7-11: Road with cars
    for (let i = 7; i <= 11; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const speed = 2 + Math.random() * 2;
      const lane: Lane = {
        y: i,
        type: "road",
        vehicles: [],
        direction: dir as 1 | -1,
        speed,
      };

      // Add vehicles
      const vehicleCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < vehicleCount; j++) {
        const isTruck = Math.random() > 0.7;
        lane.vehicles.push({
          x: j * (this.canvas.width / vehicleCount) + Math.random() * 80,
          y: i * this.cellHeight,
          width: isTruck ? this.cellWidth * 2 : this.cellWidth * 1.2,
          height: this.cellHeight - 8,
          speed: speed * dir,
          type: isTruck ? "truck" : "car",
          color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
        });
      }
      this.lanes.push(lane);
    }

    // Row 12: Start
    this.lanes.push({ y: 12, type: "safe", vehicles: [], direction: 1, speed: 0 });
  }

  start() {
    this.score = 0;
    this.lives = 3;
    this.goalsReached = [false, false, false, false, false];
    this.resetFrog();
    this.createLanes();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private resetFrog() {
    this.frogX = 5;
    this.frogY = 12;
    this.frogOnLog = null;
  }

  move(dir: "up" | "down" | "left" | "right") {
    if (this.status !== "playing") return;

    switch (dir) {
      case "up":
        if (this.frogY > 0) this.frogY--;
        break;
      case "down":
        if (this.frogY < 12) this.frogY++;
        break;
      case "left":
        if (this.frogX > 0) this.frogX--;
        break;
      case "right":
        if (this.frogX < 10) this.frogX++;
        break;
    }

    // Check if reached goal
    if (this.frogY === 0) {
      const goalIndex = Math.floor(this.frogX / 2.2);
      if (goalIndex >= 0 && goalIndex < 5 && !this.goalsReached[goalIndex]) {
        this.goalsReached[goalIndex] = true;
        this.score += 100;
        this.emitState();

        // Check win
        if (this.goalsReached.every((g) => g)) {
          this.status = "won";
          this.emitState();
          return;
        }
      }
      this.resetFrog();
    }
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    // Move vehicles
    for (const lane of this.lanes) {
      for (const vehicle of lane.vehicles) {
        vehicle.x += vehicle.speed;

        // Wrap around
        if (vehicle.speed > 0 && vehicle.x > this.canvas.width) {
          vehicle.x = -vehicle.width;
        } else if (vehicle.speed < 0 && vehicle.x + vehicle.width < 0) {
          vehicle.x = this.canvas.width;
        }
      }
    }

    // Check collisions
    const frogCenterX = this.frogX * this.cellWidth + this.cellWidth / 2;
    const frogCenterY = this.frogY * this.cellHeight + this.cellHeight / 2;
    const frogRadius = this.cellWidth * 0.35;

    const currentLane = this.lanes.find((l) => l.y === this.frogY);
    if (!currentLane) return;

    if (currentLane.type === "road") {
      // Check car collision
      for (const vehicle of currentLane.vehicles) {
        if (
          frogCenterX + frogRadius > vehicle.x &&
          frogCenterX - frogRadius < vehicle.x + vehicle.width &&
          frogCenterY + frogRadius > vehicle.y &&
          frogCenterY - frogRadius < vehicle.y + vehicle.height
        ) {
          this.die();
          return;
        }
      }
    } else if (currentLane.type === "water") {
      // Must be on a log
      let onLog = false;
      for (const vehicle of currentLane.vehicles) {
        if (
          frogCenterX > vehicle.x &&
          frogCenterX < vehicle.x + vehicle.width
        ) {
          onLog = true;
          // Move frog with log
          this.frogX += vehicle.speed / this.cellWidth;
          break;
        }
      }

      if (!onLog) {
        this.die();
        return;
      }

      // Check if frog went off screen
      if (this.frogX < -0.5 || this.frogX > 10.5) {
        this.die();
      }
    }
  }

  private die() {
    this.lives--;
    this.emitState();

    if (this.lives <= 0) {
      this.status = "over";
      this.emitState();
    } else {
      this.resetFrog();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw lanes
    for (let i = 0; i < GRID_ROWS; i++) {
      const y = i * this.cellHeight;
      const lane = this.lanes.find((l) => l.y === i);

      if (lane) {
        switch (lane.type) {
          case "goal":
            ctx.fillStyle = "#27ae60";
            break;
          case "water":
            ctx.fillStyle = "#3498db";
            break;
          case "road":
            ctx.fillStyle = "#2d3436";
            break;
          case "safe":
            ctx.fillStyle = "#27ae60";
            break;
        }
      } else {
        ctx.fillStyle = "#27ae60";
      }

      ctx.fillRect(0, y, w, this.cellHeight);

      // Road markings
      if (lane?.type === "road") {
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(0, y + this.cellHeight / 2);
        ctx.lineTo(w, y + this.cellHeight / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw goals
    for (let i = 0; i < 5; i++) {
      const gx = i * (w / 5) + (w / 5 - this.cellWidth) / 2;
      ctx.fillStyle = this.goalsReached[i] ? "#f39c12" : "#1e8449";
      ctx.beginPath();
      ctx.arc(gx + this.cellWidth / 2, this.cellHeight / 2, this.cellWidth / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw vehicles
    for (const lane of this.lanes) {
      for (const vehicle of lane.vehicles) {
        this.drawVehicle(vehicle);
      }
    }

    // Draw frog
    this.drawFrog();
  }

  private drawVehicle(vehicle: Vehicle) {
    const ctx = this.ctx;

    if (vehicle.type === "log") {
      // Log
      ctx.fillStyle = "#8b4513";
      ctx.beginPath();
      ctx.roundRect(vehicle.x, vehicle.y + 2, vehicle.width, vehicle.height, 8);
      ctx.fill();

      // Wood grain
      ctx.strokeStyle = "#5d3a1a";
      ctx.lineWidth = 2;
      for (let i = 0; i < vehicle.width; i += 15) {
        ctx.beginPath();
        ctx.arc(vehicle.x + i, vehicle.y + vehicle.height / 2 + 2, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Car/truck body
      ctx.fillStyle = vehicle.color;
      ctx.beginPath();
      ctx.roundRect(vehicle.x, vehicle.y + 4, vehicle.width, vehicle.height, 4);
      ctx.fill();

      // Windows
      ctx.fillStyle = "#dfe6e9";
      const windowWidth = vehicle.width * 0.25;
      ctx.fillRect(vehicle.x + vehicle.width * 0.15, vehicle.y + 8, windowWidth, vehicle.height * 0.5);
      ctx.fillRect(vehicle.x + vehicle.width * 0.55, vehicle.y + 8, windowWidth, vehicle.height * 0.5);

      // Wheels
      ctx.fillStyle = "#2d3436";
      ctx.beginPath();
      ctx.arc(vehicle.x + 8, vehicle.y + vehicle.height + 2, 4, 0, Math.PI * 2);
      ctx.arc(vehicle.x + vehicle.width - 8, vehicle.y + vehicle.height + 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFrog() {
    const ctx = this.ctx;
    const x = this.frogX * this.cellWidth + this.cellWidth / 2;
    const y = this.frogY * this.cellHeight + this.cellHeight / 2;
    const radius = this.cellWidth * 0.35;

    // Body
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x - radius * 0.4, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.4, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.arc(x - radius * 0.4, y - radius * 0.3, radius * 0.12, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.4, y - radius * 0.3, radius * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.7, y + radius * 0.5, radius * 0.3, radius * 0.2, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + radius * 0.7, y + radius * 0.5, radius * 0.3, radius * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
