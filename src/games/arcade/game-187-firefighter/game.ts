/**
 * Firefighter Game Engine
 * Game #187
 *
 * Catch people jumping from a burning building!
 */

interface Person {
  x: number;
  y: number;
  vy: number;
  floor: number;
  color: string;
}

interface GameState {
  score: number;
  saved: number;
  missed: number;
  status: "idle" | "playing" | "over";
}

type StateCallback = (state: GameState) => void;

const PERSON_COLORS = ["#f39c12", "#3498db", "#9b59b6", "#1abc9c", "#e91e63"];
const MAX_MISSED = 3;

export class FirefighterGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private netX = 0;
  private netWidth = 0;
  private netHeight = 0;
  private people: Person[] = [];
  private score = 0;
  private saved = 0;
  private missed = 0;
  private status: GameState["status"] = "idle";
  private onStateChange: StateCallback | null = null;
  private animationId: number | null = null;
  private keys: Set<string> = new Set();
  private spawnTimer = 0;
  private spawnInterval = 120;
  private buildingX = 0;
  private buildingWidth = 0;
  private floors: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  setOnStateChange(cb: StateCallback) {
    this.onStateChange = cb;
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        score: this.score,
        saved: this.saved,
        missed: this.missed,
        status: this.status,
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size;
    this.canvas.height = size;

    this.netWidth = size * 0.2;
    this.netHeight = size * 0.05;
    this.netX = size / 2 - this.netWidth / 2;

    this.buildingWidth = size * 0.4;
    this.buildingX = size / 2 - this.buildingWidth / 2;

    // Floor positions
    this.floors = [];
    const floorCount = 6;
    const floorHeight = (size * 0.7) / floorCount;
    for (let i = 0; i < floorCount; i++) {
      this.floors.push(size * 0.1 + i * floorHeight);
    }

    this.draw();
  }

  start() {
    this.score = 0;
    this.saved = 0;
    this.missed = 0;
    this.people = [];
    this.spawnTimer = 0;
    this.spawnInterval = 120;
    this.netX = this.canvas.width / 2 - this.netWidth / 2;
    this.status = "playing";
    this.emitState();
    this.gameLoop();
  }

  setKey(key: string, pressed: boolean) {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  moveNet(direction: "left" | "right") {
    if (this.status !== "playing") return;
    const speed = this.canvas.width * 0.03;
    if (direction === "left") {
      this.netX = Math.max(0, this.netX - speed);
    } else {
      this.netX = Math.min(this.canvas.width - this.netWidth, this.netX + speed);
    }
  }

  private spawnPerson() {
    const floor = Math.floor(Math.random() * this.floors.length);
    const side = Math.random() > 0.5 ? 1 : -1;
    const x =
      side > 0
        ? this.buildingX + this.buildingWidth + 10
        : this.buildingX - 10;

    this.people.push({
      x,
      y: this.floors[floor],
      vy: 0,
      floor,
      color: PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)],
    });
  }

  private gameLoop() {
    this.update();
    this.draw();

    if (this.status === "playing") {
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  private update() {
    // Handle input
    const speed = this.canvas.width * 0.012;
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A")) {
      this.netX = Math.max(0, this.netX - speed);
    }
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D")) {
      this.netX = Math.min(this.canvas.width - this.netWidth, this.netX + speed);
    }

    // Spawn people
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPerson();
      // Increase difficulty
      this.spawnInterval = Math.max(40, this.spawnInterval - 2);
    }

    // Update people
    const gravity = 0.3;
    const groundY = this.canvas.height - this.netHeight - 20;
    const netTop = groundY - this.netHeight;

    for (let i = this.people.length - 1; i >= 0; i--) {
      const person = this.people[i];
      person.vy += gravity;
      person.y += person.vy;

      // Check if caught by net
      const personBottom = person.y + 20;
      const personCenterX = person.x;

      if (
        personBottom >= netTop &&
        personBottom <= groundY + 10 &&
        personCenterX >= this.netX &&
        personCenterX <= this.netX + this.netWidth
      ) {
        // Caught!
        this.saved++;
        this.score += 100 + (5 - person.floor) * 20;
        this.people.splice(i, 1);
        this.emitState();
        continue;
      }

      // Check if hit ground
      if (person.y >= groundY) {
        this.missed++;
        this.people.splice(i, 1);
        this.emitState();

        if (this.missed >= MAX_MISSED) {
          this.status = "over";
          this.emitState();
        }
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(1, "#e0f4ff");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h);

    // Sun
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.15, w * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    this.drawCloud(w * 0.15, h * 0.1, w * 0.1);
    this.drawCloud(w * 0.6, h * 0.15, w * 0.08);

    // Draw building
    this.drawBuilding();

    // Draw fire effects
    this.drawFire();

    // Draw people
    for (const person of this.people) {
      this.drawPerson(person);
    }

    // Ground
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(0, h - 30, w, 30);

    // Draw net
    this.drawNet();
  }

  private drawCloud(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBuilding() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Building body
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(this.buildingX, h * 0.08, this.buildingWidth, h * 0.82);

    // Windows
    const windowWidth = this.buildingWidth * 0.15;
    const windowHeight = (h * 0.7) / this.floors.length * 0.5;
    const windowGap = (this.buildingWidth - windowWidth * 4) / 5;

    for (let floor = 0; floor < this.floors.length; floor++) {
      const y = this.floors[floor];
      for (let col = 0; col < 4; col++) {
        const x = this.buildingX + windowGap + col * (windowWidth + windowGap);

        // Some windows are on fire (random based on floor)
        const onFire = Math.random() > 0.5 && floor < 4;
        ctx.fillStyle = onFire ? "#e74c3c" : "#f1c40f";
        ctx.fillRect(x, y, windowWidth, windowHeight);

        // Window frame
        ctx.strokeStyle = "#34495e";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, windowWidth, windowHeight);
      }
    }

    // Roof
    ctx.fillStyle = "#34495e";
    ctx.beginPath();
    ctx.moveTo(this.buildingX - 10, h * 0.08);
    ctx.lineTo(this.buildingX + this.buildingWidth / 2, h * 0.02);
    ctx.lineTo(this.buildingX + this.buildingWidth + 10, h * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  private drawFire() {
    const ctx = this.ctx;
    const time = Date.now() / 100;

    // Fire from windows
    for (let i = 0; i < 3; i++) {
      const x = this.buildingX + this.buildingWidth * 0.2 + i * this.buildingWidth * 0.3;
      const y = this.floors[Math.floor(Math.random() * 3)] - 10;

      ctx.fillStyle = `rgba(231, 76, 60, ${0.5 + Math.sin(time + i) * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x - 10 + Math.sin(time) * 5,
        y - 20,
        x,
        y - 30 - Math.sin(time + i) * 10
      );
      ctx.quadraticCurveTo(x + 10 + Math.cos(time) * 5, y - 20, x, y);
      ctx.fill();

      // Orange inner flame
      ctx.fillStyle = `rgba(243, 156, 18, ${0.7 + Math.cos(time + i) * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 5, y - 10, x, y - 15 - Math.sin(time) * 5);
      ctx.quadraticCurveTo(x + 5, y - 10, x, y);
      ctx.fill();
    }

    // Smoke
    ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
    for (let i = 0; i < 5; i++) {
      const x = this.buildingX + this.buildingWidth * 0.5 + Math.sin(time + i * 2) * 30;
      const y = this.canvas.height * 0.05 - i * 15;
      const size = 15 + i * 5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPerson(person: Person) {
    const ctx = this.ctx;
    const x = person.x;
    const y = person.y;
    const size = 15;

    // Body
    ctx.fillStyle = person.color;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.5, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#ffd5a3";
    ctx.beginPath();
    ctx.arc(x, y - size * 1.2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Arms (waving)
    ctx.strokeStyle = person.color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const armWave = Math.sin(Date.now() / 100 + person.x) * 0.3;

    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y - size * 0.5);
    ctx.lineTo(x - size, y - size * 0.8 + armWave * 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y - size * 0.5);
    ctx.lineTo(x + size, y - size * 0.8 - armWave * 10);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y);
    ctx.lineTo(x - size * 0.3, y + size * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.5);
    ctx.stroke();
  }

  private drawNet() {
    const ctx = this.ctx;
    const groundY = this.canvas.height - 30;
    const netY = groundY - this.netHeight;

    // Firefighters
    this.drawFirefighter(this.netX - 15, groundY);
    this.drawFirefighter(this.netX + this.netWidth + 15, groundY);

    // Net
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;

    // Net fabric
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.moveTo(this.netX, netY + this.netHeight * 0.3);
    ctx.quadraticCurveTo(
      this.netX + this.netWidth / 2,
      netY + this.netHeight,
      this.netX + this.netWidth,
      netY + this.netHeight * 0.3
    );
    ctx.lineTo(this.netX + this.netWidth, netY);
    ctx.lineTo(this.netX, netY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Net grid
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 1;
    const gridSize = this.netWidth / 6;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(this.netX + i * gridSize, netY);
      ctx.lineTo(this.netX + i * gridSize, netY + this.netHeight * 0.8);
      ctx.stroke();
    }
  }

  private drawFirefighter(x: number, groundY: number) {
    const ctx = this.ctx;
    const size = 20;

    // Body
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x - size / 2, groundY - size * 1.5, size, size);

    // Head
    ctx.fillStyle = "#ffd5a3";
    ctx.beginPath();
    ctx.arc(x, groundY - size * 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(x, groundY - size * 2.2, size * 0.5, Math.PI, 0);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#34495e";
    ctx.fillRect(x - size / 3, groundY - size * 0.5, size / 4, size * 0.5);
    ctx.fillRect(x + size / 12, groundY - size * 0.5, size / 4, size * 0.5);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
