import { i18n } from "../../../shared/i18n";

type ChallengeType = "color" | "symbol" | "direction" | "word";

interface Challenge {
  type: ChallengeType;
  startTime: number;
  correctAnswer: string;
  options?: string[];
}

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"];
const SYMBOLS = ["●", "■", "▲", "★", "♦", "♥"];
const DIRECTIONS = ["↑", "↓", "←", "→"];

export class LightSpeedGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  score = 0;
  bestScore = 0;
  lives = 3;
  level = 1;
  status: "playing" | "gameover" = "playing";

  currentChallenge: Challenge | null = null;
  reactionTimes: number[] = [];

  // Animation
  backgroundColor = "#2c3e50";
  targetColor = "#2c3e50";
  colorTransition = 0;

  // Flash effect
  flashColor: string | null = null;
  flashOpacity = 0;

  onStateChange: ((s: any) => void) | null = null;
  onChallengeReady: ((challenge: Challenge) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadBestScore();
  }

  private loadBestScore() {
    const saved = localStorage.getItem("lightspeed-best-score");
    if (saved) this.bestScore = parseInt(saved, 10);
  }

  private saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem("lightspeed-best-score", this.bestScore.toString());
    }
  }

  public start() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.status = "playing";
    this.reactionTimes = [];
    this.backgroundColor = "#2c3e50";
    this.targetColor = "#2c3e50";

    this.notify();
    this.scheduleNextChallenge();
    this.animate();
  }

  private scheduleNextChallenge() {
    // Random delay between challenges (gets shorter with level)
    const baseDelay = Math.max(2000 - this.level * 100, 800);
    const randomDelay = baseDelay + Math.random() * 1000;

    setTimeout(() => {
      if (this.status === "playing") {
        this.spawnChallenge();
      }
    }, randomDelay);
  }

  private spawnChallenge() {
    const types: ChallengeType[] = ["color", "symbol", "direction", "word"];
    const type = types[Math.floor(Math.random() * types.length)];

    this.currentChallenge = {
      type,
      startTime: Date.now(),
      correctAnswer: "",
      options: [],
    };

    switch (type) {
      case "color":
        this.spawnColorChallenge();
        break;
      case "symbol":
        this.spawnSymbolChallenge();
        break;
      case "direction":
        this.spawnDirectionChallenge();
        break;
      case "word":
        this.spawnWordChallenge();
        break;
    }

    if (this.onChallengeReady) {
      this.onChallengeReady(this.currentChallenge);
    }
  }

  private spawnColorChallenge() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.targetColor = color;
    this.colorTransition = 0;
    this.currentChallenge!.correctAnswer = "click";
  }

  private spawnSymbolChallenge() {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    this.currentChallenge!.correctAnswer = symbol;

    // Generate 4 random options including the correct one
    const options = [symbol];
    while (options.length < 4) {
      const option = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (!options.includes(option)) {
        options.push(option);
      }
    }
    // Shuffle options
    this.currentChallenge!.options = options.sort(() => Math.random() - 0.5);
  }

  private spawnDirectionChallenge() {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    this.currentChallenge!.correctAnswer = direction;
  }

  private spawnWordChallenge() {
    const words = ["click", "tap", "press", "hit"];
    const word = words[Math.floor(Math.random() * words.length)];
    this.currentChallenge!.correctAnswer = word;
  }

  public respond(answer: string) {
    if (!this.currentChallenge || this.status !== "playing") return;

    const reactionTime = Date.now() - this.currentChallenge.startTime;
    const isCorrect = answer === this.currentChallenge.correctAnswer;

    // Maximum allowed time (gets shorter with level)
    const maxTime = Math.max(2000 - this.level * 50, 500);

    if (isCorrect && reactionTime <= maxTime) {
      // Correct and fast enough
      this.handleCorrectResponse(reactionTime);
    } else if (!isCorrect) {
      // Wrong answer
      this.handleWrongResponse();
    } else {
      // Too slow
      this.handleSlowResponse();
    }

    this.currentChallenge = null;

    if (this.status === "playing") {
      this.scheduleNextChallenge();
    }
  }

  private handleCorrectResponse(reactionTime: number) {
    this.reactionTimes.push(reactionTime);

    // Score based on reaction time
    let points = 100;
    if (reactionTime < 300) points = 200;
    else if (reactionTime < 500) points = 150;
    else if (reactionTime < 1000) points = 100;
    else points = 50;

    this.score += points;

    // Level up every 1000 points
    const newLevel = Math.floor(this.score / 1000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
    }

    // Green flash
    this.flashColor = "#2ecc71";
    this.flashOpacity = 0.6;

    this.notify();
  }

  private handleWrongResponse() {
    this.lives--;

    // Red flash
    this.flashColor = "#e74c3c";
    this.flashOpacity = 0.8;

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.notify();
    }
  }

  private handleSlowResponse() {
    this.lives--;

    // Orange flash
    this.flashColor = "#f39c12";
    this.flashOpacity = 0.8;

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.notify();
    }
  }

  private gameOver() {
    this.status = "gameover";
    this.saveBestScore();
    this.notify();
  }

  public handleClick() {
    if (this.currentChallenge?.type === "color") {
      this.respond("click");
    }
  }

  public handleKeyPress(key: string) {
    if (!this.currentChallenge) return;

    switch (this.currentChallenge.type) {
      case "direction":
        const dirMap: { [key: string]: string } = {
          "ArrowUp": "↑",
          "ArrowDown": "↓",
          "ArrowLeft": "←",
          "ArrowRight": "→",
        };
        if (dirMap[key]) {
          this.respond(dirMap[key]);
        }
        break;

      case "word":
        if (key === " " || key === "Enter") {
          this.respond(this.currentChallenge.correctAnswer);
        }
        break;
    }
  }

  private animate() {
    this.draw();

    // Color transition
    if (this.colorTransition < 1) {
      this.colorTransition += 0.05;
      if (this.colorTransition > 1) this.colorTransition = 1;
    }

    // Flash fade
    if (this.flashOpacity > 0) {
      this.flashOpacity -= 0.02;
      if (this.flashOpacity < 0) {
        this.flashOpacity = 0;
        this.flashColor = null;
      }
    }

    if (this.status === "playing") {
      requestAnimationFrame(() => this.animate());
    }
  }

  public draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    this.ctx.fillStyle = this.interpolateColor(
      this.backgroundColor,
      this.targetColor,
      this.colorTransition
    );
    this.ctx.fillRect(0, 0, w, h);

    // Flash overlay
    if (this.flashColor && this.flashOpacity > 0) {
      this.ctx.fillStyle = this.flashColor;
      this.ctx.globalAlpha = this.flashOpacity;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.globalAlpha = 1;
    }

    if (!this.currentChallenge) {
      this.drawWaitingState();
      return;
    }

    switch (this.currentChallenge.type) {
      case "color":
        this.drawColorChallenge();
        break;
      case "symbol":
        this.drawSymbolChallenge();
        break;
      case "direction":
        this.drawDirectionChallenge();
        break;
      case "word":
        this.drawWordChallenge();
        break;
    }
  }

  private drawWaitingState() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.globalAlpha = 0.3;
    this.ctx.font = "24px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(i18n.t("game.ready"), w / 2, h / 2);
    this.ctx.globalAlpha = 1;
  }

  private drawColorChallenge() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 32px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(i18n.t("game.clickNow"), w / 2, h / 2);
  }

  private drawSymbolChallenge() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 80px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(this.currentChallenge!.correctAnswer, w / 2, h / 2);
  }

  private drawDirectionChallenge() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 120px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(this.currentChallenge!.correctAnswer, w / 2, h / 2);
  }

  private drawWordChallenge() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw instruction
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(i18n.t("game.pressSpace"), w / 2, h / 2 - 30);

    // Draw word
    this.ctx.font = "bold 48px sans-serif";
    this.ctx.fillText(this.currentChallenge!.correctAnswer.toUpperCase(), w / 2, h / 2 + 30);
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  public getAverageReactionTime(): number {
    if (this.reactionTimes.length === 0) return 0;
    const sum = this.reactionTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.reactionTimes.length);
  }

  public notify() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        bestScore: this.bestScore,
        lives: this.lives,
        level: this.level,
        status: this.status,
        avgReactionTime: this.getAverageReactionTime(),
      });
    }
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public setOnChallengeReady(cb: (challenge: Challenge) => void) {
    this.onChallengeReady = cb;
  }

  public resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }
}
