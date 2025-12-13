/**
 * BBQ Master Game Logic
 * Game #210 - Flip meat at the right time
 */

export type MeatType = "steak" | "sausage" | "chicken" | "shrimp";
export type CookState = "raw" | "cooking" | "perfect" | "overcooked" | "burnt";

export interface Meat {
  id: number;
  type: MeatType;
  x: number;
  y: number;
  width: number;
  height: number;
  cookProgress: number; // 0-100, each side
  flipped: boolean;
  state: CookState;
  scored: boolean;
}

export interface GameState {
  meats: Meat[];
  score: number;
  perfectCount: number;
  burntCount: number;
  timeLeft: number;
  status: "idle" | "playing" | "gameOver";
}

const COOK_SPEED: Record<MeatType, number> = {
  steak: 15,
  sausage: 20,
  chicken: 12,
  shrimp: 25,
};

const MEAT_SIZES: Record<MeatType, { width: number; height: number }> = {
  steak: { width: 70, height: 50 },
  sausage: { width: 60, height: 25 },
  chicken: { width: 55, height: 45 },
  shrimp: { width: 40, height: 30 },
};

const GAME_TIME = 60;

export class BBQMasterGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private timerInterval: number | null = null;
  private lastTime: number = 0;
  private meatId: number = 0;
  private canvasWidth: number = 400;
  private canvasHeight: number = 450;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      meats: [],
      score: 0,
      perfectCount: 0,
      burntCount: 0,
      timeLeft: GAME_TIME,
      status: "idle",
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      meats: this.createInitialMeats(),
      score: 0,
      perfectCount: 0,
      burntCount: 0,
      timeLeft: GAME_TIME,
      status: "playing",
    };

    this.meatId = this.state.meats.length;
    this.lastTime = performance.now();

    this.startTimer();
    this.startGameLoop();
    this.emitState();
  }

  private createInitialMeats(): Meat[] {
    const meats: Meat[] = [];
    const types: MeatType[] = ["steak", "sausage", "chicken", "shrimp"];
    const grillStartY = 100;
    const grillHeight = 280;

    // Create 6 initial meats in grid
    for (let i = 0; i < 6; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const size = MEAT_SIZES[type];
      const col = i % 3;
      const row = Math.floor(i / 3);

      meats.push({
        id: i,
        type,
        x: 50 + col * 130 + (Math.random() - 0.5) * 20,
        y: grillStartY + 50 + row * 120 + (Math.random() - 0.5) * 20,
        width: size.width,
        height: size.height,
        cookProgress: 0,
        flipped: false,
        state: "raw",
        scored: false,
      });
    }

    return meats;
  }

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = window.setInterval(() => {
      if (this.state.status !== "playing") return;

      this.state.timeLeft--;

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }

      this.emitState();
    }, 1000);
  }

  private startGameLoop(): void {
    const loop = (currentTime: number) => {
      if (this.state.status !== "playing") return;

      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(deltaTime);

      this.gameLoop = requestAnimationFrame(loop);
    };

    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    this.state.meats.forEach((meat) => {
      if (meat.state === "burnt" || meat.scored) return;

      // Update cook progress
      const cookRate = COOK_SPEED[meat.type] * (deltaTime / 1000);
      meat.cookProgress += cookRate;

      // Update state based on progress
      if (meat.cookProgress < 30) {
        meat.state = "raw";
      } else if (meat.cookProgress < 60) {
        meat.state = "cooking";
      } else if (meat.cookProgress < 85) {
        meat.state = "perfect";
      } else if (meat.cookProgress < 100) {
        meat.state = "overcooked";
      } else {
        meat.state = "burnt";
        if (!meat.scored) {
          this.state.burntCount++;
          meat.scored = true;
        }
      }
    });

    // Replace burnt meats with new ones
    this.state.meats = this.state.meats.map((meat) => {
      if (meat.state === "burnt" && meat.scored) {
        return this.createNewMeat(meat.x, meat.y);
      }
      return meat;
    });

    this.emitState();
  }

  private createNewMeat(x: number, y: number): Meat {
    const types: MeatType[] = ["steak", "sausage", "chicken", "shrimp"];
    const type = types[Math.floor(Math.random() * types.length)];
    const size = MEAT_SIZES[type];

    return {
      id: this.meatId++,
      type,
      x,
      y,
      width: size.width,
      height: size.height,
      cookProgress: 0,
      flipped: false,
      state: "raw",
      scored: false,
    };
  }

  public flipMeat(meatId: number): boolean {
    const meat = this.state.meats.find((m) => m.id === meatId);
    if (!meat || meat.flipped || meat.scored) return false;

    meat.flipped = true;

    // Score based on cook state
    if (meat.state === "perfect") {
      this.state.score += 100;
      this.state.perfectCount++;
      meat.scored = true;

      // Replace with new meat after delay
      setTimeout(() => {
        const index = this.state.meats.findIndex((m) => m.id === meatId);
        if (index !== -1) {
          this.state.meats[index] = this.createNewMeat(meat.x, meat.y);
          this.emitState();
        }
      }, 500);
    } else if (meat.state === "cooking") {
      this.state.score += 50;
      meat.scored = true;

      setTimeout(() => {
        const index = this.state.meats.findIndex((m) => m.id === meatId);
        if (index !== -1) {
          this.state.meats[index] = this.createNewMeat(meat.x, meat.y);
          this.emitState();
        }
      }, 500);
    } else if (meat.state === "overcooked") {
      this.state.score += 25;
      meat.scored = true;

      setTimeout(() => {
        const index = this.state.meats.findIndex((m) => m.id === meatId);
        if (index !== -1) {
          this.state.meats[index] = this.createNewMeat(meat.x, meat.y);
          this.emitState();
        }
      }, 500);
    } else if (meat.state === "raw") {
      // Too early - reset the flip (let it continue cooking)
      meat.flipped = false;
      this.state.score = Math.max(0, this.state.score - 10);
    }

    this.emitState();
    return true;
  }

  public getMeatAt(x: number, y: number): Meat | null {
    for (const meat of this.state.meats) {
      if (
        x >= meat.x - meat.width / 2 &&
        x <= meat.x + meat.width / 2 &&
        y >= meat.y - meat.height / 2 &&
        y <= meat.y + meat.height / 2
      ) {
        return meat;
      }
    }
    return null;
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
