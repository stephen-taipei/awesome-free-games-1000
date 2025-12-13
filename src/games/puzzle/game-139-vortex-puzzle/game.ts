/**
 * Vortex Puzzle Game
 * Game #139 - Rotate spiral rings to guide orbs to center
 */

interface Orb {
  ring: number;
  slot: number;
  color: string;
}

interface Ring {
  slots: number;
  rotation: number; // current rotation in degrees
  gaps: number[]; // slot indices that have gaps (allow movement inward)
}

interface Level {
  rings: Ring[];
  orbs: Orb[];
  targetRing: number; // usually 0 (center)
}

const ORB_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];

const LEVELS: Level[] = [
  // Level 1: Simple - one orb, one ring
  {
    rings: [
      { slots: 4, rotation: 0, gaps: [0] },
      { slots: 8, rotation: 0, gaps: [0, 4] },
    ],
    orbs: [{ ring: 1, slot: 2, color: ORB_COLORS[0] }],
    targetRing: 0,
  },
  // Level 2: Two orbs
  {
    rings: [
      { slots: 4, rotation: 0, gaps: [0, 2] },
      { slots: 8, rotation: 0, gaps: [0, 2, 4, 6] },
    ],
    orbs: [
      { ring: 1, slot: 1, color: ORB_COLORS[0] },
      { ring: 1, slot: 5, color: ORB_COLORS[1] },
    ],
    targetRing: 0,
  },
  // Level 3: Three rings
  {
    rings: [
      { slots: 4, rotation: 0, gaps: [0] },
      { slots: 8, rotation: 0, gaps: [0, 4] },
      { slots: 12, rotation: 0, gaps: [0, 3, 6, 9] },
    ],
    orbs: [
      { ring: 2, slot: 1, color: ORB_COLORS[0] },
      { ring: 2, slot: 7, color: ORB_COLORS[1] },
    ],
    targetRing: 0,
  },
  // Level 4: More orbs
  {
    rings: [
      { slots: 4, rotation: 0, gaps: [0, 1, 2, 3] },
      { slots: 8, rotation: 0, gaps: [0, 2, 4, 6] },
      { slots: 12, rotation: 0, gaps: [0, 3, 6, 9] },
    ],
    orbs: [
      { ring: 2, slot: 1, color: ORB_COLORS[0] },
      { ring: 2, slot: 4, color: ORB_COLORS[1] },
      { ring: 2, slot: 7, color: ORB_COLORS[2] },
      { ring: 2, slot: 10, color: ORB_COLORS[3] },
    ],
    targetRing: 0,
  },
  // Level 5: Four rings
  {
    rings: [
      { slots: 4, rotation: 0, gaps: [0, 2] },
      { slots: 8, rotation: 0, gaps: [0, 2, 4, 6] },
      { slots: 12, rotation: 0, gaps: [0, 3, 6, 9] },
      { slots: 16, rotation: 0, gaps: [0, 4, 8, 12] },
    ],
    orbs: [
      { ring: 3, slot: 2, color: ORB_COLORS[0] },
      { ring: 3, slot: 6, color: ORB_COLORS[1] },
      { ring: 3, slot: 10, color: ORB_COLORS[2] },
      { ring: 3, slot: 14, color: ORB_COLORS[3] },
    ],
    targetRing: 0,
  },
  // Level 6: Complex
  {
    rings: [
      { slots: 6, rotation: 0, gaps: [0, 2, 4] },
      { slots: 12, rotation: 0, gaps: [0, 2, 4, 6, 8, 10] },
      { slots: 18, rotation: 0, gaps: [0, 3, 6, 9, 12, 15] },
    ],
    orbs: [
      { ring: 2, slot: 1, color: ORB_COLORS[0] },
      { ring: 2, slot: 4, color: ORB_COLORS[1] },
      { ring: 2, slot: 7, color: ORB_COLORS[2] },
      { ring: 2, slot: 10, color: ORB_COLORS[3] },
      { ring: 2, slot: 13, color: ORB_COLORS[4] },
      { ring: 2, slot: 16, color: ORB_COLORS[0] },
    ],
    targetRing: 0,
  },
];

