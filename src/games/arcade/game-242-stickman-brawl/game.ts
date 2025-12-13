/**
 * Stickman Brawl Game Engine
 * Game #242
 *
 * Stickman fighting game!
 */

interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  state: "idle" | "walk" | "jump" | "punch" | "kick" | "hit" | "block";
  stateTimer: number;
  isPlayer: boolean;
  color: string;
}

interface GameState {
  playerHp: number;
  enemyHp: number;
  score: number;
  round: number;
  status: "idle" | "playing" | "win" | "lose";
}

type StateCallback = (state: GameState) => void;

const GROUND_Y = 0.8;
const GRAVITY = 0.5;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const FIGHTER_WIDTH = 30;
const FIGHTER_HEIGHT = 60;

export class StickmanBrawlGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private status: "idle" | "playing" | "win" | "lose" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;

  private player: Fighter;
  private enemy: Fighter;
  private score = 0;
  private round = 1;
  private groundY = 0;

  private keys: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.player = this.createFighter(true);
    this.enemy = this.createFighter(false);

    this.setupControls();
  }

  private createFighter(isPlayer: boolean): Fighter {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      facing: isPlayer ? 1 : -1,
      state: "idle",
      stateTimer: 0,
      isPlayer,
      color: isPlayer ? "#4ecdc4" : "#ff6b6b",
    };
  }

  private setupControls() {
    document.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === "z" || e.key === "Z") this.attack("punch");
      if (e.key === "x" || e.key === "X") this.attack("kick");
    });

    document.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  moveLeft() {
    this.keys.add("arrowleft");
  }

  moveRight() {
    this.keys.add("arrowright");
  }

  stopMove() {
    this.keys.delete("arrowleft");
    this.keys.delete("arrowright");
  }

  jump() {
    if (this.player.y >= this.groundY - 1 && this.player.state !== "hit") {
      this.player.vy = JUMP_FORCE;
      this.player.state = "jump";
    }
  }

  attack(type: "punch" | "kick") {
    if (this.status !== "playing") return;
    if (this.player.state === "punch" || this.player.state === "kick" || this.player.state === "hit") return;

    this.player.state = type;
    this.player.stateTimer = 20;

    // Check hit
    const attackRange = type === "kick" ? 60 : 45;
    const damage = type === "kick" ? 15 : 10;

    const dx = this.enemy.x - this.player.x;
    const dy = Math.abs(this.enemy.y - this.player.y);

    if (Math.abs(dx) < attackRange && dy < FIGHTER_HEIGHT && this.player.facing === Math.sign(dx)) {
      this.enemy.hp -= damage;
      this.enemy.state = "hit";
      this.enemy.stateTimer = 15;
      this.enemy.vx = this.player.facing * 8;
      this.score += damage * 10;
      this.emitState();
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        playerHp: this.player.hp,
        enemyHp: this.enemy.hp,
        score: this.score,
        round: this.round,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.groundY = size * GROUND_Y;
    this.draw();
  }

  start() {
    this.score = 0;
    this.round = 1;
    this.status = "playing";

    this.resetRound();
    this.emitState();
    this.gameLoop();
  }

  private resetRound() {
    this.player = this.createFighter(true);
    this.player.x = this.canvas.width * 0.25;
    this.player.y = this.groundY;

    this.enemy = this.createFighter(false);
    this.enemy.x = this.canvas.width * 0.75;
    this.enemy.y = this.groundY;
    this.enemy.maxHp = 100 + (this.round - 1) * 20;
    this.enemy.hp = this.enemy.maxHp;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update player
    this.updateFighter(this.player);

    // Update enemy AI
    this.updateEnemyAI();
    this.updateFighter(this.enemy);

    // Check win/lose
    if (this.enemy.hp <= 0) {
      this.round++;
      this.score += 500;
      this.resetRound();
      this.emitState();
    }

    if (this.player.hp <= 0) {
      this.status = "lose";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.emitState();
    }
  }

  private updateFighter(fighter: Fighter) {
    // State timer
    if (fighter.stateTimer > 0) {
      fighter.stateTimer--;
      if (fighter.stateTimer === 0 && fighter.state !== "jump") {
        fighter.state = "idle";
      }
    }

    // Player controls
    if (fighter.isPlayer && fighter.state !== "hit") {
      if (this.keys.has("arrowleft")) {
        fighter.vx = -MOVE_SPEED;
        fighter.facing = -1;
        if (fighter.state === "idle") fighter.state = "walk";
      } else if (this.keys.has("arrowright")) {
        fighter.vx = MOVE_SPEED;
        fighter.facing = 1;
        if (fighter.state === "idle") fighter.state = "walk";
      } else {
        fighter.vx *= 0.8;
        if (fighter.state === "walk") fighter.state = "idle";
      }

      if (this.keys.has("arrowup") || this.keys.has(" ")) {
        this.jump();
      }
    }

    // Apply gravity
    if (fighter.y < this.groundY) {
      fighter.vy += GRAVITY;
    }

    // Apply velocity
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;

    // Friction
    fighter.vx *= 0.9;

    // Ground collision
    if (fighter.y >= this.groundY) {
      fighter.y = this.groundY;
      fighter.vy = 0;
      if (fighter.state === "jump") fighter.state = "idle";
    }

    // Wall collision
    fighter.x = Math.max(FIGHTER_WIDTH / 2, Math.min(this.canvas.width - FIGHTER_WIDTH / 2, fighter.x));

    // Face opponent
    if (fighter.state === "idle" || fighter.state === "walk") {
      const opponent = fighter.isPlayer ? this.enemy : this.player;
      fighter.facing = fighter.x < opponent.x ? 1 : -1;
    }
  }

  private updateEnemyAI() {
    if (this.enemy.state === "hit") return;

    const dx = this.player.x - this.enemy.x;
    const dist = Math.abs(dx);

    // Move towards player
    if (dist > 80) {
      this.enemy.vx = Math.sign(dx) * MOVE_SPEED * 0.7;
      this.enemy.state = "walk";
    } else {
      this.enemy.vx *= 0.8;

      // Attack when close
      if (Math.random() < 0.03 && this.enemy.state === "idle") {
        const attackType = Math.random() > 0.5 ? "punch" : "kick";
        this.enemy.state = attackType;
        this.enemy.stateTimer = 20;

        // Check hit on player
        const attackRange = attackType === "kick" ? 60 : 45;
        const damage = attackType === "kick" ? 12 : 8;

        if (dist < attackRange && this.player.state !== "hit") {
          this.player.hp -= damage;
          this.player.state = "hit";
          this.player.stateTimer = 15;
          this.player.vx = -this.enemy.facing * 6;
          this.emitState();
        }
      }
    }

    // Random jump
    if (Math.random() < 0.005 && this.enemy.y >= this.groundY - 1) {
      this.enemy.vy = JUMP_FORCE;
      this.enemy.state = "jump";
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(1, "#16213e");
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
    this.drawStickman(this.player);
    this.drawStickman(this.enemy);

    // Round indicator
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Round ${this.round}`, w / 2, 30);
  }

  private drawStickman(fighter: Fighter) {
    const ctx = this.ctx;
    const x = fighter.x;
    const y = fighter.y;
    const facing = fighter.facing;

    ctx.strokeStyle = fighter.color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Flash when hit
    if (fighter.state === "hit" && fighter.stateTimer % 4 < 2) {
      ctx.strokeStyle = "#fff";
    }

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 50, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(x, y - 38);
    ctx.lineTo(x, y - 10);
    ctx.stroke();

    // Arms
    let armAngle = 0;
    if (fighter.state === "punch") {
      armAngle = facing * 0.5;
    } else if (fighter.state === "kick") {
      armAngle = facing * 0.3;
    } else if (fighter.state === "walk") {
      armAngle = Math.sin(Date.now() / 100) * 0.3;
    }

    ctx.beginPath();
    if (fighter.state === "punch") {
      // Punching arm extended
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x + facing * 35, y - 28);
      // Other arm back
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x - facing * 15, y - 20);
    } else {
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x + Math.cos(armAngle) * 20, y - 20 + Math.sin(armAngle) * 10);
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x - Math.cos(armAngle) * 20, y - 20 - Math.sin(armAngle) * 10);
    }
    ctx.stroke();

    // Legs
    let legAngle = 0;
    if (fighter.state === "walk") {
      legAngle = Math.sin(Date.now() / 100) * 0.4;
    } else if (fighter.state === "jump") {
      legAngle = 0.3;
    }

    ctx.beginPath();
    if (fighter.state === "kick") {
      // Kicking leg extended
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + facing * 40, y - 15);
      // Other leg
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - facing * 10, y);
    } else {
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + Math.sin(legAngle) * 15, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - Math.sin(legAngle) * 15, y);
    }
    ctx.stroke();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
