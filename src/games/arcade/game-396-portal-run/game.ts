/**
 * Portal Run Game Engine
 * Game #396
 *
 * A parkour game with portal mechanics - jump, slide, and teleport through obstacles!
 */

interface Point {
  x: number;
  y: number;
}

type PlayerState = "running" | "jumping" | "sliding" | "teleporting";
type PortalColor = "blue" | "orange";

interface Portal {
  x: number;
  y: number;
  color: PortalColor;
  active: boolean;
  rotation: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "spike" | "pit" | "platform" | "wall";
  moving?: boolean;
  moveY?: number;
  moveSpeed?: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface GameState {
  distance: number;
  coins: number;
  score: number;
  highScore: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320;
const PLAYER_SIZE = 40;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const RUN_SPEED = 6;
const PORTAL_RADIUS = 30;
const SPAWN_DISTANCE = 200;

export class PortalRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private playerX = 100;
  private playerY = GROUND_Y - PLAYER_SIZE;
  private playerVelY = 0;
  private playerState: PlayerState = "running";
  private slideTimer = 0;
  private teleportTimer = 0;

  private bluePortal: Portal | null = null;
  private orangePortal: Portal | null = null;
  private nextPortalColor: PortalColor = "blue";

  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

  private distance = 0;
  private coinCount = 0;
  private score = 0;
  private highScore = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationFrame: number | null = null;
  private lastSpawnX = 0;
  private difficulty = 1;
  private backgroundOffset = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("portalrun_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("portalrun_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        distance: Math.floor(this.distance / 10),
        coins: this.coinCount,
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
    this.slideTimer = 0;
    this.teleportTimer = 0;

    this.bluePortal = null;
    this.orangePortal = null;
    this.nextPortalColor = "blue";

    this.obstacles = [];
    this.coins = [];
    this.particles = [];
    this.distance = 0;
    this.coinCount = 0;
    this.score = 0;
    this.lastSpawnX = CANVAS_WIDTH;
    this.difficulty = 1;
    this.backgroundOffset = 0;

    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  jump() {
    if (this.status !== "playing") return;
    if (this.playerState === "running" && this.playerY >= GROUND_Y - PLAYER_SIZE - 2) {
      this.playerVelY = JUMP_FORCE;
      this.playerState = "jumping";
    }
  }

  slide() {
    if (this.status !== "playing") return;
    if (this.playerState === "running") {
      this.playerState = "sliding";
      this.slideTimer = 30;
    }
  }

  placePortal(x: number, y: number) {
    if (this.status !== "playing") return;
    if (this.teleportTimer > 0) return;

    const portal: Portal = {
      x: x,
      y: y,
      color: this.nextPortalColor,
      active: true,
      rotation: 0,
    };

    if (this.nextPortalColor === "blue") {
      this.bluePortal = portal;
      this.nextPortalColor = "orange";
    } else {
      this.orangePortal = portal;
      this.nextPortalColor = "blue";
    }

    // Create placement particles
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color: portal.color === "blue" ? "#00a8ff" : "#ff6348",
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

    // Update distance and difficulty
    this.distance += RUN_SPEED;
    this.difficulty = 1 + Math.floor(this.distance / 2000) * 0.3;
    this.backgroundOffset = (this.backgroundOffset + RUN_SPEED * 0.3) % CANVAS_WIDTH;

    // Update score
    this.score = Math.floor(this.distance / 10) + this.coinCount * 10;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.emitState();

    // Update player physics
    if (this.slideTimer > 0) {
      this.slideTimer--;
      if (this.slideTimer === 0) {
        this.playerState = "running";
      }
    }

    if (this.teleportTimer > 0) {
      this.teleportTimer--;
      if (this.teleportTimer === 0) {
        this.playerState = "running";
      }
    }

    if (this.playerState !== "sliding") {
      this.playerVelY += GRAVITY;
      this.playerY += this.playerVelY;

      // Ground collision
      if (this.playerY >= GROUND_Y - PLAYER_SIZE) {
        this.playerY = GROUND_Y - PLAYER_SIZE;
        this.playerVelY = 0;
        if (this.playerState === "jumping") {
          this.playerState = "running";
        }
      }
    }

    // Portal teleportation
    this.checkPortalTeleport();

    // Update obstacles
    this.updateObstacles();

    // Update coins
    this.updateCoins();

    // Update particles
    this.updateParticles();

    // Spawn new obstacles and coins
    this.spawnContent();

    // Check collisions
    this.checkCollisions();

    // Update portal rotation
    if (this.bluePortal) this.bluePortal.rotation += 0.05;
    if (this.orangePortal) this.orangePortal.rotation += 0.05;
  }

  private checkPortalTeleport() {
    if (this.teleportTimer > 0) return;

    const playerCenterX = this.playerX + PLAYER_SIZE / 2;
    const playerCenterY = this.playerY + PLAYER_SIZE / 2;

    // Check blue portal entry
    if (this.bluePortal && this.orangePortal) {
      const distBlue = Math.hypot(
        playerCenterX - this.bluePortal.x,
        playerCenterY - this.bluePortal.y
      );

      if (distBlue < PORTAL_RADIUS) {
        // Teleport to orange portal
        this.playerX = this.orangePortal.x - PLAYER_SIZE / 2;
        this.playerY = this.orangePortal.y - PLAYER_SIZE / 2;
        this.playerState = "teleporting";
        this.teleportTimer = 20;

        // Create teleport particles
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          this.particles.push({
            x: this.orangePortal.x,
            y: this.orangePortal.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20,
            color: "#ff6348",
          });
        }
      }
    }

    // Check orange portal entry
    if (this.orangePortal && this.bluePortal) {
      const distOrange = Math.hypot(
        playerCenterX - this.orangePortal.x,
        playerCenterY - this.orangePortal.y
      );

      if (distOrange < PORTAL_RADIUS && this.teleportTimer === 0) {
        // Teleport to blue portal
        this.playerX = this.bluePortal.x - PLAYER_SIZE / 2;
        this.playerY = this.bluePortal.y - PLAYER_SIZE / 2;
        this.playerState = "teleporting";
        this.teleportTimer = 20;

        // Create teleport particles
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          this.particles.push({
            x: this.bluePortal.x,
            y: this.bluePortal.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20,
            color: "#00a8ff",
          });
        }
      }
    }
  }

