/**
 * Totem Puzzle Game Logic
 * Game #104 - Stack totem blocks to match target arrangement
 */

export type TotemColor = "red" | "blue" | "green" | "yellow" | "purple" | "orange";

export interface TotemBlock {
  id: number;
  color: TotemColor;
  pattern: number; // Pattern type 0-3
}

export interface Level {
  id: number;
  poles: number;
  initial: TotemBlock[][];
  target: TotemBlock[][];
}

export interface GameState {
  poles: TotemBlock[][];
  target: TotemBlock[][];
  level: number;
  moves: number;
  selectedPole: number | null;
  status: "playing" | "won";
  history: TotemBlock[][][];
}

const TOTEM_COLORS: Record<TotemColor, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#27ae60",
  yellow: "#f1c40f",
  purple: "#9b59b6",
  orange: "#e67e22",
};

function createBlock(id: number, color: TotemColor, pattern: number = 0): TotemBlock {
  return { id, color, pattern };
}

const LEVELS: Level[] = [
  // Level 1: Simple swap (2 poles, 2 blocks)
  {
    id: 1,
    poles: 3,
    initial: [
      [createBlock(1, "red", 0), createBlock(2, "blue", 1)],
      [],
      [],
    ],
    target: [
      [createBlock(2, "blue", 1), createBlock(1, "red", 0)],
      [],
      [],
    ],
  },
  // Level 2: Move to another pole
  {
    id: 2,
    poles: 3,
    initial: [
      [createBlock(1, "red", 0), createBlock(2, "green", 1)],
      [],
      [],
    ],
    target: [
      [],
      [createBlock(1, "red", 0), createBlock(2, "green", 1)],
      [],
    ],
  },
  // Level 3: Split and combine
  {
    id: 3,
    poles: 3,
    initial: [
      [createBlock(1, "red", 0), createBlock(2, "blue", 1), createBlock(3, "green", 2)],
      [],
      [],
    ],
    target: [
      [createBlock(3, "green", 2)],
      [createBlock(2, "blue", 1)],
      [createBlock(1, "red", 0)],
    ],
  },
  // Level 4: Classic Tower of Hanoi style
  {
    id: 4,
    poles: 3,
    initial: [
      [createBlock(1, "yellow", 0), createBlock(2, "purple", 1), createBlock(3, "orange", 2)],
      [],
      [],
    ],
    target: [
      [],
      [],
      [createBlock(1, "yellow", 0), createBlock(2, "purple", 1), createBlock(3, "orange", 2)],
    ],
  },
  // Level 5: Color sorting
  {
    id: 5,
    poles: 4,
    initial: [
      [createBlock(1, "red", 0), createBlock(3, "blue", 0)],
      [createBlock(2, "blue", 1), createBlock(4, "red", 1)],
      [],
      [],
    ],
    target: [
      [createBlock(1, "red", 0), createBlock(4, "red", 1)],
      [createBlock(2, "blue", 1), createBlock(3, "blue", 0)],
      [],
      [],
    ],
  },
  // Level 6: Pattern matching
  {
    id: 6,
    poles: 4,
    initial: [
      [createBlock(1, "green", 0), createBlock(2, "green", 1)],
      [createBlock(3, "yellow", 2), createBlock(4, "yellow", 3)],
      [],
      [],
    ],
    target: [
      [],
      [],
      [createBlock(1, "green", 0), createBlock(3, "yellow", 2)],
      [createBlock(2, "green", 1), createBlock(4, "yellow", 3)],
    ],
  },
  // Level 7: Complex stacking
  {
    id: 7,
    poles: 4,
    initial: [
      [createBlock(1, "red", 0)],
      [createBlock(2, "blue", 1)],
      [createBlock(3, "green", 2)],
      [createBlock(4, "purple", 3)],
    ],
    target: [
      [],
      [createBlock(1, "red", 0), createBlock(2, "blue", 1), createBlock(3, "green", 2), createBlock(4, "purple", 3)],
      [],
      [],
    ],
  },
  // Level 8: Reverse order challenge
  {
    id: 8,
    poles: 4,
    initial: [
      [createBlock(1, "orange", 0), createBlock(2, "yellow", 1), createBlock(3, "green", 2), createBlock(4, "blue", 3)],
      [],
      [],
      [],
    ],
    target: [
      [],
      [],
      [],
      [createBlock(4, "blue", 3), createBlock(3, "green", 2), createBlock(2, "yellow", 1), createBlock(1, "orange", 0)],
    ],
  },
  // Level 9: Multi-color sorting
  {
    id: 9,
    poles: 5,
    initial: [
      [createBlock(1, "red", 0), createBlock(4, "green", 0)],
      [createBlock(2, "blue", 1), createBlock(5, "red", 1)],
      [createBlock(3, "green", 2), createBlock(6, "blue", 2)],
      [],
      [],
    ],
    target: [
      [],
      [],
      [createBlock(1, "red", 0), createBlock(5, "red", 1)],
      [createBlock(2, "blue", 1), createBlock(6, "blue", 2)],
      [createBlock(3, "green", 2), createBlock(4, "green", 0)],
    ],
  },
  // Level 10: Ultimate totem challenge
  {
    id: 10,
    poles: 5,
    initial: [
      [createBlock(1, "red", 0), createBlock(2, "blue", 1)],
      [createBlock(3, "green", 2), createBlock(4, "yellow", 3)],
      [createBlock(5, "purple", 0), createBlock(6, "orange", 1)],
      [],
      [],
    ],
    target: [
      [],
      [],
      [createBlock(1, "red", 0), createBlock(3, "green", 2), createBlock(5, "purple", 0)],
      [createBlock(2, "blue", 1), createBlock(4, "yellow", 3), createBlock(6, "orange", 1)],
      [],
    ],
  },
];

