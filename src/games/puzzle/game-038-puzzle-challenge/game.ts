/**
 * Puzzle Challenge - Game #038
 * Timed jigsaw puzzle challenge
 */

export interface PuzzlePiece {
  id: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  row: number;
  col: number;
  isPlaced: boolean;
}

export interface Level {
  gridSize: number;
  timeLimit: number; // seconds
  imagePattern: string; // CSS pattern or color
}

const LEVELS: Level[] = [
  { gridSize: 2, timeLimit: 30, imagePattern: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { gridSize: 3, timeLimit: 60, imagePattern: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { gridSize: 3, timeLimit: 45, imagePattern: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { gridSize: 4, timeLimit: 90, imagePattern: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { gridSize: 4, timeLimit: 60, imagePattern: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }
];

const PATTERN_SHAPES = [
  { type: 'circle', color: 'rgba(255,255,255,0.3)' },
  { type: 'star', color: 'rgba(255,255,255,0.2)' },
  { type: 'diamond', color: 'rgba(0,0,0,0.1)' }
];

export class PuzzleChallengeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  pieces: PuzzlePiece[] = [];
  gridSize = 3;
  pieceSize = 80;
  puzzleX = 0;
  puzzleY = 0;
  currentLevel = 0;

  draggingPiece: PuzzlePiece | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  timeLimit = 60;
  timeRemaining = 60;
  timerInterval: number | null = null;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private currentPattern = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.startTimer();
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.gridSize;
    this.timeLimit = level.timeLimit;
    this.timeRemaining = level.timeLimit;
    this.currentPattern = level.imagePattern;

    this.pieceSize = Math.floor(Math.min(280, this.canvas.width * 0.6) / this.gridSize);
    this.puzzleX = (this.canvas.width - this.gridSize * this.pieceSize) / 2;
    this.puzzleY = 50;

    // Create pieces
    this.pieces = [];
    let id = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const targetX = this.puzzleX + col * this.pieceSize;
        const targetY = this.puzzleY + row * this.pieceSize;

        this.pieces.push({
          id: id++,
          currentX: 0,
          currentY: 0,
          targetX,
          targetY,
          width: this.pieceSize,
          height: this.pieceSize,
          row,
          col,
          isPlaced: false
        });
      }
    }

    // Shuffle pieces to bottom area
    this.shufflePieces();
    this.notifyState();
  }

  private shufflePieces() {
    const bottomY = this.puzzleY + this.gridSize * this.pieceSize + 30;
    const availableWidth = this.canvas.width - this.pieceSize - 20;

    // Fisher-Yates shuffle
    for (let i = this.pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
    }

    // Position pieces in rows
    const piecesPerRow = Math.floor(availableWidth / (this.pieceSize + 10));
    this.pieces.forEach((piece, i) => {
      const row = Math.floor(i / piecesPerRow);
      const col = i % piecesPerRow;
      piece.currentX = 10 + col * (this.pieceSize + 10);
      piece.currentY = bottomY + row * (this.pieceSize + 10);
      piece.isPlaced = false;
    });
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      if (this.status !== 'playing') return;

      this.timeRemaining--;
      this.notifyState();

      if (this.timeRemaining <= 0) {
        this.status = 'lost';
        this.stopTimer();
        this.notifyState();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      // Find piece at click position (reverse order for top pieces)
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const piece = this.pieces[i];
        if (piece.isPlaced) continue;

        if (x >= piece.currentX && x <= piece.currentX + piece.width &&
            y >= piece.currentY && y <= piece.currentY + piece.height) {
          this.draggingPiece = piece;
          this.dragOffsetX = x - piece.currentX;
          this.dragOffsetY = y - piece.currentY;

          // Move to top
          const idx = this.pieces.indexOf(piece);
          this.pieces.splice(idx, 1);
          this.pieces.push(piece);
          break;
        }
      }
    } else if (type === 'move') {
      if (this.draggingPiece) {
        this.draggingPiece.currentX = x - this.dragOffsetX;
        this.draggingPiece.currentY = y - this.dragOffsetY;
        this.draw();
      }
    } else if (type === 'up') {
      if (this.draggingPiece) {
        // Check if close to target position
        const piece = this.draggingPiece;
        const dx = Math.abs(piece.currentX - piece.targetX);
        const dy = Math.abs(piece.currentY - piece.targetY);

        if (dx < this.pieceSize * 0.3 && dy < this.pieceSize * 0.3) {
          // Snap to position
          piece.currentX = piece.targetX;
          piece.currentY = piece.targetY;
          piece.isPlaced = true;

          // Check win
          if (this.pieces.every(p => p.isPlaced)) {
            this.status = 'won';
            this.stopTimer();
            this.notifyState();
          }
        }

        this.draggingPiece = null;
        this.draw();
      }
    }
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw puzzle frame (target area)
    const frameWidth = this.gridSize * this.pieceSize;
    const frameHeight = this.gridSize * this.pieceSize;

    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(this.puzzleX - 2, this.puzzleY - 2, frameWidth + 4, frameHeight + 4);
    this.ctx.setLineDash([]);

    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.puzzleX + i * this.pieceSize, this.puzzleY);
      this.ctx.lineTo(this.puzzleX + i * this.pieceSize, this.puzzleY + frameHeight);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(this.puzzleX, this.puzzleY + i * this.pieceSize);
      this.ctx.lineTo(this.puzzleX + frameWidth, this.puzzleY + i * this.pieceSize);
      this.ctx.stroke();
    }

    // Draw pieces
    this.pieces.forEach(piece => {
      this.drawPiece(piece);
    });

    // Draw timer bar
    const barWidth = this.canvas.width - 40;
    const barHeight = 8;
    const barX = 20;
    const barY = 15;
    const progress = this.timeRemaining / this.timeLimit;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const barColor = progress > 0.3 ? '#2ecc71' : progress > 0.1 ? '#f39c12' : '#e74c3c';
    this.ctx.fillStyle = barColor;
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
  }

  private drawPiece(piece: PuzzlePiece) {
    const { currentX, currentY, width, height, row, col, isPlaced } = piece;

    this.ctx.save();

    // Create gradient for piece
    const gradient = this.ctx.createLinearGradient(
      currentX, currentY,
      currentX + width, currentY + height
    );

    // Parse pattern colors (simplified)
    if (this.currentPattern.includes('#667eea')) {
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
    } else if (this.currentPattern.includes('#f093fb')) {
      gradient.addColorStop(0, '#f093fb');
      gradient.addColorStop(1, '#f5576c');
    } else if (this.currentPattern.includes('#4facfe')) {
      gradient.addColorStop(0, '#4facfe');
      gradient.addColorStop(1, '#00f2fe');
    } else if (this.currentPattern.includes('#43e97b')) {
      gradient.addColorStop(0, '#43e97b');
      gradient.addColorStop(1, '#38f9d7');
    } else {
      gradient.addColorStop(0, '#fa709a');
      gradient.addColorStop(1, '#fee140');
    }

    // Draw piece background
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(currentX, currentY, width, height);

    // Draw pattern based on position
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    const patternX = currentX + (col % 2) * 20 + 10;
    const patternY = currentY + (row % 2) * 20 + 10;

    if ((row + col) % 3 === 0) {
      // Circle
      this.ctx.beginPath();
      this.ctx.arc(patternX + width / 4, patternY + height / 4, width / 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else if ((row + col) % 3 === 1) {
      // Diamond
      this.ctx.beginPath();
      this.ctx.moveTo(patternX + width / 4, patternY);
      this.ctx.lineTo(patternX + width / 2, patternY + height / 4);
      this.ctx.lineTo(patternX + width / 4, patternY + height / 2);
      this.ctx.lineTo(patternX, patternY + height / 4);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      // Square
      this.ctx.fillRect(patternX, patternY, width / 3, height / 3);
    }

    // Draw piece number
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = `${Math.floor(width / 3)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText((piece.id + 1).toString(), currentX + width / 2, currentY + height / 2);

    // Draw border
    this.ctx.strokeStyle = isPlaced ? '#2ecc71' : 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = isPlaced ? 3 : 2;
    this.ctx.strokeRect(currentX, currentY, width, height);

    // Shadow for dragging piece
    if (piece === this.draggingPiece) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 5;
      this.ctx.shadowOffsetY = 5;
    }

    this.ctx.restore();
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
    }
    if (this.pieces.length > 0) {
      this.pieceSize = Math.floor(Math.min(280, this.canvas.width * 0.6) / this.gridSize);
      this.puzzleX = (this.canvas.width - this.gridSize * this.pieceSize) / 2;
      // Recalculate target positions
      this.pieces.forEach(piece => {
        piece.targetX = this.puzzleX + piece.col * this.pieceSize;
        piece.targetY = this.puzzleY + piece.row * this.pieceSize;
        piece.width = this.pieceSize;
        piece.height = this.pieceSize;
        if (piece.isPlaced) {
          piece.currentX = piece.targetX;
          piece.currentY = piece.targetY;
        }
      });
    }
    this.draw();
  }

  public reset() {
    this.stopTimer();
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.startTimer();
    this.draw();
  }

  public nextLevel() {
    this.stopTimer();
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.startTimer();
    this.draw();
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        totalLevels: LEVELS.length,
        timeRemaining: this.timeRemaining,
        timeLimit: this.timeLimit,
        placedCount: this.pieces.filter(p => p.isPlaced).length,
        totalPieces: this.pieces.length
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopTimer();
  }
}
