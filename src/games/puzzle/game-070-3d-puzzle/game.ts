/**
 * 3D Puzzle Game
 * Game #070 - Assemble 3D blocks using CSS 3D transforms
 */

export interface Block3D {
  id: number;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  color: string;
  shape: number[][]; // 2D array representing block shape from top view
  targetX: number;
  targetY: number;
  targetZ: number;
  targetRotX: number;
  targetRotY: number;
  targetRotZ: number;
  placed: boolean;
}

export interface Level {
  id: number;
  blocks: Block3D[];
  gridSize: number;
}

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

const LEVELS: Level[] = [
  // Level 1: Two simple blocks
  {
    id: 1,
    gridSize: 4,
    blocks: [
      {
        id: 0, x: -150, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0,
        color: COLORS[0], shape: [[1, 1]],
        targetX: 0, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 1, x: 150, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0,
        color: COLORS[1], shape: [[1, 1]],
        targetX: 60, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
    ],
  },
  // Level 2: L-shape and square
  {
    id: 2,
    gridSize: 4,
    blocks: [
      {
        id: 0, x: -150, y: 0, z: 0, rotX: 0, rotY: 45, rotZ: 0,
        color: COLORS[2], shape: [[1, 0], [1, 1]],
        targetX: 0, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 1, x: 150, y: 0, z: 0, rotX: 0, rotY: -30, rotZ: 0,
        color: COLORS[3], shape: [[1]],
        targetX: 30, targetY: -30, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
    ],
  },
  // Level 3: Three blocks
  {
    id: 3,
    gridSize: 4,
    blocks: [
      {
        id: 0, x: -180, y: 30, z: 0, rotX: 30, rotY: 20, rotZ: 0,
        color: COLORS[0], shape: [[1, 1, 1]],
        targetX: 0, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 1, x: 0, y: -80, z: 0, rotX: -20, rotY: 45, rotZ: 0,
        color: COLORS[1], shape: [[1], [1]],
        targetX: -30, targetY: 30, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 2, x: 180, y: 30, z: 0, rotX: 15, rotY: -35, rotZ: 0,
        color: COLORS[4], shape: [[1]],
        targetX: 60, targetY: 30, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
    ],
  },
  // Level 4: Tetris-like shapes
  {
    id: 4,
    gridSize: 5,
    blocks: [
      {
        id: 0, x: -180, y: -50, z: 0, rotX: 40, rotY: 30, rotZ: 0,
        color: COLORS[0], shape: [[1, 1], [1, 0]],
        targetX: -30, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 1, x: 0, y: 80, z: 0, rotX: -30, rotY: 60, rotZ: 0,
        color: COLORS[2], shape: [[0, 1], [1, 1]],
        targetX: 30, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 2, x: 180, y: -50, z: 0, rotX: 20, rotY: -45, rotZ: 0,
        color: COLORS[5], shape: [[1, 1]],
        targetX: 0, targetY: 60, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
    ],
  },
  // Level 5: Complex assembly
  {
    id: 5,
    gridSize: 5,
    blocks: [
      {
        id: 0, x: -200, y: -60, z: 20, rotX: 45, rotY: 30, rotZ: 15,
        color: COLORS[0], shape: [[1, 1, 0], [0, 1, 1]],
        targetX: 0, targetY: 0, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 1, x: 0, y: 100, z: -20, rotX: -35, rotY: 60, rotZ: -10,
        color: COLORS[1], shape: [[1], [1], [1]],
        targetX: -60, targetY: 30, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 2, x: 200, y: -60, z: 20, rotX: 25, rotY: -50, rotZ: 20,
        color: COLORS[3], shape: [[1, 1]],
        targetX: 60, targetY: -30, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
      {
        id: 3, x: 0, y: -100, z: 0, rotX: -45, rotY: 20, rotZ: -25,
        color: COLORS[4], shape: [[1]],
        targetX: 60, targetY: 30, targetZ: 0, targetRotX: 0, targetRotY: 0, targetRotZ: 0, placed: false
      },
    ],
  },
];

export class Puzzle3DGame {
  container: HTMLElement;
  currentLevel: number = 0;
  blocks: Block3D[] = [];
  selectedBlock: Block3D | null = null;

  sceneRotX: number = 20;
  sceneRotY: number = -30;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private isDragging: boolean = false;
  private isRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public start() {
    this.loadLevel(this.currentLevel);
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({ status: "complete", level: levelIndex + 1, pieces: 0 });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.blocks = level.blocks.map(b => ({ ...b, placed: false }));
    this.selectedBlock = null;
    this.status = "playing";

    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        pieces: this.blocks.filter(b => !b.placed).length,
      });
    }
  }

  public render() {
    // Clear container
    this.container.innerHTML = "";

    // Create scene
    const scene = document.createElement("div");
    scene.className = "puzzle-scene";
    scene.style.transform = `rotateX(${this.sceneRotX}deg) rotateY(${this.sceneRotY}deg)`;

    // Create target area
    const targetArea = document.createElement("div");
    targetArea.className = "target-area";
    scene.appendChild(targetArea);

    // Create blocks
    this.blocks.forEach(block => {
      const blockEl = this.createBlockElement(block);
      scene.appendChild(blockEl);
    });

    this.container.appendChild(scene);
    this.setupEventListeners();
  }

  private createBlockElement(block: Block3D): HTMLElement {
    const blockEl = document.createElement("div");
    blockEl.className = `puzzle-block ${block.placed ? "placed" : ""} ${this.selectedBlock?.id === block.id ? "selected" : ""}`;
    blockEl.dataset.blockId = block.id.toString();

    const x = block.placed ? block.targetX : block.x;
    const y = block.placed ? block.targetY : block.y;
    const z = block.placed ? block.targetZ : block.z;
    const rotX = block.placed ? block.targetRotX : block.rotX;
    const rotY = block.placed ? block.targetRotY : block.rotY;
    const rotZ = block.placed ? block.targetRotZ : block.rotZ;

    blockEl.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;

    // Create cube faces for each cell in shape
    const cellSize = 30;
    block.shape.forEach((row, ry) => {
      row.forEach((cell, rx) => {
        if (cell === 1) {
          const cube = this.createCube(rx * cellSize, ry * cellSize, block.color, cellSize);
          blockEl.appendChild(cube);
        }
      });
    });

    return blockEl;
  }

  private createCube(offsetX: number, offsetY: number, color: string, size: number): HTMLElement {
    const cube = document.createElement("div");
    cube.className = "cube";
    cube.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;

    const faces = ["front", "back", "right", "left", "top", "bottom"];
    faces.forEach(face => {
      const faceEl = document.createElement("div");
      faceEl.className = `cube-face ${face}`;
      faceEl.style.width = `${size}px`;
      faceEl.style.height = `${size}px`;
      faceEl.style.backgroundColor = color;

      // Position faces
      const half = size / 2;
      switch (face) {
        case "front":
          faceEl.style.transform = `translateZ(${half}px)`;
          break;
        case "back":
          faceEl.style.transform = `translateZ(-${half}px) rotateY(180deg)`;
          break;
        case "right":
          faceEl.style.transform = `translateX(${half}px) rotateY(90deg)`;
          break;
        case "left":
          faceEl.style.transform = `translateX(-${half}px) rotateY(-90deg)`;
          break;
        case "top":
          faceEl.style.transform = `translateY(-${half}px) rotateX(90deg)`;
          break;
        case "bottom":
          faceEl.style.transform = `translateY(${half}px) rotateX(-90deg)`;
          break;
      }

      cube.appendChild(faceEl);
    });

    return cube;
  }

  private setupEventListeners() {
    const blocks = this.container.querySelectorAll(".puzzle-block");
    blocks.forEach(blockEl => {
      blockEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt((blockEl as HTMLElement).dataset.blockId || "0");
        this.selectBlock(id);
      });

      blockEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const id = parseInt((blockEl as HTMLElement).dataset.blockId || "0");
        this.rotateBlock(id);
      });
    });

    // Scene rotation
    this.container.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).classList.contains("puzzle-scene") ||
          (e.target as HTMLElement).classList.contains("target-area") ||
          this.container === e.target) {
        this.isRotating = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isRotating) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.sceneRotY += dx * 0.5;
        this.sceneRotX -= dy * 0.5;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateSceneRotation();
      }
    });

    document.addEventListener("mouseup", () => {
      this.isRotating = false;
    });
  }

  private updateSceneRotation() {
    const scene = this.container.querySelector(".puzzle-scene") as HTMLElement;
    if (scene) {
      scene.style.transform = `rotateX(${this.sceneRotX}deg) rotateY(${this.sceneRotY}deg)`;
    }
  }

  private selectBlock(id: number) {
    const block = this.blocks.find(b => b.id === id);
    if (!block || block.placed) return;

    if (this.selectedBlock?.id === id) {
      // Place block
      this.placeBlock(block);
    } else {
      this.selectedBlock = block;
      this.render();
    }
  }

  private rotateBlock(id: number) {
    const block = this.blocks.find(b => b.id === id);
    if (!block || block.placed) return;

    block.rotY += 90;
    this.render();
  }

  private placeBlock(block: Block3D) {
    // Animate to target position
    block.placed = true;
    this.selectedBlock = null;
    this.render();

    // Check win
    const allPlaced = this.blocks.every(b => b.placed);
    if (allPlaced) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          pieces: 0,
        });
      }
    } else {
      if (this.onStateChange) {
        this.onStateChange({
          status: "playing",
          level: this.currentLevel + 1,
          pieces: this.blocks.filter(b => !b.placed).length,
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

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
