/**
 * Color Dash Game Logic
 * Game #341 - Match colors to pass through gates
 */

export interface Player {
  x: number;
  y: number;
  color: number;
  width: number;
  height: number;
}

export interface Gate {
  y: number;
  segments: number[];
  passed: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  player: Player;
  gates: Gate[];
  speed: number;
  colors: string[];
}

const COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a55eea"];
const INITIAL_SPEED = 3;
const MAX_SPEED = 8;

export class ColorDashGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private gateTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("colorDashHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      player: {
        x: 0,
        y: 0,
        color: 0,
        width: 40,
        height: 40,
      },
      gates: [],
      speed: INITIAL_SPEED,
      colors: COLORS,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.player.x = width / 2 - 20;
    this.state.player.y = height - 100;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.state.player.x = this.canvasWidth / 2 - 20;
    this.state.player.y = this.canvasHeight - 100;
    this.gateTimer = 0;
    this.emitState();
  }

  public changeColor(): void {
    if (this.state.phase !== "playing") return;
    this.state.player.color = (this.state.player.color + 1) % COLORS.length;
    this.emitState();
  }

  public movePlayer(targetX: number): void {
    if (this.state.phase !== "playing") return;

    const dx = targetX - (this.state.player.x + this.state.player.width / 2);
    this.state.player.x += dx * 0.15;

    // Clamp to canvas bounds
    this.state.player.x = Math.max(
      0,
      Math.min(this.canvasWidth - this.state.player.width, this.state.player.x)
    );
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    // Update speed
    this.state.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.state.score / 20);

    // Move gates
    for (const gate of this.state.gates) {
      gate.y += this.state.speed;
    }

    // Check gate collisions
    const { player } = this.state;
    const playerCenterX = player.x + player.width / 2;

    for (const gate of this.state.gates) {
      if (gate.passed) continue;

      // Check if player is passing through gate
      if (
        gate.y >= player.y - 20 &&
        gate.y <= player.y + player.height
      ) {
        const segmentWidth = this.canvasWidth / gate.segments.length;
        const segmentIndex = Math.floor(playerCenterX / segmentWidth);

        if (segmentIndex >= 0 && segmentIndex < gate.segments.length) {
          const gateColor = gate.segments[segmentIndex];

          if (gateColor !== player.color) {
            this.gameOver();
            return;
          }
        }

        gate.passed = true;
        this.state.score++;
      }
    }

    // Remove off-screen gates
    this.state.gates = this.state.gates.filter((g) => g.y < this.canvasHeight + 50);

    // Generate new gates
    this.gateTimer++;
    const gateInterval = Math.max(40, 80 - this.state.score);

    if (this.gateTimer >= gateInterval) {
      this.generateGate();
      this.gateTimer = 0;
    }

    this.emitState();
  }

  private generateGate(): void {
    const numSegments = 2 + Math.floor(Math.random() * 3); // 2-4 segments
    const segments: number[] = [];

    for (let i = 0; i < numSegments; i++) {
      segments.push(Math.floor(Math.random() * COLORS.length));
    }

    // Ensure at least one segment matches current player color
    if (!segments.includes(this.state.player.color)) {
      const randomIndex = Math.floor(Math.random() * segments.length);
      segments[randomIndex] = this.state.player.color;
    }

    this.state.gates.push({
      y: -30,
      segments,
      passed: false,
    });
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("colorDashHighScore", this.state.highScore.toString());
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
