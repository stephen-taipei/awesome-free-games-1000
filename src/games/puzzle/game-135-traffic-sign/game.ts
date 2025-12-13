/**
 * Traffic Sign - Game #135
 * Match traffic signs with their meanings
 */

export interface TrafficSign {
  id: number;
  emoji: string;
  name: string;
  meaning: string;
  color: string;
}

export interface Level {
  signs: TrafficSign[];
}

const TRAFFIC_SIGNS: TrafficSign[] = [
  { id: 1, emoji: '🛑', name: 'stop', meaning: 'Stop', color: '#e74c3c' },
  { id: 2, emoji: '⚠️', name: 'warning', meaning: 'Warning', color: '#f1c40f' },
  { id: 3, emoji: '🚫', name: 'prohibited', meaning: 'No Entry', color: '#e74c3c' },
  { id: 4, emoji: '⬆️', name: 'forward', meaning: 'Go Straight', color: '#3498db' },
  { id: 5, emoji: '↩️', name: 'uturn', meaning: 'U-Turn', color: '#3498db' },
  { id: 6, emoji: '🅿️', name: 'parking', meaning: 'Parking', color: '#3498db' },
  { id: 7, emoji: '⛽', name: 'fuel', meaning: 'Gas Station', color: '#2ecc71' },
  { id: 8, emoji: '🚸', name: 'children', meaning: 'School Zone', color: '#f1c40f' },
  { id: 9, emoji: '🚶', name: 'pedestrian', meaning: 'Pedestrian', color: '#3498db' },
  { id: 10, emoji: '🚲', name: 'bicycle', meaning: 'Bicycle Lane', color: '#3498db' },
  { id: 11, emoji: '🏥', name: 'hospital', meaning: 'Hospital', color: '#e74c3c' },
  { id: 12, emoji: '🍽️', name: 'restaurant', meaning: 'Restaurant', color: '#2ecc71' },
  { id: 13, emoji: '🚧', name: 'construction', meaning: 'Road Work', color: '#f39c12' },
  { id: 14, emoji: '⏱️', name: 'speed', meaning: 'Speed Limit', color: '#e74c3c' },
  { id: 15, emoji: '🔄', name: 'roundabout', meaning: 'Roundabout', color: '#3498db' }
];

const LEVELS: Level[] = [
  {
    signs: TRAFFIC_SIGNS.slice(0, 3)
  },
  {
    signs: TRAFFIC_SIGNS.slice(0, 4)
  },
  {
    signs: TRAFFIC_SIGNS.slice(0, 5)
  },
  {
    signs: TRAFFIC_SIGNS.slice(0, 6)
  },
  {
    signs: TRAFFIC_SIGNS.slice(0, 8)
  }
];

