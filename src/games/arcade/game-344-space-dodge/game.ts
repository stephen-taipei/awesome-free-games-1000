/**
 * Space Dodge Game Logic
 * Game #344 - Dodge asteroids in space
 */

export interface Spaceship {
  x: number;
  y: number;
  width: number;
  height: number;
  invincible: boolean;
  invincibleTime: number;
}

export interface Asteroid {
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export interface PowerUp {
  x: number;
  y: number;
  type: "shield" | "slow" | "shrink";
  collected: boolean;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  spaceship: Spaceship;
  asteroids: Asteroid[];
  stars: Star[];
  powerUps: PowerUp[];
  difficulty: number;
  distance: number;
}

const INITIAL_SPEED = 3;

export class SpaceDodgeGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private asteroidTimer: number = 0;
  private powerUpTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("spaceDodgeHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      spaceship: {
        x: 0,
        y: 0,
        width: 40,
        height: 50,
        invincible: false,
        invincibleTime: 0,
      },
      asteroids: [],
      stars: [],
      powerUps: [],
      difficulty: 1,
      distance: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.spaceship.x = width / 2 - 20;
    this.state.spaceship.y = height - 100;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.state.spaceship.x = this.canvasWidth / 2 - 20;
    this.state.spaceship.y = this.canvasHeight - 100;
    this.asteroidTimer = 0;
    this.powerUpTimer = 0;
    this.initStars();
    this.emitState();
  }

  private initStars(): void {
    this.state.stars = [];
    for (let i = 0; i < 50; i++) {
      this.state.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 1,
      });
    }
  }

  public moveShip(targetX: number): void {
    if (this.state.phase !== "playing") return;

    const dx = targetX - (this.state.spaceship.x + this.state.spaceship.width / 2);
    this.state.spaceship.x += dx * 0.1;

    // Clamp to canvas bounds
    this.state.spaceship.x = Math.max(
      0,
      Math.min(this.canvasWidth - this.state.spaceship.width, this.state.spaceship.x)
    );
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    // Update distance and difficulty
    this.state.distance++;
    this.state.score = Math.floor(this.state.distance / 10);
    this.state.difficulty = 1 + Math.floor(this.state.score / 100);

    // Update invincibility
    if (this.state.spaceship.invincible) {
      this.state.spaceship.invincibleTime--;
      if (this.state.spaceship.invincibleTime <= 0) {
        this.state.spaceship.invincible = false;
      }
    }

    // Update stars
    for (const star of this.state.stars) {
      star.y += star.speed;
      if (star.y > this.canvasHeight) {
        star.y = 0;
        star.x = Math.random() * this.canvasWidth;
      }
    }

    // Update asteroids
    for (const asteroid of this.state.asteroids) {
      asteroid.y += asteroid.speed;
      asteroid.rotation += asteroid.rotationSpeed;
    }

    // Update power-ups
    for (const powerUp of this.state.powerUps) {
      powerUp.y += 2;
    }

    // Remove off-screen items
    this.state.asteroids = this.state.asteroids.filter((a) => a.y < this.canvasHeight + 50);
    this.state.powerUps = this.state.powerUps.filter(
      (p) => p.y < this.canvasHeight + 30 && !p.collected
    );

    // Spawn asteroids
    this.asteroidTimer++;
    const spawnRate = Math.max(20, 40 - this.state.difficulty * 3);

    if (this.asteroidTimer >= spawnRate) {
      this.spawnAsteroid();
      this.asteroidTimer = 0;
    }

    // Spawn power-ups
    this.powerUpTimer++;
    if (this.powerUpTimer >= 300) {
      this.spawnPowerUp();
      this.powerUpTimer = 0;
    }

    // Check collisions
    this.checkCollisions();

    this.emitState();
  }

  private spawnAsteroid(): void {
    const radius = 15 + Math.random() * 25;
    const x = radius + Math.random() * (this.canvasWidth - radius * 2);
    const speed = INITIAL_SPEED + Math.random() * 2 + this.state.difficulty * 0.5;

    this.state.asteroids.push({
      x,
      y: -radius,
      radius,
      speed,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
    });
  }

  private spawnPowerUp(): void {
    const types: PowerUp["type"][] = ["shield", "slow", "shrink"];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = 20 + Math.random() * (this.canvasWidth - 40);

    this.state.powerUps.push({
      x,
      y: -20,
      type,
      collected: false,
    });
  }

  private checkCollisions(): void {
    const { spaceship, asteroids, powerUps } = this.state;
    const shipCenterX = spaceship.x + spaceship.width / 2;
    const shipCenterY = spaceship.y + spaceship.height / 2;

    // Check asteroid collisions
    if (!spaceship.invincible) {
      for (const asteroid of asteroids) {
        const dx = shipCenterX - asteroid.x;
        const dy = shipCenterY - asteroid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < asteroid.radius + spaceship.width / 3) {
          this.gameOver();
          return;
        }
      }
    }

    // Check power-up collisions
    for (const powerUp of powerUps) {
      if (powerUp.collected) continue;

      const dx = shipCenterX - powerUp.x;
      const dy = shipCenterY - powerUp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        powerUp.collected = true;
        this.applyPowerUp(powerUp.type);
      }
    }
  }

  private applyPowerUp(type: PowerUp["type"]): void {
    switch (type) {
      case "shield":
        this.state.spaceship.invincible = true;
        this.state.spaceship.invincibleTime = 180;
        break;
      case "slow":
        for (const asteroid of this.state.asteroids) {
          asteroid.speed *= 0.5;
        }
        break;
      case "shrink":
        this.state.spaceship.width = 25;
        this.state.spaceship.height = 35;
        setTimeout(() => {
          this.state.spaceship.width = 40;
          this.state.spaceship.height = 50;
        }, 5000);
        break;
    }
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("spaceDodgeHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {}

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
