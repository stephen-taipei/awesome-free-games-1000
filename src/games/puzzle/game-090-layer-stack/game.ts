/**
 * Layer Stack Game Engine
 * Game #090 - Stack layers in the correct order
 * Holographic / Translucent / Layered Theme
 */

export interface Layer {
  id: number;
  color: string;
  label: string;
}

export interface LevelConfig {
  layers: Layer[];
  targetOrder: number[];
}

export interface GameState {
  event?: "layerMove" | "correct" | "victory" | "levelStart" | "reset";
  layerIndex?: number;
  layerId?: number;
  moves?: number;
  level?: number;
  status?: "playing" | "won";
}

export class LayerStackGame {
  private container: HTMLElement;
  private targetContainer: HTMLElement;

  private layers: Layer[] = [];
  private currentOrder: number[] = [];
  private targetOrder: number[] = [];

  private moves = 0;
  private currentLevel = 0;
  private status: "playing" | "won" = "playing";

  private onStateChange: ((state: GameState) => void) | null = null;

  private colors = [
    { bg: "linear-gradient(135deg, rgba(231, 76, 60, 0.85), rgba(192, 57, 43, 0.85))", label: "A" },
    { bg: "linear-gradient(135deg, rgba(52, 152, 219, 0.85), rgba(41, 128, 185, 0.85))", label: "B" },
    { bg: "linear-gradient(135deg, rgba(46, 204, 113, 0.85), rgba(39, 174, 96, 0.85))", label: "C" },
    { bg: "linear-gradient(135deg, rgba(241, 196, 15, 0.85), rgba(243, 156, 18, 0.85))", label: "D" },
    { bg: "linear-gradient(135deg, rgba(155, 89, 182, 0.85), rgba(142, 68, 173, 0.85))", label: "E" },
    { bg: "linear-gradient(135deg, rgba(230, 126, 34, 0.85), rgba(211, 84, 0, 0.85))", label: "F" },
    { bg: "linear-gradient(135deg, rgba(26, 188, 156, 0.85), rgba(22, 160, 133, 0.85))", label: "G" },
    { bg: "linear-gradient(135deg, rgba(253, 121, 168, 0.85), rgba(232, 67, 147, 0.85))", label: "H" },
  ];

  private levels: LevelConfig[] = [
    // Level 1 - 3 layers
    {
      layers: [
        { id: 0, color: this.colors[0].bg, label: "A" },
        { id: 1, color: this.colors[1].bg, label: "B" },
        { id: 2, color: this.colors[2].bg, label: "C" },
      ],
      targetOrder: [2, 1, 0], // C, B, A from top to bottom
    },
    // Level 2 - 4 layers
    {
      layers: [
        { id: 0, color: this.colors[0].bg, label: "A" },
        { id: 1, color: this.colors[1].bg, label: "B" },
        { id: 2, color: this.colors[2].bg, label: "C" },
        { id: 3, color: this.colors[3].bg, label: "D" },
      ],
      targetOrder: [3, 1, 2, 0], // D, B, C, A
    },
    // Level 3 - 5 layers
    {
      layers: [
        { id: 0, color: this.colors[0].bg, label: "A" },
        { id: 1, color: this.colors[1].bg, label: "B" },
        { id: 2, color: this.colors[2].bg, label: "C" },
        { id: 3, color: this.colors[3].bg, label: "D" },
        { id: 4, color: this.colors[4].bg, label: "E" },
      ],
      targetOrder: [4, 2, 0, 3, 1], // E, C, A, D, B
    },
    // Level 4 - 5 layers different
    {
      layers: [
        { id: 0, color: this.colors[0].bg, label: "A" },
        { id: 1, color: this.colors[1].bg, label: "B" },
        { id: 2, color: this.colors[2].bg, label: "C" },
        { id: 3, color: this.colors[3].bg, label: "D" },
        { id: 4, color: this.colors[4].bg, label: "E" },
      ],
      targetOrder: [1, 3, 0, 4, 2], // B, D, A, E, C
    },
    // Level 5 - 6 layers
    {
      layers: [
        { id: 0, color: this.colors[0].bg, label: "A" },
        { id: 1, color: this.colors[1].bg, label: "B" },
        { id: 2, color: this.colors[2].bg, label: "C" },
        { id: 3, color: this.colors[3].bg, label: "D" },
        { id: 4, color: this.colors[4].bg, label: "E" },
        { id: 5, color: this.colors[5].bg, label: "F" },
      ],
      targetOrder: [5, 2, 4, 0, 3, 1], // F, C, E, A, D, B
    },
  ];

  constructor(container: HTMLElement, targetContainer: HTMLElement) {
    this.container = container;
    this.targetContainer = targetContainer;
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.moves = 0;
    this.status = "playing";
    this.loadLevel(this.currentLevel);
    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        event: "levelStart",
        level: this.currentLevel,
      });
    }
  }

  private loadLevel(levelIndex: number) {
    const level = this.levels[levelIndex % this.levels.length];
    this.layers = [...level.layers];
    this.targetOrder = [...level.targetOrder];

    // Shuffle current order (but ensure it's not already solved)
    do {
      this.currentOrder = [...level.targetOrder];
      this.shuffleArray(this.currentOrder);
    } while (this.checkWin());
  }

  private shuffleArray(array: number[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private render() {
    this.container.innerHTML = "";

    // Render layers (top to bottom based on currentOrder)
    this.currentOrder.forEach((layerId, index) => {
      const layer = this.layers.find((l) => l.id === layerId)!;
      const isCorrect = this.targetOrder[index] === layerId;

      const div = document.createElement("div");
      div.className = `layer ${isCorrect ? "correct" : ""}`;
      div.style.background = layer.color;
      div.textContent = layer.label;
      div.dataset.id = layerId.toString();
      div.style.animationDelay = `${index * 0.1}s`;

      div.addEventListener("click", () => this.moveToTop(layerId, index));

      this.container.appendChild(div);
    });

    // Render target preview
    this.targetContainer.innerHTML = "";
    this.targetOrder.forEach((layerId) => {
      const layer = this.layers.find((l) => l.id === layerId)!;
      const div = document.createElement("div");
      div.className = "target-layer";
      div.style.background = layer.color;
      div.title = layer.label;
      this.targetContainer.appendChild(div);
    });
  }

  private moveToTop(layerId: number, visualIndex: number) {
    if (this.status !== "playing") return;

    const index = this.currentOrder.indexOf(layerId);
    if (index === 0) return; // Already at top

    // Remove from current position and add to top
    this.currentOrder.splice(index, 1);
    this.currentOrder.unshift(layerId);

    this.moves++;

    // Check if the move resulted in a correct placement
    const isNowCorrect = this.targetOrder[0] === layerId;

    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        event: "layerMove",
        layerIndex: 0,
        layerId,
        moves: this.moves,
      });

      if (isNowCorrect) {
        this.onStateChange({
          event: "correct",
          layerIndex: 0,
          layerId,
        });
      }
    }

    if (this.checkWin()) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          event: "victory",
          status: "won",
          moves: this.moves,
          level: this.currentLevel,
        });
      }
    }
  }

  private checkWin(): boolean {
    return this.currentOrder.every((id, index) => this.targetOrder[index] === id);
  }

  public reset() {
    if (this.onStateChange) {
      this.onStateChange({
        event: "reset",
      });
    }
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

  public getMoves(): number {
    return this.moves;
  }

  public setOnStateChange(cb: (state: GameState) => void) {
    this.onStateChange = cb;
  }
}
