/**
 * Shadow Run Game Engine
 * Game #401 - Light and shadow world parkour runner
 */

export interface Obstacle {
  x: number;
  width: number;
  height: number;
  world: 'light' | 'shadow';
  type: 'spike' | 'block' | 'gap';
}

export class ShadowRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private player = {
    x: 100,
    y: 200,
    width: 30,
    height: 40,
    vy: 0,
    isJumping: false,
    isGrounded: false,
  };

  private currentWorld: 'light' | 'shadow' = 'light';
  private worldTransition = 0; // 0 to 1 animation progress
  private isTransitioning = false;

  private obstacles: Obstacle[] = [];
  private distance = 0;
  private speed = 5;
  private gameSpeed = 5;

  private energy = 100;
  private maxEnergy = 100;
  private energyRegenRate = 0.3;
  private switchEnergyCost = 30;

  private gravity = 0.8;
  private jumpForce = -15;
  private groundY = 300;

  private status: 'idle' | 'playing' | 'won' | 'lost' = 'idle';
  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;

  private obstacleSpawnTimer = 0;
  private obstacleSpawnInterval = 90;
  private lastSpawnWorld: 'light' | 'shadow' = 'light';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupInput();
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      if (this.status !== 'playing') return;

      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.jump();
      } else if (e.key === 'Shift' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.switchWorld();
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.status === 'playing') {
        this.jump();
      }
    });

    // Touch controls for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.status !== 'playing') return;

      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;

      if (x < this.canvas.width / 2) {
        this.jump();
      } else {
        this.switchWorld();
      }
    });
  }

  private jump() {
    if (this.player.isGrounded) {
      this.player.vy = this.jumpForce;
      this.player.isJumping = true;
      this.player.isGrounded = false;
    }
  }

  private switchWorld() {
    if (this.isTransitioning) return;
    if (this.energy < this.switchEnergyCost) return;

    this.energy -= this.switchEnergyCost;
    this.currentWorld = this.currentWorld === 'light' ? 'shadow' : 'light';
    this.isTransitioning = true;
    this.worldTransition = 0;

    this.updateState();
  }

  public start() {
    this.reset();
    this.status = 'playing';
    this.gameLoop();
  }

  private reset() {
    this.player.x = 100;
    this.player.y = 200;
    this.player.vy = 0;
    this.player.isJumping = false;
    this.player.isGrounded = false;

    this.currentWorld = 'light';
    this.worldTransition = 0;
    this.isTransitioning = false;

    this.obstacles = [];
    this.distance = 0;
    this.speed = 5;
    this.gameSpeed = 5;
    this.energy = 100;

    this.obstacleSpawnTimer = 0;
    this.frameCount = 0;
    this.lastSpawnWorld = 'light';

    this.updateState();
  }

  private gameLoop() {
    if (this.status !== 'playing') return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update world transition animation
    if (this.isTransitioning) {
      this.worldTransition += 0.15;
      if (this.worldTransition >= 1) {
        this.worldTransition = 1;
        this.isTransitioning = false;
      }
    }

    // Regenerate energy
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate);
      this.updateState();
    }

    // Apply gravity
    this.player.vy += this.gravity;
    this.player.y += this.player.vy;

    // Ground collision
    if (this.player.y + this.player.height >= this.groundY) {
      this.player.y = this.groundY - this.player.height;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.isJumping = false;
    } else {
      this.player.isGrounded = false;
    }

    // Update obstacles
    this.obstacles.forEach((obstacle) => {
      obstacle.x -= this.gameSpeed;
    });

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter((obs) => obs.x + obs.width > 0);

    // Check collisions with current world obstacles
    for (const obstacle of this.obstacles) {
      if (obstacle.world !== this.currentWorld) continue;

      if (this.checkCollision(obstacle)) {
        this.gameOver();
        return;
      }
    }

    // Spawn new obstacles
    this.obstacleSpawnTimer++;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    // Increase difficulty over time
    this.distance += this.gameSpeed;
    if (this.frameCount % 300 === 0 && this.gameSpeed < 12) {
      this.gameSpeed += 0.5;
      this.obstacleSpawnInterval = Math.max(50, this.obstacleSpawnInterval - 5);
    }

    this.updateState();
  }

  private spawnObstacle() {
    const types: ('spike' | 'block' | 'gap')[] = ['spike', 'block', 'gap'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Alternate between light and shadow worlds, with some randomness
    let world: 'light' | 'shadow';
    if (Math.random() < 0.7) {
      world = this.lastSpawnWorld === 'light' ? 'shadow' : 'light';
    } else {
      world = this.lastSpawnWorld;
    }
    this.lastSpawnWorld = world;

    let obstacle: Obstacle;

    if (type === 'spike') {
      obstacle = {
        x: this.canvas.width,
        width: 40,
        height: 30,
        world,
        type: 'spike',
      };
    } else if (type === 'block') {
      const height = 40 + Math.random() * 60;
      obstacle = {
        x: this.canvas.width,
        width: 50,
        height,
        world,
        type: 'block',
      };
    } else {
      // gap
      obstacle = {
        x: this.canvas.width,
        width: 80 + Math.random() * 40,
        height: this.groundY,
        world,
        type: 'gap',
      };
    }

    this.obstacles.push(obstacle);
  }

  private checkCollision(obstacle: Obstacle): boolean {
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    if (obstacle.type === 'gap') {
      // Check if player is falling into gap
      if (
        px + pw > obstacle.x &&
        px < obstacle.x + obstacle.width &&
        py + ph >= this.groundY
      ) {
        return true;
      }
    } else if (obstacle.type === 'spike') {
      const spikeY = this.groundY - obstacle.height;
      if (
        px + pw - 5 > obstacle.x &&
        px + 5 < obstacle.x + obstacle.width &&
        py + ph - 5 > spikeY &&
        py + 5 < spikeY + obstacle.height
      ) {
        return true;
      }
    } else if (obstacle.type === 'block') {
      const blockY = this.groundY - obstacle.height;
      if (
        px + pw - 5 > obstacle.x &&
        px + 5 < obstacle.x + obstacle.width &&
        py + ph - 5 > blockY &&
        py + 5 < blockY + obstacle.height
      ) {
        return true;
      }
    }

    return false;
  }

  private gameOver() {
    this.status = 'lost';
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: 'lost' });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        distance: Math.floor(this.distance / 10),
        energy: Math.floor(this.energy),
        world: this.currentWorld,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw background with world transition effect
    this.drawBackground(ctx, w, h);

    // Draw ground
    this.drawGround(ctx, w);

    // Draw obstacles
    for (const obstacle of this.obstacles) {
      this.drawObstacle(ctx, obstacle);
    }

    // Draw player
    this.drawPlayer(ctx);

    // Draw world indicator
    this.drawWorldIndicator(ctx, w, h);

    // Draw transition effect
    if (this.isTransitioning) {
      this.drawTransitionEffect(ctx, w, h);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Light world background
    const lightGradient = ctx.createLinearGradient(0, 0, 0, h);
    lightGradient.addColorStop(0, '#e0e0e0');
    lightGradient.addColorStop(1, '#ffffff');

    // Shadow world background
    const shadowGradient = ctx.createLinearGradient(0, 0, 0, h);
    shadowGradient.addColorStop(0, '#1a1a1a');
    shadowGradient.addColorStop(1, '#3a3a3a');

    if (this.isTransitioning) {
      // Blend between worlds during transition
      if (this.currentWorld === 'light') {
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = this.worldTransition;
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = this.worldTransition;
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = this.currentWorld === 'light' ? lightGradient : shadowGradient;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw moving background lines for speed effect
    const lineColor = this.currentWorld === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
      const offset = (this.frameCount * this.gameSpeed + i * 150) % w;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset - 100, h);
      ctx.stroke();
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D, w: number) {
    const groundColor = this.currentWorld === 'light' ? '#8a8a8a' : '#2a2a2a';
    const groundAccent = this.currentWorld === 'light' ? '#6a6a6a' : '#1a1a1a';

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, this.groundY, w, this.canvas.height - this.groundY);

    // Ground pattern
    ctx.fillStyle = groundAccent;
    for (let i = 0; i < w; i += 40) {
      const offset = (this.frameCount * this.gameSpeed) % 40;
      ctx.fillRect(i - offset, this.groundY, 20, 10);
    }
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
    // Only draw obstacles visible in current world (or faintly show other world during transition)
    let alpha = 1;
    if (obstacle.world !== this.currentWorld && !this.isTransitioning) {
      alpha = 0.15;
    } else if (obstacle.world !== this.currentWorld && this.isTransitioning) {
      alpha = 0.15 + (1 - this.worldTransition) * 0.85;
    }

    ctx.globalAlpha = alpha;

    const color = obstacle.world === 'light' ? '#ff6b6b' : '#4a90e2';
    const accentColor = obstacle.world === 'light' ? '#ff4444' : '#2a70c2';

    if (obstacle.type === 'spike') {
      const y = this.groundY - obstacle.height;
      ctx.fillStyle = color;

      // Draw spikes
      const spikeCount = Math.floor(obstacle.width / 20);
      for (let i = 0; i < spikeCount; i++) {
        const x = obstacle.x + i * 20;
        ctx.beginPath();
        ctx.moveTo(x, this.groundY);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x + 20, this.groundY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = accentColor;
      for (let i = 0; i < spikeCount; i++) {
        const x = obstacle.x + i * 20;
        ctx.beginPath();
        ctx.moveTo(x + 5, this.groundY - 5);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x + 15, this.groundY - 5);
        ctx.closePath();
        ctx.fill();
      }
    } else if (obstacle.type === 'block') {
      const y = this.groundY - obstacle.height;

      ctx.fillStyle = color;
      ctx.fillRect(obstacle.x, y, obstacle.width, obstacle.height);

      ctx.fillStyle = accentColor;
      ctx.fillRect(obstacle.x, y, obstacle.width, 10);
      ctx.fillRect(obstacle.x, y, 10, obstacle.height);

      // Block pattern
      ctx.fillStyle = this.currentWorld === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      for (let i = 0; i < obstacle.height; i += 20) {
        ctx.fillRect(obstacle.x + 5, y + i + 5, obstacle.width - 10, 2);
      }
    } else if (obstacle.type === 'gap') {
      // Draw gap edges
      ctx.fillStyle = color;
      ctx.fillRect(obstacle.x - 5, this.groundY - 10, 5, this.canvas.height - this.groundY + 10);
      ctx.fillRect(obstacle.x + obstacle.width, this.groundY - 10, 5, this.canvas.height - this.groundY + 10);

      // Warning stripes
      ctx.fillStyle = accentColor;
      for (let i = 0; i < 5; i++) {
        const offset = (this.frameCount * 2) % 20;
        ctx.fillRect(obstacle.x - 5, this.groundY - 10 + i * 20 - offset, 5, 10);
        ctx.fillRect(obstacle.x + obstacle.width, this.groundY - 10 + i * 20 - offset, 5, 10);
      }
    }

    ctx.globalAlpha = 1;
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const playerColor = this.currentWorld === 'light' ? '#333333' : '#eeeeee';
    const accentColor = this.currentWorld === 'light' ? '#000000' : '#ffffff';

    // Player body
    ctx.fillStyle = playerColor;
    ctx.fillRect(p.x + 5, p.y + 5, p.width - 10, p.height - 10);

    // Player outline
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x + 5, p.y + 5, p.width - 10, p.height - 10);

    // Player eyes
    ctx.fillStyle = accentColor;
    ctx.fillRect(p.x + 10, p.y + 12, 5, 5);
    ctx.fillRect(p.x + p.width - 15, p.y + 12, 5, 5);

    // Movement trail effect
    if (!this.player.isGrounded) {
      ctx.fillStyle = this.currentWorld === 'light'
        ? 'rgba(51,51,51,0.3)'
        : 'rgba(238,238,238,0.3)';
      for (let i = 1; i <= 3; i++) {
        ctx.fillRect(
          p.x + 5 - i * 8,
          p.y + 5 + p.vy * i * 0.3,
          p.width - 10,
          p.height - 10
        );
      }
    }
  }

  private drawWorldIndicator(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const indicatorSize = 80;
    const x = w - indicatorSize - 20;
    const y = 20;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, indicatorSize, indicatorSize);

    // Light half
    ctx.fillStyle = this.currentWorld === 'light' ? '#ffffff' : 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y, indicatorSize / 2, indicatorSize);

    // Shadow half
    ctx.fillStyle = this.currentWorld === 'shadow' ? '#1a1a1a' : 'rgba(26,26,26,0.3)';
    ctx.fillRect(x + indicatorSize / 2, y, indicatorSize / 2, indicatorSize);

    // Divider
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + indicatorSize / 2, y);
    ctx.lineTo(x + indicatorSize / 2, y + indicatorSize);
    ctx.stroke();

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, indicatorSize, indicatorSize);

    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIGHT', x + indicatorSize / 4, y + indicatorSize + 15);
    ctx.fillText('SHADOW', x + 3 * indicatorSize / 4, y + indicatorSize + 15);
  }

  private drawTransitionEffect(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Flash effect during world transition
    const flashAlpha = Math.sin(this.worldTransition * Math.PI) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // Vertical scan lines
    ctx.strokeStyle = `rgba(255,255,255,${flashAlpha * 0.5})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < w; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
  }

  public resize() {
    this.canvas.width = 600;
    this.canvas.height = 400;
    this.groundY = this.canvas.height - 100;
    this.draw();
  }

  public getDistance(): number {
    return Math.floor(this.distance / 10);
  }

  public getEnergy(): number {
    return Math.floor(this.energy);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
