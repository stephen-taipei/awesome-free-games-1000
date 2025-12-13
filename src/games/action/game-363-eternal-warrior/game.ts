/**
 * Eternal Warrior Game Engine
 * Game #363
 *
 * Fight for eternity against endless foes!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  eternity: number;
  attacking: boolean;
  attackAngle: number;
  attackTimer: number;
  invincible: number;
}

interface Enemy {
  x: number;
  y: number;
  type: "grunt" | "brute" | "elite";
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
}

interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  timer: number;
}

interface GameState {
  health: number;
  eternity: number;
  kills: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class EternalWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private slashes: SlashEffect[] = [];
  private kills = 0;
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
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 0,
      y: 0,
      width: 35,
      height: 45,
      health: 100,
      maxHealth: 100,
      eternity: 0,
      attacking: false,
      attackAngle: 0,
      attackTimer: 0,
      invincible: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: Math.floor(this.player.health),
        eternity: Math.floor(this.player.eternity),
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

  attack() {
    if (this.status !== "playing" || this.player.attacking) return;

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;
    this.player.attackAngle = Math.atan2(this.mouseY - py, this.mouseX - px);
    this.player.attacking = true;
    this.player.attackTimer = 15;

    // Slash effect
    this.slashes.push({
      x: px,
      y: py,
      angle: this.player.attackAngle,
      timer: 15,
    });

    // Check hits
    const attackRange = 60;
    for (const e of this.enemies) {
      const dx = e.x - px;
      const dy = e.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(angle - this.player.attackAngle);

      if (dist < attackRange && (angleDiff < 0.8 || angleDiff > Math.PI * 2 - 0.8)) {
        const damage = 25 + this.player.eternity * 0.5;
        e.health -= damage;
      }
    }

    this.emitState();
  }

  start() {
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height / 2 - this.player.height / 2;
    this.enemies = [];
    this.slashes = [];
    this.kills = 0;
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
    this.updateEnemies();
    this.updateSlashes();
    this.spawnEnemies();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;
    const speed = 4;

    if (this.keys.has("up")) p.y -= speed;
    if (this.keys.has("down")) p.y += speed;
    if (this.keys.has("left")) p.x -= speed;
    if (this.keys.has("right")) p.x += speed;

    // Bounds
    p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));
    p.y = Math.max(0, Math.min(this.canvas.height - p.height, p.y));

    // Attack timer
    if (p.attacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.attacking = false;
      }
    }

    // Invincibility
    if (p.invincible > 0) {
      p.invincible--;
    }

    // Eternity regeneration
    if (p.eternity > 0) {
      p.health = Math.min(p.maxHealth, p.health + p.eternity * 0.01);
    }
  }

  private updateEnemies() {
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Move towards player
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 30) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      } else if (this.player.invincible <= 0) {
        // Damage player
        this.player.health -= e.damage;
        this.player.invincible = 60;
      }

      // Remove dead enemies
      if (e.health <= 0) {
        this.enemies.splice(i, 1);
        this.kills++;
        this.player.eternity += e.type === "elite" ? 3 : e.type === "brute" ? 2 : 1;
      }
    }
  }

  private updateSlashes() {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].timer--;
      if (this.slashes[i].timer <= 0) {
        this.slashes.splice(i, 1);
      }
    }
  }

  private spawnEnemies() {
    this.spawnTimer++;
    const spawnRate = Math.max(30, 80 - this.kills);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      const types: Enemy["type"][] = ["grunt", "grunt", "grunt", "brute", "elite"];
      const type = types[Math.floor(Math.random() * (this.kills > 20 ? 5 : 3))];

      // Spawn from edge
      let x, y;
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: x = Math.random() * this.canvas.width; y = -30; break;
        case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
        case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
        default: x = -30; y = Math.random() * this.canvas.height;
      }

      const stats = {
        grunt: { health: 30, speed: 2, damage: 10 },
        brute: { health: 80, speed: 1.2, damage: 20 },
        elite: { health: 50, speed: 2.5, damage: 15 },
      };
      const s = stats[type];

      this.enemies.push({
        x,
        y,
        type,
        health: s.health + this.kills,
        maxHealth: s.health + this.kills,
        speed: s.speed + this.kills * 0.01,
        damage: s.damage,
      });
    }
  }

  private checkGameOver() {
    if (this.player.health <= 0) {
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

    // Background
    ctx.fillStyle = "#0a0808";
    ctx.fillRect(0, 0, w, h);

    // Arena
    const arenaGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    arenaGradient.addColorStop(0, "rgba(200, 150, 50, 0.05)");
    arenaGradient.addColorStop(1, "transparent");
    ctx.fillStyle = arenaGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw slashes
    for (const s of this.slashes) {
      this.drawSlash(s);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw player
    this.drawPlayer();

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = "#c83232";
    ctx.fillRect(10, 10, (this.player.health / this.player.maxHealth) * 100, 15);

    // Eternity indicator
    ctx.fillStyle = "#c89632";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Eternity: ${Math.floor(this.player.eternity)}`, w - 10, 22);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    // Invincibility flash
    if (p.invincible > 0 && p.invincible % 10 < 5) {
      return;
    }

    // Eternity aura
    if (p.eternity > 0) {
      const auraSize = 30 + p.eternity * 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraSize);
      gradient.addColorStop(0, "rgba(200, 150, 50, 0.3)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, auraSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = "#4a3a2a";
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Armor
    ctx.fillStyle = "#c89632";
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    // Sword direction
    const angle = Math.atan2(this.mouseY - cy, this.mouseX - cx);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Sword
    ctx.fillStyle = "#808080";
    ctx.fillRect(15, -3, 30, 6);
    ctx.fillStyle = "#c89632";
    ctx.fillRect(10, -5, 8, 10);

    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      grunt: { main: "#3a2a2a", accent: "#5a4040" },
      brute: { main: "#2a1a1a", accent: "#5a3030" },
      elite: { main: "#2a2a3a", accent: "#4040c0" },
    };
    const color = colors[e.type];

    // Body
    ctx.fillStyle = color.main;
    const size = e.type === "brute" ? 25 : 18;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Accent
    ctx.fillStyle = color.accent;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = e.type === "elite" ? "#00f" : "#f00";
    ctx.beginPath();
    ctx.arc(e.x - 5, e.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 5, e.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(e.x - 15, e.y - size - 10, 30, 4);
    ctx.fillStyle = "#c83232";
    ctx.fillRect(e.x - 15, e.y - size - 10, (e.health / e.maxHealth) * 30, 4);
  }

  private drawSlash(s: SlashEffect) {
    const ctx = this.ctx;
    const alpha = s.timer / 15;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    ctx.strokeStyle = `rgba(200, 150, 50, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Arc slash
    ctx.beginPath();
    ctx.arc(0, 0, 50, -0.5, 0.5);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 45, -0.4, 0.4);
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
