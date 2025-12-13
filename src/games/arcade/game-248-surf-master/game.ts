/**
 * Surf Master Game Engine
 * Game #248
 *
 * Surf the waves, avoid obstacles, and perform tricks for points
 */

interface Surfer {
  x: number;
  y: number;
  vy: number;
  rotation: number;
  jumping: boolean;
  trick: number;
  trickName: string;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "rock" | "shark" | "jellyfish";
}

interface Collectible {
  x: number;
  y: number;
  type: "coin" | "star";
  collected: boolean;
}

interface Wave {
  x: number;
  amplitude: number;
  frequency: number;
  phase: number;
}

interface GameState {
  score: number;
  highScore: number;
  distance: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const GAME_SPEED = 4;

export class SurfMasterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private surfer: Surfer;
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private waves: Wave[] = [];
  private score = 0;
  private highScore = 0;
  private distance = 0;
  private speed = GAME_SPEED;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private spawnTimer = 0;
  private waterOffset = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
  private tricks = ["360 Spin!", "Air Grab!", "Flip!", "Super Jump!"];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.surfer = this.createSurfer();
    this.loadHighScore();
    this.initWaves();
  }

  private createSurfer(): Surfer {
    return {
      x: 100,
      y: 0,
      vy: 0,
      rotation: 0,
      jumping: false,
      trick: 0,
      trickName: "",
    };
  }

  private loadHighScore() {
    const saved = localStorage.getItem("surf_master_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("surf_master_highscore", this.highScore.toString());
  }

  private initWaves() {
    this.waves = [];
    for (let i = 0; i < 3; i++) {
      this.waves.push({
        x: 0,
        amplitude: 20 + i * 10,
        frequency: 0.02 + i * 0.01,
        phase: i * Math.PI / 3,
      });
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        distance: Math.floor(this.distance),
        status: this.status,
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  jump() {
    if (this.status !== "playing") return;
    if (!this.surfer.jumping) {
      this.surfer.jumping = true;
      this.surfer.vy = JUMP_FORCE;

      // Random trick
      if (Math.random() < 0.5) {
        this.surfer.trick = 1;
        this.surfer.trickName = this.tricks[Math.floor(Math.random() * this.tricks.length)];
      }

      // Splash particles
      this.spawnSplash(this.surfer.x, this.getWaveHeight(this.surfer.x));
    }
  }

  start() {
    this.score = 0;
    this.distance = 0;
    this.speed = GAME_SPEED;
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.surfer = this.createSurfer();
    this.surfer.y = this.getWaveHeight(this.surfer.x) - 30;
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  private getWaveHeight(x: number): number {
    let height = this.height * 0.6;
    for (const wave of this.waves) {
      height += Math.sin((x + this.waterOffset) * wave.frequency + wave.phase) * wave.amplitude;
    }
    return height;
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    this.distance += this.speed * 0.1;
    this.waterOffset += this.speed;
    this.spawnTimer += this.speed;

    // Increase speed over time
    this.speed = Math.min(12, GAME_SPEED + this.distance * 0.001);

    // Spawn obstacles and collectibles
    if (this.spawnTimer > 150) {
      this.spawnTimer = 0;
      if (Math.random() < 0.6) {
        this.spawnObstacle();
      }
      if (Math.random() < 0.4) {
        this.spawnCollectible();
      }
    }

    // Update surfer
    const waveY = this.getWaveHeight(this.surfer.x);

    if (this.surfer.jumping) {
      this.surfer.vy += GRAVITY;
      this.surfer.y += this.surfer.vy;

      // Trick rotation
      if (this.surfer.trick > 0) {
        this.surfer.rotation += 0.3;
        if (this.surfer.rotation >= Math.PI * 2) {
          this.surfer.rotation = 0;
          this.score += 50;
          this.surfer.trick = 0;
          this.emitState();
        }
      }

      // Land on wave
      if (this.surfer.y >= waveY - 30) {
        this.surfer.y = waveY - 30;
        this.surfer.jumping = false;
        this.surfer.vy = 0;
        this.surfer.rotation = 0;
        this.surfer.trick = 0;
        this.surfer.trickName = "";
        this.spawnSplash(this.surfer.x, waveY);
      }
    } else {
      this.surfer.y = waveY - 30;
      // Wave tilt
      const nextY = this.getWaveHeight(this.surfer.x + 5);
      this.surfer.rotation = Math.atan2(nextY - waveY, 5) * 0.5;
    }

    // Update obstacles
    for (const obs of this.obstacles) {
      obs.x -= this.speed;

      // Collision check
      if (
        !this.surfer.jumping &&
        obs.x < this.surfer.x + 30 &&
        obs.x + obs.width > this.surfer.x - 30 &&
        obs.y < this.surfer.y + 30 &&
        obs.y + obs.height > this.surfer.y - 10
      ) {
        this.gameOver();
        return;
      }
    }

    // Update collectibles
    for (const col of this.collectibles) {
      col.x -= this.speed;

      if (!col.collected) {
        const dx = col.x - this.surfer.x;
        const dy = col.y - this.surfer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
          col.collected = true;
          this.score += col.type === "star" ? 50 : 10;
          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }
          this.emitState();
        }
      }
    }

    // Cleanup off-screen items
    this.obstacles = this.obstacles.filter((o) => o.x > -100);
    this.collectibles = this.collectibles.filter((c) => c.x > -50);

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx - this.speed * 0.3;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
      return p.life > 0;
    });

    // Distance score
    if (Math.floor(this.distance) % 100 === 0 && this.distance > 0) {
      this.score += 1;
      this.emitState();
    }
  }

  private spawnObstacle() {
    const types: ("rock" | "shark" | "jellyfish")[] = ["rock", "shark", "jellyfish"];
    const type = types[Math.floor(Math.random() * types.length)];
    const waveY = this.getWaveHeight(this.width + 50);

    let obs: Obstacle;
    if (type === "rock") {
      obs = {
        x: this.width + 50,
        y: waveY - 20,
        width: 40,
        height: 40,
        type,
      };
    } else if (type === "shark") {
      obs = {
        x: this.width + 50,
        y: waveY - 30,
        width: 60,
        height: 30,
        type,
      };
    } else {
      obs = {
        x: this.width + 50,
        y: waveY - 50 - Math.random() * 40,
        width: 30,
        height: 40,
        type,
      };
    }

    this.obstacles.push(obs);
  }

  private spawnCollectible() {
    const waveY = this.getWaveHeight(this.width + 100);
    this.collectibles.push({
      x: this.width + 100,
      y: waveY - 60 - Math.random() * 60,
      type: Math.random() < 0.2 ? "star" : "coin",
      collected: false,
    });
  }

  private spawnSplash(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 5 - 2,
        life: 1,
        size: 3 + Math.random() * 4,
      });
    }
  }

  private gameOver() {
    this.status = "over";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
    skyGradient.addColorStop(0, "#FF7E5F");
    skyGradient.addColorStop(0.5, "#FEB47B");
    skyGradient.addColorStop(1, "#87CEEB");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Sun
    ctx.fillStyle = "#FFD93D";
    ctx.beginPath();
    ctx.arc(this.width - 80, 80, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 217, 61, 0.3)";
    ctx.beginPath();
    ctx.arc(this.width - 80, 80, 70, 0, Math.PI * 2);
    ctx.fill();

    // Draw waves
    this.drawWaves();

    // Draw obstacles
    for (const obs of this.obstacles) {
      this.drawObstacle(obs);
    }

    // Draw collectibles
    for (const col of this.collectibles) {
      if (!col.collected) {
        this.drawCollectible(col);
      }
    }

    // Draw particles (splash)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw surfer
    this.drawSurfer();

    // Draw trick text
    if (this.surfer.trickName) {
      ctx.fillStyle = "#FFD93D";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.surfer.trickName, this.surfer.x, this.surfer.y - 60);
    }

    // Draw distance
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(this.distance)}m`, 20, 30);
  }

  private drawWaves() {
    const ctx = this.ctx;

    // Background waves
    for (let layer = 2; layer >= 0; layer--) {
      const alpha = 0.3 + layer * 0.2;
      const yOffset = layer * 15;

      ctx.fillStyle = `rgba(30, 144, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, this.height);

      for (let x = 0; x <= this.width; x += 5) {
        let y = this.height * 0.6 + yOffset;
        for (const wave of this.waves) {
          y += Math.sin((x + this.waterOffset * (1 - layer * 0.2)) * wave.frequency + wave.phase) * wave.amplitude * (1 - layer * 0.2);
        }
        ctx.lineTo(x, y);
      }

      ctx.lineTo(this.width, this.height);
      ctx.closePath();
      ctx.fill();
    }

    // Main wave surface
    const waveGradient = ctx.createLinearGradient(0, this.height * 0.5, 0, this.height);
    waveGradient.addColorStop(0, "#0077B6");
    waveGradient.addColorStop(0.5, "#0096C7");
    waveGradient.addColorStop(1, "#00B4D8");
    ctx.fillStyle = waveGradient;

    ctx.beginPath();
    ctx.moveTo(0, this.height);

    for (let x = 0; x <= this.width; x += 3) {
      ctx.lineTo(x, this.getWaveHeight(x));
    }

    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // Wave foam
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += 3) {
      const y = this.getWaveHeight(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawObstacle(obs: Obstacle) {
    const ctx = this.ctx;

    if (obs.type === "rock") {
      ctx.fillStyle = "#4a4a4a";
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.height);
      ctx.lineTo(obs.x + obs.width * 0.3, obs.y);
      ctx.lineTo(obs.x + obs.width * 0.7, obs.y + obs.height * 0.2);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.width * 0.3, obs.y);
      ctx.lineTo(obs.x + obs.width * 0.4, obs.y + obs.height * 0.3);
      ctx.lineTo(obs.x + obs.width * 0.2, obs.y + obs.height * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === "shark") {
      // Shark fin
      ctx.fillStyle = "#2d3436";
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.height);
      ctx.quadraticCurveTo(obs.x + obs.width * 0.3, obs.y - 10, obs.x + obs.width * 0.5, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
    } else {
      // Jellyfish
      ctx.fillStyle = "rgba(255, 105, 180, 0.7)";
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + 10, 15, Math.PI, 0);
      ctx.fill();

      // Tentacles
      ctx.strokeStyle = "rgba(255, 105, 180, 0.5)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const tx = obs.x + 5 + i * 5;
        ctx.moveTo(tx, obs.y + 10);
        ctx.quadraticCurveTo(
          tx + Math.sin(Date.now() / 200 + i) * 5,
          obs.y + 25,
          tx,
          obs.y + obs.height
        );
        ctx.stroke();
      }
    }
  }

  private drawCollectible(col: Collectible) {
    const ctx = this.ctx;
    const bounce = Math.sin(Date.now() / 150) * 3;

    if (col.type === "star") {
      ctx.fillStyle = "#FFD700";
      this.drawStar(col.x, col.y + bounce, 15);
    } else {
      ctx.fillStyle = "#F1C40F";
      ctx.beginPath();
      ctx.arc(col.x, col.y + bounce, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(col.x - 3, col.y + bounce - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStar(x: number, y: number, radius: number) {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.5;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawSurfer() {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.surfer.x, this.surfer.y);
    ctx.rotate(this.surfer.rotation);

    // Surfboard
    ctx.fillStyle = "#FFF3E0";
    ctx.beginPath();
    ctx.ellipse(0, 15, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Board stripe
    ctx.fillStyle = "#FF7043";
    ctx.fillRect(-20, 12, 40, 6);

    // Surfer body
    ctx.fillStyle = "#FFCC80";

    // Legs
    ctx.fillRect(-15, -5, 8, 20);
    ctx.fillRect(8, -5, 8, 20);

    // Torso
    ctx.fillStyle = "#4FC3F7";
    ctx.fillRect(-10, -25, 20, 25);

    // Arms
    ctx.fillStyle = "#FFCC80";
    ctx.save();
    ctx.translate(-12, -20);
    ctx.rotate(-0.5);
    ctx.fillRect(0, 0, 6, 20);
    ctx.restore();

    ctx.save();
    ctx.translate(12, -20);
    ctx.rotate(0.5);
    ctx.fillRect(-6, 0, 6, 20);
    ctx.restore();

    // Head
    ctx.fillStyle = "#FFCC80";
    ctx.beginPath();
    ctx.arc(0, -35, 12, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#5D4037";
    ctx.beginPath();
    ctx.arc(0, -40, 10, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
