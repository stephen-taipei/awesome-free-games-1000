import { translations } from './i18n';

interface Location {
  id: string;
  exits: string[];
  searched: boolean;
  locked: boolean;
}

export class Game {
  private health: number = 100;
  private stealth: number = 100;
  private knives: number = 0;
  private torches: number = 0;
  private keys: number = 0;
  private prisonerFreed: boolean = false;
  private currentLocation: string = 'entrance';
  private villagerLocation: string = 'altar';
  private isRunning: boolean = false;
  private villagerHunting: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private locations: Map<string, Location> = new Map();
  private villagerLoop: number | null = null;
  private stealthLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onVillagerState: ((hunting: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initLocations();
  }

  private initLocations() {
    this.locations.set('entrance', { id: 'entrance', exits: ['huts', 'path'], searched: false, locked: false });
    this.locations.set('huts', { id: 'huts', exits: ['entrance', 'pit', 'chief'], searched: false, locked: false });
    this.locations.set('pit', { id: 'pit', exits: ['huts', 'altar'], searched: false, locked: false });
    this.locations.set('altar', { id: 'altar', exits: ['pit', 'storage'], searched: false, locked: false });
    this.locations.set('chief', { id: 'chief', exits: ['huts', 'storage'], searched: false, locked: false });
    this.locations.set('storage', { id: 'storage', exits: ['altar', 'chief', 'cage'], searched: false, locked: false });
    this.locations.set('cage', { id: 'cage', exits: ['storage'], searched: false, locked: true });
    this.locations.set('path', { id: 'path', exits: ['entrance', 'exit'], searched: false, locked: false });
    this.locations.set('exit', { id: 'exit', exits: [], searched: false, locked: true });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.stealth = 100;
    this.knives = 0;
    this.torches = 0;
    this.keys = 0;
    this.prisonerFreed = false;
    this.currentLocation = 'entrance';
    this.villagerLocation = 'altar';
    this.isRunning = true;
    this.villagerHunting = false;

    // Reset locations
    this.locations.forEach(loc => {
      loc.searched = false;
      loc.locked = ['cage', 'exit'].includes(loc.id);
    });

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Villager behavior
    this.villagerLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.villagerBehavior();
    }, 4000);

