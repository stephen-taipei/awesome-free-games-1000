import { translations } from './i18n';

export class Game {
  private depth: number = 0;
  private maxDepth: number = 3000;
  private targetDepth: number = 2500;
  private power: number = 100;
  private hull: number = 100;
  private oxygen: number = 100;
  private lightsOn: boolean = true;
  private isRunning: boolean = false;
  private creatureDistance: number = 100;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private creatureLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onCreatureEvent: ((type: string) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.depth = 0;
    this.power = 100;
    this.hull = 100;
    this.oxygen = 100;
    this.lightsOn = true;
    this.isRunning = true;
    this.creatureDistance = 100;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Main game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      // Resource consumption
      this.oxygen -= 0.15;
      this.power -= this.lightsOn ? 0.2 : 0.05;

      // Pressure damage at deep depths
      if (this.depth > 2000) {
        this.hull -= 0.1;
      }

      // Check game over
      if (this.oxygen <= 0 || this.hull <= 0 || this.power <= 0) {
        this.endGame(false);
        return;
      }

      // Win condition
      if (this.depth >= this.targetDepth) {
        this.showMessage(translations[this.locale].game.msgs.targetReached, 'success');
        this.endGame(true);
        return;
      }

      this.notifyChange();
    }, 100);

    // Creature behavior
    this.creatureLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.updateCreature();
    }, 2000);
  }

  private updateCreature() {
    // Creature attracted to lights
    if (this.lightsOn && this.depth > 500) {
      this.creatureDistance -= 15;
    } else {
      this.creatureDistance += 5;
    }

    this.creatureDistance = Math.max(0, Math.min(100, this.creatureDistance));

    const t = translations[this.locale].game.msgs;

    if (this.creatureDistance <= 0) {
      this.showMessage(t.creatureAttack, 'danger');
      this.hull -= 30;
      this.creatureDistance = 50;
      if (this.onCreatureEvent) this.onCreatureEvent('attack');
    } else if (this.creatureDistance < 30) {
      this.showMessage(t.creatureClose, 'warning');
      if (this.onCreatureEvent) this.onCreatureEvent('close');
    } else if (this.creatureDistance < 60) {
      this.showMessage(t.creatureNear, 'warning');
      if (this.onCreatureEvent) this.onCreatureEvent('near');
    }

    this.notifyChange();
  }

  descend() {
    if (!this.isRunning) return;
    if (this.depth >= this.maxDepth) return;

    this.depth += 50;
    this.power -= 2;

    if (this.depth > 1000) {
      this.showMessage(translations[this.locale].game.msgs.deepWater, '');
    }
    if (this.depth > 2000) {
      this.showMessage(translations[this.locale].game.msgs.extremeDepth, 'warning');
    }

    this.notifyChange();
  }

  ascend() {
    if (!this.isRunning) return;
    if (this.depth <= 0) return;

    this.depth = Math.max(0, this.depth - 50);
    this.power -= 1;
    this.notifyChange();
  }

  toggleLights() {
    if (!this.isRunning) return;

    this.lightsOn = !this.lightsOn;
    const t = translations[this.locale].game.msgs;
    this.showMessage(this.lightsOn ? t.lightsOn : t.lightsOff, '');
    this.notifyChange();
  }

  sonarPing() {
    if (!this.isRunning) return;

    this.power -= 5;
    const t = translations[this.locale].game.msgs;

    if (this.creatureDistance < 50) {
      this.showMessage(t.sonarContact, 'danger');
    } else {
      this.showMessage(t.sonarClear, 'success');
    }

    if (this.onCreatureEvent) this.onCreatureEvent('sonar');
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.creatureLoop) clearInterval(this.creatureLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.win : t.lose, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      depth: this.depth,
      targetDepth: this.targetDepth,
      power: this.power,
      hull: this.hull,
      oxygen: this.oxygen,
      lightsOn: this.lightsOn,
      isRunning: this.isRunning,
      creatureDistance: this.creatureDistance
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnCreatureEvent(cb: (type: string) => void) { this.onCreatureEvent = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
