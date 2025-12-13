/**
 * Stickman War Game Engine
 * Game #291 - Strategy action game with stickman armies
 */

interface Stickman {
  x: number; y: number; vx: number;
  hp: number; maxHp: number; atk: number;
  team: 'player' | 'enemy';
  type: 'soldier' | 'archer' | 'tank';
  attacking: boolean; attackTime: number;
  target: Stickman | null;
}

interface GameState {
  score: number; highScore: number; wave: number;
  baseHp: number; maxBaseHp: number; gold: number;
  status: 'idle' | 'playing' | 'over' | 'cleared';
}

type StateCallback = (state: GameState) => void;

export class StickmanWarGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stickmen: Stickman[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  private score = 0; private highScore = 0; private wave = 1;
  private baseHp = 100; private maxBaseHp = 100; private gold = 100;
  private status: 'idle' | 'playing' | 'over' | 'cleared' = 'idle';
  private spawnTimer = 0;

  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.loadHighScore();
    this.setupControls();
  }

  private loadHighScore() {
    const saved = localStorage.getItem('stickman_war_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore() {
    localStorage.setItem('stickman_war_highscore', this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score, highScore: this.highScore, wave: this.wave,
        baseHp: this.baseHp, maxBaseHp: this.maxBaseHp, gold: this.gold, status: this.status
      });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    this.canvas.width = Math.min(rect.width, 600);
    this.canvas.height = 350;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    this.canvas.addEventListener('click', (e) => {
      if (this.status !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      this.spawnSoldier(y);
    });
  }

  private spawnSoldier(y: number) {
    if (this.gold < 20) return;
    this.gold -= 20;
    const type = 'soldier';
    this.stickmen.push({
      x: 30, y: Math.max(100, Math.min(this.canvas.height - 50, y)),
      vx: 0, hp: 50, maxHp: 50, atk: 10, team: 'player', type,
      attacking: false, attackTime: 0, target: null
    });
    this.emitState();
  }

  spawnArcher() {
    if (this.gold < 35) return;
    this.gold -= 35;
    this.stickmen.push({
      x: 30, y: 150 + Math.random() * 150,
      vx: 0, hp: 30, maxHp: 30, atk: 15, team: 'player', type: 'archer',
      attacking: false, attackTime: 0, target: null
    });
    this.emitState();
  }

  spawnTank() {
    if (this.gold < 60) return;
    this.gold -= 60;
    this.stickmen.push({
      x: 30, y: 150 + Math.random() * 150,
      vx: 0, hp: 120, maxHp: 120, atk: 8, team: 'player', type: 'tank',
      attacking: false, attackTime: 0, target: null
    });
    this.emitState();
  }

  start() {
    this.score = 0; this.wave = 1; this.baseHp = 100; this.gold = 100;
    this.stickmen = []; this.particles = [];
    this.spawnEnemyWave();
    this.status = 'playing';
    this.emitState();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  nextWave() {
    this.wave++;
    this.baseHp = Math.min(this.maxBaseHp, this.baseHp + 10);
    this.gold += 50;
    this.stickmen = this.stickmen.filter(s => s.team === 'player');
    this.spawnEnemyWave();
    this.status = 'playing';
    this.emitState();
    if (!this.animationId) { this.lastTime = performance.now(); this.gameLoop(); }
  }

  private spawnEnemyWave() {
    const count = 3 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.status !== 'playing') return;
        const type = Math.random() < 0.7 ? 'soldier' : (Math.random() < 0.5 ? 'archer' : 'tank');
        const configs = { soldier: { hp: 40, atk: 8 }, archer: { hp: 25, atk: 12 }, tank: { hp: 100, atk: 5 } };
        const cfg = configs[type];
        this.stickmen.push({
          x: this.canvas.width - 30, y: 100 + Math.random() * 200,
          vx: 0, hp: cfg.hp + this.wave * 3, maxHp: cfg.hp + this.wave * 3,
          atk: cfg.atk + this.wave, team: 'enemy', type,
          attacking: false, attackTime: 0, target: null
        });
      }, i * 1000);
    }
  }

  private gameLoop() {
    if (this.status !== 'playing') { this.animationId = null; return; }
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 2);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Gold regeneration
    this.gold = Math.min(200, this.gold + 0.05 * dt);

    for (let i = this.stickmen.length - 1; i >= 0; i--) {
      const s = this.stickmen[i];

      // Find target
      if (!s.target || s.target.hp <= 0) {
        s.target = this.stickmen.find(t => t.team !== s.team && t.hp > 0) || null;
      }

      if (s.target) {
        const dx = s.target.x - s.x;
        const dist = Math.abs(dx);
        const attackRange = s.type === 'archer' ? 150 : 30;

        if (dist > attackRange) {
          s.vx = s.team === 'player' ? 1.5 : -1.5;
          s.attacking = false;
        } else {
          s.vx = 0;
          s.attacking = true;
          s.attackTime += dt;
          if (s.attackTime >= 30) {
            s.target.hp -= s.atk;
            s.attackTime = 0;
            this.particles.push({ x: s.target.x, y: s.target.y, vx: (Math.random() - 0.5) * 4, vy: -2, life: 15, color: '#e74c3c' });
          }
        }
      } else {
        s.vx = s.team === 'player' ? 1 : -1;
      }

      s.x += s.vx * dt;

      // Check base damage
      if (s.team === 'enemy' && s.x < 40) {
        this.baseHp -= s.atk * 0.1 * dt;
        if (this.baseHp <= 0) { this.status = 'over'; this.emitState(); return; }
      }

      // Remove dead
      if (s.hp <= 0) {
        if (s.team === 'enemy') {
          this.score += s.type === 'tank' ? 30 : 10;
          this.gold += 10;
          if (this.score > this.highScore) { this.highScore = this.score; this.saveHighScore(); }
        }
        for (let j = 0; j < 5; j++) {
          this.particles.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 20, color: s.team === 'player' ? '#3498db' : '#e74c3c' });
        }
        this.stickmen.splice(i, 1);
        this.emitState();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.2 * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Check wave clear
    if (!this.stickmen.some(s => s.team === 'enemy')) {
      this.status = 'cleared';
      this.emitState();
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#90ee90';
    ctx.fillRect(0, h - 80, w, 80);

    // Bases
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, h - 150, 40, 150);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(w - 40, h - 150, 40, 150);

    // Stickmen
    for (const s of this.stickmen) {
      this.drawStickman(s);
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 20;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Gold display
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Gold: ${Math.floor(this.gold)}`, 10, 25);
  }

  private drawStickman(s: Stickman) {
    const ctx = this.ctx;
    const color = s.team === 'player' ? '#3498db' : '#e74c3c';
    const size = s.type === 'tank' ? 1.3 : (s.type === 'archer' ? 0.9 : 1);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * size;
    ctx.lineCap = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(s.x, s.y - 20 * size, 8 * size, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 12 * size);
    ctx.lineTo(s.x, s.y + 10 * size);
    ctx.stroke();

    // Arms
    const armAngle = s.attacking ? Math.sin(s.attackTime * 0.5) * 0.5 : 0;
    ctx.beginPath();
    ctx.moveTo(s.x - 12 * size, s.y - 5 * size + armAngle * 10);
    ctx.lineTo(s.x, s.y - 5 * size);
    ctx.lineTo(s.x + 12 * size, s.y - 5 * size - armAngle * 10);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + 10 * size);
    ctx.lineTo(s.x - 8 * size, s.y + 25 * size);
    ctx.moveTo(s.x, s.y + 10 * size);
    ctx.lineTo(s.x + 8 * size, s.y + 25 * size);
    ctx.stroke();

    // HP bar
    const hpPercent = s.hp / s.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(s.x - 15, s.y - 35, 30, 4);
    ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(s.x - 15, s.y - 35, 30 * hpPercent, 4);
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
