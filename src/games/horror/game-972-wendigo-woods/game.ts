import { translations } from './i18n';

export class Game {
  private health: number = 100;
  private warmth: number = 100;
  private hunger: number = 20;
  private distance: number = 0;
  private torches: number = 0;
  private meat: number = 0;
  private flares: number = 0;
  private isRunning: boolean = false;
  private isHiding: boolean = false;
  private wendigoState: 'hidden' | 'stalking' | 'chasing' = 'hidden';
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private survivalLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onWendigoState: ((state: 'hidden' | 'stalking' | 'chasing') => void) | null = null;
  private onPlayerState: ((state: 'normal' | 'running' | 'hiding') => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.warmth = 100;
    this.hunger = 20;
    this.distance = 0;
    this.torches = 0;
    this.meat = 0;
    this.flares = 0;
    this.isRunning = true;
    this.isHiding = false;
    this.wendigoState = 'hidden';

    if (this.onWendigoState) this.onWendigoState('hidden');
    if (this.onPlayerState) this.onPlayerState('normal');

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Main game loop - wendigo behavior
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.tick();
    }, 3000);

    // Survival loop - warmth and hunger
    this.survivalLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.survivalTick();
    }, 2000);
  }

  private tick() {
    const t = translations[this.locale].game.msgs;

    // Wendigo behavior
    const dangerLevel = (100 - this.warmth) / 100 + this.hunger / 100;

    if (this.wendigoState === 'hidden') {
      if (Math.random() < 0.3 + dangerLevel * 0.3) {
        this.wendigoState = 'stalking';
        if (this.onWendigoState) this.onWendigoState('stalking');
        this.showMessage(t.stalking, 'warning');
      }
    } else if (this.wendigoState === 'stalking') {
      if (this.isHiding && Math.random() < 0.6) {
        // Hiding works
        this.wendigoState = 'hidden';
        if (this.onWendigoState) this.onWendigoState('hidden');
        this.isHiding = false;
        if (this.onPlayerState) this.onPlayerState('normal');
      } else if (Math.random() < 0.4 + dangerLevel * 0.3) {
        // Chase begins
        this.startChase();
      } else if (Math.random() < 0.3) {
        // Wendigo leaves
        this.wendigoState = 'hidden';
        if (this.onWendigoState) this.onWendigoState('hidden');
      }
    }

    this.notifyChange();
  }

  private survivalTick() {
    const t = translations[this.locale].game.msgs;

    // Warmth decreases
    this.warmth = Math.max(0, this.warmth - 5);

    // Use torch if available and cold
    if (this.warmth < 40 && this.torches > 0) {
      this.torches--;
      this.warmth = Math.min(100, this.warmth + 30);
      this.showMessage(t.torchUsed, 'success');
    }

    // Hunger increases
    this.hunger = Math.min(100, this.hunger + 3);

    // Use meat if starving
    if (this.hunger > 70 && this.meat > 0) {
      this.meat--;
      this.hunger = Math.max(0, this.hunger - 40);
      this.showMessage(t.meatUsed, 'success');
    }

    // Damage from cold
    if (this.warmth <= 20) {
      if (this.warmth > 15) {
        this.showMessage(t.coldWarn, 'danger');
      }
      this.health = Math.max(0, this.health - 5);
    }

    // Damage from starvation
    if (this.hunger >= 80) {
      if (this.hunger < 85) {
        this.showMessage(t.hungerWarn, 'danger');
      }
      this.health = Math.max(0, this.health - 3);
    }

    if (this.health <= 0) {
      this.endGame(false);
    }

    this.notifyChange();
  }

  private startChase() {
    if (this.wendigoState === 'chasing') return;

    const t = translations[this.locale].game.msgs;
    this.wendigoState = 'chasing';
    this.isHiding = false;
    if (this.onWendigoState) this.onWendigoState('chasing');
    if (this.onPlayerState) this.onPlayerState('normal');
    this.showMessage(t.chasing, 'danger');

    // Use flare if available
    if (this.flares > 0) {
      this.flares--;
      setTimeout(() => {
        this.wendigoState = 'hidden';
        if (this.onWendigoState) this.onWendigoState('hidden');
        this.showMessage(t.flareUsed, 'success');
        this.notifyChange();
      }, 500);
      return;
    }

    const chaseInterval = setInterval(() => {
      if (!this.isRunning || this.wendigoState !== 'chasing') {
        clearInterval(chaseInterval);
        return;
      }

      this.health -= 8;
      this.warmth = Math.max(0, this.warmth - 5);

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(chaseInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 400);

    // Chase ends after some time
    setTimeout(() => {
      if (this.wendigoState === 'chasing' && this.isRunning) {
        clearInterval(chaseInterval);
        this.wendigoState = 'stalking';
        if (this.onWendigoState) this.onWendigoState('stalking');
        this.notifyChange();
      }
    }, 3000);
  }

  run() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    // Can't run if too weak
    if (this.warmth < 20 || this.hunger > 80) {
      this.showMessage(t.runFail, 'warning');
      return;
    }

    if (this.onPlayerState) this.onPlayerState('running');
    this.showMessage(t.running, '');

    // Running increases distance
    this.distance = Math.min(100, this.distance + 15);
    this.warmth = Math.max(0, this.warmth - 5);
    this.hunger = Math.min(100, this.hunger + 5);

    // Running can escape chase
    if (this.wendigoState === 'chasing' && Math.random() < 0.5) {
      this.wendigoState = 'stalking';
      if (this.onWendigoState) this.onWendigoState('stalking');
    }

    setTimeout(() => {
      if (this.onPlayerState) this.onPlayerState('normal');
    }, 500);

    if (this.distance >= 100) {
      this.endGame(true);
    }

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.wendigoState === 'chasing') {
      this.showMessage(t.hideFail, 'danger');
      return;
    }

    this.isHiding = true;
    if (this.onPlayerState) this.onPlayerState('hiding');
    this.showMessage(t.hiding, '');

    // Hiding costs warmth but protects
    this.warmth = Math.max(0, this.warmth - 10);

    this.notifyChange();
  }

  search() {
    if (!this.isRunning || this.wendigoState === 'chasing') return;

    const t = translations[this.locale].game.msgs;
    this.isHiding = false;
    if (this.onPlayerState) this.onPlayerState('normal');

    const roll = Math.random();

    if (roll < 0.25) {
      this.torches++;
      this.showMessage(t.torchFound, 'success');
    } else if (roll < 0.45) {
      this.meat++;
      this.showMessage(t.meatFound, 'success');
    } else if (roll < 0.55) {
      this.flares++;
      this.showMessage(t.flareFound, 'success');
    } else {
      this.showMessage(t.searchEmpty, '');
    }

    // Searching attracts wendigo
    if (this.wendigoState === 'hidden' && Math.random() < 0.3) {
      this.wendigoState = 'stalking';
      if (this.onWendigoState) this.onWendigoState('stalking');
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.survivalLoop) clearInterval(this.survivalLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.caught, win ? 'success' : 'danger');

    if (this.onWendigoState) this.onWendigoState('hidden');
    if (this.onPlayerState) this.onPlayerState('normal');
    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      health: this.health,
      warmth: this.warmth,
      hunger: this.hunger,
      distance: this.distance,
      torches: this.torches,
      meat: this.meat,
      flares: this.flares,
      isRunning: this.isRunning,
      isHiding: this.isHiding,
      wendigoState: this.wendigoState
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnWendigoState(cb: (state: 'hidden' | 'stalking' | 'chasing') => void) { this.onWendigoState = cb; }
  setOnPlayerState(cb: (state: 'normal' | 'running' | 'hiding') => void) { this.onPlayerState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
