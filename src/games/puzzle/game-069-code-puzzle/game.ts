/**
 * Code Puzzle Game
 * Game #069 - Crack codes and ciphers
 */

export type PuzzleType = "caesar" | "number" | "symbol" | "binary" | "morse";

export interface Puzzle {
  id: number;
  type: PuzzleType;
  encoded: string;
  answer: string;
  clue: { [lang: string]: string };
}

const PUZZLES: Puzzle[] = [
  // Level 1: Simple number pattern
  {
    id: 1,
    type: "number",
    encoded: "2, 4, 6, 8, ?",
    answer: "10",
    clue: {
      "zh-TW": "偶數序列",
      "zh-CN": "偶数序列",
      en: "Even number sequence",
      ja: "偶数列",
      ko: "짝수 수열",
    },
  },
  // Level 2: Caesar cipher (+1)
  {
    id: 2,
    type: "caesar",
    encoded: "IFMMP",
    answer: "HELLO",
    clue: {
      "zh-TW": "每個字母往前移一位",
      "zh-CN": "每个字母往前移一位",
      en: "Shift each letter back by 1",
      ja: "各文字を1つ前にシフト",
      ko: "각 문자를 1만큼 뒤로 이동",
    },
  },
  // Level 3: Number pattern (Fibonacci-like)
  {
    id: 3,
    type: "number",
    encoded: "1, 1, 2, 3, 5, ?",
    answer: "8",
    clue: {
      "zh-TW": "前兩數相加",
      "zh-CN": "前两数相加",
      en: "Add previous two numbers",
      ja: "前の2つの数を足す",
      ko: "앞의 두 수를 더함",
    },
  },
  // Level 4: Symbol substitution
  {
    id: 4,
    type: "symbol",
    encoded: "★=1, ◆=2, ●=3 → ★+◆+●=?",
    answer: "6",
    clue: {
      "zh-TW": "符號代表數字",
      "zh-CN": "符号代表数字",
      en: "Symbols represent numbers",
      ja: "記号は数字を表す",
      ko: "기호는 숫자를 나타냄",
    },
  },
  // Level 5: Binary
  {
    id: 5,
    type: "binary",
    encoded: "01001000 01001001",
    answer: "HI",
    clue: {
      "zh-TW": "二進制 ASCII 碼",
      "zh-CN": "二进制 ASCII 码",
      en: "Binary ASCII codes",
      ja: "バイナリASCIIコード",
      ko: "이진 ASCII 코드",
    },
  },
  // Level 6: Caesar cipher (+3)
  {
    id: 6,
    type: "caesar",
    encoded: "FRGH",
    answer: "CODE",
    clue: {
      "zh-TW": "每個字母往前移三位 (凱撒密碼)",
      "zh-CN": "每个字母往前移三位 (凯撒密码)",
      en: "Shift each letter back by 3 (Caesar cipher)",
      ja: "各文字を3つ前にシフト（シーザー暗号）",
      ko: "각 문자를 3만큼 뒤로 이동 (시저 암호)",
    },
  },
  // Level 7: Number pattern (squares)
  {
    id: 7,
    type: "number",
    encoded: "1, 4, 9, 16, ?",
    answer: "25",
    clue: {
      "zh-TW": "完全平方數",
      "zh-CN": "完全平方数",
      en: "Perfect squares",
      ja: "完全平方数",
      ko: "완전 제곱수",
    },
  },
  // Level 8: Morse code
  {
    id: 8,
    type: "morse",
    encoded: "... --- ...",
    answer: "SOS",
    clue: {
      "zh-TW": "摩斯密碼",
      "zh-CN": "摩斯密码",
      en: "Morse code",
      ja: "モールス信号",
      ko: "모스 부호",
    },
  },
];

export class CodePuzzleGame {
  currentLevel: number = 0;
  attempts: number = 0;
  status: "playing" | "won" | "complete" = "playing";
  currentPuzzle: Puzzle | null = null;
  showWrongAnswer: boolean = false;
  locale: string = "en";

  onStateChange: ((state: any) => void) | null = null;

  constructor() {}

  public start() {
    this.loadLevel(this.currentLevel);
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= PUZZLES.length) {
      this.status = "complete";
      this.currentPuzzle = null;
      if (this.onStateChange) {
        this.onStateChange({ status: "complete", level: levelIndex + 1, attempts: this.attempts });
      }
      return;
    }

    this.currentPuzzle = PUZZLES[levelIndex];
    this.attempts = 0;
    this.status = "playing";
    this.showWrongAnswer = false;

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        attempts: 0,
        puzzle: this.currentPuzzle,
      });
    }
  }

  public checkAnswer(answer: string): boolean {
    if (!this.currentPuzzle || this.status !== "playing") return false;

    this.attempts++;
    const correct = answer.toUpperCase().trim() === this.currentPuzzle.answer.toUpperCase();

    if (correct) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          attempts: this.attempts,
          puzzle: this.currentPuzzle,
        });
      }
      return true;
    } else {
      this.showWrongAnswer = true;
      if (this.onStateChange) {
        this.onStateChange({
          status: "playing",
          level: this.currentLevel + 1,
          attempts: this.attempts,
          puzzle: this.currentPuzzle,
          wrong: true,
        });
      }
      setTimeout(() => {
        this.showWrongAnswer = false;
      }, 1500);
      return false;
    }
  }

  public getClue(): string {
    if (!this.currentPuzzle) return "";
    return this.currentPuzzle.clue[this.locale] || this.currentPuzzle.clue["en"];
  }

  public getEncodedText(): string {
    if (!this.currentPuzzle) return "";
    return this.currentPuzzle.encoded;
  }

  public getPuzzleType(): PuzzleType | null {
    if (!this.currentPuzzle) return null;
    return this.currentPuzzle.type;
  }

  public nextLevel() {
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public restart() {
    this.currentLevel = 0;
    this.loadLevel(0);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return PUZZLES.length;
  }

  public isShowingWrong(): boolean {
    return this.showWrongAnswer;
  }
}