    // Stealth regeneration
    this.stealthLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      if (this.stealth < 100 && !this.villagerHunting) {
        this.stealth = Math.min(100, this.stealth + 2);
        this.notifyChange();
      }
    }, 1000);
  }

  private villagerBehavior() {
    // Move villager
    const villagerLoc = this.locations.get(this.villagerLocation);
    if (villagerLoc && villagerLoc.exits.length > 0) {
      const exits = villagerLoc.exits.filter(e => e !== 'exit');
      if (exits.length > 0 && Math.random() < 0.5) {
        this.villagerLocation = exits[Math.floor(Math.random() * exits.length)];
      }
    }

    // Check if in same location
    if (this.villagerLocation === this.currentLocation) {
      // Low stealth = detected
      if (this.stealth < 50 || Math.random() < 0.3) {
        this.startHunt();
      }
    } else {
      // Check if adjacent
      const currentLoc = this.locations.get(this.currentLocation);
      if (currentLoc && currentLoc.exits.includes(this.villagerLocation)) {
        this.showMessage(translations[this.locale].game.msgs.villagerNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private startHunt() {
    this.villagerHunting = true;
    this.showMessage(translations[this.locale].game.msgs.villagerHunt, 'danger');
    if (this.onVillagerState) this.onVillagerState(true);

    // Deal damage during hunt
    const huntInterval = setInterval(() => {
      if (!this.isRunning || !this.villagerHunting) {
        clearInterval(huntInterval);
        return;
      }

      this.health -= 5;
      this.stealth = Math.max(0, this.stealth - 10);

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(huntInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 600);

    // Hunt ends after time
    setTimeout(() => {
      if (this.villagerHunting) {
        this.villagerHunting = false;
        if (this.onVillagerState) this.onVillagerState(false);
        this.showMessage(translations[this.locale].game.msgs.villagerLost, '');
        this.moveVillagerAway();
        this.notifyChange();
      }
    }, 4000);
  }

  private moveVillagerAway() {
    const farLocations = ['altar', 'pit', 'chief'].filter(l => l !== this.currentLocation);
    this.villagerLocation = farLocations[Math.floor(Math.random() * farLocations.length)];
  }

  moveTo(locationId: string) {
    if (!this.isRunning || this.villagerHunting) return;

    const currentLoc = this.locations.get(this.currentLocation);
    if (!currentLoc || !currentLoc.exits.includes(locationId)) return;

    const targetLoc = this.locations.get(locationId);
    if (!targetLoc) return;

    const t = translations[this.locale].game.msgs;

    // Check locked locations
    if (targetLoc.locked) {
      if (locationId === 'cage') {
        if (this.keys > 0) {
          this.keys--;
          targetLoc.locked = false;
          this.prisonerFreed = true;
          // Unlock exit when prisoner is freed
          const exitLoc = this.locations.get('exit');
          if (exitLoc) exitLoc.locked = false;
          this.showMessage(t.cageOpened, 'success');
        } else {
          this.showMessage(t.cageLocked, 'warning');
          return;
        }
      } else if (locationId === 'exit') {
        if (this.prisonerFreed) {
          this.endGame(true);
          return;
        } else {
          this.showMessage(t.exitLocked, 'warning');
          return;
        }
      }
    }

    if (locationId === 'exit' && this.prisonerFreed) {
      this.endGame(true);
      return;
    }

    // Moving reduces stealth slightly
    this.stealth = Math.max(0, this.stealth - 5);
    this.currentLocation = locationId;
    this.notifyChange();

    // Check for villager
    if (this.villagerLocation === this.currentLocation && !this.villagerHunting) {
      if (this.stealth < 60) {
        setTimeout(() => this.startHunt(), 500);
      }
    }
  }

  search() {
    if (!this.isRunning || this.villagerHunting) return;

    const t = translations[this.locale].game.msgs;
    const loc = this.locations.get(this.currentLocation);

    if (!loc || loc.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    loc.searched = true;
    this.stealth = Math.max(0, this.stealth - 15); // Searching makes noise

    const roll = Math.random();

    if (roll < 0.30) {
      this.knives++;
      this.showMessage(t.foundKnife, 'success');
    } else if (roll < 0.50) {
      this.torches++;
      this.showMessage(t.foundTorch, 'success');
    } else if (roll < 0.65) {
      this.keys++;
      this.showMessage(t.foundKey, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  sneak() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.villagerHunting) {
      // Try to escape hunt
      if (Math.random() < 0.4) {
        this.villagerHunting = false;
        if (this.onVillagerState) this.onVillagerState(false);
        this.showMessage(t.villagerLost, 'success');
        this.moveVillagerAway();
      } else {
        this.showMessage(t.sneakFail, 'danger');
      }
    } else {
      this.stealth = Math.min(100, this.stealth + 20);
      this.showMessage(t.sneaking, '');
    }

    this.notifyChange();
  }

  fight() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (!this.villagerHunting) {
      return;
    }

    if (this.torches > 0) {
      this.torches--;
      this.villagerHunting = false;
      if (this.onVillagerState) this.onVillagerState(false);
      this.showMessage(t.torchUsed, 'success');
      this.moveVillagerAway();
    } else if (this.knives > 0) {
      this.knives--;
      if (Math.random() < 0.6) {
        this.villagerHunting = false;
        if (this.onVillagerState) this.onVillagerState(false);
        this.showMessage(t.fightWin, 'success');
        this.moveVillagerAway();
      } else {
        this.health -= 20;
        this.showMessage(t.fightFail, 'danger');
        if (this.health <= 0) {
          this.health = 0;
          this.endGame(false);
        }
      }
    } else {
      this.showMessage(t.noWeapon, 'warning');
    }

    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.villagerLoop) clearInterval(this.villagerLoop);
    if (this.stealthLoop) clearInterval(this.stealthLoop);

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

  isLocationLocked(locationId: string): boolean {
    const loc = this.locations.get(locationId);
    return loc ? loc.locked : false;
  }

  getStats() {
    return {
      health: this.health,
      stealth: this.stealth,
      knives: this.knives,
      torches: this.torches,
      keys: this.keys,
      prisonerFreed: this.prisonerFreed,
      currentLocation: this.currentLocation,
      isRunning: this.isRunning,
      villagerHunting: this.villagerHunting
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnVillagerState(cb: (hunting: boolean) => void) { this.onVillagerState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