export class TotemGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private deepCopyPoles(poles: TotemBlock[][]): TotemBlock[][] {
    return poles.map((pole) => pole.map((block) => ({ ...block })));
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    return {
      poles: this.deepCopyPoles(level.initial),
      target: this.deepCopyPoles(level.target),
      level: levelNum,
      moves: 0,
      selectedPole: null,
      status: "playing",
      history: [],
    };
  }

  public start(levelNum: number = 1): void {
    this.state = this.createInitialState(levelNum);
    this.emitState();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public getTotemColor(color: TotemColor): string {
    return TOTEM_COLORS[color];
  }

  public selectPole(poleIndex: number): boolean {
    if (this.state.status !== "playing") return false;

    // If no pole selected, select this one (if it has blocks)
    if (this.state.selectedPole === null) {
      if (this.state.poles[poleIndex].length > 0) {
        this.state.selectedPole = poleIndex;
        this.emitState();
        return true;
      }
      return false;
    }

    // If clicking the same pole, deselect
    if (this.state.selectedPole === poleIndex) {
      this.state.selectedPole = null;
      this.emitState();
      return true;
    }

    // Move block from selected pole to target pole
    const fromPole = this.state.poles[this.state.selectedPole];
    const toPole = this.state.poles[poleIndex];

    if (fromPole.length === 0) {
      this.state.selectedPole = null;
      this.emitState();
      return false;
    }

    // Save history for undo
    this.state.history.push(this.deepCopyPoles(this.state.poles));

    // Move the top block
    const block = fromPole.pop()!;
    toPole.push(block);

    this.state.moves++;
    this.state.selectedPole = null;

    // Check win
    if (this.checkWin()) {
      this.state.status = "won";
    }

    this.emitState();
    return true;
  }

  public undo(): boolean {
    if (this.state.history.length === 0) return false;

    this.state.poles = this.state.history.pop()!;
    this.state.moves = Math.max(0, this.state.moves - 1);
    this.state.selectedPole = null;
    this.emitState();
    return true;
  }

  private checkWin(): boolean {
    // Compare poles to target
    for (let i = 0; i < this.state.poles.length; i++) {
      const pole = this.state.poles[i];
      const targetPole = this.state.target[i];

      if (pole.length !== targetPole.length) return false;

      for (let j = 0; j < pole.length; j++) {
        if (pole[j].id !== targetPole[j].id) return false;
      }
    }
    return true;
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

  public getPoleCount(): number {
    return this.state.poles.length;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
