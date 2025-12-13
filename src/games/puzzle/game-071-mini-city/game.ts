/**
 * Mini City Game
 * Game #071 - Place buildings to create a thriving city
 */

export type BuildingType = "empty" | "house" | "shop" | "park" | "factory" | "water" | "mountain";

export interface Cell {
  type: BuildingType;
  population: number;
}

export interface Building {
  type: BuildingType;
  basePopulation: number;
  color: string;
  emoji: string;
}

export interface Level {
  id: number;
  gridSize: number;
  targetPopulation: number;
  availableBuildings: BuildingType[];
  obstacles: { x: number; y: number; type: BuildingType }[];
  maxBuildings: { [key: string]: number };
}

const BUILDINGS: { [key: string]: Building } = {
  house: { type: "house", basePopulation: 10, color: "#e74c3c", emoji: "🏠" },
  shop: { type: "shop", basePopulation: 5, color: "#3498db", emoji: "🏪" },
  park: { type: "park", basePopulation: 0, color: "#2ecc71", emoji: "🌳" },
  factory: { type: "factory", basePopulation: 15, color: "#95a5a6", emoji: "🏭" },
  water: { type: "water", basePopulation: 0, color: "#5dade2", emoji: "💧" },
  mountain: { type: "mountain", basePopulation: 0, color: "#7f8c8d", emoji: "⛰️" },
};

const LEVELS: Level[] = [
  {
    id: 1,
    gridSize: 4,
    targetPopulation: 50,
    availableBuildings: ["house", "park"],
    obstacles: [],
    maxBuildings: { house: 6, park: 2 },
  },
  {
    id: 2,
    gridSize: 4,
    targetPopulation: 80,
    availableBuildings: ["house", "shop", "park"],
    obstacles: [{ x: 0, y: 0, type: "water" }],
    maxBuildings: { house: 5, shop: 3, park: 2 },
  },
  {
    id: 3,
    gridSize: 5,
    targetPopulation: 120,
    availableBuildings: ["house", "shop", "park", "factory"],
    obstacles: [
      { x: 2, y: 2, type: "water" },
      { x: 0, y: 4, type: "mountain" },
    ],
    maxBuildings: { house: 6, shop: 3, park: 3, factory: 2 },
  },
  {
    id: 4,
    gridSize: 5,
    targetPopulation: 150,
    availableBuildings: ["house", "shop", "park", "factory"],
    obstacles: [
      { x: 1, y: 1, type: "water" },
      { x: 3, y: 3, type: "water" },
      { x: 4, y: 0, type: "mountain" },
    ],
    maxBuildings: { house: 7, shop: 4, park: 3, factory: 2 },
  },
  {
    id: 5,
    gridSize: 6,
    targetPopulation: 200,
    availableBuildings: ["house", "shop", "park", "factory"],
    obstacles: [
      { x: 2, y: 2, type: "water" },
      { x: 2, y: 3, type: "water" },
      { x: 0, y: 5, type: "mountain" },
      { x: 5, y: 0, type: "mountain" },
    ],
    maxBuildings: { house: 10, shop: 5, park: 4, factory: 3 },
  },
];

