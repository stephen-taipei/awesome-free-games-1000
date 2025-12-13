/**
 * Duo Run Game Engine
 * Game #397 - Dual character synchronized runner
 */

interface Obstacle {
  x: number;
  lane: "top" | "bottom";
  width: number;
  height: number;
}

interface Coin {
  x: number;
  lane: "top" | "bottom";
  collected: boolean;
}

export class DuoRunGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Game state
  private status: "idle" | "playing" | "gameover" = "idle";
  private score = 0;
  private distance = 0;
  private coins = 0;
  private speed = 5;
  private gameSpeed = 5;

  // Characters (top and bottom)
  private playerTop = {
    x: 80,
    y: 60,
    width: 24,
    height: 24,
    velocityY: 0,
    isJumping: false,
    grounded: true,
  };

  private playerBottom = {
    x: 80,
    y: 260,
    width: 24,
    height: 24,
    velocityY: 0,
    isJumping: false,
    grounded: true,
  };

  // Obstacles and coins
  private obstacles: Obstacle[] = [];
  private coinsList: Coin[] = [];

  // Game constants
  private readonly gravity = 0.8;
  private readonly jumpForce = -14;
  private readonly groundTopY = 84;
  private readonly groundBottomY = 284;
  private readonly maxSpeed = 12;
  private readonly speedIncrease = 0.001;

  private onStateChange: ((state: any) => void) | null = null;
  private animationId: number | null = null;
  private frameCount = 0;
  private spawnTimer = 0;
  private coinTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.setupInput();
  }

  private setupInput() {
    const handleJump = (e: KeyboardEvent | MouseEvent | TouchEvent) => {
      if (this.status === "playing") {
        if (e instanceof KeyboardEvent) {
          if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
            e.preventDefault();
            this.jump();
          }
        }
      }
    };

    window.addEventListener("keydown", handleJump);
    this.canvas.addEventListener("click", () => {
      if (this.status === "playing") {
        this.jump();
      }
    });
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.status === "playing") {
        this.jump();
      }
    });
  }

  private jump() {
    // Both characters jump simultaneously
    if (this.playerTop.grounded) {
      this.playerTop.velocityY = this.jumpForce;
      this.playerTop.isJumping = true;
      this.playerTop.grounded = false;
    }

    if (this.playerBottom.grounded) {
      this.playerBottom.velocityY = this.jumpForce;
      this.playerBottom.isJumping = true;
      this.playerBottom.grounded = false;
    }
  }

  public start() {
    this.status = "playing";
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.gameSpeed = 5;
    this.obstacles = [];
    this.coinsList = [];
    this.frameCount = 0;
    this.spawnTimer = 0;
    this.coinTimer = 0;

    // Reset players
    this.playerTop.y = this.groundTopY - this.playerTop.height;
    this.playerTop.velocityY = 0;
    this.playerTop.grounded = true;
    this.playerTop.isJumping = false;

    this.playerBottom.y = this.groundBottomY - this.playerBottom.height;
    this.playerBottom.velocityY = 0;
    this.playerBottom.grounded = true;
    this.playerBottom.isJumping = false;

    this.updateState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    this.update();
    this.draw();
    this.frameCount++;

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Increase difficulty
    if (this.gameSpeed < this.maxSpeed) {
      this.gameSpeed += this.speedIncrease;
    }

    // Update distance and score
    this.distance += this.gameSpeed * 0.1;
    this.score = Math.floor(this.distance);
    this.updateState();

    // Update top player
    this.updatePlayer(this.playerTop, this.groundTopY);

    // Update bottom player
    this.updatePlayer(this.playerBottom, this.groundBottomY);

    // Spawn obstacles
    this.spawnTimer++;
    if (this.spawnTimer > 90 - this.gameSpeed * 3) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // Spawn coins
    this.coinTimer++;
    if (this.coinTimer > 120) {
      this.spawnCoin();
      this.coinTimer = 0;
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;

      // Remove off-screen obstacles
      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Check collision
      const player = obs.lane === "top" ? this.playerTop : this.playerBottom;
      if (this.checkCollision(player, obs)) {
        this.gameOver();
        return;
      }
    }

    // Update coins
    for (let i = this.coinsList.length - 1; i >= 0; i--) {
      const coin = this.coinsList[i];
      coin.x -= this.gameSpeed;

      // Remove off-screen coins
      if (coin.x < -20) {
        this.coinsList.splice(i, 1);
        continue;
      }

      // Check collection
      if (!coin.collected) {
        const player = coin.lane === "top" ? this.playerTop : this.playerBottom;
        const coinY = coin.lane === "top" ? this.groundTopY - 30 : this.groundBottomY - 30;

        if (
          player.x < coin.x + 16 &&
          player.x + player.width > coin.x &&
          player.y < coinY + 16 &&
          player.y + player.height > coinY
        ) {
          coin.collected = true;
          this.coins++;
          this.updateState();
        }
      }
    }
  }

  private updatePlayer(player: typeof this.playerTop, groundY: number) {
    // Apply gravity
    if (!player.grounded) {
      player.velocityY += this.gravity;
      player.y += player.velocityY;

      // Landing
      if (player.y >= groundY - player.height) {
        player.y = groundY - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.isJumping = false;
      }
    }
  }

  private spawnObstacle() {
    const lane = Math.random() > 0.5 ? "top" : "bottom";
    const types = [
      { width: 30, height: 30 }, // Small box
      { width: 40, height: 40 }, // Medium box
      { width: 25, height: 50 }, // Tall obstacle
    ];

    const type = types[Math.floor(Math.random() * types.length)];

    this.obstacles.push({
      x: this.canvas.width,
      lane: lane,
      width: type.width,
      height: type.height,
    });
  }

  private spawnCoin() {
    const lane = Math.random() > 0.5 ? "top" : "bottom";

    this.coinsList.push({
      x: this.canvas.width,
      lane: lane,
      collected: false,
    });
  }

  private checkCollision(
    player: typeof this.playerTop,
    obstacle: Obstacle
  ): boolean {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < (obstacle.lane === "top" ? this.groundTopY : this.groundBottomY) &&
      player.y + player.height > (obstacle.lane === "top" ? this.groundTopY : this.groundBottomY) - obstacle.height
    );
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
        coins: this.coins,
      });
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(0.5, "#6366f1");
    gradient.addColorStop(0.5, "#059669");
    gradient.addColorStop(1, "#065f46");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Divider line
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ground lines
    this.drawGround(ctx, this.groundTopY, "#3b82f6");
    this.drawGround(ctx, this.groundBottomY, "#10b981");

    // Background elements (parallax clouds)
    this.drawClouds(ctx);

    // Obstacles
    for (const obs of this.obstacles) {
      this.drawObstacle(ctx, obs);
    }

    // Coins
    for (const coin of this.coinsList) {
      if (!coin.collected) {
        this.drawCoin(ctx, coin);
      }
    }

    // Players
    this.drawPlayer(ctx, this.playerTop, "#60a5fa");
    this.drawPlayer(ctx, this.playerBottom, "#34d399");

    // Speed indicator
    this.drawSpeedMeter(ctx);
  }

  private drawGround(ctx: CanvasRenderingContext2D, y: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.canvas.width, y);
    ctx.stroke();

    // Ground pattern
    ctx.fillStyle = color + "33";
    ctx.fillRect(0, y, this.canvas.width, 4);
  }

  private drawClouds(ctx: CanvasRenderingContext2D) {
    const offset = (this.frameCount * this.gameSpeed * 0.3) % 200;

    for (let i = 0; i < 4; i++) {
      const x = i * 200 - offset;
      const y = 30 + (i % 2) * 20;
      this.drawCloud(ctx, x, y);

      const y2 = 230 + (i % 2) * 20;
      this.drawCloud(ctx, x + 100, y2);
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 15, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 30, y, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: typeof this.playerTop,
    color: string
  ) {
    const legOffset = player.grounded ? Math.sin(this.frameCount * 0.3) * 3 : 0;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(player.x + 2, player.y + player.height, player.width - 4, 3);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(player.x + 4, player.y + 8, 16, 12);

    // Head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(player.x + 12, player.y + 6, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000";
    ctx.fillRect(player.x + 9, player.y + 4, 2, 2);
    ctx.fillRect(player.x + 13, player.y + 4, 2, 2);

    // Legs
    ctx.fillStyle = color;
    ctx.fillRect(player.x + 6, player.y + 20 + legOffset, 4, 4);
    ctx.fillRect(player.x + 14, player.y + 20 - legOffset, 4, 4);
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
    const y = obs.lane === "top" ? this.groundTopY - obs.height : this.groundBottomY - obs.height;

    // Obstacle gradient
    const gradient = ctx.createLinearGradient(obs.x, y, obs.x, y + obs.height);
    gradient.addColorStop(0, "#ef4444");
    gradient.addColorStop(1, "#991b1b");
    ctx.fillStyle = gradient;
    ctx.fillRect(obs.x, y, obs.width, obs.height);

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(obs.x + 2, y + 2, obs.width - 4, 4);

    // Border
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x, y, obs.width, obs.height);
  }

  private drawCoin(ctx: CanvasRenderingContext2D, coin: Coin) {
    const y = coin.lane === "top" ? this.groundTopY - 30 : this.groundBottomY - 30;
    const bounce = Math.sin(this.frameCount * 0.15) * 3;
    const rotation = (this.frameCount * 0.05) % (Math.PI * 2);

    ctx.save();
    ctx.translate(coin.x + 8, y + 8 + bounce);
    ctx.rotate(rotation);

    // Coin
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    gradient.addColorStop(0, "#fbbf24");
    gradient.addColorStop(1, "#f59e0b");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSpeedMeter(ctx: CanvasRenderingContext2D) {
    const x = this.canvas.width - 120;
    const y = this.canvas.height / 2 - 30;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, 100, 8);

    const speedPercent = (this.gameSpeed / this.maxSpeed) * 100;
    const gradient = ctx.createLinearGradient(x, y, x + speedPercent, y);
    gradient.addColorStop(0, "#10b981");
    gradient.addColorStop(0.5, "#fbbf24");
    gradient.addColorStop(1, "#ef4444");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, speedPercent, 8);

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "8px monospace";
    ctx.textAlign = "right";
    ctx.fillText("SPEED", x + 100, y - 2);
  }

  public resize() {
    this.canvas.width = 600;
    this.canvas.height = 400;
    if (this.status === "idle") {
      this.draw();
    }
  }

  public reset() {
    this.start();
  }

  public getScore(): number {
    return this.score;
  }

  public getCoins(): number {
    return this.coins;
  }

  public setOnStateChange(cb: (state: any) => void) {
    this.onStateChange = cb;
  }

  public destroy() {
    this.stopAnimation();
  }
}
