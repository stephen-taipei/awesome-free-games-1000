type Direction = "north" | "south" | "east" | "west";

interface Clue {
  direction: Direction;
  steps: number;
}

interface LevelConfig {
  gridSize: number;
  clues: Clue[];
}

const LEVELS: LevelConfig[] = [
  {
    gridSize: 5,
    clues: [
      { direction: "east", steps: 2 },
      { direction: "south", steps: 2 },
    ],
  },
  {
    gridSize: 6,
    clues: [
      { direction: "east", steps: 3 },
      { direction: "south", steps: 2 },
      { direction: "west", steps: 1 },
    ],
  },
  {
    gridSize: 7,
    clues: [
      { direction: "south", steps: 2 },
      { direction: "east", steps: 4 },
      { direction: "north", steps: 1 },
      { direction: "east", steps: 1 },
    ],
  },
  {
    gridSize: 8,
    clues: [
      { direction: "east", steps: 3 },
      { direction: "south", steps: 3 },
      { direction: "west", steps: 2 },
      { direction: "south", steps: 2 },
      { direction: "east", steps: 4 },
    ],
  },
];

export class TreasureMapGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  gridSize: number = 5;
  cellSize: number = 60;
  offsetX: number = 0;
  offsetY: number = 0;

  startPos: { x: number; y: number } = { x: 0, y: 0 };
  currentPos: { x: number; y: number } = { x: 0, y: 0 };
  treasurePos: { x: number; y: number } = { x: 0, y: 0 };
  path: { x: number; y: number }[] = [];

  clues: Clue[] = [];
  currentClueIndex: number = 0;
  stepsInCurrentClue: number = 0;
  moves: number = 0;

  status: "playing" | "won" = "playing";
  wrongMove: boolean = false;
  wrongMoveTimer: number = 0;

  onStateChange: ((state: any) => void) | null = null;
  onClueChange: ((clue: string) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.moves = 0;
    this.wrongMove = false;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        moves: this.moves,
      });
    }

    this.updateClueDisplay();
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];
    this.gridSize = config.gridSize;
    this.clues = [...config.clues];
    this.currentClueIndex = 0;
    this.stepsInCurrentClue = 0;

    const { width, height } = this.canvas;
    this.cellSize = Math.min(
      (width - 40) / this.gridSize,
      (height - 40) / this.gridSize
    );
    this.offsetX = (width - this.gridSize * this.cellSize) / 2;
    this.offsetY = (height - this.gridSize * this.cellSize) / 2;

    // Start position (X mark)
    this.startPos = { x: 0, y: 0 };
    this.currentPos = { ...this.startPos };
    this.path = [{ ...this.startPos }];

    // Calculate treasure position
    let tx = this.startPos.x;
    let ty = this.startPos.y;
    for (const clue of this.clues) {
      switch (clue.direction) {
        case "north":
          ty -= clue.steps;
          break;
        case "south":
          ty += clue.steps;
          break;
        case "east":
          tx += clue.steps;
          break;
        case "west":
          tx -= clue.steps;
          break;
      }
    }
    this.treasurePos = { x: tx, y: ty };
  }

  private updateClueDisplay() {
    if (this.onClueChange) {
      if (this.currentClueIndex >= this.clues.length) {
        this.onClueChange("X marks the spot!");
      } else {
        const clue = this.clues[this.currentClueIndex];
        const remaining = clue.steps - this.stepsInCurrentClue;
        this.onClueChange(`${this.getDirectionArrow(clue.direction)} ${remaining}`);
      }
    }
  }

  private getDirectionArrow(dir: Direction): string {
    switch (dir) {
      case "north":
        return "↑ North";
      case "south":
        return "↓ South";
      case "east":
        return "→ East";
      case "west":
        return "← West";
    }
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    if (this.wrongMove) {
      this.wrongMoveTimer++;
      if (this.wrongMoveTimer > 30) {
        this.wrongMove = false;
        this.wrongMoveTimer = 0;
      }
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;
    if (this.currentClueIndex >= this.clues.length) return;

    // Convert to grid coordinates
    const gx = Math.floor((x - this.offsetX) / this.cellSize);
    const gy = Math.floor((y - this.offsetY) / this.cellSize);

    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) return;

    // Check if adjacent to current position
    const dx = gx - this.currentPos.x;
    const dy = gy - this.currentPos.y;

    if (Math.abs(dx) + Math.abs(dy) !== 1) return;

    // Get expected direction
    const clue = this.clues[this.currentClueIndex];
    let expectedDx = 0;
    let expectedDy = 0;

    switch (clue.direction) {
      case "north":
        expectedDy = -1;
        break;
      case "south":
        expectedDy = 1;
        break;
      case "east":
        expectedDx = 1;
        break;
      case "west":
        expectedDx = -1;
        break;
    }

    // Check if move matches expected direction
    if (dx === expectedDx && dy === expectedDy) {
      this.currentPos = { x: gx, y: gy };
      this.path.push({ ...this.currentPos });
      this.moves++;
      this.stepsInCurrentClue++;

      if (this.stepsInCurrentClue >= clue.steps) {
        this.currentClueIndex++;
        this.stepsInCurrentClue = 0;
      }

      if (this.onStateChange) {
        this.onStateChange({ moves: this.moves });
      }

      this.updateClueDisplay();

      // Check win
      if (
        this.currentPos.x === this.treasurePos.x &&
        this.currentPos.y === this.treasurePos.y
      ) {
        this.status = "won";
        if (this.onStateChange) {
          this.onStateChange({
            status: "won",
            level: this.currentLevel + 1,
            hasNextLevel: this.currentLevel < LEVELS.length - 1,
          });
        }
      }
    } else {
      this.wrongMove = true;
      this.wrongMoveTimer = 0;
    }
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw parchment background
    this.drawParchment();

    // Draw grid
    this.drawGrid();

    // Draw decorations
    this.drawMapDecorations();

    // Draw path
    this.drawPath();

    // Draw start mark
    this.drawStartMark();

    // Draw treasure (hidden until found)
    if (this.status === "won") {
      this.drawTreasure();
    }

    // Draw current position marker
    this.drawPlayer();

    // Draw wrong move indicator
    if (this.wrongMove) {
      this.drawWrongMove();
    }

    // Win effect
    if (this.status === "won") {
      this.drawWinEffect();
    }
  }

  private drawParchment() {
    const { width, height } = this.canvas;

    // Old paper texture
    const gradient = this.ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      width
    );
    gradient.addColorStop(0, "#f5e6c8");
    gradient.addColorStop(0.5, "#e8d4a8");
    gradient.addColorStop(1, "#d4b896");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Paper texture noise
    this.ctx.globalAlpha = 0.1;
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3;
      this.ctx.fillStyle = Math.random() > 0.5 ? "#8b7355" : "#a08060";
      this.ctx.fillRect(x, y, size, size);
    }
    this.ctx.globalAlpha = 1;

    // Border decoration
    this.ctx.strokeStyle = "#8b4513";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(10, 10, width - 20, height - 20);
  }

  private drawGrid() {
    this.ctx.strokeStyle = "#a0826d";
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= this.gridSize; i++) {
      // Vertical lines
      const x = this.offsetX + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.offsetY);
      this.ctx.lineTo(x, this.offsetY + this.gridSize * this.cellSize);
      this.ctx.stroke();

      // Horizontal lines
      const y = this.offsetY + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, y);
      this.ctx.lineTo(this.offsetX + this.gridSize * this.cellSize, y);
      this.ctx.stroke();
    }
  }

  private drawMapDecorations() {
    // Compass rose
    const cx = this.canvas.width - 60;
    const cy = 60;

    this.ctx.save();
    this.ctx.translate(cx, cy);

    // Compass circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
    this.ctx.strokeStyle = "#8b4513";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Directions
    this.ctx.fillStyle = "#8b4513";
    this.ctx.font = "bold 12px Georgia";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("N", 0, -20);
    this.ctx.fillText("S", 0, 20);
    this.ctx.fillText("E", 20, 0);
    this.ctx.fillText("W", -20, 0);

    // Arrow
    this.ctx.beginPath();
    this.ctx.moveTo(0, -15);
    this.ctx.lineTo(-5, -5);
    this.ctx.lineTo(5, -5);
    this.ctx.closePath();
    this.ctx.fillStyle = "#c0392b";
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawPath() {
    if (this.path.length < 2) return;

    this.ctx.strokeStyle = "#c0392b";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();

    for (let i = 0; i < this.path.length; i++) {
      const p = this.path[i];
      const px = this.offsetX + (p.x + 0.5) * this.cellSize;
      const py = this.offsetY + (p.y + 0.5) * this.cellSize;

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }

    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawStartMark() {
    const px = this.offsetX + (this.startPos.x + 0.5) * this.cellSize;
    const py = this.offsetY + (this.startPos.y + 0.5) * this.cellSize;
    const size = this.cellSize * 0.3;

    this.ctx.strokeStyle = "#c0392b";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(px - size, py - size);
    this.ctx.lineTo(px + size, py + size);
    this.ctx.moveTo(px + size, py - size);
    this.ctx.lineTo(px - size, py + size);
    this.ctx.stroke();
  }

  private drawTreasure() {
    const px = this.offsetX + (this.treasurePos.x + 0.5) * this.cellSize;
    const py = this.offsetY + (this.treasurePos.y + 0.5) * this.cellSize;
    const size = this.cellSize * 0.35;

    // Treasure chest
    this.ctx.fillStyle = "#8b4513";
    this.ctx.fillRect(px - size, py - size * 0.5, size * 2, size * 1.2);

    // Gold
    this.ctx.fillStyle = "#ffd700";
    this.ctx.beginPath();
    this.ctx.arc(px - size * 0.3, py - size * 0.3, size * 0.25, 0, Math.PI * 2);
    this.ctx.arc(px + size * 0.3, py - size * 0.3, size * 0.25, 0, Math.PI * 2);
    this.ctx.arc(px, py - size * 0.5, size * 0.25, 0, Math.PI * 2);
    this.ctx.fill();

    // Chest lid
    this.ctx.fillStyle = "#5d3a1a";
    this.ctx.fillRect(px - size * 1.1, py - size * 0.7, size * 2.2, size * 0.3);
  }

  private drawPlayer() {
    const px = this.offsetX + (this.currentPos.x + 0.5) * this.cellSize;
    const py = this.offsetY + (this.currentPos.y + 0.5) * this.cellSize;
    const size = this.cellSize * 0.25;

    // Player marker (boot/footprint)
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.ellipse(px, py, size, size * 1.3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner
    this.ctx.fillStyle = "#34495e";
    this.ctx.beginPath();
    this.ctx.ellipse(px, py, size * 0.6, size * 0.9, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawWrongMove() {
    const { width, height } = this.canvas;

    this.ctx.fillStyle = "rgba(192, 57, 43, 0.3)";
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = "#c0392b";
    this.ctx.font = "bold 24px Georgia";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("Wrong direction!", width / 2, height / 2);
  }

  private drawWinEffect() {
    const { width, height } = this.canvas;

    this.ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
    this.ctx.fillRect(0, 0, width, height);

    // Sparkles
    this.ctx.fillStyle = "#ffd700";
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
      if (this.gridSize > 0) {
        this.cellSize = Math.min(
          (this.canvas.width - 40) / this.gridSize,
          (this.canvas.height - 40) / this.gridSize
        );
        this.offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
        this.offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;
      }
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public setOnClueChange(cb: (clue: string) => void) {
    this.onClueChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
