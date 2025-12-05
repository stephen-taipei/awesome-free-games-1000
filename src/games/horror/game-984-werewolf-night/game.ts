import { translations } from './i18n';

export class Game {
  private health: number = 100;
  private safety: number = 50;
  private silver: number = 0;
  private wolfsbane: number = 0;
  private traps: number = 0;
  private hour: number = 21; // 9 PM
  private isRunning: boolean = false;
  private werewolfAttacking: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private werewolfLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onWerewolfState: ((attacking: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.safety = 50;
    this.silver = 1;
    this.wolfsbane = 0;
    this.traps = 0;
    this.hour = 21;
    this.isRunning = true;
    this.werewolfAttacking = false;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Time passes
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      // Safety decays
      this.safety = Math.max(0, this.safety - 0.5);

      // Hour advances every 10 seconds
    }, 100);

    // Hour advancement
    setInterval(() => {
      if (!this.isRunning) return;
      this.advanceHour();
    }, 10000);

    // Werewolf attacks
    this.werewolfLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.werewolfBehavior();
    }, 3000);
  }

  private advanceHour() {
    this.hour++;
    if (this.hour >= 24) this.hour = 0;

    const t = translations[this.locale].game.msgs;

    if (this.hour === 0) {
      this.showMessage(t.midnight, 'warning');
    } else if (this.hour === 6) {
      this.showMessage(t.dawn, 'success');
      this.endGame(true);
    }

    this.notifyChange();
  }

  private werewolfBehavior() {
    // Attack chance increases as safety drops and during midnight
    let attackChance = (100 - this.safety) / 200;
    if (this.hour === 0) attackChance += 0.2;

    if (Math.random() < attackChance && !this.werewolfAttacking) {
      this.startAttack();
    }
  }

  private startAttack() {
    this.werewolfAttacking = true;
    this.showMessage(translations[this.locale].game.msgs.werewolfAttack, 'danger');
    if (this.onWerewolfState) this.onWerewolfState(true);
    this.notifyChange();

    // Deal damage over time
    const attackInterval = setInterval(() => {
      if (!this.isRunning || !this.werewolfAttacking) {
        clearInterval(attackInterval);
        return;
      }

      this.health -= 5;

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(attackInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    // Attack ends after some time if not repelled
    setTimeout(() => {
      if (this.werewolfAttacking) {
        this.werewolfAttacking = false;
        if (this.onWerewolfState) this.onWerewolfState(false);
        this.showMessage(translations[this.locale].game.msgs.werewolfRetreats, '');
        this.notifyChange();
      }
    }, 5000);
  }

  search() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;
    const roll = Math.random();

    if (roll < 0.3) {
      this.silver++;
      this.showMessage(t.foundSilver, 'success');
    } else if (roll < 0.5) {
      this.wolfsbane++;
      this.showMessage(t.foundWolfsbane, 'success');
    } else if (roll < 0.65) {
      this.traps++;
      this.showMessage(t.foundTrap, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    // Searching lowers safety
    this.safety = Math.max(0, this.safety - 10);
    this.notifyChange();
  }

  barricade() {
    if (!this.isRunning) return;

    this.safety = Math.min(100, this.safety + 25);
    this.showMessage(translations[this.locale].game.msgs.barricaded, 'success');
    this.notifyChange();
  }

  attack() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (!this.werewolfAttacking) {
      this.showMessage(t.noTarget, '');
      return;
    }

    if (this.silver <= 0) {
      this.showMessage(t.noSilver, 'warning');
      return;
    }

    this.silver--;
    this.werewolfAttacking = false;
    if (this.onWerewolfState) this.onWerewolfState(false);
    this.showMessage(t.werewolfHit, 'success');
    this.safety = Math.min(100, this.safety + 15);
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.werewolfLoop) clearInterval(this.werewolfLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.survived : t.died, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      health: this.health,
      safety: this.safety,
      silver: this.silver,
      wolfsbane: this.wolfsbane,
      traps: this.traps,
      hour: this.hour,
      isRunning: this.isRunning,
      werewolfAttacking: this.werewolfAttacking
    };
  }

  getTimeString(): string {
    const h = this.hour % 12 || 12;
    const ampm = this.hour >= 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnWerewolfState(cb: (attacking: boolean) => void) { this.onWerewolfState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
