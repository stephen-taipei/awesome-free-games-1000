import { translations } from './i18n';

export class Game {
  private sanity: number = 100;
  private isRunning: boolean = false;
  private isLooking: boolean = true;
  private isDollActive: boolean = false;
  private score: number = 0;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private dollActiveTimeout: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((key: string) => void) | null = null;
  private onDollStateChange: ((active: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.sanity = 100;
    this.score = 0;
    this.isRunning = true;
    this.isLooking = true;
    this.isDollActive = false;

    this.log('start');
    this.notifyChange();

    this.scheduleDollActivity();

    // Game loop - check state
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      // If looking at active doll, lose sanity fast
      if (this.isDollActive && this.isLooking) {
        this.sanity -= 5;
        this.log('caught');
      }

      // Slowly recover sanity when safe
      if (!this.isDollActive && this.isLooking) {
        this.sanity = Math.min(100, this.sanity + 0.5);
      }

      // Not looking slightly drains sanity (tension)
      if (!this.isLooking) {
        this.sanity -= 0.2;
      }

      if (this.sanity <= 0) {
        this.sanity = 0;
        this.endGame(false);
      }

      this.notifyChange();
    }, 100);
  }

  private scheduleDollActivity() {
    if (!this.isRunning) return;

    // Random delay before doll becomes active
    const delay = 2000 + Math.random() * 4000;

    this.dollActiveTimeout = window.setTimeout(() => {
      if (!this.isRunning) return;

      this.activateDoll();
    }, delay);
  }

  private activateDoll() {
    this.isDollActive = true;
    this.log('dollActive');
    if (this.onDollStateChange) this.onDollStateChange(true);
    this.notifyChange();

    // Doll stays active for a random duration
    const duration = 1500 + Math.random() * 2000;

    setTimeout(() => {
      if (!this.isRunning) return;

      this.isDollActive = false;
      this.score++;
      this.log('survived');
      if (this.onDollStateChange) this.onDollStateChange(false);
      this.notifyChange();

      // Check win condition
      if (this.score >= 10) {
        this.endGame(true);
      } else {
        this.scheduleDollActivity();
      }
    }, duration);
  }

  setLooking(looking: boolean) {
    this.isLooking = looking;
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.dollActiveTimeout) clearTimeout(this.dollActiveTimeout);

    this.log(win ? 'win' : 'lose');
    this.notifyChange();
  }

  getStats() {
    return {
      sanity: this.sanity,
      isRunning: this.isRunning,
      isLooking: this.isLooking,
      isDollActive: this.isDollActive,
      score: this.score
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  setOnDollStateChange(cb: (active: boolean) => void) {
    this.onDollStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}
