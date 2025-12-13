/**
 * Donkey Kong Game
 * Game #157 - Platform JS
 * Classic arcade platformer: climb ladders, avoid barrels, rescue the princess
 */

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  climbing: boolean;
  facing: 'left' | 'right';
}

interface Barrel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rolling: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  slope: number; // tilt angle
}

interface Ladder {
  x: number;
  y: number;
  height: number;
  broken: boolean; // some ladders have gaps
}

export class DonkeyKongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player: Player = {
    x: 50, y: 400, width: 24, height: 32,
    vx: 0, vy: 0, onGround: false, climbing: false, facing: 'right'
  };

  private platforms: Platform[] = [];
  private ladders: Ladder[] = [];
  private barrels: Barrel[] = [];

  private kongX = 60;
  private kongY = 60;
  private princessX = 200;
  private princessY = 30;

  private keys: Record<string, boolean> = {};
  private barrelTimer = 0;
  private barrelInterval = 120;

  private gravity = 0.5;
  private jumpPower = -10;
  private moveSpeed = 3;
  private climbSpeed = 2;

  score = 0;
  lives = 3;
  level = 1;
  status: 'playing' | 'won' | 'lost' | 'paused' = 'paused';

  onStateChange: ((state: any) => void) | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupLevel();
  }

  private setupLevel() {
    this.platforms = [];
    this.ladders = [];
    this.barrels = [];

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Classic DK style sloped platforms
    // Bottom platform
    this.platforms.push({ x: 0, y: h - 30, width: w, slope: 0 });

    // Platform 2 (slight left tilt)
    this.platforms.push({ x: 30, y: h - 100, width: w - 60, slope: 0.03 });

    // Platform 3 (slight right tilt)
    this.platforms.push({ x: 30, y: h - 170, width: w - 60, slope: -0.03 });

    // Platform 4 (slight left tilt)
    this.platforms.push({ x: 30, y: h - 240, width: w - 60, slope: 0.03 });

    // Platform 5 (slight right tilt)
    this.platforms.push({ x: 30, y: h - 310, width: w - 60, slope: -0.03 });

    // Top platform (Kong's platform)
    this.platforms.push({ x: 30, y: h - 380, width: w - 100, slope: 0 });

    // Ladders connecting platforms
    // Bottom to P2
    this.ladders.push({ x: w - 80, y: h - 100, height: 70, broken: false });

    // P2 to P3
    this.ladders.push({ x: 80, y: h - 170, height: 70, broken: true });
    this.ladders.push({ x: 60, y: h - 150, height: 50, broken: false });

    // P3 to P4
    this.ladders.push({ x: w - 100, y: h - 240, height: 70, broken: false });

    // P4 to P5
    this.ladders.push({ x: 100, y: h - 310, height: 70, broken: true });
    this.ladders.push({ x: 80, y: h - 290, height: 50, broken: false });

    // P5 to top
    this.ladders.push({ x: w - 120, y: h - 380, height: 70, broken: false });

    // Position Kong and Princess
    this.kongX = 60;
    this.kongY = h - 380 - 60;
    this.princessX = 200;
    this.princessY = h - 380 - 40;

    // Reset player
    this.player.x = 50;
    this.player.y = h - 30 - this.player.height;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = true;
    this.player.climbing = false;

    this.barrelTimer = 0;
    this.barrelInterval = Math.max(60, 120 - this.level * 10);
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.lastTime = performance.now();
    this.gameLoop();
    this.emitState();
  }

  private gameLoop() {
    if (this.status !== 'playing') return;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 16) {
      this.lastTime = now;
      this.update();
      this.draw();
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.frameCount++;

    // Spawn barrels
    this.barrelTimer++;
    if (this.barrelTimer >= this.barrelInterval) {
      this.barrelTimer = 0;
      this.spawnBarrel();
    }

    this.updatePlayer();
    this.updateBarrels();
    this.checkCollisions();
  }

  private spawnBarrel() {
    this.barrels.push({
      x: this.kongX + 40,
      y: this.kongY + 40,
      vx: 2,
      vy: 0,
      rolling: true
    });
  }

  private updatePlayer() {
    const p = this.player;

    if (p.climbing) {
      // Climbing movement
      if (this.keys['ArrowUp'] || this.keys['w']) {
        p.y -= this.climbSpeed;
      }
      if (this.keys['ArrowDown'] || this.keys['s']) {
        p.y += this.climbSpeed;
      }

      // Check if still on ladder
      const onLadder = this.ladders.some(l =>
        !l.broken &&
        p.x + p.width / 2 > l.x &&
        p.x + p.width / 2 < l.x + 20 &&
        p.y + p.height > l.y &&
        p.y < l.y + l.height
      );

      if (!onLadder) {
        p.climbing = false;
      }

      // Allow left/right to exit ladder
      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['ArrowRight'] || this.keys['d']) {
        p.climbing = false;
      }
    } else {
      // Normal movement
      p.vx = 0;
      if (this.keys['ArrowLeft'] || this.keys['a']) {
        p.vx = -this.moveSpeed;
        p.facing = 'left';
      }
      if (this.keys['ArrowRight'] || this.keys['d']) {
        p.vx = this.moveSpeed;
        p.facing = 'right';
      }

      // Jump
      if ((this.keys[' '] || this.keys['ArrowUp'] || this.keys['w']) && p.onGround) {
        p.vy = this.jumpPower;
        p.onGround = false;
      }

      // Apply gravity
      p.vy += this.gravity;
      p.y += p.vy;
      p.x += p.vx;

      // Platform collision
      p.onGround = false;
      for (const plat of this.platforms) {
        const platY = plat.y + (p.x - plat.x) * plat.slope;
        if (
          p.x + p.width > plat.x &&
          p.x < plat.x + plat.width &&
          p.y + p.height >= platY - 5 &&
          p.y + p.height <= platY + 15 &&
          p.vy >= 0
        ) {
          p.y = platY - p.height;
          p.vy = 0;
          p.onGround = true;
          break;
        }
      }

      // Try to climb ladder
      if (this.keys['ArrowUp'] || this.keys['w']) {
        for (const l of this.ladders) {
          if (
            !l.broken &&
            p.x + p.width / 2 > l.x &&
            p.x + p.width / 2 < l.x + 20 &&
            p.y + p.height > l.y &&
            p.y < l.y + l.height
          ) {
            p.climbing = true;
            p.vy = 0;
            break;
          }
        }
      }

      // Bounds
      p.x = Math.max(0, Math.min(this.canvas.width - p.width, p.x));

      // Fall off screen
      if (p.y > this.canvas.height) {
        this.loseLife();
      }
    }
  }

  private updateBarrels() {
    const h = this.canvas.height;

    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const b = this.barrels[i];

      b.vy += this.gravity * 0.5;
      b.x += b.vx;
      b.y += b.vy;

      // Platform collision for barrels
      for (const plat of this.platforms) {
        const platY = plat.y + (b.x - plat.x) * plat.slope;
        if (
          b.x > plat.x &&
          b.x < plat.x + plat.width &&
          b.y + 16 >= platY - 5 &&
          b.y + 16 <= platY + 15 &&
          b.vy >= 0
        ) {
          b.y = platY - 16;
          b.vy = 0;
          // Roll direction based on slope
          b.vx = plat.slope > 0 ? -2 - this.level * 0.3 : 2 + this.level * 0.3;
        }
      }

      // Barrel falls off ladder
      for (const l of this.ladders) {
        if (
          Math.random() < 0.02 &&
          b.x > l.x - 5 &&
          b.x < l.x + 25 &&
          Math.abs(b.y + 16 - l.y) < 10
        ) {
          b.vy = 2;
          b.vx = 0;
        }
      }

      // Remove off-screen barrels
      if (b.y > h + 50 || b.x < -50 || b.x > this.canvas.width + 50) {
        this.barrels.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    const p = this.player;

    // Barrel collision
    for (const b of this.barrels) {
      const dx = (p.x + p.width / 2) - b.x;
      const dy = (p.y + p.height / 2) - (b.y + 8);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 20) {
        this.loseLife();
        return;
      }

      // Jump over barrel for points
      if (
        p.y + p.height < b.y &&
        p.vy > 0 &&
        Math.abs(p.x - b.x) < 30 &&
        !(b as any).jumped
      ) {
        (b as any).jumped = true;
        this.score += 100;
        this.emitState();
      }
    }

    // Reach princess (win condition)
    const dx = (p.x + p.width / 2) - this.princessX;
    const dy = (p.y + p.height / 2) - this.princessY;
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      this.score += 1000;
      this.level++;
      if (this.level > 5) {
        this.status = 'won';
        if (this.animationId) cancelAnimationFrame(this.animationId);
      } else {
        this.setupLevel();
      }
      this.emitState();
    }
  }

  private loseLife() {
    this.lives--;
    this.emitState();

    if (this.lives <= 0) {
      this.status = 'lost';
      if (this.animationId) cancelAnimationFrame(this.animationId);
    } else {
      // Reset player position
      this.player.x = 50;
      this.player.y = this.canvas.height - 30 - this.player.height;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.onGround = true;
      this.player.climbing = false;
      this.barrels = [];
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Platforms
    ctx.fillStyle = '#e74c3c';
    for (const plat of this.platforms) {
      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y);
      ctx.lineTo(plat.x + plat.width, plat.y + plat.width * plat.slope);
      ctx.lineTo(plat.x + plat.width, plat.y + plat.width * plat.slope + 8);
      ctx.lineTo(plat.x, plat.y + 8);
      ctx.closePath();
      ctx.fill();

      // Girder pattern
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      for (let x = plat.x; x < plat.x + plat.width; x += 20) {
        const y1 = plat.y + (x - plat.x) * plat.slope;
        const y2 = plat.y + (x + 10 - plat.x) * plat.slope;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x + 10, y2 + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 10, y1);
        ctx.lineTo(x, y2 + 8);
        ctx.stroke();
      }
    }

    // Ladders
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    for (const l of this.ladders) {
      if (l.broken) {
        ctx.globalAlpha = 0.3;
      }
      // Side rails
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x, l.y + l.height);
      ctx.moveTo(l.x + 16, l.y);
      ctx.lineTo(l.x + 16, l.y + l.height);
      ctx.stroke();

      // Rungs
      for (let y = l.y + 10; y < l.y + l.height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(l.x, y);
        ctx.lineTo(l.x + 16, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Kong
    this.drawKong();

    // Princess
    this.drawPrincess();

    // Barrels
    for (const b of this.barrels) {
      this.drawBarrel(b);
    }

    // Player
    this.drawPlayer();

    // Level indicator
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`L${this.level}`, w - 30, 20);
  }

  private drawKong() {
    const ctx = this.ctx;
    const x = this.kongX;
    const y = this.kongY;

    // Body
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 35, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#D2691E';
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 20, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 4, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + 21, y + 18, 2, 0, Math.PI * 2);
    ctx.arc(x + 31, y + 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 25, y + 28, 6, 0, Math.PI);
    ctx.stroke();

    // Arms (animated)
    const armAngle = Math.sin(this.frameCount * 0.1) * 0.3;
    ctx.fillStyle = '#8B4513';
    ctx.save();
    ctx.translate(x + 5, y + 35);
    ctx.rotate(-0.5 + armAngle);
    ctx.fillRect(-5, 0, 10, 25);
    ctx.restore();

    ctx.save();
    ctx.translate(x + 45, y + 35);
    ctx.rotate(0.5 - armAngle);
    ctx.fillRect(-5, 0, 10, 25);
    ctx.restore();
  }

  private drawPrincess() {
    const ctx = this.ctx;
    const x = this.princessX;
    const y = this.princessY;

    // Dress
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.moveTo(x, y + 15);
    ctx.lineTo(x - 12, y + 35);
    ctx.lineTo(x + 12, y + 35);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = '#ffe4c4';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x, y - 2, 8, Math.PI, Math.PI * 2);
    ctx.fill();

    // Crown
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 8);
    ctx.lineTo(x - 4, y - 14);
    ctx.lineTo(x, y - 10);
    ctx.lineTo(x + 4, y - 14);
    ctx.lineTo(x + 6, y - 8);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 3, y, 1, 0, Math.PI * 2);
    ctx.arc(x + 3, y, 1, 0, Math.PI * 2);
    ctx.fill();

    // Help text animation
    if (this.frameCount % 60 < 30) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText('HELP!', x - 15, y - 20);
    }
  }

  private drawBarrel(b: Barrel) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(b.x, b.y + 8);
    ctx.rotate(b.x * 0.05);

    // Barrel body
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barrel stripes
    ctx.strokeStyle = '#D2691E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    if (p.facing === 'left') ctx.scale(-1, 1);

    // Body (red overalls)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-10, -5, 20, 18);

    // Head
    ctx.fillStyle = '#ffe4c4';
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cap
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, -14, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10, -14, 8, 4);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(3, -12, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Mustache
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(2, -8, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#3498db';
    const legOffset = p.climbing
      ? Math.sin(this.frameCount * 0.3) * 3
      : (p.vx !== 0 ? Math.sin(this.frameCount * 0.4) * 4 : 0);
    ctx.fillRect(-8, 13, 6, 10 + legOffset);
    ctx.fillRect(2, 13, 6, 10 - legOffset);

    // Arms
    ctx.fillStyle = '#ffe4c4';
    if (p.climbing) {
      const armOffset = Math.sin(this.frameCount * 0.3) * 5;
      ctx.fillRect(-14, -5 + armOffset, 5, 12);
      ctx.fillRect(9, -5 - armOffset, 5, 12);
    } else {
      ctx.fillRect(-14, 0, 5, 10);
      ctx.fillRect(9, 0, 5, 10);
    }

    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    if (type === 'down' || type === 'move') {
      // Touch controls
      this.keys['ArrowLeft'] = x < centerX - 50;
      this.keys['ArrowRight'] = x > centerX + 50;
      this.keys['ArrowUp'] = y < centerY;
      this.keys['ArrowDown'] = y > centerY + 100;
    } else {
      this.keys['ArrowLeft'] = false;
      this.keys['ArrowRight'] = false;
      this.keys['ArrowUp'] = false;
      this.keys['ArrowDown'] = false;
    }

    // Tap to jump
    if (type === 'down' && y > centerY - 50 && y < centerY + 50) {
      this.keys[' '] = true;
      setTimeout(() => { this.keys[' '] = false; }, 100);
    }
  }

  handleKey(key: string, pressed: boolean) {
    if (this.status !== 'playing') return;
    this.keys[key] = pressed;
  }

  resize() {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, 450);
      this.canvas.width = size;
      this.canvas.height = size;
      this.setupLevel();
      this.draw();
    }
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.status = 'paused';
    this.keys = {};
    this.setupLevel();
    this.draw();
    this.emitState();
  }

  setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
    this.emitState();
  }

  private emitState() {
    this.onStateChange?.({
      score: this.score,
      lives: this.lives,
      level: this.level,
      status: this.status
    });
  }
}
