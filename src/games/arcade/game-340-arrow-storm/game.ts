/**
 * Arrow Storm Game Logic
 * Game #340 - Shoot arrows at incoming enemies
 */

export interface Player {
  x: number;
  y: number;
  angle: number;
  arrows: number;
  cooldown: number;
}

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  speed: number;
  health: number;
  type: "normal" | "fast" | "tank";
  radius: number;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  player: Player;
  arrows: Arrow[];
  enemies: Enemy[];
  wave: number;
  kills: number;
  lives: number;
}

const ARROW_SPEED = 15;
const MAX_ARROWS = 20;

export class ArrowStormGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;
  private spawnTimer: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("arrowStormHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      player: {
        x: 0,
        y: 0,
        angle: -Math.PI / 2,
        arrows: MAX_ARROWS,
        cooldown: 0,
      },
      arrows: [],
      enemies: [],
      wave: 1,
      kills: 0,
      lives: 3,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.player.x = width / 2;
    this.state.player.y = height - 60;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
    };
    this.state.player.x = this.canvasWidth / 2;
    this.state.player.y = this.canvasHeight - 60;
    this.spawnTimer = 0;
    this.emitState();
  }

  public aim(targetX: number, targetY: number): void {
    if (this.state.phase !== "playing") return;

    const { player } = this.state;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    player.angle = Math.atan2(dy, dx);

    // Limit angle to upward direction
    if (player.angle > 0) {
      player.angle = player.angle > Math.PI / 2 ? Math.PI : 0;
    }
  }

  public shoot(): void {
    if (this.state.phase !== "playing") return;

    const { player } = this.state;

    if (player.cooldown > 0 || player.arrows <= 0) return;

    const arrow: Arrow = {
      x: player.x,
      y: player.y - 20,
      vx: Math.cos(player.angle) * ARROW_SPEED,
      vy: Math.sin(player.angle) * ARROW_SPEED,
      active: true,
    };

    this.state.arrows.push(arrow);
    player.arrows--;
    player.cooldown = 10;

    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { player, arrows, enemies } = this.state;

    // Update cooldown
    if (player.cooldown > 0) {
      player.cooldown--;
    }

    // Regenerate arrows
    if (player.arrows < MAX_ARROWS && Math.random() > 0.98) {
      player.arrows++;
    }

    // Update arrows
    for (const arrow of arrows) {
      if (!arrow.active) continue;

      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.vy += 0.1; // Gravity

      // Remove if off screen
      if (
        arrow.x < -20 ||
        arrow.x > this.canvasWidth + 20 ||
        arrow.y < -20 ||
        arrow.y > this.canvasHeight + 20
      ) {
        arrow.active = false;
      }
    }

    // Update enemies
    for (const enemy of enemies) {
      // Move towards player
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;

      // Check if reached player
      if (dist < enemy.radius + 30) {
        this.state.lives--;
        enemy.health = 0;

        if (this.state.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Check arrow-enemy collisions
    for (const arrow of arrows) {
      if (!arrow.active) continue;

      for (const enemy of enemies) {
        if (enemy.health <= 0) continue;

        const dx = arrow.x - enemy.x;
        const dy = arrow.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < enemy.radius + 5) {
          enemy.health--;
          arrow.active = false;

          if (enemy.health <= 0) {
            this.state.kills++;
            this.state.score += enemy.type === "tank" ? 30 : enemy.type === "fast" ? 20 : 10;
          }

          break;
        }
      }
    }

    // Remove inactive items
    this.state.arrows = arrows.filter((a) => a.active);
    this.state.enemies = enemies.filter((e) => e.health > 0);

    // Spawn enemies
    this.spawnTimer++;
    const spawnRate = Math.max(30, 90 - this.state.wave * 5);

    if (this.spawnTimer >= spawnRate) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Update wave
    if (this.state.kills >= this.state.wave * 10) {
      this.state.wave++;
    }

    this.emitState();
  }

  private spawnEnemy(): void {
    const side = Math.random();
    let x: number, y: number;

    if (side < 0.4) {
      // Top
      x = Math.random() * this.canvasWidth;
      y = -30;
    } else if (side < 0.7) {
      // Left
      x = -30;
      y = Math.random() * (this.canvasHeight / 2);
    } else {
      // Right
      x = this.canvasWidth + 30;
      y = Math.random() * (this.canvasHeight / 2);
    }

    const rand = Math.random();
    let type: Enemy["type"] = "normal";
    let health = 1;
    let speed = 1.5;
    let radius = 15;

    if (rand > 0.9 && this.state.wave >= 3) {
      type = "tank";
      health = 3;
      speed = 0.8;
      radius = 25;
    } else if (rand > 0.7 && this.state.wave >= 2) {
      type = "fast";
      health = 1;
      speed = 2.5;
      radius = 12;
    }

    speed += this.state.wave * 0.1;

    this.state.enemies.push({
      x,
      y,
      speed,
      health,
      type,
      radius,
    });
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("arrowStormHighScore", this.state.highScore.toString());
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
