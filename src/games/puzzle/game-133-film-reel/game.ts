/**
 * Film Reel - Game #133
 * Arrange film frames in correct sequence
 */

export interface Frame {
  id: number;
  correctPosition: number;
  currentPosition: number;
  image: string;
  emoji: string;
}

export interface Level {
  frameCount: number;
  story: { emoji: string; desc: string }[];
}

const LEVELS: Level[] = [
  {
    frameCount: 3,
    story: [
      { emoji: '🌱', desc: 'seed' },
      { emoji: '🌿', desc: 'sprout' },
      { emoji: '🌳', desc: 'tree' }
    ]
  },
  {
    frameCount: 4,
    story: [
      { emoji: '🥚', desc: 'egg' },
      { emoji: '🐣', desc: 'hatching' },
      { emoji: '🐥', desc: 'chick' },
      { emoji: '🐔', desc: 'chicken' }
    ]
  },
  {
    frameCount: 5,
    story: [
      { emoji: '🌑', desc: 'new moon' },
      { emoji: '🌒', desc: 'waxing' },
      { emoji: '🌕', desc: 'full moon' },
      { emoji: '🌘', desc: 'waning' },
      { emoji: '🌑', desc: 'new moon' }
    ]
  },
  {
    frameCount: 5,
    story: [
      { emoji: '☀️', desc: 'sunrise' },
      { emoji: '🌤️', desc: 'morning' },
      { emoji: '☁️', desc: 'cloudy' },
      { emoji: '🌧️', desc: 'rain' },
      { emoji: '🌈', desc: 'rainbow' }
    ]
  },
  {
    frameCount: 6,
    story: [
      { emoji: '🍎', desc: 'apple' },
      { emoji: '🔪', desc: 'cut' },
      { emoji: '🥣', desc: 'mix' },
      { emoji: '🔥', desc: 'bake' },
      { emoji: '🥧', desc: 'pie' },
      { emoji: '😋', desc: 'eat' }
    ]
  }
];

