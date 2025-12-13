interface Island {
  id: number;
  x: number;
  y: number;
  requiredBridges: number;
  currentBridges: number;
}

interface Bridge {
  from: number;
  to: number;
  count: number; // 1 or 2
}

interface LevelConfig {
  islands: { x: number; y: number; bridges: number }[];
  validConnections: [number, number][];
}

const LEVELS: LevelConfig[] = [
  {
    islands: [
      { x: 100, y: 100, bridges: 2 },
      { x: 300, y: 100, bridges: 2 },
      { x: 100, y: 300, bridges: 2 },
      { x: 300, y: 300, bridges: 2 },
    ],
    validConnections: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
  },
  {
    islands: [
      { x: 100, y: 100, bridges: 2 },
      { x: 300, y: 100, bridges: 3 },
      { x: 500, y: 100, bridges: 1 },
      { x: 100, y: 300, bridges: 2 },
      { x: 300, y: 300, bridges: 3 },
      { x: 500, y: 300, bridges: 1 },
    ],
    validConnections: [
      [0, 1],
      [1, 2],
      [0, 3],
      [1, 4],
      [2, 5],
      [3, 4],
      [4, 5],
    ],
  },
  {
    islands: [
      { x: 200, y: 80, bridges: 3 },
      { x: 400, y: 80, bridges: 2 },
      { x: 100, y: 200, bridges: 2 },
      { x: 300, y: 200, bridges: 4 },
      { x: 500, y: 200, bridges: 2 },
      { x: 200, y: 320, bridges: 3 },
      { x: 400, y: 320, bridges: 2 },
    ],
    validConnections: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 5],
      [3, 5],
      [3, 6],
      [4, 6],
      [5, 6],
    ],
  },
  {
    islands: [
      { x: 150, y: 60, bridges: 2 },
      { x: 350, y: 60, bridges: 3 },
      { x: 550, y: 60, bridges: 1 },
      { x: 80, y: 180, bridges: 3 },
      { x: 250, y: 180, bridges: 4 },
      { x: 450, y: 180, bridges: 3 },
      { x: 150, y: 320, bridges: 2 },
      { x: 350, y: 320, bridges: 4 },
      { x: 550, y: 320, bridges: 2 },
    ],
    validConnections: [
      [0, 1],
      [1, 2],
      [0, 3],
      [0, 4],
      [1, 4],
      [1, 5],
      [2, 5],
      [3, 4],
      [3, 6],
      [4, 5],
      [4, 7],
      [5, 8],
      [6, 7],
      [7, 8],
    ],
  },
];

