/**
 * Dual Blade (雙刀流) - Game Engine
 * Game #305
 * A dual-wielding sword combat action game
 */

export interface GameState {
  score: number;
  wave: number;
  status: "idle" | "playing" | "waveEnd" | "over";
  health: number;
  combo: number;
  fury: number;
}

type StateCallback = (state: GameState) => void;

interface Blade {
  x: number;
  y: number;
  angle: number;
  isAttacking: boolean;
  attackTimer: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  type: "grunt" | "heavy" | "assassin";
  vx: number;
  vy: number;
  state: "idle" | "attacking" | "stunned" | "dead";
  stateTimer: number;
  attackCooldown: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;
  vy: number;
  isCritical: boolean;
}

export class DualBladeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private animationId = 0;
  private lastTime = 0;

  private state: GameState = {
    score: 0,
    wave: 1,
    status: "idle",
    health: 100,
    combo: 0,
    fury: 0,
  };

  private onStateChange: StateCallback | null = null;

  // Player
  private playerX = 0;
  private playerY = 0;
  private playerFacing = 1; // 1 = right, -1 = left
  private leftBlade: Blade = {
    x: 0,
    y: 0,
    angle: -Math.PI / 4,
    isAttacking: false,
    attackTimer: 0,
    trail: [],
  };
  private rightBlade: Blade = {
    x: 0,
    y: 0,
    angle: Math.PI / 4,
    isAttacking: false,
    attackTimer: 0,
    trail: [],
  };
  private playerInvincible = 0;
  private dashCooldown = 0;
  private isDashing = false;
  private dashTimer = 0;
  private dashVx = 0;
  private dashVy = 0;

  // Game objects
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private damageNumbers: DamageNumber[] = [];

  // Input
  private mouseX = 0;
  private mouseY = 0;
  private keys: Set<string> = new Set();

  // Wave management
  private waveEnemiesRemaining = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === " " && this.state.status === "playing") {
        e.preventDefault();
        this.performDash();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emit() {
    this.onStateChange?.({ ...this.state });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  handleMouseMove(x: number, y: number) {
    const scaleX = this.width / this.canvas.getBoundingClientRect().width;
    const scaleY = this.height / this.canvas.getBoundingClientRect().height;
    this.mouseX = x * scaleX;
    this.mouseY = y * scaleY;
  }

  handleClick() {
    if (this.state.status !== "playing") return;
    this.performAttack();
  }

  private performAttack() {
    // Alternate between blades or both if fury is high
    const useBoth = this.state.fury >= 50;

    if (useBoth) {
      if (!this.leftBlade.isAttacking) {
        this.leftBlade.isAttacking = true;
        this.leftBlade.attackTimer = 0.3;
      }
      if (!this.rightBlade.isAttacking) {
        this.rightBlade.isAttacking = true;
        this.rightBlade.attackTimer = 0.3;
      }
      this.state.fury -= 10;
    } else {
      // Alternate
      if (!this.leftBlade.isAttacking && !this.rightBlade.isAttacking) {
        this.leftBlade.isAttacking = true;
        this.leftBlade.attackTimer = 0.25;
      } else if (this.leftBlade.isAttacking && !this.rightBlade.isAttacking) {
        this.rightBlade.isAttacking = true;
        this.rightBlade.attackTimer = 0.25;
      }
    }

    // Check for hits
    this.checkBladeHits();
  }

  private performDash() {
    if (this.dashCooldown > 0 || this.isDashing) return;

    const dx = this.mouseX - this.playerX;
    const dy = this.mouseY - this.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.dashVx = (dx / dist) * 400;
      this.dashVy = (dy / dist) * 400;
      this.isDashing = true;
      this.dashTimer = 0.15;
      this.dashCooldown = 0.8;
      this.playerInvincible = 0.2;

      // Dash particles
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: this.playerX,
          y: this.playerY,
          vx: -this.dashVx * 0.3 + (Math.random() - 0.5) * 50,
          vy: -this.dashVy * 0.3 + (Math.random() - 0.5) * 50,
          life: 0.3,
          maxLife: 0.3,
          color: "#a855f7",
          size: 4 + Math.random() * 3,
        });
      }
    }
  }

  private checkBladeHits() {
    const bladeLength = 50;
    const hitRadius = 30;

    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;

      // Check both blades
      const blades = [this.leftBlade, this.rightBlade];
      for (const blade of blades) {
        if (!blade.isAttacking || blade.attackTimer < 0.1) continue;

        const bladeEndX = this.playerX + Math.cos(blade.angle) * bladeLength * this.playerFacing;
        const bladeEndY = this.playerY + Math.sin(blade.angle) * bladeLength;

        const dx = enemy.x - bladeEndX;
        const dy = enemy.y - bladeEndY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hitRadius + enemy.width / 2) {
          // Hit!
          const isCritical = Math.random() < 0.15 + this.state.combo * 0.02;
          let damage = 15 + Math.random() * 10;
          if (isCritical) damage *= 2;

          enemy.health -= damage;
          enemy.state = "stunned";
          enemy.stateTimer = 0.2;

          // Knockback
          const knockbackDist = 30 + damage;
          const angle = Math.atan2(enemy.y - this.playerY, enemy.x - this.playerX);
          enemy.vx = Math.cos(angle) * knockbackDist * 5;
          enemy.vy = Math.sin(angle) * knockbackDist * 5;

          // Effects
          this.damageNumbers.push({
            x: enemy.x,
            y: enemy.y - 20,
            value: Math.round(damage),
            life: 1,
            vy: -50,
            isCritical,
          });

          this.spawnHitParticles(enemy.x, enemy.y, enemy.color);

          // Combo and fury
          this.state.combo++;
          this.state.fury = Math.min(100, this.state.fury + 5);

          if (enemy.health <= 0) {
            enemy.state = "dead";
            this.state.score += 50 * (1 + this.state.combo * 0.1);
            this.waveEnemiesRemaining--;
            this.spawnDeathParticles(enemy.x, enemy.y, enemy.color);
          }
        }
      }
    }
  }

  private spawnHitParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private spawnDeathParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        size: 4 + Math.random() * 4,
      });
    }
  }

  start() {
    this.state = {
      score: 0,
      wave: 1,
      status: "playing",
      health: 100,
      combo: 0,
      fury: 0,
    };
    this.playerX = this.width / 2;
    this.playerY = this.height / 2;
    this.enemies = [];
    this.particles = [];
    this.damageNumbers = [];
    this.waveEnemiesRemaining = 5;
    this.spawnTimer = 0;
    this.emit();
    this.lastTime = performance.now();
    this.loop();
  }

  nextWave() {
    this.state.wave++;
    this.state.status = "playing";
    this.state.combo = 0;
    this.waveEnemiesRemaining = 5 + this.state.wave * 2;
    this.enemies = [];
    this.spawnTimer = 0;
    this.emit();
    this.loop();
  }

  private loop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    if (this.state.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.loop());
    }
  }

  private update(dt: number) {
    // Player movement
    this.updatePlayer(dt);

    // Spawn enemies
    this.updateSpawning(dt);

    // Update enemies
    this.updateEnemies(dt);

    // Update particles
    this.updateParticles(dt);

    // Update damage numbers
    this.updateDamageNumbers(dt);

    // Update blades
    this.updateBlades(dt);

    // Combo decay
    if (this.state.combo > 0) {
      // Reset combo if no hit in 2 seconds (handled by a timer you could add)
    }

    // Cooldowns
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.playerInvincible > 0) this.playerInvincible -= dt;

    // Check wave complete
    if (this.waveEnemiesRemaining <= 0 && this.enemies.every((e) => e.state === "dead")) {
      this.state.status = "waveEnd";
      this.emit();
      cancelAnimationFrame(this.animationId);
    }
  }

  private updatePlayer(dt: number) {
    const speed = 200;

    if (this.isDashing) {
      this.playerX += this.dashVx * dt;
      this.playerY += this.dashVy * dt;
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // WASD movement
      let dx = 0;
      let dy = 0;
      if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
      if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        this.playerX += (dx / len) * speed * dt;
        this.playerY += (dy / len) * speed * dt;
      }
    }

    // Keep in bounds
    this.playerX = Math.max(30, Math.min(this.width - 30, this.playerX));
    this.playerY = Math.max(30, Math.min(this.height - 30, this.playerY));

    // Face mouse
    this.playerFacing = this.mouseX > this.playerX ? 1 : -1;
  }

  private updateBlades(dt: number) {
    // Update blade angles based on mouse
    const targetAngle = Math.atan2(this.mouseY - this.playerY, this.mouseX - this.playerX);

    // Left blade slightly up, right blade slightly down
    if (this.leftBlade.isAttacking) {
      this.leftBlade.angle += (this.playerFacing > 0 ? 1 : -1) * 15 * dt;
      this.leftBlade.attackTimer -= dt;
      if (this.leftBlade.attackTimer <= 0) {
        this.leftBlade.isAttacking = false;
      }

      // Add trail
      this.leftBlade.trail.push({
        x: this.playerX + Math.cos(this.leftBlade.angle) * 50 * this.playerFacing,
        y: this.playerY + Math.sin(this.leftBlade.angle) * 50,
        alpha: 1,
      });
    } else {
      this.leftBlade.angle = targetAngle - 0.3;
    }

    if (this.rightBlade.isAttacking) {
      this.rightBlade.angle += (this.playerFacing > 0 ? 1 : -1) * 15 * dt;
      this.rightBlade.attackTimer -= dt;
      if (this.rightBlade.attackTimer <= 0) {
        this.rightBlade.isAttacking = false;
      }

      // Add trail
      this.rightBlade.trail.push({
        x: this.playerX + Math.cos(this.rightBlade.angle) * 50 * this.playerFacing,
        y: this.playerY + Math.sin(this.rightBlade.angle) * 50,
        alpha: 1,
      });
    } else {
      this.rightBlade.angle = targetAngle + 0.3;
    }

    // Fade trails
    for (const blade of [this.leftBlade, this.rightBlade]) {
      blade.trail = blade.trail.filter((t) => {
        t.alpha -= dt * 5;
        return t.alpha > 0;
      });
    }
  }

  private updateSpawning(dt: number) {
    if (this.waveEnemiesRemaining <= 0) return;

    const activeEnemies = this.enemies.filter((e) => e.state !== "dead").length;
    if (activeEnemies >= 6) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = 1.5 - this.state.wave * 0.1;
    }
  }

  private spawnEnemy() {
    const types: ("grunt" | "heavy" | "assassin")[] = ["grunt", "grunt", "heavy", "assassin"];
    const type = types[Math.floor(Math.random() * types.length)];

    // Spawn from edges
    let x: number, y: number;
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        x = Math.random() * this.width;
        y = -30;
        break;
      case 1:
        x = this.width + 30;
        y = Math.random() * this.height;
        break;
      case 2:
        x = Math.random() * this.width;
        y = this.height + 30;
        break;
      default:
        x = -30;
        y = Math.random() * this.height;
    }

    const enemy: Enemy = {
      x,
      y,
      width: type === "heavy" ? 40 : 25,
      height: type === "heavy" ? 50 : 35,
      health: type === "heavy" ? 80 : type === "assassin" ? 30 : 50,
      maxHealth: type === "heavy" ? 80 : type === "assassin" ? 30 : 50,
      type,
      vx: 0,
      vy: 0,
      state: "idle",
      stateTimer: 0,
      attackCooldown: Math.random() * 2,
      color: type === "heavy" ? "#dc2626" : type === "assassin" ? "#7c3aed" : "#ea580c",
    };

    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;

      // Apply velocity (knockback)
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.vx *= 0.9;
      enemy.vy *= 0.9;

      // State timer
      if (enemy.stateTimer > 0) {
        enemy.stateTimer -= dt;
        if (enemy.stateTimer <= 0) {
          enemy.state = "idle";
        }
      }

      // Keep in bounds
      enemy.x = Math.max(20, Math.min(this.width - 20, enemy.x));
      enemy.y = Math.max(20, Math.min(this.height - 20, enemy.y));

      if (enemy.state === "stunned") continue;

      // Move towards player
      const dx = this.playerX - enemy.x;
      const dy = this.playerY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const moveSpeed = enemy.type === "assassin" ? 120 : enemy.type === "heavy" ? 60 : 80;
      const attackRange = enemy.type === "assassin" ? 35 : 40;

      if (dist > attackRange) {
        enemy.x += (dx / dist) * moveSpeed * dt;
        enemy.y += (dy / dist) * moveSpeed * dt;
      } else {
        // Attack
        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0) {
          this.enemyAttack(enemy);
          enemy.attackCooldown = enemy.type === "assassin" ? 0.8 : 1.5;
        }
      }
    }

    // Remove dead enemies after delay
    this.enemies = this.enemies.filter((e) => e.state !== "dead" || Math.random() > 0.05);
  }

  private enemyAttack(enemy: Enemy) {
    if (this.playerInvincible > 0) return;

    const damage = enemy.type === "heavy" ? 20 : enemy.type === "assassin" ? 15 : 10;
    this.state.health -= damage;
    this.state.combo = 0; // Reset combo on hit

    // Knockback player
    const angle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
    this.playerX += Math.cos(angle) * 30;
    this.playerY += Math.sin(angle) * 30;

    this.playerInvincible = 0.5;

    // Damage particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.playerX,
        y: this.playerY,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        life: 0.3,
        maxLife: 0.3,
        color: "#ef4444",
        size: 4,
      });
    }

    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.status = "over";
      this.emit();
      cancelAnimationFrame(this.animationId);
    }

    this.emit();
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      return p.life > 0;
    });
  }

  private updateDamageNumbers(dt: number) {
    this.damageNumbers = this.damageNumbers.filter((d) => {
      d.y += d.vy * dt;
      d.vy *= 0.95;
      d.life -= dt;
      return d.life > 0;
    });
  }

  private draw() {
    const ctx = this.ctx;

    // Background - arena floor
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(0, 0, this.width, this.height);

    // Arena pattern
    ctx.strokeStyle = "rgba(139, 92, 246, 0.1)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw particles (behind everything)
    this.drawParticles(ctx);

    // Draw enemies
    this.drawEnemies(ctx);

    // Draw player
    this.drawPlayer(ctx);

    // Draw damage numbers
    this.drawDamageNumbers(ctx);

    // Draw UI
    this.drawUI(ctx);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    // Flash when invincible
    if (this.playerInvincible > 0 && Math.floor(this.playerInvincible * 10) % 2 === 0) {
      return;
    }

    // Draw blade trails
    for (const blade of [this.leftBlade, this.rightBlade]) {
      if (blade.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(blade.trail[0].x, blade.trail[0].y);
        for (let i = 1; i < blade.trail.length; i++) {
          ctx.lineTo(blade.trail[i].x, blade.trail[i].y);
        }
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    // Body
    ctx.save();
    ctx.translate(this.playerX, this.playerY);
    ctx.scale(this.playerFacing, 1);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.roundRect(-12, -20, 24, 35, 8);
    ctx.fill();

    // Head
    ctx.fillStyle = "#fcd34d";
    ctx.beginPath();
    ctx.arc(0, -30, 12, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(-14, -35, 28, 6);

    ctx.restore();

    // Draw blades
    this.drawBlade(ctx, this.leftBlade, "#c084fc");
    this.drawBlade(ctx, this.rightBlade, "#a855f7");

    // Fury aura when high
    if (this.state.fury >= 50) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.2;
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBlade(ctx: CanvasRenderingContext2D, blade: Blade, color: string) {
    const bladeLength = 50;
    const bladeWidth = 4;

    ctx.save();
    ctx.translate(this.playerX, this.playerY);

    // Blade glow when attacking
    if (blade.isAttacking) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }

    // Blade
    ctx.rotate(blade.angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(bladeLength, -bladeWidth);
    ctx.lineTo(bladeLength + 8, 0);
    ctx.lineTo(bladeLength, bladeWidth);
    ctx.closePath();
    ctx.fill();

    // Handle
    ctx.fillStyle = "#78350f";
    ctx.fillRect(0, -3, 12, 6);

    ctx.restore();
  }

  private drawEnemies(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Stun effect
      if (enemy.state === "stunned") {
        ctx.globalAlpha = 0.7;
      }

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.ellipse(0, enemy.height / 2 - 5, enemy.width / 2, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.roundRect(
        -enemy.width / 2,
        -enemy.height / 2,
        enemy.width,
        enemy.height,
        8
      );
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#fff";
      const eyeY = -enemy.height / 4;
      ctx.beginPath();
      ctx.arc(-6, eyeY, 4, 0, Math.PI * 2);
      ctx.arc(6, eyeY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-6, eyeY, 2, 0, Math.PI * 2);
      ctx.arc(6, eyeY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      if (enemy.health < enemy.maxHealth) {
        const barWidth = 30;
        const barHeight = 4;
        const healthPct = enemy.health / enemy.maxHealth;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(-barWidth / 2, -enemy.height / 2 - 12, barWidth, barHeight);

        ctx.fillStyle = healthPct > 0.3 ? "#22c55e" : "#ef4444";
        ctx.fillRect(-barWidth / 2, -enemy.height / 2 - 12, barWidth * healthPct, barHeight);
      }

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawDamageNumbers(ctx: CanvasRenderingContext2D) {
    for (const d of this.damageNumbers) {
      ctx.save();
      ctx.globalAlpha = d.life;
      ctx.font = d.isCritical ? "bold 24px sans-serif" : "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = d.isCritical ? "#fbbf24" : "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(d.value.toString(), d.x, d.y);
      ctx.fillText(d.value.toString(), d.x, d.y);
      ctx.restore();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    // Health bar
    const healthWidth = 150;
    const healthHeight = 12;
    const healthX = 15;
    const healthY = 15;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(healthX, healthY, healthWidth, healthHeight);

    ctx.fillStyle = this.state.health > 30 ? "#22c55e" : "#ef4444";
    ctx.fillRect(healthX, healthY, healthWidth * (this.state.health / 100), healthHeight);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(healthX, healthY, healthWidth, healthHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`HP: ${this.state.health}`, healthX + healthWidth / 2, healthY + 10);

    // Fury bar
    const furyY = healthY + healthHeight + 8;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(healthX, furyY, healthWidth, healthHeight);

    const furyGradient = ctx.createLinearGradient(healthX, 0, healthX + healthWidth, 0);
    furyGradient.addColorStop(0, "#7c3aed");
    furyGradient.addColorStop(1, "#c084fc");
    ctx.fillStyle = furyGradient;
    ctx.fillRect(healthX, furyY, healthWidth * (this.state.fury / 100), healthHeight);

    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(healthX, furyY, healthWidth, healthHeight);

    ctx.fillStyle = "#fff";
    ctx.fillText(`FURY: ${Math.round(this.state.fury)}`, healthX + healthWidth / 2, furyY + 10);

    // Combo display
    if (this.state.combo > 1) {
      ctx.save();
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "#fbbf24";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      const comboText = `${this.state.combo} COMBO!`;
      ctx.strokeText(comboText, this.width - 15, 35);
      ctx.fillText(comboText, this.width - 15, 35);
      ctx.restore();
    }

    // Controls hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("WASD: Move | Click: Attack | Space: Dash", 15, this.height - 15);
  }
}
