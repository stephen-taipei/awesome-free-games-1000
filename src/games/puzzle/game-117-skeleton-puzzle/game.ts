/**
 * Skeleton Puzzle Game Engine
 * Game #117 - Assemble animal skeletons by dragging parts
 */

export interface BonePart {
  id: string;
  name: string;
  path: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  rotation: number;
  placed: boolean;
}

export interface LevelConfig {
  name: string;
  parts: Omit<BonePart, "placed">[];
}

export class SkeletonPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private parts: BonePart[] = [];
  private draggedPart: BonePart | null = null;
  private dragOffset = { x: 0, y: 0 };
  private snapDistance = 30;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" = "idle";

  private onStateChange: ((state: any) => void) | null = null;

  private levels: LevelConfig[] = [
    // Level 1 - Fish skeleton
    {
      name: "Fish",
      parts: [
        {
          id: "head",
          name: "Head",
          path: "fish-head",
          x: 50,
          y: 300,
          targetX: 120,
          targetY: 200,
          width: 80,
          height: 60,
          rotation: 0,
        },
        {
          id: "spine",
          name: "Spine",
          path: "fish-spine",
          x: 250,
          y: 350,
          targetX: 280,
          targetY: 200,
          width: 200,
          height: 30,
          rotation: 0,
        },
        {
          id: "tail",
          name: "Tail",
          path: "fish-tail",
          x: 450,
          y: 300,
          targetX: 460,
          targetY: 200,
          width: 70,
          height: 80,
          rotation: 0,
        },
        {
          id: "fin1",
          name: "Top Fin",
          path: "fish-fin-top",
          x: 150,
          y: 350,
          targetX: 280,
          targetY: 150,
          width: 60,
          height: 40,
          rotation: 0,
        },
        {
          id: "fin2",
          name: "Bottom Fin",
          path: "fish-fin-bottom",
          x: 350,
          y: 350,
          targetX: 280,
          targetY: 250,
          width: 60,
          height: 40,
          rotation: 0,
        },
      ],
    },
    // Level 2 - Bird skeleton
    {
      name: "Bird",
      parts: [
        {
          id: "skull",
          name: "Skull",
          path: "bird-skull",
          x: 50,
          y: 320,
          targetX: 100,
          targetY: 150,
          width: 60,
          height: 40,
          rotation: 0,
        },
        {
          id: "beak",
          name: "Beak",
          path: "bird-beak",
          x: 130,
          y: 350,
          targetX: 60,
          targetY: 155,
          width: 50,
          height: 20,
          rotation: 0,
        },
        {
          id: "spine",
          name: "Spine",
          path: "bird-spine",
          x: 250,
          y: 320,
          targetX: 230,
          targetY: 180,
          width: 150,
          height: 25,
          rotation: 0,
        },
        {
          id: "wing",
          name: "Wing",
          path: "bird-wing",
          x: 380,
          y: 350,
          targetX: 230,
          targetY: 120,
          width: 100,
          height: 60,
          rotation: 0,
        },
        {
          id: "ribcage",
          name: "Ribcage",
          path: "bird-ribcage",
          x: 200,
          y: 370,
          targetX: 200,
          targetY: 200,
          width: 80,
          height: 60,
          rotation: 0,
        },
        {
          id: "legs",
          name: "Legs",
          path: "bird-legs",
          x: 450,
          y: 320,
          targetX: 280,
          targetY: 280,
          width: 60,
          height: 80,
          rotation: 0,
        },
        {
          id: "tail",
          name: "Tail",
          path: "bird-tail",
          x: 350,
          y: 380,
          targetX: 380,
          targetY: 180,
          width: 70,
          height: 50,
          rotation: 0,
        },
      ],
    },
    // Level 3 - Dinosaur skeleton
    {
      name: "Dinosaur",
      parts: [
        {
          id: "skull",
          name: "Skull",
          path: "dino-skull",
          x: 30,
          y: 320,
          targetX: 80,
          targetY: 120,
          width: 90,
          height: 70,
          rotation: 0,
        },
        {
          id: "neck",
          name: "Neck",
          path: "dino-neck",
          x: 150,
          y: 350,
          targetX: 150,
          targetY: 150,
          width: 60,
          height: 80,
          rotation: 0,
        },
        {
          id: "spine",
          name: "Spine",
          path: "dino-spine",
          x: 280,
          y: 320,
          targetX: 300,
          targetY: 170,
          width: 180,
          height: 40,
          rotation: 0,
        },
        {
          id: "ribcage",
          name: "Ribcage",
          path: "dino-ribcage",
          x: 400,
          y: 370,
          targetX: 250,
          targetY: 200,
          width: 100,
          height: 80,
          rotation: 0,
        },
        {
          id: "front-leg",
          name: "Front Leg",
          path: "dino-front-leg",
          x: 100,
          y: 380,
          targetX: 200,
          targetY: 280,
          width: 40,
          height: 90,
          rotation: 0,
        },
        {
          id: "back-leg",
          name: "Back Leg",
          path: "dino-back-leg",
          x: 200,
          y: 380,
          targetX: 380,
          targetY: 260,
          width: 60,
          height: 110,
          rotation: 0,
        },
        {
          id: "tail",
          name: "Tail",
          path: "dino-tail",
          x: 480,
          y: 320,
          targetX: 480,
          targetY: 180,
          width: 100,
          height: 50,
          rotation: 0,
        },
      ],
    },
    // Level 4 - Human skeleton
    {
      name: "Human",
      parts: [
        {
          id: "skull",
          name: "Skull",
          path: "human-skull",
          x: 50,
          y: 330,
          targetX: 290,
          targetY: 60,
          width: 60,
          height: 70,
          rotation: 0,
        },
        {
          id: "spine",
          name: "Spine",
          path: "human-spine",
          x: 150,
          y: 350,
          targetX: 290,
          targetY: 180,
          width: 30,
          height: 120,
          rotation: 0,
        },
        {
          id: "ribcage",
          name: "Ribcage",
          path: "human-ribcage",
          x: 250,
          y: 340,
          targetX: 290,
          targetY: 150,
          width: 100,
          height: 80,
          rotation: 0,
        },
        {
          id: "pelvis",
          name: "Pelvis",
          path: "human-pelvis",
          x: 380,
          y: 350,
          targetX: 290,
          targetY: 250,
          width: 80,
          height: 50,
          rotation: 0,
        },
        {
          id: "left-arm",
          name: "Left Arm",
          path: "human-arm",
          x: 450,
          y: 320,
          targetX: 210,
          targetY: 180,
          width: 30,
          height: 100,
          rotation: 0,
        },
        {
          id: "right-arm",
          name: "Right Arm",
          path: "human-arm",
          x: 500,
          y: 370,
          targetX: 370,
          targetY: 180,
          width: 30,
          height: 100,
          rotation: 0,
        },
        {
          id: "left-leg",
          name: "Left Leg",
          path: "human-leg",
          x: 100,
          y: 380,
          targetX: 260,
          targetY: 330,
          width: 35,
          height: 120,
          rotation: 0,
        },
        {
          id: "right-leg",
          name: "Right Leg",
          path: "human-leg",
          x: 180,
          y: 380,
          targetX: 320,
          targetY: 330,
          width: 35,
          height: 120,
          rotation: 0,
        },
      ],
    },
    // Level 5 - Snake skeleton
    {
      name: "Snake",
      parts: [
        {
          id: "skull",
          name: "Skull",
          path: "snake-skull",
          x: 50,
          y: 320,
          targetX: 80,
          targetY: 200,
          width: 50,
          height: 40,
          rotation: 0,
        },
        {
          id: "seg1",
          name: "Segment 1",
          path: "snake-segment",
          x: 130,
          y: 350,
          targetX: 140,
          targetY: 190,
          width: 70,
          height: 30,
          rotation: 0,
        },
        {
          id: "seg2",
          name: "Segment 2",
          path: "snake-segment",
          x: 220,
          y: 320,
          targetX: 210,
          targetY: 210,
          width: 70,
          height: 30,
          rotation: 0,
        },
        {
          id: "seg3",
          name: "Segment 3",
          path: "snake-segment",
          x: 310,
          y: 350,
          targetX: 280,
          targetY: 200,
          width: 70,
          height: 30,
          rotation: 0,
        },
        {
          id: "seg4",
          name: "Segment 4",
          path: "snake-segment",
          x: 400,
          y: 320,
          targetX: 350,
          targetY: 220,
          width: 70,
          height: 30,
          rotation: 0,
        },
        {
          id: "seg5",
          name: "Segment 5",
          path: "snake-segment",
          x: 490,
          y: 350,
          targetX: 420,
          targetY: 210,
          width: 70,
          height: 30,
          rotation: 0,
        },
        {
          id: "tail",
          name: "Tail",
          path: "snake-tail",
          x: 550,
          y: 320,
          targetX: 490,
          targetY: 200,
          width: 50,
          height: 25,
          rotation: 0,
        },
      ],
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

    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (this.status !== "playing") return;

      const pos = getPos(e);

      // Find part under cursor (from top to bottom by z-order)
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const part = this.parts[i];
        if (part.placed) continue;

        if (this.isPointInPart(pos.x, pos.y, part)) {
          this.draggedPart = part;
          this.dragOffset = {
            x: pos.x - part.x,
            y: pos.y - part.y,
          };

          // Move to top
          this.parts.splice(i, 1);
          this.parts.push(part);
          break;
        }
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.draggedPart) return;
      e.preventDefault();

      const pos = getPos(e);
      this.draggedPart.x = pos.x - this.dragOffset.x;
      this.draggedPart.y = pos.y - this.dragOffset.y;
      this.draw();
    };

    const handleEnd = () => {
      if (!this.draggedPart) return;

      // Check if close to target
      const dx = this.draggedPart.x - this.draggedPart.targetX;
      const dy = this.draggedPart.y - this.draggedPart.targetY;
      const dist = Math.hypot(dx, dy);

      if (dist < this.snapDistance) {
        this.draggedPart.x = this.draggedPart.targetX;
        this.draggedPart.y = this.draggedPart.targetY;
        this.draggedPart.placed = true;

        if (this.onStateChange) {
          const placed = this.parts.filter((p) => p.placed).length;
          this.onStateChange({ pieces: `${placed}/${this.parts.length}` });
        }

        this.checkWin();
      }

      this.draggedPart = null;
      this.draw();
    };

    this.canvas.addEventListener("mousedown", handleStart);
    this.canvas.addEventListener("mousemove", handleMove);
    this.canvas.addEventListener("mouseup", handleEnd);
    this.canvas.addEventListener("mouseleave", handleEnd);

    this.canvas.addEventListener("touchstart", handleStart, { passive: false });
    this.canvas.addEventListener("touchmove", handleMove, { passive: false });
    this.canvas.addEventListener("touchend", handleEnd);
  }

  private isPointInPart(px: number, py: number, part: BonePart): boolean {
    return (
      px >= part.x - part.width / 2 &&
      px <= part.x + part.width / 2 &&
      py >= part.y - part.height / 2 &&
      py <= part.y + part.height / 2
    );
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.draw();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.parts = config.parts.map((p) => ({
      ...p,
      placed: false,
    }));

    // Shuffle initial positions
    this.parts.forEach((part) => {
      part.x = 50 + Math.random() * (this.canvas.width - 100);
      part.y = 320 + Math.random() * 80;
    });

    if (this.onStateChange) {
      this.onStateChange({ pieces: `0/${this.parts.length}` });
    }
  }

  private checkWin() {
    if (this.parts.every((p) => p.placed)) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({ status: "won" });
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Assembly area
    ctx.fillStyle = "#252540";
    ctx.fillRect(20, 20, w - 40, 280);
    ctx.strokeStyle = "#3a3a5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, 280);

    // Draw target outlines (ghost bones)
    this.parts.forEach((part) => {
      if (!part.placed) {
        this.drawBoneOutline(ctx, part.targetX, part.targetY, part);
      }
    });

    // Parts area
    ctx.fillStyle = "#16162a";
    ctx.fillRect(20, 310, w - 40, h - 330);
    ctx.strokeStyle = "#2a2a4a";
    ctx.strokeRect(20, 310, w - 40, h - 330);

    // Draw parts
    this.parts.forEach((part) => {
      this.drawBone(ctx, part.x, part.y, part, part === this.draggedPart);
    });
  }

  private drawBoneOutline(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    part: BonePart
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((part.rotation * Math.PI) / 180);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;

    // Draw simplified bone shape based on type
    this.drawBoneShape(ctx, part, true);

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawBone(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    part: BonePart,
    isDragging: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((part.rotation * Math.PI) / 180);

    if (isDragging) {
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 20;
    }

    // Draw bone
    ctx.fillStyle = part.placed ? "#f5f5dc" : "#e8e8d0";
    ctx.strokeStyle = part.placed ? "#a0a080" : "#c0c0a0";
    ctx.lineWidth = 2;

    this.drawBoneShape(ctx, part, false);

    ctx.restore();
  }

  private drawBoneShape(
    ctx: CanvasRenderingContext2D,
    part: BonePart,
    outlineOnly: boolean
  ) {
    const w = part.width;
    const h = part.height;

    ctx.beginPath();

    if (part.path.includes("skull")) {
      // Skull shape - rounded top, jaw at bottom
      ctx.ellipse(0, -h * 0.1, w * 0.45, h * 0.4, 0, 0, Math.PI * 2);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Eye sockets
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(-w * 0.15, -h * 0.15, w * 0.08, 0, Math.PI * 2);
        ctx.arc(w * 0.15, -h * 0.15, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("spine")) {
      // Spine - series of vertebrae
      const segments = Math.floor(w / 20);
      for (let i = 0; i < segments; i++) {
        const sx = -w / 2 + i * (w / segments) + w / segments / 2;
        ctx.moveTo(sx - 8, 0);
        ctx.lineTo(sx + 8, 0);
        ctx.lineTo(sx + 6, -h * 0.4);
        ctx.lineTo(sx - 6, -h * 0.4);
        ctx.closePath();
      }
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("ribcage")) {
      // Ribcage
      ctx.ellipse(0, 0, w * 0.4, h * 0.45, 0, 0, Math.PI * 2);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Ribs
        ctx.strokeStyle = "#c0c0a0";
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * (h * 0.1));
          ctx.quadraticCurveTo(w * 0.3, i * (h * 0.12), w * 0.35, i * (h * 0.08));
          ctx.moveTo(0, i * (h * 0.1));
          ctx.quadraticCurveTo(-w * 0.3, i * (h * 0.12), -w * 0.35, i * (h * 0.08));
          ctx.stroke();
        }
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("leg") || part.path.includes("arm")) {
      // Long bone
      ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.3);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Joint ends
        ctx.beginPath();
        ctx.ellipse(0, -h / 2 + w * 0.3, w * 0.4, w * 0.25, 0, 0, Math.PI * 2);
        ctx.ellipse(0, h / 2 - w * 0.3, w * 0.4, w * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("tail")) {
      // Tapered tail
      ctx.moveTo(-w / 2, 0);
      ctx.quadraticCurveTo(-w / 4, -h / 2, 0, -h * 0.3);
      ctx.quadraticCurveTo(w / 4, -h / 4, w / 2, 0);
      ctx.quadraticCurveTo(w / 4, h / 4, 0, h * 0.3);
      ctx.quadraticCurveTo(-w / 4, h / 2, -w / 2, 0);
      ctx.closePath();
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("fin")) {
      // Fin shape
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Fin rays
        ctx.beginPath();
        for (let i = 1; i < 5; i++) {
          const fx = -w / 2 + (w / 5) * i;
          ctx.moveTo(fx, h / 2 - 5);
          ctx.lineTo(fx * 0.8, -h / 2 + 10);
        }
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("wing")) {
      // Wing bone structure
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(0, -h / 2);
      ctx.lineTo(w / 2, -h / 4);
      ctx.lineTo(w / 2, h / 4);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("beak")) {
      // Beak
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("pelvis")) {
      // Pelvis shape
      ctx.ellipse(0, 0, w * 0.45, h * 0.4, 0, 0, Math.PI * 2);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Hip sockets
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(-w * 0.25, h * 0.1, w * 0.1, 0, Math.PI * 2);
        ctx.arc(w * 0.25, h * 0.1, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("segment")) {
      // Snake segment
      ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.4);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Vertebra detail
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, 0);
        ctx.lineTo(w * 0.3, 0);
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("neck")) {
      // Neck vertebrae
      ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.3);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    } else if (part.path.includes("head")) {
      // Generic head
      ctx.ellipse(0, 0, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
        // Eye
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(w * 0.15, -h * 0.1, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else {
      // Default rectangle
      ctx.roundRect(-w / 2, -h / 2, w, h, 5);
      if (!outlineOnly) {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.stroke();
      }
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = Math.min(600, rect.width - 20);
      this.canvas.height = 450;
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

  public getPiecesPlaced(): string {
    const placed = this.parts.filter((p) => p.placed).length;
    return `${placed}/${this.parts.length}`;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }
}
