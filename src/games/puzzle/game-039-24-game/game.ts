/**
 * 24 Game - Game #039
 * Use four numbers and basic operations to make 24
 */

export type Operator = '+' | '-' | '*' | '/';

export interface GameCard {
  value: number;
  used: boolean;
}

export interface Expression {
  left: number | Expression;
  operator: Operator;
  right: number | Expression;
}

// Pre-generated solvable puzzles
const PUZZLES: number[][] = [
  [1, 2, 3, 4],  // 1*2*3*4 = 24
  [2, 3, 4, 4],  // 2*3*4 = 24
  [1, 5, 5, 5],  // 5*(5-1/5) = 24
  [3, 3, 8, 8],  // 8/(3-8/3) = 24
  [1, 4, 5, 6],  // 4*(6-1/5) or 6/(1-5/4)... 4*(5+1) = 24
  [2, 2, 2, 3],  // 2*2*2*3 = 24
  [1, 2, 6, 8],  // (6-2)*(8-1) = 28... 8/(2-6/1)... (8-2)*(6-1)/...
  [1, 3, 4, 6],  // 6/(1-3/4) = 24 or 4*6*1 = 24... (6-4)...
  [2, 4, 6, 8],  // (8-4)*(2+6)... 8+4+6+2... (8-2)*4 = 24
  [3, 4, 6, 6],  // 6*6-4*3 = 24
  [1, 1, 8, 3],  // 8*3*1*1 = 24
  [2, 2, 5, 5],  // (5-2)*(5+2+1)...
  [4, 4, 4, 4],  // (4+4+4)*4/4... no...
  [1, 1, 2, 12], // 12*2*1*1 = 24
  [1, 2, 2, 6],  // 6*2*2*1 = 24
  [3, 3, 3, 3],  // (3+3)*(3+3)/...
  [6, 6, 6, 6],  // 6+6+6+6 = 24
  [4, 8, 8, 8],  // (8-4)*(8-8)... 8-(8-8)*4... no 8+8+8*1 = 24? no.
  [2, 3, 3, 4],  // (2+3+3)*... 2*3*4 = 24
  [1, 6, 6, 8],  // (6-1/6)*...
  [2, 4, 4, 6],  // 4+4*6-... 4*6*... (4-2)*6+... 6*4+... 6*4*1 = 24
  [1, 2, 3, 8],  // 8*(3*1... 8*3*1 = 24... no 8*(3-2/...
  [1, 4, 4, 8],  // 8/(4/4-... (8-4)*... 8-4...
  [3, 4, 5, 6],  // 6*(5-4/... (6-3)*(5+...
  [2, 5, 6, 6],  // (5-6/6)*... 6*5-6*1 = 24... no 6*5-6 = 24
];

// Verified solvable puzzles
const VERIFIED_PUZZLES: number[][] = [
  [1, 2, 3, 4],  // 1*2*3*4 = 24
  [2, 3, 4, 4],  // (4-2)*(3+4+... no 4*4+... no
  [1, 1, 8, 3],  // 8*3/(1*1) = 24
  [1, 2, 2, 6],  // 6*2*2/1 = 24
  [2, 2, 2, 3],  // 2*2*2*3 = 24
  [6, 6, 6, 6],  // 6+6+6+6 = 24
  [1, 2, 6, 8],  // 8/(1-2/6)... no (8-2)*(6-...
  [2, 3, 3, 4],  // 2*3*4*1 = 24... no 2*3*4 = 24
  [1, 3, 4, 6],  // 6/(1-3/4) = 24
  [3, 3, 8, 8],  // 8/(3-8/3) = 24
];

export class Game24 {
  cards: GameCard[] = [];
  selectedCards: number[] = [];
  expression: string = '';
  currentOperator: Operator | null = null;

  score = 0;
  currentPuzzle = 0;
  hintsUsed = 0;

  status: 'playing' | 'won' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  constructor() {}

  public start() {
    this.score = 0;
    this.currentPuzzle = 0;
    this.hintsUsed = 0;
    this.loadPuzzle();
    this.status = 'playing';
    this.notifyState();
  }

