import { translations } from './i18n';

interface Realm {
  id: string;
  exits: string[];
  dangerous: boolean;
}

export class Game {
  private consciousness: number = 100;
  private wakeEnergy: number = 0;
  private currentRealm: string = 'mist';
  private nightmareRealm: string = 'void';
  private isRunning: boolean = false;
  private nightmareAttacking: boolean = false;
  private shieldActive: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private realms: Map<string, Realm> = new Map();
  private nightmareLoop: number | null = null;
  private wakeLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onNightmareState: ((attacking: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initRealms();
  }

  private initRealms() {
    this.realms.set('mist', { id: 'mist', exits: ['mirrors', 'falling', 'chase'], dangerous: false });
    this.realms.set('mirrors', { id: 'mirrors', exits: ['mist', 'teeth'], dangerous: true });
    this.realms.set('falling', { id: 'falling', exits: ['mist', 'water'], dangerous: true });
    this.realms.set('chase', { id: 'chase', exits: ['mist', 'void'], dangerous: true });
    this.realms.set('teeth', { id: 'teeth', exits: ['mirrors', 'gate'], dangerous: true });
    this.realms.set('water', { id: 'water', exits: ['falling', 'void'], dangerous: true });
    this.realms.set('void', { id: 'void', exits: ['chase', 'water', 'gate'], dangerous: true });
    this.realms.set('gate', { id: 'gate', exits: [], dangerous: false });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.consciousness = 100;
    this.wakeEnergy = 0;
    this.currentRealm = 'mist';
    this.nightmareRealm = 'void';
    this.isRunning = true;
    this.nightmareAttacking = false;
    this.shieldActive = false;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Nightmare behavior
    this.nightmareLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.nightmareBehavior();
    }, 5000);

