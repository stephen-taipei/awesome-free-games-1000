import { translations, Legend } from './i18n';

export class Game {
  private courage: number = 100;
  private survival: number = 100;
  private isRunning: boolean = false;
  private currentLegendIndex: number = 0;
  private legends: Legend[] = [];
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private onStateChange: (() => void) | null = null;
  private onMessage: ((key: string) => void) | null = null;
  private onLegendChange: ((legend: Legend) => void) | null = null;
  private onChoiceResult: ((correct: boolean, choiceIndex: number) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
    this.legends = translations[locale].game.legends;
  }

  start() {
    this.courage = 100;
    this.survival = 100;
    this.currentLegendIndex = 0;
    this.isRunning = true;

    // Shuffle legends
    this.legends = [...translations[this.locale].game.legends]
      .sort(() => Math.random() - 0.5);

    this.log('start');
    this.showCurrentLegend();
    this.notifyChange();
  }

  private showCurrentLegend() {
    if (this.currentLegendIndex >= this.legends.length) {
      this.endGame(true);
      return;
    }

    const legend = this.legends[this.currentLegendIndex];
    if (this.onLegendChange) {
      this.onLegendChange(legend);
    }
  }

  makeChoice(choiceIndex: number) {
    if (!this.isRunning) return;

    const legend = this.legends[this.currentLegendIndex];
    const correct = choiceIndex === legend.correctChoice;

    if (correct) {
      this.courage = Math.min(100, this.courage + 10);
      this.log('correct');
    } else {
      this.survival -= 25;
      this.courage -= 15;
      this.log('wrong');
    }

    if (this.onChoiceResult) {
      this.onChoiceResult(correct, choiceIndex);
    }

    this.notifyChange();

    if (this.survival <= 0) {
      setTimeout(() => this.endGame(false), 1000);
    }
  }

  nextLegend() {
    this.currentLegendIndex++;
    this.showCurrentLegend();
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    this.log(win ? 'win' : 'lose');
    if (this.onGameEnd) {
      this.onGameEnd(win);
    }
    this.notifyChange();
  }

  getStats() {
    return {
      courage: this.courage,
      survival: this.survival,
      isRunning: this.isRunning,
      currentLegendIndex: this.currentLegendIndex,
      totalLegends: this.legends.length
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  setOnLegendChange(cb: (legend: Legend) => void) {
    this.onLegendChange = cb;
  }

  setOnChoiceResult(cb: (correct: boolean, choiceIndex: number) => void) {
    this.onChoiceResult = cb;
  }

  setOnGameEnd(cb: (win: boolean) => void) {
    this.onGameEnd = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}
