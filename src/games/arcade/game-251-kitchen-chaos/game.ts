/**
 * Kitchen Chaos Game Engine
 * Game #251
 *
 * Manage a busy kitchen - prepare and serve orders before time runs out
 */

interface Order {
  id: number;
  items: string[];
  timeLeft: number;
  maxTime: number;
  x: number;
  completed: boolean;
}

interface Ingredient {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreparedItem {
  type: string;
  x: number;
  y: number;
}

interface GameState {
  score: number;
  highScore: number;
  ordersCompleted: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const FOOD_TYPES = ["burger", "pizza", "salad", "sushi", "taco"];
const FOOD_COLORS: Record<string, string> = {
  burger: "#D2691E",
  pizza: "#FF6347",
  salad: "#32CD32",
  sushi: "#FF69B4",
  taco: "#FFD700",
};
const FOOD_ICONS: Record<string, string> = {
  burger: "🍔",
  pizza: "🍕",
  salad: "🥗",
  sushi: "🍣",
  taco: "🌮",
};

export class KitchenChaosGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private orders: Order[] = [];
  private ingredients: Ingredient[] = [];
  private preparedItems: PreparedItem[] = [];
  private servingArea: { x: number; y: number; width: number; height: number } | null = null;
  private score = 0;
  private highScore = 0;
  private ordersCompleted = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private orderSpawnTimer = 0;
  private orderIdCounter = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; text: string }[] = [];
  private draggedItem: { type: string; x: number; y: number } | null = null;
  private dragOffset = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("kitchen_chaos_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("kitchen_chaos_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        ordersCompleted: this.ordersCompleted,
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
    this.initIngredients();
    this.draw();
  }

  private initIngredients() {
    this.ingredients = [];
    const ingredientWidth = 60;
    const ingredientHeight = 60;
    const startX = 20;
    const y = this.height - 90;

    FOOD_TYPES.forEach((type, i) => {
      this.ingredients.push({
        type,
        x: startX + i * (ingredientWidth + 15),
        y,
        width: ingredientWidth,
        height: ingredientHeight,
      });
    });

    // Serving area
    this.servingArea = {
      x: this.width - 100,
      y: this.height - 150,
      width: 80,
      height: 80,
    };
  }

  handlePointerDown(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check prepared items first
    for (let i = this.preparedItems.length - 1; i >= 0; i--) {
      const item = this.preparedItems[i];
      if (x >= item.x - 25 && x <= item.x + 25 && y >= item.y - 25 && y <= item.y + 25) {
        this.draggedItem = { type: item.type, x: item.x, y: item.y };
        this.dragOffset = { x: x - item.x, y: y - item.y };
        this.preparedItems.splice(i, 1);
        return;
      }
    }

    // Check ingredients
    for (const ing of this.ingredients) {
      if (x >= ing.x && x <= ing.x + ing.width && y >= ing.y && y <= ing.y + ing.height) {
        this.draggedItem = { type: ing.type, x, y };
        this.dragOffset = { x: 0, y: 0 };
        return;
      }
    }
  }

  handlePointerMove(x: number, y: number) {
    if (this.draggedItem) {
      this.draggedItem.x = x - this.dragOffset.x;
      this.draggedItem.y = y - this.dragOffset.y;
    }
  }

  handlePointerUp(x: number, y: number) {
    if (!this.draggedItem) return;

    // Check if dropped in serving area
    if (
      this.servingArea &&
      x >= this.servingArea.x &&
      x <= this.servingArea.x + this.servingArea.width &&
      y >= this.servingArea.y &&
      y <= this.servingArea.y + this.servingArea.height
    ) {
      this.serveItem(this.draggedItem.type);
    } else if (y < this.height - 120) {
      // Dropped in prep area
      this.preparedItems.push({
        type: this.draggedItem.type,
        x: this.draggedItem.x,
        y: this.draggedItem.y,
      });
    }

    this.draggedItem = null;
  }