export class TrafficSignGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private signs: TrafficSign[] = [];
  private meanings: { id: number; text: string; matched: boolean }[] = [];

  private signSize = 60;
  private signAreaY = 0;
  private meaningAreaY = 0;

  private currentLevel = 0;
  private matchedCount = 0;
  private totalPairs = 0;

  private selectedSign: number | null = null;
  private shuffledMeanings: { id: number; text: string; matched: boolean }[] = [];

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
    this.signs = [...level.signs];
    this.totalPairs = this.signs.length;
    this.matchedCount = 0;
    this.selectedSign = null;

    // Create and shuffle meanings
    this.shuffledMeanings = this.shuffleArray(
      this.signs.map(s => ({
        id: s.id,
        text: s.meaning,
        matched: false
      }))
    );

    this.calculateLayout();
    this.notifyState();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private calculateLayout() {
    const canvasHeight = this.canvas.height;

    this.signSize = Math.min(60, (this.canvas.width - 40) / this.signs.length - 10);
    this.signAreaY = 80;
    this.meaningAreaY = canvasHeight / 2 + 40;
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    if (type === 'down') {
      // Check sign click
      const signIndex = this.getSignAtPosition(x, y);
      if (signIndex !== null) {
        const sign = this.signs[signIndex];
        if (!this.isSignMatched(sign.id)) {
          this.selectedSign = sign.id;
          this.draw();
        }
        return;
      }

      // Check meaning click
      if (this.selectedSign !== null) {
        const meaningIndex = this.getMeaningAtPosition(x, y);
        if (meaningIndex !== null) {
          const meaning = this.shuffledMeanings[meaningIndex];
          if (!meaning.matched) {
            this.tryMatch(this.selectedSign, meaning.id);
          }
        }
      }
    }
  }

  private getSignAtPosition(x: number, y: number): number | null {
    const startX = (this.canvas.width - this.signs.length * (this.signSize + 10)) / 2;

    for (let i = 0; i < this.signs.length; i++) {
      const signX = startX + i * (this.signSize + 10);
      if (x >= signX && x <= signX + this.signSize &&
          y >= this.signAreaY && y <= this.signAreaY + this.signSize) {
        return i;
      }
    }

    return null;
  }

  private getMeaningAtPosition(x: number, y: number): number | null {
    const meaningHeight = 40;
    const meaningSpacing = 10;
    const meaningsPerRow = Math.min(3, this.shuffledMeanings.length);
    const meaningWidth = (this.canvas.width - 40 - (meaningsPerRow - 1) * meaningSpacing) / meaningsPerRow;

    for (let i = 0; i < this.shuffledMeanings.length; i++) {
      const row = Math.floor(i / meaningsPerRow);
      const col = i % meaningsPerRow;
      const meaningX = 20 + col * (meaningWidth + meaningSpacing);
      const meaningY = this.meaningAreaY + row * (meaningHeight + meaningSpacing);

      if (x >= meaningX && x <= meaningX + meaningWidth &&
          y >= meaningY && y <= meaningY + meaningHeight) {
        return i;
      }
    }

    return null;
  }

  private isSignMatched(signId: number): boolean {
    return this.shuffledMeanings.some(m => m.id === signId && m.matched);
  }

  private tryMatch(signId: number, meaningId: number) {
    if (signId === meaningId) {
      // Correct match!
      const meaning = this.shuffledMeanings.find(m => m.id === meaningId);
      if (meaning) {
        meaning.matched = true;
        this.matchedCount++;
        this.notifyState();

        if (this.matchedCount >= this.totalPairs) {
          this.status = 'won';
          this.notifyState();
        }
      }
    }

    this.selectedSign = null;
    this.draw();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Road background
    this.drawRoadBackground();

    // Draw title
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Match signs with meanings', this.canvas.width / 2, 40);

    // Draw signs
    this.drawSigns();

    // Draw arrow hint
    if (this.selectedSign !== null) {
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.font = '24px sans-serif';
      this.ctx.fillText('⬇️', this.canvas.width / 2, this.meaningAreaY - 20);
    }

    // Draw meanings
    this.drawMeanings();
  }

  private drawRoadBackground() {
    // Asphalt
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Road markings
    this.ctx.strokeStyle = '#f1c40f';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([20, 20]);

    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // Side lines
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(20, 0);
    this.ctx.lineTo(20, this.canvas.height);
    this.ctx.moveTo(this.canvas.width - 20, 0);
    this.ctx.lineTo(this.canvas.width - 20, this.canvas.height);
    this.ctx.stroke();
  }

  private drawSigns() {
    const startX = (this.canvas.width - this.signs.length * (this.signSize + 10)) / 2;

    for (let i = 0; i < this.signs.length; i++) {
      const sign = this.signs[i];
      const x = startX + i * (this.signSize + 10);
      const isMatched = this.isSignMatched(sign.id);
      const isSelected = this.selectedSign === sign.id;

      // Sign background
      this.ctx.fillStyle = isMatched ? '#27ae60' : sign.color;

      // Sign shape (circle for most signs)
      this.ctx.beginPath();
      this.ctx.arc(x + this.signSize / 2, this.signAreaY + this.signSize / 2, this.signSize / 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = isSelected ? '#f1c40f' : '#fff';
      this.ctx.lineWidth = isSelected ? 4 : 2;
      this.ctx.stroke();

      // Emoji
      this.ctx.font = `${this.signSize * 0.5}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(sign.emoji, x + this.signSize / 2, this.signAreaY + this.signSize / 2);

      // Checkmark for matched
      if (isMatched) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.fillText('✓', x + this.signSize - 5, this.signAreaY + 10);
      }
    }
  }

  private drawMeanings() {
    const meaningHeight = 40;
    const meaningSpacing = 10;
    const meaningsPerRow = Math.min(3, this.shuffledMeanings.length);
    const meaningWidth = (this.canvas.width - 40 - (meaningsPerRow - 1) * meaningSpacing) / meaningsPerRow;

    for (let i = 0; i < this.shuffledMeanings.length; i++) {
      const meaning = this.shuffledMeanings[i];
      const row = Math.floor(i / meaningsPerRow);
      const col = i % meaningsPerRow;
      const x = 20 + col * (meaningWidth + meaningSpacing);
      const y = this.meaningAreaY + row * (meaningHeight + meaningSpacing);

      // Background
      if (meaning.matched) {
        this.ctx.fillStyle = '#27ae60';
      } else if (this.selectedSign !== null) {
        this.ctx.fillStyle = '#34495e';
      } else {
        this.ctx.fillStyle = '#3498db';
      }

      this.ctx.beginPath();
      this.ctx.roundRect(x, y, meaningWidth, meaningHeight, 8);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Text
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(meaning.text, x + meaningWidth / 2, y + meaningHeight / 2);

      // Checkmark for matched
      if (meaning.matched) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillText('✓', x + meaningWidth - 12, y + 12);
      }
    }
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
        matchedCount: this.matchedCount,
        totalPairs: this.totalPairs
      });
    }
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
