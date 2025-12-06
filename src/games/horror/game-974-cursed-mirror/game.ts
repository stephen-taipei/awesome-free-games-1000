import { translations } from './i18n';

export class Game {
  private integrity: number = 100;
  private sanity: number = 100;
  private sealsComplete: number = 0;
  private isRunning: boolean = false;
  private isDesync: boolean = false;
  private isAttacking: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private attackLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onMirrorState: ((state: 'normal' | 'desync' | 'attack') => void) | null = null;
  private onSealChange: ((index: number, sealed: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.integrity = 100;
    this.sanity = 100;
    this.sealsComplete = 0;
    this.isRunning = true;
    this.isDesync = false;
    this.isAttacking = false;

    // Reset seals visually
    for (let i = 0; i < 5; i++) {
      if (this.onSealChange) this.onSealChange(i, false);
    }

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Main game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.tick();
    }, 2000);
  }

  private tick() {
    const t = translations[this.locale].game.msgs;

    // Random events
    const roll = Math.random();

    if (roll < 0.25 && !this.isAttacking) {
      // Reflection desyncs
      this.isDesync = true;
      if (this.onMirrorState) this.onMirrorState('desync');
      this.showMessage(t.desync, 'warning');
      this.sanity = Math.max(0, this.sanity - 5);
    } else if (roll < 0.4 && !this.isAttacking) {
      // Start attack
      this.startAttack();
    } else if (!this.isDesync && !this.isAttacking) {
      // Passive sanity drain
      this.sanity = Math.max(0, this.sanity - 2);
    }

    // Check sanity
    if (this.sanity <= 30 && this.sanity > 28) {
      this.showMessage(t.sanityLow, 'danger');
    }

    // Low sanity increases attack chance
    if (this.sanity < 30 && Math.random() < 0.4 && !this.isAttacking) {
      this.startAttack();
    }

    this.checkGameEnd();
    this.notifyChange();
  }

  private startAttack() {
    if (this.isAttacking) return;

    const t = translations[this.locale].game.msgs;
    this.isAttacking = true;
    this.isDesync = false;
    if (this.onMirrorState) this.onMirrorState('attack');
    this.showMessage(t.attack, 'danger');

    this.attackLoop = window.setInterval(() => {
      if (!this.isRunning || !this.isAttacking) {
        if (this.attackLoop) clearInterval(this.attackLoop);
        return;
      }

      this.integrity = Math.max(0, this.integrity - 8);
      this.sanity = Math.max(0, this.sanity - 3);

      if (this.integrity <= 30 && this.integrity > 25) {
        this.showMessage(translations[this.locale].game.msgs.cracked, 'danger');
      }

      this.checkGameEnd();
      this.notifyChange();
    }, 600);

    // Attack lasts 4 seconds if not stopped
    setTimeout(() => {
      if (this.isAttacking) {
        this.stopAttack();
      }
    }, 4000);
  }

  private stopAttack() {
    this.isAttacking = false;
    if (this.attackLoop) {
      clearInterval(this.attackLoop);
      this.attackLoop = null;
    }
    if (this.onMirrorState) this.onMirrorState('normal');
  }

  reinforce() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.isAttacking) {
      // Harder to reinforce during attack
      if (Math.random() < 0.4) {
        this.stopAttack();
        this.integrity = Math.min(100, this.integrity + 15);
        this.showMessage(t.reinforce, 'success');
      } else {
        this.integrity = Math.max(0, this.integrity - 5);
        this.showMessage(t.reinforceFail, 'danger');
      }
    } else {
      this.integrity = Math.min(100, this.integrity + 20);
      this.isDesync = false;
      if (this.onMirrorState) this.onMirrorState('normal');
      this.showMessage(t.reinforce, 'success');
    }

    this.checkGameEnd();
    this.notifyChange();
  }

  resist() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (Math.random() < 0.6 + (this.sanity / 200)) {
      this.sanity = Math.min(100, this.sanity + 15);
      this.isDesync = false;
      if (this.onMirrorState) this.onMirrorState('normal');
      this.showMessage(t.resist, 'success');
    } else {
      this.sanity = Math.max(0, this.sanity - 10);
      this.showMessage(t.resistFail, 'danger');
    }

    this.notifyChange();
  }

  castSeal() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    // Need enough sanity and not during heavy attack
    const successChance = (this.sanity / 100) * (this.isAttacking ? 0.3 : 0.7);

    if (Math.random() < successChance) {
      if (this.onSealChange) this.onSealChange(this.sealsComplete, true);
      this.sealsComplete++;
      this.stopAttack();
      this.isDesync = false;
      if (this.onMirrorState) this.onMirrorState('normal');
      this.showMessage(t.sealCast, 'success');

      // Sealing restores some sanity
      this.sanity = Math.min(100, this.sanity + 10);
    } else {
      this.sanity = Math.max(0, this.sanity - 15);
      this.showMessage(t.sealFail, 'warning');
    }

    this.checkGameEnd();
    this.notifyChange();
  }

  private checkGameEnd() {
    if (!this.isRunning) return;

    if (this.sealsComplete >= 5) {
      this.endGame(true);
    } else if (this.integrity <= 0 || this.sanity <= 0) {
      this.endGame(false);
    }
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.attackLoop) clearInterval(this.attackLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.sealed : t.escaped, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      integrity: this.integrity,
      sanity: this.sanity,
      sealsComplete: this.sealsComplete,
      isRunning: this.isRunning,
      isDesync: this.isDesync,
      isAttacking: this.isAttacking
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnMirrorState(cb: (state: 'normal' | 'desync' | 'attack') => void) { this.onMirrorState = cb; }
  setOnSealChange(cb: (index: number, sealed: boolean) => void) { this.onSealChange = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
