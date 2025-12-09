export class WordSearchGame {
  // Config
  width = 10;
  height = 10;

  // State
  grid: string[][] = []; // y,x
  words: { word: string; found: boolean; cells: { x: number; y: number }[] }[] =
    [];

  selectedCells: { x: number; y: number }[] = [];
  selectionStart: { x: number; y: number } | null = null;
  selectionEnd: { x: number; y: number } | null = null;

  status: "playing" | "won" = "playing";

  onStateChange: ((s: any) => void) | null = null;

  constructor() {}

  public start(wordList: string[]) {
    this.status = "playing";
    this.selectedCells = [];
    this.selectionStart = null;
    this.selectionEnd = null;

    // Generate Grid
    this.grid = Array.from({ length: this.height }, () =>
      Array(this.width).fill("")
    );
    this.words = wordList.map((w) => ({ word: w, found: false, cells: [] }));

    // Place Words
    this.words.forEach((wObj) => {
      // Try random spot
      let placed = false;
      let attempt = 0;
      while (!placed && attempt < 100) {
        attempt++;
        const dirX = [1, 0, 1, 1][Math.floor(Math.random() * 4)]; // H, V, D, D2?
        const dirY = [0, 1, 1, -1][Math.floor(Math.random() * 4)];

        if (dirX === 0 && dirY === 0) continue;

        // Random Start
        const startX = Math.floor(Math.random() * this.width);
        const startY = Math.floor(Math.random() * this.height);

        if (this.canPlace(wObj.word, startX, startY, dirX, dirY)) {
          this.place(wObj, startX, startY, dirX, dirY);
          placed = true;
        }
      }
      if (!placed) {
        console.warn(`Could not place word: ${wObj.word}`);
        // Remove from list or allow missing? Better to retry or ignore (it just won't be on board)
        // Filter out unfound words? Or just keep them as "Bonus"?
        // Let's keep loop simple for MVP.
      }
    });

    // Fill Empty
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === "") {
          this.grid[y][x] = chars.charAt(
            Math.floor(Math.random() * chars.length)
          );
        }
      }
    }

    this.notify();
  }

  private canPlace(
    word: string,
    x: number,
    y: number,
    dx: number,
    dy: number
  ): boolean {
    // Check bounds
    const endX = x + (word.length - 1) * dx;
    const endY = y + (word.length - 1) * dy;

    if (endX < 0 || endX >= this.width || endY < 0 || endY >= this.height)
      return false;

    // Check overlap
    for (let i = 0; i < word.length; i++) {
      const cx = x + i * dx;
      const cy = y + i * dy;
      const current = this.grid[cy][cx];
      if (current !== "" && current !== word[i]) return false;
    }
    return true;
  }

  private place(
    wObj: { word: string; cells: any[] },
    x: number,
    y: number,
    dx: number,
    dy: number
  ) {
    for (let i = 0; i < wObj.word.length; i++) {
      const cx = x + i * dx;
      const cy = y + i * dy;
      this.grid[cy][cx] = wObj.word[i];
      wObj.cells.push({ x: cx, y: cy });
    }
  }

  public handleInputStart(x: number, y: number) {
    this.selectionStart = { x, y };
    this.selectionEnd = { x, y };
    this.updateSelection();
  }

  public handleInputMove(x: number, y: number) {
    if (!this.selectionStart) return;
    if (x === this.selectionEnd?.x && y === this.selectionEnd?.y) return; // Same

    this.selectionEnd = { x, y };
    this.updateSelection();
  }

  public handleInputEnd() {
    if (!this.selectionStart) return;

    // Check Word Match
    // Convert selected cells to string
    // Since updateSelection enforces line, we just read cells
    const word = this.selectedCells.map((c) => this.grid[c.y][c.x]).join("");
    const revWord = word.split("").reverse().join(""); // Allow reverse

    const match = this.words.find(
      (w) => !w.found && (w.word === word || w.word === revWord)
    );

    if (match) {
      match.found = true;
      this.checkWin();
    }

    this.selectionStart = null;
    this.selectionEnd = null;
    this.selectedCells = [];
    this.notify();
  }

  private updateSelection() {
    if (!this.selectionStart || !this.selectionEnd) return;

    this.selectedCells = [];

    // Calculate Line (Bresenham-ish or just Vector)
    // Constrain to 8 directions?
    // dx, dy
    let dx = this.selectionEnd.x - this.selectionStart.x;
    let dy = this.selectionEnd.y - this.selectionStart.y;

    // Normalize to dominant axis and diag
    // If angle is close to 45 deg, snap to 45.
    // If close to 0/90, snap.

    // Simplify: just check which |delta| is larger or if roughly equal
    // This is grid selection, so specific logic:
    // Must be H, V or Diagonal.
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Snap to valid line
    if (absX > absY * 2) {
      dy = 0;
    } // Horizontal
    else if (absY > absX * 2) {
      dx = 0;
    } // Vertical
    else {
      // Diagonal
      // Force absX == absY
      const len = Math.max(absX, absY);
      dx = (dx > 0 ? 1 : -1) * len;
      dy = (dy > 0 ? 1 : -1) * len;
    }

    // Generate cells from Start to snapped End
    const len = Math.max(Math.abs(dx), Math.abs(dy)); // Steps
    if (len === 0) {
      this.selectedCells.push(this.selectionStart);
    } else {
      const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

      let cx = this.selectionStart.x;
      let cy = this.selectionStart.y;

      for (let i = 0; i <= len; i++) {
        // Check Bounds
        if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
          this.selectedCells.push({ x: cx, y: cy });
        }
        cx += stepX;
        cy += stepY;
      }
    }

    this.notify();
  }

  private checkWin() {
    if (this.words.every((w) => w.found)) {
      this.status = "won";
      this.notify();
    }
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        grid: this.grid,
        words: this.words,
        selected: this.selectedCells,
        status: this.status,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }
}
