import { translations, SeanceTranslation } from './i18n';

interface Spirit {
  name: string;
  mood: 'friendly' | 'neutral' | 'hostile';
  responses: string[];
}

export class Game {
  private energy: number = 0;
  private isRunning: boolean = false;
  private currentSpirit: Spirit | null = null;
  private questionsAsked: number = 0;
  private maxQuestions: number = 5;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private onStateChange: (() => void) | null = null;
  private onMessage: ((key: string) => void) | null = null;
  private onSpiritMessage: ((msg: string) => void) | null = null;
  private onQuestionsReady: ((questions: string[]) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  private getTranslation(): SeanceTranslation {
    return translations[this.locale];
  }

  start() {
    this.energy = 0;
    this.questionsAsked = 0;
    this.isRunning = true;

    this.log('start');
    this.notifyChange();

    // Build up energy
    const buildEnergy = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(buildEnergy);
        return;
      }

      this.energy = Math.min(100, this.energy + 2);
      this.notifyChange();

      if (this.energy >= 100) {
        clearInterval(buildEnergy);
        this.summonSpirit();
      }
    }, 100);
  }

  private summonSpirit() {
    const t = this.getTranslation();
    const spirits = t.game.spirits;
    const spiritData = spirits[Math.floor(Math.random() * spirits.length)];

    this.currentSpirit = {
      name: spiritData.name,
      mood: (['friendly', 'neutral', 'hostile'] as const)[Math.floor(Math.random() * 3)],
      responses: spiritData.responses
    };

    this.log('spiritArrives');
    if (this.onSpiritMessage) {
      this.onSpiritMessage(t.game.msgs.spiritName.replace('{name}', this.currentSpirit.name));
    }

    // Show questions
    setTimeout(() => {
      if (this.onQuestionsReady) {
        this.onQuestionsReady(t.game.questions);
      }
    }, 2000);
  }

  askQuestion(questionIndex: number) {
    if (!this.isRunning || !this.currentSpirit) return;

    this.questionsAsked++;
    const t = this.getTranslation();

    // Get response based on spirit mood
    let response: string;
    const spirit = this.currentSpirit;

    if (spirit.mood === 'hostile' && Math.random() < 0.4) {
      response = t.game.hostileResponses[Math.floor(Math.random() * t.game.hostileResponses.length)];
      this.log('spiritAngry');
    } else if (spirit.mood === 'friendly' || Math.random() < 0.6) {
      response = spirit.responses[Math.floor(Math.random() * spirit.responses.length)];
    } else {
      response = t.game.vagueResponses[Math.floor(Math.random() * t.game.vagueResponses.length)];
    }

    if (this.onSpiritMessage) {
      this.onSpiritMessage(response);
    }

    // Check if seance should end
    if (this.questionsAsked >= this.maxQuestions) {
      setTimeout(() => this.endSeance(), 3000);
    }

    // Drain energy
    this.energy = Math.max(0, this.energy - 15);
    this.notifyChange();
  }

  private endSeance() {
    this.isRunning = false;
    this.log('seanceEnd');
    this.notifyChange();
  }

  getStats() {
    return {
      energy: this.energy,
      isRunning: this.isRunning,
      currentSpirit: this.currentSpirit,
      questionsAsked: this.questionsAsked,
      maxQuestions: this.maxQuestions
    };
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  setOnMessage(cb: (key: string) => void) {
    this.onMessage = cb;
  }

  setOnSpiritMessage(cb: (msg: string) => void) {
    this.onSpiritMessage = cb;
  }

  setOnQuestionsReady(cb: (questions: string[]) => void) {
    this.onQuestionsReady = cb;
  }

  private notifyChange() {
    if (this.onStateChange) this.onStateChange();
  }

  private log(key: string) {
    if (this.onMessage) this.onMessage(key);
  }
}
