/**
 * Combination Lock Game Logic
 * Game #100
 */

export type HintType = "correct" | "wrong-position" | "wrong";

export interface Hint {
  code: number[];
  results: HintType[];
  description: string;
}

export interface Level {
  id: number;
  digits: number;
  code: number[];
  hints: { code: number[]; description: string }[];
}

export interface GameState {
  code: number[];
  currentGuess: number[];
  digits: number;
  attempts: number;
  level: number;
  hints: Hint[];
  status: "playing" | "won";
}

// Generate hint results based on guess vs actual code
function generateHintResults(guess: number[], actual: number[]): HintType[] {
  const results: HintType[] = [];
  const actualCopy = [...actual];
  const guessUsed: boolean[] = new Array(guess.length).fill(false);

  // First pass: find exact matches
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === actual[i]) {
      results[i] = "correct";
      actualCopy[i] = -1; // Mark as used
      guessUsed[i] = true;
    }
  }

  // Second pass: find wrong position matches
  for (let i = 0; i < guess.length; i++) {
    if (guessUsed[i]) continue;

    const idx = actualCopy.indexOf(guess[i]);
    if (idx !== -1) {
      results[i] = "wrong-position";
      actualCopy[idx] = -1;
    } else {
      results[i] = "wrong";
    }
  }

  return results;
}

const LEVELS: Level[] = [
  // Level 1: 3 digits, easy
  {
    id: 1,
    digits: 3,
    code: [1, 4, 7],
    hints: [
      { code: [1, 2, 3], description: "1 correct position" },
      { code: [4, 5, 6], description: "1 wrong position" },
      { code: [7, 8, 9], description: "1 wrong position" },
    ],
  },
  // Level 2: 3 digits
  {
    id: 2,
    digits: 3,
    code: [6, 8, 2],
    hints: [
      { code: [6, 1, 2], description: "2 correct position" },
      { code: [1, 8, 3], description: "1 wrong position" },
      { code: [4, 5, 6], description: "1 wrong position" },
    ],
  },
  // Level 3: 3 digits
  {
    id: 3,
    digits: 3,
    code: [0, 4, 2],
    hints: [
      { code: [0, 1, 2], description: "2 correct position" },
      { code: [4, 5, 6], description: "1 wrong position" },
      { code: [7, 8, 9], description: "0 correct" },
    ],
  },
  // Level 4: 4 digits
  {
    id: 4,
    digits: 4,
    code: [3, 9, 1, 8],
    hints: [
      { code: [3, 1, 2, 4], description: "1 correct, 1 wrong position" },
      { code: [5, 9, 6, 7], description: "1 correct position" },
      { code: [1, 8, 3, 9], description: "0 correct, 4 wrong position" },
    ],
  },
  // Level 5: 4 digits
  {
    id: 5,
    digits: 4,
    code: [7, 2, 5, 0],
    hints: [
      { code: [7, 1, 2, 3], description: "1 correct, 1 wrong position" },
      { code: [4, 5, 6, 7], description: "1 wrong position" },
      { code: [0, 9, 8, 5], description: "2 wrong position" },
    ],
  },
  // Level 6: 4 digits, harder
  {
    id: 6,
    digits: 4,
    code: [1, 5, 3, 9],
    hints: [
      { code: [9, 5, 1, 3], description: "1 correct, 3 wrong position" },
      { code: [1, 2, 3, 4], description: "2 correct position" },
      { code: [5, 6, 7, 8], description: "1 wrong position" },
    ],
  },
  // Level 7: 4 digits
  {
    id: 7,
    digits: 4,
    code: [4, 0, 6, 2],
    hints: [
      { code: [4, 1, 2, 3], description: "1 correct, 1 wrong position" },
      { code: [0, 5, 6, 7], description: "2 wrong position" },
      { code: [8, 9, 0, 2], description: "1 correct, 1 wrong position" },
    ],
  },
  // Level 8: 5 digits
  {
    id: 8,
    digits: 5,
    code: [2, 8, 4, 1, 6],
    hints: [
      { code: [2, 3, 4, 5, 6], description: "2 correct, 1 wrong position" },
      { code: [1, 8, 9, 0, 1], description: "1 correct, 1 wrong position" },
      { code: [4, 6, 8, 2, 1], description: "0 correct, 5 wrong position" },
    ],
  },
  // Level 9: 5 digits
  {
    id: 9,
    digits: 5,
    code: [9, 3, 7, 0, 5],
    hints: [
      { code: [9, 1, 2, 3, 4], description: "1 correct, 1 wrong position" },
      { code: [5, 6, 7, 8, 9], description: "2 wrong position" },
      { code: [0, 3, 5, 7, 9], description: "1 correct, 4 wrong position" },
    ],
  },
  // Level 10: 5 digits, hardest
  {
    id: 10,
    digits: 5,
    code: [6, 1, 8, 3, 0],
    hints: [
      { code: [6, 2, 3, 4, 5], description: "1 correct, 1 wrong position" },
      { code: [1, 7, 8, 9, 0], description: "2 wrong position" },
      { code: [0, 1, 3, 6, 8], description: "0 correct, 5 wrong position" },
      { code: [8, 3, 6, 1, 0], description: "1 correct, 4 wrong position" },
    ],
  },
];

export class CombinationGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = this.createInitialState(1);
  }

  private createInitialState(levelNum: number): GameState {
    const level = LEVELS[levelNum - 1] || LEVELS[0];

    // Generate hints with results
    const hints: Hint[] = level.hints.map((h) => ({
      code: h.code,
      results: generateHintResults(h.code, level.code),
      description: h.description,
    }));

    return {
      code: level.code,
      currentGuess: new Array(level.digits).fill(0),
      digits: level.digits,
      attempts: 0,
      level: levelNum,
      hints,
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

  public incrementDial(index: number): void {
    if (this.state.status !== "playing") return;
    if (index < 0 || index >= this.state.digits) return;

    this.state.currentGuess[index] = (this.state.currentGuess[index] + 1) % 10;
    this.emitState();
  }

  public decrementDial(index: number): void {
    if (this.state.status !== "playing") return;
    if (index < 0 || index >= this.state.digits) return;

    this.state.currentGuess[index] =
      (this.state.currentGuess[index] - 1 + 10) % 10;
    this.emitState();
  }

  public setDial(index: number, value: number): void {
    if (this.state.status !== "playing") return;
    if (index < 0 || index >= this.state.digits) return;
    if (value < 0 || value > 9) return;

    this.state.currentGuess[index] = value;
    this.emitState();
  }

  public check(): boolean {
    if (this.state.status !== "playing") return false;

    this.state.attempts++;

    // Check if guess matches code
    const isCorrect = this.state.currentGuess.every(
      (digit, i) => digit === this.state.code[i]
    );

    if (isCorrect) {
      this.state.status = "won";
    }

    this.emitState();
    return isCorrect;
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
