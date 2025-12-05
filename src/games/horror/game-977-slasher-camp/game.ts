import { translations } from './i18n';

interface Location {
  id: string;
  exits: string[];
  searched: boolean;
}

export class Game {
  private health: number = 100;
  private stamina: number = 100;
  private survivors: number = 5;
  private hour: number = 0; // 0 = midnight
  private medkits: number = 0;
  private hasKeys: boolean = false;
  private hasFlashlight: boolean = false;
  private currentLocation: string = 'campfire';
  private killerLocation: string = 'woods';
  private isRunning: boolean = false;
  private killerChasing: boolean = false;
  private isHiding: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private locations: Map<string, Location> = new Map();
  private gameLoop: number | null = null;
  private killerLoop: number | null = null;
  private timeLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onKillerState: ((chasing: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initLocations();
  }

  private initLocations() {
    this.locations.set('campfire', { id: 'campfire', exits: ['cabin_a', 'cabin_b', 'lake'], searched: false });
    this.locations.set('cabin_a', { id: 'cabin_a', exits: ['campfire', 'showers'], searched: false });
    this.locations.set('cabin_b', { id: 'cabin_b', exits: ['campfire', 'woods'], searched: false });
    this.locations.set('lake', { id: 'lake', exits: ['campfire', 'woods'], searched: false });
    this.locations.set('woods', { id: 'woods', exits: ['cabin_b', 'lake', 'lodge'], searched: false });
    this.locations.set('showers', { id: 'showers', exits: ['cabin_a', 'lodge'], searched: false });
    this.locations.set('lodge', { id: 'lodge', exits: ['woods', 'showers', 'parking'], searched: false });
    this.locations.set('parking', { id: 'parking', exits: ['lodge', 'exit'], searched: false });
    this.locations.set('exit', { id: 'exit', exits: [], searched: false });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.stamina = 100;
    this.survivors = 5;
    this.hour = 0;
    this.medkits = 0;
    this.hasKeys = false;
    this.hasFlashlight = false;
    this.currentLocation = 'campfire';
    this.killerLocation = 'woods';
    this.isRunning = true;
    this.killerChasing = false;
    this.isHiding = false;

    this.locations.forEach(loc => loc.searched = false);

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Stamina regeneration
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      if (this.stamina < 100 && !this.killerChasing) {
        this.stamina = Math.min(100, this.stamina + 2);
        this.notifyChange();
      }
    }, 500);

