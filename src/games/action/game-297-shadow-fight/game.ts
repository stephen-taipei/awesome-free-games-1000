/**
 * Shadow Fight Game Engine
 * Game #297
 *
 * Silhouette combat with stylish effects!
 */

interface Shadow {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  energy: number;
  facing: "left" | "right";
  state: "idle" | "walk" | "jump" | "slash" | "thrust" | "spin" | "block" | "hit" | "dead";
  stateTimer: number;
  isPlayer: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  timer: number;
  color: string;
}

interface GameState {
  playerHealth: number;
  enemyHealth: number;
  wave: number;
  kills: number;
  status: "idle" | "playing" | "waveEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.7;
const JUMP_FORCE = -14;
const MOVE_SPEED = 6;
const SLASH_DAMAGE = 15;
const THRUST_DAMAGE = 20;
const SPIN_DAMAGE = 30;
const ATTACK_DURATION = 18;
const HIT_STUN = 15;

export class ShadowFightGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Shadow;
  private enemies: Shadow[] = [];
  private slashEffects: SlashEffect[] = [];
  private wave = 1;
  private kills = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = {
    left: false,
    right: false,
    jump: false,
    slash: false,
    thrust: false,
    spin: false,
    block: false,
  };
  private groundY = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createShadow(true);
  }

  private createShadow(isPlayer: boolean, x?: number): Shadow {
    return {
      x: x ?? (isPlayer ? 100 : this.canvas.width - 100),
      y: 0,
      width: 40,
      height: 70,
      vx: 0,
      vy: 0,
      health: isPlayer ? 100 : 30 + this.wave * 10,
      maxHealth: isPlayer ? 100 : 30 + this.wave * 10,
      energy: 100,
      facing: isPlayer ? "right" : "left",
      state: "idle",
      stateTimer: 0,
      isPlayer,
      trail: [],
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        playerHealth: this.player.health,
        enemyHealth: this.enemies.length > 0 ? this.enemies[0].health : 0,
        wave: this.wave,
        kills: this.kills,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.groundY = this.canvas.height - 60;
    this.draw();
  }

  start() {
    this.wave = 1;
    this.kills = 0;
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.player = this.createShadow(true);
    this.player.y = this.groundY - this.player.height;
    this.enemies = [];
    this.slashEffects = [];
    this.spawnTimer = 0;

    // Spawn initial enemies
    const count = Math.min(2 + Math.floor(this.wave / 2), 5);
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side > 0 ? this.canvas.width + 50 : -50;
    const enemy = this.createShadow(false, x);
    enemy.y = this.groundY - enemy.height;
    enemy.facing = side > 0 ? "left" : "right";
    this.enemies.push(enemy);
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
    this.updateShadow(this.player, true);

    for (const enemy of this.enemies) {
      this.updateShadow(enemy, false);
      this.updateEnemyAI(enemy);
    }

    this.updateSlashEffects();
    this.checkCollisions();
    this.checkWaveEnd();

    // Spawn more enemies
    this.spawnTimer++;
    if (this.spawnTimer >= 180 && this.enemies.length < 3 + this.wave) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    this.emitState();
  }

  private updateShadow(s: Shadow, isPlayer: boolean) {
    // Update trail
    s.trail.unshift({ x: s.x + s.width / 2, y: s.y + s.height / 2, alpha: 1 });
    if (s.trail.length > 8) s.trail.pop();
    for (const t of s.trail) {
      t.alpha -= 0.12;
    }

    // State timer
    if (s.stateTimer > 0) {
      s.stateTimer--;
      if (s.stateTimer === 0 && s.state !== "dead") {
        s.state = "idle";
      }
    }

    const canMove = s.state === "idle" || s.state === "walk" || s.state === "jump";
    const canAttack = s.state === "idle" || s.state === "walk";

    if (isPlayer && canMove) {
      if (this.keys.left) {
        s.vx = -MOVE_SPEED;
        s.facing = "left";
        if (s.state !== "jump") s.state = "walk";
      } else if (this.keys.right) {
        s.vx = MOVE_SPEED;
        s.facing = "right";
        if (s.state !== "jump") s.state = "walk";
      } else {
        s.vx = 0;
        if (s.state === "walk") s.state = "idle";
      }

      if (this.keys.jump && s.y >= this.groundY - s.height - 1) {
        s.vy = JUMP_FORCE;
        s.state = "jump";
      }

      if (this.keys.block && canAttack) {
        s.state = "block";
        s.vx = 0;
      }
    }

    // Attacks
    if (isPlayer && canAttack) {
      if (this.keys.slash) {
        this.performAttack(s, "slash");
      } else if (this.keys.thrust) {
        this.performAttack(s, "thrust");
      } else if (this.keys.spin && s.energy >= 30) {
        this.performAttack(s, "spin");
        s.energy -= 30;
      }
    }

    // Energy regeneration
    if (isPlayer && s.state === "idle") {
      s.energy = Math.min(100, s.energy + 0.5);
    }

    // Gravity
    if (s.y < this.groundY - s.height) {
      s.vy += GRAVITY;
    }

    s.x += s.vx;
    s.y += s.vy;

    // Ground
    if (s.y >= this.groundY - s.height) {
      s.y = this.groundY - s.height;
      s.vy = 0;
      if (s.state === "jump") s.state = "idle";
    }

    // Bounds
    s.x = Math.max(0, Math.min(this.canvas.width - s.width, s.x));
  }

  private performAttack(s: Shadow, type: "slash" | "thrust" | "spin") {
    s.state = type;
    s.stateTimer = type === "spin" ? ATTACK_DURATION + 10 : ATTACK_DURATION;
    s.vx = 0;

    // Add slash effect
    const angle = type === "slash" ? (s.facing === "right" ? -0.5 : Math.PI + 0.5)
      : type === "thrust" ? (s.facing === "right" ? 0 : Math.PI)
      : 0;

    this.slashEffects.push({
      x: s.x + (s.facing === "right" ? s.width : 0),
      y: s.y + s.height / 2,
      angle,
      timer: 12,
      color: s.isPlayer ? "#00ffff" : "#ff4444",
    });
  }

  private updateEnemyAI(enemy: Shadow) {
    if (enemy.state === "dead" || enemy.state === "hit") return;

    const dx = this.player.x - enemy.x;
    const dist = Math.abs(dx);
    const canMove = enemy.state === "idle" || enemy.state === "walk";
    const canAttack = enemy.state === "idle" || enemy.state === "walk";

    enemy.facing = dx > 0 ? "right" : "left";

    if (canMove) {
      if (dist > 60) {
        enemy.vx = (dx > 0 ? MOVE_SPEED : -MOVE_SPEED) * 0.6;
        enemy.state = "walk";
      } else {
        enemy.vx = 0;
        if (enemy.state === "walk") enemy.state = "idle";
      }

      // Random jump
      if (Math.random() < 0.008 && enemy.y >= this.groundY - enemy.height - 1) {
        enemy.vy = JUMP_FORCE;
        enemy.state = "jump";
      }
    }

    // Attack
    if (canAttack && dist < 70 && Math.random() < 0.03) {
      const attack = Math.random() < 0.6 ? "slash" : "thrust";
      this.performAttack(enemy, attack);
    }
  }

  private updateSlashEffects() {
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      this.slashEffects[i].timer--;
      if (this.slashEffects[i].timer <= 0) {
        this.slashEffects.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    // Player attacks enemies
    if (this.player.stateTimer === ATTACK_DURATION - 8 ||
        this.player.stateTimer === ATTACK_DURATION + 2) {
      if (this.player.state === "slash" || this.player.state === "thrust" || this.player.state === "spin") {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          if (this.checkAttackHit(this.player, enemy)) {
            let damage = SLASH_DAMAGE;
            if (this.player.state === "thrust") damage = THRUST_DAMAGE;
            if (this.player.state === "spin") damage = SPIN_DAMAGE;

            enemy.health -= damage;
            enemy.state = "hit";
            enemy.stateTimer = HIT_STUN;
            enemy.vx = this.player.facing === "right" ? 8 : -8;

            if (enemy.health <= 0) {
              enemy.state = "dead";
              this.kills++;
              setTimeout(() => {
                const idx = this.enemies.indexOf(enemy);
                if (idx !== -1) this.enemies.splice(idx, 1);
              }, 500);
            }
          }
        }
      }
    }

    // Enemies attack player
    for (const enemy of this.enemies) {
      if (enemy.stateTimer === ATTACK_DURATION - 8) {
        if (enemy.state === "slash" || enemy.state === "thrust") {
          if (this.checkAttackHit(enemy, this.player)) {
            if (this.player.state === "block") {
              // Blocked
              this.player.energy -= 10;
            } else {
              const damage = enemy.state === "thrust" ? 15 : 10;
              this.player.health -= damage;
              this.player.state = "hit";
              this.player.stateTimer = HIT_STUN;
              this.player.vx = enemy.facing === "right" ? 5 : -5;
            }
          }
        }
      }
    }

    // Check game over
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.player.state = "dead";
      this.gameOver();
    }
  }

  private checkAttackHit(attacker: Shadow, target: Shadow): boolean {
    const range = attacker.state === "spin" ? 80 : 60;
    const attackX = attacker.facing === "right"
      ? attacker.x + attacker.width
      : attacker.x - range;

    return (
      attackX < target.x + target.width &&
      attackX + range > target.x &&
      Math.abs(attacker.y - target.y) < 50
    );
  }

  private checkWaveEnd() {
    if (this.enemies.length === 0 && this.kills >= 3 + this.wave * 2) {
      this.status = "waveEnd";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextWave() {
    this.wave++;
    this.player.health = Math.min(100, this.player.health + 30);
    this.player.energy = 100;
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

    // Dark background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(20, 20, 40, 0.5)");
    gradient.addColorStop(1, "rgba(5, 5, 10, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#1a1a25";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Ground line glow
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#004455";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw slash effects
    for (const effect of this.slashEffects) {
      this.drawSlashEffect(effect);
    }

    // Draw shadows
    for (const enemy of this.enemies) {
      this.drawShadow(enemy);
    }
    this.drawShadow(this.player);

    // UI
    this.drawUI();
  }

  private drawShadow(s: Shadow) {
    const ctx = this.ctx;

    // Draw trail
    for (const t of s.trail) {
      if (t.alpha > 0) {
        ctx.globalAlpha = t.alpha * 0.3;
        ctx.fillStyle = s.isPlayer ? "#00ffff" : "#ff4444";
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 15, 25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Shadow body - silhouette style
    ctx.fillStyle = s.isPlayer ? "#111" : "#1a0a0a";

    // Glow effect
    ctx.shadowColor = s.isPlayer ? "#00ffff" : "#ff4444";
    ctx.shadowBlur = s.state === "hit" ? 20 : 10;

    // Body
    ctx.beginPath();
    ctx.ellipse(s.x + s.width / 2, s.y + s.height * 0.6, s.width / 2, s.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(s.x + s.width / 2, s.y + 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // Eyes glow
    const eyeOffset = s.facing === "right" ? 3 : -3;
    ctx.fillStyle = s.isPlayer ? "#00ffff" : "#ff4444";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(s.x + s.width / 2 + eyeOffset, s.y + 13, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Attack weapon glow
    if (s.state === "slash" || s.state === "thrust" || s.state === "spin") {
      const weaponColor = s.isPlayer ? "#00ffff" : "#ff4444";
      ctx.strokeStyle = weaponColor;
      ctx.shadowColor = weaponColor;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;

      const wx = s.facing === "right" ? s.x + s.width : s.x;
      const wy = s.y + s.height / 2;
      const dir = s.facing === "right" ? 1 : -1;

      if (s.state === "spin") {
        const angle = (s.stateTimer / 28) * Math.PI * 4;
        ctx.beginPath();
        ctx.arc(s.x + s.width / 2, s.y + s.height / 2, 40, angle, angle + Math.PI);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + 50 * dir, wy + (s.state === "slash" ? -20 : 0));
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    }

    // Block shield
    if (s.state === "block") {
      ctx.strokeStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x + s.width / 2, s.y + s.height / 2, 35, -0.5, 0.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Dead effect
    if (s.state === "dead") {
      ctx.globalAlpha = 0.5;
    }
  }

  private drawSlashEffect(effect: SlashEffect) {
    const ctx = this.ctx;
    const alpha = effect.timer / 12;

    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.angle);
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 4;

    // Arc slash
    ctx.beginPath();
    ctx.arc(0, 0, 40 + (12 - effect.timer) * 3, -0.8, 0.8);
    ctx.stroke();

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const w = this.canvas.width;

    // Player health bar
    const barWidth = 200;
    const barHeight = 12;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x, y, barWidth, barHeight);

    const hpPercent = this.player.health / this.player.maxHealth;
    ctx.fillStyle = hpPercent > 0.5 ? "#00ffff" : hpPercent > 0.25 ? "#ffaa00" : "#ff4444";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
    ctx.shadowBlur = 0;

    // Energy bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y + 18, barWidth, 6);
    ctx.fillStyle = "#9b59b6";
    ctx.fillRect(x, y + 18, barWidth * (this.player.energy / 100), 6);

    // Wave and kills
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Wave ${this.wave}`, w - 20, 30);
    ctx.fillText(`Kills: ${this.kills}`, w - 20, 50);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
