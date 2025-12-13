/**
 * Countdown Boom Game Logic
 * Game #211 - Defuse bombs by cutting the right wire
 */

export type WireColor = "red" | "blue" | "green" | "yellow" | "white";

export interface Wire {
  color: WireColor;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cut: boolean;
}

export interface Bomb {
  wires: Wire[];
  correctWire: WireColor;
  hint: string;
  timeLeft: number;
  maxTime: number;
}

export interface GameState {
  bomb: Bomb | null;
  score: number;
  bombsDefused: number;
  level: number;
  lives: number;
  status: "idle" | "playing" | "defused" | "exploded" | "gameOver";
}

const WIRE_COLORS: WireColor[] = ["red", "blue", "green", "yellow", "white"];
const COLOR_HEX: Record<WireColor, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#27ae60",
  yellow: "#f1c40f",
  white: "#ecf0f1",
};

const HINTS: Record<string, (colors: WireColor[]) => { wire: WireColor; hint: string }> = {
  notRed: (colors) => {
    const wire = colors.find((c) => c !== "red") || colors[0];
    return { wire, hint: "NOT RED" };
  },
  notBlue: (colors) => {
    const wire = colors.find((c) => c !== "blue") || colors[0];
    return { wire, hint: "NOT BLUE" };
  },
  firstColor: (colors) => {
    return { wire: colors[0], hint: "FIRST WIRE" };
  },
  lastColor: (colors) => {
    return { wire: colors[colors.length - 1], hint: "LAST WIRE" };
  },
  middleColor: (colors) => {
    const midIndex = Math.floor(colors.length / 2);
    return { wire: colors[midIndex], hint: "MIDDLE WIRE" };
  },
  greenIfPresent: (colors) => {
    if (colors.includes("green")) {
      return { wire: "green", hint: "GREEN IF EXISTS" };
    }
    return { wire: colors[0], hint: "FIRST IF NO GREEN" };
  },
  yellowIfPresent: (colors) => {
    if (colors.includes("yellow")) {
      return { wire: "yellow", hint: "YELLOW IF EXISTS" };
    }
    return { wire: colors[colors.length - 1], hint: "LAST IF NO YELLOW" };
  },
};

export class CountdownBoomGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private timerInterval: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      bomb: null,
      score: 0,
      bombsDefused: 0,
      level: 1,
      lives: 3,
      status: "idle",
    };
  }

  public start(): void {
    this.state = {
      bomb: null,
      score: 0,
      bombsDefused: 0,
      level: 1,
      lives: 3,
      status: "playing",
    };

    this.createBomb();
    this.startTimer();
    this.emitState();
  }

  private createBomb(): void {
    const wireCount = Math.min(3 + Math.floor(this.state.level / 2), 5);
    const timeLimit = Math.max(5, 10 - Math.floor(this.state.level / 3));

    // Shuffle and pick colors
    const shuffled = [...WIRE_COLORS].sort(() => Math.random() - 0.5);
    const selectedColors = shuffled.slice(0, wireCount);

    // Create wires
    const wires: Wire[] = selectedColors.map((color, index) => {
      const y1 = 150 + index * 50;
      return {
        color,
        x1: 80,
        y1,
        x2: 320,
        y2: y1 + (Math.random() - 0.5) * 30,
        cut: false,
      };
    });

    // Select hint and correct wire
    const hintKeys = Object.keys(HINTS);
    const hintKey = hintKeys[Math.floor(Math.random() * hintKeys.length)];
    const { wire, hint } = HINTS[hintKey](selectedColors);

    this.state.bomb = {
      wires,
      correctWire: wire,
      hint,
      timeLeft: timeLimit,
      maxTime: timeLimit,
    };
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = window.setInterval(() => {
      if (this.state.status !== "playing" || !this.state.bomb) return;

      this.state.bomb.timeLeft -= 0.1;

      if (this.state.bomb.timeLeft <= 0) {
        this.explode();
      }

      this.emitState();
    }, 100);
  }

  public cutWire(color: WireColor): boolean {
    if (this.state.status !== "playing" || !this.state.bomb) return false;

    const wire = this.state.bomb.wires.find((w) => w.color === color && !w.cut);
    if (!wire) return false;

    wire.cut = true;

    if (color === this.state.bomb.correctWire) {
      this.defuse();
    } else {
      this.explode();
    }

    return true;
  }

  private defuse(): void {
    if (!this.state.bomb) return;

    const timeBonus = Math.floor(this.state.bomb.timeLeft * 20);
    this.state.score += 100 + timeBonus;
    this.state.bombsDefused++;
    this.state.status = "defused";

    // Level up every 3 bombs
    if (this.state.bombsDefused % 3 === 0) {
      this.state.level++;
    }

    // Next bomb after delay
    setTimeout(() => {
      if (this.state.lives > 0) {
        this.state.status = "playing";
        this.createBomb();
        this.emitState();
      }
    }, 1500);

    this.emitState();
  }

  private explode(): void {
    this.state.lives--;
    this.state.status = "exploded";

    if (this.state.lives <= 0) {
      setTimeout(() => {
        this.endGame();
      }, 1500);
    } else {
      // Next bomb after delay
      setTimeout(() => {
        this.state.status = "playing";
        this.createBomb();
        this.emitState();
      }, 1500);
    }

    this.emitState();
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.emitState();
  }

  public getColorHex(color: WireColor): string {
    return COLOR_HEX[color];
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
