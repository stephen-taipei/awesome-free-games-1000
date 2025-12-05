
import { translations } from './i18n';

export type WorldType = 'light' | 'dark';

export interface GameObject {
  id: string;
  x: number;
  y: number;
  world: 'light' | 'dark' | 'both';
  icon: string;
  collected?: boolean;
  interactable: boolean;
}

export class Game {
  private currentWorld: WorldType = 'light';
  private inventory: Set<string> = new Set();
  private gameWon: boolean = false;
  private onStateChange: (() => void) | null = null;

  public objects: GameObject[] = [
    { id: 'door', x: 80, y: 40, world: 'both', icon: '🚪', interactable: true },
    { id: 'key', x: 20, y: 70, world: 'dark', icon: '🗝️', interactable: true },
    { id: 'flower', x: 20, y: 70, world: 'light', icon: '🌸', interactable: true },
    { id: 'ghost', x: 50, y: 20, world: 'dark', icon: '👻', interactable: false },
    { id: 'painting', x: 50, y: 20, world: 'light', icon: '🖼️', interactable: false }
  ];

  constructor() {}

  switchWorld() {
    this.currentWorld = this.currentWorld === 'light' ? 'dark' : 'light';
    this.notifyChange();
  }

  getCurrentWorld() {
    return this.currentWorld;
  }

  getInventory() {
    return Array.from(this.inventory);
  }

  interact(objId: string): string {
    const obj = this.objects.find(o => o.id === objId);
    if (!obj) return 'error';

    if (obj.id === 'key') {
      if (!obj.collected) {
        obj.collected = true;
        this.inventory.add('key');
        this.notifyChange();
        return 'keyFound';
      }
    }

    if (obj.id === 'flower') {
      return 'flowerFound';
    }

    if (obj.id === 'door') {
      if (this.inventory.has('key')) {
        this.gameWon = true;
        return 'open';
      } else {
        return 'locked';
      }
    }

    return 'empty';
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }
}
