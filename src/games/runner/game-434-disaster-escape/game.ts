// Disaster Escape - Disaster Runner Game
// Theme: Escape from natural disasters - earthquake, volcano, tsunami

export interface Player {
  x: number;
  y: number;
  lane: number;
  targetLane: number;
  jumping: boolean;
  jumpVelocity: number;
  groundY: number;
  shieldActive: boolean;
  shieldTimer: number;
}

export interface Obstacle {
  x: number;
  y: number;
  lane: number;
  type: 'crack' | 'boulder' | 'lavaPool' | 'debris' | 'wave';
  width: number;
  height: number;
}

export interface Collectible {
  x: number;
  y: number;
  lane: number;
  type: 'survivor' | 'supply' | 'shield';
  collected: boolean;
}

export interface FallingObject {
  x: number;
  y: number;
  type: 'rock' | 'ash' | 'ember';
  size: number;
  speed: number;
  rotation: number;
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
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  fallingObjects: FallingObject[];
  particles: Particle[];
  survivors: number;
  supplies: number;
  disasterType: 'earthquake' | 'volcano' | 'tsunami';
  disasterIntensity: number;
  shakeIntensity: number;
  lavaLevel: number;
  waveDistance: number;
}

export type GamePhase = GameState['phase'];

const LANE_COUNT = 3;
const LANE_WIDTH = 80;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const JUMP_FORCE = -15;
const GRAVITY = 0.75;
const SHIELD_DURATION = 3000;

export function createInitialState(): GameState {
  const disasters: GameState['disasterType'][] = ['earthquake', 'volcano', 'tsunami'];
  const disasterType = disasters[Math.floor(Math.random() * disasters.length)];

  return {
    phase: 'idle',
    score: 0,
    distance: 0,
    speed: 7,
    baseSpeed: 7,
    maxSpeed: 16,
    player: {
      x: 80,
      y: 300,
      lane: 1,
      targetLane: 1,
      jumping: false,
      jumpVelocity: 0,
      groundY: 300,
      shieldActive: false,
      shieldTimer: 0,
    },
    obstacles: [],
    collectibles: [],
    fallingObjects: [],
    particles: [],
    survivors: 0,
    supplies: 0,
    disasterType,
    disasterIntensity: 0,
    shakeIntensity: 0,
    lavaLevel: 0,
    waveDistance: -100,
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
  let types: Obstacle['type'][];

  switch (state.disasterType) {
    case 'earthquake':
      types = ['crack', 'boulder', 'debris'];
      break;
    case 'volcano':
      types = ['lavaPool', 'boulder', 'debris'];
      break;
    case 'tsunami':
      types = ['debris', 'wave', 'boulder'];
      break;
    default:
      types = ['crack', 'boulder', 'debris'];
  }

  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const groundY = getLaneY(lane, canvasHeight);

  let width: number, height: number;
  switch (type) {
    case 'crack':
      width = 60;
      height = 15;
      break;
    case 'boulder':
      width = 45;
      height = 45;
      break;
    case 'lavaPool':
      width = 70;
      height = 20;
      break;
    case 'debris':
      width = 50;
      height = 40;
      break;
    case 'wave':
      width = 80;
      height = 60;
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

function spawnCollectible(state: GameState, canvasWidth: number, canvasHeight: number): void {
  const types: Collectible['type'][] = ['survivor', 'supply', 'shield'];
  const weights = [0.4, 0.4, 0.2];
  const rand = Math.random();
  let cumulative = 0;
  let type: Collectible['type'] = 'survivor';

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
    y: groundY - 35,
    lane,
    type,
    collected: false,
  };

  state.collectibles.push(collectible);
}

function spawnFallingObject(state: GameState, canvasWidth: number): void {
  let types: FallingObject['type'][];

  switch (state.disasterType) {
    case 'earthquake':
      types = ['rock', 'rock'];
      break;
    case 'volcano':
      types = ['rock', 'ash', 'ember'];
      break;
    case 'tsunami':
      types = ['rock'];
      break;
    default:
      types = ['rock'];
  }

  const type = types[Math.floor(Math.random() * types.length)];

  const obj: FallingObject = {
    x: Math.random() * canvasWidth,
    y: -20,
    type,
    size: type === 'ash' ? 3 + Math.random() * 5 : type === 'ember' ? 4 + Math.random() * 6 : 10 + Math.random() * 20,
    speed: 3 + Math.random() * 4 + state.disasterIntensity * 0.5,
    rotation: Math.random() * Math.PI * 2,
  };

  state.fallingObjects.push(obj);
}

function createRescueParticle(state: GameState, x: number, y: number): void {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * 4,
      vy: Math.sin(angle) * 4,
      life: 30,
      maxLife: 30,
      color: '#ffd93d',
      size: 5,
    });
  }
}

