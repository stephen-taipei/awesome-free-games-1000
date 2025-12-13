/**
 * Spider Hero Game Engine
 * Game #298
 *
 * Swing through the city and fight crime!
 */

interface SpiderHero {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  webCharges: number;
  maxWebCharges: number;
  isSwinging: boolean;
  swingAnchor: { x: number; y: number } | null;
  ropeLength: number;
  facing: "left" | "right";
  state: "idle" | "swing" | "fall" | "attack" | "hit";
  stateTimer: number;
}

interface Villain {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  type: "thug" | "gunner" | "boss";
  attackTimer: number;
  facing: "left" | "right";
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Building {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WebLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  timer: number;
}

interface GameState {
  health: number;
  webCharges: number;
  score: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const SWING_SPEED = 0.08;
const MAX_SWING_SPEED = 12;
const WEB_RANGE = 200;

export class SpiderHeroGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hero: SpiderHero;
  private villains: Villain[] = [];
  private bullets: Bullet[] = [];
  private buildings: Building[] = [];
  private webLines: WebLine[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, up: false, down: false, web: false, attack: false };
  private cameraX = 0;
  private levelWidth = 0;
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.hero = this.createHero();
  }

  private createHero(): SpiderHero {
    return {
      x: 100,
      y: 200,
      vx: 0,
      vy: 0,
      width: 30,
      height: 50,
      health: 100,
      maxHealth: 100,
      webCharges: 10,
      maxWebCharges: 10,
      isSwinging: false,
      swingAnchor: null,
      ropeLength: 0,
      facing: "right",
      state: "fall",
      stateTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: this.hero.health,
        webCharges: this.hero.webCharges,
        score: this.score,
        level: this.level,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.groundY = this.canvas.height - 50;
    this.draw();
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.hero = this.createHero();
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupLevel() {
    this.villains = [];
    this.bullets = [];
    this.buildings = [];
    this.webLines = [];
    this.cameraX = 0;
    this.levelWidth = this.canvas.width * 4;

    // Generate buildings
    let x = 0;
    while (x < this.levelWidth) {
      const width = 80 + Math.random() * 100;
      const height = 150 + Math.random() * 200;
      this.buildings.push({
        x,
        y: this.groundY - height,
        width,
        height,
      });
      x += width + 50 + Math.random() * 100;
    }

    // Spawn villains
    const villainCount = 5 + this.level * 3;
    for (let i = 0; i < villainCount; i++) {
      const vx = 200 + i * 300 + Math.random() * 200;
      const types: Villain["type"][] = ["thug", "thug", "gunner"];
      if (this.level >= 2) types.push("gunner");
      if (i === villainCount - 1 && this.level >= 3) types.push("boss");

      this.villains.push({
        x: vx,
        y: this.groundY - 40,
        width: 30,
        height: 40,
        vx: 0,
        health: types[Math.floor(Math.random() * types.length)] === "boss" ? 50 : 20,
        type: types[Math.floor(Math.random() * types.length)],
        attackTimer: 0,
        facing: "left",
      });
    }

    this.hero.x = 100;
    this.hero.y = 150;
    this.hero.vx = 0;
    this.hero.vy = 0;
    this.hero.isSwinging = false;
    this.hero.swingAnchor = null;
  }

  setKey(key: keyof typeof this.keys, value: boolean) {
    this.keys[key] = value;

    // Web shooting
    if (key === "web" && value && !this.hero.isSwinging && this.hero.webCharges > 0) {
      this.shootWeb();
    }

    // Release web
    if (key === "web" && !value && this.hero.isSwinging) {
      this.releaseWeb();
    }
  }

  private shootWeb() {
    // Find nearest anchor point (building top)
    let bestAnchor: { x: number; y: number } | null = null;
    let bestDist = WEB_RANGE;

    for (const b of this.buildings) {
      // Check building corners
      const points = [
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
      ];

      for (const p of points) {
        const dx = p.x - this.hero.x;
        const dy = p.y - this.hero.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bestDist && dy < 0) {
          bestDist = dist;
          bestAnchor = p;
        }
      }
    }

    if (bestAnchor) {
      this.hero.isSwinging = true;
      this.hero.swingAnchor = bestAnchor;
      this.hero.ropeLength = bestDist;
      this.hero.webCharges--;
      this.hero.state = "swing";

      this.webLines.push({
        x1: this.hero.x + this.hero.width / 2,
        y1: this.hero.y,
        x2: bestAnchor.x,
        y2: bestAnchor.y,
        timer: 30,
      });
    }
  }

  private releaseWeb() {
    this.hero.isSwinging = false;
    this.hero.swingAnchor = null;
    this.hero.state = "fall";

    // Boost when releasing
    this.hero.vy = Math.min(this.hero.vy, -5);
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.updateHero();
    this.updateVillains();
    this.updateBullets();
    this.updateWebLines();
    this.updateCamera();
    this.checkCollisions();
    this.checkLevelComplete();
    this.emitState();
  }

  private updateHero() {
    const h = this.hero;

    // State timer
    if (h.stateTimer > 0) {
      h.stateTimer--;
      if (h.stateTimer === 0) {
        h.state = h.isSwinging ? "swing" : "fall";
      }
    }

    if (h.isSwinging && h.swingAnchor) {
      // Swing physics
      const dx = h.x + h.width / 2 - h.swingAnchor.x;
      const dy = h.y + h.height / 2 - h.swingAnchor.y;
      const angle = Math.atan2(dy, dx);

      // Apply swing force
      const swingForce = SWING_SPEED;
      if (this.keys.left) {
        h.vx -= Math.sin(angle) * swingForce;
        h.vy += Math.cos(angle) * swingForce;
      }
      if (this.keys.right) {
        h.vx += Math.sin(angle) * swingForce;
        h.vy -= Math.cos(angle) * swingForce;
      }

      // Apply gravity
      h.vy += GRAVITY * 0.5;

      // Constrain to rope length
      h.x += h.vx;
      h.y += h.vy;

      const newDx = h.x + h.width / 2 - h.swingAnchor.x;
      const newDy = h.y + h.height / 2 - h.swingAnchor.y;
      const dist = Math.sqrt(newDx * newDx + newDy * newDy);

      if (dist > h.ropeLength) {
        const factor = h.ropeLength / dist;
        h.x = h.swingAnchor.x + newDx * factor - h.width / 2;
        h.y = h.swingAnchor.y + newDy * factor - h.height / 2;

        // Adjust velocity tangent to rope
        const normalX = newDx / dist;
        const normalY = newDy / dist;
        const dot = h.vx * normalX + h.vy * normalY;
        h.vx -= dot * normalX * 0.5;
        h.vy -= dot * normalY * 0.5;
      }

      // Limit speed
      const speed = Math.sqrt(h.vx * h.vx + h.vy * h.vy);
      if (speed > MAX_SWING_SPEED) {
        h.vx = (h.vx / speed) * MAX_SWING_SPEED;
        h.vy = (h.vy / speed) * MAX_SWING_SPEED;
      }

      // Update facing
      h.facing = h.vx > 0 ? "right" : "left";
    } else {
      // Normal movement
      if (this.keys.left) h.vx = -5;
      else if (this.keys.right) h.vx = 5;
      else h.vx *= 0.9;

      h.vy += GRAVITY;
      h.x += h.vx;
      h.y += h.vy;

      if (h.vx !== 0) h.facing = h.vx > 0 ? "right" : "left";
    }

    // Attack
    if (this.keys.attack && h.state !== "attack") {
      h.state = "attack";
      h.stateTimer = 20;
      this.performAttack();
    }

    // Ground collision
    if (h.y >= this.groundY - h.height) {
      h.y = this.groundY - h.height;
      h.vy = 0;
      if (h.state === "fall") h.state = "idle";

      // Regenerate web on ground
      if (h.webCharges < h.maxWebCharges) {
        h.webCharges += 0.02;
      }
    }

    // World bounds
    h.x = Math.max(0, Math.min(this.levelWidth - h.width, h.x));

    // Fall damage
    if (h.y > this.canvas.height + 100) {
      h.health -= 20;
      h.y = 100;
      h.x = this.cameraX + 100;
      h.vy = 0;
      h.isSwinging = false;
      h.swingAnchor = null;
    }
  }

  private performAttack() {
    const h = this.hero;
    const attackRange = 60;
    const attackX = h.facing === "right" ? h.x + h.width : h.x - attackRange;

    for (let i = this.villains.length - 1; i >= 0; i--) {
      const v = this.villains[i];
      if (
        v.x + v.width > attackX &&
        v.x < attackX + attackRange &&
        Math.abs(v.y - h.y) < 60
      ) {
        v.health -= 15;
        v.vx = h.facing === "right" ? 10 : -10;

        if (v.health <= 0) {
          this.score += v.type === "boss" ? 100 : v.type === "gunner" ? 30 : 10;
          this.villains.splice(i, 1);
        }
      }
    }
  }

  private updateVillains() {
    for (const v of this.villains) {
      // AI
      const dx = this.hero.x - v.x;
      v.facing = dx > 0 ? "right" : "left";

      if (v.type === "thug") {
        // Chase player
        if (Math.abs(dx) < 300 && Math.abs(dx) > 50) {
          v.vx = dx > 0 ? 2 : -2;
        } else {
          v.vx *= 0.9;
        }
      } else if (v.type === "gunner") {
        // Keep distance and shoot
        if (Math.abs(dx) < 150) {
          v.vx = dx > 0 ? -2 : 2;
        } else {
          v.vx *= 0.9;
        }

        v.attackTimer++;
        if (v.attackTimer >= 90 && Math.abs(dx) < 400) {
          v.attackTimer = 0;
          this.shootBullet(v);
        }
      }

      v.x += v.vx;
      v.vx *= 0.95;
    }
  }

  private shootBullet(v: Villain) {
    const dx = this.hero.x - v.x;
    const dy = this.hero.y - v.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.bullets.push({
      x: v.x + v.width / 2,
      y: v.y + v.height / 2,
      vx: (dx / dist) * 8,
      vy: (dy / dist) * 8,
    });
  }

  private updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Out of bounds
      if (b.x < this.cameraX - 50 || b.x > this.cameraX + this.canvas.width + 50 ||
          b.y < -50 || b.y > this.canvas.height + 50) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit hero
      if (
        b.x > this.hero.x && b.x < this.hero.x + this.hero.width &&
        b.y > this.hero.y && b.y < this.hero.y + this.hero.height
      ) {
        this.hero.health -= 10;
        this.hero.state = "hit";
        this.hero.stateTimer = 15;
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateWebLines() {
    for (let i = this.webLines.length - 1; i >= 0; i--) {
      this.webLines[i].timer--;
      if (this.webLines[i].timer <= 0) {
        this.webLines.splice(i, 1);
      }
    }

    // Update current web line
    if (this.hero.isSwinging && this.hero.swingAnchor) {
      // Update the most recent web line position
      if (this.webLines.length > 0) {
        const line = this.webLines[this.webLines.length - 1];
        line.x1 = this.hero.x + this.hero.width / 2;
        line.y1 = this.hero.y;
        line.timer = 2;
      }
    }
  }

  private updateCamera() {
    const targetX = this.hero.x - this.canvas.width / 3;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, this.cameraX));
  }

