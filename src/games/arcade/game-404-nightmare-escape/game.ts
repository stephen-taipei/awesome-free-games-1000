import { translations } from './i18n';

interface Obstacle {
  x: number;
  y: number;
  type: 'skull' | 'bat' | 'ghost';
  size: number;
}

interface LightOrb {
  x: number;
  y: number;
  size: number;
}

export class Game {
  private playerY: number = 200;
  private playerVelocity: number = 0;
  private distance: number = 0;
  private speed: number = 3;
  private maxSpeed: number = 8;
  private stamina: number = 100;
  private health: number = 100;
  private lightPower: number = 0;
  private isRunning: boolean = false;
  private isSprinting: boolean = false;
  private isJumping: boolean = false;
  private gameLoop: number | null = null;
  private locale: 'en' | 'zh-TW' | 'zh-CN' | 'ja' | 'ko' = 'zh-TW';

  private obstacles: Obstacle[] = [];
  private lightOrbs: LightOrb[] = [];
  private chaserDistance: number = 150; // Distance behind player
  private chaserSpeed: number = 2.5;
  private lightActive: boolean = false;
  private lightTimer: number = 0;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  private onStateChange: (() => void) | null = null;
  private onMessage: ((msg: string, type: string) => void) | null = null;
  private onGameEnd: ((win: boolean, distance: number) => void) | null = null;

  private readonly GRAVITY = 0.6;
  private readonly JUMP_FORCE = -12;
  private readonly GROUND_Y = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setLocale(locale: 'en' | 'zh-TW' | 'zh-CN' | 'ja' | 'ko') {
    this.locale = locale;
  }

  start() {
    this.playerY = this.GROUND_Y;
    this.playerVelocity = 0;
    this.distance = 0;
    this.speed = 3;
    this.stamina = 100;
    this.health = 100;
    this.lightPower = 0;
    this.isRunning = true;
    this.isSprinting = false;
    this.isJumping = false;
    this.chaserDistance = 150;
    this.lightActive = false;
    this.lightTimer = 0;
    this.obstacles = [];
    this.lightOrbs = [];

    this.showMessage(translations[this.locale].game.msgs.start, '');
    this.notifyChange();

    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    this.gameLoop = requestAnimationFrame(() => this.update());
  }

  private update() {
    if (!this.isRunning) return;

    // Update player position
    this.playerVelocity += this.GRAVITY;
    this.playerY += this.playerVelocity;

    if (this.playerY >= this.GROUND_Y) {
      this.playerY = this.GROUND_Y;
      this.playerVelocity = 0;
      this.isJumping = false;
    }

    // Update speed
    if (this.isSprinting && this.stamina > 0) {
      this.speed = Math.min(this.maxSpeed, this.speed + 0.05);
      this.stamina = Math.max(0, this.stamina - 0.5);
    } else {
      this.speed = Math.max(3, this.speed - 0.1);
      if (!this.isSprinting) {
        this.stamina = Math.min(100, this.stamina + 0.2);
      }
    }

    // Update distance
    this.distance += this.speed * 0.1;

    // Update chaser
    if (this.lightActive) {
      this.chaserDistance = Math.min(200, this.chaserDistance + 2);
      this.lightTimer--;
      if (this.lightTimer <= 0) {
        this.lightActive = false;
        this.showMessage(translations[this.locale].game.msgs.lightFaded, 'warning');
      }
    } else {
      const catchUpSpeed = this.chaserSpeed - this.speed * 0.2;
      this.chaserDistance -= catchUpSpeed;
    }

    // Check if caught
    if (this.chaserDistance <= 0) {
      this.health = Math.max(0, this.health - 2);
      this.chaserDistance = 10; // Keep some distance

      if (this.health <= 0) {
        this.endGame(false);
        return;
      }
    } else if (this.chaserDistance < 50 && !this.lightActive) {
      // Warning
      if (Math.floor(Date.now() / 1000) % 3 === 0) {
        this.showMessage(translations[this.locale].game.msgs.chaserNear, 'danger');
      }
    }

    // Spawn obstacles
    if (Math.random() < 0.02) {
      this.spawnObstacle();
    }

    // Spawn light orbs
    if (Math.random() < 0.01) {
      this.spawnLightOrb();
    }

    // Update obstacles
    this.obstacles = this.obstacles.filter(obs => {
      obs.x -= this.speed;

      // Check collision
      if (obs.x < 80 && obs.x > 20 &&
          Math.abs(this.playerY - obs.y) < 30) {
        this.health = Math.max(0, this.health - 10);
        this.showMessage(translations[this.locale].game.msgs.hitObstacle, 'danger');
        if (this.health <= 0) {
          this.endGame(false);
        }
        return false; // Remove obstacle
      }

      return obs.x > -50;
    });

    // Update light orbs
    this.lightOrbs = this.lightOrbs.filter(orb => {
      orb.x -= this.speed;

      // Check collection
      if (orb.x < 80 && orb.x > 20 &&
          Math.abs(this.playerY - orb.y) < 30) {
        this.collectLight();
        return false;
      }

      return orb.x > -50;
    });

    // Win condition
    if (this.distance >= 1000) {
      this.endGame(true);
      return;
    }

    this.draw();
    this.notifyChange();
    this.gameLoop = requestAnimationFrame(() => this.update());
  }

