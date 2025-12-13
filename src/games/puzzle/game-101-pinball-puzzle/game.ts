/**
 * Pinball Puzzle Game Logic
 * Game #101 - Simple 2D Physics Pinball
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  active: boolean;
}

export interface Target {
  pos: Vector2;
  radius: number;
  hit: boolean;
  points: number;
}

export interface Bumper {
  pos: Vector2;
  radius: number;
  bounceForce: number;
}

export interface Flipper {
  pos: Vector2;
  length: number;
  angle: number;
  targetAngle: number;
  side: "left" | "right";
}

export interface Level {
  id: number;
  targets: { x: number; y: number; points: number }[];
  bumpers: { x: number; y: number; radius: number }[];
}

export interface GameState {
  ball: Ball;
  targets: Target[];
  bumpers: Bumper[];
  flippers: Flipper[];
  score: number;
  balls: number;
  level: number;
  status: "waiting" | "playing" | "won" | "lost";
  width: number;
  height: number;
}

const GRAVITY = 0.15;
const FRICTION = 0.995;
const FLIPPER_SPEED = 0.25;
const BALL_RADIUS = 8;
const LAUNCH_SPEED = 12;

const LEVELS: Level[] = [
  {
    id: 1,
    targets: [
      { x: 200, y: 100, points: 100 },
      { x: 100, y: 150, points: 100 },
      { x: 300, y: 150, points: 100 },
    ],
    bumpers: [{ x: 200, y: 200, radius: 25 }],
  },
  {
    id: 2,
    targets: [
      { x: 100, y: 80, points: 100 },
      { x: 200, y: 120, points: 150 },
      { x: 300, y: 80, points: 100 },
      { x: 150, y: 180, points: 100 },
      { x: 250, y: 180, points: 100 },
    ],
    bumpers: [
      { x: 150, y: 250, radius: 20 },
      { x: 250, y: 250, radius: 20 },
    ],
  },
  {
    id: 3,
    targets: [
      { x: 80, y: 100, points: 100 },
      { x: 200, y: 60, points: 200 },
      { x: 320, y: 100, points: 100 },
      { x: 120, y: 200, points: 100 },
      { x: 280, y: 200, points: 100 },
    ],
    bumpers: [
      { x: 200, y: 150, radius: 30 },
      { x: 120, y: 280, radius: 18 },
      { x: 280, y: 280, radius: 18 },
    ],
  },
  {
    id: 4,
    targets: [
      { x: 100, y: 80, points: 100 },
      { x: 200, y: 50, points: 250 },
      { x: 300, y: 80, points: 100 },
      { x: 60, y: 150, points: 100 },
      { x: 340, y: 150, points: 100 },
      { x: 200, y: 180, points: 150 },
    ],
    bumpers: [
      { x: 130, y: 120, radius: 20 },
      { x: 270, y: 120, radius: 20 },
      { x: 200, y: 250, radius: 25 },
    ],
  },
  {
    id: 5,
    targets: [
      { x: 60, y: 60, points: 100 },
      { x: 200, y: 40, points: 300 },
      { x: 340, y: 60, points: 100 },
      { x: 100, y: 130, points: 150 },
      { x: 300, y: 130, points: 150 },
      { x: 150, y: 200, points: 100 },
      { x: 250, y: 200, points: 100 },
    ],
    bumpers: [
      { x: 200, y: 100, radius: 22 },
      { x: 100, y: 270, radius: 20 },
      { x: 200, y: 280, radius: 20 },
      { x: 300, y: 270, radius: 20 },
    ],
  },
];

export class PinballGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  animationId: number | null = null;

  constructor(width: number, height: number) {
    this.state = this.createInitialState(1, width, height);
  }

  private createInitialState(
    levelNum: number,
    width: number,
    height: number
  ): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    const targets: Target[] = level.targets.map((t) => ({
      pos: { x: t.x, y: t.y },
      radius: 15,
      hit: false,
      points: t.points,
    }));

    const bumpers: Bumper[] = level.bumpers.map((b) => ({
      pos: { x: b.x, y: b.y },
      radius: b.radius,
      bounceForce: 8,
    }));

    const flippers: Flipper[] = [
      {
        pos: { x: 120, y: height - 60 },
        length: 60,
        angle: 0.4,
        targetAngle: 0.4,
        side: "left",
      },
      {
        pos: { x: width - 120, y: height - 60 },
        length: 60,
        angle: Math.PI - 0.4,
        targetAngle: Math.PI - 0.4,
        side: "right",
      },
    ];

    return {
      ball: {
        pos: { x: width - 30, y: height - 100 },
        vel: { x: 0, y: 0 },
        radius: BALL_RADIUS,
        active: false,
      },
      targets,
      bumpers,
      flippers,
      score: 0,
      balls: 3,
      level: levelNum,
      status: "waiting",
      width,
      height,
    };
  }

  public start(levelNum: number = 1): void {
    this.stop();
    this.state = this.createInitialState(
      levelNum,
      this.state.width,
      this.state.height
    );
    this.emitState();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public resize(width: number, height: number): void {
    this.state.width = width;
    this.state.height = height;

    // Update flipper positions
    this.state.flippers[0].pos = { x: 120, y: height - 60 };
    this.state.flippers[1].pos = { x: width - 120, y: height - 60 };
  }

  public launch(): void {
    if (this.state.status !== "waiting" && this.state.status !== "playing")
      return;
    if (this.state.ball.active) return;

    this.state.ball.pos = {
      x: this.state.width - 30,
      y: this.state.height - 100,
    };
    this.state.ball.vel = {
      x: -2 + Math.random() * 4,
      y: -LAUNCH_SPEED,
    };
    this.state.ball.active = true;
    this.state.status = "playing";

    this.startLoop();
  }

  public setFlipper(side: "left" | "right", active: boolean): void {
    const flipper = this.state.flippers.find((f) => f.side === side);
    if (!flipper) return;

    if (side === "left") {
      flipper.targetAngle = active ? -0.5 : 0.4;
    } else {
      flipper.targetAngle = active ? Math.PI + 0.5 : Math.PI - 0.4;
    }
  }

  private startLoop(): void {
    if (this.animationId) return;

    const loop = () => {
      this.update();
      this.emitState();

      if (this.state.status === "playing") {
        this.animationId = requestAnimationFrame(loop);
      }
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private update(): void {
    const { ball, flippers, targets, bumpers, width, height } = this.state;

    if (!ball.active) return;

    // Apply gravity
    ball.vel.y += GRAVITY;

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Update position
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    // Update flippers
    flippers.forEach((f) => {
      const diff = f.targetAngle - f.angle;
      if (Math.abs(diff) > 0.01) {
        f.angle += Math.sign(diff) * FLIPPER_SPEED;
      }
    });

    // Wall collisions
    if (ball.pos.x - ball.radius < 0) {
      ball.pos.x = ball.radius;
      ball.vel.x *= -0.8;
    }
    if (ball.pos.x + ball.radius > width) {
      ball.pos.x = width - ball.radius;
      ball.vel.x *= -0.8;
    }
    if (ball.pos.y - ball.radius < 0) {
      ball.pos.y = ball.radius;
      ball.vel.y *= -0.8;
    }

    // Ball lost
    if (ball.pos.y > height + ball.radius) {
      ball.active = false;
      this.state.balls--;

      if (this.state.balls <= 0) {
        this.state.status = "lost";
      } else {
        // Reset ball position
        ball.pos = { x: width - 30, y: height - 100 };
        ball.vel = { x: 0, y: 0 };
      }
      return;
    }

    // Target collisions
    targets.forEach((target) => {
      if (target.hit) return;

      const dx = ball.pos.x - target.pos.x;
      const dy = ball.pos.y - target.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ball.radius + target.radius) {
        target.hit = true;
        this.state.score += target.points;

        // Bounce
        const nx = dx / dist;
        const ny = dy / dist;
        ball.vel.x += nx * 5;
        ball.vel.y += ny * 5;
      }
    });

    // Check win
    if (targets.every((t) => t.hit)) {
      this.state.status = "won";
      ball.active = false;
      this.stop();
      return;
    }

    // Bumper collisions
    bumpers.forEach((bumper) => {
      const dx = ball.pos.x - bumper.pos.x;
      const dy = ball.pos.y - bumper.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ball.radius + bumper.radius) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Push out of bumper
        const overlap = ball.radius + bumper.radius - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;

        // Bounce
        ball.vel.x = nx * bumper.bounceForce;
        ball.vel.y = ny * bumper.bounceForce;

        this.state.score += 10;
      }
    });

    // Flipper collisions
    flippers.forEach((flipper) => {
      const endX = flipper.pos.x + Math.cos(flipper.angle) * flipper.length;
      const endY = flipper.pos.y + Math.sin(flipper.angle) * flipper.length;

      // Check line collision
      const closest = this.closestPointOnLine(
        flipper.pos.x,
        flipper.pos.y,
        endX,
        endY,
        ball.pos.x,
        ball.pos.y
      );

      const dx = ball.pos.x - closest.x;
      const dy = ball.pos.y - closest.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ball.radius + 5) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Push out
        const overlap = ball.radius + 5 - dist;
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;

        // Calculate flipper velocity contribution
        const flipperVel =
          (flipper.targetAngle - flipper.angle) *
          flipper.length *
          (flipper.side === "left" ? 1 : -1);

        // Bounce
        const bounceForce = 6 + Math.abs(flipperVel) * 0.5;
        ball.vel.x = nx * bounceForce + flipperVel * 0.3;
        ball.vel.y = ny * bounceForce - Math.abs(flipperVel) * 0.5;
      }
    });
  }

  private closestPointOnLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    px: number,
    py: number
  ): Vector2 {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) return { x: x1, y: y1 };

    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    return {
      x: x1 + t * dx,
      y: y1 + t * dy,
    };
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
