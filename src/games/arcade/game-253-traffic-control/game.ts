/**
 * Traffic Control Game Engine
 * Game #253
 *
 * Control traffic lights to manage traffic flow at intersections
 */

interface Car {
  id: number;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  speed: number;
  color: string;
  waiting: boolean;
  passed: boolean;
}

interface TrafficLight {
  x: number;
  y: number;
  direction: "vertical" | "horizontal";
  state: "red" | "green";
}

interface GameState {
  score: number;
  highScore: number;
  passed: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const CAR_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];

export class TrafficControlGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private cars: Car[] = [];
  private lights: TrafficLight[] = [];
  private score = 0;
  private highScore = 0;
  private passed = 0;
  private status: "idle" | "playing" | "over" = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private carIdCounter = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadHighScore();
  }

  private loadHighScore() {
    const saved = localStorage.getItem("traffic_control_highscore");
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore() {
    localStorage.setItem("traffic_control_highscore", this.highScore.toString());
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        highScore: this.highScore,
        passed: this.passed,
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
    this.initLights();
    this.draw();
  }

  private initLights() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const offset = 50;

    this.lights = [
      { x: cx - offset, y: cy - offset, direction: "vertical", state: "red" },
      { x: cx + offset, y: cy - offset, direction: "horizontal", state: "green" },
      { x: cx - offset, y: cy + offset, direction: "horizontal", state: "green" },
      { x: cx + offset, y: cy + offset, direction: "vertical", state: "red" },
    ];
  }

  handleClick(x: number, y: number) {
    if (this.status !== "playing") return;

    // Check if clicking on intersection
    const cx = this.width / 2;
    const cy = this.height / 2;
    const intersectionSize = 80;

    if (
      x > cx - intersectionSize / 2 &&
      x < cx + intersectionSize / 2 &&
      y > cy - intersectionSize / 2 &&
      y < cy + intersectionSize / 2
    ) {
      this.toggleLights();
    }
  }

  private toggleLights() {
    for (const light of this.lights) {
      light.state = light.state === "red" ? "green" : "red";
    }
  }

  start() {
    this.score = 0;
    this.passed = 0;
    this.cars = [];
    this.spawnTimer = 0;
    this.carIdCounter = 0;
    this.initLights();
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
    // Spawn cars
    this.spawnTimer += dt;
    const spawnInterval = Math.max(800, 2000 - this.passed * 30);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnCar();
    }

    const cx = this.width / 2;
    const cy = this.height / 2;
    const stopLine = 60;

    // Update cars
    for (const car of this.cars) {
      // Check if should stop at light
      const light = this.getLightForCar(car);
      car.waiting = false;

      if (light && light.state === "red") {
        let shouldStop = false;

        switch (car.direction) {
          case "up":
            if (car.y > cy + stopLine && car.y < cy + stopLine + 20) shouldStop = true;
            break;
          case "down":
            if (car.y < cy - stopLine && car.y > cy - stopLine - 20) shouldStop = true;
            break;
          case "left":
            if (car.x > cx + stopLine && car.x < cx + stopLine + 20) shouldStop = true;
            break;
          case "right":
            if (car.x < cx - stopLine && car.x > cx - stopLine - 20) shouldStop = true;
            break;
        }

        if (shouldStop) {
          car.waiting = true;
        }
      }

      // Move car if not waiting
      if (!car.waiting) {
        switch (car.direction) {
          case "up":
            car.y -= car.speed;
            break;
          case "down":
            car.y += car.speed;
            break;
          case "left":
            car.x -= car.speed;
            break;
          case "right":
            car.x += car.speed;
            break;
        }
      }

      // Check if passed intersection
      if (!car.passed) {
        const inIntersection =
          car.x > cx - 40 &&
          car.x < cx + 40 &&
          car.y > cy - 40 &&
          car.y < cy + 40;

        if (inIntersection) {
          // Check collision
          for (const other of this.cars) {
            if (other === car || other.passed) continue;

            const otherInIntersection =
              other.x > cx - 40 &&
              other.x < cx + 40 &&
              other.y > cy - 40 &&
              other.y < cy + 40;

            if (otherInIntersection) {
              // Collision!
              const dx = Math.abs(car.x - other.x);
              const dy = Math.abs(car.y - other.y);
              if (dx < 25 && dy < 25) {
                this.gameOver();
                return;
              }
            }
          }
        }

        // Check if passed through
        let passedThrough = false;
        switch (car.direction) {
          case "up":
            if (car.y < cy - 50) passedThrough = true;
            break;
          case "down":
            if (car.y > cy + 50) passedThrough = true;
            break;
          case "left":
            if (car.x < cx - 50) passedThrough = true;
            break;
          case "right":
            if (car.x > cx + 50) passedThrough = true;
            break;
        }

        if (passedThrough) {
          car.passed = true;
          this.passed++;
          this.score += 10;

          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
          }
          this.emitState();
        }
      }
    }

    // Remove off-screen cars
    this.cars = this.cars.filter((car) => {
      return car.x > -50 && car.x < this.width + 50 && car.y > -50 && car.y < this.height + 50;
    });
  }

  private getLightForCar(car: Car): TrafficLight | null {
    const isVertical = car.direction === "up" || car.direction === "down";
    return this.lights.find((l) => (isVertical ? l.direction === "vertical" : l.direction === "horizontal")) || null;
  }

  private spawnCar() {
    const directions: ("up" | "down" | "left" | "right")[] = ["up", "down", "left", "right"];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const laneOffset = 15;

    let x: number, y: number;

    switch (direction) {
      case "up":
        x = cx + laneOffset;
        y = this.height + 30;
        break;
      case "down":
        x = cx - laneOffset;
        y = -30;
        break;
      case "left":
        x = this.width + 30;
        y = cy + laneOffset;
        break;
      case "right":
        x = -30;
        y = cy - laneOffset;
        break;
    }

    this.cars.push({
      id: this.carIdCounter++,
      x,
      y,
      direction,
      speed: 2 + Math.random() * 1.5,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      waiting: false,
      passed: false,
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
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Background (grass)
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(0, 0, this.width, this.height);

    // Roads
    ctx.fillStyle = "#555";
    const roadWidth = 60;

    // Vertical road
    ctx.fillRect(cx - roadWidth / 2, 0, roadWidth, this.height);

    // Horizontal road
    ctx.fillRect(0, cy - roadWidth / 2, this.width, roadWidth);

    // Road markings
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);

    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - roadWidth / 2);
    ctx.moveTo(cx, cy + roadWidth / 2);
    ctx.lineTo(cx, this.height);
    ctx.stroke();

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(cx - roadWidth / 2, cy);
    ctx.moveTo(cx + roadWidth / 2, cy);
    ctx.lineTo(this.width, cy);
    ctx.stroke();

    ctx.setLineDash([]);

    // Intersection
    ctx.fillStyle = "#444";
    ctx.fillRect(cx - roadWidth / 2, cy - roadWidth / 2, roadWidth, roadWidth);

    // Draw traffic lights
    for (const light of this.lights) {
      this.drawLight(light);
    }

    // Draw cars
    for (const car of this.cars) {
      this.drawCar(car);
    }

    // Click hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CLICK", cx, cy + 5);
  }

  private drawLight(light: TrafficLight) {
    const ctx = this.ctx;
    const size = 15;

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.roundRect(light.x - size / 2, light.y - size / 2, size, size, 4);
    ctx.fill();

    ctx.fillStyle = light.state === "red" ? "#e74c3c" : "#2ecc71";
    ctx.beginPath();
    ctx.arc(light.x, light.y, size / 2 - 3, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    ctx.shadowColor = light.state === "red" ? "#e74c3c" : "#2ecc71";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawCar(car: Car) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(car.x, car.y);

    // Rotate based on direction
    let rotation = 0;
    switch (car.direction) {
      case "up":
        rotation = -Math.PI / 2;
        break;
      case "down":
        rotation = Math.PI / 2;
        break;
      case "left":
        rotation = Math.PI;
        break;
      case "right":
        rotation = 0;
        break;
    }
    ctx.rotate(rotation);

    // Car body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-15, -10, 30, 20, 4);
    ctx.fill();

    // Windows
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(-5, -8, 15, 16);

    // Headlights
    ctx.fillStyle = "#FFF";
    ctx.fillRect(12, -7, 3, 4);
    ctx.fillRect(12, 3, 3, 4);

    ctx.restore();

    // Waiting indicator
    if (car.waiting) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.arc(car.x, car.y - 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
