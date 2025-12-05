
import { translations } from './i18n';

export class Game {
  private demonStrength: number = 100;
  private faith: number = 100;
  private isRunning: boolean = false;
  private currentWord: string = '';
  private wordList: string[] = [];
  
  private onStateChange: (() => void) | null = null;
  private onMessage: ((key: string) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.wordList = translations[locale].game.words;
  }

  start() {
    this.demonStrength = 100;
    this.faith = 100;
    this.isRunning = true;
    this.nextWord();
    this.notifyChange();
    this.log('start');
    
    // Game Loop for Faith Decay
    const loop = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(loop);
        return;
      }
      
      // Demon attacks periodically
      this.faith -= 1; // Slow decay
      
      if (this.faith <= 0) {
        this.faith = 0;
        this.endGame(false);
      }
      
      this.notifyChange();
    }, 500);
  }

  checkInput(input: string): boolean {
    if (!this.isRunning) return false;

    if (input.trim().toUpperCase() === this.currentWord) {
      this.demonStrength -= 15;
      this.faith = Math.min(100, this.faith + 5);
      this.log('hit');
      
      if (this.demonStrength <= 0) {
        this.demonStrength = 0;
        this.endGame(true);
      } else {
        this.nextWord();
      }
      return true;
    } else {
      // Optional: Punish wrong input immediately?
      // Let's just let them retry, but maybe flash screen
    }
    return false;
  }

  private nextWord() {
    this.currentWord = this.wordList[Math.floor(Math.random() * this.wordList.length)];
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    this.log(win ? 'win' : 'lose');
    this.notifyChange();
  }

  getStats() {
    return {
      demonStrength: this.demonStrength,
      faith: this.faith,
      currentWord: this.currentWord,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}
