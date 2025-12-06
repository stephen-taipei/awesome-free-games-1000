import { translations } from './i18n';

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export class Game {
  private sanity: number = 100;
  private light: number = 100;
  private currentHour: number = 3; // 3 AM to 6 AM
  private shadows: Set<Corner> = new Set();
  private lookingAt: Corner | null = null;
  private lightsOn: boolean = false;
  private eyesClosed: boolean = false;
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private timeLoop: number | null = null;
  private shadowLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onCornerChange: ((corner: Corner, state: 'empty' | 'shadow' | 'looking' | 'attacking') => void) | null = null;
  private onLightChange: ((on: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.sanity = 100;
    this.light = 100;
    this.currentHour = 3;
    this.shadows = new Set();
    this.lookingAt = null;
    this.lightsOn = false;
    this.eyesClosed = false;
    this.isRunning = true;

    // Reset corners
    const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];
    corners.forEach(c => {
      if (this.onCornerChange) this.onCornerChange(c, 'empty');
    });
    if (this.onLightChange) this.onLightChange(false);

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Shadow spawn loop
    this.shadowLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.shadowBehavior();
    }, 2500);

    // Game tick
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.tick();
    }, 1500);

    // Time progression
    this.timeLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.currentHour++;

      if (this.currentHour >= 6) {
        this.endGame(true);
      }

      this.notifyChange();
    }, 20000); // Each hour = 20 seconds
  }

  private tick() {
    const t = translations[this.locale].game.msgs;

    // Sanity drain from shadows
    if (!this.eyesClosed && !this.lightsOn) {
      const shadowCount = this.shadows.size;
      this.sanity = Math.max(0, this.sanity - (shadowCount * 3));
    }

    // Eyes closed reduces sanity drain but increases shadow spawn
    if (this.eyesClosed) {
      this.sanity = Math.max(0, this.sanity - 1);
    }

    // Light drains when on
    if (this.lightsOn) {
      this.light = Math.max(0, this.light - 5);

      if (this.light <= 20 && this.light > 15) {
        this.showMessage(t.lightLow, 'warning');
      }

      if (this.light <= 0) {
        this.lightsOn = false;
        if (this.onLightChange) this.onLightChange(false);
        this.showMessage(t.lightDead, 'danger');
      }
    }

    // Sanity warnings
    if (this.sanity <= 30 && this.sanity > 27) {
      this.showMessage(t.sanityLow, 'danger');
    }

    // Too many shadows = attack
    if (this.shadows.size >= 4 && !this.lightsOn) {
      this.attack();
      return;
    }

    if (this.sanity <= 0) {
      this.endGame(false);
    }

    this.notifyChange();
  }

  private shadowBehavior() {
    const t = translations[this.locale].game.msgs;
    const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];

    // Clear looked-at corner
    if (this.lookingAt && this.shadows.has(this.lookingAt)) {
      this.shadows.delete(this.lookingAt);
      if (this.onCornerChange) this.onCornerChange(this.lookingAt, 'looking');
      this.showMessage(t.shadowGone, 'success');
    }

    // Lights on clears all shadows
    if (this.lightsOn) {
      this.shadows.forEach(c => {
        if (this.onCornerChange) this.onCornerChange(c, 'empty');
      });
      this.shadows.clear();
      return;
    }

    // Spawn new shadows
    const emptyCorners = corners.filter(c => !this.shadows.has(c) && c !== this.lookingAt);

    if (emptyCorners.length > 0) {
      // More likely to spawn when eyes closed or more shadows exist
      const spawnChance = this.eyesClosed ? 0.7 : 0.4 + (this.shadows.size * 0.1);

      if (Math.random() < spawnChance) {
        const newCorner = emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
        this.shadows.add(newCorner);
        if (this.onCornerChange) this.onCornerChange(newCorner, 'shadow');

        if (this.shadows.size === 1) {
          this.showMessage(t.shadowAppear, 'warning');
        } else if (this.shadows.size >= 3) {
          this.showMessage(t.shadowMultiple, 'danger');
        }
      }
    }

    this.notifyChange();
  }

  private attack() {
    const t = translations[this.locale].game.msgs;
    this.showMessage(t.shadowAttack, 'danger');

    // Show all shadows attacking
    this.shadows.forEach(c => {
      if (this.onCornerChange) this.onCornerChange(c, 'attacking');
    });

    setTimeout(() => {
      if (this.isRunning) {
        this.endGame(false);
      }
    }, 1000);
  }

  lookAt(corner: Corner) {
    if (!this.isRunning || this.eyesClosed) return;

    // Toggle looking
    if (this.lookingAt === corner) {
      if (this.onCornerChange) this.onCornerChange(corner, this.shadows.has(corner) ? 'shadow' : 'empty');
      this.lookingAt = null;
    } else {
      // Stop looking at previous corner
      if (this.lookingAt) {
        if (this.onCornerChange) this.onCornerChange(this.lookingAt, this.shadows.has(this.lookingAt) ? 'shadow' : 'empty');
      }

      this.lookingAt = corner;
      if (this.onCornerChange) this.onCornerChange(corner, 'looking');

      // Looking at shadow dispels it
      if (this.shadows.has(corner)) {
        this.shadows.delete(corner);
        this.showMessage(translations[this.locale].game.msgs.shadowGone, 'success');
      }
    }

    this.notifyChange();
  }

  toggleLight() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.light <= 0) {
      this.showMessage(t.lightDead, 'warning');
      return;
    }

    this.lightsOn = !this.lightsOn;
    this.eyesClosed = false;

    if (this.onLightChange) this.onLightChange(this.lightsOn);

    if (this.lightsOn) {
      this.showMessage(t.lightOn, 'success');
      // Clear all shadows
      this.shadows.forEach(c => {
        if (this.onCornerChange) this.onCornerChange(c, 'empty');
      });
      this.shadows.clear();
    } else {
      this.showMessage(t.lightOff, 'warning');
    }

    this.notifyChange();
  }

  closeEyes() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    this.eyesClosed = !this.eyesClosed;
    this.lightsOn = false;
    this.lookingAt = null;

    if (this.onLightChange) this.onLightChange(false);
    this.showMessage(this.eyesClosed ? t.eyesClosed : t.eyesOpen, '');

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.timeLoop) clearInterval(this.timeLoop);
    if (this.shadowLoop) clearInterval(this.shadowLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.survived : t.consumed, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getTimeDisplay(): string {
    return `${this.currentHour}:00 AM`;
  }

  getStats() {
    return {
      sanity: this.sanity,
      light: this.light,
      currentHour: this.currentHour,
      shadowCount: this.shadows.size,
      lookingAt: this.lookingAt,
      lightsOn: this.lightsOn,
      eyesClosed: this.eyesClosed,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnCornerChange(cb: (corner: Corner, state: 'empty' | 'shadow' | 'looking' | 'attacking') => void) { this.onCornerChange = cb; }
  setOnLightChange(cb: (on: boolean) => void) { this.onLightChange = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