export class FilmReelGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private frames: Frame[] = [];
  private frameWidth = 80;
  private frameHeight = 100;
  private filmY = 0;

  private currentLevel = 0;
  private selectedFrame: Frame | null = null;
  private dragOffsetX = 0;
  private dragX = 0;

  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
    this.draw();
  }

  private loadLevel(index: number) {
    const level = LEVELS[index % LEVELS.length];

    // Create frames
    this.frames = level.story.map((item, i) => ({
      id: i,
      correctPosition: i,
      currentPosition: i,
      image: item.desc,
      emoji: item.emoji
    }));

    // Shuffle positions
    this.shuffleFrames();
    this.calculateLayout();
    this.notifyState();
  }

  private shuffleFrames() {
    // Fisher-Yates shuffle for positions
    const positions = this.frames.map((_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Assign shuffled positions
    this.frames.forEach((frame, i) => {
      frame.currentPosition = positions[i];
    });

    // Sort frames by current position for rendering
    this.frames.sort((a, b) => a.currentPosition - b.currentPosition);
  }

  private calculateLayout() {
    const frameCount = this.frames.length;
    const totalWidth = frameCount * (this.frameWidth + 20);

    this.frameWidth = Math.min(80, (this.canvas.width - 60) / frameCount - 10);
    this.frameHeight = this.frameWidth * 1.2;

    this.filmY = this.canvas.height / 2 - this.frameHeight / 2;
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const frameStartX = (this.canvas.width - this.frames.length * (this.frameWidth + 10)) / 2;

    if (type === 'down') {
      // Check if clicking on a frame
      for (const frame of this.frames) {
        const frameX = frameStartX + frame.currentPosition * (this.frameWidth + 10);
        if (x >= frameX && x <= frameX + this.frameWidth &&
            y >= this.filmY && y <= this.filmY + this.frameHeight) {
          this.selectedFrame = frame;
          this.dragOffsetX = x - frameX;
          this.dragX = x;
          break;
        }
      }
    } else if (type === 'move' && this.selectedFrame) {
      this.dragX = x;
      this.draw();
    } else if (type === 'up' && this.selectedFrame) {
      // Determine new position based on drag
      const targetX = this.dragX - this.dragOffsetX + this.frameWidth / 2;
      let newPosition = Math.round((targetX - frameStartX) / (this.frameWidth + 10));
      newPosition = Math.max(0, Math.min(this.frames.length - 1, newPosition));

      if (newPosition !== this.selectedFrame.currentPosition) {
        this.swapPositions(this.selectedFrame.currentPosition, newPosition);
      }

      this.selectedFrame = null;
      this.checkWin();
      this.draw();
    }
  }

  private swapPositions(pos1: number, pos2: number) {
    const frame1 = this.frames.find(f => f.currentPosition === pos1);
    const frame2 = this.frames.find(f => f.currentPosition === pos2);

    if (frame1 && frame2) {
      frame1.currentPosition = pos2;
      frame2.currentPosition = pos1;
    }

    // Re-sort frames by position
    this.frames.sort((a, b) => a.currentPosition - b.currentPosition);
    this.notifyState();
  }

  private checkWin() {
    const isCorrect = this.frames.every(f => f.currentPosition === f.correctPosition);
    if (isCorrect) {
      this.status = 'won';
      this.notifyState();
    }
  }

  private getCorrectCount(): number {
    return this.frames.filter(f => f.currentPosition === f.correctPosition).length;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Cinema background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Film strip holes (top)
    this.drawFilmHoles(this.filmY - 25);

    // Film strip holes (bottom)
    this.drawFilmHoles(this.filmY + this.frameHeight + 10);

    // Draw frames
    const frameStartX = (this.canvas.width - this.frames.length * (this.frameWidth + 10)) / 2;

    for (const frame of this.frames) {
      if (frame === this.selectedFrame) continue; // Draw selected frame last

      const frameX = frameStartX + frame.currentPosition * (this.frameWidth + 10);
      this.drawFrame(frame, frameX, this.filmY);
    }

    // Draw selected frame on top (being dragged)
    if (this.selectedFrame) {
      const frameX = this.dragX - this.dragOffsetX;
      this.ctx.globalAlpha = 0.8;
      this.drawFrame(this.selectedFrame, frameX, this.filmY - 10);
      this.ctx.globalAlpha = 1;

      // Draw drop indicator
      const targetPos = Math.round((frameX + this.frameWidth / 2 - frameStartX) / (this.frameWidth + 10));
      const clampedPos = Math.max(0, Math.min(this.frames.length - 1, targetPos));
      const indicatorX = frameStartX + clampedPos * (this.frameWidth + 10) + this.frameWidth / 2;

      this.ctx.strokeStyle = '#f1c40f';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(indicatorX, this.filmY - 30);
      this.ctx.lineTo(indicatorX, this.filmY + this.frameHeight + 30);
      this.ctx.stroke();
    }

    // Draw frame numbers
    this.ctx.fillStyle = '#888';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    for (let i = 0; i < this.frames.length; i++) {
      const x = frameStartX + i * (this.frameWidth + 10) + this.frameWidth / 2;
      this.ctx.fillText(`${i + 1}`, x, this.filmY + this.frameHeight + 50);
    }

    // Draw story hint at bottom
    this.drawStoryHint();
  }

  private drawFilmHoles(y: number) {
    this.ctx.fillStyle = '#111';
    const holeSpacing = 30;
    const holeWidth = 12;
    const holeHeight = 8;

    for (let x = 20; x < this.canvas.width - 20; x += holeSpacing) {
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, holeWidth, holeHeight, 2);
      this.ctx.fill();
    }
  }

  private drawFrame(frame: Frame, x: number, y: number) {
    // Frame background
    const isCorrect = frame.currentPosition === frame.correctPosition;

    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, this.frameWidth, this.frameHeight, 4);
    this.ctx.fill();

    // Frame border
    this.ctx.strokeStyle = isCorrect ? '#2ecc71' : '#333';
    this.ctx.lineWidth = isCorrect ? 3 : 2;
    this.ctx.stroke();

    // Emoji content
    this.ctx.font = `${this.frameWidth * 0.5}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(frame.emoji, x + this.frameWidth / 2, y + this.frameHeight / 2);

    // Film perforation effect
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(x + 10, y + 10, 4, 0, Math.PI * 2);
    this.ctx.arc(x + this.frameWidth - 10, y + 10, 4, 0, Math.PI * 2);
    this.ctx.arc(x + 10, y + this.frameHeight - 10, 4, 0, Math.PI * 2);
    this.ctx.arc(x + this.frameWidth - 10, y + this.frameHeight - 10, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Correct indicator
    if (isCorrect) {
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.beginPath();
      this.ctx.arc(x + this.frameWidth - 8, y + 8, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + this.frameWidth - 11, y + 8);
      this.ctx.lineTo(x + this.frameWidth - 8, y + 11);
      this.ctx.lineTo(x + this.frameWidth - 5, y + 5);
      this.ctx.stroke();
    }
  }

  private drawStoryHint() {
    const hintY = this.canvas.height - 60;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.ctx.roundRect(20, hintY, this.canvas.width - 40, 40, 8);
    this.ctx.fill();

    // Show correct sequence hint
    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#aaa';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Story: ', 30, hintY + 25);

    const sortedFrames = [...this.frames].sort((a, b) => a.correctPosition - b.correctPosition);
    const emojiText = sortedFrames.map(f => f.emoji).join(' → ');
    this.ctx.fillText(emojiText, 80, hintY + 25);
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
    this.status = 'playing';
    this.draw();
  }

  nextLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
    this.loadLevel(this.currentLevel);
    this.status = 'playing';
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
        correctCount: this.getCorrectCount(),
        totalFrames: this.frames.length
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