function createShieldParticle(state: GameState): void {
  const player = state.player;
  const angle = Math.random() * Math.PI * 2;
  state.particles.push({
    x: player.x + PLAYER_WIDTH / 2 + Math.cos(angle) * 25,
    y: player.y - PLAYER_HEIGHT / 2 + Math.sin(angle) * 25,
    vx: Math.cos(angle) * 1,
    vy: Math.sin(angle) * 1,
    life: 15,
    maxLife: 15,
    color: '#3498db',
    size: 4,
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

  // Update distance and score
  state.distance += state.speed * dt;
  state.score += Math.floor(state.speed * dt);

  // Gradually increase speed and disaster intensity
  if (state.speed < state.maxSpeed) {
    state.speed += 0.002 * dt;
  }
  state.disasterIntensity = Math.min(10, state.disasterIntensity + 0.003 * dt);

  // Update shake intensity
  state.shakeIntensity = state.disasterType === 'earthquake' ? state.disasterIntensity * 0.5 : state.disasterIntensity * 0.2;

  // Update disaster-specific effects
  if (state.disasterType === 'volcano') {
    state.lavaLevel = Math.min(50, state.lavaLevel + 0.01 * dt);
  }
  if (state.disasterType === 'tsunami') {
    state.waveDistance = Math.min(100, state.waveDistance + 0.02 * dt);
  }

  // Update shield
  if (state.player.shieldActive) {
    state.player.shieldTimer -= deltaTime;
    createShieldParticle(state);
    if (state.player.shieldTimer <= 0) {
      state.player.shieldActive = false;
    }
  }

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
    }
  } else {
    state.player.y = state.player.groundY;
  }

  // Spawn entities
  const spawnRate = 1 + state.disasterIntensity * 0.1;
  if (Math.random() < 0.018 * spawnRate * dt) spawnObstacle(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.012 * dt) spawnCollectible(state, canvasWidth, canvasHeight);
  if (Math.random() < 0.03 * state.disasterIntensity * dt) spawnFallingObject(state, canvasWidth);

  // Player hitbox
  const playerTop = state.player.y - PLAYER_HEIGHT;
  const playerLeft = state.player.x;

  // Update obstacles
  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt;

    // Check collision
    if (!state.player.shieldActive && state.player.lane === obstacle.lane) {
      let canAvoid = false;

      // Jumping avoids cracks and lava pools
      if ((obstacle.type === 'crack' || obstacle.type === 'lavaPool') && state.player.jumping) {
        canAvoid = true;
      }

      if (!canAvoid && checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        obstacle.x - obstacle.width / 2, obstacle.y - obstacle.height, obstacle.width, obstacle.height
      )) {
        state.phase = 'gameover';
        return;
      }
    }
  }

  // Update collectibles
  for (const collectible of state.collectibles) {
    collectible.x -= state.speed * dt;

    if (!collectible.collected && state.player.lane === collectible.lane) {
      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        collectible.x - 15, collectible.y - 15, 30, 30
      )) {
        collectible.collected = true;

        switch (collectible.type) {
          case 'survivor':
            state.survivors++;
            state.score += 100;
            createRescueParticle(state, collectible.x, collectible.y);
            break;
          case 'supply':
            state.supplies++;
            state.score += 50;
            break;
          case 'shield':
            state.player.shieldActive = true;
            state.player.shieldTimer = SHIELD_DURATION;
            break;
        }
      }
    }
  }

  // Update falling objects
  for (const obj of state.fallingObjects) {
    obj.y += obj.speed * dt;
    obj.rotation += 0.05 * dt;

    // Check collision with player (only rocks)
    if (obj.type === 'rock' && !state.player.shieldActive) {
      if (checkCollision(
        playerLeft, playerTop, PLAYER_WIDTH, PLAYER_HEIGHT,
        obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size
      )) {
        state.phase = 'gameover';
        return;
      }
    }
  }

  // Check if caught by tsunami wave
  if (state.disasterType === 'tsunami' && state.waveDistance > state.player.x) {
    state.phase = 'gameover';
    return;
  }

  // Update particles
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }

  // Clean up
  state.obstacles = state.obstacles.filter(o => o.x > -100);
  state.collectibles = state.collectibles.filter(c => c.x > -50 && !c.collected);
  state.fallingObjects = state.fallingObjects.filter(f => f.y < canvasHeight + 50);
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
  }
}

export function startGame(state: GameState): void {
  const newState = createInitialState();
  Object.assign(state, newState);
  state.phase = 'playing';
}

export function getStats(state: GameState) {
  return {
    score: Math.floor(state.score),
    distance: Math.floor(state.distance),
    survivors: state.survivors,
    supplies: state.supplies,
    disasterType: state.disasterType,
  };
}
