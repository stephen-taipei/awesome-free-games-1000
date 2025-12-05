import { translations } from './i18n';

interface Alien {
  id: number;
  x: number;
  y: number;
  distance: number;
  angle: number;
  speed: number;
}

export class Game {
  private survivors: number = 10;
  private aliensKilled: number = 0;
  private wave: number = 1;
  private ammo: number = 10;
  private maxAmmo: number = 10;
  private barrier: number = 100;
  private isRunning: boolean = false;
  private aliens: Alien[] = [];
  private nextAlienId: number = 0;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private gameLoop: number | null = null;
  private spawnLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onAliensUpdate: ((aliens: Alien[]) => void) | null = null;
  private onAlienHit: ((id: number) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.survivors = 10;
    this.aliensKilled = 0;
    this.wave = 1;
    this.ammo = 10;
    this.barrier = 100;
    this.isRunning = true;
    this.aliens = [];
    this.nextAlienId = 0;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    this.startWave();

    // Game loop
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.updateAliens();
    }, 100);
  }

  private startWave() {
    const t = translations[this.locale].game.msgs;
    this.showMessage(`${t.wave} ${this.wave}`, 'warning');

    const aliensToSpawn = 3 + this.wave * 2;
    let spawned = 0;

    this.spawnLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      if (spawned >= aliensToSpawn) {
        if (this.spawnLoop) clearInterval(this.spawnLoop);
        return;
      }

      this.spawnAlien();
      spawned++;
    }, 1500 - (this.wave * 100));
  }

  private spawnAlien() {
    const angle = Math.random() * Math.PI * 2;
    const alien: Alien = {
      id: this.nextAlienId++,
      x: 50 + Math.cos(angle) * 45,
      y: 50 + Math.sin(angle) * 45,
      distance: 100,
      angle: angle,
      speed: 0.5 + (this.wave * 0.1)
    };
    this.aliens.push(alien);
    this.updateAliensDisplay();
  }

  private updateAliens() {
    const t = translations[this.locale].game.msgs;

    for (const alien of this.aliens) {
      alien.distance -= alien.speed;
      alien.x = 50 + Math.cos(alien.angle) * (alien.distance * 0.45);
      alien.y = 50 + Math.sin(alien.angle) * (alien.distance * 0.45);

      if (alien.distance <= 10) {
        // Alien reached base
        if (this.barrier > 0) {
          this.barrier -= 20;
          this.showMessage(t.barrierHit, 'warning');
        } else {
          this.survivors--;
          this.showMessage(t.survivorLost, 'danger');
        }

        this.aliens = this.aliens.filter(a => a.id !== alien.id);

        if (this.survivors <= 0) {
          this.endGame(false);
          return;
        }
      }
    }

    // Check wave complete
    if (this.aliens.length === 0 && this.spawnLoop === null) {
      if (this.wave >= 5) {
        this.endGame(true);
      } else {
        this.wave++;
        setTimeout(() => this.startWave(), 2000);
      }
    }

    this.updateAliensDisplay();
    this.notifyChange();
  }

  shoot() {
    if (!this.isRunning || this.ammo <= 0) return;

    this.ammo--;
    const t = translations[this.locale].game.msgs;

    // Find closest alien
    let closest: Alien | null = null;
    let minDist = Infinity;

    for (const alien of this.aliens) {
      if (alien.distance < minDist) {
        minDist = alien.distance;
        closest = alien;
      }
    }

    if (closest) {
      this.aliens = this.aliens.filter(a => a.id !== closest!.id);
      this.aliensKilled++;

      if (this.onAlienHit) this.onAlienHit(closest.id);
      this.showMessage(t.alienKilled, 'success');
      this.updateAliensDisplay();
    } else {
      this.showMessage(t.missed, '');
    }

    this.notifyChange();
  }

  reload() {
    if (!this.isRunning) return;
    if (this.ammo >= this.maxAmmo) return;

    this.ammo = this.maxAmmo;
    this.showMessage(translations[this.locale].game.msgs.reloaded, '');
    this.notifyChange();
  }

  reinforceBarrier() {
    if (!this.isRunning) return;
    if (this.barrier >= 100) return;

    this.barrier = Math.min(100, this.barrier + 30);
    this.showMessage(translations[this.locale].game.msgs.barrierReinforced, 'success');
    this.notifyChange();
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.spawnLoop) clearInterval(this.spawnLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.win : t.lose, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  private updateAliensDisplay() {
    if (this.onAliensUpdate) this.onAliensUpdate(this.aliens);
  }

  getStats() {
    return {
      survivors: this.survivors,
      aliensKilled: this.aliensKilled,
      wave: this.wave,
      ammo: this.ammo,
      maxAmmo: this.maxAmmo,
      barrier: this.barrier,
      isRunning: this.isRunning,
      alienCount: this.aliens.length
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnAliensUpdate(cb: (aliens: Alien[]) => void) { this.onAliensUpdate = cb; }
  setOnAlienHit(cb: (id: number) => void) { this.onAlienHit = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
