/**
 * Candy Run Game Logic
 * Game #391 - Candy Runner
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
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'lollipop' | 'gummyBear' | 'chocolateBar' | 'candyCane';
  lane: number;
  color: string;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'candy' | 'sugarRush' | 'doublePts';
  lane: number;
  collected: boolean;
  color: string;
}

export interface SugarParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
  vy: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: SugarParticle[];
  score: number;
  distance: number;
  speed: number;
  candy: number;
  sugarRush: boolean;
  sugarTime: number;
  doublePoints: boolean;
  doubleTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 65;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];
const CANDY_COLORS = ['#FF69B4', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'];

export class CandyRunGame {
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
      score: 0,
      distance: 0,
      speed: 5,
      candy: 0,
      sugarRush: false,
      sugarTime: 0,
      doublePoints: false,
      doubleTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 35,
      height: 45,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
    };
  }

  private getRandomColor(): string {
    return CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)];
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
    this.updatePowerups(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.18;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.9 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }
  }

  private updateObstacles(dt: number): void {
    const speedMult = this.state.sugarRush ? 1.5 : 1;
    const speed = this.state.speed * speedMult * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speedMult = this.state.sugarRush ? 1.5 : 1;
    const speed = this.state.speed * speedMult * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
    });
  }

  private updateParticles(dt: number): void {
    this.state.particles = this.state.particles.filter(p => {
      p.y += p.vy * (dt / 16);
      p.vy += 0.1;
      p.life -= dt;
      return p.life > 0;
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(550, 1200 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['lollipop', 'gummyBear', 'chocolateBar', 'candyCane'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 35, height = 55;
      if (type === 'gummyBear') { width = 40; height = 45; }
      if (type === 'chocolateBar') { width = 50; height = 30; }
      if (type === 'candyCane') { width = 25; height = 60; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y - height / 2 + 5,
        width,
        height,
        type,
        lane,
        color: this.getRandomColor(),
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 850) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['candy', 'candy', 'candy', 'sugarRush', 'doublePts'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 45,
        type,
        lane,
        collected: false,
        color: this.getRandomColor(),
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 8,
      right: player.x + player.width / 2 - 8,
      top: player.y - player.height / 2 + 5,
      bottom: player.y + player.height / 2 - 5,
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
        if (this.state.sugarRush) {
          obs.x = -100;
          this.state.score += 25;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 45 && player.y < col.y + 50) {
        col.collected = true;
        this.collectItem(col);
      }
    }
  }

  private collectItem(col: Collectible): void {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x: col.x,
        y: col.y,
        size: Math.random() * 6 + 3,
        color: col.color,
        life: 400,
        vy: -Math.random() * 4 - 2,
      });
    }

    const pointMult = this.state.doublePoints ? 2 : 1;

    switch (col.type) {
      case 'candy':
        this.state.candy++;
        this.state.score += 40 * pointMult;
        break;
      case 'sugarRush':
        this.state.sugarRush = true;
        this.state.sugarTime = 4000;
        this.state.score += 60 * pointMult;
        break;
      case 'doublePts':
        this.state.doublePoints = true;
        this.state.doubleTime = 5000;
        this.state.score += 50;
        break;
    }
  }

  private updateScore(dt: number): void {
    const speedMult = this.state.sugarRush ? 1.5 : 1;
    this.state.distance += this.state.speed * speedMult * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
    }
  }

  private updatePowerups(dt: number): void {
    if (this.state.sugarRush) {
      this.state.sugarTime -= dt;
      if (this.state.sugarTime <= 0) {
        this.state.sugarRush = false;
      }
    }
    if (this.state.doublePoints) {
      this.state.doubleTime -= dt;
      if (this.state.doubleTime <= 0) {
        this.state.doublePoints = false;
      }
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
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
      this.state.player.jumpVelocity = -15;
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
