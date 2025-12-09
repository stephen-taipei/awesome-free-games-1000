import { i18n } from "../../../shared/i18n";

interface ColorData {
  key: string;
  hex: string;
}

const COLORS: ColorData[] = [
  { key: "colors.red", hex: "#e74c3c" },
  { key: "colors.blue", hex: "#3498db" },
  { key: "colors.green", hex: "#2ecc71" },
  { key: "colors.yellow", hex: "#f1c40f" },
  { key: "colors.black", hex: "#2c3e50" },
  { key: "colors.purple", hex: "#9b59b6" },
];

export class ColorMatchGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  score = 0;
  timeLeft = 60;
  status: "playing" | "gameover" = "playing";

  // Check loop
  timerInterval: number | null = null;
  onStateChange: ((s: any) => void) | null = null;

  // Current Round
  currentText: ColorData | null = null;
  currentColor: ColorData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.score = 0;
    this.timeLeft = 60; // Or 30? 60 is generous.
    this.status = "playing";

    this.spawnRound();

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (this.status === "playing") {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.status = "gameover";
          this.notify();
        } else {
          this.notify();
        }
      }
    }, 1000);

    this.notify();
    this.draw();
  }

  private spawnRound() {
    // Random Text
    const textIdx = Math.floor(Math.random() * COLORS.length);
    this.currentText = COLORS[textIdx];

    // Random Color (50% chance match)
    if (Math.random() < 0.5) {
      this.currentColor = this.currentText;
    } else {
      let colorIdx = Math.floor(Math.random() * COLORS.length);
      while (colorIdx === textIdx) {
        colorIdx = Math.floor(Math.random() * COLORS.length);
      }
      this.currentColor = COLORS[colorIdx];
    }
  }

  public answer(yes: boolean) {
    if (this.status !== "playing") return;

    const isMatch = this.currentText!.key === this.currentColor!.key;

    if (yes === isMatch) {
      // Correct
      this.score += 1; // Maybe bonus for speed?
      // Feedback?
    } else {
      // Wrong
      this.timeLeft -= 2; // Penalty
      if (this.timeLeft < 0) this.timeLeft = 0;
      // Shake effect? managed by UI
    }

    this.spawnRound();
    this.draw();
    this.notify();
  }

  public draw() {
    // Clear
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentText || !this.currentColor) return;

    // Draw Text centered with Color
    const text = i18n.t(this.currentText.key);

    this.ctx.font = "bold 48px sans-serif";
    this.ctx.fillStyle = this.currentColor.hex;

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
  }

  public notify() {
    if (this.onStateChange)
      this.onStateChange({
        score: this.score,
        time: this.timeLeft,
        status: this.status,
      });
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height; // Is set by CSS to 250px usually
    this.draw();
  }
}
