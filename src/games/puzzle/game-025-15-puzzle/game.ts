export class Puzzle15Game {
  tiles: number[] = []; // 0-15, 0 is empty
  size = 4;

  status: "playing" | "won" = "playing";
  moves = 0;
  time = 0;
  timerInterval: number | null = null;
  onStateChange: ((s: any) => void) | null = null;

  constructor() {}

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.time = 0;

    // Init solved
    this.tiles = Array.from({ length: 16 }, (_, i) => (i + 1) % 16); // 1..15, 0

    this.shuffle();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);

    this.notify();
  }

  private shuffle() {
    // Perform valid random moves to ensure solvability
    let emptyIdx = 15;
    let prevIdx = -1;

    const difficulty = 500; // number of random moves

    for (let i = 0; i < difficulty; i++) {
      const neighbors = this.getNeighbors(emptyIdx);
      // Don't undo immediate last move to ensure efficient shuffling
      const valid = neighbors.filter((n) => n !== prevIdx);
      const next = valid[Math.floor(Math.random() * valid.length)];

      // Swap
      this.tiles[emptyIdx] = this.tiles[next];
      this.tiles[next] = 0;

      prevIdx = emptyIdx;
      emptyIdx = next;
    }
  }

  private getNeighbors(idx: number): number[] {
    const neighbors: number[] = [];
    const r = Math.floor(idx / this.size);
    const c = idx % this.size;

    if (r > 0) neighbors.push(idx - this.size); // Up
    if (r < this.size - 1) neighbors.push(idx + this.size); // Down
    if (c > 0) neighbors.push(idx - 1); // Left
    if (c < this.size - 1) neighbors.push(idx + 1); // Right

    return neighbors;
  }

  public move(tileVal: number) {
    if (this.status !== "playing") return;

    const tileIdx = this.tiles.indexOf(tileVal);
    const emptyIdx = this.tiles.indexOf(0);

    if (this.isAdjacent(tileIdx, emptyIdx)) {
      // Swap
      this.tiles[emptyIdx] = tileVal;
      this.tiles[tileIdx] = 0;
      this.moves++;
      this.checkWin();
      this.notify();
    }
  }

  private isAdjacent(i1: number, i2: number): boolean {
    const r1 = Math.floor(i1 / this.size);
    const c1 = i1 % this.size;
    const r2 = Math.floor(i2 / this.size);
    const c2 = i2 % this.size;

    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  private checkWin() {
    for (let i = 0; i < 15; i++) {
      if (this.tiles[i] !== i + 1) return;
    }
    this.status = "won";
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  public reset() {
    this.start();
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        tiles: this.tiles,
        moves: this.moves,
        time: this.time++,
        status: this.status,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
