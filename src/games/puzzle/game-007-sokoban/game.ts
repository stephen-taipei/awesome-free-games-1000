import { LEVELS } from "./levels";

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  levelId: number;
  moves: number;
  status: "playing" | "won";
}

export interface MoveStep {
  player: Position;
  boxes: Position[];
  moves: number;
}

export class SokobanGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private levelIndex: number = 0;

  // Game Data
  private width: number = 0;
  private height: number = 0;
  private grid: number[][] = []; // 0: Floow, 1: Wall, 2: Target
  private player: Position = { x: 0, y: 0 };
  private boxes: Position[] = [];
  private tileSize: number = 40;
  private undoStack: MoveStep[] = [];

  // State
  private moves: number = 0;
  private status: "playing" | "won" = "playing";

  // Callbacks
  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public loadLevel(index: number) {
    if (index < 0 || index >= LEVELS.length) return;
    this.levelIndex = index;

    const levelData = LEVELS[index];
    this.parseLevel(levelData.map);

    this.moves = 0;
    this.status = "playing";
    this.undoStack = [];
    this.recordHistory(); // Initial state

    this.fitCanvas();
    this.render();
    this.notifyChange();
  }

  private parseLevel(rows: string[]) {
    this.height = rows.length;
    this.width = rows.reduce((max, row) => Math.max(max, row.length), 0);

    this.grid = [];
    this.boxes = [];

    for (let y = 0; y < this.height; y++) {
      const row = [];
      const str = rows[y];
      for (let x = 0; x < this.width; x++) {
        const char = str[x] || " ";
        // #: Wall (1)
        // @: Player
        // $: Box
        // .: Target (2)
        // +: Player on Target
        // *: Box on Target
        //  : Floor (0)

        let tile = 0;
        if (char === "#") tile = 1;
        else if (char === ".") tile = 2;
        else if (char === "+") {
          tile = 2;
          this.player = { x, y };
        } else if (char === "*") {
          tile = 2;
          this.boxes.push({ x, y });
        } else if (char === "@") {
          this.player = { x, y };
        } else if (char === "$") {
          this.boxes.push({ x, y });
        }

        row.push(tile);
      }
      this.grid.push(row);
    }
  }

  private fitCanvas() {
    // Calculate best tile size
    const maxWidth = this.canvas.parentElement?.clientWidth || 800;
    const maxHeight = this.canvas.parentElement?.clientHeight || 600;

    const tileW = Math.floor(maxWidth / this.width);
    const tileH = Math.floor(maxHeight / this.height);
    this.tileSize = Math.min(tileW, tileH, 60); // Max 60px

    this.canvas.width = this.width * this.tileSize;
    this.canvas.height = this.height * this.tileSize;
  }

  public move(dx: number, dy: number) {
    if (this.status !== "playing") return;

    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    // Check bounds
    if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height)
      return;

    // Check Wall
    if (this.grid[newY][newX] === 1) return;

    // Check Box
    const boxIndex = this.boxes.findIndex((b) => b.x === newX && b.y === newY);
    if (boxIndex !== -1) {
      // Push Box
      const boxNewX = newX + dx;
      const boxNewY = newY + dy;

      // Check box bounds
      if (
        boxNewX < 0 ||
        boxNewX >= this.width ||
        boxNewY < 0 ||
        boxNewY >= this.height
      )
        return;
      // Check wall behind box
      if (this.grid[boxNewY][boxNewX] === 1) return;
      // Check another box behind box
      if (this.boxes.some((b) => b.x === boxNewX && b.y === boxNewY)) return;

      // Move Box
      this.recordHistory();
      this.boxes[boxIndex].x = boxNewX;
      this.boxes[boxIndex].y = boxNewY;
      this.player.x = newX;
      this.player.y = newY;
      this.moves++;
    } else {
      // Just move player
      this.recordHistory();
      this.player.x = newX;
      this.player.y = newY;
      this.moves++;
    }

    this.checkWin();
    this.render();
    this.notifyChange();
  }

  private recordHistory() {
    // Deep copy
    this.undoStack.push({
      player: { ...this.player },
      boxes: this.boxes.map((b) => ({ ...b })),
      moves: this.moves,
    });
    // Limit stack
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  public undo() {
    if (this.undoStack.length === 0) return;
    const last = this.undoStack.pop();
    if (last) {
      this.player = last.player;
      this.boxes = last.boxes;
      this.moves = last.moves;
      this.status = "playing";
      this.render();
      this.notifyChange();
    }
  }

  public reset() {
    this.loadLevel(this.levelIndex);
  }

  public nextLevel() {
    if (this.levelIndex + 1 < LEVELS.length) {
      this.loadLevel(this.levelIndex + 1);
    }
  }

  private checkWin() {
    // All boxes on targets (value 2)
    const allOnTarget = this.boxes.every((b) => this.grid[b.y][b.x] === 2);
    if (allOnTarget) {
      this.status = "won";
    }
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw static
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        this.drawTile(x, y, tile);
      }
    }

    // Draw Boxes
    this.boxes.forEach((b) => {
      const onTarget = this.grid[b.y][b.x] === 2;
      this.drawBox(b.x, b.y, onTarget);
    });

    // Draw Player
    this.drawPlayer(this.player.x, this.player.y);
  }

  private drawTile(x: number, y: number, type: number) {
    const ts = this.tileSize;
    const px = x * ts;
    const py = y * ts;

    if (type === 1) {
      // Wall
      this.ctx.fillStyle = "#555";
      this.ctx.fillRect(px, py, ts, ts);
      this.ctx.strokeStyle = "#333";
      this.ctx.strokeRect(px, py, ts, ts);
    } else if (type === 2) {
      // Target
      this.ctx.fillStyle = "#ccc"; // Floor
      this.ctx.fillRect(px, py, ts, ts);
      // Dot
      this.ctx.fillStyle = "#ff4444";
      this.ctx.beginPath();
      this.ctx.arc(px + ts / 2, py + ts / 2, ts / 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Floor
      this.ctx.fillStyle = "#ccc";
      this.ctx.fillRect(px, py, ts, ts);
    }
  }

  private drawBox(x: number, y: number, onTarget: boolean) {
    const ts = this.tileSize;
    const padding = ts * 0.1;
    const px = x * ts + padding;
    const py = y * ts + padding;
    const size = ts - padding * 2;

    this.ctx.fillStyle = onTarget ? "#4CAF50" : "#dcb25c";
    this.ctx.fillRect(px, py, size, size);
    this.ctx.strokeStyle = "#5d4037";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(px, py, size, size);

    // X mark
    this.ctx.beginPath();
    this.ctx.moveTo(px, py);
    this.ctx.lineTo(px + size, py + size);
    this.ctx.moveTo(px + size, py);
    this.ctx.lineTo(px, py + size);
    this.ctx.stroke();
  }

  private drawPlayer(x: number, y: number) {
    const ts = this.tileSize;
    const cx = x * ts + ts / 2;
    const cy = y * ts + ts / 2;
    const r = ts * 0.4;

    this.ctx.fillStyle = "#2196F3";
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes
    this.ctx.fillStyle = "white";
    this.ctx.beginPath();
    this.ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.25, 0, Math.PI * 2);
    this.ctx.arc(cx + r * 0.3, cy - r * 0.2, r * 0.25, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "black";
    this.ctx.beginPath();
    this.ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.1, 0, Math.PI * 2);
    this.ctx.arc(cx + r * 0.3, cy - r * 0.2, r * 0.1, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        levelId: this.levelIndex + 1,
        moves: this.moves,
        status: this.status,
      });
    }
  }

  public getLevelIndex() {
    return this.levelIndex;
  }
}
