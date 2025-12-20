/**
 * Dream Run Game Engine
 * Game #403
 *
 * A dreamlike parkour game with floating mechanics and ethereal visuals!
 */

interface Point {
  x: number;
  y: number;
}

type PlayerState = "running" | "jumping" | "floating" | "phasing";
type ObstacleType = "cloud" | "star" | "moon" | "nightmare";

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  rotation?: number;
  pulsePhase?: number;
}

interface Collectible {
  x: number;
  y: number;
  type: "stardust" | "fragment";
  collected: boolean;
  shimmer: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
  speed: number;
}

interface GameState {
  distance: number;
  stardust: number;
  score: number;
  highScore: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320;
const PLAYER_SIZE = 40;
const DREAM_GRAVITY = 0.4; // Reduced gravity for dream-like feeling
const JUMP_FORCE = -12;
const FLOAT_FORCE = -0.3; // Gentle upward force when floating
const RUN_SPEED = 5;
const SPAWN_DISTANCE = 250;

export class DreamRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private playerX = 100;
  private playerY = GROUND_Y - PLAYER_SIZE;
  private playerVelY = 0;
  private playerState: PlayerState = "running";
  private floatTimer = 0;
  private maxFloatTime = 60; // Maximum floating frames
  private phaseTimer = 0;
  private colorShift = 0;

  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private backgroundStars: Star[] = [];
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
  }> = [];

  private distance = 0;
  private stardustCount = 0;
  private fragmentCount = 0;
  private score = 0;
  private highScore = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationFrame: number | null = null;
  private lastSpawnX = 0;
  private difficulty = 1;
  private backgroundOffset = 0;
  private dreamPhase = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
    this.initBackgroundStars();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("dreamrun_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("dreamrun_highscore", this.highScore.toString());
  }

  private initBackgroundStars() {
    for (let i = 0; i < 100; i++) {
      this.backgroundStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 1,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.2,
      });
    }
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        distance: Math.floor(this.distance / 10),
        stardust: this.stardustCount,
        score: this.score,
        highScore: this.highScore,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "auto";
  }

  start() {
    this.playerX = 100;
    this.playerY = GROUND_Y - PLAYER_SIZE;
    this.playerVelY = 0;
    this.playerState = "running";
    this.floatTimer = 0;
    this.phaseTimer = 0;
    this.colorShift = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.distance = 0;
    this.stardustCount = 0;
    this.fragmentCount = 0;
    this.score = 0;
    this.lastSpawnX = CANVAS_WIDTH;
    this.difficulty = 1;
    this.backgroundOffset = 0;
    this.dreamPhase = 0;

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  jump() {
    if (this.status !== "playing") return;
    if (this.playerState === "running" && this.playerY >= GROUND_Y - PLAYER_SIZE - 2) {
      this.playerVelY = JUMP_FORCE;
      this.playerState = "jumping";
      this.createJumpParticles();
    }
  }

  startFloat() {
    if (this.status !== "playing") return;
    if (this.floatTimer < this.maxFloatTime && this.playerState !== "phasing") {
      this.playerState = "floating";
    }
  }

  stopFloat() {
    if (this.playerState === "floating") {
      this.playerState = this.playerY >= GROUND_Y - PLAYER_SIZE - 2 ? "running" : "jumping";
    }
  }

  activatePhase() {
    if (this.status !== "playing") return;
    if (this.fragmentCount >= 3) {
      this.fragmentCount -= 3;
      this.playerState = "phasing";
      this.phaseTimer = 60; // 1 second of phasing
      this.createPhaseParticles();
    }
  }

  private createJumpParticles() {
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + Math.random() * Math.PI;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x: this.playerX + PLAYER_SIZE / 2,
        y: this.playerY + PLAYER_SIZE,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color: `hsl(${this.colorShift}, 70%, 70%)`,
        size: 3,
      });
    }
  }

  private createPhaseParticles() {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      this.particles.push({
        x: this.playerX + PLAYER_SIZE / 2,
        y: this.playerY + PLAYER_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40,
        color: "#b19cd9",
        size: 4,
      });
    }
  }

  private gameLoop = () => {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationFrame = requestAnimationFrame(this.gameLoop);
    }
  };

  private update() {
    if (this.status !== "playing") return;

    // Update dream phase and color shift
    this.dreamPhase += 0.02;
    this.colorShift = (this.colorShift + 0.5) % 360;

    // Update distance and difficulty
    this.distance += RUN_SPEED;
    this.difficulty = 1 + Math.floor(this.distance / 2000) * 0.2;
    this.backgroundOffset = (this.backgroundOffset + RUN_SPEED * 0.5) % CANVAS_WIDTH;

    // Update score
    this.score = Math.floor(this.distance / 10) + this.stardustCount * 5 + this.fragmentCount * 20;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.emitState();

    // Update player physics
    if (this.phaseTimer > 0) {
      this.phaseTimer--;
      if (this.phaseTimer === 0) {
        this.playerState = "running";
      }
    }

    // Handle floating
    if (this.playerState === "floating") {
      this.floatTimer++;
      if (this.floatTimer >= this.maxFloatTime) {
        this.playerState = "jumping";
      } else {
        this.playerVelY += FLOAT_FORCE;
        // Create gentle floating particles
        if (Math.random() < 0.3) {
          this.particles.push({
            x: this.playerX + Math.random() * PLAYER_SIZE,
            y: this.playerY + PLAYER_SIZE,
            vx: Math.random() * 2 - 1,
            vy: -Math.random() * 2,
            life: 20,
            color: `hsl(${this.colorShift}, 60%, 80%)`,
            size: 2,
          });
        }
      }
    } else {
      // Regenerate float timer when grounded
      if (this.playerY >= GROUND_Y - PLAYER_SIZE - 2) {
        this.floatTimer = Math.max(0, this.floatTimer - 2);
      }
    }

    // Apply gravity
    this.playerVelY += DREAM_GRAVITY;
    this.playerY += this.playerVelY;

    // Ground collision
    if (this.playerY >= GROUND_Y - PLAYER_SIZE) {
      this.playerY = GROUND_Y - PLAYER_SIZE;
      this.playerVelY = 0;
      if (this.playerState === "jumping" || this.playerState === "floating") {
        this.playerState = "running";
      }
    }

    // Update obstacles
    this.updateObstacles();

    // Update collectibles
    this.updateCollectibles();

    // Update particles
    this.updateParticles();

    // Update background stars
    this.updateBackgroundStars();

    // Spawn new content
    this.spawnContent();

    // Check collisions (skip if phasing)
    if (this.phaseTimer === 0) {
      this.checkCollisions();
    }
  }

  private updateObstacles() {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= RUN_SPEED;

      // Update rotation for visual effect
      if (obs.rotation !== undefined) {
        obs.rotation += 0.03;
      }

      // Update pulse phase
      if (obs.pulsePhase !== undefined) {
        obs.pulsePhase += 0.05;
      }

      // Remove off-screen obstacles
      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCollectibles() {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= RUN_SPEED;
      col.shimmer += 0.1;

      // Remove off-screen collectibles
      if (col.x < -20) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gentle gravity on particles
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateBackgroundStars() {
    for (const star of this.backgroundStars) {
      star.twinkle += 0.05;
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = CANVAS_WIDTH;
        star.y = Math.random() * CANVAS_HEIGHT;
      }
    }
  }

  private spawnContent() {
    const rightEdge = this.obstacles.length > 0
      ? Math.max(...this.obstacles.map(o => o.x + o.width))
      : CANVAS_WIDTH;

    if (rightEdge < CANVAS_WIDTH + SPAWN_DISTANCE) {
      const rand = Math.random();

      if (rand < 0.3) {
        // Spawn floating cloud
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - 60 - Math.random() * 100,
          width: 60,
          height: 30,
          type: "cloud",
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else if (rand < 0.5) {
        // Spawn star obstacle
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - 50 - Math.random() * 120,
          width: 40,
          height: 40,
          type: "star",
          rotation: Math.random() * Math.PI * 2,
        });
      } else if (rand < 0.7) {
        // Spawn moon obstacle
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - 80 - Math.random() * 80,
          width: 50,
          height: 50,
          type: "moon",
          rotation: Math.random() * Math.PI * 2,
        });
      } else {
        // Spawn nightmare (solid obstacle)
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - 40,
          width: 30,
          height: 40,
          type: "nightmare",
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      // Spawn stardust
      if (Math.random() < 0.5) {
        const colX = CANVAS_WIDTH + 50;
        const numCols = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < numCols; i++) {
          this.collectibles.push({
            x: colX + i * 35,
            y: GROUND_Y - 80 - Math.random() * 120,
            type: "stardust",
            collected: false,
            shimmer: Math.random() * Math.PI * 2,
          });
        }
      }

      // Spawn dream fragments (rare)
      if (Math.random() < 0.1) {
        this.collectibles.push({
          x: CANVAS_WIDTH + 100,
          y: GROUND_Y - 120 - Math.random() * 60,
          type: "fragment",
          collected: false,
          shimmer: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  private checkCollisions() {
    const playerRect = {
      x: this.playerX + 8,
      y: this.playerY + 8,
      width: PLAYER_SIZE - 16,
      height: PLAYER_SIZE - 16,
    };

    // Check obstacle collisions
    for (const obs of this.obstacles) {
      if (
        playerRect.x < obs.x + obs.width &&
        playerRect.x + playerRect.width > obs.x &&
        playerRect.y < obs.y + obs.height &&
        playerRect.y + playerRect.height > obs.y
      ) {
        this.gameOver();
        return;
      }
    }

    // Check collectible collection
    for (const col of this.collectibles) {
      if (col.collected) continue;

      const dist = Math.hypot(
        this.playerX + PLAYER_SIZE / 2 - col.x,
        this.playerY + PLAYER_SIZE / 2 - col.y
      );

      if (dist < 25) {
        col.collected = true;

        if (col.type === "stardust") {
          this.stardustCount++;
          this.createCollectParticles(col.x, col.y, "#ffd700");
        } else {
          this.fragmentCount++;
          this.colorShift = (this.colorShift + 60) % 360; // Shift color theme
          this.createCollectParticles(col.x, col.y, "#b19cd9");
        }
      }
    }
  }

  private createCollectParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color: color,
        size: 3,
      });
    }
  }

  private gameOver() {
    this.status = "over";
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.emitState();
  }

  private draw() {
    const ctx = this.ctx;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Dreamy gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    const hue1 = (this.colorShift + 240) % 360;
    const hue2 = (this.colorShift + 280) % 360;
    bgGrad.addColorStop(0, `hsl(${hue1}, 50%, 20%)`);
    bgGrad.addColorStop(0.5, `hsl(${hue2}, 45%, 25%)`);
    bgGrad.addColorStop(1, `hsl(${this.colorShift}, 40%, 15%)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw twinkling stars
    this.drawBackgroundStars();

    // Dreamy fog layers
    this.drawFogLayers();

    // Dream-like ground
    ctx.fillStyle = `hsl(${this.colorShift}, 30%, 25%)`;
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Glowing ground line
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y - 20, 0, GROUND_Y + 20);
    groundGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    groundGrad.addColorStop(0.5, `hsla(${this.colorShift}, 70%, 70%, 0.6)`);
    groundGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y - 20, w, 40);

    // Draw obstacles
    this.drawObstacles();

    // Draw collectibles
    this.drawCollectibles();

    // Draw player
    this.drawPlayer();

    // Draw particles
    this.drawParticles();

    // Float meter
    this.drawFloatMeter();
  }

  private drawBackgroundStars() {
    const ctx = this.ctx;

    for (const star of this.backgroundStars) {
      const alpha = 0.3 + Math.abs(Math.sin(star.twinkle)) * 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();

      // Twinkle effect
      if (alpha > 0.8) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(star.x - star.size * 2, star.y);
        ctx.lineTo(star.x + star.size * 2, star.y);
        ctx.moveTo(star.x, star.y - star.size * 2);
        ctx.lineTo(star.x, star.y + star.size * 2);
        ctx.stroke();
      }
    }
  }

  private drawFogLayers() {
    const ctx = this.ctx;

    for (let i = 0; i < 3; i++) {
      const y = 100 + i * 80 + Math.sin(this.dreamPhase + i) * 20;
      const grad = ctx.createLinearGradient(0, y - 50, 0, y + 50);
      grad.addColorStop(0, "rgba(255, 255, 255, 0)");
      grad.addColorStop(0.5, `hsla(${this.colorShift}, 50%, 70%, 0.1)`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 50, CANVAS_WIDTH, 100);
    }
  }

  private drawObstacles() {
    const ctx = this.ctx;

    for (const obs of this.obstacles) {
      ctx.save();

      if (obs.type === "cloud") {
        // Floating cloud
        const pulse = Math.sin(obs.pulsePhase || 0) * 5;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = `hsl(${this.colorShift}, 40%, 80%)`;

        // Draw puffy cloud
        ctx.beginPath();
        ctx.arc(obs.x + 15, obs.y + 15 + pulse, 15, 0, Math.PI * 2);
        ctx.arc(obs.x + 30, obs.y + 10 + pulse, 18, 0, Math.PI * 2);
        ctx.arc(obs.x + 45, obs.y + 15 + pulse, 15, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === "star") {
        // Rotating star
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        ctx.rotate(obs.rotation || 0);
        ctx.fillStyle = "#ffd700";
        ctx.strokeStyle = "#ffed4e";
        ctx.lineWidth = 2;

        // Draw 5-pointed star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const radius = i % 2 === 0 ? 20 : 10;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obs.type === "moon") {
        // Glowing moon
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        ctx.rotate(obs.rotation || 0);

        // Outer glow
        const moonGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
        moonGrad.addColorStop(0, "#f0f0ff");
        moonGrad.addColorStop(0.7, "#c0c0ff");
        moonGrad.addColorStop(1, "rgba(192, 192, 255, 0)");
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        // Moon surface
        ctx.fillStyle = "#e0e0ff";
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // Craters
        ctx.fillStyle = "rgba(180, 180, 220, 0.5)";
        ctx.beginPath();
        ctx.arc(-5, -5, 5, 0, Math.PI * 2);
        ctx.arc(7, 3, 4, 0, Math.PI * 2);
        ctx.arc(-2, 8, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === "nightmare") {
        // Dark nightmare obstacle
        const pulse = Math.sin(obs.pulsePhase || 0) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#2d132c";
        ctx.shadowColor = "#801336";
        ctx.shadowBlur = 15;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Menacing eyes
        ctx.fillStyle = "#ff0055";
        ctx.beginPath();
        ctx.arc(obs.x + 10, obs.y + 15, 4, 0, Math.PI * 2);
        ctx.arc(obs.x + 20, obs.y + 15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }
  }

  private drawCollectibles() {
    const ctx = this.ctx;

    for (const col of this.collectibles) {
      if (col.collected) continue;

      const shimmer = Math.sin(col.shimmer);

      if (col.type === "stardust") {
        // Glowing stardust
        const starGrad = ctx.createRadialGradient(col.x, col.y, 0, col.x, col.y, 12);
        starGrad.addColorStop(0, "#ffd700");
        starGrad.addColorStop(0.5, "#ffed4e");
        starGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
        ctx.fillStyle = starGrad;
        ctx.globalAlpha = 0.8 + shimmer * 0.2;
        ctx.beginPath();
        ctx.arc(col.x, col.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.abs(shimmer);
        ctx.beginPath();
        ctx.moveTo(col.x - 10, col.y);
        ctx.lineTo(col.x + 10, col.y);
        ctx.moveTo(col.x, col.y - 10);
        ctx.lineTo(col.x, col.y + 10);
        ctx.stroke();
      } else {
        // Dream fragment
        ctx.save();
        ctx.translate(col.x, col.y);
        ctx.rotate(col.shimmer);
        ctx.globalAlpha = 0.9 + shimmer * 0.1;

        // Crystal shape
        const fragGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        fragGrad.addColorStop(0, "#e0b3ff");
        fragGrad.addColorStop(0.6, "#b19cd9");
        fragGrad.addColorStop(1, "rgba(177, 156, 217, 0)");
        ctx.fillStyle = fragGrad;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        // Inner glow
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
  }

  private drawPlayer() {
    const ctx = this.ctx;

    // Phasing effect
    if (this.phaseTimer > 0) {
      ctx.globalAlpha = 0.3 + Math.sin(this.phaseTimer * 0.3) * 0.3;
    }

    // Player glow
    const playerGrad = ctx.createRadialGradient(
      this.playerX + PLAYER_SIZE / 2,
      this.playerY + PLAYER_SIZE / 2,
      0,
      this.playerX + PLAYER_SIZE / 2,
      this.playerY + PLAYER_SIZE / 2,
      PLAYER_SIZE
    );
    playerGrad.addColorStop(0, `hsla(${this.colorShift}, 70%, 70%, 0.8)`);
    playerGrad.addColorStop(0.7, `hsla(${this.colorShift}, 60%, 60%, 0.4)`);
    playerGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = playerGrad;
    ctx.beginPath();
    ctx.arc(
      this.playerX + PLAYER_SIZE / 2,
      this.playerY + PLAYER_SIZE / 2,
      PLAYER_SIZE * 0.7,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Player body
    ctx.fillStyle = `hsl(${this.colorShift}, 60%, 75%)`;
    ctx.beginPath();
    ctx.roundRect(this.playerX, this.playerY, PLAYER_SIZE, PLAYER_SIZE, 20);
    ctx.fill();

    // Player outline
    ctx.strokeStyle = `hsl(${this.colorShift}, 70%, 85%)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dream aura
    ctx.strokeStyle = `hsla(${this.colorShift}, 60%, 70%, 0.5)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const phase = this.dreamPhase + i * 0.5;
      const radius = PLAYER_SIZE / 2 + 5 + Math.sin(phase) * 5;
      ctx.globalAlpha = 0.3 - i * 0.1;
      ctx.beginPath();
      ctx.arc(
        this.playerX + PLAYER_SIZE / 2,
        this.playerY + PLAYER_SIZE / 2,
        radius,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawParticles() {
    const ctx = this.ctx;

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 40;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawFloatMeter() {
    const ctx = this.ctx;
    const meterX = 20;
    const meterY = 20;
    const meterWidth = 100;
    const meterHeight = 15;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(meterX, meterY, meterWidth, meterHeight, 8);
    ctx.fill();

    // Fill
    const fillWidth = (meterWidth - 4) * (1 - this.floatTimer / this.maxFloatTime);
    const fillGrad = ctx.createLinearGradient(meterX, 0, meterX + meterWidth, 0);
    fillGrad.addColorStop(0, `hsl(${this.colorShift}, 70%, 70%)`);
    fillGrad.addColorStop(1, `hsl(${(this.colorShift + 60) % 360}, 70%, 70%)`);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(meterX + 2, meterY + 2, fillWidth, meterHeight - 4, 6);
    ctx.fill();

    // Label
    ctx.fillStyle = "white";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "left";
    ctx.fillText("FLOAT", meterX, meterY - 5);
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
