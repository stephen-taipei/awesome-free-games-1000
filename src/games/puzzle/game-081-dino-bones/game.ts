/**
 * Dino Bones Game Engine
 * Game #081 - Assemble dinosaur skeletons
 */

interface Bone {
  id: string;
  name: string;
  // Current position (draggable)
  x: number;
  y: number;
  // Target position (where it should snap)
  targetX: number;
  targetY: number;
  // Drawing info
  path: { x: number; y: number }[];
  width: number;
  height: number;
  rotation: number;
  placed: boolean;
}

interface Dinosaur {
  name: string;
  bones: Omit<Bone, "x" | "y" | "placed">[];
}

// T-Rex skeleton defined by bone paths
const DINOSAURS: Dinosaur[] = [
  {
    name: "T-Rex",
    bones: [
      // Skull
      {
        id: "skull",
        name: "Skull",
        targetX: 500,
        targetY: 120,
        width: 100,
        height: 60,
        rotation: 0,
        path: [
          { x: 0, y: 20 },
          { x: 30, y: 0 },
          { x: 80, y: 5 },
          { x: 100, y: 25 },
          { x: 95, y: 45 },
          { x: 70, y: 55 },
          { x: 40, y: 60 },
          { x: 10, y: 50 },
          { x: 0, y: 35 },
        ],
      },
      // Spine
      {
        id: "spine",
        name: "Spine",
        targetX: 350,
        targetY: 140,
        width: 150,
        height: 30,
        rotation: 0,
        path: [
          { x: 0, y: 15 },
          { x: 150, y: 15 },
        ],
      },
      // Ribcage
      {
        id: "ribcage",
        name: "Ribcage",
        targetX: 320,
        targetY: 180,
        width: 100,
        height: 80,
        rotation: 0,
        path: [
          { x: 20, y: 0 },
          { x: 0, y: 40 },
          { x: 20, y: 80 },
          { x: 80, y: 80 },
          { x: 100, y: 40 },
          { x: 80, y: 0 },
        ],
      },
      // Tail
      {
        id: "tail",
        name: "Tail",
        targetX: 150,
        targetY: 160,
        width: 120,
        height: 40,
        rotation: 0,
        path: [
          { x: 0, y: 30 },
          { x: 40, y: 10 },
          { x: 80, y: 15 },
          { x: 120, y: 20 },
        ],
      },
      // Left Arm
      {
        id: "leftArm",
        name: "Left Arm",
        targetX: 420,
        targetY: 200,
        width: 40,
        height: 50,
        rotation: 0,
        path: [
          { x: 20, y: 0 },
          { x: 5, y: 25 },
          { x: 0, y: 50 },
          { x: 15, y: 45 },
          { x: 25, y: 50 },
          { x: 35, y: 30 },
        ],
      },
      // Right Leg
      {
        id: "rightLeg",
        name: "Right Leg",
        targetX: 380,
        targetY: 280,
        width: 50,
        height: 120,
        rotation: 0,
        path: [
          { x: 25, y: 0 },
          { x: 10, y: 50 },
          { x: 0, y: 100 },
          { x: 20, y: 120 },
          { x: 50, y: 115 },
          { x: 40, y: 90 },
          { x: 35, y: 50 },
        ],
      },
      // Left Leg
      {
        id: "leftLeg",
        name: "Left Leg",
        targetX: 300,
        targetY: 280,
        width: 50,
        height: 120,
        rotation: 0,
        path: [
          { x: 25, y: 0 },
          { x: 40, y: 50 },
          { x: 50, y: 100 },
          { x: 30, y: 120 },
          { x: 0, y: 115 },
          { x: 10, y: 90 },
          { x: 15, y: 50 },
        ],
      },
      // Pelvis
      {
        id: "pelvis",
        name: "Pelvis",
        targetX: 280,
        targetY: 240,
        width: 80,
        height: 50,
        rotation: 0,
        path: [
          { x: 0, y: 25 },
          { x: 20, y: 0 },
          { x: 60, y: 0 },
          { x: 80, y: 25 },
          { x: 60, y: 50 },
          { x: 20, y: 50 },
        ],
      },
    ],
  },
  {
    name: "Stegosaurus",
    bones: [
      // Skull
      {
        id: "skull",
        name: "Skull",
        targetX: 100,
        targetY: 200,
        width: 70,
        height: 45,
        rotation: 0,
        path: [
          { x: 0, y: 20 },
          { x: 20, y: 10 },
          { x: 50, y: 15 },
          { x: 70, y: 25 },
          { x: 60, y: 40 },
          { x: 30, y: 45 },
          { x: 5, y: 35 },
        ],
      },
      // Spine
      {
        id: "spine",
        name: "Spine",
        targetX: 250,
        targetY: 180,
        width: 200,
        height: 25,
        rotation: 0,
        path: [
          { x: 0, y: 12 },
          { x: 200, y: 12 },
        ],
      },
      // Plates
      {
        id: "plates",
        name: "Back Plates",
        targetX: 280,
        targetY: 130,
        width: 150,
        height: 60,
        rotation: 0,
        path: [
          { x: 20, y: 60 },
          { x: 10, y: 30 },
          { x: 25, y: 0 },
          { x: 40, y: 30 },
          { x: 55, y: 0 },
          { x: 70, y: 30 },
          { x: 95, y: 0 },
          { x: 110, y: 30 },
          { x: 125, y: 0 },
          { x: 140, y: 30 },
          { x: 130, y: 60 },
        ],
      },
      // Body
      {
        id: "body",
        name: "Body",
        targetX: 250,
        targetY: 220,
        width: 160,
        height: 80,
        rotation: 0,
        path: [
          { x: 0, y: 40 },
          { x: 30, y: 10 },
          { x: 130, y: 10 },
          { x: 160, y: 40 },
          { x: 130, y: 70 },
          { x: 30, y: 70 },
        ],
      },
      // Tail with spikes
      {
        id: "tail",
        name: "Tail",
        targetX: 450,
        targetY: 180,
        width: 100,
        height: 60,
        rotation: 0,
        path: [
          { x: 0, y: 30 },
          { x: 50, y: 25 },
          { x: 80, y: 0 },
          { x: 100, y: 20 },
          { x: 95, y: 40 },
          { x: 100, y: 60 },
          { x: 80, y: 50 },
          { x: 50, y: 35 },
        ],
      },
      // Front legs
      {
        id: "frontLegs",
        name: "Front Legs",
        targetX: 180,
        targetY: 280,
        width: 60,
        height: 100,
        rotation: 0,
        path: [
          { x: 15, y: 0 },
          { x: 5, y: 50 },
          { x: 0, y: 100 },
          { x: 20, y: 95 },
          { x: 40, y: 100 },
          { x: 55, y: 50 },
          { x: 45, y: 0 },
        ],
      },
      // Back legs
      {
        id: "backLegs",
        name: "Back Legs",
        targetX: 350,
        targetY: 280,
        width: 80,
        height: 110,
        rotation: 0,
        path: [
          { x: 20, y: 0 },
          { x: 5, y: 55 },
          { x: 0, y: 110 },
          { x: 25, y: 105 },
          { x: 55, y: 105 },
          { x: 80, y: 110 },
          { x: 75, y: 55 },
          { x: 60, y: 0 },
        ],
      },
    ],
  },
];

