// Extreme Escape - Extreme Runner Game
// Theme: Escape from a collapsing facility with traps and hazards

export interface Player {
  x: number;
  y: number;
  lane: number;
  targetLane: number;
  jumping: boolean;
  jumpVelocity: number;
  groundY: number;
  sliding: boolean;
  slideTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  health: number;
  maxHealth: number;
}

export interface Obstacle {
  x: number;
  y: number;
  lane: number;
  type: 'barrier' | 'laser' | 'spike' | 'falling' | 'electric';
  width: number;
  height: number;
  active: boolean;
  phase: number;
}

export interface Collectible {
  x: number;
  y: number;
  lane: number;
  type: 'health' | 'shield' | 'boost' | 'key';
  collected: boolean;
}

export interface Debris {
  x: number;
  y: number;
  size: number;
  rotation: number;
  speed: number;
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
  phase: 'idle' | 'playing' | 'gameover';
  score: number;
  distance: number;
  keysCollected: number;
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  debris: Debris[];
  particles: Particle[];
  alertLevel: number;
  maxAlertLevel: number;
  shakeIntensity: number;
  warningZone: number;
}

export type GamePhase = GameState['phase'];

const LANE_COUNT = 3;
const LANE_WIDTH = 80;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const PLAYER_SLIDE_HEIGHT = 25;
const JUMP_FORCE = -15;
const GRAVITY = 0.75;
const SLIDE_DURATION = 500;
const INVINCIBLE_DURATION = 1500;

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    distance: 0,
    keysCollected: 0,
    speed: 7,
    baseSpeed: 7,
    maxSpeed: 18,
    player: {
      x: 80,
      y: 300,
      lane: 1,
      targetLane: 1,
      jumping: false,
      jumpVelocity: 0,
      groundY: 300,
      sliding: false,
      slideTimer: 0,
      invincible: false,
      invincibleTimer: 0,
      health: 3,
      maxHealth: 3,
    },
    obstacles: [],
    collectibles: [],
    debris: [],
    particles: [],
    alertLevel: 0,
    maxAlertLevel: 100,
    shakeIntensity: 0,
    warningZone: 0,
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
  const types: Obstacle['type'][] = ['barrier', 'laser', 'spike', 'falling', 'electric'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  let width: number, height: number, y: number;

  switch (type) {
    case 'barrier':
      width = 40;
      height = 60;
      y = groundY;
      break;
    case 'laser':
      width = LANE_WIDTH;
      height = 8;
      y = groundY - 30;
      break;
    case 'spike':
      width = 50;
      height = 25;
      y = groundY;
      break;
    case 'falling':
      width = 45;
      height = 45;
      y = canvasHeight * 0.2;
      break;
    case 'electric':
      width = 35;
      height = 70;
      y = groundY;
      break;
    default:
      width = 40;
      height = 40;
      y = groundY;
  }

  const obstacle: Obstacle = {
    x: canvasWidth + 50,
    y,
    lane,
    type,
    width,
    height,
    active: true,
    phase: 0,
  };

  state.obstacles.push(obstacle);
}

function spawnCollectible(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Collectible['type'][] = ['health', 'shield', 'boost', 'key'];
  const weights = [0.3, 0.25, 0.25, 0.2];
  const rand = Math.random();
  let cumulative = 0;
  let type: Collectible['type'] = 'health';

  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      type = types[i];
      break;
    }
  }

  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  const collectible: Collectible = {
    x: canvasWidth + 50,
    y: groundY - 40,
    lane,
    type,
    collected: false,
  };

  state.collectibles.push(collectible);
}

function spawnDebris(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const debris: Debris = {
    x: Math.random() * canvasWidth,
    y: -20,
    size: 5 + Math.random() * 15,
    rotation: Math.random() * Math.PI * 2,
    speed: 2 + Math.random() * 4,
  };

  state.debris.push(debris);
}

function createDamageParticle(state: GameState, x: number, y: number): void {
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 30,
      maxLife: 30,
      color: '#ff4444',
      size: 4 + Math.random() * 4,
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
      life: 25,
      maxLife: 25,
      color,
      size: 5,
    });
  }
}

