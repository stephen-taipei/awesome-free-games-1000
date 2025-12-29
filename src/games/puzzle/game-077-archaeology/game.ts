/**
 * Archaeology Game Engine
 * Game #077 - Dig and discover ancient artifacts
 * WebGPU Enhanced
 */

interface Artifact {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "vase" | "coin" | "bone" | "statue" | "jewelry";
  depth: number; // 0-1, how deep it is
  revealed: number; // 0-1, how much is uncovered
  damaged: boolean;
  wasRevealed: boolean; // Track if we already emitted reveal event
  wasDiscovered: boolean; // Track if we already emitted discovery event
}

interface DirtCell {
  depth: number; // 0-1, how much dirt remains
}

interface GameState {
  artifactsFound: number;
  totalArtifacts: number;
  brushHealth: number;
  status: string;
  damaged: number;
  event?: string;
  x?: number;
  y?: number;
  artifactType?: string;
}

export class ArchaeologyGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  gridWidth: number = 30;
  gridHeight: number = 20;
  cellSize: number = 20;

  dirt: DirtCell[][] = [];
  artifacts: Artifact[] = [];

  currentTool: "brush" | "pick" = "brush";
  brushHealth: number = 100;

  artifactsFound: number = 0;
  artifactsDamaged: number = 0;
  totalArtifacts: number = 3;

  status: "playing" | "won" | "lost" = "playing";
  isDigging: boolean = false;

  onStateChange: ((state: GameState) => void) | null = null;

  // Artifact images (emoji-based for simplicity)
  artifactEmojis: Record<string, string> = {
    vase: "🏺",
    coin: "🪙",
    bone: "🦴",
    statue: "🗿",
    jewelry: "💎",
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.initGrid();
    this.placeArtifacts();
    this.brushHealth = 100;
    this.artifactsFound = 0;
    this.artifactsDamaged = 0;
    this.status = "playing";
    this.draw();
    this.notifyState({ event: "levelStart" });
  }

  private initGrid() {
    this.dirt = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.dirt[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Varying initial depth
        this.dirt[y][x] = {
          depth: 0.7 + Math.random() * 0.3,
        };
      }
    }
  }

  private placeArtifacts() {
    this.artifacts = [];
    const types: Artifact["type"][] = ["vase", "coin", "bone", "statue", "jewelry"];

    for (let i = 0; i < this.totalArtifacts; i++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 100) {
        const width = 2 + Math.floor(Math.random() * 2);
        const height = 2 + Math.floor(Math.random() * 2);
        const x = Math.floor(Math.random() * (this.gridWidth - width));
        const y = Math.floor(Math.random() * (this.gridHeight - height));

        // Check overlap
        const overlaps = this.artifacts.some((a) => {
          return !(
            x + width <= a.x ||
            x >= a.x + a.width ||
            y + height <= a.y ||
            y >= a.y + a.height
          );
        });

        if (!overlaps) {
          this.artifacts.push({
            id: i,
            x,
            y,
            width,
            height,
            type: types[Math.floor(Math.random() * types.length)],
            depth: 0.3 + Math.random() * 0.4, // How deep to find it
            revealed: 0,
            damaged: false,
            wasRevealed: false,
            wasDiscovered: false,
          });
          placed = true;
        }
        attempts++;
      }
    }
  }

  public setTool(tool: "brush" | "pick") {
    this.currentTool = tool;
  }

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing") return;

    if (type === "down") {
      this.isDigging = true;
      this.dig(x, y);
    } else if (type === "move" && this.isDigging) {
      this.dig(x, y);
    } else if (type === "up") {
      this.isDigging = false;
    }
  }

  private getScreenCoords(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.cellSize + this.cellSize / 2,
      y: gridY * this.cellSize + this.cellSize / 2,
    };
  }

  private dig(canvasX: number, canvasY: number) {
    const cellX = Math.floor(canvasX / this.cellSize);
    const cellY = Math.floor(canvasY / this.cellSize);

    if (cellX < 0 || cellX >= this.gridWidth || cellY < 0 || cellY >= this.gridHeight) {
      return;
    }

    const radius = this.currentTool === "brush" ? 2 : 1;
    const power = this.currentTool === "brush" ? 0.05 : 0.15;

    // Emit dig event
    const digEvent = this.currentTool === "brush" ? "brushDig" : "pickDig";
    this.notifyState({ event: digEvent, x: canvasX, y: canvasY });

    // Affect surrounding cells
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cellX + dx;
        const ny = cellY + dy;

        if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const falloff = 1 - dist / (radius + 1);
        const amount = power * falloff;

        this.dirt[ny][nx].depth = Math.max(0, this.dirt[ny][nx].depth - amount);
      }
    }

    // Check artifact interactions
    this.checkArtifacts(cellX, cellY);

    // Decrease brush health
    if (this.currentTool === "brush") {
      this.brushHealth = Math.max(0, this.brushHealth - 0.1);
    }

    this.draw();
    this.notifyState({});
  }

  private checkArtifacts(cellX: number, cellY: number) {
    this.artifacts.forEach((artifact) => {
      // Check if digging is over this artifact
      if (
        cellX >= artifact.x &&
        cellX < artifact.x + artifact.width &&
        cellY >= artifact.y &&
        cellY < artifact.y + artifact.height
      ) {
        // Calculate average dirt depth over artifact
        let totalDepth = 0;
        let count = 0;

        for (let ay = artifact.y; ay < artifact.y + artifact.height; ay++) {
          for (let ax = artifact.x; ax < artifact.x + artifact.width; ax++) {
            totalDepth += this.dirt[ay][ax].depth;
            count++;
          }
        }

        const avgDepth = totalDepth / count;
        const prevRevealed = artifact.revealed;
        artifact.revealed = Math.max(0, 1 - avgDepth / artifact.depth);

        // Emit reveal event when artifact first becomes visible
        if (artifact.revealed > 0.1 && !artifact.wasRevealed) {
          artifact.wasRevealed = true;
          const coords = this.getScreenCoords(
            artifact.x + artifact.width / 2,
            artifact.y + artifact.height / 2
          );
          this.notifyState({
            event: "artifactReveal",
            x: coords.x,
            y: coords.y,
            artifactType: artifact.type,
          });
        }

        // Check if artifact is fully revealed (discovered)
        if (artifact.revealed >= 0.8 && !artifact.damaged && !artifact.wasDiscovered) {
          artifact.wasDiscovered = true;
          this.artifactsFound++;
          const coords = this.getScreenCoords(
            artifact.x + artifact.width / 2,
            artifact.y + artifact.height / 2
          );
          this.notifyState({
            event: "discovery",
            x: coords.x,
            y: coords.y,
            artifactType: artifact.type,
          });
          this.checkWinCondition();
        }

        // Check for damage (using pick when artifact is close to surface)
        if (this.currentTool === "pick" && avgDepth < artifact.depth + 0.1 && !artifact.damaged) {
          if (Math.random() < 0.3) {
            artifact.damaged = true;
            this.artifactsDamaged++;
            const coords = this.getScreenCoords(
              artifact.x + artifact.width / 2,
              artifact.y + artifact.height / 2
            );
            this.notifyState({
              event: "artifactDamage",
              x: coords.x,
              y: coords.y,
              artifactType: artifact.type,
            });
          }
        }
      }
    });
  }

  private checkWinCondition() {
    const foundCount = this.artifacts.filter((a) => a.revealed >= 0.8 && !a.damaged).length;
    if (foundCount >= this.totalArtifacts) {
      this.status = "won";
      this.notifyState({ event: "victory" });
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background (stone layer)
    this.ctx.fillStyle = "#8B7355";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw artifacts (under dirt)
    this.drawArtifacts();

    // Draw dirt grid
    this.drawDirt();
  }

  private drawArtifacts() {
    this.artifacts.forEach((artifact) => {
      const x = artifact.x * this.cellSize;
      const y = artifact.y * this.cellSize;
      const w = artifact.width * this.cellSize;
      const h = artifact.height * this.cellSize;

      // Only show if some dirt is removed
      if (artifact.revealed > 0) {
        // Artifact background
        this.ctx.fillStyle = artifact.damaged ? "#8B0000" : "#DAA520";
        this.ctx.globalAlpha = artifact.revealed;
        this.ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        // Artifact emoji
        this.ctx.font = `${Math.min(w, h) - 8}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(
          artifact.damaged ? "💔" : this.artifactEmojis[artifact.type],
          x + w / 2,
          y + h / 2
        );

        this.ctx.globalAlpha = 1;
      }
    });
  }

  private drawDirt() {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.dirt[y][x];

        if (cell.depth > 0) {
          // Dirt color based on depth
          const brown = Math.floor(60 + cell.depth * 40);
          this.ctx.fillStyle = `rgb(${brown + 40}, ${brown}, ${brown - 20})`;
          this.ctx.globalAlpha = cell.depth;
          this.ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize,
            this.cellSize
          );

          // Add texture
          if (cell.depth > 0.3) {
            this.ctx.fillStyle = "rgba(0,0,0,0.1)";
            if ((x + y) % 3 === 0) {
              this.ctx.fillRect(
                x * this.cellSize + 2,
                y * this.cellSize + 2,
                4,
                4
              );
            }
          }

          this.ctx.globalAlpha = 1;
        }
      }
    }

    // Draw grid lines (subtle)
    this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.gridHeight * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.gridWidth * this.cellSize, y * this.cellSize);
      this.ctx.stroke();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 400;

      // Recalculate cell size
      this.cellSize = Math.min(
        Math.floor(this.canvas.width / this.gridWidth),
        Math.floor(this.canvas.height / this.gridHeight)
      );

      this.draw();
    }
  }

  public reset() {
    this.notifyState({ event: "reset" });
    this.start();
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }

  private notifyState(extra: Partial<GameState>) {
    if (this.onStateChange) {
      const found = this.artifacts.filter((a) => a.revealed >= 0.8 && !a.damaged).length;
      this.onStateChange({
        artifactsFound: found,
        totalArtifacts: this.totalArtifacts,
        brushHealth: Math.round(this.brushHealth),
        status: this.status,
        damaged: this.artifactsDamaged,
        ...extra,
      });
    }
  }
}
