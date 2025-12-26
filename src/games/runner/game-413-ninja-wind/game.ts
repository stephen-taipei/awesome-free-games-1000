/**
 * Ninja Wind Game Logic
 * Game #413 - Ninja Speed Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSmoke: boolean;
  jumpVelocity: number;
  groundY: number;
  frame: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "shuriken" | "samurai" | "trap" | "arrow";
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: "scroll" | "kunai" | "smoke";
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
  phase: "idle" | "playing" | "gameover";
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  scrolls: number;
  hasSmoke: boolean;
  smokeTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class NinjaWindGame {
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
      phase: "idle",
      player: this.createPlayer(),
      obstacles: [],
      collectibles: [],
      particles: [],
      score: 0,
      distance: 0,
      speed: 5,
      scrolls: 0,
      hasSmoke: false,
      smokeTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 32,
      height: 40,
      isJumping: false,
      isSmoke: false,
      jumpVelocity: 0,
      groundY: GROUND_Y,
      frame: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = "playing";
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private startGameLoop(): void {
    const loop = (time: number) => {
      if (this.state.phase !== "playing") return;
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
    this.updateSmoke(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.25;
    player.frame = (player.frame + dt * 0.025) % 4;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.8 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Ninja wind trail
    if (Math.random() < 0.3) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 20,
        y: player.y + Math.random() * 20,
        vx: -2 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 12,
        maxLife: 12,
        color: this.state.hasSmoke ? "#888888" : "#a0c4ff",
        size: 3 + Math.random() * 3,
      });
    }
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.obstacles = this.state.obstacles.filter((obs) => {
      obs.x -= speed;
      return obs.x > -obs.width;
    });
  }

  private updateCollectibles(dt: number): void {
    const speed = this.state.speed * (dt / 16);
    this.state.collectibles = this.state.collectibles.filter((col) => {
      if (!col.collected) col.x -= speed;
      return col.x > -30 && !col.collected;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter((p) => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private spawnObstacles(dt: number): void {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(700, 1400 - this.state.distance / 50);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ("shuriken" | "samurai" | "trap" | "arrow")[] = ["shuriken", "samurai", "trap", "arrow"];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 32, height = 32;
      if (type === "samurai") { width = 36; height = 44; }
      if (type === "trap") { width = 40; height = 20; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: type === "arrow" ? GROUND_Y - 50 : GROUND_Y - height / 2,
        width, height, type, lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1000) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ("scroll" | "kunai" | "smoke")[] = ["scroll", "scroll", "scroll", "kunai", "smoke"];
      const type = types[Math.floor(Math.random() * types.length)];

      this.state.collectibles.push({
        x: ARENA_WIDTH + 30,
        y: GROUND_Y - 40,
        type, lane, collected: false,
      });
    }
  }

  private checkCollisions(): void {
    const { player, obstacles, collectibles } = this.state;
    const playerBox = {
      left: player.x - player.width / 2 + 4,
      right: player.x + player.width / 2 - 4,
      top: player.y - player.height / 2 + 4,
      bottom: player.y + player.height / 2 - 4,
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
        if (this.state.hasSmoke) {
          this.state.hasSmoke = false;
          this.spawnSmokeBurst(obs.x, obs.y);
          obs.x = -100;
        } else {
          this.gameOver();
          return;
        }
      }
    }

    for (const col of collectibles) {
      if (col.collected || col.lane !== player.lane) continue;
      const dist = Math.abs(col.x - player.x);
      if (dist < 35 && player.y < col.y + 30) {
        col.collected = true;
        this.collectItem(col.type);
      }
    }
  }

  private collectItem(type: string): void {
    switch (type) {
      case "scroll":
        this.state.scrolls++;
        this.state.score += 50;
        break;
      case "kunai":
        this.state.score += 100;
        this.state.speed = Math.min(12, this.state.speed + 0.5);
        break;
      case "smoke":
        this.state.hasSmoke = true;
        this.state.smokeTime = 5000;
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

  private updateSmoke(dt: number): void {
    if (this.state.hasSmoke) {
      this.state.smokeTime -= dt;
      if (this.state.smokeTime <= 0) this.state.hasSmoke = false;
    }
  }

  private spawnSmokeBurst(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 30, maxLife: 30,
        color: "#666666",
        size: 8 + Math.random() * 8,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = "gameover";
    this.stopGameLoop();
    this.spawnSmokeBurst(this.state.player.x, this.state.player.y);
  }

  public moveLeft(): void {
    if (this.state.phase !== "playing") return;
    if (this.state.player.lane > 0) this.state.player.lane--;
  }

  public moveRight(): void {
    if (this.state.phase !== "playing") return;
    if (this.state.player.lane < 2) this.state.player.lane++;
  }

  public jump(): void {
    if (this.state.phase !== "playing") return;
    if (!this.state.player.isJumping) {
      this.state.player.isJumping = true;
      this.state.player.jumpVelocity = -14;
    }
  }

  public smokeBomb(): void {
    if (this.state.phase !== "playing") return;
    this.state.player.isSmoke = true;
    setTimeout(() => { this.state.player.isSmoke = false; }, 300);
  }

  public handleKeyDown(code: string): void {
    switch (code) {
      case "ArrowLeft": case "KeyA": this.moveLeft(); break;
      case "ArrowRight": case "KeyD": this.moveRight(); break;
      case "ArrowUp": case "KeyW": case "Space": this.jump(); break;
      case "ArrowDown": case "KeyS": this.smokeBomb(); break;
    }
  }

  private stopGameLoop(): void {
    if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; }
  }

  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
