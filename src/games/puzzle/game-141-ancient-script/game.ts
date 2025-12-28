/**
 * Ancient Script Game Logic
 * Game #141 - Cipher Logic
 */

interface Rune {
  symbol: string;
  letter: string;
  x: number;
  y: number;
  revealed: boolean;
}

interface Level {
  word: string;
  clue: string;
  runeSet: number;
}

interface GameState {
  level: number;
  attempts: number;
  status: "idle" | "playing" | "won" | "complete" | "wrong";
  decodedCount: number;
  totalRunes: number;
}

type StateChangeCallback = (state: GameState) => void;

const RUNE_SETS = [
  ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛈ", "ᛇ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ", "ᚩ", "ᚪ"],
  ["𐌀", "𐌁", "𐌂", "𐌃", "𐌄", "𐌅", "𐌆", "𐌇", "𐌈", "𐌉", "𐌊", "𐌋", "𐌌", "𐌍", "𐌎", "𐌏", "𐌐", "𐌑", "𐌒", "𐌓", "𐌔", "𐌕", "𐌖", "𐌗", "𐌘", "𐌙"],
  ["ⴰ", "ⴱ", "ⴲ", "ⴳ", "ⴴ", "ⴵ", "ⴶ", "ⴷ", "ⴸ", "ⴹ", "ⴺ", "ⴻ", "ⴼ", "ⴽ", "ⴾ", "ⴿ", "ⵀ", "ⵁ", "ⵂ", "ⵃ", "ⵄ", "ⵅ", "ⵆ", "ⵇ", "ⵈ", "ⵉ"],
];

const LEVELS: Level[] = [
  { word: "SUN", clue: "☀️ Bright in the sky", runeSet: 0 },
  { word: "MOON", clue: "🌙 Night light", runeSet: 0 },
  { word: "STAR", clue: "⭐ Twinkles at night", runeSet: 0 },
  { word: "FIRE", clue: "🔥 Burns bright", runeSet: 1 },
  { word: "WATER", clue: "💧 Essential for life", runeSet: 1 },
  { word: "EARTH", clue: "🌍 Our planet", runeSet: 1 },
  { word: "MAGIC", clue: "✨ Mystical power", runeSet: 2 },
  { word: "DRAGON", clue: "🐉 Mythical beast", runeSet: 2 },
];