  private updateObstacles() {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= RUN_SPEED;

      // Move moving platforms
      if (obs.moving && obs.moveY !== undefined && obs.moveSpeed !== undefined) {
        obs.y += obs.moveSpeed;
        if (obs.y > obs.moveY + 50 || obs.y < obs.moveY - 50) {
          obs.moveSpeed *= -1;
        }
      }

      // Remove off-screen obstacles
      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCoins() {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.x -= RUN_SPEED;

      // Remove off-screen coins
      if (coin.x < -20) {
        this.coins.splice(i, 1);
      }
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
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
        // Spawn spike
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - 30,
          width: 40,
          height: 30,
          type: "spike",
        });
      } else if (rand < 0.5) {
        // Spawn pit
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y,
          width: 80 + Math.random() * 40,
          height: 100,
          type: "pit",
        });
      } else if (rand < 0.7) {
        // Spawn wall
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: GROUND_Y - 80,
          width: 20,
          height: 80,
          type: "wall",
        });
      } else {
        // Spawn moving platform
        const moveY = GROUND_Y - 120 - Math.random() * 40;
        this.obstacles.push({
          x: CANVAS_WIDTH,
          y: moveY,
          width: 60,
          height: 15,
          type: "platform",
          moving: true,
          moveY: moveY,
          moveSpeed: 2,
        });
      }

      // Spawn coins
      if (Math.random() < 0.4) {
        const coinX = CANVAS_WIDTH + 50;
        const numCoins = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numCoins; i++) {
          this.coins.push({
            x: coinX + i * 30,
            y: GROUND_Y - 100 - Math.random() * 80,
            collected: false,
          });
        }
      }
    }
  }

  private checkCollisions() {
    const playerHeight = this.playerState === "sliding" ? PLAYER_SIZE / 2 : PLAYER_SIZE;
    const playerRect = {
      x: this.playerX + 5,
      y: this.playerState === "sliding" ? this.playerY + PLAYER_SIZE / 2 : this.playerY,
      width: PLAYER_SIZE - 10,
      height: playerHeight - 10,
    };

    // Check obstacle collisions
    for (const obs of this.obstacles) {
      if (obs.type === "platform") continue; // Platforms don't hurt

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

    // Check pit falls
    for (const obs of this.obstacles) {
      if (obs.type === "pit") {
        if (
          this.playerX + PLAYER_SIZE > obs.x &&
          this.playerX < obs.x + obs.width &&
          this.playerY + PLAYER_SIZE >= GROUND_Y
        ) {
          this.gameOver();
          return;
        }
      }
    }

    // Check coin collection
    for (const coin of this.coins) {
      if (coin.collected) continue;

      const dist = Math.hypot(
        this.playerX + PLAYER_SIZE / 2 - coin.x,
        this.playerY + PLAYER_SIZE / 2 - coin.y
      );

      if (dist < 25) {
        coin.collected = true;
        this.coinCount++;

        // Create coin particles
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2 + 1;
          this.particles.push({
            x: coin.x,
            y: coin.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20,
            color: "#ffd700",
          });
        }
      }
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

    // Background - sci-fi gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#0a1628");
    bgGrad.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Parallax background stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 50; i++) {
      const x = ((i * 73) % w + this.backgroundOffset * 0.5) % w;
      const y = (i * 37) % h;
      ctx.fillRect(x, y, 2, 2);
    }

    // Ground
    ctx.fillStyle = "#2d4059";
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Ground line
    ctx.strokeStyle = "#00a8ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(w, GROUND_Y);
    ctx.stroke();

    // Grid pattern on ground
    ctx.strokeStyle = "rgba(0, 168, 255, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      const offset = (i + this.backgroundOffset) % 40;
      ctx.beginPath();
      ctx.moveTo(i - offset, GROUND_Y);
      ctx.lineTo(i - offset, h);
      ctx.stroke();
    }

    // Draw obstacles
    this.drawObstacles();

    // Draw coins
    this.drawCoins();

    // Draw portals
    this.drawPortals();

    // Draw player
    this.drawPlayer();

    // Draw particles
    this.drawParticles();
  }

  private drawObstacles() {
    const ctx = this.ctx;

    for (const obs of this.obstacles) {
      if (obs.type === "spike") {
        // Draw spikes
        ctx.fillStyle = "#ff4757";
        ctx.beginPath();
        for (let i = 0; i < obs.width; i += 20) {
          ctx.moveTo(obs.x + i, obs.y + obs.height);
          ctx.lineTo(obs.x + i + 10, obs.y);
          ctx.lineTo(obs.x + i + 20, obs.y + obs.height);
        }
        ctx.closePath();
        ctx.fill();

        // Spike outline
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (obs.type === "pit") {
        // Draw pit
        ctx.fillStyle = "#000";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Danger stripes
        ctx.strokeStyle = "#ffa502";
        ctx.lineWidth = 3;
        for (let i = 0; i < obs.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(obs.x + i, obs.y);
          ctx.lineTo(obs.x + i + 10, obs.y + 10);
          ctx.stroke();
        }
      } else if (obs.type === "wall") {
        // Draw wall
        ctx.fillStyle = "#34495e";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Wall panels
        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 2;
        for (let i = 0; i < obs.height; i += 20) {
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + i);
          ctx.lineTo(obs.x + obs.width, obs.y + i);
          ctx.stroke();
        }
      } else if (obs.type === "platform") {
        // Draw moving platform
        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Platform glow
        ctx.shadowColor = "#00d2d3";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#00a8ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawCoins() {
    const ctx = this.ctx;

    for (const coin of this.coins) {
      if (coin.collected) continue;

      // Coin rotation effect
      const time = Date.now() / 1000;
      const scale = Math.abs(Math.sin(time * 3 + coin.x / 100));

      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.scale(0.3 + scale * 0.7, 1);

      // Outer ring
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      // Inner ring
      ctx.fillStyle = "#ffed4e";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPortals() {
    const ctx = this.ctx;

    const drawPortal = (portal: Portal) => {
      ctx.save();
      ctx.translate(portal.x, portal.y);
      ctx.rotate(portal.rotation);

      // Outer glow
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, PORTAL_RADIUS + 10);
      gradient.addColorStop(0, portal.color === "blue" ? "rgba(0, 168, 255, 0.5)" : "rgba(255, 99, 72, 0.5)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, PORTAL_RADIUS + 10, 0, Math.PI * 2);
      ctx.fill();

      // Portal ring
      ctx.strokeStyle = portal.color === "blue" ? "#00a8ff" : "#ff6348";
      ctx.lineWidth = 5;
      ctx.shadowColor = portal.color === "blue" ? "#00a8ff" : "#ff6348";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, PORTAL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Inner swirl
      for (let i = 0; i < 5; i++) {
        const angle = portal.rotation * 3 + (i * Math.PI * 2) / 5;
        const r = PORTAL_RADIUS * 0.6;
        ctx.strokeStyle = portal.color === "blue"
          ? `rgba(0, 168, 255, ${0.8 - i * 0.15})`
          : `rgba(255, 99, 72, ${0.8 - i * 0.15})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * r * 0.3,
          Math.sin(angle) * r * 0.3,
          r,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    };

    if (this.bluePortal) {
      drawPortal(this.bluePortal);
    }

    if (this.orangePortal) {
      drawPortal(this.orangePortal);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;

    if (this.teleportTimer > 0) {
      // Teleporting effect
      ctx.globalAlpha = 0.5 + Math.sin(this.teleportTimer * 0.5) * 0.5;
    }

    const playerHeight = this.playerState === "sliding" ? PLAYER_SIZE / 2 : PLAYER_SIZE;
    const playerY = this.playerState === "sliding" ? this.playerY + PLAYER_SIZE / 2 : this.playerY;

    // Player body
    ctx.fillStyle = "#00d2d3";
    ctx.beginPath();
    ctx.roundRect(this.playerX, playerY, PLAYER_SIZE, playerHeight, 8);
    ctx.fill();

    // Player outline
    ctx.strokeStyle = "#00a8ff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Player visor
    if (this.playerState !== "sliding") {
      ctx.fillStyle = "#0984e3";
      ctx.beginPath();
      ctx.roundRect(
        this.playerX + 10,
        this.playerY + 8,
        PLAYER_SIZE - 20,
        15,
        5
      );
      ctx.fill();
    }

    // Energy lines
    ctx.strokeStyle = "#00a8ff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const y = playerY + playerHeight * 0.3 + i * 8;
      ctx.beginPath();
      ctx.moveTo(this.playerX + 5, y);
      ctx.lineTo(this.playerX + PLAYER_SIZE - 5, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private drawParticles() {
    const ctx = this.ctx;

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
