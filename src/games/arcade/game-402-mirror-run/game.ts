/**
 * Mirror Run Game Engine
 * Game #402 - Mirror world parkour
 */

interface Obstacle {
  x: number;
  lane: "top" | "bottom";
  collected?: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export class MirrorRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Player states - two mirrored characters
  private topPlayer = {
    x: 100,
    y: 120,
    vy: 0,
    width: 30,
    height: 40,
    isJumping: false,
    onGround: true,
  };

  private bottomPlayer = {
    x: 100,
    y: 280,
    vy: 0,
    width: 30,
    height: 40,
    isJumping: false,
    onGround: true,
  };

  private groundY = 160; // Top player ground
  private mirrorGroundY = 240; // Bottom player ground (mirrored)
  private jumpForce = -12;
  private gravity = 0.6;
  private scrollSpeed = 4;
  private gameSpeed = 4;

  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private score = 0;
  private distance = 0;
  private status: "idle" | "playing" | "gameover" = "idle";

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;
  private obstacleSpawnTimer = 0;
  private coinSpawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const handleJump = () => {
      if (this.status === "playing") {
        this.jump();
      }
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        handleJump();
      }
    });

    this.canvas.addEventListener("click", handleJump);
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleJump();
    });
  }

  private jump() {
    // Both players jump simultaneously (mirrored)
    if (this.topPlayer.onGround) {
      this.topPlayer.vy = this.jumpForce;
      this.topPlayer.isJumping = true;
      this.topPlayer.onGround = false;
    }

    if (this.bottomPlayer.onGround) {
      this.bottomPlayer.vy = -this.jumpForce; // Inverted for mirror effect
      this.bottomPlayer.isJumping = true;
      this.bottomPlayer.onGround = false;
    }
  }

  public start() {
    this.reset();
    this.status = "playing";
    this.gameLoop();
  }

  private reset() {
    this.topPlayer.y = this.groundY - this.topPlayer.height;
    this.topPlayer.vy = 0;
    this.topPlayer.onGround = true;
    this.topPlayer.isJumping = false;

    this.bottomPlayer.y = this.mirrorGroundY;
    this.bottomPlayer.vy = 0;
    this.bottomPlayer.onGround = true;
    this.bottomPlayer.isJumping = false;

    this.obstacles = [];
    this.coins = [];
    this.score = 0;
    this.distance = 0;
    this.frameCount = 0;
    this.obstacleSpawnTimer = 0;
    this.coinSpawnTimer = 0;
    this.gameSpeed = 4;

    this.updateState();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update distance and speed
    this.distance += this.gameSpeed;
    this.gameSpeed = Math.min(4 + this.distance / 1000, 8);

    // Update top player physics
    this.topPlayer.vy += this.gravity;
    this.topPlayer.y += this.topPlayer.vy;

    if (this.topPlayer.y >= this.groundY - this.topPlayer.height) {
      this.topPlayer.y = this.groundY - this.topPlayer.height;
      this.topPlayer.vy = 0;
      this.topPlayer.onGround = true;
      this.topPlayer.isJumping = false;
    } else {
      this.topPlayer.onGround = false;
    }

    // Update bottom player physics (mirrored gravity)
    this.bottomPlayer.vy -= this.gravity;
    this.bottomPlayer.y += this.bottomPlayer.vy;

    if (this.bottomPlayer.y <= this.mirrorGroundY) {
      this.bottomPlayer.y = this.mirrorGroundY;
      this.bottomPlayer.vy = 0;
      this.bottomPlayer.onGround = true;
      this.bottomPlayer.isJumping = false;
    } else {
      this.bottomPlayer.onGround = false;
    }

    // Spawn obstacles
    this.obstacleSpawnTimer++;
    if (this.obstacleSpawnTimer > 80 - this.gameSpeed * 5) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    // Spawn coins
    this.coinSpawnTimer++;
    if (this.coinSpawnTimer > 120) {
      this.spawnCoin();
      this.coinSpawnTimer = 0;
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;

      if (obs.x + 30 < 0) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Check collision
      this.checkObstacleCollision(obs);
    }

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.x -= this.gameSpeed;

      if (coin.x + 20 < 0) {
        this.coins.splice(i, 1);
        continue;
      }

      if (!coin.collected) {
        this.checkCoinCollision(coin);
      }
    }
  }

  private spawnObstacle() {
    const lane = Math.random() < 0.5 ? "top" : "bottom";
    this.obstacles.push({
      x: this.canvas.width,
      lane: lane,
    });
  }

  private spawnCoin() {
    // Spawn coins in the air
    const isTop = Math.random() < 0.5;
    const y = isTop
      ? this.groundY - 80 - Math.random() * 40
      : this.mirrorGroundY + 80 + Math.random() * 40;

    this.coins.push({
      x: this.canvas.width,
      y: y,
      collected: false,
    });
  }

  private checkObstacleCollision(obs: Obstacle) {
    const player = obs.lane === "top" ? this.topPlayer : this.bottomPlayer;

    if (
      obs.x < player.x + player.width &&
      obs.x + 30 > player.x
    ) {
      const obsY = obs.lane === "top" ? this.groundY - 35 : this.mirrorGroundY;
      const obsHeight = 35;

      if (
        player.y + player.height > obsY &&
        player.y < obsY + obsHeight
      ) {
        this.gameOver();
      }
    }
  }

  private checkCoinCollision(coin: Coin) {
    // Check collision with both players
    const checkPlayer = (player: typeof this.topPlayer) => {
      const dx = coin.x + 10 - (player.x + player.width / 2);
      const dy = coin.y + 10 - (player.y + player.height / 2);
      return Math.hypot(dx, dy) < 25;
    };

    if (checkPlayer(this.topPlayer) || checkPlayer(this.bottomPlayer)) {
      coin.collected = true;
      this.score += 10;
      this.updateState();
    }
  }

  private gameOver() {
    this.status = "gameover";
    this.stopAnimation();
    if (this.onStateChange) {
      this.onStateChange({ status: "gameover" });
    }
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        distance: Math.floor(this.distance / 10),
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Moving grid background
    this.drawGrid();

    // Draw grounds
    this.drawGround();

    // Draw mirror line (center divider)
    this.drawMirrorLine();

    // Draw obstacles
    for (const obs of this.obstacles) {
      this.drawObstacle(ctx, obs);
    }

    // Draw coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        this.drawCoin(ctx, coin);
      }
    }

    // Draw players
    this.drawPlayer(ctx, this.topPlayer, false);
    this.drawPlayer(ctx, this.bottomPlayer, true);
  }

  private drawGrid() {
    const ctx = this.ctx;
    const offset = (this.frameCount * this.gameSpeed) % 40;

    ctx.strokeStyle = "rgba(100, 200, 255, 0.1)";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = -offset; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < this.canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
  }

  private drawGround() {
    const ctx = this.ctx;

    // Top ground
    ctx.fillStyle = "#2a2a3e";
    ctx.fillRect(0, this.groundY, this.canvas.width, 5);

    // Bottom ground (mirrored)
    ctx.fillStyle = "#2a2a3e";
    ctx.fillRect(0, this.mirrorGroundY - 5, this.canvas.width, 5);
  }

  private drawMirrorLine() {
    const ctx = this.ctx;
    const centerY = this.canvas.height / 2;

    // Shiny mirror effect
    const gradient = ctx.createLinearGradient(0, centerY - 3, 0, centerY + 3);
    gradient.addColorStop(0, "rgba(200, 220, 255, 0.1)");
    gradient.addColorStop(0.5, "rgba(200, 220, 255, 0.5)");
    gradient.addColorStop(1, "rgba(200, 220, 255, 0.1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, centerY - 3, this.canvas.width, 6);

    // Animated shine
    const shineX = (this.frameCount * 3) % this.canvas.width;
    const shineGradient = ctx.createLinearGradient(shineX - 50, 0, shineX + 50, 0);
    shineGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    shineGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
    shineGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = shineGradient;
    ctx.fillRect(shineX - 50, centerY - 3, 100, 6);
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    const obsY = obs.lane === "top" ? this.groundY - 35 : this.mirrorGroundY;

    // Obstacle body
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(obs.x, obsY, 30, 35);

    // Highlight
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(obs.x + 2, obsY + 2, 26, 5);

    // Shadow
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(obs.x + 2, obsY + 28, 26, 5);
  }

  private drawCoin(ctx: CanvasRenderingContext2D, coin: Coin) {
    const bounce = Math.sin(this.frameCount * 0.1 + coin.x * 0.1) * 3;

    // Outer glow
    ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(coin.x + 10, coin.y + 10 + bounce, 15, 0, Math.PI * 2);
    ctx.fill();

    // Coin body
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(coin.x + 10, coin.y + 10 + bounce, 10, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(coin.x + 6, coin.y + 6 + bounce, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: typeof this.topPlayer, isMirrored: boolean) {
    ctx.save();

    // Player body
    ctx.fillStyle = "#3498db";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player head
    ctx.fillStyle = "#2980b9";
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x + 8, player.y + 6, 5, 5);
    ctx.fillRect(player.x + 17, player.y + 6, 5, 5);

    // Pupils
    ctx.fillStyle = "#000";
    ctx.fillRect(player.x + 10, player.y + 8, 2, 2);
    ctx.fillRect(player.x + 19, player.y + 8, 2, 2);

    // Legs (animated)
    const legOffset = player.onGround ? Math.sin(this.frameCount * 0.3) * 3 : 0;
    ctx.fillStyle = "#2980b9";
    ctx.fillRect(player.x + 5 + legOffset, player.y + player.height, 8, 4);
    ctx.fillRect(player.x + 17 - legOffset, player.y + player.height, 8, 4);

    // Speed trail
    if (!player.onGround) {
      ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
      for (let i = 1; i <= 3; i++) {
        ctx.fillRect(
          player.x - i * 10,
          player.y + player.height / 2 - 5,
          8,
          10
        );
      }
    }

    ctx.restore();
  }

  public resize() {
    this.canvas.width = 600;
    this.canvas.height = 400;
    this.draw();
  }

  public getScore(): number {
    return this.score;
  }

  public getDistance(): number {
    return Math.floor(this.distance / 10);
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
