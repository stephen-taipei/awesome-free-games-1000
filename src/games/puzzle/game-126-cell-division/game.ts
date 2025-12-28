/**
 * Cell Division - Game #126
 * Strategic cell growth puzzle
 * Biology / Microbiology Theme
 */

export interface Cell {
  row: number;
  col: number;
  type: "player" | "enemy" | "empty" | "obstacle";
  energy: number;
  maxEnergy: number;
}

export interface Level {
  grid: string[][];
  targetCells: number;
  maxMoves: number;
}

const LEVELS: Level[] = [
  {
    grid: [
      ["P", ".", ".", "."],
      [".", ".", ".", "."],
      [".", ".", ".", "."],
      [".", ".", ".", "E"],
    ],
    targetCells: 8,
    maxMoves: 10,
  },
  {
    grid: [
      ["P", ".", "#", ".", "."],
      [".", ".", "#", ".", "."],
      [".", ".", ".", ".", "."],
      [".", ".", "#", ".", "."],
      [".", ".", "#", ".", "E"],
    ],
    targetCells: 10,
    maxMoves: 12,
  },
  {
    grid: [
      ["P", ".", ".", ".", ".", "."],
      [".", "#", "#", ".", ".", "."],
      [".", ".", ".", ".", "#", "."],
      [".", ".", "#", ".", ".", "."],
      [".", ".", ".", ".", ".", "E"],
      [".", ".", ".", "E", ".", "."],
    ],
    targetCells: 15,
    maxMoves: 15,
  },
  {
    grid: [
      ["P", ".", ".", "#", ".", ".", "."],
      [".", ".", ".", "#", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", "."],
      ["#", "#", ".", ".", ".", "#", "#"],
      [".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", "#", ".", ".", "."],
      [".", ".", ".", "#", ".", ".", "E"],
    ],
    targetCells: 20,
    maxMoves: 18,
  },
  {
    grid: [
      ["P", ".", ".", ".", "#", ".", ".", "."],
      [".", ".", ".", ".", "#", ".", ".", "."],
      [".", ".", "#", ".", ".", ".", "#", "."],
      [".", ".", "#", ".", ".", ".", "#", "."],
      [".", ".", ".", ".", ".", ".", ".", "."],
      [".", "#", "#", ".", ".", "#", "#", "."],
      [".", ".", ".", ".", ".", ".", ".", "."],
      ["E", ".", ".", ".", "#", ".", ".", "E"],
    ],
    targetCells: 28,
    maxMoves: 22,
  },
];

export class CellDivisionGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private cells: Cell[][] = [];
  private gridRows = 4;
  private gridCols = 4;
  private cellSize = 60;
  private offsetX = 0;
  private offsetY = 0;

  private currentLevel = 0;
  private movesUsed = 0;
  private maxMoves = 10;
  private targetCells = 8;
  private playerCellCount = 0;

  private selectedCell: { row: number; col: number } | null = null;
  private animating = false;

  status: "playing" | "won" | "lost" | "paused" = "paused";
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  // Convert grid position to normalized coordinates (0-1)
  private getNormalizedPos(
    row: number,
    col: number
  ): { x: number; y: number } {
    const x = this.offsetX + col * this.cellSize + this.cellSize / 2;
    const y = this.offsetY + row * this.cellSize + this.cellSize / 2;
    return {
      x: x / this.canvas.width,
      y: y / this.canvas.height,
    };
  }

  start() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(index: number) {
    const level = LEVELS[index % LEVELS.length];
    this.gridRows = level.grid.length;
    this.gridCols = level.grid[0].length;
    this.maxMoves = level.maxMoves;
    this.targetCells = level.targetCells;
    this.movesUsed = 0;

    this.cells = [];
    for (let r = 0; r < this.gridRows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.gridCols; c++) {
        const char = level.grid[r][c];
        let type: Cell["type"] = "empty";
        let energy = 0;

        if (char === "P") {
          type = "player";
          energy = 3;
        } else if (char === "E") {
          type = "enemy";
          energy = 3;
        } else if (char === "#") {
          type = "obstacle";
        }

        row.push({
          row: r,
          col: c,
          type,
          energy,
          maxEnergy: 4,
        });
      }
      this.cells.push(row);
    }

    this.updateCellCount();
    this.calculateLayout();
    this.notifyState();
  }

  private calculateLayout() {
    const maxWidth = this.canvas.width - 40;
    const maxHeight = this.canvas.height - 40;

    this.cellSize = Math.min(
      Math.floor(maxWidth / this.gridCols),
      Math.floor(maxHeight / this.gridRows),
      70
    );

    const gridWidth = this.gridCols * this.cellSize;
    const gridHeight = this.gridRows * this.cellSize;

    this.offsetX = (this.canvas.width - gridWidth) / 2;
    this.offsetY = (this.canvas.height - gridHeight) / 2;
  }

  private updateCellCount() {
    this.playerCellCount = 0;
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.type === "player") {
          this.playerCellCount++;
        }
      }
    }
  }

  handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing" || this.animating) return;

    if (type === "down") {
      const col = Math.floor((x - this.offsetX) / this.cellSize);
      const row = Math.floor((y - this.offsetY) / this.cellSize);

      if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
        const cell = this.cells[row][col];

        if (cell.type === "player" && cell.energy >= 2) {
          this.selectedCell = { row, col };

          // Emit cell select event
          const pos = this.getNormalizedPos(row, col);
          if (this.onStateChange) {
            this.onStateChange({
              cellSelect: {
                x: pos.x,
                y: pos.y,
                isPlayer: true,
              },
            });
          }

          this.draw();
        }
      }
    } else if (type === "up" && this.selectedCell) {
      const col = Math.floor((x - this.offsetX) / this.cellSize);
      const row = Math.floor((y - this.offsetY) / this.cellSize);

      if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
        const targetCell = this.cells[row][col];

        // Check if valid division target (adjacent empty or enemy)
        if (
          this.isAdjacent(this.selectedCell, { row, col }) &&
          (targetCell.type === "empty" || targetCell.type === "enemy")
        ) {
          this.divideCell(this.selectedCell, { row, col });
        }
      }

      this.selectedCell = null;
      this.draw();
    }
  }

  private isAdjacent(
    a: { row: number; col: number },
    b: { row: number; col: number }
  ): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  private divideCell(
    from: { row: number; col: number },
    to: { row: number; col: number }
  ) {
    const sourceCell = this.cells[from.row][from.col];
    const targetCell = this.cells[to.row][to.col];

    if (sourceCell.energy < 2) return;

    this.animating = true;
    this.movesUsed++;

    const fromPos = this.getNormalizedPos(from.row, from.col);
    const toPos = this.getNormalizedPos(to.row, to.col);

    // Division: source loses 1 energy, target becomes player cell with 1 energy
    sourceCell.energy -= 1;

    if (targetCell.type === "enemy") {
      // Attack enemy: needs more energy to defeat
      if (sourceCell.energy >= targetCell.energy) {
        targetCell.type = "player";
        targetCell.energy = 1;

        // Emit cell attack event
        if (this.onStateChange) {
          this.onStateChange({
            cellAttack: {
              fromX: fromPos.x,
              fromY: fromPos.y,
              toX: toPos.x,
              toY: toPos.y,
            },
          });
        }
      }
    } else {
      targetCell.type = "player";
      targetCell.energy = 1;

      // Emit cell divide event
      if (this.onStateChange) {
        this.onStateChange({
          cellDivide: {
            fromX: fromPos.x,
            fromY: fromPos.y,
            toX: toPos.x,
            toY: toPos.y,
            isPlayer: true,
          },
        });
      }
    }

    // Animate
    setTimeout(() => {
      this.animating = false;
      this.growCells();
      this.enemyTurn();
      this.updateCellCount();
      this.checkGameState();
      this.notifyState();
      this.draw();
    }, 300);
  }

  private growCells() {
    // All cells gain 1 energy per turn, max 4
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.type === "player" || cell.type === "enemy") {
          const oldEnergy = cell.energy;
          cell.energy = Math.min(cell.energy + 1, cell.maxEnergy);

          // Emit cell grow event for player cells
          if (cell.type === "player" && cell.energy > oldEnergy) {
            const pos = this.getNormalizedPos(cell.row, cell.col);
            if (this.onStateChange) {
              this.onStateChange({
                cellGrow: {
                  x: pos.x,
                  y: pos.y,
                  energy: cell.energy,
                },
              });
            }
          }
        }
      }
    }
  }

  private enemyTurn() {
    // Simple AI: enemies try to divide into adjacent empty spaces
    const enemies: Cell[] = [];
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.type === "enemy" && cell.energy >= 2) {
          enemies.push(cell);
        }
      }
    }

    for (const enemy of enemies) {
      const targets = this.getAdjacentEmpty(enemy.row, enemy.col);
      if (targets.length > 0 && enemy.energy >= 2) {
        const target = targets[Math.floor(Math.random() * targets.length)];

        const fromPos = this.getNormalizedPos(enemy.row, enemy.col);
        const toPos = this.getNormalizedPos(target.row, target.col);

        enemy.energy -= 1;
        this.cells[target.row][target.col].type = "enemy";
        this.cells[target.row][target.col].energy = 1;

        // Emit enemy move event
        if (this.onStateChange) {
          this.onStateChange({
            enemyMove: {
              fromX: fromPos.x,
              fromY: fromPos.y,
              toX: toPos.x,
              toY: toPos.y,
            },
          });
        }
      }
    }
  }

  private getAdjacentEmpty(
    row: number,
    col: number
  ): { row: number; col: number }[] {
    const adjacent: { row: number; col: number }[] = [];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.gridRows && nc >= 0 && nc < this.gridCols) {
        if (this.cells[nr][nc].type === "empty") {
          adjacent.push({ row: nr, col: nc });
        }
      }
    }

    return adjacent;
  }

  private checkGameState() {
    if (this.playerCellCount >= this.targetCells) {
      this.status = "won";
      return;
    }

    if (this.movesUsed >= this.maxMoves) {
      this.status = "lost";
      return;
    }

    // Check if player can still make moves
    let canMove = false;
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.type === "player" && cell.energy >= 2) {
          const targets = this.getAdjacentEmpty(cell.row, cell.col);
          const enemies = this.getAdjacentEnemies(cell.row, cell.col);
          if (targets.length > 0 || enemies.length > 0) {
            canMove = true;
            break;
          }
        }
      }
      if (canMove) break;
    }

    if (!canMove && this.playerCellCount < this.targetCells) {
      this.status = "lost";
    }
  }

  private getAdjacentEnemies(row: number, col: number): Cell[] {
    const enemies: Cell[] = [];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.gridRows && nc >= 0 && nc < this.gridCols) {
        if (this.cells[nr][nc].type === "enemy") {
          enemies.push(this.cells[nr][nc]);
        }
      }
    }

    return enemies;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background - transparent to show WebGPU canvas
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const cell = this.cells[r][c];
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;

        // Cell background
        this.ctx.fillStyle = this.getCellColor(cell);
        this.ctx.beginPath();
        this.ctx.roundRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 8);
        this.ctx.fill();

        // Cell border
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw energy for player/enemy cells
        if (cell.type === "player" || cell.type === "enemy") {
          this.drawEnergyIndicator(x, y, cell);
        }

        // Selection highlight
        if (
          this.selectedCell &&
          this.selectedCell.row === r &&
          this.selectedCell.col === c
        ) {
          this.ctx.strokeStyle = "#4ade80";
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.roundRect(x + 5, y + 5, this.cellSize - 10, this.cellSize - 10, 6);
          this.ctx.stroke();
        }
      }
    }

    // Draw valid targets for selected cell
    if (this.selectedCell) {
      const targets = this.getAdjacentEmpty(
        this.selectedCell.row,
        this.selectedCell.col
      );
      const enemies = this.getAdjacentEnemies(
        this.selectedCell.row,
        this.selectedCell.col
      );

      for (const target of targets) {
        const x = this.offsetX + target.col * this.cellSize;
        const y = this.offsetY + target.row * this.cellSize;
        this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
        this.ctx.beginPath();
        this.ctx.roundRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 8);
        this.ctx.fill();
      }

      for (const enemy of enemies) {
        const x = this.offsetX + enemy.col * this.cellSize;
        const y = this.offsetY + enemy.row * this.cellSize;
        this.ctx.fillStyle = "rgba(231, 76, 60, 0.3)";
        this.ctx.beginPath();
        this.ctx.roundRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6, 8);
        this.ctx.fill();
      }
    }
  }

  private getCellColor(cell: Cell): string {
    switch (cell.type) {
      case "player":
        return `rgba(46, 204, 113, ${0.4 + cell.energy * 0.15})`;
      case "enemy":
        return `rgba(231, 76, 60, ${0.4 + cell.energy * 0.15})`;
      case "obstacle":
        return "rgba(52, 73, 94, 0.8)";
      default:
        return "rgba(52, 73, 94, 0.2)";
    }
  }

  private drawEnergyIndicator(x: number, y: number, cell: Cell) {
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;
    const radius = this.cellSize * 0.25;

    // Draw cell nucleus with glow
    this.ctx.shadowColor = cell.type === "player" ? "#2ecc71" : "#e74c3c";
    this.ctx.shadowBlur = 10;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = cell.type === "player" ? "#27ae60" : "#c0392b";
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    // Energy text
    this.ctx.fillStyle = "#fff";
    this.ctx.font = `bold ${this.cellSize * 0.3}px sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(cell.energy.toString(), centerX, centerY);
  }

  resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    this.calculateLayout();
    this.draw();
  }

  reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";

    // Emit reset event
    if (this.onStateChange) {
      this.onStateChange({ reset: true });
    }

    this.draw();
  }

  nextLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        movesUsed: this.movesUsed,
        maxMoves: this.maxMoves,
        playerCells: this.playerCellCount,
        targetCells: this.targetCells,
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
