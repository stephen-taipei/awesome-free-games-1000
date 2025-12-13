export interface Passenger {
  id: number;
  currentFloor: number;
  targetFloor: number;
  inElevator: boolean;
  delivered: boolean;
  color: string;
}

export interface Level {
  floors: number;
  passengers: { start: number; target: number }[];
  elevatorCapacity: number;
}

const LEVELS: Level[] = [
  {
    floors: 5,
    passengers: [
      { start: 1, target: 5 },
      { start: 3, target: 1 },
      { start: 5, target: 2 },
    ],
    elevatorCapacity: 2,
  },
  {
    floors: 6,
    passengers: [
      { start: 1, target: 6 },
      { start: 2, target: 4 },
      { start: 6, target: 1 },
      { start: 4, target: 2 },
    ],
    elevatorCapacity: 2,
  },
  {
    floors: 7,
    passengers: [
      { start: 1, target: 7 },
      { start: 3, target: 1 },
      { start: 5, target: 3 },
      { start: 7, target: 5 },
      { start: 2, target: 6 },
    ],
    elevatorCapacity: 3,
  },
  {
    floors: 8,
    passengers: [
      { start: 1, target: 8 },
      { start: 2, target: 5 },
      { start: 4, target: 1 },
      { start: 6, target: 3 },
      { start: 8, target: 2 },
      { start: 3, target: 7 },
    ],
    elevatorCapacity: 3,
  },
];

const PASSENGER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#34495e",
];

