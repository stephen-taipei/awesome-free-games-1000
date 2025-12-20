/**
 * Mythic Warrior Game Engine
 * Game #365
 *
 * Harness the power of ancient myths in combat!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  myth: number;
  power: number;
  attacking: boolean;
  attackType: "thunder" | "divine";
  attackTimer: number;
  facingRight: boolean;
  invincible: number;
  divineShield: number;
}

interface Enemy {
  x: number;
  y: number;
  type: "shadow" | "demon" | "titan";
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  stunned: number;
}

interface Effect {
  x: number;
  y: number;
  type: "thunder" | "divine" | "explosion";
  timer: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface GameState {
  health: number;
  myth: number;
  power: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class MythicWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private effects: Effect[] = [];
  private particles: Particle[] = [];
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private spawnTimer = 0;
  private waveNumber = 0;
  private mythChargeTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 0,
      y: 0,
      width: 45,
      height: 55,
      health: 100,
      maxHealth: 100,
      myth: 0,
      power: 1,
      attacking: false,
      attackType: "thunder",
      attackTimer: 0,
      facingRight: true,
      invincible: 0,
      divineShield: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: Math.floor(this.player.health),
        myth: Math.floor(this.player.myth),
        power: Math.floor(this.player.power),
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height - 90;
    this.draw();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
  }

  thunderAttack() {
    if (this.status !== "playing" || this.player.attacking) return;
    this.performAttack("thunder");
  }

  divineAttack() {
    if (this.status !== "playing" || this.player.attacking) return;
    if (this.player.myth < 20) return; // Requires myth power
    this.performAttack("divine");
  }

  private performAttack(type: "thunder" | "divine") {
    const p = this.player;
    p.attacking = true;
    p.attackType = type;
    p.attackTimer = type === "thunder" ? 15 : 25;

    if (type === "divine") {
      p.myth -= 20;
      p.divineShield = 60; // Temporary shield after divine attack
    }

    // Create effect
    const effectX = p.x + (p.facingRight ? p.width + 30 : -30);
    const effectY = p.y + p.height / 2;
    const radius = type === "thunder" ? 50 : 80;

    this.effects.push({
      x: effectX,
      y: effectY,
      type,
      timer: type === "thunder" ? 12 : 20,
      radius,
    });

    // Check hits
    const attackDamage = type === "thunder" ? 20 * p.power : 50 * p.power;

    for (const e of this.enemies) {
      const dx = e.x - effectX;
      const dy = e.y - effectY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius + 20) {
        e.health -= attackDamage;
        e.stunned = type === "thunder" ? 15 : 30;

        // Hit particles
        const particleCount = type === "thunder" ? 8 : 15;
        for (let i = 0; i < particleCount; i++) {
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 25,
            color: type === "thunder" ? "#64c8ff" : "#ffc832",
            size: Math.random() * 4 + 2,
          });
        }
      }
    }

    this.emitState();
  }

  start() {
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 90;
    this.enemies = [];
    this.effects = [];
    this.particles = [];
    this.keys.clear();
    this.spawnTimer = 0;
    this.waveNumber = 0;
    this.mythChargeTimer = 0;
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
    this.updateEffects();
    this.spawnEnemies();
    this.checkGameOver();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;
    const speed = 5;

    // Movement
    if (this.keys.has("left")) {
      p.x -= speed;
      p.facingRight = false;
    }
    if (this.keys.has("right")) {
      p.x += speed;
      p.facingRight = true;
    }
    if (this.keys.has("up")) p.y -= speed;
    if (this.keys.has("down")) p.y += speed;

    // Bounds
    p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));
    p.y = Math.max(this.canvas.height / 2, Math.min(this.canvas.height - p.height, p.y));

    // Attack timer
    if (p.attacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.attacking = false;
      }
    }

    // Invincibility
    if (p.invincible > 0) p.invincible--;
    if (p.divineShield > 0) p.divineShield--;

    // Myth charge over time
    this.mythChargeTimer++;
    if (this.mythChargeTimer >= 30) {
      this.mythChargeTimer = 0;
      p.myth = Math.min(100, p.myth + 1);
    }

    // Power-based health regen
    if (p.power >= 3) {
      p.health = Math.min(p.maxHealth, p.health + 0.02 * p.power);
    }
  }

  private updateEnemies() {
    const p = this.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Stunned
      if (e.stunned > 0) {
        e.stunned--;
        continue;
      }

      // Move towards player
      const dx = px - e.x;
      const dy = py - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 40) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      } else if (p.invincible <= 0 && p.divineShield <= 0) {
        // Damage player
        p.health -= e.damage;
        p.invincible = 45;
      }

      // Remove dead enemies
      if (e.health <= 0) {
        this.enemies.splice(i, 1);

        // Rewards
        const mythGain = e.type === "titan" ? 15 : e.type === "demon" ? 8 : 3;
        p.myth = Math.min(100, p.myth + mythGain);

        // Power up every 10 kills
        if ((this.waveNumber + 1) % 10 === 0) {
          p.power = Math.min(10, p.power + 0.5);
        }

        // Death explosion effect
        this.effects.push({
          x: e.x,
          y: e.y,
          type: "explosion",
          timer: 15,
          radius: e.type === "titan" ? 40 : 25,
        });

        // Death particles
        for (let j = 0; j < 12; j++) {
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            color: "#b464ff",
            size: Math.random() * 5 + 2,
          });
        }
      }
    }
  }

  private updateEffects() {
    // Effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].timer--;
      if (this.effects[i].timer <= 0) {
        this.effects.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravity
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnEnemies() {
    this.spawnTimer++;
    const baseRate = 90;
    const spawnRate = Math.max(35, baseRate - this.waveNumber * 2);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.waveNumber++;

      const types: Enemy["type"][] = ["shadow", "shadow", "shadow", "demon", "titan"];
      const typeIndex = Math.min(Math.floor(this.waveNumber / 8), 4);
      const type = types[Math.floor(Math.random() * (typeIndex + 1))];

      // Spawn from edges
      const fromLeft = Math.random() > 0.5;
      const x = fromLeft ? -40 : this.canvas.width + 40;
      const y = this.canvas.height / 2 + Math.random() * (this.canvas.height / 2 - 80);

      const stats = {
        shadow: { health: 40, speed: 2.2, damage: 8 },
        demon: { health: 80, speed: 1.6, damage: 18 },
        titan: { health: 150, speed: 1.0, damage: 30 },
      };
      const s = stats[type];
      const scaling = 1 + this.waveNumber * 0.03;

      this.enemies.push({
        x,
        y,
        type,
        health: s.health * scaling,
        maxHealth: s.health * scaling,
        speed: s.speed,
        damage: s.damage,
        stunned: 0,
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

    // Background - mythic realm
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#0a0a20");
    bgGradient.addColorStop(0.4, "#1a1040");
    bgGradient.addColorStop(1, "#2a1860");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137) % w;
      const sy = (i * 73) % (h / 2);
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mythic energy in background
    if (this.player.myth > 0) {
      const intensity = this.player.myth / 100;
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, `rgba(180, 100, 255, ${intensity * 0.15})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Ground
    ctx.fillStyle = "#0f0f25";
    ctx.fillRect(0, h - 35, w, 35);

    // Draw particles (behind everything)
    for (const p of this.particles) {
      const alpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw effects
    for (const e of this.effects) {
      this.drawEffect(e);
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw player
    this.drawPlayer();

    // Myth bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(w / 2 - 60, h - 25, 120, 12);
    ctx.fillStyle = "#b464ff";
    ctx.fillRect(w / 2 - 60, h - 25, (this.player.myth / 100) * 120, 12);
    ctx.strokeStyle = "rgba(180, 100, 255, 0.5)";
    ctx.strokeRect(w / 2 - 60, h - 25, 120, 12);

    // Power indicator
    ctx.fillStyle = "#ffc832";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Power: ${this.player.power.toFixed(1)}x`, w - 10, 25);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    // Invincibility flash
    if (p.invincible > 0 && p.invincible % 8 < 4) {
      return;
    }

    // Divine shield
    if (p.divineShield > 0) {
      ctx.strokeStyle = `rgba(255, 200, 50, ${p.divineShield / 60})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mythic aura
    if (p.myth > 0) {
      const auraSize = 35 + p.myth * 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraSize);
      gradient.addColorStop(0, "rgba(180, 100, 255, 0.4)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, auraSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);
    if (!p.facingRight) ctx.scale(-1, 1);

    // Wings
    ctx.fillStyle = "rgba(180, 100, 255, 0.6)";
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(-35, -25);
    ctx.lineTo(-25, 5);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = "#2a2050";
    ctx.fillRect(-15, -12, 30, 40);

    // Armor
    ctx.fillStyle = "#b464ff";
    ctx.fillRect(-12, -10, 24, 18);

    // Head
    ctx.fillStyle = "#d0b090";
    ctx.beginPath();
    ctx.arc(0, -20, 14, 0, Math.PI * 2);
    ctx.fill();

    // Divine helm
    ctx.fillStyle = "#ffc832";
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.lineTo(0, -38);
    ctx.lineTo(12, -20);
    ctx.closePath();
    ctx.fill();

    // Staff/weapon
    if (p.attacking) {
      ctx.save();
      ctx.translate(18, 0);

      if (p.attackType === "thunder") {
        // Thunder bolt
        ctx.strokeStyle = "#64c8ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(10, -10);
        ctx.lineTo(0, 0);
        ctx.lineTo(15, 20);
        ctx.stroke();
      } else {
        // Divine orb
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.5, "#ffc832");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      // Idle staff
      ctx.fillStyle = "#8050a0";
      ctx.fillRect(15, -25, 6, 50);
      ctx.fillStyle = "#b464ff";
      ctx.beginPath();
      ctx.arc(18, -28, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Stunned effect
    if (e.stunned > 0) {
      ctx.globalAlpha = 0.6;
    }

    const colors = {
      shadow: { body: "#1a1a2a", accent: "#3030a0", eye: "#6060ff" },
      demon: { body: "#2a1a1a", accent: "#a03030", eye: "#ff3030" },
      titan: { body: "#2a2a1a", accent: "#808030", eye: "#ffff30" },
    };
    const color = colors[e.type];
    const size = e.type === "titan" ? 35 : e.type === "demon" ? 28 : 22;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + size, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color.body;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, size);
    gradient.addColorStop(0, color.accent);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = color.eye;
    ctx.shadowColor = color.eye;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(e.x - 7, e.y - 5, 4, 0, Math.PI * 2);
    ctx.arc(e.x + 7, e.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(e.x - 22, e.y - size - 14, 44, 7);
    ctx.fillStyle = e.type === "titan" ? "#ffc832" : "#c83232";
    ctx.fillRect(e.x - 22, e.y - size - 14, (e.health / e.maxHealth) * 44, 7);

    ctx.globalAlpha = 1;
  }

  private drawEffect(e: Effect) {
    const ctx = this.ctx;
    const alpha = e.timer / (e.type === "divine" ? 20 : e.type === "thunder" ? 12 : 15);

    if (e.type === "thunder") {
      // Electric effect
      ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        let x = e.x, y = e.y;
        for (let j = 0; j < 4; j++) {
          x += (Math.random() - 0.5) * e.radius;
          y += (Math.random() - 0.5) * e.radius;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (e.type === "divine") {
      // Divine light
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 50, ${alpha * 0.5})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rays
      ctx.strokeStyle = `rgba(255, 200, 50, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(angle) * e.radius * 1.2, e.y + Math.sin(angle) * e.radius * 1.2);
        ctx.stroke();
      }
    } else {
      // Explosion
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      gradient.addColorStop(0, `rgba(180, 100, 255, ${alpha})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * (1 + (1 - alpha)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
