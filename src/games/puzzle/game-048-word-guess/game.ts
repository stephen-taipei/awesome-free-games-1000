// Word list - common 5-letter English words
const WORDS = [
  "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult",
  "after", "again", "agent", "agree", "ahead", "alarm", "album", "alert",
  "alien", "align", "alike", "alive", "allow", "alone", "along", "alter",
  "amber", "amend", "amino", "among", "angel", "anger", "angle", "angry",
  "apart", "apple", "apply", "arena", "argue", "arise", "armor", "array",
  "arrow", "aside", "asset", "avoid", "award", "aware", "awful", "bacon",
  "badge", "basic", "basin", "basis", "beach", "beast", "began", "begin",
  "begun", "being", "belly", "below", "bench", "berry", "birth", "black",
  "blade", "blame", "blank", "blast", "blaze", "bleed", "blend", "bless",
  "blind", "block", "blood", "bloom", "blown", "board", "boost", "booth",
  "bound", "brain", "brand", "brass", "brave", "bread", "break", "breed",
  "brick", "bride", "brief", "bring", "broad", "broke", "brown", "brush",
  "build", "built", "bunch", "burst", "buyer", "cable", "camel", "candy",
  "cargo", "carry", "catch", "cause", "cease", "chain", "chair", "chaos",
  "charm", "chart", "chase", "cheap", "check", "cheek", "chess", "chest",
  "chief", "child", "china", "choke", "chord", "chunk", "civic", "civil",
  "claim", "clash", "class", "clean", "clear", "clerk", "click", "cliff",
  "climb", "clock", "clone", "close", "cloth", "cloud", "coach", "coast",
  "colon", "color", "couch", "could", "count", "court", "cover", "crack",
  "craft", "crash", "crazy", "cream", "creek", "crime", "crisp", "cross",
  "crowd", "crown", "cruel", "crush", "curve", "cycle", "daily", "dance",
  "dated", "dealt", "death", "debut", "decay", "delay", "delta", "dense",
  "depth", "diary", "dirty", "disco", "doubt", "dough", "dozen", "draft",
  "drain", "drama", "drank", "drawn", "dream", "dress", "dried", "drift",
  "drill", "drink", "drive", "droit", "drown", "drunk", "dusty", "dying",
  "eager", "early", "earth", "eight", "elite", "empty", "enemy", "enjoy",
  "enter", "entry", "equal", "error", "essay", "event", "every", "exact",
  "exam", "exist", "extra", "faith", "false", "fancy", "fatal", "fault",
  "feast", "fence", "ferry", "fever", "fiber", "field", "fifth", "fifty",
  "fight", "final", "first", "fixed", "flame", "flash", "flask", "flesh",
  "float", "flood", "floor", "flour", "fluid", "flush", "focus", "force",
  "forge", "forth", "forty", "forum", "found", "frame", "frank", "fraud",
  "fresh", "fried", "front", "frost", "fruit", "fully", "funny", "ghost",
  "giant", "given", "glass", "globe", "glory", "going", "grace", "grade",
  "grain", "grand", "grant", "grape", "graph", "grasp", "grass", "grave",
  "great", "green", "greet", "grief", "grill", "grind", "gross", "group",
  "grove", "grown", "guard", "guess", "guest", "guide", "guilt", "habit",
  "happy", "harsh", "haven", "heart", "heavy", "hello", "hence", "herbs",
  "hobby", "honey", "honor", "horse", "hotel", "house", "human", "humor",
  "hurry", "ideal", "image", "imply", "index", "inner", "input", "intro",
  "issue", "japan", "joint", "jolly", "jones", "judge", "juice", "jumbo",
  "knock", "known", "label", "labor", "lance", "large", "laser", "later",
  "latin", "laugh", "layer", "learn", "lease", "leave", "legal", "lemon",
  "level", "lever", "light", "limit", "lived", "liver", "local", "lodge",
  "logic", "loose", "lorry", "loser", "lover", "lower", "lucky", "lunch",
  "lunar", "lying", "macro", "magic", "major", "maker", "manor", "maple",
  "march", "marry", "match", "maybe", "mayor", "meant", "medal", "media",
  "melon", "mercy", "merge", "merit", "merry", "metal", "meter", "micro",
  "midst", "might", "minor", "minus", "mixed", "model", "money", "month",
  "moral", "motor", "mount", "mouse", "mouth", "moved", "movie", "music",
  "naked", "naval", "nerve", "never", "night", "ninth", "noble", "noise",
  "north", "notch", "noted", "novel", "nurse", "occur", "ocean", "offer",
  "often", "olive", "onset", "opera", "orbit", "order", "organ", "other",
  "ought", "outer", "owner", "oxide", "ozone", "paint", "panel", "panic",
  "paper", "party", "pasta", "patch", "pause", "peace", "pearl", "penny",
  "perch", "phone", "photo", "piano", "piece", "pilot", "pinch", "pitch",
  "pizza", "place", "plain", "plane", "plant", "plate", "plaza", "plead",
  "point", "polar", "porch", "pound", "power", "press", "price", "pride",
  "prime", "print", "prior", "prize", "probe", "proof", "proud", "prove",
  "proxy", "punch", "pupil", "purse", "queen", "quest", "quick", "quiet",
  "quite", "quota", "quote", "radar", "radio", "raise", "rally", "ranch",
  "range", "rapid", "ratio", "reach", "react", "ready", "realm", "rebel",
  "refer", "reign", "relax", "reply", "rider", "ridge", "rifle", "right",
  "rigid", "risky", "rival", "river", "robot", "rocky", "roman", "roofs",
  "rough", "round", "route", "royal", "rugby", "ruler", "rural", "sadly",
  "saint", "salad", "salon", "sandy", "sauce", "scale", "scene", "scent",
  "scope", "score", "screw", "seems", "seize", "sense", "serve", "setup",
  "seven", "shade", "shake", "shall", "shame", "shape", "share", "shark",
  "sharp", "sheep", "sheer", "sheet", "shelf", "shell", "shift", "shine",
  "shirt", "shock", "shoot", "shore", "short", "shout", "shown", "sight",
  "sigma", "silly", "since", "sixth", "sixty", "sized", "skill", "slave",
  "sleep", "slice", "slide", "slope", "small", "smart", "smell", "smile",
  "smoke", "snake", "solar", "solid", "solve", "sorry", "sound", "south",
  "space", "spare", "spark", "speak", "speed", "spend", "spent", "spice",
  "split", "spoke", "sport", "spray", "squad", "stack", "staff", "stage",
  "stake", "stamp", "stand", "stark", "start", "state", "steam", "steel",
  "steep", "steer", "stick", "still", "stock", "stone", "stood", "store",
  "storm", "story", "stove", "strip", "stuck", "study", "stuff", "style",
  "sugar", "suite", "sunny", "super", "surge", "swamp", "swear", "sweat",
  "sweet", "swept", "swift", "swing", "swiss", "sword", "swore", "sworn",
  "table", "taste", "teach", "teeth", "tempo", "tense", "tenth", "terms",
  "thank", "theft", "their", "theme", "there", "these", "thick", "thief",
  "thing", "think", "third", "those", "three", "threw", "throw", "thumb",
  "tiger", "tight", "timer", "tired", "title", "toast", "today", "token",
  "topic", "total", "touch", "tough", "tower", "toxic", "trace", "track",
  "trade", "trail", "train", "trait", "trash", "treat", "trend", "trial",
  "tribe", "trick", "tried", "troop", "truck", "truly", "trump", "trunk",
  "trust", "truth", "tumor", "tuned", "twice", "twist", "ultra", "uncle",
  "under", "unify", "union", "unite", "unity", "until", "upper", "upset",
  "urban", "usage", "usual", "valid", "value", "vapor", "verse", "video",
  "vigor", "villa", "vinyl", "virus", "visit", "vital", "vivid", "vocal",
  "voice", "waste", "watch", "water", "waves", "weary", "wheat", "wheel",
  "where", "which", "while", "white", "whole", "whose", "wider", "widow",
  "width", "witch", "woman", "works", "world", "worry", "worse", "worst",
  "worth", "would", "wound", "wrist", "write", "wrong", "wrote", "yacht",
  "yield", "young", "youth", "zebra", "zones",
];

