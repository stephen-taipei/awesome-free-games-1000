/**
 * Tube Sort Game Engine
 * Game #084 - Sort colored liquids in test tubes (with visual liquid effects)
 */

type Color = string;

interface Tube {
  liquids: { color: Color; amount: number }[];
  capacity: number;
  x: number;
  y: number;
  tiltAngle: number; // For pour animation
}

interface GameState {
  tubes: { liquids: { color: Color; amount: number }[]; capacity: number }[];
}

interface Level {
  colors: number;
  tubeCount: number;
  emptyTubes: number;
  unitsPerColor: number;
}

const COLORS: Color[] = [
  "#e74c3c", // Red
  "#3498db", // Blue
  "#2ecc71", // Green
  "#f1c40f", // Yellow
  "#9b59b6", // Purple
  "#e67e22", // Orange
  "#1abc9c", // Teal
  "#e91e63", // Pink
];

const LEVELS: Level[] = [
  { colors: 3, tubeCount: 3, emptyTubes: 1, unitsPerColor: 4 },
  { colors: 4, tubeCount: 4, emptyTubes: 1, unitsPerColor: 4 },
  { colors: 5, tubeCount: 5, emptyTubes: 2, unitsPerColor: 4 },
  { colors: 6, tubeCount: 6, emptyTubes: 2, unitsPerColor: 4 },
  { colors: 7, tubeCount: 7, emptyTubes: 2, unitsPerColor: 4 },
];

