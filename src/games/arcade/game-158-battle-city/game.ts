/**
 * Battle City Game
 * Game #158 - Canvas Tank
 * Classic tank battle: defend your base and destroy enemy tanks
 */

interface Tank {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  health: number;
  cooldown: number;
  isPlayer: boolean;
  type: 'basic' | 'fast' | 'power' | 'armor';
}

interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  isPlayer: boolean;
  power: number;
}

interface Tile {
  type: 'empty' | 'brick' | 'steel' | 'water' | 'forest' | 'ice' | 'base';
  health: number;
}

export class BattleCityGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private gridSize = 16;
  private mapWidth = 26;
  private mapHeight = 26;
  private map: Tile[][] = [];

  private player: Tank = {
    x: 8, y: 24, direction: 'up', speed: 0.08,
    health: 1, cooldown: 0, isPlayer: true, type: 'basic'
  };

  private enemies: Tank[] = [];
  private bullets: Bullet[] = [];

  private keys: Record<string, boolean> = {};
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 180;
  private maxEnemies = 4;
  private enemiesRemaining = 20;
  private baseDestroyed = false;

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
    this.map = [];
    this.bullets = [];
    this.enemies = [];
    this.baseDestroyed = false;

    // Initialize empty map
    for (let y = 0; y < this.mapHeight; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.map[y][x] = { type: 'empty', health: 0 };
      }
    }

    // Create base at bottom center
    this.map[24][12] = { type: 'base', health: 1 };
    this.map[24][13] = { type: 'base', health: 1 };
    this.map[25][12] = { type: 'base', health: 1 };
    this.map[25][13] = { type: 'base', health: 1 };

    // Protective bricks around base
    for (let x = 11; x <= 14; x++) {
      this.map[23][x] = { type: 'brick', health: 2 };
    }
    this.map[24][11] = { type: 'brick', health: 2 };
    this.map[25][11] = { type: 'brick', health: 2 };
    this.map[24][14] = { type: 'brick', health: 2 };
    this.map[25][14] = { type: 'brick', health: 2 };

    // Random obstacles based on level
    const density = 0.15 + this.level * 0.02;
    for (let y = 2; y < 22; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (Math.random() < density) {
          const rand = Math.random();
          if (rand < 0.5) {
            this.map[y][x] = { type: 'brick', health: 2 };
          } else if (rand < 0.65) {
            this.map[y][x] = { type: 'steel', health: 4 };
          } else if (rand < 0.8) {
            this.map[y][x] = { type: 'water', health: 0 };
          } else if (rand < 0.95) {
            this.map[y][x] = { type: 'forest', health: 0 };
          } else {
            this.map[y][x] = { type: 'ice', health: 0 };
          }
        }
      }
    }

    // Clear spawn areas
    this.clearArea(0, 0, 3, 3);
    this.clearArea(this.mapWidth - 3, 0, 3, 3);
    this.clearArea(Math.floor(this.mapWidth / 2) - 1, 0, 3, 3);
    this.clearArea(8, 24, 3, 2);

    // Reset player
    this.player.x = 8;
    this.player.y = 24;
    this.player.direction = 'up';
    this.player.health = 1;
    this.player.cooldown = 0;

    this.enemiesRemaining = 10 + this.level * 5;
    this.enemySpawnTimer = 0;
  }

  private clearArea(sx: number, sy: number, w: number, h: number) {
    for (let y = sy; y < sy + h && y < this.mapHeight; y++) {
      for (let x = sx; x < sx + w && x < this.mapWidth; x++) {
        if (this.map[y] && this.map[y][x]) {
          this.map[y][x] = { type: 'empty', health: 0 };
        }
      }
    }
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

    // Spawn enemies
    if (this.enemies.length < this.maxEnemies && this.enemiesRemaining > 0) {
      this.enemySpawnTimer++;
      if (this.enemySpawnTimer >= this.enemySpawnInterval) {
        this.enemySpawnTimer = 0;
        this.spawnEnemy();
      }
    }

    this.updatePlayer();
    this.updateEnemies();
    this.updateBullets();
    this.checkWinLose();
  }

  private spawnEnemy() {
    const spawnPoints = [
      { x: 0, y: 0 },
      { x: this.mapWidth - 2, y: 0 },
      { x: Math.floor(this.mapWidth / 2) - 1, y: 0 }
    ];

    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const types: Tank['type'][] = ['basic', 'fast', 'power', 'armor'];
    const type = types[Math.min(Math.floor(Math.random() * (1 + this.level * 0.5)), types.length - 1)];

    const speedMap = { basic: 0.05, fast: 0.1, power: 0.06, armor: 0.04 };
    const healthMap = { basic: 1, fast: 1, power: 1, armor: 4 };

    this.enemies.push({
      x: spawn.x,
      y: spawn.y,
      direction: 'down',
      speed: speedMap[type],
      health: healthMap[type],
      cooldown: 0,
      isPlayer: false,
      type
    });

    this.enemiesRemaining--;
  }

  private updatePlayer() {
    const p = this.player;
    p.cooldown = Math.max(0, p.cooldown - 1);

    let dx = 0, dy = 0;

    if (this.keys['ArrowUp'] || this.keys['w']) {
      dy = -p.speed;
      p.direction = 'up';
    } else if (this.keys['ArrowDown'] || this.keys['s']) {
      dy = p.speed;
      p.direction = 'down';
    } else if (this.keys['ArrowLeft'] || this.keys['a']) {
      dx = -p.speed;
      p.direction = 'left';
    } else if (this.keys['ArrowRight'] || this.keys['d']) {
      dx = p.speed;
      p.direction = 'right';
    }

    // Check collision before moving
    if (this.canMove(p.x + dx, p.y + dy, 2)) {
      // Ice sliding
      const tile = this.getTile(Math.floor(p.x + 1), Math.floor(p.y + 1));
      if (tile?.type === 'ice') {
        dx *= 1.5;
        dy *= 1.5;
      }
      p.x += dx;
      p.y += dy;
    }

    // Bounds
    p.x = Math.max(0, Math.min(this.mapWidth - 2, p.x));
    p.y = Math.max(0, Math.min(this.mapHeight - 2, p.y));

    // Shoot
    if ((this.keys[' '] || this.keys['Enter']) && p.cooldown === 0) {
      this.shoot(p);
      p.cooldown = 20;
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      e.cooldown = Math.max(0, e.cooldown - 1);

      // Simple AI: move in current direction, occasionally turn
      if (Math.random() < 0.02 || !this.canMove(
        e.x + (e.direction === 'left' ? -e.speed : e.direction === 'right' ? e.speed : 0),
        e.y + (e.direction === 'up' ? -e.speed : e.direction === 'down' ? e.speed : 0),
        2
      )) {
        const dirs: Tank['direction'][] = ['up', 'down', 'left', 'right'];
        // Bias towards player/base
        if (Math.random() < 0.3) {
          if (this.player.y > e.y) dirs.push('down', 'down');
          if (this.player.y < e.y) dirs.push('up', 'up');
          if (this.player.x > e.x) dirs.push('right');
          if (this.player.x < e.x) dirs.push('left');
        }
        e.direction = dirs[Math.floor(Math.random() * dirs.length)];
      }

      let dx = 0, dy = 0;
      switch (e.direction) {
        case 'up': dy = -e.speed; break;
        case 'down': dy = e.speed; break;
        case 'left': dx = -e.speed; break;
        case 'right': dx = e.speed; break;
      }

      if (this.canMove(e.x + dx, e.y + dy, 2)) {
        e.x += dx;
        e.y += dy;
      }

      e.x = Math.max(0, Math.min(this.mapWidth - 2, e.x));
      e.y = Math.max(0, Math.min(this.mapHeight - 2, e.y));

      // Shoot
      if (e.cooldown === 0 && Math.random() < 0.03) {
        this.shoot(e);
        e.cooldown = e.type === 'power' ? 30 : 60;
      }
    }
  }

  private shoot(tank: Tank) {
    let dx = 0, dy = 0;
    switch (tank.direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    this.bullets.push({
      x: tank.x + 0.75 + dx * 0.5,
      y: tank.y + 0.75 + dy * 0.5,
      dx, dy,
      speed: 0.3,
      isPlayer: tank.isPlayer,
      power: tank.type === 'power' ? 2 : 1
    });
  }

  private updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.dx * b.speed;
      b.y += b.dy * b.speed;

      // Out of bounds
      if (b.x < 0 || b.x >= this.mapWidth || b.y < 0 || b.y >= this.mapHeight) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit tile
      const tileX = Math.floor(b.x);
      const tileY = Math.floor(b.y);
      const tile = this.getTile(tileX, tileY);

      if (tile) {
        if (tile.type === 'brick') {
          tile.health -= b.power;
          if (tile.health <= 0) {
            this.map[tileY][tileX] = { type: 'empty', health: 0 };
          }
          this.bullets.splice(i, 1);
          continue;
        } else if (tile.type === 'steel') {
          if (b.power >= 2) {
            tile.health -= b.power;
            if (tile.health <= 0) {
              this.map[tileY][tileX] = { type: 'empty', health: 0 };
            }
          }
          this.bullets.splice(i, 1);
          continue;
        } else if (tile.type === 'base') {
          this.baseDestroyed = true;
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Hit tank
      if (b.isPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.abs(b.x - (e.x + 1)) < 1 && Math.abs(b.y - (e.y + 1)) < 1) {
            e.health -= b.power;
            this.bullets.splice(i, 1);
            if (e.health <= 0) {
              this.enemies.splice(j, 1);
              const points = { basic: 100, fast: 200, power: 300, armor: 400 };
              this.score += points[e.type];
              this.emitState();
            }
            break;
          }
        }
      } else {
        // Hit player
        if (Math.abs(b.x - (this.player.x + 1)) < 1 && Math.abs(b.y - (this.player.y + 1)) < 1) {
          this.bullets.splice(i, 1);
          this.loseLife();
        }
      }
    }
  }

  private canMove(x: number, y: number, size: number): boolean {
    // Check corners
    const checkPoints = [
      { x, y },
      { x: x + size - 0.1, y },
      { x, y: y + size - 0.1 },
      { x: x + size - 0.1, y: y + size - 0.1 }
    ];

    for (const p of checkPoints) {
      const tile = this.getTile(Math.floor(p.x), Math.floor(p.y));
      if (tile && (tile.type === 'brick' || tile.type === 'steel' || tile.type === 'water' || tile.type === 'base')) {
        return false;
      }
    }

    return true;
  }

  private getTile(x: number, y: number): Tile | null {
    if (y >= 0 && y < this.mapHeight && x >= 0 && x < this.mapWidth) {
      return this.map[y][x];
    }
    return null;
  }

  private checkWinLose() {
    if (this.baseDestroyed) {
      this.status = 'lost';
      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.emitState();
      return;
    }

    if (this.enemies.length === 0 && this.enemiesRemaining === 0) {
      this.level++;
      if (this.level > 10) {
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
      this.player.x = 8;
      this.player.y = 24;
      this.player.direction = 'up';
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tileW = w / this.mapWidth;
    const tileH = h / this.mapHeight;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Draw map
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.map[y][x];
        const px = x * tileW;
        const py = y * tileH;

        switch (tile.type) {
          case 'brick':
            ctx.fillStyle = '#b5651d';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, tileW / 2, tileH / 2);
            ctx.strokeRect(px + tileW / 2, py + tileH / 2, tileW / 2, tileH / 2);
            break;
          case 'steel':
            ctx.fillStyle = '#708090';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(px + 2, py + 2, tileW - 4, tileH - 4);
            break;
          case 'water':
            ctx.fillStyle = '#1e90ff';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.fillStyle = '#87ceeb';
            const wave = Math.sin(this.frameCount * 0.1 + x) * 2;
            ctx.fillRect(px, py + tileH / 2 + wave, tileW, 2);
            break;
          case 'forest':
            ctx.fillStyle = '#228b22';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.fillStyle = '#006400';
            ctx.beginPath();
            ctx.arc(px + tileW / 2, py + tileH / 2, tileW / 3, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'ice':
            ctx.fillStyle = '#add8e6';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(px + 2, py + 2, tileW / 3, tileH / 3);
            ctx.globalAlpha = 1;
            break;
          case 'base':
            ctx.fillStyle = this.baseDestroyed ? '#555' : '#ffd700';
            ctx.fillRect(px, py, tileW, tileH);
            if (!this.baseDestroyed) {
              ctx.fillStyle = '#000';
              ctx.font = `${tileH * 0.6}px Arial`;
              ctx.fillText('E', px + tileW * 0.25, py + tileH * 0.75);
            }
            break;
        }
      }
    }

    // Draw tanks
    this.drawTank(this.player, tileW, tileH);
    for (const e of this.enemies) {
      this.drawTank(e, tileW, tileH);
    }

    // Draw bullets
    ctx.fillStyle = '#fff';
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x * tileW, b.y * tileH, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Forest overlay (tanks go under)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.map[y][x].type === 'forest') {
          const px = x * tileW;
          const py = y * tileH;
          ctx.fillStyle = '#228b22';
          ctx.globalAlpha = 0.7;
          ctx.fillRect(px, py, tileW, tileH);
          ctx.globalAlpha = 1;
        }
      }
    }

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`Enemies: ${this.enemiesRemaining + this.enemies.length}`, 5, 15);
  }

  private drawTank(tank: Tank, tileW: number, tileH: number) {
    const ctx = this.ctx;
    const cx = (tank.x + 1) * tileW;
    const cy = (tank.y + 1) * tileH;
    const size = tileW * 0.8;

    ctx.save();
    ctx.translate(cx, cy);

    // Rotate based on direction
    switch (tank.direction) {
      case 'up': break;
      case 'down': ctx.rotate(Math.PI); break;
      case 'left': ctx.rotate(-Math.PI / 2); break;
      case 'right': ctx.rotate(Math.PI / 2); break;
    }

    // Tank body
    const colors = {
      player: { body: '#27ae60', turret: '#2ecc71' },
      basic: { body: '#7f8c8d', turret: '#95a5a6' },
      fast: { body: '#9b59b6', turret: '#8e44ad' },
      power: { body: '#e74c3c', turret: '#c0392b' },
      armor: { body: '#34495e', turret: '#2c3e50' }
    };

    const color = tank.isPlayer ? colors.player : colors[tank.type];

    // Tracks
    ctx.fillStyle = '#333';
    ctx.fillRect(-size / 2, -size / 2, size / 4, size);
    ctx.fillRect(size / 4, -size / 2, size / 4, size);

    // Body
    ctx.fillStyle = color.body;
    ctx.fillRect(-size / 3, -size / 2.5, size / 1.5, size / 1.25);

    // Turret
    ctx.fillStyle = color.turret;
    ctx.beginPath();
    ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
    ctx.fill();

    // Cannon
    ctx.fillStyle = color.body;
    ctx.fillRect(-size / 12, -size / 2, size / 6, size / 2);

    ctx.restore();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    if (type === 'down' || type === 'move') {
      this.keys['ArrowLeft'] = x < centerX - 50 && Math.abs(y - centerY) < 100;
      this.keys['ArrowRight'] = x > centerX + 50 && Math.abs(y - centerY) < 100;
      this.keys['ArrowUp'] = y < centerY - 50 && Math.abs(x - centerX) < 100;
      this.keys['ArrowDown'] = y > centerY + 50 && Math.abs(x - centerX) < 100;
    } else {
      this.keys['ArrowLeft'] = false;
      this.keys['ArrowRight'] = false;
      this.keys['ArrowUp'] = false;
      this.keys['ArrowDown'] = false;
    }

    // Tap center to shoot
    if (type === 'down' && Math.abs(x - centerX) < 50 && Math.abs(y - centerY) < 50) {
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
