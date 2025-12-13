/**
 * Cannon Fire Game Logic
 * Game #222 - Aim and shoot cannonballs to destroy targets
 */

export interface Cannonball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Target {
  x: number;
  y: number;
  width: number;
  height: number;
  destroyed: boolean;
  type: "box" | "barrel" | "star";
  points: number;
}

export interface GameState {
  phase: "idle" | "aiming" | "firing" | "levelComplete" | "gameOver";
  level: number;
  score: number;
  shotsLeft: number;
  cannonAngle: number;
  cannonPower: number;
  cannonball: Cannonball | null;
  targets: Target[];
}

const GRAVITY = 0.25;
const CANNON_X = 60;
const CANNON_Y_OFFSET = 100;

export class CannonFireGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      level: 1,
      score: 0,
      shotsLeft: 5,
      cannonAngle: -45,
      cannonPower: 50,
      cannonball: null,
      targets: [],
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "aiming",
    };
    this.loadLevel(1);
    this.emitState();
  }

  private loadLevel(level: number): void {
    const targets: Target[] = [];
    const baseY = this.canvasHeight - CANNON_Y_OFFSET;

    // Generate targets based on level
    const numTargets = 3 + level;

    for (let i = 0; i < numTargets; i++) {
      const x = 150 + Math.random() * (this.canvasWidth - 200);
      const y = baseY - 30 - Math.random() * 200;
      const type = Math.random() > 0.7 ? "star" : Math.random() > 0.5 ? "barrel" : "box";

      targets.push({
        x,
        y,
        width: type === "star" ? 30 : 40,
        height: type === "star" ? 30 : 40,
        destroyed: false,
        type,
        points: type === "star" ? 100 : type === "barrel" ? 50 : 25,
      });
    }

    this.state.targets = targets;
    this.state.level = level;
    this.state.shotsLeft = 5 + Math.floor(level / 2);
  }

  public setAim(angle: number, power: number): void {
    if (this.state.phase !== "aiming") return;

    this.state.cannonAngle = Math.max(-80, Math.min(-10, angle));
    this.state.cannonPower = Math.max(20, Math.min(100, power));
    this.emitState();
  }

  public fire(): void {
    if (this.state.phase !== "aiming" || this.state.shotsLeft <= 0) return;

    const radians = (this.state.cannonAngle * Math.PI) / 180;
    const speed = this.state.cannonPower * 0.15;

    this.state.cannonball = {
      x: CANNON_X + 40,
      y: this.canvasHeight - CANNON_Y_OFFSET,
      vx: Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed,
      radius: 10,
    };

    this.state.shotsLeft--;
    this.state.phase = "firing";
    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "firing" || !this.state.cannonball) return;

    const ball = this.state.cannonball;

    // Apply gravity
    ball.vy += GRAVITY;

    // Move cannonball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Check target collisions
    for (const target of this.state.targets) {
      if (target.destroyed) continue;

      if (this.checkCollision(ball, target)) {
        target.destroyed = true;
        this.state.score += target.points;

        // Chain reaction for barrels
        if (target.type === "barrel") {
          this.explodeNearby(target);
        }
      }
    }

    // Check if cannonball is out of bounds
    if (
      ball.y > this.canvasHeight + 50 ||
      ball.x > this.canvasWidth + 50 ||
      ball.x < -50
    ) {
      this.endShot();
      return;
    }

    // Ground bounce
    const groundY = this.canvasHeight - 30;
    if (ball.y + ball.radius > groundY) {
      ball.y = groundY - ball.radius;
      ball.vy = -ball.vy * 0.5;
      ball.vx *= 0.7;

      if (Math.abs(ball.vy) < 1) {
        this.endShot();
        return;
      }
    }

    this.emitState();
  }

  private checkCollision(ball: Cannonball, target: Target): boolean {
    const closestX = Math.max(target.x, Math.min(ball.x, target.x + target.width));
    const closestY = Math.max(target.y, Math.min(ball.y, target.y + target.height));

    const dist = Math.sqrt((ball.x - closestX) ** 2 + (ball.y - closestY) ** 2);

    return dist < ball.radius;
  }

  private explodeNearby(source: Target): void {
    for (const target of this.state.targets) {
      if (target.destroyed || target === source) continue;

      const dist = Math.sqrt(
        (target.x - source.x) ** 2 + (target.y - source.y) ** 2
      );

      if (dist < 80) {
        target.destroyed = true;
        this.state.score += target.points;
      }
    }
  }

  private endShot(): void {
    this.state.cannonball = null;

    // Check if all targets destroyed
    const remaining = this.state.targets.filter((t) => !t.destroyed).length;

    if (remaining === 0) {
      this.state.phase = "levelComplete";
      this.state.score += this.state.shotsLeft * 50; // Bonus for remaining shots
    } else if (this.state.shotsLeft <= 0) {
      this.state.phase = "gameOver";
    } else {
      this.state.phase = "aiming";
    }

    this.emitState();
  }

  public nextLevel(): void {
    this.state.phase = "aiming";
    this.loadLevel(this.state.level + 1);
    this.emitState();
  }

  public getCannonPosition(): { x: number; y: number } {
    return {
      x: CANNON_X,
      y: this.canvasHeight - CANNON_Y_OFFSET,
    };
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
