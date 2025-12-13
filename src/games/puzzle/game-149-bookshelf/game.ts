/**
 * Bookshelf Game Engine
 * Game #149
 *
 * Sort books by height on the shelf!
 */

interface Book {
  id: number;
  height: number;
  color: string;
  x: number;
  targetX: number;
  selected: boolean;
}

interface Level {
  bookCount: number;
  sortOrder: "asc" | "desc";
}

interface GameState {
  level: number;
  maxLevel: number;
  moves: number;
  status: "idle" | "playing" | "won";
}

type StateCallback = (state: GameState) => void;

const BOOK_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#34495e",
  "#16a085",
  "#c0392b",
];

const LEVELS: Level[] = [
  { bookCount: 4, sortOrder: "asc" },
  { bookCount: 5, sortOrder: "asc" },
  { bookCount: 6, sortOrder: "desc" },
  { bookCount: 7, sortOrder: "asc" },
  { bookCount: 8, sortOrder: "desc" },
];

export class BookshelfGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private books: Book[] = [];
  private level = 1;
  private moves = 0;
  private status: "idle" | "playing" | "won" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private selectedBook: Book | null = null;
  private shelfY = 0;
  private bookWidth = 0;

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
        level: this.level,
        maxLevel: LEVELS.length,
        moves: this.moves,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.calculateLayout();
    this.draw();
  }

  private calculateLayout() {
    this.shelfY = this.canvas.height * 0.75;
    const levelData = LEVELS[this.level - 1];
    const totalWidth = this.canvas.width - 80;
    this.bookWidth = Math.min(totalWidth / levelData.bookCount - 10, 60);

    // Update book positions
    const startX = (this.canvas.width - (this.bookWidth + 10) * this.books.length) / 2;
    this.books.forEach((book, i) => {
      book.targetX = startX + i * (this.bookWidth + 10);
      if (book.x === 0) book.x = book.targetX;
    });
  }

  start() {
    this.level = 1;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  reset() {
    this.loadLevel();
    this.status = "playing";
    this.emitState();
  }

  nextLevel() {
    if (this.level < LEVELS.length) {
      this.level++;
      this.loadLevel();
      this.status = "playing";
      this.emitState();
    }
  }

  private loadLevel() {
    const levelData = LEVELS[this.level - 1];
    this.moves = 0;
    this.selectedBook = null;

    // Create books with different heights
    this.books = [];
    const heights: number[] = [];
    for (let i = 0; i < levelData.bookCount; i++) {
      heights.push(80 + i * 20);
    }

    // Shuffle heights
    for (let i = heights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [heights[i], heights[j]] = [heights[j], heights[i]];
    }

    // Create books
    for (let i = 0; i < levelData.bookCount; i++) {
      this.books.push({
        id: i,
        height: heights[i],
        color: BOOK_COLORS[i % BOOK_COLORS.length],
        x: 0,
        targetX: 0,
        selected: false,
      });
    }

    this.calculateLayout();
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked book
    for (const book of this.books) {
      const bookX = book.x;
      const bookY = this.shelfY - book.height;

      if (
        x >= bookX &&
        x <= bookX + this.bookWidth &&
        y >= bookY &&
        y <= this.shelfY
      ) {
        this.selectBook(book);
        return;
      }
    }

    // Clicked outside - deselect
    if (this.selectedBook) {
      this.selectedBook.selected = false;
      this.selectedBook = null;
    }
  }

  private selectBook(book: Book) {
    if (this.selectedBook === null) {
      // First selection
      book.selected = true;
      this.selectedBook = book;
    } else if (this.selectedBook === book) {
      // Deselect
      book.selected = false;
      this.selectedBook = null;
    } else {
      // Swap books
      this.swapBooks(this.selectedBook, book);
      this.selectedBook.selected = false;
      this.selectedBook = null;
      this.moves++;
      this.emitState();

      // Check win
      if (this.checkWin()) {
        this.status = "won";
        this.emitState();
      }
    }
  }

  private swapBooks(a: Book, b: Book) {
    const indexA = this.books.indexOf(a);
    const indexB = this.books.indexOf(b);

    // Swap in array
    this.books[indexA] = b;
    this.books[indexB] = a;

    // Swap target positions
    const tempX = a.targetX;
    a.targetX = b.targetX;
    b.targetX = tempX;
  }

  private checkWin(): boolean {
    const levelData = LEVELS[this.level - 1];
    const heights = this.books.map((b) => b.height);

    if (levelData.sortOrder === "asc") {
      for (let i = 1; i < heights.length; i++) {
        if (heights[i] < heights[i - 1]) return false;
      }
    } else {
      for (let i = 1; i < heights.length; i++) {
        if (heights[i] > heights[i - 1]) return false;
      }
    }
    return true;
  }

  private gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Animate book positions
    for (const book of this.books) {
      const dx = book.targetX - book.x;
      if (Math.abs(dx) > 1) {
        book.x += dx * 0.15;
      } else {
        book.x = book.targetX;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - room wall
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
    wallGrad.addColorStop(0, "#dfe6e9");
    wallGrad.addColorStop(1, "#b2bec3");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h);

    // Wallpaper pattern
    ctx.strokeStyle = "rgba(0,0,0,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw bookshelf
    this.drawShelf();

    // Draw books
    for (const book of this.books) {
      this.drawBook(book);
    }

    // Draw sort direction indicator
    this.drawSortIndicator();
  }

  private drawShelf() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const shelfWidth = w - 40;
    const shelfX = 20;

    // Shelf back
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(shelfX - 10, this.shelfY - 200, shelfWidth + 20, 220);

    // Shelf surface
    const shelfGrad = ctx.createLinearGradient(0, this.shelfY, 0, this.shelfY + 20);
    shelfGrad.addColorStop(0, "#8d6e63");
    shelfGrad.addColorStop(0.5, "#6d4c41");
    shelfGrad.addColorStop(1, "#5d4037");
    ctx.fillStyle = shelfGrad;
    ctx.fillRect(shelfX - 15, this.shelfY, shelfWidth + 30, 20);

    // Shelf front edge
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(shelfX - 15, this.shelfY + 15, shelfWidth + 30, 8);

    // Side supports
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(shelfX - 15, this.shelfY - 200, 15, 220);
    ctx.fillRect(shelfX + shelfWidth, this.shelfY - 200, 15, 220);
  }

  private drawBook(book: Book) {
    const ctx = this.ctx;
    const { x, height, color, selected } = book;
    const y = this.shelfY - height;

    // Book shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x + 3, y + 3, this.bookWidth, height);

    // Book body
    const bookGrad = ctx.createLinearGradient(x, 0, x + this.bookWidth, 0);
    bookGrad.addColorStop(0, color);
    bookGrad.addColorStop(0.1, this.lightenColor(color, 30));
    bookGrad.addColorStop(0.9, color);
    bookGrad.addColorStop(1, this.darkenColor(color, 30));
    ctx.fillStyle = bookGrad;
    ctx.fillRect(x, y, this.bookWidth, height);

    // Book spine detail
    ctx.fillStyle = this.darkenColor(color, 20);
    ctx.fillRect(x, y, 5, height);

    // Book title area
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x + 8, y + height * 0.3, this.bookWidth - 12, height * 0.1);
    ctx.fillRect(x + 8, y + height * 0.45, this.bookWidth - 16, height * 0.05);

    // Selection highlight
    if (selected) {
      ctx.strokeStyle = "#fdcb6e";
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 2, y - 2, this.bookWidth + 4, height + 4);

      // Lifted effect
      ctx.fillStyle = "rgba(253, 203, 110, 0.3)";
      ctx.fillRect(x, y, this.bookWidth, height);
    }

    // Book top edge
    ctx.fillStyle = this.lightenColor(color, 40);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + this.bookWidth, y);
    ctx.lineTo(x + this.bookWidth - 3, y + 3);
    ctx.lineTo(x + 3, y + 3);
    ctx.closePath();
    ctx.fill();
  }

  private drawSortIndicator() {
    const ctx = this.ctx;
    const levelData = LEVELS[this.level - 1];
    const centerX = this.canvas.width / 2;
    const y = 40;

    ctx.fillStyle = "#2d3436";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = levelData.sortOrder === "asc" ? "Short to Tall" : "Tall to Short";
    ctx.fillText(text, centerX, y);

    // Arrow
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (levelData.sortOrder === "asc") {
      ctx.moveTo(centerX - 60, y + 25);
      ctx.lineTo(centerX + 60, y + 25);
      ctx.lineTo(centerX + 50, y + 20);
      ctx.moveTo(centerX + 60, y + 25);
      ctx.lineTo(centerX + 50, y + 30);
    } else {
      ctx.moveTo(centerX + 60, y + 25);
      ctx.lineTo(centerX - 60, y + 25);
      ctx.lineTo(centerX - 50, y + 20);
      ctx.moveTo(centerX - 60, y + 25);
      ctx.lineTo(centerX - 50, y + 30);
    }
    ctx.stroke();

    // Height indicators
    ctx.fillStyle = "#636e72";
    if (levelData.sortOrder === "asc") {
      ctx.fillRect(centerX - 70, y + 15, 8, 20);
      ctx.fillRect(centerX + 62, y + 5, 8, 30);
    } else {
      ctx.fillRect(centerX - 70, y + 5, 8, 30);
      ctx.fillRect(centerX + 62, y + 15, 8, 20);
    }
  }

  private lightenColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