function createExplosionParticle(state: GameState, x: number, y: number): void {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 40,
      maxLife: 40,
      color: ['#ff6600', '#ff9900', '#ffcc00'][Math.floor(Math.random() * 3)],
      size: 6 + Math.random() * 8,
    });
  }
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

  // Update distance and score
  state.distance += state.speed * dt;
  state.score += Math.floor(state.speed * dt);

  // Gradually increase speed
  if (state.speed < state.maxSpeed) {
    state.speed += 0.002 * dt;
  }

  // Increase alert level over time
  state.alertLevel = Math.min(state.maxAlertLevel, state.alertLevel + 0.05 * dt);
  state.shakeIntensity = (state.alertLevel / state.maxAlertLevel) * 3;

  // Update warning zone (danger approaching from left)
  state.warningZone = Math.min(80, state.warningZone + 0.01 * dt);

  // Update player lane position
  const targetX = getLaneX(state.player.targetLane, canvasWidth);
  state.player.x += (targetX - state.player.x - PLAYER_WIDTH / 2) * 0.15 * dt;
  state.player.lane = state.player.targetLane;

  // Update player ground Y
  state.player.groundY = getLaneY(state.player.lane, canvasHeight);

  // Update slide timer
  if (state.player.sliding) {
    state.player.slideTimer -= deltaTime;
    if (state.player.slideTimer <= 0) {
      state.player.sliding = false;
    }
  }

  // Update jump physics
  if (state.player.jumping) {
    state.player.jumpVelocity += GRAVITY * dt;
    state.player.y += state.player.jumpVelocity * dt;

    if (state.player.y >= state.player.groundY) {
      state.player.y = state.player.groundY;
      state.player.jumping = false;
      state.player.jumpVelocity = 0;
    }
  } else if (!state.player.sliding) {
    state.player.y = state.player.groundY;
  }

  // Update invincibility
  if (state.player.invincible) {
    state.player.invincibleTimer -= deltaTime;
    if (state.player.invincibleTimer <= 0) {
      state.player.invincible = false;
    }
  }

  // Spawn entities
  const spawnRate = 1 + state.alertLevel / 50;
  if (Math.random() < 0.02 * spawnRate * dt) spawnObstacle(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.012 * dt) spawnCollectible(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.05 * (state.alertLevel / 50) * dt) spawnDebris(state, canvasWidth, canvasHeight);

  // Player hitbox
  const playerHeight = state.player.sliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
  const playerTop = state.player.y - playerHeight;
  const playerLeft = state.player.x;

  // Update obstacles
  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt;
    obstacle.phase += 0.1 * dt;

    // Falling obstacles
    if (obstacle.type === 'falling' && obstacle.y < getLaneY(0, canvasHeight)) {
      obstacle.y += 5 * dt;
    }

    // Laser toggle
    if (obstacle.type === 'laser') {
      obstacle.active = Math.sin(obstacle.phase * 2) > 0;
    }

    // Electric field toggle
    if (obstacle.type === 'electric') {
      obstacle.active = Math.sin(obstacle.phase * 3) > -0.3;
    }

    // Check collision
    if (obstacle.active && state.player.lane === obstacle.lane && !state.player.invincible) {
      let obstacleTop = obstacle.y - obstacle.height;
      let obstacleLeft = obstacle.x - obstacle.width / 2;

      // Special collision handling for different types
      if (obstacle.type === 'laser' && state.player.sliding) continue;
      if (obstacle.type === 'spike' && state.player.jumping) continue;

      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, playerHeight,
        obstacleLeft, obstacleTop, obstacle.width, obstacle.height
      )) {
        state.player.health--;
        state.player.invincible = true;
        state.player.invincibleTimer = INVINCIBLE_DURATION;
        createDamageParticle(state, state.player.x + PLAYER_WIDTH / 2, state.player.y - playerHeight / 2);

        if (obstacle.type === 'falling') {
          createExplosionParticle(state, obstacle.x, obstacle.y);
          obstacle.x = -100;
        }

        if (state.player.health <= 0) {
          state.phase = 'gameover';
          return;
        }
      }
    }
  }

  // Update collectibles
  for (const collectible of state.collectibles) {
    collectible.x -= state.speed * dt;

    if (!collectible.collected && state.player.lane === collectible.lane) {
      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, playerHeight,
        collectible.x - 15, collectible.y - 15, 30, 30
      )) {
        collectible.collected = true;

        switch (collectible.type) {
          case 'health':
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 1);
            createCollectParticle(state, collectible.x, collectible.y, '#2ecc71');
            break;
          case 'shield':
            state.player.invincible = true;
            state.player.invincibleTimer = 3000;
            createCollectParticle(state, collectible.x, collectible.y, '#3498db');
            break;
          case 'boost':
            state.score += 200;
            createCollectParticle(state, collectible.x, collectible.y, '#f39c12');
            break;
          case 'key':
            state.keysCollected++;
            state.score += 500;
            createCollectParticle(state, collectible.x, collectible.y, '#ffd93d');
            break;
        }
      }
    }
  }

  // Update debris
  for (const debris of state.debris) {
    debris.y += debris.speed * dt;
    debris.rotation += 0.05 * dt;
  }

  // Update particles
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }

  // Check if caught by warning zone
  if (state.player.x < state.warningZone) {
    state.player.health--;
    state.player.invincible = true;
    state.player.invincibleTimer = INVINCIBLE_DURATION;
    createDamageParticle(state, state.player.x + PLAYER_WIDTH / 2, state.player.y - playerHeight / 2);

    if (state.player.health <= 0) {
      state.phase = 'gameover';
      return;
    }
  }

  // Clean up
  state.obstacles = state.obstacles.filter(o => o.x > -100);
  state.collectibles = state.collectibles.filter(c => c.x > -50 && !c.collected);
  state.debris = state.debris.filter(d => d.y < canvasHeight + 50);
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
  if (!state.player.jumping && !state.player.sliding) {
    state.player.jumping = true;
    state.player.jumpVelocity = JUMP_FORCE;
  }
}

export function slide(state: GameState): void {
  if (state.phase !== 'playing') return;
  if (!state.player.jumping && !state.player.sliding) {
    state.player.sliding = true;
    state.player.slideTimer = SLIDE_DURATION;
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
    keysCollected: state.keysCollected,
    alertLevel: Math.floor(state.alertLevel),
  };
}
