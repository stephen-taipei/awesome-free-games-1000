/**
 * Siren Slayer Game Engine
 * Game #354
 *
 * Underwater/coastal battles avoiding hypnotic songs!
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
  resistance: number;
  maxResistance: number;
  facing: "left" | "right";
  isJumping: boolean;
  isAttacking: boolean;
  attackTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  silenceAura: boolean;
  silenceAuraTimer: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: "sea-nymph" | "siren-singer" | "siren-queen";
  health: number;
  maxHealth: number;
  facing: "left" | "right";
  attackTimer: number;
  songPulse: number;
  hypnoticWave: boolean;
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
  vx: number;
  vy: number;
  size: number;
  life: number;
}

interface SilenceSphere {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

interface GameState {
  score: number;
  health: number;
  resistance: number;
  level: number;
  status: "idle" | "playing" | "clear" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ATTACK_DURATION = 20;

export class SirenSlayerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemies: Enemy[] = [];
  private platforms: Platform[] = [];
  private soundWaves: SoundWave[] = [];
  private silenceSpheres: SilenceSphere[] = [];
  private score = 0;
  private level = 1;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys = { left: false, right: false, jump: false, attack: false, special: false };
  private cameraX = 0;
  private levelWidth = 0;
  private resistanceRegenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    return {
      x: 50,
      y: 200,
      width: 32,
      height: 46,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      resistance: 50,
      maxResistance: 100,
      facing: "right",
      isJumping: false,
      isAttacking: false,
      attackTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      silenceAura: false,
      silenceAuraTimer: 0,
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
        resistance: Math.floor(this.player.resistance),
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
    this.silenceSpheres = [];
    this.player.x = 50;
    this.player.y = 200;
    this.player.health = this.player.maxHealth;
    this.player.resistance = 50;
    this.cameraX = 0;

    const h = this.canvas.height;
    this.levelWidth = this.canvas.width * 3;

    this.platforms.push({
      x: 0,
      y: h - 40,
      width: this.levelWidth,
      height: 40,
    });

    const platformCount = 7 + this.level * 2;
    for (let i = 0; i < platformCount; i++) {
      this.platforms.push({
        x: 140 + i * 170 + Math.random() * 80,
        y: h - 110 - Math.random() * 150,
        width: 85 + Math.random() * 55,
        height: 17,
      });
    }

    const enemyCount = 4 + this.level * 2;
    const types: Enemy["type"][] = ["sea-nymph", "siren-singer", "siren-queen"];

    for (let i = 0; i < enemyCount; i++) {
      const x = 280 + i * 210 + Math.random() * 90;
      const type = types[Math.floor(Math.random() * Math.min(types.length, this.level))];

      this.enemies.push({
        x,
        y: h - 180 - Math.random() * 80,
        width: type === "siren-queen" ? 46 : 34,
        height: type === "siren-queen" ? 54 : 44,
        vx: Math.random() > 0.5 ? 2.2 : -2.2,
        vy: Math.sin(Math.random() * Math.PI * 2) * 1.5,
        type,
        health: type === "siren-queen" ? 8 : type === "siren-singer" ? 5 : 3,
        maxHealth: type === "siren-queen" ? 8 : type === "siren-singer" ? 5 : 3,
        facing: "left",
        attackTimer: 0,
        songPulse: Math.random() * Math.PI * 2,
        hypnoticWave: false,
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
    this.updateSilenceSpheres();
    this.updateCamera();
    this.checkLevelComplete();
    this.emitState();
  }

  private updatePlayer() {
    const p = this.player;

    this.resistanceRegenTimer++;
    if (this.resistanceRegenTimer >= 32) {
      this.resistanceRegenTimer = 0;
      p.resistance = Math.min(p.maxResistance, p.resistance + 1);
    }

    if (this.keys.left) {
      p.vx = -MOVE_SPEED;
      p.facing = "left";
    } else if (this.keys.right) {
      p.vx = MOVE_SPEED;
      p.facing = "right";
    } else {
      p.vx = 0;
    }

    if (this.keys.jump && !p.isJumping) {
      p.vy = JUMP_FORCE;
      p.isJumping = true;
    }

    if (this.keys.attack && !p.isAttacking) {
      p.isAttacking = true;
      p.attackTimer = ATTACK_DURATION;
      this.soundWaveAttack();
    }

    if (this.keys.special && p.resistance >= 38 && !p.silenceAura) {
      p.resistance -= 38;
      p.silenceAura = true;
      p.silenceAuraTimer = 190;
      this.spawnSilenceSpheres();
    }

    if (p.isAttacking) {
      p.attackTimer--;
      if (p.attackTimer <= 0) p.isAttacking = false;
    }

    if (p.silenceAura) {
      p.silenceAuraTimer--;
      if (p.silenceAuraTimer <= 0) p.silenceAura = false;
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

  private soundWaveAttack() {
    const p = this.player;

    this.soundWaves.push({
      x: p.x + p.width / 2,
      y: p.y + p.height / 2,
      vx: p.facing === "right" ? 10 : -10,
      vy: 0,
      size: 15,
      life: 38,
    });
  }

  private spawnSilenceSpheres() {
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7;
      this.silenceSpheres.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height / 2,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 65,
        size: 12,
      });
    }
  }

  private updateSoundWaves() {
    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const wave = this.soundWaves[i];
      wave.x += wave.vx;
      wave.y += wave.vy;
      wave.life--;

      if (wave.life <= 0) {
        this.soundWaves.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkWaveHit(wave, e)) {
          e.health -= 2;
          this.soundWaves.splice(i, 1);
          this.player.resistance = Math.min(this.player.maxResistance, this.player.resistance + 9);
          if (e.health <= 0) {
            this.score += e.type === "siren-queen" ? 85 : e.type === "siren-singer" ? 60 : 40;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkWaveHit(wave: SoundWave, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      wave.x > target.x &&
      wave.x < target.x + target.width &&
      wave.y > target.y &&
      wave.y < target.y + target.height
    );
  }

  private updateSilenceSpheres() {
    for (let i = this.silenceSpheres.length - 1; i >= 0; i--) {
      const sphere = this.silenceSpheres[i];
      sphere.x += sphere.vx;
      sphere.y += sphere.vy;
      sphere.life--;

      if (sphere.life <= 0) {
        this.silenceSpheres.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.checkSphereHit(sphere, e)) {
          e.health -= 2;
          this.silenceSpheres.splice(i, 1);
          if (e.health <= 0) {
            this.score += e.type === "siren-queen" ? 85 : e.type === "siren-singer" ? 60 : 40;
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  private checkSphereHit(sphere: SilenceSphere, target: { x: number; y: number; width: number; height: number }): boolean {
    return (
      sphere.x > target.x - sphere.size &&
      sphere.x < target.x + target.width + sphere.size &&
      sphere.y > target.y - sphere.size &&
      sphere.y < target.y + target.height + sphere.size
    );
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.songPulse += 0.06;
      e.x += e.vx;
      e.y += Math.sin(e.songPulse) * 1.2;

      if (e.x < 80 || e.x > this.levelWidth - 80) {
        e.vx = -e.vx;
      }
      e.facing = e.vx < 0 ? "left" : "right";

      if (e.type === "siren-queen" || e.type === "siren-singer") {
        e.hypnoticWave = Math.sin(e.songPulse * 2) > 0.8;
      }

      if (!this.player.invincible && !this.player.silenceAura && this.checkEntityCollision(this.player, e)) {
        const damage = e.type === "siren-queen" ? 24 : e.type === "siren-singer" ? 18 : 14;
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
    if (this.player.silenceAura) {
      damage = Math.floor(damage * 0.5);
    }
    this.player.health -= damage;
    this.player.invincible = true;
    this.player.invincibleTimer = 60;
    this.player.resistance = Math.min(this.player.maxResistance, this.player.resistance + 12);

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
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
    this.player.resistance = 50;
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

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a4d5c");
    gradient.addColorStop(0.5, "#2a6d7c");
    gradient.addColorStop(1, "#3a8d9c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Water ripples
    ctx.strokeStyle = "rgba(100, 200, 255, 0.2)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = (Date.now() * 0.03 + i * 60) % h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 20) {
        ctx.lineTo(x, y + Math.sin((x + Date.now() * 0.002) * 0.1) * 5);
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    for (const plat of this.platforms) {
      this.drawPlatform(plat);
    }

    for (const enemy of this.enemies) {
      this.drawEnemy(enemy);
    }

    for (const sphere of this.silenceSpheres) {
      this.drawSilenceSphere(sphere);
    }

    for (const wave of this.soundWaves) {
      this.drawSoundWave(wave);
    }

    this.drawPlayer();

    ctx.restore();

    this.drawUI();
  }

  private drawPlatform(plat: Platform) {
    const ctx = this.ctx;

    if (plat.height === 40) {
      ctx.fillStyle = "#2a5a6a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#3a6a7a";
      ctx.fillRect(plat.x, plat.y, plat.width, 5);
    } else {
      ctx.fillStyle = "#3a6a7a";
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      ctx.fillStyle = "#4a7a8a";
      ctx.fillRect(plat.x, plat.y, plat.width, 4);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (p.silenceAura) {
      ctx.save();
      ctx.strokeStyle = "#ff99cc";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ff99cc";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 32 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#4a7a8a";
    ctx.fillRect(p.x + 4, p.y + 12, p.width - 8, p.height - 12);

    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + 8, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff99cc";
    ctx.shadowColor = "#ff99cc";
    ctx.shadowBlur = 8;
    ctx.fillRect(p.x + p.width / 2 - 5, p.y + 7, 3, 3);
    ctx.fillRect(p.x + p.width / 2 + 2, p.y + 7, 3, 3);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;

    ctx.fillStyle = e.type === "siren-queen" ? "#cc66aa" : e.type === "siren-singer" ? "#bb55aa" : "#aa4499";
    ctx.fillRect(e.x, e.y + 12, e.width, e.height - 12);

    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(e.x + e.width / 2, e.y + 10, 11, 0, Math.PI * 2);
    ctx.fill();

    if (e.hypnoticWave) {
      ctx.save();
      ctx.strokeStyle = "#ff66aa";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff66aa";
      ctx.shadowBlur = 15;
      const radius = 25 + Math.sin(e.songPulse * 3) * 8;
      ctx.beginPath();
      ctx.arc(e.x + e.width / 2, e.y + e.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (e.health < e.maxHealth) {
      const barWidth = e.width;
      const barHeight = 4;
      const hpPercent = e.health / e.maxHealth;

      ctx.fillStyle = "#333";
      ctx.fillRect(e.x, e.y - 10, barWidth, barHeight);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(e.x, e.y - 10, barWidth * hpPercent, barHeight);
    }
  }

  private drawSoundWave(wave: SoundWave) {
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#99ddff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#99ddff";
    ctx.shadowBlur = 12;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.size - i * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSilenceSphere(sphere: SilenceSphere) {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(255, 153, 204, 0.8)";
    ctx.shadowColor = "#ff99cc";
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(sphere.x, sphere.y, sphere.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawUI() {
    const ctx = this.ctx;
    const p = this.player;

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

    ctx.strokeStyle = "#3a6a7a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    const resistY = y + barHeight + 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, resistY, barWidth, barHeight);

    const resistPercent = p.resistance / p.maxResistance;
    ctx.fillStyle = "#ff99cc";
    ctx.fillRect(x, resistY, barWidth * resistPercent, barHeight);

    ctx.strokeStyle = "#cc66aa";
    ctx.strokeRect(x, resistY, barWidth, barHeight);

    if (p.silenceAura) {
      ctx.fillStyle = "#ff99cc";
      ctx.font = "bold 14px sans-serif";
      ctx.shadowColor = "#ff99cc";
      ctx.shadowBlur = 10;
      ctx.fillText("SILENCE AURA", x, resistY + barHeight + 20);
      ctx.shadowBlur = 0;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
