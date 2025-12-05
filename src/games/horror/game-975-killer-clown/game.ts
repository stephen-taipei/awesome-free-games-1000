import { translations } from './i18n';

interface Location {
  id: string;
  exits: string[];
  searched: boolean;
}

export class Game {
  private health: number = 100;
  private fear: number = 20;
  private balloons: number = 0;
  private horns: number = 0;
  private hasFlashlight: boolean = false;
  private hasKey: boolean = false;
  private currentLocation: string = 'entrance';
  private clownLocation: string = 'funhouse';
  private isRunning: boolean = false;
  private clownChasing: boolean = false;
  private isHiding: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private locations: Map<string, Location> = new Map();
  private clownLoop: number | null = null;
  private fearLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onClownState: ((chasing: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initLocations();
  }

  private initLocations() {
    this.locations.set('entrance', { id: 'entrance', exits: ['bigtop', 'funhouse'], searched: false });
    this.locations.set('bigtop', { id: 'bigtop', exits: ['entrance', 'backstage', 'mirrors'], searched: false });
    this.locations.set('funhouse', { id: 'funhouse', exits: ['entrance', 'mirrors'], searched: false });
    this.locations.set('mirrors', { id: 'mirrors', exits: ['bigtop', 'funhouse', 'cages'], searched: false });
    this.locations.set('backstage', { id: 'backstage', exits: ['bigtop', 'trailers'], searched: false });
    this.locations.set('cages', { id: 'cages', exits: ['mirrors', 'trailers'], searched: false });
    this.locations.set('trailers', { id: 'trailers', exits: ['backstage', 'cages', 'ferris'], searched: false });
    this.locations.set('ferris', { id: 'ferris', exits: ['trailers', 'exit'], searched: false });
    this.locations.set('exit', { id: 'exit', exits: [], searched: false });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.fear = 20;
    this.balloons = 0;
    this.horns = 0;
    this.hasFlashlight = false;
    this.hasKey = false;
    this.currentLocation = 'entrance';
    this.clownLocation = 'funhouse';
    this.isRunning = true;
    this.clownChasing = false;
    this.isHiding = false;

    this.locations.forEach(loc => loc.searched = false);

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Clown behavior
    this.clownLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.clownBehavior();
    }, 4000);

    // Fear grows in darkness
    this.fearLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      if (!this.hasFlashlight) {
        this.fear = Math.min(100, this.fear + 2);
      } else {
        this.fear = Math.max(0, this.fear - 1);
      }

      if (this.fear >= 80 && this.fear < 82) {
        this.showMessage(translations[this.locale].game.msgs.fearHigh, 'danger');
      }

