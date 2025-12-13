/**
 * Pixel Jump Game Logic
 * Game #224 - Jump between platforms in a pixel art world
 */

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isJumping: boolean;
  direction: 1 | -1;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "moving" | "crumbling" | "spring";
  moveDirection?: 1 | -1;
  moveSpeed?: number;
  crumbleTimer?: number;
}

export interface GameState {
  phase: "idle" | "playing" | "gameOver";
  score: number;
  highScore: number;
  player: Player;
  platforms: Platform[];
  cameraY: number;
}

const GRAVITY = 0.5;
const JUMP_FORCE = -14;
const SPRING_FORCE = -20;
const MOVE_SPEED = 4;
const PLATFORM_WIDTH = 70;

export class PixelJumpGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 350;
  private canvasHeight: number = 550;
  private highestY: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const savedHighScore = localStorage.getItem("pixelJumpHighScore");
    return {
      phase: "idle",
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      player: {
        x: 150,
        y: 500,
        vx: 0,
        vy: 0,
        width: 30,
        height: 30,
        isJumping: false,
        direction: 1,
      },
      platforms: [],
      cameraY: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      ...this.createInitialState(),
      phase: "playing",
      player: {
        x: this.canvasWidth / 2 - 15,
        y: this.canvasHeight - 100,
        vx: 0,
        vy: 0,
        width: 30,
        height: 30,
        isJumping: false,
        direction: 1,
      },
    };
    this.highestY = this.canvasHeight - 100;
    this.generateInitialPlatforms();
    this.emitState();
  }

  private generateInitialPlatforms(): void {
    // Ground platform
    this.state.platforms.push({
      x: 0,
      y: this.canvasHeight - 30,
      width: this.canvasWidth,
      type: "normal",
    });

    // Starting platforms
    let y = this.canvasHeight - 100;
    for (let i = 0; i < 10; i++) {
      this.addRandomPlatform(y);
      y -= 60 + Math.random() * 40;
    }
  }

  private addRandomPlatform(y: number): void {
    const x = Math.random() * (this.canvasWidth - PLATFORM_WIDTH);
    const rand = Math.random();

    let type: Platform["type"] = "normal";
    if (rand > 0.9) type = "spring";
    else if (rand > 0.75) type = "moving";
    else if (rand > 0.6) type = "crumbling";

    const platform: Platform = {
      x,
      y,
      width: PLATFORM_WIDTH,
      type,
    };

    if (type === "moving") {
      platform.moveDirection = Math.random() > 0.5 ? 1 : -1;
      platform.moveSpeed = 2 + Math.random() * 2;
    }

    this.state.platforms.push(platform);
  }

  public moveLeft(): void {
    if (this.state.phase !== "playing") return;
    this.state.player.vx = -MOVE_SPEED;
    this.state.player.direction = -1;
  }

  public moveRight(): void {
    if (this.state.phase !== "playing") return;
    this.state.player.vx = MOVE_SPEED;
    this.state.player.direction = 1;
  }

  public stopMoving(): void {
    this.state.player.vx = 0;
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { player, platforms } = this.state;

    // Apply gravity
    player.vy += GRAVITY;

    // Move player
    player.x += player.vx;
    player.y += player.vy;

    // Screen wrap
    if (player.x + player.width < 0) {
      player.x = this.canvasWidth;
    } else if (player.x > this.canvasWidth) {
      player.x = -player.width;
    }

    // Update moving platforms
    for (const platform of platforms) {
      if (platform.type === "moving" && platform.moveDirection && platform.moveSpeed) {
        platform.x += platform.moveDirection * platform.moveSpeed;

        if (platform.x <= 0) {
          platform.moveDirection = 1;
        } else if (platform.x + platform.width >= this.canvasWidth) {
          platform.moveDirection = -1;
        }
      }

      // Update crumbling platforms
      if (platform.type === "crumbling" && platform.crumbleTimer !== undefined) {
        platform.crumbleTimer--;
        if (platform.crumbleTimer <= 0) {
          platform.y = 99999; // Move off screen
        }
      }
    }

    // Platform collision (only when falling)
    if (player.vy > 0) {
      for (const platform of platforms) {
        if (this.checkPlatformCollision(player, platform)) {
          if (platform.type === "spring") {
            player.vy = SPRING_FORCE;
          } else {
            player.vy = JUMP_FORCE;
          }

          if (platform.type === "crumbling" && platform.crumbleTimer === undefined) {
            platform.crumbleTimer = 30;
          }

          player.isJumping = true;
        }
      }
    }

    // Update camera and score
    if (player.y < this.highestY) {
      const diff = this.highestY - player.y;
      this.state.score += Math.floor(diff);
      this.highestY = player.y;
    }

    // Camera follows player
    const targetCameraY = player.y - this.canvasHeight / 3;
    this.state.cameraY += (targetCameraY - this.state.cameraY) * 0.1;

    // Generate new platforms
    const topPlatform = platforms.reduce((min, p) => (p.y < min.y ? p : min), platforms[0]);
    while (topPlatform.y > this.state.cameraY - 200) {
      this.addRandomPlatform(topPlatform.y - 60 - Math.random() * 40);
    }

    // Remove platforms below screen
    this.state.platforms = platforms.filter((p) => p.y < this.state.cameraY + this.canvasHeight + 100);

    // Check game over
    if (player.y > this.state.cameraY + this.canvasHeight + 50) {
      this.gameOver();
      return;
    }

    this.emitState();
  }

  private checkPlatformCollision(player: Player, platform: Platform): boolean {
    const playerBottom = player.y + player.height;
    const playerPrevBottom = playerBottom - player.vy;

    return (
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width &&
      playerBottom >= platform.y &&
      playerPrevBottom <= platform.y + 10
    );
  }

  private gameOver(): void {
    this.state.phase = "gameOver";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("pixelJumpHighScore", this.state.highScore.toString());
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
