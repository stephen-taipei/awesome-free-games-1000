/**
 * 毀滅者遊戲核心邏輯
 * Game #355 - The Destroyer
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  velocityX: number;
  velocityY: number;
}

export interface DestructibleObject {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  type: 'building' | 'obstacle' | 'vehicle' | 'crystal';
  color: string;
  destroyed: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  velocityX: number;
  velocityY: number;
  type: 'drone' | 'tank' | 'turret';
  color: string;
}

export interface Projectile {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  color: string;
  type: 'player' | 'enemy';
}

export interface DestructionBeam {
  active: boolean;
  targetX: number;
  targetY: number;
  particles: { x: number; y: number; life: number }[];
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: string;
}

export interface GameState {
  player: Player;
  destructibles: DestructibleObject[];
  enemies: Enemy[];
  projectiles: Projectile[];
  explosions: Explosion[];
  destructionBeam: DestructionBeam;
  score: number;
  bestScore: number;
  destructionChain: number;
  chainTimer: number;
  gameOver: boolean;
  isPlaying: boolean;
  wave: number;
  destroyedCount: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  playerSpeed: number;
  beamEnergyCost: number;
  doomshockEnergyCost: number;
}

const OBJECT_COLORS = {
  building: '#666666',
  obstacle: '#888888',
  vehicle: '#ff6b6b',
  crystal: '#48dbfb',
};

const ENEMY_COLORS = {
  drone: '#ff6b6b',
  tank: '#ff4444',
  turret: '#ff2222',
};

export class DestroyerGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private onStateChange?: (state: GameState) => void;
  private keys: Set<string> = new Set();

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 15,
      playerSpeed: config.playerSpeed ?? 250,
      beamEnergyCost: config.beamEnergyCost ?? 40,
      doomshockEnergyCost: config.doomshockEnergyCost ?? 60,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight - 80,
        radius: this.config.playerRadius,
        health: 50,
        maxHealth: 50,
        energy: 100,
        maxEnergy: 100,
        velocityX: 0,
        velocityY: 0,
      },
      destructibles: [],
      enemies: [],
      projectiles: [],
      explosions: [],
      destructionBeam: {
        active: false,
        targetX: 0,
        targetY: 0,
        particles: [],
      },
      score: 0,
      bestScore: this.loadBestScore(),
      destructionChain: 0,
      chainTimer: 0,
      gameOver: false,
      isPlaying: false,
      wave: 1,
      destroyedCount: 0,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_355_the_destroyer_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_355_the_destroyer_best', score.toString());
    } catch {
      // 忽略錯誤
    }
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  getState(): GameState {
    return { ...this.state };
  }

  newGame(): void {
    this.state = this.createInitialState();
    this.state.isPlaying = true;
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.spawnInitialObjects();
    this.gameLoop();
    this.notifyStateChange();
  }

  private spawnInitialObjects(): void {
    // 生成初始可破壞物
    for (let i = 0; i < 8; i++) {
      this.spawnDestructible();
    }
    // 生成初始敵人
    for (let i = 0; i < 3; i++) {
      this.spawnEnemy();
    }
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // 更新連鎖計時器
    if (this.state.chainTimer > 0) {
      this.state.chainTimer -= deltaTime;
      if (this.state.chainTimer <= 0) {
        this.state.destructionChain = 0;
      }
    }

    // 更新玩家位置
    this.updatePlayer(deltaTime);

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新投射物
    this.updateProjectiles(deltaTime);

    // 更新爆炸效果
    this.updateExplosions(deltaTime);

    // 更新毀滅光束
    this.updateDestructionBeam(deltaTime);

    // 能量恢復
    this.state.player.energy = Math.min(
      this.state.player.maxEnergy,
      this.state.player.energy + 15 * deltaTime
    );

    // 生成新物件
    this.spawnTimer += deltaTime;
    const spawnInterval = Math.max(1.5, 3 - this.state.wave * 0.2);
    if (this.spawnTimer >= spawnInterval) {
      if (this.state.destructibles.length < 12) {
        this.spawnDestructible();
      }
      if (this.state.enemies.length < 6) {
        this.spawnEnemy();
      }
      this.spawnTimer = 0;
    }

    // 檢查碰撞
    this.checkCollisions();

    // 檢查波次
    if (this.state.destroyedCount >= this.state.wave * 10) {
      this.state.wave++;
    }
  }

  private updatePlayer(deltaTime: number): void {
    // 根據按鍵更新玩家速度
    const speed = this.config.playerSpeed;
    this.state.player.velocityX = 0;
    this.state.player.velocityY = 0;

    if (this.keys.has('ArrowLeft') || this.keys.has('a')) {
      this.state.player.velocityX -= speed;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d')) {
      this.state.player.velocityX += speed;
    }
    if (this.keys.has('ArrowUp') || this.keys.has('w')) {
      this.state.player.velocityY -= speed;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('s')) {
      this.state.player.velocityY += speed;
    }

    // 對角線移動時速度歸一化
    if (this.state.player.velocityX !== 0 && this.state.player.velocityY !== 0) {
      const factor = 1 / Math.sqrt(2);
      this.state.player.velocityX *= factor;
      this.state.player.velocityY *= factor;
    }

    // 更新位置
    this.state.player.x += this.state.player.velocityX * deltaTime;
    this.state.player.y += this.state.player.velocityY * deltaTime;

    // 限制在畫面內
    this.state.player.x = Math.max(
      this.state.player.radius,
      Math.min(this.config.canvasWidth - this.state.player.radius, this.state.player.x)
    );
    this.state.player.y = Math.max(
      this.state.player.radius,
      Math.min(this.config.canvasHeight - this.state.player.radius, this.state.player.y)
    );
  }

  private updateEnemies(deltaTime: number): void {
    this.state.enemies.forEach((enemy) => {
      // 簡單 AI：追蹤玩家
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const speed = enemy.type === 'drone' ? 80 : enemy.type === 'tank' ? 50 : 0;
        enemy.velocityX = (dx / dist) * speed;
        enemy.velocityY = (dy / dist) * speed;
      }

      enemy.x += enemy.velocityX * deltaTime;
      enemy.y += enemy.velocityY * deltaTime;

      // 限制在畫面內
      enemy.x = Math.max(enemy.radius, Math.min(this.config.canvasWidth - enemy.radius, enemy.x));
      enemy.y = Math.max(enemy.radius, Math.min(this.config.canvasHeight - enemy.radius, enemy.y));
    });
  }

  private updateProjectiles(deltaTime: number): void {
    this.state.projectiles.forEach((proj) => {
      proj.x += proj.velocityX * deltaTime;
      proj.y += proj.velocityY * deltaTime;
    });

    // 移除超出畫面的投射物
    this.state.projectiles = this.state.projectiles.filter(
      (proj) =>
        proj.x > -50 &&
        proj.x < this.config.canvasWidth + 50 &&
        proj.y > -50 &&
        proj.y < this.config.canvasHeight + 50
    );
  }

  private updateExplosions(deltaTime: number): void {
    this.state.explosions.forEach((exp) => {
      exp.life -= deltaTime * 2;
      exp.radius = exp.maxRadius * (1 - exp.life);
    });

    this.state.explosions = this.state.explosions.filter((exp) => exp.life > 0);
  }

  private updateDestructionBeam(deltaTime: number): void {
    if (this.state.destructionBeam.active) {
      // 更新粒子
      this.state.destructionBeam.particles.forEach((p) => {
        p.life -= deltaTime * 3;
      });

      this.state.destructionBeam.particles = this.state.destructionBeam.particles.filter(
        (p) => p.life > 0
      );

      // 添加新粒子
      for (let i = 0; i < 3; i++) {
        const t = Math.random();
        this.state.destructionBeam.particles.push({
          x: this.state.player.x + (this.state.destructionBeam.targetX - this.state.player.x) * t,
          y: this.state.player.y + (this.state.destructionBeam.targetY - this.state.player.y) * t,
          life: 1,
        });
      }

      // 光束傷害
      this.damageInBeam();
    }
  }

  private damageInBeam(): void {
    const beamWidth = 20;
    const dx = this.state.destructionBeam.targetX - this.state.player.x;
    const dy = this.state.destructionBeam.targetY - this.state.player.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    const nx = dx / length;
    const ny = dy / length;

    // 檢查可破壞物
    this.state.destructibles.forEach((obj) => {
      if (obj.destroyed) return;

      const toObjX = obj.x - this.state.player.x;
      const toObjY = obj.y - this.state.player.y;

      // 投影到光束方向
      const proj = toObjX * nx + toObjY * ny;
      if (proj < 0 || proj > length) return;

      // 垂直距離
      const perpX = toObjX - proj * nx;
      const perpY = toObjY - proj * ny;
      const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);

      if (perpDist < beamWidth + obj.radius) {
        obj.health -= 100 * (1 / 60); // 每秒100傷害
        if (obj.health <= 0) {
          this.destroyObject(obj);
        }
      }
    });

    // 檢查敵人
    this.state.enemies.forEach((enemy) => {
      const toEnemyX = enemy.x - this.state.player.x;
      const toEnemyY = enemy.y - this.state.player.y;

      const proj = toEnemyX * nx + toEnemyY * ny;
      if (proj < 0 || proj > length) return;

      const perpX = toEnemyX - proj * nx;
      const perpY = toEnemyY - proj * ny;
      const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);

      if (perpDist < beamWidth + enemy.radius) {
        enemy.health -= 100 * (1 / 60);
        if (enemy.health <= 0) {
          this.destroyEnemy(enemy);
        }
      }
    });
  }

  private spawnDestructible(): void {
    const types: Array<'building' | 'obstacle' | 'vehicle' | 'crystal'> = [
      'building',
      'obstacle',
      'vehicle',
      'crystal',
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const radius = type === 'building' ? 25 : type === 'crystal' ? 15 : 20;

    this.state.destructibles.push({
      x: Math.random() * this.config.canvasWidth,
      y: Math.random() * (this.config.canvasHeight * 0.6),
      radius,
      health: type === 'crystal' ? 30 : type === 'building' ? 80 : 50,
      maxHealth: type === 'crystal' ? 30 : type === 'building' ? 80 : 50,
      type,
      color: OBJECT_COLORS[type],
      destroyed: false,
    });
  }

  private spawnEnemy(): void {
    const types: Array<'drone' | 'tank' | 'turret'> = ['drone', 'tank', 'turret'];
    const type = types[Math.floor(Math.random() * types.length)];
    const radius = type === 'drone' ? 12 : type === 'tank' ? 18 : 15;

    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // 上
        x = Math.random() * this.config.canvasWidth;
        y = -30;
        break;
      case 1: // 下
        x = Math.random() * this.config.canvasWidth;
        y = this.config.canvasHeight + 30;
        break;
      case 2: // 左
        x = -30;
        y = Math.random() * this.config.canvasHeight;
        break;
      default: // 右
        x = this.config.canvasWidth + 30;
        y = Math.random() * this.config.canvasHeight;
    }

    this.state.enemies.push({
      x,
      y,
      radius,
      health: type === 'drone' ? 40 : type === 'tank' ? 100 : 60,
      maxHealth: type === 'drone' ? 40 : type === 'tank' ? 100 : 60,
      velocityX: 0,
      velocityY: 0,
      type,
      color: ENEMY_COLORS[type],
    });
  }

  private checkCollisions(): void {
    // 玩家投射物 vs 可破壞物
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      if (proj.type !== 'player') continue;

      for (const obj of this.state.destructibles) {
        if (obj.destroyed) continue;

        const dx = proj.x - obj.x;
        const dy = proj.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius + obj.radius) {
          obj.health -= proj.damage;
          this.state.projectiles.splice(i, 1);

          if (obj.health <= 0) {
            this.destroyObject(obj);
          }
          break;
        }
      }
    }

    // 玩家投射物 vs 敵人
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      if (proj.type !== 'player') continue;

      for (let j = this.state.enemies.length - 1; j >= 0; j--) {
        const enemy = this.state.enemies[j];
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < proj.radius + enemy.radius) {
          enemy.health -= proj.damage;
          this.state.projectiles.splice(i, 1);

          if (enemy.health <= 0) {
            this.destroyEnemy(enemy);
            this.state.enemies.splice(j, 1);
          }
          break;
        }
      }
    }

    // 敵人碰撞玩家
    for (const enemy of this.state.enemies) {
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.state.player.radius + enemy.radius) {
        this.state.player.health -= 0.5; // 每幀傷害
        if (this.state.player.health <= 0) {
          this.gameOver();
          return;
        }
      }
    }
  }

  private destroyObject(obj: DestructibleObject): void {
    obj.destroyed = true;
    this.state.destroyedCount++;

    // 連鎖加成
    this.state.destructionChain++;
    this.state.chainTimer = 2;

    const baseScore = obj.type === 'crystal' ? 100 : obj.type === 'building' ? 50 : 30;
    const chainBonus = Math.floor(baseScore * (this.state.destructionChain - 1) * 0.5);
    this.state.score += baseScore + chainBonus;

    // 能量恢復
    if (obj.type === 'crystal') {
      this.state.player.energy = Math.min(
        this.state.player.maxEnergy,
        this.state.player.energy + 30
      );
    }

    this.createExplosion(obj.x, obj.y, obj.radius * 2, obj.color);
  }

  private destroyEnemy(enemy: Enemy): void {
    this.state.destroyedCount++;
    this.state.destructionChain++;
    this.state.chainTimer = 2;

    const baseScore = enemy.type === 'tank' ? 150 : enemy.type === 'turret' ? 100 : 80;
    const chainBonus = Math.floor(baseScore * (this.state.destructionChain - 1) * 0.5);
    this.state.score += baseScore + chainBonus;

    this.createExplosion(enemy.x, enemy.y, enemy.radius * 2.5, enemy.color);
  }

  private createExplosion(x: number, y: number, radius: number, color: string): void {
    this.state.explosions.push({
      x,
      y,
      radius: 0,
      maxRadius: radius,
      life: 1,
      color,
    });
  }

  fireDestructionBeam(targetX: number, targetY: number): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    if (this.state.player.energy < this.config.beamEnergyCost) return;

    this.state.destructionBeam.active = true;
    this.state.destructionBeam.targetX = targetX;
    this.state.destructionBeam.targetY = targetY;
    this.state.player.energy -= this.config.beamEnergyCost;
  }

  stopDestructionBeam(): void {
    this.state.destructionBeam.active = false;
    this.state.destructionBeam.particles = [];
  }

  fireDoomshock(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    if (this.state.player.energy < this.config.doomshockEnergyCost) return;

    this.state.player.energy -= this.config.doomshockEnergyCost;

    const shockRadius = 150;

    // 傷害範圍內所有目標
    this.state.destructibles.forEach((obj) => {
      if (obj.destroyed) return;

      const dx = obj.x - this.state.player.x;
      const dy = obj.y - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < shockRadius) {
        obj.health -= 80;
        if (obj.health <= 0) {
          this.destroyObject(obj);
        }
      }
    });

    this.state.enemies.forEach((enemy, index) => {
      const dx = enemy.x - this.state.player.x;
      const dy = enemy.y - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < shockRadius) {
        enemy.health -= 80;
        if (enemy.health <= 0) {
          this.destroyEnemy(enemy);
          this.state.enemies.splice(index, 1);
        }
      }
    });

    // 衝擊波視覺效果
    this.createExplosion(this.state.player.x, this.state.player.y, shockRadius, '#ff0000');
  }

  setKeyDown(key: string): void {
    this.keys.add(key);
  }

  setKeyUp(key: string): void {
    this.keys.delete(key);
  }

  private gameOver(): void {
    this.state.gameOver = true;
    this.state.isPlaying = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      this.saveBestScore(this.state.bestScore);
    }

    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.keys.clear();
  }
}

export default DestroyerGame;
