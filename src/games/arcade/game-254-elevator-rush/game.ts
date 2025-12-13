/**
 * Elevator Rush Game Engine
 * Game #254
 *
 * Manage elevators to transport passengers to their floors
 */

interface Passenger {
  id: number;
  floor: number;
  targetFloor: number;
  x: number;
  waiting: boolean;
  inElevator: number;
  patience: number;
  maxPatience: number;
  color: string;
}

interface Elevator {
  id: number;
  x: number;
  y: number;
  targetY: number;
  floor: number;
  passengers: Passenger[];
  capacity: number;
  moving: boolean;
  doorOpen: boolean;
}

interface GameState {
  score: number;
  highScore: number;
  delivered: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const FLOOR_COUNT = 6;
const PASSENGER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

export class ElevatorRushGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private elevators: Elevator[] = [];
  private passengers: Passenger[] = [];
  private floorHeight = 0;
  private score = 0;
  private highScore = 0;
  private delivered = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private passengerIdCounter = 0;
  private selectedElevator: Elevator | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("elevator_rush_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("elevator_rush_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        delivered: this.delivered,
        status: this.status,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.floorHeight = (this.height - 40) / FLOOR_COUNT;
    this.initElevators();
    this.draw();
  }

  private initElevators() {
    const elevatorWidth = 50;
    const gap = 20;
    const startX = this.width / 2 - (elevatorWidth * 2 + gap) / 2;

    this.elevators = [
      {
        id: 0,
        x: startX,
        y: this.getFloorY(0),
        targetY: this.getFloorY(0),
        floor: 0,
        passengers: [],
        capacity: 3,
        moving: false,
        doorOpen: false,
      },
      {
        id: 1,
        x: startX + elevatorWidth + gap,
        y: this.getFloorY(0),
        targetY: this.getFloorY(0),
        floor: 0,
        passengers: [],
        capacity: 3,
        moving: false,
        doorOpen: false,
      },
    ];
  }

  private getFloorY(floor: number): number {
    return this.height - 40 - (floor + 1) * this.floorHeight + 10;
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicking on an elevator
    for (const elevator of this.elevators) {
      if (x >= elevator.x && x <= elevator.x + 50 && y >= elevator.y && y <= elevator.y + 60) {
        this.selectedElevator = elevator;
        return;
      }
    }

    // Check if clicking on a floor (to send elevator)
    if (this.selectedElevator) {
      const floor = this.getFloorFromY(y);
      if (floor >= 0 && floor < FLOOR_COUNT) {
        this.sendElevator(this.selectedElevator, floor);
        this.selectedElevator = null;
      }
    }
  }

