/**
 * Sonic Fighter Game Engine
 * Game #330
 *
 * Harness the power of sound waves to defeat enemies!
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  sonic: number;
  maxSonic: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  resonance: boolean;
  resonanceTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  type: "drone" | "mech" | "tank";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  dazed: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  direction: "left" | "right" | "all";
  alpha: number;
  damage: number;
}

interface SonicRing {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  rotation: number;
}

interface GameState {
  score: number;
  health: number;
  sonic: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 6;
const ATTACK_DURATION = 20;

export class SonicFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private soundWaves: SoundWave[] = [];
  private sonicRings: SonicRing[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private sonicRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 30,
      height: 44,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      sonic: 100,
      maxSonic: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      resonance: false,
      resonanceTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        health: this.player.health,
        sonic: Math.floor(this.player.sonic),
        level: this.level,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.player = this.createPlayer();
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupLevel() {
    this.enemies = [];
    this.platforms = [];
    this.soundWaves = [];
    this.sonicRings = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.sonic = this.player.maxSonic;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    // Ground
    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    // Metal platforms
    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 140 + i * 165 + Math.random() * 60,
        y: h - 110 - Math.random() * 150,
        width: 90 + Math.random() * 50,
        height: 18,
      });
    }

    // Robot enemies
    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["drone", "mech", "tank"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 280 + i * 210 + Math.random() * 60;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 80,
        width: type === "tank" ? 44 : type === "mech" ? 34 : 28,
        height: type === "tank" ? 36 : type === "mech" ? 46 : 32,
        vx: type === "tank" ? 1.5 : type === "drone" ? 3 : 2,
        type,
        health: type === "tank" ? 6 : type === "mech" ? 4 : 2,
        maxHealth: type === "tank" ? 6 : type === "mech" ? 4 : 2,
        facing: "left",
        attackTimer: 0,
        patrolLeft: x - 90,
        patrolRight: x + 90,
        dazed: 0,
      });
    }
  }

  setKey(key: keyof typeof this.keys, value: boolean) {
    this.keys[key] = value;
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
    this.updateSoundWaves();
    this.updateSonicRings();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Sonic energy regeneration
    this.sonicRegenTimer++;
    if (this.sonicRegenTimer >= 25) {
      this.sonicRegenTimer = 0;
      p.sonic = Math.min(p.maxSonic, p.sonic + 2);
    }

    // Horizontal movement
    if (this.keys.left) {
      p.vx = -MOVE_SPEED;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = MOVE_SPEED;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump
    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Sound Wave Attack
    if (this.keys.attack && !p.isAttacking && p.sonic >= 10) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      p.sonic -= 10;
      this.createSoundWave(p.x + p.width / 2, p.y + p.height / 2, p.facing);
    }

    // Special: Resonance Burst (360 degree attack)
    if (this.keys.special && p.sonic >= 40 && !p.resonance) {
      p.sonic -= 40;
      p.resonance = true;
      p.resonanceTimer = 120;
      this.createSoundWave(p.x + p.width / 2, p.y + p.height / 2, "all");
      // Create visual rings
      for (let i = 0; i < 3; i++) {
        this.sonicRings.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          radius: 20 + i * 15,
          alpha: 1,
          rotation: i * 0.5,
        });
      }
    }

    // Update attack timer
    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update resonance
    if (p.resonance) {
      p.resonanceTimer--;
      // Create ambient rings
      if (p.resonanceTimer % 20 === 0) {
        this.sonicRings.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          radius: 15,
          alpha: 0.6,
          rotation: Math.random() * Math.PI * 2,
        });
      }
      if (p.resonanceTimer <= 0) {
        p.resonance = false;
      }
    }

    // Update invincibility
    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) {
        p.invincible = false;
      }
    }

    // Apply gravity
    p.vy += GRAVITY;

    // Apply velocity
    p.x += p.vx;
    p.y += p.vy;

    // Platform collision
    p.isJumping = true;
    for (const plat of this.platforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.isJumping = false;
        }
      }
    }

    // World bounds
    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));

    // Fall death
    if (p.y > this.canvas.height + 100) {
      p.health = 0;
      this.gameOver();
    }
  }

  private checkPlatformCollision(entity: { x: number; y: number; width: number; height: number; vy?: number }, plat: Platform): boolean {
    return (
      entity.x < plat.x + plat.width &&
      entity.x + entity.width > plat.x &&
      entity.y + entity.height >= plat.y &&
      entity.y + entity.height <= plat.y + plat.height + 10 &&
      (entity.vy === undefined || entity.vy >= 0)
    );
  }

  private createSoundWave(x: number, y: number, direction: "left" | "right" | "all") {
    const damage = this.player.resonance ? 3 : 2;
    this.soundWaves.push({
      x,
      y,
      radius: 20,
      maxRadius: direction === "all" ? 150 : 120,
      direction,
      alpha: 1,
      damage,
    });
  }

  private updateSoundWaves() {
    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const wave = this.soundWaves[i];
      wave.radius += 6;
      wave.alpha -= 0.02;

      // Check enemy hits
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = (e.x + e.width / 2) - wave.x;
        const dy = (e.y + e.height / 2) - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if in wave range and correct direction
        let inRange = false;
        if (wave.direction === "all") {
          inRange = dist < wave.radius && dist > wave.radius - 30;
        } else if (wave.direction === "right") {
          inRange = dx > 0 && dx < wave.radius && Math.abs(dy) < 50;
        } else {
          inRange = dx < 0 && Math.abs(dx) < wave.radius && Math.abs(dy) < 50;
        }

        if (inRange && wave.alpha > 0.5) {
          e.health -= wave.damage;
          e.dazed = 45;

          if (e.health <= 0) {
            this.score += e.type === "tank" ? 50 : e.type === "mech" ? 35 : 20;
            // Create explosion rings
            for (let k = 0; k < 3; k++) {
              this.sonicRings.push({
                x: e.x + e.width / 2,
                y: e.y + e.height / 2,
                radius: 10 + k * 10,
                alpha: 1,
                rotation: k * 0.8,
              });
            }
            this.enemies.splice(j, 1);
          }
        }
      }

      if (wave.alpha <= 0 || wave.radius >= wave.maxRadius) {
        this.soundWaves.splice(i, 1);
      }
    }
  }

  private updateSonicRings() {
    for (let i = this.sonicRings.length - 1; i >= 0; i--) {
      const ring = this.sonicRings[i];
      ring.radius += 3;
      ring.alpha -= 0.03;
      ring.rotation += 0.1;

      if (ring.alpha <= 0) {
        this.sonicRings.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Skip if dazed
      if (e.dazed > 0) {
        e.dazed--;
        continue;
      }

      // Different movement for drones (float up and down)
      if (e.type === "drone") {
        e.y += Math.sin(Date.now() / 300) * 0.5;
      }

      // Patrol movement
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      // Check player collision
      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "tank" ? 18 : e.type === "mech" ? 12 : 8;
        this.hitPlayer(damage);
      }
    }
  }

  private checkEntityCollision(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private hitPlayer(damage: number) {
    if (this.player.resonance) {
      damage = Math.floor(damage * 0.5);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;

    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 3;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, this.cameraX));
  }

  private checkLevelComplete() {
    if (this.enemies.length === 0 && this.player.x > this.levelWidth - 100) {
      this.status = "clear";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
    this.player.sonic = this.player.maxSonic;
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

    // Background - tech/cyber theme
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = "rgba(0, 200, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw platforms
    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    // Draw sonic rings
    for (const ring of this.sonicRings) {
      this.drawSonicRing(ring);
    }

    // Draw sound waves
    for (const wave of this.soundWaves) {
      this.drawSoundWave(wave);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    // Draw player
    this.drawPlayer();

    ctx.restore();

    // UI overlay
    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      // Ground - metallic
      ctx.fillStyle = "#2a2a3e";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a3a4e";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);

      // Tech lines
      ctx.strokeStyle = "rgba(0, 200, 255, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < plat.width; i += 80) {
        ctx.beginPath();
        ctx.moveTo(plat.x + i, plat.y);
        ctx.lineTo(plat.x + i + 40, plat.y + 20);
        ctx.stroke();
      }
    } else {
      // Floating platform
      ctx.fillStyle = "#2a2a4e";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.strokeStyle = "#00c8ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Resonance aura
    if (p.resonance) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 80) * 0.15;
      ctx.strokeStyle = "#00c8ff";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const r = 25 + i * 10 + Math.sin(Date.now() / 100 + i) * 5;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Body (tech suit)
    ctx.fillStyle = p.resonance ? "#0066aa" : "#004488";
    ctx.fillRect(p.x + 2, p.y + 12, p.width - 4, p.height - 12);

    // Helmet
    ctx.fillStyle = "#002244";
    ctx.fillRect(p.x, p.y, p.width, 14);

    // Visor (glowing)
    ctx.fillStyle = "#00c8ff";
    ctx.shadowColor = "#00c8ff";
    ctx.shadowBlur = 10;
    ctx.fillRect(p.x + 4, p.y + 4, p.width - 8, 6);
    ctx.shadowBlur = 0;

    // Sound emitters on arms
    ctx.fillStyle = "#00c8ff";
    if (p.facing === "right") {
      ctx.fillRect(p.x + p.width - 2, p.y + 18, 6, 8);
    } else {
      ctx.fillRect(p.x - 4, p.y + 18, 6, 8);
    }

    // Attack effect
    if (p.isAttacking) {
      ctx.strokeStyle = "#00c8ff";
      ctx.shadowColor = "#00c8ff";
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (p.facing === "right") {
        ctx.arc(p.x + p.width + 20, p.y + p.height / 2, 20, -0.5, 0.5);
      } else {
        ctx.arc(p.x - 20, p.y + p.height / 2, 20, Math.PI - 0.5, Math.PI + 0.5);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    // Dazed effect
    if (e.dazed > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.3;
    }

    // Body color based on type
    const colors = {
      drone: "#505050",
      mech: "#606070",
      tank: "#404050",
    };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    // Robot eyes
    ctx.fillStyle = "#ff3300";
    ctx.shadowColor = "#ff3300";
    ctx.shadowBlur = 5;
    if (e.type === "drone") {
      ctx.fillRect(e.x + e.width / 2 - 4, e.y + 5, 8, 4);
    } else {
      ctx.fillRect(e.x + 5, e.y + 8, 5, 4);
      ctx.fillRect(e.x + e.width - 10, e.y + 8, 5, 4);
    }
    ctx.shadowBlur = 0;

    // Type-specific details
    if (e.type === "tank") {
      // Cannon
      ctx.fillStyle = "#303040";
      ctx.fillRect(e.facing === "right" ? e.x + e.width : e.x - 15, e.y + e.height / 2 - 4, 15, 8);
      // Treads
      ctx.fillStyle = "#252530";
      ctx.fillRect(e.x - 3, e.y + e.height - 8, e.width + 6, 10);
    } else if (e.type === "mech") {
      // Shoulders
      ctx.fillStyle = "#505060";
      ctx.fillRect(e.x - 5, e.y + 5, 8, 12);
      ctx.fillRect(e.x + e.width - 3, e.y + 5, 8, 12);
    } else if (e.type === "drone") {
      // Propellers
      ctx.fillStyle = "rgba(100, 100, 120, 0.5)";
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y - 5, 15 + Math.sin(Date.now() / 50) * 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Health bar
    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#00c8ff";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawSoundWave(wave: SoundWave) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = wave.alpha;
    ctx.strokeStyle = "#00c8ff";
    ctx.shadowColor = "#00c8ff";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;

    if (wave.direction === "all") {
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      if (wave.direction === "right") {
        ctx.arc(wave.x, wave.y, wave.radius, -0.4, 0.4);
      } else {
        ctx.arc(wave.x, wave.y, wave.radius, Math.PI - 0.4, Math.PI + 0.4);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSonicRing(ring: SonicRing) {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = ring.alpha;
    ctx.translate(ring.x, ring.y);
    ctx.rotate(ring.rotation);

    ctx.strokeStyle = "#00c8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

    // Health bar
    const barWidth = 150;
    const barHeight = 15;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = p.health / p.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#00c864" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "#00c8ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Sonic bar
    const sonicY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, sonicY, barWidth, barHeight);

    const sonicPercent = p.sonic / p.maxSonic;
    ctx.fillStyle = "#00c8ff";
    ctx.fillRect(x, sonicY, barWidth * sonicPercent, barHeight);

    ctx.strokeStyle = "#00c8ff";
    ctx.strokeRect(x, sonicY, barWidth, barHeight);

    // Resonance indicator
    if (p.resonance) {
      ctx.fillStyle = "#00c8ff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("RESONANCE ACTIVE", x, sonicY + barHeight + 20);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
