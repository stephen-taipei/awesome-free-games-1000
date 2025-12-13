/**
 * Memory Challenge Game Logic
 * Game #213 - Simon Says style memory sequence game
 */

export type ButtonColor = "red" | "green" | "blue" | "yellow";

export interface GameState {
  sequence: ButtonColor[];
  playerSequence: ButtonColor[];
  score: number;
  level: number;
  phase: "idle" | "showing" | "input" | "correct" | "wrong" | "gameOver";
  activeButton: ButtonColor | null;
  showingIndex: number;
}

const COLORS: ButtonColor[] = ["red", "green", "blue", "yellow"];
const COLOR_HEX: Record<ButtonColor, { normal: string; active: string }> = {
  red: { normal: "#c0392b", active: "#e74c3c" },
  green: { normal: "#27ae60", active: "#2ecc71" },
  blue: { normal: "#2980b9", active: "#3498db" },
  yellow: { normal: "#f39c12", active: "#f1c40f" },
};

export class MemoryChallengeGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private showTimeout: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      sequence: [],
      playerSequence: [],
      score: 0,
      level: 1,
      phase: "idle",
      activeButton: null,
      showingIndex: 0,
    };
  }

  public start(): void {
    this.state = {
      sequence: [],
      playerSequence: [],
      score: 0,
      level: 1,
      phase: "showing",
      activeButton: null,
      showingIndex: 0,
    };

    this.addToSequence();
    this.emitState();

    setTimeout(() => this.showSequence(), 1000);
  }

  private addToSequence(): void {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.state.sequence.push(randomColor);
  }

  private showSequence(): void {
    this.state.phase = "showing";
    this.state.showingIndex = 0;
    this.emitState();

    this.showNextInSequence();
  }

  private showNextInSequence(): void {
    if (this.state.showingIndex >= this.state.sequence.length) {
      // Done showing, player's turn
      this.state.activeButton = null;
      this.state.phase = "input";
      this.state.playerSequence = [];
      this.emitState();
      return;
    }

    const color = this.state.sequence[this.state.showingIndex];
    this.state.activeButton = color;
    this.emitState();

    // Flash duration based on level
    const flashDuration = Math.max(200, 500 - this.state.level * 30);
    const pauseDuration = Math.max(100, 300 - this.state.level * 20);

    this.showTimeout = window.setTimeout(() => {
      this.state.activeButton = null;
      this.emitState();

      this.showTimeout = window.setTimeout(() => {
        this.state.showingIndex++;
        this.showNextInSequence();
      }, pauseDuration);
    }, flashDuration);
  }

  public pressButton(color: ButtonColor): boolean {
    if (this.state.phase !== "input") return false;

    // Flash the button
    this.state.activeButton = color;
    this.emitState();

    setTimeout(() => {
      this.state.activeButton = null;
      this.emitState();
    }, 150);

    this.state.playerSequence.push(color);

    const currentIndex = this.state.playerSequence.length - 1;
    const expectedColor = this.state.sequence[currentIndex];

    if (color !== expectedColor) {
      // Wrong!
      this.state.phase = "wrong";
      this.emitState();

      setTimeout(() => {
        this.state.phase = "gameOver";
        this.emitState();
      }, 1000);

      return false;
    }

    // Correct so far
    if (this.state.playerSequence.length === this.state.sequence.length) {
      // Completed the sequence!
      this.state.score += this.state.level * 100;
      this.state.level++;
      this.state.phase = "correct";
      this.emitState();

      setTimeout(() => {
        this.addToSequence();
        this.showSequence();
      }, 1000);
    }

    return true;
  }

  public getColorHex(color: ButtonColor, active: boolean = false): string {
    return active ? COLOR_HEX[color].active : COLOR_HEX[color].normal;
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