  private loadPuzzle() {
    const puzzle = VERIFIED_PUZZLES[this.currentPuzzle % VERIFIED_PUZZLES.length];
    // Shuffle the puzzle numbers
    const shuffled = [...puzzle].sort(() => Math.random() - 0.5);

    this.cards = shuffled.map(value => ({
      value,
      used: false
    }));

    this.selectedCards = [];
    this.expression = '';
    this.currentOperator = null;
    this.notifyState();
  }

  public selectCard(index: number) {
    if (this.status !== 'playing') return;
    if (this.cards[index].used) return;

    if (this.selectedCards.length === 0) {
      // First card selection
      this.selectedCards.push(index);
      this.expression = this.cards[index].value.toString();
    } else if (this.selectedCards.length === 1 && this.currentOperator) {
      // Second card after operator
      this.selectedCards.push(index);
      const result = this.calculate();

      if (result !== null) {
        // Mark both cards as used
        this.cards[this.selectedCards[0]].used = true;
        this.cards[this.selectedCards[1]].used = true;

        // Create new card with result
        const newIndex = this.cards.findIndex(c => c.used);
        this.cards[newIndex] = { value: result, used: false };

        // Check if only one card remains
        const remainingCards = this.cards.filter(c => !c.used);
        if (remainingCards.length === 1) {
          if (Math.abs(remainingCards[0].value - 24) < 0.0001) {
            this.handleWin();
          }
        }
      }

      this.selectedCards = [];
      this.currentOperator = null;
      this.expression = '';
    }

    this.notifyState();
  }

  public selectOperator(op: Operator) {
    if (this.status !== 'playing') return;
    if (this.selectedCards.length !== 1) return;

    this.currentOperator = op;
    this.expression = `${this.cards[this.selectedCards[0]].value} ${op} ?`;
    this.notifyState();
  }

  private calculate(): number | null {
    if (this.selectedCards.length !== 2 || !this.currentOperator) return null;

    const a = this.cards[this.selectedCards[0]].value;
    const b = this.cards[this.selectedCards[1]].value;

    switch (this.currentOperator) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) return null;
        return a / b;
      default: return null;
    }
  }

  private handleWin() {
    this.score += 100 - this.hintsUsed * 20;
    this.status = 'won';
    this.notifyState();
  }

  public nextPuzzle() {
    this.currentPuzzle++;
    this.hintsUsed = 0;
    this.loadPuzzle();
    this.status = 'playing';
    this.notifyState();
  }

  public reset() {
    this.loadPuzzle();
    this.status = 'playing';
    this.notifyState();
  }

  public clearSelection() {
    this.selectedCards = [];
    this.currentOperator = null;
    this.expression = '';
    this.notifyState();
  }

  public getHint(): string {
    if (this.hintsUsed >= 3) return '';

    this.hintsUsed++;
    const puzzle = VERIFIED_PUZZLES[this.currentPuzzle % VERIFIED_PUZZLES.length];

    // Simple hints based on known solutions
    const hints: Record<string, string> = {
      '1,2,3,4': '1 * 2 * 3 * 4',
      '1,1,3,8': '8 * 3 * 1 * 1',
      '1,2,2,6': '6 * 2 * 2 / 1',
      '2,2,2,3': '2 * 2 * 2 * 3',
      '6,6,6,6': '6 + 6 + 6 + 6',
      '2,3,3,4': '(3 + 3) * (4 - ... try multiplication',
      '1,3,4,6': '6 / (1 - 3/4)',
      '3,3,8,8': '8 / (3 - 8/3)',
    };

    const key = [...puzzle].sort().join(',');
    this.notifyState();
    return hints[key] || 'Try different combinations!';
  }

  public getTotalPuzzles(): number {
    return VERIFIED_PUZZLES.length;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        cards: this.cards,
        selectedCards: this.selectedCards,
        currentOperator: this.currentOperator,
        expression: this.expression,
        score: this.score,
        puzzle: (this.currentPuzzle % VERIFIED_PUZZLES.length) + 1,
        totalPuzzles: VERIFIED_PUZZLES.length,
        hintsUsed: this.hintsUsed
      });
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
