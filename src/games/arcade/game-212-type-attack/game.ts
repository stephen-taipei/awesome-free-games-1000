/**
 * Type Attack Game Logic
 * Game #212 - Type words to destroy falling enemies
 */

export interface Word {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  typed: string;
  active: boolean;
}

export interface GameState {
  words: Word[];
  currentInput: string;
  score: number;
  wordsTyped: number;
  totalChars: number;
  correctChars: number;
  level: number;
  lives: number;
  status: "idle" | "playing" | "gameOver";
  startTime: number;
}

const WORD_LIST = [
  // Easy (3-4 letters)
  "cat", "dog", "run", "fun", "sun", "red", "big", "top", "cup", "map",
  "code", "game", "play", "type", "fast", "jump", "star", "fire", "moon", "rain",
  // Medium (5-6 letters)
  "space", "power", "magic", "storm", "flame", "light", "music", "robot", "laser", "cyber",
  "attack", "defend", "battle", "master", "legend", "arcade", "player", "winner", "rocket", "galaxy",
  // Hard (7+ letters)
  "keyboard", "terminal", "computer", "software", "developer", "programming",
  "challenge", "adventure", "explosion", "lightning", "velocity", "dangerous",
];

const EASY_WORDS = WORD_LIST.filter((w) => w.length <= 4);
const MEDIUM_WORDS = WORD_LIST.filter((w) => w.length >= 5 && w.length <= 6);
const HARD_WORDS = WORD_LIST.filter((w) => w.length >= 7);

export class TypeAttackGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private gameLoop: number | null = null;
  private lastTime: number = 0;
  private lastSpawnTime: number = 0;
  private wordId: number = 0;
  private canvasWidth: number = 400;
  private canvasHeight: number = 450;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      words: [],
      currentInput: "",
      score: 0,
      wordsTyped: 0,
      totalChars: 0,
      correctChars: 0,
      level: 1,
      lives: 3,
      status: "idle",
      startTime: 0,
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public start(): void {
    this.state = {
      words: [],
      currentInput: "",
      score: 0,
      wordsTyped: 0,
      totalChars: 0,
      correctChars: 0,
      level: 1,
      lives: 3,
      status: "playing",
      startTime: performance.now(),
    };

    this.wordId = 0;
    this.lastTime = performance.now();
    this.lastSpawnTime = this.lastTime;

    this.startGameLoop();
    this.emitState();
  }

  private startGameLoop(): void {
    const loop = (currentTime: number) => {
      if (this.state.status !== "playing") return;

      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(deltaTime, currentTime);

      this.gameLoop = requestAnimationFrame(loop);
    };

    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(deltaTime: number, currentTime: number): void {
    // Spawn words
    const spawnRate = Math.max(1000, 3000 - this.state.level * 200);
    if (currentTime - this.lastSpawnTime > spawnRate && this.state.words.length < 8) {
      this.spawnWord();
      this.lastSpawnTime = currentTime;
    }

    // Update word positions
    this.state.words.forEach((word) => {
      word.y += word.speed * (deltaTime / 16);
    });

    // Check for words that reached bottom
    const escaped = this.state.words.filter((w) => w.y > this.canvasHeight - 50);
    if (escaped.length > 0) {
      escaped.forEach(() => {
        this.state.lives--;
      });
      this.state.words = this.state.words.filter((w) => w.y <= this.canvasHeight - 50);

      if (this.state.lives <= 0) {
        this.endGame();
        return;
      }
    }

    // Level up every 5 words
    if (this.state.wordsTyped > 0 && this.state.wordsTyped % 5 === 0) {
      const newLevel = Math.floor(this.state.wordsTyped / 5) + 1;
      if (newLevel > this.state.level) {
        this.state.level = newLevel;
      }
    }

    this.emitState();
  }

  private spawnWord(): void {
    let wordPool = EASY_WORDS;
    if (this.state.level >= 5) {
      wordPool = [...EASY_WORDS, ...MEDIUM_WORDS, ...HARD_WORDS];
    } else if (this.state.level >= 3) {
      wordPool = [...EASY_WORDS, ...MEDIUM_WORDS];
    }

    const text = wordPool[Math.floor(Math.random() * wordPool.length)];
    const speed = 0.5 + this.state.level * 0.1 + Math.random() * 0.3;

    this.state.words.push({
      id: this.wordId++,
      text,
      x: 50 + Math.random() * (this.canvasWidth - 100),
      y: -20,
      speed,
      typed: "",
      active: false,
    });
  }

  public typeChar(char: string): void {
    if (this.state.status !== "playing") return;

    this.state.totalChars++;
    this.state.currentInput += char.toLowerCase();

    // Find matching word
    let matched = false;
    for (const word of this.state.words) {
      if (word.text.startsWith(this.state.currentInput)) {
        word.typed = this.state.currentInput;
        word.active = true;
        matched = true;

        // Check if word is complete
        if (word.typed === word.text) {
          this.state.score += word.text.length * 10 + Math.floor(50 / (word.y / 100 + 1));
          this.state.wordsTyped++;
          this.state.correctChars += word.text.length;
          this.state.words = this.state.words.filter((w) => w.id !== word.id);
          this.state.currentInput = "";

          // Deactivate all words
          this.state.words.forEach((w) => {
            w.active = false;
            w.typed = "";
          });
        }
        break;
      }
    }

    if (!matched) {
      // Wrong input - reset
      this.state.currentInput = "";
      this.state.words.forEach((w) => {
        w.active = false;
        w.typed = "";
      });
    } else {
      this.state.correctChars++;
    }

    this.emitState();
  }

  public backspace(): void {
    if (this.state.currentInput.length > 0) {
      this.state.currentInput = this.state.currentInput.slice(0, -1);

      // Update active word
      this.state.words.forEach((word) => {
        if (word.active) {
          if (word.text.startsWith(this.state.currentInput)) {
            word.typed = this.state.currentInput;
          } else {
            word.active = false;
            word.typed = "";
          }
        }
      });

      this.emitState();
    }
  }

  public getWPM(): number {
    if (this.state.startTime === 0) return 0;
    const minutes = (performance.now() - this.state.startTime) / 60000;
    if (minutes < 0.1) return 0;
    return Math.round((this.state.correctChars / 5) / minutes);
  }

  public getAccuracy(): number {
    if (this.state.totalChars === 0) return 100;
    return Math.round((this.state.correctChars / this.state.totalChars) * 100);
  }

  private endGame(): void {
    this.state.status = "gameOver";
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
    this.emitState();
  }

  public getState(): GameState {
    return this.state;
  }

  public destroy(): void {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
