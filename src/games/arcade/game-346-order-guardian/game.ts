/**
 * 秩序守護遊戲核心邏輯
 * Game #346 - Order Guardian
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
  shield: number;
  maxShield: number;
  attack: number;
  speed: number;
  isAttacking: boolean;
  attackCooldown: number;
  isBlocking: boolean;
  specialEnergy: number;
  maxSpecialEnergy: number;
}

export enum EnemyType {
  MINION = 'minion',
  ELITE = 'elite',
  BOSS = 'boss',
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  attack: number;
  speed: number;
  worth: number;
  color: string;
  isAlive: boolean;
  stunned: number;
  targetAngle: number;
}

export interface AttackEffect {
  id: number;
  x: number;
  y: number;
  angle: number;
  lifetime: number;
  maxLifetime: number;
  type: 'slash' | 'area' | 'special';
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  attackEffects: AttackEffect[];
  score: number;
  bestScore: number;
  wave: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  kills: number;
  gameOver: boolean;
  isPlaying: boolean;
  waveTimer: number;
  enemiesRemaining: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  playerSpeed: number;
  attackCooldown: number;
  comboTimeout: number;
}

const ENEMY_CONFIGS = {
  [EnemyType.MINION]: {
    radius: 15,
    health: 50,
    attack: 10,
    speed: 80,
    worth: 10,
    color: '#ff6b6b',
  },
  [EnemyType.ELITE]: {
    radius: 25,
    health: 150,
    attack: 20,
    speed: 60,
    worth: 50,
    color: '#ff9ff3',
  },
  [EnemyType.BOSS]: {
    radius: 40,
    health: 500,
    attack: 35,
    speed: 40,
    worth: 200,
    color: '#ffd700',
  },
};

export class OrderGuardianGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private nextEnemyId: number = 0;
  private nextEffectId: number = 0;
  private keys: Set<string> = new Set();
  private onStateChange?: (state: GameState) => void;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 20,
      playerSpeed: config.playerSpeed ?? 200,
      attackCooldown: config.attackCooldown ?? 0.3,
      comboTimeout: config.comboTimeout ?? 2.0,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight / 2,
        radius: this.config.playerRadius,
        health: 100,
        maxHealth: 100,
        shield: 50,
        maxShield: 50,
        attack: 30,
        speed: this.config.playerSpeed,
        isAttacking: false,
        attackCooldown: 0,
        isBlocking: false,
        specialEnergy: 0,
        maxSpecialEnergy: 100,
      },
      enemies: [],
      attackEffects: [],
      score: 0,
      bestScore: this.loadBestScore(),
      wave: 1,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      kills: 0,
      gameOver: false,
      isPlaying: false,
      waveTimer: 0,
      enemiesRemaining: 0,
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_346_order_guardian_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_346_order_guardian_best', score.toString());
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
    this.nextEnemyId = 0;
    this.nextEffectId = 0;
    this.keys.clear();
    this.spawnWave();
    this.gameLoop();
    this.notifyStateChange();
  }

  private gameLoop = (): void => {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    // 更新玩家移動
    this.updatePlayerMovement(deltaTime);

    // 更新攻擊冷卻
    if (this.state.player.attackCooldown > 0) {
      this.state.player.attackCooldown -= deltaTime;
    }

    // 更新護盾回復
    if (!this.state.player.isBlocking && this.state.player.shield < this.state.player.maxShield) {
      this.state.player.shield = Math.min(
        this.state.player.maxShield,
        this.state.player.shield + 10 * deltaTime
      );
    }

    // 更新連擊計時器
    if (this.state.combo > 0) {
      this.state.comboTimer -= deltaTime;
      if (this.state.comboTimer <= 0) {
        this.state.combo = 0;
      }
    }

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新攻擊特效
    this.updateAttackEffects(deltaTime);

    // 檢查波次完成
    if (this.state.enemies.length === 0 && this.state.enemiesRemaining === 0) {
      this.state.waveTimer += deltaTime;
      if (this.state.waveTimer >= 2) {
        this.nextWave();
      }
    }

    // 檢查遊戲結束
    if (this.state.player.health <= 0) {
      this.gameOver();
    }
  }

  private updatePlayerMovement(deltaTime: number): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) dx += 1;

    // 正規化對角線移動
    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    // 移動速度減半如果在格擋
    const speed = this.state.player.isBlocking ? this.state.player.speed * 0.5 : this.state.player.speed;

    this.state.player.x += dx * speed * deltaTime;
    this.state.player.y += dy * speed * deltaTime;

    // 限制在邊界內
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
      if (!enemy.isAlive) return;

      // 更新眩暈
      if (enemy.stunned > 0) {
        enemy.stunned -= deltaTime;
        return;
      }

      // 移動向玩家
      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        enemy.targetAngle = Math.atan2(dy, dx);
        enemy.x += (dx / dist) * enemy.speed * deltaTime;
        enemy.y += (dy / dist) * enemy.speed * deltaTime;
      }

      // 碰撞玩家
      if (dist < this.state.player.radius + enemy.radius) {
        this.damagePlayer(enemy.attack * deltaTime * 2);
      }
    });

    // 移除死亡敵人
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.isAlive);
  }

  private updateAttackEffects(deltaTime: number): void {
    this.state.attackEffects.forEach((effect) => {
      effect.lifetime += deltaTime;
    });

    this.state.attackEffects = this.state.attackEffects.filter(
      (effect) => effect.lifetime < effect.maxLifetime
    );
  }

  private spawnWave(): void {
    const wave = this.state.wave;
    let minionsCount = 3 + wave * 2;
    let elitesCount = Math.floor(wave / 3);
    let bossCount = wave % 5 === 0 ? 1 : 0;

    this.state.enemiesRemaining = minionsCount + elitesCount + bossCount;

    // 生成小兵
    for (let i = 0; i < minionsCount; i++) {
      this.spawnEnemy(EnemyType.MINION);
    }

    // 生成精英
    for (let i = 0; i < elitesCount; i++) {
      this.spawnEnemy(EnemyType.ELITE);
    }

    // 生成Boss
    if (bossCount > 0) {
      this.spawnEnemy(EnemyType.BOSS);
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const config = ENEMY_CONFIGS[type];
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // 上
        x = Math.random() * this.config.canvasWidth;
        y = -config.radius;
        break;
      case 1: // 下
        x = Math.random() * this.config.canvasWidth;
        y = this.config.canvasHeight + config.radius;
        break;
      case 2: // 左
        x = -config.radius;
        y = Math.random() * this.config.canvasHeight;
        break;
      default: // 右
        x = this.config.canvasWidth + config.radius;
        y = Math.random() * this.config.canvasHeight;
    }

    this.state.enemies.push({
      id: this.nextEnemyId++,
      type,
      x,
      y,
      radius: config.radius,
      health: config.health,
      maxHealth: config.health,
      attack: config.attack,
      speed: config.speed,
      worth: config.worth,
      color: config.color,
      isAlive: true,
      stunned: 0,
      targetAngle: 0,
    });
  }

  private nextWave(): void {
    this.state.wave++;
    this.state.waveTimer = 0;
    this.spawnWave();
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());

    // 攻擊
    if (key === 'j' || key === 'J') {
      this.performAttack();
    }

    // 格擋
    if (key === 'k' || key === 'K') {
      this.state.player.isBlocking = true;
    }

    // 特殊技能
    if (key === 'l' || key === 'L') {
      this.performSpecialAttack();
    }
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());

    if (key === 'k' || key === 'K') {
      this.state.player.isBlocking = false;
    }
  }

  private performAttack(): void {
    if (this.state.player.attackCooldown > 0) return;

    this.state.player.isAttacking = true;
    this.state.player.attackCooldown = this.config.attackCooldown;

    // 尋找最近的敵人
    let nearestEnemy: Enemy | null = null;
    let minDist = 150; // 攻擊範圍

    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - this.state.player.x;
      const dy = enemy.y - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy) {
      const angle = Math.atan2(
        nearestEnemy.y - this.state.player.y,
        nearestEnemy.x - this.state.player.x
      );

      // 創建攻擊特效
      this.state.attackEffects.push({
        id: this.nextEffectId++,
        x: this.state.player.x,
        y: this.state.player.y,
        angle,
        lifetime: 0,
        maxLifetime: 0.2,
        type: 'slash',
      });

      // 造成傷害
      const damage = this.state.player.attack * (1 + this.state.combo * 0.1);
      this.damageEnemy(nearestEnemy, damage);
    }

    setTimeout(() => {
      this.state.player.isAttacking = false;
    }, 200);
  }

  private performSpecialAttack(): void {
    if (this.state.player.specialEnergy < this.state.player.maxSpecialEnergy) return;

    this.state.player.specialEnergy = 0;

    // 創建範圍攻擊特效
    this.state.attackEffects.push({
      id: this.nextEffectId++,
      x: this.state.player.x,
      y: this.state.player.y,
      angle: 0,
      lifetime: 0,
      maxLifetime: 0.5,
      type: 'area',
    });

    // 對範圍內所有敵人造成傷害
    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - this.state.player.x;
      const dy = enemy.y - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        this.damageEnemy(enemy, this.state.player.attack * 2);
        enemy.stunned = 1.0;
      }
    });
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    enemy.health -= damage;
    if (enemy.health <= 0) {
      enemy.isAlive = false;
      this.state.kills++;
      this.state.enemiesRemaining--;
      this.state.score += enemy.worth * (1 + this.state.combo);
      this.state.combo++;
      this.state.comboTimer = this.config.comboTimeout;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

      // 恢復特殊能量
      this.state.player.specialEnergy = Math.min(
        this.state.player.maxSpecialEnergy,
        this.state.player.specialEnergy + 15
      );
    }
  }

  private damagePlayer(damage: number): void {
    if (this.state.player.isBlocking) {
      // 護盾吸收傷害
      const shieldDamage = Math.min(this.state.player.shield, damage * 0.7);
      this.state.player.shield -= shieldDamage;
      damage -= shieldDamage;
    }

    this.state.player.health -= damage;
    this.state.player.health = Math.max(0, this.state.player.health);

    // 受傷時重置連擊
    if (damage > 0) {
      this.state.combo = 0;
      this.state.comboTimer = 0;
    }
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
  }
}

export default OrderGuardianGame;
