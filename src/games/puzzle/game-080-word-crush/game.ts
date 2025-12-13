/**
 * Word Crush Game Engine
 * Game #080 - Connect letters to form words
 */

// Simple word list (common 3-6 letter English words)
const WORD_LIST = new Set([
  // 3 letters
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
  "how", "its", "may", "new", "now", "old", "see", "two", "way", "who",
  "boy", "did", "cat", "dog", "run", "top", "let", "put", "say", "she",
  "too", "use", "art", "ask", "big", "end", "far", "got", "hot", "job",
  "key", "lot", "map", "net", "own", "pay", "red", "set", "sun", "try",
  "war", "win", "yes", "yet", "act", "age", "air", "bad", "bed", "bit",
  "box", "bus", "buy", "car", "cut", "die", "eat", "egg", "eye", "few",
  "fit", "fly", "fun", "gas", "guy", "hit", "ice", "law", "lay", "leg",
  "lie", "low", "man", "men", "mix", "oil", "own", "pen", "per", "pop",
  "ran", "raw", "row", "sit", "six", "sky", "son", "ten", "tie", "tip",
  "van", "via", "wet", "won", "cup", "fan", "hat", "jam", "pan", "tap",
  // 4 letters
  "that", "with", "have", "this", "will", "your", "from", "they", "been",
  "call", "first", "come", "make", "than", "other", "time", "very", "when",
  "more", "some", "them", "would", "into", "year", "good", "most", "over",
  "such", "know", "take", "last", "long", "only", "think", "also", "back",
  "after", "work", "life", "find", "here", "much", "need", "next", "part",
  "look", "give", "show", "keep", "even", "name", "tell", "down", "side",
  "turn", "each", "left", "hand", "high", "play", "feel", "away", "home",
  "read", "face", "word", "love", "game", "best", "head", "help", "line",
  "done", "food", "city", "team", "book", "open", "move", "week", "stop",
  "form", "type", "must", "girl", "hard", "hold", "true", "free", "four",
  // 5 letters
  "about", "after", "again", "being", "black", "cause", "child", "could",
  "daily", "early", "earth", "every", "field", "first", "found", "given",
  "going", "great", "group", "hands", "house", "human", "known", "large",
  "leave", "level", "light", "local", "major", "means", "might", "money",
  "music", "never", "night", "often", "order", "other", "paper", "party",
  "place", "point", "power", "press", "price", "right", "shall", "share",
  "short", "shown", "small", "sound", "south", "space", "stand", "start",
  "state", "still", "stock", "study", "table", "taken", "terms", "there",
  "these", "thing", "think", "third", "those", "three", "times", "today",
  "total", "trade", "truth", "under", "until", "using", "value", "watch",
  "water", "weeks", "while", "white", "whole", "woman", "words", "works",
  "world", "would", "write", "years", "young", "apple", "dream", "green",
  // 6 letters
  "action", "better", "change", "coming", "family", "friend", "growth",
  "health", "itself", "leader", "making", "market", "member", "months",
  "mother", "moving", "number", "office", "online", "others", "people",
  "period", "player", "public", "reason", "result", "school", "second",
  "should", "simple", "single", "social", "strong", "system", "taking",
  "things", "trying", "within", "wonder", "worker", "answer", "bridge",
]);

interface Cell {
  letter: string;
  x: number;
  y: number;
  selected: boolean;
}

export class WordCrushGame {
  gridSize: number = 5;
  grid: Cell[][] = [];
  selectedCells: Cell[] = [];
  foundWords: Set<string> = new Set();
  score: number = 0;
  isSelecting: boolean = false;

  onStateChange: ((state: any) => void) | null = null;
  onGridUpdate: (() => void) | null = null;

  // Weighted letter distribution for better word formation
  letterWeights: { letter: string; weight: number }[] = [
    { letter: "E", weight: 12 },
    { letter: "T", weight: 9 },
    { letter: "A", weight: 8 },
    { letter: "O", weight: 7 },
    { letter: "I", weight: 7 },
    { letter: "N", weight: 7 },
    { letter: "S", weight: 6 },
    { letter: "H", weight: 6 },
    { letter: "R", weight: 6 },
    { letter: "D", weight: 4 },
    { letter: "L", weight: 4 },
    { letter: "C", weight: 3 },
    { letter: "U", weight: 3 },
    { letter: "M", weight: 3 },
    { letter: "W", weight: 2 },
    { letter: "F", weight: 2 },
    { letter: "G", weight: 2 },
    { letter: "Y", weight: 2 },
    { letter: "P", weight: 2 },
    { letter: "B", weight: 1 },
    { letter: "V", weight: 1 },
    { letter: "K", weight: 1 },
  ];

