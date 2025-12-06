import { translations } from './i18n';

type OfferingType = 'blood' | 'bone' | 'soul';

export class Game {
  private power: number = 0;
  private control: number = 100;
  private corruption: number = 0;
  private candlesLit: number = 0;
  private selectedOffering: OfferingType | null = null;
  private usedOfferings: Set<OfferingType> = new Set();
  private demonState: 'hidden' | 'manifesting' | 'summoned' | 'bound' | 'escaped' = 'hidden';
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private corruptionLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onCandleChange: ((index: number, lit: boolean) => void) | null = null;
  private onDemonState: ((state: string) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.power = 0;
    this.control = 100;
    this.corruption = 0;
    this.candlesLit = 0;
    this.selectedOffering = null;
    this.usedOfferings = new Set();
    this.demonState = 'hidden';
    this.isRunning = true;

    // Reset candles
    for (let i = 0; i < 5; i++) {
      if (this.onCandleChange) this.onCandleChange(i, false);
    }
    if (this.onDemonState) this.onDemonState('hidden');

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Main game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.tick();
    }, 2500);

    // Corruption grows over time
    this.corruptionLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.corruption = Math.min(100, this.corruption + 2);

      if (this.corruption >= 80 && this.corruption < 83) {
        this.showMessage(translations[this.locale].game.msgs.corruptHigh, 'danger');
      }

      if (this.corruption >= 100) {
        this.endGame(false);
      }

      this.notifyChange();
    }, 3000);
  }

  private tick() {
    const t = translations[this.locale].game.msgs;

    // Demon behavior based on state
    if (this.demonState === 'summoned') {
      // Demon drains control
      this.control = Math.max(0, this.control - 8);

      if (this.control <= 30 && this.control > 25) {
        this.showMessage(t.controlLow, 'danger');
      }

      if (this.control <= 0) {
        this.demonState = 'escaped';
        if (this.onDemonState) this.onDemonState('escaped');
        this.endGame(false);
      }
    } else if (this.demonState === 'manifesting') {
      // Manifesting demon grows stronger
      this.power = Math.min(100, this.power + 5);
      this.control = Math.max(0, this.control - 3);
    }

    this.notifyChange();
  }

  chant() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.demonState === 'summoned') {
      // Chanting during summoned state is risky
      this.corruption = Math.min(100, this.corruption + 10);
      this.showMessage(t.chantFail, 'danger');
    } else {
      // Chanting builds power and lights candles
      const success = Math.random() < 0.7 + (this.control / 200);

      if (success) {
        this.power = Math.min(100, this.power + 15);
        this.showMessage(t.chantPower, 'success');

        // Light a candle
        if (this.candlesLit < 5) {
          if (this.onCandleChange) this.onCandleChange(this.candlesLit, true);
          this.candlesLit++;
        }

        // Check for manifestation
        if (this.power >= 50 && this.demonState === 'hidden') {
          this.demonState = 'manifesting';
          if (this.onDemonState) this.onDemonState('manifesting');
          this.showMessage(t.manifesting, 'warning');
        }

        // Check for full summoning
        if (this.power >= 100 && this.demonState === 'manifesting') {
          this.demonState = 'summoned';
          if (this.onDemonState) this.onDemonState('summoned');
          this.showMessage(t.summoned, 'danger');
        }
      } else {
        this.control = Math.max(0, this.control - 10);
        this.showMessage(t.chantFail, 'warning');
      }
    }

    this.notifyChange();
  }

  selectOffering(type: OfferingType) {
    if (!this.isRunning || this.usedOfferings.has(type)) return;
    this.selectedOffering = this.selectedOffering === type ? null : type;
    this.notifyChange();
  }

  offer() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (!this.selectedOffering) {
      this.showMessage(t.offerNone, 'warning');
      return;
    }

    const offering = this.selectedOffering;
    this.usedOfferings.add(offering);
    this.selectedOffering = null;

    switch (offering) {
      case 'blood':
        this.power = Math.min(100, this.power + 20);
        this.corruption = Math.min(100, this.corruption + 10);
        this.showMessage(t.offerBlood, 'warning');
        break;
      case 'bone':
        this.power = Math.min(100, this.power + 15);
        this.control = Math.min(100, this.control + 15);
        this.showMessage(t.offerBone, 'success');
        break;
      case 'soul':
        this.power = Math.min(100, this.power + 30);
        this.corruption = Math.min(100, this.corruption + 20);
        this.control = Math.max(0, this.control - 10);
        this.showMessage(t.offerSoul, 'danger');
        break;
    }

    // Light candle on offering
    if (this.candlesLit < 5) {
      if (this.onCandleChange) this.onCandleChange(this.candlesLit, true);
      this.candlesLit++;
    }

    // Check manifestation
    if (this.power >= 50 && this.demonState === 'hidden') {
      this.demonState = 'manifesting';
      if (this.onDemonState) this.onDemonState('manifesting');
      this.showMessage(t.manifesting, 'warning');
    }

    if (this.power >= 100 && this.demonState === 'manifesting') {
      this.demonState = 'summoned';
      if (this.onDemonState) this.onDemonState('summoned');
      this.showMessage(t.summoned, 'danger');
    }

    this.notifyChange();
  }

  bind() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.demonState !== 'summoned') {
      this.showMessage(t.binding, 'warning');
      return;
    }

    this.showMessage(t.binding, 'warning');

    // Binding success based on control and all candles lit
    const successChance = (this.control / 100) * (this.candlesLit === 5 ? 1.5 : 0.5);

    setTimeout(() => {
      if (Math.random() < successChance) {
        this.demonState = 'bound';
        if (this.onDemonState) this.onDemonState('bound');
        this.endGame(true);
      } else {
        this.control = Math.max(0, this.control - 20);
        this.corruption = Math.min(100, this.corruption + 15);
        this.showMessage(t.bindFail, 'danger');

        if (this.control <= 0) {
          this.demonState = 'escaped';
          if (this.onDemonState) this.onDemonState('escaped');
          this.endGame(false);
        }

        this.notifyChange();
      }
    }, 1000);
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.corruptionLoop) clearInterval(this.corruptionLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.victory : t.escaped, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      power: this.power,
      control: this.control,
      corruption: this.corruption,
      candlesLit: this.candlesLit,
      selectedOffering: this.selectedOffering,
      usedOfferings: Array.from(this.usedOfferings),
      demonState: this.demonState,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnCandleChange(cb: (index: number, lit: boolean) => void) { this.onCandleChange = cb; }
  setOnDemonState(cb: (state: string) => void) { this.onDemonState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
