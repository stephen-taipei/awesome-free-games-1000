/**
 * Laser Maze Game Logic
 * Game #217 - Reflect laser beams to hit targets
 */

export interface Mirror {
  x: number;
  y: number;
  angle: number; // 0, 45, 90, 135
  type: "normal" | "fixed";
}

export interface Target {
  x: number;
  y: number;
  hit: boolean;
}

export interface LaserPoint {
  x: number;
  y: number;
}

export interface GameState {
  phase: "idle" | "playing" | "levelComplete" | "gameOver";
  level: number;
  moves: number;
  laserPath: LaserPoint[];
  targetsHit: number;
  totalTargets: number;
}

export interface LaserLevel {
  mirrors: Mirror[];
  targets: Target[];
  laserStart: { x: number; y: number; direction: "right" | "down" | "left" | "up" };
}

const CELL_SIZE = 50;
const GRID_WIDTH = 9;
const GRID_HEIGHT = 8;

export class LaserMazeGame {
  state: GameState;
  currentLevel: LaserLevel | null = null;
  onStateChange: ((state: GameState) => void) | null = null;
  private selectedMirror: number = -1;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      level: 1,
      moves: 0,
      laserPath: [],
      targetsHit: 0,
      totalTargets: 0,
    };
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.generateLevel(1);
    this.calculateLaserPath();
    this.emitState();
  }

  private generateLevel(level: number): void {
    const mirrors: Mirror[] = [];
    const targets: Target[] = [];

    // Fixed mirrors based on level
    const numMirrors = 2 + Math.floor(level / 2);
    const numTargets = 1 + Math.floor(level / 3);

    // Place random movable mirrors
    for (let i = 0; i < numMirrors; i++) {
      let x, y;
      do {
        x = 1 + Math.floor(Math.random() * (GRID_WIDTH - 2));
        y = 1 + Math.floor(Math.random() * (GRID_HEIGHT - 2));
      } while (mirrors.some((m) => m.x === x && m.y === y));

      mirrors.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        angle: Math.random() > 0.5 ? 45 : 135,
        type: "normal",
      });
    }

    // Place targets
    for (let i = 0; i < numTargets; i++) {
      let x, y;
      do {
        x = 2 + Math.floor(Math.random() * (GRID_WIDTH - 4));
        y = 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4));
      } while (
        mirrors.some(
          (m) =>
            Math.abs(m.x - (x * CELL_SIZE + CELL_SIZE / 2)) < CELL_SIZE &&
            Math.abs(m.y - (y * CELL_SIZE + CELL_SIZE / 2)) < CELL_SIZE
        ) ||
        targets.some((t) => t.x === x * CELL_SIZE + CELL_SIZE / 2 && t.y === y * CELL_SIZE + CELL_SIZE / 2)
      );

      targets.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        hit: false,
      });
    }

    // Laser always starts from top-left going right
    this.currentLevel = {
      mirrors,
      targets,
      laserStart: { x: 25, y: CELL_SIZE * 2, direction: "right" },
    };

    this.state.totalTargets = targets.length;
    this.state.targetsHit = 0;
  }

  private calculateLaserPath(): void {
    if (!this.currentLevel) return;

    const path: LaserPoint[] = [];
    let x = this.currentLevel.laserStart.x;
    let y = this.currentLevel.laserStart.y;
    let dx = 0,
      dy = 0;

    switch (this.currentLevel.laserStart.direction) {
      case "right":
        dx = 1;
        break;
      case "left":
        dx = -1;
        break;
      case "down":
        dy = 1;
        break;
      case "up":
        dy = -1;
        break;
    }

    path.push({ x, y });

    const maxIterations = 1000;
    let iterations = 0;

    while (
      x > 0 &&
      x < GRID_WIDTH * CELL_SIZE &&
      y > 0 &&
      y < GRID_HEIGHT * CELL_SIZE &&
      iterations < maxIterations
    ) {
      x += dx * 2;
      y += dy * 2;
      iterations++;

      // Check for mirror hit
      for (const mirror of this.currentLevel.mirrors) {
        const dist = Math.sqrt((x - mirror.x) ** 2 + (y - mirror.y) ** 2);
        if (dist < 15) {
          path.push({ x: mirror.x, y: mirror.y });

          // Reflect based on mirror angle
          if (mirror.angle === 45) {
            // 45 degree mirror: swap and negate based on direction
            const temp = dx;
            dx = -dy;
            dy = -temp;
          } else if (mirror.angle === 135) {
            // 135 degree mirror
            const temp = dx;
            dx = dy;
            dy = temp;
          }

          x = mirror.x + dx * 10;
          y = mirror.y + dy * 10;
          break;
        }
      }

      // Check for target hit
      for (const target of this.currentLevel.targets) {
        const dist = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
        if (dist < 20 && !target.hit) {
          target.hit = true;
          this.state.targetsHit++;
        }
      }
    }

    path.push({ x, y });
    this.state.laserPath = path;

    // Check win condition
    if (this.state.targetsHit === this.state.totalTargets) {
      this.state.phase = "levelComplete";
    }
  }

  public rotateMirror(index: number): void {
    if (this.state.phase !== "playing" || !this.currentLevel) return;

    const mirror = this.currentLevel.mirrors[index];
    if (!mirror || mirror.type === "fixed") return;

    // Toggle between 45 and 135 degrees
    mirror.angle = mirror.angle === 45 ? 135 : 45;
    this.state.moves++;

    // Reset targets
    for (const target of this.currentLevel.targets) {
      target.hit = false;
    }
    this.state.targetsHit = 0;

    this.calculateLaserPath();
    this.emitState();
  }

  public getMirrorAtPosition(x: number, y: number): number {
    if (!this.currentLevel) return -1;

    for (let i = 0; i < this.currentLevel.mirrors.length; i++) {
      const mirror = this.currentLevel.mirrors[i];
      const dist = Math.sqrt((x - mirror.x) ** 2 + (y - mirror.y) ** 2);
      if (dist < 25) {
        return i;
      }
    }
    return -1;
  }

  public nextLevel(): void {
    this.state.level++;
    this.state.phase = "playing";
    this.state.moves = 0;
    this.generateLevel(this.state.level);
    this.calculateLaserPath();
    this.emitState();
  }

  public getLevel(): LaserLevel | null {
    return this.currentLevel;
  }

  public getCellSize(): number {
    return CELL_SIZE;
  }

  public getGridSize(): { width: number; height: number } {
    return { width: GRID_WIDTH, height: GRID_HEIGHT };
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
