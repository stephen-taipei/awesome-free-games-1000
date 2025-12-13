/**
 * Ninja Slice Game Logic
 * Game #343 - Slice falling objects with your finger
 */

export interface SliceableObject {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: "fruit" | "bomb";
  sliced: boolean;
  sliceAngle?: number;
}

export interface SliceTrail {
  x: number;
  y: number;
  age: number;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  objects: SliceableObject[];
  sliceTrail: SliceTrail[];
  lives: number;
  level: number;
}

const GRAVITY = 0.2;
const FRUIT_TYPES = ["apple", "orange", "watermelon", "banana", "grape"];

export class NinjaSliceGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private spawnTimer: number = 0;
  private objectId: number = 0;
  private lastSlicePoint: { x: number; y: number } | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("ninjaSliceHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      combo: 0,
      maxCombo: 0,
      objects: [],
      sliceTrail: [],
      lives: 3,
      level: 1,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.spawnTimer = 0;
    this.objectId = 0;
    this.lastSlicePoint = null;
    this.emitState();
  }

  public startSlice(x: number, y: number): void {
    if (this.state.phase !== "playing") return;
    this.lastSlicePoint = { x, y };
    this.state.sliceTrail = [{ x, y, age: 0 }];
  }

  public continueSlice(x: number, y: number): void {
    if (this.state.phase !== "playing") return;
    if (!this.lastSlicePoint) return;

    // Add to trail
    this.state.sliceTrail.push({ x, y, age: 0 });
    if (this.state.sliceTrail.length > 20) {
      this.state.sliceTrail.shift();
    }

    // Check for slicing objects
    const dx = x - this.lastSlicePoint.x;
    const dy = y - this.lastSlicePoint.y;
    const sliceLength = Math.sqrt(dx * dx + dy * dy);

    if (sliceLength > 10) {
      const sliceAngle = Math.atan2(dy, dx);

      for (const obj of this.state.objects) {
        if (obj.sliced) continue;

        // Check if slice line intersects with object
        const objDist = this.pointLineDistance(
          obj.x,
          obj.y,
          this.lastSlicePoint.x,
          this.lastSlicePoint.y,
          x,
          y
        );

        if (objDist < obj.radius) {
          if (obj.type === "bomb") {
            this.state.lives--;
            obj.sliced = true;
            this.state.combo = 0;

            if (this.state.lives <= 0) {
              this.gameOver();
              return;
            }
          } else {
            obj.sliced = true;
            obj.sliceAngle = sliceAngle;
            this.state.combo++;
            this.state.score += 10 * this.state.combo;
            this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
          }
        }
      }
    }

    this.lastSlicePoint = { x, y };
  }

  public endSlice(): void {
    this.lastSlicePoint = null;
  }

  private pointLineDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    // Update objects
    for (const obj of this.state.objects) {
      obj.vy += GRAVITY;
      obj.x += obj.vx;
      obj.y += obj.vy;
    }

    // Check for missed fruits
    for (const obj of this.state.objects) {
      if (!obj.sliced && obj.type === "fruit" && obj.y > this.canvasHeight + 50) {
        this.state.combo = 0;
        this.state.lives--;

        if (this.state.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Remove off-screen objects
    this.state.objects = this.state.objects.filter(
      (o) => o.y < this.canvasHeight + 100 && o.x > -100 && o.x < this.canvasWidth + 100
    );

    // Update trail
    for (const point of this.state.sliceTrail) {
      point.age++;
    }
    this.state.sliceTrail = this.state.sliceTrail.filter((p) => p.age < 10);

    // Spawn new objects
    this.spawnTimer++;
    const spawnInterval = Math.max(30, 60 - this.state.level * 5);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnObjects();
      this.spawnTimer = 0;
    }

    // Level up
    if (this.state.score > this.state.level * 200) {
      this.state.level++;
    }

    this.emitState();
  }

  private spawnObjects(): void {
    const count = 1 + Math.floor(Math.random() * (1 + this.state.level / 3));

    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() > 0.5;
      const x = fromLeft ? -30 : this.canvasWidth + 30;
      const y = this.canvasHeight + 20;

      const targetX = this.canvasWidth / 4 + Math.random() * (this.canvasWidth / 2);
      const targetY = 100 + Math.random() * 100;

      const angle = Math.atan2(targetY - y, targetX - x);
      const speed = 8 + Math.random() * 4;

      const isBomb = Math.random() > 0.85;

      this.state.objects.push({
        id: this.objectId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isBomb ? 25 : 20 + Math.random() * 15,
        type: isBomb ? "bomb" : "fruit",
        sliced: false,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("ninjaSliceHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
