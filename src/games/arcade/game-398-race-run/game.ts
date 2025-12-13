/**
 * Race Run Game Logic
 * Game #398 - Race against AI opponents to reach the finish line
 */

export interface Racer {
  id: string;
  name: string;
  position: number; // distance traveled
  lane: number; // lane number (0-2)
  speed: number;
  maxSpeed: number;
  acceleration: number;
  color: string;
  isPlayer: boolean;
  isFinished: boolean;
  finishTime: number;
  rank: number;
  isBoosting: boolean;
  boostTimer: number;
}

export interface PowerUp {
  x: number;
  lane: number;
  type: "boost" | "coin";
  active: boolean;
}

export interface Obstacle {
  x: number;
  lane: number;
  width: number;
  active: boolean;
}

export interface GameState {
  phase: "idle" | "countdown" | "playing" | "finished";
  level: number;
  score: number;
  highScore: number;
  coins: number;
  player: Racer;
  aiRacers: Racer[];
  powerUps: PowerUp[];
  obstacles: Obstacle[];
  raceDistance: number;
  countdown: number;
  finishedRacers: Racer[];
}

const BASE_SPEED = 5;
const MAX_SPEED = 12;
const BOOST_SPEED = 18;
const ACCELERATION = 0.3;
const DECELERATION = 0.5;
const OBSTACLE_SLOWDOWN = 0.4;
const BOOST_DURATION = 60; // frames
const LANE_COUNT = 3;

const AI_COLORS = ["#e74c3c", "#9b59b6", "#f39c12", "#1abc9c"];
const AI_NAMES = ["Red Racer", "Purple Flash", "Gold Runner", "Teal Speed"];