  totalWeight: number;

  constructor() {
    this.totalWeight = this.letterWeights.reduce((sum, l) => sum + l.weight, 0);
  }

  public start() {
    this.grid = [];
    this.selectedCells = [];
    this.foundWords = new Set();
    this.score = 0;

    // Generate grid
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = {
          letter: this.getRandomLetter(),
          x,
          y,
          selected: false,
        };
      }
    }

    this.notifyState();
    if (this.onGridUpdate) this.onGridUpdate();
  }

  private getRandomLetter(): string {
    let rand = Math.random() * this.totalWeight;
    for (const { letter, weight } of this.letterWeights) {
      rand -= weight;
      if (rand <= 0) return letter;
    }
    return "E";
  }

  public getGrid(): Cell[][] {
    return this.grid;
  }

  public getCurrentWord(): string {
    return this.selectedCells.map((c) => c.letter).join("");
  }

  public startSelection(x: number, y: number) {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;

    this.isSelecting = true;
    this.clearSelection();

    const cell = this.grid[y][x];
    cell.selected = true;
    this.selectedCells.push(cell);

    this.notifyState();
    if (this.onGridUpdate) this.onGridUpdate();
  }

  public continueSelection(x: number, y: number) {
    if (!this.isSelecting) return;
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;

    const cell = this.grid[y][x];

    // Check if already selected
    if (cell.selected) {
      // Allow deselecting the last cell
      if (this.selectedCells.length > 1 && this.selectedCells[this.selectedCells.length - 2] === cell) {
        const lastCell = this.selectedCells.pop()!;
        lastCell.selected = false;
        this.notifyState();
        if (this.onGridUpdate) this.onGridUpdate();
      }
      return;
    }

    // Check if adjacent to last selected
    const lastCell = this.selectedCells[this.selectedCells.length - 1];
    const dx = Math.abs(cell.x - lastCell.x);
    const dy = Math.abs(cell.y - lastCell.y);

    if (dx <= 1 && dy <= 1 && (dx + dy > 0)) {
      cell.selected = true;
      this.selectedCells.push(cell);
      this.notifyState();
      if (this.onGridUpdate) this.onGridUpdate();
    }
  }

  public endSelection(): { valid: boolean; word: string } {
    this.isSelecting = false;
    const word = this.getCurrentWord().toLowerCase();
    let valid = false;

    if (word.length >= 3 && WORD_LIST.has(word) && !this.foundWords.has(word)) {
      valid = true;
      this.foundWords.add(word);
      // Score: word length squared
      this.score += word.length * word.length * 10;

      // Remove selected cells and drop new ones
      this.removeSelectedCells();
    }

    this.clearSelection();
    this.notifyState();
    if (this.onGridUpdate) this.onGridUpdate();

    return { valid, word };
  }

  private removeSelectedCells() {
    // Mark positions to remove
    const toRemove = this.selectedCells.map((c) => ({ x: c.x, y: c.y }));

    // For each column, drop letters down
    for (let x = 0; x < this.gridSize; x++) {
      const columnRemoved = toRemove.filter((p) => p.x === x).map((p) => p.y);
      if (columnRemoved.length === 0) continue;

      // Collect remaining letters from bottom to top
      const remaining: string[] = [];
      for (let y = this.gridSize - 1; y >= 0; y--) {
        if (!columnRemoved.includes(y)) {
          remaining.push(this.grid[y][x].letter);
        }
      }

      // Fill column from bottom
      for (let y = this.gridSize - 1; y >= 0; y--) {
        if (remaining.length > 0) {
          this.grid[y][x].letter = remaining.shift()!;
        } else {
          this.grid[y][x].letter = this.getRandomLetter();
        }
        this.grid[y][x].selected = false;
      }
    }
  }

  private clearSelection() {
    this.selectedCells.forEach((c) => (c.selected = false));
    this.selectedCells = [];
  }

  public getFoundWords(): string[] {
    return Array.from(this.foundWords);
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public setOnGridUpdate(cb: () => void) {
    this.onGridUpdate = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        wordsFound: this.foundWords.size,
        currentWord: this.getCurrentWord(),
      });
    }
  }
}
