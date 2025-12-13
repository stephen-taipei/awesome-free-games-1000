/**
 * The Awakened Game Engine
 * Game #361
 *
 * Unleash dormant power to defeat enemies!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  awakened: boolean;
  awakenTimer: number;
  power: number;
  maxPower: number;
}

interface Enemy {
  x: number;
  y: number;
  type: "shadow" | "void" | "nightmare";
  health: number;
  maxHealth: number;
  speed: number;
}

interface PowerOrb {
  x: number;
  y: number;
  value: number;
  collected: boolean;
}

interface AwakenWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  damage: number;
}

interface GameState {
  power: number;
  awakening: number;
  score: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class AwakenedGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private orbs: PowerOrb[] = [];
  private waves: AwakenWave[] = [];
  private awakening = 0;
  private score = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
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
      width: 40,
      height: 50,
      awakened: false,
      awakenTimer: 0,
      power: 0,
      maxPower: 100,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        power: Math.floor(this.player.power),
        awakening: Math.floor(this.awakening),
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

  awaken() {
    if (this.status !== "playing" || this.player.power < 30) return;
    if (this.player.awakened) return;

    this.player.power -= 30;
    this.player.awakened = true;
    this.player.awakenTimer = 180;
    this.awakening = Math.min(100, this.awakening + 10);

    // Create awaken wave
    this.waves.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      radius: 20,
      maxRadius: 200 + this.awakening * 2,
      damage: 30 + this.awakening,
    });

    this.emitState();
  }

  start() {
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height / 2 - this.player.height / 2;
    this.enemies = [];
    this.orbs = [];
    this.waves = [];
    this.awakening = 0;
    this.score = 0;
    this.wave = 1;
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
    this.updateOrbs();
    this.updateWaves();
    this.spawnEnemies();
    this.spawnOrbs();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const speed = this.player.awakened ? 7 : 4;
    const p = this.player;

    if (this.keys.has("up")) p.y -= speed;
    if (this.keys.has("down")) p.y += speed;
    if (this.keys.has("left")) p.x -= speed;
    if (this.keys.has("right")) p.x += speed;

    // Bounds
    p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));
    p.y = Math.max(0, Math.min(this.canvas.height - p.height, p.y));

    // Awaken timer
    if (p.awakened) {
      p.awakenTimer--;
      if (p.awakenTimer <= 0) {
        p.awakened = false;
      }
    }

    // Power decay
    if (!p.awakened && p.power > 0) {
      p.power -= 0.05;
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
        // Slow down when player is awakened
        const speedMod = this.player.awakened ? 0.3 : 1;
        e.x += (dx / dist) * e.speed * speedMod;
        e.y += (dy / dist) * e.speed * speedMod;
      }

      // Damage player
      if (dist < 40 && !this.player.awakened) {
        this.player.power -= 1;
      }

      // Remove dead enemies
      if (e.health <= 0) {
        this.enemies.splice(i, 1);
        this.score += (e.type === "nightmare" ? 30 : e.type === "void" ? 20 : 10) * this.wave;

        // Drop power orb
        this.orbs.push({
          x: e.x,
          y: e.y,
          value: e.type === "nightmare" ? 15 : 10,
          collected: false,
        });
      }
    }
  }

  private updateOrbs() {
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (o.collected) continue;

      // Attract to awakened player
      if (this.player.awakened) {
        const dx = px - o.x;
        const dy = py - o.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          o.x += (dx / dist) * 5;
          o.y += (dy / dist) * 5;
        }
      }

      // Collect
      const dx = px - o.x;
      const dy = py - o.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        o.collected = true;
        this.player.power = Math.min(this.player.maxPower, this.player.power + o.value);
        this.orbs.splice(i, 1);
      }
    }
  }

  private updateWaves() {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.radius += 10;

      // Damage enemies
      for (const e of this.enemies) {
        const dx = e.x - w.x;
        const dy = e.y - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < w.radius && dist > w.radius - 15) {
          e.health -= w.damage;
        }
      }

      if (w.radius >= w.maxRadius) {
        this.waves.splice(i, 1);
      }
    }
  }

  private spawnEnemies() {
    this.spawnTimer++;
    const spawnRate = Math.max(40, 100 - this.wave * 5);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;

      const types: Enemy["type"][] = ["shadow", "shadow", "void", "nightmare"];
      const type = types[Math.floor(Math.random() * (this.wave > 2 ? 4 : 2))];

      // Spawn from edge
      let x, y;
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: x = Math.random() * this.canvas.width; y = -30; break;
        case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
        case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
        default: x = -30; y = Math.random() * this.canvas.height;
      }

      const baseHealth = type === "nightmare" ? 80 : type === "void" ? 50 : 30;

      this.enemies.push({
        x,
        y,
        type,
        health: baseHealth + this.wave * 5,
        maxHealth: baseHealth + this.wave * 5,
        speed: (type === "shadow" ? 2 : 1.5) + this.wave * 0.1,
      });

      if (this.score > 0 && this.score % 200 === 0) {
        this.wave++;
      }
    }
  }

  private spawnOrbs() {
    // Random orb spawns
    if (Math.random() < 0.005) {
      this.orbs.push({
        x: 50 + Math.random() * (this.canvas.width - 100),
        y: 50 + Math.random() * (this.canvas.height - 100),
        value: 5,
        collected: false,
      });
    }
  }

  private checkGameOver() {
    if (this.player.power <= -50) {
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
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);

    // Awakening aura effect
    if (this.player.awakened) {
      const gradient = ctx.createRadialGradient(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        0,
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        200
      );
      gradient.addColorStop(0, "rgba(255, 100, 50, 0.2)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw waves
    for (const wave of this.waves) {
      this.drawWave(wave);
    }

    // Draw orbs
    for (const orb of this.orbs) {
      if (!orb.collected) this.drawOrb(orb);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw player
    this.drawPlayer();

    // Power bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 100, 15);
    ctx.fillStyle = "#ff6432";
    ctx.fillRect(10, 10, Math.max(0, this.player.power), 15);

    // Awakening bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 30, 100, 10);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(10, 30, this.awakening, 10);

    // Wave indicator
    ctx.fillStyle = "#c864ff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Wave ${this.wave}`, w - 10, 22);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    // Awakened aura
    if (p.awakened) {
      const pulseSize = 40 + Math.sin(Date.now() / 100) * 10;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
      gradient.addColorStop(0, "rgba(255, 150, 50, 0.5)");
      gradient.addColorStop(0.5, "rgba(255, 100, 50, 0.2)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = p.awakened ? "#ff6432" : "#4a2a1a";
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = p.awakened ? "#ffd700" : "#ff6432";
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Energy lines
    if (p.awakened) {
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Date.now() / 200;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
        ctx.lineTo(cx + Math.cos(angle) * 35, cy + Math.sin(angle) * 35);
        ctx.stroke();
      }
    }
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    const colors = {
      shadow: { main: "#2a2a3a", glow: "rgba(50, 50, 80, 0.5)" },
      void: { main: "#1a0a2a", glow: "rgba(80, 0, 120, 0.5)" },
      nightmare: { main: "#3a0a1a", glow: "rgba(120, 0, 50, 0.5)" },
    };
    const color = colors[e.type];

    // Glow
    ctx.fillStyle = color.glow;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color.main;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = e.type === "nightmare" ? "#ff0000" : "#ffffff";
    ctx.beginPath();
    ctx.arc(e.x - 5, e.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 5, e.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(e.x - 15, e.y - 30, 30, 4);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(e.x - 15, e.y - 30, (e.health / e.maxHealth) * 30, 4);
  }

  private drawOrb(o: PowerOrb) {
    const ctx = this.ctx;
    const bob = Math.sin(Date.now() / 200 + o.x) * 3;

    ctx.fillStyle = "rgba(255, 100, 50, 0.5)";
    ctx.beginPath();
    ctx.arc(o.x, o.y + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff6432";
    ctx.beginPath();
    ctx.arc(o.x, o.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWave(wave: AwakenWave) {
    const ctx = this.ctx;
    const alpha = 1 - wave.radius / wave.maxRadius;

    ctx.strokeStyle = `rgba(255, 100, 50, ${alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
