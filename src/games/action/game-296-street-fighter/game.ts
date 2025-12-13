/**
 * Street Fighter Lite Game Engine
 * Game #296
 *
 * Classic 1v1 fighting game with combo system!
 */

interface Fighter {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  facing: "left" | "right";
  state: "idle" | "walk" | "jump" | "punch" | "kick" | "special" | "block" | "hit" | "ko";
  stateTimer: number;
  combo: number;
  isPlayer: boolean;
  color: string;
  name: string;
}

interface HitEffect {
  x: number;
  y: number;
  timer: number;
  type: "punch" | "kick" | "special";
}

interface GameState {
  playerHealth: number;
  enemyHealth: number;
  combo: number;
  round: number;
  wins: number;
  status: "idle" | "playing" | "roundEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5;
const PUNCH_DAMAGE = 8;
const KICK_DAMAGE = 12;
const SPECIAL_DAMAGE = 25;
const ATTACK_DURATION = 15;
const HIT_STUN = 20;
const SPECIAL_COST = 30;

export class StreetFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Fighter;
  private enemy: Fighter;
  private hitEffects: HitEffect[] = [];
  private round = 1;
  private wins = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = {
    left: false,
    right: false,
    jump: false,
    punch: false,
    kick: false,
    special: false,
    block: false,
  };
  private groundY = 0;
  private aiTimer = 0;
  private roundTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createFighter(true);
    this.enemy = this.createFighter(false);
  }

  private createFighter(isPlayer: boolean): Fighter {
    return {
      x: isPlayer ? 100 : 400,
      y: 0,
      width: 50,
      height: 80,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      energy: 0,
      maxEnergy: 100,
      facing: isPlayer ? "right" : "left",
      state: "idle",
      stateTimer: 0,
      combo: 0,
      isPlayer,
      color: isPlayer ? "#3498db" : "#e74c3c",
      name: isPlayer ? "Player" : "CPU",
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        playerHealth: this.player.health,
        enemyHealth: this.enemy.health,
        combo: this.player.combo,
        round: this.round,
        wins: this.wins,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.groundY = this.canvas.height - 80;
    this.draw();
  }

  start() {
    this.round = 1;
    this.wins = 0;
    this.setupRound();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupRound() {
    const w = this.canvas.width;
    this.player = this.createFighter(true);
    this.enemy = this.createFighter(false);
    this.player.x = w * 0.2;
    this.enemy.x = w * 0.8 - 50;
    this.player.y = this.groundY - this.player.height;
    this.enemy.y = this.groundY - this.enemy.height;
    this.hitEffects = [];
    this.roundTimer = 0;
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
    this.roundTimer++;
    this.updateFighter(this.player, true);
    this.updateFighter(this.enemy, false);
    this.updateAI();
    this.updateHitEffects();
    this.checkCollisions();
    this.checkRoundEnd();
    this.emitState();
  }

  private updateFighter(f: Fighter, isPlayer: boolean) {
    // State timer
    if (f.stateTimer > 0) {
      f.stateTimer--;
      if (f.stateTimer === 0 && f.state !== "ko") {
        f.state = "idle";
        if (f.state === "hit") f.combo = 0;
      }
    }

    // Can only control if not in attack/hit state
    const canMove = f.state === "idle" || f.state === "walk" || f.state === "jump";
    const canAttack = f.state === "idle" || f.state === "walk";

    if (isPlayer && canMove) {
      // Horizontal movement
      if (this.keys.left) {
        f.vx = -MOVE_SPEED;
        f.facing = "left";
        if (f.state !== "jump") f.state = "walk";
      } else if (this.keys.right) {
        f.vx = MOVE_SPEED;
        f.facing = "right";
        if (f.state !== "jump") f.state = "walk";
      } else {
        f.vx = 0;
        if (f.state === "walk") f.state = "idle";
      }

      // Jump
      if (this.keys.jump && f.y >= this.groundY - f.height - 1) {
        f.vy = JUMP_FORCE;
        f.state = "jump";
      }

      // Block
      if (this.keys.block && canAttack) {
        f.state = "block";
        f.vx = 0;
      }
    }

    // Attacks
    if (isPlayer && canAttack) {
      if (this.keys.punch) {
        this.performAttack(f, "punch");
      } else if (this.keys.kick) {
        this.performAttack(f, "kick");
      } else if (this.keys.special && f.energy >= SPECIAL_COST) {
        this.performAttack(f, "special");
        f.energy -= SPECIAL_COST;
      }
    }

    // Apply gravity
    if (f.y < this.groundY - f.height) {
      f.vy += GRAVITY;
    }

    // Apply velocity
    f.x += f.vx;
    f.y += f.vy;

    // Ground collision
    if (f.y >= this.groundY - f.height) {
      f.y = this.groundY - f.height;
      f.vy = 0;
      if (f.state === "jump") f.state = "idle";
    }

    // World bounds
    f.x = Math.max(0, Math.min(this.canvas.width - f.width, f.x));

    // Face opponent
    if (canMove && !isPlayer) {
      f.facing = this.player.x < f.x ? "left" : "right";
    } else if (canMove && isPlayer) {
      // Player can face either way based on input
    }
  }

  private performAttack(f: Fighter, type: "punch" | "kick" | "special") {
    f.state = type;
    f.stateTimer = type === "special" ? ATTACK_DURATION * 2 : ATTACK_DURATION;
    f.vx = 0;
  }

  private updateAI() {
    if (this.enemy.state === "ko" || this.enemy.state === "hit") return;

    this.aiTimer++;
    const canMove = this.enemy.state === "idle" || this.enemy.state === "walk";
    const canAttack = this.enemy.state === "idle" || this.enemy.state === "walk";

    const dx = this.player.x - this.enemy.x;
    const dist = Math.abs(dx);

    if (canMove) {
      // Move towards player
      if (dist > 80) {
        this.enemy.vx = dx > 0 ? MOVE_SPEED * 0.7 : -MOVE_SPEED * 0.7;
        this.enemy.state = "walk";
      } else {
        this.enemy.vx = 0;
        if (this.enemy.state === "walk") this.enemy.state = "idle";
      }

      // Random jump
      if (Math.random() < 0.01 && this.enemy.y >= this.groundY - this.enemy.height - 1) {
        this.enemy.vy = JUMP_FORCE;
        this.enemy.state = "jump";
      }

      // Block incoming attacks
      if (dist < 100 && this.player.state === "punch" || this.player.state === "kick" || this.player.state === "special") {
        if (Math.random() < 0.3) {
          this.enemy.state = "block";
          this.enemy.stateTimer = 30;
        }
      }
    }

    // Attack when close
    if (canAttack && dist < 70 && this.aiTimer % 30 === 0) {
      const attackRoll = Math.random();
      if (attackRoll < 0.4) {
        this.performAttack(this.enemy, "punch");
      } else if (attackRoll < 0.7) {
        this.performAttack(this.enemy, "kick");
      } else if (this.enemy.energy >= SPECIAL_COST) {
        this.performAttack(this.enemy, "special");
        this.enemy.energy -= SPECIAL_COST;
      }
    }
  }

  private checkCollisions() {
    this.checkAttackHit(this.player, this.enemy);
    this.checkAttackHit(this.enemy, this.player);
  }

  private checkAttackHit(attacker: Fighter, defender: Fighter) {
    if (attacker.stateTimer !== ATTACK_DURATION - 5 &&
        attacker.stateTimer !== ATTACK_DURATION * 2 - 5) return;
    if (attacker.state !== "punch" && attacker.state !== "kick" && attacker.state !== "special") return;

    const attackRange = attacker.state === "special" ? 100 : 60;
    const attackX = attacker.facing === "right"
      ? attacker.x + attacker.width
      : attacker.x - attackRange;

    const hitBox = {
      x: attackX,
      y: attacker.y,
      width: attackRange,
      height: attacker.height,
    };

    if (this.rectIntersect(hitBox, defender)) {
      // Check if blocking
      if (defender.state === "block") {
        // Blocked - reduced damage
        const damage = attacker.state === "special" ? 5 : 2;
        defender.health -= damage;
        this.addHitEffect(defender.x + defender.width / 2, defender.y + 20, "punch");
      } else {
        // Full hit
        let damage = PUNCH_DAMAGE;
        if (attacker.state === "kick") damage = KICK_DAMAGE;
        if (attacker.state === "special") damage = SPECIAL_DAMAGE;

        // Combo bonus
        if (attacker.isPlayer) {
          attacker.combo++;
          damage += attacker.combo * 2;
        }

        defender.health -= damage;
        defender.state = "hit";
        defender.stateTimer = HIT_STUN;
        defender.vx = attacker.facing === "right" ? 5 : -5;

        // Energy gain
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 10);

        this.addHitEffect(
          defender.x + defender.width / 2,
          defender.y + defender.height / 3,
          attacker.state as "punch" | "kick" | "special"
        );
      }
    }
  }

  private rectIntersect(a: { x: number; y: number; width: number; height: number }, b: Fighter): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private addHitEffect(x: number, y: number, type: "punch" | "kick" | "special") {
    this.hitEffects.push({ x, y, timer: 15, type });
  }

  private updateHitEffects() {
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].timer--;
      if (this.hitEffects[i].timer <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }
  }

  private checkRoundEnd() {
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.player.state = "ko";
      this.endRound(false);
    } else if (this.enemy.health <= 0) {
      this.enemy.health = 0;
      this.enemy.state = "ko";
      this.endRound(true);
    }
  }

  private endRound(playerWon: boolean) {
    this.status = "roundEnd";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (playerWon) {
      this.wins++;
    }

    this.emitState();
  }

  nextRound() {
    if (this.wins >= 2) {
      // Player wins the match
      this.round++;
      this.wins = 0;
    }
    this.setupRound();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background - arena
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.6, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Ground line
    ctx.strokeStyle = "#636e72";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();

    // Draw fighters
    this.drawFighter(this.player);
    this.drawFighter(this.enemy);

    // Draw hit effects
    for (const effect of this.hitEffects) {
      this.drawHitEffect(effect);
    }

    // Draw health bars
    this.drawHealthBar(20, 20, this.player, true);
    this.drawHealthBar(w - 220, 20, this.enemy, false);

    // Draw energy bars
    this.drawEnergyBar(20, 50, this.player);
    this.drawEnergyBar(w - 220, 50, this.enemy);

    // Round indicator
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Round ${this.round}`, w / 2, 35);

    // Combo display
    if (this.player.combo > 1) {
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`${this.player.combo} COMBO!`, w / 2, 70);
    }
  }

  private drawFighter(f: Fighter) {
    const ctx = this.ctx;

    ctx.save();

    // Flash when hit
    if (f.state === "hit" && Math.floor(f.stateTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }

    // Body
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y, f.width, f.height);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, f.y + 15, 15, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "black";
    const eyeOffset = f.facing === "right" ? 5 : -5;
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2 + eyeOffset, f.y + 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // Attack visualization
    if (f.state === "punch" || f.state === "kick" || f.state === "special") {
      ctx.strokeStyle = f.state === "special" ? "#f1c40f" : "white";
      ctx.lineWidth = f.state === "special" ? 4 : 2;

      const attackX = f.facing === "right" ? f.x + f.width : f.x;
      const attackDir = f.facing === "right" ? 1 : -1;
      const range = f.state === "special" ? 80 : 40;

      ctx.beginPath();
      ctx.moveTo(attackX, f.y + f.height / 2);
      ctx.lineTo(attackX + range * attackDir, f.y + f.height / 2);
      ctx.stroke();

      if (f.state === "special") {
        // Special effect
        ctx.fillStyle = "rgba(241, 196, 15, 0.5)";
        ctx.beginPath();
        ctx.arc(attackX + range * attackDir * 0.5, f.y + f.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Block stance
    if (f.state === "block") {
      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x + f.width / 2, f.y + f.height / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // KO effect
    if (f.state === "ko") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(f.x, f.y, f.width, f.height);

      // X eyes
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      const eyeX = f.x + f.width / 2;
      const eyeY = f.y + 12;
      ctx.beginPath();
      ctx.moveTo(eyeX - 5, eyeY - 5);
      ctx.lineTo(eyeX + 5, eyeY + 5);
      ctx.moveTo(eyeX + 5, eyeY - 5);
      ctx.lineTo(eyeX - 5, eyeY + 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawHitEffect(effect: HitEffect) {
    const ctx = this.ctx;
    const alpha = effect.timer / 15;
    const size = (15 - effect.timer) * 3;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (effect.type === "special") {
      ctx.fillStyle = "#f1c40f";
    } else if (effect.type === "kick") {
      ctx.fillStyle = "#e74c3c";
    } else {
      ctx.fillStyle = "#ffffff";
    }

    // Starburst effect
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(
        effect.x + Math.cos(angle) * size,
        effect.y + Math.sin(angle) * size
      );
      ctx.lineWidth = 3;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawHealthBar(x: number, y: number, f: Fighter, isLeft: boolean) {
    const ctx = this.ctx;
    const width = 200;
    const height = 20;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x, y, width, height);

    // Health
    const hpPercent = f.health / f.maxHealth;
    const hpColor = hpPercent > 0.5 ? "#2ecc71" : hpPercent > 0.25 ? "#f39c12" : "#e74c3c";

    if (isLeft) {
      ctx.fillStyle = hpColor;
      ctx.fillRect(x, y, width * hpPercent, height);
    } else {
      ctx.fillStyle = hpColor;
      ctx.fillRect(x + width * (1 - hpPercent), y, width * hpPercent, height);
    }

    // Border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Name
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = isLeft ? "left" : "right";
    ctx.fillText(f.name, isLeft ? x : x + width, y - 5);
  }

  private drawEnergyBar(x: number, y: number, f: Fighter) {
    const ctx = this.ctx;
    const width = 200;
    const height = 8;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, width, height);

    // Energy
    const energyPercent = f.energy / f.maxEnergy;
    ctx.fillStyle = f.energy >= SPECIAL_COST ? "#9b59b6" : "#8e44ad";
    ctx.fillRect(x, y, width * energyPercent, height);

    // Flash when ready
    if (f.energy >= SPECIAL_COST) {
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
