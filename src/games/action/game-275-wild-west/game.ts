/**
 * Wild West Game Engine
 * Game #275
 *
 * Shoot bandits, reload, survive waves!
 */

interface Target {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "bandit" | "civilian" | "barrel";
  health: number;
  visible: boolean;
  hideTimer: number;
  showDuration: number;
}

interface Bullet {
  x: number;
  y: number;
  hit: boolean;
}

interface GameState {
  score: number;
  bullets: number;
  wave: number;
  status: "idle" | "playing" | "reloading" | "over";
}

type StateCallback = (state: GameState) => void;

const MAX_BULLETS = 6;
const RELOAD_TIME = 1500;

export class WildWestGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private targets: Target[] = [];
  private bullets: Bullet[] = [];
  private score = 0;
  private bulletCount = MAX_BULLETS;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private spawnTimer = 0;
  private waveKills = 0;
  private waveTarget = 0;
  private missedShots = 0;
  private reloadTimer = 0;
  private crosshairX = 0;
  private crosshairY = 0;

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
        score: this.score,
        bullets: this.bulletCount,
        wave: this.wave,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.crosshairX = this.canvas.width / 2;
    this.crosshairY = this.canvas.height / 2;
    this.draw();
  }

  setCrosshair(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.crosshairX = ((x - rect.left) / rect.width) * this.canvas.width;
    this.crosshairY = ((y - rect.top) / rect.height) * this.canvas.height;
  }

  shoot(x?: number, y?: number) {
    if (this.status !== "playing") return;

    if (x !== undefined && y !== undefined) {
      this.setCrosshair(x, y);
    }

    if (this.bulletCount <= 0) {
      return;
    }

    this.bulletCount--;
    this.bullets.push({ x: this.crosshairX, y: this.crosshairY, hit: false });

    // Check hits
    let hitSomething = false;
    for (const target of this.targets) {
      if (!target.visible) continue;

      if (this.isHit(this.crosshairX, this.crosshairY, target)) {
        hitSomething = true;
        target.health--;

        if (target.health <= 0) {
          target.visible = false;

          if (target.type === "bandit") {
            this.score += 10 * this.wave;
            this.waveKills++;
          } else if (target.type === "civilian") {
            this.score -= 50;
            this.missedShots += 3;
          } else if (target.type === "barrel") {
            this.score += 5;
          }
        }
        break;
      }
    }

    if (!hitSomething) {
      this.missedShots++;
    }

    // Check wave complete
    if (this.waveKills >= this.waveTarget) {
      this.nextWave();
    }

    // Game over conditions
    if (this.missedShots >= 10) {
      this.gameOver();
    }

    this.emitState();
  }

  reload() {
    if (this.status !== "playing" || this.bulletCount === MAX_BULLETS) return;

    this.status = "reloading";
    this.reloadTimer = RELOAD_TIME;
    this.emitState();
  }

  private isHit(x: number, y: number, target: Target): boolean {
    return (
      x >= target.x &&
      x <= target.x + target.width &&
      y >= target.y &&
      y <= target.y + target.height
    );
  }

  start() {
    this.score = 0;
    this.bulletCount = MAX_BULLETS;
    this.wave = 1;
    this.missedShots = 0;
    this.targets = [];
    this.bullets = [];
    this.status = "playing";
    this.setupWave();
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.waveKills = 0;
    this.waveTarget = 5 + this.wave * 2;
    this.spawnTimer = 0;
  }

  private nextWave() {
    this.wave++;
    this.score += this.wave * 50;
    this.bulletCount = MAX_BULLETS;
    this.setupWave();
  }

  private gameLoop() {
    if (this.status === "over") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Handle reloading
    if (this.status === "reloading") {
      this.reloadTimer -= 16;
      if (this.reloadTimer <= 0) {
        this.bulletCount = MAX_BULLETS;
        this.status = "playing";
        this.emitState();
      }
      return;
    }

    // Spawn targets
    this.spawnTimer++;
    const spawnRate = Math.max(30, 80 - this.wave * 5);
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.spawnTarget();
    }

    // Update targets
    this.updateTargets();

    // Update bullets (fade out)
    this.bullets = this.bullets.filter((b) => {
      b.hit = true;
      return true;
    });
    if (this.bullets.length > 10) {
      this.bullets.shift();
    }
  }

  private spawnTarget() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Spawn positions (behind cover)
    const positions = [
      { x: w * 0.1, y: h * 0.4 },
      { x: w * 0.3, y: h * 0.5 },
      { x: w * 0.5, y: h * 0.35 },
      { x: w * 0.7, y: h * 0.5 },
      { x: w * 0.85, y: h * 0.4 },
      { x: w * 0.2, y: h * 0.6 },
      { x: w * 0.6, y: h * 0.55 },
      { x: w * 0.8, y: h * 0.6 },
    ];

    // Find empty position
    const availablePos = positions.filter((pos) => {
      return !this.targets.some(
        (t) => t.visible && Math.abs(t.x - pos.x) < 50 && Math.abs(t.y - pos.y) < 50
      );
    });

    if (availablePos.length === 0) return;

    const pos = availablePos[Math.floor(Math.random() * availablePos.length)];

    // Determine type
    let type: Target["type"];
    const rand = Math.random();
    if (rand < 0.7) {
      type = "bandit";
    } else if (rand < 0.85) {
      type = "civilian";
    } else {
      type = "barrel";
    }

    const target: Target = {
      x: pos.x - 25,
      y: pos.y - 40,
      width: 50,
      height: 80,
      type,
      health: type === "barrel" ? 1 : 1 + Math.floor(this.wave / 3),
      visible: true,
      hideTimer: 0,
      showDuration: Math.max(1000, 3000 - this.wave * 100),
    };

    this.targets.push(target);
  }

  private updateTargets() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];

      if (!target.visible) {
        this.targets.splice(i, 1);
        continue;
      }

      target.hideTimer += 16;
      if (target.hideTimer >= target.showDuration) {
        target.visible = false;
        if (target.type === "bandit") {
          this.missedShots++;
        }
      }
    }

    // Game over check
    if (this.missedShots >= 10) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, "#87ceeb");
    skyGrad.addColorStop(1, "#f4a460");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.6);

    // Sun
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.15, 40, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    ctx.fillStyle = "#8b7355";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w * 0.2, h * 0.3);
    ctx.lineTo(w * 0.4, h * 0.5);
    ctx.lineTo(w * 0.6, h * 0.35);
    ctx.lineTo(w * 0.8, h * 0.45);
    ctx.lineTo(w, h * 0.3);
    ctx.lineTo(w, h * 0.6);
    ctx.lineTo(0, h * 0.6);
    ctx.fill();

    // Desert ground
    ctx.fillStyle = "#d2b48c";
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // Buildings (background)
    this.drawBuildings();

    // Draw targets
    for (const target of this.targets) {
      if (target.visible) {
        this.drawTarget(target);
      }
    }

    // Draw bullet holes
    for (const bullet of this.bullets) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw crosshair
    if (this.status === "playing" || this.status === "reloading") {
      this.drawCrosshair();
    }

    // Draw reload indicator
    if (this.status === "reloading") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(w / 2 - 75, h / 2 - 15, 150, 30);
      ctx.fillStyle = "#ffd700";
      const progress = 1 - this.reloadTimer / RELOAD_TIME;
      ctx.fillRect(w / 2 - 70, h / 2 - 10, 140 * progress, 20);
    }

    // Draw missed shots indicator
    ctx.fillStyle = "#8b0000";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Missed: ${this.missedShots}/10`, 10, 25);
  }

  private drawBuildings() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Saloon
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(w * 0.05, h * 0.45, w * 0.15, h * 0.25);
    ctx.fillStyle = "#654321";
    ctx.fillRect(w * 0.08, h * 0.55, w * 0.04, h * 0.15);

    // Bank
    ctx.fillStyle = "#a0522d";
    ctx.fillRect(w * 0.8, h * 0.4, w * 0.15, h * 0.3);
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(w * 0.84, h * 0.5, w * 0.05, h * 0.2);

    // Barrels
    ctx.fillStyle = "#654321";
    ctx.beginPath();
    ctx.ellipse(w * 0.25, h * 0.68, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.75, h * 0.68, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crates
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(w * 0.45, h * 0.6, 60, 50);
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.45, h * 0.6, 60, 50);
  }

  private drawTarget(target: Target) {
    const ctx = this.ctx;

    // Fade based on remaining time
    const fadeProgress = target.hideTimer / target.showDuration;
    if (fadeProgress > 0.8) {
      ctx.globalAlpha = 1 - (fadeProgress - 0.8) * 5;
    }

    if (target.type === "bandit") {
      // Bandit - red outfit
      ctx.fillStyle = "#2f1810";
      ctx.beginPath();
      ctx.arc(target.x + target.width / 2, target.y + 15, 15, 0, Math.PI * 2);
      ctx.fill();

      // Hat
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.ellipse(target.x + target.width / 2, target.y + 5, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = "#8b0000";
      ctx.fillRect(target.x + 10, target.y + 30, 30, 45);

      // Gun
      ctx.fillStyle = "#2f2f2f";
      ctx.fillRect(target.x + target.width - 5, target.y + 40, 15, 8);
    } else if (target.type === "civilian") {
      // Civilian - blue outfit
      ctx.fillStyle = "#f5deb3";
      ctx.beginPath();
      ctx.arc(target.x + target.width / 2, target.y + 15, 15, 0, Math.PI * 2);
      ctx.fill();

      // Bonnet/hat
      ctx.fillStyle = "#4169e1";
      ctx.beginPath();
      ctx.arc(target.x + target.width / 2, target.y + 8, 12, Math.PI, 0);
      ctx.fill();

      // Dress
      ctx.fillStyle = "#4169e1";
      ctx.beginPath();
      ctx.moveTo(target.x + 10, target.y + 30);
      ctx.lineTo(target.x + target.width - 10, target.y + 30);
      ctx.lineTo(target.x + target.width, target.y + 75);
      ctx.lineTo(target.x, target.y + 75);
      ctx.fill();
    } else {
      // Barrel
      ctx.fillStyle = "#654321";
      ctx.beginPath();
      ctx.ellipse(
        target.x + target.width / 2,
        target.y + target.height / 2,
        target.width / 2,
        target.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Metal bands
      ctx.strokeStyle = "#2f2f2f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        target.x + target.width / 2,
        target.y + target.height * 0.3,
        target.width / 2 - 2,
        8,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        target.x + target.width / 2,
        target.y + target.height * 0.7,
        target.width / 2 - 2,
        8,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawCrosshair() {
    const ctx = this.ctx;
    const x = this.crosshairX;
    const y = this.crosshairY;

    ctx.strokeStyle = this.bulletCount > 0 ? "#ff0000" : "#888";
    ctx.lineWidth = 2;

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Cross
    ctx.beginPath();
    ctx.moveTo(x - 25, y);
    ctx.lineTo(x - 10, y);
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 25, y);
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x, y - 10);
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, y + 25);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = this.bulletCount > 0 ? "#ff0000" : "#888";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
