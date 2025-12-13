/**
 * Castle Mechanism Game Engine
 * Game #122 - Activate mechanisms to open the castle gate
 */

export type MechanismType = "lever" | "gear" | "button" | "wheel";

export interface Mechanism {
  id: number;
  type: MechanismType;
  x: number;
  y: number;
  activated: boolean;
  linkedTo: number[];
  requiredOrder: number;
  color: string;
}

export interface LevelConfig {
  mechanisms: Omit<Mechanism, "activated">[];
  gateOpenOrder: number[];
}

export class CastleMechanismGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private mechanisms: Mechanism[] = [];
  private activationOrder: number[] = [];
  private gateOpenOrder: number[] = [];
  private gateProgress = 0;

  private moves = 0;
  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";
  private animating = false;

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Simple two levers
    {
      mechanisms: [
        { id: 1, type: "lever", x: 150, y: 200, linkedTo: [], requiredOrder: 1, color: "#e74c3c" },
        { id: 2, type: "lever", x: 350, y: 200, linkedTo: [], requiredOrder: 2, color: "#3498db" },
      ],
      gateOpenOrder: [1, 2],
    },
    // Level 2 - Gears connected
    {
      mechanisms: [
        { id: 1, type: "gear", x: 120, y: 180, linkedTo: [2], requiredOrder: 1, color: "#e67e22" },
        { id: 2, type: "gear", x: 200, y: 180, linkedTo: [3], requiredOrder: 0, color: "#9b59b6" },
        { id: 3, type: "lever", x: 350, y: 200, linkedTo: [], requiredOrder: 2, color: "#2ecc71" },
      ],
      gateOpenOrder: [1, 3],
    },
    // Level 3 - Button and wheel
    {
      mechanisms: [
        { id: 1, type: "button", x: 100, y: 150, linkedTo: [2], requiredOrder: 1, color: "#e74c3c" },
        { id: 2, type: "wheel", x: 250, y: 180, linkedTo: [], requiredOrder: 0, color: "#f39c12" },
        { id: 3, type: "lever", x: 400, y: 200, linkedTo: [], requiredOrder: 2, color: "#3498db" },
      ],
      gateOpenOrder: [1, 3],
    },
    // Level 4 - Complex chain
    {
      mechanisms: [
        { id: 1, type: "lever", x: 80, y: 150, linkedTo: [3], requiredOrder: 1, color: "#e74c3c" },
        { id: 2, type: "gear", x: 180, y: 180, linkedTo: [4], requiredOrder: 2, color: "#9b59b6" },
        { id: 3, type: "wheel", x: 280, y: 150, linkedTo: [2], requiredOrder: 0, color: "#f39c12" },
        { id: 4, type: "button", x: 380, y: 200, linkedTo: [], requiredOrder: 3, color: "#2ecc71" },
      ],
      gateOpenOrder: [1, 2, 4],
    },
    // Level 5 - Full puzzle
    {
      mechanisms: [
        { id: 1, type: "lever", x: 60, y: 120, linkedTo: [2], requiredOrder: 1, color: "#e74c3c" },
        { id: 2, type: "gear", x: 140, y: 180, linkedTo: [3], requiredOrder: 0, color: "#e67e22" },
        { id: 3, type: "gear", x: 220, y: 180, linkedTo: [], requiredOrder: 2, color: "#9b59b6" },
        { id: 4, type: "wheel", x: 300, y: 140, linkedTo: [5], requiredOrder: 3, color: "#f39c12" },
        { id: 5, type: "button", x: 400, y: 200, linkedTo: [], requiredOrder: 4, color: "#2ecc71" },
      ],
      gateOpenOrder: [1, 3, 4, 5],
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "playing" || this.animating) return;

      const pos = getPos(e);

      for (const mech of this.mechanisms) {
        if (mech.activated) continue;

        const dist = Math.hypot(pos.x - mech.x, pos.y - mech.y);
        if (dist < 40) {
          this.activateMechanism(mech);
          break;
        }
      }
    };

    this.canvas.addEventListener("click", handleClick);
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      handleClick(e);
    });
  }

  private activateMechanism(mech: Mechanism) {
    this.animating = true;
    mech.activated = true;
    this.activationOrder.push(mech.id);
    this.moves++;

    // Activate linked mechanisms
    mech.linkedTo.forEach((linkedId) => {
      const linked = this.mechanisms.find((m) => m.id === linkedId);
      if (linked && !linked.activated) {
        setTimeout(() => {
          linked.activated = true;
          this.draw();
        }, 300);
      }
    });

    if (this.onStateChange) {
      this.onStateChange({ moves: this.moves });
    }

    // Animate and check progress
    setTimeout(() => {
      this.animating = false;
      this.checkProgress();
      this.draw();
    }, 500);

    this.draw();
  }

  private checkProgress() {
    // Check if activated in correct order
    const correctSoFar = this.gateOpenOrder.every((id, index) => {
      const activatedIndex = this.activationOrder.indexOf(id);
      if (activatedIndex === -1) return true; // Not yet activated

      // Check all previous required ones are activated before this
      for (let i = 0; i < index; i++) {
        const prevId = this.gateOpenOrder[i];
        const prevActivatedIndex = this.activationOrder.indexOf(prevId);
        if (prevActivatedIndex === -1 || prevActivatedIndex > activatedIndex) {
          return false;
        }
      }
      return true;
    });

    if (!correctSoFar) {
      // Wrong order - reset
      setTimeout(() => {
        this.mechanisms.forEach((m) => (m.activated = false));
        this.activationOrder = [];
        this.gateProgress = 0;
        this.draw();
      }, 500);
      return;
    }

    // Update gate progress
    const activatedRequired = this.gateOpenOrder.filter((id) =>
      this.activationOrder.includes(id)
    );
    this.gateProgress = activatedRequired.length / this.gateOpenOrder.length;

    if (this.gateProgress >= 1) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.mechanisms = config.mechanisms.map((m) => ({ ...m, activated: false }));
    this.gateOpenOrder = [...config.gateOpenOrder];
    this.activationOrder = [];
    this.gateProgress = 0;
    this.moves = 0;

    if (this.onStateChange) {
      this.onStateChange({ moves: 0 });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - stone wall
    ctx.fillStyle = "#4a4a4a";
    ctx.fillRect(0, 0, w, h);

    // Stone pattern
    this.drawStoneWall(ctx, w, h);

    // Draw castle gate
    this.drawGate(ctx, w, h);

    // Draw connection lines
    this.drawConnections(ctx);

    // Draw mechanisms
    this.mechanisms.forEach((mech) => {
      this.drawMechanism(ctx, mech);
    });

    // Draw order hints
    this.drawOrderHints(ctx);
  }

  private drawStoneWall(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = "#5a5a5a";
    const brickH = 30;
    const brickW = 60;

    for (let y = 0; y < h; y += brickH) {
      const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
      for (let x = -brickW / 2 + offset; x < w; x += brickW) {
        ctx.strokeStyle = "#3a3a3a";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, brickW - 2, brickH - 2);
      }
    }
  }

  private drawGate(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const gateWidth = 100;
    const gateHeight = 150;
    const gateX = (w - gateWidth) / 2;
    const gateY = h - gateHeight - 20;

    // Gate frame
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(gateX - 15, gateY - 20, gateWidth + 30, gateHeight + 30);

    // Gate opening (shows progress)
    const openAmount = this.gateProgress * gateHeight * 0.8;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(gateX, gateY + gateHeight - openAmount, gateWidth, openAmount);

    // Gate bars
    ctx.fillStyle = "#8B4513";
    const barCount = 5;
    const gateTop = gateY + gateHeight - openAmount;

    for (let i = 0; i < barCount; i++) {
      const barX = gateX + (i + 0.5) * (gateWidth / barCount) - 5;
      ctx.fillRect(barX, gateTop, 10, gateHeight - (gateHeight - openAmount));
    }

    // Horizontal bars
    ctx.fillRect(gateX, gateTop + 20, gateWidth, 8);
    ctx.fillRect(gateX, gateTop + 60, gateWidth, 8);

    // Decorative arch
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(gateX + gateWidth / 2, gateY, gateWidth / 2, Math.PI, 0);
    ctx.stroke();
  }

  private drawConnections(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    this.mechanisms.forEach((mech) => {
      mech.linkedTo.forEach((linkedId) => {
        const linked = this.mechanisms.find((m) => m.id === linkedId);
        if (linked) {
          ctx.beginPath();
          ctx.moveTo(mech.x, mech.y);
          ctx.lineTo(linked.x, linked.y);
          ctx.stroke();
        }
      });
    });

    ctx.setLineDash([]);
  }

  private drawMechanism(ctx: CanvasRenderingContext2D, mech: Mechanism) {
    const x = mech.x;
    const y = mech.y;
    const activated = mech.activated;

    ctx.save();

    // Glow when activated
    if (activated) {
      ctx.shadowColor = "#2ecc71";
      ctx.shadowBlur = 20;
    }

    switch (mech.type) {
      case "lever":
        this.drawLever(ctx, x, y, mech.color, activated);
        break;
      case "gear":
        this.drawGear(ctx, x, y, mech.color, activated);
        break;
      case "button":
        this.drawButton(ctx, x, y, mech.color, activated);
        break;
      case "wheel":
        this.drawWheel(ctx, x, y, mech.color, activated);
        break;
    }

    ctx.restore();
  }

  private drawLever(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    activated: boolean
  ) {
    // Base
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(x - 20, y + 15, 40, 20);

    // Lever arm
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(x, y + 15);
    ctx.rotate(activated ? Math.PI / 4 : -Math.PI / 4);
    ctx.fillRect(-5, -50, 10, 50);

    // Handle
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(0, -50, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGear(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    activated: boolean
  ) {
    const teeth = 8;
    const outerR = 35;
    const innerR = 25;

    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i * Math.PI) / teeth + (activated ? Math.PI / 8 : 0);
      const r = i % 2 === 0 ? outerR : innerR;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    // Center hole
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    activated: boolean
  ) {
    // Base
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Button
    ctx.fillStyle = activated ? "#2ecc71" : color;
    ctx.beginPath();
    ctx.arc(x, y + (activated ? 5 : 0), 22, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(x - 5, y - 5 + (activated ? 5 : 0), 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWheel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    activated: boolean
  ) {
    const rotation = activated ? Math.PI / 2 : 0;

    // Outer ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + rotation;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 25, y + Math.sin(angle) * 25);
      ctx.stroke();
    }

    // Center
    ctx.fillStyle = activated ? "#2ecc71" : "#333";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawOrderHints(ctx: CanvasRenderingContext2D) {
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";

    this.mechanisms.forEach((mech) => {
      if (mech.requiredOrder > 0 && !mech.activated) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(mech.x + 25, mech.y - 25, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#333";
        ctx.fillText(mech.requiredOrder.toString(), mech.x + 25, mech.y - 21);
      }
    });
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(500, rect.width - 20);
      this.canvas.height = 400;
      this.draw();
    }
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
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
