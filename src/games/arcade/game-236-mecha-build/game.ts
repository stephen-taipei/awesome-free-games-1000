/**
 * Mecha Build Game Engine
 * Game #236
 *
 * Quickly assemble mecha parts in the correct order!
 */

interface MechaPart {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  score: number;
  level: number;
  timeLeft: number;
  status: "idle" | "playing" | "levelComplete" | "over";
}

type StateCallback = (state: GameState) => void;

const MECHA_PARTS: { emoji: string; name: string }[] = [
  { emoji: "🤖", name: "head" },
  { emoji: "🦾", name: "arm-left" },
  { emoji: "🦿", name: "leg-left" },
  { emoji: "⚙️", name: "core" },
  { emoji: "🔩", name: "bolt" },
  { emoji: "🛡️", name: "shield" },
  { emoji: "⚡", name: "power" },
  { emoji: "🎯", name: "target" },
  { emoji: "💎", name: "crystal" },
  { emoji: "🔧", name: "wrench" },
  { emoji: "🔋", name: "battery" },
  { emoji: "📡", name: "antenna" },
];

const BASE_TIME = 30;
const TIME_BONUS = 5;
const PARTS_PER_LEVEL = 5;

export class MechaBuildGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score = 0;
  private level = 1;
  private timeLeft = BASE_TIME;
  private status: "idle" | "playing" | "levelComplete" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private timerInterval: number | null = null;

  private requiredParts: MechaPart[] = [];
  private currentPartIndex = 0;
  private assembledParts: MechaPart[] = [];
  private availableParts: { emoji: string; name: string }[] = [];

  private onPartsUpdate: ((parts: { emoji: string; name: string }[], targetIndex: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  setOnPartsUpdate(cb: (parts: { emoji: string; name: string }[], targetIndex: number) => void) {
    this.onPartsUpdate = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        level: this.level,
        timeLeft: this.timeLeft,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;
    this.draw();
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.timeLeft = BASE_TIME;
    this.status = "playing";
    this.setupLevel();
    this.startTimer();
    this.emitState();
  }

  private setupLevel() {
    this.currentPartIndex = 0;
    this.assembledParts = [];

    // Select random parts for this level
    const shuffled = [...MECHA_PARTS].sort(() => Math.random() - 0.5);
    const partsCount = Math.min(PARTS_PER_LEVEL + this.level - 1, 8);

    this.requiredParts = shuffled.slice(0, partsCount).map((part, i) => ({
      id: `part-${i}`,
      name: part.name,
      emoji: part.emoji,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    }));

    this.calculatePartPositions();
    this.generateAvailableParts();
    this.draw();
  }

  private calculatePartPositions() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const partSize = 60;

    // Arrange parts in a mecha formation
    const positions = [
      { x: centerX, y: centerY - partSize * 1.5 }, // Head
      { x: centerX - partSize, y: centerY - partSize * 0.5 }, // Left arm
      { x: centerX + partSize, y: centerY - partSize * 0.5 }, // Right arm
      { x: centerX, y: centerY }, // Core
      { x: centerX - partSize * 0.5, y: centerY + partSize }, // Left leg
      { x: centerX + partSize * 0.5, y: centerY + partSize }, // Right leg
      { x: centerX, y: centerY + partSize * 1.5 }, // Base
      { x: centerX, y: centerY - partSize * 2.5 }, // Antenna
    ];

    this.requiredParts.forEach((part, i) => {
      const pos = positions[i % positions.length];
      part.x = pos.x;
      part.y = pos.y;
      part.width = partSize;
      part.height = partSize;
    });
  }

  private generateAvailableParts() {
    // Include all required parts plus some decoys
    const required = this.requiredParts.map((p) => ({ emoji: p.emoji, name: p.name }));
    const decoys = MECHA_PARTS
      .filter((p) => !required.some((r) => r.name === p.name))
      .slice(0, 4);

    this.availableParts = [...required, ...decoys].sort(() => Math.random() - 0.5);

    if (this.onPartsUpdate) {
      const targetPart = this.requiredParts[this.currentPartIndex];
      const targetIndex = this.availableParts.findIndex((p) => p.name === targetPart?.name);
      this.onPartsUpdate(this.availableParts, targetIndex);
    }
  }

  private startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      if (this.status !== "playing") return;

      this.timeLeft--;
      this.emitState();

      if (this.timeLeft <= 0) {
        this.gameOver();
      }
    }, 1000);
  }

  selectPart(partName: string): "correct" | "wrong" | "complete" {
    if (this.status !== "playing") return "wrong";

    const targetPart = this.requiredParts[this.currentPartIndex];
    if (!targetPart) return "wrong";

    if (partName === targetPart.name) {
      // Correct part!
      this.assembledParts.push(targetPart);
      this.score += 100 * this.level;
      this.currentPartIndex++;

      if (this.currentPartIndex >= this.requiredParts.length) {
        // Level complete!
        this.levelComplete();
        return "complete";
      }

      // Update available parts display
      if (this.onPartsUpdate) {
        const nextTarget = this.requiredParts[this.currentPartIndex];
        const targetIndex = this.availableParts.findIndex((p) => p.name === nextTarget?.name);
        this.onPartsUpdate(this.availableParts, targetIndex);
      }

      this.draw();
      this.emitState();
      return "correct";
    } else {
      // Wrong part - time penalty
      this.timeLeft = Math.max(0, this.timeLeft - 2);
      this.emitState();
      return "wrong";
    }
  }

  private levelComplete() {
    this.status = "levelComplete";
    this.score += this.timeLeft * 10; // Bonus for remaining time
    this.emitState();

    setTimeout(() => {
      if (this.status === "levelComplete") {
        this.nextLevel();
      }
    }, 1500);
  }

  private nextLevel() {
    this.level++;
    this.timeLeft = BASE_TIME + TIME_BONUS;
    this.status = "playing";
    this.setupLevel();
    this.emitState();
  }

  private gameOver() {
    this.status = "over";
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a202c";
    ctx.fillRect(0, 0, w, h);

    // Draw grid pattern
    ctx.strokeStyle = "#2d3748";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw mecha assembly area
    this.drawAssemblyArea();

    // Draw assembled parts
    this.assembledParts.forEach((part) => {
      this.drawPart(part, true);
    });

    // Draw pending parts (ghosted)
    this.requiredParts.slice(this.currentPartIndex).forEach((part) => {
      this.drawPart(part, false);
    });

    // Draw current target indicator
    if (this.currentPartIndex < this.requiredParts.length) {
      const targetPart = this.requiredParts[this.currentPartIndex];
      this.drawTargetIndicator(targetPart);
    }
  }

  private drawAssemblyArea() {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Glowing circle
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150);
    gradient.addColorStop(0, "rgba(243, 156, 18, 0.2)");
    gradient.addColorStop(1, "rgba(243, 156, 18, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(243, 156, 18, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawPart(part: MechaPart, assembled: boolean) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = assembled ? 1 : 0.3;

    // Part background
    ctx.fillStyle = assembled ? "#4a5568" : "#2d3748";
    ctx.beginPath();
    ctx.roundRect(
      part.x - part.width / 2,
      part.y - part.height / 2,
      part.width,
      part.height,
      8
    );
    ctx.fill();

    if (assembled) {
      ctx.strokeStyle = "#48bb78";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Part emoji
    ctx.font = `${part.width * 0.6}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(part.emoji, part.x, part.y);

    ctx.restore();
  }

  private drawTargetIndicator(part: MechaPart) {
    const ctx = this.ctx;
    const time = Date.now() / 500;
    const pulse = Math.sin(time) * 0.2 + 0.8;

    ctx.save();
    ctx.strokeStyle = `rgba(243, 156, 18, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(
      part.x - part.width / 2 - 5,
      part.y - part.height / 2 - 5,
      part.width + 10,
      part.height + 10,
      10
    );
    ctx.stroke();
    ctx.restore();

    // Request next frame for animation
    if (this.status === "playing") {
      requestAnimationFrame(() => this.draw());
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
