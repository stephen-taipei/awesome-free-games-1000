import { translations } from './i18n';

type SpiritType = 'friendly' | 'neutral' | 'hostile';

export class Game {
  private sanity: number = 100;
  private spiritPower: number = 0;
  private spiritType: SpiritType = 'neutral';
  private currentMessage: string = '';
  private isSpelling: boolean = false;
  private isPossessed: boolean = false;
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private spellTimeout: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onSpellLetter: ((letter: string) => void) | null = null;
  private onPlanchetteState: ((state: 'idle' | 'moving' | 'possessed') => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.sanity = 100;
    this.spiritPower = 0;
    this.currentMessage = '';
    this.isSpelling = false;
    this.isPossessed = false;
    this.isRunning = true;

    // Determine spirit type
    const roll = Math.random();
    if (roll < 0.3) {
      this.spiritType = 'friendly';
    } else if (roll < 0.7) {
      this.spiritType = 'neutral';
    } else {
      this.spiritType = 'hostile';
    }

    if (this.onPlanchetteState) this.onPlanchetteState('idle');
    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Spirit behavior loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.spiritBehavior();
    }, 3000);
  }

  private spiritBehavior() {
    const t = translations[this.locale].game.msgs;

    // Spirit power grows over time
    const growthRate = this.spiritType === 'hostile' ? 8 : this.spiritType === 'neutral' ? 5 : 3;
    this.spiritPower = Math.min(100, this.spiritPower + growthRate);

    // Sanity drain based on spirit power and type
    const sanityDrain = Math.floor(this.spiritPower / 20) + (this.spiritType === 'hostile' ? 5 : 0);
    this.sanity = Math.max(0, this.sanity - sanityDrain);

    // Warnings
    if (this.sanity <= 30 && this.sanity > 27) {
      this.showMessage(t.sanityLow, 'danger');
    }

    if (this.spiritPower >= 80 && this.spiritPower < 85) {
      this.showMessage(t.spiritStrong, 'danger');
    }

    // Possession check
    if (this.spiritPower >= 100 || this.sanity <= 0) {
      this.possess();
      return;
    }

    // Random spirit activity
    if (Math.random() < 0.3 && !this.isSpelling) {
      this.randomSpiritActivity();
    }

    this.notifyChange();
  }

  private randomSpiritActivity() {
    const t = translations[this.locale].game.msgs;

    if (this.spiritType === 'hostile') {
      this.showMessage(t.spiritAngry, 'danger');
      this.spiritPower = Math.min(100, this.spiritPower + 10);
    } else if (this.spiritType === 'friendly') {
      this.showMessage(t.spiritCalm, '');
    } else {
      this.showMessage(t.spiritAnswers, 'warning');
    }
  }

  askQuestion(questionType: string) {
    if (!this.isRunning || this.isSpelling || this.isPossessed) return;

    const t = translations[this.locale].game.msgs;
    this.showMessage(t.asking, '');

    // Get spirit response based on type and question
    const spiritWords = translations[this.locale].game.spirits[this.spiritType];
    let response: string;

    if (questionType === 'leave') {
      if (this.spiritType === 'hostile') {
        response = this.locale === 'zh-TW' ? '永不' : 'NEVER';
      } else {
        response = this.locale === 'zh-TW' ? '是' : 'YES';
      }
    } else if (questionType === 'alive') {
      response = this.locale === 'zh-TW' ? '否' : 'NO';
    } else {
      response = spiritWords[Math.floor(Math.random() * spiritWords.length)];
    }

    // Spell out the response
    this.spellMessage(response);

    // Asking questions increases spirit power
    this.spiritPower = Math.min(100, this.spiritPower + 15);

    this.notifyChange();
  }

  private spellMessage(message: string) {
    this.isSpelling = true;
    this.currentMessage = '';
    if (this.onPlanchetteState) this.onPlanchetteState('moving');

    const letters = message.split('');
    let index = 0;

    const spellNext = () => {
      if (index < letters.length && this.isRunning) {
        const letter = letters[index];
        this.currentMessage += letter;
        if (this.onSpellLetter) this.onSpellLetter(letter);
        index++;
        this.notifyChange();
        this.spellTimeout = window.setTimeout(spellNext, 500);
      } else {
        this.isSpelling = false;
        if (this.onPlanchetteState) this.onPlanchetteState('idle');
        this.showMessage(translations[this.locale].game.msgs.spiritAnswers, 'warning');
      }
    };

    this.spellTimeout = window.setTimeout(spellNext, 500);
  }

  sayGoodbye() {
    if (!this.isRunning || this.isPossessed) return;

    const t = translations[this.locale].game.msgs;

    // Success chance based on spirit type and power
    let successChance = 0.7;
    if (this.spiritType === 'hostile') successChance -= 0.3;
    if (this.spiritPower > 50) successChance -= 0.2;
    if (this.spiritType === 'friendly') successChance += 0.2;

    if (this.isSpelling) {
      // Interrupt spelling
      if (this.spellTimeout) clearTimeout(this.spellTimeout);
      this.isSpelling = false;
      if (this.onPlanchetteState) this.onPlanchetteState('idle');
    }

    if (Math.random() < successChance) {
      this.spellMessage(this.locale === 'zh-TW' ? '再見' : 'GOODBYE');
      setTimeout(() => {
        if (this.isRunning) {
          this.endGame(true);
        }
      }, 2000);
    } else {
      this.showMessage(t.goodbyeFail, 'danger');
      this.spiritPower = Math.min(100, this.spiritPower + 20);
      this.sanity = Math.max(0, this.sanity - 15);

      if (this.spiritType !== 'hostile') {
        this.spiritType = 'hostile';
        this.showMessage(t.spiritHostile, 'danger');
      }
    }

    this.notifyChange();
  }

  protect() {
    if (!this.isRunning || this.isPossessed) return;

    const t = translations[this.locale].game.msgs;
    this.showMessage(t.protecting, '');

    // Protection reduces spirit power and restores sanity
    this.spiritPower = Math.max(0, this.spiritPower - 20);
    this.sanity = Math.min(100, this.sanity + 10);

    if (Math.random() < 0.3 && this.spiritType === 'hostile') {
      this.showMessage(t.spiritAngry, 'danger');
      this.spiritPower = Math.min(100, this.spiritPower + 15);
    } else {
      this.showMessage(t.protectSuccess, 'success');
    }

    this.notifyChange();
  }

  private possess() {
    const t = translations[this.locale].game.msgs;
    this.isPossessed = true;
    if (this.onPlanchetteState) this.onPlanchetteState('possessed');
    this.showMessage(t.possessed, 'danger');

    setTimeout(() => {
      if (this.isRunning) {
        this.endGame(false);
      }
    }, 2000);
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.spellTimeout) clearTimeout(this.spellTimeout);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.consumed, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      sanity: this.sanity,
      spiritPower: this.spiritPower,
      spiritType: this.spiritType,
      currentMessage: this.currentMessage,
      isSpelling: this.isSpelling,
      isPossessed: this.isPossessed,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnSpellLetter(cb: (letter: string) => void) { this.onSpellLetter = cb; }
  setOnPlanchetteState(cb: (state: 'idle' | 'moving' | 'possessed') => void) { this.onPlanchetteState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