    // Killer behavior
    this.killerLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.killerBehavior();
    }, 4000);

    // Time progression
    this.timeLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.advanceTime();
    }, 15000);
  }

  private advanceTime() {
    this.hour++;

    if (this.hour >= 6) {
      this.showMessage(translations[this.locale].game.msgs.dawn, 'success');
      this.endGame(true);
      return;
    }

    // Killer may kill a survivor
    if (this.survivors > 1 && Math.random() < 0.3) {
      this.survivors--;
      this.showMessage(translations[this.locale].game.msgs.survivorDead, 'danger');
    }

    this.notifyChange();
  }

  private killerBehavior() {
    // Move killer
    const killerLoc = this.locations.get(this.killerLocation);
    if (killerLoc && killerLoc.exits.length > 0) {
      const exits = killerLoc.exits.filter(e => e !== 'exit');
      if (exits.length > 0) {
        // Chase player sometimes
        const playerLoc = this.locations.get(this.currentLocation);
        if (playerLoc && playerLoc.exits.includes(this.killerLocation) && Math.random() < 0.4) {
          this.killerLocation = this.currentLocation;
        } else if (Math.random() < 0.5) {
          this.killerLocation = exits[Math.floor(Math.random() * exits.length)];
        }
      }
    }

    // Check encounter
    if (this.killerLocation === this.currentLocation) {
      if (this.isHiding && Math.random() < 0.6) {
        this.showMessage(translations[this.locale].game.msgs.hiding, '');
        this.isHiding = false;
        this.moveKillerAway();
      } else {
        this.startChase();
      }
    } else {
      const currentLoc = this.locations.get(this.currentLocation);
      if (currentLoc && currentLoc.exits.includes(this.killerLocation)) {
        this.showMessage(translations[this.locale].game.msgs.killerNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private startChase() {
    if (this.isHiding) {
      this.showMessage(translations[this.locale].game.msgs.hideFail, 'danger');
      this.isHiding = false;
    }

    this.killerChasing = true;
    this.showMessage(translations[this.locale].game.msgs.killerChase, 'danger');
    if (this.onKillerState) this.onKillerState(true);

    const chaseInterval = setInterval(() => {
      if (!this.isRunning || !this.killerChasing) {
        clearInterval(chaseInterval);
        return;
      }

      this.health -= 6;

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(chaseInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    setTimeout(() => {
      if (this.killerChasing) {
        this.killerChasing = false;
        if (this.onKillerState) this.onKillerState(false);
        this.showMessage(translations[this.locale].game.msgs.killerLost, '');
        this.moveKillerAway();
        this.notifyChange();
      }
    }, 4000);
  }

  private moveKillerAway() {
    const farLocations = ['woods', 'lake', 'showers'].filter(l => l !== this.currentLocation);
    this.killerLocation = farLocations[Math.floor(Math.random() * farLocations.length)];
  }

  moveTo(locationId: string) {
    if (!this.isRunning || this.killerChasing) return;

    const currentLoc = this.locations.get(this.currentLocation);
    if (!currentLoc || !currentLoc.exits.includes(locationId)) return;

    const t = translations[this.locale].game.msgs;

    if (locationId === 'exit') {
      if (this.hasKeys) {
        this.showMessage(t.escaped, 'success');
        this.endGame(true);
      } else {
        this.showMessage(t.carReady, 'warning');
      }
      return;
    }

    this.currentLocation = locationId;
    this.isHiding = false;
    this.notifyChange();

    if (this.killerLocation === this.currentLocation && !this.killerChasing) {
      setTimeout(() => this.startChase(), 300);
    }
  }

  search() {
    if (!this.isRunning || this.killerChasing) return;

    const t = translations[this.locale].game.msgs;
    const loc = this.locations.get(this.currentLocation);

    if (!loc || loc.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    loc.searched = true;
    const roll = Math.random();

    if (roll < 0.25) {
      this.medkits++;
      this.showMessage(t.foundMedkit, 'success');
    } else if (roll < 0.40 && !this.hasKeys) {
      this.hasKeys = true;
      this.showMessage(t.foundKeys, 'success');
    } else if (roll < 0.55 && !this.hasFlashlight) {
      this.hasFlashlight = true;
      this.showMessage(t.foundFlashlight, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  hide() {
    if (!this.isRunning) return;

    if (this.killerChasing) {
      // Try to escape chase
      if (Math.random() < 0.35) {
        this.killerChasing = false;
        if (this.onKillerState) this.onKillerState(false);
        this.showMessage(translations[this.locale].game.msgs.killerLost, 'success');
        this.moveKillerAway();
      } else {
        this.showMessage(translations[this.locale].game.msgs.hideFail, 'danger');
      }
    } else {
      this.isHiding = true;
      this.showMessage(translations[this.locale].game.msgs.hiding, '');
    }

    this.notifyChange();
  }

  run() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.stamina < 30) {
      this.showMessage(t.noStamina, 'warning');
      return;
    }

    this.stamina -= 30;

    if (this.killerChasing) {
      if (Math.random() < 0.6) {
        this.killerChasing = false;
        if (this.onKillerState) this.onKillerState(false);
        this.showMessage(t.running, 'success');
        this.moveKillerAway();
      }
    }

    this.notifyChange();
  }

  useMedkit() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.medkits <= 0) {
      this.showMessage(t.noMedkit, 'warning');
      return;
    }

    this.medkits--;
    this.health = Math.min(100, this.health + 40);
    this.showMessage(t.healed, 'success');
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.killerLoop) clearInterval(this.killerLoop);
    if (this.timeLoop) clearInterval(this.timeLoop);

    const t = translations[this.locale].game.msgs;
    if (!win) {
      this.showMessage(t.died, 'danger');
    }

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getTimeString(): string {
    const h = this.hour === 0 ? 12 : this.hour;
    return `${h}:00 AM`;
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
      stamina: this.stamina,
      survivors: this.survivors,
      hour: this.hour,
      medkits: this.medkits,
      hasKeys: this.hasKeys,
      hasFlashlight: this.hasFlashlight,
      currentLocation: this.currentLocation,
      isRunning: this.isRunning,
      killerChasing: this.killerChasing,
      isHiding: this.isHiding
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnKillerState(cb: (chasing: boolean) => void) { this.onKillerState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
