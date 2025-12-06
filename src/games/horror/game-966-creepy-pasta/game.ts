import { translations } from './i18n';

export class Game {
  private courage: number = 100;
  private fear: number = 0;
  private currentPage: number = 0;
  private totalPages: number = 5;
  private isReading: boolean = false;
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private eventLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onPageChange: ((page: number, text: string) => void) | null = null;
  private onEvent: ((event: string) => void) | null = null;
  private onTextEffect: ((effect: 'normal' | 'glitch' | 'fade') => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.courage = 100;
    this.fear = 0;
    this.currentPage = 0;
    this.isReading = true;
    this.isRunning = true;

    const stories = translations[this.locale].game.stories;
    this.totalPages = stories.pages.length;

    // Show first page
    if (this.onPageChange) {
      this.onPageChange(1, stories.pages[0]);
    }

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Fear and courage loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.tick();
    }, 2000);

    // Random events
    this.eventLoop = window.setInterval(() => {
      if (!this.isRunning || !this.isReading) return;
      this.randomEvent();
    }, 4000);
  }

  private tick() {
    const t = translations[this.locale].game.msgs;

    if (this.isReading) {
      // Fear grows while reading
      this.fear = Math.min(100, this.fear + 5 + Math.floor(this.currentPage * 2));

      // Courage drains based on fear
      const courageDrain = Math.floor(this.fear / 20);
      this.courage = Math.max(0, this.courage - courageDrain);
    } else {
      // Looking away reduces fear slowly
      this.fear = Math.max(0, this.fear - 3);
      this.courage = Math.min(100, this.courage + 2);
    }

    // Warnings
    if (this.courage <= 30 && this.courage > 27) {
      this.showMessage(t.courageLow, 'warning');
    }

    if (this.fear >= 80 && this.fear < 83) {
      this.showMessage(t.fearHigh, 'danger');
    }

    // Game over conditions
    if (this.courage <= 0 || this.fear >= 100) {
      this.endGame(false);
    }

    this.notifyChange();
  }

  private randomEvent() {
    const t = translations[this.locale].game.msgs;
    const events = [
      { msg: t.event, icon: '👁️', fear: 10 },
      { msg: t.noise, icon: '👂', fear: 15 },
      { msg: t.presence, icon: '👤', fear: 12 },
      { msg: t.whisper, icon: '💀', fear: 20 }
    ];

    // More events at higher pages
    if (Math.random() < 0.4 + (this.currentPage * 0.1)) {
      const event = events[Math.floor(Math.random() * events.length)];
      this.showMessage(event.msg, 'danger');
      this.fear = Math.min(100, this.fear + event.fear);
      this.courage = Math.max(0, this.courage - 10);

      if (this.onEvent) this.onEvent(event.icon);
      if (this.onTextEffect) this.onTextEffect('glitch');

      setTimeout(() => {
        if (this.onTextEffect) this.onTextEffect('normal');
      }, 500);

      this.notifyChange();
    }
  }

  continueReading() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;
    const stories = translations[this.locale].game.stories;

    this.isReading = true;

    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      if (this.onPageChange) {
        this.onPageChange(this.currentPage + 1, stories.pages[this.currentPage]);
      }
      this.showMessage(t.reading, '');
    } else {
      // Finished the story
      this.endGame(true);
    }

    this.notifyChange();
  }

  lookAway() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    // Higher pages make it harder to look away
    if (Math.random() < 0.3 + (this.currentPage * 0.1)) {
      this.showMessage(t.lookAwayFail, 'danger');
      this.fear = Math.min(100, this.fear + 15);
      if (this.onTextEffect) this.onTextEffect('glitch');
      setTimeout(() => {
        if (this.onTextEffect) this.onTextEffect('normal');
      }, 300);
    } else {
      this.isReading = false;
      this.showMessage(t.lookAway, 'success');
      if (this.onTextEffect) this.onTextEffect('fade');
    }

    this.notifyChange();
  }

  stopReading() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    // Can only stop if courage is high enough
    if (this.courage >= 30 && this.fear < 70) {
      this.showMessage(t.stopped, 'success');
      this.endGame(true);
    } else {
      this.showMessage(t.lookAwayFail, 'danger');
      this.fear = Math.min(100, this.fear + 20);
      this.courage = Math.max(0, this.courage - 15);
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.eventLoop) clearInterval(this.eventLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.finished : t.consumed, win ? 'success' : 'danger');

    if (this.onTextEffect) this.onTextEffect('normal');
    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStoryTitle(): string {
    return translations[this.locale].game.stories.title;
  }

  getStats() {
    return {
      courage: this.courage,
      fear: this.fear,
      currentPage: this.currentPage + 1,
      totalPages: this.totalPages,
      isReading: this.isReading,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnPageChange(cb: (page: number, text: string) => void) { this.onPageChange = cb; }
  setOnEvent(cb: (event: string) => void) { this.onEvent = cb; }
  setOnTextEffect(cb: (effect: 'normal' | 'glitch' | 'fade') => void) { this.onTextEffect = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