  private spawnObstacle() {
    const types: ('skull' | 'bat' | 'ghost')[] = ['skull', 'bat', 'ghost'];
    const type = types[Math.floor(Math.random() * types.length)];

    const obstacle: Obstacle = {
      x: this.canvas.width + 50,
      y: type === 'bat' ? this.GROUND_Y - 80 : this.GROUND_Y,
      type,
      size: 30
    };

    this.obstacles.push(obstacle);
  }

  private spawnLightOrb() {
    const orb: LightOrb = {
      x: this.canvas.width + 50,
      y: this.GROUND_Y - Math.random() * 100,
      size: 20
    };

    this.lightOrbs.push(orb);
  }

  private collectLight() {
    this.lightPower = Math.min(100, this.lightPower + 25);
    this.showMessage(translations[this.locale].game.msgs.lightCollected, 'success');

    if (this.lightPower >= 100 && !this.lightActive) {
      this.showMessage(translations[this.locale].game.msgs.lightReady, 'success');
    }
  }

  private draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Background - dark nightmare world
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0015');
    gradient.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Lightning effect occasionally
    if (Math.random() < 0.02) {
      ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);
    }

    // Ground
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(0, this.GROUND_Y + 30, width, height);

    // Ground pattern
    ctx.strokeStyle = '#3a2a4a';
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 50) {
      const offset = (this.distance * 10) % 50;
      ctx.beginPath();
      ctx.moveTo(i - offset, this.GROUND_Y + 30);
      ctx.lineTo(i - offset, height);
      ctx.stroke();
    }

    // Light orbs
    this.lightOrbs.forEach(orb => {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffee88';
      ctx.fillStyle = '#ffee88';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Obstacles
    this.obstacles.forEach(obs => {
      ctx.font = `${obs.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const icons = {
        skull: '💀',
        bat: '🦇',
        ghost: '👻'
      };

      ctx.fillText(icons[obs.type], obs.x, obs.y);
    });

    // Player
    ctx.save();
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.lightActive) {
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ffee88';
    }

    ctx.fillText('🏃', 50, this.playerY);
    ctx.restore();

    // Chaser (nightmare monster)
    const chaserX = 50 - this.chaserDistance;
    if (chaserX > -100) {
      ctx.save();
      ctx.font = '50px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ff2244';

      // Pulsing effect
      const pulse = Math.sin(Date.now() / 200) * 0.1 + 1;
      ctx.transform(pulse, 0, 0, pulse, chaserX, this.GROUND_Y);

      ctx.fillText('👹', 0, 0);
      ctx.restore();
    }

    // Light aura if active
    if (this.lightActive) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      const lightGrad = ctx.createRadialGradient(50, this.playerY, 0, 50, this.playerY, 100);
      lightGrad.addColorStop(0, '#ffee88');
      lightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Distance indicator
    ctx.fillStyle = '#8866aa';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(this.distance)} / 1000`, width - 10, 30);
  }

  jump() {
    if (!this.isRunning || this.isJumping) return;

    if (this.playerY >= this.GROUND_Y) {
      this.playerVelocity = this.JUMP_FORCE;
      this.isJumping = true;
    }
  }

  startSprint() {
    if (!this.isRunning) return;

    if (this.stamina > 0) {
      this.isSprinting = true;
    } else {
      this.showMessage(translations[this.locale].game.msgs.noStamina, 'warning');
    }
  }

  stopSprint() {
    this.isSprinting = false;
  }

  useLight() {
    if (!this.isRunning) return;

    if (this.lightPower >= 100) {
      this.lightActive = true;
      this.lightPower = 0;
      this.lightTimer = 180; // 3 seconds at 60fps
      this.chaserDistance = Math.min(200, this.chaserDistance + 50);
      this.showMessage(translations[this.locale].game.msgs.lightActivated, 'success');
    } else {
      this.showMessage(translations[this.locale].game.msgs.noLight, 'warning');
    }
  }

  private endGame(win: boolean) {
    this.isRunning = false;
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }

    const t = translations[this.locale].game.msgs;
    this.showMessage(win ? t.escaped : t.caught, win ? 'success' : 'danger');

    if (this.onGameEnd) this.onGameEnd(win, Math.floor(this.distance));
    this.notifyChange();
  }

  getStats() {
    return {
      health: this.health,
      stamina: this.stamina,
      lightPower: this.lightPower,
      distance: Math.floor(this.distance),
      speed: this.speed.toFixed(1),
      chaserDistance: Math.floor(this.chaserDistance),
      isRunning: this.isRunning,
      isSprinting: this.isSprinting,
      lightActive: this.lightActive
    };
  }

  setOnStateChange(cb: () => void) { this.onStateChange = cb; }
  setOnMessage(cb: (msg: string, type: string) => void) { this.onMessage = cb; }
  setOnGameEnd(cb: (win: boolean, distance: number) => void) { this.onGameEnd = cb; }

  private notifyChange() { if (this.onStateChange) this.onStateChange(); }
  private showMessage(msg: string, type: string) { if (this.onMessage) this.onMessage(msg, type); }
}
