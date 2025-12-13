/**
 * Bomberman Game
 * Game #159 - Grid Bomb
 * Classic maze bomber: place bombs to destroy walls and enemies
 */

interface Player {
  x: number;
  y: number;
  bombCount: number;
  maxBombs: number;
  bombPower: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  type: 'basic' | 'fast' | 'smart';
}

interface Bomb {
  x: number;
  y: number;
  timer: number;
  power: number;
}

interface Explosion {
  x: number;
  y: number;
  timer: number;
  directions: { dx: number; dy: number; length: number }[];
}

interface PowerUp {
  x: number;
  y: number;
  type: 'bomb' | 'power' | 'speed';
}

type TileType = 'empty' | 'wall' | 'brick' | 'bomb' | 'explosion';

export class BombermanGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private gridWidth = 15;
  private gridHeight = 13;
  private map: TileType[][] = [];

  private player: Player = {
    x: 1, y: 1, bombCount: 0, maxBombs: 1, bombPower: 1, speed: 0.08
  };

  private enemies: Enemy[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUp[] = [];

  private keys: Record<string, boolean> = {};
  private moveDir: { x: number; y: number } = { x: 0, y: 0 };

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
    this.bombs = [];
    this.explosions = [];
    this.powerUps = [];
    this.enemies = [];

    // Initialize map
    for (let y = 0; y < this.gridHeight; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Border walls
        if (x === 0 || x === this.gridWidth - 1 || y === 0 || y === this.gridHeight - 1) {
          this.map[y][x] = 'wall';
        }
        // Grid walls (every other cell)
        else if (x % 2 === 0 && y % 2 === 0) {
          this.map[y][x] = 'wall';
        }
        // Random bricks
        else if (Math.random() < 0.4 + this.level * 0.03) {
          this.map[y][x] = 'brick';
        } else {
          this.map[y][x] = 'empty';
        }
      }
    }

    // Clear player spawn area
    this.map[1][1] = 'empty';
    this.map[1][2] = 'empty';
    this.map[2][1] = 'empty';

    // Clear enemy spawn areas
    this.map[this.gridHeight - 2][this.gridWidth - 2] = 'empty';
    this.map[this.gridHeight - 2][this.gridWidth - 3] = 'empty';
    this.map[this.gridHeight - 3][this.gridWidth - 2] = 'empty';

    // Reset player
    this.player.x = 1;
    this.player.y = 1;
    this.player.bombCount = 0;

    // Spawn enemies
    const enemyCount = 2 + this.level;
    for (let i = 0; i < enemyCount; i++) {
      const types: Enemy['type'][] = ['basic', 'basic', 'fast', 'smart'];
      const type = types[Math.min(Math.floor(Math.random() * (1 + this.level * 0.5)), types.length - 1)];
      const speedMap = { basic: 0.03, fast: 0.06, smart: 0.04 };

      // Find empty spot
      let ex, ey;
      do {
        ex = Math.floor(Math.random() * (this.gridWidth - 4)) + 2;
        ey = Math.floor(Math.random() * (this.gridHeight - 4)) + 2;
      } while (
        this.map[ey][ex] !== 'empty' ||
        (Math.abs(ex - 1) < 3 && Math.abs(ey - 1) < 3)
      );

      this.enemies.push({
        x: ex,
        y: ey,
        direction: 'down',
        speed: speedMap[type],
        type
      });
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

    this.updatePlayer();
    this.updateEnemies();
    this.updateBombs();
    this.updateExplosions();
    this.checkCollisions();
    this.checkWin();
  }

  private updatePlayer() {
    const p = this.player;

    // Calculate movement direction
    let dx = 0, dy = 0;
    if (this.keys['ArrowUp'] || this.keys['w']) dy = -p.speed;
    else if (this.keys['ArrowDown'] || this.keys['s']) dy = p.speed;
    else if (this.keys['ArrowLeft'] || this.keys['a']) dx = -p.speed;
    else if (this.keys['ArrowRight'] || this.keys['d']) dx = p.speed;

    // Touch movement
    if (this.moveDir.x !== 0 || this.moveDir.y !== 0) {
      if (Math.abs(this.moveDir.x) > Math.abs(this.moveDir.y)) {
        dx = this.moveDir.x > 0 ? p.speed : -p.speed;
      } else {
        dy = this.moveDir.y > 0 ? p.speed : -p.speed;
      }
    }

    // Try to move
    const newX = p.x + dx;
    const newY = p.y + dy;

    if (this.canMove(newX, p.y)) p.x = newX;
    if (this.canMove(p.x, newY)) p.y = newY;

    // Place bomb
    if ((this.keys[' '] || this.keys['Enter']) && p.bombCount < p.maxBombs) {
      const bx = Math.round(p.x);
      const by = Math.round(p.y);

      if (!this.bombs.some(b => b.x === bx && b.y === by)) {
        this.bombs.push({ x: bx, y: by, timer: 180, power: p.bombPower });
        p.bombCount++;
        this.keys[' '] = false;
        this.keys['Enter'] = false;
      }
    }

    // Pick up power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (Math.abs(p.x - pu.x) < 0.5 && Math.abs(p.y - pu.y) < 0.5) {
        switch (pu.type) {
          case 'bomb': p.maxBombs++; break;
          case 'power': p.bombPower++; break;
          case 'speed': p.speed = Math.min(0.15, p.speed + 0.02); break;
        }
        this.powerUps.splice(i, 1);
        this.score += 50;
        this.emitState();
      }
    }
  }

  private canMove(x: number, y: number): boolean {
    // Check corners
    const margin = 0.3;
    const corners = [
      { x: x - margin, y: y - margin },
      { x: x + margin, y: y - margin },
      { x: x - margin, y: y + margin },
      { x: x + margin, y: y + margin }
    ];

    for (const c of corners) {
      const tileX = Math.floor(c.x + 0.5);
      const tileY = Math.floor(c.y + 0.5);

      if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) {
        return false;
      }

      const tile = this.map[tileY][tileX];
      if (tile === 'wall' || tile === 'brick') {
        return false;
      }

      // Can't walk through bombs (except the one you just placed)
      if (this.bombs.some(b => b.x === tileX && b.y === tileY)) {
        const px = Math.round(this.player.x);
        const py = Math.round(this.player.y);
        if (px !== tileX || py !== tileY) {
          return false;
        }
      }
    }

    return true;
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      // Move in current direction
      let dx = 0, dy = 0;
      switch (e.direction) {
        case 'up': dy = -e.speed; break;
        case 'down': dy = e.speed; break;
        case 'left': dx = -e.speed; break;
        case 'right': dx = e.speed; break;
      }

      const newX = e.x + dx;
      const newY = e.y + dy;

      // Check if can move
      if (this.canEnemyMove(newX, newY)) {
        e.x = newX;
        e.y = newY;
      } else {
        // Change direction
        const dirs: Enemy['direction'][] = ['up', 'down', 'left', 'right'];

        // Smart enemies try to move towards player
        if (e.type === 'smart') {
          const pdx = this.player.x - e.x;
          const pdy = this.player.y - e.y;
          if (Math.abs(pdx) > Math.abs(pdy)) {
            dirs.unshift(pdx > 0 ? 'right' : 'left');
          } else {
            dirs.unshift(pdy > 0 ? 'down' : 'up');
          }
        }

        // Shuffle remaining directions
        for (let i = dirs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        e.direction = dirs[0];
      }
    }
  }

  private canEnemyMove(x: number, y: number): boolean {
    const margin = 0.3;
    const corners = [
      { x: x - margin, y: y - margin },
      { x: x + margin, y: y - margin },
      { x: x - margin, y: y + margin },
      { x: x + margin, y: y + margin }
    ];

    for (const c of corners) {
      const tileX = Math.floor(c.x + 0.5);
      const tileY = Math.floor(c.y + 0.5);

      if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) {
        return false;
      }

      const tile = this.map[tileY][tileX];
      if (tile === 'wall' || tile === 'brick') {
        return false;
      }

      if (this.bombs.some(b => b.x === tileX && b.y === tileY)) {
        return false;
      }
    }

    return true;
  }

  private updateBombs() {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.timer--;

      if (b.timer <= 0) {
        this.explodeBomb(b);
        this.bombs.splice(i, 1);
        this.player.bombCount--;
      }
    }
  }

  private explodeBomb(bomb: Bomb) {
    const directions = [
      { dx: 0, dy: -1, length: 0 },
      { dx: 0, dy: 1, length: 0 },
      { dx: -1, dy: 0, length: 0 },
      { dx: 1, dy: 0, length: 0 }
    ];

    // Calculate explosion reach in each direction
    for (const dir of directions) {
      for (let i = 1; i <= bomb.power; i++) {
        const tx = bomb.x + dir.dx * i;
        const ty = bomb.y + dir.dy * i;

        if (tx < 0 || tx >= this.gridWidth || ty < 0 || ty >= this.gridHeight) break;

        const tile = this.map[ty][tx];
        if (tile === 'wall') break;

        dir.length = i;

        if (tile === 'brick') {
          this.map[ty][tx] = 'empty';
          // Chance to spawn power-up
          if (Math.random() < 0.3) {
            const types: PowerUp['type'][] = ['bomb', 'power', 'speed'];
            this.powerUps.push({
              x: tx,
              y: ty,
              type: types[Math.floor(Math.random() * types.length)]
            });
          }
          break;
        }

        // Chain explosion
        const chainBomb = this.bombs.find(b => b.x === tx && b.y === ty);
        if (chainBomb) {
          chainBomb.timer = 1;
        }
      }
    }

    this.explosions.push({
      x: bomb.x,
      y: bomb.y,
      timer: 30,
      directions
    });
  }

  private updateExplosions() {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].timer--;
      if (this.explosions[i].timer <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    // Check player vs explosion
    for (const exp of this.explosions) {
      if (this.isInExplosion(this.player.x, this.player.y, exp)) {
        this.loseLife();
        return;
      }
    }

    // Check player vs enemy
    for (const e of this.enemies) {
      if (Math.abs(this.player.x - e.x) < 0.6 && Math.abs(this.player.y - e.y) < 0.6) {
        this.loseLife();
        return;
      }
    }

    // Check enemies vs explosion
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      for (const exp of this.explosions) {
        if (this.isInExplosion(e.x, e.y, exp)) {
          this.enemies.splice(i, 1);
          const points = { basic: 100, fast: 200, smart: 300 };
          this.score += points[e.type];
          this.emitState();
          break;
        }
      }
    }
  }

  private isInExplosion(x: number, y: number, exp: Explosion): boolean {
    // Center
    if (Math.abs(x - exp.x) < 0.5 && Math.abs(y - exp.y) < 0.5) return true;

    // Arms
    for (const dir of exp.directions) {
      for (let i = 1; i <= dir.length; i++) {
        const ex = exp.x + dir.dx * i;
        const ey = exp.y + dir.dy * i;
        if (Math.abs(x - ex) < 0.5 && Math.abs(y - ey) < 0.5) return true;
      }
    }

    return false;
  }

  private checkWin() {
    if (this.enemies.length === 0) {
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
      this.player.x = 1;
      this.player.y = 1;
      this.bombs = [];
      this.explosions = [];
      this.player.bombCount = 0;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tileW = w / this.gridWidth;
    const tileH = h / this.gridHeight;

    // Background
    ctx.fillStyle = '#3d8b40';
    ctx.fillRect(0, 0, w, h);

    // Draw map
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const tile = this.map[y][x];
        const px = x * tileW;
        const py = y * tileH;

        switch (tile) {
          case 'wall':
            ctx.fillStyle = '#555';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.fillStyle = '#777';
            ctx.fillRect(px + 2, py + 2, tileW - 4, tileH - 4);
            break;
          case 'brick':
            ctx.fillStyle = '#b5651d';
            ctx.fillRect(px, py, tileW, tileH);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 2, py + 2, tileW / 2 - 2, tileH / 2 - 2);
            ctx.strokeRect(px + tileW / 2, py + tileH / 2, tileW / 2 - 2, tileH / 2 - 2);
            break;
        }
      }
    }

    // Draw power-ups
    for (const pu of this.powerUps) {
      const px = pu.x * tileW + tileW / 2;
      const py = pu.y * tileH + tileH / 2;
      const size = tileW * 0.3;

      ctx.fillStyle = pu.type === 'bomb' ? '#f39c12' :
        pu.type === 'power' ? '#e74c3c' : '#3498db';

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        pu.type === 'bomb' ? 'B' : pu.type === 'power' ? 'P' : 'S',
        px, py
      );
    }

    // Draw bombs
    for (const b of this.bombs) {
      const px = b.x * tileW + tileW / 2;
      const py = b.y * tileH + tileH / 2;
      const pulse = 1 + Math.sin(this.frameCount * 0.3) * 0.1;
      const size = tileW * 0.35 * pulse;

      // Bomb body
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();

      // Fuse
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.quadraticCurveTo(px + size / 2, py - size * 1.5, px + size / 2, py - size * 1.3);
      ctx.stroke();

      // Spark
      if (this.frameCount % 10 < 5) {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(px + size / 2, py - size * 1.3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw explosions
    for (const exp of this.explosions) {
      const alpha = exp.timer / 30;
      ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;

      // Center
      ctx.beginPath();
      ctx.arc(exp.x * tileW + tileW / 2, exp.y * tileH + tileH / 2, tileW * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      for (const dir of exp.directions) {
        for (let i = 1; i <= dir.length; i++) {
          const ex = (exp.x + dir.dx * i) * tileW + tileW / 2;
          const ey = (exp.y + dir.dy * i) * tileH + tileH / 2;
          ctx.beginPath();
          ctx.arc(ex, ey, tileW * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw enemies
    for (const e of this.enemies) {
      this.drawEnemy(e, tileW, tileH);
    }

    // Draw player
    this.drawPlayer(tileW, tileH);
  }

  private drawPlayer(tileW: number, tileH: number) {
    const ctx = this.ctx;
    const px = this.player.x * tileW + tileW / 2;
    const py = this.player.y * tileH + tileH / 2;
    const size = tileW * 0.35;

    // Body
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py - size * 0.3, size, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#ffe4c4';
    ctx.beginPath();
    ctx.arc(px, py - size * 0.5, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - size * 0.2, py - size * 0.6, 2, 0, Math.PI * 2);
    ctx.arc(px + size * 0.2, py - size * 0.6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py - size * 0.7, size * 0.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // Antenna
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py - size * 1.2);
    ctx.lineTo(px, py - size * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(px, py - size * 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEnemy(e: Enemy, tileW: number, tileH: number) {
    const ctx = this.ctx;
    const px = e.x * tileW + tileW / 2;
    const py = e.y * tileH + tileH / 2;
    const size = tileW * 0.35;

    const colors = { basic: '#9b59b6', fast: '#e74c3c', smart: '#3498db' };

    // Body (blob-like)
    ctx.fillStyle = colors[e.type];
    ctx.beginPath();
    ctx.ellipse(px, py, size, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom wave
    ctx.beginPath();
    const wave = Math.sin(this.frameCount * 0.2) * 3;
    ctx.moveTo(px - size, py + size * 0.3);
    for (let i = 0; i <= 4; i++) {
      const x = px - size + (size * 2 * i) / 4;
      const y = py + size * 0.3 + (i % 2 === 0 ? wave : -wave);
      ctx.lineTo(x, y);
    }
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - size * 0.3, py - size * 0.1, size * 0.25, 0, Math.PI * 2);
    ctx.arc(px + size * 0.3, py - size * 0.1, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - size * 0.25, py - size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.arc(px + size * 0.35, py - size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  handleInput(type: 'down' | 'move' | 'up', x: number, y: number) {
    if (this.status !== 'playing') return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    if (type === 'down') {
      // Check if tap is in center (bomb)
      if (Math.abs(x - centerX) < 50 && Math.abs(y - centerY) < 50) {
        this.keys[' '] = true;
        setTimeout(() => { this.keys[' '] = false; }, 100);
      } else {
        this.moveDir = { x: x - centerX, y: y - centerY };
      }
    } else if (type === 'move') {
      this.moveDir = { x: x - centerX, y: y - centerY };
    } else {
      this.moveDir = { x: 0, y: 0 };
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
      this.canvas.height = size * (this.gridHeight / this.gridWidth);
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
    this.moveDir = { x: 0, y: 0 };
    this.player.maxBombs = 1;
    this.player.bombPower = 1;
    this.player.speed = 0.08;
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
