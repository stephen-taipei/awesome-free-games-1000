/**
 * Witch Hunter Game Engine
 * Game #357
 *
 * Hunt monsters with silver bullets!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

interface Monster {
  x: number;
  y: number;
  type: "vampire" | "werewolf" | "ghost";
  health: number;
  maxHealth: number;
  speed: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Pickup {
  x: number;
  y: number;
  type: "silver" | "health";
}

interface GameState {
  health: number;
  silver: number;
  kills: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class WitchHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private monsters: Monster[] = [];
  private bullets: Bullet[] = [];
  private pickups: Pickup[] = [];
  private health = 100;
  private silver = 10;
  private kills = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = { x: 0, y: 0, width: 30, height: 30, angle: 0 };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: this.health,
        silver: this.silver,
        kills: this.kills,
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

  setMouse(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = ((x - rect.left) / rect.width) * this.canvas.width;
    this.mouseY = ((y - rect.top) / rect.height) * this.canvas.height;
  }

  shoot() {
    if (this.status !== "playing" || this.silver <= 0) return;

    this.silver--;
    const angle = Math.atan2(this.mouseY - this.player.y, this.mouseX - this.player.x);

    this.bullets.push({
      x: this.player.x,
      y: this.player.y,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
    });

    this.emitState();
  }

  start() {
    this.health = 100;
    this.silver = 10;
    this.kills = 0;
    this.wave = 1;
    this.monsters = [];
    this.bullets = [];
    this.pickups = [];
    this.keys.clear();
    this.spawnTimer = 0;
    this.status = "playing";

    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;

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
    this.updateMonsters();
    this.updateBullets();
    this.updatePickups();
    this.spawnMonsters();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const speed = 4;

    if (this.keys.has("up")) this.player.y -= speed;
    if (this.keys.has("down")) this.player.y += speed;
    if (this.keys.has("left")) this.player.x -= speed;
    if (this.keys.has("right")) this.player.x += speed;

    // Bounds
    this.player.x = Math.max(15, Math.min(this.canvas.width - 15, this.player.x));
    this.player.y = Math.max(15, Math.min(this.canvas.height - 15, this.player.y));

    // Face mouse
    this.player.angle = Math.atan2(this.mouseY - this.player.y, this.mouseX - this.player.x);
  }

  private updateMonsters() {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];

      // Move towards player
      const dx = this.player.x - m.x;
      const dy = this.player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 25) {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
      } else {
        // Attack player
        this.health -= m.type === "werewolf" ? 2 : 1;
      }

      // Remove dead monsters
      if (m.health <= 0) {
        this.monsters.splice(i, 1);
        this.kills++;

        // Drop pickup
        if (Math.random() < 0.3) {
          this.pickups.push({
            x: m.x,
            y: m.y,
            type: Math.random() < 0.5 ? "silver" : "health",
          });
        }
      }
    }
  }

  private updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Bounds check
      if (b.x < 0 || b.x > this.canvas.width || b.y < 0 || b.y > this.canvas.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit check
      for (const m of this.monsters) {
        const dx = m.x - b.x;
        const dy = m.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
          m.health -= 25;
          this.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  private updatePickups() {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;

      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        if (p.type === "silver") {
          this.silver += 5;
        } else {
          this.health = Math.min(100, this.health + 20);
        }
        this.pickups.splice(i, 1);
      }
    }
  }

  private spawnMonsters() {
    this.spawnTimer++;
    const spawnRate = Math.max(40, 100 - this.wave * 5);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      const types: Monster["type"][] = ["vampire", "werewolf", "ghost"];
      const type = types[Math.floor(Math.random() * types.length)];

      // Spawn from edge
      let x, y;
      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -20 : this.canvas.width + 20;
        y = Math.random() * this.canvas.height;
      } else {
        x = Math.random() * this.canvas.width;
        y = Math.random() < 0.5 ? -20 : this.canvas.height + 20;
      }

      const baseHealth = type === "werewolf" ? 75 : type === "vampire" ? 50 : 25;
      const speed = type === "ghost" ? 3 : type === "werewolf" ? 1.5 : 2;

      this.monsters.push({
        x,
        y,
        type,
        health: baseHealth + this.wave * 5,
        maxHealth: baseHealth + this.wave * 5,
        speed: speed + this.wave * 0.1,
      });

      if (this.kills > 0 && this.kills % 10 === 0) {
        this.wave++;
      }
    }
  }

  private checkGameOver() {
    if (this.health <= 0) {
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
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, 0, w, h);

    // Fog effect
    const fogGradient = ctx.createRadialGradient(
      this.player.x, this.player.y, 50,
      this.player.x, this.player.y, 300
    );
    fogGradient.addColorStop(0, "rgba(10, 10, 21, 0)");
    fogGradient.addColorStop(1, "rgba(10, 10, 21, 0.8)");
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, 0, w, h);

    // Moon
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.arc(w - 50, 50, 25, 0, Math.PI * 2);
    ctx.fill();

    // Draw pickups
    for (const p of this.pickups) {
      this.drawPickup(p);
    }

    // Draw monsters
    for (const m of this.monsters) {
      this.drawMonster(m);
    }

    // Draw bullets
    ctx.fillStyle = "#c0c0c0";
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player
    this.drawPlayer();

    // Wave indicator
    ctx.fillStyle = "#9b59b6";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Wave ${this.wave}`, 10, 20);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Body
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(0, -25);
    ctx.lineTo(12, -5);
    ctx.closePath();
    ctx.fill();

    // Gun
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(10, -3, 20, 6);

    ctx.restore();
  }

  private drawMonster(m: Monster) {
    const ctx = this.ctx;

    if (m.type === "vampire") {
      // Vampire - purple/red
      ctx.fillStyle = "#4a0000";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 18, 0, Math.PI * 2);
      ctx.fill();

      // Cape
      ctx.fillStyle = "#2d0a0a";
      ctx.beginPath();
      ctx.moveTo(m.x - 15, m.y);
      ctx.lineTo(m.x - 20, m.y + 25);
      ctx.lineTo(m.x + 20, m.y + 25);
      ctx.lineTo(m.x + 15, m.y);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(m.x - 5, m.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(m.x + 5, m.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.type === "werewolf") {
      // Werewolf - brown/gray
      ctx.fillStyle = "#4a3728";
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, 22, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.beginPath();
      ctx.moveTo(m.x - 15, m.y - 10);
      ctx.lineTo(m.x - 10, m.y - 25);
      ctx.lineTo(m.x - 5, m.y - 10);
      ctx.moveTo(m.x + 5, m.y - 10);
      ctx.lineTo(m.x + 10, m.y - 25);
      ctx.lineTo(m.x + 15, m.y - 10);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(m.x - 6, m.y - 3, 4, 0, Math.PI * 2);
      ctx.arc(m.x + 6, m.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ghost - translucent white
      ctx.fillStyle = "rgba(200, 200, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(m.x, m.y - 5, 15, Math.PI, 0);
      ctx.lineTo(m.x + 15, m.y + 15);
      ctx.quadraticCurveTo(m.x + 10, m.y + 10, m.x + 5, m.y + 15);
      ctx.quadraticCurveTo(m.x, m.y + 10, m.x - 5, m.y + 15);
      ctx.quadraticCurveTo(m.x - 10, m.y + 10, m.x - 15, m.y + 15);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(m.x - 5, m.y - 5, 3, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(m.x + 5, m.y - 5, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(m.x - 20, m.y - 30, 40, 5);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(m.x - 20, m.y - 30, (m.health / m.maxHealth) * 40, 5);
  }

  private drawPickup(p: Pickup) {
    const ctx = this.ctx;

    if (p.type === "silver") {
      ctx.fillStyle = "#c0c0c0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#808080";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 10);
      ctx.bezierCurveTo(p.x - 10, p.y - 15, p.x - 10, p.y, p.x, p.y + 8);
      ctx.bezierCurveTo(p.x + 10, p.y, p.x + 10, p.y - 15, p.x, p.y - 10);
      ctx.fill();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