export class DinoBoneGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  bones: Bone[] = [];
  currentDino: number = 0;

  draggingBone: Bone | null = null;
  dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  placedCount: number = 0;
  status: "playing" | "won" = "playing";

  snapDistance: number = 30;

  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public start() {
    this.currentDino = 0;
    this.loadDinosaur(this.currentDino);
    this.loop();
  }

  public loadDinosaur(index: number) {
    const dino = DINOSAURS[index] || DINOSAURS[0];
    this.bones = dino.bones.map((b) => ({
      ...b,
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 300,
      placed: false,
    }));

    // Shuffle bone positions
    this.shuffleBones();

    this.placedCount = 0;
    this.status = "playing";
    this.notifyState();
  }

  private shuffleBones() {
    // Place bones randomly on the left side
    const margin = 30;
    this.bones.forEach((bone, i) => {
      bone.x = margin + (i % 2) * 80;
      bone.y = margin + Math.floor(i / 2) * 80 + Math.random() * 20;
    });
  }

  private loop = () => {
    this.draw();
    if (this.status === "playing") {
      requestAnimationFrame(this.loop);
    }
  };

  public handleInput(type: "down" | "move" | "up", x: number, y: number) {
    if (this.status !== "playing") return;

    if (type === "down") {
      // Find bone under cursor (reverse order for top-most)
      for (let i = this.bones.length - 1; i >= 0; i--) {
        const bone = this.bones[i];
        if (!bone.placed && this.isPointInBone(x, y, bone)) {
          this.draggingBone = bone;
          this.dragOffset = { x: x - bone.x, y: y - bone.y };
          // Move to top
          this.bones.splice(i, 1);
          this.bones.push(bone);
          break;
        }
      }
    } else if (type === "move" && this.draggingBone) {
      this.draggingBone.x = x - this.dragOffset.x;
      this.draggingBone.y = y - this.dragOffset.y;
    } else if (type === "up" && this.draggingBone) {
      // Check if close to target
      const bone = this.draggingBone;
      const dist = Math.hypot(
        bone.x + bone.width / 2 - bone.targetX - bone.width / 2,
        bone.y + bone.height / 2 - bone.targetY - bone.height / 2
      );

      if (dist < this.snapDistance) {
        // Snap to position
        bone.x = bone.targetX;
        bone.y = bone.targetY;
        bone.placed = true;
        this.placedCount++;
        this.checkWin();
      }

      this.draggingBone = null;
      this.notifyState();
    }
  }

  private isPointInBone(x: number, y: number, bone: Bone): boolean {
    // Simple bounding box check
    return (
      x >= bone.x &&
      x <= bone.x + bone.width &&
      y >= bone.y &&
      y <= bone.y + bone.height
    );
  }

  private checkWin() {
    if (this.placedCount >= this.bones.length) {
      this.status = "won";
      this.notifyState();
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background texture
    this.drawBackground();

    // Draw target silhouettes (ghost bones)
    this.drawTargetSilhouettes();

    // Draw bones
    this.bones.forEach((bone) => this.drawBone(bone));
  }

  private drawBackground() {
    // Sand/dirt texture
    this.ctx.fillStyle = "#e8d5b5";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add some texture dots
    this.ctx.fillStyle = "rgba(139, 105, 20, 0.1)";
    for (let i = 0; i < 100; i++) {
      const x = (i * 37) % this.canvas.width;
      const y = (i * 53) % this.canvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Grid lines for excavation site look
    this.ctx.strokeStyle = "rgba(139, 105, 20, 0.15)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawTargetSilhouettes() {
    this.bones.forEach((bone) => {
      if (!bone.placed) {
        this.ctx.save();
        this.ctx.translate(bone.targetX, bone.targetY);
        this.ctx.rotate(bone.rotation);

        // Draw ghost outline
        this.ctx.strokeStyle = "rgba(139, 105, 20, 0.3)";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        if (bone.path.length > 0) {
          this.ctx.moveTo(bone.path[0].x, bone.path[0].y);
          for (let i = 1; i < bone.path.length; i++) {
            this.ctx.lineTo(bone.path[i].x, bone.path[i].y);
          }
          this.ctx.closePath();
        }
        this.ctx.stroke();

        this.ctx.setLineDash([]);
        this.ctx.restore();
      }
    });
  }

  private drawBone(bone: Bone) {
    this.ctx.save();
    this.ctx.translate(bone.x, bone.y);
    this.ctx.rotate(bone.rotation);

    // Bone color
    const isBeingDragged = this.draggingBone === bone;
    if (bone.placed) {
      this.ctx.fillStyle = "#f5f5dc";
      this.ctx.strokeStyle = "#8b8378";
    } else if (isBeingDragged) {
      this.ctx.fillStyle = "#fffacd";
      this.ctx.strokeStyle = "#daa520";
      // Glow effect
      this.ctx.shadowColor = "#daa520";
      this.ctx.shadowBlur = 15;
    } else {
      this.ctx.fillStyle = "#faf0e6";
      this.ctx.strokeStyle = "#a0937d";
    }

    this.ctx.lineWidth = 3;

    // Draw bone shape
    this.ctx.beginPath();
    if (bone.path.length > 0) {
      this.ctx.moveTo(bone.path[0].x, bone.path[0].y);
      for (let i = 1; i < bone.path.length; i++) {
        this.ctx.lineTo(bone.path[i].x, bone.path[i].y);
      }
      this.ctx.closePath();
    }
    this.ctx.fill();
    this.ctx.stroke();

    // Add bone texture/cracks
    this.ctx.strokeStyle = "rgba(139, 131, 120, 0.3)";
    this.ctx.lineWidth = 1;
    // Random crack lines
    const cx = bone.width / 2;
    const cy = bone.height / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 10, cy);
    this.ctx.lineTo(cx + 10, cy + 5);
    this.ctx.moveTo(cx, cy - 10);
    this.ctx.lineTo(cx + 5, cy + 10);
    this.ctx.stroke();

    this.ctx.restore();
  }

  public nextDinosaur() {
    if (this.currentDino < DINOSAURS.length - 1) {
      this.currentDino++;
      this.loadDinosaur(this.currentDino);
      this.loop();
    }
  }

  public resize() {
    if (this.canvas.parentElement) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 450;
    }
  }

  public reset() {
    this.loadDinosaur(this.currentDino);
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
      const dino = DINOSAURS[this.currentDino];
      this.onStateChange({
        dinoName: dino.name,
        placedCount: this.placedCount,
        totalBones: this.bones.length,
        status: this.status,
        maxDinos: DINOSAURS.length,
        currentDino: this.currentDino + 1,
      });
    }
  }
}
