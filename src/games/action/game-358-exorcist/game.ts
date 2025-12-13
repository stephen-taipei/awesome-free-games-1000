/**
 * Exorcist Game Engine
 * Game #358
 *
 * Banish evil spirits with holy power!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  facing: "left" | "right";
}

interface Spirit {
  x: number;
  y: number;
  type: "ghost" | "demon" | "shade";
  health: number;
  maxHealth: number;
  speed: number;
  possessed: boolean;
}

interface HolyWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  damage: number;
}

interface GameState {
  faith: number;
  souls: number;
  score: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class ExorcistGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private spirits: Spirit[] = [];
  private holyWaves: HolyWave[] = [];
  private faith = 100;
  private souls = 0;
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private spawnTimer = 0;
  private faithRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, width: 35, height: 50, facing: "right" };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        faith: Math.floor(this.faith),
        souls: this.souls,
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
    this.player.y = this.canvas.height - 80;
    this.draw();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }

  exorcise() {
    if (this.status !== "playing" || this.faith < 20) return;

    this.faith -= 20;
    this.holyWaves.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      radius: 10,
      maxRadius: 150,
      damage: 30 + this.souls * 2,
    });

    this.emitState();
  }

  start() {
    this.faith = 100;
    this.souls = 0;
    this.score = 0;
    this.wave = 1;
    this.spirits = [];
    this.holyWaves = [];
    this.keys.clear();
    this.spawnTimer = 0;
    this.faithRegenTimer = 0;
    this.status = "playing";

    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 80;

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
    this.updateSpirits();
    this.updateHolyWaves();
    this.spawnSpirits();
    this.regenFaith();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const speed = 5;

    if (this.keys.has("left")) {
      this.player.x -= speed;
      this.player.facing = "left";
    }
    if (this.keys.has("right")) {
      this.player.x += speed;
      this.player.facing = "right";
    }

    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
  }

  private updateSpirits() {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    for (let i = this.spirits.length - 1; i >= 0; i--) {
      const s = this.spirits[i];

      // Move towards player
      const dx = playerCenterX - s.x;
      const dy = playerCenterY - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 30) {
        // Ghosts float in wavy pattern
        if (s.type === "ghost") {
          s.x += (dx / dist) * s.speed;
          s.y += (dy / dist) * s.speed + Math.sin(Date.now() / 200 + i) * 0.5;
        } else {
          s.x += (dx / dist) * s.speed;
          s.y += (dy / dist) * s.speed;
        }
      } else {
        // Attack player
        this.faith -= s.type === "demon" ? 0.5 : 0.3;
      }

      // Remove banished spirits
      if (s.health <= 0) {
        this.spirits.splice(i, 1);
        this.souls++;
        this.score += s.type === "demon" ? 30 : s.type === "shade" ? 20 : 10;
        this.score *= this.wave;
      }
    }
  }

  private updateHolyWaves() {
    for (let i = this.holyWaves.length - 1; i >= 0; i--) {
      const wave = this.holyWaves[i];
      wave.radius += 8;

      // Check hits
      for (const s of this.spirits) {
        const dx = s.x - wave.x;
        const dy = s.y - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= wave.radius && dist > wave.radius - 10) {
          s.health -= wave.damage;
        }
      }

      // Remove expired waves
      if (wave.radius >= wave.maxRadius) {
        this.holyWaves.splice(i, 1);
      }
    }
  }

  private spawnSpirits() {
    this.spawnTimer++;
    const spawnRate = Math.max(50, 120 - this.wave * 8);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      const types: Spirit["type"][] = ["ghost", "ghost", "shade", "demon"];
      const type = types[Math.floor(Math.random() * (this.wave > 3 ? 4 : 2))];

      // Spawn from top or sides
      let x, y;
      const side = Math.floor(Math.random() * 3);
      if (side === 0) {
        x = Math.random() * this.canvas.width;
        y = -30;
      } else if (side === 1) {
        x = -30;
        y = Math.random() * this.canvas.height * 0.6;
      } else {
        x = this.canvas.width + 30;
        y = Math.random() * this.canvas.height * 0.6;
      }

      const baseHealth = type === "demon" ? 80 : type === "shade" ? 50 : 30;
      const speed = type === "ghost" ? 2 : type === "demon" ? 1.2 : 1.5;

      this.spirits.push({
        x,
        y,
        type,
        health: baseHealth + this.wave * 5,
        maxHealth: baseHealth + this.wave * 5,
        speed: speed + this.wave * 0.05,
        possessed: false,
      });

      if (this.souls > 0 && this.souls % 15 === 0) {
        this.wave++;
      }
    }
  }

  private regenFaith() {
    this.faithRegenTimer++;
    if (this.faithRegenTimer >= 60) {
      this.faithRegenTimer = 0;
      this.faith = Math.min(100, this.faith + 2 + this.souls * 0.1);
    }
  }

  private checkGameOver() {
    if (this.faith <= 0) {
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
    ctx.fillStyle = "#0a0505";
    ctx.fillRect(0, 0, w, h);

    // Candle light effect from player
    const lightGradient = ctx.createRadialGradient(
      this.player.x + this.player.width / 2,
      this.player.y,
      0,
      this.player.x + this.player.width / 2,
      this.player.y,
      200
    );
    lightGradient.addColorStop(0, "rgba(255, 200, 100, 0.15)");
    lightGradient.addColorStop(1, "transparent");
    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw ground
    ctx.fillStyle = "#1a0a0a";
    ctx.fillRect(0, h - 30, w, 30);

    // Draw holy waves
    for (const wave of this.holyWaves) {
      this.drawHolyWave(wave);
    }

    // Draw spirits
    for (const s of this.spirits) {
      this.drawSpirit(s);
    }

    // Draw player
    this.drawPlayer();

    // Faith bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(10, 10, this.faith, 15);

    // Wave indicator
    ctx.fillStyle = "#da70d6";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Wave ${this.wave}`, w - 10, 22);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    // Holy aura
    const auraGradient = ctx.createRadialGradient(
      p.x + p.width / 2, p.y + p.height / 2, 0,
      p.x + p.width / 2, p.y + p.height / 2, 40
    );
    auraGradient.addColorStop(0, "rgba(255, 215, 0, 0.3)");
    auraGradient.addColorStop(1, "transparent");
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 40, 0, Math.PI * 2);
    ctx.fill();

    // Robe
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 15);
    ctx.lineTo(p.x + p.width + 5, p.y + p.height);
    ctx.lineTo(p.x - 5, p.y + p.height);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = "#f5deb3";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cross
    ctx.fillStyle = "#ffd700";
    const crossX = p.facing === "right" ? p.x + p.width + 5 : p.x - 15;
    ctx.fillRect(crossX, p.y + 15, 4, 25);
    ctx.fillRect(crossX - 6, p.y + 22, 16, 4);
  }

  private drawSpirit(s: Spirit) {
    const ctx = this.ctx;

    if (s.type === "ghost") {
      // Translucent floating ghost
      ctx.fillStyle = "rgba(180, 180, 220, 0.5)";
      ctx.beginPath();
      ctx.arc(s.x, s.y - 10, 15, Math.PI, 0);
      ctx.lineTo(s.x + 15, s.y + 15);
      ctx.quadraticCurveTo(s.x + 10, s.y + 10, s.x + 5, s.y + 15);
      ctx.quadraticCurveTo(s.x, s.y + 10, s.x - 5, s.y + 15);
      ctx.quadraticCurveTo(s.x - 10, s.y + 10, s.x - 15, s.y + 15);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.beginPath();
      ctx.ellipse(s.x - 5, s.y - 10, 2, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(s.x + 5, s.y - 10, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.type === "shade") {
      // Dark shadowy figure
      ctx.fillStyle = "rgba(30, 0, 30, 0.8)";
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 18, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = "#ff00ff";
      ctx.beginPath();
      ctx.arc(s.x - 6, s.y - 5, 3, 0, Math.PI * 2);
      ctx.arc(s.x + 6, s.y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Demon - red and menacing
      ctx.fillStyle = "#4a0000";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.fillStyle = "#2d0000";
      ctx.beginPath();
      ctx.moveTo(s.x - 15, s.y - 10);
      ctx.lineTo(s.x - 20, s.y - 30);
      ctx.lineTo(s.x - 8, s.y - 15);
      ctx.moveTo(s.x + 15, s.y - 10);
      ctx.lineTo(s.x + 20, s.y - 30);
      ctx.lineTo(s.x + 8, s.y - 15);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(s.x - 6, s.y - 3, 4, 0, Math.PI * 2);
      ctx.arc(s.x + 6, s.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(s.x - 15, s.y - 35, 30, 4);
    ctx.fillStyle = "#da70d6";
    ctx.fillRect(s.x - 15, s.y - 35, (s.health / s.maxHealth) * 30, 4);
  }

  private drawHolyWave(wave: HolyWave) {
    const ctx = this.ctx;
    const alpha = 1 - wave.radius / wave.maxRadius;

    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius - 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