export class ElevatorGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  level: number = 1;
  currentLevel: Level;
  elevatorFloor: number = 1;
  targetFloor: number = 1;
  passengers: Passenger[] = [];
  moves: number = 0;
  status: "playing" | "moving" | "won" = "playing";
  elevatorCapacity: number = 2;

  animationProgress: number = 0;
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
    this.elevatorFloor = 1;
    this.targetFloor = 1;
    this.elevatorCapacity = this.currentLevel.elevatorCapacity;
    this.initPassengers();
    this.resize();
    this.draw();
    this.notifyChange();
  }

  private initPassengers() {
    this.passengers = this.currentLevel.passengers.map((p, i) => ({
      id: i,
      currentFloor: p.start,
      targetFloor: p.target,
      inElevator: false,
      delivered: false,
      color: PASSENGER_COLORS[i % PASSENGER_COLORS.length],
    }));
  }

  public goToFloor(floor: number) {
    if (this.status !== "playing") return;
    if (floor < 1 || floor > this.currentLevel.floors) return;
    if (floor === this.elevatorFloor) {
      // Pick up or drop off passengers
      this.handlePassengers();
      return;
    }

    this.targetFloor = floor;
    this.moves++;
    this.status = "moving";
    this.animateElevator();
  }

  private animateElevator() {
    const startFloor = this.elevatorFloor;
    const endFloor = this.targetFloor;
    const duration = Math.abs(endFloor - startFloor) * 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.animationProgress = startFloor + (endFloor - startFloor) * eased;
      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.elevatorFloor = endFloor;
        this.animationProgress = endFloor;
        this.status = "playing";
        this.handlePassengers();
        this.draw();
        this.notifyChange();
      }
    };

    animate();
  }

  private handlePassengers() {
    // Drop off passengers at their destination
    this.passengers.forEach((p) => {
      if (p.inElevator && p.targetFloor === this.elevatorFloor) {
        p.inElevator = false;
        p.delivered = true;
        p.currentFloor = this.elevatorFloor;
      }
    });

    // Pick up waiting passengers
    const inElevator = this.passengers.filter((p) => p.inElevator).length;
    this.passengers.forEach((p) => {
      if (
        !p.inElevator &&
        !p.delivered &&
        p.currentFloor === this.elevatorFloor &&
        this.passengers.filter((x) => x.inElevator).length < this.elevatorCapacity
      ) {
        p.inElevator = true;
      }
    });

    this.checkWin();
    this.draw();
    this.notifyChange();
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const floorHeight = h / (this.currentLevel.floors + 1);
    const buttonWidth = 50;
    const buttonX = w - 80;

    // Check if clicking on floor buttons
    for (let i = 1; i <= this.currentLevel.floors; i++) {
      const buttonY = h - (i + 0.5) * floorHeight;
      if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= buttonY - 15 &&
        y <= buttonY + 15
      ) {
        this.goToFloor(i);
        return;
      }
    }
  }

  public handleKey(key: string) {
    const floor = parseInt(key);
    if (!isNaN(floor)) {
      this.goToFloor(floor);
    }
  }

  private checkWin() {
    const allDelivered = this.passengers.every((p) => p.delivered);
    if (allDelivered) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won", level: this.level, moves: this.moves });
      }
    }
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
    const floors = this.currentLevel.floors;
    const floorHeight = h / (floors + 1);

    // Clear
    ctx.fillStyle = "#1a252f";
    ctx.fillRect(0, 0, w, h);

    // Draw building
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(50, 0, w - 150, h);

    // Draw floors
    for (let i = 1; i <= floors; i++) {
      const y = h - i * floorHeight;

      // Floor line
      ctx.strokeStyle = "#34495e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(w - 100, y);
      ctx.stroke();

      // Floor number
      ctx.fillStyle = "#7f8c8d";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i), 30, y - floorHeight / 2 + 6);

      // Floor button
      const buttonY = y - floorHeight / 2;
      const isCurrentFloor = Math.abs(this.animationProgress - i) < 0.1;

      ctx.fillStyle = isCurrentFloor ? "#3498db" : "#34495e";
      ctx.beginPath();
      ctx.roundRect(w - 75, buttonY - 15, 40, 30, 5);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(String(i), w - 55, buttonY + 5);
    }

    // Draw elevator shaft
    ctx.fillStyle = "#1a252f";
    ctx.fillRect(100, 20, 80, h - 40);

    // Draw elevator
    const elevatorY = h - this.animationProgress * floorHeight;
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(105, elevatorY - floorHeight + 5, 70, floorHeight - 10);

    // Elevator door frame
    ctx.strokeStyle = "#95a5a6";
    ctx.lineWidth = 3;
    ctx.strokeRect(105, elevatorY - floorHeight + 5, 70, floorHeight - 10);

    // Elevator capacity indicator
    const inElevatorCount = this.passengers.filter((p) => p.inElevator).length;
    ctx.fillStyle = "white";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      `${inElevatorCount}/${this.elevatorCapacity}`,
      140,
      elevatorY - 5
    );

    // Draw passengers in elevator
    let elevatorOffset = 0;
    this.passengers.forEach((p) => {
      if (p.inElevator) {
        this.drawPassenger(
          115 + elevatorOffset * 20,
          elevatorY - floorHeight / 2,
          p.color,
          p.targetFloor
        );
        elevatorOffset++;
      }
    });

    // Draw waiting passengers on floors
    for (let floor = 1; floor <= floors; floor++) {
      const y = h - floor * floorHeight;
      let offset = 0;

      this.passengers.forEach((p) => {
        if (!p.inElevator && !p.delivered && p.currentFloor === floor) {
          this.drawPassenger(200 + offset * 35, y - floorHeight / 2, p.color, p.targetFloor);
          offset++;
        }
      });

      // Draw delivered passengers
      this.passengers.forEach((p) => {
        if (p.delivered && p.currentFloor === floor) {
          this.drawPassenger(
            w - 130 - offset * 35,
            y - floorHeight / 2,
            p.color,
            p.targetFloor,
            true
          );
          offset++;
        }
      });
    }

    // Draw elevator indicator arrow
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    if (this.targetFloor > this.elevatorFloor) {
      // Up arrow
      ctx.moveTo(140, 40);
      ctx.lineTo(130, 55);
      ctx.lineTo(150, 55);
    } else if (this.targetFloor < this.elevatorFloor) {
      // Down arrow
      ctx.moveTo(140, 55);
      ctx.lineTo(130, 40);
      ctx.lineTo(150, 40);
    }
    ctx.fill();
  }

  private drawPassenger(
    x: number,
    y: number,
    color: string,
    targetFloor: number,
    delivered: boolean = false
  ) {
    const ctx = this.ctx;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Body rectangle
    ctx.fillRect(x - 8, y, 16, 20);

    // Target floor indicator
    if (!delivered) {
      ctx.fillStyle = "white";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(targetFloor), x, y - 7);
    } else {
      // Checkmark for delivered
      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 10);
      ctx.lineTo(x - 2, y - 5);
      ctx.lineTo(x + 5, y - 15);
      ctx.stroke();
    }
  }

  public reset() {
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public getDeliveredCount(): string {
    const delivered = this.passengers.filter((p) => p.delivered).length;
    return `${delivered}/${this.passengers.length}`;
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        moves: this.moves,
        delivered: this.getDeliveredCount(),
        status: this.status,
      });
    }
  }
}
