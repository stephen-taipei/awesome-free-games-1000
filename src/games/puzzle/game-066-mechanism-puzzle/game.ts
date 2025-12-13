/**
 * Mechanism Puzzle Game
 * Game #066 - Trigger mechanisms to open the door
 */

export type MechanismType =
  | "lever"      // 拉桿
  | "button"     // 按鈕
  | "gear"       // 齒輪
  | "pulley"     // 滑輪
  | "weight"     // 重錘
  | "platform"   // 平台
  | "door"       // 大門
  | "rope"       // 繩索
  | "spring";    // 彈簧

export interface Mechanism {
  id: number;
  type: MechanismType;
  x: number;
  y: number;
  width: number;
  height: number;
  state: number; // 0-1 for animation progress
  active: boolean;
  rotation: number;
  connectedTo: number[]; // IDs of connected mechanisms
  delay: number; // Activation delay in ms
}

export interface Level {
  id: number;
  mechanisms: Mechanism[];
  targetMoves: number;
}

const LEVELS: Level[] = [
  // Level 1: Simple lever and door
  {
    id: 1,
    targetMoves: 1,
    mechanisms: [
      { id: 0, type: "lever", x: 100, y: 250, width: 60, height: 20, state: 0, active: false, rotation: 0, connectedTo: [1], delay: 0 },
      { id: 1, type: "door", x: 480, y: 150, width: 40, height: 120, state: 0, active: false, rotation: 0, connectedTo: [], delay: 300 },
    ],
  },
  // Level 2: Button chain
  {
    id: 2,
    targetMoves: 2,
    mechanisms: [
      { id: 0, type: "button", x: 80, y: 280, width: 40, height: 40, state: 0, active: false, rotation: 0, connectedTo: [1], delay: 0 },
      { id: 1, type: "gear", x: 200, y: 200, width: 60, height: 60, state: 0, active: false, rotation: 0, connectedTo: [2], delay: 200 },
      { id: 2, type: "pulley", x: 350, y: 100, width: 50, height: 50, state: 0, active: false, rotation: 0, connectedTo: [3], delay: 400 },
      { id: 3, type: "door", x: 480, y: 150, width: 40, height: 120, state: 0, active: false, rotation: 0, connectedTo: [], delay: 600 },
    ],
  },
  // Level 3: Weight and platform
  {
    id: 3,
    targetMoves: 2,
    mechanisms: [
      { id: 0, type: "lever", x: 80, y: 300, width: 60, height: 20, state: 0, active: false, rotation: 0, connectedTo: [1], delay: 0 },
      { id: 1, type: "weight", x: 180, y: 80, width: 40, height: 50, state: 0, active: false, rotation: 0, connectedTo: [2], delay: 300 },
      { id: 2, type: "platform", x: 280, y: 280, width: 80, height: 15, state: 0, active: false, rotation: 0, connectedTo: [3], delay: 500 },
      { id: 3, type: "spring", x: 400, y: 250, width: 30, height: 60, state: 0, active: false, rotation: 0, connectedTo: [4], delay: 700 },
      { id: 4, type: "door", x: 500, y: 150, width: 40, height: 120, state: 0, active: false, rotation: 0, connectedTo: [], delay: 900 },
    ],
  },
  // Level 4: Complex chain
  {
    id: 4,
    targetMoves: 3,
    mechanisms: [
      { id: 0, type: "button", x: 60, y: 300, width: 40, height: 40, state: 0, active: false, rotation: 0, connectedTo: [2], delay: 0 },
      { id: 1, type: "lever", x: 60, y: 180, width: 60, height: 20, state: 0, active: false, rotation: 0, connectedTo: [3], delay: 0 },
      { id: 2, type: "gear", x: 180, y: 280, width: 50, height: 50, state: 0, active: false, rotation: 0, connectedTo: [4], delay: 200 },
      { id: 3, type: "pulley", x: 180, y: 120, width: 45, height: 45, state: 0, active: false, rotation: 0, connectedTo: [4], delay: 200 },
      { id: 4, type: "rope", x: 300, y: 200, width: 10, height: 100, state: 0, active: false, rotation: 0, connectedTo: [5], delay: 400 },
      { id: 5, type: "weight", x: 400, y: 100, width: 35, height: 45, state: 0, active: false, rotation: 0, connectedTo: [6], delay: 600 },
      { id: 6, type: "door", x: 500, y: 150, width: 40, height: 120, state: 0, active: false, rotation: 0, connectedTo: [], delay: 800 },
    ],
  },
  // Level 5: Final challenge
  {
    id: 5,
    targetMoves: 3,
    mechanisms: [
      { id: 0, type: "lever", x: 50, y: 320, width: 55, height: 18, state: 0, active: false, rotation: 0, connectedTo: [3], delay: 0 },
      { id: 1, type: "button", x: 50, y: 200, width: 38, height: 38, state: 0, active: false, rotation: 0, connectedTo: [4], delay: 0 },
      { id: 2, type: "button", x: 50, y: 100, width: 38, height: 38, state: 0, active: false, rotation: 0, connectedTo: [5], delay: 0 },
      { id: 3, type: "gear", x: 150, y: 300, width: 55, height: 55, state: 0, active: false, rotation: 0, connectedTo: [6], delay: 200 },
      { id: 4, type: "gear", x: 150, y: 180, width: 55, height: 55, state: 0, active: false, rotation: 0, connectedTo: [6], delay: 200 },
      { id: 5, type: "pulley", x: 150, y: 80, width: 45, height: 45, state: 0, active: false, rotation: 0, connectedTo: [7], delay: 200 },
      { id: 6, type: "gear", x: 260, y: 240, width: 65, height: 65, state: 0, active: false, rotation: 0, connectedTo: [8], delay: 400 },
      { id: 7, type: "weight", x: 260, y: 80, width: 35, height: 45, state: 0, active: false, rotation: 0, connectedTo: [8], delay: 400 },
      { id: 8, type: "platform", x: 360, y: 200, width: 70, height: 12, state: 0, active: false, rotation: 0, connectedTo: [9], delay: 600 },
      { id: 9, type: "spring", x: 450, y: 180, width: 28, height: 55, state: 0, active: false, rotation: 0, connectedTo: [10], delay: 800 },
      { id: 10, type: "door", x: 520, y: 140, width: 45, height: 130, state: 0, active: false, rotation: 0, connectedTo: [], delay: 1000 },
    ],
  },
];

