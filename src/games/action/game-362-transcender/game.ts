/**
 * Transcender Game Engine
 * Game #362
 *
 * Break the limits between dimensions!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  dimension: number;
  shifting: boolean;
  shiftTimer: number;
  transcendPower: number;
}

interface Entity {
  x: number;
  y: number;
  dimension: number;
  type: "energy" | "rift" | "void";
  radius: number;
  value: number;
}

interface RiftEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
}

interface GameState {
  transcend: number;
  dimension: number;
  score: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class TranscenderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private entities: Entity[] = [];
  private rifts: RiftEffect[] = [];
  private score = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private spawnTimer = 0;
  private dimensionColors = ["#a080ff", "#00ffc8", "#ff8040", "#ff40a0"];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 0,
      y: 0,
      width: 30,
      height: 30,
      dimension: 0,
      shifting: false,
      shiftTimer: 0,
      transcendPower: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        transcend: Math.floor(this.player.transcendPower),
        dimension: this.player.dimension + 1,
        score: this.score,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.draw();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }

  shift() {
    if (this.status !== "playing") return;
    if (this.player.shifting) return;

    this.player.shifting = true;
    this.player.shiftTimer = 30;
    this.player.dimension = (this.player.dimension + 1) % 4;

    // Create rift effect
    this.rifts.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      radius: 10,
      maxRadius: 80,
    });

    this.emitState();
  }

  start() {
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height / 2 - this.player.height / 2;
    this.entities = [];
    this.rifts = [];
    this.score = 0;
    this.keys.clear();
    this.spawnTimer = 0;
    this.status = "playing";

    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.updatePlayer();
    this.updateEntities();
    this.updateRifts();
    this.spawnEntities();
    this.checkCollisions();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const speed = this.player.shifting ? 8 : 5;
    const p = this.player;

    if (this.keys.has("up")) p.y -= speed;
    if (this.keys.has("down")) p.y += speed;
    if (this.keys.has("left")) p.x -= speed;
    if (this.keys.has("right")) p.x += speed;

    // Bounds
    p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));
    p.y = Math.max(0, Math.min(this.canvas.height - p.height, p.y));

    // Shift timer
    if (p.shifting) {
      p.shiftTimer--;
      if (p.shiftTimer <= 0) {
        p.shifting = false;
      }
    }

    // Transcend power decay
    if (p.transcendPower > 0) {
      p.transcendPower -= 0.1;
    }
  }

  private updateEntities() {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];

      // Move entities
      if (e.type === "rift") {
        e.y += 1;
      } else if (e.type === "void") {
        // Void entities move towards player
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          e.x += (dx / dist) * 0.5;
          e.y += (dy / dist) * 0.5;
        }
      }

      // Remove off-screen
      if (e.y > this.canvas.height + 50 || e.y < -50 ||
          e.x > this.canvas.width + 50 || e.x < -50) {
        this.entities.splice(i, 1);
      }
    }
  }

  private updateRifts() {
    for (let i = this.rifts.length - 1; i >= 0; i--) {
      const r = this.rifts[i];
      r.radius += 5;

      if (r.radius >= r.maxRadius) {
        this.rifts.splice(i, 1);
      }
    }
  }

  private spawnEntities() {
    this.spawnTimer++;

    // Spawn energy orbs
    if (this.spawnTimer % 30 === 0) {
      this.entities.push({
        x: 30 + Math.random() * (this.canvas.width - 60),
        y: -20,
        dimension: Math.floor(Math.random() * 4),
        type: "energy",
        radius: 15,
        value: 10,
      });
    }

    // Spawn rifts
    if (this.spawnTimer % 60 === 0) {
      this.entities.push({
        x: 30 + Math.random() * (this.canvas.width - 60),
        y: -20,
        dimension: Math.floor(Math.random() * 4),
        type: "rift",
        radius: 25,
        value: -20,
      });
    }

    // Spawn void entities
    if (this.spawnTimer % 120 === 0) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      switch (side) {
        case 0: x = Math.random() * this.canvas.width; y = -30; break;
        case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
        case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
        default: x = -30; y = Math.random() * this.canvas.height;
      }

      this.entities.push({
        x,
        y,
        dimension: this.player.dimension, // Same dimension as player
        type: "void",
        radius: 20,
        value: -30,
      });
    }
  }

  private checkCollisions() {
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < e.radius + 15) {
        // Same dimension or shifting
        if (e.dimension === this.player.dimension || this.player.shifting) {
          if (e.type === "energy") {
            this.score += e.value;
            this.player.transcendPower = Math.min(100, this.player.transcendPower + 5);
            this.entities.splice(i, 1);
          } else if (e.type === "rift" && !this.player.shifting) {
            this.player.transcendPower += e.value;
            this.entities.splice(i, 1);
          } else if (e.type === "void" && !this.player.shifting) {
            this.player.transcendPower += e.value;
            this.entities.splice(i, 1);
          }
        }
      }
    }
  }

  private checkGameOver() {
    if (this.player.transcendPower <= -100) {
      this.status = "over";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);

    // Dimension grid
    this.drawDimensionGrid();

    // Draw rifts
    for (const r of this.rifts) {
      this.drawRift(r);
    }

    // Draw entities
    for (const e of this.entities) {
      this.drawEntity(e);
    }

    // Draw player
    this.drawPlayer();

    // Transcend bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    const transcendWidth = Math.max(0, Math.min(100, 50 + this.player.transcendPower / 2));
    ctx.fillStyle = this.player.transcendPower >= 0 ? "#a080ff" : "#ff4040";
    ctx.fillRect(10, 10, transcendWidth, 15);

    // Dimension indicator
    ctx.fillStyle = this.dimensionColors[this.player.dimension];
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Dimension ${this.player.dimension + 1}`, w - 10, 22);
  }

  private drawDimensionGrid() {
    const ctx = this.ctx;
    const color = this.dimensionColors[this.player.dimension];

    ctx.strokeStyle = color.replace(")", ", 0.1)").replace("rgb", "rgba");
    ctx.lineWidth = 1;

    const gridSize = 50;
    const offset = (Date.now() / 50) % gridSize;

    for (let x = offset; x < this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    for (let y = offset; y < this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const color = this.dimensionColors[p.dimension];

    // Shifting aura
    if (p.shifting) {
      for (let i = 0; i < 4; i++) {
        const dimColor = this.dimensionColors[i];
        ctx.strokeStyle = dimColor.replace(")", ", 0.3)").replace("rgb", "rgba");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + i * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Outer glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    gradient.addColorStop(0, color.replace(")", ", 0.5)").replace("rgb", "rgba"));
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();

    // Inner light
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEntity(e: Entity) {
    const ctx = this.ctx;
    const color = this.dimensionColors[e.dimension];

    // Only show entities in current dimension or when shifting
    const visible = e.dimension === this.player.dimension || this.player.shifting;
    const alpha = visible ? 1 : 0.2;

    if (e.type === "energy") {
      // Energy orb
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      gradient.addColorStop(0, color.replace(")", `, ${alpha})`).replace("rgb", "rgba"));
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "rift") {
      // Dangerous rift
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(100, 0, 0, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Void entity
      ctx.fillStyle = `rgba(30, 0, 50, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(100, 0, 150, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Eye
      ctx.fillStyle = `rgba(255, 0, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRift(r: RiftEffect) {
    const ctx = this.ctx;
    const alpha = 1 - r.radius / r.maxRadius;

    for (let i = 0; i < 4; i++) {
      const color = this.dimensionColors[i];
      ctx.strokeStyle = color.replace(")", `, ${alpha * 0.5})`).replace("rgb", "rgba");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius - i * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
