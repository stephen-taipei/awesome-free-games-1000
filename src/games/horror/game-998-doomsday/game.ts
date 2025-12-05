
import { translations } from './i18n';

export interface GameStats {
  day: number;
  health: number;
  food: number;
  water: number;
}

export type ActionType = 'scavenge' | 'rest' | 'fortify';

export class Game {
  private stats: GameStats;
  private isGameOver: boolean = false;
  private onStateChange: (() => void) | null = null;
  private onLog: ((msg: string, type: string) => void) | null = null;

  constructor() {
    this.stats = this.getInitialStats();
  }

  private getInitialStats(): GameStats {
    return { day: 1, health: 100, food: 50, water: 50 };
  }

  start() {
    this.stats = this.getInitialStats();
    this.isGameOver = false;
    this.notifyChange();
  }

  performAction(action: ActionType) {
    if (this.isGameOver) return;

    this.stats.day++;
    this.consumeDailyResources();

    switch (action) {
      case 'scavenge':
        this.handleScavenge();
        break;
      case 'rest':
        this.handleRest();
        break;
      case 'fortify':
        this.handleFortify();
        break;
    }

    this.checkGameOver();
    this.notifyChange();
  }

  private handleScavenge() {
    const rand = Math.random();
    if (rand < 0.3) {
      this.stats.food = Math.min(100, this.stats.food + 20);
      this.log('findFood', 'success');
    } else if (rand < 0.6) {
      this.stats.water = Math.min(100, this.stats.water + 20);
      this.log('findWater', 'success');
    } else if (rand < 0.8) {
      this.log('nothing', 'info');
    } else {
      const dmg = Math.floor(Math.random() * 20) + 10;
      this.stats.health -= dmg;
      this.log('monster', 'danger');
    }
  }

  private handleRest() {
    this.stats.health = Math.min(100, this.stats.health + 15);
    this.log('rested', 'success');
  }

  private handleFortify() {
    // Gameplay mechanic: Fortifying reduces chance of night attacks (implied)
    this.log('fortified', 'info');
  }

  private consumeDailyResources() {
    const foodCost = 10;
    const waterCost = 10;

    if (this.stats.food >= foodCost) {
      this.stats.food -= foodCost;
    } else {
      this.stats.food = 0;
      this.stats.health -= 10;
      this.log('starve', 'danger');
    }

    if (this.stats.water >= waterCost) {
      this.stats.water -= waterCost;
    } else {
      this.stats.water = 0;
      this.stats.health -= 15;
      this.log('thirst', 'danger');
    }
  }

  private checkGameOver() {
    if (this.stats.health <= 0) {
      this.stats.health = 0;
      this.isGameOver = true;
    }
  }

  getStats() {
    return { ...this.stats };
  }

  isOver() {
    return this.isGameOver;
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnLog(cb: (msg: string, type: string) => void) {
    this.onLog = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string, type: string) {
    if (this.onLog) this.onLog(key, type);
  }
}
