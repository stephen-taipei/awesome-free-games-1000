/**
 * Minotaur Hunter Game Engine
 * Game #349
 *
 * Navigate the labyrinth and battle bull-headed beasts!
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
  stamina: number;
  maxStamina: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  isDashing: boolean;
  dashTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  rageBurst: boolean;
  rageBurstTimer: number;
}

interface Minotaur {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "warrior" | "berserker" | "king";
  facing: "left" | "right";
  isCharging: boolean;
  chargeTimer: number;
  chargeDuration: number;
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpearThrust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  score: number;
  health: number;
  stamina: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const DASH_SPEED = 12;
const ATTACK_DURATION = 18;

export class MinotaurHunterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private minotaurs: Minotaur[] = [];
  private platforms: Platform[] = [];
  private walls: Wall[] = [];
  private spearThrusts: SpearThrust[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private staminaRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 28,
      height: 42,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      stamina: 80,
      maxStamina: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      isDashing: false,
      dashTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      rageBurst: false,
      rageBurstTimer: 0,
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
        stamina: Math.floor(this.player.stamina),
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
    this.minotaurs = [];
    this.platforms = [];
    this.walls = [];
    this.spearThrusts = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.stamina = 80;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    // Ground
    this.platforms.push({ x: 0, y: h - 40, width: this.levelWidth, height: 40 });

    // Labyrinth platforms
    const platformCount = 6 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 160 + i * 200 + Math.random() * 70,
        y: h - 110 - Math.random() * 140,
        width: 75 + Math.random() * 50,
        height: 18,
      });
    }

    // Labyrinth walls
    for (let i = 0; i < 8; i++) {
      this.walls.push({
        x: 200 + i * 280,
        y: h - 200 - Math.random() * 100,
        width: 20,
        height: 100 + Math.random() * 80,
      });
    }

    // Minotaurs
    const minotaurCount = 2 + this.level;
    const types: Minotaur["type"][] = ["warrior", "berserker", "king"];

    for (let i = 0; i < minotaurCount; i++) {
      const x = 400 + i * 400 + Math.random() * 100;
      const type = types[Math.floor(Math.random() * Math.min(types.length, 1 + Math.floor(this.level / 2)))];

      const sizeMultiplier = type === "king" ? 1.4 : type === "berserker" ? 1.2 : 1;

      this.minotaurs.push({
        x,
        y: h - 90 * sizeMultiplier,
        width: 42 * sizeMultiplier,
        height: 58 * sizeMultiplier,
        vx: Math.random() > 0.5 ? 2.5 : -2.5,
        health: type === "king" ? 10 : type === "berserker" ? 7 : 5,
        maxHealth: type === "king" ? 10 : type === "berserker" ? 7 : 5,
        type,
        facing: "left",
        isCharging: false,
        chargeTimer: 100,
        chargeDuration: 0,
        attackTimer: 80,
        patrolLeft: x - 140,
        patrolRight: x + 140,
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
    this.updateMinotaurs();
    this.updateSpearThrusts();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // Stamina regeneration
    this.staminaRegenTimer++;
    if (this.staminaRegenTimer >= 20 && !p.isDashing) {
      this.staminaRegenTimer = 0;
      p.stamina = Math.min(p.maxStamina, p.stamina + 2);
    }

    const speed = p.isDashing ? DASH_SPEED : MOVE_SPEED;

    // Horizontal movement
    if (this.keys.left) {
      p.vx = -speed;
      if (!p.isDashing) p.facing = "left";
    } else if (this.keys.right) {
      p.vx = speed;
      if (!p.isDashing) p.facing = "right";
    } else {
      p.vx = 0;
    }

    // Jump
    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    // Spear attack
    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.spearAttack();
    }

    // Special: Rage Burst
    if (this.keys.special && p.stamina >= 60 && !p.rageBurst) {
      p.stamina -= 60;
      p.rageBurst = true;
      p.rageBurstTimer = 120;
      this.rageBurstAttack();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.isDashing) {
      p.dashTimer--;
      if (p.dashTimer <= 0) p.isDashing = false;
    }

    if (p.rageBurst) {
      p.rageBurstTimer--;
      if (p.rageBurstTimer <= 0) p.rageBurst = false;
    }

    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) p.invincible = false;
    }

    p.vy += GRAVITY;
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

    // Wall collision
    for (const wall of this.walls) {
      if (this.checkEntityCollision(p, wall)) {
        if (p.vx > 0) p.x = wall.x - p.width;
        if (p.vx < 0) p.x = wall.x + wall.width;
        p.vx = 0;
      }
    }

    p.x = Math.max(0, Math.min(this.levelWidth - p.width, p.x));

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

  private spearAttack() {
    const p = this.player;
    const range = 60;
    const attackX = p.facing === "right" ? p.x + p.width : p.x - range;
    const damage = p.rageBurst ? 4 : 2;

    this.spearThrusts.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 12 : -12,
      vy: 0,
      size: 16,
      life: 22,
    });

    for (const m of this.minotaurs) {
      if (m.x + m.width > attackX && m.x < attackX + range && Math.abs(m.y - p.y) < 60) {
        m.health -= damage;
        p.stamina = Math.min(p.maxStamina, p.stamina + 8);
        if (m.health <= 0) {
          const points = m.type === "king" ? 200 : m.type === "berserker" ? 120 : 80;
          this.score += points;
          const idx = this.minotaurs.indexOf(m);
          if (idx !== -1) this.minotaurs.splice(idx, 1);
        }
      }
    }
  }

  private rageBurstAttack() {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.spearThrusts.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        size: 20,
        life: 40,
      });
    }
  }

  private updateSpearThrusts() {
    for (let i = this.spearThrusts.length - 1; i >= 0; i--) {
      const thrust = this.spearThrusts[i];
      thrust.x += thrust.vx;
      thrust.y += thrust.vy;
      thrust.life--;

      if (thrust.life <= 0) {
        this.spearThrusts.splice(i, 1);
        continue;
      }

      for (let j = this.minotaurs.length - 1; j >= 0; j--) {
        const m = this.minotaurs[j];
        if (this.checkThrustHit(thrust, m)) {
          m.health -= 2;
          this.spearThrusts.splice(i, 1);
          this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 5);
          if (m.health <= 0) {
            const points = m.type === "king" ? 200 : m.type === "berserker" ? 120 : 80;
            this.score += points;
            this.minotaurs.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkThrustHit(thrust: SpearThrust, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      thrust.x > target.x &&
      thrust.x < target.x + target.width &&
      thrust.y > target.y &&
      thrust.y < target.y + target.height
    );
  }

  private updateMinotaurs() {
    for (const m of this.minotaurs) {
      m.chargeTimer--;

      if (!m.isCharging) {
        m.x += m.vx;
        if (m.x <= m.patrolLeft || m.x >= m.patrolRight) m.vx = -m.vx;
        m.facing = m.vx < 0 ? "left" : "right";

        // Start charging
        if (m.chargeTimer <= 0) {
          const dx = this.player.x - m.x;
          if (Math.abs(dx) < 300) {
            m.isCharging = true;
            m.chargeDuration = 60;
            m.vx = (dx > 0 ? 1 : -1) * 8;
            m.chargeTimer = 120 - this.level * 8;
          }
        }
      } else {
        m.chargeDuration--;
        m.x += m.vx;

        if (m.chargeDuration <= 0) {
          m.isCharging = false;
          m.vx = m.vx > 0 ? 2.5 : -2.5;
        }
      }

      // Wall collision
      for (const wall of this.walls) {
        if (this.checkEntityCollision(m, wall)) {
          if (m.isCharging) {
            m.isCharging = false;
            m.vx = -m.vx * 0.3;
          } else {
            m.vx = -m.vx;
          }
        }
      }

      if (!this.player.invincible && this.checkEntityCollision(this.player, m)) {
        const damage = m.isCharging ? 35 : 20;
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
    if (this.player.rageBurst) damage = Math.floor(damage * 0.5);
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 20);

    if (this.player.health <= 0) this.gameOver();
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 3;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, this.cameraX));
  }

  private checkLevelComplete() {
    if (this.minotaurs.length === 0 && this.player.x > this.levelWidth - 100) {
      this.status = "clear";
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
    this.player.stamina = 80;
    this.setupLevel();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - dark labyrinth
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a2a1a");
    gradient.addColorStop(0.5, "#2a3a2a");
    gradient.addColorStop(1, "#3a4a3a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Stone brick pattern
    ctx.strokeStyle = "rgba(100, 100, 80, 0.2)";
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 40) {
      for (let x = 0; x < w; x += 60) {
        ctx.strokeRect(x, y, 60, 40);
      }
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Draw walls
    for (const wall of this.walls) {
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(wall.x, wall.y, wall.width, 8);
    }

    // Draw platforms
    for (const plat of this.platforms) {
      if (plat.height === 40) {
        ctx.fillStyle = "#4a3a2a";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#5a4a3a";
        ctx.fillRect(plat.x, plat.y, plat.width, 5);
      } else {
        ctx.fillStyle = "#6a5a4a";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#7a6a5a";
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
      }
    }

    for (const m of this.minotaurs) this.drawMinotaur(m);
    for (const thrust of this.spearThrusts) this.drawSpearThrust(thrust);
    this.drawPlayer();

    ctx.restore();
    this.drawUI();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.5;
    if (p.rageBurst) {
      ctx.shadowColor = "#ff6a3a";
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = "#8a5a3a";
    ctx.fillRect(p.x + 5, p.y + 12, p.width - 10, p.height - 12);

    ctx.fillStyle = "#deb887";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5a3a2a";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 6, 9, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(p.x + p.width / 2 - 4, p.y + 8, 2, 2);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 8, 2, 2);

    // Spear
    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 3;
    const spearX = p.facing === "right" ? p.x + p.width : p.x;
    const spearLen = p.isAttacking ? 25 : 18;
    ctx.beginPath();
    ctx.moveTo(spearX, p.y + p.height / 2);
    ctx.lineTo(spearX + (p.facing === "right" ? spearLen : -spearLen), p.y + p.height / 2);
    ctx.stroke();

    // Spear tip
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    const tipX = spearX + (p.facing === "right" ? spearLen : -spearLen);
    ctx.moveTo(tipX, p.y + p.height / 2);
    ctx.lineTo(tipX + (p.facing === "right" ? 6 : -6), p.y + p.height / 2 - 3);
    ctx.lineTo(tipX + (p.facing === "right" ? 6 : -6), p.y + p.height / 2 + 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawMinotaur(m: Minotaur) {
    const ctx = this.ctx;
    const colors = { warrior: "#5a3a2a", berserker: "#6a2a2a", king: "#7a4a2a" };

    if (m.isCharging) {
      ctx.shadowColor = "#ff4a3a";
      ctx.shadowBlur = 15;
    }

    ctx.fillStyle = colors[m.type];
    ctx.fillRect(m.x, m.y, m.width, m.height);

    // Bull head
    ctx.fillStyle = "#6a4a3a";
    ctx.beginPath();
    ctx.arc(m.x + m.width / 2, m.y + m.height * 0.3, m.width * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.strokeStyle = "#d0d0c0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(m.x + m.width * 0.2, m.y + m.height * 0.25);
    ctx.lineTo(m.x + m.width * 0.1, m.y + m.height * 0.1);
    ctx.moveTo(m.x + m.width * 0.8, m.y + m.height * 0.25);
    ctx.lineTo(m.x + m.width * 0.9, m.y + m.height * 0.1);
    ctx.stroke();

    // Eyes
    const eyeColor = m.isCharging ? "#ff3a3a" : "#ffa a3a";
    ctx.fillStyle = eyeColor;
    ctx.fillRect(m.x + m.width * 0.3, m.y + m.height * 0.28, m.width * 0.1, m.width * 0.1);
    ctx.fillRect(m.x + m.width * 0.6, m.y + m.height * 0.28, m.width * 0.1, m.width * 0.1);

    ctx.shadowBlur = 0;

    if (m.health < m.maxHealth) {
      const barWidth = m.width;
      const hpPercent = m.health / m.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(m.x, m.y - 10, barWidth, 4);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(m.x, m.y - 10, barWidth * hpPercent, 4);
    }
  }

  private drawSpearThrust(thrust: SpearThrust) {
    const ctx = this.ctx;
    const angle = Math.atan2(thrust.vy, thrust.vx);

    ctx.save();
    ctx.translate(thrust.x, thrust.y);
    ctx.rotate(angle);

    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -4);
    ctx.lineTo(4, 4);
    ctx.fill();

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, 150, 15);

    const staminaPercent = p.stamina / p.maxStamina;
    ctx.fillStyle = "#ff8a3a";
    ctx.fillRect(x, y, 150 * staminaPercent, 15);

    ctx.strokeStyle = "#cc6a2a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 150, 15);

    if (p.rageBurst) {
      ctx.fillStyle = "#ff6a3a";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff6a3a";
      ctx.shadowBlur = 10;
      ctx.fillText("RAGE BURST", x, y + 30);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
