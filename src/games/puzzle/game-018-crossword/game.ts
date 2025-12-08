export interface CrosswordWord {
  id: number;
  direction: "across" | "down";
  row: number;
  col: number;
  answer: string;
  clue: string;
}

export interface LevelData {
  rows: number;
  cols: number;
  words: CrosswordWord[];
}

// Simple Layout
/*
  0 1 2 3 4 5 6 7 8 9
0 J A V A S C R I P T
1 A       O
2 V       D
3 A       E
4         # H T M L
5         E
6         L
7         L
8         O
*/
// Words:
// JAVASCRIPT (Ac, 0,0)
// CODE (Down, 0,4) ? No. S O D E -> C O D E intersecting C(0,5).
// Let's do:
// Across:
// 1. JAVASCRIPT (0,0) - "Web language"
// 2. HTML (4,5) - "Markup language"
// Down:
// 3. JAVA (0,0) - "Coffee or Language" -> Overlap J with Javascript? Valid.
// 4. CODE (0,5) - "Program instructions" -> Intersects C in Javascript? (0,5 is C) -> C O D E down? No, index 5 is C.
// Word 1: J(0) A(1) V(2) A(3) S(4) C(5) R(6) I(7) P(8) T(9)
// Down at 0,5 (C): C O D E words?
// C(0,5) O(1,5) D(2,5) E(3,5).
// Down at 4,5 (H)? No, H is start of HTML.
// Overlap check:
// HTML at (4,5): H(4,5) T(4,6) M(4,7) L(4,8)
// Overlap with CODE?
// CODE ends at (3,5). HTML starts (4,5). No overlap. Adjacent.
// Let's try:
// 1 ACROSS: APPLE (0,0)
// 1 DOWN: ANT (0,0)
// 2 ACROSS: TEA (2,0) -> A(0,0) N(1,0) T(2,0). T(2,0) E(2,1) A(2,2).

const LEVEL: LevelData = {
  rows: 8,
  cols: 10,
  words: [
    {
      id: 1,
      direction: "across",
      row: 0,
      col: 0,
      answer: "JAVASCRIPT",
      clue: "Web programming language",
    },
    {
      id: 2,
      direction: "down",
      row: 0,
      col: 4,
      answer: "STACK",
      clue: "Data structure LIFO",
    }, // S in Javascript(4)
    {
      id: 3,
      direction: "across",
      row: 2,
      col: 3,
      answer: "DATA",
      clue: "Information",
    }, // T in STACK(2,4) -> D(2,3) A(2,4) T(2,5) A(2,6)
    {
      id: 4,
      direction: "down",
      row: 2,
      col: 6,
      answer: "ARRAY",
      clue: "List of items",
    }, // A in DATA(2,6) -> A(2,6) R(3,6) R(4,6) A(5,6) Y(6,6)
    {
      id: 5,
      direction: "across",
      row: 4,
      col: 5,
      answer: "REACT",
      clue: "UI Library",
    }, // R in ARRAY(4,6) -> R(4,5) E(4,6) A(4,7) C(4,8) T(4,9) !! Wait.
    // Word 4 starts at 2,6. 2,6=A, 3,6=R, 4,6=R.
    // Word 5 starts at 4,5. 4,5=R, 4,6=E, 4,7=A...
    // Intersection at (4,6): Word 4 has R. Word 5 has E. Conflict!

    // FIX conflict:
    // Word 4: ARRAY at (2,6). A R R A Y.
    // (2,6)A (3,6)R (4,6)R (5,6)A (6,6)Y.
    // Word 5 at (4,5). Need letter at (4,6) to be R.
    // WORD 5: G R I D (4,5). G(4,5) R(4,6) I(4,7) D(4,8).
    // Clue: "Layout system".
  ],
};

// Fix final set:
// 1. JAVASCRIPT (0,0, Across). S is at 0,4.
// 2. STACK (0,4, Down). S(0,4) T(1,4) A(2,4) C(3,4) K(4,4).
// 3. DATA (2,2, Across). D(2,2) A(2,3) T(2,4) A(2,5). Matches A in STACK(2,4) is T? No. STACK: S-T-A. Index 2 is A.
//    DATA intersects STACK at (2,4). Stack has A there. Data has T there? Conflict.
//    Change Word 3 to suit A. "BOAT"? B(2,2) O(2,3) A(2,4) T(2,5). Clue: Water vehicle.
//    So: BOAT intersects STACK at A. Perfect.
//    Words so far: JAVASCRIPT, STACK, BOAT.
// 4. ARRAY (2,5, Down)? BOAT ends at T(2,5).
//    ARRAY down from (2,5): A(2,5) R(3,5) R(4,5) A(5,5) Y(6,5).
//    BOAT has T at (2,5). ARRAY has A? Conflict.
//    Need word starting with T. TYPES. T(2,5) Y(3,5) P(4,5) E(5,5) S(6,5). Clue: "Kinds or varieties".
// Words: JAVASCRIPT, STACK, BOAT, TYPES.

const FINAL_LEVEL: LevelData = {
  rows: 8,
  cols: 10,
  words: [
    {
      id: 1,
      direction: "across",
      row: 0,
      col: 0,
      answer: "JAVASCRIPT",
      clue: "Web programming language",
    },
    {
      id: 2,
      direction: "down",
      row: 0,
      col: 4,
      answer: "STACK",
      clue: "Data structure LIFO",
    }, // S at 0,4. 2,4 is A.
    {
      id: 3,
      direction: "across",
      row: 2,
      col: 2,
      answer: "BOAT",
      clue: "Water vehicle",
    }, // A at 2,4.
    {
      id: 4,
      direction: "down",
      row: 2,
      col: 5,
      answer: "TYPES",
      clue: "Data categories",
    }, // T at 2,5.
  ],
};

export class CrosswordGame {
  public level: LevelData = FINAL_LEVEL;
  public userGrid: string[][] = [];
  public inputMap: HTMLElement[][] = []; // To store inputs

  private status: "playing" | "won" = "playing";
  private onStateChange: ((s: string) => void) | null = null;

  constructor() {
    this.resetGrid();
  }

  private resetGrid() {
    this.userGrid = Array(this.level.rows)
      .fill(null)
      .map(() => Array(this.level.cols).fill(""));
  }

  public getCellInfo(r: number, c: number) {
    // Return if blocked or part of which words
    const activeWords = this.level.words.filter((w) => {
      if (w.direction === "across") {
        return r === w.row && c >= w.col && c < w.col + w.answer.length;
      } else {
        return c === w.col && r >= w.row && r < w.row + w.answer.length;
      }
    });

    if (activeWords.length === 0) return null;

    // Check if start of any word
    const startNum = activeWords.find((w) => w.row === r && w.col === c)?.id;

    return {
      active: true,
      startNum,
      words: activeWords,
    };
  }

  public checkWin(): boolean {
    // Check all words
    for (const w of this.level.words) {
      for (let i = 0; i < w.answer.length; i++) {
        let r = w.row;
        let c = w.col;
        if (w.direction === "across") c += i;
        else r += i;

        if (this.userGrid[r][c] !== w.answer[i]) return false;
      }
    }
    return true;
  }

  public setUserInput(r: number, c: number, val: string) {
    this.userGrid[r][c] = val.toUpperCase();
  }

  public setState(s: "playing" | "won") {
    this.status = s;
    if (this.onStateChange) this.onStateChange(s);
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public reset() {
    this.resetGrid();
    this.status = "playing";
    if (this.onStateChange) this.onStateChange("playing");
    // UI must reload
  }
}
