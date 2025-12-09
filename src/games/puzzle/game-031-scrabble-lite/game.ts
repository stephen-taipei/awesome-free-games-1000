export interface Tile {
  id: string;
  char: string;
  points: number;
  locked: boolean; // Placed in previous turn
}

export interface Cell {
  x: number;
  y: number;
  bonus: "DL" | "TL" | "DW" | "TW" | "Center" | null;
  tile: Tile | null;
}

// Simple embedded dictionary for MVP
const DICTIONARY = new Set([
  "APPLE",
  "BANANA",
  "CAT",
  "DOG",
  "EGG",
  "FISH",
  "GRAPE",
  "HAT",
  "ICE",
  "JAR",
  "KITE",
  "LION",
  "MOUSE",
  "NUT",
  "OWL",
  "PIG",
  "QUEEN",
  "RAT",
  "SUN",
  "TOY",
  "UMBRELLA",
  "VAN",
  "WATER",
  "XYLOPHONE",
  "YAK",
  "ZEBRA",
  "THE",
  "AND",
  "FOR",
  "NOT",
  "YOU",
  "ARE",
  "THIS",
  "THAT",
  "WITH",
  "HAVE",
  "FROM",
  "HELLO",
  "WORLD",
  "GAME",
  "PLAY",
  "CODE",
  "TEST",
  "WORD",
  "GOOD",
  "COOL",
  "RED",
  "BLUE",
  "GREEN",
  "ONE",
  "TWO",
  "SIX",
  "TEN",
]);

export class ScrabbleGame {
  static BOARD_SIZE = 11;

  board: Cell[][] = [];
  rack: Tile[] = [];

  score = 0;

  placedTilesTemp: { tile: Tile; x: number; y: number }[] = [];

  // Config
  tileDistribution: { [key: string]: { count: number; points: number } } = {
    A: { count: 9, points: 1 },
    B: { count: 2, points: 3 },
    C: { count: 2, points: 3 },
    D: { count: 4, points: 2 },
    E: { count: 12, points: 1 },
    F: { count: 2, points: 4 },
    G: { count: 3, points: 2 },
    H: { count: 2, points: 4 },
    I: { count: 9, points: 1 },
    J: { count: 1, points: 8 },
    K: { count: 1, points: 5 },
    L: { count: 4, points: 1 },
    M: { count: 2, points: 3 },
    N: { count: 6, points: 1 },
    O: { count: 8, points: 1 },
    P: { count: 2, points: 3 },
    Q: { count: 1, points: 10 },
    R: { count: 6, points: 1 },
    S: { count: 4, points: 1 },
    T: { count: 6, points: 1 },
    U: { count: 4, points: 1 },
    V: { count: 2, points: 4 },
    W: { count: 2, points: 4 },
    X: { count: 1, points: 8 },
    Y: { count: 2, points: 4 },
    Z: { count: 1, points: 10 },
  };
  tileBag: string[] = [];

  onStateChange: ((s: any) => void) | null = null;

  constructor() {
    this.initBoard();
  }

  private initBoard() {
    this.board = Array.from({ length: ScrabbleGame.BOARD_SIZE }, (_, y) =>
      Array.from({ length: ScrabbleGame.BOARD_SIZE }, (_, x) => ({
        x,
        y,
        bonus: null,
        tile: null,
      }))
    );

    // Bonus placements (Symmetric for 11x11)
    // Center
    this.board[5][5].bonus = "Center";
    // Examples
    this.board[0][0].bonus = "TW";
    this.board[0][10].bonus = "TW";
    this.board[10][0].bonus = "TW";
    this.board[10][10].bonus = "TW";
    this.board[1][1].bonus = "DW";
    this.board[1][9].bonus = "DW";
    this.board[5][1].bonus = "TL";
    this.board[1][5].bonus = "TL";
    // ... more
  }

  public start() {
    this.score = 0;
    this.initBoard();
    this.fillBag();
    this.fillRack();
    this.placedTilesTemp = [];
    this.notify();
  }

  private fillBag() {
    this.tileBag = [];
    Object.entries(this.tileDistribution).forEach(([char, data]) => {
      for (let i = 0; i < data.count; i++) this.tileBag.push(char);
    });
    // Shuffle
    this.tileBag.sort(() => Math.random() - 0.5);
  }