export class VortexPuzzleGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  currentLevel: number = 0;
  rings: Ring[] = [];
  orbs: Orb[] = [];
  moves: number = 0;

  status: "playing" | "won" | "complete" = "playing";
  onStateChange: ((state: any) => void) | null = null;

  private animating: boolean = false;
  private centerX: number = 0;
  private centerY: number = 0;
  private maxRadius: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.maxRadius = Math.min(this.width, this.height) * 0.4;

    this.render();
  }

  public start() {
    this.loadLevel(this.currentLevel);
  }

  private loadLevel(levelIndex: number) {
    if (levelIndex >= LEVELS.length) {
      this.status = "complete";
      if (this.onStateChange) {
        this.onStateChange({
          status: "complete",
          level: levelIndex + 1,
          moves: this.moves,
        });
      }
      return;
    }

    const level = LEVELS[levelIndex];
    this.rings = level.rings.map((r) => ({ ...r, rotation: 0 }));
    this.orbs = level.orbs.map((o) => ({ ...o }));
    this.moves = 0;
    this.status = "playing";
    this.animating = false;

    this.render();

    if (this.onStateChange) {
      this.onStateChange({
        status: "playing",
        level: levelIndex + 1,
        moves: 0,
      });
    }
  }

  public handleClick(x: number, y: number, isRightClick: boolean = false) {
    if (this.status !== "playing" || this.animating) return;

    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Find which ring was clicked
    const ringWidth = this.maxRadius / (this.rings.length + 1);

    for (let i = 0; i < this.rings.length; i++) {
      const innerR = ringWidth * (i + 0.5);
      const outerR = ringWidth * (i + 1.5);

      if (distance >= innerR && distance <= outerR) {
        this.rotateRing(i, isRightClick ? -1 : 1);
        return;
      }
    }
  }

  private rotateRing(ringIndex: number, direction: number) {
    const ring = this.rings[ringIndex];
    const targetRotation = ring.rotation + direction * (360 / ring.slots);

    this.animating = true;
    this.moves++;

    const animate = () => {
      const diff = targetRotation - ring.rotation;
      if (Math.abs(diff) < 1) {
        ring.rotation = targetRotation % 360;
        this.animating = false;
        this.checkOrbMovement();
        this.render();
        this.checkWin();

        if (this.onStateChange) {
          this.onStateChange({
            status: this.status,
            level: this.currentLevel + 1,
            moves: this.moves,
          });
        }
      } else {
        ring.rotation += diff * 0.2;
        this.render();
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private checkOrbMovement() {
    // Check if any orb can move inward through a gap
    let moved = true;
    while (moved) {
      moved = false;
      this.orbs.forEach((orb) => {
        if (orb.ring <= LEVELS[this.currentLevel].targetRing) return;

        const currentRing = this.rings[orb.ring];
        const innerRing = this.rings[orb.ring - 1];

        // Calculate actual slot position considering rotation
        const actualSlot = this.getActualSlot(orb.slot, currentRing);

        // Check if there's a gap at this position
        if (currentRing.gaps.includes(actualSlot)) {
          // Find corresponding slot in inner ring
          const innerSlot = this.getInnerSlot(actualSlot, currentRing, innerRing);

          // Check if inner ring has a gap at this position
          const innerActualSlot = this.getActualSlot(innerSlot, innerRing);
          if (innerRing.gaps.includes(innerActualSlot)) {
            // Check if slot is empty
            const occupied = this.orbs.some(
              (o) => o !== orb && o.ring === orb.ring - 1 && o.slot === innerSlot
            );

            if (!occupied) {
              orb.ring--;
              orb.slot = innerSlot;
              moved = true;
            }
          }
        }
      });
    }
  }

  private getActualSlot(slot: number, ring: Ring): number {
    const slotsRotated = Math.round((ring.rotation / 360) * ring.slots);
    return (slot - slotsRotated + ring.slots * 100) % ring.slots;
  }

  private getInnerSlot(outerSlot: number, outerRing: Ring, innerRing: Ring): number {
    const angle = (outerSlot / outerRing.slots) * 360;
    return Math.round((angle / 360) * innerRing.slots) % innerRing.slots;
  }

  private checkWin() {
    const targetRing = LEVELS[this.currentLevel].targetRing;
    const allAtTarget = this.orbs.every((orb) => orb.ring <= targetRing);

    if (allAtTarget) {
      this.status = "won";
      if (this.onStateChange) {
        this.onStateChange({
          status: "won",
          level: this.currentLevel + 1,
          moves: this.moves,
        });
      }
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    const bgGrad = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      0,
      this.centerX,
      this.centerY,
      this.maxRadius * 1.5
    );
    bgGrad.addColorStop(0, "#1a1a2e");
    bgGrad.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw rings
    const ringWidth = this.maxRadius / (this.rings.length + 1);

    // Draw center target
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, ringWidth * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#27ae60";
    ctx.fill();
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw each ring
    this.rings.forEach((ring, i) => {
      const innerR = ringWidth * (i + 0.5);
      const outerR = ringWidth * (i + 1.5);
      const midR = (innerR + outerR) / 2;

      // Ring background
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, outerR, 0, Math.PI * 2);
      ctx.arc(this.centerX, this.centerY, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = `rgba(52, 73, 94, ${0.3 + i * 0.1})`;
      ctx.fill();

      ctx.strokeStyle = "#3498db";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw slots and gaps
      for (let s = 0; s < ring.slots; s++) {
        const angle = (s / ring.slots) * Math.PI * 2 + (ring.rotation * Math.PI) / 180;
        const slotX = this.centerX + Math.cos(angle) * midR;
        const slotY = this.centerY + Math.sin(angle) * midR;

        // Check if this is a gap
        if (ring.gaps.includes(s)) {
          // Draw gap indicator
          ctx.beginPath();
          ctx.arc(slotX, slotY, ringWidth * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
          ctx.fill();
          ctx.strokeStyle = "#2ecc71";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Draw slot marker
          ctx.beginPath();
          ctx.arc(slotX, slotY, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#7f8c8d";
          ctx.fill();
        }
      }
    });

    // Draw orbs
    this.orbs.forEach((orb) => {
      const ring = this.rings[orb.ring];
      const ringWidth2 = this.maxRadius / (this.rings.length + 1);
      const midR = ringWidth2 * (orb.ring + 1);
      const angle = (orb.slot / ring.slots) * Math.PI * 2 + (ring.rotation * Math.PI) / 180;

      const orbX = this.centerX + Math.cos(angle) * midR;
      const orbY = this.centerY + Math.sin(angle) * midR;

      // Glow
      const glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, ringWidth2 * 0.3);
      glow.addColorStop(0, orb.color);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(orbX, orbY, ringWidth2 * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Orb
      ctx.beginPath();
      ctx.arc(orbX, orbY, ringWidth2 * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = orb.color;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(orbX - 4, orbY - 4, ringWidth2 * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill();
    });

    // Draw center orbs (completed)
    const centerOrbs = this.orbs.filter((o) => o.ring <= 0);
    centerOrbs.forEach((orb, i) => {
      const angle = (i / Math.max(centerOrbs.length, 1)) * Math.PI * 2;
      const r = ringWidth * 0.2;
      const orbX = this.centerX + Math.cos(angle) * r;
      const orbY = this.centerY + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.arc(orbX, orbY, ringWidth * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = orb.color;
      ctx.fill();
    });
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
