/**
 * Throwing Warrior Game Engine
 * Game #302
 *
 * Throw weapons at enemies with physics!
 */

interface Warrior {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  weapons: number;
  maxWeapons: number;
  state: "idle" | "throw" | "hit";
  stateTimer: number;
}

interface Weapon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  type: "axe" | "spear" | "knife";
  damage: number;
  active: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "goblin" | "orc" | "troll";
  state: "walk" | "attack" | "hit" | "dead";
  stateTimer: number;
}

interface GameState {
  health: number;
  weapons: number;
  score: number;
  wave: number;
  status: "idle" | "playing" | "waveEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.4;

export class ThrowingWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private warrior: Warrior;
  private enemies: Enemy[] = [];
  private weapons: Weapon[] = [];
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private groundY = 0;
  private selectedWeapon: Weapon["type"] = "axe";
  private aimAngle = -0.5;
  private power = 15;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.warrior = this.createWarrior();
  }

  private createWarrior(): Warrior {
    return {
      x: 80,
      y: 0,
      width: 50,
      height: 70,
      health: 100,
      maxHealth: 100,
      weapons: 15,
      maxWeapons: 15,
      state: "idle",
      stateTimer: 0,
    };
  }

  private createEnemy(type: Enemy["type"], x: number): Enemy {
    const stats = {
      goblin: { health: 25, width: 30, height: 40, speed: 2.5 },
      orc: { health: 50, width: 40, height: 55, speed: 1.8 },
      troll: { health: 100, width: 55, height: 75, speed: 1.2 },
    };
    const s = stats[type];
    return {
      x,
      y: this.groundY - s.height,
      width: s.width,
      height: s.height,
      vx: -s.speed,
      health: s.health + this.wave * 5,
      maxHealth: s.health + this.wave * 5,
      type,
      state: "walk",
      stateTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: this.warrior.health,
        weapons: this.warrior.weapons,
        score: this.score,
        wave: this.wave,
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
    this.wave = 1;
    this.warrior = this.createWarrior();
    this.warrior.y = this.groundY - this.warrior.height;
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.enemies = [];
    this.weapons = [];

    const count = 5 + this.wave * 2;
    const types: Enemy["type"][] = ["goblin", "goblin", "orc"];
    if (this.wave >= 2) types.push("orc");
    if (this.wave >= 3) types.push("troll");

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const x = this.canvas.width + 100 + i * 120 + Math.random() * 50;
      this.enemies.push(this.createEnemy(type, x));
    }

    this.warrior.weapons = Math.min(this.warrior.maxWeapons, this.warrior.weapons + 8);
  }

  handleMouseMove(x: number, y: number) {
    const dx = x - (this.warrior.x + this.warrior.width);
    const dy = y - (this.warrior.y + 30);
    this.aimAngle = Math.atan2(dy, dx);
    this.aimAngle = Math.max(-1.2, Math.min(0.5, this.aimAngle));
  }

  handleClick() {
    if (this.status !== "playing") return;
    if (this.warrior.weapons <= 0) return;

    this.throwWeapon();
  }

  selectWeapon(type: Weapon["type"]) {
    this.selectedWeapon = type;
  }

  private throwWeapon() {
    const damages = { axe: 30, spear: 40, knife: 20 };
    const speeds = { axe: 18, spear: 22, knife: 25 };

    const speed = speeds[this.selectedWeapon];

    this.weapons.push({
      x: this.warrior.x + this.warrior.width,
      y: this.warrior.y + 30,
      vx: Math.cos(this.aimAngle) * speed,
      vy: Math.sin(this.aimAngle) * speed,
      rotation: 0,
      rotationSpeed: this.selectedWeapon === "spear" ? 0.1 : 0.3,
      type: this.selectedWeapon,
      damage: damages[this.selectedWeapon] + this.wave * 2,
      active: true,
    });

    this.warrior.weapons--;
    this.warrior.state = "throw";
    this.warrior.stateTimer = 15;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // State timer
    if (this.warrior.stateTimer > 0) {
      this.warrior.stateTimer--;
      if (this.warrior.stateTimer === 0) {
        this.warrior.state = "idle";
      }
    }

    this.updateWeapons();
    this.updateEnemies();
    this.checkCollisions();
    this.checkWaveEnd();
    this.emitState();
  }

  private updateWeapons() {
    for (let i = this.weapons.length - 1; i >= 0; i--) {
      const w = this.weapons[i];
      if (!w.active) continue;

      w.vy += GRAVITY;
      w.x += w.vx;
      w.y += w.vy;
      w.rotation += w.rotationSpeed;

      // Ground
      if (w.y >= this.groundY) {
        w.active = false;
      }

      // Out of bounds
      if (w.x < -100 || w.x > this.canvas.width + 100) {
        this.weapons.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (e.state === "dead") continue;

      // State timer
      if (e.stateTimer > 0) {
        e.stateTimer--;
        if (e.stateTimer === 0 && e.state !== "dead") {
          e.state = "walk";
        }
      }

      if (e.state === "walk") {
        e.x += e.vx;

        // Attack when close
        if (e.x < this.warrior.x + this.warrior.width + 20) {
          e.state = "attack";
          e.stateTimer = 30;
          const damage = e.type === "troll" ? 25 : e.type === "orc" ? 15 : 10;
          this.warrior.health -= damage;
          this.warrior.state = "hit";
          this.warrior.stateTimer = 20;

          // Push enemy back
          e.x += 50;
        }
      }
    }
  }

  private checkCollisions() {
    for (const w of this.weapons) {
      if (!w.active) continue;

      for (const e of this.enemies) {
        if (e.state === "dead") continue;

        if (
          w.x > e.x && w.x < e.x + e.width &&
          w.y > e.y && w.y < e.y + e.height
        ) {
          e.health -= w.damage;
          e.state = "hit";
          e.stateTimer = 15;
          e.x += 20;
          w.active = false;

          if (e.health <= 0) {
            e.health = 0;
            e.state = "dead";
            const points = e.type === "troll" ? 100 : e.type === "orc" ? 50 : 25;
            this.score += points;
          }
          break;
        }
      }
    }

    if (this.warrior.health <= 0) {
      this.warrior.health = 0;
      this.gameOver();
    }
  }

  private checkWaveEnd() {
    const alive = this.enemies.filter((e) => e.state !== "dead").length;
    if (alive === 0) {
      this.status = "waveEnd";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextWave() {
    this.wave++;
    this.warrior.health = Math.min(this.warrior.maxHealth, this.warrior.health + 20);
    this.setupWave();
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

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#4a3728");
    gradient.addColorStop(0.6, "#6b4423");
    gradient.addColorStop(1, "#8b5a2b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#3d2914";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Draw aim line
    this.drawAimLine();

    // Draw weapons
    for (const wp of this.weapons) {
      this.drawWeapon(wp);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw warrior
    this.drawWarrior();

    // UI
    this.drawUI();
  }

  private drawWarrior() {
    const ctx = this.ctx;
    const wr = this.warrior;

    ctx.save();

    if (wr.state === "hit" && Math.floor(wr.stateTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(wr.x + 10, wr.y + 20, wr.width - 20, wr.height - 20);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(wr.x + wr.width / 2, wr.y + 15, 15, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#654321";
    ctx.beginPath();
    ctx.arc(wr.x + wr.width / 2, wr.y + 10, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(wr.x + wr.width / 2 - 2, wr.y - 5, 4, 18);

    // Arm (throwing)
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(wr.x + wr.width - 5, wr.y + 30);

    if (wr.state === "throw") {
      ctx.lineTo(wr.x + wr.width + 25, wr.y + 20);
    } else {
      const armX = wr.x + wr.width + Math.cos(this.aimAngle) * 30;
      const armY = wr.y + 30 + Math.sin(this.aimAngle) * 30;
      ctx.lineTo(armX, armY);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.state === "dead") {
      ctx.globalAlpha = 0.3;
    } else if (e.state === "hit") {
      ctx.globalAlpha = 0.7;
    }

    const colors = {
      goblin: "#2ecc71",
      orc: "#27ae60",
      troll: "#1e8449",
    };

    // Body
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y + e.height * 0.2, e.width, e.height * 0.8);

    // Head
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + e.height * 0.15, e.height * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#c0392b";
    const eyeSize = e.type === "troll" ? 5 : 3;
    ctx.beginPath();
    ctx.arc(e.x + e.width * 0.35, e.y + e.height * 0.12, eyeSize, 0, Math.PI * 2);
    ctx.arc(e.x + e.width * 0.65, e.y + e.height * 0.12, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Weapon
    ctx.fillStyle = "#7f8c8d";
    if (e.type === "troll") {
      // Club
      ctx.fillRect(e.x - 15, e.y + e.height * 0.3, 20, 8);
      ctx.beginPath();
      ctx.arc(e.x - 15, e.y + e.height * 0.34, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sword
      ctx.fillRect(e.x - 10, e.y + e.height * 0.4, 15, 4);
    }

    // Health bar
    if (e.health < e.maxHealth && e.state !== "dead") {
      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, e.width, 6);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, e.width * (e.health / e.maxHealth), 6);
    }

    ctx.globalAlpha = 1;
  }

  private drawWeapon(wp: Weapon) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(wp.x, wp.y);
    ctx.rotate(wp.rotation);

    if (wp.type === "axe") {
      // Handle
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-15, -3, 30, 6);
      // Head
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.moveTo(10, -12);
      ctx.lineTo(18, 0);
      ctx.lineTo(10, 12);
      ctx.lineTo(5, 0);
      ctx.closePath();
      ctx.fill();
    } else if (wp.type === "spear") {
      // Shaft
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-20, -2, 40, 4);
      // Head
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(10, -6);
      ctx.lineTo(10, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      // Knife
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-5, -4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      // Handle
      ctx.fillStyle = "#654321";
      ctx.fillRect(-12, -3, 8, 6);
    }

    ctx.restore();
  }

  private drawAimLine() {
    const ctx = this.ctx;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const startX = this.warrior.x + this.warrior.width;
    const startY = this.warrior.y + 30;

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    const speed = 18;
    for (let t = 0; t < 25; t += 2) {
      const px = startX + Math.cos(this.aimAngle) * speed * t;
      const py = startY + Math.sin(this.aimAngle) * speed * t + GRAVITY * t * t * 0.5;
      if (py > this.groundY) break;
      ctx.lineTo(px, py);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 20, 150, 15);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(20, 20, 150 * (this.warrior.health / this.warrior.maxHealth), 15);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 15);

    // Weapon count
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`Weapons: ${this.warrior.weapons}`, 20, 55);

    // Selected weapon
    ctx.fillText(`Type: ${this.selectedWeapon.toUpperCase()}`, 20, 75);

    // Score and wave
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.score}`, this.canvas.width - 20, 30);
    ctx.fillText(`Wave ${this.wave}`, this.canvas.width - 20, 50);
    ctx.textAlign = "left";
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
