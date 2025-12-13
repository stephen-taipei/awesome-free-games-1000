/**
 * Color Sort Game Engine
 * Game #083 - Sort colored balls into tubes
 */

type Color = string;

interface Tube {
  balls: Color[];
  capacity: number;
}

interface GameState {
  tubes: Tube[];
}

interface Level {
  colors: number;
  tubeCount: number;
  emptyTubes: number;
  ballsPerTube: number;
}

const COLORS: Color[] = [
  "#e74c3c", // Red
  "#3498db", // Blue
  "#2ecc71", // Green
  "#f1c40f", // Yellow
  "#9b59b6", // Purple
  "#e67e22", // Orange
  "#1abc9c", // Teal
  "#e91e63", // Pink
  "#00bcd4", // Cyan
  "#795548", // Brown
];

const LEVELS: Level[] = [
  { colors: 3, tubeCount: 3, emptyTubes: 1, ballsPerTube: 4 },
  { colors: 4, tubeCount: 4, emptyTubes: 1, ballsPerTube: 4 },
  { colors: 5, tubeCount: 5, emptyTubes: 2, ballsPerTube: 4 },
  { colors: 6, tubeCount: 6, emptyTubes: 2, ballsPerTube: 4 },
  { colors: 7, tubeCount: 7, emptyTubes: 2, ballsPerTube: 4 },
  { colors: 8, tubeCount: 8, emptyTubes: 2, ballsPerTube: 4 },
];

export class ColorSortGame {
  tubes: Tube[] = [];
  selectedTubeIndex: number = -1;
  moves: number = 0;
  currentLevel: number = 0;
  status: "playing" | "won" = "playing";

  history: GameState[] = [];
  maxHistory: number = 50;

  onStateChange: ((state: any) => void) | null = null;
  onRender: (() => void) | null = null;

  public start() {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
  }

  public loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex] || LEVELS[0];
    this.tubes = [];
    this.selectedTubeIndex = -1;
    this.moves = 0;
    this.status = "playing";
    this.history = [];

    // Create filled tubes
    const allBalls: Color[] = [];
    for (let c = 0; c < level.colors; c++) {
      for (let b = 0; b < level.ballsPerTube; b++) {
        allBalls.push(COLORS[c]);
      }
    }

    // Shuffle balls
    for (let i = allBalls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
    }

    // Fill tubes
    let ballIndex = 0;
    for (let t = 0; t < level.tubeCount; t++) {
      const tube: Tube = { balls: [], capacity: level.ballsPerTube };
      for (let b = 0; b < level.ballsPerTube; b++) {
        tube.balls.push(allBalls[ballIndex++]);
      }
      this.tubes.push(tube);
    }

    // Add empty tubes
    for (let e = 0; e < level.emptyTubes; e++) {
      this.tubes.push({ balls: [], capacity: level.ballsPerTube });
    }

    this.notifyState();
    if (this.onRender) this.onRender();
  }

  public getTubes(): Tube[] {
    return this.tubes;
  }

  public getSelectedTubeIndex(): number {
    return this.selectedTubeIndex;
  }

  public selectTube(index: number) {
    if (this.status !== "playing") return;

    if (index < 0 || index >= this.tubes.length) return;

    if (this.selectedTubeIndex === -1) {
      // Select tube if it has balls
      if (this.tubes[index].balls.length > 0) {
        this.selectedTubeIndex = index;
      }
    } else if (this.selectedTubeIndex === index) {
      // Deselect
      this.selectedTubeIndex = -1;
    } else {
      // Try to pour
      this.pour(this.selectedTubeIndex, index);
      this.selectedTubeIndex = -1;
    }

    this.notifyState();
    if (this.onRender) this.onRender();
  }

  private pour(fromIndex: number, toIndex: number) {
    const fromTube = this.tubes[fromIndex];
    const toTube = this.tubes[toIndex];

    if (fromTube.balls.length === 0) return;
    if (toTube.balls.length >= toTube.capacity) return;

    const topColor = fromTube.balls[fromTube.balls.length - 1];

    // Check if can pour (empty or same color on top)
    if (toTube.balls.length > 0) {
      const toTopColor = toTube.balls[toTube.balls.length - 1];
      if (toTopColor !== topColor) return;
    }

    // Save state for undo
    this.saveState();

    // Pour all same-colored balls from top
    let ballsMoved = 0;
    while (
      fromTube.balls.length > 0 &&
      toTube.balls.length < toTube.capacity &&
      fromTube.balls[fromTube.balls.length - 1] === topColor
    ) {
      toTube.balls.push(fromTube.balls.pop()!);
      ballsMoved++;
    }

    if (ballsMoved > 0) {
      this.moves++;
      this.checkWin();
    }
  }

  private saveState() {
    const state: GameState = {
      tubes: this.tubes.map((t) => ({
        balls: [...t.balls],
        capacity: t.capacity,
      })),
    };
    this.history.push(state);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public undo() {
    if (this.history.length === 0) return;

    const prevState = this.history.pop()!;
    this.tubes = prevState.tubes;
    this.moves = Math.max(0, this.moves - 1);
    this.selectedTubeIndex = -1;

    this.notifyState();
    if (this.onRender) this.onRender();
  }

  private checkWin() {
    const won = this.tubes.every((tube) => {
      if (tube.balls.length === 0) return true;
      if (tube.balls.length !== tube.capacity) return false;
      const firstColor = tube.balls[0];
      return tube.balls.every((b) => b === firstColor);
    });

    if (won) {
      this.status = "won";
    }

    this.notifyState();
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public setOnRender(cb: () => void) {
    this.onRender = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        maxLevel: LEVELS.length,
        moves: this.moves,
        status: this.status,
        canUndo: this.history.length > 0,
      });
    }
  }
}