// Valid guesses include all words
const VALID_GUESSES = new Set(WORDS);

export type CellState = "empty" | "filled" | "correct" | "present" | "absent";

export interface Cell {
  letter: string;
  state: CellState;
}

export interface KeyState {
  [key: string]: CellState;
}

export class WordGuessGame {
  targetWord: string = "";
  board: Cell[][] = [];
  currentRow: number = 0;
  currentCol: number = 0;
  maxAttempts: number = 6;
  wordLength: number = 5;
  status: "playing" | "won" | "lost" = "playing";
  keyStates: KeyState = {};

  onStateChange: ((state: any) => void) | null = null;
  onInvalidWord: (() => void) | null = null;

  constructor() {
    this.initBoard();
  }

  private initBoard() {
    this.board = [];
    for (let i = 0; i < this.maxAttempts; i++) {
      const row: Cell[] = [];
      for (let j = 0; j < this.wordLength; j++) {
        row.push({ letter: "", state: "empty" });
      }
      this.board.push(row);
    }
    this.keyStates = {};
  }

  public start() {
    this.initBoard();
    this.targetWord = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
    this.currentRow = 0;
    this.currentCol = 0;
    this.status = "playing";

    if (this.onStateChange) {
      this.onStateChange({
        board: this.board,
        keyStates: this.keyStates,
        attempts: `${this.currentRow}/${this.maxAttempts}`,
      });
    }
  }

