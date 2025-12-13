/**
 * Ultimate Puzzle Game Engine
 * Game #150
 *
 * Multi-mechanic puzzle combining colors, rotation, and sorting!
 */

type Phase = "colors" | "paths" | "sort";

interface ColorTile {
  x: number;
  y: number;
  color: string;
  matched: boolean;
}

interface PathTile {
  x: number;
  y: number;
  rotation: number;
  type: "straight" | "corner" | "tee";
  connected: boolean;
}

interface SortItem {
  value: number;
  x: number;
  targetX: number;
  selected: boolean;
}

interface GameState {
  level: number;
  maxLevel: number;
  phase: number;
  totalPhases: number;
  moves: number;
  status: "idle" | "playing" | "won";
}

type StateCallback = (state: GameState) => void;

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

export class UltimatePuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level = 1;
  private phase: Phase = "colors";
  private phaseIndex = 0;
  private moves = 0;
  private status: "idle" | "playing" | "won" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  // Phase 1: Color matching
  private colorTiles: ColorTile[] = [];
  private selectedColor: ColorTile | null = null;

  // Phase 2: Path connection
  private pathTiles: PathTile[][] = [];
  private pathGridSize = 3;

  // Phase 3: Sorting
  private sortItems: SortItem[] = [];
  private selectedSort: SortItem | null = null;

  private animPhase = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        maxLevel: 3,
        phase: this.phaseIndex + 1,
        totalPhases: 3,
        moves: this.moves,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  start() {
    this.level = 1;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  reset() {
    this.loadLevel();
    this.status = "playing";
    this.emitState();
  }

  nextLevel() {
    if (this.level < 3) {
      this.level++;
      this.loadLevel();
      this.status = "playing";
      this.emitState();
    }
  }

  private loadLevel() {
    this.phaseIndex = 0;
    this.phase = "colors";
    this.moves = 0;
    this.setupColorPhase();
  }

  private setupColorPhase() {
    this.colorTiles = [];
    const count = 3 + this.level;
    const colors = COLORS.slice(0, count);

    // Create pairs
    const pairs = [...colors, ...colors];
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    const cols = Math.ceil(Math.sqrt(pairs.length * 2));
    const rows = Math.ceil(pairs.length / cols);
    const tileSize = Math.min(
      (this.canvas.width - 60) / cols,
      (this.canvas.height - 100) / rows,
      70
    );
    const startX = (this.canvas.width - cols * tileSize) / 2;
    const startY = (this.canvas.height - rows * tileSize) / 2;

    pairs.forEach((color, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.colorTiles.push({
        x: startX + col * tileSize + tileSize / 2,
        y: startY + row * tileSize + tileSize / 2,
        color,
        matched: false,
      });
    });

    this.selectedColor = null;
  }

  private setupPathPhase() {
    this.pathGridSize = 2 + this.level;
    this.pathTiles = [];

    const tileSize = Math.min(
      (this.canvas.width - 60) / this.pathGridSize,
      (this.canvas.height - 100) / this.pathGridSize,
      80
    );
    const startX = (this.canvas.width - this.pathGridSize * tileSize) / 2;
    const startY = (this.canvas.height - this.pathGridSize * tileSize) / 2;

    for (let y = 0; y < this.pathGridSize; y++) {
      this.pathTiles[y] = [];
      for (let x = 0; x < this.pathGridSize; x++) {
        const types: ("straight" | "corner" | "tee")[] = ["straight", "corner", "tee"];
        this.pathTiles[y][x] = {
          x: startX + x * tileSize + tileSize / 2,
          y: startY + y * tileSize + tileSize / 2,
          rotation: Math.floor(Math.random() * 4) * 90,
          type: types[Math.floor(Math.random() * types.length)],
          connected: false,
        };
      }
    }
    this.checkPathConnection();
  }

  private setupSortPhase() {
    this.sortItems = [];
    const count = 4 + this.level;
    const values: number[] = [];
    for (let i = 1; i <= count; i++) {
      values.push(i);
    }

    // Shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    const itemWidth = Math.min((this.canvas.width - 60) / count, 60);
    const startX = (this.canvas.width - count * itemWidth) / 2;
    const y = this.canvas.height / 2;

    values.forEach((value, i) => {
      this.sortItems.push({
        value,
        x: startX + i * itemWidth + itemWidth / 2,
        targetX: startX + i * itemWidth + itemWidth / 2,
        selected: false,
      });
    });

    this.selectedSort = null;
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    switch (this.phase) {
      case "colors":
        this.handleColorClick(x, y);
        break;
      case "paths":
        this.handlePathClick(x, y);
        break;
      case "sort":
        this.handleSortClick(x, y);
        break;
    }
  }

  private handleColorClick(x: number, y: number) {
    for (const tile of this.colorTiles) {
      if (tile.matched) continue;
      const dx = x - tile.x;
      const dy = y - tile.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        if (!this.selectedColor) {
          this.selectedColor = tile;
        } else if (this.selectedColor === tile) {
          this.selectedColor = null;
        } else {
          this.moves++;
          if (this.selectedColor.color === tile.color) {
            this.selectedColor.matched = true;
            tile.matched = true;
          }
          this.selectedColor = null;
          this.emitState();

          if (this.colorTiles.every((t) => t.matched)) {
            this.advancePhase();
          }
        }
        return;
      }
    }
  }

  private handlePathClick(x: number, y: number) {
    const tileSize = Math.min(
      (this.canvas.width - 60) / this.pathGridSize,
      (this.canvas.height - 100) / this.pathGridSize,
      80
    );

    for (const row of this.pathTiles) {
      for (const tile of row) {
        const dx = x - tile.x;
        const dy = y - tile.y;
        if (Math.abs(dx) < tileSize / 2 && Math.abs(dy) < tileSize / 2) {
          tile.rotation = (tile.rotation + 90) % 360;
          this.moves++;
          this.emitState();
          this.checkPathConnection();

          if (this.pathTiles.flat().every((t) => t.connected)) {
            this.advancePhase();
          }
          return;
        }
      }
    }
  }

  private handleSortClick(x: number, y: number) {
    const itemWidth = Math.min((this.canvas.width - 60) / this.sortItems.length, 60);

    for (const item of this.sortItems) {
      const dx = x - item.x;
      const dy = y - this.canvas.height / 2;
      if (Math.abs(dx) < itemWidth / 2 && Math.abs(dy) < 40) {
        if (!this.selectedSort) {
          this.selectedSort = item;
          item.selected = true;
        } else if (this.selectedSort === item) {
          item.selected = false;
          this.selectedSort = null;
        } else {
          // Swap
          const indexA = this.sortItems.indexOf(this.selectedSort);
          const indexB = this.sortItems.indexOf(item);
          this.sortItems[indexA] = item;
          this.sortItems[indexB] = this.selectedSort;

          const tempX = item.targetX;
          item.targetX = this.selectedSort.targetX;
          this.selectedSort.targetX = tempX;

          this.selectedSort.selected = false;
          this.selectedSort = null;
          this.moves++;
          this.emitState();

          // Check sorted
          let sorted = true;
          for (let i = 1; i < this.sortItems.length; i++) {
            if (this.sortItems[i].value < this.sortItems[i - 1].value) {
              sorted = false;
              break;
            }
          }
          if (sorted) {
            this.advancePhase();
          }
        }
        return;
      }
    }
  }

  private checkPathConnection() {
    // Simple check: all tiles connected if they form a path
    // For simplicity, just mark all as connected if certain rotations match
    let connected = 0;
    for (const row of this.pathTiles) {
      for (const tile of row) {
        // Simplified: just check if rotation is divisible by 90
        if (tile.rotation % 90 === 0) {
          connected++;
        }
        tile.connected = tile.rotation % 180 === 0;
      }
    }
    // For demo: consider connected if more than half aligned
    const total = this.pathGridSize * this.pathGridSize;
    if (connected >= total * 0.8) {
      this.pathTiles.flat().forEach((t) => (t.connected = true));
    }
  }

  private advancePhase() {
    this.phaseIndex++;
    if (this.phaseIndex === 1) {
      this.phase = "paths";
      this.setupPathPhase();
    } else if (this.phaseIndex === 2) {
      this.phase = "sort";
      this.setupSortPhase();
    } else {
      this.status = "won";
    }
    this.emitState();
  }

  private gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.animPhase += 0.03;

    // Animate sort items
    for (const item of this.sortItems) {
      const dx = item.targetX - item.x;
      if (Math.abs(dx) > 1) {
        item.x += dx * 0.15;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#1e272e");
    bgGrad.addColorStop(1, "#2d3436");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Phase indicator
    this.drawPhaseIndicator();

    // Draw current phase
    switch (this.phase) {
      case "colors":
        this.drawColorPhase();
        break;
      case "paths":
        this.drawPathPhase();
        break;
      case "sort":
        this.drawSortPhase();
        break;
    }
  }

  private drawPhaseIndicator() {
    const ctx = this.ctx;
    const phases = ["Colors", "Paths", "Sort"];
    const y = 30;

    for (let i = 0; i < 3; i++) {
      const x = this.canvas.width / 2 + (i - 1) * 100;
      const active = i === this.phaseIndex;
      const completed = i < this.phaseIndex;

      // Circle
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = completed ? "#00b894" : active ? "#fdcb6e" : "#636e72";
      ctx.fill();

      // Number
      ctx.fillStyle = completed || active ? "#2d3436" : "#b2bec3";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((i + 1).toString(), x, y);

      // Label
      ctx.fillStyle = active ? "#fdcb6e" : "#b2bec3";
      ctx.font = "11px Arial";
      ctx.fillText(phases[i], x, y + 25);

      // Connector line
      if (i < 2) {
        ctx.strokeStyle = completed ? "#00b894" : "#636e72";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 20, y);
        ctx.lineTo(x + 80, y);
        ctx.stroke();
      }
    }
  }

  private drawColorPhase() {
    const ctx = this.ctx;

    for (const tile of this.colorTiles) {
      if (tile.matched) {
        ctx.globalAlpha = 0.3;
      }

      // Tile background
      ctx.fillStyle = tile.color;
      ctx.beginPath();
      ctx.arc(tile.x, tile.y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Selection ring
      if (this.selectedColor === tile) {
        ctx.strokeStyle = "#fdcb6e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(tile.x, tile.y, 30, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Instructions
    ctx.fillStyle = "#b2bec3";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Match pairs of the same color!", this.canvas.width / 2, this.canvas.height - 30);
  }

  private drawPathPhase() {
    const ctx = this.ctx;
    const tileSize = Math.min(
      (this.canvas.width - 60) / this.pathGridSize,
      (this.canvas.height - 100) / this.pathGridSize,
      80
    );

    for (const row of this.pathTiles) {
      for (const tile of row) {
        ctx.save();
        ctx.translate(tile.x, tile.y);
        ctx.rotate((tile.rotation * Math.PI) / 180);

        // Tile background
        ctx.fillStyle = tile.connected ? "#00b894" : "#636e72";
        ctx.fillRect(-tileSize / 2 + 2, -tileSize / 2 + 2, tileSize - 4, tileSize - 4);

        // Draw pipe shape
        ctx.fillStyle = tile.connected ? "#00cec9" : "#b2bec3";
        const pipeWidth = tileSize * 0.25;

        switch (tile.type) {
          case "straight":
            ctx.fillRect(-pipeWidth / 2, -tileSize / 2, pipeWidth, tileSize);
            break;
          case "corner":
            ctx.fillRect(-pipeWidth / 2, -tileSize / 2, pipeWidth, tileSize / 2 + pipeWidth / 2);
            ctx.fillRect(-pipeWidth / 2, -pipeWidth / 2, tileSize / 2 + pipeWidth / 2, pipeWidth);
            break;
          case "tee":
            ctx.fillRect(-tileSize / 2, -pipeWidth / 2, tileSize, pipeWidth);
            ctx.fillRect(-pipeWidth / 2, -pipeWidth / 2, pipeWidth, tileSize / 2 + pipeWidth / 2);
            break;
        }

        ctx.restore();
      }
    }

    ctx.fillStyle = "#b2bec3";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Rotate tiles to connect all paths!", this.canvas.width / 2, this.canvas.height - 30);
  }

  private drawSortPhase() {
    const ctx = this.ctx;
    const itemWidth = Math.min((this.canvas.width - 60) / this.sortItems.length, 60);
    const y = this.canvas.height / 2;

    for (const item of this.sortItems) {
      const height = 30 + item.value * 15;

      // Bar
      ctx.fillStyle = item.selected ? "#fdcb6e" : `hsl(${item.value * 30}, 70%, 50%)`;
      ctx.fillRect(item.x - itemWidth / 2 + 5, y - height / 2, itemWidth - 10, height);

      // Number
      ctx.fillStyle = "#2d3436";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.value.toString(), item.x, y);

      // Selection indicator
      if (item.selected) {
        ctx.strokeStyle = "#fdcb6e";
        ctx.lineWidth = 3;
        ctx.strokeRect(item.x - itemWidth / 2 + 3, y - height / 2 - 2, itemWidth - 6, height + 4);
      }
    }

    // Target order indicator
    ctx.fillStyle = "#636e72";
    ctx.font = "12px Arial";
    ctx.fillText("Sort from small to large", this.canvas.width / 2, y + 80);

    // Arrow
    ctx.strokeStyle = "#636e72";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.canvas.width / 2 - 50, y + 95);
    ctx.lineTo(this.canvas.width / 2 + 50, y + 95);
    ctx.lineTo(this.canvas.width / 2 + 40, y + 90);
    ctx.moveTo(this.canvas.width / 2 + 50, y + 95);
    ctx.lineTo(this.canvas.width / 2 + 40, y + 100);
    ctx.stroke();

    ctx.fillStyle = "#b2bec3";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Click two items to swap them!", this.canvas.width / 2, this.canvas.height - 30);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
