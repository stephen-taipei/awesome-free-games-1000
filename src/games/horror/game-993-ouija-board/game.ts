import { translations } from './i18n';

interface LetterPosition {
  char: string;
  x: number;
  y: number;
}

export class Game {
  private isRunning: boolean = false;
  private isSpelling: boolean = false;
  private currentMessage: string = '';
  private letterPositions: LetterPosition[] = [];
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private onStateChange: (() => void) | null = null;
  private onMessage: ((key: string) => void) | null = null;
  private onPlanchetteMove: ((x: number, y: number, char: string) => void) | null = null;
  private onSpellingComplete: ((message: string) => void) | null = null;

  constructor() {
    this.initLetterPositions();
  }

  private initLetterPositions() {
    // Board layout percentages
    const topRowY = 25;
    const bottomRowY = 40;
    const numbersY = 55;

    const alphabet1 = 'ABCDEFGHIJKLM';
    const alphabet2 = 'NOPQRSTUVWXYZ';
    const numbers = '1234567890';

    // First alphabet row
    for (let i = 0; i < alphabet1.length; i++) {
      this.letterPositions.push({
        char: alphabet1[i],
        x: 10 + (i * 6.5),
        y: topRowY
      });
    }

    // Second alphabet row
    for (let i = 0; i < alphabet2.length; i++) {
      this.letterPositions.push({
        char: alphabet2[i],
        x: 10 + (i * 6.5),
        y: bottomRowY
      });
    }

    // Numbers row
    for (let i = 0; i < numbers.length; i++) {
      this.letterPositions.push({
        char: numbers[i],
        x: 15 + (i * 7),
        y: numbersY
      });
    }

    // Special positions
    this.letterPositions.push({ char: 'YES', x: 10, y: 8 });
    this.letterPositions.push({ char: 'NO', x: 85, y: 8 });
    this.letterPositions.push({ char: 'GOODBYE', x: 45, y: 75 });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.isRunning = true;
    this.currentMessage = '';
    this.log('start');
    this.notifyChange();
  }

  askQuestion(question: string) {
    if (!this.isRunning || this.isSpelling) return;

    const t = translations[this.locale];
    const responses = t.game.responses;
    const response = responses[Math.floor(Math.random() * responses.length)];

    this.spellOut(response);
  }

  private async spellOut(message: string) {
    this.isSpelling = true;
    this.currentMessage = '';
    this.log('spiritResponding');
    this.notifyChange();

    const chars = message.toUpperCase().split('');

    for (const char of chars) {
      if (!this.isRunning) break;

      if (char === ' ') {
        this.currentMessage += ' ';
        await this.delay(300);
        continue;
      }

      const pos = this.letterPositions.find(p => p.char === char);
      if (pos) {
        if (this.onPlanchetteMove) {
          this.onPlanchetteMove(pos.x, pos.y, char);
        }
        await this.delay(600);
        this.currentMessage += char;
        this.notifyChange();
      }
    }

    // Move to goodbye
    const goodbye = this.letterPositions.find(p => p.char === 'GOODBYE');
    if (goodbye && this.onPlanchetteMove) {
      await this.delay(500);
      this.onPlanchetteMove(goodbye.x, goodbye.y, 'GOODBYE');
    }

    this.isSpelling = false;
    this.log('spiritDone');

    if (this.onSpellingComplete) {
      this.onSpellingComplete(this.currentMessage);
    }

    this.notifyChange();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      isSpelling: this.isSpelling,
      currentMessage: this.currentMessage
    };
  }

  getLetterPositions() {
    return this.letterPositions;
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  setOnPlanchetteMove(cb: (x: number, y: number, char: string) => void) {
    this.onPlanchetteMove = cb;
  }

  setOnSpellingComplete(cb: (message: string) => void) {
    this.onSpellingComplete = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}
