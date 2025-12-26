/**
 * Theme Park Run Game Logic
 * Game #445 - Running through a theme park collecting tickets and prizes
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSliding: boolean;
  jumpVelocity: number;
  groundY: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'trash-bin' | 'food-cart' | 'mascot' | 'balloon-stand' | 'rope-barrier' | 'sign';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'ticket' | 'cotton-candy' | 'star';
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
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  fun: number;
  score: number;
  distance: number;
  speed: number;
  tickets: number;
  treats: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class ThemeParkRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      obstacles: [],
      collectibles: [],
      particles: [],
      fun: 100,
      score: 0,
      distance: 0,
      speed: 5.2,
      tickets: 0,
      treats: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 26,
      height: 46,
      isJumping: false,
      isSliding: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
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
    this.updateObstacles(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.2;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.84 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Happy running particles
    if (Math.random() < 0.2 && !player.isJumping) {
      const colors = ['#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b'];
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 12,
        y: player.groundY + 5,
        vx: -1.2 - Math.random() * 1.4,
        vy: -Math.random() * 1.3,
        life: 12,
        maxLife: 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2.5,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width - 50;
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

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(530, 1230 - this.state.distance / 48);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['trash-bin', 'food-cart', 'mascot', 'balloon-stand', 'rope-barrier', 'sign'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 40, yOffset = 0;

      switch (type) {
        case 'trash-bin':
          width = 32;
          height = 38;
          yOffset = 3;
          break;
        case 'food-cart':
          width = 50;
          height = 48;
          break;
        case 'mascot':
          width = 40;
          height = 58;
          break;
        case 'balloon-stand':
          width = 35;
          height = 65;
          break;
        case 'rope-barrier':
          width = 55;
          height = 32;
          yOffset = 5;
          break;
        case 'sign':
          width = 50;
          height: 20;
          yOffset = -48;
          break;
      }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y + yOffset,
        width,
        height,
        type,
        lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 760) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['ticket', 'ticket', 'cotton-candy', 'star'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 42,
        type,
        lane,
        collected: false,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 3,
      right: player.x + player.width / 2 - 3,
      top: player.y - player.height / 2 + 3,
      bottom: player.y + player.height / 2 - 3,
    };

    for (const obs of obstacles) {
      if (obs.lane !== player.lane) continue;

      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {

        // Jump over ground obstacles
        if ((obs.type === 'trash-bin' || obs.type === 'rope-barrier') && player.isJumping) {
          this.state.score += 52;
          this.spawnStyleParticles(obs.x, obs.y, '#e91e63');
          obs.x = -200;
          continue;
        }

        // Slide under sign
        if (obs.type === 'sign' && player.isSliding) {
          this.state.score += 68;
          this.spawnStyleParticles(obs.x, obs.y, '#9c27b0');
          obs.x = -200;
          continue;
        }

        // Hit - lose fun
        this.state.fun -= 18;
        this.spawnHitParticles(player.x, player.y);
        obs.x = -200;

        if (this.state.fun <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 33 && Math.abs(col.y - player.y) < 46) {
        col.collected = true;
        this.collectItem(col.type, col.x, col.y);
      }
    }
  }

  private collectItem(type: string, x: number, y: number): void {
    switch (type) {
      case 'ticket':
        this.state.tickets++;
        this.state.score += 70;
        this.spawnCollectParticles(x, y, '#ff9800');
        break;
      case 'cotton-candy':
        this.state.treats++;
        this.state.score += 55;
        this.state.speed = Math.min(13.5, this.state.speed + 0.13);
        this.spawnCollectParticles(x, y, '#e91e63');
        break;
      case 'star':
        this.state.fun = Math.min(100, this.state.fun + 22);
        this.state.score += 85;
        this.spawnCollectParticles(x, y, '#ffc107');
        break;
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 9; i++) {
      const angle = (Math.PI * 2 * i) / 9;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 2.8,
        vy: Math.sin(angle) * 2.8,
        life: 20,
        maxLife: 20,
        color,
        size: 3.4,
      });
    }
  }

  private spawnStyleParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3.8,
        vy: -Math.random() * 2.8,
        life: 19,
        maxLife: 19,
        color,
        size: 3.6,
      });
    }
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 9; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5.4,
        vy: (Math.random() - 0.5) * 5.4,
        life: 22,
        maxLife: 22,
        color: '#f44336',
        size: 3.8,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    // Fun slowly decreases over time
    this.state.fun -= 0.01 * (dt / 16);

    if (this.state.distance % 450 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
    }

    if (this.state.fun <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.state.fun = 0;
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
  }

  private spawnExplosion(x: number, y: number): void {
    const colors = ['#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 3.8,
        vy: Math.sin(angle) * 3.8,
        life: 28,
        maxLife: 28,
        color: colors[i % colors.length],
        size: 4.2,
      });
    }
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
      this.state.player.jumpVelocity = -13;
    }
  }

  public slide(): void {
    if (this.state.phase !== 'playing') return;
    if (!this.state.player.isSliding) {
      this.state.player.isSliding = true;
      setTimeout(() => {
        this.state.player.isSliding = false;
      }, 460);
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
      case 'ArrowDown':
      case 'KeyS':
        this.slide();
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
