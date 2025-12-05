import { translations } from './i18n';

export class Game {
  private power: number = 0;
  private stability: number = 100;
  private isRunning: boolean = false;
  private isAlive: boolean = false;
  private chargeCount: number = 0;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onEffect: ((type: string) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.power = 0;
    this.stability = 100;
    this.isRunning = true;
    this.isAlive = false;
    this.chargeCount = 0;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Stability decay
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      // Power slowly drains
      if (this.power > 0) {
        this.power = Math.max(0, this.power - 0.5);
      }

      // High power causes stability issues
      if (this.power > 70) {
        this.stability -= 0.5;
      }

      // Check failure
      if (this.stability <= 0) {
        this.endGame(false);
        return;
      }

      this.notifyChange();
    }, 100);
  }

  charge() {
    if (!this.isRunning) return;

    this.power = Math.min(100, this.power + 15);
    this.stability -= 3;
    this.chargeCount++;

    if (this.onEffect) this.onEffect('charge');

    const t = translations[this.locale].game.msgs;
    if (this.power >= 80) {
      this.showMessage(t.powerHigh, 'warning');
    } else if (this.power >= 50) {
      this.showMessage(t.powerRising, '');
    } else {
      this.showMessage(t.charging, '');
    }

    this.notifyChange();
  }

  stabilize() {
    if (!this.isRunning) return;

    this.stability = Math.min(100, this.stability + 20);
    this.power = Math.max(0, this.power - 5);

    if (this.onEffect) this.onEffect('stabilize');
    this.showMessage(translations[this.locale].game.msgs.stabilized, 'success');
    this.notifyChange();
  }

  shock() {
    if (!this.isRunning) return;
    if (this.power < 80) {
      this.showMessage(translations[this.locale].game.msgs.needMorePower, 'warning');
      return;
    }

    if (this.onEffect) this.onEffect('shock');

    const t = translations[this.locale].game.msgs;

    // Success chance based on stability
    const successChance = this.stability / 100;

    if (Math.random() < successChance) {
      this.isAlive = true;
      this.showMessage(t.itsAlive, 'success');
      this.endGame(true);
    } else {
      this.stability -= 30;
      this.power = 0;
      this.showMessage(t.failed, 'danger');

      if (this.stability <= 0) {
        this.endGame(false);
      }
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);

    const t = translations[this.locale].game.msgs;
    if (!win) {
      this.showMessage(t.explosion, 'danger');
    }

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      power: this.power,
      stability: this.stability,
      isRunning: this.isRunning,
      isAlive: this.isAlive,
      chargeCount: this.chargeCount
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnEffect(cb: (type: string) => void) { this.onEffect = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
