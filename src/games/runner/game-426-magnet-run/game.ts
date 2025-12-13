/**
 * Magnet Run Game Logic
 * Game #426 - Magnetic Attraction Runner
 *
 * A runner game where the player can switch magnetic polarity
 * to attract to ceiling or floor while dodging obstacles.
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  polarity: 'positive' | 'negative';
  targetY: number;
  velocity: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'barrier' | 'moving';
  polarity?: 'positive' | 'negative' | 'neutral';
  direction?: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'magnet_boost' | 'shield';
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

export interface MagneticField {
  x: number;
  y: number;
  radius: number;
  polarity: 'positive' | 'negative';
  strength: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  fields: MagneticField[];
  score: number;
  distance: number;
  speed: number;
  coins: number;
  hasShield: boolean;
  shieldTime: number;
  magnetBoost: boolean;
  magnetBoostTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const CEILING_Y = 80;
const FLOOR_Y = ARENA_HEIGHT - 80;
const CENTER_Y = ARENA_HEIGHT / 2;

export class MagnetRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private fieldTimer: number = 0;

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
      fields: [],
      score: 0,
      distance: 0,
      speed: 5,
      coins: 0,
      hasShield: false,
      shieldTime: 0,
      magnetBoost: false,
      magnetBoostTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: 80,
      y: FLOOR_Y - 25,
      width: 40,
      height: 40,
      polarity: 'negative',
      targetY: FLOOR_Y - 25,
      velocity: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.fieldTimer = 0;
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
    this.updateFields(dt);
    this.updateParticles(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.spawnFields(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updatePowerups(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const factor = dt / 16;

    // Calculate target position based on polarity
    if (player.polarity === 'negative') {
      player.targetY = FLOOR_Y - player.height / 2;
    } else {
      player.targetY = CEILING_Y + player.height / 2;
    }

    // Apply magnetic force
    const magneticForce = this.state.magnetBoost ? 1.5 : 0.8;
    const diff = player.targetY - player.y;
    player.velocity += diff * 0.05 * magneticForce;
    player.velocity *= 0.9;
    player.y += player.velocity * factor;

    // Clamp position
    player.y = Math.max(CEILING_Y + player.height / 2,
                        Math.min(FLOOR_Y - player.height / 2, player.y));

    // Magnetic particles
    if (Math.random() < 0.4) {
      const particleY = player.polarity === 'negative' ? player.y + 20 : player.y - 20;
      this.state.particles.push({
        x: player.x,
        y: particleY,
        vx: -2 - Math.random() * 2,
        vy: player.polarity === 'negative' ? 2 : -2,
        life: 15,
        maxLife: 15,
        color: player.polarity === 'negative' ? '#ff4444' : '#4444ff',
        size: 3 + Math.random() * 2,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;

      // Moving obstacles
      if (obs.type === 'moving' && obs.direction !== undefined) {
        obs.y += obs.direction * 1.5 * (dt / 16);
        if (obs.y <= CEILING_Y + 30 || obs.y >= FLOOR_Y - 30) {
          obs.direction *= -1;
        }
      }

      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
    });
  }

  private updateFields(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.fields = this.state.fields.filter(field => {
      field.x -= speed * 0.5;
      return field.x > -field.radius;
    });
  }

  private updateParticles(dt: number): void {
    const factor = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.life -= factor;
      return p.life > 0;
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1200 - this.state.distance / 80);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;

      const rand = Math.random();
      if (rand < 0.4) {
        // Floor spike
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: FLOOR_Y - 20,
          width: 30,
          height: 40,
          type: 'spike',
          polarity: 'neutral',
        });
      } else if (rand < 0.7) {
        // Ceiling spike
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: CEILING_Y + 20,
          width: 30,
          height: 40,
          type: 'spike',
          polarity: 'neutral',
        });
      } else if (rand < 0.85) {
        // Barrier (requires specific polarity to pass)
        const isPositive = Math.random() > 0.5;
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: CENTER_Y,
          width: 20,
          height: 100,
          type: 'barrier',
          polarity: isPositive ? 'positive' : 'negative',
        });
      } else {
        // Moving obstacle
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: CENTER_Y,
          width: 35,
          height: 35,
          type: 'moving',
          polarity: 'neutral',
          direction: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1000) {
      this.collectibleTimer = 0;

      const types: ('coin' | 'magnet_boost' | 'shield')[] =
        ['coin', 'coin', 'coin', 'coin', 'magnet_boost', 'shield'];
      const type = types[Math.floor(Math.random() * types.length)];
      const y = Math.random() > 0.5 ? CEILING_Y + 50 : FLOOR_Y - 50;

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y,
        type,
        collected: false,
      });
    }
  }

  private spawnFields(dt: number): void {
    this.fieldTimer += dt;
    if (this.fieldTimer >= 3000) {
      this.fieldTimer = 0;

      this.state.fields.push({
        x: ARENA_WIDTH + 100,
        y: Math.random() * (FLOOR_Y - CEILING_Y - 100) + CEILING_Y + 50,
        radius: 60 + Math.random() * 40,
        polarity: Math.random() > 0.5 ? 'positive' : 'negative',
        strength: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles, fields } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 5,
      right: player.x + player.width / 2 - 5,
      top: player.y - player.height / 2 + 5,
      bottom: player.y + player.height / 2 - 5,
    };

    // Check obstacle collisions
    for (const obs of obstacles) {
      const obsBox = {
        left: obs.x - obs.width / 2,
        right: obs.x + obs.width / 2,
        top: obs.y - obs.height / 2,
        bottom: obs.y + obs.height / 2,
      };

      if (playerBox.right > obsBox.left && playerBox.left < obsBox.right &&
          playerBox.bottom > obsBox.top && playerBox.top < obsBox.bottom) {

        // Barrier collision logic
        if (obs.type === 'barrier' && obs.polarity) {
          if (obs.polarity === player.polarity) {
            // Same polarity repels - can pass through gap
            continue;
          }
        }

        if (this.state.hasShield) {
          this.state.hasShield = false;
          this.spawnExplosion(obs.x, obs.y);
          obs.x = -100;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.sqrt((col.x - player.x) ** 2 + (col.y - player.y) ** 2);
      if (dist < 35) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }

    // Check magnetic field effects
    for (const field of fields) {
      const dist = Math.sqrt((field.x - player.x) ** 2 + (field.y - player.y) ** 2);
      if (dist < field.radius) {
        // Field affects player movement
        const force = (1 - dist / field.radius) * field.strength;
        if (field.polarity === player.polarity) {
          // Same polarity - repel
          const dy = player.y - field.y;
          player.velocity += (dy > 0 ? 1 : -1) * force * 2;
        } else {
          // Different polarity - attract
          const dy = field.y - player.y;
          player.velocity += (dy > 0 ? 1 : -1) * force * 2;
        }
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case 'coin':
        this.state.coins++;
        this.state.score += 50;
        break;
      case 'magnet_boost':
        this.state.magnetBoost = true;
        this.state.magnetBoostTime = 5000;
        this.state.score += 100;
        break;
      case 'shield':
        this.state.hasShield = true;
        this.state.shieldTime = 8000;
        break;
    }
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 500 < this.state.speed) {
      this.state.speed = Math.min(15, this.state.speed + 0.1);
    }
  }

  private updatePowerups(dt: number): void {
    if (this.state.hasShield) {
      this.state.shieldTime -= dt;
      if (this.state.shieldTime <= 0) {
        this.state.hasShield = false;
      }
    }
    if (this.state.magnetBoost) {
      this.state.magnetBoostTime -= dt;
      if (this.state.magnetBoostTime <= 0) {
        this.state.magnetBoost = false;
      }
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 3),
        vy: Math.sin(angle) * (3 + Math.random() * 3),
        life: 30,
        maxLife: 30,
        color: '#ffaa00',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
  }

  public switchPolarity(): void {
    if (this.state.phase !== 'playing') return;
    this.state.player.polarity =
      this.state.player.polarity === 'positive' ? 'negative' : 'positive';

    // Visual feedback particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.state.particles.push({
        x: this.state.player.x,
        y: this.state.player.y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 20,
        maxLife: 20,
        color: this.state.player.polarity === 'positive' ? '#4444ff' : '#ff4444',
        size: 5,
      });
    }
  }

  public handleKeyDown(code: string): void {
    switch (code) {
      case 'Space':
      case 'ArrowUp':
      case 'ArrowDown':
      case 'KeyW':
      case 'KeyS':
        this.switchPolarity();
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
