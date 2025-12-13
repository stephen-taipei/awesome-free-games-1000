/**
 * Floor Puzzle Game Logic
 * Game #099
 */

export interface Passenger {
  id: number;
  currentFloor: number;
  destinationFloor: number;
  status: "waiting" | "riding" | "delivered";
}

export interface Level {
  id: number;
  floors: number;
  passengers: { start: number; dest: number }[];
  elevatorCapacity: number;
}

export interface GameState {
  floors: number;
  elevatorFloor: number;
  elevatorCapacity: number;
  passengers: Passenger[];
  moves: number;
  level: number;
  status: "playing" | "won";
}

const LEVELS: Level[] = [
  // Level 1: Simple - 3 floors, 2 passengers
  {
    id: 1,
    floors: 3,
    passengers: [
      { start: 1, dest: 3 },
      { start: 3, dest: 1 },
    ],
    elevatorCapacity: 2,
  },
  // Level 2: 4 floors, 3 passengers
  {
    id: 2,
    floors: 4,
    passengers: [
      { start: 1, dest: 4 },
      { start: 2, dest: 1 },
      { start: 4, dest: 2 },
    ],
    elevatorCapacity: 2,
  },
  // Level 3: 5 floors, 4 passengers
  {
    id: 3,
    floors: 5,
    passengers: [
      { start: 1, dest: 5 },
      { start: 2, dest: 4 },
      { start: 5, dest: 1 },
      { start: 3, dest: 2 },
    ],
    elevatorCapacity: 2,
  },
  // Level 4: Limited capacity challenge
  {
    id: 4,
    floors: 5,
    passengers: [
      { start: 1, dest: 5 },
      { start: 1, dest: 4 },
      { start: 1, dest: 3 },
      { start: 5, dest: 1 },
    ],
    elevatorCapacity: 2,
  },
  // Level 5: 6 floors, 5 passengers
  {
    id: 5,
    floors: 6,
    passengers: [
      { start: 1, dest: 6 },
      { start: 2, dest: 5 },
      { start: 3, dest: 1 },
      { start: 6, dest: 2 },
      { start: 4, dest: 3 },
    ],
    elevatorCapacity: 3,
  },
  // Level 6: Route optimization
  {
    id: 6,
    floors: 6,
    passengers: [
      { start: 1, dest: 3 },
      { start: 3, dest: 6 },
      { start: 6, dest: 4 },
      { start: 4, dest: 1 },
      { start: 2, dest: 5 },
    ],
    elevatorCapacity: 2,
  },
  // Level 7: Many passengers
  {
    id: 7,
    floors: 7,
    passengers: [
      { start: 1, dest: 7 },
      { start: 2, dest: 6 },
      { start: 3, dest: 5 },
      { start: 7, dest: 1 },
      { start: 6, dest: 2 },
      { start: 5, dest: 3 },
    ],
    elevatorCapacity: 3,
  },
  // Level 8: Tight capacity
  {
    id: 8,
    floors: 8,
    passengers: [
      { start: 1, dest: 8 },
      { start: 1, dest: 7 },
      { start: 2, dest: 6 },
      { start: 8, dest: 1 },
      { start: 7, dest: 2 },
      { start: 4, dest: 5 },
    ],
    elevatorCapacity: 2,
  },
  // Level 9: Complex routing
  {
    id: 9,
    floors: 8,
    passengers: [
      { start: 1, dest: 4 },
      { start: 4, dest: 8 },
      { start: 8, dest: 5 },
      { start: 5, dest: 1 },
      { start: 2, dest: 7 },
      { start: 7, dest: 3 },
      { start: 3, dest: 6 },
    ],
    elevatorCapacity: 3,
  },
  // Level 10: Final challenge
  {
    id: 10,
    floors: 10,
    passengers: [
      { start: 1, dest: 10 },
      { start: 2, dest: 9 },
      { start: 3, dest: 8 },
      { start: 10, dest: 1 },
      { start: 9, dest: 2 },
      { start: 8, dest: 3 },
      { start: 5, dest: 7 },
      { start: 6, dest: 4 },
    ],
    elevatorCapacity: 3,
  },
];

export class FloorGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    const passengers: Passenger[] = level.passengers.map((p, i) => ({
      id: i + 1,
      currentFloor: p.start,
      destinationFloor: p.dest,
      status: "waiting" as const,
    }));

    return {
      floors: level.floors,
      elevatorFloor: 1,
      elevatorCapacity: level.elevatorCapacity,
      passengers,
      moves: 0,
      level: levelNum,
      status: "playing",
    };
  }

  public start(levelNum: number = 1): void {
    this.state = this.createInitialState(levelNum);
    this.emitState();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public moveUp(): boolean {
    if (this.state.status !== "playing") return false;
    if (this.state.elevatorFloor >= this.state.floors) return false;

    this.state.elevatorFloor++;
    this.state.moves++;

    // Update riding passengers' current floor
    this.state.passengers.forEach((p) => {
      if (p.status === "riding") {
        p.currentFloor = this.state.elevatorFloor;
      }
    });

    this.emitState();
    return true;
  }

  public moveDown(): boolean {
    if (this.state.status !== "playing") return false;
    if (this.state.elevatorFloor <= 1) return false;

    this.state.elevatorFloor--;
    this.state.moves++;

    // Update riding passengers' current floor
    this.state.passengers.forEach((p) => {
      if (p.status === "riding") {
        p.currentFloor = this.state.elevatorFloor;
      }
    });

    this.emitState();
    return true;
  }

  public boardPassengers(): void {
    if (this.state.status !== "playing") return;

    const currentFloor = this.state.elevatorFloor;
    const ridingCount = this.state.passengers.filter(
      (p) => p.status === "riding"
    ).length;

    // First, let passengers exit at their destination
    let exited = false;
    this.state.passengers.forEach((p) => {
      if (p.status === "riding" && p.destinationFloor === currentFloor) {
        p.status = "delivered";
        exited = true;
      }
    });

    // Then, let waiting passengers board
    const waitingAtFloor = this.state.passengers.filter(
      (p) => p.status === "waiting" && p.currentFloor === currentFloor
    );

    let availableSpace =
      this.state.elevatorCapacity -
      this.state.passengers.filter((p) => p.status === "riding").length;

    waitingAtFloor.forEach((p) => {
      if (availableSpace > 0) {
        p.status = "riding";
        availableSpace--;
      }
    });

    // Check win condition
    const allDelivered = this.state.passengers.every(
      (p) => p.status === "delivered"
    );
    if (allDelivered) {
      this.state.status = "won";
    }

    this.emitState();
  }

  public getPassengersOnFloor(floor: number): Passenger[] {
    return this.state.passengers.filter(
      (p) => p.currentFloor === floor && p.status === "waiting"
    );
  }

  public getPassengersInElevator(): Passenger[] {
    return this.state.passengers.filter((p) => p.status === "riding");
  }

  public getRemainingPassengers(): number {
    return this.state.passengers.filter((p) => p.status !== "delivered").length;
  }

  public reset(): void {
    this.start(this.state.level);
  }

  public nextLevel(): boolean {
    if (this.state.level >= LEVELS.length) return false;
    this.start(this.state.level + 1);
    return true;
  }

  public getState(): GameState {
    return this.state;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
