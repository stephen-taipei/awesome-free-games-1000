// Monster Chase - Monster Runner Game
// Theme: Being chased by a giant monster through a city

export interface Player {
  x: number;
  y: number;
  lane: number;
  targetLane: number;
  jumping: boolean;
  jumpVelocity: number;
  groundY: number;
  doubleJumpAvailable: boolean;
  adrenalineMode: boolean;
  adrenalineTimer: number;
}

export interface Obstacle {
  x: number;
  y: number;
  lane: number;
  type: 'car' | 'barrier' | 'debris' | 'hole' | 'fire';
  width: number;
  height: number;
}

export interface Powerup {
  x: number;
  y: number;
  lane: number;
  type: 'adrenaline' | 'slowdown' | 'coin';
  collected: boolean;
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

export interface Monster {
  x: number;
  y: number;
  mouthOpen: boolean;
  roarTimer: number;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'gameover';
  score: number;
  distance: number;
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  player: Player;
  monster: Monster;
  obstacles: Obstacle[];
  powerups: Powerup[];
  particles: Particle[];
  coins: number;
  monsterDistance: number;
  minMonsterDistance: number;
  maxMonsterDistance: number;
  screenShake: number;
  buildingDestruction: number[];
}

export type GamePhase = GameState['phase'];

const LANE_COUNT = 3;
const LANE_WIDTH = 80;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const JUMP_FORCE = -14;
const GRAVITY = 0.7;
const ADRENALINE_DURATION = 4000;
const ADRENALINE_SPEED_BONUS = 1.4;

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    distance: 0,
    speed: 7,
    baseSpeed: 7,
    maxSpeed: 18,
    player: {
      x: 150,
      y: 300,
      lane: 1,
      targetLane: 1,
      jumping: false,
      jumpVelocity: 0,
      groundY: 300,
      doubleJumpAvailable: true,
      adrenalineMode: false,
      adrenalineTimer: 0,
    },
    monster: {
      x: -100,
      y: 200,
      mouthOpen: false,
      roarTimer: 0,
    },
    obstacles: [],
    powerups: [],
    particles: [],
    coins: 0,
    monsterDistance: 150,
    minMonsterDistance: 80,
    maxMonsterDistance: 200,
    screenShake: 0,
    buildingDestruction: [],
  };
}

export function getLaneY(lane: number, canvasHeight: number): number {
  const groundY = canvasHeight * 0.75;
  return groundY;
}

export function getLaneX(lane: number, canvasWidth: number): number {
  const roadLeft = (canvasWidth - LANE_WIDTH * LANE_COUNT) / 2;
  return roadLeft + LANE_WIDTH * (lane + 0.5);
}

function spawnObstacle(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Obstacle['type'][] = ['car', 'barrier', 'debris', 'hole', 'fire'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  let width: number, height: number;
  switch (type) {
    case 'car':
      width = 50;
      height = 35;
      break;
    case 'barrier':
      width = 40;
      height = 50;
      break;
    case 'debris':
      width = 45;
      height = 40;
      break;
    case 'hole':
      width = 55;
      height = 15;
      break;
    case 'fire':
      width = 50;
      height = 45;
      break;
    default:
      width = 40;
      height = 40;
  }

  const obstacle: Obstacle = {
    x: canvasWidth + 50,
    y: groundY,
    lane,
    type,
    width,
    height,
  };

  state.obstacles.push(obstacle);
}

function spawnPowerup(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Powerup['type'][] = ['adrenaline', 'slowdown', 'coin'];
  const weights = [0.2, 0.2, 0.6];
  const rand = Math.random();
  let cumulative = 0;
  let type: Powerup['type'] = 'coin';

  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      type = types[i];
      break;
    }
  }

  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  const powerup: Powerup = {
    x: canvasWidth + 50,
    y: groundY - 35,
    lane,
    type,
    collected: false,
  };

  state.powerups.push(powerup);
}

function createMonsterStepParticle(state: GameState, canvasHeight: number): void {
  for (let i = 0; i < 15; i++) {
    state.particles.push({
      x: 30 + Math.random() * 50,
      y: canvasHeight * 0.75,
      vx: (Math.random() - 0.3) * 8,
      vy: -Math.random() * 8,
      life: 30,
      maxLife: 30,
      color: '#666',
      size: 5 + Math.random() * 10,
    });
  }
}

function createCollectParticle(state: GameState, x: number, y: number, color: string): void {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * 4,
      vy: Math.sin(angle) * 4,
      life: 20,
      maxLife: 20,
      color,
      size: 5,
    });
  }
}

function createAdrenalineParticle(state: GameState): void {
  const player = state.player;
  state.particles.push({
    x: player.x - 5,
    y: player.y - Math.random() * PLAYER_HEIGHT,
    vx: -3 - Math.random() * 3,
    vy: (Math.random() - 0.5) * 2,
    life: 15,
    maxLife: 15,
    color: '#ff6600',
    size: 4 + Math.random() * 4,
  });
}