  private checkCollisions() {
    // Hero vs villains contact
    for (const v of this.villains) {
      if (this.hero.state !== "hit" &&
          this.hero.x < v.x + v.width &&
          this.hero.x + this.hero.width > v.x &&
          this.hero.y < v.y + v.height &&
          this.hero.y + this.hero.height > v.y) {
        this.hero.health -= 5;
        this.hero.state = "hit";
        this.hero.stateTimer = 20;
        this.hero.vx = this.hero.x < v.x ? -8 : 8;
      }
    }

    // Game over check
    if (this.hero.health <= 0) {
      this.hero.health = 0;
      this.gameOver();
    }
  }

  private checkLevelComplete() {
    if (this.villains.length === 0 && this.hero.x > this.levelWidth - 200) {
      this.status = "clear";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.hero.health = Math.min(this.hero.maxHealth, this.hero.health + 30);
    this.hero.webCharges = this.hero.maxWebCharges;
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
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

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a0a2e");
    gradient.addColorStop(0.5, "#2d1b4e");
    gradient.addColorStop(1, "#4a2c6a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137) % w);
      const sy = ((i * 97) % (h * 0.6));
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Buildings
    for (const b of this.buildings) {
      this.drawBuilding(b);
    }

    // Ground
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(0, this.groundY, this.levelWidth, h - this.groundY);

    // Web lines
    for (const line of this.webLines) {
      this.drawWebLine(line);
    }

    // Villains
    for (const v of this.villains) {
      this.drawVillain(v);
    }

    // Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hero
    this.drawHero();

    ctx.restore();

    // UI
    this.drawUI();
  }

  private drawBuilding(b: Building) {
    const ctx = this.ctx;

    // Building body
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Windows
    ctx.fillStyle = "rgba(255, 200, 100, 0.6)";
    const cols = Math.floor(b.width / 25);
    const rows = Math.floor(b.height / 30);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.3) {
          ctx.fillRect(
            b.x + 10 + c * 25,
            b.y + 15 + r * 30,
            15,
            20
          );
        }
      }
    }

