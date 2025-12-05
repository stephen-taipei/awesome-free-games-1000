import { translations } from './i18n';

interface Zombie {
  id: number;
  x: number;
  y: number;
  health: number;
  speed: number;
  dead: boolean;
}

export class Game {
  private health: number = 100;
  private stamina: number = 100;
  private barricade: number = 100;
  private wave: number = 1;
  private kills: number = 0;
  private timeLeft: number = 60;
  private isRunning: boolean = false;
  private locale: 'en' | 'zh-TW' = 'zh-TW';

  private zombies: Zombie[] = [];
  private nextZombieId: number = 0;
  private shotgunAmmo: number = 0;
  private grenadeAmmo: number = 0;

  private gameLoop: number | null = null;
  private spawnLoop: number | null = null;
  private timerLoop: number | null = null;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onZombieUpdate: ((zombies: Zombie[]) => void) | null = null;
  private onGameEnd: ((win: boolean) => void) | null = null;
  private onShoot: (() => void) | null = null;

  constructor() {}

  setLocale(locale: 'en' | 'zh-TW') {
    this.locale = locale;
  }

  start() {
    this.health = 100;
    this.stamina = 100;
    this.barricade = 100;
    this.wave = 1;
    this.kills = 0;
    this.timeLeft = 60;
    this.isRunning = true;
    this.zombies = [];
    this.nextZombieId = 0;
    this.shotgunAmmo = 0;
    this.grenadeAmmo = 0;

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    // Game loop - zombie movement and attacks
    this.gameLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.updateZombies();
      this.regenerateStamina();
    }, 100);

    // Spawn zombies
    this.spawnLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.spawnZombie();
    }, 2000 - (this.wave * 100));

    // Timer
    this.timerLoop = window.setInterval(() => {
      if (!this.isRunning) return;
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        this.nextWave();
      }

      this.notifyChange();
    }, 1000);

    // Initial spawn
    this.spawnZombie();
    this.spawnZombie();
  }

  private spawnZombie() {
    const zombie: Zombie = {
      id: this.nextZombieId++,
      x: 10 + Math.random() * 80,
      y: 0,
      health: 1 + Math.floor(this.wave / 2),
      speed: 0.5 + Math.random() * 0.5 + (this.wave * 0.1),
      dead: false
    };
    this.zombies.push(zombie);
    if (this.onZombieUpdate) this.onZombieUpdate(this.zombies);
  }

  private updateZombies() {
    let barricadeUnderAttack = false;

    this.zombies.forEach(zombie => {
      if (zombie.dead) return;

      zombie.y += zombie.speed;

      // Reached barricade
      if (zombie.y >= 80) {
        zombie.y = 80;
        barricadeUnderAttack = true;
        this.barricade -= 0.5;

        if (this.barricade <= 20 && this.barricade > 19) {
          this.showMessage(translations[this.locale].game.msgs.barricadeLow, 'danger');
        }
      }
    });

    // Random ammo drop
    if (Math.random() < 0.005) {
      if (Math.random() < 0.7) {
        this.shotgunAmmo++;
      } else {
        this.grenadeAmmo++;
      }
    }

    if (this.barricade <= 0) {
      this.barricade = 0;
      // Zombies attack player
      const attackingZombies = this.zombies.filter(z => !z.dead && z.y >= 80).length;
      this.health -= attackingZombies * 0.5;

      if (this.health <= 0) {
        this.health = 0;
        this.endGame(false);
      }
    }

    // Clean up dead zombies
    this.zombies = this.zombies.filter(z => !z.dead || z.y < 85);

    if (this.onZombieUpdate) this.onZombieUpdate(this.zombies);
    this.notifyChange();
  }

  private regenerateStamina() {
    if (this.stamina < 100) {
      this.stamina = Math.min(100, this.stamina + 0.3);
    }
  }

  private nextWave() {
    if (this.wave >= 5) {
      this.endGame(true);
      return;
    }

    const t = translations[this.locale].game.msgs;
    this.showMessage(t.waveComplete.replace('{n}', String(this.wave)), 'success');

    this.wave++;
    this.timeLeft = 60;

    setTimeout(() => {
      this.showMessage(t.waveStart.replace('{n}', String(this.wave)), 'warning');
    }, 2000);

    // Clear remaining zombies
    this.zombies = [];
    if (this.onZombieUpdate) this.onZombieUpdate(this.zombies);
  }

  shoot(targetX?: number, targetY?: number) {
    if (!this.isRunning) return;

    if (this.stamina < 5) {
      this.showMessage(translations[this.locale].game.msgs.noStamina, 'warning');
      return;
    }

    this.stamina -= 5;
    if (this.onShoot) this.onShoot();

    // Find closest zombie to click or random if no target
    let hitZombie: Zombie | null = null;

    if (targetX !== undefined && targetY !== undefined) {
      // Find zombie near click
      hitZombie = this.zombies.find(z => {
        if (z.dead) return false;
        const dx = Math.abs(z.x - targetX);
        const dy = Math.abs(z.y - targetY);
        return dx < 15 && dy < 15;
      }) || null;
    }

    if (!hitZombie) {
      // Hit random alive zombie
      const aliveZombies = this.zombies.filter(z => !z.dead);
      if (aliveZombies.length > 0) {
        hitZombie = aliveZombies[Math.floor(Math.random() * aliveZombies.length)];
      }
    }

    if (hitZombie) {
      hitZombie.health--;
      if (hitZombie.health <= 0) {
        hitZombie.dead = true;
        this.kills++;
        this.showMessage(translations[this.locale].game.msgs.zombieKill, 'success');
      }
    }

    if (this.onZombieUpdate) this.onZombieUpdate(this.zombies);
    this.notifyChange();
  }

  repair() {
    if (!this.isRunning) return;

    if (this.stamina < 20) {
      this.showMessage(translations[this.locale].game.msgs.noStamina, 'warning');
      return;
    }

    this.stamina -= 20;
    this.barricade = Math.min(100, this.barricade + 25);
    this.showMessage(translations[this.locale].game.msgs.repaired, 'success');
    this.notifyChange();
  }

  reload() {
    if (!this.isRunning) return;
    this.showMessage(translations[this.locale].game.msgs.reloading, '');
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.spawnLoop) clearInterval(this.spawnLoop);
    if (this.timerLoop) clearInterval(this.timerLoop);

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.rescued : t.overrun, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win);
    this.notifyChange();
  }

  getZombies(): Zombie[] {
    return this.zombies;
  }

  getStats() {
    return {
      health: this.health,
      stamina: this.stamina,
      barricade: this.barricade,
      wave: this.wave,
      kills: this.kills,
      timeLeft: this.timeLeft,
      shotgunAmmo: this.shotgunAmmo,
      grenadeAmmo: this.grenadeAmmo,
      isRunning: this.isRunning
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnZombieUpdate(cb: (zombies: Zombie[]) => void) { this.onZombieUpdate = cb; }
  setOnGameEnd(cb: (win: boolean) => void) { this.onGameEnd = cb; }
  setOnShoot(cb: () => void) { this.onShoot = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
