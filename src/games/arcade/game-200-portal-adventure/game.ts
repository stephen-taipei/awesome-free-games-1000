/**
 * Portal Adventure Game Engine
 * Game #200 - Platform game with portal teleportation
 */

export interface Portal {
  x: number;
  y: number;
  color: string;
  pairId: number;
}

export interface LevelConfig {
  platforms: { x: number; y: number; w: number; h: number }[];
  portals: Portal[];
  keys: { x: number; y: number }[];
  spikes: { x: number; y: number; w: number }[];
  door: { x: number; y: number };
  playerStart: { x: number; y: number };
}

export class PortalAdventureGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player = {
    x: 50,
    y: 300,
    vx: 0,
    vy: 0,
    width: 24,
    height: 24,
    grounded: false,
  };

  private platforms: { x: number; y: number; w: number; h: number }[] = [];
  private portals: Portal[] = [];
  private keys: { x: number; y: number; collected: boolean }[] = [];
  private spikes: { x: number; y: number; w: number }[] = [];
  private door = { x: 450, y: 320 };

  private inputKeys: Record<string, boolean> = {};
  private gravity = 0.6;
  private jumpForce = -12;
  private moveSpeed = 4;

  private collectedKeys = 0;
  private requiredKeys = 0;
  private teleportCooldown = 0;

  private currentLevel = 0;
  private status: "idle" | "playing" | "won" | "lost" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;

  private levels: LevelConfig[] = [
    // Level 1 - Simple portal intro
    {
      platforms: [
        { x: 0, y: 360, w: 200, h: 40 },
        { x: 300, y: 360, w: 200, h: 40 },
      ],
      portals: [
        { x: 170, y: 320, color: "#00bcd4", pairId: 1 },
        { x: 310, y: 320, color: "#00bcd4", pairId: 1 },
      ],
      keys: [{ x: 400, y: 320 }],
      spikes: [],
      door: { x: 50, y: 312 },
      playerStart: { x: 80, y: 310 },
    },
    // Level 2 - Vertical portals
    {
      platforms: [
        { x: 0, y: 360, w: 500, h: 40 },
        { x: 200, y: 200, w: 100, h: 20 },
        { x: 350, y: 280, w: 100, h: 20 },
      ],
      portals: [
        { x: 50, y: 320, color: "#ff9800", pairId: 1 },
        { x: 220, y: 160, color: "#ff9800", pairId: 1 },
        { x: 280, y: 160, color: "#4caf50", pairId: 2 },
        { x: 370, y: 240, color: "#4caf50", pairId: 2 },
      ],
      keys: [
        { x: 250, y: 170 },
        { x: 400, y: 250 },
      ],
      spikes: [],
      door: { x: 450, y: 312 },
      playerStart: { x: 80, y: 310 },
    },
    // Level 3 - With spikes
    {
      platforms: [
        { x: 0, y: 360, w: 150, h: 40 },
        { x: 200, y: 360, w: 100, h: 40 },
        { x: 350, y: 360, w: 150, h: 40 },
        { x: 100, y: 250, w: 120, h: 20 },
        { x: 300, y: 180, w: 100, h: 20 },
      ],
      portals: [
        { x: 120, y: 320, color: "#e91e63", pairId: 1 },
        { x: 120, y: 210, color: "#e91e63", pairId: 1 },
        { x: 200, y: 210, color: "#9c27b0", pairId: 2 },
        { x: 320, y: 140, color: "#9c27b0", pairId: 2 },
      ],
      keys: [
        { x: 160, y: 220 },
        { x: 350, y: 150 },
      ],
      spikes: [
        { x: 150, y: 345, w: 50 },
        { x: 300, y: 345, w: 50 },
      ],
      door: { x: 420, y: 312 },
      playerStart: { x: 50, y: 310 },
    },
    // Level 4 - Multi-portal chain
    {
      platforms: [
        { x: 0, y: 360, w: 100, h: 40 },
        { x: 150, y: 300, w: 80, h: 20 },
        { x: 280, y: 240, w: 80, h: 20 },
        { x: 150, y: 180, w: 80, h: 20 },
        { x: 280, y: 120, w: 80, h: 20 },
        { x: 400, y: 360, w: 100, h: 40 },
      ],
      portals: [
        { x: 70, y: 320, color: "#2196f3", pairId: 1 },
        { x: 160, y: 260, color: "#2196f3", pairId: 1 },
        { x: 210, y: 260, color: "#ff5722", pairId: 2 },
        { x: 290, y: 200, color: "#ff5722", pairId: 2 },
        { x: 340, y: 200, color: "#8bc34a", pairId: 3 },
        { x: 160, y: 140, color: "#8bc34a", pairId: 3 },
        { x: 210, y: 140, color: "#ffc107", pairId: 4 },
        { x: 290, y: 80, color: "#ffc107", pairId: 4 },
      ],
      keys: [
        { x: 190, y: 270 },
        { x: 320, y: 210 },
        { x: 190, y: 150 },
        { x: 320, y: 90 },
      ],
      spikes: [
        { x: 100, y: 345, w: 50 },
        { x: 350, y: 345, w: 50 },
      ],
      door: { x: 430, y: 312 },
      playerStart: { x: 30, y: 310 },
    },
    // Level 5 - Ultimate challenge
    {
      platforms: [
        { x: 0, y: 360, w: 80, h: 40 },
        { x: 130, y: 320, w: 60, h: 20 },
        { x: 240, y: 280, w: 60, h: 20 },
        { x: 130, y: 220, w: 60, h: 20 },
        { x: 350, y: 200, w: 60, h: 20 },
        { x: 240, y: 140, w: 60, h: 20 },
        { x: 130, y: 100, w: 60, h: 20 },
        { x: 420, y: 360, w: 80, h: 40 },
      ],
      portals: [
        { x: 60, y: 320, color: "#00bcd4", pairId: 1 },
        { x: 140, y: 280, color: "#00bcd4", pairId: 1 },
        { x: 170, y: 280, color: "#e91e63", pairId: 2 },
        { x: 250, y: 240, color: "#e91e63", pairId: 2 },
        { x: 280, y: 240, color: "#4caf50", pairId: 3 },
        { x: 140, y: 180, color: "#4caf50", pairId: 3 },
        { x: 170, y: 180, color: "#ff9800", pairId: 4 },
        { x: 360, y: 160, color: "#ff9800", pairId: 4 },
        { x: 390, y: 160, color: "#9c27b0", pairId: 5 },
        { x: 250, y: 100, color: "#9c27b0", pairId: 5 },
        { x: 280, y: 100, color: "#f44336", pairId: 6 },
        { x: 140, y: 60, color: "#f44336", pairId: 6 },
      ],
      keys: [
        { x: 160, y: 290 },
        { x: 270, y: 250 },
        { x: 160, y: 190 },
        { x: 380, y: 170 },
        { x: 270, y: 110 },
        { x: 160, y: 70 },
      ],
      spikes: [
        { x: 80, y: 345, w: 50 },
        { x: 200, y: 345, w: 140 },
        { x: 370, y: 345, w: 50 },
      ],
      door: { x: 440, y: 312 },
      playerStart: { x: 30, y: 310 },
    },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener("keydown", (e) => {
      this.inputKeys[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.inputKeys[e.key.toLowerCase()] = false;
    });
  }

  public start(level?: number) {
    this.currentLevel = level ?? this.currentLevel;
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
  }

  private loadLevel(levelIndex: number) {
    const config = this.levels[levelIndex % this.levels.length];
    this.platforms = config.platforms.map((p) => ({ ...p }));
    this.portals = config.portals.map((p) => ({ ...p }));
    this.keys = config.keys.map((k) => ({ ...k, collected: false }));
    this.spikes = config.spikes.map((s) => ({ ...s }));
    this.door = { ...config.door };

    this.player.x = config.playerStart.x;
    this.player.y = config.playerStart.y;
    this.player.vx = 0;
    this.player.vy = 0;

    this.collectedKeys = 0;
    this.requiredKeys = config.keys.length;
    this.teleportCooldown = 0;

    this.updateState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Horizontal movement
    if (this.inputKeys["a"] || this.inputKeys["arrowleft"]) {
      this.player.vx = -this.moveSpeed;
    } else if (this.inputKeys["d"] || this.inputKeys["arrowright"]) {
      this.player.vx = this.moveSpeed;
    } else {
      this.player.vx = 0;
    }

    // Jump
    if ((this.inputKeys["w"] || this.inputKeys["arrowup"] || this.inputKeys[" "]) && this.player.grounded) {
      this.player.vy = this.jumpForce;
      this.player.grounded = false;
    }

    // Apply gravity
    this.player.vy += this.gravity;

    // Move player
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Platform collision
    this.player.grounded = false;
    for (const plat of this.platforms) {
      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        plat.x, plat.y, plat.w, plat.h
      )) {
        // Landing on top
        if (this.player.vy > 0 && this.player.y + this.player.height - this.player.vy <= plat.y + 5) {
          this.player.y = plat.y - this.player.height;
          this.player.vy = 0;
          this.player.grounded = true;
        }
        // Hitting bottom
        else if (this.player.vy < 0 && this.player.y - this.player.vy >= plat.y + plat.h - 5) {
          this.player.y = plat.y + plat.h;
          this.player.vy = 0;
        }
        // Side collision
        else if (this.player.vx > 0) {
          this.player.x = plat.x - this.player.width;
        } else if (this.player.vx < 0) {
          this.player.x = plat.x + plat.w;
        }
      }
    }

    // Boundary check
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));

    // Fall death
    if (this.player.y > this.canvas.height + 50) {
      this.die();
      return;
    }

    // Spike collision
    for (const spike of this.spikes) {
      if (this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        spike.x, spike.y, spike.w, 15
      )) {
        this.die();
        return;
      }
    }

    // Portal teleportation
    if (this.teleportCooldown > 0) {
      this.teleportCooldown--;
    } else {
      for (const portal of this.portals) {
        if (this.rectIntersect(
          this.player.x, this.player.y, this.player.width, this.player.height,
          portal.x - 15, portal.y - 20, 30, 40
        )) {
          // Find paired portal
          const pair = this.portals.find(
            (p) => p.pairId === portal.pairId && p !== portal
          );
          if (pair) {
            this.player.x = pair.x - this.player.width / 2;
            this.player.y = pair.y - this.player.height / 2;
            this.teleportCooldown = 30;
            break;
          }
        }
      }
    }

    // Key collection
    for (const key of this.keys) {
      if (!key.collected && this.rectIntersect(
        this.player.x, this.player.y, this.player.width, this.player.height,
        key.x - 12, key.y - 12, 24, 24
      )) {
        key.collected = true;
        this.collectedKeys++;
        this.updateState();
      }
    }

    // Door check
    if (this.collectedKeys >= this.requiredKeys && this.rectIntersect(
      this.player.x, this.player.y, this.player.width, this.player.height,
      this.door.x, this.door.y, 30, 48
    )) {
      this.win();
    }
  }

  private rectIntersect(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private die() {
    this.status = "lost";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "lost" });
    }
  }

  private win() {
    this.status = "won";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "won" });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        keys: this.collectedKeys,
        totalKeys: this.requiredKeys,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw platforms
    for (const plat of this.platforms) {
      ctx.fillStyle = "#3d3d5c";
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = "#5a5a7a";
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Draw spikes
    for (const spike of this.spikes) {
      this.drawSpikes(ctx, spike);
    }

    // Draw portals
    for (const portal of this.portals) {
      this.drawPortal(ctx, portal);
    }

    // Draw keys
    for (const key of this.keys) {
      if (!key.collected) {
        this.drawKey(ctx, key.x, key.y);
      }
    }

    // Draw door
    this.drawDoor(ctx);

    // Draw player
    this.drawPlayer(ctx);
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, spike: { x: number; y: number; w: number }) {
    ctx.fillStyle = "#ff4444";
    const spikeWidth = 12;
    const spikeHeight = 15;

    for (let i = spike.x; i < spike.x + spike.w; i += spikeWidth) {
      ctx.beginPath();
      ctx.moveTo(i, spike.y + spikeHeight);
      ctx.lineTo(i + spikeWidth / 2, spike.y);
      ctx.lineTo(i + spikeWidth, spike.y + spikeHeight);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawPortal(ctx: CanvasRenderingContext2D, portal: Portal) {
    const time = this.frameCount * 0.1;
    const pulse = Math.sin(time) * 3;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      portal.x, portal.y, 0,
      portal.x, portal.y, 25 + pulse
    );
    gradient.addColorStop(0, portal.color);
    gradient.addColorStop(0.5, portal.color + "80");
    gradient.addColorStop(1, portal.color + "00");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 15 + pulse, 25 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner portal
    ctx.fillStyle = portal.color;
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Swirl effect
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, 5, 10, time, 0, Math.PI);
    ctx.stroke();
  }

  private drawKey(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const bounce = Math.sin(this.frameCount * 0.1) * 3;
    const ky = y + bounce;

    ctx.fillStyle = "#ffd700";

    // Key head
    ctx.beginPath();
    ctx.arc(x, ky - 5, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(x, ky - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Key shaft
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x - 2, ky, 4, 12);

    // Key teeth
    ctx.fillRect(x, ky + 6, 5, 3);
    ctx.fillRect(x, ky + 10, 3, 2);
  }

  private drawDoor(ctx: CanvasRenderingContext2D) {
    const doorOpen = this.collectedKeys >= this.requiredKeys;

    // Door frame
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(this.door.x - 5, this.door.y - 5, 40, 53);

    // Door
    ctx.fillStyle = doorOpen ? "#4caf50" : "#8d6e63";
    ctx.fillRect(this.door.x, this.door.y, 30, 48);

    // Door handle
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(this.door.x + 24, this.door.y + 25, 3, 0, Math.PI * 2);
    ctx.fill();

    // Lock indicator
    if (!doorOpen) {
      ctx.fillStyle = "#f44336";
      ctx.beginPath();
      ctx.arc(this.door.x + 15, this.door.y + 15, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔒", this.door.x + 15, this.door.y + 18);
    } else {
      // Glow effect
      const gradient = ctx.createRadialGradient(
        this.door.x + 15, this.door.y + 24, 0,
        this.door.x + 15, this.door.y + 24, 30
      );
      gradient.addColorStop(0, "rgba(76, 175, 80, 0.5)");
      gradient.addColorStop(1, "rgba(76, 175, 80, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(this.door.x - 15, this.door.y - 10, 60, 70);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    // Teleport effect
    if (this.teleportCooldown > 20) {
      ctx.fillStyle = `rgba(0, 188, 212, ${(this.teleportCooldown - 20) / 10})`;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = "#00bcd4";
    ctx.fillRect(p.x + 4, p.y + 8, 16, 14);

    // Head
    ctx.fillStyle = "#ffcc99";
    ctx.fillRect(p.x + 6, p.y, 12, 10);

    // Eyes
    ctx.fillStyle = "#000";
    ctx.fillRect(p.x + 8, p.y + 3, 2, 2);
    ctx.fillRect(p.x + 14, p.y + 3, 2, 2);

    // Legs
    ctx.fillStyle = "#1565c0";
    ctx.fillRect(p.x + 6, p.y + 20, 4, 4);
    ctx.fillRect(p.x + 14, p.y + 20, 4, 4);
  }

  public resize() {
    this.canvas.width = 500;
    this.canvas.height = 400;
    this.draw();
  }

  public reset() {
    this.loadLevel(this.currentLevel);
    this.status = "playing";
    this.gameLoop();
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

  public getKeys(): number {
    return this.collectedKeys;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
