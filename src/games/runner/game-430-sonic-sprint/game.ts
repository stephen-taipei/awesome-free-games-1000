/**
 * Sonic Sprint Game Logic
 * Game #430 - Sonic Speed Runner
 *
 * A fast-paced runner with sound wave mechanics,
 * collecting musical notes and creating sonic booms.
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
  sonicEnergy: number;
  maxSonicEnergy: number;
  isBoosting: boolean;
  boostTime: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'sound_barrier' | 'noise_block' | 'silence_zone' | 'discord';
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'note' | 'chord' | 'beat_boost';
  lane: number;
  collected: boolean;
  noteType?: number;
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

export interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  soundWaves: SoundWave[];
  score: number;
  distance: number;
  speed: number;
  notes: number;
  combo: number;
  maxCombo: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 75;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class SonicSprintGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private collectibleTimer: number = 0;
  private beatTimer: number = 0;

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
      soundWaves: [],
      score: 0,
      distance: 0,
      speed: 6,
      notes: 0,
      combo: 0,
      maxCombo: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 40,
      height: 45,
      isJumping: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      sonicEnergy: 50,
      maxSonicEnergy: 100,
      isBoosting: false,
      boostTime: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.beatTimer = 0;
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
    this.updateSoundWaves(dt);
    this.updateBeat(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
    this.updateBoost(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const factor = dt / 16;
    const targetX = LANES[player.lane];

    player.x += (targetX - player.x) * 0.25;

    if (player.isJumping) {
      player.y += player.jumpVelocity * factor;
      player.jumpVelocity += 0.85 * factor;
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Sound trail particles
    if (Math.random() < (player.isBoosting ? 0.7 : 0.3)) {
      const colors = player.isBoosting ?
        ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'] :
        ['#9b59b6', '#8e44ad', '#6c3483'];
      this.state.particles.push({
        x: player.x - 20,
        y: player.y + (Math.random() - 0.5) * 20,
        vx: player.isBoosting ? -8 : -4,
        vy: (Math.random() - 0.5) * 3,
        life: 15,
        maxLife: 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: player.isBoosting ? 5 : 3,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speedMultiplier = this.state.player.isBoosting ? 1.5 : 1;
    const speed = this.state.speed * speedMultiplier * (dt / 16);

    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speedMultiplier = this.state.player.isBoosting ? 1.5 : 1;
    const speed = this.state.speed * speedMultiplier * (dt / 16);

    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
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

  private updateSoundWaves(dt: number): void {
    const factor = dt / 16;
    this.state.soundWaves = this.state.soundWaves.filter(wave => {
      wave.radius += 5 * factor;
      wave.life -= factor * 2;
      return wave.life > 0 && wave.radius < wave.maxRadius;
    });
  }

  private updateBeat(dt: number): void {
    this.beatTimer += dt;
    // Create beat pulse every 500ms
    if (this.beatTimer >= 500) {
      this.beatTimer = 0;
      // Background beat visual handled in render
    }
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(600, 1200 - this.state.distance / 70);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const rand = Math.random();

      if (rand < 0.3) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 25,
          width: 40,
          height: 50,
          type: 'sound_barrier',
          lane,
        });
      } else if (rand < 0.55) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 30,
          width: 45,
          height: 60,
          type: 'noise_block',
          lane,
        });
      } else if (rand < 0.75) {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 40,
          width: 50,
          height: 80,
          type: 'silence_zone',
          lane,
        });
      } else {
        this.state.obstacles.push({
          x: ARENA_WIDTH + 50,
          y: GROUND_Y - 35,
          width: 40,
          height: 40,
          type: 'discord',
          lane,
        });
      }
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 600) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ('note' | 'chord' | 'beat_boost')[] =
        ['note', 'note', 'note', 'note', 'chord', 'beat_boost'];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 45,
        type,
        lane,
        collected: false,
        noteType: Math.floor(Math.random() * 4),
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles, soundWaves } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 5,
      right: player.x + player.width / 2 - 5,
      top: player.y - player.height / 2 + 5,
      bottom: player.y + player.height / 2 - 5,
    };

    // Check obstacle collisions
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

        // Boosting can break through some obstacles
        if (player.isBoosting && obs.type !== 'silence_zone') {
          this.createSonicBoom(obs.x, obs.y);
          obs.x = -100;
          this.state.score += 200;
        } else {
          // Reset combo on hit
          this.state.combo = 0;
          this.gameOver();
          return;
        }
      }
    }

    // Check collectible collisions
    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 45 && Math.abs(col.y - player.y) < 50) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    // Increase combo
    this.state.combo++;
    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }

    const comboMultiplier = 1 + Math.floor(this.state.combo / 5) * 0.2;

    switch (type) {
      case 'note':
        this.state.notes++;
        this.state.score += Math.floor(30 * comboMultiplier);
        this.state.player.sonicEnergy = Math.min(
          this.state.player.maxSonicEnergy,
          this.state.player.sonicEnergy + 5
        );
        // Small sound wave
        this.state.soundWaves.push({
          x: this.state.player.x,
          y: this.state.player.y,
          radius: 10,
          maxRadius: 40,
          life: 15,
        });
        break;
      case 'chord':
        this.state.notes += 3;
        this.state.score += Math.floor(100 * comboMultiplier);
        this.state.player.sonicEnergy = Math.min(
          this.state.player.maxSonicEnergy,
          this.state.player.sonicEnergy + 15
        );
        // Medium sound wave
        this.state.soundWaves.push({
          x: this.state.player.x,
          y: this.state.player.y,
          radius: 15,
          maxRadius: 60,
          life: 20,
        });
        break;
      case 'beat_boost':
        this.state.player.isBoosting = true;
        this.state.player.boostTime = 4000;
        this.state.score += Math.floor(150 * comboMultiplier);
        // Large sound wave
        this.createSonicBoom(this.state.player.x, this.state.player.y);
        break;
    }
  }

  private createSonicBoom(x: number, y: number): void {
    this.state.soundWaves.push({
      x, y,
      radius: 20,
      maxRadius: 120,
      life: 30,
    });

    // Explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'];
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (5 + Math.random() * 4),
        vy: Math.sin(angle) * (5 + Math.random() * 4),
        life: 25,
        maxLife: 25,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 4,
      });
    }
  }

  private updateScore(dt: number): void {
    const speedMultiplier = this.state.player.isBoosting ? 1.5 : 1;
    this.state.distance += this.state.speed * speedMultiplier * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 80));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(18, this.state.speed + 0.12);
    }
  }

  private updateBoost(dt: number): void {
    const { player } = this.state;

    if (player.isBoosting) {
      player.boostTime -= dt;
      player.sonicEnergy = Math.max(0, player.sonicEnergy - 0.5 * (dt / 16));

      if (player.boostTime <= 0 || player.sonicEnergy <= 0) {
        player.isBoosting = false;
      }
    } else {
      // Slowly regenerate sonic energy
      player.sonicEnergy = Math.min(player.maxSonicEnergy, player.sonicEnergy + 0.1 * (dt / 16));
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (4 + Math.random() * 3),
        vy: Math.sin(angle) * (4 + Math.random() * 3),
        life: 20,
        maxLife: 20,
        color: '#9b59b6',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = 'gameover';
    this.stopGameLoop();
    this.spawnExplosion(this.state.player.x, this.state.player.y);
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

  public activateBoost(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.player.sonicEnergy >= 30 && !this.state.player.isBoosting) {
      this.state.player.isBoosting = true;
      this.state.player.boostTime = 3000;
      this.createSonicBoom(this.state.player.x, this.state.player.y);
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
      case 'ShiftLeft':
      case 'ShiftRight':
        this.activateBoost();
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
