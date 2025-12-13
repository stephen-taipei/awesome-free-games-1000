export interface Shape {
  id: number;
  emoji: string;
  matched: boolean;
}

export interface Level {
  shapes: string[];
  timeLimit: number;
}

const SHAPE_SETS = [
  ["🌟", "🌙", "☀️", "⭐"],
  ["🍎", "🍊", "🍋", "🍇", "🍓"],
  ["🐱", "🐶", "🐰", "🐻", "🦊", "🐼"],
  ["🚗", "🚀", "✈️", "🚢", "🚂", "🚁"],
  ["🎸", "🎹", "🎺", "🥁", "🎻", "🪗"],
  ["🏀", "⚽", "🎾", "🏈", "🎱", "🏐", "⚾"],
];

const LEVELS: Level[] = [
  { shapes: SHAPE_SETS[0], timeLimit: 60 },
  { shapes: SHAPE_SETS[1], timeLimit: 55 },
  { shapes: SHAPE_SETS[2], timeLimit: 50 },
  { shapes: SHAPE_SETS[3], timeLimit: 45 },
  { shapes: SHAPE_SETS[4], timeLimit: 40 },
  { shapes: SHAPE_SETS[5], timeLimit: 35 },
];

export class ShadowMatchGame {
  shadowZone: HTMLElement;
  objectsZone: HTMLElement;

  shapes: Shape[] = [];
  shuffledObjects: Shape[] = [];
  level: number = 1;
  currentLevel: Level;
  score: number = 0;
  timeLeft: number = 60;
  status: "playing" | "won" | "failed" = "playing";
  timerInterval: number = 0;

  draggedItem: HTMLElement | null = null;
  draggedId: number | null = null;

  onStateChange: ((s: any) => void) | null = null;

  constructor(shadowZone: HTMLElement, objectsZone: HTMLElement) {
    this.shadowZone = shadowZone;
    this.objectsZone = objectsZone;
    this.currentLevel = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.score = 0;
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.timeLeft = this.currentLevel.timeLimit;
    this.initShapes();
    this.render();
    this.startTimer();
    this.notifyChange();
  }

  private initShapes() {
    this.shapes = this.currentLevel.shapes.map((emoji, i) => ({
      id: i,
      emoji,
      matched: false,
    }));

    // Shuffle for objects zone
    this.shuffledObjects = [...this.shapes].sort(() => Math.random() - 0.5);
  }

  private render() {
    this.renderShadows();
    this.renderObjects();
  }

  private renderShadows() {
    this.shadowZone.innerHTML = "";

    this.shapes.forEach((shape) => {
      const slot = document.createElement("div");
      slot.className = `shadow-slot ${shape.matched ? "matched" : ""}`;
      slot.dataset.id = String(shape.id);

      const shadowShape = document.createElement("div");
      shadowShape.className = "shadow-shape";
      shadowShape.textContent = shape.emoji;

      if (shape.matched) {
        shadowShape.style.filter = "none";
        shadowShape.style.opacity = "1";
      }

      slot.appendChild(shadowShape);

      // Drop events
      slot.addEventListener("dragover", (e) => this.handleDragOver(e));
      slot.addEventListener("dragleave", (e) => this.handleDragLeave(e));
      slot.addEventListener("drop", (e) => this.handleDrop(e, shape.id));

      this.shadowZone.appendChild(slot);
    });
  }

  private renderObjects() {
    this.objectsZone.innerHTML = "";

    this.shuffledObjects.forEach((shape) => {
      const item = document.createElement("div");
      item.className = `object-item ${shape.matched ? "matched" : ""}`;
      item.dataset.id = String(shape.id);
      item.textContent = shape.emoji;
      item.draggable = !shape.matched;

      // Drag events
      item.addEventListener("dragstart", (e) => this.handleDragStart(e, shape.id));
      item.addEventListener("dragend", (e) => this.handleDragEnd(e));

      // Touch events for mobile
      item.addEventListener("touchstart", (e) => this.handleTouchStart(e, shape.id));
      item.addEventListener("touchmove", (e) => this.handleTouchMove(e));
      item.addEventListener("touchend", (e) => this.handleTouchEnd(e));

      this.objectsZone.appendChild(item);
    });
  }

  private handleDragStart(e: DragEvent, id: number) {
    this.draggedId = id;
    const target = e.target as HTMLElement;
    target.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(id));
    }
  }

  private handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove("dragging");
    this.draggedId = null;
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add("highlight");
  }

  private handleDragLeave(e: DragEvent) {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("highlight");
  }

  private handleDrop(e: DragEvent, targetId: number) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("highlight");

    const draggedId = parseInt(e.dataTransfer?.getData("text/plain") || "-1");
    this.checkMatch(draggedId, targetId);
  }

  // Touch handling for mobile
  private handleTouchStart(e: TouchEvent, id: number) {
    this.draggedId = id;
    this.draggedItem = e.target as HTMLElement;
    this.draggedItem.classList.add("dragging");
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.draggedItem) return;
    e.preventDefault();

    const touch = e.touches[0];
    this.draggedItem.style.position = "fixed";
    this.draggedItem.style.left = `${touch.clientX - 35}px`;
    this.draggedItem.style.top = `${touch.clientY - 35}px`;
    this.draggedItem.style.zIndex = "1000";

    // Highlight shadow slot under touch
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = elemBelow?.closest(".shadow-slot");

    document.querySelectorAll(".shadow-slot").forEach((s) => s.classList.remove("highlight"));
    if (slot) {
      slot.classList.add("highlight");
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (!this.draggedItem || this.draggedId === null) return;

    const touch = e.changedTouches[0];
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = elemBelow?.closest(".shadow-slot") as HTMLElement;

    if (slot) {
      const targetId = parseInt(slot.dataset.id || "-1");
      slot.classList.remove("highlight");
      this.checkMatch(this.draggedId, targetId);
    }

    // Reset item position
    this.draggedItem.style.position = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.classList.remove("dragging");

    this.draggedItem = null;
    this.draggedId = null;
  }

  private checkMatch(draggedId: number, targetId: number) {
    if (this.status !== "playing") return;

    if (draggedId === targetId) {
      // Correct match!
      const shape = this.shapes.find((s) => s.id === draggedId);
      const shuffledShape = this.shuffledObjects.find((s) => s.id === draggedId);

      if (shape && shuffledShape && !shape.matched) {
        shape.matched = true;
        shuffledShape.matched = true;
        this.score += 10;

        // Animation
        const slot = this.shadowZone.querySelector(`[data-id="${targetId}"]`);
        if (slot) {
          slot.classList.add("match-animation");
          setTimeout(() => slot.classList.remove("match-animation"), 500);
        }

        this.render();
        this.checkWin();
        this.notifyChange();
      }
    }
  }

  private checkWin() {
    const allMatched = this.shapes.every((s) => s.matched);
    if (allMatched) {
      this.status = "won";
      this.stopTimer();
      this.score += this.timeLeft * 2; // Bonus for remaining time
      this.notifyChange();
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      this.timeLeft--;
      this.notifyChange();

      if (this.timeLeft <= 0) {
        this.status = "failed";
        this.stopTimer();
        this.notifyChange();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = 0;
    }
  }

  public reset() {
    this.stopTimer();
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        score: this.score,
        time: this.timeLeft,
        status: this.status,
      });
    }
  }
}
