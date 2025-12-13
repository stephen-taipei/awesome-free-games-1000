export interface Element {
  symbol: string;
  name: string;
  type: "metal" | "nonmetal" | "noble";
  color: string;
}

export interface Reaction {
  inputs: string[]; // Element symbols
  output: string; // Compound formula
  outputName: string;
}

export interface Level {
  availableElements: string[];
  targetCompound: string;
  targetName: string;
}

const ELEMENTS: Record<string, Element> = {
  H: { symbol: "H", name: "Hydrogen", type: "nonmetal", color: "#3498db" },
  O: { symbol: "O", name: "Oxygen", type: "nonmetal", color: "#e74c3c" },
  N: { symbol: "N", name: "Nitrogen", type: "nonmetal", color: "#9b59b6" },
  C: { symbol: "C", name: "Carbon", type: "nonmetal", color: "#2c3e50" },
  Na: { symbol: "Na", name: "Sodium", type: "metal", color: "#f39c12" },
  Cl: { symbol: "Cl", name: "Chlorine", type: "nonmetal", color: "#27ae60" },
  S: { symbol: "S", name: "Sulfur", type: "nonmetal", color: "#f1c40f" },
  Fe: { symbol: "Fe", name: "Iron", type: "metal", color: "#7f8c8d" },
  Ca: { symbol: "Ca", name: "Calcium", type: "metal", color: "#1abc9c" },
  K: { symbol: "K", name: "Potassium", type: "metal", color: "#e91e63" },
};

const REACTIONS: Reaction[] = [
  { inputs: ["H", "H", "O"], output: "H2O", outputName: "Water" },
  { inputs: ["Na", "Cl"], output: "NaCl", outputName: "Salt" },
  { inputs: ["C", "O", "O"], output: "CO2", outputName: "Carbon Dioxide" },
  { inputs: ["H", "H", "S", "O", "O", "O", "O"], output: "H2SO4", outputName: "Sulfuric Acid" },
  { inputs: ["N", "H", "H", "H"], output: "NH3", outputName: "Ammonia" },
  { inputs: ["Ca", "O"], output: "CaO", outputName: "Quickite" },
  { inputs: ["Fe", "O", "O", "O"], output: "Fe2O3", outputName: "Rust" },
  { inputs: ["K", "Cl"], output: "KCl", outputName: "Potassium Chloride" },
  { inputs: ["H", "Cl"], output: "HCl", outputName: "Hydrochloric Acid" },
  { inputs: ["C", "H", "H", "H", "H"], output: "CH4", outputName: "Methane" },
];

const LEVELS: Level[] = [
  { availableElements: ["H", "O"], targetCompound: "H2O", targetName: "Water" },
  { availableElements: ["Na", "Cl"], targetCompound: "NaCl", targetName: "Salt" },
  { availableElements: ["C", "O"], targetCompound: "CO2", targetName: "Carbon Dioxide" },
  { availableElements: ["N", "H"], targetCompound: "NH3", targetName: "Ammonia" },
  { availableElements: ["H", "Cl"], targetCompound: "HCl", targetName: "Hydrochloric Acid" },
  { availableElements: ["Ca", "O"], targetCompound: "CaO", targetName: "Quicklite" },
  { availableElements: ["K", "Cl"], targetCompound: "KCl", targetName: "Potassium Chloride" },
  { availableElements: ["C", "H"], targetCompound: "CH4", targetName: "Methane" },
];

export class ChemistryGame {
  elementsZone: HTMLElement;
  flaskContent: HTMLElement;
  flaskLiquid: HTMLElement;

  level: number = 1;
  currentLevel: Level;
  flaskElements: string[] = [];
  status: "playing" | "won" | "failed" = "playing";

  onStateChange: ((s: any) => void) | null = null;

  constructor(elementsZone: HTMLElement, flaskContent: HTMLElement, flaskLiquid: HTMLElement) {
    this.elementsZone = elementsZone;
    this.flaskContent = flaskContent;
    this.flaskLiquid = flaskLiquid;
    this.currentLevel = LEVELS[0];
  }

  public start() {
    this.status = "playing";
    this.flaskElements = [];
    this.currentLevel = LEVELS[(this.level - 1) % LEVELS.length];
    this.renderElements();
    this.updateFlask();
    this.notifyChange();
  }

