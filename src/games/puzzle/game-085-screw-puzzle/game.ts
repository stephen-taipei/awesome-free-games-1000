/**
 * Screw Puzzle Game Engine
 * Game #085
 *
 * Unscrew screws in the correct order - some screws block others!
 */

interface Screw {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
  removed: boolean;
  blockedBy: number[]; // IDs of screws that block this one
  rotateProgress: number; // 0-1 for removal animation
}

interface Plank {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  screwIds: number[];
}

interface Level {
  screws: Omit<Screw, "removed" | "rotateProgress">[];
  planks: Omit<Plank, "screwIds">[];
}

interface GameState {
  level: number;
  maxLevel: number;
  screwsRemoved: number;
  totalScrews: number;
  status: "idle" | "playing" | "won";
}

type StateCallback = (state: GameState) => void;

const SCREW_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

const LEVELS: Level[] = [
  // Level 1: Simple - 3 screws, no blocking
  {
    screws: [
      { id: 1, x: 150, y: 150, angle: 0, color: SCREW_COLORS[0], blockedBy: [] },
      { id: 2, x: 300, y: 150, angle: 45, color: SCREW_COLORS[1], blockedBy: [] },
      { id: 3, x: 450, y: 150, angle: 90, color: SCREW_COLORS[2], blockedBy: [] },
    ],
    planks: [{ x: 100, y: 120, width: 400, height: 60, color: "#8b4513" }],
  },
  // Level 2: One blocking relationship
  {
    screws: [
      { id: 1, x: 200, y: 120, angle: 0, color: SCREW_COLORS[0], blockedBy: [] },
      { id: 2, x: 350, y: 120, angle: 30, color: SCREW_COLORS[1], blockedBy: [] },
      { id: 3, x: 275, y: 220, angle: 60, color: SCREW_COLORS[2], blockedBy: [1, 2] },
    ],
    planks: [
      { x: 150, y: 90, width: 250, height: 50, color: "#8b4513" },
      { x: 180, y: 180, width: 200, height: 80, color: "#a0522d" },
    ],
  },
  // Level 3: Chain blocking
  {
    screws: [
      { id: 1, x: 150, y: 100, angle: 0, color: SCREW_COLORS[0], blockedBy: [] },
      { id: 2, x: 300, y: 100, angle: 20, color: SCREW_COLORS[1], blockedBy: [] },
      { id: 3, x: 225, y: 180, angle: 45, color: SCREW_COLORS[2], blockedBy: [1] },
      { id: 4, x: 225, y: 280, angle: 70, color: SCREW_COLORS[3], blockedBy: [3] },
    ],
    planks: [
      { x: 100, y: 70, width: 250, height: 50, color: "#8b4513" },
      { x: 150, y: 150, width: 150, height: 60, color: "#a0522d" },
      { x: 130, y: 240, width: 200, height: 80, color: "#cd853f" },
    ],
  },
  // Level 4: Multiple paths
  {
    screws: [
      { id: 1, x: 120, y: 100, angle: 0, color: SCREW_COLORS[0], blockedBy: [] },
      { id: 2, x: 250, y: 100, angle: 15, color: SCREW_COLORS[1], blockedBy: [] },
      { id: 3, x: 380, y: 100, angle: 30, color: SCREW_COLORS[2], blockedBy: [] },
      { id: 4, x: 185, y: 200, angle: 45, color: SCREW_COLORS[3], blockedBy: [1, 2] },
      { id: 5, x: 315, y: 200, angle: 60, color: SCREW_COLORS[4], blockedBy: [2, 3] },
      { id: 6, x: 250, y: 300, angle: 90, color: SCREW_COLORS[5], blockedBy: [4, 5] },
    ],
    planks: [
      { x: 70, y: 70, width: 360, height: 50, color: "#8b4513" },
      { x: 120, y: 160, width: 130, height: 70, color: "#a0522d" },
      { x: 250, y: 160, width: 130, height: 70, color: "#a0522d" },
      { x: 170, y: 260, width: 160, height: 80, color: "#cd853f" },
    ],
  },
  // Level 5: Complex puzzle
  {
    screws: [
      { id: 1, x: 100, y: 80, angle: 0, color: SCREW_COLORS[0], blockedBy: [] },
      { id: 2, x: 200, y: 80, angle: 10, color: SCREW_COLORS[1], blockedBy: [] },
      { id: 3, x: 350, y: 80, angle: 20, color: SCREW_COLORS[2], blockedBy: [] },
      { id: 4, x: 450, y: 80, angle: 30, color: SCREW_COLORS[3], blockedBy: [] },
      { id: 5, x: 150, y: 170, angle: 40, color: SCREW_COLORS[4], blockedBy: [1, 2] },
      { id: 6, x: 400, y: 170, angle: 50, color: SCREW_COLORS[5], blockedBy: [3, 4] },
      { id: 7, x: 275, y: 250, angle: 60, color: SCREW_COLORS[0], blockedBy: [5] },
      { id: 8, x: 275, y: 340, angle: 80, color: SCREW_COLORS[1], blockedBy: [6, 7] },
    ],
    planks: [
      { x: 50, y: 50, width: 200, height: 50, color: "#8b4513" },
      { x: 300, y: 50, width: 200, height: 50, color: "#8b4513" },
      { x: 80, y: 130, width: 150, height: 70, color: "#a0522d" },
      { x: 330, y: 130, width: 150, height: 70, color: "#a0522d" },
      { x: 180, y: 210, width: 200, height: 80, color: "#cd853f" },
      { x: 150, y: 300, width: 250, height: 80, color: "#deb887" },
    ],
  },
];