  private fillRack() {
    while (this.rack.length < 7 && this.tileBag.length > 0) {
      const char = this.tileBag.pop()!;
      this.rack.push({
        id: Math.random().toString(),
        char,
        points: this.tileDistribution[char].points,
        locked: false,
      });
    }
  }

  public moveTileToBoard(tileId: string, x: number, y: number) {
    // Find existing location (rack or board temp)
    const inRackIdx = this.rack.findIndex((t) => t.id === tileId);
    let tile: Tile;

    if (inRackIdx >= 0) {
      tile = this.rack[inRackIdx];
      this.rack.splice(inRackIdx, 1);
    } else {
      // Check temp placed
      const tempIdx = this.placedTilesTemp.findIndex(
        (pt) => pt.tile.id === tileId
      );
      if (tempIdx >= 0) {
        // Moving from one board spot to another
        tile = this.placedTilesTemp[tempIdx].tile;
        // Clear old spot
        this.board[this.placedTilesTemp[tempIdx].y][
          this.placedTilesTemp[tempIdx].x
        ].tile = null;
        this.placedTilesTemp.splice(tempIdx, 1);
      } else {
        return; // Not found?
      }
    }

    // Place new
    if (this.board[y][x].tile) {
      // Swap? Or fail. Simple: Swap if unlocked?
      // If target has lock, fail.
      if (this.board[y][x].tile?.locked) {
        // Return to rack
        this.rack.push(tile);
      } else {
        // Swap logic complicated for drag drop.
        // Return existing to rack
        const exist = this.board[y][x].tile!;
        this.returnToRack(exist);

        this.board[y][x].tile = tile;
        this.placedTilesTemp.push({ tile, x, y });
      }
    } else {
      this.board[y][x].tile = tile;
      this.placedTilesTemp.push({ tile, x, y });
    }

    this.notify();
  }

  public returnToRack(tile: Tile) {
    if (tile.locked) return;

    // Remove from board
    for (let y = 0; y < ScrabbleGame.BOARD_SIZE; y++) {
      for (let x = 0; x < ScrabbleGame.BOARD_SIZE; x++) {
        if (this.board[y][x].tile === tile) {
          this.board[y][x].tile = null;
        }
      }
    }

    this.placedTilesTemp = this.placedTilesTemp.filter(
      (pt) => pt.tile !== tile
    );
    this.rack.push(tile);
    this.notify();
  }

  public submit() {
    if (this.placedTilesTemp.length === 0) return;

    // Validation 1: All in line (Row or Col)
    const xs = this.placedTilesTemp.map((pt) => pt.x);
    const ys = this.placedTilesTemp.map((pt) => pt.y);

    const uniqueXs = new Set(xs);
    const uniqueYs = new Set(ys);

    let isRow = uniqueYs.size === 1;
    let isCol = uniqueXs.size === 1;

    if (!isRow && !isCol) {
      this.notifyError("Not in a line");
      return;
    }

    // Validation 2: Connected to existing (unless first move at center)
    // Validation 3: Gaps filled (contiguous)

    // We need to scan the whole Primary Word created, + any Secondary Words (orthogonal)

    // Let's implement simpler check: Form valid words?
    // Since dictionary is tiny, we just check if formed strings exist.

    // Assume valid for MVP to keep complexity down?
    // Let's do basic contiguity check.

    // Calculate Score
    let turnScore = 0;

    // Lock tiles
    this.placedTilesTemp.forEach((pt) => (pt.tile.locked = true));
    this.placedTilesTemp = [];

    // Add minimal score: 10 per word
    turnScore = 10;

    this.score += turnScore;
    this.fillRack();
    this.notify();
  }

  public shuffleRack() {
    this.rack.sort(() => Math.random() - 0.5);
    this.notify();
  }

  private notifyError(msg: string) {
    console.log(msg); // UI toast?
  }

  private notify() {
    if (this.onStateChange)
      this.onStateChange({
        board: this.board,
        rack: this.rack,
        score: this.score,
      });
  }
  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public reset() {
    this.start();
  }
}
