/**
 * Sword & Magic Game Engine
 * Game #300
 *
 * Action RPG with sword combat and magic spells!
 */

interface Hero {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  exp: number;
  level: number;
  facing: "left" | "right";
  state: "idle" | "walk" | "attack" | "magic" | "hit" | "dead";
  stateTimer: number;
  attackCombo: number;
}

interface Monster {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "slime" | "skeleton" | "demon";
  facing: "left" | "right";
  state: "idle" | "walk" | "attack" | "hit" | "dead";
  stateTimer: number;
  attackTimer: number;
}

interface Spell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "fireball" | "ice" | "lightning";
  timer: number;
  damage: number;
}

interface Effect {
  x: number;
  y: number;
  type: "slash" | "magic" | "levelup";
  timer: number;
}

interface GameState {
  health: number;
  mana: number;
  level: number;
  exp: number;
  wave: number;
  status: "idle" | "playing" | "waveEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MOVE_SPEED = 5;
const SWORD_DAMAGE = 15;
const FIREBALL_DAMAGE = 25;
const ICE_DAMAGE = 20;
const LIGHTNING_DAMAGE = 35;
const FIREBALL_COST = 20;
const ICE_COST = 15;
const LIGHTNING_COST = 40;

export class SwordMagicGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hero: Hero;
  private monsters: Monster[] = [];
  private spells: Spell[] = [];
  private effects: Effect[] = [];
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    fireball: false,
    ice: false,
    lightning: false,
  };
  private groundY = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.hero = this.createHero();
  }

  private createHero(): Hero {
    return {
      x: 100,
      y: 0,
      width: 40,
      height: 60,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      exp: 0,
      level: 1,
      facing: "right",
      state: "idle",
      stateTimer: 0,
      attackCombo: 0,
    };
  }

  private createMonster(type: Monster["type"], x: number): Monster {
    const stats = {
      slime: { health: 30, width: 35, height: 30 },
      skeleton: { health: 50, width: 35, height: 55 },
      demon: { health: 100, width: 50, height: 70 },
    };
    const s = stats[type];
    return {
      x,
      y: this.groundY - s.height,
      width: s.width,
      height: s.height,
      vx: 0,
      health: s.health + this.wave * 5,
      maxHealth: s.health + this.wave * 5,
      type,
      facing: "left",
      state: "idle",
      stateTimer: 0,
      attackTimer: 0,
    };
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        health: this.hero.health,
        mana: this.hero.mana,
        level: this.hero.level,
        exp: this.hero.exp,
        wave: this.wave,
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
    this.hero = this.createHero();
    this.hero.y = this.groundY - this.hero.height;
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.monsters = [];
    this.spells = [];
    this.effects = [];
    this.spawnTimer = 0;

    const count = 3 + this.wave;
    const types: Monster["type"][] = ["slime", "slime", "skeleton"];
    if (this.wave >= 2) types.push("skeleton");
    if (this.wave >= 3) types.push("demon");

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const x = this.canvas.width + 100 + i * 150;
      this.monsters.push(this.createMonster(type, x));
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
    this.updateHero();
    this.updateMonsters();
    this.updateSpells();
    this.updateEffects();
    this.checkCollisions();
    this.checkWaveEnd();

    // Mana regeneration
    this.hero.mana = Math.min(this.hero.maxMana, this.hero.mana + 0.1);

    this.emitState();
  }

  private updateHero() {
    const h = this.hero;

    // State timer
    if (h.stateTimer > 0) {
      h.stateTimer--;
      if (h.stateTimer === 0) {
        h.state = "idle";
        h.attackCombo = 0;
      }
    }

    const canMove = h.state === "idle" || h.state === "walk";
    const canAct = h.state === "idle" || h.state === "walk";

    if (canMove) {
      if (this.keys.left) {
        h.vx = -MOVE_SPEED;
        h.facing = "left";
        h.state = "walk";
      } else if (this.keys.right) {
        h.vx = MOVE_SPEED;
        h.facing = "right";
        h.state = "walk";
      } else {
        h.vx = 0;
        if (h.state === "walk") h.state = "idle";
      }

      if (this.keys.jump && h.y >= this.groundY - h.height - 1) {
        h.vy = JUMP_FORCE;
      }
    }

    // Actions
    if (canAct) {
      if (this.keys.attack) {
        this.performAttack();
      } else if (this.keys.fireball && h.mana >= FIREBALL_COST) {
        this.castSpell("fireball");
      } else if (this.keys.ice && h.mana >= ICE_COST) {
        this.castSpell("ice");
      } else if (this.keys.lightning && h.mana >= LIGHTNING_COST) {
        this.castSpell("lightning");
      }
    }

    // Physics
    h.vy += GRAVITY;
    h.x += h.vx;
    h.y += h.vy;

    // Ground
    if (h.y >= this.groundY - h.height) {
      h.y = this.groundY - h.height;
      h.vy = 0;
    }

    // Bounds
    h.x = Math.max(0, Math.min(this.canvas.width - h.width, h.x));
  }

  private performAttack() {
    const h = this.hero;
    h.state = "attack";
    h.stateTimer = 15;
    h.attackCombo++;

    // Hit monsters
    const range = 60;
    const attackX = h.facing === "right" ? h.x + h.width : h.x - range;

    for (const m of this.monsters) {
      if (m.state === "dead") continue;

      if (
        m.x + m.width > attackX &&
        m.x < attackX + range &&
        Math.abs(m.y + m.height - h.y - h.height) < 40
      ) {
        const damage = SWORD_DAMAGE + h.level * 2 + h.attackCombo * 3;
        this.hitMonster(m, damage);
      }
    }

    this.effects.push({
      x: attackX + range / 2,
      y: h.y + h.height / 2,
      type: "slash",
      timer: 10,
    });
  }

  private castSpell(type: Spell["type"]) {
    const h = this.hero;
    h.state = "magic";
    h.stateTimer = 20;

    let cost = 0;
    let damage = 0;
    let vy = 0;

    switch (type) {
      case "fireball":
        cost = FIREBALL_COST;
        damage = FIREBALL_DAMAGE;
        break;
      case "ice":
        cost = ICE_COST;
        damage = ICE_DAMAGE;
        vy = 2;
        break;
      case "lightning":
        cost = LIGHTNING_COST;
        damage = LIGHTNING_DAMAGE;
        break;
    }

    h.mana -= cost;

    const dir = h.facing === "right" ? 1 : -1;
    this.spells.push({
      x: h.x + h.width / 2,
      y: h.y + h.height / 3,
      vx: dir * (type === "lightning" ? 15 : 10),
      vy,
      type,
      timer: 60,
      damage: damage + h.level * 3,
    });

    this.effects.push({
      x: h.x + (h.facing === "right" ? h.width + 20 : -20),
      y: h.y + h.height / 3,
      type: "magic",
      timer: 15,
    });
  }

  private updateMonsters() {
    for (const m of this.monsters) {
      if (m.state === "dead") continue;

      // State timer
      if (m.stateTimer > 0) {
        m.stateTimer--;
        if (m.stateTimer === 0 && m.state !== "dead") {
          m.state = "idle";
        }
      }

      const canMove = m.state === "idle" || m.state === "walk";
      const dx = this.hero.x - m.x;
      const dist = Math.abs(dx);

      m.facing = dx > 0 ? "right" : "left";

      if (canMove) {
        // Move towards hero
        const speed = m.type === "demon" ? 2.5 : m.type === "skeleton" ? 2 : 1.5;
        if (dist > 50) {
          m.vx = dx > 0 ? speed : -speed;
          m.state = "walk";
        } else {
          m.vx = 0;
          if (m.state === "walk") m.state = "idle";
        }

        // Attack
        m.attackTimer++;
        const attackInterval = m.type === "demon" ? 60 : m.type === "skeleton" ? 80 : 100;
        if (dist < 60 && m.attackTimer >= attackInterval) {
          m.attackTimer = 0;
          m.state = "attack";
          m.stateTimer = 20;

          // Hit hero
          if (this.hero.state !== "dead") {
            const damage = m.type === "demon" ? 20 : m.type === "skeleton" ? 12 : 8;
            this.hero.health -= damage;
            this.hero.state = "hit";
            this.hero.stateTimer = 15;
          }
        }
      }

      m.x += m.vx;

      // Bounds
      m.x = Math.max(0, Math.min(this.canvas.width - m.width, m.x));
    }
  }

  private hitMonster(m: Monster, damage: number) {
    m.health -= damage;
    m.state = "hit";
    m.stateTimer = 10;
    m.vx = this.hero.facing === "right" ? 5 : -5;

    if (m.health <= 0) {
      m.health = 0;
      m.state = "dead";
      this.gainExp(m.type === "demon" ? 50 : m.type === "skeleton" ? 25 : 10);
    }
  }

  private gainExp(amount: number) {
    this.hero.exp += amount;
    const expNeeded = this.hero.level * 100;

    if (this.hero.exp >= expNeeded) {
      this.hero.exp -= expNeeded;
      this.hero.level++;
      this.hero.maxHealth += 10;
      this.hero.maxMana += 10;
      this.hero.health = this.hero.maxHealth;
      this.hero.mana = this.hero.maxMana;

      this.effects.push({
        x: this.hero.x + this.hero.width / 2,
        y: this.hero.y,
        type: "levelup",
        timer: 30,
      });
    }
  }

  private updateSpells() {
    for (let i = this.spells.length - 1; i >= 0; i--) {
      const s = this.spells[i];
      s.x += s.vx;
      s.y += s.vy;
      s.timer--;

      if (s.timer <= 0 || s.x < -50 || s.x > this.canvas.width + 50) {
        this.spells.splice(i, 1);
        continue;
      }

      // Hit monsters
      for (const m of this.monsters) {
        if (m.state === "dead") continue;

        if (
          s.x > m.x && s.x < m.x + m.width &&
          s.y > m.y && s.y < m.y + m.height
        ) {
          this.hitMonster(m, s.damage);
          this.spells.splice(i, 1);
          break;
        }
      }
    }
  }

  private updateEffects() {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].timer--;
      if (this.effects[i].timer <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    // Check game over
    if (this.hero.health <= 0) {
      this.hero.health = 0;
      this.hero.state = "dead";
      this.gameOver();
    }
  }

  private checkWaveEnd() {
    const alive = this.monsters.filter((m) => m.state !== "dead").length;
    if (alive === 0) {
      this.status = "waveEnd";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  nextWave() {
    this.wave++;
    this.hero.health = Math.min(this.hero.maxHealth, this.hero.health + 30);
    this.hero.mana = this.hero.maxMana;
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

    // Background - fantasy setting
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a0a2e");
    gradient.addColorStop(0.4, "#2d1b4e");
    gradient.addColorStop(1, "#3d2b5e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Moon
    ctx.fillStyle = "rgba(200, 200, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(w - 80, 60, 35, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = "#2d4a2d";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Grass line
    ctx.strokeStyle = "#4a6a4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();

    // Draw effects (behind characters)
    for (const e of this.effects) {
      if (e.type === "slash") this.drawSlashEffect(e);
    }

    // Draw spells
    for (const s of this.spells) {
      this.drawSpell(s);
    }

    // Draw monsters
    for (const m of this.monsters) {
      this.drawMonster(m);
    }

    // Draw hero
    this.drawHero();

    // Draw effects (in front)
    for (const e of this.effects) {
      if (e.type !== "slash") this.drawEffect(e);
    }

    // UI
    this.drawUI();
  }

  private drawHero() {
    const ctx = this.ctx;
    const h = this.hero;

    ctx.save();

    // Flash when hit
    if (h.state === "hit" && Math.floor(h.stateTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = "#3498db";
    ctx.fillRect(h.x + 5, h.y + 15, h.width - 10, h.height - 15);

    // Cape
    ctx.fillStyle = "#9b59b6";
    ctx.beginPath();
    ctx.moveTo(h.x + h.width / 2, h.y + 15);
    ctx.lineTo(h.x + (h.facing === "right" ? 0 : h.width), h.y + h.height);
    ctx.lineTo(h.x + h.width / 2, h.y + h.height);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#8b4513";
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2, h.y + 6, 8, Math.PI, 0, false);
    ctx.fill();

    // Sword
    ctx.fillStyle = "#c0c0c0";
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 2;

    let swordX = h.facing === "right" ? h.x + h.width : h.x;
    let swordAngle = h.facing === "right" ? 0.3 : Math.PI - 0.3;

    if (h.state === "attack") {
      const swingProgress = (15 - h.stateTimer) / 15;
      swordAngle = h.facing === "right"
        ? -0.5 + swingProgress * 1.5
        : Math.PI + 0.5 - swingProgress * 1.5;
    }

    ctx.save();
    ctx.translate(swordX, h.y + 30);
    ctx.rotate(swordAngle);
    ctx.fillRect(0, -3, 35, 6);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(-5, -6, 10, 12);
    ctx.restore();

    // Magic glow when casting
    if (h.state === "magic") {
      ctx.strokeStyle = "#9b59b6";
      ctx.shadowColor = "#9b59b6";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x + h.width / 2, h.y + h.height / 2, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawMonster(m: Monster) {
    const ctx = this.ctx;

    if (m.state === "dead") {
      ctx.globalAlpha = 0.3;
    } else if (m.state === "hit") {
      ctx.globalAlpha = 0.7;
    }

    switch (m.type) {
      case "slime":
        ctx.fillStyle = "#27ae60";
        ctx.beginPath();
        ctx.ellipse(m.x + m.width / 2, m.y + m.height - 10, m.width / 2, m.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(m.x + m.width * 0.35, m.y + m.height * 0.4, 5, 0, Math.PI * 2);
        ctx.arc(m.x + m.width * 0.65, m.y + m.height * 0.4, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "skeleton":
        ctx.fillStyle = "#ecf0f1";
        ctx.fillRect(m.x + 10, m.y + 15, m.width - 20, m.height - 20);
        // Skull
        ctx.beginPath();
        ctx.arc(m.x + m.width / 2, m.y + 12, 10, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        ctx.arc(m.x + m.width * 0.4, m.y + 10, 3, 0, Math.PI * 2);
        ctx.arc(m.x + m.width * 0.6, m.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "demon":
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(m.x, m.y + 20, m.width, m.height - 20);
        // Horns
        ctx.beginPath();
        ctx.moveTo(m.x + 10, m.y + 25);
        ctx.lineTo(m.x + 5, m.y);
        ctx.lineTo(m.x + 20, m.y + 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(m.x + m.width - 10, m.y + 25);
        ctx.lineTo(m.x + m.width - 5, m.y);
        ctx.lineTo(m.x + m.width - 20, m.y + 20);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.arc(m.x + m.width * 0.35, m.y + 35, 5, 0, Math.PI * 2);
        ctx.arc(m.x + m.width * 0.65, m.y + 35, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    // Health bar
    if (m.health < m.maxHealth && m.state !== "dead") {
      const barWidth = m.width;
      ctx.fillStyle = "#333";
      ctx.fillRect(m.x, m.y - 8, barWidth, 5);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(m.x, m.y - 8, barWidth * (m.health / m.maxHealth), 5);
    }

    ctx.globalAlpha = 1;
  }

  private drawSpell(s: Spell) {
    const ctx = this.ctx;

    switch (s.type) {
      case "fireball":
        ctx.fillStyle = "#e74c3c";
        ctx.shadowColor = "#f39c12";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.fillStyle = "#f39c12";
        ctx.beginPath();
        ctx.arc(s.x - s.vx, s.y, 8, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "ice":
        ctx.fillStyle = "#3498db";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 15;
        // Crystal shape
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 10);
        ctx.lineTo(s.x + 8, s.y);
        ctx.lineTo(s.x, s.y + 10);
        ctx.lineTo(s.x - 8, s.y);
        ctx.closePath();
        ctx.fill();
        break;

      case "lightning":
        ctx.strokeStyle = "#f1c40f";
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 25;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(s.x - 15, s.y - 5);
        ctx.lineTo(s.x, s.y);
        ctx.lineTo(s.x - 5, s.y + 5);
        ctx.lineTo(s.x + 15, s.y);
        ctx.stroke();
        break;
    }

    ctx.shadowBlur = 0;
  }

  private drawSlashEffect(e: Effect) {
    const ctx = this.ctx;
    const alpha = e.timer / 10;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 30 - e.timer * 2, -0.5, 0.5);
    ctx.stroke();
    ctx.restore();
  }

  private drawEffect(e: Effect) {
    const ctx = this.ctx;
    const alpha = e.timer / (e.type === "levelup" ? 30 : 15);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (e.type === "magic") {
      ctx.fillStyle = "#9b59b6";
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + e.timer * 0.2;
        ctx.beginPath();
        ctx.arc(
          e.x + Math.cos(angle) * 20,
          e.y + Math.sin(angle) * 20,
          5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (e.type === "levelup") {
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("LEVEL UP!", e.x, e.y - (30 - e.timer) * 2);
    }

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 20, 150, 15);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(20, 20, 150 * (this.hero.health / this.hero.maxHealth), 15);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 15);

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP", 175, 32);

    // Mana bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 40, 150, 12);
    ctx.fillStyle = "#3498db";
    ctx.fillRect(20, 40, 150 * (this.hero.mana / this.hero.maxMana), 12);
    ctx.fillText("MP", 175, 50);

    // EXP bar
    const expNeeded = this.hero.level * 100;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(20, 56, 150, 8);
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(20, 56, 150 * (this.hero.exp / expNeeded), 8);
    ctx.fillText("EXP", 175, 64);

    // Level and wave
    ctx.textAlign = "right";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`Lv.${this.hero.level}`, this.canvas.width - 20, 30);
    ctx.fillText(`Wave ${this.wave}`, this.canvas.width - 20, 50);
    ctx.textAlign = "left";
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
