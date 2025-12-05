
import { translations } from './i18n';

export interface Rune {
  id: number;
  symbol: string;
  x: number;
  y: number;
}

export class Game {
  private progress: number = 0;
  private corruption: number = 0;
  private isRunning: boolean = false;
  private currentSequence: string[] = [];
  private targetRuneIndex: number = 0;
  private runes: Rune[] = [];
  
  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string) => void) | null = null;

  // Config
  private readonly MAX_PROGRESS = 100;
  private readonly MAX_CORRUPTION = 100;
  private readonly RUNE_COUNT = 8;

  constructor() {}

  start() {
    this.progress = 0;
    this.corruption = 0;
    this.isRunning = true;
    this.generateRunes();
    this.nextRound();
    this.notifyChange();
    this.log('start');
  }

  private generateRunes() {
    this.runes = [];
    const symbols = translations['en'].game.runes; // Use EN symbols as base
    const center = { x: 150, y: 150 };
    const radius = 120;

    for (let i = 0; i < this.RUNE_COUNT; i++) {
      const angle = (i / this.RUNE_COUNT) * Math.PI * 2;
      this.runes.push({
        id: i,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        x: center.x + Math.cos(angle) * radius - 20, // -20 for half width
        y: center.y + Math.sin(angle) * radius - 20
      });
    }
  }

  private nextRound() {
    if (!this.isRunning) return;
    // Pick a random rune to be the target
    // In a more complex version, this could be a sequence memory game.
    // For this casual version, let's make it "Click the rune that changes color/pulses"
    // Or simply: The game logic handles click validation.
    
    // Let's go with: Click runes to gain progress. Wrong clicks add corruption.
    // Runes regenerate periodically? No, static for now.
  }

  clickRune(index: number) {
    if (!this.isRunning) return;

    // Simple mechanic: 80% chance success, 20% fail if too fast?
    // Let's make it a pattern matching game.
    // Actually, let's stick to a simple "Click the highlighted rune" logic handled in UI,
    // or just pure luck/spam protection?
    
    // Let's implement: Runes shuffle symbols periodically. You must click a specific target symbol displayed in center.
    // Re-designing on fly:
    // Center displays a symbol. Find it in the circle.
    
    const clickedRune = this.runes[index];
    if (clickedRune.symbol === this.targetSymbol) {
      this.progress += 10;
      this.log('correct');
      this.generateTarget();
    } else {
      this.corruption += 15;
      this.log('wrong');
    }

    this.checkGameState();
    this.notifyChange();
  }

  private targetSymbol: string = '';

  generateTarget() {
    // Randomly change some runes
    this.generateRunes(); // Shuffle positions/symbols for chaos
    
    // Pick one as target
    const target = this.runes[Math.floor(Math.random() * this.runes.length)];
    this.targetSymbol = target.symbol;
  }

  getTargetSymbol() {
    return this.targetSymbol;
  }

  getRunes() {
    return this.runes;
  }

  private checkGameState() {
    if (this.corruption >= this.MAX_CORRUPTION) {
      this.isRunning = false;
      this.log('lose');
    } else if (this.progress >= this.MAX_PROGRESS) {
      this.isRunning = false;
      this.log('win');
    }
  }

  getStats() {
    return {
      progress: this.progress,
      corruption: this.corruption,
      isRunning: this.isRunning,
      isWin: this.progress >= this.MAX_PROGRESS,
      isLose: this.corruption >= this.MAX_CORRUPTION
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (msg: string) => void) {
    this.onMessage = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}