  public inputLetter(letter: string) {
    if (this.status !== "playing") return;
    if (this.currentCol >= this.wordLength) return;

    letter = letter.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;

    this.board[this.currentRow][this.currentCol].letter = letter;
    this.board[this.currentRow][this.currentCol].state = "filled";
    this.currentCol++;

    if (this.onStateChange) {
      this.onStateChange({
        board: this.board,
        cellUpdated: { row: this.currentRow, col: this.currentCol - 1 },
      });
    }
  }

  public deleteLetter() {
    if (this.status !== "playing") return;
    if (this.currentCol <= 0) return;

    this.currentCol--;
    this.board[this.currentRow][this.currentCol].letter = "";
    this.board[this.currentRow][this.currentCol].state = "empty";

    if (this.onStateChange) {
      this.onStateChange({
        board: this.board,
        cellUpdated: { row: this.currentRow, col: this.currentCol },
      });
    }
  }

  public submitGuess(): boolean {
    if (this.status !== "playing") return false;
    if (this.currentCol !== this.wordLength) return false;

    const guess = this.board[this.currentRow]
      .map((cell) => cell.letter)
      .join("")
      .toLowerCase();

    // Validate word
    if (!VALID_GUESSES.has(guess)) {
      if (this.onInvalidWord) {
        this.onInvalidWord();
      }
      return false;
    }

    // Evaluate guess
    const result = this.evaluateGuess(guess.toUpperCase());

    // Update board
    for (let i = 0; i < this.wordLength; i++) {
      this.board[this.currentRow][i].state = result[i];

      // Update keyboard state
      const letter = this.board[this.currentRow][i].letter;
      const currentKeyState = this.keyStates[letter];
      const newState = result[i];

      // Priority: correct > present > absent
      if (
        newState === "correct" ||
        (newState === "present" && currentKeyState !== "correct") ||
        (newState === "absent" && !currentKeyState)
      ) {
        this.keyStates[letter] = newState;
      }
    }

    // Check win/lose
    const isCorrect = result.every((r) => r === "correct");
    if (isCorrect) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          board: this.board,
          keyStates: this.keyStates,
          status: "won",
          attempts: `${this.currentRow + 1}/${this.maxAttempts}`,
          rowRevealed: this.currentRow,
        });
      }
      return true;
    }

    this.currentRow++;
    this.currentCol = 0;

    if (this.currentRow >= this.maxAttempts) {
      this.status = "lost";
      if (this.onStateChange) {
        this.onStateChange({
          board: this.board,
          keyStates: this.keyStates,
          status: "lost",
          targetWord: this.targetWord,
          attempts: `${this.currentRow}/${this.maxAttempts}`,
          rowRevealed: this.currentRow - 1,
        });
      }
      return true;
    }

    if (this.onStateChange) {
      this.onStateChange({
        board: this.board,
        keyStates: this.keyStates,
        attempts: `${this.currentRow}/${this.maxAttempts}`,
        rowRevealed: this.currentRow - 1,
      });
    }

    return true;
  }

  private evaluateGuess(guess: string): CellState[] {
    const result: CellState[] = new Array(this.wordLength).fill("absent");
    const targetLetters = this.targetWord.split("");
    const guessLetters = guess.split("");

    // First pass: mark correct letters
    for (let i = 0; i < this.wordLength; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = "correct";
        targetLetters[i] = "#"; // Mark as used
        guessLetters[i] = "*"; // Mark as matched
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < this.wordLength; i++) {
      if (guessLetters[i] === "*") continue; // Already matched

      const targetIndex = targetLetters.indexOf(guessLetters[i]);
      if (targetIndex !== -1) {
        result[i] = "present";
        targetLetters[targetIndex] = "#"; // Mark as used
      }
    }

    return result;
  }

  public getBoard(): Cell[][] {
    return this.board;
  }

  public getKeyStates(): KeyState {
    return this.keyStates;
  }

  public getTargetWord(): string {
    return this.targetWord;
  }

  public getCurrentRow(): number {
    return this.currentRow;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public setOnInvalidWord(cb: () => void) {
    this.onInvalidWord = cb;
  }
}
