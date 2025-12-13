/**
 * Dig Site Game Engine
 * Game #147
 *
 * Dig through layers to reveal hidden artifacts!
 */

interface Artifact {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  layer: number;
  revealed: number; // 0-1 how much revealed
  found: boolean;
}

interface Level {
  layers: number;
  artifacts: Omit<Artifact, "revealed" | "found">[];
}

interface GameState {
  level: number;
  maxLevel: number;
  artifactsFound: number;
  totalArtifacts: number;
  currentLayer: number;
  status: "idle" | "playing" | "won";
}

type StateCallback = (state: GameState) => void;

const ARTIFACT_TYPES = ["vase", "coin", "skull", "sword", "ring", "scroll"];
const LAYER_COLORS = [
  "#d2b48c", // Light sand
  "#c4a882", // Tan
  "#a0826d", // Light brown
  "#8b7355", // Brown
  "#6b4423", // Dark brown
  "#4a3728", // Very dark
];

const LEVELS: Level[] = [
  {
    layers: 2,
    artifacts: [
      { x: 0.3, y: 0.4, width: 0.15, height: 0.2, type: "vase", layer: 1 },
      { x: 0.6, y: 0.5, width: 0.12, height: 0.12, type: "coin", layer: 1 },
    ],
  },
  {
    layers: 3,
    artifacts: [
      { x: 0.25, y: 0.35, width: 0.15, height: 0.2, type: "skull", layer: 1 },
      { x: 0.55, y: 0.4, width: 0.18, height: 0.1, type: "sword", layer: 2 },
      { x: 0.4, y: 0.65, width: 0.1, height: 0.1, type: "ring", layer: 2 },
    ],
  },
  {
    layers: 4,
    artifacts: [
      { x: 0.2, y: 0.3, width: 0.12, height: 0.15, type: "vase", layer: 1 },
      { x: 0.5, y: 0.35, width: 0.15, height: 0.1, type: "scroll", layer: 2 },
      { x: 0.7, y: 0.5, width: 0.1, height: 0.1, type: "coin", layer: 2 },
      { x: 0.35, y: 0.6, width: 0.12, height: 0.15, type: "skull", layer: 3 },
    ],
  },
  {
    layers: 5,
    artifacts: [
      { x: 0.15, y: 0.25, width: 0.1, height: 0.1, type: "coin", layer: 1 },
      { x: 0.45, y: 0.3, width: 0.15, height: 0.2, type: "vase", layer: 2 },
      { x: 0.75, y: 0.4, width: 0.12, height: 0.15, type: "skull", layer: 2 },
      { x: 0.25, y: 0.55, width: 0.18, height: 0.08, type: "sword", layer: 3 },
      { x: 0.6, y: 0.65, width: 0.1, height: 0.1, type: "ring", layer: 4 },
    ],
  },
  {
    layers: 6,
    artifacts: [
      { x: 0.1, y: 0.2, width: 0.1, height: 0.1, type: "coin", layer: 1 },
      { x: 0.4, y: 0.25, width: 0.12, height: 0.15, type: "vase", layer: 1 },
      { x: 0.7, y: 0.3, width: 0.1, height: 0.1, type: "ring", layer: 2 },
      { x: 0.25, y: 0.45, width: 0.15, height: 0.1, type: "scroll", layer: 3 },
      { x: 0.55, y: 0.5, width: 0.12, height: 0.15, type: "skull", layer: 4 },
      { x: 0.35, y: 0.7, width: 0.2, height: 0.08, type: "sword", layer: 5 },
    ],
  },
];

