/**
 * Chain Fighter Game Engine
 * Game #303
 *
 * Whip and chain combat with physics!
 */

interface ChainFighter {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  state: "idle" | "walk" | "attack" | "grab" | "hit";
  stateTimer: number;
  chain: ChainSegment[];
  chainAngle: number;
  chainExtended: boolean;
}

interface ChainSegment {
  x: number;
  y: number;
  angle: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "grunt" | "brute" | "ninja";
  state: "idle" | "walk" | "attack" | "grabbed" | "hit" | "dead";
  stateTimer: number;
  attackTimer: number;
}

interface GameState {
  health: number;
  score: number;
  combo: number;
  wave: number;
  status: "idle" | "playing" | "waveEnd" | "over";
}

type StateCallback = (state: GameState) => void;

const CHAIN_LENGTH = 10;
const CHAIN_SEGMENT_LENGTH = 12;
const CHAIN_DAMAGE = 15;
const GRAB_DAMAGE = 25;

export class ChainFighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: ChainFighter;
  private enemies: Enemy[] = [];
  private score = 0;
  private combo = 0;
  private wave = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, attack: false, grab: false };
  private mouseX = 0;
  private mouseY = 0;
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): ChainFighter {
    const chain: ChainSegment[] = [];
    for (let i = 0; i < CHAIN_LENGTH; i++) {
      chain.push({ x: 0, y: 0, angle: 0 });
    }
    return {
      x: 100,
      y: 0,
      width: 40,
      height: 65,
      health: 100,
      maxHealth: 100,
      facing: "right",
      state: "idle",
      stateTimer: 0,
      chain,
      chainAngle: 0,
      chainExtended: false,
    };
  }

  private createEnemy(type: Enemy["type"], x: number): Enemy {
    const stats = {
      grunt: { health: 30, width: 35, height: 50, speed: 2 },
      brute: { health: 60, width: 50, height: 65, speed: 1.2 },
      ninja: { health: 25, width: 30, height: 50, speed: 3.5 },
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
        health: this.player.health,
        score: this.score,
        combo: this.combo,
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
    this.score = 0;
    this.combo = 0;
    this.wave = 1;
    this.player = this.createPlayer();
    this.player.y = this.groundY - this.player.height;
    this.setupWave();
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private setupWave() {
    this.enemies = [];

    const count = 4 + this.wave * 2;
    const types: Enemy["type"][] = ["grunt", "grunt", "brute"];
    if (this.wave >= 2) types.push("ninja");

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side > 0 ? this.canvas.width + 50 + i * 80 : -50 - i * 80;
      this.enemies.push(this.createEnemy(type, x));
    }
  }

  setKey(key: keyof typeof this.keys, value: boolean) {
    this.keys[key] = value;
  }

  handleMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.updatePlayer();
    this.updateChain();
    this.updateEnemies();
    this.checkCollisions();
    this.checkWaveEnd();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    // State timer
    if (p.stateTimer > 0) {
      p.stateTimer--;
      if (p.stateTimer === 0) {
        p.state = "idle";
        p.chainExtended = false;
      }
    }

    const canMove = p.state === "idle" || p.state === "walk";
    const canAct = p.state === "idle" || p.state === "walk";

    if (canMove) {
      if (this.keys.left) {
        p.x -= 4;
        p.facing = "left";
        p.state = "walk";
      } else if (this.keys.right) {
        p.x += 4;
        p.facing = "right";
        p.state = "walk";
      } else {
        if (p.state === "walk") p.state = "idle";
      }
    }

    // Chain angle follows mouse
    const dx = this.mouseX - (p.x + p.width / 2);
    const dy = this.mouseY - (p.y + 30);
    p.chainAngle = Math.atan2(dy, dx);

    // Attack
    if (canAct && this.keys.attack) {
      p.state = "attack";
      p.stateTimer = 20;
      p.chainExtended = true;
      this.combo = 0;
    }

    // Grab
    if (canAct && this.keys.grab) {
      p.state = "grab";
      p.stateTimer = 30;
      p.chainExtended = true;
    }

    // Bounds
    p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));
  }

  private updateChain() {
    const p = this.player;
    const startX = p.x + p.width / 2;
    const startY = p.y + 30;

    if (p.chainExtended) {
      // Extend chain towards mouse
      const progress = 1 - p.stateTimer / (p.state === "grab" ? 30 : 20);
      const reach = progress * CHAIN_LENGTH * CHAIN_SEGMENT_LENGTH;

      for (let i = 0; i < p.chain.length; i++) {
        const dist = Math.min(reach, (i + 1) * CHAIN_SEGMENT_LENGTH);
        p.chain[i].x = startX + Math.cos(p.chainAngle) * dist;
        p.chain[i].y = startY + Math.sin(p.chainAngle) * dist;
        p.chain[i].angle = p.chainAngle;
      }
    } else {
      // Chain hangs down
      for (let i = 0; i < p.chain.length; i++) {
        const angle = Math.PI / 2 + Math.sin(Date.now() * 0.005 + i * 0.3) * 0.1;
        const prevX = i === 0 ? startX : p.chain[i - 1].x;
        const prevY = i === 0 ? startY : p.chain[i - 1].y;
        p.chain[i].x = prevX + Math.cos(angle) * CHAIN_SEGMENT_LENGTH * 0.8;
        p.chain[i].y = prevY + Math.sin(angle) * CHAIN_SEGMENT_LENGTH * 0.8;
        p.chain[i].angle = angle;
      }
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (e.state === "dead" || e.state === "grabbed") continue;

      // State timer
      if (e.stateTimer > 0) {
        e.stateTimer--;
        if (e.stateTimer === 0 && e.state !== "dead") {
          e.state = "idle";
        }
      }

      const canMove = e.state === "idle" || e.state === "walk";
      const dx = this.player.x - e.x;
      const dist = Math.abs(dx);

      if (canMove) {
        const speed = e.type === "ninja" ? 3.5 : e.type === "brute" ? 1.2 : 2;
        if (dist > 50) {
          e.x += dx > 0 ? speed : -speed;
          e.state = "walk";
        } else {
          if (e.state === "walk") e.state = "idle";

          e.attackTimer++;
          const attackInterval = e.type === "ninja" ? 40 : e.type === "brute" ? 80 : 60;
          if (e.attackTimer >= attackInterval) {
            e.attackTimer = 0;
            e.state = "attack";
            e.stateTimer = 20;

            const damage = e.type === "brute" ? 20 : e.type === "ninja" ? 12 : 10;
            this.player.health -= damage;
            this.player.state = "hit";
            this.player.stateTimer = 15;
            this.combo = 0;
          }
        }
      }

      // Bounds
      e.x = Math.max(-50, Math.min(this.canvas.width + 50, e.x));
    }
  }

  private checkCollisions() {
    const p = this.player;
    if (!p.chainExtended) return;

    const chainTip = p.chain[p.chain.length - 1];

    for (const e of this.enemies) {
      if (e.state === "dead" || e.state === "grabbed") continue;

      // Check chain tip collision
      if (
        chainTip.x > e.x && chainTip.x < e.x + e.width &&
        chainTip.y > e.y && chainTip.y < e.y + e.height
      ) {
        if (p.state === "attack" && p.stateTimer > 10) {
          e.health -= CHAIN_DAMAGE + this.combo * 2;
          e.state = "hit";
          e.stateTimer = 15;
          e.x += p.facing === "right" ? 30 : -30;
          this.combo++;

          if (e.health <= 0) {
            e.health = 0;
            e.state = "dead";
            const points = e.type === "brute" ? 50 : e.type === "ninja" ? 40 : 25;
            this.score += points * (1 + this.combo * 0.1);
          }
        } else if (p.state === "grab" && e.state !== "hit") {
          e.state = "grabbed";
          e.stateTimer = 30;

          // Pull enemy
          setTimeout(() => {
            if (e.state === "grabbed") {
              e.health -= GRAB_DAMAGE;
              e.x = p.x + (p.facing === "right" ? 60 : -60);
              e.state = "hit";
              e.stateTimer = 25;

              if (e.health <= 0) {
                e.health = 0;
                e.state = "dead";
                const points = e.type === "brute" ? 75 : e.type === "ninja" ? 60 : 40;
                this.score += points;
              }
            }
          }, 300);
        }
      }
    }

    // Game over check
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.gameOver();
    }
  }

  private checkWaveEnd() {
    const alive = this.enemies.filter((e) => e.state !== "dead").length;
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
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
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

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#2d2d4e");
    gradient.addColorStop(1, "#16213e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Draw chain first (behind player)
    this.drawChain();

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Draw player
    this.drawPlayer();

    // UI
    this.drawUI();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();

    if (p.state === "hit" && Math.floor(p.stateTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(p.x + 5, p.y + 20, p.width - 10, p.height - 20);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    // Bandana
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(p.x + 5, p.y + 6, p.width - 10, 8);

    // Arm holding chain
    ctx.strokeStyle = "#7f8c8d";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 35);
    if (p.chainExtended) {
      ctx.lineTo(
        p.x + p.width / 2 + Math.cos(p.chainAngle) * 20,
        p.y + 30 + Math.sin(p.chainAngle) * 20
      );
    } else {
      ctx.lineTo(p.x + p.width / 2 + 15, p.y + 45);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawChain() {
    const ctx = this.ctx;
    const p = this.player;

    // Chain links
    ctx.strokeStyle = "#95a5a6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y + 30);

    for (const seg of p.chain) {
      ctx.lineTo(seg.x, seg.y);
    }
    ctx.stroke();

    // Chain segments
    ctx.fillStyle = "#7f8c8d";
    for (const seg of p.chain) {
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chain tip (blade)
    const tip = p.chain[p.chain.length - 1];
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(tip.angle);

    ctx.fillStyle = "#bdc3c7";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(0, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    if (e.state === "dead") {
      ctx.globalAlpha = 0.3;
    } else if (e.state === "hit" || e.state === "grabbed") {
      ctx.globalAlpha = 0.7;
    }

    const colors = {
      grunt: "#e74c3c",
      brute: "#8e44ad",
      ninja: "#2c3e50",
    };

    // Body
    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y + e.height * 0.2, e.width, e.height * 0.8);

    // Head
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + e.height * 0.15, e.height * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Ninja mask
    if (e.type === "ninja") {
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(e.x + e.width * 0.2, e.y + e.height * 0.1, e.width * 0.6, e.height * 0.08);
    }

    // Health bar
    if (e.health < e.maxHealth && e.state !== "dead") {
      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, e.width, 6);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, e.width * (e.health / e.maxHealth), 6);
    }

    ctx.globalAlpha = 1;
  }

  private drawUI() {
    const ctx = this.ctx;

    // Health bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(20, 20, 150, 15);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(20, 20, 150 * (this.player.health / this.player.maxHealth), 15);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 150, 15);

    // Combo
    if (this.combo > 0) {
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 20px Arial";
      ctx.fillText(`${this.combo} COMBO!`, 20, 60);
    }

    // Score and wave
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${Math.floor(this.score)}`, this.canvas.width - 20, 30);
    ctx.fillText(`Wave ${this.wave}`, this.canvas.width - 20, 50);
    ctx.textAlign = "left";
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