export class IslandConnectGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  islands: Island[] = [];
  bridges: Bridge[] = [];
  validConnections: [number, number][] = [];

  selectedIsland: Island | null = null;
  totalBridges: number = 0;

  status: "playing" | "won" = "playing";
  waveOffset: number = 0;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.status = "playing";
    this.selectedIsland = null;
    this.initLevel();
    this.loop();

    if (this.onStateChange) {
      this.onStateChange({
        level: this.currentLevel + 1,
        bridges: this.totalBridges,
      });
    }
  }

  private initLevel() {
    const config = LEVELS[this.currentLevel];

    this.islands = config.islands.map((island, i) => ({
      id: i,
      x: island.x,
      y: island.y,
      requiredBridges: island.bridges,
      currentBridges: 0,
    }));

    this.validConnections = [...config.validConnections];
    this.bridges = [];
    this.totalBridges = 0;
  }

  public setLevel(level: number) {
    this.currentLevel = Math.min(level, LEVELS.length - 1);
  }

  public nextLevel(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      this.start();
      return true;
    }
    return false;
  }

  private loop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  private update() {
    this.waveOffset += 0.02;
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicked on an island
    for (const island of this.islands) {
      const dist = Math.sqrt((x - island.x) ** 2 + (y - island.y) ** 2);
      if (dist < 35) {
        if (this.selectedIsland === null) {
          this.selectedIsland = island;
        } else if (this.selectedIsland.id === island.id) {
          this.selectedIsland = null;
        } else {
          this.tryBuildBridge(this.selectedIsland, island);
          this.selectedIsland = null;
        }
        return;
      }
    }

    this.selectedIsland = null;
  }

  private tryBuildBridge(from: Island, to: Island) {
    // Check if connection is valid
    const isValid = this.validConnections.some(
      ([a, b]) =>
        (a === from.id && b === to.id) || (a === to.id && b === from.id)
    );

    if (!isValid) return;

    // Check if both islands can accept more bridges
    if (
      from.currentBridges >= from.requiredBridges &&
      to.currentBridges >= to.requiredBridges
    ) {
      // Remove bridges
      this.removeBridge(from, to);
      return;
    }

    // Find existing bridge
    const existingBridge = this.bridges.find(
      (b) =>
        (b.from === from.id && b.to === to.id) ||
        (b.from === to.id && b.to === from.id)
    );

    if (existingBridge) {
      if (existingBridge.count >= 2) {
        // Remove bridge
        this.removeBridge(from, to);
      } else {
        // Add second bridge
        existingBridge.count++;
        from.currentBridges++;
        to.currentBridges++;
        this.totalBridges++;
      }
    } else {
      // Create new bridge
      this.bridges.push({
        from: from.id,
        to: to.id,
        count: 1,
      });
      from.currentBridges++;
      to.currentBridges++;
      this.totalBridges++;
    }

    if (this.onStateChange) {
      this.onStateChange({ bridges: this.totalBridges });
    }

    this.checkWin();
  }

  private removeBridge(from: Island, to: Island) {
    const bridgeIndex = this.bridges.findIndex(
      (b) =>
        (b.from === from.id && b.to === to.id) ||
        (b.from === to.id && b.to === from.id)
    );

    if (bridgeIndex !== -1) {
      const bridge = this.bridges[bridgeIndex];
      from.currentBridges -= bridge.count;
      to.currentBridges -= bridge.count;
      this.totalBridges -= bridge.count;
      this.bridges.splice(bridgeIndex, 1);

      if (this.onStateChange) {
        this.onStateChange({ bridges: this.totalBridges });
      }
    }
  }

  private checkWin() {
    const allSatisfied = this.islands.every(
      (island) => island.currentBridges === island.requiredBridges
    );

    if (allSatisfied && this.isFullyConnected()) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          hasNextLevel: this.currentLevel < LEVELS.length - 1,
        });
      }
    }
  }

  private isFullyConnected(): boolean {
    if (this.islands.length === 0) return true;

    const visited = new Set<number>();
    const queue = [this.islands[0].id];
    visited.add(this.islands[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const bridge of this.bridges) {
        let neighbor = -1;
        if (bridge.from === current) neighbor = bridge.to;
        else if (bridge.to === current) neighbor = bridge.from;

        if (neighbor !== -1 && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return visited.size === this.islands.length;
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw ocean
    this.drawOcean();

    // Draw bridges
    for (const bridge of this.bridges) {
      this.drawBridge(bridge);
    }

    // Draw islands
    for (const island of this.islands) {
      this.drawIsland(island);
    }

    // Win effect
    if (this.status === "won") {
      this.ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private drawOcean() {
    const { width, height } = this.canvas;

    // Base ocean color
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#3498db");
    gradient.addColorStop(1, "#2980b9");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Waves
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
      this.ctx.beginPath();
      for (let x = 0; x < width; x += 10) {
        const y = height * (0.2 + i * 0.15) + Math.sin(x * 0.02 + this.waveOffset + i) * 10;
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
  }

  private drawBridge(bridge: Bridge) {
    const fromIsland = this.islands.find((i) => i.id === bridge.from)!;
    const toIsland = this.islands.find((i) => i.id === bridge.to)!;

    const dx = toIsland.x - fromIsland.x;
    const dy = toIsland.y - fromIsland.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    // Perpendicular vector for double bridge offset
    const px = -ny;
    const py = nx;

    const startX = fromIsland.x + nx * 35;
    const startY = fromIsland.y + ny * 35;
    const endX = toIsland.x - nx * 35;
    const endY = toIsland.y - ny * 35;

    this.ctx.strokeStyle = "#8b4513";
    this.ctx.lineWidth = 8;

    if (bridge.count === 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();

      // Planks
      this.drawPlanks(startX, startY, endX, endY, 0, 0);
    } else {
      // Double bridge
      const offset = 8;

      this.ctx.beginPath();
      this.ctx.moveTo(startX + px * offset, startY + py * offset);
      this.ctx.lineTo(endX + px * offset, endY + py * offset);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(startX - px * offset, startY - py * offset);
      this.ctx.lineTo(endX - px * offset, endY - py * offset);
      this.ctx.stroke();

      this.drawPlanks(startX, startY, endX, endY, px * offset, py * offset);
      this.drawPlanks(startX, startY, endX, endY, -px * offset, -py * offset);
    }
  }

  private drawPlanks(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    offsetX: number,
    offsetY: number
  ) {
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    const px = -ny;
    const py = nx;

    this.ctx.strokeStyle = "#d4a76a";
    this.ctx.lineWidth = 4;

    const plankCount = Math.floor(dist / 20);
    for (let i = 1; i < plankCount; i++) {
      const t = i / plankCount;
      const x = startX + offsetX + dx * t;
      const y = startY + offsetY + dy * t;

      this.ctx.beginPath();
      this.ctx.moveTo(x - px * 6, y - py * 6);
      this.ctx.lineTo(x + px * 6, y + py * 6);
      this.ctx.stroke();
    }
  }

  private drawIsland(island: Island) {
    const { x, y, requiredBridges, currentBridges } = island;
    const isSelected = this.selectedIsland?.id === island.id;
    const isSatisfied = currentBridges === requiredBridges;

    // Island shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.beginPath();
    this.ctx.ellipse(x + 3, y + 3, 35, 30, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Island base
    const islandGradient = this.ctx.createRadialGradient(x - 10, y - 10, 0, x, y, 40);
    if (isSatisfied) {
      islandGradient.addColorStop(0, "#27ae60");
      islandGradient.addColorStop(1, "#1e8449");
    } else if (isSelected) {
      islandGradient.addColorStop(0, "#f39c12");
      islandGradient.addColorStop(1, "#d68910");
    } else {
      islandGradient.addColorStop(0, "#2ecc71");
      islandGradient.addColorStop(1, "#27ae60");
    }

    this.ctx.fillStyle = islandGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 35, 30, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Beach
    this.ctx.strokeStyle = "#f4d03f";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 35, 30, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    // Palm tree
    this.ctx.fillStyle = "#8b4513";
    this.ctx.fillRect(x - 3, y - 25, 6, 20);

    this.ctx.fillStyle = "#27ae60";
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      this.ctx.beginPath();
      this.ctx.ellipse(
        x + Math.cos(angle) * 12,
        y - 25 + Math.sin(angle) * 8,
        12,
        5,
        angle,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    // Bridge count
    this.ctx.fillStyle = "white";
    this.ctx.strokeStyle = "#2c3e50";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y + 10, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = isSatisfied ? "#27ae60" : "#2c3e50";
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(`${currentBridges}/${requiredBridges}`, x, y + 10);
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(rect.width, 600);
      this.canvas.height = 400;
    }
  }

  public reset() {
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels() {
    return LEVELS.length;
  }
}
