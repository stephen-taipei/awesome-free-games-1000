/**
 * Signal Puzzle Game Engine
 * Game #148
 *
 * Relay signals from transmitter to receiver through towers!
 */

interface Tower {
  x: number;
  y: number;
  direction: number; // 0-7 (8 directions, 45 degrees each)
  isSource: boolean;
  isTarget: boolean;
  active: boolean;
  range: number;
}

interface Level {
  towers: Omit<Tower, "active">[];
}

interface GameState {
  level: number;
  maxLevel: number;
  signalStrength: number;
  status: "idle" | "playing" | "won";
}

type StateCallback = (state: GameState) => void;

const LEVELS: Level[] = [
  // Level 1: Simple direct line
  {
    towers: [
      { x: 0.15, y: 0.5, direction: 2, isSource: true, isTarget: false, range: 0.35 },
      { x: 0.5, y: 0.5, direction: 2, isSource: false, isTarget: false, range: 0.35 },
      { x: 0.85, y: 0.5, direction: 6, isSource: false, isTarget: true, range: 0.35 },
    ],
  },
  // Level 2: Angle relay
  {
    towers: [
      { x: 0.15, y: 0.2, direction: 3, isSource: true, isTarget: false, range: 0.4 },
      { x: 0.5, y: 0.5, direction: 5, isSource: false, isTarget: false, range: 0.4 },
      { x: 0.85, y: 0.8, direction: 0, isSource: false, isTarget: true, range: 0.4 },
    ],
  },
  // Level 3: Multiple towers
  {
    towers: [
      { x: 0.1, y: 0.5, direction: 2, isSource: true, isTarget: false, range: 0.3 },
      { x: 0.35, y: 0.3, direction: 4, isSource: false, isTarget: false, range: 0.3 },
      { x: 0.35, y: 0.7, direction: 0, isSource: false, isTarget: false, range: 0.3 },
      { x: 0.65, y: 0.5, direction: 2, isSource: false, isTarget: false, range: 0.3 },
      { x: 0.9, y: 0.5, direction: 6, isSource: false, isTarget: true, range: 0.3 },
    ],
  },
  // Level 4: Complex network
  {
    towers: [
      { x: 0.1, y: 0.3, direction: 3, isSource: true, isTarget: false, range: 0.28 },
      { x: 0.3, y: 0.2, direction: 2, isSource: false, isTarget: false, range: 0.28 },
      { x: 0.3, y: 0.6, direction: 1, isSource: false, isTarget: false, range: 0.28 },
      { x: 0.55, y: 0.4, direction: 3, isSource: false, isTarget: false, range: 0.28 },
      { x: 0.55, y: 0.75, direction: 1, isSource: false, isTarget: false, range: 0.28 },
      { x: 0.8, y: 0.5, direction: 7, isSource: false, isTarget: false, range: 0.28 },
      { x: 0.9, y: 0.8, direction: 0, isSource: false, isTarget: true, range: 0.28 },
    ],
  },
  // Level 5: Challenging maze
  {
    towers: [
      { x: 0.1, y: 0.1, direction: 3, isSource: true, isTarget: false, range: 0.25 },
      { x: 0.25, y: 0.3, direction: 5, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.15, y: 0.6, direction: 2, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.4, y: 0.5, direction: 1, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.5, y: 0.2, direction: 2, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.65, y: 0.4, direction: 3, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.55, y: 0.7, direction: 2, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.8, y: 0.6, direction: 5, isSource: false, isTarget: false, range: 0.25 },
      { x: 0.9, y: 0.85, direction: 0, isSource: false, isTarget: true, range: 0.25 },
    ],
  },
];

// Direction vectors for 8 directions
const DIR_VECTORS = [
  [0, -1], // 0: Up
  [1, -1], // 1: Up-Right
  [1, 0], // 2: Right
  [1, 1], // 3: Down-Right
  [0, 1], // 4: Down
  [-1, 1], // 5: Down-Left
  [-1, 0], // 6: Left
  [-1, -1], // 7: Up-Left
];