function checkCollision(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function update(state: GameState, deltaTime: number, canvasWidth: number, canvasHeight: number): void {
  if (state.phase !== 'playing') return;

  const dt = deltaTime / 16.67;
  const effectiveSpeed = state.player.adrenalineMode ? state.speed * ADRENALINE_SPEED_BONUS : state.speed;

  // Update distance and score
  state.distance += effectiveSpeed * dt;
  state.score += Math.floor(effectiveSpeed * dt);

  // Gradually increase speed
  if (state.speed < state.maxSpeed) {
    state.speed += 0.002 * dt;
  }

  // Update adrenaline mode
  if (state.player.adrenalineMode) {
    state.player.adrenalineTimer -= deltaTime;
    createAdrenalineParticle(state);
    if (state.player.adrenalineTimer <= 0) {
      state.player.adrenalineMode = false;
    }
  }

  // Update monster distance (closer over time, affected by player actions)
  const targetMonsterDistance = Math.max(
    state.minMonsterDistance,
    state.maxMonsterDistance - state.distance * 0.01
  );

  // Monster gets closer when player is slow, farther when using adrenaline
  if (state.player.adrenalineMode) {
    state.monsterDistance = Math.min(state.maxMonsterDistance, state.monsterDistance + 0.3 * dt);
  } else {
    state.monsterDistance += (targetMonsterDistance - state.monsterDistance) * 0.01 * dt;
  }

  // Monster roar timing
  state.monster.roarTimer -= deltaTime;
  if (state.monster.roarTimer <= 0) {
    state.monster.mouthOpen = !state.monster.mouthOpen;
    state.monster.roarTimer = state.monster.mouthOpen ? 500 : 2000 + Math.random() * 3000;
    if (state.monster.mouthOpen) {
      state.screenShake = 5;
      createMonsterStepParticle(state, canvasHeight);
    }
  }

  // Screen shake decay
  state.screenShake *= 0.9;

  // Update player lane position
  const targetX = getLaneX(state.player.targetLane, canvasWidth);
  state.player.x += (targetX - state.player.x - PLAYER_WIDTH / 2) * 0.15 * dt;
  state.player.lane = state.player.targetLane;

  // Update player ground Y
  state.player.groundY = getLaneY(state.player.lane, canvasHeight);

  // Update jump physics
  if (state.player.jumping) {
    state.player.jumpVelocity += GRAVITY * dt;
    state.player.y += state.player.jumpVelocity * dt;

    if (state.player.y >= state.player.groundY) {
      state.player.y = state.player.groundY;
      state.player.jumping = false;
      state.player.jumpVelocity = 0;
      state.player.doubleJumpAvailable = true;
    }
  } else {
    state.player.y = state.player.groundY;
  }

  // Spawn entities
  if (Math.random() < 0.02 * dt) spawnObstacle(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.018 * dt) spawnPowerup(state, canvasWidth, canvasHeight);

  // Player hitbox
  const playerTop = state.player.y - PLAYER_HEIGHT;
  const playerLeft = state.player.x;

  // Update obstacles
  for (const obstacle of state.obstacles) {
    obstacle.x -= effectiveSpeed * dt;

    // Check collision
    if (state.player.lane === obstacle.lane) {
      let canAvoid = false;

      // Jumping avoids holes
      if (obstacle.type === 'hole' && state.player.jumping) {
        canAvoid = true;
      }

      if (!canAvoid && checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        obstacle.x - obstacle.width / 2, obstacle.y - obstacle.height, obstacle.width, obstacle.height
      )) {
        // Hit obstacle - slow down (monster catches up)
        state.monsterDistance -= 30;
        obstacle.x = -200; // Remove obstacle

        if (state.monsterDistance <= state.minMonsterDistance) {
          state.phase = 'gameover';
          return;
        }
      }
    }
  }

  // Update powerups
  for (const powerup of state.powerups) {
    powerup.x -= effectiveSpeed * dt;

    if (!powerup.collected && state.player.lane === powerup.lane) {
      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        powerup.x - 15, powerup.y - 15, 30, 30
      )) {
        powerup.collected = true;

        switch (powerup.type) {
          case 'adrenaline':
            state.player.adrenalineMode = true;
            state.player.adrenalineTimer = ADRENALINE_DURATION;
            createCollectParticle(state, powerup.x, powerup.y, '#ff6600');
            break;
          case 'slowdown':
            state.monsterDistance = Math.min(state.maxMonsterDistance, state.monsterDistance + 40);
            createCollectParticle(state, powerup.x, powerup.y, '#3498db');
            break;
          case 'coin':
            state.coins++;
            state.score += 25;
            createCollectParticle(state, powerup.x, powerup.y, '#ffd93d');
            break;
        }
      }
    }
  }

  // Check if monster caught player
  if (state.monsterDistance <= 0) {
    state.phase = 'gameover';
    return;
  }

  // Update particles
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 0.3 * dt; // Gravity on particles
    particle.life -= dt;
  }

  // Clean up
  state.obstacles = state.obstacles.filter(o => o.x > -100);
  state.powerups = state.powerups.filter(p => p.x > -50 && !p.collected);
  state.particles = state.particles.filter(p => p.life > 0);
}

export function moveLeft(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (state.player.targetLane > 0) {
    state.player.targetLane--;
  }
}

export function moveRight(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (state.player.targetLane < LANE_COUNT - 1) {
    state.player.targetLane++;
  }
}

export function jump(state: GameState): void {
  if (state.phase !== 'playing') return;

  if (!state.player.jumping) {
    state.player.jumping = true;
    state.player.jumpVelocity = JUMP_FORCE;
  } else if (state.player.doubleJumpAvailable) {
    state.player.jumpVelocity = JUMP_FORCE * 0.85;
    state.player.doubleJumpAvailable = false;
  }
}

export function startGame(state: GameState): void {
  Object.assign(state, createInitialState());
  state.phase = 'playing';
}

export function getStats(state: GameState) {
  return {
    score: Math.floor(state.score),
    distance: Math.floor(state.distance),
    coins: state.coins,
    escapedDistance: Math.floor(state.monsterDistance),
  };
}