  private serveItem(type: string) {
    // Find matching order
    for (const order of this.orders) {
      if (order.completed) continue;

      const itemIndex = order.items.indexOf(type);
      if (itemIndex !== -1) {
        order.items.splice(itemIndex, 1);

        // Spawn particles
        this.particles.push({
          x: this.servingArea!.x + this.servingArea!.width / 2,
          y: this.servingArea!.y,
          vx: 0,
          vy: -2,
          life: 1,
          text: "+10",
        });

        this.score += 10;

        if (order.items.length === 0) {
          // Order complete
          order.completed = true;
          this.ordersCompleted++;

          // Time bonus
          const timeBonus = Math.floor(order.timeLeft / order.maxTime * 50);
          this.score += timeBonus;

          this.particles.push({
            x: order.x + 40,
            y: 60,
            vx: 0,
            vy: -3,
            life: 1,
            text: `+${timeBonus}`,
          });

          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }
        }

        this.emitState();
        return;
      }
    }
  }

  start() {
    this.score = 0;
    this.ordersCompleted = 0;
    this.orders = [];
    this.preparedItems = [];
    this.particles = [];
    this.orderSpawnTimer = 0;
    this.orderIdCounter = 0;
    this.initIngredients();
    this.status = "playing";
    this.lastTime = performance.now();
    this.emitState();
    this.gameLoop();
  }

  private gameLoop() {
    if (this.status !== "playing") return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number) {
    // Spawn orders
    this.orderSpawnTimer += dt;
    const spawnInterval = Math.max(3000, 6000 - this.ordersCompleted * 200);

    if (this.orderSpawnTimer >= spawnInterval && this.orders.filter((o) => !o.completed).length < 4) {
      this.spawnOrder();
      this.orderSpawnTimer = 0;
    }

    // Update orders
    for (const order of this.orders) {
      if (!order.completed) {
        order.timeLeft -= dt;

        if (order.timeLeft <= 0) {
          // Order expired
          this.gameOver();
          return;
        }
      }
    }

    // Remove completed orders
    this.orders = this.orders.filter((o) => !o.completed || o.timeLeft > -500);

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private spawnOrder() {
    const itemCount = Math.min(3, 1 + Math.floor(this.ordersCompleted / 5));
    const items: string[] = [];

    for (let i = 0; i < itemCount; i++) {
      items.push(FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)]);
    }

    const activeOrders = this.orders.filter((o) => !o.completed);
    const x = 20 + activeOrders.length * 100;

    this.orders.push({
      id: this.orderIdCounter++,
      items,
      timeLeft: 15000 - Math.min(this.ordersCompleted * 500, 7000),
      maxTime: 15000 - Math.min(this.ordersCompleted * 500, 7000),
      x,
      completed: false,
    });
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

    // Background - kitchen tiles
    ctx.fillStyle = "#F5F5DC";
    ctx.fillRect(0, 0, this.width, this.height);

    // Tile pattern
    ctx.strokeStyle = "#DDD";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      for (let y = 0; y < this.height; y += 40) {
        ctx.strokeRect(x, y, 40, 40);
      }
    }

    // Order area
    ctx.fillStyle = "#4a4a4a";
    ctx.fillRect(0, 0, this.width, 100);

    // Draw orders
    for (const order of this.orders) {
      if (!order.completed) {
        this.drawOrder(order);
      }
    }

    // Prep area
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, 100, this.width, this.height - 200);

    // Counter
    ctx.fillStyle = "#A0522D";
    ctx.fillRect(0, this.height - 100, this.width, 100);

    // Draw ingredients
    for (const ing of this.ingredients) {
      this.drawIngredient(ing);
    }

    // Draw serving area
    if (this.servingArea) {
      ctx.fillStyle = "rgba(46, 204, 113, 0.3)";
      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(
        this.servingArea.x,
        this.servingArea.y,
        this.servingArea.width,
        this.servingArea.height,
        8
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#2ecc71";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SERVE", this.servingArea.x + this.servingArea.width / 2, this.servingArea.y + 45);
    }

    // Draw prepared items
    for (const item of this.preparedItems) {
      this.drawFoodItem(item.type, item.x, item.y);
    }

    // Draw dragged item
    if (this.draggedItem) {
      ctx.globalAlpha = 0.8;
      this.drawFoodItem(this.draggedItem.type, this.draggedItem.x, this.draggedItem.y);
      ctx.globalAlpha = 1;
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawOrder(order: Order) {
    const ctx = this.ctx;
    const x = order.x;
    const y = 10;
    const width = 90;
    const height = 80;

    // Order card
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Time bar
    const timeRatio = order.timeLeft / order.maxTime;
    const barColor = timeRatio > 0.5 ? "#2ecc71" : timeRatio > 0.25 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, width * timeRatio, 6);

    // Order items
    const itemSize = 24;
    const startX = x + 10;
    let itemY = y + 20;

    for (const item of order.items) {
      ctx.font = `${itemSize}px sans-serif`;
      ctx.fillText(FOOD_ICONS[item], startX, itemY + itemSize);
      itemY += itemSize + 5;
    }
  }

  private drawIngredient(ing: Ingredient) {
    const ctx = this.ctx;

    // Container
    ctx.fillStyle = FOOD_COLORS[ing.type];
    ctx.beginPath();
    ctx.roundRect(ing.x, ing.y, ing.width, ing.height, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon
    ctx.font = "36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(FOOD_ICONS[ing.type], ing.x + ing.width / 2, ing.y + ing.height / 2 + 12);
  }

  private drawFoodItem(type: string, x: number, y: number) {
    const ctx = this.ctx;
    const size = 50;

    // Plate
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Food icon
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(FOOD_ICONS[type], x, y + 10);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
