import { translations } from './i18n';

interface Deck {
  id: string;
  exits: string[];
  searched: boolean;
  locked: boolean;
}

export class Game {
  private sanity: number = 100;
  private light: number = 100;
  private keys: number = 0;
  private candles: number = 0;
  private compass: number = 0;
  private currentDeck: string = 'main';
  private ghostDeck: string = 'cargo';
  private isRunning: boolean = false;
  private ghostAppearing: boolean = false;
  private isHiding: boolean = false;
  private candleLit: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private decks: Map<string, Deck> = new Map();
  private ghostLoop: number | null = null;
  private lightLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onGhostState: ((appearing: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initDecks();
  }

  private initDecks() {
    this.decks.set('main', { id: 'main', exits: ['cabin', 'cargo', 'galley'], searched: false, locked: false });
    this.decks.set('cabin', { id: 'cabin', exits: ['main', 'bridge'], searched: false, locked: true });
    this.decks.set('cargo', { id: 'cargo', exits: ['main', 'engine', 'storage'], searched: false, locked: false });
    this.decks.set('engine', { id: 'engine', exits: ['cargo'], searched: false, locked: false });
    this.decks.set('galley', { id: 'galley', exits: ['main', 'quarters'], searched: false, locked: false });
    this.decks.set('quarters', { id: 'quarters', exits: ['galley', 'storage'], searched: false, locked: false });
    this.decks.set('bridge', { id: 'bridge', exits: ['cabin', 'lifeboat'], searched: false, locked: false });
    this.decks.set('storage', { id: 'storage', exits: ['cargo', 'quarters'], searched: false, locked: true });
    this.decks.set('lifeboat', { id: 'lifeboat', exits: [], searched: false, locked: true });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.sanity = 100;
    this.light = 100;
    this.keys = 0;
    this.candles = 0;
    this.compass = 0;
    this.currentDeck = 'main';
    this.ghostDeck = 'cargo';
    this.isRunning = true;
    this.ghostAppearing = false;
    this.isHiding = false;
    this.candleLit = false;

    // Reset decks
    this.decks.forEach(deck => {
      deck.searched = false;
      deck.locked = ['cabin', 'storage', 'lifeboat'].includes(deck.id);
    });

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Ghost behavior
    this.ghostLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.ghostBehavior();
    }, 5000);

