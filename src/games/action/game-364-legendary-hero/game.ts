/**
 * Legendary Hero Game Engine
 * Game #364
 *
 * Become a legendary hero through combat!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  legend: number;
  combo: number;
  comboTimer: number;
  attacking: boolean;
  attackType: "light" | "heavy";
  attackTimer: number;
  facingRight: boolean;
  invincible: number;
}

interface Enemy {
  x: number;
  y: number;
  type: "minion" | "warrior" | "champion";
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  stunned: number;
}

interface SlashEffect {
  x: number;
  y: number;
  type: "light" | "heavy";
  facingRight: boolean;
  timer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  health: number;
  legend: number;
  combo: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

export class LegendaryHeroGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private slashes: SlashEffect[] = [];
  private particles: Particle[] = [];
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private spawnTimer = 0;
  private waveNumber = 0;

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
      health: 100,
      maxHealth: 100,
      legend: 0,
      combo: 0,
      comboTimer: 0,
      attacking: false,
      attackType: "light",
      attackTimer: 0,
      facingRight: true,
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
        legend: Math.floor(this.player.legend),
        combo: this.player.combo,
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

  lightAttack() {
    if (this.status !== "playing" || this.player.attacking) return;
    this.performAttack("light");
  }

  heavyAttack() {
    if (this.status !== "playing" || this.player.attacking) return;
    this.performAttack("heavy");
  }

  private performAttack(type: "light" | "heavy") {
    const p = this.player;
    p.attacking = true;
    p.attackType = type;
    p.attackTimer = type === "light" ? 12 : 20;

    // Create slash effect
    const slashX = p.x + (p.facingRight ? p.width : 0);
    this.slashes.push({
      x: slashX,
      y: p.y + p.height / 2,
      type,
      facingRight: p.facingRight,
      timer: type === "light" ? 10 : 15,
    });

    // Check hits
    const attackRange = type === "light" ? 60 : 80;
    const attackDamage = type === "light" ? 15 : 35;
    let hitCount = 0;

    for (const e of this.enemies) {
      const dx = p.facingRight ? e.x - p.x : p.x - e.x;
      const dy = Math.abs(e.y - p.y);

      if (dx > 0 && dx < attackRange && dy < 50) {
        const comboMultiplier = 1 + p.combo * 0.1;
        const damage = attackDamage * comboMultiplier;
        e.health -= damage;
        e.stunned = type === "light" ? 10 : 20;
        hitCount++;

        // Hit particles
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 20,
            color: type === "light" ? "#6496ff" : "#ff6464",
          });
        }
      }
    }

    // Update combo
    if (hitCount > 0) {
      p.combo += hitCount;
      p.comboTimer = 90; // 1.5 seconds to continue combo
    }

    this.emitState();
  }

  start() {
    this.player = this.createPlayer();
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 80;
    this.enemies = [];
    this.slashes = [];
    this.particles = [];
    this.keys.clear();
    this.spawnTimer = 0;
    this.waveNumber = 0;
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

    // Combo timer
    if (p.comboTimer > 0) {
      p.comboTimer--;
      if (p.comboTimer <= 0) {
        // Convert combo to legend points before resetting
        if (p.combo >= 5) {
          p.legend += p.combo * 2;
        }
        p.combo = 0;
      }
    }

    // Invincibility
    if (p.invincible > 0) {
      p.invincible--;
    }

    // Legend power healing
    if (p.legend >= 50) {
      p.health = Math.min(p.maxHealth, p.health + 0.05);
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

      if (dist > 35) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      } else if (p.invincible <= 0) {
        // Damage player
        p.health -= e.damage;
        p.invincible = 45;
        p.combo = 0; // Reset combo on hit
        p.comboTimer = 0;
      }

      // Remove dead enemies
      if (e.health <= 0) {
        this.enemies.splice(i, 1);
        p.legend += e.type === "champion" ? 10 : e.type === "warrior" ? 5 : 2;

        // Death particles
        for (let j = 0; j < 10; j++) {
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            color: "#ffc864",
          });
        }
      }
    }
  }

  private updateEffects() {
    // Slashes
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].timer--;
      if (this.slashes[i].timer <= 0) {
        this.slashes.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnEnemies() {
    this.spawnTimer++;
    const baseRate = 100;
    const spawnRate = Math.max(40, baseRate - this.player.legend);

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.waveNumber++;

      const types: Enemy["type"][] = ["minion", "minion", "minion", "warrior", "champion"];
      const typeIndex = Math.min(Math.floor(this.waveNumber / 10), 4);
      const type = types[Math.floor(Math.random() * (typeIndex + 1))];

      // Spawn from sides
      const fromLeft = Math.random() > 0.5;
      const x = fromLeft ? -30 : this.canvas.width + 30;
      const y = this.canvas.height / 2 + Math.random() * (this.canvas.height / 2 - 60);

      const stats = {
        minion: { health: 30, speed: 1.8, damage: 8 },
        warrior: { health: 60, speed: 1.4, damage: 15 },
        champion: { health: 100, speed: 1.0, damage: 25 },
      };
      const s = stats[type];
      const scaling = 1 + this.waveNumber * 0.02;

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

    // Background - legendary arena
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#1a1a30");
    bgGradient.addColorStop(0.5, "#2a2050");
    bgGradient.addColorStop(1, "#3a3070");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#0a0a15";
    ctx.fillRect(0, h - 30, w, 30);

    // Legend aura in background
    if (this.player.legend > 0) {
      const intensity = Math.min(this.player.legend / 100, 1);
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, `rgba(255, 200, 100, ${intensity * 0.1})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = p.life / 30;
      ctx.fillStyle = p.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Combo display
    if (this.player.combo >= 3) {
      ctx.fillStyle = "#ff6464";
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${this.player.combo} HIT COMBO!`, w / 2, 50);
    }
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

    // Legend aura
    if (p.legend > 0) {
      const auraSize = 40 + p.legend * 0.2;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraSize);
      gradient.addColorStop(0, "rgba(255, 200, 100, 0.4)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, auraSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);
    if (!p.facingRight) ctx.scale(-1, 1);

    // Cape
    ctx.fillStyle = "#c83232";
    ctx.beginPath();
    ctx.moveTo(-5, -15);
    ctx.lineTo(-20, 25);
    ctx.lineTo(-5, 20);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = "#3a3a5a";
    ctx.fillRect(-12, -10, 24, 35);

    // Armor
    ctx.fillStyle = "#ffc864";
    ctx.fillRect(-10, -8, 20, 15);

    // Head
    ctx.fillStyle = "#e0c0a0";
    ctx.beginPath();
    ctx.arc(0, -18, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#ffc864";
    ctx.beginPath();
    ctx.arc(0, -22, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-2, -32, 4, 10);

    // Sword (attacking animation)
    if (p.attacking) {
      const swingAngle = p.attackType === "light" ? 0.5 : 0.8;
      const progress = p.attackTimer / (p.attackType === "light" ? 12 : 20);
      const angle = -Math.PI / 4 + swingAngle * (1 - progress);

      ctx.save();
      ctx.translate(15, 0);
      ctx.rotate(angle);

      // Blade
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(-3, -45, 6, 40);
      ctx.fillStyle = "#ffc864";
      ctx.fillRect(-5, -8, 10, 12);
      ctx.restore();
    } else {
      // Idle sword
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(12, -5, 5, 30);
      ctx.fillStyle = "#ffc864";
      ctx.fillRect(10, 22, 9, 8);
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
      minion: { body: "#4a3030", armor: "#5a4040" },
      warrior: { body: "#3a3a4a", armor: "#5050a0" },
      champion: { body: "#2a2a2a", armor: "#a05050" },
    };
    const color = colors[e.type];
    const size = e.type === "champion" ? 30 : e.type === "warrior" ? 25 : 20;

    // Body
    ctx.fillStyle = color.body;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Armor
    ctx.fillStyle = color.armor;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ff3030";
    ctx.beginPath();
    ctx.arc(e.x - 6, e.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 6, e.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(e.x - 20, e.y - size - 12, 40, 6);
    ctx.fillStyle = "#c83232";
    ctx.fillRect(e.x - 20, e.y - size - 12, (e.health / e.maxHealth) * 40, 6);

    ctx.globalAlpha = 1;
  }

  private drawSlash(s: SlashEffect) {
    const ctx = this.ctx;
    const alpha = s.timer / (s.type === "light" ? 10 : 15);
    const length = s.type === "light" ? 50 : 70;

    ctx.save();
    ctx.translate(s.x, s.y);
    if (!s.facingRight) ctx.scale(-1, 1);

    // Main slash
    const color = s.type === "light" ? "100, 150, 255" : "255, 100, 100";
    ctx.strokeStyle = `rgba(${color}, ${alpha})`;
    ctx.lineWidth = s.type === "light" ? 4 : 8;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(length * 0.5, 0, length, 20);
    ctx.stroke();

    // Trail
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, -15);
    ctx.quadraticCurveTo(length * 0.4, 0, length - 5, 15);
    ctx.stroke();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
