/**
 * Samurai Sprint Game Logic
 * Game #414 - Samurai Runner
 */

export interface Player {
  x: number;
  y: number;
  lane: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSlashing: boolean;
  jumpVelocity: number;
  groundY: number;
  frame: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "ronin" | "archer" | "barrel" | "banner";
  lane: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: "honor" | "katana" | "spirit";
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
  honor: number;
  hasSpirit: boolean;
  spiritTime: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;
const LANE_WIDTH = ARENA_WIDTH / 3;
const GROUND_Y = ARENA_HEIGHT - 80;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH * 1.5, LANE_WIDTH * 2.5];

export class SamuraiSprintGame {
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
      honor: 0,
      hasSpirit: false,
      spiritTime: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: LANES[1],
      y: GROUND_Y,
      lane: 1,
      width: 32,
      height: 44,
      isJumping: false,
      isSlashing: false,
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
    this.updateSpirit(dt);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const targetX = LANES[player.lane];
    player.x += (targetX - player.x) * 0.2;
    player.frame = (player.frame + dt * 0.02) % 4;

    if (player.isJumping) {
      player.y += player.jumpVelocity * (dt / 16);
      player.jumpVelocity += 0.8 * (dt / 16);
      if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.isJumping = false;
        player.jumpVelocity = 0;
      }
    }

    // Samurai wind effect
    if (Math.random() < 0.25) {
      this.state.particles.push({
        x: player.x + (Math.random() - 0.5) * 16,
        y: player.y + Math.random() * 20,
        vx: -2 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1.5,
        life: 15,
        maxLife: 15,
        color: this.state.hasSpirit ? "#ff6b6b" : "#d4af37",
        size: 3,
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
      const types: ("ronin" | "archer" | "barrel" | "banner")[] = ["ronin", "archer", "barrel", "banner"];
      const type = types[Math.floor(Math.random() * types.length)];

      let width = 32, height = 40;
      if (type === "barrel") { width = 36; height = 36; }
      if (type === "banner") { width = 28; height = 50; }

      this.state.obstacles.push({
        x: ARENA_WIDTH + 50,
        y: type === "archer" ? GROUND_Y - 30 : GROUND_Y - height / 2,
        width, height, type, lane,
      });
    }
  }

  private spawnCollectibles(dt: number): void {
    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 1000) {
      this.collectibleTimer = 0;
      const lane = Math.floor(Math.random() * 3);
      const types: ("honor" | "katana" | "spirit")[] = ["honor", "honor", "honor", "katana", "spirit"];
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
        if (this.state.hasSpirit) {
          this.state.hasSpirit = false;
          this.spawnSlashEffect(obs.x, obs.y);
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
      case "honor":
        this.state.honor++;
        this.state.score += 50;
        break;
      case "katana":
        this.state.score += 100;
        this.state.speed = Math.min(12, this.state.speed + 0.5);
        break;
      case "spirit":
        this.state.hasSpirit = true;
        this.state.spiritTime = 5000;
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

  private updateSpirit(dt: number): void {
    if (this.state.hasSpirit) {
      this.state.spiritTime -= dt;
      if (this.state.spiritTime <= 0) this.state.hasSpirit = false;
    }
  }

  private spawnSlashEffect(x: number, y: number): void {
    // Slash line particles
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
      this.state.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * (3 + Math.random() * 3),
        vy: Math.sin(angle) * (3 + Math.random() * 3),
        life: 20, maxLife: 20,
        color: "#ffffff",
        size: 4,
      });
    }
    // Impact sparks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 15, maxLife: 15,
        color: "#ffd700",
        size: 3,
      });
    }
  }

  private gameOver(): void {
    this.state.phase = "gameover";
    this.stopGameLoop();
    this.spawnSlashEffect(this.state.player.x, this.state.player.y);
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

  public slash(): void {
    if (this.state.phase !== "playing") return;
    this.state.player.isSlashing = true;
    setTimeout(() => { this.state.player.isSlashing = false; }, 300);
  }

  public handleKeyDown(code: string): void {
    switch (code) {
      case "ArrowLeft": case "KeyA": this.moveLeft(); break;
      case "ArrowRight": case "KeyD": this.moveRight(); break;
      case "ArrowUp": case "KeyW": case "Space": this.jump(); break;
      case "ArrowDown": case "KeyS": this.slash(); break;
    }
  }

  private stopGameLoop(): void {
    if (this.gameLoop) { cancelAnimationFrame(this.gameLoop); this.gameLoop = null; }
  }

  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
