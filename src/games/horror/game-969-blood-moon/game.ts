import { translations } from './i18n';

type MoonPhase = 'new' | 'waxing' | 'full' | 'blood';

export class Game {
  private health: number = 100;
  private curse: number = 0;
  private moonPower: number = 50;
  private silver: number = 0;
  private wolfsbane: number = 0;
  private cures: number = 0;
  private villagersAlive: number = 5;
  private wolfHealth: number = 100;
  private moonPhase: MoonPhase = 'full';
  private phaseIndex: number = 0;
  private wolfState: 'hidden' | 'prowling' | 'attacking' | 'defeated' = 'hidden';
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private phaseLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onWolfState: ((state: string) => void) | null = null;
  private onVillagerDeath: ((index: number) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.curse = 0;
    this.moonPower = 50;
    this.silver = 2;
    this.wolfsbane = 2;
    this.cures = 1;
    this.villagersAlive = 5;
    this.wolfHealth = 100;
    this.moonPhase = 'full';
    this.phaseIndex = 0;
    this.wolfState = 'prowling';
    this.isRunning = true;

    if (this.onWolfState) this.onWolfState('prowling');
    this.showMessage(translations[this.locale].game.msgs.start, 'danger');
    this.notifyChange();

    // Wolf behavior loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.wolfBehavior();
    }, 3000);

    // Moon phase changes
    this.phaseLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.changeMoonPhase();
    }, 15000);
  }

  private changeMoonPhase() {
    const phases: MoonPhase[] = ['new', 'waxing', 'full', 'blood'];
    this.phaseIndex = (this.phaseIndex + 1) % phases.length;
    this.moonPhase = phases[this.phaseIndex];

    const t = translations[this.locale].game.msgs;

    if (this.moonPhase === 'blood') {
      this.showMessage(t.bloodMoon, 'danger');
      this.moonPower = 100;
    } else {
      this.showMessage(t.moonPhase, 'warning');
      this.moonPower = this.moonPhase === 'full' ? 80 : this.moonPhase === 'waxing' ? 50 : 20;
    }

    // Dawn after full cycle
    if (this.phaseIndex === 0 && this.wolfHealth > 0) {
      // Continue until wolf is defeated or player loses
    }

    this.notifyChange();
  }

  private wolfBehavior() {
    const t = translations[this.locale].game.msgs;

    if (this.wolfState === 'defeated') return;

    // Wolf strength based on moon
    const wolfStrength = this.moonPower / 100;

    // Curse grows during blood moon
    if (this.moonPhase === 'blood') {
      this.curse = Math.min(100, this.curse + 10);
    } else {
      this.curse = Math.min(100, this.curse + 3);
    }

    if (this.curse >= 70 && this.curse < 75) {
      this.showMessage(t.curseHigh, 'danger');
    }

    if (this.curse >= 100) {
      this.endGame(false, 'transformed');
      return;
    }

    // Wolf attacks
    if (Math.random() < 0.3 + wolfStrength * 0.3) {
      this.wolfState = 'attacking';
      if (this.onWolfState) this.onWolfState('attacking');
      this.showMessage(t.wolfAttack, 'danger');

      // Attack player or villager
      if (Math.random() < 0.5) {
        this.health = Math.max(0, this.health - (15 + Math.floor(wolfStrength * 15)));
        this.curse = Math.min(100, this.curse + 10);
      } else if (this.villagersAlive > 0) {
        this.villagersAlive--;
        if (this.onVillagerDeath) this.onVillagerDeath(this.villagersAlive);
        this.showMessage(t.villagerDead, 'danger');
      }

      setTimeout(() => {
        if (this.wolfState === 'attacking' && this.isRunning) {
          this.wolfState = 'prowling';
          if (this.onWolfState) this.onWolfState('prowling');
        }
      }, 1500);

      if (this.health <= 0) {
        this.endGame(false, 'killed');
      }
    } else {
      this.wolfState = 'prowling';
      if (this.onWolfState) this.onWolfState('prowling');
    }

    // Random item find
    if (Math.random() < 0.15) {
      const roll = Math.random();
      if (roll < 0.4) {
        this.silver++;
      } else if (roll < 0.7) {
        this.wolfsbane++;
      } else {
        this.cures++;
      }
    }

    this.notifyChange();
  }

  hunt() {
    if (!this.isRunning || this.wolfState === 'defeated') return;

    const t = translations[this.locale].game.msgs;

    if (this.silver <= 0) {
      this.showMessage(t.huntNoSilver, 'warning');
      return;
    }

    this.silver--;
    this.showMessage(t.hunting, '');

    const hitChance = 0.4 + (this.moonPhase === 'new' ? 0.3 : 0);

    setTimeout(() => {
      if (Math.random() < hitChance) {
        const damage = 25 + Math.floor(Math.random() * 15);
        this.wolfHealth = Math.max(0, this.wolfHealth - damage);
        this.showMessage(t.huntHit, 'success');

        if (this.wolfHealth <= 0) {
          this.wolfState = 'defeated';
          if (this.onWolfState) this.onWolfState('defeated');
          this.showMessage(t.wolfDefeated, 'success');
          this.endGame(true);
        }
      } else {
        this.showMessage(t.huntMiss, 'warning');
        this.curse = Math.min(100, this.curse + 5);
      }

      this.notifyChange();
    }, 500);
  }

  protect() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;
    this.showMessage(t.protecting, '');

    // Protection reduces wolf attack chance
    if (this.wolfState === 'attacking') {
      if (Math.random() < 0.6) {
        this.wolfState = 'prowling';
        if (this.onWolfState) this.onWolfState('prowling');
        this.showMessage(t.protectSuccess, 'success');
      } else {
        this.showMessage(t.protectFail, 'danger');
        this.health = Math.max(0, this.health - 10);
      }
    } else {
      this.showMessage(t.protectSuccess, 'success');
    }

    this.notifyChange();
  }

  cure() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.wolfsbane > 0) {
      this.wolfsbane--;
      this.curse = Math.max(0, this.curse - 25);
      this.showMessage(t.cureSuccess, 'success');
    } else if (this.cures > 0) {
      this.cures--;
      this.curse = Math.max(0, this.curse - 40);
      this.health = Math.min(100, this.health + 20);
      this.showMessage(t.cureSuccess, 'success');
    } else {
      this.showMessage(t.cureFail, 'warning');
    }

    this.notifyChange();
  }

  private endGame(win: boolean, reason?: string) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.phaseLoop) clearInterval(this.phaseLoop);

    const t = translations[this.locale].game.msgs;
    let message = win ? t.survived : t.defeat;
    if (reason === 'transformed') {
      message = t.transformed;
    }

    this.showMessage(message, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getMoonPhaseName(): string {
    return (translations[this.locale].game.phases as any)[this.moonPhase];
  }

  getMoonEmoji(): string {
    switch (this.moonPhase) {
      case 'new': return '🌑';
      case 'waxing': return '🌓';
      case 'full': return '🌕';
      case 'blood': return '🌕';
    }
  }

  getStats() {
    return {
      health: this.health,
      curse: this.curse,
      moonPower: this.moonPower,
      silver: this.silver,
      wolfsbane: this.wolfsbane,
      cures: this.cures,
      villagersAlive: this.villagersAlive,
      wolfHealth: this.wolfHealth,
      moonPhase: this.moonPhase,
      wolfState: this.wolfState,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnWolfState(cb: (state: string) => void) { this.onWolfState = cb; }
  setOnVillagerDeath(cb: (index: number) => void) { this.onVillagerDeath = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
