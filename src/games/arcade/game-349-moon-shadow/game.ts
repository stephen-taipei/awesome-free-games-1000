/**
 * 月影刺客遊戲核心邏輯
 * Game #349 - 月影刺客
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
  stealthEnergy: number;
  maxStealthEnergy: number;
  isStealthed: boolean;
  criticalRate: number;
  damage: number;
  velocity: Vector;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  patrolPoints: Vector[];
  currentPatrolIndex: number;
  speed: number;
  detectionRange: number;
  isAlerted: boolean;
  alertTimer: number;
  targetX?: number;
  targetY?: number;
}

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  alpha: number;
  color: string;
  lifetime: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  isCritical: boolean;
  alpha: number;
  velocityY: number;
}

export type Skill = 'moonSlash' | 'shadowClone' | 'nightDash';

export interface GameState {
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  damageNumbers: DamageNumber[];
  score: number;
  bestScore: number;
  kills: number;
  gameOver: boolean;
  isPlaying: boolean;
  difficulty: number;
  activeSkill: Skill | null;
  skillCooldowns: Record<Skill, number>;
  skillMaxCooldowns: Record<Skill, number>;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  enemyRadius: number;
  playerSpeed: number;
  stealthDrainRate: number;
  stealthRechargeRate: number;
  baseCriticalRate: number;
  stealthCriticalRate: number;
}

const SKILL_CONFIGS = {
  moonSlash: {
    cooldown: 8,
    damage: 150,
    range: 120,
  },
  shadowClone: {
    cooldown: 12,
    duration: 5,
  },
  nightDash: {
    cooldown: 6,
    distance: 150,
  },
};

export class MoonShadowGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private nextEnemyId: number = 1;
  private onStateChange?: (state: GameState) => void;
  private keys: Set<string> = new Set();
  private mousePosition: Vector = { x: 0, y: 0 };
  private shadowCloneTimer: number = 0;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 12,
      enemyRadius: config.enemyRadius ?? 14,
      playerSpeed: config.playerSpeed ?? 200,
      stealthDrainRate: config.stealthDrainRate ?? 25,
      stealthRechargeRate: config.stealthRechargeRate ?? 15,
      baseCriticalRate: config.baseCriticalRate ?? 0.15,
      stealthCriticalRate: config.stealthCriticalRate ?? 0.8,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight - 50,
        radius: this.config.playerRadius,
        health: 100,
        maxHealth: 100,
        stealthEnergy: 100,
        maxStealthEnergy: 100,
        isStealthed: false,
        criticalRate: this.config.baseCriticalRate,
        damage: 30,
        velocity: { x: 0, y: 0 },
      },
      enemies: [],
      particles: [],
      damageNumbers: [],
      score: 0,
      bestScore: this.loadBestScore(),
      kills: 0,
      gameOver: false,
      isPlaying: false,
      difficulty: 1,
      activeSkill: null,
      skillCooldowns: {
        moonSlash: 0,
        shadowClone: 0,
        nightDash: 0,
      },
      skillMaxCooldowns: {
        moonSlash: SKILL_CONFIGS.moonSlash.cooldown,
        shadowClone: SKILL_CONFIGS.shadowClone.cooldown,
        nightDash: SKILL_CONFIGS.nightDash.cooldown,
      },
    };
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_349_moon_shadow_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_349_moon_shadow_best', score.toString());
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
    this.shadowCloneTimer = 0;
    this.keys.clear();

    // 初始化敵人
    this.spawnEnemy();
    this.spawnEnemy();

    this.gameLoop();
    this.notifyStateChange();
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
    // 更新難度
    this.state.difficulty = 1 + Math.floor(this.state.kills / 5) * 0.3;

    // 更新玩家移動
    this.updatePlayerMovement(deltaTime);

    // 更新隱身能量
    this.updateStealthEnergy(deltaTime);

    // 更新技能冷卻
    this.updateSkillCooldowns(deltaTime);

    // 更新影分身
    this.updateShadowClone(deltaTime);

    // 生成敵人
    this.updateEnemySpawn(deltaTime);

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 更新粒子效果
    this.updateParticles(deltaTime);

    // 更新傷害數字
    this.updateDamageNumbers(deltaTime);

    // 檢查碰撞
    this.checkCollisions();
  }

  private updatePlayerMovement(deltaTime: number): void {
    const player = this.state.player;
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has('w') || this.keys.has('ArrowUp')) moveY -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) moveY += 1;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) moveX += 1;

    // 正規化移動向量
    if (moveX !== 0 || moveY !== 0) {
      const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= magnitude;
      moveY /= magnitude;
    }

    const speed = player.isStealthed ? this.config.playerSpeed * 0.7 : this.config.playerSpeed;
    player.velocity.x = moveX * speed;
    player.velocity.y = moveY * speed;

    player.x += player.velocity.x * deltaTime;
    player.y += player.velocity.y * deltaTime;

    // 限制在畫面內
    player.x = Math.max(player.radius, Math.min(this.config.canvasWidth - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(this.config.canvasHeight - player.radius, player.y));
  }

  private updateStealthEnergy(deltaTime: number): void {
    const player = this.state.player;

    if (player.isStealthed) {
      player.stealthEnergy -= this.config.stealthDrainRate * deltaTime;
      if (player.stealthEnergy <= 0) {
        player.stealthEnergy = 0;
        player.isStealthed = false;
        player.criticalRate = this.config.baseCriticalRate;
      }
    } else {
      player.stealthEnergy = Math.min(
        player.maxStealthEnergy,
        player.stealthEnergy + this.config.stealthRechargeRate * deltaTime
      );
    }
  }

  private updateSkillCooldowns(deltaTime: number): void {
    const skills: Skill[] = ['moonSlash', 'shadowClone', 'nightDash'];
    skills.forEach((skill) => {
      if (this.state.skillCooldowns[skill] > 0) {
        this.state.skillCooldowns[skill] = Math.max(0, this.state.skillCooldowns[skill] - deltaTime);
      }
    });
  }

  private updateShadowClone(deltaTime: number): void {
    if (this.shadowCloneTimer > 0) {
      this.shadowCloneTimer -= deltaTime;

      // 影分身效果：干擾敵人
      if (Math.random() < 0.1) {
        const cloneX = this.state.player.x + (Math.random() - 0.5) * 100;
        const cloneY = this.state.player.y + (Math.random() - 0.5) * 100;
        this.createParticles(cloneX, cloneY, '#9b59b6', 3);
      }
    }
  }

  private updateEnemySpawn(deltaTime: number): void {
    this.spawnTimer += deltaTime;
    const spawnInterval = Math.max(3, 6 - this.state.difficulty * 0.5);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }
  }

  private spawnEnemy(): void {
    const margin = 50;
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // 上
        x = Math.random() * this.config.canvasWidth;
        y = -margin;
        break;
      case 1: // 右
        x = this.config.canvasWidth + margin;
        y = Math.random() * this.config.canvasHeight;
        break;
      case 2: // 下
        x = Math.random() * this.config.canvasWidth;
        y = this.config.canvasHeight + margin;
        break;
      default: // 左
        x = -margin;
        y = Math.random() * this.config.canvasHeight;
    }

    // 生成巡邏點
    const patrolPoints: Vector[] = [];
    const numPoints = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numPoints; i++) {
      patrolPoints.push({
        x: Math.random() * this.config.canvasWidth,
        y: Math.random() * this.config.canvasHeight,
      });
    }

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      x,
      y,
      radius: this.config.enemyRadius,
      health: 100,
      maxHealth: 100,
      patrolPoints,
      currentPatrolIndex: 0,
      speed: 50 + this.state.difficulty * 10,
      detectionRange: 120 - (this.state.difficulty * 5),
      isAlerted: false,
      alertTimer: 0,
    };

    this.state.enemies.push(enemy);
  }

  private updateEnemies(deltaTime: number): void {
    const player = this.state.player;

    this.state.enemies.forEach((enemy) => {
      // 更新警戒狀態
      if (enemy.isAlerted && enemy.alertTimer > 0) {
        enemy.alertTimer -= deltaTime;
        if (enemy.alertTimer <= 0) {
          enemy.isAlerted = false;
        }
      }

      // 檢測玩家（隱身時不被發現）
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!player.isStealthed && distance < enemy.detectionRange) {
        enemy.isAlerted = true;
        enemy.alertTimer = 2;
        enemy.targetX = player.x;
        enemy.targetY = player.y;
      }

      // 移動邏輯
      let targetX: number, targetY: number;

      if (enemy.isAlerted && enemy.targetX !== undefined && enemy.targetY !== undefined) {
        // 追擊玩家
        targetX = enemy.targetX;
        targetY = enemy.targetY;
      } else {
        // 巡邏
        const targetPoint = enemy.patrolPoints[enemy.currentPatrolIndex];
        targetX = targetPoint.x;
        targetY = targetPoint.y;

        // 到達巡邏點，切換到下一個
        const distToPatrol = Math.sqrt(
          (targetX - enemy.x) ** 2 + (targetY - enemy.y) ** 2
        );
        if (distToPatrol < 10) {
          enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
        }
      }

      // 移動向目標點
      const dx2 = targetX - enemy.x;
      const dy2 = targetY - enemy.y;
      const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      if (dist > 5) {
        const moveSpeed = enemy.isAlerted ? enemy.speed * 1.5 : enemy.speed;
        enemy.x += (dx2 / dist) * moveSpeed * deltaTime;
        enemy.y += (dy2 / dist) * moveSpeed * deltaTime;
      }
    });

    // 移除死亡的敵人
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.health > 0);
  }

  private updateParticles(deltaTime: number): void {
    this.state.particles.forEach((particle) => {
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      particle.alpha -= deltaTime / particle.lifetime;
    });

    this.state.particles = this.state.particles.filter((p) => p.alpha > 0);
  }

  private updateDamageNumbers(deltaTime: number): void {
    this.state.damageNumbers.forEach((dmg) => {
      dmg.y += dmg.velocityY * deltaTime;
      dmg.alpha -= deltaTime * 0.8;
    });

    this.state.damageNumbers = this.state.damageNumbers.filter((d) => d.alpha > 0);
  }

  private checkCollisions(): void {
    const player = this.state.player;

    // 玩家與敵人碰撞（非隱身時）
    if (!player.isStealthed) {
      this.state.enemies.forEach((enemy) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + enemy.radius) {
          this.damagePlayer(20);
          this.createParticles(player.x, player.y, '#e74c3c', 8);
        }
      });
    }
  }

  private damagePlayer(damage: number): void {
    this.state.player.health -= damage;
    if (this.state.player.health <= 0) {
      this.state.player.health = 0;
      this.gameOver();
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, isCritical: boolean): void {
    enemy.health -= damage;

    // 顯示傷害數字
    this.state.damageNumbers.push({
      x: enemy.x,
      y: enemy.y,
      value: Math.floor(damage),
      isCritical,
      alpha: 1,
      velocityY: -50,
    });

    if (enemy.health <= 0) {
      this.state.kills++;
      this.state.score += isCritical ? 200 : 100;
      this.createParticles(enemy.x, enemy.y, '#e74c3c', 15);
    } else {
      this.createParticles(enemy.x, enemy.y, '#f39c12', 5);
    }
  }

  private createParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 50 + Math.random() * 100;
      this.state.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        alpha: 1,
        color,
        lifetime: 0.5 + Math.random() * 0.5,
      });
    }
  }

  setKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  setKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  setMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
  }

  toggleStealth(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const player = this.state.player;
    if (player.stealthEnergy > 0) {
      player.isStealthed = !player.isStealthed;
      player.criticalRate = player.isStealthed
        ? this.config.stealthCriticalRate
        : this.config.baseCriticalRate;

      if (player.isStealthed) {
        this.createParticles(player.x, player.y, '#3498db', 10);
      }
    } else {
      player.isStealthed = false;
      player.criticalRate = this.config.baseCriticalRate;
    }
  }

  attack(): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const player = this.state.player;
    const attackRange = 50;

    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < attackRange + enemy.radius) {
        const isCritical = Math.random() < player.criticalRate;
        const damage = player.damage * (isCritical ? 2 : 1);
        this.damageEnemy(enemy, damage, isCritical);
      }
    });

    this.createParticles(player.x, player.y, '#ecf0f1', 6);
  }

  useSkill(skill: Skill): void {
    if (!this.state.isPlaying || this.state.gameOver) return;
    if (this.state.skillCooldowns[skill] > 0) return;

    this.state.activeSkill = skill;
    this.state.skillCooldowns[skill] = this.state.skillMaxCooldowns[skill];

    switch (skill) {
      case 'moonSlash':
        this.executeMoonSlash();
        break;
      case 'shadowClone':
        this.executeShadowClone();
        break;
      case 'nightDash':
        this.executeNightDash();
        break;
    }

    setTimeout(() => {
      this.state.activeSkill = null;
    }, 500);
  }

  private executeMoonSlash(): void {
    const player = this.state.player;
    const config = SKILL_CONFIGS.moonSlash;

    this.state.enemies.forEach((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < config.range) {
        this.damageEnemy(enemy, config.damage, true);
      }
    });

    // 視覺效果
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const x = player.x + Math.cos(angle) * config.range;
      const y = player.y + Math.sin(angle) * config.range;
      this.state.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * 100,
        velocityY: Math.sin(angle) * 100,
        size: 4,
        alpha: 1,
        color: '#f1c40f',
        lifetime: 0.5,
      });
    }
  }

  private executeShadowClone(): void {
    this.shadowCloneTimer = SKILL_CONFIGS.shadowClone.duration;
    this.createParticles(this.state.player.x, this.state.player.y, '#9b59b6', 20);
  }

  private executeNightDash(): void {
    const player = this.state.player;
    const config = SKILL_CONFIGS.nightDash;

    // 向滑鼠方向衝刺
    const dx = this.mousePosition.x - player.x;
    const dy = this.mousePosition.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const dashX = (dx / distance) * config.distance;
      const dashY = (dy / distance) * config.distance;

      player.x += dashX;
      player.y += dashY;

      // 限制在畫面內
      player.x = Math.max(player.radius, Math.min(this.config.canvasWidth - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(this.config.canvasHeight - player.radius, player.y));

      // 軌跡效果
      for (let i = 0; i < 15; i++) {
        this.state.particles.push({
          x: player.x - dashX * (i / 15),
          y: player.y - dashY * (i / 15),
          velocityX: 0,
          velocityY: 0,
          size: 6,
          alpha: 1 - i / 15,
          color: '#3498db',
          lifetime: 0.3,
        });
      }
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
    this.keys.clear();
  }
}

export default MoonShadowGame;
