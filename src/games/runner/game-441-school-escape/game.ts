/**
 * School Escape Game Logic
 * Game #441 - Student escaping from school through hallways
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
  type: 'desk' | 'locker' | 'teacher' | 'mop-bucket' | 'trash-can' | 'door';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'candy' | 'comic' | 'phone';
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
  suspicion: number;
  score: number;
  distance: number;
  speed: number;
  candies: number;
  comics: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class SchoolEscapeGame {
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
      suspicion: 0,
      score: 0,
      distance: 0,
      speed: 5,
      candies: 0,
      comics: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 26,
      height: 48,
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
      player.jumpVelocity += 0.85 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Running particles (sneaker scuffs)
    if (Math.random() < 0.2 && !player.isJumping) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 12,
        y: player.groundY + 6,
        vx: -1.2 - Math.random() * 1.5,
        vy: -Math.random() * 1,
        life: 10,
        maxLife: 10,
        color: '#bdc3c7',
        size: 2,
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
    const spawnInterval = Math.max(500, 1200 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['desk', 'locker', 'teacher', 'mop-bucket', 'trash-can', 'door'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 40, yOffset = 0;

      switch (type) {
        case 'desk':
          width = 55;
          height = 35;
          break;
        case 'locker':
          width = 35;
          height = 60;
          break;
        case 'teacher':
          width = 32;
          height = 55;
          break;
        case 'mop-bucket':
          width = 30;
          height = 28;
          yOffset = 5;
          break;
        case 'trash-can':
          width = 28;
          height = 40;
          break;
        case 'door':
          width = 50;
          height = 20;
          yOffset = -45;
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
    if (this.collectibleTimer >= 850) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['candy', 'candy', 'comic', 'phone'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 40,
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

        // Can jump over ground obstacles
        if ((obs.type === 'desk' || obs.type === 'mop-bucket' || obs.type === 'trash-can') && player.isJumping) {
          this.state.score += 50;
          this.spawnStyleParticles(obs.x, obs.y, '#3498db');
          obs.x = -200;
          continue;
        }

        // Can slide under door
        if (obs.type === 'door' && player.isSliding) {
          this.state.score += 70;
          this.spawnStyleParticles(obs.x, obs.y, '#9b59b6');
          obs.x = -200;
          continue;
        }

        // Hit!
        this.state.suspicion += 25;
        this.spawnHitParticles(player.x, player.y);
        obs.x = -200;

        if (this.state.suspicion >= 100) {
          this.gameOver();
          return;
        }
      }
    }

    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 32 && Math.abs(col.y - player.y) < 45) {
        col.collected = true;
        this.collectItem(col.type, col.x, col.y);
      }
    }
  }

  private collectItem(type: string, x: number, y: number): void {
    switch (type) {
      case 'candy':
        this.state.candies++;
        this.state.score += 40;
        this.spawnCollectParticles(x, y, '#e74c3c');
        break;
      case 'comic':
        this.state.comics++;
        this.state.score += 100;
        this.spawnCollectParticles(x, y, '#3498db');
        break;
      case 'phone':
        this.state.suspicion = Math.max(0, this.state.suspicion - 20);
        this.state.score += 80;
        this.spawnCollectParticles(x, y, '#2ecc71');
        break;
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        life: 18,
        maxLife: 18,
        color,
        size: 3,
      });
    }
  }

  private spawnStyleParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 5; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3.5,
        vy: -Math.random() * 2.5,
        life: 18,
        maxLife: 18,
        color,
        size: 3.5,
      });
    }
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 22,
        maxLife: 22,
        color: '#e74c3c',
        size: 3.5,
      });
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    // Gradual suspicion increase (getting noticed over time)
    this.state.suspicion += 0.008 * (dt / 16);

    if (this.state.distance % 450 < this.state.speed) {
      this.state.speed = Math.min(13, this.state.speed + 0.1);
    }

    if (this.state.suspicion >= 100) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.state.suspicion = 100;
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * 3.5,
        vy: Math.sin(angle) * 3.5,
        life: 25,
        maxLife: 25,
        color: ['#e74c3c', '#c0392b'][i % 2],
        size: 4,
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
      }, 450);
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
