/**
 * Element Mage Game Logic
 * Game #285 - Magic Combat with Elements
 */

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  vx: number;
  vy: number;
  speed: number;
  facing: 'left' | 'right';
  currentElement: 'fire' | 'ice' | 'lightning';
  isCasting: boolean;
  castFrame: number;
  lastCast: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  type: 'imp' | 'golem' | 'dragon';
  color: string;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  state: 'idle' | 'chasing' | 'attacking';
  isHit: boolean;
  hitFrame: number;
  lastAttack: number;
  statusEffect: 'burn' | 'frozen' | 'shocked' | null;
  statusDuration: number;
}

export interface Spell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  element: 'fire' | 'ice' | 'lightning';
  color: string;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'victory' | 'defeat';
  player: Player;
  enemies: Enemy[];
  spells: Spell[];
  particles: Particle[];
  score: number;
  stage: number;
  enemiesDefeated: number;
}

const ARENA_WIDTH = 450;
const ARENA_HEIGHT = 400;

export class ElementMageGame {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  private keys: Set<string> = new Set();
  private gameLoop: number | null = null;
  private lastTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'idle',
      player: this.createPlayer(),
      enemies: [],
      spells: [],
      particles: [],
      score: 0,
      stage: 1,
      enemiesDefeated: 0,
    };
  }

  private createPlayer(): Player {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT - 100,
      width: 30,
      height: 40,
      hp: 100,
      maxHp: 100,
      mana: 100,
      maxMana: 100,
      vx: 0,
      vy: 0,
      speed: 3.5,
      facing: 'right',
      currentElement: 'fire',
      isCasting: false,
      castFrame: 0,
      lastCast: 0,
    };
  }

  private createEnemy(stage: number, type: 'imp' | 'golem' | 'dragon', xPos: number, yPos: number): Enemy {
    let hp: number, damage: number, color: string, width: number, height: number;

    switch (type) {
      case 'dragon':
        hp = 150 + stage * 25; damage = 35; color = '#e74c3c'; width = 55; height = 60;
        break;
      case 'golem':
        hp = 120 + stage * 20; damage = 28; color = '#7f8c8d'; width = 45; height: 55;
        break;
      default:
        hp = 60 + stage * 12; damage = 18; color = '#e67e22'; width = 32; height = 42;
    }

    return {
      x: xPos,
      y: yPos,
      width, height, hp, maxHp: hp, damage, type, color,
      vx: 0, vy: 0,
      facing: 'left',
      state: 'idle',
      isHit: false,
      hitFrame: 0,
      lastAttack: 0,
      statusEffect: null,
      statusDuration: 0,
    };
  }

  public start(): void {
    this.state = this.createInitialState();
    this.state.phase = 'playing';
    this.spawnStage();
    this.lastTime = performance.now();
    this.startGameLoop();
    this.emitState();
  }

  private spawnStage(): void {
    const stage = this.state.stage;
    const impCount = 4 + stage;
    const golemCount = Math.floor(stage / 2);
    const hasDragon = stage % 3 === 0;

    for (let i = 0; i < impCount; i++) {
      const side = i % 2 === 0;
      this.state.enemies.push(this.createEnemy(stage, 'imp',
        side ? 50 + Math.random() * 50 : ARENA_WIDTH - 100 + Math.random() * 50,
        60 + i * 50
      ));
    }
    for (let i = 0; i < golemCount; i++) {
      this.state.enemies.push(this.createEnemy(stage, 'golem',
        100 + i * 120,
        80 + Math.random() * 50
      ));
    }
    if (hasDragon) {
      this.state.enemies.push(this.createEnemy(stage, 'dragon', ARENA_WIDTH / 2, 60));
    }
  }

  private startGameLoop(): void {
    const loop = (time: number) => {
      if (this.state.phase !== 'playing') return;
      const dt = Math.min(time - this.lastTime, 50);
      this.lastTime = time;
      this.update(dt);
      this.emitState();
      this.gameLoop = requestAnimationFrame(loop);
    };
    this.gameLoop = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateSpells(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.checkStageComplete();
    this.checkGameOver();
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const moveSpeed = player.speed * (dt / 16);

    if (!player.isCasting) {
      player.vx = 0;
      player.vy = 0;

      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        player.vx = -moveSpeed;
        player.facing = 'left';
      }
      if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        player.vx = moveSpeed;
        player.facing = 'right';
      }
      if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
        player.vy = -moveSpeed;
      }
      if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
        player.vy = moveSpeed;
      }
    }

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(player.width / 2, Math.min(ARENA_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(ARENA_HEIGHT - player.height / 2, player.y));

    if (player.isCasting) {
      player.castFrame++;
      if (player.castFrame > 10) {
        player.isCasting = false;
        player.castFrame = 0;
      }
    }

    player.mana = Math.min(player.maxMana, player.mana + 0.08 * (dt / 16));
  }

  private updateEnemies(dt: number): void {
    const { player, enemies } = this.state;
    const now = performance.now();

    enemies.forEach(enemy => {
      // Status effects
      if (enemy.statusEffect) {
        enemy.statusDuration -= dt / 16;
        if (enemy.statusDuration <= 0) {
          enemy.statusEffect = null;
        } else if (enemy.statusEffect === 'burn') {
          if (Math.random() < 0.02) {
            enemy.hp -= 1;
            this.spawnHitParticles(enemy.x, enemy.y, '#e74c3c');
          }
        } else if (enemy.statusEffect === 'frozen') {
          return; // Skip movement
        } else if (enemy.statusEffect === 'shocked') {
          if (Math.random() < 0.01) {
            this.spawnHitParticles(enemy.x, enemy.y, '#f1c40f');
          }
        }
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 250) {
        enemy.state = 'chasing';
        const speed = (enemy.type === 'dragon' ? 2 : enemy.type === 'golem' ? 1.3 : 1.8) * (dt / 16);
        const slowFactor = enemy.statusEffect === 'shocked' ? 0.5 : 1;
        enemy.vx = (dx / dist) * speed * slowFactor;
        enemy.vy = (dy / dist) * speed * slowFactor;
        enemy.facing = dx > 0 ? 'right' : 'left';

        if (dist < 45 && now - enemy.lastAttack > 1500) {
          enemy.state = 'attacking';
          player.hp -= enemy.damage;
          enemy.lastAttack = now;
          this.spawnHitParticles(player.x, player.y, '#e74c3c');
        }
      } else {
        enemy.state = 'idle';
        enemy.vx *= 0.9;
        enemy.vy *= 0.9;
      }

      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      enemy.x = Math.max(enemy.width / 2, Math.min(ARENA_WIDTH - enemy.width / 2, enemy.x));
      enemy.y = Math.max(enemy.height / 2, Math.min(ARENA_HEIGHT - enemy.height / 2, enemy.y));

      if (enemy.isHit) {
        enemy.hitFrame++;
        if (enemy.hitFrame > 8) {
          enemy.isHit = false;
          enemy.hitFrame = 0;
        }
      }
    });
  }

  private updateSpells(dt: number): void {
    const speed = dt / 16;
    this.state.spells = this.state.spells.filter(spell => {
      spell.x += spell.vx * speed;
      spell.y += spell.vy * speed;
      spell.life--;

      // Lightning chaining
      if (spell.element === 'lightning' && spell.life % 5 === 0) {
        this.spawnHitParticles(spell.x, spell.y, '#f1c40f');
      }

      return spell.life > 0 && spell.x > 0 && spell.x < ARENA_WIDTH && spell.y > 0 && spell.y < ARENA_HEIGHT;
    });
  }

  private updateParticles(dt: number): void {
    const speed = dt / 16;
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.vy += 0.1 * speed;
      p.life -= speed;
      return p.life > 0;
    });
  }

  private checkCollisions(): void {
    const { enemies, spells } = this.state;

    spells.forEach((spell, sIdx) => {
      enemies.forEach((enemy, eIdx) => {
        if (Math.abs(spell.x - enemy.x) < enemy.width / 2 + spell.width / 2 &&
            Math.abs(spell.y - enemy.y) < enemy.height / 2 + spell.height / 2) {

          enemy.hp -= spell.damage;
          enemy.isHit = true;
          enemy.hitFrame = 0;
          this.spawnHitParticles(enemy.x, enemy.y, spell.color);

          // Apply status effects
          if (spell.element === 'fire' && !enemy.statusEffect) {
            enemy.statusEffect = 'burn';
            enemy.statusDuration = 180;
          } else if (spell.element === 'ice' && !enemy.statusEffect) {
            enemy.statusEffect = 'frozen';
            enemy.statusDuration = 120;
          } else if (spell.element === 'lightning' && !enemy.statusEffect) {
            enemy.statusEffect = 'shocked';
            enemy.statusDuration = 150;
          }

          spells.splice(sIdx, 1);

          if (enemy.hp <= 0) {
            this.killEnemy(eIdx);
          }
        }
      });
    });
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20,
        maxLife: 20,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  private killEnemy(index: number): void {
    const enemy = this.state.enemies[index];
    this.spawnDeathParticles(enemy.x, enemy.y, enemy.color);
    this.state.enemies.splice(index, 1);
    this.state.enemiesDefeated++;

    const baseScore = enemy.type === 'dragon' ? 600 : enemy.type === 'golem' ? 250 : 120;
    this.state.score += baseScore * this.state.stage;
  }

  private spawnDeathParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * (3 + Math.random() * 5),
        vy: Math.sin(angle) * (3 + Math.random() * 5),
        life: 40,
        maxLife: 40,
        color,
        size: 4 + Math.random() * 5,
      });
    }
  }

  private checkStageComplete(): void {
    if (this.state.enemies.length === 0) {
      this.state.stage++;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 30);
      this.state.player.mana = this.state.player.maxMana;
      this.spawnStage();
    }
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.stopGameLoop();
    }
  }

  public castSpell(): void {
    if (this.state.phase !== 'playing') return;
    const { player } = this.state;
    const now = performance.now();

    const manaCost = player.currentElement === 'lightning' ? 25 : player.currentElement === 'ice' ? 20 : 15;
    if (player.isCasting || now - player.lastCast < 300 || player.mana < manaCost) return;

    player.mana -= manaCost;
    player.lastCast = now;
    player.isCasting = true;
    player.castFrame = 0;

    let color: string, damage: number, speed: number;
    switch (player.currentElement) {
      case 'fire':
        color = '#e74c3c'; damage = 30; speed = 8;
        break;
      case 'ice':
        color = '#3498db'; damage = 25; speed = 6;
        break;
      case 'lightning':
        color = '#f1c40f'; damage = 35; speed = 12;
        break;
    }

    this.state.spells.push({
      x: player.x + (player.facing === 'right' ? 20 : -20),
      y: player.y,
      vx: player.facing === 'right' ? speed : -speed,
      vy: 0,
      width: player.currentElement === 'ice' ? 18 : 15,
      height: player.currentElement === 'ice' ? 18 : 15,
      damage,
      element: player.currentElement,
      color,
      life: 100,
    });

    this.spawnHitParticles(player.x, player.y, color);
  }

  public switchElement(element: 'fire' | 'ice' | 'lightning'): void {
    if (this.state.phase !== 'playing') return;
    this.state.player.currentElement = element;
  }

  public handleKeyDown(code: string): void {
    this.keys.add(code);
    if (code === 'Space' || code === 'KeyJ') this.castSpell();
    if (code === 'Digit1' || code === 'KeyU') this.switchElement('fire');
    if (code === 'Digit2' || code === 'KeyI') this.switchElement('ice');
    if (code === 'Digit3' || code === 'KeyO') this.switchElement('lightning');
  }

  public handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }

  public getState(): GameState { return this.state; }
  public destroy(): void { this.stopGameLoop(); this.keys.clear(); }
  private emitState(): void { if (this.onStateChange) this.onStateChange(this.state); }
}