export class RaceRunGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private spawnTimer: number = 0;
  private countdownInterval: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("raceRunHighScore");
    return {
      phase: "idle",
      level: 1,
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      coins: 0,
      player: this.createPlayer(),
      aiRacers: [],
      powerUps: [],
      obstacles: [],
      raceDistance: 1000,
      countdown: 3,
      finishedRacers: [],
    };
  }

  private createPlayer(): Racer {
    return {
      id: "player",
      name: "You",
      position: 0,
      lane: 1,
      speed: 0,
      maxSpeed: MAX_SPEED,
      acceleration: ACCELERATION,
      color: "#3498db",
      isPlayer: true,
      isFinished: false,
      finishTime: 0,
      rank: 0,
      isBoosting: false,
      boostTimer: 0,
    };
  }

  private createAIRacer(index: number, difficulty: number): Racer {
    const speedVariation = difficulty * 0.5;
    return {
      id: `ai-${index}`,
      name: AI_NAMES[index % AI_NAMES.length],
      position: 0,
      lane: index % LANE_COUNT,
      speed: 0,
      maxSpeed: MAX_SPEED + (Math.random() - 0.5) * speedVariation,
      acceleration: ACCELERATION + (Math.random() - 0.5) * 0.1,
      color: AI_COLORS[index % AI_COLORS.length],
      isPlayer: false,
      isFinished: false,
      finishTime: 0,
      rank: 0,
      isBoosting: false,
      boostTimer: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    const aiCount = 2 + this.state.level; // More AI racers in higher levels
    const difficulty = this.state.level;

    this.state = {
      ...this.createInitialState(),
      phase: "countdown",
      level: this.state.level,
      highScore: this.state.highScore,
      raceDistance: 1000 + this.state.level * 200,
      aiRacers: Array.from({ length: Math.min(aiCount, 3) }, (_, i) =>
        this.createAIRacer(i, difficulty)
      ),
    };

    this.spawnTimer = 0;
    this.startCountdown();
  }

  private startCountdown(): void {
    this.state.countdown = 3;
    this.emitState();

    this.countdownInterval = window.setInterval(() => {
      this.state.countdown--;

      if (this.state.countdown <= 0) {
        this.state.phase = "playing";
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      }

      this.emitState();
    }, 1000);
  }

  public moveLeft(): void {
    if (this.state.phase !== "playing") return;
    if (this.state.player.lane > 0) {
      this.state.player.lane--;
    }
  }

  public moveRight(): void {
    if (this.state.phase !== "playing") return;
    if (this.state.player.lane < LANE_COUNT - 1) {
      this.state.player.lane++;
    }
  }

  public boost(): void {
    if (this.state.phase !== "playing") return;
    if (!this.state.player.isBoosting && this.state.player.boostTimer === 0) {
      this.state.player.isBoosting = true;
      this.state.player.boostTimer = BOOST_DURATION;
    }
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    // Update player
    this.updateRacer(this.state.player);

    // Update AI racers
    for (const ai of this.state.aiRacers) {
      this.updateRacer(ai);
      this.updateAI(ai);
    }

    // Check power-up collisions
    for (const powerUp of this.state.powerUps) {
      if (!powerUp.active) continue;

      if (
        this.state.player.lane === powerUp.lane &&
        Math.abs(this.state.player.position - powerUp.x) < 30
      ) {
        powerUp.active = false;
        if (powerUp.type === "boost") {
          this.state.player.isBoosting = true;
          this.state.player.boostTimer = BOOST_DURATION;
        } else if (powerUp.type === "coin") {
          this.state.coins++;
        }
      }
    }

    // Check obstacle collisions
    for (const obstacle of this.state.obstacles) {
      if (!obstacle.active) continue;

      if (
        this.state.player.lane === obstacle.lane &&
        Math.abs(this.state.player.position - obstacle.x) < 30
      ) {
        obstacle.active = false;
        this.state.player.speed *= OBSTACLE_SLOWDOWN;
      }
    }

    // Remove inactive power-ups and obstacles
    this.state.powerUps = this.state.powerUps.filter((p) => p.active);
    this.state.obstacles = this.state.obstacles.filter((o) => o.active);

    // Spawn new items
    this.spawnTimer++;
    if (this.spawnTimer > 80) {
      this.spawnItems();
      this.spawnTimer = 0;
    }

    // Check if race is finished
    const allRacers = [this.state.player, ...this.state.aiRacers];
    const finishedCount = allRacers.filter((r) => r.isFinished).length;

    if (finishedCount === allRacers.length) {
      this.finishRace();
    }

    this.emitState();
  }

  private updateRacer(racer: Racer): void {
    if (racer.isFinished) return;

    // Update boost
    if (racer.isBoosting && racer.boostTimer > 0) {
      racer.speed = BOOST_SPEED;
      racer.boostTimer--;
      if (racer.boostTimer === 0) {
        racer.isBoosting = false;
      }
    } else {
      // Normal acceleration
      if (racer.speed < racer.maxSpeed) {
        racer.speed += racer.acceleration;
      }
      racer.speed = Math.min(racer.speed, racer.maxSpeed);
    }

    // Update position
    racer.position += racer.speed;

    // Check finish line
    if (racer.position >= this.state.raceDistance) {
      racer.position = this.state.raceDistance;
      racer.isFinished = true;
      racer.rank = this.state.finishedRacers.length + 1;
      this.state.finishedRacers.push(racer);
    }
  }

  private updateAI(ai: Racer): void {
    if (ai.isFinished) return;

    // AI lane changing logic
    if (Math.random() < 0.02) {
      // Avoid obstacles
      const obstacleAhead = this.state.obstacles.find(
        (o) => o.active && o.lane === ai.lane && o.x > ai.position && o.x < ai.position + 100
      );

      if (obstacleAhead) {
        // Try to change lane
        if (ai.lane > 0 && Math.random() < 0.5) {
          ai.lane--;
        } else if (ai.lane < LANE_COUNT - 1) {
          ai.lane++;
        }
      }

      // Grab power-ups
      const powerUpAhead = this.state.powerUps.find(
        (p) => p.active && Math.abs(p.lane - ai.lane) === 1 && p.x > ai.position && p.x < ai.position + 80
      );

      if (powerUpAhead && Math.random() < 0.7) {
        ai.lane = powerUpAhead.lane;
      }
    }

    // AI uses boost strategically
    if (
      !ai.isBoosting &&
      ai.boostTimer === 0 &&
      Math.random() < 0.003 &&
      ai.position < this.state.raceDistance * 0.8
    ) {
      ai.isBoosting = true;
      ai.boostTimer = BOOST_DURATION;
    }

    // Check AI power-up collection
    for (const powerUp of this.state.powerUps) {
      if (!powerUp.active) continue;

      if (ai.lane === powerUp.lane && Math.abs(ai.position - powerUp.x) < 30) {
        powerUp.active = false;
        if (powerUp.type === "boost") {
          ai.isBoosting = true;
          ai.boostTimer = BOOST_DURATION;
        }
      }
    }

    // Check AI obstacle collisions
    for (const obstacle of this.state.obstacles) {
      if (!obstacle.active) continue;

      if (ai.lane === obstacle.lane && Math.abs(ai.position - obstacle.x) < 30) {
        obstacle.active = false;
        ai.speed *= OBSTACLE_SLOWDOWN;
      }
    }
  }

  private spawnItems(): void {
    const randomLane = Math.floor(Math.random() * LANE_COUNT);
    const maxPosition = Math.max(
      this.state.player.position,
      ...this.state.aiRacers.map((r) => r.position)
    );

    const spawnPosition = maxPosition + 200 + Math.random() * 200;

    if (spawnPosition > this.state.raceDistance) return;

    const rand = Math.random();

    if (rand < 0.4) {
      // Spawn boost
      this.state.powerUps.push({
        x: spawnPosition,
        lane: randomLane,
        type: "boost",
        active: true,
      });
    } else if (rand < 0.6) {
      // Spawn coin
      this.state.powerUps.push({
        x: spawnPosition,
        lane: randomLane,
        type: "coin",
        active: true,
      });
    } else {
      // Spawn obstacle
      this.state.obstacles.push({
        x: spawnPosition,
        lane: randomLane,
        width: 40,
        active: true,
      });
    }
  }

  private finishRace(): void {
    this.state.phase = "finished";

    // Calculate score
    const rankBonus = Math.max(0, 4 - this.state.player.rank) * 100;
    const coinBonus = this.state.coins * 20;
    this.state.score = rankBonus + coinBonus + this.state.level * 50;

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("raceRunHighScore", this.state.highScore.toString());
    }

    this.emitState();
  }

  public nextLevel(): void {
    this.state.level++;
    this.start();
  }

  public restart(): void {
    this.start();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