    // Roof
    ctx.fillStyle = "#2a2a4e";
    ctx.fillRect(b.x - 5, b.y - 10, b.width + 10, 15);
  }

  private drawWebLine(line: WebLine) {
    const ctx = this.ctx;
    const alpha = line.timer / 30;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }

  private drawHero() {
    const ctx = this.ctx;
    const h = this.hero;

    // Flash when hit
    if (h.state === "hit" && Math.floor(h.stateTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body (red suit)
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(h.x, h.y + 15, h.width, h.height - 15);

    // Head
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Eye shapes
    ctx.fillStyle = "white";
    const eyeOffset = h.facing === "right" ? 3 : -3;
    ctx.beginPath();
    ctx.ellipse(h.x + h.width / 2 + eyeOffset, h.y + 10, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Web pattern on suit
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(h.x, h.y + 20 + i * 10);
      ctx.lineTo(h.x + h.width, h.y + 20 + i * 10);
      ctx.stroke();
    }

    // Attack effect
    if (h.state === "attack") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      const attackX = h.facing === "right" ? h.x + h.width : h.x;
      ctx.beginPath();
      ctx.arc(attackX, h.y + h.height / 2, 30, -0.5, 0.5);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawVillain(v: Villain) {
    const ctx = this.ctx;

    const colors = {
      thug: "#27ae60",
      gunner: "#8e44ad",
      boss: "#c0392b",
    };

    ctx.fillStyle = colors[v.type];
    ctx.fillRect(v.x, v.y, v.width, v.height);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(v.x + v.width / 2, v.y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    if (v.health < (v.type === "boss" ? 50 : 20)) {
      const barWidth = v.width;
      const maxHealth = v.type === "boss" ? 50 : 20;
      ctx.fillStyle = "#333";
      ctx.fillRect(v.x, v.y - 8, barWidth, 4);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(v.x, v.y - 8, barWidth * (v.health / maxHealth), 4);
    }
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 20, 150, 15);
    const hpPercent = this.hero.health / this.hero.maxHealth;
    ctx.fillStyle = hpPercent > 0.5 ? "#e74c3c" : hpPercent > 0.25 ? "#f39c12" : "#c0392b";
    ctx.fillRect(20, 20, 150 * hpPercent, 15);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 15);

    // Web charges
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText(`Web: ${Math.floor(this.hero.webCharges)}/${this.hero.maxWebCharges}`, 20, 55);

    // Score
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.score}`, this.canvas.width - 20, 30);
    ctx.fillText(`Level: ${this.level}`, this.canvas.width - 20, 50);
    ctx.textAlign = "left";
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
