/**
 * 征服者遊戲核心邏輯
 * Game #353 - 征服者
 */

export interface Vector {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  health: number;
  maxHealth: number;
  attack: number;
  conqueredTerritories: number;
}

export interface Territory {
  id: number;
  x: number;
  y: number;
  radius: number;
  conquered: boolean;
  captureProgress: number;
  color: string;
  bonus: TerritoryBonus;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  speed: number;
  territoryId: number;
  color: string;
  type: 'guard' | 'elite' | 'boss';
}

export interface Skill {
  id: string;
  name: string;
  cooldown: number;
  currentCooldown: number;
  active: boolean;
  duration: number;
  activeDuration: number;
}

export type TerritoryBonus = 'attack' | 'health' | 'speed';

export interface GameState {
  player: Player;
  territories: Territory[];
  enemies: Enemy[];
  skills: Skill[];
  score: number;
  bestScore: number;
  gameOver: boolean;
  isPlaying: boolean;
  playTime: number;
  level: number;
  totalTerritories: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerRadius: number;
  territoryRadius: number;
  enemyRadius: number;
  playerSpeed: number;
  captureSpeed: number;
}

const TERRITORY_COLORS = ['#ffd700', '#ff6b6b', '#48dbfb', '#1dd1a1', '#ff9ff3'];
const ENEMY_COLORS = {
  guard: '#ff6b6b',
  elite: '#ff3838',
  boss: '#8b0000',
};

