/**
 * Snake Ladder Arcade Game Engine
 * Game #186
 *
 * Fast-paced snake and ladder race against time!
 */

interface SnakeOrLadder {
  start: number;
  end: number;
  type: "snake" | "ladder";
}

interface GameState {
  score: number;
  position: number;
  time: number;
  status: "idle" | "playing" | "won" | "over";
}

type StateCallback = (state: GameState) => void;

const BOARD_SIZE = 10;
const TOTAL_CELLS = 100;

export class SnakeLadderArcadeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize = 0;
  private position = 1;
  private score = 0;
  private time = 60;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private timerInterval: number | null = null;
  private snakesAndLadders: SnakeOrLadder[] = [];
  private diceValue = 1;
  private isRolling = false;
  private playerAnimX = 0;
  private playerAnimY = 0;
  private targetAnimX = 0;
  private targetAnimY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.initBoard();
  }

  private initBoard() {
    this.snakesAndLadders = [
      // Ladders
      { start: 4, end: 25, type: "ladder" },
      { start: 13, end: 46, type: "ladder" },
      { start: 33, end: 49, type: "ladder" },
      { start: 42, end: 63, type: "ladder" },
      { start: 50, end: 69, type: "ladder" },
      { start: 62, end: 81, type: "ladder" },
      { start: 74, end: 92, type: "ladder" },
      // Snakes
      { start: 27, end: 5, type: "snake" },
      { start: 40, end: 3, type: "snake" },
      { start: 43, end: 18, type: "snake" },
      { start: 54, end: 31, type: "snake" },
      { start: 66, end: 45, type: "snake" },
      { start: 76, end: 58, type: "snake" },
      { start: 89, end: 53, type: "snake" },
      { start: 99, end: 41, type: "snake" },
    ];
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        position: this.position,
        time: this.time,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = size / BOARD_SIZE;

    const pos = this.getCellPosition(this.position);
    this.playerAnimX = pos.x;
    this.playerAnimY = pos.y;
    this.targetAnimX = pos.x;
    this.targetAnimY = pos.y;

    this.draw();
  }

  private getCellPosition(cell: number): { x: number; y: number } {
    const index = cell - 1;
    const row = Math.floor(index / BOARD_SIZE);
    const colBase = index % BOARD_SIZE;
    const col = row % 2 === 0 ? colBase : BOARD_SIZE - 1 - colBase;

    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: (BOARD_SIZE - 1 - row) * this.cellSize + this.cellSize / 2,
    };
  }

  start() {
    this.position = 1;
    this.score = 0;
    this.time = 60;
    this.diceValue = 1;
    this.isRolling = false;

    const pos = this.getCellPosition(this.position);
    this.playerAnimX = pos.x;
    this.playerAnimY = pos.y;
    this.targetAnimX = pos.x;
    this.targetAnimY = pos.y;

    this.status = "playing";
    this.emitState();
    this.startTimer();
    this.gameLoop();
  }

  private startTimer() {
    this.timerInterval = window.setInterval(() => {
      if (this.status !== "playing") return;

      this.time--;
      this.emitState();

      if (this.time <= 0) {
        this.status = "over";
        this.emitState();
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  roll() {
    if (this.status !== "playing" || this.isRolling) return;

    this.isRolling = true;
    this.diceValue = Math.floor(Math.random() * 6) + 1;

    // Animate dice roll
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      this.diceValue = Math.floor(Math.random() * 6) + 1;
      rollCount++;
      if (rollCount >= 10) {
        clearInterval(rollInterval);
        this.diceValue = Math.floor(Math.random() * 6) + 1;
        this.movePlayer();
      }
    }, 50);
  }

  private movePlayer() {
    const newPosition = Math.min(this.position + this.diceValue, TOTAL_CELLS);
    this.position = newPosition;
    this.score += this.diceValue * 10;

    // Check for snake or ladder
    const snakeOrLadder = this.snakesAndLadders.find(
      (sl) => sl.start === this.position
    );

    if (snakeOrLadder) {
      setTimeout(() => {
        if (snakeOrLadder.type === "ladder") {
          this.score += 50;
        } else {
          this.score = Math.max(0, this.score - 30);
        }
        this.position = snakeOrLadder.end;
        this.updateTargetPosition();
        this.emitState();
      }, 300);
    }

    this.updateTargetPosition();
    this.emitState();

    // Check win
    if (this.position >= TOTAL_CELLS) {
      setTimeout(() => {
        this.score += this.time * 10; // Bonus for remaining time
        this.status = "won";
        this.emitState();
        this.stopTimer();
      }, 500);
    }

    setTimeout(() => {
      this.isRolling = false;
    }, 500);
  }

  private updateTargetPosition() {
    const pos = this.getCellPosition(this.position);
    this.targetAnimX = pos.x;
    this.targetAnimY = pos.y;
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    // Smooth player animation
    const speed = 0.15;
    this.playerAnimX += (this.targetAnimX - this.playerAnimX) * speed;
    this.playerAnimY += (this.targetAnimY - this.playerAnimY) * speed;
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, w, h);

    // Draw board
    this.drawBoard();

    // Draw snakes and ladders
    this.drawSnakesAndLadders();

    // Draw player
    this.drawPlayer();

    // Draw dice
    this.drawDice();
  }

  private drawBoard() {
    const ctx = this.ctx;

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const row = Math.floor(i / BOARD_SIZE);
      const colBase = i % BOARD_SIZE;
      const col = row % 2 === 0 ? colBase : BOARD_SIZE - 1 - colBase;
      const x = col * this.cellSize;
      const y = (BOARD_SIZE - 1 - row) * this.cellSize;

      // Alternating colors
      ctx.fillStyle = (row + col) % 2 === 0 ? "#e8f4f8" : "#d4e9ed";
      ctx.fillRect(x, y, this.cellSize, this.cellSize);

      // Cell number
      ctx.fillStyle = "#666";
      ctx.font = `${this.cellSize * 0.25}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        (i + 1).toString(),
        x + this.cellSize * 0.2,
        y + this.cellSize * 0.2
      );
    }

    // Draw grid lines
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellSize, 0);
      ctx.lineTo(i * this.cellSize, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * this.cellSize);
      ctx.lineTo(w, i * this.cellSize);
      ctx.stroke();
    }
  }

  private drawSnakesAndLadders() {
    const ctx = this.ctx;

    for (const sl of this.snakesAndLadders) {
      const startPos = this.getCellPosition(sl.start);
      const endPos = this.getCellPosition(sl.end);

      ctx.lineWidth = this.cellSize * 0.15;
      ctx.lineCap = "round";

      if (sl.type === "ladder") {
        // Draw ladder
        ctx.strokeStyle = "#27ae60";
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = (-dy / len) * this.cellSize * 0.2;
        const perpY = (dx / len) * this.cellSize * 0.2;

        // Rails
        ctx.lineWidth = this.cellSize * 0.06;
        ctx.beginPath();
        ctx.moveTo(startPos.x + perpX, startPos.y + perpY);
        ctx.lineTo(endPos.x + perpX, endPos.y + perpY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(startPos.x - perpX, startPos.y - perpY);
        ctx.lineTo(endPos.x - perpX, endPos.y - perpY);
        ctx.stroke();

        // Rungs
        const rungs = 5;
        for (let i = 1; i < rungs; i++) {
          const t = i / rungs;
          const rx = startPos.x + dx * t;
          const ry = startPos.y + dy * t;
          ctx.beginPath();
          ctx.moveTo(rx + perpX, ry + perpY);
          ctx.lineTo(rx - perpX, ry - perpY);
          ctx.stroke();
        }
      } else {
        // Draw snake
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = this.cellSize * 0.12;

        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;

        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);

        // Wavy snake body
        const segments = 8;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const x = startPos.x + dx * t;
          const y = startPos.y + dy * t;
          const wave = Math.sin(t * Math.PI * 3) * this.cellSize * 0.3;
          const perpX = -dy / Math.sqrt(dx * dx + dy * dy);
          const perpY = dx / Math.sqrt(dx * dx + dy * dy);
          ctx.lineTo(x + perpX * wave, y + perpY * wave);
        }
        ctx.stroke();

        // Snake head
        ctx.fillStyle = "#c0392b";
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, this.cellSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Snake eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(
          startPos.x - 3,
          startPos.y - 3,
          this.cellSize * 0.04,
          0,
          Math.PI * 2
        );
        ctx.arc(
          startPos.x + 3,
          startPos.y - 3,
          this.cellSize * 0.04,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const radius = this.cellSize * 0.3;

    // Player shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(
      this.playerAnimX + 3,
      this.playerAnimY + radius * 0.8 + 3,
      radius * 0.8,
      radius * 0.3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Player body
    const gradient = ctx.createRadialGradient(
      this.playerAnimX - radius * 0.3,
      this.playerAnimY - radius * 0.3,
      0,
      this.playerAnimX,
      this.playerAnimY,
      radius
    );
    gradient.addColorStop(0, "#f5576c");
    gradient.addColorStop(1, "#c91e3a");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.playerAnimX, this.playerAnimY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Player face
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      this.playerAnimX - radius * 0.3,
      this.playerAnimY - radius * 0.2,
      radius * 0.15,
      0,
      Math.PI * 2
    );
    ctx.arc(
      this.playerAnimX + radius * 0.3,
      this.playerAnimY - radius * 0.2,
      radius * 0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      this.playerAnimX,
      this.playerAnimY + radius * 0.1,
      radius * 0.3,
      0.1 * Math.PI,
      0.9 * Math.PI
    );
    ctx.stroke();
  }

  private drawDice() {
    const ctx = this.ctx;
    const diceSize = this.cellSize * 0.8;
    const x = this.canvas.width - diceSize - 10;
    const y = this.canvas.height - diceSize - 10;

    // Dice background
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, diceSize, diceSize, 8);
    ctx.fill();
    ctx.stroke();

    // Dice dots
    ctx.fillStyle = "#333";
    const dotRadius = diceSize * 0.08;
    const dotPositions = this.getDiceDotsPositions(this.diceValue, x, y, diceSize);

    for (const pos of dotPositions) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private getDiceDotsPositions(
    value: number,
    x: number,
    y: number,
    size: number
  ): { x: number; y: number }[] {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const offset = size * 0.25;

    const positions: { [key: number]: { x: number; y: number }[] } = {
      1: [{ x: cx, y: cy }],
      2: [
        { x: cx - offset, y: cy - offset },
        { x: cx + offset, y: cy + offset },
      ],
      3: [
        { x: cx - offset, y: cy - offset },
        { x: cx, y: cy },
        { x: cx + offset, y: cy + offset },
      ],
      4: [
        { x: cx - offset, y: cy - offset },
        { x: cx + offset, y: cy - offset },
        { x: cx - offset, y: cy + offset },
        { x: cx + offset, y: cy + offset },
      ],
      5: [
        { x: cx - offset, y: cy - offset },
        { x: cx + offset, y: cy - offset },
        { x: cx, y: cy },
        { x: cx - offset, y: cy + offset },
        { x: cx + offset, y: cy + offset },
      ],
      6: [
        { x: cx - offset, y: cy - offset },
        { x: cx + offset, y: cy - offset },
        { x: cx - offset, y: cy },
        { x: cx + offset, y: cy },
        { x: cx - offset, y: cy + offset },
        { x: cx + offset, y: cy + offset },
      ],
    };

    return positions[value] || [];
  }

  destroy() {
    this.stopTimer();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