  private getFloorFromY(y: number): number {
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const floorY = this.getFloorY(i);
      if (y >= floorY - 10 && y <= floorY + this.floorHeight - 10) {
        return i;
      }
    }
    return -1;
  }

  private sendElevator(elevator: Elevator, floor: number) {
    if (elevator.moving) return;

    elevator.targetY = this.getFloorY(floor);
    elevator.moving = true;
    elevator.doorOpen = false;
  }

  start() {
    this.score = 0;
    this.delivered = 0;
    this.passengers = [];
    this.spawnTimer = 0;
    this.passengerIdCounter = 0;
    this.selectedElevator = null;
    this.initElevators();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Spawn passengers
    this.spawnTimer += dt;
    const spawnInterval = Math.max(1500, 4000 - this.delivered * 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPassenger();
    }

    // Update elevators
    for (const elevator of this.elevators) {
      if (elevator.moving) {
        const dy = elevator.targetY - elevator.y;
        if (Math.abs(dy) < 2) {
          elevator.y = elevator.targetY;
          elevator.moving = false;
          elevator.floor = Math.round((this.height - 40 - elevator.y - 10) / this.floorHeight - 1);
          elevator.doorOpen = true;

          // Process passengers
          this.processElevator(elevator);
        } else {
          elevator.y += Math.sign(dy) * 3;
        }
      }
    }

    // Update passenger patience
    for (const passenger of this.passengers) {
      if (passenger.waiting) {
        passenger.patience -= dt;
        if (passenger.patience <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Remove delivered passengers
    this.passengers = this.passengers.filter((p) => p.waiting || p.inElevator >= 0);
  }

  private processElevator(elevator: Elevator) {
    // Let passengers out
    const exiting = elevator.passengers.filter((p) => p.targetFloor === elevator.floor);
    for (const passenger of exiting) {
      passenger.inElevator = -1;
      passenger.waiting = false;
      this.delivered++;
      this.score += 50 + Math.floor(passenger.patience / passenger.maxPatience * 50);

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }
    }
    elevator.passengers = elevator.passengers.filter((p) => p.targetFloor !== elevator.floor);

    // Let passengers in
    const waitingOnFloor = this.passengers.filter(
      (p) => p.waiting && p.floor === elevator.floor && p.inElevator < 0
    );
    for (const passenger of waitingOnFloor) {
      if (elevator.passengers.length < elevator.capacity) {
        passenger.waiting = false;
        passenger.inElevator = elevator.id;
        elevator.passengers.push(passenger);
      }
    }

    this.emitState();
  }

  private spawnPassenger() {
    const floor = Math.floor(Math.random() * FLOOR_COUNT);
    let targetFloor = Math.floor(Math.random() * FLOOR_COUNT);
    while (targetFloor === floor) {
      targetFloor = Math.floor(Math.random() * FLOOR_COUNT);
    }

    const floorY = this.getFloorY(floor);
    const waitingOnFloor = this.passengers.filter((p) => p.floor === floor && p.waiting);

    this.passengers.push({
      id: this.passengerIdCounter++,
      floor,
      targetFloor,
      x: 20 + waitingOnFloor.length * 25,
      waiting: true,
      inElevator: -1,
      patience: 15000,
      maxPatience: 15000,
      color: PASSENGER_COLORS[targetFloor % PASSENGER_COLORS.length],
    });
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;

    // Building background
    ctx.fillStyle = "#34495e";
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw floors
    for (let i = 0; i < FLOOR_COUNT; i++) {
      this.drawFloor(i);
    }

    // Draw elevator shafts
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    for (const elevator of this.elevators) {
      ctx.fillRect(elevator.x - 5, 30, 60, this.height - 70);
    }

    // Draw waiting passengers
    for (const passenger of this.passengers) {
      if (passenger.waiting) {
        this.drawPassenger(passenger);
      }
    }

    // Draw elevators
    for (const elevator of this.elevators) {
      this.drawElevator(elevator);
    }

    // Floor labels
    ctx.fillStyle = "white";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const y = this.getFloorY(i) + 35;
      ctx.fillText(`${i + 1}F`, 5, y);
    }
  }

  private drawFloor(floor: number) {
    const ctx = this.ctx;
    const y = this.getFloorY(floor);

    // Floor line
    ctx.strokeStyle = "#95a5a6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + this.floorHeight - 10);
    ctx.lineTo(this.width, y + this.floorHeight - 10);
    ctx.stroke();

    // Floor color indicator
    ctx.fillStyle = PASSENGER_COLORS[floor % PASSENGER_COLORS.length];
    ctx.fillRect(this.width - 20, y, 20, this.floorHeight - 10);
  }

  private drawPassenger(passenger: Passenger) {
    const ctx = this.ctx;
    const y = this.getFloorY(passenger.floor) + this.floorHeight - 35;

    // Body
    ctx.fillStyle = passenger.color;
    ctx.beginPath();
    ctx.arc(passenger.x + 10, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(passenger.x + 5, y, 10, 20);

    // Target floor indicator
    ctx.fillStyle = "white";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${passenger.targetFloor + 1}`, passenger.x + 10, y + 4);

    // Patience bar
    const patienceRatio = passenger.patience / passenger.maxPatience;
    const barWidth = 20;
    ctx.fillStyle = patienceRatio > 0.5 ? "#2ecc71" : patienceRatio > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillRect(passenger.x, y - 18, barWidth * patienceRatio, 4);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(passenger.x, y - 18, barWidth, 4);
  }

  private drawElevator(elevator: Elevator) {
    const ctx = this.ctx;
    const x = elevator.x;
    const y = elevator.y;
    const width = 50;
    const height = 60;

    // Elevator car
    ctx.fillStyle = this.selectedElevator === elevator ? "#f39c12" : "#7f8c8d";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4);
    ctx.fill();

    // Doors
    if (elevator.doorOpen) {
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(x + 5, y + 5, 18, height - 10);
      ctx.fillRect(x + width - 23, y + 5, 18, height - 10);
    } else {
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(x + 5, y + 5, width - 10, height - 10);
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + 5);
      ctx.lineTo(x + width / 2, y + height - 5);
      ctx.stroke();
    }

    // Passenger count
    ctx.fillStyle = "white";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${elevator.passengers.length}/${elevator.capacity}`, x + width / 2, y + height + 15);

    // Selection indicator
    if (this.selectedElevator === elevator) {
      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, width + 6, height + 6, 6);
      ctx.stroke();
    }

    // Passenger icons inside
    for (let i = 0; i < elevator.passengers.length; i++) {
      const px = x + 10 + (i % 3) * 15;
      const py = y + 20 + Math.floor(i / 3) * 20;
      ctx.fillStyle = elevator.passengers[i].color;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
