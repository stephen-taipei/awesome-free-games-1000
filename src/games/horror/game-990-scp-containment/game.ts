import { translations, SCP } from './i18n';

interface BreachEvent {
  scpIndex: number;
  severity: number;
}

export class Game {
  private power: number = 100;
  private containment: number = 100;
  private isRunning: boolean = false;
  private isLockdown: boolean = false;
  private scpList: SCP[] = [];
  private currentBreach: BreachEvent | null = null;
  private score: number = 0;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private breachTimeout: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onTerminalLog: ((msg: string, type: string) => void) | null = null;
  private onBreachStart: ((scp: SCP) => void) | null = null;
  private onBreachEnd: (() => void) | null = null;
  private onGameEnd: ((win: boolean, score: number) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
    this.scpList = translations[locale].game.scpList;
  }

  start() {
    this.power = 100;
    this.containment = 100;
    this.isRunning = true;
    this.isLockdown = false;
    this.currentBreach = null;
    this.score = 0;

    this.log('> SYSTEM INITIALIZED', 'success');
    this.log('> MONITORING SCP CONTAINMENT...', '');
    this.notifyChange();

    this.scheduleNextBreach();

    // Main game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;

      // Power drain
      if (this.isLockdown) {
        this.power -= 0.5;
      } else {
        this.power -= 0.1;
      }

      // Containment drain during breach
      if (this.currentBreach && !this.isLockdown) {
        this.containment -= this.currentBreach.severity * 0.3;
      }

      // Power affects containment
      if (this.power < 30) {
        this.containment -= 0.2;
      }

      // Check game over conditions
      if (this.power <= 0) {
        this.power = 0;
        this.log('> CRITICAL: POWER FAILURE', 'error');
        this.endGame(false);
      }

      if (this.containment <= 0) {
        this.containment = 0;
        this.log('> CRITICAL: CONTAINMENT FAILURE', 'error');
        this.endGame(false);
      }

      // Win condition
      if (this.score >= 5) {
        this.endGame(true);
      }

      this.notifyChange();
    }, 100);
  }

  private scheduleNextBreach() {
    if (!this.isRunning) return;

    const delay = 3000 + Math.random() * 5000;

    this.breachTimeout = window.setTimeout(() => {
      if (!this.isRunning) return;
      this.triggerBreach();
    }, delay);
  }

  private triggerBreach() {
    const scpIndex = Math.floor(Math.random() * this.scpList.length);
    const scp = this.scpList[scpIndex];

    this.currentBreach = {
      scpIndex,
      severity: scp.class === 'keter' ? 3 : scp.class === 'euclid' ? 2 : 1
    };

    this.log(`> WARNING: ${scp.number} CONTAINMENT BREACH`, 'error');

    if (this.onBreachStart) {
      this.onBreachStart(scp);
    }

    this.notifyChange();
  }

  lockdown() {
    if (!this.isRunning || this.isLockdown) return;

    this.isLockdown = true;
    this.log('> FACILITY LOCKDOWN INITIATED', 'warning');
    this.notifyChange();

    // Lockdown lasts 5 seconds
    setTimeout(() => {
      if (!this.isRunning) return;
      this.isLockdown = false;
      this.log('> LOCKDOWN LIFTED', 'success');
      this.notifyChange();
    }, 5000);
  }

  restorePower() {
    if (!this.isRunning) return;
    if (this.power >= 100) return;

    this.power = Math.min(100, this.power + 30);
    this.log('> POWER RESTORED +30%', 'success');
    this.notifyChange();
  }

  recontain() {
    if (!this.isRunning || !this.currentBreach) return;

    const scp = this.scpList[this.currentBreach.scpIndex];
    const successChance = this.isLockdown ? 0.9 : 0.5;

    if (Math.random() < successChance) {
      this.log(`> ${scp.number} RECONTAINED`, 'success');
      this.score++;
      this.containment = Math.min(100, this.containment + 10);
      this.currentBreach = null;

      if (this.onBreachEnd) {
        this.onBreachEnd();
      }

      this.scheduleNextBreach();
    } else {
      this.log('> RECONTAINMENT FAILED', 'error');
      this.containment -= 10;
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.breachTimeout) clearTimeout(this.breachTimeout);

    if (win) {
      this.log('> SHIFT COMPLETE. WELL DONE.', 'success');
    } else {
      this.log('> FACILITY COMPROMISED', 'error');
    }

    if (this.onGameEnd) {
      this.onGameEnd(win, this.score);
    }

    this.notifyChange();
  }

  getStats() {
    return {
      power: this.power,
      containment: this.containment,
      isRunning: this.isRunning,
      isLockdown: this.isLockdown,
      hasBreach: this.currentBreach !== null,
      score: this.score
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnTerminalLog(cb: (msg: string, type: string) => void) {
    this.onTerminalLog = cb;
  }

  setOnBreachStart(cb: (scp: SCP) => void) {
    this.onBreachStart = cb;
  }

  setOnBreachEnd(cb: () => void) {
    this.onBreachEnd = cb;
  }

  setOnGameEnd(cb: (win: boolean, score: number) => void) {
    this.onGameEnd = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(msg: string, type: string) {
    if (this.onTerminalLog) this.onTerminalLog(msg, type);
  }
}
