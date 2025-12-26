/**
 * Music Run Game Logic
 * Game #393 - Rhythm Runner
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
  type: 'speaker' | 'drum' | 'piano' | 'guitar';
  lane: number;
  color: string;
  bounce?: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'note' | 'treble' | 'bass';
  lane: number;
  collected: boolean;
  noteType: string;
}

export interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  soundWaves: SoundWave[];
  score: number;
  distance: number;
  speed: number;
  notes: number;
  combo: number;
  maxCombo: number;
  beat: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 65;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];
const NOTE_COLORS = ['#FF1493', '#00CED1', '#FFD700', '#32CD32', '#FF6347', '#9370DB'];

export class MusicRunGame {
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
      soundWaves: [],
      score: 0,
      distance: 0,
      speed: 5,
      notes: 0,
      combo: 1,
      maxCombo: 1,
      beat: 0,
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
    };
  }

  private getRandomNoteColor(): string {
    return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
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
    this.updateBeat(dt);
    this.updatePlayer(dt);
    this.updateObstacles(dt);
    this.updateCollectibles(dt);
    this.updateSoundWaves(dt);
    this.spawnObstacles(dt);
    this.spawnCollectibles(dt);
    this.checkCollisions();
    this.updateScore(dt);
  }

  private updateBeat(dt: number): void {
    this.beatTimer += dt;
    const bpm = 120;
    const beatInterval = 60000 / bpm;
    if (this.beatTimer >= beatInterval) {
      this.beatTimer = 0;
      this.state.beat = (this.state.beat + 1) % 4;
      // Create beat wave
      this.state.soundWaves.push({
        x: 50,
        y: GROUND_Y - 100,
        radius: 10,
        maxRadius: 80,
        color: NOTE_COLORS[this.state.beat % NOTE_COLORS.length],
        alpha: 0.6,
      });
    }
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
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.x -= speed;
      if (obs.bounce !== undefined) {
        obs.bounce += 0.15;
        obs.y = GROUND_Y - obs.height / 2 + 5 + Math.sin(obs.bounce) * 5;
      }
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter(col => {
      if (!col.collected) {
        col.x -= speed;
      }
      return col.x > -30 && !col.collected;
    });
  }

  private updateSoundWaves(dt: number): void {
    this.state.soundWaves = this.state.soundWaves.filter(wave => {
      wave.radius += 2 * (dt / 16);
      wave.alpha -= 0.015 * (dt / 16);
      return wave.alpha > 0 && wave.radius < wave.maxRadius;
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(550, 1200 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Obstacle['type'][] = ['speaker', 'drum', 'piano', 'guitar'];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 40, height = 45;
      if (type === 'speaker') { width = 40; height = 50; }
      if (type === 'drum') { width = 45; height = 40; }
      if (type === 'piano') { width = 55; height = 35; }
      if (type === 'guitar') { width = 35; height = 55; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: GROUND_Y - height / 2 + 5,
        width,
        height,
        type,
        lane,
        color: this.getRandomNoteColor(),
        bounce: type === 'speaker' ? 0 : undefined,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 700) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: Collectible['type'][] = ['note', 'note', 'note', 'treble', 'bass'];
      const type = types[Math.floor(Math.random() * types.length)];
      const noteTypes = ['quarter', 'eighth', 'half'];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 45,
        type,
        lane,
        collected: false,
        noteType: noteTypes[Math.floor(Math.random() * noteTypes.length)],
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
        this.gameOver();
        return;
      }
    }

    for (const col of collectibles) {
      if (col.collected) continue;
      const dist = Math.sqrt(Math.pow(col.x - player.x, 2) + Math.pow(col.y - player.y, 2));
      if (dist < 40) {
        col.collected = true;
        this.collectItem(col);
      }
    }
  }

  private collectItem(col: Collectible): void {
    // Create collection wave effect
    this.state.soundWaves.push({
      x: col.x,
      y: col.y,
      radius: 5,
      maxRadius: 50,
      color: this.getRandomNoteColor(),
      alpha: 0.8,
    });

    switch (col.type) {
      case 'note':
        this.state.notes++;
        this.state.score += 25 * this.state.combo;
        this.state.combo = Math.min(8, this.state.combo + 1);
        break;
      case 'treble':
        this.state.score += 100 * this.state.combo;
        this.state.speed = Math.min(14, this.state.speed + 0.5);
        break;
      case 'bass':
        this.state.combo = Math.min(8, this.state.combo + 2);
        this.state.score += 75 * this.state.combo;
        break;
    }
    this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
  }

  private updateScore(dt: number): void {
    this.state.distance += this.state.speed * (dt / 16);
    this.state.score += Math.floor(this.state.speed * (dt / 100));

    if (this.state.distance % 400 < this.state.speed) {
      this.state.speed = Math.min(14, this.state.speed + 0.1);
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