export class TubeSortGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  tubes: Tube[] = [];
  selectedTubeIndex: number = -1;
  moves: number = 0;
  currentLevel: number = 0;
  status: "playing" | "won" = "playing";

  history: GameState[] = [];

  // Animation
  isPouring: boolean = false;
  pourProgress: number = 0;
  pourFrom: number = -1;
  pourTo: number = -1;

  tubeWidth: number = 50;
  tubeHeight: number = 180;
  tubeSpacing: number = 20;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.loop();
  }

  public loadLevel(levelIndex: number) {
    const level = LEVELS[levelIndex] || LEVELS[0];
    this.tubes = [];
    this.selectedTubeIndex = -1;
    this.moves = 0;
    this.status = "playing";
    this.history = [];
    this.isPouring = false;

    // Create liquid units
    const allLiquids: Color[] = [];
    for (let c = 0; c < level.colors; c++) {
      for (let u = 0; u < level.unitsPerColor; u++) {
        allLiquids.push(COLORS[c]);
      }
    }

    // Shuffle
    for (let i = allLiquids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLiquids[i], allLiquids[j]] = [allLiquids[j], allLiquids[i]];
    }

    // Fill tubes
    const totalTubes = level.tubeCount + level.emptyTubes;
    const startX = (this.canvas.width - totalTubes * (this.tubeWidth + this.tubeSpacing)) / 2;

    let liquidIndex = 0;
    for (let t = 0; t < level.tubeCount; t++) {
      const tube: Tube = {
        liquids: [],
        capacity: level.unitsPerColor,
        x: startX + t * (this.tubeWidth + this.tubeSpacing),
        y: 100,
        tiltAngle: 0,
      };

      // Add liquids as merged units
      for (let u = 0; u < level.unitsPerColor; u++) {
        const color = allLiquids[liquidIndex++];
        const lastLiquid = tube.liquids[tube.liquids.length - 1];
        if (lastLiquid && lastLiquid.color === color) {
          lastLiquid.amount++;
        } else {
          tube.liquids.push({ color, amount: 1 });
        }
      }

      this.tubes.push(tube);
    }

    // Add empty tubes
    for (let e = 0; e < level.emptyTubes; e++) {
      this.tubes.push({
        liquids: [],
        capacity: level.unitsPerColor,
        x: startX + (level.tubeCount + e) * (this.tubeWidth + this.tubeSpacing),
        y: 100,
        tiltAngle: 0,
      });
    }

    this.notifyState();
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    // Update pour animation
    if (this.isPouring) {
      this.pourProgress += 0.05;
      if (this.pourProgress >= 1) {
        this.completePour();
      }
    }
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing" || this.isPouring) return;

    // Find clicked tube
    const clickedIndex = this.tubes.findIndex((tube) => {
      return (
        x >= tube.x &&
        x <= tube.x + this.tubeWidth &&
        y >= tube.y &&
        y <= tube.y + this.tubeHeight
      );
    });

    if (clickedIndex === -1) {
      this.selectedTubeIndex = -1;
      return;
    }

    if (this.selectedTubeIndex === -1) {
      // Select tube if it has liquid
      const totalLiquid = this.getTubeTotal(this.tubes[clickedIndex]);
      if (totalLiquid > 0) {
        this.selectedTubeIndex = clickedIndex;
      }
    } else if (this.selectedTubeIndex === clickedIndex) {
      // Deselect
      this.selectedTubeIndex = -1;
    } else {
      // Try to pour
      if (this.canPour(this.selectedTubeIndex, clickedIndex)) {
        this.startPour(this.selectedTubeIndex, clickedIndex);
      }
      this.selectedTubeIndex = -1;
    }

    this.notifyState();
  }

  private getTubeTotal(tube: Tube): number {
    return tube.liquids.reduce((sum, l) => sum + l.amount, 0);
  }

  private getTopLiquid(tube: Tube): { color: Color; amount: number } | null {
    return tube.liquids.length > 0 ? tube.liquids[tube.liquids.length - 1] : null;
  }

  private canPour(fromIndex: number, toIndex: number): boolean {
    const fromTube = this.tubes[fromIndex];
    const toTube = this.tubes[toIndex];

    const fromTop = this.getTopLiquid(fromTube);
    if (!fromTop) return false;

    const toTotal = this.getTubeTotal(toTube);
    if (toTotal >= toTube.capacity) return false;

    const toTop = this.getTopLiquid(toTube);
    if (toTop && toTop.color !== fromTop.color) return false;

    return true;
  }

  private startPour(fromIndex: number, toIndex: number) {
    this.saveState();
    this.isPouring = true;
    this.pourProgress = 0;
    this.pourFrom = fromIndex;
    this.pourTo = toIndex;
  }

  private completePour() {
    const fromTube = this.tubes[this.pourFrom];
    const toTube = this.tubes[this.pourTo];

    const fromTop = this.getTopLiquid(fromTube);
    if (!fromTop) {
      this.isPouring = false;
      return;
    }

    const toTotal = this.getTubeTotal(toTube);
    const spaceAvailable = toTube.capacity - toTotal;
    const amountToPour = Math.min(fromTop.amount, spaceAvailable);

    // Remove from source
    fromTop.amount -= amountToPour;
    if (fromTop.amount === 0) {
      fromTube.liquids.pop();
    }

    // Add to destination
    const toTop = this.getTopLiquid(toTube);
    if (toTop && toTop.color === fromTop.color) {
      toTop.amount += amountToPour;
    } else {
      toTube.liquids.push({ color: fromTop.color, amount: amountToPour });
    }

    this.moves++;
    this.isPouring = false;
    this.pourFrom = -1;
    this.pourTo = -1;

    this.checkWin();
    this.notifyState();
  }

  private saveState() {
    const state: GameState = {
      tubes: this.tubes.map((t) => ({
        liquids: t.liquids.map((l) => ({ ...l })),
        capacity: t.capacity,
      })),
    };
    this.history.push(state);
  }

  public undo() {
    if (this.history.length === 0 || this.isPouring) return;

    const prevState = this.history.pop()!;
    this.tubes.forEach((tube, i) => {
      tube.liquids = prevState.tubes[i].liquids;
    });
    this.moves = Math.max(0, this.moves - 1);
    this.selectedTubeIndex = -1;

    this.notifyState();
  }

  private checkWin() {
    const won = this.tubes.every((tube) => {
      const total = this.getTubeTotal(tube);
      if (total === 0) return true;
      if (total !== tube.capacity) return false;
      return tube.liquids.length === 1;
    });

    if (won) {
      this.status = "won";
      this.notifyState();
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#dfe6e9");
    gradient.addColorStop(1, "#b2bec3");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tubes
    this.tubes.forEach((tube, index) => {
      this.drawTube(tube, index);
    });

    // Draw pouring animation
    if (this.isPouring) {
      this.drawPouringEffect();
    }
  }

  private drawTube(tube: Tube, index: number) {
    const { x, y } = tube;
    const isSelected = index === this.selectedTubeIndex;
    const offsetY = isSelected ? -15 : 0;

    // Tube glass
    this.ctx.save();

    // Glass body
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y + offsetY);
    this.ctx.lineTo(x, y + this.tubeHeight - 15 + offsetY);
    this.ctx.quadraticCurveTo(x, y + this.tubeHeight + offsetY, x + 15, y + this.tubeHeight + offsetY);
    this.ctx.lineTo(x + this.tubeWidth - 15, y + this.tubeHeight + offsetY);
    this.ctx.quadraticCurveTo(x + this.tubeWidth, y + this.tubeHeight + offsetY, x + this.tubeWidth, y + this.tubeHeight - 15 + offsetY);
    this.ctx.lineTo(x + this.tubeWidth, y + offsetY);
    this.ctx.stroke();

    // Draw liquids
    const unitHeight = (this.tubeHeight - 20) / tube.capacity;
    let currentY = y + this.tubeHeight - 5 + offsetY;

    tube.liquids.forEach((liquid) => {
      const liquidHeight = unitHeight * liquid.amount;

      // Liquid gradient
      const liquidGradient = this.ctx.createLinearGradient(x, currentY - liquidHeight, x + this.tubeWidth, currentY);
      liquidGradient.addColorStop(0, liquid.color);
      liquidGradient.addColorStop(0.5, this.lightenColor(liquid.color, 20));
      liquidGradient.addColorStop(1, liquid.color);

      this.ctx.fillStyle = liquidGradient;
      this.ctx.beginPath();
      this.ctx.moveTo(x + 5, currentY);
      this.ctx.lineTo(x + 5, currentY - liquidHeight);
      this.ctx.lineTo(x + this.tubeWidth - 5, currentY - liquidHeight);
      this.ctx.lineTo(x + this.tubeWidth - 5, currentY);
      this.ctx.closePath();
      this.ctx.fill();

      // Liquid surface highlight
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.fillRect(x + 5, currentY - liquidHeight, this.tubeWidth - 10, 3);

      currentY -= liquidHeight;
    });

    // Selection indicator
    if (isSelected) {
      this.ctx.strokeStyle = "#0984e3";
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(x - 5, y + offsetY - 5, this.tubeWidth + 10, this.tubeHeight + 15);
      this.ctx.setLineDash([]);
    }

    this.ctx.restore();
  }

  private drawPouringEffect() {
    if (this.pourFrom === -1 || this.pourTo === -1) return;

    const fromTube = this.tubes[this.pourFrom];
    const toTube = this.tubes[this.pourTo];
    const fromTop = this.getTopLiquid(fromTube);

    if (!fromTop) return;

    // Draw pouring stream
    const startX = fromTube.x + this.tubeWidth / 2;
    const startY = fromTube.y - 15;
    const endX = toTube.x + this.tubeWidth / 2;
    const endY = toTube.y + 10;

    const progress = this.pourProgress;
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    // Stream
    this.ctx.strokeStyle = fromTop.color;
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.quadraticCurveTo(
      (startX + endX) / 2,
      Math.min(startY, endY) - 30,
      currentX,
      currentY
    );
    this.ctx.stroke();

    // Drops
    for (let i = 0; i < 3; i++) {
      const dropProgress = (progress + i * 0.1) % 1;
      const dropX = startX + (endX - startX) * dropProgress + Math.sin(dropProgress * 10) * 5;
      const dropY = startY + (endY - startY) * dropProgress;

      this.ctx.fillStyle = fromTop.color;
      this.ctx.beginPath();
      this.ctx.arc(dropX, dropY, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  public nextLevel() {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.loop();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 400;

      // Recalculate tube positions
      const totalTubes = this.tubes.length;
      const startX = (this.canvas.width - totalTubes * (this.tubeWidth + this.tubeSpacing)) / 2;
      this.tubes.forEach((tube, i) => {
        tube.x = startX + i * (this.tubeWidth + this.tubeSpacing);
      });
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    if (this.status !== "playing") {
      this.status = "playing";
      this.loop();
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        maxLevel: LEVELS.length,
        moves: this.moves,
        status: this.status,
        canUndo: this.history.length > 0,
      });
    }
  }
}