export class MiniCityGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  grid: Cell[][] = [];
  gridSize: number = 4;
  cellSize: number = 70;

  selectedBuilding: BuildingType = "house";
  buildingCounts: { [key: string]: number } = {};
  population: number = 0;
  targetPopulation: number = 0;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({ status: "complete", level: levelIndex + 1, population: this.population });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.gridSize = level.gridSize;
    this.targetPopulation = level.targetPopulation;
    this.buildingCounts = {};
    level.availableBuildings.forEach(b => {
      this.buildingCounts[b] = 0;
    });

    // Initialize grid
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = { type: "empty", population: 0 };
      }
    }

    // Place obstacles
    level.obstacles.forEach(obs => {
      if (this.grid[obs.y] && this.grid[obs.y][obs.x]) {
        this.grid[obs.y][obs.x] = { type: obs.type, population: 0 };
      }
    });

    this.selectedBuilding = level.availableBuildings[0] || "house";
    this.status = "playing";
    this.calculatePopulation();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        population: this.population,
        target: this.targetPopulation,
        buildings: this.buildingCounts,
        maxBuildings: level.maxBuildings,
        selected: this.selectedBuilding,
      });
    }
  }

  private loop = () => {
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private calculatePopulation() {
    this.population = 0;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        if (cell.type === "empty" || cell.type === "water" || cell.type === "mountain") {
          cell.population = 0;
          continue;
        }

        let pop = BUILDINGS[cell.type]?.basePopulation || 0;

        // Bonus calculations
        const neighbors = this.getNeighbors(x, y);

        if (cell.type === "house") {
          // Houses get bonus from parks
          const parkCount = neighbors.filter(n => n.type === "park").length;
          pop += parkCount * 5;
          // Houses get penalty from factories
          const factoryCount = neighbors.filter(n => n.type === "factory").length;
          pop -= factoryCount * 3;
          // Houses get bonus from shops
          const shopCount = neighbors.filter(n => n.type === "shop").length;
          pop += shopCount * 2;
        } else if (cell.type === "shop") {
          // Shops get bonus from houses
          const houseCount = neighbors.filter(n => n.type === "house").length;
          pop += houseCount * 3;
        } else if (cell.type === "factory") {
          // Factories get penalty if near water
          const waterCount = neighbors.filter(n => n.type === "water").length;
          if (waterCount > 0) pop -= 5;
        }

        cell.population = Math.max(0, pop);
        this.population += cell.population;
      }
    }
  }

  private getNeighbors(x: number, y: number): Cell[] {
    const neighbors: Cell[] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    dirs.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
        neighbors.push(this.grid[ny][nx]);
      }
    });
    return neighbors;
  }

  private draw() {
    const ctx = this.ctx;
    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    // Clear
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const px = offsetX + x * this.cellSize;
        const py = offsetY + y * this.cellSize;

        // Isometric-style offset
        const isoX = px;
        const isoY = py;

        // Cell background
        if (cell.type === "empty") {
          ctx.fillStyle = "#90ee90";
        } else if (cell.type === "water") {
          ctx.fillStyle = "#5dade2";
        } else if (cell.type === "mountain") {
          ctx.fillStyle = "#7f8c8d";
        } else {
          ctx.fillStyle = BUILDINGS[cell.type]?.color || "#ccc";
        }

        ctx.fillRect(isoX + 2, isoY + 2, this.cellSize - 4, this.cellSize - 4);

        // Draw building
        if (cell.type !== "empty") {
          ctx.font = `${this.cellSize * 0.5}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            BUILDINGS[cell.type]?.emoji || "?",
            isoX + this.cellSize / 2,
            isoY + this.cellSize / 2
          );

          // Population number
          if (cell.population > 0) {
            ctx.font = "bold 12px Arial";
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.strokeText(`+${cell.population}`, isoX + this.cellSize / 2, isoY + this.cellSize - 10);
            ctx.fillText(`+${cell.population}`, isoX + this.cellSize / 2, isoY + this.cellSize - 10);
          }
        }

        // Grid border
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(isoX + 2, isoY + 2, this.cellSize - 4, this.cellSize - 4);
      }
    }

    // Population progress bar
    const barWidth = this.canvas.width - 40;
    const barHeight = 20;
    const barX = 20;
    const barY = 10;

    ctx.fillStyle = "#ddd";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const progress = Math.min(1, this.population / this.targetPopulation);
    ctx.fillStyle = progress >= 1 ? "#27ae60" : "#3498db";
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#333";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${this.population} / ${this.targetPopulation}`,
      this.canvas.width / 2,
      barY + barHeight / 2 + 4
    );
  }

  public handleClick(canvasX: number, canvasY: number) {
    if (this.status !== "playing") return;

    const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

    const gx = Math.floor((canvasX - offsetX) / this.cellSize);
    const gy = Math.floor((canvasY - offsetY) / this.cellSize);

    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) return;

    const cell = this.grid[gy][gx];
    if (cell.type === "water" || cell.type === "mountain") return;

    const level = LEVELS[this.currentLevel];

    // Toggle building
    if (cell.type === "empty") {
      // Check if we can place this building
      const max = level.maxBuildings[this.selectedBuilding] || 0;
      if (this.buildingCounts[this.selectedBuilding] >= max) return;

      cell.type = this.selectedBuilding;
      this.buildingCounts[this.selectedBuilding]++;
    } else if (cell.type === this.selectedBuilding) {
      // Remove building
      this.buildingCounts[cell.type]--;
      cell.type = "empty";
    }

    this.calculatePopulation();
    this.checkWin();

    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        level: this.currentLevel + 1,
        population: this.population,
        target: this.targetPopulation,
        buildings: this.buildingCounts,
        maxBuildings: level.maxBuildings,
        selected: this.selectedBuilding,
      });
    }
  }

  public selectBuilding(type: BuildingType) {
    const level = LEVELS[this.currentLevel];
    if (level.availableBuildings.includes(type)) {
      this.selectedBuilding = type;
      if (this.onStateChange) {
        this.onStateChange({
          status: this.status,
          level: this.currentLevel + 1,
          population: this.population,
          target: this.targetPopulation,
          buildings: this.buildingCounts,
          maxBuildings: level.maxBuildings,
          selected: this.selectedBuilding,
        });
      }
    }
  }

  private checkWin() {
    if (this.population >= this.targetPopulation) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          population: this.population,
        });
      }
    }
  }

  public nextLevel() {
    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  public reset() {
    this.loadLevel(this.currentLevel);
  }

  public restart() {
    this.currentLevel = 0;
    this.loadLevel(0);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width);
      this.canvas.height = 450;
      this.cellSize = Math.min(70, (this.canvas.width - 40) / this.gridSize);
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }

  public getAvailableBuildings(): BuildingType[] {
    return LEVELS[this.currentLevel]?.availableBuildings || [];
  }

  public getBuildingInfo(type: BuildingType): Building | undefined {
    return BUILDINGS[type];
  }
}
