/**
 * Bubble Shooter Game Logic
 * Game #220 - Shoot bubbles to match and pop
 */

export interface Bubble {
  row: number;
  col: number;
  color: string;
  x: number;
  y: number;
}

export interface ShootingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

export interface GameState {
  phase: "idle" | "playing" | "shooting" | "gameOver" | "win";
  score: number;
  bubbles: Bubble[];
  currentBubble: string;
  nextBubble: string;
  shootingBubble: ShootingBubble | null;
  aimAngle: number;
}

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];
const BUBBLE_RADIUS = 18;
const ROWS = 8;
const COLS = 10;

export class BubbleShooterGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 360;
  private canvasHeight: number = 500;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      score: 0,
      bubbles: [],
      currentBubble: COLORS[0],
      nextBubble: COLORS[0],
      shootingBubble: null,
      aimAngle: -Math.PI / 2,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
      currentBubble: this.getRandomColor(),
      nextBubble: this.getRandomColor(),
    };

    this.generateInitialBubbles();
    this.emitState();
  }

  private getRandomColor(): string {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  private generateInitialBubbles(): void {
    const bubbles: Bubble[] = [];

    for (let row = 0; row < 5; row++) {
      const colOffset = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
      const numCols = row % 2 === 0 ? COLS : COLS - 1;

      for (let col = 0; col < numCols; col++) {
        if (Math.random() > 0.2) {
          const x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + colOffset;
          const y = row * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS + 10;

          bubbles.push({
            row,
            col,
            color: this.getRandomColor(),
            x,
            y,
          });
        }
      }
    }

    this.state.bubbles = bubbles;
  }

  public setAimAngle(angle: number): void {
    // Clamp angle between -170 and -10 degrees
    this.state.aimAngle = Math.max(-Math.PI * 0.95, Math.min(-Math.PI * 0.05, angle));
    this.emitState();
  }

  public shoot(): void {
    if (this.state.phase !== "playing") return;

    const speed = 12;
    const startX = this.canvasWidth / 2;
    const startY = this.canvasHeight - 50;

    this.state.shootingBubble = {
      x: startX,
      y: startY,
      vx: Math.cos(this.state.aimAngle) * speed,
      vy: Math.sin(this.state.aimAngle) * speed,
      color: this.state.currentBubble,
    };

    this.state.phase = "shooting";
    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "shooting" || !this.state.shootingBubble) return;

    const bubble = this.state.shootingBubble;

    // Move bubble
    bubble.x += bubble.vx;
    bubble.y += bubble.vy;

    // Wall bounce
    if (bubble.x - BUBBLE_RADIUS < 0 || bubble.x + BUBBLE_RADIUS > this.canvasWidth) {
      bubble.vx = -bubble.vx;
      bubble.x = Math.max(BUBBLE_RADIUS, Math.min(this.canvasWidth - BUBBLE_RADIUS, bubble.x));
    }

    // Top collision
    if (bubble.y - BUBBLE_RADIUS < 10) {
      this.attachBubble(bubble);
      return;
    }

    // Check collision with existing bubbles
    for (const existing of this.state.bubbles) {
      const dist = Math.sqrt((bubble.x - existing.x) ** 2 + (bubble.y - existing.y) ** 2);
      if (dist < BUBBLE_RADIUS * 2) {
        this.attachBubble(bubble);
        return;
      }
    }

    this.emitState();
  }

  private attachBubble(shootingBubble: ShootingBubble): void {
    // Find nearest grid position
    const row = Math.round((shootingBubble.y - BUBBLE_RADIUS - 10) / (BUBBLE_RADIUS * 1.7));
    const colOffset = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
    const col = Math.round((shootingBubble.x - BUBBLE_RADIUS - colOffset) / (BUBBLE_RADIUS * 2));

    const x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + colOffset;
    const y = row * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS + 10;

    const newBubble: Bubble = {
      row,
      col,
      color: shootingBubble.color,
      x,
      y,
    };

    this.state.bubbles.push(newBubble);
    this.state.shootingBubble = null;

    // Check for matches
    const matches = this.findMatches(newBubble);
    if (matches.length >= 3) {
      this.popBubbles(matches);
    }

    // Check for floating bubbles
    this.removeFloatingBubbles();

    // Check win/lose conditions
    if (this.state.bubbles.length === 0) {
      this.state.phase = "win";
    } else if (this.state.bubbles.some((b) => b.y > this.canvasHeight - 100)) {
      this.state.phase = "gameOver";
    } else {
      // Prepare next shot
      this.state.currentBubble = this.state.nextBubble;
      this.state.nextBubble = this.getRandomColor();
      this.state.phase = "playing";
    }

    this.emitState();
  }

  private findMatches(startBubble: Bubble): Bubble[] {
    const matches: Bubble[] = [startBubble];
    const visited = new Set<string>();
    const queue: Bubble[] = [startBubble];

    visited.add(`${startBubble.row},${startBubble.col}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Check neighbors
      for (const neighbor of this.getNeighbors(current)) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (!visited.has(key) && neighbor.color === startBubble.color) {
          visited.add(key);
          matches.push(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return matches;
  }

  private getNeighbors(bubble: Bubble): Bubble[] {
    const neighbors: Bubble[] = [];
    const isEvenRow = bubble.row % 2 === 0;

    // Define neighbor offsets based on row parity
    const offsets = isEvenRow
      ? [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
        ]
      : [
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [1, 1],
        ];

    for (const [dr, dc] of offsets) {
      const row = bubble.row + dr;
      const col = bubble.col + dc;

      const neighbor = this.state.bubbles.find((b) => b.row === row && b.col === col);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private popBubbles(bubbles: Bubble[]): void {
    const bubbleKeys = new Set(bubbles.map((b) => `${b.row},${b.col}`));
    this.state.bubbles = this.state.bubbles.filter((b) => !bubbleKeys.has(`${b.row},${b.col}`));
    this.state.score += bubbles.length * 10;
  }

  private removeFloatingBubbles(): void {
    // Find all bubbles connected to the top row
    const connected = new Set<string>();
    const queue: Bubble[] = this.state.bubbles.filter((b) => b.row === 0);

    for (const b of queue) {
      connected.add(`${b.row},${b.col}`);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const neighbor of this.getNeighbors(current)) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (!connected.has(key)) {
          connected.add(key);
          queue.push(neighbor);
        }
      }
    }

    // Remove floating bubbles
    const floatingCount = this.state.bubbles.filter((b) => !connected.has(`${b.row},${b.col}`)).length;
    this.state.bubbles = this.state.bubbles.filter((b) => connected.has(`${b.row},${b.col}`));
    this.state.score += floatingCount * 20;
  }

  public getBubbleRadius(): number {
    return BUBBLE_RADIUS;
  }

  public getShooterPosition(): { x: number; y: number } {
    return {
      x: this.canvasWidth / 2,
      y: this.canvasHeight - 50,
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