export class MechanismGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  currentLevel: number = 0;
  mechanisms: Mechanism[] = [];
  moves: number = 0;
  status: "playing" | "won" | "complete" = "playing";
  animating: boolean = false;

  onStateChange: ((state: any) => void) | null = null;

  // Colors
  colors = {
    lever: "#e74c3c",
    button: "#3498db",
    gear: "#95a5a6",
    pulley: "#9b59b6",
    weight: "#34495e",
    platform: "#2ecc71",
    door: "#f39c12",
    rope: "#8b4513",
    spring: "#1abc9c",
    active: "#27ae60",
    bg: "#2c3e50",
  };

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
        this.onStateChange({ status: "complete", level: levelIndex + 1, moves: this.moves });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.mechanisms = level.mechanisms.map(m => ({ ...m, state: 0, active: false }));
    this.moves = 0;
    this.status = "playing";
    this.animating = false;

    if (this.onStateChange) {
      this.onStateChange({ status: "playing", level: levelIndex + 1, moves: 0 });
    }
  }

  private loop = () => {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private update() {
    // Animate mechanisms
    this.mechanisms.forEach(m => {
      if (m.active && m.state < 1) {
        m.state = Math.min(1, m.state + 0.05);
        if (m.type === "gear") {
          m.rotation += 0.1;
        }
      }
    });

    // Check win condition
    if (this.status === "playing") {
      const door = this.mechanisms.find(m => m.type === "door");
      if (door && door.state >= 1) {
        this.status = "won";
        if (this.onStateChange) {
          this.onStateChange({ status: "won", level: this.currentLevel + 1, moves: this.moves });
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background grid
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    // Draw connections first
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    this.mechanisms.forEach(m => {
      m.connectedTo.forEach(targetId => {
        const target = this.mechanisms.find(t => t.id === targetId);
        if (target) {
          ctx.beginPath();
          ctx.moveTo(m.x + m.width / 2, m.y + m.height / 2);
          ctx.lineTo(target.x + target.width / 2, target.y + target.height / 2);
          ctx.stroke();
        }
      });
    });
    ctx.setLineDash([]);

    // Draw mechanisms
    this.mechanisms.forEach(m => this.drawMechanism(m));
  }

  private drawMechanism(m: Mechanism) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(m.x + m.width / 2, m.y + m.height / 2);

    const baseColor = m.active ? this.colors.active : this.colors[m.type];

    switch (m.type) {
      case "lever":
        this.drawLever(m, baseColor);
        break;
      case "button":
        this.drawButton(m, baseColor);
        break;
      case "gear":
        this.drawGear(m, baseColor);
        break;
      case "pulley":
        this.drawPulley(m, baseColor);
        break;
      case "weight":
        this.drawWeight(m, baseColor);
        break;
      case "platform":
        this.drawPlatform(m, baseColor);
        break;
      case "door":
        this.drawDoor(m, baseColor);
        break;
      case "rope":
        this.drawRope(m, baseColor);
        break;
      case "spring":
        this.drawSpring(m, baseColor);
        break;
    }

    ctx.restore();
  }

  private drawLever(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const angle = m.state * Math.PI / 3 - Math.PI / 6;

    // Base
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(0, 10, 8, 0, Math.PI * 2);
    ctx.fill();

    // Lever arm
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillRect(-m.width / 2, -5, m.width, 10);
    ctx.beginPath();
    ctx.arc(-m.width / 2, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawButton(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const pressed = m.state * 8;

    // Base
    ctx.fillStyle = "#444";
    ctx.fillRect(-m.width / 2 - 5, -m.height / 2 - 5, m.width + 10, m.height + 10);

    // Button
    ctx.fillStyle = color;
    ctx.fillRect(-m.width / 2, -m.height / 2 + pressed, m.width, m.height - pressed);

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(-m.width / 2, -m.height / 2 + pressed, m.width, 5);
  }

  private drawGear(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const teeth = 8;
    const outerRadius = m.width / 2;
    const innerRadius = outerRadius * 0.7;

    ctx.save();
    ctx.rotate(m.rotation);

    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i / (teeth * 2)) * Math.PI * 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      } else {
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center hole
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();

    ctx.restore();
  }

  private drawPulley(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const radius = m.width / 2;

    // Wheel
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#555";
    ctx.fill();

    // Rope groove
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  private drawWeight(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const drop = m.state * 50;

    // Rope
    ctx.strokeStyle = this.colors.rope;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -m.height / 2 - 30);
    ctx.lineTo(0, -m.height / 2 + drop);
    ctx.stroke();

    // Weight
    ctx.save();
    ctx.translate(0, drop);
    ctx.fillStyle = color;
    ctx.fillRect(-m.width / 2, -m.height / 2, m.width, m.height);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-m.width / 2, -m.height / 2, m.width, 10);
    ctx.restore();
  }

  private drawPlatform(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const lift = m.state * 30;

    // Support
    ctx.fillStyle = "#555";
    ctx.fillRect(-5, 0, 10, 40);

    // Platform
    ctx.save();
    ctx.translate(0, -lift);
    ctx.fillStyle = color;
    ctx.fillRect(-m.width / 2, -m.height / 2, m.width, m.height);
    ctx.restore();
  }

  private drawDoor(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const openAmount = m.state * m.height;

    // Frame
    ctx.strokeStyle = "#f39c12";
    ctx.lineWidth = 5;
    ctx.strokeRect(-m.width / 2 - 5, -m.height / 2 - 5, m.width + 10, m.height + 10);

    // Door
    ctx.fillStyle = m.state >= 1 ? "#27ae60" : color;
    ctx.fillRect(-m.width / 2, -m.height / 2 + openAmount, m.width, m.height - openAmount);

    // Handle
    if (m.state < 1) {
      ctx.beginPath();
      ctx.arc(m.width / 4, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#c9a227";
      ctx.fill();
    }

    // Open indicator
    if (m.state >= 1) {
      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("✓", 0, 10);
    }
  }

  private drawRope(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const tension = m.state;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();

    // Wavy when not active, straight when active
    const amplitude = (1 - tension) * 15;
    ctx.moveTo(0, -m.height / 2);
    for (let y = -m.height / 2; y <= m.height / 2; y += 5) {
      const x = Math.sin((y + Date.now() / 200) * 0.2) * amplitude;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawSpring(m: Mechanism, color: string) {
    const ctx = this.ctx;
    const compression = m.state * 0.5;
    const coils = 5;
    const coilHeight = (m.height * (1 - compression)) / coils;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();

    ctx.moveTo(0, -m.height / 2);
    for (let i = 0; i < coils; i++) {
      const y = -m.height / 2 + i * coilHeight;
      ctx.lineTo(-m.width / 2, y + coilHeight * 0.25);
      ctx.lineTo(m.width / 2, y + coilHeight * 0.75);
    }
    ctx.lineTo(0, -m.height / 2 + coils * coilHeight);
    ctx.stroke();

    // Top/bottom caps
    ctx.fillStyle = "#333";
    ctx.fillRect(-m.width / 2, -m.height / 2 - 5, m.width, 8);
    ctx.fillRect(-m.width / 2, -m.height / 2 + coils * coilHeight - 3, m.width, 8);
  }

  public handleClick(x: number, y: number) {
    if (this.status !== "playing" || this.animating) return;

    // Find clicked mechanism
    const clicked = this.mechanisms.find(m => {
      if (m.type === "door") return false; // Can't click door
      if (m.active) return false; // Already activated

      const dx = x - (m.x + m.width / 2);
      const dy = y - (m.y + m.height / 2);
      return Math.abs(dx) < m.width / 2 + 10 && Math.abs(dy) < m.height / 2 + 10;
    });

    if (clicked && (clicked.type === "lever" || clicked.type === "button")) {
      this.activateMechanism(clicked);
      this.moves++;
      if (this.onStateChange) {
        this.onStateChange({ status: "playing", level: this.currentLevel + 1, moves: this.moves });
      }
    }
  }

  private activateMechanism(m: Mechanism) {
    this.animating = true;
    m.active = true;

    // Trigger connected mechanisms with delay
    m.connectedTo.forEach(targetId => {
      const target = this.mechanisms.find(t => t.id === targetId);
      if (target && !target.active) {
        setTimeout(() => {
          this.activateMechanism(target);
        }, target.delay);
      }
    });

    // Check if all chain complete
    setTimeout(() => {
      this.animating = false;
    }, 1500);
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
      this.canvas.width = Math.min(600, rect.width);
      this.canvas.height = 400;
    }
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public getTotalLevels(): number {
    return LEVELS.length;
  }
}