  private renderElements() {
    this.elementsZone.innerHTML = "";

    this.currentLevel.availableElements.forEach((symbol) => {
      const element = ELEMENTS[symbol];
      if (!element) return;

      // Create multiple copies of each element
      for (let i = 0; i < 4; i++) {
        const el = document.createElement("div");
        el.className = "element";
        el.dataset.symbol = symbol;
        el.dataset.type = element.type;
        el.draggable = true;

        el.innerHTML = `
          <span class="element-symbol">${element.symbol}</span>
          <span class="element-name">${element.name}</span>
        `;

        el.addEventListener("dragstart", (e) => this.handleDragStart(e, symbol));
        el.addEventListener("click", () => this.addToFlask(symbol));

        this.elementsZone.appendChild(el);
      }
    });
  }

  private handleDragStart(e: DragEvent, symbol: string) {
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", symbol);
    }
  }

  public setupDropZone(dropZone: HTMLElement) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      const symbol = e.dataTransfer?.getData("text/plain");
      if (symbol) {
        this.addToFlask(symbol);
      }
    });
  }

  public addToFlask(symbol: string) {
    if (this.status !== "playing") return;
    if (this.flaskElements.length >= 8) return;

    this.flaskElements.push(symbol);
    this.updateFlask();
    this.notifyChange();
  }

  private updateFlask() {
    this.flaskContent.innerHTML = "";

    this.flaskElements.forEach((symbol) => {
      const el = document.createElement("div");
      el.className = "flask-element";
      el.textContent = symbol;
      el.style.backgroundColor = ELEMENTS[symbol]?.color || "#fff";
      el.style.color = this.getContrastColor(ELEMENTS[symbol]?.color || "#fff");
      this.flaskContent.appendChild(el);
    });

    // Update liquid level
    const level = Math.min(this.flaskElements.length * 12, 80);
    this.flaskLiquid.style.height = `${level}%`;

    // Mix colors for liquid
    if (this.flaskElements.length > 0) {
      const colors = this.flaskElements.map((s) => ELEMENTS[s]?.color || "#3498db");
      this.flaskLiquid.style.background = this.mixColors(colors);
    }
  }

  private getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#2c3e50" : "#ffffff";
  }

  private mixColors(colors: string[]): string {
    let r = 0,
      g = 0,
      b = 0;
    colors.forEach((hex) => {
      r += parseInt(hex.slice(1, 3), 16);
      g += parseInt(hex.slice(3, 5), 16);
      b += parseInt(hex.slice(5, 7), 16);
    });
    r = Math.round(r / colors.length);
    g = Math.round(g / colors.length);
    b = Math.round(b / colors.length);
    return `linear-gradient(180deg, rgba(${r},${g},${b},0.6), rgba(${r},${g},${b},0.9))`;
  }

  public react(): string | null {
    if (this.status !== "playing") return null;

    // Sort flask elements to compare
    const sortedFlask = [...this.flaskElements].sort().join(",");

    // Find matching reaction
    const reaction = REACTIONS.find((r) => {
      const sortedInputs = [...r.inputs].sort().join(",");
      return sortedInputs === sortedFlask;
    });

    if (reaction) {
      // Check if it matches target
      if (reaction.output === this.currentLevel.targetCompound) {
        this.status = "won";
        this.notifyChange();
        return reaction.output;
      } else {
        // Wrong compound
        this.status = "failed";
        this.notifyChange();
        return reaction.output;
      }
    } else {
      // No valid reaction
      this.status = "failed";
      this.notifyChange();
      return null;
    }
  }

  public clearFlask() {
    this.flaskElements = [];
    this.updateFlask();
    this.notifyChange();
  }

  public reset() {
    this.start();
  }

  public nextLevel() {
    this.level++;
    this.start();
  }

  public getTargetCompound(): string {
    return this.currentLevel.targetCompound;
  }

  public setOnStateChange(cb: (s: any) => void) {
    this.onStateChange = cb;
  }

  private notifyChange() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.level,
        target: this.currentLevel.targetCompound,
        flaskCount: this.flaskElements.length,
        status: this.status,
      });
    }
  }
}
