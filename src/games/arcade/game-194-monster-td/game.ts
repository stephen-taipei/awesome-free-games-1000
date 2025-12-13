/**
 * Monster TD Game Engine
 * Game #194
 */

export interface GameState {
  gold: number;
  wave: number;
  lives: number;
  status: "idle" | "playing" | "over" | "won" | "waveComplete";
}

interface Point {
  x: number;
  y: number;
}

interface Monster {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  slowTimer: number;
  type: "goblin" | "orc" | "troll";
}

interface Tower {
  x: number;
  y: number;
  type: "arrow" | "cannon" | "ice";
  cooldown: number;
  range: number;
  damage: number;
}

interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  type: "arrow" | "cannon" | "ice";
  splash: boolean;
}

type StateChangeCallback = (state: GameState) => void;

export class MonsterTDGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number = 500;
  private cellSize: number = 50;
  private gridSize: number = 10;

  private state: GameState = {
    gold: 100,
    wave: 1,
    lives: 10,
    status: "idle",
  };

  private onStateChange: StateChangeCallback | null = null;
  private animationId: number = 0;
  private lastTime: number = 0;

  private path: Point[] = [];
  private monsters: Monster[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private occupiedCells: Set<string> = new Set();

  private selectedTower: "arrow" | "cannon" | "ice" | null = null;
  private monstersToSpawn: number = 0;
  private spawnTimer: number = 0;
  private maxWaves: number = 10;

  private towerCosts = {
    arrow: 50,
    cannon: 100,
    ice: 75,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.initPath();
  }

  private initPath() {
    // Snake-like path across the grid
    this.path = [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 6, y: 3 },
      { x: 5, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 },
      { x: 1, y: 7 },
      { x: 1, y: 8 },
      { x: 1, y: 9 },
    ];

    // Mark path cells as occupied
    this.path.forEach((p) => {
      this.occupiedCells.add(`${p.x},${p.y}`);
    });
  }

  resize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.size = Math.min(rect.width, rect.height);
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.cellSize = this.size / this.gridSize;
    this.draw();
  }

  setOnStateChange(cb: StateChangeCallback) {
    this.onStateChange = cb;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  selectTower(type: "arrow" | "cannon" | "ice" | null) {
    this.selectedTower = type;
  }

  getSelectedTower() {
    return this.selectedTower;
  }

  canAfford(type: "arrow" | "cannon" | "ice"): boolean {
    return this.state.gold >= this.towerCosts[type];
  }

  handleClick(clientX: number, clientY: number) {
    if (this.state.status !== "playing") return;
    if (!this.selectedTower) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.size / rect.width;
    const scaleY = this.size / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);

    if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) {
      return;
    }

    const cellKey = `${gridX},${gridY}`;
    if (this.occupiedCells.has(cellKey)) {
      return; // Can't place on path or existing tower
    }

    const cost = this.towerCosts[this.selectedTower];
    if (this.state.gold < cost) {
      return;
    }

    // Place tower
    this.state.gold -= cost;
    this.occupiedCells.add(cellKey);

    const towerStats = this.getTowerStats(this.selectedTower);
    this.towers.push({
      x: gridX,
      y: gridY,
      type: this.selectedTower,
      cooldown: 0,
      range: towerStats.range,
      damage: towerStats.damage,
    });

    this.notifyState();
  }

  private getTowerStats(type: "arrow" | "cannon" | "ice") {
    switch (type) {
      case "arrow":
        return { range: 2.5, damage: 15, cooldownTime: 0.5 };
      case "cannon":
        return { range: 2, damage: 40, cooldownTime: 1.5 };
      case "ice":
        return { range: 2, damage: 5, cooldownTime: 1 };
    }
  }

  start() {
    this.state = {
      gold: 100,
      wave: 1,
      lives: 10,
      status: "playing",
    };

    this.monsters = [];
    this.towers = [];
    this.projectiles = [];
    this.occupiedCells = new Set();
    this.initPath();

    this.startWave();
    this.notifyState();
    this.lastTime = performance.now();
    this.loop();
  }

  startWave() {
    this.monstersToSpawn = 5 + this.state.wave * 2;
    this.spawnTimer = 0;
    this.state.status = "playing";
    this.notifyState();
  }

  private spawnMonster() {
    const wave = this.state.wave;
    let type: Monster["type"] = "goblin";
    const rand = Math.random();

    if (wave >= 5 && rand > 0.7) {
      type = "troll";
    } else if (wave >= 3 && rand > 0.5) {
      type = "orc";
    }

    const stats = this.getMonsterStats(type, wave);

    this.monsters.push({
      x: this.path[0].x * this.cellSize + this.cellSize / 2,
      y: this.path[0].y * this.cellSize + this.cellSize / 2,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      pathIndex: 0,
      slowTimer: 0,
      type,
    });
  }

  private getMonsterStats(type: Monster["type"], wave: number) {
    const waveMultiplier = 1 + wave * 0.15;
    switch (type) {
      case "goblin":
        return {
          health: Math.floor(30 * waveMultiplier),
          speed: 60,
        };
      case "orc":
        return {
          health: Math.floor(60 * waveMultiplier),
          speed: 40,
        };
      case "troll":
        return {
          health: Math.floor(120 * waveMultiplier),
          speed: 25,
        };
    }
  }

  private loop() {
    if (this.state.status !== "playing" && this.state.status !== "waveComplete") {
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number) {
    // Spawn monsters
    if (this.monstersToSpawn > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= 1) {
        this.spawnTimer = 0;
        this.spawnMonster();
        this.monstersToSpawn--;
      }
    }

    // Update monsters
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];

      // Update slow timer
      if (m.slowTimer > 0) {
        m.slowTimer -= dt;
      }

      // Move towards next path point
      if (m.pathIndex < this.path.length) {
        const target = this.path[m.pathIndex];
        const targetX = target.x * this.cellSize + this.cellSize / 2;
        const targetY = target.y * this.cellSize + this.cellSize / 2;

        const dx = targetX - m.x;
        const dy = targetY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const speedMod = m.slowTimer > 0 ? 0.4 : 1;
        const speed = m.speed * speedMod * dt;

        if (dist < speed) {
          m.x = targetX;
          m.y = targetY;
          m.pathIndex++;
        } else {
          m.x += (dx / dist) * speed;
          m.y += (dy / dist) * speed;
        }
      }

      // Check if reached end
      if (m.pathIndex >= this.path.length) {
        this.monsters.splice(i, 1);
        this.state.lives--;
        this.notifyState();

        if (this.state.lives <= 0) {
          this.state.status = "over";
          this.notifyState();
          return;
        }
      }
    }

    // Update towers
    for (const tower of this.towers) {
      tower.cooldown -= dt;

      if (tower.cooldown <= 0) {
        // Find target
        const target = this.findTarget(tower);
        if (target) {
          const stats = this.getTowerStats(tower.type);
          tower.cooldown = stats.cooldownTime;

          this.projectiles.push({
            x: tower.x * this.cellSize + this.cellSize / 2,
            y: tower.y * this.cellSize + this.cellSize / 2,
            targetX: target.x,
            targetY: target.y,
            speed: 300,
            damage: tower.damage,
            type: tower.type,
            splash: tower.type === "cannon",
          });
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const moveSpeed = p.speed * dt;

      if (dist < moveSpeed) {
        // Hit target area
        this.applyDamage(p);
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * moveSpeed;
        p.y += (dy / dist) * moveSpeed;
      }
    }

    // Check wave complete
    if (this.monstersToSpawn === 0 && this.monsters.length === 0 && this.state.status === "playing") {
      if (this.state.wave >= this.maxWaves) {
        this.state.status = "won";
        this.notifyState();
      } else {
        this.state.status = "waveComplete";
        this.notifyState();
      }
    }
  }

  private findTarget(tower: Tower): Monster | null {
    const towerX = tower.x * this.cellSize + this.cellSize / 2;
    const towerY = tower.y * this.cellSize + this.cellSize / 2;
    const range = tower.range * this.cellSize;

    let closest: Monster | null = null;
    let closestDist = Infinity;

    for (const m of this.monsters) {
      const dx = m.x - towerX;
      const dy = m.y - towerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && dist < closestDist) {
        closest = m;
        closestDist = dist;
      }
    }

    return closest;
  }

  private applyDamage(projectile: Projectile) {
    const splashRadius = projectile.splash ? this.cellSize : 0;

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const dx = m.x - projectile.targetX;
      const dy = m.y - projectile.targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= splashRadius + this.cellSize / 2) {
        m.health -= projectile.damage;

        if (projectile.type === "ice") {
          m.slowTimer = 2;
        }

        if (m.health <= 0) {
          this.monsters.splice(i, 1);
          this.state.gold += this.getGoldReward(m.type);
          this.notifyState();
        }
      } else if (!projectile.splash) {
        // Single target - hit closest
        const checkDist = Math.sqrt(
          (m.x - projectile.targetX) ** 2 + (m.y - projectile.targetY) ** 2
        );
        if (checkDist < this.cellSize / 2) {
          m.health -= projectile.damage;

          if (projectile.type === "ice") {
            m.slowTimer = 2;
          }

          if (m.health <= 0) {
            this.monsters.splice(i, 1);
            this.state.gold += this.getGoldReward(m.type);
            this.notifyState();
          }
          break;
        }
      }
    }
  }

  private getGoldReward(type: Monster["type"]): number {
    switch (type) {
      case "goblin":
        return 10;
      case "orc":
        return 20;
      case "troll":
        return 40;
    }
  }

  nextWave() {
    this.state.wave++;
    this.startWave();
    this.lastTime = performance.now();
    this.loop();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.size, this.size);

    // Draw grid
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(0, 0, this.size, this.size);

    // Draw path
    ctx.fillStyle = "#8b4513";
    for (const p of this.path) {
      ctx.fillRect(
        p.x * this.cellSize,
        p.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }

    // Draw path border
    ctx.strokeStyle = "#5d3a1a";
    ctx.lineWidth = 2;
    for (const p of this.path) {
      ctx.strokeRect(
        p.x * this.cellSize + 1,
        p.y * this.cellSize + 1,
        this.cellSize - 2,
        this.cellSize - 2
      );
    }

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellSize, 0);
      ctx.lineTo(i * this.cellSize, this.size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * this.cellSize);
      ctx.lineTo(this.size, i * this.cellSize);
      ctx.stroke();
    }

    // Draw spawn and exit markers
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(
      this.path[0].x * this.cellSize + this.cellSize / 2,
      this.path[0].y * this.cellSize + this.cellSize / 2,
      this.cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#3498db";
    const lastPath = this.path[this.path.length - 1];
    ctx.beginPath();
    ctx.arc(
      lastPath.x * this.cellSize + this.cellSize / 2,
      lastPath.y * this.cellSize + this.cellSize / 2,
      this.cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw towers
    for (const tower of this.towers) {
      this.drawTower(tower);
    }

    // Draw monsters
    for (const monster of this.monsters) {
      this.drawMonster(monster);
    }

    // Draw projectiles
    for (const p of this.projectiles) {
      this.drawProjectile(p);
    }
  }

  private drawTower(tower: Tower) {
    const ctx = this.ctx;
    const x = tower.x * this.cellSize + this.cellSize / 2;
    const y = tower.y * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.4;

    // Tower base
    ctx.fillStyle = "#34495e";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Tower icon
    ctx.font = `${this.cellSize * 0.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    switch (tower.type) {
      case "arrow":
        ctx.fillText("🏹", x, y);
        break;
      case "cannon":
        ctx.fillText("💣", x, y);
        break;
      case "ice":
        ctx.fillText("❄️", x, y);
        break;
    }

    // Range indicator when selected
    if (this.selectedTower === tower.type) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, tower.range * this.cellSize, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawMonster(monster: Monster) {
    const ctx = this.ctx;
    const size = this.cellSize * 0.35;

    // Monster body color based on type
    let color: string;
    let emoji: string;
    switch (monster.type) {
      case "goblin":
        color = "#27ae60";
        emoji = "👹";
        break;
      case "orc":
        color = "#8e44ad";
        emoji = "👺";
        break;
      case "troll":
        color = "#c0392b";
        emoji = "👿";
        break;
    }

    // Slow effect
    if (monster.slowTimer > 0) {
      ctx.fillStyle = "rgba(100, 200, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(monster.x, monster.y, size + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Monster
    ctx.font = `${this.cellSize * 0.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, monster.x, monster.y);

    // Health bar
    const barWidth = this.cellSize * 0.6;
    const barHeight = 4;
    const barX = monster.x - barWidth / 2;
    const barY = monster.y - size - 8;

    ctx.fillStyle = "#c0392b";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#27ae60";
    ctx.fillRect(barX, barY, barWidth * (monster.health / monster.maxHealth), barHeight);
  }

  private drawProjectile(projectile: Projectile) {
    const ctx = this.ctx;
    const size = 6;

    switch (projectile.type) {
      case "arrow":
        ctx.fillStyle = "#f39c12";
        break;
      case "cannon":
        ctx.fillStyle = "#2c3e50";
        break;
      case "ice":
        ctx.fillStyle = "#3498db";
        break;
    }

    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
