/**
 * Iron Fist Game Engine
 * Game #299
 *
 * Boxing game with power punches and dodging!
 */

interface Boxer {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  power: number;
  maxPower: number;
  facing: "left" | "right";
  state: "idle" | "jab" | "hook" | "uppercut" | "block" | "dodge" | "hit" | "ko";
  stateTimer: number;
  isPlayer: boolean;
  color: string;
  combo: number;
  dodgeDir: number;
}

interface PunchEffect {
  x: number;
  y: number;
  type: "jab" | "hook" | "uppercut";
  timer: number;
}

interface GameState {
  playerHealth: number;
  enemyHealth: number;
  stamina: number;
  power: number;
  round: number;
  wins: number;
  status: "idle" | "playing" | "roundEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const JAB_DAMAGE = 5;
const HOOK_DAMAGE = 10;
const UPPERCUT_DAMAGE = 20;
const JAB_STAMINA = 5;
const HOOK_STAMINA = 15;
const UPPERCUT_STAMINA = 30;
const ATTACK_DURATION = 12;
const HIT_STUN = 18;
const DODGE_DURATION = 20;

export class IronFistGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Boxer;
  private enemy: Boxer;
  private punchEffects: PunchEffect[] = [];
  private round = 1;
  private wins = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = {
    left: false,
    right: false,
    jab: false,
    hook: false,
    uppercut: false,
    block: false,
    dodge: false,
  };
  private ringY = 0;
  private aiTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createBoxer(true);
    this.enemy = this.createBoxer(false);
  }

  private createBoxer(isPlayer: boolean): Boxer {
    return {
      x: isPlayer ? 150 : 400,
      y: 0,
      width: 60,
      height: 100,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      power: 0,
      maxPower: 100,
      facing: isPlayer ? "right" : "left",
      state: "idle",
      stateTimer: 0,
      isPlayer,
      color: isPlayer ? "#3498db" : "#e74c3c",
      combo: 0,
      dodgeDir: 0,
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
        stamina: this.player.stamina,
        power: this.player.power,
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
    this.ringY = this.canvas.height - 100;
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
    this.player = this.createBoxer(true);
    this.enemy = this.createBoxer(false);
    this.player.x = w * 0.25;
    this.enemy.x = w * 0.65;
    this.player.y = this.ringY - this.player.height;
    this.enemy.y = this.ringY - this.enemy.height;
    this.punchEffects = [];
    this.aiTimer = 0;
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
    this.updateBoxer(this.player, true);
    this.updateBoxer(this.enemy, false);
    this.updateAI();
    this.updatePunchEffects();
    this.checkCollisions();
    this.checkRoundEnd();
    this.emitState();
  }

  private updateBoxer(b: Boxer, isPlayer: boolean) {
    // State timer
    if (b.stateTimer > 0) {
      b.stateTimer--;
      if (b.stateTimer === 0 && b.state !== "ko") {
        b.state = "idle";
        if (!isPlayer) b.combo = 0;
      }
    }

    // Dodge movement
    if (b.state === "dodge") {
      b.x += b.dodgeDir * 8;
    }

    const canMove = b.state === "idle";
    const canAttack = b.state === "idle" && b.stateTimer === 0;

    if (isPlayer) {
      // Stamina regeneration
      if (b.state === "idle") {
        b.stamina = Math.min(b.maxStamina, b.stamina + 0.5);
      }

      // Movement
      if (canMove) {
        if (this.keys.left) {
          b.x -= 3;
        } else if (this.keys.right) {
          b.x += 3;
        }
      }

      // Block
      if (this.keys.block && canMove) {
        b.state = "block";
      } else if (!this.keys.block && b.state === "block") {
        b.state = "idle";
      }

      // Dodge
      if (this.keys.dodge && canMove && b.stamina >= 20) {
        b.state = "dodge";
        b.stateTimer = DODGE_DURATION;
        b.stamina -= 20;
        b.dodgeDir = this.keys.left ? -1 : 1;
      }

      // Attacks
      if (canAttack) {
        if (this.keys.jab && b.stamina >= JAB_STAMINA) {
          this.performPunch(b, "jab");
        } else if (this.keys.hook && b.stamina >= HOOK_STAMINA) {
          this.performPunch(b, "hook");
        } else if (this.keys.uppercut && b.stamina >= UPPERCUT_STAMINA && b.power >= 50) {
          this.performPunch(b, "uppercut");
        }
      }
    }

    // World bounds
    b.x = Math.max(50, Math.min(this.canvas.width - 50 - b.width, b.x));

    // Face opponent
    if (isPlayer) {
      b.facing = b.x < this.enemy.x ? "right" : "left";
    } else {
      b.facing = b.x < this.player.x ? "right" : "left";
    }
  }

  private performPunch(b: Boxer, type: "jab" | "hook" | "uppercut") {
    b.state = type;
    b.stateTimer = type === "uppercut" ? ATTACK_DURATION + 8 : ATTACK_DURATION;

    if (b.isPlayer) {
      if (type === "jab") b.stamina -= JAB_STAMINA;
      else if (type === "hook") b.stamina -= HOOK_STAMINA;
      else if (type === "uppercut") {
        b.stamina -= UPPERCUT_STAMINA;
        b.power -= 50;
      }
    }
  }

  private updateAI() {
    if (this.enemy.state === "ko" || this.enemy.state === "hit") return;

    this.aiTimer++;
    const canMove = this.enemy.state === "idle";
    const canAttack = this.enemy.state === "idle" && this.enemy.stateTimer === 0;

    const dx = this.player.x - this.enemy.x;
    const dist = Math.abs(dx);

    if (canMove) {
      // Move towards player
      if (dist > 100) {
        this.enemy.x += dx > 0 ? 2 : -2;
      } else if (dist < 70) {
        this.enemy.x += dx > 0 ? -1 : 1;
      }

      // Block incoming attacks
      if (this.player.state === "jab" || this.player.state === "hook" || this.player.state === "uppercut") {
        if (Math.random() < 0.4) {
          this.enemy.state = "block";
        }
      }

      // Dodge
      if ((this.player.state === "hook" || this.player.state === "uppercut") && dist < 100) {
        if (Math.random() < 0.2) {
          this.enemy.state = "dodge";
          this.enemy.stateTimer = DODGE_DURATION;
          this.enemy.dodgeDir = Math.random() > 0.5 ? 1 : -1;
        }
      }
    }

    // Attack
    if (canAttack && dist < 90 && this.aiTimer % 40 === 0) {
      const attackRoll = Math.random();
      if (attackRoll < 0.5) {
        this.performPunch(this.enemy, "jab");
      } else if (attackRoll < 0.85) {
        this.performPunch(this.enemy, "hook");
      } else {
        this.performPunch(this.enemy, "uppercut");
      }
    }
  }

  private checkCollisions() {
    this.checkPunchHit(this.player, this.enemy);
    this.checkPunchHit(this.enemy, this.player);
  }

  private checkPunchHit(attacker: Boxer, defender: Boxer) {
    // Check on specific frame of attack
    const hitFrame = attacker.state === "uppercut" ? ATTACK_DURATION : ATTACK_DURATION - 5;
    if (attacker.stateTimer !== hitFrame) return;
    if (attacker.state !== "jab" && attacker.state !== "hook" && attacker.state !== "uppercut") return;

    const punchRange = attacker.state === "uppercut" ? 80 : 70;
    const punchX = attacker.facing === "right"
      ? attacker.x + attacker.width
      : attacker.x - punchRange;

    const hitBox = {
      x: punchX,
      y: attacker.y + (attacker.state === "uppercut" ? 0 : 20),
      width: punchRange,
      height: attacker.state === "uppercut" ? attacker.height : 40,
    };

    if (this.rectIntersect(hitBox, defender)) {
      // Check dodge
      if (defender.state === "dodge") {
        return; // Miss!
      }

      // Check block
      if (defender.state === "block") {
        const damage = attacker.state === "jab" ? 1 : attacker.state === "hook" ? 3 : 8;
        defender.health -= damage;
        defender.stamina -= 10;
        this.addPunchEffect(defender.x + defender.width / 2, defender.y + 30, attacker.state);
        return;
      }

      // Full hit
      let damage = JAB_DAMAGE;
      if (attacker.state === "hook") damage = HOOK_DAMAGE;
      if (attacker.state === "uppercut") damage = UPPERCUT_DAMAGE;

      // Combo bonus for player
      if (attacker.isPlayer) {
        attacker.combo++;
        damage += Math.min(attacker.combo * 2, 10);
        attacker.power = Math.min(attacker.maxPower, attacker.power + (attacker.state === "uppercut" ? 0 : 15));
      }

      defender.health -= damage;
      defender.state = "hit";
      defender.stateTimer = HIT_STUN;
      defender.combo = 0;

      this.addPunchEffect(
        defender.x + defender.width / 2,
        defender.y + (attacker.state === "uppercut" ? 10 : 30),
        attacker.state
      );
    }
  }

  private rectIntersect(a: { x: number; y: number; width: number; height: number }, b: Boxer): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private addPunchEffect(x: number, y: number, type: "jab" | "hook" | "uppercut") {
    this.punchEffects.push({ x, y, type, timer: 15 });
  }

  private updatePunchEffects() {
    for (let i = this.punchEffects.length - 1; i >= 0; i--) {
      this.punchEffects[i].timer--;
      if (this.punchEffects[i].timer <= 0) {
        this.punchEffects.splice(i, 1);
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
    gradient.addColorStop(0.5, "#2d2d4e");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Spotlights
    ctx.fillStyle = "rgba(255, 255, 200, 0.1)";
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 0);
    ctx.lineTo(w * 0.1, h);
    ctx.lineTo(w * 0.5, h);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.7, 0);
    ctx.lineTo(w * 0.5, h);
    ctx.lineTo(w * 0.9, h);
    ctx.closePath();
    ctx.fill();

    // Ring floor
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(30, this.ringY, w - 60, 20);

    // Ring ropes
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(40, this.ringY - 20 - i * 25);
      ctx.lineTo(w - 40, this.ringY - 20 - i * 25);
      ctx.stroke();
    }

    // Ring posts
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(30, this.ringY - 80, 15, 100);
    ctx.fillRect(w - 45, this.ringY - 80, 15, 100);

    // Draw boxers
    this.drawBoxer(this.player);
    this.drawBoxer(this.enemy);

    // Draw punch effects
    for (const effect of this.punchEffects) {
      this.drawPunchEffect(effect);
    }

    // Draw health bars
    this.drawHealthBar(30, 30, this.player, true);
    this.drawHealthBar(w - 230, 30, this.enemy, false);

    // Draw stamina bar (player only)
    this.drawStaminaBar(30, 55, this.player);

    // Draw power bar (player only)
    this.drawPowerBar(30, 72, this.player);

    // Round indicator
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`ROUND ${this.round}`, w / 2, 40);

    // Combo display
    if (this.player.combo > 1) {
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 28px Arial";
      ctx.fillText(`${this.player.combo} HIT COMBO!`, w / 2, 75);
    }
  }

  private drawBoxer(b: Boxer) {
    const ctx = this.ctx;

    ctx.save();

    // Flash when hit
    if (b.state === "hit" && Math.floor(b.stateTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }

    // KO tilt
    if (b.state === "ko") {
      ctx.translate(b.x + b.width / 2, b.y + b.height);
      ctx.rotate(b.facing === "right" ? 0.5 : -0.5);
      ctx.translate(-(b.x + b.width / 2), -(b.y + b.height));
    }

    // Dodge offset
    let offsetY = 0;
    if (b.state === "dodge") {
      offsetY = Math.sin(b.stateTimer * 0.3) * 10;
    }

    // Body
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 10, b.y + 30 + offsetY, b.width - 20, b.height - 30);

    // Shorts
    ctx.fillStyle = b.isPlayer ? "#2980b9" : "#c0392b";
    ctx.fillRect(b.x + 10, b.y + 70 + offsetY, b.width - 20, 30);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2, b.y + 20 + offsetY, 18, 0, Math.PI * 2);
    ctx.fill();

    // Gloves
    ctx.fillStyle = b.isPlayer ? "#e74c3c" : "#3498db";
    const gloveSize = 15;

    // Left glove
    let leftGloveX = b.x - 5;
    let leftGloveY = b.y + 50 + offsetY;

    // Right glove
    let rightGloveX = b.x + b.width - 10;
    let rightGloveY = b.y + 50 + offsetY;

    // Punch animations
    if (b.state === "jab") {
      const punchOffset = (ATTACK_DURATION - b.stateTimer) * 3;
      if (b.facing === "right") {
        rightGloveX += punchOffset;
        rightGloveY -= 10;
      } else {
        leftGloveX -= punchOffset;
        leftGloveY -= 10;
      }
    } else if (b.state === "hook") {
      const punchOffset = (ATTACK_DURATION - b.stateTimer) * 4;
      if (b.facing === "right") {
        rightGloveX += punchOffset;
        rightGloveY -= 20;
      } else {
        leftGloveX -= punchOffset;
        leftGloveY -= 20;
      }
    } else if (b.state === "uppercut") {
      const punchOffset = (ATTACK_DURATION + 8 - b.stateTimer) * 3;
      if (b.facing === "right") {
        rightGloveX += punchOffset * 0.5;
        rightGloveY -= punchOffset;
      } else {
        leftGloveX -= punchOffset * 0.5;
        leftGloveY -= punchOffset;
      }
    } else if (b.state === "block") {
      leftGloveY -= 30;
      rightGloveY -= 30;
      leftGloveX += 15;
      rightGloveX -= 15;
    }

    // Draw gloves
    ctx.beginPath();
    ctx.arc(leftGloveX + gloveSize / 2, leftGloveY, gloveSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightGloveX + gloveSize / 2, rightGloveY, gloveSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPunchEffect(effect: PunchEffect) {
    const ctx = this.ctx;
    const alpha = effect.timer / 15;
    const size = (15 - effect.timer) * 4;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Color based on punch type
    if (effect.type === "uppercut") {
      ctx.fillStyle = "#f1c40f";
      ctx.strokeStyle = "#f39c12";
    } else if (effect.type === "hook") {
      ctx.fillStyle = "#e74c3c";
      ctx.strokeStyle = "#c0392b";
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#bdc3c7";
    }

    // Impact burst
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(
        effect.x + Math.cos(angle) * size,
        effect.y + Math.sin(angle) * size
      );
      ctx.stroke();
    }

    // POW text for uppercut
    if (effect.type === "uppercut" && effect.timer > 8) {
      ctx.font = "bold 24px Arial";
      ctx.fillStyle = "#f1c40f";
      ctx.textAlign = "center";
      ctx.fillText("POW!", effect.x, effect.y - 20);
    }

    ctx.restore();
  }

  private drawHealthBar(x: number, y: number, b: Boxer, isLeft: boolean) {
    const ctx = this.ctx;
    const width = 200;
    const height = 18;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x, y, width, height);

    // Health
    const hpPercent = b.health / b.maxHealth;
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
    ctx.font = "bold 12px Arial";
    ctx.textAlign = isLeft ? "left" : "right";
    ctx.fillText(b.isPlayer ? "PLAYER" : "CPU", isLeft ? x : x + width, y - 5);
  }

  private drawStaminaBar(x: number, y: number, b: Boxer) {
    const ctx = this.ctx;
    const width = 200;
    const height = 10;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "#3498db";
    ctx.fillRect(x, y, width * (b.stamina / b.maxStamina), height);

    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.fillText("STAMINA", x + width + 5, y + 8);
  }

  private drawPowerBar(x: number, y: number, b: Boxer) {
    const ctx = this.ctx;
    const width = 200;
    const height = 8;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, width, height);

    const powerColor = b.power >= 50 ? "#f1c40f" : "#e67e22";
    ctx.fillStyle = powerColor;
    ctx.fillRect(x, y, width * (b.power / b.maxPower), height);

    if (b.power >= 50) {
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }

    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.fillText("POWER", x + width + 5, y + 7);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
