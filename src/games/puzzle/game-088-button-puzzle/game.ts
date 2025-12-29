/**
 * Button Puzzle Game Engine
 * Game #088 - Press buttons in the correct sequence (Simon-like)
 * WebGPU Enhanced with Event Emissions
 */

export interface LevelConfig {
  gridSize: number;
  sequenceLength: number;
  showTime: number;
  pauseTime: number;
}

export interface GameState {
  event?: "buttonFlash" | "sequenceShow" | "correct" | "wrong" | "victory" | "levelStart" | "reset";
  x?: number;
  y?: number;
  buttonIndex?: number;
  colorIndex?: number;
  sequence?: string;
  status?: "idle" | "showing" | "playing" | "won" | "wrong";
  level?: number;
}

export class ButtonPuzzleGame {
  private gridContainer: HTMLElement;
  private buttons: HTMLButtonElement[] = [];

  private sequence: number[] = [];
  private playerIndex = 0;

  private currentLevel = 0;
  private status: "idle" | "showing" | "playing" | "won" | "wrong" = "idle";

  private onStateChange: ((state: GameState) => void) | null = null;

  private colors = ["red", "blue", "green", "yellow", "purple", "cyan", "orange", "pink", "white"];

  private levels: LevelConfig[] = [
    { gridSize: 2, sequenceLength: 3, showTime: 600, pauseTime: 300 },
    { gridSize: 2, sequenceLength: 4, showTime: 500, pauseTime: 250 },
    { gridSize: 2, sequenceLength: 5, showTime: 450, pauseTime: 200 },
    { gridSize: 3, sequenceLength: 4, showTime: 500, pauseTime: 250 },
    { gridSize: 3, sequenceLength: 6, showTime: 400, pauseTime: 200 },
    { gridSize: 3, sequenceLength: 8, showTime: 350, pauseTime: 150 },
  ];

  constructor(gridContainer: HTMLElement) {
    this.gridContainer = gridContainer;
  }

  private emitState(state: GameState): void {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  private getButtonCenter(buttonIndex: number): { x: number; y: number } {
    const button = this.buttons[buttonIndex];
    if (!button) {
      return { x: 0, y: 0 };
    }
    const rect = button.getBoundingClientRect();
    const containerRect = this.gridContainer.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    };
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.playerIndex = 0;
    this.status = "showing";

    this.createGrid();
    this.generateSequence();

    this.emitState({
      sequence: `0/${this.sequence.length}`,
      status: "showing",
    });

    // Emit level start
    const centerX = this.gridContainer.offsetWidth / 2;
    const centerY = this.gridContainer.offsetHeight / 2;
    this.emitState({
      event: "levelStart",
      x: centerX,
      y: centerY,
    });

    // Show sequence after a short delay
    setTimeout(() => {
      this.showSequence();
    }, 500);
  }

  private createGrid() {
    const config = this.levels[this.currentLevel % this.levels.length];
    const size = config.gridSize;

    this.gridContainer.innerHTML = "";
    this.gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    this.gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    this.buttons = [];

    for (let i = 0; i < size * size; i++) {
      const btn = document.createElement("button");
      btn.className = `game-button ${this.colors[i % this.colors.length]} disabled`;
      btn.dataset.index = i.toString();
      btn.addEventListener("click", () => this.handleButtonClick(i));
      this.gridContainer.appendChild(btn);
      this.buttons.push(btn);
    }
  }

  private generateSequence() {
    const config = this.levels[this.currentLevel % this.levels.length];
    const totalButtons = config.gridSize * config.gridSize;

    this.sequence = [];
    for (let i = 0; i < config.sequenceLength; i++) {
      this.sequence.push(Math.floor(Math.random() * totalButtons));
    }
  }

  private async showSequence() {
    const config = this.levels[this.currentLevel % this.levels.length];

    // Disable all buttons during showing
    this.buttons.forEach((btn) => btn.classList.add("disabled"));

    for (let i = 0; i < this.sequence.length; i++) {
      const idx = this.sequence[i];
      await this.flashButton(idx, config.showTime, true);
      await this.wait(config.pauseTime);
    }

    // Enable buttons for player input
    this.status = "playing";
    this.buttons.forEach((btn) => btn.classList.remove("disabled"));

    this.emitState({ status: "playing" });
  }

  private flashButton(index: number, duration: number, isSequenceShow: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      const btn = this.buttons[index];
      btn.classList.add("active");

      const pos = this.getButtonCenter(index);

      // Emit event for WebGPU/Audio
      this.emitState({
        event: isSequenceShow ? "sequenceShow" : "buttonFlash",
        x: pos.x,
        y: pos.y,
        buttonIndex: index,
        colorIndex: index % this.colors.length,
      });

      setTimeout(() => {
        btn.classList.remove("active");
        resolve();
      }, duration);
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleButtonClick(index: number) {
    if (this.status !== "playing") return;

    // Flash the clicked button
    this.flashButton(index, 200);

    const pos = this.getButtonCenter(index);

    if (this.sequence[this.playerIndex] === index) {
      // Correct!
      this.playerIndex++;

      this.emitState({
        event: "correct",
        x: pos.x,
        y: pos.y,
        buttonIndex: index,
        colorIndex: index % this.colors.length,
      });

      this.emitState({
        sequence: `${this.playerIndex}/${this.sequence.length}`,
      });

      if (this.playerIndex >= this.sequence.length) {
        // Won!
        this.status = "won";
        this.buttons.forEach((btn) => btn.classList.add("disabled"));

        const centerX = this.gridContainer.offsetWidth / 2;
        const centerY = this.gridContainer.offsetHeight / 2;
        this.emitState({
          event: "victory",
          x: centerX,
          y: centerY,
        });

        this.emitState({
          status: "won",
          level: this.currentLevel,
        });
      }
    } else {
      // Wrong!
      this.status = "wrong";
      this.buttons.forEach((btn) => btn.classList.add("disabled"));

      const centerX = this.gridContainer.offsetWidth / 2;
      const centerY = this.gridContainer.offsetHeight / 2;
      this.emitState({
        event: "wrong",
        x: centerX,
        y: centerY,
      });

      // Flash all buttons red briefly
      this.buttons.forEach((btn) => {
        btn.style.filter = "hue-rotate(0deg) saturate(2)";
      });

      setTimeout(() => {
        this.buttons.forEach((btn) => {
          btn.style.filter = "";
        });

        this.emitState({ status: "wrong" });

        // Restart the level
        setTimeout(() => {
          this.playerIndex = 0;
          this.status = "showing";
          this.emitState({
            sequence: `0/${this.sequence.length}`,
            status: "showing",
          });
          this.showSequence();
        }, 500);
      }, 500);
    }
  }

  public reset() {
    this.emitState({
      event: "reset",
    });
    this.start(this.currentLevel);
  }

  public nextLevel() {
    this.currentLevel++;
    this.start(this.currentLevel);
  }

  public hasMoreLevels(): boolean {
    return this.currentLevel < this.levels.length - 1;
  }

  public getLevel(): number {
    return this.currentLevel + 1;
  }

  public getSequenceLength(): number {
    return this.sequence.length;
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }
}