export class ScrewPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screws: Screw[] = [];
  private planks: Plank[] = [];
  private level = 1;
  private status: "idle" | "playing" | "won" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private blockedScrew: Screw | null = null;
  private blockedTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      const removed = this.screws.filter((s) => s.removed).length;
      this.onStateChange({
        level: this.level,
        maxLevel: LEVELS.length,
        screwsRemoved: removed,
        totalScrews: this.screws.length,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  start() {
    this.level = 1;
    this.loadLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  reset() {
    this.loadLevel();
    this.status = "playing";
    this.emitState();
  }

  nextLevel() {
    if (this.level < LEVELS.length) {
      this.level++;
      this.loadLevel();
      this.status = "playing";
      this.emitState();
    }
  }

  private loadLevel() {
    const levelData = LEVELS[this.level - 1];

    // Scale positions based on canvas size
    const scaleX = this.canvas.width / 550;
    const scaleY = this.canvas.height / 400;

    this.screws = levelData.screws.map((s) => ({
      ...s,
      x: s.x * scaleX,
      y: s.y * scaleY,
      removed: false,
      rotateProgress: 0,
    }));

    this.planks = levelData.planks.map((p) => ({
      ...p,
      x: p.x * scaleX,
      y: p.y * scaleY,
      width: p.width * scaleX,
      height: p.height * scaleY,
      screwIds: [],
    }));

    this.blockedScrew = null;
    this.blockedTimer = 0;
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Find clicked screw
    for (const screw of this.screws) {
      if (screw.removed) continue;

      const dx = x - screw.x;
      const dy = y - screw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        this.tryRemoveScrew(screw);
        return;
      }
    }
  }

  private tryRemoveScrew(screw: Screw) {
    // Check if blocked
    const blockers = screw.blockedBy.filter((id) => {
      const blocker = this.screws.find((s) => s.id === id);
      return blocker && !blocker.removed;
    });

    if (blockers.length > 0) {
      // Show blocked feedback
      this.blockedScrew = screw;
      this.blockedTimer = 30;
      return;
    }

    // Start removal animation
    screw.rotateProgress = 0.01;
  }

  private gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    if (this.status !== "playing") return;

    // Update blocked feedback
    if (this.blockedTimer > 0) {
      this.blockedTimer--;
      if (this.blockedTimer === 0) {
        this.blockedScrew = null;
      }
    }

    // Update screw removal animations
    let allRemoved = true;
    for (const screw of this.screws) {
      if (screw.removed) continue;

      if (screw.rotateProgress > 0) {
        screw.rotateProgress += 0.05;
        screw.angle += 15;

        if (screw.rotateProgress >= 1) {
          screw.removed = true;
          this.emitState();
        }
      }

      if (!screw.removed) {
        allRemoved = false;
      }
    }

    // Check win
    if (allRemoved && this.screws.length > 0) {
      this.status = "won";
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#b2bec3";
    ctx.fillRect(0, 0, w, h);

    // Draw metal background texture
    ctx.fillStyle = "#a4b0be";
    for (let i = 0; i < w; i += 20) {
      ctx.fillRect(i, 0, 1, h);
    }

    // Draw planks
    for (const plank of this.planks) {
      this.drawPlank(plank);
    }

    // Draw screws (back to front, removed ones fade out)
    const sortedScrews = [...this.screws].sort((a, b) => {
      if (a.removed !== b.removed) return a.removed ? -1 : 1;
      return 0;
    });

    for (const screw of sortedScrews) {
      this.drawScrew(screw);
    }

    // Draw blocked feedback
    if (this.blockedScrew && this.blockedTimer > 0) {
      this.drawBlockedFeedback(this.blockedScrew);
    }
  }

  private drawPlank(plank: Plank) {
    const ctx = this.ctx;

    // Wood plank with grain
    ctx.fillStyle = plank.color;
    ctx.fillRect(plank.x, plank.y, plank.width, plank.height);

    // Wood grain lines
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < plank.height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(plank.x, plank.y + i);
      ctx.lineTo(plank.x + plank.width, plank.y + i);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(plank.x, plank.y, plank.width, plank.height);
  }

  private drawScrew(screw: Screw) {
    const ctx = this.ctx;

    if (screw.removed) return;

    const alpha = 1 - screw.rotateProgress;
    const scale = 1 - screw.rotateProgress * 0.3;

    ctx.save();
    ctx.translate(screw.x, screw.y);
    ctx.rotate((screw.angle * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    // Screw head outer ring
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    gradient.addColorStop(0, "#f5f5f5");
    gradient.addColorStop(0.5, "#ccc");
    gradient.addColorStop(1, "#999");

    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Color ring
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = screw.color;
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#ddd";
    ctx.fill();

    // Cross slot
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.arc(-5, -5, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();

    ctx.restore();
  }

  private drawBlockedFeedback(screw: Screw) {
    const ctx = this.ctx;
    const shake = Math.sin(this.blockedTimer * 0.5) * 3;

    ctx.save();
    ctx.translate(screw.x + shake, screw.y);

    // Red X
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-15, -15);
    ctx.lineTo(15, 15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(15, -15);
    ctx.lineTo(-15, 15);
    ctx.stroke();

    // Blocked ring
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