export class AncientScriptGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;

  private currentLevel: number = 0;
  private attempts: number = 0;
  private runes: Rune[] = [];
  private letterMapping: Map<string, string> = new Map();
  private userInput: string[] = [];
  private selectedIndex: number = 0;
  private isPlaying: boolean = false;
  private showWrong: boolean = false;

  private onStateChange: StateChangeCallback | null = null;

  private pendingEvents: {
    keyPress?: { x: number; y: number };
    runeSelect?: { x: number; y: number };
    submitCorrect?: { x: number; y: number };
    submitWrong?: { x: number; y: number };
    reset?: boolean;
  } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  getTotalLevels(): number {
    return LEVELS.length;
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.scale = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.scale;
    this.canvas.height = this.height * this.scale;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.draw();
  }

  private initLevel() {
    const level = LEVELS[this.currentLevel];
    const runeSet = RUNE_SETS[level.runeSet];

    this.letterMapping.clear();
    this.runes = [];
    this.userInput = new Array(level.word.length).fill("");
    this.selectedIndex = 0;
    this.showWrong = false;

    const usedRunes = new Set<string>();
    for (const letter of level.word) {
      if (!this.letterMapping.has(letter)) {
        let rune: string;
        do {
          rune = runeSet[Math.floor(Math.random() * runeSet.length)];
        } while (usedRunes.has(rune));
        usedRunes.add(rune);
        this.letterMapping.set(letter, rune);
      }
    }

    const startX = this.width / 2 - (level.word.length * 50) / 2;
    for (let i = 0; i < level.word.length; i++) {
      const letter = level.word[i];
      this.runes.push({
        symbol: this.letterMapping.get(letter)!,
        letter: letter,
        x: startX + i * 50 + 25,
        y: 100,
        revealed: false,
      });
    }

    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      const decodedCount = this.userInput.filter(
        (c, i) => c.toUpperCase() === this.runes[i]?.letter
      ).length;

      this.onStateChange({
        level: this.currentLevel + 1,
        attempts: this.attempts,
        status: this.getStatus(),
        decodedCount,
        totalRunes: this.runes.length,
        ...this.pendingEvents,
      });

      this.pendingEvents = {};
    }
  }

  private getStatus(): "idle" | "playing" | "won" | "complete" | "wrong" {
    if (!this.isPlaying) return "idle";
    if (this.showWrong) return "wrong";
    return "playing";
  }

  start() {
    this.isPlaying = true;
    this.initLevel();
    this.draw();
  }

  reset() {
    this.attempts = 0;
    this.pendingEvents.reset = true;
    this.emitState();
    this.initLevel();
    this.draw();
  }

  restart() {
    this.currentLevel = 0;
    this.attempts = 0;
    this.isPlaying = false;
    this.runes = [];
    this.userInput = [];
    this.draw();
  }

  nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.attempts = 0;
      this.initLevel();
      this.draw();
    }
  }

  handleClick(x: number, y: number) {
    if (!this.isPlaying || this.showWrong) return;

    const level = LEVELS[this.currentLevel];
    const startX = this.width / 2 - (level.word.length * 50) / 2;

    for (let i = 0; i < level.word.length; i++) {
      const boxX = startX + i * 50;
      const boxY = 180;
      if (x >= boxX && x <= boxX + 45 && y >= boxY && y <= boxY + 45) {
        this.selectedIndex = i;
        this.pendingEvents.runeSelect = { x: boxX + 22, y: boxY + 22 };
        this.emitState();
        this.draw();
        return;
      }
    }
  }

  handleKey(key: string) {
    if (!this.isPlaying) return;

    if (this.showWrong) {
      this.showWrong = false;
      this.userInput = new Array(LEVELS[this.currentLevel].word.length).fill("");
      this.selectedIndex = 0;
      this.draw();
      this.emitState();
      return;
    }

    if (key === "Backspace") {
      if (this.userInput[this.selectedIndex]) {
        this.userInput[this.selectedIndex] = "";
      } else if (this.selectedIndex > 0) {
        this.selectedIndex--;
        this.userInput[this.selectedIndex] = "";
      }
      this.draw();
      this.emitState();
      return;
    }

    if (key === "ArrowLeft" && this.selectedIndex > 0) {
      this.selectedIndex--;
      this.draw();
      return;
    }

    if (key === "ArrowRight" && this.selectedIndex < this.userInput.length - 1) {
      this.selectedIndex++;
      this.draw();
      return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
      this.userInput[this.selectedIndex] = key.toUpperCase();

      // Emit keyPress event
      const level = LEVELS[this.currentLevel];
      const startX = this.width / 2 - (level.word.length * 50) / 2;
      const boxX = startX + this.selectedIndex * 50 + 22;
      const boxY = 202;
      this.pendingEvents.keyPress = { x: boxX, y: boxY };

      if (this.selectedIndex < this.userInput.length - 1) {
        this.selectedIndex++;
      }
      this.draw();
      this.emitState();
    }
  }

  submit(): boolean {
    if (!this.isPlaying) return false;

    const level = LEVELS[this.currentLevel];
    const answer = this.userInput.join("");
    this.attempts++;

    const cx = this.width / 2;
    const cy = this.height / 2;

    if (answer === level.word) {
      this.runes.forEach((r) => (r.revealed = true));
      this.pendingEvents.submitCorrect = { x: cx, y: cy };
      this.draw();

      if (this.currentLevel >= LEVELS.length - 1) {
        this.isPlaying = false;
        if (this.onStateChange) {
          this.onStateChange({
            level: this.currentLevel + 1,
            attempts: this.attempts,
            status: "complete",
            decodedCount: this.runes.length,
            totalRunes: this.runes.length,
            ...this.pendingEvents,
          });
          this.pendingEvents = {};
        }
      } else {
        if (this.onStateChange) {
          this.onStateChange({
            level: this.currentLevel + 1,
            attempts: this.attempts,
            status: "won",
            decodedCount: this.runes.length,
            totalRunes: this.runes.length,
            ...this.pendingEvents,
          });
          this.pendingEvents = {};
        }
      }
      return true;
    } else {
      this.showWrong = true;
      this.pendingEvents.submitWrong = { x: cx, y: cy };
      this.draw();
      this.emitState();
      return false;
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.isPlaying || this.runes.length === 0) {
      ctx.fillStyle = "#8b4513";
      ctx.font = "bold 24px serif";
      ctx.textAlign = "center";
      ctx.fillText("Ancient Script", this.width / 2, this.height / 2);
      return;
    }

    const level = LEVELS[this.currentLevel];

    ctx.fillStyle = "#8b4513";
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.fillText(level.clue, this.width / 2, 40);

    ctx.font = "bold 36px serif";
    for (const rune of this.runes) {
      ctx.fillStyle = rune.revealed ? "#27ae60" : "#d4a574";

      ctx.shadowColor = rune.revealed ? "#27ae60" : "#8b4513";
      ctx.shadowBlur = 10;
      ctx.fillText(rune.symbol, rune.x, rune.y);
      ctx.shadowBlur = 0;

      if (rune.revealed) {
        ctx.fillStyle = "#27ae60";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(rune.letter, rune.x, rune.y + 30);
        ctx.font = "bold 36px serif";
      }
    }

    const startX = this.width / 2 - (level.word.length * 50) / 2;
    for (let i = 0; i < level.word.length; i++) {
      const boxX = startX + i * 50;
      const boxY = 180;

      ctx.strokeStyle = i === this.selectedIndex ? "#e67e22" : "#8b4513";
      ctx.lineWidth = i === this.selectedIndex ? 3 : 2;
      ctx.strokeRect(boxX, boxY, 45, 45);

      if (this.userInput[i]) {
        const isCorrect = this.userInput[i] === this.runes[i].letter;
        ctx.fillStyle = this.showWrong
          ? isCorrect
            ? "#27ae60"
            : "#e74c3c"
          : "#d4a574";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(this.userInput[i], boxX + 22, boxY + 33);
      }
    }

    if (this.showWrong) {
      ctx.fillStyle = "rgba(231, 76, 60, 0.2)";
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = "#e74c3c";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("Press any key to try again", this.width / 2, this.height - 60);
    }

    this.drawKeyboard();
  }

  private drawKeyboard() {
    const ctx = this.ctx;
    const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    const keySize = 28;
    const gap = 4;
    const startY = 260;

    ctx.font = "bold 14px sans-serif";

    rows.forEach((row, rowIndex) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const startX = (this.width - rowWidth) / 2;

      for (let i = 0; i < row.length; i++) {
        const x = startX + i * (keySize + gap);
        const y = startY + rowIndex * (keySize + gap);

        const isUsed = this.userInput.includes(row[i]);
        ctx.fillStyle = isUsed ? "#3d3d5c" : "#2d2d4d";
        ctx.fillRect(x, y, keySize, keySize);

        ctx.strokeStyle = "#8b4513";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, keySize, keySize);

        ctx.fillStyle = isUsed ? "#666" : "#d4a574";
        ctx.textAlign = "center";
        ctx.fillText(row[i], x + keySize / 2, y + keySize / 2 + 5);
      }
    });
  }
}
