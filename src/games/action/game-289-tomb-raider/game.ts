/**
 * Tomb Raider Lite Game Engine
 * Game #289
 *
 * Explore tombs, collect treasures, avoid traps!
 */

interface Point {
  x: number;
  y: number;
}

interface Player extends Point {
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  keys: number;
  facing: 'left' | 'right';
  grounded: boolean;
}

interface Treasure extends Point {
  value: number;
  collected: boolean;
}

interface Trap extends Point {
  type: 'spike' | 'boulder' | 'dart';
  active: boolean;
  timer: number;
}

interface Key extends Point {
  collected: boolean;
}

interface Door extends Point {
  locked: boolean;
}

interface GameState {
  score: number;
  highScore: number;
  room: number;
  hp: number;
  maxHp: number;
  keys: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;
type MessageCallback = (msg: string) => void;

const TILE_SIZE = 32;
const MAP_WIDTH = 16;
const MAP_HEIGHT = 12;
const GRAVITY = 0.5;

export class TombRaiderGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private map: number[][] = [];
  private treasures: Treasure[] = [];
  private traps: Trap[] = [];
  private keyItems: Key[] = [];
  private door: Door | null = null;

  private score = 0;
  private highScore = 0;
  private room = 1;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';

  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private onMessage: MessageCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private invincible = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
    this.loadHighScore();
    this.setupControls();
  }

  private createPlayer(): Player {
    return {
      x: 48,
      y: 320,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      keys: 0,
      facing: 'right',
      grounded: false,
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem('tomb_raider_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('tomb_raider_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }
  setOnMessage(cb: MessageCallback) { this.onMessage = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        room: this.room,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        keys: this.player.keys,
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
    this.canvas.width = Math.min(rect.width, MAP_WIDTH * TILE_SIZE);
    this.canvas.height = (this.canvas.width / MAP_WIDTH) * MAP_HEIGHT;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        this.interact();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  start() {
    this.score = 0;
    this.room = 1;
    this.player = this.createPlayer();
    this.generateRoom();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextRoom() {
    this.room++;
    this.player.x = 48;
    this.player.y = 320;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.generateRoom();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) {
      this.lastTime = performance.now();
      this.gameLoop();
    }
  }

  private generateRoom() {
    // Generate simple room layout
    this.map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.map[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1) {
          this.map[y][x] = 1; // Wall
        } else if (y === MAP_HEIGHT - 2) {
          this.map[y][x] = 1; // Floor
        } else {
          this.map[y][x] = 0; // Air
        }
      }
    }

    // Add platforms
    const platforms = 3 + this.room;
    for (let i = 0; i < platforms; i++) {
      const px = 2 + Math.floor(Math.random() * (MAP_WIDTH - 6));
      const py = 3 + Math.floor(Math.random() * (MAP_HEIGHT - 6));
      const len = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < len && px + j < MAP_WIDTH - 1; j++) {
        this.map[py][px + j] = 1;
      }
    }

    // Add treasures
    this.treasures = [];
    const treasureCount = 3 + this.room;
    for (let i = 0; i < treasureCount; i++) {
      let tx, ty;
      do {
        tx = 2 + Math.floor(Math.random() * (MAP_WIDTH - 4));
        ty = 2 + Math.floor(Math.random() * (MAP_HEIGHT - 4));
      } while (this.map[ty][tx] !== 0 || this.map[ty + 1][tx] !== 1);
      this.treasures.push({ x: tx, y: ty, value: 50 + this.room * 10, collected: false });
    }

    // Add traps
    this.traps = [];
    const trapCount = 1 + Math.floor(this.room / 2);
    for (let i = 0; i < trapCount; i++) {
      let tx, ty;
      do {
        tx = 3 + Math.floor(Math.random() * (MAP_WIDTH - 6));
        ty = MAP_HEIGHT - 3;
      } while (this.map[ty][tx] !== 0);
      this.traps.push({ x: tx, y: ty, type: 'spike', active: true, timer: 0 });
    }

    // Add key and door
    this.keyItems = [{
      x: MAP_WIDTH - 4,
      y: MAP_HEIGHT - 3,
      collected: false,
    }];
    this.door = {
      x: MAP_WIDTH - 2,
      y: MAP_HEIGHT - 3,
      locked: true,
    };
    this.map[MAP_HEIGHT - 3][MAP_WIDTH - 2] = 0; // Clear door tile
  }

  private interact() {
    if (this.status !== 'playing') return;

    // Check door
    if (this.door && !this.door.locked) {
      const dx = Math.abs(this.player.x / TILE_SIZE - this.door.x);
      const dy = Math.abs(this.player.y / TILE_SIZE - this.door.y);
      if (dx < 1.5 && dy < 1.5) {
        this.status = 'cleared';
        this.emitState();
      }
    }
  }

  handleMove(dir: string) {
    if (dir === 'left') this.keys.add('ArrowLeft');
    if (dir === 'right') this.keys.add('ArrowRight');
    if (dir === 'jump' && this.player.grounded) {
      this.player.vy = -12;
      this.player.grounded = false;
    }
  }

  releaseMove(dir: string) {
    if (dir === 'left') this.keys.delete('ArrowLeft');
    if (dir === 'right') this.keys.delete('ArrowRight');
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
    // Movement
    const speed = 4;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.player.vx = -speed;
      this.player.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.player.vx = speed;
      this.player.facing = 'right';
    } else {
      this.player.vx *= 0.8;
    }

    if ((this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.keys.has('Space')) && this.player.grounded) {
      this.player.vy = -12;
      this.player.grounded = false;
    }

    // Physics
    this.player.vy += GRAVITY * dt;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Collision detection
    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);

    // Ground collision
    if (this.player.y >= (MAP_HEIGHT - 2) * TILE_SIZE - 32) {
      this.player.y = (MAP_HEIGHT - 2) * TILE_SIZE - 32;
      this.player.vy = 0;
      this.player.grounded = true;
    }

    // Platform collision
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.map[y][x] === 1) {
          const tileTop = y * TILE_SIZE;
          const tileLeft = x * TILE_SIZE;
          const tileRight = tileLeft + TILE_SIZE;

          // Check if player is landing on platform
          if (this.player.vy > 0 &&
              this.player.x + 16 > tileLeft &&
              this.player.x + 16 < tileRight &&
              this.player.y + 32 > tileTop &&
              this.player.y + 32 < tileTop + 16) {
            this.player.y = tileTop - 32;
            this.player.vy = 0;
            this.player.grounded = true;
          }
        }
      }
    }

    // Bounds
    this.player.x = Math.max(TILE_SIZE, Math.min((MAP_WIDTH - 1) * TILE_SIZE - 32, this.player.x));

    // Invincibility
    if (this.invincible > 0) this.invincible -= dt;

    // Collect treasures
    for (const treasure of this.treasures) {
      if (!treasure.collected) {
        const dx = Math.abs(this.player.x / TILE_SIZE - treasure.x);
        const dy = Math.abs(this.player.y / TILE_SIZE - treasure.y);
        if (dx < 1 && dy < 1) {
          treasure.collected = true;
          this.score += treasure.value;
          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }
          this.showMessage(`+${treasure.value}`);
          this.emitState();
        }
      }
    }

    // Collect keys
    for (const key of this.keyItems) {
      if (!key.collected) {
        const dx = Math.abs(this.player.x / TILE_SIZE - key.x);
        const dy = Math.abs(this.player.y / TILE_SIZE - key.y);
        if (dx < 1 && dy < 1) {
          key.collected = true;
          this.player.keys++;
          if (this.door) this.door.locked = false;
          this.showMessage('Key found!');
          this.emitState();
        }
      }
    }

    // Trap collision
    for (const trap of this.traps) {
      if (trap.active && this.invincible <= 0) {
        const dx = Math.abs(this.player.x / TILE_SIZE - trap.x);
        const dy = Math.abs(this.player.y / TILE_SIZE - trap.y);
        if (dx < 0.8 && dy < 0.8) {
          this.player.hp -= 20;
          this.invincible = 60;
          this.showMessage('Ouch!');
          this.emitState();

          if (this.player.hp <= 0) {
            this.status = 'over';
            this.emitState();
          }
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = w / (MAP_WIDTH * TILE_SIZE);

    ctx.save();
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    // Draw map
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.map[y][x] === 1) {
          ctx.fillStyle = '#4a3728';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#3a2718';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw door
    if (this.door) {
      ctx.fillStyle = this.door.locked ? '#8b4513' : '#27ae60';
      ctx.fillRect(this.door.x * TILE_SIZE, this.door.y * TILE_SIZE, TILE_SIZE, TILE_SIZE * 1.5);
      ctx.fillStyle = this.door.locked ? '#654321' : '#1e8449';
      ctx.fillRect(this.door.x * TILE_SIZE + 8, this.door.y * TILE_SIZE + 20, 8, 8);
    }

    // Draw treasures
    for (const treasure of this.treasures) {
      if (!treasure.collected) {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(treasure.x * TILE_SIZE + TILE_SIZE / 2, treasure.y * TILE_SIZE + TILE_SIZE / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4ac0d';
        ctx.beginPath();
        ctx.arc(treasure.x * TILE_SIZE + TILE_SIZE / 2 - 2, treasure.y * TILE_SIZE + TILE_SIZE / 2 - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw keys
    for (const key of this.keyItems) {
      if (!key.collected) {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(key.x * TILE_SIZE + 10, key.y * TILE_SIZE + 8, 12, 6);
        ctx.fillRect(key.x * TILE_SIZE + 18, key.y * TILE_SIZE + 8, 4, 16);
      }
    }

    // Draw traps
    for (const trap of this.traps) {
      ctx.fillStyle = '#e74c3c';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(trap.x * TILE_SIZE + 4 + i * 10, trap.y * TILE_SIZE + TILE_SIZE);
        ctx.lineTo(trap.x * TILE_SIZE + 9 + i * 10, trap.y * TILE_SIZE + 10);
        ctx.lineTo(trap.x * TILE_SIZE + 14 + i * 10, trap.y * TILE_SIZE + TILE_SIZE);
        ctx.fill();
      }
    }

    // Draw player
    if (this.invincible <= 0 || Math.floor(this.invincible / 5) % 2 === 0) {
      ctx.save();
      if (this.player.facing === 'left') {
        ctx.translate(this.player.x + 32, 0);
        ctx.scale(-1, 1);
        ctx.translate(-this.player.x, 0);
      }

      // Body
      ctx.fillStyle = '#3498db';
      ctx.fillRect(this.player.x + 8, this.player.y + 12, 16, 16);

      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(this.player.x + 16, this.player.y + 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Hat
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(this.player.x + 4, this.player.y + 2, 24, 4);

      // Legs
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(this.player.x + 8, this.player.y + 28, 6, 8);
      ctx.fillRect(this.player.x + 18, this.player.y + 28, 6, 8);

      ctx.restore();
    }

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
