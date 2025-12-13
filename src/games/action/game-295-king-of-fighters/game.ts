/**
 * King of Fighters Game Engine
 * Game #295 - Classic 1v1 fighting game
 */

interface Fighter {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number;
  hp: number; maxHp: number;
  special: number; maxSpecial: number;
  facing: 'left' | 'right';
  state: 'idle' | 'walk' | 'jump' | 'crouch' | 'punch' | 'kick' | 'special' | 'hurt' | 'block';
  stateTime: number; grounded: boolean;
  color: string; name: string;
  wins: number;
  isBlocking: boolean;
  comboCount: number;
}

interface Effect {
  x: number; y: number;
  type: 'hit' | 'special' | 'block';
  life: number;
}

interface GameState {
  p1Hp: number; p1MaxHp: number; p1Special: number;
  p2Hp: number; p2MaxHp: number; p2Special: number;
  p1Wins: number; p2Wins: number;
  round: number;
  status: 'idle' | 'playing' | 'roundEnd' | 'gameEnd';
  winner: 'p1' | 'p2' | null;
}

type StateCallback = (state: GameState) => void;
const GRAVITY = 0.8;
const GROUND_Y = 340;

export class KingOfFightersGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player1: Fighter;
  private player2: Fighter;
  private effects: Effect[] = [];

  private round = 1;
  private status: 'idle' | 'playing' | 'roundEnd' | 'gameEnd' = 'idle';
  private winner: 'p1' | 'p2' | null = null;
  private keys: Set<string> = new Set();
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private roundTimer = 99;
  private announceText = '';
  private announceTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player1 = this.createFighter(100, '#e74c3c', 'Fighter', 'right');
    this.player2 = this.createFighter(450, '#3498db', 'CPU', 'left');
    this.setupControls();
  }

  private createFighter(x: number, color: string, name: string, facing: 'left' | 'right'): Fighter {
    return {
      x, y: GROUND_Y - 80, vx: 0, vy: 0,
      width: 50, height: 80,
      hp: 100, maxHp: 100,
      special: 0, maxSpecial: 100,
      facing, state: 'idle', stateTime: 0,
      grounded: true, color, name, wins: 0,
      isBlocking: false, comboCount: 0
    };
  }

  setOnStateChange(cb: StateCallback) { this.onStateChange = cb; }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        p1Hp: this.player1.hp, p1MaxHp: this.player1.maxHp, p1Special: this.player1.special,
        p2Hp: this.player2.hp, p2MaxHp: this.player2.maxHp, p2Special: this.player2.special,
        p1Wins: this.player1.wins, p2Wins: this.player2.wins,
        round: this.round, status: this.status, winner: this.winner
      });
    }
  }

  resize() {
    const container = this.canvas.parentElement!;
    this.canvas.width = Math.min(container.getBoundingClientRect().width, 600);
    this.canvas.height = 400;
    if (this.status === 'idle') this.draw();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyJ') this.playerAttack('punch');
      if (e.code === 'KeyK') this.playerAttack('kick');
      if (e.code === 'KeyL') this.playerAttack('special');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  private playerAttack(type: 'punch' | 'kick' | 'special') {
    if (this.status !== 'playing') return;
    if (this.player1.state === 'punch' || this.player1.state === 'kick' || this.player1.state === 'special' || this.player1.state === 'hurt') return;

    if (type === 'special' && this.player1.special < 50) return;

    this.player1.state = type;
    this.player1.stateTime = 0;

    if (type === 'special') {
      this.player1.special -= 50;
    }
  }

  private checkAttackHit(attacker: Fighter, defender: Fighter, damage: number, range: number, knockback: number) {
    const attackX = attacker.facing === 'right' ? attacker.x + attacker.width : attacker.x - range;
    const attackEndX = attackX + range;

    if (defender.x + defender.width > attackX && defender.x < attackEndX &&
        Math.abs(defender.y - attacker.y) < 50) {

      if (defender.isBlocking) {
        damage = Math.floor(damage * 0.2);
        knockback *= 0.3;
        this.effects.push({ x: defender.x + defender.width / 2, y: defender.y + 30, type: 'block', life: 15 });
      } else {
        defender.state = 'hurt';
        defender.stateTime = 0;
        this.effects.push({ x: defender.x + defender.width / 2, y: defender.y + 30, type: 'hit', life: 15 });
        attacker.comboCount++;
      }

      defender.hp -= damage;
      defender.vx = attacker.facing === 'right' ? knockback : -knockback;
      attacker.special = Math.min(attacker.maxSpecial, attacker.special + damage * 0.5);

      this.emitState();

      if (defender.hp <= 0) {
        defender.hp = 0;
        this.endRound(attacker === this.player1 ? 'p1' : 'p2');
      }
    }
  }

  private endRound(winner: 'p1' | 'p2') {
    this.status = 'roundEnd';
    const winnerFighter = winner === 'p1' ? this.player1 : this.player2;
    winnerFighter.wins++;
    this.announceText = 'K.O.!';
    this.announceTimer = 120;

    if (winnerFighter.wins >= 2) {
      this.winner = winner;
      this.status = 'gameEnd';
    }
    this.emitState();
  }

  handleMobile(action: string, active: boolean) {
    if (action === 'left') active ? this.keys.add('KeyA') : this.keys.delete('KeyA');
    if (action === 'right') active ? this.keys.add('KeyD') : this.keys.delete('KeyD');
    if (action === 'jump' && active && this.player1.grounded) {
      this.player1.vy = -18;
      this.player1.grounded = false;
      this.player1.state = 'jump';
    }
    if (action === 'crouch') active ? this.keys.add('KeyS') : this.keys.delete('KeyS');
    if (action === 'punch' && active) this.playerAttack('punch');
    if (action === 'kick' && active) this.playerAttack('kick');
    if (action === 'special' && active) this.playerAttack('special');
    if (action === 'block') {
      this.player1.isBlocking = active;
      if (active) this.player1.state = 'block';
    }
  }

  start() {
    this.round = 1;
    this.player1 = this.createFighter(100, '#e74c3c', 'Fighter', 'right');
    this.player2 = this.createFighter(450, '#3498db', 'CPU', 'left');
    this.startRound();
  }

  private startRound() {
    this.player1.x = 100; this.player1.y = GROUND_Y - 80;
    this.player1.hp = this.player1.maxHp;
    this.player1.state = 'idle'; this.player1.vx = 0; this.player1.vy = 0;
    this.player1.grounded = true; this.player1.comboCount = 0;

    this.player2.x = 450; this.player2.y = GROUND_Y - 80;
    this.player2.hp = this.player2.maxHp;
    this.player2.state = 'idle'; this.player2.vx = 0; this.player2.vy = 0;
    this.player2.grounded = true; this.player2.comboCount = 0;

    this.roundTimer = 99;
    this.effects = [];
    this.announceText = this.round === 1 ? 'Round 1' : (this.round === 2 ? 'Round 2' : 'Final Round');
    this.announceTimer = 90;

    setTimeout(() => {
      this.announceText = 'Fight!';
      this.announceTimer = 60;
      this.status = 'playing';
      this.emitState();
      this.lastTime = performance.now();
      if (!this.animationId) this.gameLoop();
    }, 1500);
  }

  nextRound() {
    this.round++;
    this.startRound();
  }

  private gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.67, 2);
    this.lastTime = now;

    if (this.status === 'playing') {
      this.update(dt);
    }
    this.draw();

    if (this.status !== 'gameEnd') {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    } else {
      this.animationId = null;
    }
  }

  private update(dt: number) {
    // Timer
    this.roundTimer -= dt * 0.05;
    if (this.roundTimer <= 0) {
      this.roundTimer = 0;
      const winner = this.player1.hp > this.player2.hp ? 'p1' : 'p2';
      this.endRound(winner);
      return;
    }

    // Update announce
    if (this.announceTimer > 0) this.announceTimer -= dt;

    // Player 1 movement
    this.updateFighter(this.player1, dt, true);

    // Player 2 (CPU) AI
    this.updateCPU(dt);
    this.updateFighter(this.player2, dt, false);

    // Face each other
    this.player1.facing = this.player1.x < this.player2.x ? 'right' : 'left';
    this.player2.facing = this.player2.x < this.player1.x ? 'right' : 'left';

    // Check attacks
    if (this.player1.state === 'punch' && this.player1.stateTime > 5 && this.player1.stateTime < 12) {
      this.checkAttackHit(this.player1, this.player2, 8, 60, 5);
    }
    if (this.player1.state === 'kick' && this.player1.stateTime > 8 && this.player1.stateTime < 16) {
      this.checkAttackHit(this.player1, this.player2, 12, 70, 8);
    }
    if (this.player1.state === 'special' && this.player1.stateTime > 15 && this.player1.stateTime < 25) {
      this.checkAttackHit(this.player1, this.player2, 25, 100, 15);
      this.effects.push({ x: this.player1.x + (this.player1.facing === 'right' ? 80 : -30), y: this.player1.y + 30, type: 'special', life: 10 });
    }

    if (this.player2.state === 'punch' && this.player2.stateTime > 5 && this.player2.stateTime < 12) {
      this.checkAttackHit(this.player2, this.player1, 8, 60, 5);
    }
    if (this.player2.state === 'kick' && this.player2.stateTime > 8 && this.player2.stateTime < 16) {
      this.checkAttackHit(this.player2, this.player1, 12, 70, 8);
    }
    if (this.player2.state === 'special' && this.player2.stateTime > 15 && this.player2.stateTime < 25) {
      this.checkAttackHit(this.player2, this.player1, 25, 100, 15);
      this.effects.push({ x: this.player2.x + (this.player2.facing === 'right' ? 80 : -30), y: this.player2.y + 30, type: 'special', life: 10 });
    }

    // Update effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
  }

  private updateFighter(f: Fighter, dt: number, isPlayer: boolean) {
    const speed = 4;

    if (isPlayer && (f.state === 'idle' || f.state === 'walk' || f.state === 'block')) {
      f.isBlocking = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

      if (!f.isBlocking) {
        if (this.keys.has('KeyA')) { f.vx = -speed; f.state = 'walk'; }
        else if (this.keys.has('KeyD')) { f.vx = speed; f.state = 'walk'; }
        else { f.vx *= 0.7; if (f.grounded) f.state = 'idle'; }

        if ((this.keys.has('KeyW') || this.keys.has('Space')) && f.grounded) {
          f.vy = -18; f.grounded = false; f.state = 'jump';
        }

        if (this.keys.has('KeyS') && f.grounded) {
          f.state = 'crouch';
        }
      } else {
        f.vx *= 0.5;
        f.state = 'block';
      }
    }

    // Apply gravity
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    // Ground collision
    if (f.y >= GROUND_Y - f.height) {
      f.y = GROUND_Y - f.height;
      f.vy = 0;
      f.grounded = true;
    }

    // Screen bounds
    f.x = Math.max(20, Math.min(this.canvas.width - f.width - 20, f.x));

    // State timing
    f.stateTime += dt;
    if (f.state === 'hurt' && f.stateTime > 20) {
      f.state = 'idle'; f.comboCount = 0;
    }
    if ((f.state === 'punch' && f.stateTime > 18) ||
        (f.state === 'kick' && f.stateTime > 22) ||
        (f.state === 'special' && f.stateTime > 35)) {
      f.state = 'idle';
    }

    // Friction
    if (f.grounded) f.vx *= 0.85;
  }

  private updateCPU(dt: number) {
    const cpu = this.player2;
    const player = this.player1;
    const dist = Math.abs(cpu.x - player.x);

    if (cpu.state === 'hurt' || cpu.state === 'punch' || cpu.state === 'kick' || cpu.state === 'special') return;

    // AI decision making
    if (Math.random() < 0.02) {
      // Block sometimes
      cpu.isBlocking = dist < 100 && player.state === 'punch' || player.state === 'kick';
    }

    if (cpu.isBlocking) {
      cpu.state = 'block';
      return;
    }

    if (dist > 80) {
      // Move towards player
      cpu.vx = player.x < cpu.x ? -3 : 3;
      cpu.state = 'walk';
    } else {
      // Attack range
      cpu.vx *= 0.5;
      if (Math.random() < 0.03) {
        if (cpu.special >= 50 && Math.random() < 0.3) {
          cpu.state = 'special';
          cpu.special -= 50;
        } else if (Math.random() < 0.5) {
          cpu.state = 'punch';
        } else {
          cpu.state = 'kick';
        }
        cpu.stateTime = 0;
      }
    }

    // Jump occasionally
    if (cpu.grounded && Math.random() < 0.01) {
      cpu.vy = -16;
      cpu.grounded = false;
      cpu.state = 'jump';
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width; const h = this.canvas.height;

    // Background - arena
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Arena floor
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Arena decorations
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 50, w - 30, GROUND_Y - 40);

    // Corner decorations
    ctx.fillStyle = '#e94560';
    ctx.fillRect(10, 45, 20, 20);
    ctx.fillRect(w - 30, 45, 20, 20);
    ctx.fillRect(10, GROUND_Y - 15, 20, 20);
    ctx.fillRect(w - 30, GROUND_Y - 15, 20, 20);

    // Draw fighters
    this.drawFighter(this.player2);
    this.drawFighter(this.player1);

    // Draw effects
    for (const e of this.effects) {
      ctx.globalAlpha = e.life / 15;
      if (e.type === 'hit') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HIT!', e.x, e.y);
      } else if (e.type === 'special') {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 50);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.5, '#f1c40f');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 50, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'block') {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 30, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Timer
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(this.roundTimer).toString(), w / 2, 50);

    // Announce text
    if (this.announceTimer > 0) {
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.announceText, w / 2, h / 2);
    }
  }

  private drawFighter(f: Fighter) {
    const ctx = this.ctx;

    ctx.save();
    if (f.facing === 'left') {
      ctx.translate(f.x + f.width, 0);
      ctx.scale(-1, 1);
      ctx.translate(-f.x, 0);
    }

    const bodyColor = f.state === 'hurt' ? '#fff' : f.color;
    const height = f.state === 'crouch' ? f.height * 0.6 : f.height;
    const yOffset = f.state === 'crouch' ? f.height * 0.4 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(f.x + f.width / 2, GROUND_Y, f.width / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(f.x + 10, f.y + yOffset + 20, f.width - 20, height - 30);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, f.y + yOffset + 12, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(f.x + f.width / 2, f.y + yOffset + 6, 14, Math.PI, 0);
    ctx.fill();

    // Legs
    if (f.state !== 'crouch') {
      ctx.fillStyle = '#1a252f';
      const legOffset = f.state === 'walk' ? Math.sin(Date.now() / 80) * 8 : 0;
      ctx.fillRect(f.x + 12, f.y + height - 14, 10, 14 + legOffset);
      ctx.fillRect(f.x + f.width - 22, f.y + height - 14, 10, 14 - legOffset);
    }

    // Attack animations
    if (f.state === 'punch') {
      ctx.fillStyle = '#FFCC80';
      ctx.fillRect(f.x + f.width - 5, f.y + yOffset + 35, 30, 10);
    } else if (f.state === 'kick') {
      ctx.fillStyle = '#1a252f';
      ctx.save();
      ctx.translate(f.x + f.width - 10, f.y + height - 20);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(0, -5, 35, 10);
      ctx.restore();
    } else if (f.state === 'special') {
      // Energy aura
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x + f.width / 2, f.y + yOffset + height / 2, 40 + Math.sin(Date.now() / 50) * 5, 0, Math.PI * 2);
      ctx.stroke();
      // Energy ball
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(f.x + f.width + 20, f.y + yOffset + 40, 15, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.state === 'block') {
      // Block stance
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x + f.width / 2, f.y + yOffset + height / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  destroy() { if (this.animationId) cancelAnimationFrame(this.animationId); }
}
