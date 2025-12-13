/**
 * Centaur Warrior Game Engine
 * Game #350
 *
 * Half-human half-horse archer combat with mobility and precision!
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
  arrows: number;
  maxArrows: number;
  facing: "left" | "right";
  isJumping: boolean;
  isGalloping: boolean;
  isAiming: boolean;
  aimAngle: number;
  invincible: boolean;
  invincibleTimer: number;
  rapidFire: boolean;
  rapidFireTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  health: number;
  maxHealth: number;
  type: "satyr" | "harpy" | "chimera";
  facing: "left" | "right";
  attackTimer: number;
  patrolLeft: number;
  patrolRight: number;
  flying: boolean;
  flyPhase: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface GameState {
  score: number;
  health: number;
  arrows: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -15;
const MOVE_SPEED = 6;
const GALLOP_SPEED = 10;
const ARROW_SPEED = 16;

export class CentaurWarriorGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private arrows: Arrow[] = [];
  private projectiles: Projectile[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private arrowRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 36,
      height: 48,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      arrows: 50,
      maxArrows: 100,
      facing: "right",
      isJumping: false,
      isGalloping: false,
      isAiming: false,
      aimAngle: 0,
      invincible: false,
      invincibleTimer: 0,
      rapidFire: false,
      rapidFireTimer: 0,
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
        arrows: this.player.arrows,
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
    this.arrows = [];
    this.projectiles = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.arrows = 50;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3.5;

    this.platforms.push({ x: 0, y: h - 40, width: this.levelWidth, height: 40 });

    const platformCount = 8 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 150 + i * 220 + Math.random() * 60,
        y: h - 100 - Math.random() * 160,
        width: 90 + Math.random() * 50,
        height: 16,
      });
    }

    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["satyr", "harpy", "chimera"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 350 + i * 280 + Math.random() * 80;
      const type = types[Math.floor(Math.random() * Math.min(types.length, 1 + Math.floor(this.level / 2)))];

      this.enemies.push({
        x,
        y: type === "harpy" ? h - 220 : h - 80,
        width: type === "chimera" ? 44 : 32,
        height: type === "chimera" ? 52 : 40,
        vx: Math.random() > 0.5 ? 2 : -2,
        health: type === "chimera" ? 6 : type === "harpy" ? 3 : 4,
        maxHealth: type === "chimera" ? 6 : type === "harpy" ? 3 : 4,
        type,
        facing: "left",
        attackTimer: 100,
        patrolLeft: x - 120,
        patrolRight: x + 120,
        flying: type === "harpy",
        flyPhase: Math.random() * Math.PI * 2,
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
    this.updateArrows();
    this.updateProjectiles();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.arrowRegenTimer++;
    if (this.arrowRegenTimer >= 60) {
      this.arrowRegenTimer = 0;
      p.arrows = Math.min(p.maxArrows, p.arrows + 1);
    }

    const speed = p.isGalloping ? GALLOP_SPEED : MOVE_SPEED;

    if (this.keys.left) {
      p.vx = -speed;
      p.facing = "left";
      p.isGalloping = speed === GALLOP_SPEED;
    } else if (this.keys.right) {
      p.vx = speed;
      p.facing = "right";
      p.isGalloping = speed === GALLOP_SPEED;
    } else {
      p.vx = 0;
      p.isGalloping = false;
    }

    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    if (this.keys.attack && p.arrows > 0) {
      if (!p.isAiming) {
        p.isAiming = true;
        p.aimAngle = 0;
      }
      p.aimAngle = Math.min(Math.PI / 4, p.aimAngle + 0.03);
    } else if (p.isAiming) {
      this.shootArrow();
      p.isAiming = false;
      p.aimAngle = 0;
    }

    if (this.keys.special && p.arrows >= 20 && !p.rapidFire) {
      p.arrows -= 20;
      p.rapidFire = true;
      p.rapidFireTimer = 180;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (this.player.arrows > 0) this.shootArrow();
        }, i * 100);
      }
    }

    if (p.rapidFire) {
      p.rapidFireTimer--;
      if (p.rapidFireTimer <= 0) p.rapidFire = false;
    }

    if (p.invincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) p.invincible = false;
    }

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

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

  private shootArrow() {
    const p = this.player;
    if (p.arrows <= 0) return;

    p.arrows--;
    const dir = p.facing === "right" ? 1 : -1;
    const angle = (p.facing === "right" ? 0 : Math.PI) - p.aimAngle * dir;

    this.arrows.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2 - 10,
      vx: Math.cos(angle) * ARROW_SPEED,
      vy: Math.sin(angle) * ARROW_SPEED,
      damage: 2,
      life: 120,
    });
  }

  private updateArrows() {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      arrow.vy += GRAVITY * 0.2;
      arrow.life--;

      if (arrow.life <= 0 || arrow.y > this.canvas.height) {
        this.arrows.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkArrowHit(arrow, e)) {
          e.health -= arrow.damage;
          this.arrows.splice(i, 1);
          if (e.health <= 0) {
            const points = e.type === "chimera" ? 100 : e.type === "harpy" ? 60 : 70;
            this.score += points;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkArrowHit(arrow: Arrow, target: Enemy): boolean {
    return (
      arrow.x > target.x &&
      arrow.x < target.x + target.width &&
      arrow.y > target.y &&
      arrow.y < target.y + target.height
    );
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (e.flying) {
        e.flyPhase += 0.05;
        e.y += Math.sin(e.flyPhase) * 2;
      }

      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) e.vx = -e.vx;
      e.facing = e.vx < 0 ? "left" : "right";

      e.attackTimer--;
      if (e.attackTimer <= 0) {
        e.attackTimer = 100 - this.level * 5;
        this.enemyAttack(e);
      }

      if (!this.player.invincible && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "chimera" ? 25 : e.type === "harpy" ? 15 : 18;
        this.hitPlayer(damage);
      }
    }
  }

  private enemyAttack(e: Enemy) {
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 5;

    this.projectiles.push({
      x: e.x + e.width / 2,
      y: e.y + e.height / 2,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      size: e.type === "chimera" ? 14 : 10,
    });
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      if (proj.y > this.canvas.height || proj.x < 0 || proj.x > this.levelWidth) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (!this.player.invincible && this.checkProjectileHit(proj, this.player)) {
        this.hitPlayer(15);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkProjectileHit(proj: Projectile, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      proj.x > target.x - proj.size / 2 &&
      proj.x < target.x + target.width + proj.size / 2 &&
      proj.y > target.y - proj.size / 2 &&
      proj.y < target.y + target.height + proj.size / 2
    );
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
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.arrows = Math.min(this.player.maxArrows, this.player.arrows + 5);
    if (this.player.health <= 0) this.gameOver();
  }

  private updateCamera() {
    const targetX = this.player.x - this.canvas.width / 3;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.levelWidth - this.canvas.width, this.cameraX));
  }

  private checkLevelComplete() {
    if (this.enemies.length === 0 && this.player.x > this.levelWidth - 100) {
      this.status = "clear";
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.emitState();
    }
  }

  nextLevel() {
    this.level++;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
    this.player.arrows = Math.min(this.player.maxArrows, this.player.arrows + 30);
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

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#4a6a5a");
    gradient.addColorStop(0.5, "#3a5a4a");
    gradient.addColorStop(1, "#2a4a3a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Trees
    ctx.fillStyle = "rgba(58, 90, 74, 0.3)";
    for (let i = 0; i < 12; i++) {
      const tx = i * 180;
      ctx.beginPath();
      ctx.moveTo(tx + 40, h - 100);
      ctx.lineTo(tx + 20, h - 180);
      ctx.lineTo(tx + 60, h - 180);
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) {
      if (plat.height === 40) {
        ctx.fillStyle = "#3a5a3a";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#4a6a4a";
        ctx.fillRect(plat.x, plat.y, plat.width, 5);
      } else {
        ctx.fillStyle = "#5a7a5a";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#6a8a6a";
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
      }
    }

    for (const proj of this.projectiles) this.drawProjectile(proj);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const arrow of this.arrows) this.drawArrow(arrow);
    this.drawPlayer();

    ctx.restore();
    this.drawUI();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) ctx.globalAlpha = 0.5;
    if (p.rapidFire) {
      ctx.shadowColor = "#6aaa4a";
      ctx.shadowBlur = 15;
    }

    // Horse body (centaur lower half)
    ctx.fillStyle = "#8a6a4a";
    ctx.fillRect(p.x, p.y + p.height * 0.5, p.width, p.height * 0.5);

    // Human torso
    ctx.fillStyle = "#aa8a6a";
    ctx.fillRect(p.x + 8, p.y + 10, p.width - 16, p.height * 0.5);

    // Head
    ctx.fillStyle = "#deb887";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(p.x + p.width / 2 - 6, p.y + 2, 12, 8);

    // Eyes
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(p.x + p.width / 2 - 4, p.y + 8, 2, 2);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 8, 2, 2);

    // Bow
    ctx.strokeStyle = "#6a4a2a";
    ctx.lineWidth = 2;
    const bowX = p.facing === "right" ? p.x + p.width : p.x;
    const bowY = p.y + 18;

    if (p.isAiming) {
      ctx.beginPath();
      ctx.arc(bowX + (p.facing === "right" ? 8 : -8), bowY, 10, p.facing === "right" ? Math.PI * 0.7 : Math.PI * 0.3, p.facing === "right" ? Math.PI * 1.3 : Math.PI * 1.7);
      ctx.stroke();
      // Arrow nocked
      ctx.strokeStyle = "#8a6a4a";
      ctx.lineWidth = 2;
      const arrowLen = 15;
      const angle = (p.facing === "right" ? 0 : Math.PI) - p.aimAngle * (p.facing === "right" ? 1 : -1);
      ctx.beginPath();
      ctx.moveTo(bowX, bowY);
      ctx.lineTo(bowX - Math.cos(angle) * arrowLen, bowY - Math.sin(angle) * arrowLen);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(bowX + (p.facing === "right" ? 8 : -8), bowY, 10, p.facing === "right" ? Math.PI * 0.8 : Math.PI * 0.2, p.facing === "right" ? Math.PI * 1.2 : Math.PI * 1.8);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const colors = { satyr: "#6a5a3a", harpy: "#7a6a5a", chimera: "#8a4a3a" };

    ctx.fillStyle = colors[e.type];
    ctx.fillRect(e.x, e.y, e.width, e.height);

    if (e.type === "harpy") {
      // Wings
      ctx.fillStyle = "rgba(122, 106, 90, 0.7)";
      const wingSpan = e.width * 0.8;
      const wingY = e.y + e.height * 0.3;
      ctx.beginPath();
      ctx.moveTo(e.x, wingY);
      ctx.lineTo(e.x - wingSpan, wingY - 10);
      ctx.lineTo(e.x - wingSpan / 2, wingY);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x + e.width, wingY);
      ctx.lineTo(e.x + e.width + wingSpan, wingY - 10);
      ctx.lineTo(e.x + e.width + wingSpan / 2, wingY);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = "#ff4a3a";
    ctx.fillRect(e.x + e.width * 0.3, e.y + e.height * 0.25, 4, 4);
    ctx.fillRect(e.x + e.width * 0.6, e.y + e.height * 0.25, 4, 4);

    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const hpPercent = e.health / e.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, 4);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, 4);
    }
  }

  private drawArrow(arrow: Arrow) {
    const ctx = this.ctx;
    const angle = Math.atan2(arrow.vy, arrow.vx);

    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(angle);

    ctx.strokeStyle = "#6a4a2a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 3);
    ctx.fill();

    ctx.strokeStyle = "#8a5a3a";
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawProjectile(proj: Projectile) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ff6a3a";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffaa6a";
    ctx.beginPath();
    ctx.arc(proj.x - 2, proj.y - 2, proj.size / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;
    const x = 20;
    const y = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, 150, 15);

    const arrowPercent = p.arrows / p.maxArrows;
    ctx.fillStyle = "#6aaa4a";
    ctx.fillRect(x, y, 150 * arrowPercent, 15);

    ctx.strokeStyle = "#4a8a2a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 150, 15);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`Arrows: ${p.arrows}`, x + 155, y + 12);

    if (p.rapidFire) {
      ctx.fillStyle = "#6aaa4a";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#6aaa4a";
      ctx.shadowBlur = 10;
      ctx.fillText("RAPID FIRE", x, y + 30);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
