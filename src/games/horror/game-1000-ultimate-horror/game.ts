
import { translations } from './i18n';

export interface HorrorItem {
  id: string;
  icon: string;
  dangerLevel: number;
}

export class Game {
  private sanity: number = 100;
  private collectedItems: Set<string> = new Set();
  private isGameOver: boolean = false;
  private onStateChange: (() => void) | null = null;

  public readonly items: HorrorItem[] = [
    { id: 'doll', icon: '🎎', dangerLevel: 10 },
    { id: 'mirror', icon: '🪞', dangerLevel: 15 },
    { id: 'book', icon: '📖', dangerLevel: 20 },
    { id: 'knife', icon: '🔪', dangerLevel: 25 },
    { id: 'mask', icon: '🎭', dangerLevel: 15 },
    { id: 'skull', icon: '💀', dangerLevel: 30 }
  ];

  constructor() {}

  start() {
    this.sanity = 100;
    this.collectedItems.clear();
    this.isGameOver = false;
    this.notifyChange();
  }

  inspectItem(itemId: string): { event: string, damage: number } {
    if (this.isGameOver) return { event: 'gameover', damage: 0 };

    const item = this.items.find(i => i.id === itemId);
    if (!item) return { event: 'error', damage: 0 };

    let damage = 0;
    let eventKey = 'safe';

    // 50% chance of spooky event
    if (Math.random() > 0.5) {
      damage = Math.floor(Math.random() * item.dangerLevel);
      this.sanity = Math.max(0, this.sanity - damage);
      
      const events = ['scream', 'whisper', 'cold', 'touch'];
      eventKey = events[Math.floor(Math.random() * events.length)];
    }

    this.collectedItems.add(itemId);

    if (this.sanity <= 0) {
      this.isGameOver = true;
    }

    this.notifyChange();
    return { event: eventKey, damage };
  }

  getSanity(): number {
    return this.sanity;
  }

  isWin(): boolean {
    return this.collectedItems.size === this.items.length && this.sanity > 0;
  }

  isLost(): boolean {
    return this.sanity <= 0;
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }
}
