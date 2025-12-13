/**
 * Layer Stack Game Engine
 * Game #090 - Stack layers in the correct order
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

export class LayerStackGame {
  private container: HTMLElement;
  private targetContainer: HTMLElement;

  private layers: Layer[] = [];
  private currentOrder: number[] = [];
  private targetOrder: number[] = [];

  private moves = 0;
  private currentLevel = 0;
  private status: "playing" | "won" = "playing";

  private onStateChange: ((state: any) => void) | null = null;

  private colors = [
    { bg: "#e74c3c", label: "A" },
    { bg: "#3498db", label: "B" },
    { bg: "#2ecc71", label: "C" },
    { bg: "#f1c40f", label: "D" },
    { bg: "#9b59b6", label: "E" },
    { bg: "#e67e22", label: "F" },
    { bg: "#1abc9c", label: "G" },
    { bg: "#fd79a8", label: "H" },
  ];

  private levels: LevelConfig[] = [
    // Level 1 - 3 layers
    {
      layers: [
        { id: 0, color: "#e74c3c", label: "A" },
        { id: 1, color: "#3498db", label: "B" },
        { id: 2, color: "#2ecc71", label: "C" },
      ],
      targetOrder: [2, 1, 0], // C, B, A from top to bottom
    },
    // Level 2 - 4 layers
    {
      layers: [
        { id: 0, color: "#e74c3c", label: "A" },
        { id: 1, color: "#3498db", label: "B" },
        { id: 2, color: "#2ecc71", label: "C" },
        { id: 3, color: "#f1c40f", label: "D" },
      ],
      targetOrder: [3, 1, 2, 0], // D, B, C, A
    },
    // Level 3 - 5 layers
    {
      layers: [
        { id: 0, color: "#e74c3c", label: "A" },
        { id: 1, color: "#3498db", label: "B" },
        { id: 2, color: "#2ecc71", label: "C" },
        { id: 3, color: "#f1c40f", label: "D" },
        { id: 4, color: "#9b59b6", label: "E" },
      ],
      targetOrder: [4, 2, 0, 3, 1], // E, C, A, D, B
    },
    // Level 4 - 5 layers different
    {
      layers: [
        { id: 0, color: "#e74c3c", label: "A" },
        { id: 1, color: "#3498db", label: "B" },
        { id: 2, color: "#2ecc71", label: "C" },
        { id: 3, color: "#f1c40f", label: "D" },
        { id: 4, color: "#9b59b6", label: "E" },
      ],
      targetOrder: [1, 3, 0, 4, 2], // B, D, A, E, C
    },
    // Level 5 - 6 layers
    {
      layers: [
        { id: 0, color: "#e74c3c", label: "A" },
        { id: 1, color: "#3498db", label: "B" },
        { id: 2, color: "#2ecc71", label: "C" },
        { id: 3, color: "#f1c40f", label: "D" },
        { id: 4, color: "#9b59b6", label: "E" },
        { id: 5, color: "#e67e22", label: "F" },
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

      div.addEventListener("click", () => this.moveToTop(layerId));

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

  private moveToTop(layerId: number) {
    if (this.status !== "playing") return;

    const index = this.currentOrder.indexOf(layerId);
    if (index === 0) return; // Already at top

    // Remove from current position and add to top
    this.currentOrder.splice(index, 1);
    this.currentOrder.unshift(layerId);

    this.moves++;

    this.render();

    if (this.onStateChange) {
      this.onStateChange({ moves: this.moves });
    }

    if (this.checkWin()) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