export class ConquerorGame {
  private config: GameConfig;
  private state: GameState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private mousePos: Vector = { x: 0, y: 0 };
  private onStateChange?: (state: GameState) => void;
  private nextEnemyId: number = 0;
  private nextTerritoryId: number = 0;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      canvasWidth: config.canvasWidth ?? 400,
      canvasHeight: config.canvasHeight ?? 600,
      playerRadius: config.playerRadius ?? 20,
      territoryRadius: config.territoryRadius ?? 60,
      enemyRadius: config.enemyRadius ?? 15,
      playerSpeed: config.playerSpeed ?? 200,
      captureSpeed: config.captureSpeed ?? 0.3,
    };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    this.nextEnemyId = 0;
    this.nextTerritoryId = 0;

    const territories = this.generateTerritories(6);
    const enemies = this.generateEnemies(territories);

    return {
      player: {
        x: this.config.canvasWidth / 2,
        y: this.config.canvasHeight - 80,
        radius: this.config.playerRadius,
        speed: this.config.playerSpeed,
        health: 100,
        maxHealth: 100,
        attack: 20,
        conqueredTerritories: 0,
      },
      territories,
      enemies,
      skills: this.createSkills(),
      score: 0,
      bestScore: this.loadBestScore(),
      gameOver: false,
      isPlaying: false,
      playTime: 0,
      level: 1,
      totalTerritories: territories.length,
    };
  }

  private createSkills(): Skill[] {
    return [
      {
        id: 'expand',
        name: '領土擴張',
        cooldown: 15,
        currentCooldown: 0,
        active: false,
        duration: 5,
        activeDuration: 0,
      },
      {
        id: 'summon',
        name: '軍團召喚',
        cooldown: 20,
        currentCooldown: 0,
        active: false,
        duration: 8,
        activeDuration: 0,
      },
      {
        id: 'aura',
        name: '統御光環',
        cooldown: 12,
        currentCooldown: 0,
        active: false,
        duration: 6,
        activeDuration: 0,
      },
    ];
  }

  private generateTerritories(count: number): Territory[] {
    const territories: Territory[] = [];
    const bonusTypes: TerritoryBonus[] = ['attack', 'health', 'speed'];

    for (let i = 0; i < count; i++) {
      const x = Math.random() * (this.config.canvasWidth - 100) + 50;
      const y = Math.random() * (this.config.canvasHeight - 200) + 50;

      territories.push({
        id: this.nextTerritoryId++,
        x,
        y,
        radius: this.config.territoryRadius,
        conquered: false,
        captureProgress: 0,
        color: TERRITORY_COLORS[i % TERRITORY_COLORS.length],
        bonus: bonusTypes[i % bonusTypes.length],
      });
    }

    return territories;
  }

  private generateEnemies(territories: Territory[]): Enemy[] {
    const enemies: Enemy[] = [];

    territories.forEach((territory, index) => {
      const enemyType: 'guard' | 'elite' | 'boss' =
        index === territories.length - 1 ? 'boss' : index % 3 === 2 ? 'elite' : 'guard';

      const healthMultiplier = enemyType === 'boss' ? 3 : enemyType === 'elite' ? 2 : 1;

      enemies.push({
        id: this.nextEnemyId++,
        x: territory.x,
        y: territory.y,
        radius: this.config.enemyRadius * (enemyType === 'boss' ? 1.5 : 1),
        health: 50 * healthMultiplier,
        maxHealth: 50 * healthMultiplier,
        speed: 80 * (enemyType === 'boss' ? 0.7 : 1),
        territoryId: territory.id,
        color: ENEMY_COLORS[enemyType],
        type: enemyType,
      });
    });

    return enemies;
  }

  private loadBestScore(): number {
    try {
      return parseInt(localStorage.getItem('game_353_conqueror_best') || '0', 10);
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      localStorage.setItem('game_353_conqueror_best', score.toString());
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
    this.state.playTime += deltaTime;

    // 更新玩家位置（向滑鼠移動）
    this.updatePlayerMovement(deltaTime);

    // 更新技能冷卻
    this.updateSkills(deltaTime);

    // 更新領土佔領
    this.updateTerritoryCapture(deltaTime);

    // 更新敵人
    this.updateEnemies(deltaTime);

    // 碰撞檢測
    this.checkCollisions();

    // 計算分數
    this.state.score = this.state.player.conqueredTerritories * 100 + Math.floor(this.state.playTime * 10);

    // 檢查勝利條件
    if (this.state.player.conqueredTerritories === this.state.totalTerritories) {
      this.levelUp();
    }
  }

  private updatePlayerMovement(deltaTime: number): void {
    const dx = this.mousePos.x - this.state.player.x;
    const dy = this.mousePos.y - this.state.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      const moveDistance = Math.min(this.state.player.speed * deltaTime, distance);
      this.state.player.x += (dx / distance) * moveDistance;
      this.state.player.y += (dy / distance) * moveDistance;
    }

    // 邊界限制
    this.state.player.x = Math.max(
      this.state.player.radius,
      Math.min(this.config.canvasWidth - this.state.player.radius, this.state.player.x)
    );
    this.state.player.y = Math.max(
      this.state.player.radius,
      Math.min(this.config.canvasHeight - this.state.player.radius, this.state.player.y)
    );
  }

  private updateSkills(deltaTime: number): void {
    this.state.skills.forEach((skill) => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - deltaTime);
      }

      if (skill.active) {
        skill.activeDuration -= deltaTime;
        if (skill.activeDuration <= 0) {
          skill.active = false;
          skill.activeDuration = 0;
        }
      }
    });
  }

  private updateTerritoryCapture(deltaTime: number): void {
    this.state.territories.forEach((territory) => {
      if (territory.conquered) return;

      const dx = this.state.player.x - territory.x;
      const dy = this.state.player.y - territory.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 檢查是否有敵人守衛此領地
      const hasGuard = this.state.enemies.some(
        (enemy) => enemy.territoryId === territory.id && enemy.health > 0
      );

      if (distance < territory.radius && !hasGuard) {
        const captureRate = this.config.captureSpeed * deltaTime;
        const expandBonus = this.getSkill('expand')?.active ? 2 : 1;
        territory.captureProgress = Math.min(1, territory.captureProgress + captureRate * expandBonus);

        if (territory.captureProgress >= 1) {
          territory.conquered = true;
          this.state.player.conqueredTerritories++;
          this.applyTerritoryBonus(territory.bonus);
        }
      }
    });
  }

  private applyTerritoryBonus(bonus: TerritoryBonus): void {
    switch (bonus) {
      case 'attack':
        this.state.player.attack += 10;
        break;
      case 'health':
        this.state.player.maxHealth += 20;
        this.state.player.health = Math.min(
          this.state.player.maxHealth,
          this.state.player.health + 20
        );
        break;
      case 'speed':
        this.state.player.speed += 30;
        break;
    }
  }

  private updateEnemies(deltaTime: number): void {
    const auraActive = this.getSkill('aura')?.active ?? false;
    const summonActive = this.getSkill('summon')?.active ?? false;

    this.state.enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;

      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 敵人追蹤玩家
      if (distance > enemy.radius + this.state.player.radius + 10) {
        const moveSpeed = auraActive ? enemy.speed * 0.5 : enemy.speed;
        enemy.x += (dx / distance) * moveSpeed * deltaTime;
        enemy.y += (dy / distance) * moveSpeed * deltaTime;
      }

      // 召喚技能傷害
      if (summonActive && distance < 150) {
        enemy.health -= this.state.player.attack * 0.3 * deltaTime;
      }
    });

    // 移除死亡敵人
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.health > 0);
  }

  private checkCollisions(): void {
    this.state.enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;

      const dx = this.state.player.x - enemy.x;
      const dy = this.state.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < enemy.radius + this.state.player.radius) {
        // 玩家攻擊敵人
        enemy.health -= this.state.player.attack * 0.016; // 約每秒攻擊

        // 敵人攻擊玩家
        const damage = enemy.type === 'boss' ? 15 : enemy.type === 'elite' ? 10 : 5;
        this.state.player.health -= damage * 0.016;

        if (this.state.player.health <= 0) {
          this.gameOver();
        }
      }
    });
  }

  private levelUp(): void {
    this.state.level++;
    const newTerritories = this.generateTerritories(Math.min(8, 6 + this.state.level));
    const newEnemies = this.generateEnemies(newTerritories);

    this.state.territories = newTerritories;
    this.state.enemies = newEnemies;
    this.state.totalTerritories = newTerritories.length;
    this.state.player.conqueredTerritories = 0;

    // 恢復生命值
    this.state.player.health = this.state.player.maxHealth;
  }

  setMousePosition(x: number, y: number): void {
    this.mousePos = { x, y };
  }

  useSkill(skillId: string): void {
    if (!this.state.isPlaying || this.state.gameOver) return;

    const skill = this.state.skills.find((s) => s.id === skillId);
    if (!skill || skill.currentCooldown > 0 || skill.active) return;

    skill.active = true;
    skill.activeDuration = skill.duration;
    skill.currentCooldown = skill.cooldown;

    // 技能特殊效果
    if (skillId === 'summon') {
      // 召喚技能：對範圍內的敵人造成立即傷害
      this.state.enemies.forEach((enemy) => {
        const dx = this.state.player.x - enemy.x;
        const dy = this.state.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 150) {
          enemy.health -= this.state.player.attack;
        }
      });
    }
  }

  private getSkill(skillId: string): Skill | undefined {
    return this.state.skills.find((s) => s.id === skillId);
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

export default ConquerorGame;
