export class LightsOutGame {
  static SIZE = 5;

  // true = on, false = off
  grid: boolean[][] = [];
  initialState: boolean[][] = []; // For reset
  moves = 0;
  status: "playing" | "won" = "playing";

  onStateChange: ((s: any) => void) | null = null;

  constructor() {
    this.initGrid();
  }

  private initGrid() {
    this.grid = Array.from({ length: 5 }, () => Array(5).fill(false));
  }

  public newGame() {
    // Start empty
    this.initGrid();
    this.moves = 0;
    this.status = "playing";

    // Random clicks to generate solvable level
    // 10-20 random moves
    const randomMoves = 10 + Math.floor(Math.random() * 20);
    for (let i = 0; i < randomMoves; i++) {
      const x = Math.floor(Math.random() * 5);
      const y = Math.floor(Math.random() * 5);
      this.toggleLogic(x, y);
    }

    // Save state
    this.initialState = this.grid.map((row) => [...row]);
    this.notify();
  }

  public reset() {
    if (this.initialState.length === 0) {
      this.newGame();
      return;
    }
    this.grid = this.initialState.map((row) => [...row]);
    this.moves = 0;
    this.status = "playing";
    this.notify();
  }

  public move(x: number, y: number) {
    if (this.status !== "playing") return;

    this.toggleLogic(x, y);
    this.moves++;

    if (this.checkWin()) {
      this.status = "won";
    }

    this.notify();
  }

  private toggleLogic(x: number, y: number) {
    this.toggle(x, y);
    this.toggle(x + 1, y);
    this.toggle(x - 1, y);
    this.toggle(x, y + 1);
    this.toggle(x, y - 1);
  }

  private toggle(x: number, y: number) {
    if (x >= 0 && x < 5 && y >= 0 && y < 5) {
      this.grid[y][x] = !this.grid[y][x];
    }
  }

  private checkWin() {
    return this.grid.every((row) => row.every((val) => !val));
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        grid: this.grid,
        moves: this.moves,
        status: this.status,
      });
  }
  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public start() {
    this.newGame();
  }
}
