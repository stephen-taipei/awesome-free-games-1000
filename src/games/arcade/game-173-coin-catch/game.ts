/**
 * Coin Catch Game
 * Game #173 - Canvas-based coin catching
 */

interface Coin {
  x: number;
  y: number;
  radius: number;
  speed: number;
  value: number;
  rotation: number;
  type: "gold" | "silver" | "bomb";
}

interface Basket {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class CoinCatchGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private score: number = 0;
  private timeLeft: number = 60;
  private status: "idle" | "playing" | "over" = "idle";
  private basket: Basket;
  private coins: Coin[] = [];
  private particles: Particle[] = [];
  private targetX: number = 0;
  private animationId: number = 0;
  private timerInterval: number = 0;
  private spawnTimer: number = 0;
  private lastTime: number = 0;
  onStateChange: ((state: any) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.basket = { x: 0, y: 0, width: 80, height: 50 };
  }

  public resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.basket.y = this.height - 70;
    this.basket.x = this.width / 2 - this.basket.width / 2;
    this.targetX = this.basket.x;

    this.draw();
  }

  public start() {
    this.score = 0;
    this.timeLeft = 60;
    this.status = "playing";
    this.coins = [];
    this.particles = [];
    this.spawnTimer = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (this.status === "playing") {
        this.timeLeft--;
        this.emitState();
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }
    }, 1000);

    this.emitState();
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (this.status !== "playing") return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.spawnTimer += delta;
    if (this.spawnTimer > 500 - (60 - this.timeLeft) * 5) {
      this.spawnTimer = 0;
      this.spawnCoin();
    }

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private spawnCoin() {
    const rand = Math.random();
    let type: "gold" | "silver" | "bomb";
    let value: number;
    let radius: number;

    if (rand < 0.1) {
      type = "bomb";
      value = -50;
      radius = 18;
    } else if (rand < 0.3) {
      type = "gold";
      value = 10;
      radius = 15;
    } else {
      type = "silver";
      value = 5;
      radius = 12;
    }

    this.coins.push({
      x: Math.random() * (this.width - 40) + 20,
      y: -20,
      radius,
      speed: 2 + Math.random() * 2 + (60 - this.timeLeft) * 0.05,
      value,
      rotation: 0,
      type,
    });
  }

  private update() {
    // Update basket position
    this.basket.x += (this.targetX - this.basket.x) * 0.15;
    this.basket.x = Math.max(0, Math.min(this.width - this.basket.width, this.basket.x));

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.y += coin.speed;
      coin.rotation += 0.1;

      // Check catch
      if (
        coin.y + coin.radius > this.basket.y &&
        coin.y - coin.radius < this.basket.y + this.basket.height &&
        coin.x > this.basket.x &&
        coin.x < this.basket.x + this.basket.width
      ) {
        this.score = Math.max(0, this.score + coin.value);
        this.addCatchParticles(coin);
        this.coins.splice(i, 1);
        this.emitState();
        continue;
      }

      // Remove if off screen
      if (coin.y > this.height + 20) {
        this.coins.splice(i, 1);
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private addCatchParticles(coin: Coin) {
    const color = coin.type === "gold" ? "#f1c40f" : coin.type === "silver" ? "#bdc3c7" : "#e74c3c";
    const count = coin.type === "bomb" ? 15 : 8;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: coin.x,
        y: coin.y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 2,
        life: 1,
        color,
      });
    }
  }

  private endGame() {
    this.status = "over";
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.emitState();
  }

  private draw() {
    // Sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#87ceeb");
    gradient.addColorStop(1, "#e0f7fa");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Clouds
    this.ctx.fillStyle = "rgba(255,255,255,0.8)";
    this.drawCloud(50, 50, 40);
    this.drawCloud(150, 80, 30);
    this.drawCloud(this.width - 100, 60, 35);

    // Ground
    this.ctx.fillStyle = "#8bc34a";
    this.ctx.fillRect(0, this.height - 20, this.width, 20);

    // Draw particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Draw coins
    for (const coin of this.coins) {
      this.drawCoin(coin);
    }

    // Draw basket
    this.drawBasket();

    // Score popup
    if (this.particles.length > 0) {
      const lastParticle = this.particles[0];
      if (lastParticle.life > 0.8) {
        this.ctx.fillStyle = lastParticle.color;
        this.ctx.font = "bold 16px Arial";
        this.ctx.textAlign = "center";
        const text = lastParticle.color === "#e74c3c" ? "-50" : "+";
        this.ctx.fillText(text, lastParticle.x, lastParticle.y - 20);
      }
    }
  }

  private drawCloud(x: number, y: number, size: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    this.ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawCoin(coin: Coin) {
    this.ctx.save();
    this.ctx.translate(coin.x, coin.y);

    // 3D rotation effect
    const scaleX = Math.cos(coin.rotation);

    this.ctx.scale(scaleX, 1);

    if (coin.type === "bomb") {
      // Bomb
      this.ctx.fillStyle = "#2c3e50";
      this.ctx.beginPath();
      this.ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Fuse
      this.ctx.strokeStyle = "#f39c12";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -coin.radius);
      this.ctx.quadraticCurveTo(5, -coin.radius - 10, 0, -coin.radius - 15);
      this.ctx.stroke();

      // Spark
      if (Math.random() > 0.5) {
        this.ctx.fillStyle = "#f1c40f";
        this.ctx.beginPath();
        this.ctx.arc(0, -coin.radius - 15, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Skull
      this.ctx.fillStyle = "#fff";
      this.ctx.font = `${coin.radius}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("💀", 0, 0);
    } else {
      // Coin
      const color = coin.type === "gold" ? "#f1c40f" : "#bdc3c7";
      const darkerColor = coin.type === "gold" ? "#f39c12" : "#95a5a6";

      this.ctx.beginPath();
      this.ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      // Inner circle
      this.ctx.beginPath();
      this.ctx.arc(0, 0, coin.radius * 0.7, 0, Math.PI * 2);
      this.ctx.strokeStyle = darkerColor;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Dollar sign
      this.ctx.fillStyle = darkerColor;
      this.ctx.font = `bold ${coin.radius}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("$", 0, 0);
    }

    this.ctx.restore();
  }

  private drawBasket() {
    const { x, y, width, height } = this.basket;

    // Basket body
    this.ctx.fillStyle = "#8b4513";
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + width, y);
    this.ctx.lineTo(x + width - 10, y + height);
    this.ctx.lineTo(x + 10, y + height);
    this.ctx.closePath();
    this.ctx.fill();

    // Weave pattern
    this.ctx.strokeStyle = "#654321";
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const yPos = y + 10 + i * 12;
      this.ctx.beginPath();
      this.ctx.moveTo(x + 5, yPos);
      this.ctx.lineTo(x + width - 5, yPos);
      this.ctx.stroke();
    }

    for (let i = 0; i < 6; i++) {
      const xPos = x + 10 + i * 12;
      const offset = (x + width / 2 - xPos) * 0.15;
      this.ctx.beginPath();
      this.ctx.moveTo(xPos, y + 2);
      this.ctx.lineTo(xPos + offset, y + height - 2);
      this.ctx.stroke();
    }

    // Rim
    this.ctx.fillStyle = "#654321";
    this.ctx.fillRect(x - 5, y - 5, width + 10, 8);
  }

  public handleMouseMove(x: number) {
    if (this.status !== "playing") return;
    this.targetX = x - this.basket.width / 2;
  }

  public reset() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        time: this.timeLeft,
        status: this.status,
      });
    }
  }
}
