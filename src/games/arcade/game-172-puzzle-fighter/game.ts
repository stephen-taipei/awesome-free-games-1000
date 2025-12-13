/**
 * Puzzle Fighter Game
 * Game #172 - Grid + VS block puzzle
 */

const COLS = 6;
const ROWS = 12;
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"];

interface Block {
  color: number;
  falling: boolean;
}

interface Piece {
  x: number;
  y: number;
  blocks: [number, number]; // Two colors
  rotation: number;
}

export class PuzzleFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private cellSize: number = 30;
  private playerGrid: (Block | null)[][];
  private cpuGrid: (Block | null)[][];
  private playerPiece: Piece | null = null;
  private cpuPiece: Piece | null = null;
  private playerGarbage: number = 0;
  private cpuGarbage: number = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private animationId: number = 0;
  private dropTimer: number = 0;
  private dropInterval: number = 500;
  private lastTime: number = 0;
  private cpuMoveTimer: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.playerGrid = this.createGrid();
    this.cpuGrid = this.createGrid();
  }

  private createGrid(): (Block | null)[][] {
    return Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null));
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.cellSize = Math.min(
      (this.width - 40) / (COLS * 2 + 2),
      (this.height - 20) / ROWS
    );

    this.draw();
  }

  public start() {
    this.playerGrid = this.createGrid();
    this.cpuGrid = this.createGrid();
    this.playerGarbage = 0;
    this.cpuGarbage = 0;
    this.status = "playing";
    this.dropTimer = 0;
    this.cpuMoveTimer = 0;

    this.spawnPiece(true);
    this.spawnPiece(false);

    this.emitState();
    this.lastTime = performance.now();
    this.loop();
  }

  private spawnPiece(isPlayer: boolean): boolean {
    const piece: Piece = {
      x: Math.floor(COLS / 2) - 1,
      y: 0,
      blocks: [
        Math.floor(Math.random() * COLORS.length),
        Math.floor(Math.random() * COLORS.length),
      ],
      rotation: 0,
    };

    const grid = isPlayer ? this.playerGrid : this.cpuGrid;

    // Check if spawn position is occupied
    if (grid[0][piece.x] || grid[0][piece.x + 1]) {
      return false;
    }

    if (isPlayer) {
      this.playerPiece = piece;
    } else {
      this.cpuPiece = piece;
    }
    return true;
  }

  private loop = () => {
    if (this.status !== "playing") return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.dropTimer += delta;
    this.cpuMoveTimer += delta;

    // CPU AI
    if (this.cpuMoveTimer > 200 && this.cpuPiece) {
      this.cpuMoveTimer = 0;
      this.cpuAI();
    }

    // Auto drop
    if (this.dropTimer > this.dropInterval) {
      this.dropTimer = 0;
      this.drop(true);
      this.drop(false);
    }

    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private cpuAI() {
    if (!this.cpuPiece) return;

    // Simple AI: try to stack colors
    const action = Math.random();
    if (action < 0.3) {
      this.move(false, -1);
    } else if (action < 0.6) {
      this.move(false, 1);
    } else if (action < 0.8) {
      this.rotate(false);
    }
  }

  private getBlockPositions(piece: Piece): [number, number][] {
    const positions: [number, number][] = [];
    positions.push([piece.x, piece.y]);

    switch (piece.rotation % 4) {
      case 0: // Horizontal right
        positions.push([piece.x + 1, piece.y]);
        break;
      case 1: // Vertical down
        positions.push([piece.x, piece.y + 1]);
        break;
      case 2: // Horizontal left
        positions.push([piece.x - 1, piece.y]);
        break;
      case 3: // Vertical up
        positions.push([piece.x, piece.y - 1]);
        break;
    }
    return positions;
  }

  private canMove(piece: Piece, grid: (Block | null)[][], dx: number, dy: number): boolean {
    const positions = this.getBlockPositions(piece);
    for (const [px, py] of positions) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && grid[ny][nx]) return false;
    }
    return true;
  }

  public move(isPlayer: boolean, dx: number) {
    const piece = isPlayer ? this.playerPiece : this.cpuPiece;
    const grid = isPlayer ? this.playerGrid : this.cpuGrid;
    if (!piece) return;

    if (this.canMove(piece, grid, dx, 0)) {
      piece.x += dx;
    }
  }

  public rotate(isPlayer: boolean) {
    const piece = isPlayer ? this.playerPiece : this.cpuPiece;
    const grid = isPlayer ? this.playerGrid : this.cpuGrid;
    if (!piece) return;

    const oldRotation = piece.rotation;
    piece.rotation = (piece.rotation + 1) % 4;

    // Check if rotation is valid
    const positions = this.getBlockPositions(piece);
    let valid = true;
    for (const [px, py] of positions) {
      if (px < 0 || px >= COLS || py >= ROWS) {
        valid = false;
        break;
      }
      if (py >= 0 && grid[py][px]) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      piece.rotation = oldRotation;
    }
  }

  public drop(isPlayer: boolean) {
    const piece = isPlayer ? this.playerPiece : this.cpuPiece;
    const grid = isPlayer ? this.playerGrid : this.cpuGrid;
    if (!piece) return;

    if (this.canMove(piece, grid, 0, 1)) {
      piece.y++;
    } else {
      this.lockPiece(isPlayer);
    }
  }

  public hardDrop(isPlayer: boolean) {
    const piece = isPlayer ? this.playerPiece : this.cpuPiece;
    const grid = isPlayer ? this.playerGrid : this.cpuGrid;
    if (!piece) return;

    while (this.canMove(piece, grid, 0, 1)) {
      piece.y++;
    }
    this.lockPiece(isPlayer);
  }

  private lockPiece(isPlayer: boolean) {
    const piece = isPlayer ? this.playerPiece : this.cpuPiece;
    const grid = isPlayer ? this.playerGrid : this.cpuGrid;
    if (!piece) return;

    const positions = this.getBlockPositions(piece);
    positions.forEach(([px, py], i) => {
      if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
        grid[py][px] = { color: piece.blocks[i], falling: false };
      }
    });

    // Check for clears
    const cleared = this.checkClears(grid);
    if (cleared > 0) {
      const garbage = Math.floor(cleared / 2);
      if (isPlayer) {
        this.cpuGarbage += garbage;
      } else {
        this.playerGarbage += garbage;
      }
      this.emitState();
    }

    // Add garbage
    if (isPlayer && this.playerGarbage > 0) {
      this.addGarbage(grid, this.playerGarbage);
      this.playerGarbage = 0;
    } else if (!isPlayer && this.cpuGarbage > 0) {
      this.addGarbage(grid, this.cpuGarbage);
      this.cpuGarbage = 0;
    }

    // Spawn new piece
    if (!this.spawnPiece(isPlayer)) {
      this.endGame(!isPlayer);
    }
  }

  private checkClears(grid: (Block | null)[][]): number {
    let totalCleared = 0;
    let cleared: boolean;

    do {
      cleared = false;
      // Check for 3+ same color horizontal or vertical
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!grid[y][x]) continue;

          const color = grid[y][x]!.color;
          const connected = this.findConnected(grid, x, y, color);

          if (connected.length >= 3) {
            connected.forEach(([cx, cy]) => {
              grid[cy][cx] = null;
            });
            totalCleared += connected.length;
            cleared = true;
          }
        }
      }

      // Apply gravity
      if (cleared) {
        this.applyGravity(grid);
      }
    } while (cleared);

    return totalCleared;
  }

  private findConnected(
    grid: (Block | null)[][],
    x: number,
    y: number,
    color: number,
    visited: Set<string> = new Set()
  ): [number, number][] {
    const key = `${x},${y}`;
    if (visited.has(key)) return [];
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return [];
    if (!grid[y][x] || grid[y][x]!.color !== color) return [];

    visited.add(key);
    const result: [number, number][] = [[x, y]];

    result.push(...this.findConnected(grid, x + 1, y, color, visited));
    result.push(...this.findConnected(grid, x - 1, y, color, visited));
    result.push(...this.findConnected(grid, x, y + 1, color, visited));
    result.push(...this.findConnected(grid, x, y - 1, color, visited));

    return result;
  }

  private applyGravity(grid: (Block | null)[][]) {
    for (let x = 0; x < COLS; x++) {
      let writeY = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (grid[y][x]) {
          if (y !== writeY) {
            grid[writeY][x] = grid[y][x];
            grid[y][x] = null;
          }
          writeY--;
        }
      }
    }
  }

  private addGarbage(grid: (Block | null)[][], amount: number) {
    // Shift grid up
    for (let y = 0; y < ROWS - amount; y++) {
      for (let x = 0; x < COLS; x++) {
        grid[y][x] = grid[y + amount][x];
      }
    }

    // Add garbage rows
    for (let y = ROWS - amount; y < ROWS; y++) {
      const holeX = Math.floor(Math.random() * COLS);
      for (let x = 0; x < COLS; x++) {
        if (x !== holeX) {
          grid[y][x] = { color: -1, falling: false }; // Gray garbage
        } else {
          grid[y][x] = null;
        }
      }
    }
  }

  private endGame(playerWon: boolean) {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.onStateChange) {
      this.onStateChange({
        status: "over",
        playerWon,
      });
    }
  }

  private draw() {
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, this.width, this.height);

    const gridWidth = COLS * this.cellSize;
    const startX1 = (this.width / 2 - gridWidth) / 2;
    const startX2 = this.width / 2 + (this.width / 2 - gridWidth) / 2;
    const startY = (this.height - ROWS * this.cellSize) / 2;

    // Draw player grid
    this.drawGrid(this.playerGrid, startX1, startY, this.playerPiece);
    this.ctx.fillStyle = "#3498db";
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("PLAYER", startX1 + gridWidth / 2, startY - 10);

    // Draw CPU grid
    this.drawGrid(this.cpuGrid, startX2, startY, this.cpuPiece);
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.fillText("CPU", startX2 + gridWidth / 2, startY - 10);

    // Draw VS
    this.ctx.fillStyle = "#f1c40f";
    this.ctx.font = "bold 24px Arial";
    this.ctx.fillText("VS", this.width / 2, this.height / 2);

    // Draw garbage counters
    if (this.playerGarbage > 0) {
      this.ctx.fillStyle = "#e74c3c";
      this.ctx.font = "bold 16px Arial";
      this.ctx.fillText(`+${this.playerGarbage}`, startX1 + gridWidth / 2, startY + ROWS * this.cellSize + 20);
    }
    if (this.cpuGarbage > 0) {
      this.ctx.fillStyle = "#e74c3c";
      this.ctx.fillText(`+${this.cpuGarbage}`, startX2 + gridWidth / 2, startY + ROWS * this.cellSize + 20);
    }
  }

  private drawGrid(grid: (Block | null)[][], startX: number, startY: number, piece: Piece | null) {
    // Grid background
    this.ctx.fillStyle = "#0a0a15";
    this.ctx.fillRect(startX, startY, COLS * this.cellSize, ROWS * this.cellSize);

    // Grid lines
    this.ctx.strokeStyle = "#2a2a3e";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + x * this.cellSize, startY);
      this.ctx.lineTo(startX + x * this.cellSize, startY + ROWS * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY + y * this.cellSize);
      this.ctx.lineTo(startX + COLS * this.cellSize, startY + y * this.cellSize);
      this.ctx.stroke();
    }

    // Draw blocks
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x]) {
          const block = grid[y][x]!;
          const color = block.color === -1 ? "#7f8c8d" : COLORS[block.color];
          this.drawBlock(startX + x * this.cellSize, startY + y * this.cellSize, color);
        }
      }
    }

    // Draw falling piece
    if (piece) {
      const positions = this.getBlockPositions(piece);
      positions.forEach(([px, py], i) => {
        if (py >= 0) {
          const color = COLORS[piece.blocks[i]];
          this.drawBlock(
            startX + px * this.cellSize,
            startY + py * this.cellSize,
            color
          );
        }
      });
    }
  }

  private drawBlock(x: number, y: number, color: string) {
    const padding = 2;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x + padding,
      y + padding,
      this.cellSize - padding * 2,
      this.cellSize - padding * 2
    );

    // Highlight
    this.ctx.fillStyle = "rgba(255,255,255,0.3)";
    this.ctx.fillRect(
      x + padding,
      y + padding,
      this.cellSize - padding * 2,
      (this.cellSize - padding * 2) / 3
    );
  }

  public handleKeyDown(key: string) {
    if (this.status !== "playing") return;

    switch (key) {
      case "ArrowLeft":
        this.move(true, -1);
        break;
      case "ArrowRight":
        this.move(true, 1);
        break;
      case "ArrowDown":
        this.drop(true);
        break;
      case "ArrowUp":
        this.rotate(true);
        break;
      case " ":
        this.hardDrop(true);
        break;
    }
  }

  public reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        playerGarbage: this.playerGarbage,
        cpuGarbage: this.cpuGarbage,
        status: this.status,
      });
    }
  }
}
