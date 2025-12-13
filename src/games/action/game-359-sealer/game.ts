/**
 * Sealer Game Engine
 * Game #359
 *
 * Seal away ancient evils with magic circles!
 */

interface Seal {
  x: number;
  y: number;
  radius: number;
  power: number;
  duration: number;
  maxDuration: number;
  active: boolean;
}

interface Enemy {
  x: number;
  y: number;
  type: "demon" | "beast" | "titan";
  health: number;
  maxHealth: number;
  speed: number;
  sealed: boolean;
  sealProgress: number;
}

interface Rune {
  x: number;
  y: number;
  angle: number;
  type: number;
}

interface GameState {
  mana: number;
  seals: number;
  score: number;
  status: "idle" | "playing" | "charging" | "over";
}

type StateCallback = (state: GameState) => void;

export class SealerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private seals: Seal[] = [];
  private enemies: Enemy[] = [];
  private runes: Rune[] = [];
  private mana = 100;
  private sealCount = 0;
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private spawnTimer = 0;
  private manaRegenTimer = 0;
  private chargeStart = 0;
  private chargeX = 0;
  private chargeY = 0;
  private portalY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        mana: Math.floor(this.mana),
        seals: this.sealCount,
        score: this.score,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.portalY = this.canvas.height - 50;
    this.draw();
  }

  startCharge(x: number, y: number) {
    if (this.status !== "playing" || this.mana < 10) return;

    const rect = this.canvas.getBoundingClientRect();
    this.chargeX = ((x - rect.left) / rect.width) * this.canvas.width;
    this.chargeY = ((y - rect.top) / rect.height) * this.canvas.height;
    this.chargeStart = Date.now();
    this.status = "charging";
    this.emitState();
  }

  endCharge() {
    if (this.status !== "charging") return;

    const chargeTime = Date.now() - this.chargeStart;
    const power = Math.min(100, 20 + chargeTime / 20);
    const manaCost = 10 + power / 2;

    if (this.mana >= manaCost) {
      this.mana -= manaCost;
      this.placeSeal(this.chargeX, this.chargeY, power);
    }

    this.status = "playing";
    this.emitState();
  }

  private placeSeal(x: number, y: number, power: number) {
    const radius = 30 + power * 0.5;
    const duration = 180 + power * 2;

    this.seals.push({
      x,
      y,
      radius,
      power,
      duration,
      maxDuration: duration,
      active: true,
    });

    this.sealCount++;

    // Add decorative runes
    for (let i = 0; i < 6; i++) {
      this.runes.push({
        x,
        y,
        angle: (i / 6) * Math.PI * 2,
        type: Math.floor(Math.random() * 4),
      });
    }
  }

  start() {
    this.mana = 100;
    this.sealCount = 0;
    this.score = 0;
    this.wave = 1;
    this.seals = [];
    this.enemies = [];
    this.runes = [];
    this.spawnTimer = 0;
    this.manaRegenTimer = 0;
    this.status = "playing";

    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status === "over") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.updateSeals();
    this.updateEnemies();
    this.updateRunes();
    this.spawnEnemies();
    this.regenMana();
    this.checkGameOver();
    this.emitState();
  }

  private updateSeals() {
    for (let i = this.seals.length - 1; i >= 0; i--) {
      const seal = this.seals[i];
      seal.duration--;

      if (seal.duration <= 0) {
        seal.active = false;
        this.seals.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Check if in seal
      let inSeal = false;
      for (const seal of this.seals) {
        if (!seal.active) continue;
        const dx = e.x - seal.x;
        const dy = e.y - seal.y;
        if (Math.sqrt(dx * dx + dy * dy) < seal.radius) {
          inSeal = true;
          e.sealed = true;
          e.sealProgress += seal.power / 100;

          if (e.sealProgress >= 100) {
            // Enemy sealed!
            this.enemies.splice(i, 1);
            this.score += (e.type === "titan" ? 50 : e.type === "beast" ? 30 : 20) * this.wave;
            continue;
          }
          break;
        }
      }

      if (!inSeal) {
        e.sealed = false;
        e.sealProgress = Math.max(0, e.sealProgress - 0.5);

        // Move towards portal
        e.y += e.speed;
      }

      // Remove if reached portal
      if (e.y >= this.portalY) {
        this.enemies.splice(i, 1);
        this.mana -= e.type === "titan" ? 30 : e.type === "beast" ? 20 : 15;
      }
    }
  }

  private updateRunes() {
    for (let i = this.runes.length - 1; i >= 0; i--) {
      this.runes[i].angle += 0.02;

      // Remove runes from expired seals
      let hasParentSeal = false;
      for (const seal of this.seals) {
        const dx = this.runes[i].x - seal.x;
        const dy = this.runes[i].y - seal.y;
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          hasParentSeal = true;
          break;
        }
      }
      if (!hasParentSeal) {
        this.runes.splice(i, 1);
      }
    }
  }

  private spawnEnemies() {
    this.spawnTimer++;
    const spawnRate = Math.max(40, 100 - this.wave * 5);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      const types: Enemy["type"][] = ["demon", "demon", "beast", "titan"];
      const type = types[Math.floor(Math.random() * (this.wave > 2 ? 4 : 2))];

      const x = 50 + Math.random() * (this.canvas.width - 100);
      const speed = type === "titan" ? 0.5 : type === "beast" ? 1 : 0.8;

      this.enemies.push({
        x,
        y: -30,
        type,
        health: 100,
        maxHealth: 100,
        speed: speed + this.wave * 0.05,
        sealed: false,
        sealProgress: 0,
      });

      if (this.sealCount > 0 && this.sealCount % 10 === 0) {
        this.wave++;
      }
    }
  }

  private regenMana() {
    this.manaRegenTimer++;
    if (this.manaRegenTimer >= 30) {
      this.manaRegenTimer = 0;
      this.mana = Math.min(100, this.mana + 1);
    }
  }

  private checkGameOver() {
    if (this.mana <= 0) {
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
    ctx.fillStyle = "#050a15";
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 97) % w;
      const sy = (i * 61) % (h * 0.7);
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Portal at bottom
    this.drawPortal();

    // Draw seals
    for (const seal of this.seals) {
      this.drawSeal(seal);
    }

    // Draw runes
    for (const rune of this.runes) {
      this.drawRune(rune);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw charge indicator
    if (this.status === "charging") {
      const chargeTime = Date.now() - this.chargeStart;
      const power = Math.min(100, 20 + chargeTime / 20);
      const radius = 30 + power * 0.5;

      ctx.strokeStyle = `rgba(0, 191, 255, ${0.3 + power / 200})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.chargeX, this.chargeY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Power indicator
      ctx.fillStyle = "#00bfff";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(power)}%`, this.chargeX, this.chargeY);
    }

    // Mana bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = "#00bfff";
    ctx.fillRect(10, 10, this.mana, 15);

    // Wave indicator
    ctx.fillStyle = "#9370db";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Wave ${this.wave}`, w - 10, 22);
  }

  private drawPortal() {
    const ctx = this.ctx;
    const w = this.canvas.width;

    // Portal glow
    const gradient = ctx.createLinearGradient(0, this.portalY - 30, 0, this.portalY + 20);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.5, "rgba(138, 43, 226, 0.3)");
    gradient.addColorStop(1, "rgba(138, 43, 226, 0.5)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, this.portalY - 30, w, 50);

    // Portal line
    ctx.strokeStyle = "#8a2be2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.portalY);
    ctx.lineTo(w, this.portalY);
    ctx.stroke();
  }

  private drawSeal(seal: Seal) {
    const ctx = this.ctx;
    const alpha = seal.duration / seal.maxDuration;

    // Outer circle
    ctx.strokeStyle = `rgba(0, 191, 255, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(seal.x, seal.y, seal.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner pattern
    ctx.strokeStyle = `rgba(147, 112, 219, ${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(seal.x, seal.y, seal.radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Core glow
    const gradient = ctx.createRadialGradient(
      seal.x, seal.y, 0,
      seal.x, seal.y, seal.radius
    );
    gradient.addColorStop(0, `rgba(0, 191, 255, ${alpha * 0.3})`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(seal.x, seal.y, seal.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hexagram
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Date.now() / 2000;
      const x1 = seal.x + Math.cos(angle) * seal.radius * 0.5;
      const y1 = seal.y + Math.sin(angle) * seal.radius * 0.5;
      const x2 = seal.x + Math.cos(angle + Math.PI) * seal.radius * 0.5;
      const y2 = seal.y + Math.sin(angle + Math.PI) * seal.radius * 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private drawRune(rune: Rune) {
    const ctx = this.ctx;
    const x = rune.x + Math.cos(rune.angle) * 40;
    const y = rune.y + Math.sin(rune.angle) * 40;

    ctx.fillStyle = "rgba(0, 191, 255, 0.8)";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const symbols = ["*", "+", "o", "x"];
    ctx.fillText(symbols[rune.type], x, y);
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Seal effect
    if (e.sealed) {
      ctx.strokeStyle = "rgba(0, 191, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 25, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.type === "demon") {
      ctx.fillStyle = e.sealed ? "#3a0a0a" : "#8b0000";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.fillStyle = e.sealed ? "#2a0505" : "#5a0000";
      ctx.beginPath();
      ctx.moveTo(e.x - 12, e.y - 10);
      ctx.lineTo(e.x - 8, e.y - 25);
      ctx.lineTo(e.x - 4, e.y - 10);
      ctx.moveTo(e.x + 12, e.y - 10);
      ctx.lineTo(e.x + 8, e.y - 25);
      ctx.lineTo(e.x + 4, e.y - 10);
      ctx.fill();
    } else if (e.type === "beast") {
      ctx.fillStyle = e.sealed ? "#2a2a1a" : "#4a4a2a";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = e.sealed ? "#444" : "#ff0";
      ctx.beginPath();
      ctx.arc(e.x - 8, e.y - 3, 4, 0, Math.PI * 2);
      ctx.arc(e.x + 8, e.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Titan
      ctx.fillStyle = e.sealed ? "#1a1a2a" : "#2a2a4a";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 28, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = e.sealed ? "#333" : "#f00";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Seal progress bar
    if (e.sealProgress > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(e.x - 20, e.y - 35, 40, 6);
      ctx.fillStyle = "#00bfff";
      ctx.fillRect(e.x - 20, e.y - 35, (e.sealProgress / 100) * 40, 6);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
