/**
 * Jump King Game Logic
 * Game #342 - Charge and jump to reach the top
 */

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  isCharging: boolean;
  chargeTime: number;
  facingRight: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "ice" | "bounce" | "crumble";
  crumbling?: boolean;
  crumbleTimer?: number;
}

export interface GameState {
  phase: "idle" | "playing" | "victory";
  player: Player;
  platforms: Platform[];
  cameraY: number;
  maxHeight: number;
  currentHeight: number;
  targetHeight: number;
  falls: number;
}

const GRAVITY = 0.5;
const MAX_CHARGE = 60;
const MAX_JUMP_POWER = 18;
const HORIZONTAL_SPEED = 5;

export class JumpKingGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private canvasWidth: number = 400;
  private canvasHeight: number = 500;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "idle",
      player: {
        x: 180,
        y: 0,
        vx: 0,
        vy: 0,
        width: 30,
        height: 40,
        isGrounded: true,
        isCharging: false,
        chargeTime: 0,
        facingRight: true,
      },
      platforms: [],
      cameraY: 0,
      maxHeight: 0,
      currentHeight: 0,
      targetHeight: 3000,
      falls: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = "playing";
    this.generatePlatforms();
    this.state.player.y = this.canvasHeight - 100;
    this.emitState();
  }

  private generatePlatforms(): void {
    this.state.platforms = [];

    // Ground platform
    this.state.platforms.push({
      x: 0,
      y: this.canvasHeight - 50,
      width: this.canvasWidth,
      type: "normal",
    });

    // Generate platforms going up
    let y = this.canvasHeight - 150;
    while (y > -this.state.targetHeight) {
      const platformCount = 1 + Math.floor(Math.random() * 2);

      for (let i = 0; i < platformCount; i++) {
        const width = 60 + Math.random() * 60;
        const x = Math.random() * (this.canvasWidth - width);

        const rand = Math.random();
        let type: Platform["type"] = "normal";

        if (rand > 0.9) type = "bounce";
        else if (rand > 0.75) type = "ice";
        else if (rand > 0.6) type = "crumble";

        this.state.platforms.push({
          x,
          y,
          width,
          type,
          crumbling: false,
          crumbleTimer: 0,
        });
      }

      y -= 80 + Math.random() * 60;
    }

    // Victory platform at top
    this.state.platforms.push({
      x: this.canvasWidth / 2 - 50,
      y: -this.state.targetHeight + 50,
      width: 100,
      type: "normal",
    });
  }

  public startCharge(direction: number): void {
    if (this.state.phase !== "playing") return;
    if (!this.state.player.isGrounded) return;

    this.state.player.isCharging = true;
    this.state.player.chargeTime = 0;
    this.state.player.facingRight = direction >= 0;
  }

  public releaseJump(): void {
    if (this.state.phase !== "playing") return;
    if (!this.state.player.isCharging) return;

    const { player } = this.state;
    const chargePower = Math.min(player.chargeTime, MAX_CHARGE) / MAX_CHARGE;
    const jumpPower = 5 + chargePower * MAX_JUMP_POWER;

    player.vy = -jumpPower;
    player.vx = (player.facingRight ? 1 : -1) * HORIZONTAL_SPEED * chargePower;
    player.isCharging = false;
    player.isGrounded = false;
    player.chargeTime = 0;

    this.emitState();
  }

  public update(): void {
    if (this.state.phase !== "playing") return;

    const { player, platforms } = this.state;

    // Update charge
    if (player.isCharging) {
      player.chargeTime++;
    }

    // Apply gravity if not grounded
    if (!player.isGrounded) {
      player.vy += GRAVITY;
      player.y += player.vy;
      player.x += player.vx;

      // Wall bounce
      if (player.x < 0) {
        player.x = 0;
        player.vx = -player.vx * 0.5;
      } else if (player.x + player.width > this.canvasWidth) {
        player.x = this.canvasWidth - player.width;
        player.vx = -player.vx * 0.5;
      }
    }

    // Check platform collisions
    if (player.vy >= 0) {
      for (const platform of platforms) {
        if (platform.crumbling && platform.crumbleTimer! > 30) continue;

        const platformScreenY = platform.y + this.state.cameraY;

        if (
          player.x + player.width > platform.x &&
          player.x < platform.x + platform.width &&
          player.y + player.height >= platformScreenY &&
          player.y + player.height <= platformScreenY + 20 &&
          player.vy >= 0
        ) {
          player.y = platformScreenY - player.height;
          player.vy = 0;
          player.isGrounded = true;

          if (platform.type === "ice") {
            player.vx *= 0.98;
          } else if (platform.type === "bounce") {
            player.vy = -15;
            player.isGrounded = false;
          } else if (platform.type === "crumble" && !platform.crumbling) {
            platform.crumbling = true;
            platform.crumbleTimer = 0;
          } else {
            player.vx = 0;
          }

          break;
        }
      }
    }

    // Update crumbling platforms
    for (const platform of platforms) {
      if (platform.crumbling) {
        platform.crumbleTimer!++;
        if (platform.crumbleTimer! > 30) {
          // Check if player was standing on it
          const platformScreenY = platform.y + this.state.cameraY;
          if (
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            Math.abs(player.y + player.height - platformScreenY) < 5
          ) {
            player.isGrounded = false;
          }
        }
      }
    }

    // Apply ice sliding
    if (player.isGrounded && Math.abs(player.vx) > 0.1) {
      player.x += player.vx;
      player.vx *= 0.95;
    }

    // Update height
    const worldY = player.y - this.state.cameraY;
    this.state.currentHeight = Math.floor(-worldY + this.canvasHeight);

    if (this.state.currentHeight > this.state.maxHeight) {
      this.state.maxHeight = this.state.currentHeight;
    }

    // Update camera
    const targetCameraY = -player.y + this.canvasHeight / 2;
    if (targetCameraY > this.state.cameraY) {
      this.state.cameraY += (targetCameraY - this.state.cameraY) * 0.1;
    }

    // Check fall
    if (player.y > this.canvasHeight + 100) {
      this.state.falls++;
      this.resetToLastPlatform();
    }

    // Check victory
    if (this.state.currentHeight >= this.state.targetHeight) {
      this.state.phase = "victory";
    }

    this.emitState();
  }

  private resetToLastPlatform(): void {
    const { player, platforms, cameraY } = this.state;

    // Find the lowest visible platform
    let lowestPlatform = platforms[0];
    for (const platform of platforms) {
      const screenY = platform.y + cameraY;
      if (screenY < this.canvasHeight && platform.y > lowestPlatform.y) {
        lowestPlatform = platform;
      }
    }

    player.x = lowestPlatform.x + lowestPlatform.width / 2 - player.width / 2;
    player.y = lowestPlatform.y + cameraY - player.height;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = true;

    // Reset camera
    this.state.cameraY = -lowestPlatform.y + this.canvasHeight - 100;
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
