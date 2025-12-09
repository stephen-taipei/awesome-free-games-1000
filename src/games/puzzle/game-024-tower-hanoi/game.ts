export class HanoiGame {
  // State
  towers: number[][] = [[], [], []]; // Disks are numbers 1..N (1 is smallest)

  // Config
  numDisks = 3;

  // Valid moves: Disk N can be placed on top of > N or empty

  selectedTower: number | null = null;

  status: "playing" | "won" = "playing";
  moves = 0;
  minMoves = 0;
  time = 0;
  timerInterval: number | null = null;
  onStateChange: ((s: any) => void) | null = null;

  constructor() {}

  public start(disks: number) {
    this.numDisks = disks;
    this.towers = [[], [], []];

    // Fill Tower 0: Largest (N) at bottom (index 0), Smallest (1) at top (index N-1)
    // Wait, stack behavior: push/pop. Top is end of array.
    // So base is max.
    // Array: [N, N-1, ..., 1]
    for (let i = this.numDisks; i >= 1; i--) {
      this.towers[0].push(i);
    }

    this.selectedTower = null;
    this.moves = 0;
    this.minMoves = Math.pow(2, this.numDisks) - 1;
    this.status = "playing";
    this.time = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);

    this.notify();
  }

  public selectTower(idx: number) {
    if (this.status !== "playing") return;

    // Deselect if same
    if (this.selectedTower === idx) {
      this.selectedTower = null;
      this.notify();
      return;
    }

    if (this.selectedTower === null) {
      // Check if tower has disks
      if (this.towers[idx].length > 0) {
        this.selectedTower = idx;
        this.notify();
      }
    } else {
      // Try to move from selected to idx
      this.tryMove(this.selectedTower, idx);
    }
  }

  private tryMove(from: number, to: number) {
    const disk = this.towers[from][this.towers[from].length - 1]; // Top

    // Check Validity
    let valid = false;
    if (this.towers[to].length === 0) {
      valid = true;
    } else {
      const destTop = this.towers[to][this.towers[to].length - 1];
      if (disk < destTop) {
        valid = true;
      }
    }

    if (valid) {
      this.towers[from].pop();
      this.towers[to].push(disk);
      this.selectedTower = null;
      this.moves++;
      this.checkWin();
    } else {
      // Invalid move feedback?
      // Just deselect or switch selection?
      // Usually, if clicking another tower, we might want to select it instead if valid source?
      // If invalid target, maybe just shake or do nothing.
      // Let's reset select to new tower if it has disks, effectively switching 'source'.
      // Unless 'to' is also empty, in which case just deselect.

      if (this.towers[to].length > 0) {
        this.selectedTower = to;
      } else {
        this.selectedTower = null;
      }
    }

    this.notify();
  }

  private checkWin() {
    // All disks on Tower 2
    // Tower 0 and 1 empty? (Implied if all on 2)
    if (this.towers[2].length === this.numDisks) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.notify();
    }
  }

  public reset() {
    this.start(this.numDisks);
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        towers: this.towers,
        selected: this.selectedTower,
        moves: this.moves,
        minMoves: this.minMoves,
        time: this.time++,
        status: this.status,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
