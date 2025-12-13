/**
 * Arcade Mix Game Engine
 * Game #270
 *
 * Random mini-games collection!
 */

type MiniGameType = "tap" | "avoid" | "catch" | "find" | "count";

interface Target {
  x: number;
  y: number;
  radius: number;
  color: string;
  isTarget: boolean;
  vx?: number;
  vy?: number;
  value?: number;
}

interface GameState {
  score: number;
  round: number;
  timeLeft: number;
  status: "idle" | "playing" | "minigame" | "over";
}

type StateCallback = (state: GameState) => void;

export class ArcadeMixGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score = 0;
  private round = 1;
  private timeLeft = 10;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private timerInterval: number | null = null;
  private currentGame: MiniGameType = "tap";
  private targets: Target[] = [];
  private instruction = "";
  private correctAnswer = 0;
  private playerAnswer = 0;
  private gameComplete = false;
  private transitionTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        round: this.round,
        timeLeft: this.timeLeft,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  start() {
    this.score = 0;
    this.round = 1;
    this.status = "playing";
    this.startMiniGame();
    this.emitState();
    this.gameLoop();
  }

  getInstruction(): string {
    return this.instruction;
  }

  private startMiniGame() {
    const games: MiniGameType[] = ["tap", "avoid", "catch", "find", "count"];
    this.currentGame = games[Math.floor(Math.random() * games.length)];
    this.targets = [];
    this.gameComplete = false;
    this.timeLeft = Math.max(5, 10 - Math.floor(this.round / 3));

    switch (this.currentGame) {
      case "tap":
        this.setupTapGame();
        break;
      case "avoid":
        this.setupAvoidGame();
        break;
      case "catch":
        this.setupCatchGame();
        break;
      case "find":
        this.setupFindGame();
        break;
      case "count":
        this.setupCountGame();
        break;
    }

    this.status = "minigame";
    this.startTimer();
  }

  private setupTapGame() {
    this.instruction = "game.tapTarget";
    const count = 3 + Math.floor(this.round / 2);

    for (let i = 0; i < count; i++) {
      this.targets.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 100 + Math.random() * (this.canvas.height - 200),
        radius: 30 - Math.min(10, this.round),
        color: "#00b894",
        isTarget: true,
      });
    }
  }

  private setupAvoidGame() {
    this.instruction = "game.avoidRed";
    const goodCount = 5;
    const badCount = 3 + Math.floor(this.round / 2);

    // Good targets
    for (let i = 0; i < goodCount; i++) {
      this.targets.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 100 + Math.random() * (this.canvas.height - 200),
        radius: 25,
        color: "#00b894",
        isTarget: true,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
      });
    }

    // Bad targets
    for (let i = 0; i < badCount; i++) {
      this.targets.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 100 + Math.random() * (this.canvas.height - 200),
        radius: 25,
        color: "#e74c3c",
        isTarget: false,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
      });
    }
  }

  private setupCatchGame() {
    this.instruction = "game.catchAll";
    const count = 5 + Math.floor(this.round / 2);

    for (let i = 0; i < count; i++) {
      this.targets.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: -50 - Math.random() * 200,
        radius: 20,
        color: "#feca57",
        isTarget: true,
        vy: 2 + Math.random() * 2 + this.round * 0.3,
      });
    }
  }

  private setupFindGame() {
    this.instruction = "game.findDiff";
    const rows = 3;
    const cols = 3;
    const differentIndex = Math.floor(Math.random() * (rows * cols));
    const baseColor = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");

    for (let i = 0; i < rows * cols; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const spacing = this.canvas.width / (cols + 1);
      const yOffset = 80;

      this.targets.push({
        x: spacing * (col + 1),
        y: yOffset + spacing * (row + 1),
        radius: 35,
        color: i === differentIndex ? this.shiftColor(baseColor) : baseColor,
        isTarget: i === differentIndex,
      });
    }
  }

  private setupCountGame() {
    this.instruction = "game.countItems";
    const count = 3 + Math.floor(Math.random() * 5) + Math.floor(this.round / 2);
    this.correctAnswer = count;
    this.playerAnswer = 0;

    for (let i = 0; i < count; i++) {
      this.targets.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 80 + Math.random() * (this.canvas.height - 200),
        radius: 20,
        color: "#9b59b6",
        isTarget: true,
      });
    }

    // Add number buttons
    for (let i = 1; i <= 9; i++) {
      const col = (i - 1) % 3;
      const row = Math.floor((i - 1) / 3);
      this.targets.push({
        x: this.canvas.width / 2 + (col - 1) * 60,
        y: this.canvas.height - 100 + row * 50,
        radius: 20,
        color: "#3498db",
        isTarget: false,
        value: i,
      });
    }
  }

  private shiftColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const shift = 40;
    return `rgb(${Math.min(255, r + shift)}, ${Math.min(255, g + shift)}, ${Math.min(255, b + shift)})`;
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = window.setInterval(() => {
      if (this.status !== "minigame") return;

      this.timeLeft--;
      this.emitState();

      if (this.timeLeft <= 0) {
        this.failRound();
      }
    }, 1000);
  }

  handleClick(x: number, y: number) {
    if (this.status !== "minigame") return;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < target.radius) {
        if (this.currentGame === "count" && target.value !== undefined) {
          this.playerAnswer = target.value;
          if (this.playerAnswer === this.correctAnswer) {
            this.completeRound();
          } else {
            this.failRound();
          }
          return;
        }

        if (this.currentGame === "avoid" && !target.isTarget) {
          this.failRound();
          return;
        }

        if (target.isTarget) {
          this.targets.splice(i, 1);
          this.score += 10;
          this.emitState();

          // Check completion
          const remainingTargets = this.targets.filter((t) => t.isTarget);
          if (remainingTargets.length === 0) {
            this.completeRound();
          }
        }
        return;
      }
    }
  }

  private completeRound() {
    this.gameComplete = true;
    this.score += this.timeLeft * 10;
    this.round++;
    this.transitionTimer = 60;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private failRound() {
    this.status = "over";
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emitState();
  }

  private gameLoop() {
    if (this.status === "over") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    if (this.gameComplete) {
      this.transitionTimer--;
      if (this.transitionTimer <= 0) {
        this.startMiniGame();
      }
      return;
    }

    // Update moving targets
    for (const target of this.targets) {
      if (target.vx !== undefined) {
        target.x += target.vx;
        if (target.x < target.radius || target.x > this.canvas.width - target.radius) {
          target.vx = -target.vx;
        }
      }
      if (target.vy !== undefined) {
        target.y += target.vy;

        // Catch game - remove if off screen
        if (this.currentGame === "catch" && target.y > this.canvas.height + target.radius) {
          if (target.isTarget) {
            this.failRound();
            return;
          }
        }

        // Avoid game - bounce
        if (this.currentGame === "avoid") {
          if (target.y < target.radius || target.y > this.canvas.height - target.radius) {
            target.vy = -target.vy;
          }
        }
      }
    }

    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const bgColors: Record<MiniGameType, string[]> = {
      tap: ["#1e3c72", "#2a5298"],
      avoid: ["#1a1a2e", "#16213e"],
      catch: ["#0f3443", "#34e89e"],
      find: ["#2c3e50", "#3498db"],
      count: ["#2d3436", "#636e72"],
    };
    const [color1, color2] = bgColors[this.currentGame];
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw targets
    for (const target of this.targets) {
      this.drawTarget(target);
    }

    // Instruction text
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(this.getInstructionText(), w / 2, 20);

    // Round complete overlay
    if (this.gameComplete) {
      ctx.fillStyle = "rgba(0, 184, 148, 0.9)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "white";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ROUND COMPLETE!", w / 2, h / 2);
      ctx.font = "20px Arial";
      ctx.fillText(`+${this.timeLeft * 10} bonus`, w / 2, h / 2 + 40);
    }

    // Count game - show player answer
    if (this.currentGame === "count" && !this.gameComplete) {
      ctx.fillStyle = "white";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`Your answer: ${this.playerAnswer || "?"}`, w / 2, h - 160);
    }
  }

  private getInstructionText(): string {
    const texts: Record<MiniGameType, string> = {
      tap: "Tap all green targets!",
      avoid: "Tap green, avoid red!",
      catch: "Catch all falling items!",
      find: "Find the different one!",
      count: "How many purple circles?",
    };
    return texts[this.currentGame];
  }

  private drawTarget(target: Target) {
    const ctx = this.ctx;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(target.x + 3, target.y + 3, target.radius, 0, Math.PI * 2);
    ctx.fill();

    // Main circle
    ctx.fillStyle = target.color;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(
      target.x - target.radius * 0.3,
      target.y - target.radius * 0.3,
      target.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Number for count game
    if (target.value !== undefined) {
      ctx.fillStyle = "white";
      ctx.font = `bold ${target.radius}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.value.toString(), target.x, target.y);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
