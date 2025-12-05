import { translations } from './i18n';

interface Location {
  id: string;
  exits: string[];
  searched: boolean;
}

export class Game {
  private suspicion: number = 30;
  private magic: number = 100;
  private herbs: number = 0;
  private potions: number = 0;
  private talismans: number = 0;
  private currentLocation: string = 'square';
  private mobLocation: string = 'church';
  private isRunning: boolean = false;
  private mobChasing: boolean = false;
  private disguised: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private locations: Map<string, Location> = new Map();
  private mobLoop: number | null = null;
  private suspicionLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onMobState: ((chasing: boolean) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {
    this.initLocations();
  }

  private initLocations() {
    this.locations.set('square', { id: 'square', exits: ['church', 'market', 'tavern'], searched: false });
    this.locations.set('church', { id: 'church', exits: ['square', 'graveyard'], searched: false });
    this.locations.set('market', { id: 'market', exits: ['square', 'alley'], searched: false });
    this.locations.set('tavern', { id: 'tavern', exits: ['square', 'alley'], searched: false });
    this.locations.set('alley', { id: 'alley', exits: ['market', 'tavern', 'woods'], searched: false });
    this.locations.set('graveyard', { id: 'graveyard', exits: ['church', 'woods'], searched: false });
    this.locations.set('woods', { id: 'woods', exits: ['alley', 'graveyard', 'bridge'], searched: false });
    this.locations.set('bridge', { id: 'bridge', exits: ['woods', 'exit'], searched: false });
    this.locations.set('exit', { id: 'exit', exits: [], searched: false });
  }

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.suspicion = 30;
    this.magic = 100;
    this.herbs = 0;
    this.potions = 0;
    this.talismans = 0;
    this.currentLocation = 'square';
    this.mobLocation = 'church';
    this.isRunning = true;
    this.mobChasing = false;
    this.disguised = false;

    this.locations.forEach(loc => loc.searched = false);

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Mob behavior
    this.mobLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.mobBehavior();
    }, 4000);

    // Suspicion grows over time
    this.suspicionLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      if (!this.disguised) {
        this.suspicion = Math.min(100, this.suspicion + 1);
        if (this.suspicion >= 80 && this.suspicion < 82) {
          this.showMessage(translations[this.locale].game.msgs.suspicionHigh, 'warning');
        }
        this.notifyChange();
      }
    }, 2000);
  }

  private mobBehavior() {
    // Move mob
    const mobLoc = this.locations.get(this.mobLocation);
    if (mobLoc && mobLoc.exits.length > 0) {
      const exits = mobLoc.exits.filter(e => e !== 'exit');
      if (exits.length > 0) {
        // Chase player if high suspicion
        if (this.suspicion > 60 && Math.random() < 0.5) {
          const playerLoc = this.locations.get(this.currentLocation);
          if (playerLoc && playerLoc.exits.includes(this.mobLocation)) {
            this.mobLocation = this.currentLocation;
          }
        } else if (Math.random() < 0.4) {
          this.mobLocation = exits[Math.floor(Math.random() * exits.length)];
        }
      }
    }

    // Check encounter
    if (this.mobLocation === this.currentLocation) {
      if (this.disguised) {
        this.showMessage(translations[this.locale].game.msgs.disguised, 'success');
        this.disguised = false;
        this.moveMobAway();
      } else {
        this.startChase();
      }
    } else {
      const currentLoc = this.locations.get(this.currentLocation);
      if (currentLoc && currentLoc.exits.includes(this.mobLocation)) {
        this.showMessage(translations[this.locale].game.msgs.mobNear, 'warning');
      }
    }

    this.notifyChange();
  }

  private startChase() {
    this.mobChasing = true;
    this.showMessage(translations[this.locale].game.msgs.mobChase, 'danger');
    if (this.onMobState) this.onMobState(true);

    const chaseInterval = setInterval(() => {
      if (!this.isRunning || !this.mobChasing) {
        clearInterval(chaseInterval);
        return;
      }

      this.suspicion = Math.min(100, this.suspicion + 5);

      if (this.suspicion >= 100) {
        clearInterval(chaseInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    setTimeout(() => {
      if (this.mobChasing) {
        this.mobChasing = false;
        if (this.onMobState) this.onMobState(false);
        this.showMessage(translations[this.locale].game.msgs.mobLost, '');
        this.moveMobAway();
        this.notifyChange();
      }
    }, 4000);
  }

  private moveMobAway() {
    const farLocations = ['church', 'graveyard', 'market'].filter(l => l !== this.currentLocation);
    this.mobLocation = farLocations[Math.floor(Math.random() * farLocations.length)];
  }

  moveTo(locationId: string) {
    if (!this.isRunning || this.mobChasing) return;

    const currentLoc = this.locations.get(this.currentLocation);
    if (!currentLoc || !currentLoc.exits.includes(locationId)) return;

    const t = translations[this.locale].game.msgs;

    if (locationId === 'exit') {
      if (this.suspicion <= 40) {
        this.endGame(true);
      } else {
        this.showMessage(t.exitBlocked, 'warning');
      }
      return;
    }

    this.currentLocation = locationId;
    this.suspicion = Math.min(100, this.suspicion + 3);
    this.notifyChange();

    if (this.mobLocation === this.currentLocation && !this.mobChasing && !this.disguised) {
      setTimeout(() => this.startChase(), 300);
    }
  }

  search() {
    if (!this.isRunning || this.mobChasing) return;

    const t = translations[this.locale].game.msgs;
    const loc = this.locations.get(this.currentLocation);

    if (!loc || loc.searched) {
      this.showMessage(t.foundNothing, '');
      return;
    }

    loc.searched = true;
    this.suspicion = Math.min(100, this.suspicion + 5);

    const roll = Math.random();

    if (roll < 0.30) {
      this.herbs++;
      this.magic = Math.min(100, this.magic + 20);
      this.showMessage(t.foundHerbs, 'success');
    } else if (roll < 0.50) {
      this.potions++;
      this.showMessage(t.foundPotion, 'success');
    } else if (roll < 0.65) {
      this.talismans++;
      this.showMessage(t.foundTalisman, 'success');
    } else {
      this.showMessage(t.foundNothing, '');
    }

    this.notifyChange();
  }

  blend() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.mobChasing) {
      if (Math.random() < 0.35) {
        this.mobChasing = false;
        if (this.onMobState) this.onMobState(false);
        this.showMessage(t.blending, 'success');
        this.moveMobAway();
      } else {
        this.showMessage(t.blendFail, 'danger');
        this.suspicion = Math.min(100, this.suspicion + 10);
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - 10);
      this.showMessage(t.blending, '');
    }

    this.notifyChange();
  }

  castDisguise() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.magic < 30) {
      this.showMessage(t.noMagic, 'warning');
      return;
    }

    this.magic -= 30;
    this.disguised = true;
    this.suspicion = Math.max(0, this.suspicion - 20);

    if (this.mobChasing) {
      this.mobChasing = false;
      if (this.onMobState) this.onMobState(false);
      this.moveMobAway();
    }

    this.showMessage(t.disguised, 'success');
    this.notifyChange();

    // Disguise wears off
    setTimeout(() => {
      this.disguised = false;
      this.notifyChange();
    }, 10000);
  }

  castCharm() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.magic < 25) {
      this.showMessage(t.noMagic, 'warning');
      return;
    }

    this.magic -= 25;
    this.suspicion = Math.max(0, this.suspicion - 25);

    if (this.mobChasing) {
      this.mobChasing = false;
      if (this.onMobState) this.onMobState(false);
      this.moveMobAway();
    }

    this.showMessage(t.charmed, 'success');
    this.notifyChange();
  }

  castTeleport() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.magic < 40) {
      this.showMessage(t.noMagic, 'warning');
      return;
    }

    this.magic -= 40;

    if (this.mobChasing) {
      this.mobChasing = false;
      if (this.onMobState) this.onMobState(false);
    }

    // Teleport to random safe location
    const safeLocations = ['woods', 'alley', 'graveyard'];
    this.currentLocation = safeLocations[Math.floor(Math.random() * safeLocations.length)];
    this.moveMobAway();

    this.showMessage(t.teleported, 'success');
    this.notifyChange();
  }

  usePotion() {
    if (!this.isRunning || this.potions <= 0) return;

    this.potions--;
    this.magic = Math.min(100, this.magic + 50);
    this.showMessage(translations[this.locale].game.msgs.potionUsed, 'success');
    this.notifyChange();
  }

  useTalisman() {
    if (!this.isRunning || this.talismans <= 0) return;

    this.talismans--;
    this.suspicion = Math.max(0, this.suspicion - 30);
    this.showMessage(translations[this.locale].game.msgs.talismanUsed, 'success');
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.mobLoop) clearInterval(this.mobLoop);
    if (this.suspicionLoop) clearInterval(this.suspicionLoop);

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
      suspicion: this.suspicion,
      magic: this.magic,
      herbs: this.herbs,
      potions: this.potions,
      talismans: this.talismans,
      currentLocation: this.currentLocation,
      isRunning: this.isRunning,
      mobChasing: this.mobChasing,
      disguised: this.disguised
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnMobState(cb: (chasing: boolean) => void) { this.onMobState = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
