export interface Tile {
  value: number; // 1 to N*N-1, 0 is empty
  currentPos: number; // Index 0 to N*N-1
  targetPos: number; // Index where it should be (value - 1)
  element: HTMLElement;
}

import natureImg from "./assets/images/nature.jpg";

export class SlidingPuzzleGame {
  private container: HTMLElement;
  private tiles: Tile[] = [];
  private emptyPos = 0;

  private size = 3; // 3x3 or 4x4
  private isImageMode = false;

  private moves = 0;
  private startTime = 0;
  private timerInterval: number | null = null;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((s: any) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init(size: number, isImageMode: boolean) {
    this.size = size;
    this.isImageMode = isImageMode;
    this.reset();
  }

  public start() {
    this.shuffle();
    this.status = "playing";
    this.moves = 0;
    this.startTime = Date.now();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);
    this.notify();
  }

  public reset() {
    this.status = "idle";
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.createTiles();
    this.notify();
  }

  public toggleMode() {
    this.isImageMode = !this.isImageMode;
    this.updateTileVisuals();
  }

  private createTiles() {
    this.container.innerHTML = "";
    this.tiles = [];

    const count = this.size * this.size;

    for (let i = 0; i < count; i++) {
      // Last one is empty
      if (i === count - 1) {
        this.emptyPos = i;
        continue;
      }

      const tileEl = document.createElement("div");
      tileEl.className = "tile";
      tileEl.textContent = (i + 1).toString();

      // Image Setup
      // We use a lorem picsum or placeholder linear gradient if no image provided?
      // Let's use a nice gradient or shape pattern for "Image Mode" demo,
      // or a real image url if allowed.
      // Using a persistent placeholder image from standard placeholder service
      tileEl.style.backgroundImage = `url("${natureImg}")`;

      const tile: Tile = {
        value: i + 1,
        currentPos: i,
        targetPos: i,
        element: tileEl,
      };

      tileEl.addEventListener("click", () => this.handleTileClick(tile));
      this.container.appendChild(tileEl);
      this.tiles.push(tile);
    }

    this.updateTileVisuals();
    this.updatePositions();
  }

  private updateTileVisuals() {
    const count = this.size * this.size;
    const tileSizePct = 100 / this.size;

    this.tiles.forEach((t) => {
      t.element.style.width = `${tileSizePct}%`;
      t.element.style.height = `${tileSizePct}%`;

      if (this.isImageMode) {
        t.element.classList.add("image-mode");
        t.element.style.backgroundImage = `url("${natureImg}")`;
        // Calculate BG position based on TARGET pos (original image slice)
        const row = Math.floor(t.targetPos / this.size);
        const col = t.targetPos % this.size;

        // bgPos = -col * 100%, -row * 100% ? No.
        // If container is 100%, and we have 3 tiles.
        // Each tile is 33.33%.
        // To show 33% to 66% slice, we shift bg.
        // Formula: x% = col / (size-1) * 100% ?

        const x = (col / (this.size - 1)) * 100;
        const y = (row / (this.size - 1)) * 100;

        t.element.style.backgroundPosition = `${x}% ${y}%`;
        // Ensure bg size covers the full virtual container
        // Default 'auto' might not work well.
        // We want the image to be "Grid Size" big.
        // e.g. 300% 300% of the tile size?
        t.element.style.backgroundSize = `${this.size * 100}% ${
          this.size * 100
        }%`;

        // Keep number for easy debug? No, hide it. CSS handles color:transparent.
      } else {
        t.element.classList.remove("image-mode");
        t.element.style.backgroundImage = "none";
        t.element.style.backgroundColor = "#f1c40f";
      }
    });
  }

  private updatePositions() {
    const tileSizePct = 100; // Relative to tile size? No, absolute to container.
    // Actually best to use % for translate.
    // 0 -> 0, 0
    // 1 -> 100%, 0

    this.tiles.forEach((t) => {
      const row = Math.floor(t.currentPos / this.size);
      const col = t.currentPos % this.size;

      t.element.style.left = `${col * (100 / this.size)}%`;
      t.element.style.top = `${row * (100 / this.size)}%`;
    });
  }

  private handleTileClick(tile: Tile) {
    if (this.status !== "playing") return;

    if (this.canMove(tile.currentPos)) {
      // Swap
      const newPos = this.emptyPos;
      const oldPos = tile.currentPos;

      this.emptyPos = oldPos;
      tile.currentPos = newPos;

      this.updatePositions();
      this.moves++;
      this.notify();

      this.checkWin();
    }
  }

  private canMove(pos: number): boolean {
    // Check adjacency
    const r1 = Math.floor(pos / this.size);
    const c1 = pos % this.size;

    const r2 = Math.floor(this.emptyPos / this.size);
    const c2 = this.emptyPos % this.size;

    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  private checkWin() {
    const isSorted = this.tiles.every((t) => t.currentPos === t.targetPos);
    if (isSorted) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.notify();
    }
  }

  private shuffle() {
    // Fisher-Yates shuffle of positions?
    // Must ensure solvable.
    // Easier: Just random valid moves from solved state?
    // Or: Random permutation + parity check.
    // Let's do random valid moves to ensure solvability guaranteed.

    const totalMoves = this.size === 3 ? 100 : 200;
    let lastPos = -1;

    // Fast shuffle
    for (let i = 0; i < totalMoves; i++) {
      // Find neighbors of empty
      const r = Math.floor(this.emptyPos / this.size);
      const c = this.emptyPos % this.size;

      const neighbors = [];
      if (r > 0) neighbors.push(this.emptyPos - this.size);
      if (r < this.size - 1) neighbors.push(this.emptyPos + this.size);
      if (c > 0) neighbors.push(this.emptyPos - 1);
      if (c < this.size - 1) neighbors.push(this.emptyPos + 1);

      // Prevent undoing last move immediately (simple heuristic)
      const valid = neighbors.filter((n) => n !== lastPos);
      const next =
        valid.length > 0
          ? valid[Math.floor(Math.random() * valid.length)]
          : neighbors[0];

      // Swap logic directly on data
      const tile = this.tiles.find((t) => t.currentPos === next);
      if (tile) {
        lastPos = this.emptyPos;
        this.emptyPos = next;
        tile.currentPos = lastPos;
      }
    }

    this.updatePositions();
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  private notify() {
    const time =
      this.status === "playing"
        ? Math.floor((Date.now() - this.startTime) / 1000)
        : 0;
    if (this.onStateChange)
      this.onStateChange({
        moves: this.moves,
        time,
        status: this.status,
      });
  }
}