    // Light decay
    this.lightLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.updateLight();
    }, 1000);
  }

  private ghostBehavior() {
    // Move ghost
    const ghostDeckData = this.decks.get(this.ghostDeck);
    if (ghostDeckData && ghostDeckData.exits.length > 0) {
      const exits = ghostDeckData.exits.filter(e => e !== 'lifeboat');
      if (exits.length > 0 && Math.random() < 0.5) {
        this.ghostDeck = exits[Math.floor(Math.random() * exits.length)];
      }
    }

    // Check if in same deck
    if (this.ghostDeck === this.currentDeck) {
      if (this.candleLit) {
        // Candle protects
        this.showMessage(translations[this.locale].game.msgs.ghostGone, 'success');
        this.moveGhostAway();
      } else if (this.isHiding && Math.random() < 0.6) {
        // Hide successful
        this.showMessage(translations[this.locale].game.msgs.hiding, '');
        this.isHiding = false;
      } else {
        this.ghostEncounter();
      }
    } else {
      // Check if adjacent
      const currentDeckData = this.decks.get(this.currentDeck);
      if (currentDeckData && currentDeckData.exits.includes(this.ghostDeck)) {
        this.showMessage(translations[this.locale].game.msgs.ghostNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private ghostEncounter() {
    if (this.isHiding) {
      this.showMessage(translations[this.locale].game.msgs.hideFail, 'danger');
      this.isHiding = false;
    }

    this.ghostAppearing = true;
    this.showMessage(translations[this.locale].game.msgs.ghostAppear, 'danger');
    if (this.onGhostState) this.onGhostState(true);

    // Drain sanity
    const drainInterval = setInterval(() => {
      if (!this.isRunning || !this.ghostAppearing) {
        clearInterval(drainInterval);
        return;
      }

      this.sanity -= 5;

      if (this.sanity <= 20 && this.sanity > 15) {
        this.showMessage(translations[this.locale].game.msgs.sanityLow, 'danger');
      }

      if (this.sanity <= 0) {
        this.sanity = 0;
        clearInterval(drainInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    // Ghost leaves after a while
    setTimeout(() => {
      if (this.ghostAppearing) {
        this.ghostAppearing = false;
        if (this.onGhostState) this.onGhostState(false);
        this.showMessage(translations[this.locale].game.msgs.ghostGone, '');
        this.moveGhostAway();
        this.notifyChange();
      }
    }, 4000);
  }

  private moveGhostAway() {
    const farDecks = ['cargo', 'engine', 'storage'].filter(d => d !== this.currentDeck);
    this.ghostDeck = farDecks[Math.floor(Math.random() * farDecks.length)];
  }

  private updateLight() {
    if (this.candleLit) {
      this.light -= 2;
      if (this.light <= 0) {
        this.light = 0;
        this.candleLit = false;
        this.showMessage(translations[this.locale].game.msgs.candleOut, 'warning');
      }
    } else {
      this.light = Math.max(0, this.light - 0.5);
    }

    // Low light drains sanity
    if (this.light < 20) {
      this.sanity = Math.max(0, this.sanity - 0.5);
    }

    this.notifyChange();
  }

  moveTo(deckId: string) {
    if (!this.isRunning) return;

    const currentDeckData = this.decks.get(this.currentDeck);
    if (!currentDeckData || !currentDeckData.exits.includes(deckId)) return;

    const targetDeck = this.decks.get(deckId);
    if (!targetDeck) return;

    const t = translations[this.locale].game.msgs;

    if (targetDeck.locked) {
      if (this.keys > 0) {
        this.keys--;
        targetDeck.locked = false;
        this.showMessage(t.doorUnlocked, 'success');
      } else {
        this.showMessage(t.noKey, 'warning');
        return;
      }
    }

    if (deckId === 'lifeboat') {
      this.endGame(true);
      return;
    }

    this.currentDeck = deckId;
    this.isHiding = false;
    this.notifyChange();

    // Check for ghost
    if (this.ghostDeck === this.currentDeck && !this.ghostAppearing && !this.candleLit) {
      setTimeout(() => this.ghostEncounter(), 500);
    }
  }

  search() {
    if (!this.isRunning || this.ghostAppearing) return;

    const t = translations[this.locale].game.msgs;
    const deck = this.decks.get(this.currentDeck);

    if (!deck || deck.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    deck.searched = true;
    const roll = Math.random();

    if (roll < 0.30) {
      this.keys++;
      this.showMessage(t.foundKey, 'success');
    } else if (roll < 0.55) {
      this.candles += 2;
      this.showMessage(t.foundCandle, 'success');
    } else if (roll < 0.70) {
      this.compass++;
      this.showMessage(t.foundCompass, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning || this.ghostAppearing) return;

    this.isHiding = true;
    this.showMessage(translations[this.locale].game.msgs.hiding, '');
    this.notifyChange();
  }

  useLight() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.candles <= 0) {
      this.showMessage(t.noCandles, 'warning');
      return;
    }

    this.candles--;
    this.candleLit = true;
    this.light = 100;
    this.showMessage(t.candleLit, 'success');

    // Repel ghost if present
    if (this.ghostAppearing) {
      this.ghostAppearing = false;
      if (this.onGhostState) this.onGhostState(false);
      this.moveGhostAway();
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.ghostLoop) clearInterval(this.ghostLoop);
    if (this.lightLoop) clearInterval(this.lightLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.lost, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getCurrentDeck() {
    return this.decks.get(this.currentDeck);
  }

  getDeckName(deckId: string): string {
    return (translations[this.locale].game.decks as any)[deckId] || deckId;
  }

  isDeckLocked(deckId: string): boolean {
    const deck = this.decks.get(deckId);
    return deck ? deck.locked : false;
  }

  getStats() {
    return {
      sanity: this.sanity,
      light: this.light,
      keys: this.keys,
      candles: this.candles,
      compass: this.compass,
      currentDeck: this.currentDeck,
      isRunning: this.isRunning,
      ghostAppearing: this.ghostAppearing,
      isHiding: this.isHiding,
      candleLit: this.candleLit
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnGhostState(cb: (appearing: boolean) => void) { this.onGhostState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
