/**
 * Zombie Escape Game Logic
 * Game #377 - Horror Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  jumpVelocity: number;
  groundY: number;
  health: number;
  maxHealth: number;
  ammo: number;
}

export interface Zombie {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'walker' | 'runner' | 'crawler' | 'brute';
  lane: number;
  speed: number;
  animFrame: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'ammo' | 'health' | 'speed';
  lane: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  zombies: Zombie[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  survivors: number;
  speedBoostTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class ZombieEscapeGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private hordeTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      zombies: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 4,
      survivors: 0,
      speedBoostTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 35,
      height: 50,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      health: 100,
      maxHealth: 100,
      ammo: 10,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.hordeTimer = 0;
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private startGameLoop(): void {
    const loop = (time: number) => {
      if (this.state.phase !== 'playing') return;
      const dt = Math.min(time - this.lastTime, 50);
      this.lastTime = time;
      this.update(dt);
      this.emitState();
      this.gameLoop = requestAnimationFrame(loop);
    };
    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.updatePlayer(dt);
    this.updateZombies(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
    this.spawnZombies(dt);
    this.spawnCollectibles(dt);
    this.spawnHorde(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateSpeedBoost(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.2;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.8 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Blood trail particles when injured
    if (player.health < 50 && Math.random() < 0.2) {
      this.state.particles.push({
        x: player.x,
        y: player.y + player.height / 2,
        vx: -1 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 15,
        maxLife: 15,
        color: '#8b0000',
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateZombies(dt: number): void {
    const baseSpeed = this.state.speed * (dt / 16);

    this.state.zombies = this.state.zombies.filter(zombie => {
      // Move zombie based on type
      const typeSpeed = zombie.type === 'runner' ? 1.3 :
                       zombie.type === 'crawler' ? 0.7 :
                       zombie.type === 'brute' ? 0.9 : 1.0;

      zombie.x -= baseSpeed * typeSpeed * zombie.speed;
      zombie.animFrame += dt * 0.01;

      // Zombies also move towards player lane slowly
      const targetX = LANES[zombie.lane];
      zombie.x += (targetX - zombie.x) * 0.05;

      return zombie.x > -zombie.width - 50;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private spawnZombies(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1400 - this.state.distance / 40);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('walker' | 'runner' | 'crawler' | 'brute')[] =
        ['walker', 'walker', 'walker', 'runner', 'crawler', 'brute'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 50;
      if (type === 'crawler') { width = 50; height = 30; }
      if (type === 'brute') { width = 55; height = 65; }

      this.state.zombies.push({
        x: ARENA_WIDTH + 50,
        y: type === 'crawler' ? GROUND_Y + 15 : GROUND_Y,
        width,
        height,
        type,
        lane,
        speed: 0.8 + Math.random() * 0.4,
        animFrame: Math.random() * 10,
      });
    }
  }

  private spawnHorde(dt: number): void {
    this.hordeTimer += dt;
    // Spawn zombie hordes every 15 seconds
    if (this.hordeTimer >= 15000) {
      this.hordeTimer = 0;
      // Spawn multiple zombies in quick succession
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const lane = Math.floor(Math.random() * 3);
          this.state.zombies.push({
            x: ARENA_WIDTH + 50 + i * 80,
            y: GROUND_Y,
            width: 40,
            height: 50,
            type: 'walker',
            lane,
            speed: 1.0,
            animFrame: Math.random() * 10,
          });
        }, i * 200);
      }
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1500) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('ammo' | 'health' | 'speed')[] = ['ammo', 'ammo', 'health', 'speed'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 35,
        type,
        lane,
        collected: false,
      });
    }
  }

  private checkCollisions(): void {
    const { player, zombies, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 5,
      right: player.x + player.width / 2 - 5,
      top: player.y - player.height / 2 + 5,
      bottom: player.y + player.height / 2 - 5,
    };

    // Check zombie collisions
    for (const zombie of zombies) {
      if (zombie.lane !== player.lane) continue;
      const zombieBox = {
        left: zombie.x - zombie.width / 2,
        right: zombie.x + zombie.width / 2,
        top: zombie.y - zombie.height / 2,
        bottom: zombie.y + zombie.height / 2,
      };

      if (playerBox.right > zombieBox.left && playerBox.left < zombieBox.right &&
          playerBox.bottom > zombieBox.top && playerBox.top < zombieBox.bottom) {
        // Take damage
        player.health -= 25;
        this.spawnBloodSplatter(player.x, player.y);
        zombie.x = -200; // Remove zombie

        if (player.health <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 40 && player.y < col.y + 30) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    const { player } = this.state;
    switch (type) {
      case 'ammo':
        player.ammo += 5;
        this.state.score += 30;
        break;
      case 'health':
        player.health = Math.min(player.maxHealth, player.health + 30);
        this.state.score += 50;
        break;
      case 'speed':
        this.state.speedBoostTime = 3000;
        this.state.speed = Math.min(10, this.state.speed + 2);
        this.state.score += 100;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 80));

    // Save survivors every 100 distance
    if (Math.floor(this.state.distance / 100) > this.state.survivors) {
      this.state.survivors = Math.floor(this.state.distance / 100);
    }

    // Gradually increase speed
    if (this.state.distance % 300 < this.state.speed) {
      this.state.speed = Math.min(12, this.state.speed + 0.08);
    }
  }

  private updateSpeedBoost(dt: number): void {
    if (this.state.speedBoostTime > 0) {
      this.state.speedBoostTime -= dt;
      if (this.state.speedBoostTime <= 0) {
        this.state.speed = Math.max(4, this.state.speed - 2);
      }
    }
  }

  private spawnBloodSplatter(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 25,
        maxLife: 25,
        color: ['#8b0000', '#a52a2a', '#800020'][Math.floor(Math.random() * 3)],
        size: 3 + Math.random() * 4,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnBloodSplatter(this.state.player.x, this.state.player.y);
  }

  public moveLeft(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
    }
  }

  public moveRight(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.lane < 2) {
      this.state.player.lane++;
    }
  }

  public jump(): void {
    if (this.state.phase !== 'playing') return;
    if (!this.state.player.isJumping) {
      this.state.player.isJumping = true;
      this.state.player.jumpVelocity = -14;
    }
  }

  public handleKeyDown(code: string): void {
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.jump();
        break;
    }
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    this.stopGameLoop();
  }

  private emitState(): void {
    if (this.onStateChange) this.onStateChange(this.state);
  }
}
