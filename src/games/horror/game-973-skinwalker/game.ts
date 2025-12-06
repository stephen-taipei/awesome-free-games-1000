import { translations } from './i18n';

interface Companion {
  id: string;
  alive: boolean;
  isImpostor: boolean;
}

export class Game {
  private health: number = 100;
  private fire: number = 80;
  private trust: number = 100;
  private nightProgress: number = 0;
  private isRunning: boolean = false;
  private creatureNear: boolean = false;
  private underAttack: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private companions: Companion[] = [];
  private selectedCompanion: string | null = null;

  private gameLoop: number | null = null;
  private fireLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onCreatureState: ((state: 'hidden' | 'watching' | 'attacking') => void) | null = null;
  private onCompanionChange: ((id: string, state: 'alive' | 'dead' | 'impostor') => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.fire = 80;
    this.trust = 100;
    this.nightProgress = 0;
    this.isRunning = true;
    this.creatureNear = false;
    this.underAttack = false;
    this.selectedCompanion = null;

    // Initialize companions - one is secretly the skinwalker
    const impostorIndex = Math.floor(Math.random() * 3);
    this.companions = [
      { id: 'elder', alive: true, isImpostor: impostorIndex === 0 },
      { id: 'hunter', alive: true, isImpostor: impostorIndex === 1 },
      { id: 'child', alive: true, isImpostor: impostorIndex === 2 }
    ];

    // Reset companion visuals
    this.companions.forEach(c => {
      if (this.onCompanionChange) this.onCompanionChange(c.id, 'alive');
    });

    this.showMessage(translations[this.locale].game.msgs.start, 'warning');
    this.notifyChange();

    // Main game loop - night events
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.tick();
    }, 3000);

    // Fire decay loop
    this.fireLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.fire = Math.max(0, this.fire - 5);

      if (this.fire <= 30 && this.fire > 25) {
        this.showMessage(translations[this.locale].game.msgs.fireWarn, 'warning');
      }

      if (this.fire <= 0) {
        this.startAttack();
      }

      this.notifyChange();
    }, 2000);
  }

  private tick() {
    const t = translations[this.locale].game.msgs;
    this.nightProgress += 10;

    // Check for dawn (victory)
    if (this.nightProgress >= 100) {
      this.endGame(true);
      return;
    }

    // Random events
    const roll = Math.random();
    const dangerMultiplier = (100 - this.fire) / 100;

    if (roll < 0.2 + dangerMultiplier * 0.3) {
      // Creature approaches
      this.creatureNear = true;
      if (this.onCreatureState) this.onCreatureState('watching');

      const eventRoll = Math.random();
      if (eventRoll < 0.4) {
        this.showMessage(t.watching, 'warning');
      } else if (eventRoll < 0.7) {
        this.showMessage(t.sound, 'warning');
      } else {
        this.showMessage(t.voice, 'danger');
        this.trust = Math.max(0, this.trust - 10);
      }
    } else if (roll < 0.35 + dangerMultiplier * 0.4 && this.creatureNear) {
      // Attack if creature is near and fire is low
      if (this.fire < 40) {
        this.startAttack();
      }
    } else {
      this.creatureNear = false;
      if (this.onCreatureState) this.onCreatureState('hidden');
    }

    // Trust decay from paranoia
    if (this.trust < 50) {
      this.showMessage(t.trustLow, 'warning');
    }

    this.notifyChange();
  }

  private startAttack() {
    if (this.underAttack) return;

    const t = translations[this.locale].game.msgs;
    this.underAttack = true;
    if (this.onCreatureState) this.onCreatureState('attacking');
    this.showMessage(t.attack, 'danger');

    const attackInterval = setInterval(() => {
      if (!this.isRunning || !this.underAttack) {
        clearInterval(attackInterval);
        return;
      }

      this.health -= 10;
      this.trust = Math.max(0, this.trust - 5);

      if (this.health <= 0) {
        this.health = 0;
        clearInterval(attackInterval);
        this.endGame(false);
      }

      this.notifyChange();
    }, 500);

    // Attack ends after a few seconds
    setTimeout(() => {
      if (this.underAttack && this.isRunning) {
        this.underAttack = false;
        if (this.onCreatureState) this.onCreatureState('hidden');
        this.creatureNear = false;

        // Maybe take a companion
        if (Math.random() < 0.4) {
          const aliveCompanions = this.companions.filter(c => c.alive && !c.isImpostor);
          if (aliveCompanions.length > 0) {
            const victim = aliveCompanions[Math.floor(Math.random() * aliveCompanions.length)];
            victim.alive = false;
            if (this.onCompanionChange) this.onCompanionChange(victim.id, 'dead');
            const name = (translations[this.locale].game.names as any)[victim.id];
            this.showMessage(`${name} ${t.companionLost}`, 'danger');
          }
        }

        this.notifyChange();
      }
    }, 3000);
  }

  watch() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;

    if (this.underAttack) {
      // Watching during attack can stop it
      if (Math.random() < 0.5) {
        this.underAttack = false;
        if (this.onCreatureState) this.onCreatureState('hidden');
        this.creatureNear = false;
        this.showMessage(t.watchSpot, 'success');
      }
    } else if (this.creatureNear) {
      this.creatureNear = false;
      if (this.onCreatureState) this.onCreatureState('hidden');
      this.showMessage(t.watchSpot, 'warning');
      this.trust = Math.min(100, this.trust + 5);
    } else {
      this.showMessage(t.watchSafe, '');
    }

    this.notifyChange();
  }

  addFire() {
    if (!this.isRunning) return;

    const t = translations[this.locale].game.msgs;
    this.fire = Math.min(100, this.fire + 25);
    this.showMessage(t.fireAdd, 'success');

    // Fire repels creature
    if (this.creatureNear && !this.underAttack) {
      this.creatureNear = false;
      if (this.onCreatureState) this.onCreatureState('hidden');
    }

    this.notifyChange();
  }

  selectCompanion(id: string) {
    if (!this.isRunning) return;

    const companion = this.companions.find(c => c.id === id);
    if (!companion || !companion.alive) return;

    this.selectedCompanion = this.selectedCompanion === id ? null : id;
    this.notifyChange();
  }

  verify() {
    if (!this.isRunning || !this.selectedCompanion) return;

    const t = translations[this.locale].game.msgs;
    const companion = this.companions.find(c => c.id === this.selectedCompanion);

    if (!companion || !companion.alive) {
      this.selectedCompanion = null;
      return;
    }

    if (companion.isImpostor) {
      // Found the skinwalker!
      if (this.onCompanionChange) this.onCompanionChange(companion.id, 'impostor');
      this.showMessage(t.verifyFake, 'danger');

      // Skinwalker is revealed and flees
      setTimeout(() => {
        companion.alive = false;
        this.endGame(true);
      }, 1500);
    } else {
      // Wrong accusation
      this.trust = Math.max(0, this.trust - 25);
      this.showMessage(t.verifyWrong, 'warning');

      if (this.trust <= 0) {
        // Group falls apart
        this.endGame(false);
      }
    }

    this.selectedCompanion = null;
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.fireLoop) clearInterval(this.fireLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.survived : t.defeated, win ? 'success' : 'danger');

    if (this.onCreatureState) this.onCreatureState('hidden');
    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getStats() {
    return {
      health: this.health,
      fire: this.fire,
      trust: this.trust,
      nightProgress: this.nightProgress,
      isRunning: this.isRunning,
      creatureNear: this.creatureNear,
      underAttack: this.underAttack,
      selectedCompanion: this.selectedCompanion,
      companions: this.companions.map(c => ({ id: c.id, alive: c.alive }))
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnCreatureState(cb: (state: 'hidden' | 'watching' | 'attacking') => void) { this.onCreatureState = cb; }
  setOnCompanionChange(cb: (id: string, state: 'alive' | 'dead' | 'impostor') => void) { this.onCompanionChange = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