export class DigSiteGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level = 1;
  private status: "idle" | "playing" | "won" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private digMask: number[][] = [];
  private artifacts: Artifact[] = [];
  private totalLayers = 1;
  private gridSize = 10;
  private isDigging = false;
  private brushSize = 3;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      const found = this.artifacts.filter((a) => a.found).length;
      const maxLayerRevealed = this.getMaxRevealedLayer();
      this.onStateChange({
        level: this.level,
        maxLevel: LEVELS.length,
        artifactsFound: found,
        totalArtifacts: this.artifacts.length,
        currentLayer: maxLayerRevealed,
        status: this.status,
      });
    }
  }

  private getMaxRevealedLayer(): number {
    let maxLayer = 1;
    const cellsPerLayer = (this.canvas.width / this.gridSize) * (this.canvas.height / this.gridSize);

    for (let layer = 1; layer <= this.totalLayers; layer++) {
      let revealed = 0;
      for (let y = 0; y < this.digMask.length; y++) {
        for (let x = 0; x < this.digMask[y].length; x++) {
          if (this.digMask[y][x] >= layer) revealed++;
        }
      }
      if (revealed > cellsPerLayer * 0.1) maxLayer = layer;
    }
    return Math.min(maxLayer, this.totalLayers);
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.initDigMask();
    this.draw();
  }

  private initDigMask() {
    const cols = Math.ceil(this.canvas.width / this.gridSize);
    const rows = Math.ceil(this.canvas.height / this.gridSize);
    this.digMask = [];
    for (let y = 0; y < rows; y++) {
      this.digMask[y] = [];
      for (let x = 0; x < cols; x++) {
        this.digMask[y][x] = 0;
      }
    }
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
    if (this.level < LEVELS.length) {
      this.level++;
      this.loadLevel();
      this.status = "playing";
      this.emitState();
    }
  }

  private loadLevel() {
    const levelData = LEVELS[this.level - 1];
    this.totalLayers = levelData.layers;

    this.artifacts = levelData.artifacts.map((a) => ({
      ...a,
      x: a.x * this.canvas.width,
      y: a.y * this.canvas.height,
      width: a.width * this.canvas.width,
      height: a.height * this.canvas.height,
      revealed: 0,
      found: false,
    }));

    this.initDigMask();
  }

  handleMouseDown(x: number, y: number) {
    if (this.status !== "playing") return;
    this.isDigging = true;
    this.dig(x, y);
  }

  handleMouseMove(x: number, y: number) {
    if (!this.isDigging || this.status !== "playing") return;
    this.dig(x, y);
  }

  handleMouseUp() {
    this.isDigging = false;
  }

  private dig(x: number, y: number) {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);

    // Dig in brush area
    for (let dy = -this.brushSize; dy <= this.brushSize; dy++) {
      for (let dx = -this.brushSize; dx <= this.brushSize; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.brushSize) continue;

        const gx = gridX + dx;
        const gy = gridY + dy;

        if (gy >= 0 && gy < this.digMask.length && gx >= 0 && gx < this.digMask[gy].length) {
          if (this.digMask[gy][gx] < this.totalLayers) {
            this.digMask[gy][gx]++;
          }
        }
      }
    }

    // Check artifact reveals
    this.checkArtifacts();
    this.emitState();
  }

  private checkArtifacts() {
    for (const artifact of this.artifacts) {
      if (artifact.found) continue;

      // Calculate how much of artifact is revealed
      let revealedCells = 0;
      let totalCells = 0;

      const startX = Math.floor(artifact.x / this.gridSize);
      const endX = Math.ceil((artifact.x + artifact.width) / this.gridSize);
      const startY = Math.floor(artifact.y / this.gridSize);
      const endY = Math.ceil((artifact.y + artifact.height) / this.gridSize);

      for (let gy = startY; gy < endY; gy++) {
        for (let gx = startX; gx < endX; gx++) {
          if (gy >= 0 && gy < this.digMask.length && gx >= 0 && gx < this.digMask[gy].length) {
            totalCells++;
            if (this.digMask[gy][gx] >= artifact.layer) {
              revealedCells++;
            }
          }
        }
      }

      artifact.revealed = totalCells > 0 ? revealedCells / totalCells : 0;

      // Found when 80% revealed
      if (artifact.revealed >= 0.8 && !artifact.found) {
        artifact.found = true;
        this.onArtifactFound(artifact);
      }
    }

    // Check win condition
    if (this.artifacts.every((a) => a.found)) {
      this.status = "won";
      this.emitState();
    }
  }

  private onArtifactFound(_artifact: Artifact) {
    // Could trigger animation/sound here
  }

  private gameLoop() {
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw base layer (deepest)
    ctx.fillStyle = LAYER_COLORS[this.totalLayers - 1] || "#4a3728";
    ctx.fillRect(0, 0, w, h);

    // Draw artifacts (those that should be visible based on layer)
    for (const artifact of this.artifacts) {
      this.drawArtifact(artifact);
    }

    // Draw dirt layers based on dig mask
    for (let layer = this.totalLayers - 1; layer >= 0; layer--) {
      for (let gy = 0; gy < this.digMask.length; gy++) {
        for (let gx = 0; gx < this.digMask[gy].length; gx++) {
          if (this.digMask[gy][gx] <= layer) {
            ctx.fillStyle = LAYER_COLORS[layer] || LAYER_COLORS[0];
            ctx.fillRect(gx * this.gridSize, gy * this.gridSize, this.gridSize, this.gridSize);
          }
        }
      }
    }

    // Draw grid lines (subtle)
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw found artifact markers
    for (const artifact of this.artifacts) {
      if (artifact.found) {
        this.drawFoundMarker(artifact);
      }
    }
  }

  private drawArtifact(artifact: Artifact) {
    const ctx = this.ctx;
    const { x, y, width, height, type, found } = artifact;

    // Only draw if layer is revealed enough
    if (artifact.revealed < 0.1) return;

    ctx.save();
    ctx.globalAlpha = Math.min(artifact.revealed, 1);

    // Draw based on type
    ctx.fillStyle = found ? "#daa520" : "#c0a080";
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 2;

    switch (type) {
      case "vase":
        this.drawVase(x, y, width, height);
        break;
      case "coin":
        this.drawCoin(x, y, width, height);
        break;
      case "skull":
        this.drawSkull(x, y, width, height);
        break;
      case "sword":
        this.drawSword(x, y, width, height);
        break;
      case "ring":
        this.drawRing(x, y, width, height);
        break;
      case "scroll":
        this.drawScroll(x, y, width, height);
        break;
    }

    ctx.restore();
  }

  private drawVase(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y);
    ctx.lineTo(x + w * 0.7, y);
    ctx.lineTo(x + w * 0.8, y + h * 0.2);
    ctx.lineTo(x + w, y + h * 0.6);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.lineTo(x, y + h * 0.6);
    ctx.lineTo(x + w * 0.2, y + h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawCoin(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawSkull(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    // Head
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.4, w / 2, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Jaw
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.6);
    ctx.lineTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.lineTo(x + w * 0.8, y + h * 0.6);
    ctx.fill();
    ctx.stroke();
    // Eyes
    ctx.fillStyle = "#4a3728";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35, y + h * 0.35, w * 0.1, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.65, y + h * 0.35, w * 0.1, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSword(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    // Blade
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w * 0.7, y + h * 0.3);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w * 0.7, y + h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Handle
    ctx.fillRect(x - w * 0.15, y + h * 0.35, w * 0.2, h * 0.3);
    ctx.strokeRect(x - w * 0.15, y + h * 0.35, w * 0.2, h * 0.3);
  }

  private drawRing(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawScroll(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    ctx.fillRect(x, y + h * 0.2, w, h * 0.6);
    ctx.strokeRect(x, y + h * 0.2, w, h * 0.6);
    // Rolls
    ctx.beginPath();
    ctx.ellipse(x, y + h / 2, w * 0.1, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + w, y + h / 2, w * 0.1, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawFoundMarker(artifact: Artifact) {
    const ctx = this.ctx;
    const cx = artifact.x + artifact.width / 2;
    const cy = artifact.y + artifact.height / 2;

    // Glowing circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(artifact.width, artifact.height) * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.restore();

    // Checkmark
    ctx.fillStyle = "#00b894";
    ctx.beginPath();
    ctx.arc(cx + artifact.width / 2, cy - artifact.height / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + artifact.width / 2 - 5, cy - artifact.height / 2);
    ctx.lineTo(cx + artifact.width / 2 - 1, cy - artifact.height / 2 + 4);
    ctx.lineTo(cx + artifact.width / 2 + 5, cy - artifact.height / 2 - 4);
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
