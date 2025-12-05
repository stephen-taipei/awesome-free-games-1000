import { translations } from './i18n';

export class Game {
  private distance: number = 0;
  private exitDistance: number = 100;
  private stamina: number = 100;
  private torch: number = 100;
  private treasures: number = 0;
  private mummyDistance: number = -20;
  private isRunning: boolean = false;
  private isHiding: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private mummyLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onTreasureCollect: (() => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.distance = 0;
    this.stamina = 100;
    this.torch = 100;
    this.treasures = 0;
    this.mummyDistance = -20;
    this.isRunning = true;
    this.isHiding = false;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Main loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      this.torch -= 0.2;
      this.stamina = Math.min(100, this.stamina + 0.3);

      if (this.torch <= 0) {
        this.torch = 0;
        this.showMessage(translations[this.locale].game.msgs.torchOut, 'danger');
      }

      this.notifyChange();
    }, 100);

    // Mummy chase
    this.mummyLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.updateMummy();
    }, 500);

    // Spawn treasures
    setTimeout(() => this.spawnTreasure(), 2000);
  }

  private updateMummy() {
    if (this.isHiding) {
      this.mummyDistance -= 2;
    } else {
      // Mummy speed increases as torch dims
      const speed = 3 + (1 - this.torch / 100) * 3;
      this.mummyDistance += speed;
    }

    const t = translations[this.locale].game.msgs;

    if (this.mummyDistance >= this.distance) {
      this.endGame(false);
      return;
    }

    const gap = this.distance - this.mummyDistance;
    if (gap < 15) {
      this.showMessage(t.mummyClose, 'danger');
    } else if (gap < 30) {
      this.showMessage(t.mummyNear, 'warning');
    }

    this.notifyChange();
  }

  private spawnTreasure() {
    if (!this.isRunning) return;
    if (this.onTreasureCollect) this.onTreasureCollect();
    setTimeout(() => this.spawnTreasure(), 3000 + Math.random() * 2000);
  }

  walk() {
    if (!this.isRunning || this.isHiding) return;

    this.distance += 5;
    this.checkProgress();
    this.notifyChange();
  }

  run() {
    if (!this.isRunning || this.isHiding) return;
    if (this.stamina < 20) {
      this.showMessage(translations[this.locale].game.msgs.tooTired, 'warning');
      return;
    }

    this.distance += 12;
    this.stamina -= 15;
    this.checkProgress();
    this.notifyChange();
  }

  hide() {
    if (!this.isRunning) return;

    this.isHiding = true;
    this.showMessage(translations[this.locale].game.msgs.hiding, '');
    this.notifyChange();

    setTimeout(() => {
      if (!this.isRunning) return;
      this.isHiding = false;
      this.showMessage(translations[this.locale].game.msgs.continueRun, '');
      this.notifyChange();
    }, 3000);
  }

  collectTreasure() {
    if (!this.isRunning) return;
    this.treasures++;
    this.torch = Math.min(100, this.torch + 15);
    this.showMessage(translations[this.locale].game.msgs.treasureFound, 'success');
    this.notifyChange();
  }

  private checkProgress() {
    if (this.distance >= this.exitDistance) {
      this.endGame(true);
    }
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.mummyLoop) clearInterval(this.mummyLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.caught, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      distance: this.distance,
      exitDistance: this.exitDistance,
      stamina: this.stamina,
      torch: this.torch,
      treasures: this.treasures,
      mummyDistance: this.mummyDistance,
      isRunning: this.isRunning,
      isHiding: this.isHiding,
      mummyNear: (this.distance - this.mummyDistance) < 30
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnTreasureCollect(cb: () => void) { this.onTreasureCollect = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
