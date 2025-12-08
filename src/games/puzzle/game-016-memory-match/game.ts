export interface Card {
  id: number;
  value: string; // Emoji
  isFlipped: boolean;
  isMatched: boolean;
  element: HTMLElement;
}

const EMOJIS = [
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐔",
  "🐧",
  "🐦",
];

export class MemoryGame {
  private container: HTMLElement;
  private cards: Card[] = [];
  private flippedCards: Card[] = [];
  private isLocked = false;

  private moves = 0;
  private startTime = 0;
  private timerInterval: number | null = null;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((s: any) => void) | null = null;

  private gridSize = 4; // 4x4 or 6x6

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public start(size: number) {
    this.gridSize = size;
    this.moves = 0;
    this.startTime = Date.now();
    this.status = "playing";
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => this.notify(), 1000);

    this.initCards();
    this.notify();
  }

  public reset() {
    this.status = "idle";
    this.container.innerHTML = "";
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.notify();
  }

  private initCards() {
    this.container.innerHTML = "";
    this.cards = [];
    this.flippedCards = [];
    this.isLocked = false;

    const totalCards = this.gridSize * this.gridSize;
    const pairCount = totalCards / 2;

    // Select random emojis
    const selectedEmojis = EMOJIS.sort(() => 0.5 - Math.random()).slice(
      0,
      pairCount
    );
    const values = [...selectedEmojis, ...selectedEmojis];
    values.sort(() => 0.5 - Math.random());

    // Setup Grid CSS
    this.container.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

    values.forEach((val, i) => {
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">${val}</div>
                    <div class="card-back">
                        <div class="card-face-down">?</div>
                        <div class="card-face-up">${val}</div>
                    </div>
                </div>
            `;
      // Simplified Inner structure
      cardEl.innerHTML = `
                <div class="card-inner">
                    <div class="card-face-down">?</div> <!-- Back -->
                    <div class="card-face-up">${val}</div> <!-- Front (Hidden) -->
                </div>
            `;

      const card: Card = {
        id: i,
        value: val,
        isFlipped: false,
        isMatched: false,
        element: cardEl,
      };

      cardEl.addEventListener("click", () => this.handleCardClick(card));

      this.container.appendChild(cardEl);
      this.cards.push(card);
    });
  }

  private handleCardClick(card: Card) {
    if (
      this.isLocked ||
      card.isFlipped ||
      card.isMatched ||
      this.status !== "playing"
    )
      return;

    this.flipCard(card);
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.notify();
      this.checkMatch();
    }
  }

  private flipCard(card: Card) {
    card.isFlipped = true;
    card.element.classList.add("flipped");
  }

  private unflipCard(card: Card) {
    card.isFlipped = false;
    card.element.classList.remove("flipped");
  }

  private checkMatch() {
    const [c1, c2] = this.flippedCards;
    this.isLocked = true;

    if (c1.value === c2.value) {
      handleMatch(this, c1, c2);
    } else {
      setTimeout(() => {
        this.unflipCard(c1);
        this.unflipCard(c2);
        this.flippedCards = [];
        this.isLocked = false;
      }, 1000);
    }
  }

  public setOnStateChange(cb: any) {
    this.onStateChange = cb;
  }

  public notify() {
    const time =
      this.status === "playing"
        ? Math.floor((Date.now() - this.startTime) / 1000)
        : 0;
    if (this.onStateChange)
      this.onStateChange({
        moves: this.moves,
        time,
        status: this.status,
      });
  }

  public markMatched() {
    // Helper to update status
    const allMatched = this.cards.every((c) => c.isMatched);
    if (allMatched) {
      this.status = "won";
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.notify();
    }
  }
}

// Function hoisting issue with `this` inside timeout if using arrow functions incorrectly or context loss.
function handleMatch(game: MemoryGame, c1: Card, c2: Card) {
  c1.isMatched = true;
  c2.isMatched = true;
  c1.element.classList.add("matched");
  c2.element.classList.add("matched");

  game["flippedCards"] = []; // Access private via bracket or make public?
  // Just use public method or friend function logic inside class.
  // Moving logic inside class:
  game["isLocked"] = false;

  game.markMatched();
}