    // Wake energy builds over time
    this.wakeLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.buildWakeEnergy();
    }, 2000);
  }

  private nightmareBehavior() {
    // Move nightmare
    const nightmareRealmData = this.realms.get(this.nightmareRealm);
    if (nightmareRealmData && nightmareRealmData.exits.length > 0) {
      const exits = nightmareRealmData.exits.filter(e => e !== 'gate');
      if (exits.length > 0 && Math.random() < 0.5) {
        this.nightmareRealm = exits[Math.floor(Math.random() * exits.length)];
      }
    }

    // Check if in same realm
    if (this.nightmareRealm === this.currentRealm) {
      this.startNightmareAttack();
    } else {
      // Check if adjacent
      const currentRealmData = this.realms.get(this.currentRealm);
      if (currentRealmData && currentRealmData.exits.includes(this.nightmareRealm)) {
        this.showMessage(translations[this.locale].game.msgs.nightmareNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private startNightmareAttack() {
    if (this.shieldActive) {
      this.shieldActive = false;
      this.showMessage(translations[this.locale].game.msgs.shieldUsed, 'success');
      this.moveNightmareAway();
      return;
    }

    this.nightmareAttacking = true;
    this.showMessage(translations[this.locale].game.msgs.nightmareAttack, 'danger');
    if (this.onNightmareState) this.onNightmareState(true);

    // Drain consciousness
    const attackInterval = setInterval(() => {
      if (!this.isRunning || !this.nightmareAttacking) {
        clearInterval(attackInterval);
        return;
      }

      this.consciousness -= 5;
      this.wakeEnergy = Math.max(0, this.wakeEnergy - 2);

      if (this.consciousness <= 0) {
        this.consciousness = 0;
        clearInterval(attackInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    // Attack ends after time
    setTimeout(() => {
      if (this.nightmareAttacking) {
        this.nightmareAttacking = false;
        if (this.onNightmareState) this.onNightmareState(false);
        this.showMessage(translations[this.locale].game.msgs.nightmareGone, '');
        this.moveNightmareAway();
        this.notifyChange();
      }
    }, 4000);
  }

  private moveNightmareAway() {
    const farRealms = ['void', 'water', 'chase'].filter(r => r !== this.currentRealm);
    this.nightmareRealm = farRealms[Math.floor(Math.random() * farRealms.length)];
  }

  private buildWakeEnergy() {
    if (this.wakeEnergy < 100) {
      this.wakeEnergy = Math.min(100, this.wakeEnergy + 3);

      if (this.wakeEnergy >= 100) {
        this.showMessage(translations[this.locale].game.msgs.wakeProgress, 'success');
      }
    }
    this.notifyChange();
  }

  moveTo(realmId: string) {
    if (!this.isRunning || this.nightmareAttacking) return;

    const currentRealmData = this.realms.get(this.currentRealm);
    if (!currentRealmData || !currentRealmData.exits.includes(realmId)) return;

    const t = translations[this.locale].game.msgs;

    // Gate requires full wake energy
    if (realmId === 'gate') {
      if (this.wakeEnergy >= 100) {
        this.endGame(true);
      } else {
        this.showMessage(t.gateLocked, 'warning');
      }
      return;
    }

    this.currentRealm = realmId;

    // Dangerous realms drain consciousness
    const targetRealm = this.realms.get(realmId);
    if (targetRealm && targetRealm.dangerous) {
      this.consciousness = Math.max(0, this.consciousness - 5);
    }

    this.notifyChange();

    // Check for nightmare
    if (this.nightmareRealm === this.currentRealm && !this.nightmareAttacking) {
      setTimeout(() => this.startNightmareAttack(), 500);
    }
  }

  focus() {
    if (!this.isRunning || this.nightmareAttacking) return;

    this.showMessage(translations[this.locale].game.msgs.focusing, '');
    this.consciousness = Math.min(100, this.consciousness + 15);
    this.showMessage(translations[this.locale].game.msgs.focusGain, 'success');
    this.notifyChange();
  }

  confront() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (!this.nightmareAttacking) {
      return;
    }

    // 50% chance to succeed
    if (Math.random() < 0.5) {
      this.nightmareAttacking = false;
      if (this.onNightmareState) this.onNightmareState(false);
      this.showMessage(t.confronted, 'success');
      this.wakeEnergy = Math.min(100, this.wakeEnergy + 20);
      this.moveNightmareAway();
    } else {
      this.consciousness -= 15;
      this.showMessage(t.confrontFail, 'danger');
      if (this.consciousness <= 0) {
        this.consciousness = 0;
        this.endGame(false);
      }
    }

    this.notifyChange();
  }

  usePowerFly() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.consciousness < 20) {
      this.showMessage(t.noConsciousness, 'warning');
      return;
    }

    this.consciousness -= 20;

    if (this.nightmareAttacking) {
      this.nightmareAttacking = false;
      if (this.onNightmareState) this.onNightmareState(false);
      this.moveNightmareAway();
    }

    // Move to safe realm
    this.currentRealm = 'mist';
    this.showMessage(t.flyUsed, 'success');
    this.notifyChange();
  }

  usePowerShield() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.consciousness < 25) {
      this.showMessage(t.noConsciousness, 'warning');
      return;
    }

    this.consciousness -= 25;
    this.shieldActive = true;
    this.showMessage(t.shieldUsed, 'success');
    this.notifyChange();
  }

  usePowerWake() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.consciousness < 50 || this.wakeEnergy < 50) {
      this.showMessage(t.noConsciousness, 'warning');
      return;
    }

    this.endGame(true);
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.nightmareLoop) clearInterval(this.nightmareLoop);
    if (this.wakeLoop) clearInterval(this.wakeLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.awakened : t.lost, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getCurrentRealm() {
    return this.realms.get(this.currentRealm);
  }

  getRealmName(realmId: string): string {
    return (translations[this.locale].game.realms as any)[realmId] || realmId;
  }

  getStats() {
    return {
      consciousness: this.consciousness,
      wakeEnergy: this.wakeEnergy,
      currentRealm: this.currentRealm,
      isRunning: this.isRunning,
      nightmareAttacking: this.nightmareAttacking,
      shieldActive: this.shieldActive
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnNightmareState(cb: (attacking: boolean) => void) { this.onNightmareState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
