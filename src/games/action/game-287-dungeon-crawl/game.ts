/**
 * Dungeon Crawl Game Engine
 * Game #287
 *
 * Explore dungeons, defeat monsters, collect treasure!
 */

interface Point {
  x: number;
  y: number;
}

interface Entity extends Point {
  hp: number;
  maxHp: number;
  atk: number;
}

interface Enemy extends Entity {
  type: 'slime' | 'goblin' | 'skeleton' | 'boss';
  color: string;
  speed: number;
}

interface Chest extends Point {
  gold: number;
  opened: boolean;
}

interface GameState {
  gold: number;
  highScore: number;
  floor: number;
  hp: number;
  maxHp: number;
  atk: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;
type MessageCallback = (msg: string) => void;

const TILE_SIZE = 32;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 12;

export class DungeonCrawlGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Entity & { facing: string };
  private enemies: Enemy[] = [];
  private chests: Chest[] = [];
  private map: number[][] = [];
  private exit: Point = { x: 0, y: 0 };

  private gold = 0;
  private highScore = 0;
  private floor = 1;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';

  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private onMessage: MessageCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private attackCooldown = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.loadHighScore();
    this.setupControls();
  }

  private createPlayer(): Entity & { facing: string } {
    return {
      x: 1,
      y: 1,
      hp: 100,
      maxHp: 100,
      atk: 15,
      facing: 'right',
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('dungeon_crawl_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('dungeon_crawl_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }
  setOnMessage(cb: MessageCallback) { this.onMessage = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        gold: this.gold,
        highScore: this.highScore,
        floor: this.floor,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        atk: this.player.atk,
        status: this.status,
      });
    }
  }

  private showMessage(msg: string) {
    if (this.onMessage) this.onMessage(msg);
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, MAP_WIDTH * TILE_SIZE);
    this.canvas.width = size;
    this.canvas.height = (size / MAP_WIDTH) * MAP_HEIGHT;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  start() {
    this.gold = 0;
    this.floor = 1;
    this.player = this.createPlayer();
    this.generateMap();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextFloor() {
    this.floor++;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.player.atk += 2;
    this.generateMap();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
  }

  private generateMap() {
    // Simple dungeon generation
    this.map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.map[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        // Walls on edges
        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
          this.map[y][x] = 1;
        } else if (Math.random() < 0.15) {
          this.map[y][x] = 1; // Random walls
        } else {
          this.map[y][x] = 0; // Floor
        }
      }
    }

    // Ensure player start is clear
    this.player.x = 1;
    this.player.y = 1;
    this.map[1][1] = 0;
    this.map[1][2] = 0;
    this.map[2][1] = 0;

    // Place exit
    this.exit = { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 };
    this.map[this.exit.y][this.exit.x] = 0;
    this.map[this.exit.y - 1][this.exit.x] = 0;
    this.map[this.exit.y][this.exit.x - 1] = 0;

    // Spawn enemies
    this.enemies = [];
    const enemyCount = 3 + this.floor;
    for (let i = 0; i < enemyCount; i++) {
      this.spawnEnemy();
    }

    // Spawn chests
    this.chests = [];
    const chestCount = 2 + Math.floor(this.floor / 2);
    for (let i = 0; i < chestCount; i++) {
      this.spawnChest();
    }
  }

  private spawnEnemy() {
    const types: Array<'slime' | 'goblin' | 'skeleton' | 'boss'> = ['slime', 'goblin', 'skeleton'];
    if (this.floor >= 3 && Math.random() < 0.1) types.push('boss');

    const type = types[Math.floor(Math.random() * types.length)];
    const configs = {
      slime: { hp: 20, atk: 5, color: '#27ae60', speed: 0.5 },
      goblin: { hp: 35, atk: 8, color: '#f39c12', speed: 0.8 },
      skeleton: { hp: 50, atk: 12, color: '#bdc3c7', speed: 0.6 },
      boss: { hp: 100, atk: 20, color: '#8e44ad', speed: 0.4 },
    };
    const config = configs[type];

    let x, y;
    do {
      x = 2 + Math.floor(Math.random() * (MAP_WIDTH - 4));
      y = 2 + Math.floor(Math.random() * (MAP_HEIGHT - 4));
    } while (this.map[y][x] !== 0 || (x < 3 && y < 3));

    this.enemies.push({
      x,
      y,
      hp: config.hp + this.floor * 5,
      maxHp: config.hp + this.floor * 5,
      atk: config.atk + this.floor * 2,
      type,
      color: config.color,
      speed: config.speed,
    });
  }

  private spawnChest() {
    let x, y;
    do {
      x = 1 + Math.floor(Math.random() * (MAP_WIDTH - 2));
      y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - 2));
    } while (this.map[y][x] !== 0 || (x < 3 && y < 3));

    this.chests.push({
      x,
      y,
      gold: 50 + Math.floor(Math.random() * 50) + this.floor * 10,
      opened: false,
    });
  }

  handleMove(dx: number, dy: number) {
    if (this.status !== 'playing') return;

    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    if (dx > 0) this.player.facing = 'right';
    else if (dx < 0) this.player.facing = 'left';

    // Check bounds and walls
    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
    if (this.map[newY][newX] === 1) return;

    this.player.x = newX;
    this.player.y = newY;

    // Check chest collision
    for (const chest of this.chests) {
      if (!chest.opened && chest.x === newX && chest.y === newY) {
        chest.opened = true;
        this.gold += chest.gold;
        if (this.gold > this.highScore) {
          this.highScore = this.gold;
          this.saveHighScore();
        }
        this.showMessage(`+${chest.gold} Gold!`);
        this.emitState();
      }
    }

    // Check exit
    if (newX === this.exit.x && newY === this.exit.y && this.enemies.length === 0) {
      this.status = 'cleared';
      this.emitState();
    }
  }

  private gameLoop() {
    if (this.status !== 'playing') {
      this.animationId = null;
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 2);
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Handle movement
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) this.handleMove(0, -1);
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) this.handleMove(0, 1);
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) this.handleMove(-1, 0);
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) this.handleMove(1, 0);

    // Clear keys after processing
    this.keys.clear();

    // Attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Enemy AI and combat
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Move toward player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1.5) {
        // Move
        if (Math.random() < enemy.speed * 0.1) {
          const moveX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
          const moveY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
          const newX = enemy.x + (Math.abs(dx) > Math.abs(dy) ? moveX : 0);
          const newY = enemy.y + (Math.abs(dy) >= Math.abs(dx) ? moveY : 0);

          if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT && this.map[newY][newX] === 0) {
            enemy.x = newX;
            enemy.y = newY;
          }
        }
      } else if (dist <= 1.5) {
        // Combat
        if (this.attackCooldown <= 0) {
          // Player attacks
          enemy.hp -= this.player.atk;
          this.attackCooldown = 30;

          if (enemy.hp <= 0) {
            this.gold += 20 + (enemy.type === 'boss' ? 100 : 0);
            if (this.gold > this.highScore) {
              this.highScore = this.gold;
              this.saveHighScore();
            }
            this.enemies.splice(i, 1);
            this.emitState();
            continue;
          }
        }

        // Enemy attacks
        if (Math.random() < 0.05) {
          this.player.hp -= enemy.atk;
          this.emitState();

          if (this.player.hp <= 0) {
            this.status = 'over';
            this.emitState();
            return;
          }
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tileW = w / MAP_WIDTH;
    const tileH = h / MAP_HEIGHT;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw map
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const px = x * tileW;
        const py = y * tileH;

        if (this.map[y][x] === 1) {
          ctx.fillStyle = '#4a4a6a';
          ctx.fillRect(px, py, tileW, tileH);
          ctx.strokeStyle = '#2a2a4a';
          ctx.strokeRect(px, py, tileW, tileH);
        } else {
          ctx.fillStyle = '#2a2a4a';
          ctx.fillRect(px, py, tileW, tileH);
        }
      }
    }

    // Draw exit
    if (this.enemies.length === 0) {
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(this.exit.x * tileW, this.exit.y * tileH, tileW, tileH);
      ctx.fillStyle = '#fff';
      ctx.font = `${tileH * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('▼', (this.exit.x + 0.5) * tileW, (this.exit.y + 0.7) * tileH);
    }

    // Draw chests
    for (const chest of this.chests) {
      if (!chest.opened) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(chest.x * tileW + 4, chest.y * tileH + 4, tileW - 8, tileH - 8);
        ctx.fillStyle = '#d35400';
        ctx.fillRect(chest.x * tileW + tileW / 2 - 3, chest.y * tileH + tileH / 2 - 3, 6, 6);
      }
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      const px = enemy.x * tileW;
      const py = enemy.y * tileH;

      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(px + tileW / 2, py + tileH / 2, tileW * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      const hpPercent = enemy.hp / enemy.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(px + 2, py - 6, tileW - 4, 4);
      ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(px + 2, py - 6, (tileW - 4) * hpPercent, 4);

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px + tileW * 0.35, py + tileH * 0.4, 3, 0, Math.PI * 2);
      ctx.arc(px + tileW * 0.65, py + tileH * 0.4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw player
    const ppx = this.player.x * tileW;
    const ppy = this.player.y * tileH;

    ctx.save();
    if (this.player.facing === 'left') {
      ctx.translate(ppx + tileW, 0);
      ctx.scale(-1, 1);
      ctx.translate(-ppx, 0);
    }

    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(ppx + 6, ppy + tileH * 0.3, tileW - 12, tileH * 0.5);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(ppx + tileW / 2, ppy + tileH * 0.25, tileW * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Sword
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(ppx + tileW * 0.7, ppy + tileH * 0.3, 4, tileH * 0.4);

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