export class SignalPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private towers: Tower[] = [];
  private level = 1;
  private status: "idle" | "playing" | "won" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private wavePhase = 0;
  private signalPath: Tower[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      const target = this.towers.find((t) => t.isTarget);
      const strength = target && target.active ? 100 : this.calculateSignalStrength();
      this.onStateChange({
        level: this.level,
        maxLevel: LEVELS.length,
        signalStrength: strength,
        status: this.status,
      });
    }
  }

  private calculateSignalStrength(): number {
    const activeCount = this.towers.filter((t) => t.active).length;
    return Math.round((activeCount / this.towers.length) * 100);
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.updateTowerPositions();
    this.draw();
  }

  private updateTowerPositions() {
    const levelData = LEVELS[this.level - 1];
    this.towers = levelData.towers.map((t) => ({
      ...t,
      x: t.x * this.canvas.width,
      y: t.y * this.canvas.height,
      range: t.range * Math.min(this.canvas.width, this.canvas.height),
      active: t.isSource,
    }));
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
    this.updateTowerPositions();
    // Randomize non-source/target tower directions
    for (const tower of this.towers) {
      if (!tower.isSource && !tower.isTarget) {
        tower.direction = Math.floor(Math.random() * 8);
      }
    }
    this.propagateSignal();
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked tower
    for (const tower of this.towers) {
      if (tower.isSource || tower.isTarget) continue;

      const dx = x - tower.x;
      const dy = y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        // Rotate tower
        tower.direction = (tower.direction + 1) % 8;
        this.propagateSignal();
        this.emitState();

        // Check win
        const target = this.towers.find((t) => t.isTarget);
        if (target && target.active) {
          this.status = "won";
          this.emitState();
        }
        return;
      }
    }
  }

  private propagateSignal() {
    // Reset all non-source towers
    for (const tower of this.towers) {
      if (!tower.isSource) {
        tower.active = false;
      }
    }

    // BFS from source
    const source = this.towers.find((t) => t.isSource);
    if (!source) return;

    const queue: Tower[] = [source];
    const visited = new Set<Tower>();
    visited.add(source);
    this.signalPath = [source];

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Find towers in signal direction within range
      const [dx, dy] = DIR_VECTORS[current.direction];

      for (const other of this.towers) {
        if (visited.has(other)) continue;

        // Check if other is in the direction of current's signal
        const toDx = other.x - current.x;
        const toDy = other.y - current.y;
        const dist = Math.sqrt(toDx * toDx + toDy * toDy);

        if (dist > current.range) continue;

        // Normalize direction
        const normDx = toDx / dist;
        const normDy = toDy / dist;

        // Check angle match (within ~30 degrees)
        const dirLen = Math.sqrt(dx * dx + dy * dy);
        const dot = (dx / dirLen) * normDx + (dy / dirLen) * normDy;

        if (dot > 0.85) {
          // Close enough to direction
          // Check if other tower can receive (pointing back or has matching direction)
          const oppositeDir = (current.direction + 4) % 8;
          const otherAccepts =
            other.isTarget ||
            other.direction === oppositeDir ||
            Math.abs(other.direction - oppositeDir) === 1 ||
            Math.abs(other.direction - oppositeDir) === 7;

          if (otherAccepts || this.canReceive(other, current)) {
            other.active = true;
            visited.add(other);
            this.signalPath.push(other);
            if (!other.isTarget) {
              queue.push(other);
            }
          }
        }
      }
    }
  }

  private canReceive(receiver: Tower, sender: Tower): boolean {
    // Check if receiver's direction could receive from sender
    const toDx = sender.x - receiver.x;
    const toDy = sender.y - receiver.y;
    const dist = Math.sqrt(toDx * toDx + toDy * toDy);
    if (dist === 0) return false;

    const normDx = toDx / dist;
    const normDy = toDy / dist;

    const [dx, dy] = DIR_VECTORS[receiver.direction];
    const dirLen = Math.sqrt(dx * dx + dy * dy);
    const dot = (dx / dirLen) * normDx + (dy / dirLen) * normDy;

    return dot > 0.5;
  }

  private gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.wavePhase += 0.05;
    if (this.wavePhase > Math.PI * 2) {
      this.wavePhase = 0;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background with stars
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(0, 0, w, h);

    // Draw stars
    ctx.fillStyle = "#dfe6e9";
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137) % w);
      const sy = ((i * 97) % h);
      const size = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw signal connections
    this.drawSignalPaths();

    // Draw towers
    for (const tower of this.towers) {
      this.drawTower(tower);
    }
  }

  private drawSignalPaths() {
    const ctx = this.ctx;

    for (const tower of this.towers) {
      if (!tower.active) continue;

      const [dx, dy] = DIR_VECTORS[tower.direction];
      const len = tower.range;

      // Draw signal beam
      const endX = tower.x + dx * len;
      const endY = tower.y + dy * len;

      // Gradient beam
      const gradient = ctx.createLinearGradient(tower.x, tower.y, endX, endY);
      gradient.addColorStop(0, "rgba(0, 206, 201, 0.8)");
      gradient.addColorStop(1, "rgba(0, 206, 201, 0)");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Animated wave particles
      const waveCount = 3;
      for (let i = 0; i < waveCount; i++) {
        const phase = (this.wavePhase + (i * Math.PI * 2) / waveCount) % (Math.PI * 2);
        const progress = phase / (Math.PI * 2);
        const px = tower.x + dx * len * progress;
        const py = tower.y + dy * len * progress;

        ctx.fillStyle = `rgba(0, 206, 201, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawTower(tower: Tower) {
    const ctx = this.ctx;
    const { x, y, direction, isSource, isTarget, active } = tower;

    // Tower base
    ctx.fillStyle = active ? "#00cec9" : "#636e72";
    ctx.strokeStyle = active ? "#00b894" : "#2d3436";
    ctx.lineWidth = 3;

    // Draw antenna tower
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 25);
    ctx.lineTo(x - 8, y - 15);
    ctx.lineTo(x + 8, y - 15);
    ctx.lineTo(x + 15, y + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cross beams
    ctx.strokeStyle = active ? "#00b894" : "#2d3436";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ty = y - 10 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x - 12 + i * 2, ty);
      ctx.lineTo(x + 12 - i * 2, ty);
      ctx.stroke();
    }

    // Direction indicator (antenna dish)
    const [dx, dy] = DIR_VECTORS[direction];
    const dishX = x + dx * 20;
    const dishY = y - 20 + dy * 10;

    ctx.save();
    ctx.translate(dishX, dishY);
    ctx.rotate(Math.atan2(dy, dx));

    // Dish shape
    ctx.fillStyle = active ? "#fdcb6e" : "#b2bec3";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.strokeStyle = active ? "#e17055" : "#636e72";
    ctx.stroke();

    ctx.restore();

    // Source/Target markers
    if (isSource) {
      ctx.fillStyle = "#e17055";
      ctx.beginPath();
      ctx.arc(x, y - 30, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TX", x, y - 30);
    }

    if (isTarget) {
      ctx.fillStyle = active ? "#00b894" : "#d63031";
      ctx.beginPath();
      ctx.arc(x, y - 30, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RX", x, y - 30);
    }

    // Active glow
    if (active) {
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 206, 201, ${0.3 + Math.sin(this.wavePhase) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