      this.notifyChange();
    }, 2000);
  }

  private clownBehavior() {
    // Move clown
    const clownLoc = this.locations.get(this.clownLocation);
    if (clownLoc && clownLoc.exits.length > 0) {
      const exits = clownLoc.exits.filter(e => e !== 'exit');
      if (exits.length > 0) {
        // Chase player based on fear
        if (this.fear > 50 && Math.random() < 0.5) {
          const playerLoc = this.locations.get(this.currentLocation);
          if (playerLoc && playerLoc.exits.includes(this.clownLocation)) {
            this.clownLocation = this.currentLocation;
          }
        } else if (Math.random() < 0.4) {
          this.clownLocation = exits[Math.floor(Math.random() * exits.length)];
        }
      }
    }

    // Check encounter
    if (this.clownLocation === this.currentLocation) {
      if (this.isHiding && Math.random() < 0.5) {
        this.showMessage(translations[this.locale].game.msgs.hiding, '');
        this.isHiding = false;
        this.moveClownAway();
      } else {
        this.startChase();
      }
    } else {
      const currentLoc = this.locations.get(this.currentLocation);
      if (currentLoc && currentLoc.exits.includes(this.clownLocation)) {
        this.showMessage(translations[this.locale].game.msgs.clownNear, 'warning');
        this.fear = Math.min(100, this.fear + 10);
      }
    }

    this.notifyChange();
  }

  private startChase() {
    if (this.isHiding) {
      this.showMessage(translations[this.locale].game.msgs.hideFail, 'danger');
      this.isHiding = false;
    }

    this.clownChasing = true;
    this.showMessage(translations[this.locale].game.msgs.clownChase, 'danger');
    if (this.onClownState) this.onClownState(true);

    const chaseInterval = setInterval(() => {
      if (!this.isRunning || !this.clownChasing) {
        clearInterval(chaseInterval);
        return;
      }

      this.health -= 6;
      this.fear = Math.min(100, this.fear + 5);

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(chaseInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    setTimeout(() => {
      if (this.clownChasing) {
        this.clownChasing = false;
        if (this.onClownState) this.onClownState(false);
        this.showMessage(translations[this.locale].game.msgs.clownLost, '');
        this.moveClownAway();
        this.notifyChange();
      }
    }, 4000);
  }

  private moveClownAway() {
    const farLocations = ['funhouse', 'mirrors', 'cages'].filter(l => l !== this.currentLocation);
    this.clownLocation = farLocations[Math.floor(Math.random() * farLocations.length)];
  }

  moveTo(locationId: string) {
    if (!this.isRunning || this.clownChasing) return;

    // High fear prevents movement
    if (this.fear >= 90) {
      this.showMessage(translations[this.locale].game.msgs.fearHigh, 'danger');
      return;
    }

    const currentLoc = this.locations.get(this.currentLocation);
    if (!currentLoc || !currentLoc.exits.includes(locationId)) return;

    const t = translations[this.locale].game.msgs;

    if (locationId === 'exit') {
      if (this.hasKey) {
        this.endGame(true);
      } else {
        this.showMessage(t.exitBlocked, 'warning');
      }
      return;
    }

    this.currentLocation = locationId;
    this.isHiding = false;
    this.fear = Math.min(100, this.fear + 5);
    this.notifyChange();

    if (this.clownLocation === this.currentLocation && !this.clownChasing) {
      setTimeout(() => this.startChase(), 300);
    }
  }

  search() {
    if (!this.isRunning || this.clownChasing) return;

    const t = translations[this.locale].game.msgs;
    const loc = this.locations.get(this.currentLocation);

    if (!loc || loc.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    loc.searched = true;
    this.fear = Math.min(100, this.fear + 5);

    const roll = Math.random();

    if (roll < 0.25) {
      this.balloons += 2;
      this.showMessage(t.foundBalloon, 'success');
    } else if (roll < 0.40) {
      this.horns++;
      this.showMessage(t.foundHorn, 'success');
    } else if (roll < 0.55 && !this.hasFlashlight) {
      this.hasFlashlight = true;
      this.showMessage(t.foundFlashlight, 'success');
    } else if (roll < 0.70 && !this.hasKey) {
      this.hasKey = true;
      this.showMessage(t.keyFound, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.clownChasing) {
      if (Math.random() < 0.4) {
        this.clownChasing = false;
        if (this.onClownState) this.onClownState(false);
        this.showMessage(t.hiding, 'success');
        this.moveClownAway();
      } else {
        this.showMessage(t.hideFail, 'danger');
      }
    } else {
      this.isHiding = true;
      this.fear = Math.max(0, this.fear - 10);
      this.showMessage(t.calmDown, '');
    }

    this.notifyChange();
  }

  distract() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.horns > 0) {
      this.horns--;
      if (this.clownChasing) {
        this.clownChasing = false;
        if (this.onClownState) this.onClownState(false);
      }
      this.moveClownAway();
      this.showMessage(t.hornUsed, 'success');
    } else if (this.balloons > 0) {
      this.balloons--;
      if (this.clownChasing) {
        if (Math.random() < 0.6) {
          this.clownChasing = false;
          if (this.onClownState) this.onClownState(false);
          this.moveClownAway();
          this.showMessage(t.distracted, 'success');
        }
      } else {
        this.moveClownAway();
        this.showMessage(t.distracted, 'success');
      }
    } else {
      this.showMessage(t.noItem, 'warning');
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.clownLoop) clearInterval(this.clownLoop);
    if (this.fearLoop) clearInterval(this.fearLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.caught, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getCurrentLocation() {
    return this.locations.get(this.currentLocation);
  }

  getLocationName(locationId: string): string {
    return (translations[this.locale].game.locations as any)[locationId] || locationId;
  }

  getStats() {
    return {
      health: this.health,
      fear: this.fear,
      balloons: this.balloons,
      horns: this.horns,
      hasFlashlight: this.hasFlashlight,
      hasKey: this.hasKey,
      currentLocation: this.currentLocation,
      isRunning: this.isRunning,
      clownChasing: this.clownChasing,
      isHiding: this.isHiding
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnClownState(cb: (chasing: boolean) => void) { this.onClownState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
